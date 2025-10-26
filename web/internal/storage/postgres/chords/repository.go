package chords

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lyricapp/lyric/web/internal/apperror"
	chords "github.com/lyricapp/lyric/web/internal/services/chords"
)

// Repository provides Postgres-backed chord lookups.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository constructs a Repository instance.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Find locates a chord by name and loads its positions.
func (r *Repository) Find(ctx context.Context, name string) (chords.Chord, error) {
	chord := chords.Chord{}

	row := r.db.QueryRow(ctx, `
        select id, name
        from chords
        where lower(name) = lower($1)
        limit 1
    `, strings.TrimSpace(name))

	if err := row.Scan(&chord.ID, &chord.Name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return chords.Chord{}, apperror.NotFound("chord not found")
		}
		return chords.Chord{}, fmt.Errorf("find chord: %w", err)
	}

	positions, err := r.fetchPositions(ctx, chord.ID)
	if err != nil {
		return chords.Chord{}, err
	}

	chord.Positions = positions
	return chord, nil
}

func (r *Repository) fetchPositions(ctx context.Context, chordID int) ([]chords.Position, error) {
	rows, err := r.db.Query(ctx, `
        select id, base_fret, frets, fingers
        from chord_positions
        where chord_id = $1
        order by id asc
    `, chordID)
	if err != nil {
		return nil, fmt.Errorf("list chord positions: %w", err)
	}
	defer rows.Close()

	positions := make([]chords.Position, 0)

	for rows.Next() {
		var (
			pos         chords.Position
			fretsJSON   []byte
			fingersJSON []byte
		)

		if err := rows.Scan(&pos.ID, &pos.BaseFret, &fretsJSON, &fingersJSON); err != nil {
			return nil, fmt.Errorf("scan chord position: %w", err)
		}

		var frets []int
		if len(fretsJSON) > 0 {
			if err := json.Unmarshal(fretsJSON, &frets); err != nil {
				return nil, fmt.Errorf("decode chord frets: %w", err)
			}
		}
		pos.Frets = frets

		var fingers []*int
		if len(fingersJSON) > 0 {
			if err := json.Unmarshal(fingersJSON, &fingers); err != nil {
				return nil, fmt.Errorf("decode chord fingers: %w", err)
			}
		}
		pos.Fingers = fingers

		positions = append(positions, pos)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate chord positions: %w", err)
	}

	return positions, nil
}
