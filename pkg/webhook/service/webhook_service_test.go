package webhook_service

import (
	"context"
	"sync"
	"sync/atomic"
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

func whFull(events []string, ct string, chats, senders, chatNames, senderNames []string) *webhook_model.Webhook {
	return &webhook_model.Webhook{
		Enabled:     true,
		Events:      events,
		ChatType:    ct,
		ChatIDs:     chats,
		Senders:     senders,
		ChatNames:   chatNames,
		SenderNames: senderNames,
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
			got := MatchesFilter(c.w, c.evType, c.chat, c.sender, "", "")
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

func TestMatchesFilterByName(t *testing.T) {
	cases := []struct {
		name      string
		w         *webhook_model.Webhook
		chatJID   string
		senderJID string
		chatName  string
		senderNm  string
		want      bool
	}{
		{"chatNames vacío no filtra",
			whFull(nil, "any", nil, nil, nil, nil),
			"x@g.us", "", "Harness Pruebas", "", true},
		{"chatNames glob Harness* matchea",
			whFull(nil, "any", nil, nil, []string{"Harness*"}, nil),
			"x@g.us", "", "Harness Pruebas", "", true},
		{"chatNames glob Harness* no matchea Familia",
			whFull(nil, "any", nil, nil, []string{"Harness*"}, nil),
			"x@g.us", "", "Familia", "", false},
		{"chatNames con name='' rechaza",
			whFull(nil, "any", nil, nil, []string{"Harness*"}, nil),
			"x@g.us", "", "", "", false},
		{"chatNames exact match",
			whFull(nil, "any", nil, nil, []string{"Harness Pruebas"}, nil),
			"x@g.us", "", "Harness Pruebas", "", true},
		{"chatNames OR de varios patrones",
			whFull(nil, "any", nil, nil, []string{"Harness*", "Soporte*"}, nil),
			"x@g.us", "", "Soporte L1", "", true},
		{"senderNames glob Mauro* matchea",
			whFull(nil, "any", nil, nil, nil, []string{"Mauro*"}),
			"g@g.us", "a@s.whatsapp.net", "", "Mauro Landolfi", true},
		{"chatNames + senderNames combo AND falla si una falla",
			whFull(nil, "any", nil, nil, []string{"Harness*"}, []string{"Mauro*"}),
			"g@g.us", "a@s.whatsapp.net", "Harness Pruebas", "Otra Persona", false},
		{"chatNames + chatIDs ambos exigidos (AND)",
			whFull(nil, "any", []string{"12*@g.us"}, nil, []string{"Harness*"}, nil),
			"12345@g.us", "", "Harness Pruebas", "", true},
		{"chatIDs match pero chatNames falla → rechaza",
			whFull(nil, "any", []string{"12*@g.us"}, nil, []string{"Harness*"}, nil),
			"12345@g.us", "", "Familia", "", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := MatchesFilter(c.w, "MESSAGE", c.chatJID, c.senderJID, c.chatName, c.senderNm)
			if got != c.want {
				t.Fatalf("MatchesFilter(name=%q sender=%q) = %v, want %v",
					c.chatName, c.senderNm, got, c.want)
			}
		})
	}
}

// Fake resolver que cuenta los lookups, para verificar cache hits.
type fakeResolver struct {
	groupCalls   int32
	contactCalls int32
	groups       map[string]string
	contacts     map[string]string
}

func (f *fakeResolver) GroupNames(_ context.Context, _ string) (map[string]string, error) {
	atomic.AddInt32(&f.groupCalls, 1)
	return f.groups, nil
}
func (f *fakeResolver) ContactNames(_ context.Context, _ string) (map[string]string, error) {
	atomic.AddInt32(&f.contactCalls, 1)
	return f.contacts, nil
}

func TestNameLookupCachesAndInvalidates(t *testing.T) {
	fr := &fakeResolver{
		groups:   map[string]string{"12@g.us": "Harness Pruebas", "13@g.us": "Familia"},
		contacts: map[string]string{"a@s.whatsapp.net": "Mauro Landolfi"},
	}
	s := &webhookService{
		producer:  &fakeProducer{},
		resolver:  fr,
		cache:     map[string][]webhook_model.Webhook{},
		nameCache: map[string]*instanceNames{},
	}
	// 1ra y 2da llamada: 1 sola call al resolver (cache hit).
	if n := s.groupName("I", "12@g.us"); n != "Harness Pruebas" {
		t.Fatalf("groupName 1: got %q", n)
	}
	if n := s.groupName("I", "13@g.us"); n != "Familia" {
		t.Fatalf("groupName 2 (cache hit): got %q", n)
	}
	if got := atomic.LoadInt32(&fr.groupCalls); got != 1 {
		t.Fatalf("groupCalls = %d, want 1 (cache fallaste)", got)
	}
	// Invalidate y volver a pedir → 2 llamadas totales.
	s.InvalidateNames("I")
	if n := s.groupName("I", "12@g.us"); n != "Harness Pruebas" {
		t.Fatalf("groupName tras invalidate: %q", n)
	}
	if got := atomic.LoadInt32(&fr.groupCalls); got != 2 {
		t.Fatalf("groupCalls tras invalidate = %d, want 2", got)
	}
	// Contactos cargan independiente (groupsLoaded no implica contactsLoaded).
	if n := s.contactName("I", "a@s.whatsapp.net"); n != "Mauro Landolfi" {
		t.Fatalf("contactName: %q", n)
	}
	if got := atomic.LoadInt32(&fr.contactCalls); got != 1 {
		t.Fatalf("contactCalls = %d, want 1", got)
	}
}

func TestDispatchSkipsNameLookupIfNoWebhookNeedsIt(t *testing.T) {
	fr := &fakeResolver{groups: map[string]string{}}
	fp := &fakeProducer{}
	s := &webhookService{
		producer:  fp,
		resolver:  fr,
		cache:     map[string][]webhook_model.Webhook{},
		nameCache: map[string]*instanceNames{},
	}
	// Webhook sin chatNames/senderNames — Dispatch NO debe llamar resolver.
	s.cache["I"] = []webhook_model.Webhook{
		{ID: "1", InstanceID: "I", URL: "https://a/", Enabled: true, ChatType: "any"},
	}
	s.Dispatch("I", "MESSAGE", "x@g.us", "", []byte(`{}`))
	if atomic.LoadInt32(&fr.groupCalls) != 0 {
		t.Fatal("Dispatch llamó al resolver sin necesidad")
	}
	if len(fp.calls) != 1 {
		t.Fatal("Dispatch debía mandar 1 POST")
	}
}

func TestDispatchUsesNameLookupWhenWebhookNeedsIt(t *testing.T) {
	fr := &fakeResolver{
		groups: map[string]string{"12@g.us": "Harness Pruebas", "99@g.us": "Familia"},
	}
	fp := &fakeProducer{}
	s := &webhookService{
		producer:  fp,
		resolver:  fr,
		cache:     map[string][]webhook_model.Webhook{},
		nameCache: map[string]*instanceNames{},
	}
	s.cache["I"] = []webhook_model.Webhook{
		{ID: "1", InstanceID: "I", URL: "https://harness/", Enabled: true,
			ChatType: "any", ChatNames: []string{"Harness*"}},
		{ID: "2", InstanceID: "I", URL: "https://otro/", Enabled: true,
			ChatType: "any", ChatNames: []string{"Familia"}},
	}
	// Evento en chat "Harness Pruebas" → solo el primer webhook matchea.
	s.Dispatch("I", "MESSAGE", "12@g.us", "", []byte(`{}`))
	if len(fp.calls) != 1 || fp.calls[0].url != "https://harness/" {
		t.Fatalf("esperaba 1 dispatch a https://harness/, hubo: %+v", fp.calls)
	}
}

func TestNameCacheConcurrentAccessNoRace(t *testing.T) {
	fr := &fakeResolver{groups: map[string]string{"12@g.us": "Harness Pruebas"}}
	s := &webhookService{
		producer:  &fakeProducer{},
		resolver:  fr,
		cache:     map[string][]webhook_model.Webhook{},
		nameCache: map[string]*instanceNames{},
	}
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(2)
		go func() { defer wg.Done(); _ = s.groupName("I", "12@g.us") }()
		go func() { defer wg.Done(); s.InvalidateNames("I") }()
	}
	wg.Wait()
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
