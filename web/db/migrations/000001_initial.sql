
--bun:split

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

--bun:split

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'user', 'editor')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

--bun:split

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

--bun:split

CREATE TRIGGER update_artists_updated_at
BEFORE UPDATE ON artists
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total INT,
    release_year INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

--bun:split

CREATE TRIGGER update_albums_updated_at
BEFORE UPDATE ON albums
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS album_artist (
    artist_id INT NOT NULL,
    album_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (artist_id, album_id),
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_album_artist_updated_at
BEFORE UPDATE ON album_artist
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS writers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

--bun:split

CREATE TRIGGER update_writers_updated_at
BEFORE UPDATE ON writers
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

--bun:split

CREATE TRIGGER update_levels_updated_at
BEFORE UPDATE ON levels
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    level_id INT,
    key VARCHAR(20),
    language VARCHAR(50) CHECK (language IN ('english', 'burmese')),
    lyric TEXT,
    release_year INT,
    created_by INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

--bun:split

CREATE TRIGGER update_songs_updated_at
BEFORE UPDATE ON songs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS level_song (
    id SERIAL PRIMARY KEY,
    song_id INT NOT NULL,
    level_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (song_id, level_id, user_id),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_level_song_updated_at
BEFORE UPDATE ON level_song
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS artist_song (
    artist_id INT NOT NULL,
    song_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (artist_id, song_id),
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_artist_song_updated_at
BEFORE UPDATE ON artist_song
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS song_writer (
    writer_id INT NOT NULL,
    song_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (writer_id, song_id),
    FOREIGN KEY (writer_id) REFERENCES writers(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_song_writer_updated_at
BEFORE UPDATE ON song_writer
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();


--bun:split

CREATE TABLE IF NOT EXISTS album_song (
    album_id INT NOT NULL,
    song_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (album_id, song_id),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_album_song_updated_at
BEFORE UPDATE ON album_song
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS plays (
    id SERIAL PRIMARY KEY,
    datetime TIMESTAMP NOT NULL DEFAULT NOW(),
    song_id INT NOT NULL,
    user_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

--bun:split

CREATE TRIGGER update_plays_updated_at
BEFORE UPDATE ON plays
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS playlist_song (
    playlist_id INT NOT NULL,
    song_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_playlist_song_updated_at
BEFORE UPDATE ON playlist_song
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS chords (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

--bun:split

CREATE TRIGGER update_chords_updated_at
BEFORE UPDATE ON chords
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS chord_positions (
    id SERIAL PRIMARY KEY,
    chord_id INT NOT NULL,
    base_fret INT CHECK (base_fret BETWEEN 1 AND 24),
    frets JSONB,
    fingers JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (chord_id) REFERENCES chords(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_chord_positions_updated_at
BEFORE UPDATE ON chord_positions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

--bun:split

CREATE TRIGGER update_feedbacks_updated_at
BEFORE UPDATE ON feedbacks
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

--bun:split

CREATE TABLE IF NOT EXISTS trending_songs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level_id INT,
    description VARCHAR(400),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL
);

--bun:split

CREATE TRIGGER update_trending_songs_updated_at
BEFORE UPDATE ON trending_songs
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
