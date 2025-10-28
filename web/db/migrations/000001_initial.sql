
--bun:split

create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

--bun:split

create table if not exists users (
    id serial primary key,
    email varchar(100) unique not null,
    role varchar(50) not null check (role in ('admin', 'user', 'editor')),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_users_updated_at
before update on users
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists artists (
    id serial primary key,
    name varchar(255) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_artists_updated_at
before update on artists
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists albums (
    id serial primary key,
    name varchar(255) not null,
    total int,
    release_year int,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_albums_updated_at
before update on albums
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists album_artist (
    artist_id int not null,
    album_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    primary key (artist_id, album_id),
    foreign key (artist_id) references artists(id) on delete cascade,
    foreign key (album_id) references albums(id) on delete cascade
);

--bun:split

create trigger update_album_artist_updated_at
before update on album_artist
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists writers (
    id serial primary key,
    name varchar(255) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_writers_updated_at
before update on writers
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists levels (
    id serial primary key,
    name varchar(100) unique not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_levels_updated_at
before update on levels
for each row
execute procedure update_updated_at_column();


create table if not exists languages(
    id serial primary key,
    name varchar(100) unique not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_languages_updated_at
before update on languages
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists songs (
    id serial primary key,
    title varchar(255) not null,
    level_id int,
    key varchar(20),
    language_id int not null,
    lyric text,
    release_year int,
    created_by int,
    status varchar(50) check (status in ('created', 'pending', 'approved', 'declined')) default 'created',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (level_id) references levels(id) on delete set null,
    foreign key (created_by) references users(id) on delete set null,
    foreign key (language_id) references languages(id) on delete set null
);

--bun:split

create trigger update_songs_updated_at
before update on songs
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists level_song (
    id serial primary key,
    song_id int not null,
    level_id int not null,
    user_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique (song_id, level_id, user_id),
    foreign key (song_id) references songs(id) on delete cascade,
    foreign key (level_id) references levels(id) on delete cascade,
    foreign key (user_id) references users(id) on delete cascade
);

--bun:split

create trigger update_level_song_updated_at
before update on level_song
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists artist_song (
    artist_id int not null,
    song_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    primary key (artist_id, song_id),
    foreign key (artist_id) references artists(id) on delete cascade,
    foreign key (song_id) references songs(id) on delete cascade
);

--bun:split

create trigger update_artist_song_updated_at
before update on artist_song
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists song_writer (
    writer_id int not null,
    song_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    primary key (writer_id, song_id),
    foreign key (writer_id) references writers(id) on delete cascade,
    foreign key (song_id) references songs(id) on delete cascade
);

--bun:split

create trigger update_song_writer_updated_at
before update on song_writer
for each row
execute procedure update_updated_at_column();


--bun:split

create table if not exists album_song (
    album_id int not null,
    song_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    primary key (album_id, song_id),
    foreign key (album_id) references albums(id) on delete cascade,
    foreign key (song_id) references songs(id) on delete cascade
);

--bun:split

create trigger update_album_song_updated_at
before update on album_song
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists plays (
    id serial primary key,
    song_id int not null,
    user_id int,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (song_id) references songs(id) on delete cascade,
    foreign key (user_id) references users(id) on delete set null
);

--bun:split

create trigger update_plays_updated_at
before update on plays
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists playlists (
    id serial primary key,
    name varchar(200) not null,
    user_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (user_id) references users(id) on delete cascade
);

--bun:split

create trigger update_playlists_updated_at
before update on playlists
for each row
execute procedure update_updated_at_column();

create table if not exists playlist_user (
    playlist_id int not null,
    user_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (playlist_id) references playlists(id) on delete cascade,
    foreign key (user_id) references users(id) on delete cascade
);

--bun:split

create trigger update_playlist_user_updated_at
before update on playlist_user
for each row
execute procedure update_updated_at_column();
--bun:split

create table if not exists playlist_song (
    playlist_id int not null,
    song_id int not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    primary key (playlist_id, song_id),
    foreign key (playlist_id) references playlists(id) on delete cascade,
    foreign key (song_id) references songs(id) on delete cascade
);

--bun:split

create trigger update_playlist_song_updated_at
before update on playlist_song
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists chords (
    id serial primary key,
    name varchar(100) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

--bun:split

create trigger update_chords_updated_at
before update on chords
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists chord_positions (
    id serial primary key,
    chord_id int not null,
    base_fret int check (base_fret between 1 and 24),
    frets jsonb,
    fingers jsonb,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (chord_id) references chords(id) on delete cascade
);

--bun:split

create trigger update_chord_positions_updated_at
before update on chord_positions
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists feedbacks (
    id serial primary key,
    user_id int not null,
    message text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (user_id) references users(id) on delete cascade
);

--bun:split

create trigger update_feedbacks_updated_at
before update on feedbacks
for each row
execute procedure update_updated_at_column();

--bun:split

create table if not exists trending_songs (
    id serial primary key,
    name varchar(100) not null,
    level_id int,
    description varchar(400),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (level_id) references levels(id) on delete set null
);

--bun:split

create trigger update_trending_songs_updated_at
before update on trending_songs
for each row
execute procedure update_updated_at_column();

create table if not exists user_login_codes (
    user_id int not null unique references users(id) on delete cascade,
    code varchar(12) not null check (char_length(code) = 6),
    used_at timestamptz null,
    expires_at timestamptz not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create trigger update_user_login_codes_updated_at
before update on user_login_codes
for each row
execute procedure update_updated_at_column();
