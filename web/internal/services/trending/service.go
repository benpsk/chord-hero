package trending

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Service aggregates trending data sets for the discovery endpoints.
type Service interface {
	TrendingSets(ctx context.Context) ([]Trending, error)
	TrendingAlbums(ctx context.Context, limit int) ([]TrendingAlbum, error)
	TrendingArtists(ctx context.Context, limit int) ([]TrendingArtist, error)
}

// Trending represents a curated trending collection.
type Trending struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Level       *string `json:"level,omitempty"`
	Description *string `json:"description,omitempty"`
}

// TrendingAlbum captures aggregate data for a popular album.
type TrendingAlbum struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

// TrendingArtist captures aggregate data for a popular artist.
type TrendingArtist struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Total int    `json:"total"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService creates a trending service backed by Postgres.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) TrendingSets(ctx context.Context) ([]Trending, error) {
	rows, err := s.db.Query(ctx, `
        SELECT id, name, level, description
        FROM trendings
        ORDER BY id ASC
    `)
	if err != nil {
		return nil, fmt.Errorf("list trendings: %w", err)
	}
	defer rows.Close()

	collections := make([]Trending, 0)

	for rows.Next() {
		var (
			item  Trending
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

func (s *service) TrendingAlbums(ctx context.Context, limit int) ([]TrendingAlbum, error) {
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

	rows, err := s.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending albums: %w", err)
	}
	defer rows.Close()

	albums := make([]TrendingAlbum, 0, limit)

	for rows.Next() {
		var album TrendingAlbum
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

func (s *service) TrendingArtists(ctx context.Context, limit int) ([]TrendingArtist, error) {
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

	rows, err := s.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending artists: %w", err)
	}
	defer rows.Close()

	artists := make([]TrendingArtist, 0, limit)

	for rows.Next() {
		var artist TrendingArtist
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
