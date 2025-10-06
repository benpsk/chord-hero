BEGIN;

TRUNCATE TABLE chord_positions RESTART IDENTITY CASCADE;
TRUNCATE TABLE chords RESTART IDENTITY CASCADE;
TRUNCATE TABLE feedbacks RESTART IDENTITY CASCADE;
TRUNCATE TABLE playlist_song RESTART IDENTITY CASCADE;
TRUNCATE TABLE playlists RESTART IDENTITY CASCADE;
TRUNCATE TABLE plays RESTART IDENTITY CASCADE;
TRUNCATE TABLE song_writer RESTART IDENTITY CASCADE;
TRUNCATE TABLE artist_song RESTART IDENTITY CASCADE;
TRUNCATE TABLE songs RESTART IDENTITY CASCADE;
TRUNCATE TABLE album_artist RESTART IDENTITY CASCADE;
TRUNCATE TABLE albums RESTART IDENTITY CASCADE;
TRUNCATE TABLE artists RESTART IDENTITY CASCADE;
TRUNCATE TABLE writers RESTART IDENTITY CASCADE;
TRUNCATE TABLE trendings RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

INSERT INTO users (name, email, role)
VALUES
    ('Alice Nguyen', 'alice@example.com', 'user'),
    ('Ben Harper', 'ben@example.com', 'editor');

INSERT INTO artists (name)
VALUES
    ('Lena Rivers'),
    ('Marcus Lane'),
    ('Nova Collective'),
    ('Evelyn Park'),
    ('Harbor Lights Ensemble');

INSERT INTO writers (name)
VALUES
    ('Lena Rivers'),
    ('Marcus Lane'),
    ('Sienna Brooks'),
    ('Caleb Rhodes');

INSERT INTO albums (name, total, release_year)
VALUES
    ('Morning Light', 10, 2018),
    ('Evening Echoes', 12, 2020),
    ('Acoustic Dreams', 9, 2016),
    ('Urban Hymns', 11, 2019);

INSERT INTO album_artist (album_id, artist_id)
VALUES
    (1, 1),
    (1, 2),
    (2, 2),
    (2, 3),
    (3, 5),
    (3, 1),
    (4, 4),
    (4, 3);

INSERT INTO songs (title, level, key, language, lyric, release_year, created_by, album_id, writer_id)
VALUES
    ('Echoing Skies', 'easy', 'G', 'english', E'Intro: [G]\nEchoing skies carry the dawn.', NULL, 1, 1, 1),
    ('Fading Embers', 'medium', 'D', 'english', E'Verse: [D]\nFading embers spark again.', NULL, 1, 2, 3),
    ('Harbor Lights', 'easy', 'C', 'english', E'Chorus: [C]\nHarbor lights guide me home.', NULL, 1, 3, 4),
    ('Midnight Lanterns', 'hard', 'Bm', 'english', E'Bridge: [Bm]\nLanterns glow in midnight rain.', NULL, 1, 4, 2),
    ('Golden Hours', 'medium', 'A', 'english', E'Verse: [A]\nEvery hour turns to gold.', NULL, 1, 1, 3),
    ('Riverstone', 'easy', 'F', 'english', E'Intro: [F]\nRiverstone softly hums.', NULL, 1, 3, 1),
    ('Silent Aurora', 'hard', 'Em', 'english', E'Verse: [Em]\nSilent aurora breaks the night.', NULL, 1, 2, 4),
    ('Distant Choir', 'medium', 'Dm', 'english', E'Chorus: [Dm]\nHear the distant choir call.', NULL, 1, 4, 3),
    ('Crimson Threads', 'medium', 'Am', 'english', E'Verse: [Am]\nCrimson threads weave the tale.', 2021, 1, NULL, 2),
    ('Lantern Glow', 'easy', 'G', 'english', E'Outro: [G]\nLantern glow will lead us.', NULL, 1, 4, 4),
    ('Whispered Roads', 'easy', 'C', 'burmese', E'Verse: [C]\nTeik sait lan myar let hlan thaw.', 2017, 1, NULL, 1),
    ('Northern Sparks', 'hard', 'E', 'english', E'Verse: [E]\nNorthern sparks ignite the sky.', NULL, 1, 1, 1);

INSERT INTO artist_song (artist_id, song_id)
VALUES
    (1, 1),
    (2, 2),
    (5, 3),
    (4, 4),
    (1, 5),
    (2, 5),
    (5, 6),
    (3, 7),
    (4, 8),
    (3, 8),
    (2, 9),
    (4, 10),
    (3, 11),
    (1, 12),
    (5, 12);

INSERT INTO song_writer (writer_id, song_id)
VALUES
    (1, 1),
    (3, 2),
    (4, 3),
    (2, 4),
    (3, 5),
    (1, 5),
    (1, 6),
    (4, 7),
    (3, 8),
    (2, 8),
    (2, 9),
    (4, 10),
    (1, 11),
    (1, 12),
    (4, 12);

INSERT INTO playlists (name, user_id)
VALUES
    ('Morning Favorites', 1),
    ('Evening Study', 2);

INSERT INTO playlist_song (playlist_id, song_id)
VALUES
    (1, 1),
    (1, 5),
    (1, 9),
    (1, 11),
    (2, 2),
    (2, 4),
    (2, 7),
    (2, 8),
    (2, 10);

INSERT INTO plays (song_id, user_id)
VALUES
    (1, 1),
    (1, 2),
    (2, 1),
    (2, 2),
    (2, 1),
    (3, 1),
    (4, 2),
    (4, 2),
    (4, 1),
    (5, 1),
    (6, 2),
    (7, 2),
    (7, 1),
    (8, 1),
    (8, 2),
    (8, 2),
    (9, 1),
    (10, 2),
    (11, 1),
    (12, 2);

INSERT INTO trendings (name, level, description)
VALUES
    ('Top 10', 'easy', 'Easy songs curated for weekly sets'),
    ('Midweek Focus', 'medium', 'Moderate arrangements trending with teams'),
    ('Advanced Picks', 'hard', 'Challenging selections loved by seasoned players');

INSERT INTO chords (name)
VALUES
    ('C'),
    ('G'),
    ('D');

INSERT INTO chord_positions (chord_id, base_fret, frets, fingers)
VALUES
    (1, 1, '[0, 3, 2, 0, 1, 0]'::jsonb, '[null, 3, 2, null, 1, null]'::jsonb),
    (1, 3, '[3, 5, 5, 5, 3, 3]'::jsonb, '[1, 3, 4, 4, 1, 1]'::jsonb),
    (2, 1, '[3, 2, 0, 0, 0, 3]'::jsonb, '[2, 1, null, null, null, 3]'::jsonb),
    (3, 1, '[0, 0, 0, 2, 3, 2]'::jsonb, '[null, null, null, 1, 3, 2]'::jsonb);

UPDATE albums a
SET total = COALESCE(sub.total_songs, 0)
FROM (
    SELECT s.album_id, COUNT(*) AS total_songs
    FROM songs s
    WHERE s.album_id IS NOT NULL
    GROUP BY s.album_id
) AS sub
WHERE sub.album_id = a.id;

COMMIT;
