package songs

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
)

// Repository provides Postgres-backed song queries.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List returns songs satisfying the supplied filters.
func (r *Repository) List(ctx context.Context, params songsvc.ListParams) (songsvc.ListResult, error) {
	result := songsvc.ListResult{
		Data:    []songsvc.Song{},
		Page:    params.Page,
		PerPage: params.PerPage,
	}

	conditions := make([]string, 0)
	args := make([]any, 0)
	argPos := 0
	nextPlaceholder := func() string {
		argPos++
		return fmt.Sprintf("$%d", argPos)
	}

	search := strings.TrimSpace(params.Search)
	if search != "" {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("s.title ILIKE %s", placeholder))
		args = append(args, "%"+search+"%")
	}

	if params.AlbumID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("s.album_id = %s", placeholder))
		args = append(args, *params.AlbumID)
	}

	if params.ArtistID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM artist_song sa WHERE sa.song_id = s.id AND sa.artist_id = %s)", placeholder))
		args = append(args, *params.ArtistID)
	}

	if params.WriterID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM song_writer sw WHERE sw.song_id = s.id AND sw.writer_id = %s)", placeholder))
		args = append(args, *params.WriterID)
	}

	if params.PlaylistID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM playlist_song ps WHERE ps.song_id = s.id AND ps.playlist_id = %s)", placeholder))
		args = append(args, *params.PlaylistID)
	}

	if params.ReleaseYear != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("COALESCE((SELECT a.release_year FROM albums a WHERE a.id = s.album_id), s.release_year) = %s", placeholder))
		args = append(args, *params.ReleaseYear)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM songs s" + whereClause

	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count songs: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	limitPlaceholder := fmt.Sprintf("$%d", argPos+1)
	offsetPlaceholder := fmt.Sprintf("$%d", argPos+2)

	listQuery := fmt.Sprintf(`
        SELECT
            s.id,
            s.title,
            s.level,
            s.key,
            s.language,
            s.lyric,
            COALESCE((SELECT a.release_year FROM albums a WHERE a.id = s.album_id), s.release_year) AS release_year,
            s.album_id
        FROM songs s
        %s
        ORDER BY s.title ASC
        LIMIT %s OFFSET %s
    `, whereClause, limitPlaceholder, offsetPlaceholder)

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, params.PerPage, offset(params.Page, params.PerPage))

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return result, fmt.Errorf("list songs: %w", err)
	}
	defer rows.Close()

	songs := make([]songsvc.Song, 0, params.PerPage)
	songIndex := make(map[int]int)
	songIDs := make([]int32, 0, params.PerPage)

	for rows.Next() {
		var (
			id          int
			title       string
			level       sql.NullString
			songKey     sql.NullString
			language    sql.NullString
			lyric       sql.NullString
			releaseYear sql.NullInt32
			albumID     sql.NullInt32
		)

		if err := rows.Scan(&id, &title, &level, &songKey, &language, &lyric, &releaseYear, &albumID); err != nil {
			return result, fmt.Errorf("scan song: %w", err)
		}

		song := songsvc.Song{
			ID:         id,
			Title:      title,
			Artists:    []songsvc.Person{},
			Writers:    []songsvc.Person{},
			Albums:     []songsvc.Album{},
			IsBookmark: false,
		}

		if level.Valid {
			value := titleCase(level.String)
			song.Level = &value
		}
		if songKey.Valid {
			value := songKey.String
			song.Key = &value
		}
		if language.Valid {
			value := strings.ToLower(language.String)
			song.Language = &value
		}
		if lyric.Valid {
			value := lyric.String
			song.Lyric = &value
		}
		if releaseYear.Valid {
			value := int(releaseYear.Int32)
			song.ReleaseYear = &value
		}

		if albumID.Valid {
			song.Albums = make([]songsvc.Album, 0, 1)
		}

		songIndex[id] = len(songs)
		songs = append(songs, song)
		songIDs = append(songIDs, int32(id))
	}

	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate songs: %w", err)
	}

	if len(songs) == 0 {
		result.Data = songs
		return result, nil
	}

	if err := r.attachArtists(ctx, songIDs, songIndex, &songs); err != nil {
		return result, err
	}
	if err := r.attachWriters(ctx, songIDs, songIndex, &songs); err != nil {
		return result, err
	}
	if err := r.attachAlbums(ctx, songIDs, songIndex, &songs); err != nil {
		return result, err
	}
	if err := r.attachBookmarks(ctx, params, songIDs, songIndex, &songs); err != nil {
		return result, err
	}

	result.Data = songs

	return result, nil
}

// Create persists a new song along with its artist and writer relations.
func (r *Repository) Create(ctx context.Context, params songsvc.CreateParams) (int, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin create song: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var songID int
	if err := tx.QueryRow(ctx, `
		INSERT INTO songs (title, level, key, language, lyric, release_year, album_id, writer_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`,
		params.Title,
		nullableString(params.Level),
		nullableString(params.Key),
		nullableString(params.Language),
		nullableString(params.Lyric),
		nullableInt(params.ReleaseYear),
		nullableInt(params.AlbumID),
		nullableInt(params.PrimaryWriterID),
		nullableInt(params.CreatedBy),
	).Scan(&songID); err != nil {
		return 0, fmt.Errorf("insert song: %w", err)
	}

	for _, artistID := range params.ArtistIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO artist_song (artist_id, song_id)
			VALUES ($1, $2)
		`, artistID, songID); err != nil {
			return 0, fmt.Errorf("insert artist relation: %w", err)
		}
	}

	for _, writerID := range params.WriterIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO song_writer (writer_id, song_id)
			VALUES ($1, $2)
		`, writerID, songID); err != nil {
			return 0, fmt.Errorf("insert writer relation: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit create song: %w", err)
	}

	return songID, nil
}

