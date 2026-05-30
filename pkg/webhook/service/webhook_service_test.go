package webhook_service

import (
	"context"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	webhook_model "github.com/webapp-wago/webapp-wago/pkg/webhook/model"
)

func wh(events []string, ct string, chats, senders []string) *webhook_model.Webhook {
	return &webhook_model.Webhook{
		Enabled:      true,
		Events:       events,
		ChatType:     ct,
		ChatIDs:      chats,
		Senders:      senders,
		IgnoreFromMe: true,
	}
}

func whFull(events []string, ct string, chats, senders, chatNames, senderNames []string) *webhook_model.Webhook {
	return &webhook_model.Webhook{
		Enabled:      true,
		Events:       events,
		ChatType:     ct,
		ChatIDs:      chats,
		Senders:      senders,
		ChatNames:    chatNames,
		SenderNames:  senderNames,
		IgnoreFromMe: true,
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
			got := MatchesFilter(c.w, c.evType, c.chat, c.sender, "", "", false)
			if got != c.wantMatch {
				t.Fatalf("MatchesFilter(%+v, %q, %q, %q) = %v, want %v",
					c.w, c.evType, c.chat, c.sender, got, c.wantMatch)
			}
		})
	}
}

// WAGO-PATCH(ADR-0049): cobertura del filtro de mensajes propios.
// IgnoreFromMe + isFromMe interactúan independientemente del resto del
// filtro — si isFromMe=false, el flag es no-op.
func TestMatchesFilterIgnoreFromMe(t *testing.T) {
	base := func(ignore bool) *webhook_model.Webhook {
		return &webhook_model.Webhook{
			Enabled:      true,
			ChatType:     "any",
			IgnoreFromMe: ignore,
		}
	}
	cases := []struct {
		name     string
		w        *webhook_model.Webhook
		isFromMe bool
		want     bool
	}{
		{"IgnoreFromMe=true + isFromMe=true → rechaza (rompe loop)",
			base(true), true, false},
		{"IgnoreFromMe=true + isFromMe=false → pasa (default seguro)",
			base(true), false, true},
		{"IgnoreFromMe=false + isFromMe=true → pasa (auditoría opt-in)",
			base(false), true, true},
		{"IgnoreFromMe=false + isFromMe=false → pasa (no-op)",
			base(false), false, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := MatchesFilter(c.w, "MESSAGE", "x@s.whatsapp.net", "", "", "", c.isFromMe)
			if got != c.want {
				t.Fatalf("MatchesFilter isFromMe=%v IgnoreFromMe=%v = %v, want %v",
					c.isFromMe, c.w.IgnoreFromMe, got, c.want)
			}
		})
	}

	// El filtro de isFromMe se evalúa ANTES que las otras dimensiones:
	// un webhook con eventos/chats compatibles igual rechaza si es propio.
	whCompleto := &webhook_model.Webhook{
		Enabled:      true,
		Events:       []string{"MESSAGE"},
		ChatType:     "any",
		ChatIDs:      []string{"12@g.us"},
		IgnoreFromMe: true,
	}
	if MatchesFilter(whCompleto, "MESSAGE", "12@g.us", "", "", "", true) {
		t.Fatal("IgnoreFromMe debe rechazar antes que matchee el resto del filtro")
	}
	if !MatchesFilter(whCompleto, "MESSAGE", "12@g.us", "", "", "", false) {
		t.Fatal("mismo webhook con isFromMe=false debería pasar")
	}
}

