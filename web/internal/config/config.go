package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

const (
	defaultHTTPAddr        = ":8080"
	defaultShutdownTimeout = 5 * time.Second
	defaultDBMaxConns      = int32(4)
	defaultDBConnLifetime  = 30 * time.Minute
	defaultDBConnIdleTime  = 5 * time.Minute
)

// Config collects runtime configuration for the web service.
type Config struct {
	HTTPAddr        string
	ShutdownTimeout time.Duration
	Database        DatabaseConfig
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	URL             string
	MaxConns        int32
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
}

// Load reads configuration from environment variables and applies sane defaults.
func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:        defaultHTTPAddr,
		ShutdownTimeout: defaultShutdownTimeout,
		Database: DatabaseConfig{
			MaxConns:        defaultDBMaxConns,
			MaxConnLifetime: defaultDBConnLifetime,
			MaxConnIdleTime: defaultDBConnIdleTime,
		},
	}

	if v, ok := os.LookupEnv("WEB_HTTP_ADDR"); ok && v != "" {
		cfg.HTTPAddr = v
	}

	if v, ok := os.LookupEnv("WEB_SHUTDOWN_TIMEOUT"); ok && v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			if seconds, convErr := strconv.Atoi(v); convErr == nil {
				d = time.Duration(seconds) * time.Second
			} else {
				return Config{}, fmt.Errorf("parse WEB_SHUTDOWN_TIMEOUT: %w", err)
			}
		}
		cfg.ShutdownTimeout = d
	}

	dbURL, ok := os.LookupEnv("WEB_DATABASE_URL")
	if !ok || dbURL == "" {
		return Config{}, errors.New("WEB_DATABASE_URL is required")
	}
	cfg.Database.URL = dbURL

	if v, ok := os.LookupEnv("WEB_DATABASE_MAX_CONNS"); ok && v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_DATABASE_MAX_CONNS: %w", err)
		}
		if n <= 0 {
			return Config{}, errors.New("WEB_DATABASE_MAX_CONNS must be positive")
		}
		cfg.Database.MaxConns = int32(n)
	}

	if v, ok := os.LookupEnv("WEB_DATABASE_MAX_CONN_LIFETIME"); ok && v != "" {
		d, err := parseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_DATABASE_MAX_CONN_LIFETIME: %w", err)
		}
		cfg.Database.MaxConnLifetime = d
	}

	if v, ok := os.LookupEnv("WEB_DATABASE_MAX_CONN_IDLE_TIME"); ok && v != "" {
		d, err := parseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_DATABASE_MAX_CONN_IDLE_TIME: %w", err)
		}
		cfg.Database.MaxConnIdleTime = d
	}

	return cfg, nil
}

func parseDuration(input string) (time.Duration, error) {
	d, err := time.ParseDuration(input)
	if err == nil {
		return d, nil
	}

	seconds, convErr := strconv.Atoi(input)
	if convErr == nil {
		return time.Duration(seconds) * time.Second, nil
	}

	return 0, err
}
