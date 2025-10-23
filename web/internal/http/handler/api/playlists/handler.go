package playlists

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

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
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

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
	params.UserID = &userID

	if len(validationErrors) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": validationErrors})
		return
	}

	result, err := h.svc.List(r.Context(), params)
	log.Println(err)
	if err != nil {
		util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to list playlists"}})
		return
	}

	util.RespondJSON(w, http.StatusOK, result)
}

// Create stores a playlist for the default user.
func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	var payload struct {
		Name string `json:"name"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	name := strings.TrimSpace(payload.Name)
	errorsMap := map[string]string{}
	if name == "" {
		errorsMap["name"] = "name is required"
	}
	if len(errorsMap) > 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": errorsMap})
		return
	}

	playlistID, err := h.svc.Create(r.Context(), playlistsvc.CreateParams{
		Name:   name,
		UserID: userID,
	})
	log.Println(err)
	if err != nil {
		switch {
		case errors.Is(err, playlistsvc.ErrNameRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"name": "name is required"}})
			return
		case errors.Is(err, playlistsvc.ErrInvalidUser):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user not found"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to create playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusCreated, map[string]any{
		"data": map[string]any{
			"message":     "Playlist created successfully",
			"playlist_id": playlistID,
		},
	})
}

// Update renames an existing playlist owned by the authenticated user.
func (h Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "id must be a positive integer"}})
		return
	}

	var payload struct {
		Name string `json:"name"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	name := strings.TrimSpace(payload.Name)
	if name == "" {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"name": "name is required"}})
		return
	}

	if err := h.svc.Update(r.Context(), playlistID, playlistsvc.UpdateParams{
		Name:   name,
		UserID: userID,
	}); err != nil {
		log.Println(err)
		switch {
		case errors.Is(err, playlistsvc.ErrNameRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"name": "name is required"}})
			return
		case errors.Is(err, playlistsvc.ErrPlaylistNotFound):
			util.RespondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "playlist not found"}})
			return
		case errors.Is(err, playlistsvc.ErrInvalidUser):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user not found"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to update playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Playlist updated successfully",
		},
	})
}

// Delete removes a playlist owned by the authenticated user.
func (h Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "id must be a positive integer"}})
		return
	}

	if err := h.svc.Delete(r.Context(), playlistID, userID); err != nil {
		switch {
		case errors.Is(err, playlistsvc.ErrPlaylistNotFound):
			util.RespondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "playlist not found"}})
			return
		case errors.Is(err, playlistsvc.ErrInvalidUser):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user not found"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to delete playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Playlist deleted successfully",
		},
	})
}

// Leave removes the authenticated user from the playlist membership.
func (h Handler) Leave(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "id must be a positive integer"}})
		return
	}

	if err := h.svc.Leave(r.Context(), playlistID, userID); err != nil {
		switch {
		case errors.Is(err, playlistsvc.ErrPlaylistNotFound):
			util.RespondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "playlist not found"}})
			return
		case errors.Is(err, playlistsvc.ErrOwnerCannotLeave):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "playlist owner cannot leave"}})
			return
		case errors.Is(err, playlistsvc.ErrNotMember):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user is not a member of this playlist"}})
			return
		case errors.Is(err, playlistsvc.ErrInvalidUser):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user not found"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to leave playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Left playlist successfully",
		},
	})
}

// RemoveSongs detaches songs from the playlist.
func (h Handler) RemoveSongs(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "id must be a positive integer"}})
		return
	}

	var payload struct {
		SongIDs []int `json:"song_ids"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	validIds := make([]int, 0, len(payload.SongIDs))
	for _, id := range payload.SongIDs {
		if id <= 0 {
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": "song_ids must include positive integers"}})
			return
		}
		validIds = append(validIds, id)
	}
	if len(validIds) == 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": "song_ids must include at least one positive integer"}})
		return
	}

	if err := h.svc.RemoveSongs(r.Context(), playlistID, userID, validIds); err != nil {
		switch {
		case errors.Is(err, playlistsvc.ErrPlaylistNotFound):
			util.RespondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "playlist not found"}})
			return
		case errors.Is(err, playlistsvc.ErrInvalidUser):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "user not found"}})
			return
		case errors.Is(err, playlistsvc.ErrSongsRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": "song_ids must include at least one positive integer"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to remove songs from playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Songs removed from playlist successfully",
		},
	})
}

// Share synchronises shared users for the playlist.
func (h Handler) Share(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}

	rawID := strings.TrimSpace(chi.URLParam(r, "id"))
	playlistID, err := strconv.Atoi(rawID)
	if err != nil || playlistID <= 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "id must be a positive integer"}})
		return
	}

	var payload struct {
		UserIDs []int `json:"user_ids"`
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "invalid JSON payload"}})
		return
	}

	validIDs := make([]int, 0, len(payload.UserIDs))
	for _, id := range payload.UserIDs {
		if id <= 0 {
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"user_ids": "user_ids must contain positive integers"}})
			return
		}
		validIDs = append(validIDs, id)
	}

	if err := h.svc.Share(r.Context(), playlistID, userID, validIDs); err != nil {
		switch {
		case errors.Is(err, playlistsvc.ErrPlaylistNotFound):
			util.RespondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "playlist not found"}})
			return
		case errors.Is(err, playlistsvc.ErrInvalidUser):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"user_ids": "one or more users were not found"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to share playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Playlist sharing updated successfully",
		},
	})
}

// AddSongs attaches the provided songs to the playlist.
func (h Handler) AddSongs(w http.ResponseWriter, r *http.Request) {
	userID, authErr := util.CurrentUserID(r)
	if authErr != nil {
		util.RespondUnauthorized(w)
		return
	}
	playlistParam := strings.TrimSpace(chi.URLParam(r, "playlist_id"))
	playlistID, err := strconv.Atoi(playlistParam)
	if err != nil || playlistID <= 0 {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"message": "playlist_id must be a positive integer"}})
		return
	}

	rawSongIDs := strings.TrimSpace(chi.URLParam(r, "song_ids"))
	if rawSongIDs == "" {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": "song_ids must be provided as comma separated integers"}})
		return
	}

	ids, parseErr := parseSongIDs(rawSongIDs)
	if parseErr != nil {
		util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": parseErr.Error()}})
		return
	}

	if err := h.svc.AddSongs(r.Context(), userID, playlistID, ids); err != nil {
		switch {
		case errors.Is(err, playlistsvc.ErrPlaylistNotFound):
			util.RespondJSON(w, http.StatusNotFound, map[string]any{"errors": map[string]string{"message": "playlist not found"}})
			return
		case errors.Is(err, playlistsvc.ErrSongsRequired):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": "song_ids must include at least one positive integer"}})
			return
		case errors.Is(err, playlistsvc.ErrSongNotFound):
			util.RespondJSON(w, http.StatusBadRequest, map[string]any{"errors": map[string]string{"song_ids": "one or more songs were not found"}})
			return
		default:
			log.Println(err)
			util.RespondJSON(w, http.StatusInternalServerError, map[string]any{"errors": map[string]string{"message": "failed to add songs to playlist"}})
			return
		}
	}

	util.RespondJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"message": "Songs added to playlist successfully",
		},
	})
}

func parseSongIDs(raw string) ([]int, error) {
	parts := strings.Split(raw, ",")
	ids := make([]int, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		id, err := strconv.Atoi(value)
		if err != nil || id <= 0 {
			return nil, errors.New("song_ids must be positive integers separated by commas")
		}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return nil, errors.New("song_ids must include at least one positive integer")
	}

	return ids, nil
}