func (r *Repository) attachArtists(ctx context.Context, songIDs []int32, songIndex map[int]int, songs *[]songsvc.Song) error {
	query := `
        SELECT sa.song_id, ar.id, ar.name
        FROM artist_song sa
        JOIN artists ar ON ar.id = sa.artist_id
        WHERE sa.song_id = ANY($1::int4[])
        ORDER BY ar.name ASC
    `

	rows, err := r.db.Query(ctx, query, songIDs)
	if err != nil {
		return fmt.Errorf("list artists: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var songID int
		var artist songsvc.Person

		if err := rows.Scan(&songID, &artist.ID, &artist.Name); err != nil {
			return fmt.Errorf("scan artist: %w", err)
		}

		if idx, ok := songIndex[songID]; ok {
			(*songs)[idx].Artists = append((*songs)[idx].Artists, artist)
		}
	}

	return rows.Err()
}

func (r *Repository) attachWriters(ctx context.Context, songIDs []int32, songIndex map[int]int, songs *[]songsvc.Song) error {
	query := `
        SELECT sw.song_id, w.id, w.name
        FROM song_writer sw
        JOIN writers w ON w.id = sw.writer_id
        WHERE sw.song_id = ANY($1::int4[])
        ORDER BY w.name ASC
    `

	rows, err := r.db.Query(ctx, query, songIDs)
	if err != nil {
		return fmt.Errorf("list writers: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var songID int
		var writer songsvc.Person

		if err := rows.Scan(&songID, &writer.ID, &writer.Name); err != nil {
			return fmt.Errorf("scan writer: %w", err)
		}

		if idx, ok := songIndex[songID]; ok {
			(*songs)[idx].Writers = append((*songs)[idx].Writers, writer)
		}
	}

	return rows.Err()
}

func (r *Repository) attachAlbums(ctx context.Context, songIDs []int32, songIndex map[int]int, songs *[]songsvc.Song) error {
	query := `
        SELECT s.id, a.id, a.name, a.release_year
        FROM songs s
        JOIN albums a ON a.id = s.album_id
        WHERE s.id = ANY($1::int4[])
        ORDER BY a.name ASC
    `

	rows, err := r.db.Query(ctx, query, songIDs)
	if err != nil {
		return fmt.Errorf("list albums: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var songID int
		var album songsvc.Album
		var releaseYear sql.NullInt32

		if err := rows.Scan(&songID, &album.ID, &album.Name, &releaseYear); err != nil {
			return fmt.Errorf("scan album: %w", err)
		}

		if releaseYear.Valid {
			value := int(releaseYear.Int32)
			album.ReleaseYear = &value
		}

		if idx, ok := songIndex[songID]; ok {
			(*songs)[idx].Albums = append((*songs)[idx].Albums, album)
		}
	}

	return rows.Err()
}

func (r *Repository) attachBookmarks(ctx context.Context, params songsvc.ListParams, songIDs []int32, songIndex map[int]int, songs *[]songsvc.Song) error {
	if params.UserID == nil && params.PlaylistID == nil {
		return nil
	}

	argPos := 1
	var builder strings.Builder
	args := []any{songIDs}

	builder.WriteString("SELECT DISTINCT ps.song_id FROM playlist_song ps")

	if params.UserID != nil {
		builder.WriteString(" JOIN playlists p ON p.id = ps.playlist_id")
	}

	builder.WriteString(" WHERE ps.song_id = ANY($1::int4[])")

	if params.PlaylistID != nil {
		argPos++
		builder.WriteString(fmt.Sprintf(" AND ps.playlist_id = $%d", argPos))
		args = append(args, *params.PlaylistID)
	}

	if params.UserID != nil {
		argPos++
		builder.WriteString(fmt.Sprintf(" AND p.user_id = $%d", argPos))
		args = append(args, *params.UserID)
	}

	rows, err := r.db.Query(ctx, builder.String(), args...)
	if err != nil {
		return fmt.Errorf("list bookmarks: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var songID int
		if err := rows.Scan(&songID); err != nil {
			return fmt.Errorf("scan bookmark: %w", err)
		}

		if idx, ok := songIndex[songID]; ok {
			(*songs)[idx].IsBookmark = true
		}
	}

	return rows.Err()
}

func offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}

func titleCase(input string) string {
	if input == "" {
		return input
	}

	lower := strings.ToLower(input)
	return strings.ToUpper(lower[:1]) + lower[1:]
}

func nullableString(input *string) any {
	if input == nil {
		return nil
	}
	return *input
}

func nullableInt(input *int) any {
	if input == nil {
		return nil
	}
	return *input
}
