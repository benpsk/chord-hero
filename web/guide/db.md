# db structure 

## users table 
- name => string[100]
- email => string[100]
- role => enum [admin, user, editor]

## artists table 
- name => string[255]

## albums table 
- name => string[255]
- total => int

## album_artist table 
- artist_id => foreign key to artists table
- album_id => foreign key to albums table
- [artist_id, albums_id] pair unique

## writers table 
- name => string[255]

## songs table 
- title => string[255]
- level => enum[easy, medium, hard]
- key => string[20]
- language => enum [english, burmese]
- lyric text
- release_year => int [for digit]
- created_by => foreign key to users table => nullable
- album_id => foreign key to albums table => nullable
- writer_id => foreign key to writers table => nullable

## artist_song table 
- artist_id => foreign key to artists table
- song_id => foreign key to songs table
- [artist_id, song_id] pair unique

## song_writer table 
- writer_id=> foreign key to writers table
- song_id => foreign key to songs table
- [writer_id, song_id] pair unique

## plays table
- datetime => datetime
- song_id => foreign key to songs table
- user_id => foreign key to users table => nullable

## playlists table 
- name => string[200]
- user_id => foreign key to users table

## playlist_song table
- playlist_id => foreign key to playlists table
- song_id => foriegn key to songs table
- [playlist_id, song_id] pair unique

## chords table
- name => string[100] => [c, cm, d, dm]

## chord_positions table 
- chord_id => foreign key to chords table
- base_fret => int [between 1 to 24]
- frets => int json [-1, 3, 2, 0, 1, 0]
- fingers => json [null, 3, 2, null, 1, null],

## feedbacks table
- user_id => foreign key to users table
- message => text 

## trendings table
- name => string[100]
- level => enum[easy, medium, hard]
- description => string[400]

* for all of the table add the below - 
* add id => auto increment
* add created_at=> timestamp 
* add updated_at => timestamp [auto update on table update]




