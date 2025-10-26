package artists

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	artistsvc "github.com/lyricapp/lyric/web/internal/services/artists"
)

// Repository provides Postgres-backed access to artist data.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List retrieves artists filtered and paginated per the supplied params.
func (r *Repository) List(ctx context.Context, params artistsvc.ListParams) (artistsvc.ListResult, error) {
	result := artistsvc.ListResult{
		Data:    []artistsvc.Artist{},
		Page:    params.Page,
		PerPage: params.PerPage,
	}

	conditions := make([]string, 0)
	args := make([]any, 0)
	argPos := 0

	search := strings.TrimSpace(params.Search)
	if search != "" {
		argPos++
		conditions = append(conditions, fmt.Sprintf("ar.name ILIKE $%d", argPos))
		args = append(args, "%"+search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "select count(*) from artists ar" + whereClause
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count artists: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        with artist_totals as (
            select sa.artist_id, count(distinct sa.song_id) as total_songs
            from artist_song sa
            group by sa.artist_id
        )
        select ar.id, ar.name, coalesce(at.total_songs, 0) as total_songs
        from artists ar
        left join artist_totals at on at.artist_id = ar.id
        %s
        order by ar.name asc
        limit %s offset %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, params.PerPage, offset(params.Page, params.PerPage))

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list artists: %w", err)
	}
	defer rows.Close()

	artists := make([]artistsvc.Artist, 0, params.PerPage)

	for rows.Next() {
		var artist artistsvc.Artist
		if err := rows.Scan(&artist.ID, &artist.Name, &artist.Total); err != nil {
			return result, fmt.Errorf("scan artist: %w", err)
		}
		artists = append(artists, artist)
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate artists: %w", err)
	}

	result.Data = artists
	return result, nil
}

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
