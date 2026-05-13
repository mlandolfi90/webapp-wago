// Stubbed core package — all licensing/telemetry/heartbeat behavior removed.
// Public API surface preserved so the rest of the codebase compiles unchanged.
package core

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RuntimeConfig is preserved as a gorm model so MigrateDB doesn't break
// existing deployments that may already have the table.
type RuntimeConfig struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Key       string    `gorm:"uniqueIndex;size:100;not null" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (RuntimeConfig) TableName() string { return "runtime_configs" }

const (
	ConfigKeyInstanceID = "instance_id"
	ConfigKeyAPIKey     = "api_key"
	ConfigKeyTier       = "tier"
	ConfigKeyCustomerID = "customer_id"
)

type RuntimeContext struct {
	apiKey     string
	instanceID string
	tier       string
	version    string
	active     atomic.Bool
}

func (rc *RuntimeContext) IsActive() bool          { return true }
func (rc *RuntimeContext) RegistrationURL() string { return "" }
func (rc *RuntimeContext) APIKey() string          { return rc.apiKey }
func (rc *RuntimeContext) InstanceID() string      { return rc.instanceID }
func (rc *RuntimeContext) ContextHash() [32]byte   { return [32]byte{} }
func (rc *RuntimeContext) TrackMessage()           {}

var db *gorm.DB

func SetDB(d *gorm.DB) { db = d }

func MigrateDB() error {
	if db == nil {
		return nil
	}
	return db.AutoMigrate(&RuntimeConfig{})
}

func InitializeRuntime(tier, version, apiKey string) *RuntimeContext {
	rc := &RuntimeContext{
		apiKey:     apiKey,
		instanceID: "local",
		tier:       tier,
		version:    version,
	}
	rc.active.Store(true)
	return rc
}

// GateMiddleware is a no-op pass-through. Licensing gate removed.
func GateMiddleware(rc *RuntimeContext) gin.HandlerFunc {
	return func(c *gin.Context) { c.Next() }
}

// LicenseRoutes exposes minimal endpoints that report "active" so any UI
// that polls them stays happy. No outbound calls.
func LicenseRoutes(eng *gin.Engine, rc *RuntimeContext) {
	lic := eng.Group("/license")
	lic.GET("/status", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "active", "instance_id": rc.InstanceID()})
	})
	lic.GET("/register", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "active"})
	})
	lic.POST("/activate", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "active"})
	})
}

func StartHeartbeat(ctx context.Context, rc *RuntimeContext, startTime time.Time) {}

func Shutdown(rc *RuntimeContext) {}

// Unused-but-exported helpers kept as no-ops for API compatibility.
func ComputeSessionSeed(instanceName string, rc *RuntimeContext) []byte { return nil }
func ValidateRouteAccess(rc *RuntimeContext) uint64                     { return 0 }
func DeriveInstanceToken(token string, rc *RuntimeContext) string       { return token }
func ActivateIntegrity(rc *RuntimeContext)                              {}
func TrackMessageSent()                                                 {}
func TrackMessageRecv()                                                 {}
func ValidateContext(rc *RuntimeContext) (bool, string)                 { return true, "" }
