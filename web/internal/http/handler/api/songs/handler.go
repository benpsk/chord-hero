package songs

import (
	"net/http"

	"github.com/lyricapp/lyric/web/internal/http/handler/api/util"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
)

// Handler exposes song catalogue endpoints.
type Handler struct {
	svc songsvc.Service
}

// New wires the songs service into an HTTP handler.
func New(svc songsvc.Service) Handler {
	return Handler{svc: svc}
}

// List responds with a paginated list of songs following the shared API shape.
func (h Handler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := songsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := util.ParseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := util.ParseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.AlbumID = util.ParseOptionalPositiveInt(query.Get("album_id"), "album_id", validationErrors)
	params.ArtistID = util.ParseOptionalPositiveInt(query.Get("artist_id"), "artist_id", validationErrors)
	params.WriterID = util.ParseOptionalPositiveInt(query.Get("writer_id"), "writer_id", validationErrors)
	params.ReleaseYear = util.ParseOptionalInt(query.Get("release_year"), "release_year", validationErrors)
	params.PlaylistID = util.ParseOptionalPositiveInt(query.Get("playlist_id"), "playlist_id", validationErrors)
	params.UserID = util.ParseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

	params.Search = util.ParseOptionalSearch(query.Get("search"))

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list songs"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, result)
}
