package trending

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	trendingsvc "github.com/lyricapp/lyric/web/internal/services/trending"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed trending queries.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
	return &Repository{db: db}
}

// TrendingSets retrieves curated trending collections.
func (r *Repository) TrendingSets(ctx context.Context) ([]trendingsvc.Trending, error) {
	rows, err := r.db.Query(ctx, `
        select ts.id, ts.name, ts.level_id, l.name, ts.description
        from trending_songs ts
        left join levels l on l.id = ts.level_id
        order by ts.id asc
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
		album_totals as (
			select
				s.album_id,
				count(distinct s.song_id) as total_songs
			from
				album_song s
			group by
				s.album_id
		),
		album_artists_agg as (
			-- step 3: aggregate artists into a json array for each album using artist_song
			select
				sub.album_id,
				jsonb_agg(
					jsonb_build_object('id', sub.artist_id, 'name', sub.artist_name)
				) as artists
			from (
				select distinct
					als.album_id,
					ar.id as artist_id,
					ar.name as artist_name
				from
					album_song als
				join
					artist_song ars on als.song_id = ars.song_id
				join
					artists ar on ars.artist_id = ar.id
			) as sub
			group by
				sub.album_id
		),
		album_writers_agg as (
			-- step 4: aggregate writers into a json array for each album
			select
				sub.album_id,
				jsonb_agg(
					jsonb_build_object('id', sub.writer_id, 'name', sub.writer_name)
				) as writers
			from (
				select distinct
					als.album_id,
					w.id as writer_id,
					w.name as writer_name
				from
					album_song als
				join
					song_writer sw on als.song_id = sw.song_id
				join
					writers w on sw.writer_id = w.id
			) as sub
			group by
				sub.album_id
		)
		-- final step: combine album play counts, names, and the new artist json
		select
			ap.album_id,
			al.name as album_name,
			al.release_year,
			coalesce(at.total_songs, 0) as total_songs,
			coalesce(aaa.artists, '[]'::jsonb) as artists,
			coalesce(awa.writers, '[]'::jsonb) as writers
		from
			album_plays as ap
		join
			albums as al on ap.album_id = al.id
		left join
			album_totals as at on ap.album_id = at.album_id
		left join -- use left join in case an album has plays but no artists linked
			album_artists_agg as aaa on ap.album_id = aaa.album_id
		left join
			album_writers_agg as awa on ap.album_id = awa.album_id
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
		var (
			album       trendingsvc.TrendingAlbum
			releaseYear sql.NullInt32
		)
		if err := rows.Scan(&album.ID, &album.Name, &releaseYear, &album.Total, &album.Artists, &album.Writers); err != nil {
			return nil, fmt.Errorf("scan trending album: %w", err)
		}
		if releaseYear.Valid {
			value := int(releaseYear.Int32)
			album.ReleaseYear = &value
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
		total := 0
		if err := rows.Scan(&artist.ID, &artist.Name, &total); err != nil {
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
