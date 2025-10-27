package albums

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	albumsvc "github.com/lyricapp/lyric/web/internal/services/albums"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed album queries.
type Repository struct {
	//	db *pgxpool.Pool
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
	return &Repository{db: db}
}

// List returns a paginated set of albums matching the supplied filters.
func (r *Repository) List(ctx context.Context, params albumsvc.ListParams) (albumsvc.ListResult, error) {
	result := albumsvc.ListResult{
		Data:    []albumsvc.Album{},
		Page:    params.Page,
		PerPage: params.PerPage,
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

	countQuery := "select count(*) from albums a" + whereClause
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count albums: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        with album_totals as (
            select s.album_id, count(distinct s.song_id) as total_songs
            from album_song s
            group by s.album_id
        ),
				album_artists_agg as (
					-- step 3: aggregate artists into a json array for each album
					select
						aa.album_id,
						jsonb_agg(
							jsonb_build_object('id', ar.id, 'name', ar.name)
							order by ar.name
						) as artists
					from
						album_artist as aa
					join
						artists as ar on aa.artist_id = ar.id
					group by
						aa.album_id
				)
        select a.id, a.name, a.release_year, coalesce(at.total_songs, 0) as total_songs,
					aaa.artists
        from albums a
        left join album_totals at on at.album_id = a.id
				left join album_artists_agg as aaa on a.id = aaa.album_id
        %s
        order by a.name asc
        limit %s offset %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, params.PerPage, offset(params.Page, params.PerPage))

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list albums: %w", err)
	}
	defer rows.Close()

	albums := make([]albumsvc.Album, 0, params.PerPage)
	albumIndex := make(map[int]int)
	albumIDs := make([]int32, 0, params.PerPage)
	albumTotals := make(map[int]int)

	for rows.Next() {
		var (
			id          int
			name        string
			releaseYear sql.NullInt32
			totalSongs  int
			artists     []albumsvc.Artist
		)

		if err := rows.Scan(&id, &name, &releaseYear, &totalSongs, &artists); err != nil {
			return result, fmt.Errorf("scan album: %w", err)
		}

		album := albumsvc.Album{
			ID:      id,
			Name:    name,
			Total:   totalSongs,
			Artists: artists,
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

	result.Data = albums
	return result, nil
}

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
