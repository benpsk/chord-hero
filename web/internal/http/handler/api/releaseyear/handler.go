package releaseyear

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	releaseyearsvc "github.com/lyricapp/lyric/web/internal/services/releaseyear"
)

// Handler exposes release year catalogue functionality.
type Handler struct {
	svc releaseyearsvc.Service
}

// New wires the release year service into an HTTP handler instance.
func New(svc releaseyearsvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with paginated release year data.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := releaseyearsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list release years"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, result)
}
