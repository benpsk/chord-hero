package admin

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// ErrNoSession indicates the request does not contain an admin session cookie.
var ErrNoSession = errors.New("admin session: no session")

// ErrInvalidSession indicates the session payload failed validation.
var ErrInvalidSession = errors.New("admin session: invalid")

// Manager issues and validates admin session cookies.
type Manager struct {
	cookieName string
	secret     []byte
	lifetime   time.Duration
	secure     bool
}

// Claims represents the authenticated admin contained within a session.
type Claims struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	IssuedAt int64  `json:"iat"`
}

// NewManager constructs a session manager.
func NewManager(cookieName string, secret []byte, ttl time.Duration, secure bool) *Manager {
	return &Manager{cookieName: cookieName, secret: secret, lifetime: ttl, secure: secure}
}

// Issue sets a signed admin session cookie on the response writer.
func (m *Manager) Issue(w http.ResponseWriter, claims Claims) error {
	if claims.ID == 0 || strings.TrimSpace(claims.Username) == "" {
		return fmt.Errorf("issue admin session: missing principal")
	}
	if claims.IssuedAt == 0 {
		claims.IssuedAt = time.Now().Unix()
	}

	payload, err := json.Marshal(claims)
	if err != nil {
		return fmt.Errorf("marshal admin session: %w", err)
	}

	sig := m.sign(payload)
	value := encode(payload) + "." + encode(sig)

	expires := time.Unix(claims.IssuedAt, 0).Add(m.lifetime)
	http.SetCookie(w, &http.Cookie{
		Name:     m.cookieName,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   m.secure,
		SameSite: http.SameSiteStrictMode,
		Expires:  expires,
		MaxAge:   int(m.lifetime.Seconds()),
	})

	return nil
}

// Clear removes the admin session cookie from the response.
func (m *Manager) Clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     m.cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   m.secure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}

// Validate extracts and validates the session claims from the request.
func (m *Manager) Validate(r *http.Request) (Claims, error) {
	cookie, err := r.Cookie(m.cookieName)
	if err != nil {
		return Claims{}, ErrNoSession
	}

	parts := strings.Split(cookie.Value, ".")
	if len(parts) != 2 {
		return Claims{}, ErrInvalidSession
	}

	payload, err := decode(parts[0])
	if err != nil {
		return Claims{}, ErrInvalidSession
	}

	signature, err := decode(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidSession
	}

	if !hmac.Equal(signature, m.sign(payload)) {
		return Claims{}, ErrInvalidSession
	}

	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return Claims{}, ErrInvalidSession
	}

	issued := time.Unix(claims.IssuedAt, 0)
	if issued.IsZero() || time.Now().After(issued.Add(m.lifetime)) {
		return Claims{}, ErrInvalidSession
	}

	return claims, nil
}

func (m *Manager) sign(payload []byte) []byte {
	h := hmac.New(sha256.New, m.secret)
	h.Write(payload)
	return h.Sum(nil)
}

func encode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func decode(value string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(value)
}
