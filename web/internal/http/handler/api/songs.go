package api

import (
	"net/http"

	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
)

// SongsHandler exposes song catalogue endpoints.
type SongsHandler struct {
	svc songsvc.Service
}

// NewSongsHandler wires the songs service into an HTTP handler.
func NewSongsHandler(svc songsvc.Service) SongsHandler {
	return SongsHandler{svc: svc}
}

// List responds with a paginated list of songs following the shared API shape.
func (h SongsHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	params := songsvc.ListParams{}
	validationErrors := map[string]string{}

	if page := parseOptionalPositiveInt(query.Get("page"), "page", validationErrors); page != nil {
		params.Page = *page
	}

	if perPage := parseOptionalPositiveInt(query.Get("per_page"), "per_page", validationErrors); perPage != nil {
		params.PerPage = *perPage
	}

	params.AlbumID = parseOptionalPositiveInt(query.Get("album_id"), "album_id", validationErrors)
	params.ArtistID = parseOptionalPositiveInt(query.Get("artist_id"), "artist_id", validationErrors)
	params.WriterID = parseOptionalPositiveInt(query.Get("writer_id"), "writer_id", validationErrors)
	params.ReleaseYear = parseOptionalInt(query.Get("release_year"), "release_year", validationErrors)
	params.PlaylistID = parseOptionalPositiveInt(query.Get("playlist_id"), "playlist_id", validationErrors)
	params.UserID = parseOptionalPositiveInt(query.Get("user_id"), "user_id", validationErrors)

	params.Search = parseOptionalSearch(query.Get("search"))

	if len(validationErrors) > 0 {
		respondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list songs"}})
		return
	}

	respondJSON(w, http.StatusOK, result)
}
