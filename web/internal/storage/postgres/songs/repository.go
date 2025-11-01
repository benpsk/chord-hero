package songs

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/lyricapp/lyric/web/internal/apperror"
	songsvc "github.com/lyricapp/lyric/web/internal/services/songs"
	"github.com/lyricapp/lyric/web/internal/storage"
)

// Repository provides Postgres-backed song queries.
type Repository struct {
	db storage.Querier
}

// NewRepository constructs a Repository instance.
func NewRepository(db storage.Querier) *Repository {
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

	if params.UserID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("created_by = %s", placeholder))
		args = append(args, *params.UserID)
	}

	if params.AlbumID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("exists (select 1 from album_song als where als.song_id = s.id and als.album_id = %s)", placeholder))
		args = append(args, *params.AlbumID)
	}

	if params.ArtistID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("exists (select 1 from artist_song sa where sa.song_id = s.id and sa.artist_id = %s)", placeholder))
		args = append(args, *params.ArtistID)
	}

	if params.WriterID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("exists (select 1 from song_writer sw where sw.song_id = s.id and sw.writer_id = %s)", placeholder))
		args = append(args, *params.WriterID)
	}

	if params.PlaylistID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("exists (select 1 from playlist_song ps where ps.song_id = s.id and ps.playlist_id = %s)", placeholder))
		args = append(args, *params.PlaylistID)
	}

	if params.LevelID != nil {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("s.level_id = %s", placeholder))
		args = append(args, *params.LevelID)
	}

	if len(params.LanguageIDs) > 0 {
		placeholder := nextPlaceholder()
		conditions = append(conditions, fmt.Sprintf("s.language_id = ANY(%s)", placeholder))
		args = append(args, params.LanguageIDs)
	}

	joins := []string{"left join users cu on cu.id = s.created_by"}
	withClause := ""
	orderClause := "order by s.id desc"

	authUserID := 0
	if params.AuthenticatedUserID != nil && *params.AuthenticatedUserID > 0 {
		authUserID = *params.AuthenticatedUserID
	}

	if params.IsTrending && params.LevelID != nil {
		withClause = `
        with play_counts as (
            select
                p.song_id,
                count(*) as total_plays
            from plays p
            where p.created_at >= now() - interval '30 days'
            group by p.song_id
        )`
		joins = append(joins, "join play_counts pc on pc.song_id = s.id")
		orderClause = "order by pc.total_plays desc, s.id desc"
	}

	if params.ReleaseYear != nil {
		placeholder := nextPlaceholder()
		joins = append(joins, "left join album_song als on als.song_id = s.id")
		conditions = append(conditions, fmt.Sprintf("coalesce((select a.release_year from albums a where a.id = als.album_id), s.release_year) = %s", placeholder))
		args = append(args, *params.ReleaseYear)
	}

	joinClause := ""
	if len(joins) > 0 {
		joinClause = " " + strings.Join(joins, " ")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "select count(*) from songs s" + joinClause + whereClause
	if withClause != "" {
		countQuery = withClause + "\n" + countQuery
	}

	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&result.Total); err != nil {
		return result, fmt.Errorf("count songs: %w", err)
	}

	if result.Total == 0 {
		return result, nil
	}

	listArgs := append([]any{}, args...)
	userLevelSelect := "NULL"
	if authUserID > 0 {
		userPlaceholder := fmt.Sprintf("$%d", len(listArgs)+1)
		userLevelSelect = fmt.Sprintf("(select ls.level_id from level_song ls where ls.song_id = s.id and ls.user_id = %s limit 1)", userPlaceholder)
		listArgs = append(listArgs, authUserID)
	}

	limitPlaceholder := fmt.Sprintf("$%d", len(listArgs)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(listArgs)+2)

	listQuery := fmt.Sprintf(`
        select
            s.id,
            s.title,
            l.name,
            s.level_id,
            s.key,
            s.lyric,
            s.release_year,
            s.status,
            la.id language_id,
            la.name language_name,
            s.created_by,
            cu.email,
            cu.status,
            %s as user_level_id
        from songs s
        left join levels l on l.id = s.level_id
        left join languages la on la.id = s.language_id
        %s
        %s
        %s
        limit %s offset %s
    `, userLevelSelect, joinClause, whereClause, orderClause, limitPlaceholder, offsetPlaceholder)

	if withClause != "" {
		listQuery = withClause + "\n" + listQuery
	}

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
			id            int
			title         string
			levelName     sql.NullString
			levelID       sql.NullInt32
			songKey       sql.NullString
			lyric         sql.NullString
			releaseYear   sql.NullInt32
			status        string
			languageID    int
			languageName  string
			createdBy     sql.NullInt32
			creatorEmail  sql.NullString
			creatorStatus sql.NullString
			userLevelID   sql.NullInt32
		)

		if err := rows.Scan(&id, &title, &levelName, &levelID, &songKey, &lyric, &releaseYear, &status,
			&languageID, &languageName, &createdBy, &creatorEmail, &creatorStatus, &userLevelID); err != nil {
			return result, fmt.Errorf("scan song: %w", err)
		}

		song := songsvc.Song{
			ID:          id,
			Title:       title,
			Artists:     []songsvc.Person{},
			Writers:     []songsvc.Person{},
			Albums:      []songsvc.Album{},
			PlaylistIDs: []int{},
			Status:      status,
		}

		if levelID.Valid {
			level := songsvc.Level{
				ID: int(levelID.Int32),
			}
			if levelName.Valid {
				level.Name = titleCase(levelName.String)
			}
			song.Level = &level
		}
		song.Language = songsvc.Language{
			ID:   int(languageID),
			Name: titleCase(languageName),
		}
		if songKey.Valid {
			value := songKey.String
			song.Key = &value
		}
		if lyric.Valid {
			value := lyric.String
			song.Lyric = &value
		}
		if releaseYear.Valid {
			value := int(releaseYear.Int32)
			song.ReleaseYear = &value
		}
		if userLevelID.Valid {
			value := int(userLevelID.Int32)
			song.UserLevelID = &value
		}
		if createdBy.Valid {
			creator := songsvc.Creator{
				ID: int(createdBy.Int32),
			}
			email := ""
			if creatorEmail.Valid {
				email = strings.TrimSpace(creatorEmail.String)
			}
			status := ""
			if creatorStatus.Valid {
				status = creatorStatus.String
			}
			if email != "" {
				if !isActiveStatus(status) {
					email = maskEmail(email)
				}
				creator.Email = email
			}
			song.Created = &creator
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
	if err := r.attachPlaylists(ctx, params, songIDs, songIndex, &songs); err != nil {
		return result, err
	}

	result.Data = songs

	return result, nil
}

