begin;

truncate table languages restart identity cascade;
truncate table chord_positions restart identity cascade;
truncate table chords restart identity cascade;
truncate table feedbacks restart identity cascade;
truncate table playlist_song restart identity cascade;
truncate table playlists restart identity cascade;
truncate table plays restart identity cascade;
truncate table song_writer restart identity cascade;
truncate table artist_song restart identity cascade;
truncate table album_song restart identity cascade;
truncate table level_song restart identity cascade;
truncate table songs restart identity cascade;
truncate table albums restart identity cascade;
truncate table artists restart identity cascade;
truncate table writers restart identity cascade;
truncate table trending_songs restart identity cascade;
truncate table levels restart identity cascade;
truncate table users restart identity cascade;

insert into languages (name)
values
    ('Burmese'),
    ('Shan'),
    ('Kachin'),
    ('Zomi'),
    ('Mizo');

insert into artists (name)
values
    ('Layphyu'),
    ('Myogyi'),
    ('Ahnge'),
    ('Zaw Win Htut');

insert into writers (name)
values
    ('KAT'),
    ('Ahnge'),
    ('Lwin Moe'),
    ('Myint Moe Aung');

insert into levels (name)
values
    ('easy'),
    ('medium'),
    ('hard');

insert into albums (name, total, release_year)
values
    ('IC 20 Anniversary', 10, 2018),
    ('Butterfly', 12, 2020),
    ('Album 01', 9, 2016),
    ('Album 02', 11, 2019);


insert into trending_songs (name, level_id, description)
values
    ('Top 10', (select id from levels where name = 'easy'), 'Easy songs for this weekly '),
    ('Midweek Focus', (select id from levels where name = 'medium'), 'Moderate arrangements teams'),
    ('Advanced Picks', (select id from levels where name = 'hard'), 'Challenging selections by players');

insert into chords (name)
values
    ('C'),
    ('G'),
    ('D');

insert into chord_positions (chord_id, base_fret, frets, fingers)
values
    (1, 1, '[0, 3, 2, 0, 1, 0]'::jsonb, '[null, 3, 2, null, 1, null]'::jsonb),
    (1, 3, '[3, 5, 5, 5, 3, 3]'::jsonb, '[1, 3, 4, 4, 1, 1]'::jsonb),
    (2, 1, '[3, 2, 0, 0, 0, 3]'::jsonb, '[2, 1, null, null, null, 3]'::jsonb),
    (3, 1, '[0, 0, 0, 2, 3, 2]'::jsonb, '[null, null, null, 1, 3, 2]'::jsonb);


commit;
