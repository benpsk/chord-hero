package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

const (
	defaultHTTPAddr           = ":8080"
	defaultShutdownTimeout    = 5 * time.Second
	defaultDBMaxConns         = int32(4)
	defaultDBConnLifetime     = 30 * time.Minute
	defaultDBConnIdleTime     = 5 * time.Minute
	defaultAdminSessionCookie = "admin_session"
	defaultAdminSessionTTL    = 24 * time.Hour
	defaultAppEnv             = "production"
	defaultFrontendUrl        = "http://localhost:8080"
	defaultAuthOTPLength      = 6
	defaultAuthOTPTTL         = 5 * time.Minute
	defaultSMTPPort           = 587
	defaultAuthTokenSecret    = "change-me"
	defaultAuthTokenTTL       = 24 * time.Hour
)

// Config collects runtime configuration for the web service.
type Config struct {
	HTTPAddr        string
	ShutdownTimeout time.Duration
	Database        DatabaseConfig
	Admin           AdminConfig
	Api             ApiConfig
	Auth            AuthConfig
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	URL             string
	MaxConns        int32
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
}

// AdminConfig holds configuration for the admin surface.
type AdminConfig struct {
	SessionSecret string
	SessionCookie string
	SessionTTL    time.Duration
	SessionSecure bool
}

type ApiConfig struct {
	AppEnv      string
	FrontendUrl string
}

// AuthConfig contains settings for login OTP generation and delivery.
type AuthConfig struct {
	OTPLength   int
	OTPTTL      time.Duration
	TokenSecret string
	TokenTTL    time.Duration
	SMTP        SMTPConfig
}

// SMTPConfig encapsulates email transport configuration.
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
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
		Admin: AdminConfig{
			SessionCookie: defaultAdminSessionCookie,
			SessionTTL:    defaultAdminSessionTTL,
			SessionSecure: false,
		},
		Api: ApiConfig{
			AppEnv:      defaultAppEnv,
			FrontendUrl: defaultFrontendUrl,
		},
		Auth: AuthConfig{
			OTPLength:   defaultAuthOTPLength,
			OTPTTL:      defaultAuthOTPTTL,
			TokenSecret: defaultAuthTokenSecret,
			TokenTTL:    defaultAuthTokenTTL,
			SMTP: SMTPConfig{
				Port: defaultSMTPPort,
			},
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

	secret, ok := os.LookupEnv("WEB_ADMIN_SESSION_SECRET")
	if !ok || secret == "" {
		return Config{}, errors.New("WEB_ADMIN_SESSION_SECRET is required")
	}
	cfg.Admin.SessionSecret = secret

	if v, ok := os.LookupEnv("WEB_ADMIN_SESSION_COOKIE"); ok && v != "" {
		cfg.Admin.SessionCookie = v
	}

	if v, ok := os.LookupEnv("WEB_ADMIN_SESSION_TTL"); ok && v != "" {
		d, err := parseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_ADMIN_SESSION_TTL: %w", err)
		}
		cfg.Admin.SessionTTL = d
	}

	if v, ok := os.LookupEnv("WEB_ADMIN_SESSION_SECURE"); ok && v != "" {
		secure, err := strconv.ParseBool(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_ADMIN_SESSION_SECURE: %w", err)
		}
		cfg.Admin.SessionSecure = secure
	}

	if v, ok := os.LookupEnv("APP_ENV"); ok && v != "" {
		cfg.Api.AppEnv = v
	}
	if v, ok := os.LookupEnv("FRONTEND_URL"); ok && v != "" {
		cfg.Api.FrontendUrl = v
	}

	if v, ok := os.LookupEnv("WEB_AUTH_OTP_LENGTH"); ok && v != "" {
		length, err := strconv.Atoi(v)
		if err != nil || length <= 0 {
			return Config{}, fmt.Errorf("parse WEB_AUTH_OTP_LENGTH: %w", err)
		}
		cfg.Auth.OTPLength = length
	}

	if v, ok := os.LookupEnv("WEB_AUTH_OTP_TTL"); ok && v != "" {
		d, err := parseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_AUTH_OTP_TTL: %w", err)
		}
		cfg.Auth.OTPTTL = d
	}

	if v, ok := os.LookupEnv("WEB_SMTP_HOST"); ok && v != "" {
		cfg.Auth.SMTP.Host = v
	}

	if v, ok := os.LookupEnv("WEB_SMTP_PORT"); ok && v != "" {
		port, err := strconv.Atoi(v)
		if err != nil || port <= 0 {
			return Config{}, fmt.Errorf("parse WEB_SMTP_PORT: %w", err)
		}
		cfg.Auth.SMTP.Port = port
	}

	if v, ok := os.LookupEnv("WEB_SMTP_USERNAME"); ok {
		cfg.Auth.SMTP.Username = v
	}

	if v, ok := os.LookupEnv("WEB_SMTP_PASSWORD"); ok {
		cfg.Auth.SMTP.Password = v
	}

	if v, ok := os.LookupEnv("WEB_SMTP_FROM"); ok && v != "" {
		cfg.Auth.SMTP.From = v
	}

	if v, ok := os.LookupEnv("WEB_AUTH_TOKEN_SECRET"); ok && v != "" {
		cfg.Auth.TokenSecret = v
	}

	if v, ok := os.LookupEnv("WEB_AUTH_TOKEN_TTL"); ok && v != "" {
		d, err := parseDuration(v)
		if err != nil {
			return Config{}, fmt.Errorf("parse WEB_AUTH_TOKEN_TTL: %w", err)
		}
		cfg.Auth.TokenTTL = d
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