// Get returns a single song by identifier including related entities.
func (r *Repository) Get(ctx context.Context, id int) (songsvc.Song, error) {
	query := `
        select
            s.id,
            s.title,
            l.name,
            s.level_id,
            s.key,
            s.language,
            s.lyric,
            s.release_year,
						la.id language_id,
						la.name language_name
        from songs s
        left join levels l on l.id = s.level_id
        left join languages la on la.id = s.language_id
        where s.id = $1
    `
	var (
		levelName   sql.NullString
		levelID     sql.NullInt32
		songKey     sql.NullString
		language    sql.NullString
		lyric       sql.NullString
		releaseYear sql.NullInt32
		song        songsvc.Song
	)

	if err := r.db.QueryRow(ctx, query, id).Scan(
		&song.ID,
		&song.Title,
		&levelName,
		&levelID,
		&songKey,
		&language,
		&lyric,
		&releaseYear,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return songsvc.Song{}, apperror.NotFound("song not found")
		}
		return songsvc.Song{}, fmt.Errorf("get song: %w", err)
	}

	if levelID.Valid {
		level := songsvc.Level{
			ID: int(levelID.Int32),
		}
		if levelName.Valid {
			level.Name = titleCase(levelName.String)
		}
		song.Level = &level
	}
	if songKey.Valid {
		value := songKey.String
		song.Key = &value
	}
	if lyric.Valid {
		value := lyric.String
		song.Lyric = &value
	}
	if releaseYear.Valid {
		value := int(releaseYear.Int32)
		song.ReleaseYear = &value
	}

	song.Artists = []songsvc.Person{}
	song.Writers = []songsvc.Person{}
	song.Albums = []songsvc.Album{}
	song.PlaylistIDs = []int{}

	songs := []songsvc.Song{song}
	songIndex := map[int]int{id: 0}
	songIDs := []int32{int32(id)}

	if err := r.attachArtists(ctx, songIDs, songIndex, &songs); err != nil {
		return songsvc.Song{}, err
	}
	if err := r.attachWriters(ctx, songIDs, songIndex, &songs); err != nil {
		return songsvc.Song{}, err
	}
	if err := r.attachAlbums(ctx, songIDs, songIndex, &songs); err != nil {
		return songsvc.Song{}, err
	}

	return songs[0], nil
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
		insert into songs (title, level_id, key, language_id, lyric, release_year, created_by)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning id
	`,
		params.Title,
		nullableInt(params.LevelID),
		nullableString(params.Key),
		params.LanguageID,
		nullableString(params.Lyric),
		nullableInt(params.ReleaseYear),
		nullableInt(params.CreatedBy),
	).Scan(&songID); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return 0, apperror.BadRequest("A related resources does not exist")
		}
		return 0, fmt.Errorf("insert songs: %w", err)
	}

	for _, artistID := range params.ArtistIDs {
		if _, err := tx.Exec(ctx, `
			insert into artist_song (artist_id, song_id)
			values ($1, $2)
		`, artistID, songID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return 0, apperror.BadRequest("invalid artist_id")
			}
			return 0, err
		}
	}

	for _, writerID := range params.WriterIDs {
		if _, err := tx.Exec(ctx, `
			insert into song_writer (writer_id, song_id)
			values ($1, $2)
		`, writerID, songID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return 0, apperror.BadRequest("invalid writer_id")
			}
			return 0, err
		}
	}

	for _, albumID := range params.AlbumIDs {
		if _, err := tx.Exec(ctx, `
			insert into album_song (album_id, song_id)
			values ($1, $2)
		`, albumID, songID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return 0, apperror.BadRequest("invalid album_id")
			}
			return 0, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit create song: %w", err)
	}

	return songID, nil
}

// Update mutates an existing song and refreshes its relations.
func (r *Repository) Update(ctx context.Context, id int, params songsvc.UpdateParams) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin update song: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	cmdTag, err := tx.Exec(ctx, `
		update songs
		set title = $1,
		    level_id = $2,
		    key = $3,
		    language_id = $4,
		    lyric = $5,
		    release_year = $6
		where id = $7 and created_by = $8
	`, params.Title,
		nullableInt(params.LevelID),
		nullableString(params.Key),
		params.LanguageID,
		nullableString(params.Lyric),
		nullableInt(params.ReleaseYear),
		id,
		params.UserID,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return apperror.BadRequest("A related resources does not exist")
		}
		return fmt.Errorf("update song: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("song not found")
	}

	if _, err := tx.Exec(ctx, `delete from artist_song where song_id = $1`, id); err != nil {
		return fmt.Errorf("clear artist relations: %w", err)
	}
	if _, err := tx.Exec(ctx, `delete from song_writer where song_id = $1`, id); err != nil {
		return fmt.Errorf("clear writer relations: %w", err)
	}
	if _, err := tx.Exec(ctx, `delete from album_song where song_id = $1`, id); err != nil {
		return fmt.Errorf("clear album relations: %w", err)
	}

	for _, artistID := range params.ArtistIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO artist_song (artist_id, song_id)
			VALUES ($1, $2)
		`, artistID, id); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return apperror.BadRequest("invalid artist_id")
			}
			return fmt.Errorf("insert artist relation: %w", err)
		}
	}
	for _, writerID := range params.WriterIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO song_writer (writer_id, song_id)
			VALUES ($1, $2)
		`, writerID, id); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return apperror.BadRequest("invalid writer_id")
			}
			return fmt.Errorf("insert writer relation: %w", err)
		}
	}
	for _, albumID := range params.AlbumIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO album_song (album_id, song_id)
			VALUES ($1, $2)
		`, albumID, id); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return apperror.BadRequest("invalid album_id")
			}
			return fmt.Errorf("insert album relation: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit update song: %w", err)
	}

	return nil
}

