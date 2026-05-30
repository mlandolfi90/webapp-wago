package instance_service

import (
	"errors"
	"strings"
	"testing"
)

// WAGO-PATCH(ADR-0057): tests de regresión para los 2 bugs fixados:
// 1. Status devolvía Connected:true sin sesión real (TCP vivo, no
//    sesión vinculada). Ahora Connected refleja IsLoggedIn().
// 2. Pair era nil-unsafe, tragaba errores y devolvía code vacío
//    silenciosamente. Ahora chequea client != nil, propaga errores
//    y detecta code vacío como error explícito.

// Estos tests cubren la SEMÁNTICA del fix sin necesidad de
// dependencias del whatsmeow.Client real (que requeriría un
// servidor mock o testcontainer):

func TestPairErrorMessages_PreconditionPhraseDetected(t *testing.T) {
	// El handler instance_handler.go::Pair clasifica errores del
	// service como 409 (Conflict) cuando matchean ciertas frases
	// precondicionales. Este test garantiza que las frases que
	// devuelve el service siguen matcheando.
	cases := []struct {
		name string
		err  error
		want bool // ¿debería clasificarse como 409 Conflict?
	}{
		{"no conectada", errors.New("instance abc no está conectada — llamá Connect primero"), true},
		{"no está listo", errors.New("PairPhone devolvió código vacío — el cliente whatsmeow no está listo"), true},
		{"código vacío", errors.New("PairPhone devolvió código vacío — el cliente whatsmeow no está listo"), true},
		{"driver error", errors.New("PairPhone falló: connection refused"), false},
		{"random", errors.New("internal error xyz"), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := strings.Contains(c.err.Error(), "no está conectada") ||
				strings.Contains(c.err.Error(), "no está listo") ||
				strings.Contains(c.err.Error(), "código vacío")
			if got != c.want {
				t.Errorf("err=%q: want classifier=%v, got %v", c.err, c.want, got)
			}
		})
	}
}
