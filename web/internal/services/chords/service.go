package chords

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Service retrieves chord definitions.
type Service interface {
	Find(ctx context.Context, name string) (Chord, error)
}

// Chord describes a chord with its playable positions.
type Chord struct {
	ID        int        `json:"id"`
	Name      string     `json:"name"`
	Positions []Position `json:"positions"`
}

// Position captures a chord fingering.
type Position struct {
	ID       int    `json:"id"`
	BaseFret int    `json:"base_fret"`
	Frets    []int  `json:"frets"`
	Fingers  []*int `json:"fingers"`
}

type service struct {
	db *pgxpool.Pool
}

// NewService creates a chord service backed by Postgres.
func NewService(db *pgxpool.Pool) Service {
	return &service{db: db}
}

func (s *service) Find(ctx context.Context, name string) (Chord, error) {
	chord := Chord{}

	row := s.db.QueryRow(ctx, `
        SELECT id, name
        FROM chords
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
    `, strings.TrimSpace(name))

	if err := row.Scan(&chord.ID, &chord.Name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Chord{}, fmt.Errorf("chord not found")
		}
		return Chord{}, fmt.Errorf("find chord: %w", err)
	}

	positions, err := s.fetchPositions(ctx, chord.ID)
	if err != nil {
		return Chord{}, err
	}

	chord.Positions = positions
	return chord, nil
}

func (s *service) fetchPositions(ctx context.Context, chordID int) ([]Position, error) {
	rows, err := s.db.Query(ctx, `
        SELECT id, base_fret, frets, fingers
        FROM chord_positions
        WHERE chord_id = $1
        ORDER BY id ASC
    `, chordID)
	if err != nil {
		return nil, fmt.Errorf("list chord positions: %w", err)
	}
	defer rows.Close()

	positions := make([]Position, 0)

	for rows.Next() {
		var (
			pos         Position
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