// Delete removes a song and cascades related records via FK constraints.
func (r *Repository) Delete(ctx context.Context, id int, params songsvc.DeleteParams) error {
	var (
		cmdTag pgconn.CommandTag
		err    error
	)

	if params.UserID != nil {
		cmdTag, err = r.db.Exec(ctx, `
			delete from songs
			where id = $1 and created_by = $2
		`, id, *params.UserID)
	} else {
		cmdTag, err = r.db.Exec(ctx, `
			delete from songs
			where id = $1
		`, id)
	}
	if err != nil {
		return fmt.Errorf("delete song: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("song not found")
	}
	return nil
}

// UpdateStatus changes the workflow status for a song owned by the supplied user.
func (r *Repository) UpdateStatus(ctx context.Context, id int, status string, userID int) error {
	cmdTag, err := r.db.Exec(ctx, `
		update songs
		set status = $1
		where id = $2 and created_by = $3
	`, status, id, userID)
	if err != nil {
		return fmt.Errorf("update song status: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("song not found")
	}

	return nil
}

// AssignLevel updates the level association for a song.
func (r *Repository) AssignLevel(ctx context.Context, songID, levelID, userID int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin assign level: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	cmdTag, err := tx.Exec(ctx, `
        update songs
        set level_id = $1
        where id = $2
    `, levelID, songID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return apperror.BadRequest("invalid level_id")
		}
		return fmt.Errorf("assign level update song: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return apperror.NotFound("song not found")
	}

	if _, err := tx.Exec(ctx, `
        INSERT INTO level_song (song_id, level_id, user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (song_id, level_id, user_id) DO UPDATE
        SET updated_at = NOW()
    `, songID, levelID, userID); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
			return apperror.BadRequest("invalid resources")
		}
		return fmt.Errorf("assign level insert relation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit assign level: %w", err)
	}

	return nil
}

