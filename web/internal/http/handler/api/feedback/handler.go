package feedback

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	feedbacksvc "github.com/lyricapp/lyric/web/internal/services/feedback"
)

// Handler manages feedback submissions.
type Handler struct {
	svc feedbacksvc.Service
}

// New constructs a feedback handler.
func New(svc feedbacksvc.Service) Handler {
	return Handler{svc: svc}
}

// Create stores a feedback entry.
func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	var payload struct {
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	message := strings.TrimSpace(payload.Message)

	errorsMap := map[string]string{}
	if message == "" {
		errorsMap["message"] = "message is required"
	}
	if len(message) > 225 {
		errorsMap["message"] = "message is too long"
	}

	if len(errorsMap) > 0 {
		util.RespondJSONOld(w, http.StatusBadRequest, map[string]any{"errors": errorsMap})
		return
	}

	feedback, err := h.svc.Create(r.Context(), feedbacksvc.CreateInput{
		UserID:  userID,
		Message: message,
	})
	if err != nil {
		util.RespondJSONOld(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to store feedback"}})
		return
	}

	util.RespondJSONOld(w, http.StatusCreated, map[string]any{"data": map[string]any{"message": "Feedback submitted", "feedback": feedback}})
}
