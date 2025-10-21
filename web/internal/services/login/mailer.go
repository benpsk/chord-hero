package login

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strings"
	"time"
)

// SMTPSettings describes how to connect to an SMTP relay.
type SMTPSettings struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

type consoleMailer struct {
	from string
}

// NewConsoleMailer logs OTP deliveries instead of sending emails.
func NewConsoleMailer(from string) Mailer {
	return &consoleMailer{from: from}
}

func (m *consoleMailer) SendOTP(_ context.Context, email, code string, expiresAt time.Time) error {
	from := m.from
	if strings.TrimSpace(from) == "" {
		from = "no-reply@localhost"
	}
	log.Printf("[mailer] OTP code=%s to=%s from=%s expires_at=%s", code, email, from, expiresAt.Format(time.RFC3339))
	return nil
}

type smtpMailer struct {
	host     string
	port     int
	username string
	password string
	from     string
}

// NewSMTPMailer uses the provided SMTP settings to send OTP emails.
func NewSMTPMailer(settings SMTPSettings) Mailer {
	return &smtpMailer{
		host:     settings.Host,
		port:     settings.Port,
		username: settings.Username,
		password: settings.Password,
		from:     settings.From,
	}
}

func (m *smtpMailer) SendOTP(_ context.Context, email, code string, expiresAt time.Time) error {
	if strings.TrimSpace(email) == "" {
		return fmt.Errorf("smtp mailer: recipient email is required")
	}

	from := m.from
	if strings.TrimSpace(from) == "" {
		from = m.username
	}
	if strings.TrimSpace(from) == "" {
		return fmt.Errorf("smtp mailer: from address is required")
	}

	subject := "Your login code"
	body := fmt.Sprintf("Your login code is %s. It expires at %s.", code, expiresAt.Format(time.RFC1123Z))

	message := strings.Join([]string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", email),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		fmt.Sprintf("Subject: %s", subject),
		"",
		body,
		"",
	}, "\r\n")

	addr := fmt.Sprintf("%s:%d", m.host, m.port)

	var auth smtp.Auth
	if m.username != "" {
		auth = smtp.PlainAuth("", m.username, m.password, m.host)
	}

	if err := smtp.SendMail(addr, auth, from, []string{email}, []byte(message)); err != nil {
		return fmt.Errorf("smtp mailer: send mail: %w", err)
	}

	return nil
}