// SyncPlaylists replaces the playlists associated with a song for the provided user.
func (r *Repository) SyncPlaylists(ctx context.Context, songID, userID int, playlistIDs []int) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin sync song playlists: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var songExists bool
	if err := tx.QueryRow(ctx, `
        select exists(select 1 from songs where id = $1)
    `, songID).Scan(&songExists); err != nil {
		return fmt.Errorf("check song exists: %w", err)
	}
	if !songExists {
		return apperror.NotFound("song not found")
	}

	if len(playlistIDs) > 0 {
		rows, err := tx.Query(ctx, `
            select id
            from playlists
            where user_id = $1 and id = any($2::int4[])
        `, userID, playlistIDs)
		if err != nil {
			return fmt.Errorf("verify playlist ownership: %w", err)
		}
		defer rows.Close()

		owned := make(map[int]struct{}, len(playlistIDs))
		for rows.Next() {
			var id int
			if err := rows.Scan(&id); err != nil {
				return fmt.Errorf("scan playlist ownership: %w", err)
			}
			owned[id] = struct{}{}
		}
		if err := rows.Err(); err != nil {
			return fmt.Errorf("iterate playlist ownership: %w", err)
		}

		if len(owned) != len(playlistIDs) {
			return apperror.Unauthorized("unauthorized playlist access")
		}
	}

	if _, err := tx.Exec(ctx, `
        delete from playlist_song
        where song_id = $1
          and playlist_id in (select id from playlists where user_id = $2)
    `, songID, userID); err != nil {
		return fmt.Errorf("clear existing song playlists: %w", err)
	}

	for _, playlistID := range playlistIDs {
		if _, err := tx.Exec(ctx, `
            insert into playlist_song (playlist_id, song_id)
            values ($1, $2)
        `, playlistID, songID); err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == pgerrcode.ForeignKeyViolation {
				return apperror.BadRequest("invalid playlist or song reference")
			}
			return fmt.Errorf("insert song playlist relation: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit sync song playlists: %w", err)
	}

	return nil
}