func TestExtractEventMeta(t *testing.T) {
	svc := &webhookService{}
	cases := []struct {
		name             string
		data             map[string]interface{}
		wantChat, wantSn string
		wantFromMe       bool
	}{
		{"vacío",
			map[string]interface{}{}, "", "", false},
		{"sin data interno",
			map[string]interface{}{"event": "X"}, "", "", false},
		{"data plano con Chat/Sender mayúsculas",
			map[string]interface{}{"data": map[string]interface{}{"Chat": "12@g.us", "Sender": "a@s.whatsapp.net"}},
			"12@g.us", "a@s.whatsapp.net", false},
		{"data plano lowercase",
			map[string]interface{}{"data": map[string]interface{}{"chat": "5@s.whatsapp.net", "sender": "b@s.whatsapp.net"}},
			"5@s.whatsapp.net", "b@s.whatsapp.net", false},
		{"Message shape: data.Info.Chat/Sender (sin IsFromMe)",
			map[string]interface{}{"data": map[string]interface{}{"Info": map[string]interface{}{
				"Chat": "g@g.us", "Sender": "c@s.whatsapp.net",
			}}},
			"g@g.us", "c@s.whatsapp.net", false},
		// WAGO-PATCH(ADR-0049): IsFromMe es la dimensión crítica para
		// romper el loop — se extrae del shape Message normal.
		{"Message shape: IsFromMe=true",
			map[string]interface{}{"data": map[string]interface{}{"Info": map[string]interface{}{
				"Chat": "g@g.us", "Sender": "c@s.whatsapp.net", "IsFromMe": true,
			}}},
			"g@g.us", "c@s.whatsapp.net", true},
		{"Message shape: IsFromMe=false explícito",
			map[string]interface{}{"data": map[string]interface{}{"Info": map[string]interface{}{
				"Chat": "g@g.us", "Sender": "c@s.whatsapp.net", "IsFromMe": false,
			}}},
			"g@g.us", "c@s.whatsapp.net", false},
		{"Message shape: IsFromMe tipo no-bool se ignora (default false)",
			map[string]interface{}{"data": map[string]interface{}{"Info": map[string]interface{}{
				"Chat": "g@g.us", "IsFromMe": "true",
			}}},
			"g@g.us", "", false},
		{"Receipt shape: data.RemoteJid (sin Info, sin IsFromMe)",
			map[string]interface{}{"data": map[string]interface{}{"RemoteJid": "x@s.whatsapp.net"}},
			"x@s.whatsapp.net", "", false},
		{"data.Participant como sender",
			map[string]interface{}{"data": map[string]interface{}{"Chat": "g@g.us", "Participant": "p@s.whatsapp.net"}},
			"g@g.us", "p@s.whatsapp.net", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			chat, sender, fromMe := svc.ExtractEventMeta(c.data)
			if chat != c.wantChat || sender != c.wantSn || fromMe != c.wantFromMe {
				t.Fatalf("ExtractEventMeta: chat=%q sender=%q fromMe=%v, want chat=%q sender=%q fromMe=%v",
					chat, sender, fromMe, c.wantChat, c.wantSn, c.wantFromMe)
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
			got := MatchesFilter(c.w, "MESSAGE", c.chatJID, c.senderJID, c.chatName, c.senderNm, false)
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
	s.Dispatch("I", "MESSAGE", "x@g.us", "", false, []byte(`{}`))
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
	s.Dispatch("I", "MESSAGE", "12@g.us", "", false, []byte(`{}`))
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

	s.Dispatch("I", "MESSAGE", "12345@g.us", "alice@s.whatsapp.net", false, []byte(`{"event":"MESSAGE"}`))

	if len(fp.calls) != 1 || fp.calls[0].url != "https://a/" {
		t.Fatalf("esperaba 1 dispatch a https://a/, hubo: %+v", fp.calls)
	}

	// Sin webhooks cacheados → no-op (no carga lazy si no hay repo).
	s2 := &webhookService{producer: &fakeProducer{}, cache: map[string][]webhook_model.Webhook{}}
	s2.mu.Lock()
	s2.cache["empty"] = []webhook_model.Webhook{}
	s2.mu.Unlock()
	s2.Dispatch("empty", "MESSAGE", "x", "", false, []byte(`{}`))
	if len(s2.producer.(*fakeProducer).calls) != 0 {
		t.Fatal("no debía dispatchear con cache vacío")
	}
}

// WAGO-PATCH(ADR-0049): integración del filtro isFromMe en el path
// completo de Dispatch — verifica que entre N webhooks, los que
// tienen IgnoreFromMe=true se saltean para mensajes propios mientras
// los IgnoreFromMe=false los reciben.
func TestDispatchRespectsIgnoreFromMePerWebhook(t *testing.T) {
	fp := &fakeProducer{}
	s := &webhookService{
		producer: fp,
		cache:    map[string][]webhook_model.Webhook{},
	}
	s.cache["I"] = []webhook_model.Webhook{
		// Default: ignora salientes (rompe loop).
		{ID: "1", InstanceID: "I", URL: "https://default/", Enabled: true,
			ChatType: "any", IgnoreFromMe: true},
		// Auditor opt-in: recibe TODO incluido propios.
		{ID: "2", InstanceID: "I", URL: "https://auditor/", Enabled: true,
			ChatType: "any", IgnoreFromMe: false},
	}

	// Mensaje propio → solo el auditor recibe.
	s.Dispatch("I", "MESSAGE", "12@g.us", "me@s.whatsapp.net", true, []byte(`{}`))
	if len(fp.calls) != 1 || fp.calls[0].url != "https://auditor/" {
		t.Fatalf("isFromMe=true: esperaba solo https://auditor/, hubo: %+v", fp.calls)
	}

	// Mensaje entrante → ambos reciben.
	fp.calls = nil
	s.Dispatch("I", "MESSAGE", "12@g.us", "other@s.whatsapp.net", false, []byte(`{}`))
	if len(fp.calls) != 2 {
		t.Fatalf("isFromMe=false: esperaba 2 dispatches, hubo: %+v", fp.calls)
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

// WAGO-PATCH(ADR-0055): transports per-webhook. Verifica que el flag
// per-webhook controla la publicación a cada producer global
// (rabbitmq/websocket/nats) además del HTTP base.

func TestDispatchHTTPOnlyByDefault(t *testing.T) {
	http := &fakeProducer{}
	rmq := &fakeProducer{}
	ws := &fakeProducer{}
	nats := &fakeProducer{}
	s := &webhookService{producer: http, cache: map[string][]webhook_model.Webhook{}}
	s.SetTransports(rmq, ws, nats)
	s.cache["I"] = []webhook_model.Webhook{
		// Defaults: todos transports off — solo POST HTTP.
		{ID: "1", InstanceID: "I", URL: "https://x/", Enabled: true, ChatType: "any"},
	}

	s.Dispatch("I", "MESSAGE", "g@g.us", "u@s", false, []byte(`{}`))

	if len(http.calls) != 1 {
		t.Fatalf("HTTP esperaba 1 dispatch, tuvo %d", len(http.calls))
	}
	if len(rmq.calls) != 0 || len(ws.calls) != 0 || len(nats.calls) != 0 {
		t.Fatalf("ningún transport debió dispararse: rmq=%d ws=%d nats=%d",
			len(rmq.calls), len(ws.calls), len(nats.calls))
	}
}

func TestDispatchAllTransports(t *testing.T) {
	http := &fakeProducer{}
	rmq := &fakeProducer{}
	ws := &fakeProducer{}
	nats := &fakeProducer{}
	s := &webhookService{producer: http, cache: map[string][]webhook_model.Webhook{}}
	s.SetTransports(rmq, ws, nats)
	s.cache["I"] = []webhook_model.Webhook{
		{ID: "1", InstanceID: "I", URL: "https://x/", Enabled: true, ChatType: "any",
			RabbitmqEnable: true, WebsocketEnable: true, NatsEnable: true},
	}

	s.Dispatch("I", "MESSAGE", "g@g.us", "u@s", false, []byte(`{}`))

	if len(http.calls) != 1 || len(rmq.calls) != 1 || len(ws.calls) != 1 || len(nats.calls) != 1 {
		t.Fatalf("esperaba 1 dispatch a cada transport: http=%d rmq=%d ws=%d nats=%d",
			len(http.calls), len(rmq.calls), len(ws.calls), len(nats.calls))
	}
}

func TestDispatchSelectiveTransports(t *testing.T) {
	http := &fakeProducer{}
	rmq := &fakeProducer{}
	ws := &fakeProducer{}
	nats := &fakeProducer{}
	s := &webhookService{producer: http, cache: map[string][]webhook_model.Webhook{}}
	s.SetTransports(rmq, ws, nats)
	s.cache["I"] = []webhook_model.Webhook{
		// URL + NATS, sin RabbitMQ ni WebSocket.
		{ID: "1", InstanceID: "I", URL: "https://x/", Enabled: true, ChatType: "any",
			NatsEnable: true},
	}

	s.Dispatch("I", "MESSAGE", "g@g.us", "u@s", false, []byte(`{}`))

	if len(http.calls) != 1 || len(nats.calls) != 1 {
		t.Fatalf("HTTP+NATS esperaban 1 cada uno, hubo http=%d nats=%d",
			len(http.calls), len(nats.calls))
	}
	if len(rmq.calls) != 0 || len(ws.calls) != 0 {
		t.Fatalf("RabbitMQ/WS no debían dispararse: rmq=%d ws=%d", len(rmq.calls), len(ws.calls))
	}
}

func TestDispatchTransportNilSafe(t *testing.T) {
	// Producer global no inyectado (config global apagada) → aunque
	// el webhook tenga el flag, no debe panic ni intentar publicar.
	http := &fakeProducer{}
	s := &webhookService{producer: http, cache: map[string][]webhook_model.Webhook{}}
	// SetTransports NO se llama → todos nil.
	s.cache["I"] = []webhook_model.Webhook{
		{ID: "1", InstanceID: "I", URL: "https://x/", Enabled: true, ChatType: "any",
			RabbitmqEnable: true, WebsocketEnable: true, NatsEnable: true},
	}

	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("panic con producers nil: %v", r)
		}
	}()
	s.Dispatch("I", "MESSAGE", "g@g.us", "u@s", false, []byte(`{}`))
	if len(http.calls) != 1 {
		t.Fatalf("HTTP debió dispararse pese a producers nil, hubo %d", len(http.calls))
	}
}

// Regresión del bug GORM `default:true` que descubrió la corrida
// `webui-dashboard-real-metrics-01` (Playwright vio "3/3" cuando
// esperaba "2/3"). El bug vivía en el tag del model — un POST con
// enabled:false terminaba como true porque GORM aplica el default al
// zero-value bool. El service ya manejaba el default en toModel(); el
// tag GORM era redundante y conflictivo.
func TestToModelEnabledFalseRespectsExplicit(t *testing.T) {
	enabledFalse := false
	in := &WebhookInput{URL: "https://x/", Enabled: &enabledFalse}
	w := toModel("inst-1", in)
	if w.Enabled != false {
		t.Fatalf("expected Enabled=false, got %v", w.Enabled)
	}
}

func TestToModelEnabledOmittedDefaultsTrue(t *testing.T) {
	in := &WebhookInput{URL: "https://x/"} // Enabled ausente
	w := toModel("inst-1", in)
	if w.Enabled != true {
		t.Fatalf("expected Enabled=true (default), got %v", w.Enabled)
	}
}

func TestToModelIgnoreFromMeFalseRespectsExplicit(t *testing.T) {
	ifFalse := false
	in := &WebhookInput{URL: "https://x/", IgnoreFromMe: &ifFalse}
	w := toModel("inst-1", in)
	if w.IgnoreFromMe != false {
		t.Fatalf("expected IgnoreFromMe=false, got %v", w.IgnoreFromMe)
	}
}

// WAGO-PATCH(ADR-0059): SSRF guard sobre webhook URLs.
// Antes un operador podía configurar webhook a http://localhost/admin →
// dispatch fire-and-forget pegaba al server interno en cada evento.
func TestValidateBlocksSsrfWebhookURLs(t *testing.T) {
	s := &webhookService{}
	defer t.Setenv("ALLOW_LOCAL_WEBHOOKS", "")
	t.Setenv("ALLOW_LOCAL_WEBHOOKS", "false")

	blocked := []string{
		"http://localhost/x",
		"http://127.0.0.1:8080/admin",
		"http://10.0.0.5/api",
		"http://192.168.1.1/h",
		"http://172.16.0.10/x",
		"http://169.254.169.254/latest/meta-data/",
	}
	for _, raw := range blocked {
		err := s.validate(&WebhookInput{URL: raw})
		if err == nil || !strings.Contains(err.Error(), "rango") {
			t.Errorf("URL %q: esperaba error de rango bloqueado, got %v", raw, err)
		}
	}
}

func TestValidateAllowsPublicWebhookURLs(t *testing.T) {
	s := &webhookService{}
	allowed := []string{
		"https://webhook.site/abc-123",
		"https://api.public.example.com/wh",
	}
	for _, raw := range allowed {
		if err := s.validate(&WebhookInput{URL: raw}); err != nil {
			t.Errorf("URL pública %q rechazada: %v", raw, err)
		}
	}
}

func TestValidateAllowsLocalWhenEnvSet(t *testing.T) {
	s := &webhookService{}
	t.Setenv("ALLOW_LOCAL_WEBHOOKS", "true")
	if err := s.validate(&WebhookInput{URL: "http://localhost:9000/dev"}); err != nil {
		t.Errorf("con ALLOW_LOCAL_WEBHOOKS=true debería pasar, got %v", err)
	}
}
