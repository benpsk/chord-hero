package albums

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/apperror"
	"github.com/lyricapp/lyric/web/internal/http/handler"
	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
)

// Handler exposes album catalogue endpoints under /api.
type Handler struct {
	svc albumsvc.Service
}

// New wires the album service into a handler instance.
func New(svc albumsvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with paginated albums using the shared API response format.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := albumsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.Search = util.ParseOptionalSearch(query.Get("search"))
	params.PlaylistID = util.ParseOptionalPositiveInt(query.Get("playlist_id"), "playlist_id", validationErrors)
	params.UserID = util.ParseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

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