func isActiveStatus(status string) bool {
	return strings.EqualFold(strings.TrimSpace(status), "active")
}

func maskEmail(email string) string {
	email = strings.TrimSpace(email)
	if email == "" {
		return "****"
	}
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[1]) == "" {
		return "****"
	}
	return "****@" + strings.TrimSpace(parts[1])
}

func (r *Repository) attachArtists(ctx context.Context, songIDs []int32, songIndex map[int]int, songs *[]songsvc.Song) error {
	query := `
        select sa.song_id, ar.id, ar.name
        from artist_song sa
        join artists ar on ar.id = sa.artist_id
        where sa.song_id = any($1::int4[])
        order by ar.name asc
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
        select sw.song_id, w.id, w.name
        from song_writer sw
        join writers w on w.id = sw.writer_id
        where sw.song_id = any($1::int4[])
        order by w.name asc
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
        select s.id, a.id, a.name, a.release_year
        from songs s
        join album_song als on als.song_id = s.id
        join albums a on a.id = als.album_id
        where s.id = any($1::int4[])
        order by a.name asc
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

func (r *Repository) attachPlaylists(ctx context.Context, params songsvc.ListParams, songIDs []int32, songIndex map[int]int, songs *[]songsvc.Song) error {
	log.Println(params.UserID)
	if params.UserID == nil && params.PlaylistID == nil && params.AuthenticatedUserID == nil {
		return nil
	}

	argPos := 1
	var builder strings.Builder
	args := []any{songIDs}

	builder.WriteString("select ps.song_id, ps.playlist_id from playlist_song ps")

	if params.UserID != nil || params.AuthenticatedUserID != nil {
		builder.WriteString(" join playlists p on p.id = ps.playlist_id")
	}

	builder.WriteString(" where ps.song_id = any($1::int4[])")

	if params.PlaylistID != nil {
		argPos++
		builder.WriteString(fmt.Sprintf(" AND ps.playlist_id = $%d", argPos))
		args = append(args, *params.PlaylistID)
	}

	switch {
	case params.UserID != nil:
		argPos++
		builder.WriteString(fmt.Sprintf(" AND p.user_id = $%d", argPos))
		args = append(args, *params.UserID)
	case params.AuthenticatedUserID != nil:
		argPos++
		builder.WriteString(fmt.Sprintf(" AND p.user_id = $%d", argPos))
		args = append(args, *params.AuthenticatedUserID)
	}

	builder.WriteString(" order by ps.playlist_id asc")

	rows, err := r.db.Query(ctx, builder.String(), args...)
	if err != nil {
		return fmt.Errorf("list song playlists: %w", err)
	}
	defer rows.Close()

	seen := make(map[int]map[int]struct{}, len(songIDs))

	for rows.Next() {
		var (
			songID     int
			playlistID int
		)
		if err := rows.Scan(&songID, &playlistID); err != nil {
			return fmt.Errorf("scan song playlist: %w", err)
		}

		if idx, ok := songIndex[songID]; ok {
			if _, exists := seen[songID]; !exists {
				seen[songID] = make(map[int]struct{})
			}
			if _, exists := seen[songID][playlistID]; exists {
				continue
			}
			seen[songID][playlistID] = struct{}{}
			(*songs)[idx].PlaylistIDs = append((*songs)[idx].PlaylistIDs, playlistID)
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
