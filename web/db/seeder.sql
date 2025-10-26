BEGIN;

TRUNCATE TABLE languages RESTART IDENTITY CASCADE;
TRUNCATE TABLE chord_positions RESTART IDENTITY CASCADE;
TRUNCATE TABLE chords RESTART IDENTITY CASCADE;
TRUNCATE TABLE feedbacks RESTART IDENTITY CASCADE;
TRUNCATE TABLE playlist_song RESTART IDENTITY CASCADE;
TRUNCATE TABLE playlists RESTART IDENTITY CASCADE;
TRUNCATE TABLE plays RESTART IDENTITY CASCADE;
TRUNCATE TABLE song_writer RESTART IDENTITY CASCADE;
TRUNCATE TABLE artist_song RESTART IDENTITY CASCADE;
TRUNCATE TABLE album_song RESTART IDENTITY CASCADE;
TRUNCATE TABLE level_song RESTART IDENTITY CASCADE;
TRUNCATE TABLE songs RESTART IDENTITY CASCADE;
TRUNCATE TABLE album_artist RESTART IDENTITY CASCADE;
TRUNCATE TABLE albums RESTART IDENTITY CASCADE;
TRUNCATE TABLE artists RESTART IDENTITY CASCADE;
TRUNCATE TABLE writers RESTART IDENTITY CASCADE;
TRUNCATE TABLE trending_songs RESTART IDENTITY CASCADE;
TRUNCATE TABLE levels RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

INSERT INTO languages (name)
VALUES
    ('Burmese'),
    ('Shan'),
    ('Kachin'),
    ('Zomi'),
    ('Mizo');

INSERT INTO users (email, role)
VALUES
    ('alice@example.com', 'user'),
    ('ben@example.com', 'editor');

INSERT INTO artists (name)
VALUES
    ('Layphyu'),
    ('Myogyi'),
    ('Ahnge'),
    ('Zaw Win Htut');

INSERT INTO writers (name)
VALUES
    ('KAT'),
    ('Ahnge'),
    ('Lwin Moe'),
    ('Myint Moe Aung');

INSERT INTO levels (name)
VALUES
    ('easy'),
    ('medium'),
    ('hard');

INSERT INTO albums (name, total, release_year)
VALUES
    ('IC 20 Anniversary', 10, 2018),
    ('Butterfly', 12, 2020),
    ('Album 01', 9, 2016),
    ('Album 02', 11, 2019);

INSERT INTO playlists (name, user_id)
VALUES
    ('User playlist 01', 1),
    ('User Playlist 02', 2);

INSERT INTO trending_songs (name, level_id, description)
VALUES
    ('Top 10', (SELECT id FROM levels WHERE name = 'easy'), 'Easy songs curated for weekly sets'),
    ('Midweek Focus', (SELECT id FROM levels WHERE name = 'medium'), 'Moderate arrangements trending with teams'),
    ('Advanced Picks', (SELECT id FROM levels WHERE name = 'hard'), 'Challenging selections loved by seasoned players');

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


INSERT INTO admin_users (username, password_hash)
VALUES
    ('admin', '$2y$10$G6oDPlZ0CH/d4ddQmDqFbeF.5P8wZmUmZG5xXrZMaV6FwzpvRXkU6');
COMMIT;
