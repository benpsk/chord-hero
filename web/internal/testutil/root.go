package testutil

import (
	"os"
	"path/filepath"
)

// ProjectRoot finds the project root by looking for the go.mod file.
func ProjectRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		panic(err)
	}

	for {
		_, err := os.Stat(filepath.Join(wd, "go.mod"))
		if err == nil {
			return wd
		}

		parent := filepath.Dir(wd)
		if parent == wd {
			panic("go.mod not found")
		}
		wd = parent
	}
}
