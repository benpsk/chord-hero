package login

import (
	"encoding/json"
	"errors"
	"net/http"

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
		util.RespondJSON(w, http.StatusBadRequest, errors.New("Invalid request body"))
		return
	}
	if err := h.svc.RequestOTP(r.Context(), payload.Username); err != nil {
		util.RespondError(w, err)
		return
	}
	util.RespondJSON(w, http.StatusOK, map[string]string{"message": "Success"})
}

// Verify handles OTP code verification and token issuance.
func (h Handler) Verify(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Code any `json:"code"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, err)
		return
	}

	result, svcErr := h.svc.VerifyCode(r.Context(), payload.Code)
	if svcErr != nil {
		util.RespondError(w, svcErr)
		return
	}
	util.RespondJSON(w, http.StatusOK, map[string]string{"access_token": result.Token})
}

// Me returns the authenticated user's profile.
func (h Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, err := util.CurrentUserID(r)
	if err != nil {
		util.RespondJSON(w, http.StatusUnauthorized, map[string]string{"message": "unauthorized"})
		return
	}
	user, err := h.svc.CurrentUser(r.Context(), userID)
	if err != nil {
		util.RespondError(w, err)
		return
	}
	util.RespondJSON(w, http.StatusOK, map[string]any{
		"username": user.Email,
		"role":     user.Role,
	})
}
