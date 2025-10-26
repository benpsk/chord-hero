package login

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/jwtauth/v5"
	"github.com/lyricapp/lyric/web/internal/apperror"
)

const (
	digits              = "0123456789"
	defaultCodeLength   = 6
	defaultCodeValidity = 5 * time.Minute
)

// Service manages OTP login workflows.
type Service interface {
	RequestOTP(ctx context.Context, email string) error
	VerifyCode(ctx context.Context, code any) (VerifyResult, error)
	TokenAuth() *jwtauth.JWTAuth
	CurrentUser(ctx context.Context, userID int) (User, error)
}

// Repository abstracts persistence needs for OTP login.
type Repository interface {
	FindOrCreateUser(ctx context.Context, email string) (User, error)
	CreateLoginCode(ctx context.Context, userID int, code string, expiresAt time.Time) error
	ConsumeLoginCode(ctx context.Context, code string, attemptedAt time.Time) (User, bool, error)
	FindUserByID(ctx context.Context, userID int) (User, error)
}

// Mailer dispatches OTP codes to users.
type Mailer interface {
	SendOTP(ctx context.Context, email, code string, expiresAt time.Time) error
}

// Config captures service-level settings.
type Config struct {
	CodeLength  int
	TTL         time.Duration
	TokenSecret string
	TokenTTL    time.Duration
}

// User mirrors the data required from persistence.
type User struct {
	ID    int
	Email string
	Role  string
}

type service struct {
	repo       Repository
	mailer     Mailer
	codeLength int
	ttl        time.Duration
	tokenAuth  *jwtauth.JWTAuth
	tokenTTL   time.Duration
	now        func() time.Time
}

// VerifyResult encapsulates the outcome of a successful code verification.
type VerifyResult struct {
	Token string
	User  User
}

// NewService assembles the default login OTP workflow.
func NewService(repo Repository, mailer Mailer, cfg Config) Service {
	length := cfg.CodeLength
	if length <= 0 {
		length = defaultCodeLength
	}

	ttl := cfg.TTL
	if ttl <= 0 {
		ttl = defaultCodeValidity
	}

	return &service{
		repo:       repo,
		mailer:     mailer,
		codeLength: length,
		ttl:        ttl,
		tokenAuth:  jwtauth.New("HS256", []byte(cfg.TokenSecret), nil),
		tokenTTL:   cfg.TokenTTL,
		now:        time.Now,
	}
}

func (s *service) validate(email string) error {
	ve := map[string]string{}
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		ve["username"] = "username is required."
	}
	if !isValidEmail(email) {
		ve["username"] = "username is invalid."
	}
	if len(ve) > 0 {
		return apperror.Validation("msg", ve)
	}
	return nil
}

// RequestOTP generates and dispatches a one-time login code.
func (s *service) RequestOTP(ctx context.Context, email string) error {
	err := s.validate(email)
	if err != nil {
		return err
	}
	user, err := s.repo.FindOrCreateUser(ctx, email)
	if err != nil {
		return apperror.NotFound("user not found")
	}

	code, err := s.generateCode()
	if err != nil {
		return fmt.Errorf("generate otp: %w", err)
	}

	expiresAt := s.now().Add(s.ttl)
	if err := s.repo.CreateLoginCode(ctx, user.ID, code, expiresAt); err != nil {
		return fmt.Errorf("store otp: %w", err)
	}

	if s.mailer != nil {
		if err := s.mailer.SendOTP(ctx, user.Email, code, expiresAt); err != nil {
			return fmt.Errorf("deliver otp: %w", err)
		}
	}

	return nil
}

func (s *service) generateCode() (string, error) {
	var builder strings.Builder
	builder.Grow(s.codeLength)

	max := big.NewInt(int64(len(digits)))
	for i := 0; i < s.codeLength; i++ {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		builder.WriteByte(digits[n.Int64()])
	}

	return builder.String(), nil
}

func isValidEmail(value string) bool {
	addr, err := mail.ParseAddress(value)
	if err != nil {
		return false
	}
	return strings.EqualFold(addr.Address, value)
}

func normalizeCode(value any) (string, error) {
	ve := map[string]string{}
	switch v := value.(type) {
	case string:
		code := strings.TrimSpace(v)
		if code == "" {
			ve["code"] = "code is required"
			return "", apperror.Validation("msg", ve)
		}
		return code, nil
	case json.Number:
		if v == "" {
			ve["code"] = "code is required"
			return "", apperror.Validation("msg", ve)
		}
		if _, err := v.Int64(); err != nil {
			ve["code"] = "code must be numeric"
			return "", apperror.Validation("msg", ve)
		}
		return v.String(), nil
	case float64:
		if v < 0 {
			ve["code"] = "code must be numeric"
			return "", apperror.Validation("msg", ve)
		}
		return strconv.FormatInt(int64(v), 10), nil
	case nil:
		ve["code"] = "code is required"
		return "", apperror.Validation("msg", ve)
	default:
		ve["code"] = "code must be numeric"
		return "", apperror.Validation("msg", ve)
	}
}

// VerifyCode validates an OTP code and issues an access token.
func (s *service) VerifyCode(ctx context.Context, otp any) (VerifyResult, error) {
	code, err := normalizeCode(otp)
	if err != nil {
		return VerifyResult{}, err
	}
	ve := map[string]string{}
	if len(code) != s.codeLength || !isDigits(code) {
		ve["code"] = "Code is invalid or has the wrong format."
		return VerifyResult{}, apperror.Validation("msg", ve)
	}

	now := s.now()
	user, ok, err := s.repo.ConsumeLoginCode(ctx, code, now)
	if err != nil {
		return VerifyResult{}, fmt.Errorf("consume otp: %w", err)
	}
	if !ok {
		ve["code"] = "Code is invalid."
		return VerifyResult{}, apperror.Validation("msg", ve)
	}

	claims := map[string]any{
		"sub":   strconv.Itoa(user.ID),
		"email": user.Email,
		"role":  user.Role,
		"iat":   now.Unix(),
		"exp":   now.Add(s.resolveTokenTTL()).Unix(),
		"typ":   "access",
	}

	_, token, err := s.tokenAuth.Encode(claims)
	if err != nil {
		return VerifyResult{}, fmt.Errorf("encode jwt: %w", err)
	}

	return VerifyResult{
		Token: token,
		User:  user,
	}, nil
}

func (s *service) resolveTokenTTL() time.Duration {
	if s.tokenTTL <= 0 {
		return 24 * time.Hour
	}
	return s.tokenTTL
}

// TokenAuth exposes the jwt auth helper for middleware wiring.
func (s *service) TokenAuth() *jwtauth.JWTAuth {
	return s.tokenAuth
}

// CurrentUser retrieves the latest user profile.
func (s *service) CurrentUser(ctx context.Context, userID int) (User, error) {
	if userID <= 0 {
		return User{}, apperror.Unauthorized("Unauthorized")
	}
	return s.repo.FindUserByID(ctx, userID)
}

func isDigits(value string) bool {
	for _, r := range value {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
