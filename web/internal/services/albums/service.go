package albums

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/services/shared"
)

// Service exposes album collection behaviours to HTTP handlers.
type Service interface {
	List(ctx context.Context, params ListParams) (ListResult, error)
}

// ListParams defines the supported filters for listing albums.
type ListParams struct {
	Page       int
	PerPage    int
	Search     string
	UserID     *int
	PlaylistID *int
}

// ListResult aggregates paginated album data.
type ListResult struct {
	Data    []Album `json:"data"`
	Page    int     `json:"page"`
	PerPage int     `json:"per_page"`
	Total   int     `json:"total"`
}

// Album is the transport representation of an album row.
type Album struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Total       int    `json:"total"`
	ReleaseYear *int   `json:"release_year"`
	IsBookmark  bool   `json:"is_bookmark"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService creates a new album service backed by Postgres.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) List(ctx context.Context, params ListParams) (ListResult, error) {
	page := shared.NormalisePage(params.Page)
	perPage := shared.NormalisePerPage(params.PerPage)

	result := ListResult{
		Data:    []Album{},
		Page:    page,
		PerPage: perPage,
	}

	conditions := make([]string, 0)
	args := make([]any, 0)
	argPos := 0

	search := strings.TrimSpace(params.Search)
	if search != "" {
		argPos++
		conditions = append(conditions, fmt.Sprintf("a.name ILIKE $%d", argPos))
		args = append(args, "%"+search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM albums a" + whereClause
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count albums: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        WITH album_totals AS (
            SELECT s.album_id, COUNT(DISTINCT s.id) AS total_songs
            FROM songs s
            WHERE s.album_id IS NOT NULL
            GROUP BY s.album_id
        )
        SELECT a.id, a.name, a.release_year, COALESCE(at.total_songs, 0) AS total_songs
        FROM albums a
        LEFT JOIN album_totals at ON at.album_id = a.id
        %s
        ORDER BY a.name ASC
        LIMIT %s OFFSET %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, perPage, shared.Offset(page, perPage))

	rows, err := s.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list albums: %w", err)
	}
	defer rows.Close()

	albums := make([]Album, 0, perPage)
	albumIndex := make(map[int]int)
	albumIDs := make([]int32, 0, perPage)
	albumTotals := make(map[int]int)

	for rows.Next() {
		var (
			id          int
			name        string
			releaseYear sql.NullInt32
			totalSongs  int
		)

		if err := rows.Scan(&id, &name, &releaseYear, &totalSongs); err != nil {
			return result, fmt.Errorf("scan album: %w", err)
		}

		album := Album{
			ID:    id,
			Name:  name,
			Total: totalSongs,
		}

		if releaseYear.Valid {
			value := int(releaseYear.Int32)
			album.ReleaseYear = &value
		}

		albumTotals[id] = totalSongs
		albumIndex[id] = len(albums)
		albumIDs = append(albumIDs, int32(id))
		albums = append(albums, album)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate albums: %w", err)
	}

	if len(albums) == 0 {
		result.Data = albums
		return result, nil
	}

	if err := s.attachBookmarks(ctx, params, albumIDs, albumTotals, albumIndex, &albums); err != nil {
		return result, err
	}

	result.Data = albums
	return result, nil
}

func (s *service) attachBookmarks(ctx context.Context, params ListParams, albumIDs []int32, totals map[int]int, albumIndex map[int]int, albums *[]Album) error {
	if len(albumIDs) == 0 {
		return nil
	}
	if params.UserID == nil && params.PlaylistID == nil {
		return nil
	}

	var builder strings.Builder
	args := []any{albumIDs}
	argPos := 1

	builder.WriteString(`
        SELECT s.album_id, COUNT(DISTINCT s.id) AS playlist_count
        FROM playlist_song ps
        JOIN songs s ON s.id = ps.song_id
    `)

	if params.UserID != nil {
		builder.WriteString("JOIN playlists p ON p.id = ps.playlist_id\n")
	}

	builder.WriteString("WHERE s.album_id = ANY($1::int4[])\n")

	if params.PlaylistID != nil {
		argPos++
		builder.WriteString(fmt.Sprintf("AND ps.playlist_id = $%d\n", argPos))
		args = append(args, *params.PlaylistID)
	}

	if params.UserID != nil {
		argPos++
		builder.WriteString(fmt.Sprintf("AND p.user_id = $%d\n", argPos))
		args = append(args, *params.UserID)
	}

	builder.WriteString("GROUP BY s.album_id")

	rows, err := s.db.Query(ctx, builder.String(), args...)
	if err != nil {
		return fmt.Errorf("list album bookmarks: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var albumID int
		var playlistCount int

		if err := rows.Scan(&albumID, &playlistCount); err != nil {
			return fmt.Errorf("scan album bookmark: %w", err)
		}

		total, ok := totals[albumID]
		if !ok || total == 0 {
			continue
		}

		if playlistCount >= total {
			if idx, ok := albumIndex[albumID]; ok {
				(*albums)[idx].IsBookmark = true
			}
		}
	}

	return rows.Err()
}
