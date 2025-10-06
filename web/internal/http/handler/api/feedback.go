package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
)

// FeedbackHandler manages feedback submissions.
type FeedbackHandler struct {
	svc feedbacksvc.Service
}

// NewFeedbackHandler constructs a feedback handler.
func NewFeedbackHandler(svc feedbacksvc.Service) FeedbackHandler {
	return FeedbackHandler{svc: svc}
}

// Create stores a feedback entry.
func (h FeedbackHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Message string `json:"message"`
		UserID  *int   `json:"user_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	userID := resolveUserID(r.Header.Get("X-User-ID"), payload.UserID)
	message := strings.TrimSpace(payload.Message)

	errorsMap := map[string]string{}
	if message == "" {
		errorsMap["message"] = "message is required"
	}
	if userID <= 0 {
		errorsMap["user_id"] = "user_id is required"
	}

	if len(errorsMap) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": errorsMap})
		return
	}

	feedback, err := h.svc.Create(r.Context(), feedbacksvc.CreateInput{
		UserID:  userID,
		Message: message,
	})
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to store feedback"}})
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"message": "Feedback submitted", "feedback": feedback}})
}

func resolveUserID(headerValue string, payloadValue *int) int {
	if payloadValue != nil && *payloadValue > 0 {
		return *payloadValue
	}

	headerValue = strings.TrimSpace(headerValue)
	if headerValue != "" {
		if value, err := strconv.Atoi(headerValue); err == nil && value > 0 {
			return value
		}
	}

	return 1
}
