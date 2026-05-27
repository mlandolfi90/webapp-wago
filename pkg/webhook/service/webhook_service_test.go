package webhook_service

import (
	"testing"

	webhook_model "github.com/webapp-wago/webapp-wago/pkg/webhook/model"
)

func wh(events []string, ct string, chats, senders []string) *webhook_model.Webhook {
	return &webhook_model.Webhook{
		Enabled:  true,
		Events:   events,
		ChatType: ct,
		ChatIDs:  chats,
		Senders:  senders,
	}
}

func TestMatchesFilter(t *testing.T) {
	cases := []struct {
		name      string
		w         *webhook_model.Webhook
		evType    string
		chat      string
		sender    string
		wantMatch bool
	}{
		{"disabled siempre rechaza",
			&webhook_model.Webhook{Enabled: false, Events: nil, ChatType: "any"},
			"Message", "x@s.whatsapp.net", "", false},

		{"events vacío = todos pasan",
			wh(nil, "any", nil, nil), "Message", "", "", true},
		{"events ALL pasa cualquiera",
			wh([]string{"ALL"}, "any", nil, nil), "QRCode", "", "", true},
		{"event en lista pasa",
			wh([]string{"MESSAGE", "CONNECTION"}, "any", nil, nil), "MESSAGE", "", "", true},
		{"event fuera de lista rechaza",
			wh([]string{"MESSAGE"}, "any", nil, nil), "QRCode", "", "", false},
		{"event case-insensitive",
			wh([]string{"Message"}, "any", nil, nil), "MESSAGE", "", "", true},

		{"chatType group pasa con @g.us",
			wh(nil, "group", nil, nil), "Message", "12345@g.us", "", true},
		{"chatType group rechaza individual",
			wh(nil, "group", nil, nil), "Message", "549@s.whatsapp.net", "", false},
		{"chatType group rechaza chat vacío",
			wh(nil, "group", nil, nil), "Message", "", "", false},
		{"chatType individual pasa @s.whatsapp.net",
			wh(nil, "individual", nil, nil), "Message", "549@s.whatsapp.net", "", true},
		{"chatType individual rechaza @g.us",
			wh(nil, "individual", nil, nil), "Message", "12345@g.us", "", false},
		{"chatType individual rechaza @newsletter",
			wh(nil, "individual", nil, nil), "Message", "x@newsletter", "", false},
		{"chatType individual rechaza chat vacío",
			wh(nil, "individual", nil, nil), "Message", "", "", false},

		{"chatIDs allowlist match pasa",
			wh(nil, "any", []string{"12345@g.us"}, nil), "Message", "12345@g.us", "", true},
		{"chatIDs allowlist no-match rechaza",
			wh(nil, "any", []string{"12345@g.us"}, nil), "Message", "99999@g.us", "", false},
		{"chatIDs allowlist con chat='' rechaza (semántica de dato faltante)",
			wh(nil, "any", []string{"12345@g.us"}, nil), "Message", "", "", false},
		{"chatIDs vacía no filtra",
			wh(nil, "any", nil, nil), "Message", "anything@g.us", "", true},

		{"senders allowlist match pasa",
			wh(nil, "any", nil, []string{"alice@s.whatsapp.net"}), "Message", "g@g.us", "alice@s.whatsapp.net", true},
		{"senders allowlist no-match rechaza",
			wh(nil, "any", nil, []string{"alice@s.whatsapp.net"}), "Message", "g@g.us", "bob@s.whatsapp.net", false},
		{"senders con sender='' rechaza",
			wh(nil, "any", nil, []string{"alice@s.whatsapp.net"}), "Message", "g@g.us", "", false},

		{"combo: events+chatType+chats+senders todo OK",
			wh([]string{"MESSAGE"}, "group", []string{"12345@g.us"}, []string{"alice@s.whatsapp.net"}),
			"MESSAGE", "12345@g.us", "alice@s.whatsapp.net", true},
		{"combo: una dim falla → rechaza",
			wh([]string{"MESSAGE"}, "group", []string{"12345@g.us"}, []string{"alice@s.whatsapp.net"}),
			"MESSAGE", "99999@g.us", "alice@s.whatsapp.net", false},

		// Wildcards / glob.
		{"glob *@g.us matchea cualquier grupo",
			wh(nil, "any", []string{"*@g.us"}, nil), "Message", "12345@g.us", "", true},
		{"glob *@g.us NO matchea individual",
			wh(nil, "any", []string{"*@g.us"}, nil), "Message", "549@s.whatsapp.net", "", false},
		{"glob por prefijo 549*",
			wh(nil, "any", nil, []string{"549*@s.whatsapp.net"}),
			"Message", "g@g.us", "549123@s.whatsapp.net", true},
		{"glob por prefijo 549* no matchea 555",
			wh(nil, "any", nil, []string{"549*@s.whatsapp.net"}),
			"Message", "g@g.us", "555123@s.whatsapp.net", false},
		{"glob 12036*@g.us matchea por prefijo de grupo",
			wh(nil, "any", []string{"12036*@g.us"}, nil), "Message", "12036304@g.us", "", true},
		{"glob `*` NO bypassa jid vacío (semántica de dato faltante)",
			wh(nil, "any", []string{"*"}, nil), "Message", "", "", false},
		{"glob + exact match en la misma lista",
			wh(nil, "any", []string{"12@g.us", "*@s.whatsapp.net"}, nil),
			"Message", "alice@s.whatsapp.net", "", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := MatchesFilter(c.w, c.evType, c.chat, c.sender)
			if got != c.wantMatch {
				t.Fatalf("MatchesFilter(%+v, %q, %q, %q) = %v, want %v",
					c.w, c.evType, c.chat, c.sender, got, c.wantMatch)
			}
		})
	}
}

