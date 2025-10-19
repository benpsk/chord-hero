package trending

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
)

// Repository provides Postgres-backed trending queries.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// TrendingSets retrieves curated trending collections.
func (r *Repository) TrendingSets(ctx context.Context) ([]trendingsvc.Trending, error) {
	rows, err := r.db.Query(ctx, `
        SELECT ts.id, ts.name, ts.level_id, l.name, ts.description
        FROM trending_songs ts
        LEFT JOIN levels l ON l.id = ts.level_id
        ORDER BY ts.id ASC
    `)
	if err != nil {
		return nil, fmt.Errorf("list trendings: %w", err)
	}
	defer rows.Close()

	collections := make([]trendingsvc.Trending, 0)

	for rows.Next() {
		var (
			item      trendingsvc.Trending
			levelID   sql.NullInt32
			levelName sql.NullString
			desc      sql.NullString
		)

		if err := rows.Scan(&item.ID, &item.Name, &levelID, &levelName, &desc); err != nil {
			return nil, fmt.Errorf("scan trending: %w", err)
		}

		if levelID.Valid {
			value := int(levelID.Int32)
			item.LevelID = &value
		}
		if levelName.Valid {
			value := titleCase(levelName.String)
			item.Level = &value
		}

		if desc.Valid {
			value := desc.String
			item.Description = &value
		}

		collections = append(collections, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trendings: %w", err)
	}

	return collections, nil
}

// TrendingAlbums returns albums ordered by play count.
func (r *Repository) TrendingAlbums(ctx context.Context) ([]trendingsvc.TrendingAlbum, error) {
	limit := 3
	query := `
		with song_plays as (
			-- step 1: efficiently count plays for each song
			select
				song_id,
				count(*) as play_count
			from
				plays
			where
				created_at >= now() - interval '30 days'
			group by
				song_id
		),
		album_plays as (
			-- step 2: sum up song plays for each album
			select
				aso.album_id,
				sum(sp.play_count) as total_plays
			from
				album_song as aso
			join
				song_plays as sp on aso.song_id = sp.song_id
			group by
				aso.album_id
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
		-- final step: combine album play counts, names, and the new artist json
		select
			ap.album_id,
			al.name as album_name,
			ap.total_plays,
			aaa.artists
		from
			album_plays as ap
		join
			albums as al on ap.album_id = al.id
		left join -- use left join in case an album has plays but no artists linked
			album_artists_agg as aaa on ap.album_id = aaa.album_id
		order by
			ap.total_plays desc
		limit $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending albums: %w", err)
	}
	defer rows.Close()
	albums := make([]trendingsvc.TrendingAlbum, 0, limit)

	for rows.Next() {
		var album trendingsvc.TrendingAlbum
		if err := rows.Scan(&album.ID, &album.Name, &album.TotalPlays, &album.Artists); err != nil {
			return nil, fmt.Errorf("scan trending album: %w", err)
		}
		albums = append(albums, album)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trending albums: %w", err)
	}

	return albums, nil
}

// TrendingArtists returns artists ordered by play count.
func (r *Repository) TrendingArtists(ctx context.Context) ([]trendingsvc.TrendingArtist, error) {
	limit := 3
	query := `
		select
			a.id,
			a.name,
			count(p.song_id) as total_plays
		from
			artists as a
		join
			artist_song as a_s on a.id = a_s.artist_id
		join
			plays as p on a_s.song_id = p.song_id
		where
			p.created_at >= now() - interval '30 days'
		group by
			a.id, a.name
		order by
			total_plays desc
		limit $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending artists: %w", err)
	}
	defer rows.Close()

	artists := make([]trendingsvc.TrendingArtist, 0, limit)

	for rows.Next() {
		var artist trendingsvc.TrendingArtist
		if err := rows.Scan(&artist.ID, &artist.Name, &artist.TotalPlays); err != nil {
			return nil, fmt.Errorf("scan trending artist: %w", err)
		}
		artists = append(artists, artist)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trending artists: %w", err)
	}

	return artists, nil
}

func titleCase(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	lower := strings.ToLower(trimmed)
	return strings.ToUpper(lower[:1]) + lower[1:]
}
