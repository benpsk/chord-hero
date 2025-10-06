package artists

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
)

// Handler describes artist catalogue endpoints.
type Handler struct {
	svc artistsvc.Service
}

// New wires the artist service into an HTTP handler instance.
func New(svc artistsvc.Service) Handler {
	return Handler{svc: svc}
}

// List packages a paginated artist collection.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := artistsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = util.ParseOptionalSearch(query.Get("search"))

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list artists"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, result)
}