func TestExtractChatSender(t *testing.T) {
	svc := &webhookService{}
	cases := []struct {
		name             string
		data             map[string]interface{}
		wantChat, wantSn string
	}{
		{"vacío",
			map[string]interface{}{}, "", ""},
		{"sin data interno",
			map[string]interface{}{"event": "X"}, "", ""},
		{"data plano con Chat/Sender mayúsculas",
			map[string]interface{}{"data": map[string]interface{}{"Chat": "12@g.us", "Sender": "a@s.whatsapp.net"}},
			"12@g.us", "a@s.whatsapp.net"},
		{"data plano lowercase",
			map[string]interface{}{"data": map[string]interface{}{"chat": "5@s.whatsapp.net", "sender": "b@s.whatsapp.net"}},
			"5@s.whatsapp.net", "b@s.whatsapp.net"},
		{"Message shape: data.Info.Chat/Sender",
			map[string]interface{}{"data": map[string]interface{}{"Info": map[string]interface{}{
				"Chat": "g@g.us", "Sender": "c@s.whatsapp.net",
			}}},
			"g@g.us", "c@s.whatsapp.net"},
		{"Receipt shape: data.RemoteJid",
			map[string]interface{}{"data": map[string]interface{}{"RemoteJid": "x@s.whatsapp.net"}},
			"x@s.whatsapp.net", ""},
		{"data.Participant como sender",
			map[string]interface{}{"data": map[string]interface{}{"Chat": "g@g.us", "Participant": "p@s.whatsapp.net"}},
			"g@g.us", "p@s.whatsapp.net"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			chat, sender := svc.ExtractChatSender(c.data)
			if chat != c.wantChat || sender != c.wantSn {
				t.Fatalf("ExtractChatSender: chat=%q sender=%q, want chat=%q sender=%q",
					chat, sender, c.wantChat, c.wantSn)
			}
		})
	}
}

// Fake producer para capturar dispatch sin tocar la red.
type fakeProducer struct {
	calls []produced
}
type produced struct {
	queueName, url, userID string
	payload                []byte
}

func (f *fakeProducer) Produce(queueName string, payload []byte, webhookUrl string, userID string) error {
	f.calls = append(f.calls, produced{queueName, webhookUrl, userID, payload})
	return nil
}
func (f *fakeProducer) CreateGlobalQueues() error { return nil }

func TestDispatchFiltersAndPostsByMatch(t *testing.T) {
	fp := &fakeProducer{}
	s := &webhookService{
		producer: fp,
		cache:    map[string][]webhook_model.Webhook{},
	}
	whs := []webhook_model.Webhook{
		// dispara para grupos en MESSAGE
		{ID: "1", InstanceID: "I", URL: "https://a/", Enabled: true,
			Events: []string{"MESSAGE"}, ChatType: "group"},
		// dispara solo individuales
		{ID: "2", InstanceID: "I", URL: "https://b/", Enabled: true,
			Events: []string{"MESSAGE"}, ChatType: "individual"},
		// disabled, nunca dispara
		{ID: "3", InstanceID: "I", URL: "https://c/", Enabled: false},
		// chat allowlist específica
		{ID: "4", InstanceID: "I", URL: "https://d/", Enabled: true,
			Events: []string{"MESSAGE"}, ChatType: "any",
			ChatIDs: []string{"otra@g.us"}},
	}
	s.mu.Lock()
	s.cache["I"] = whs
	s.mu.Unlock()

	s.Dispatch("I", "MESSAGE", "12345@g.us", "alice@s.whatsapp.net", []byte(`{"event":"MESSAGE"}`))

	if len(fp.calls) != 1 || fp.calls[0].url != "https://a/" {
		t.Fatalf("esperaba 1 dispatch a https://a/, hubo: %+v", fp.calls)
	}

	// Sin webhooks cacheados → no-op (no carga lazy si no hay repo).
	s2 := &webhookService{producer: &fakeProducer{}, cache: map[string][]webhook_model.Webhook{}}
	s2.mu.Lock()
	s2.cache["empty"] = []webhook_model.Webhook{}
	s2.mu.Unlock()
	s2.Dispatch("empty", "MESSAGE", "x", "", []byte(`{}`))
	if len(s2.producer.(*fakeProducer).calls) != 0 {
		t.Fatal("no debía dispatchear con cache vacío")
	}
}

func TestValidateRejectsBadInput(t *testing.T) {
	s := &webhookService{}
	cases := []struct {
		name string
		in   *WebhookInput
		ok   bool
	}{
		{"vacío", nil, false},
		{"sin url", &WebhookInput{}, false},
		{"url no http", &WebhookInput{URL: "ftp://x/"}, false},
		{"url mala", &WebhookInput{URL: "no es una url"}, false},
		{"chatType inválido", &WebhookInput{URL: "https://x/", ChatType: "bogus"}, false},
		{"event inválido", &WebhookInput{URL: "https://x/", Events: []string{"NOPE"}}, false},
		{"ok mínimo", &WebhookInput{URL: "https://x/"}, true},
		{"ok completo", &WebhookInput{
			URL: "http://x/h", Events: []string{"MESSAGE", "ALL"}, ChatType: "group",
			ChatIDs: []string{"a@g.us"}, Senders: []string{"u@s.whatsapp.net"},
		}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := s.validate(c.in)
			if (err == nil) != c.ok {
				t.Fatalf("validate(%+v) err=%v, want ok=%v", c.in, err, c.ok)
			}
		})
	}
}
