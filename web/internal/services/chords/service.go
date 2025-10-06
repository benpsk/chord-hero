package chords

import "context"

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

// Repository isolates chord persistence.
type Repository interface {
	Find(ctx context.Context, name string) (Chord, error)
}

type service struct {
	repo Repository
}

// NewService creates a chord service backed by a repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Find(ctx context.Context, name string) (Chord, error) {
	return s.repo.Find(ctx, name)
}
