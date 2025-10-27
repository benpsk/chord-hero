package artists

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"github.com/lyricapp/lyric/web/internal/http/handler"
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
		handler.Error(w, apperror.Validation("failed validation", validationErrors))
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		handler.Error(w, err)
		return
	}
	page := handler.PaginationResponse{
		Data: result.Data,
		Page: result.Page,
		PerPage: result.PerPage,
		Total: result.Total,
	}
	handler.Success(w, http.StatusOK, page)
}
