package login

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/jwtauth/v5"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	loginsvc "github.com/lyricapp/lyric/web/internal/services/login"
)

// Handler manages login OTP requests.
type Handler struct {
	svc loginsvc.Service
}

// New creates a login handler instance.
func New(svc loginsvc.Service) Handler {
	return Handler{svc: svc}
}

// Request accepts a username/email and issues an OTP code.
func (h Handler) Request(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Username string `json:"username"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	username := strings.TrimSpace(payload.Username)
	if username == "" {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"username": "username is required"}})
		return
	}

	if err := h.svc.RequestOTP(r.Context(), username); err != nil {
		switch {
		case errors.Is(err, loginsvc.ErrEmailRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"username": "username is required"}})
			return
		case errors.Is(err, loginsvc.ErrInvalidEmail):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"username": "username must be a valid email"}})
			return
		default:
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to send login code"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Success",
		},
	})
}

// Verify handles OTP code verification and token issuance.
func (h Handler) Verify(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Code any `json:"code"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	decoder.UseNumber()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	code, err := normalizeCode(payload.Code)
	if err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"code": err.Error()}})
		return
	}

	result, svcErr := h.svc.VerifyCode(r.Context(), code)
	if svcErr != nil {
		log.Println(svcErr)
		switch {
		case errors.Is(svcErr, loginsvc.ErrCodeRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"code": "code is required"}})
			return
		case errors.Is(svcErr, loginsvc.ErrCodeInvalid):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"code": "code is invalid"}})
			return
		default:
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to verify code"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"access_token": result.Token,
		},
	})
}

func normalizeCode(value any) (string, error) {
	switch v := value.(type) {
	case string:
		code := strings.TrimSpace(v)
		if code == "" {
			return "", errors.New("code is required")
		}
		return code, nil
	case json.Number:
		if v == "" {
			return "", errors.New("code is required")
		}
		if _, err := v.Int64(); err != nil {
			return "", errors.New("code must be numeric")
		}
		return v.String(), nil
	case float64:
		if v < 0 {
			return "", errors.New("code must be numeric")
		}
		return strconv.FormatInt(int64(v), 10), nil
	case nil:
		return "", errors.New("code is required")
	default:
		return "", errors.New("code must be numeric")
	}
}

// Me returns the authenticated user's profile.
func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	_, claims, err := jwtauth.FromContext(r.Context())
	if err != nil {
		respondUnauthorized(w)
		return
	}

	subRaw, ok := claims["sub"].(string)
	if !ok || strings.TrimSpace(subRaw) == "" {
		respondUnauthorized(w)
		return
	}

	userID, err := strconv.Atoi(subRaw)
	if err != nil {
		respondUnauthorized(w)
		return
	}

	user, err := h.svc.CurrentUser(r.Context(), userID)
	if err != nil {
		respondUnauthorized(w)
		return
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"username": user.Email,
			"role":     user.Role,
		},
	})
}

func respondUnauthorized(w http.ResponseWriter) {
	util.RespondJSON(w, http.StatusUnauthorized, map[string]any{
		"errors": map[string]string{
			"message": "unauthorized",
		},
	})
}
