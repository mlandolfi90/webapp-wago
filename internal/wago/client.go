// Package wago is a thin REST client for the webapp-wago WhatsApp API.
// It maps the two auth scopes (GLOBAL_API_KEY vs instance token) onto a
// single "apikey" header and keeps the active instance token in memory.
package wago

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Client talks to the webapp-wago REST API. Credentials never leave the
// process: the model passes a token only via UseInstance.
type Client struct {
	baseURL  string
	adminKey string
	http     *http.Client

	mu     sync.RWMutex
	active string // active instance token
}

// New builds a client. baseURL e.g. http://localhost:8080, adminKey is the
// GLOBAL_API_KEY (admin scope).
func New(baseURL, adminKey string) *Client {
	return &Client{
		baseURL:  strings.TrimRight(baseURL, "/"),
		adminKey: adminKey,
		http:     &http.Client{Timeout: 30 * time.Second},
	}
}

// UseInstance sets the active instance token used by instance-scoped tools.
func (c *Client) UseInstance(token string) {
	c.mu.Lock()
	c.active = token
	c.mu.Unlock()
}

// ActiveToken returns the current instance token (empty if unset).
func (c *Client) ActiveToken() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.active
}

// Scope selects which apikey a request uses.
type Scope int

const (
	// Admin uses the GLOBAL_API_KEY.
	Admin Scope = iota
	// Instance uses the active instance token (error if none set).
	Instance
)

func (c *Client) keyFor(s Scope) (string, error) {
	if s == Admin {
		if c.adminKey == "" {
			return "", errors.New("WAGO_ADMIN_KEY no configurada")
		}
		return c.adminKey, nil
	}
	tok := c.ActiveToken()
	if tok == "" {
		return "", errors.New("no hay instancia activa: usá la tool use_instance primero")
	}
	return tok, nil
}

// Do performs a request and returns the decoded JSON body. On a non-2xx
// status it returns an error built from the API's {"error":...} envelope.
func (c *Client) Do(ctx context.Context, scope Scope, method, path string, body any) (any, error) {
	key, err := c.keyFor(scope)
	if err != nil {
		return nil, err
	}

	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("encode body: %w", err)
		}
		rdr = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", key)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	res, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request %s %s: %w", method, path, err)
	}
	defer res.Body.Close()

	raw, _ := io.ReadAll(res.Body)
	var parsed any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &parsed)
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		if m, ok := parsed.(map[string]any); ok {
			if e, ok := m["error"].(string); ok && e != "" {
				return nil, fmt.Errorf("API %d: %s", res.StatusCode, e)
			}
		}
		return nil, fmt.Errorf("API %d: %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	return parsed, nil
}
