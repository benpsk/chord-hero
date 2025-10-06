package writers

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	writersvc "github.com/lyricapp/lyric/web/internal/services/writers"
)

// Handler describes writer catalogue endpoints.
type Handler struct {
	svc writersvc.Service
}

// New wires the writer service into a handler instance.
func New(svc writersvc.Service) Handler {
	return Handler{svc: svc}
}

// List packages a paginated writer collection.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := writersvc.ListParams{}
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
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list writers"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, result)
}
