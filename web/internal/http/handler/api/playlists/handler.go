package playlists

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	playlistsvc "github.com/lyricapp/lyric/web/internal/services/playlists"
)

// Handler exposes playlist catalogue operations.
type Handler struct {
	svc playlistsvc.Service
}

// New wires the playlist service into an HTTP handler instance.
func New(svc playlistsvc.Service) Handler {
	return Handler{svc: svc}
}

// List provides a paginated playlist payload.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := playlistsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = util.ParseOptionalSearch(query.Get("search"))
	params.UserID = util.ParseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list playlists"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, result)
}
