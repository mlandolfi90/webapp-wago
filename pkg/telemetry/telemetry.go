package telemetry

// Telemetry has been disabled in this WebAPP-Wago fork.
//
// The upstream Evolution Go code sent anonymous telemetry to
// log.evolution-api.com on every routed request. We do NOT send any
// data to external servers. The middleware below is a no-op kept to
// preserve the public API so existing call-sites don't break.
//
// If you want to re-enable telemetry pointing at your own collector,
// implement SendTelemetry below and route it to a service you control.

import (
	"time"

	"github.com/gin-gonic/gin"
)

type TelemetryData struct {
	Route      string    `json:"route"`
	APIVersion string    `json:"apiVersion"`
	Timestamp  time.Time `json:"timestamp"`
}

type telemetryService struct{}

func (t *telemetryService) TelemetryMiddleware() gin.HandlerFunc {
	// No-op middleware. Does nothing per-request.
	return func(c *gin.Context) {
		c.Next()
	}
}

type TelemetryService interface {
	TelemetryMiddleware() gin.HandlerFunc
}

// SendTelemetry is intentionally a no-op. Preserved for backward
// compatibility with code that may import it.
func SendTelemetry(route string) {
	// Intentionally blank.
	_ = route
}

func NewTelemetryService() TelemetryService {
	return &telemetryService{}
}
