package trending

import (
	"context"
	"database/sql"
	"fmt"

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
        SELECT id, name, level, description
        FROM trendings
        ORDER BY id ASC
    `)
	if err != nil {
		return nil, fmt.Errorf("list trendings: %w", err)
	}
	defer rows.Close()

	collections := make([]trendingsvc.Trending, 0)

	for rows.Next() {
		var (
			item  trendingsvc.Trending
			level sql.NullString
			desc  sql.NullString
		)

		if err := rows.Scan(&item.ID, &item.Name, &level, &desc); err != nil {
			return nil, fmt.Errorf("scan trending: %w", err)
		}

		if level.Valid {
			value := level.String
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
func (r *Repository) TrendingAlbums(ctx context.Context, limit int) ([]trendingsvc.TrendingAlbum, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
        WITH album_plays AS (
            SELECT s.album_id, COUNT(*) AS play_count
            FROM plays p
            JOIN songs s ON s.id = p.song_id
            WHERE s.album_id IS NOT NULL
            GROUP BY s.album_id
        )
        SELECT a.id, a.name, ap.play_count
        FROM album_plays ap
        JOIN albums a ON a.id = ap.album_id
        ORDER BY ap.play_count DESC, a.name ASC
        LIMIT $1
    `

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending albums: %w", err)
	}
	defer rows.Close()

	albums := make([]trendingsvc.TrendingAlbum, 0, limit)

	for rows.Next() {
		var album trendingsvc.TrendingAlbum
		if err := rows.Scan(&album.ID, &album.Name, &album.Total); err != nil {
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
func (r *Repository) TrendingArtists(ctx context.Context, limit int) ([]trendingsvc.TrendingArtist, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
        WITH artist_plays AS (
            SELECT sa.artist_id, COUNT(*) AS play_count
            FROM plays p
            JOIN songs s ON s.id = p.song_id
            JOIN artist_song sa ON sa.song_id = s.id
            GROUP BY sa.artist_id
        )
        SELECT ar.id, ar.name, ap.play_count
        FROM artist_plays ap
        JOIN artists ar ON ar.id = ap.artist_id
        ORDER BY ap.play_count DESC, ar.name ASC
        LIMIT $1
    `

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending artists: %w", err)
	}
	defer rows.Close()

	artists := make([]trendingsvc.TrendingArtist, 0, limit)

	for rows.Next() {
		var artist trendingsvc.TrendingArtist
		if err := rows.Scan(&artist.ID, &artist.Name, &artist.Total); err != nil {
			return nil, fmt.Errorf("scan trending artist: %w", err)
		}
		artists = append(artists, artist)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate trending artists: %w", err)
	}

	return artists, nil
}
