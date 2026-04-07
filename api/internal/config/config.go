package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	Port          string
	Environment   string
	SiteID        string
	AdminAPIKey   string
	MyMemoryEmail string
	NtfyTopic     string

	// PayPal
	PayPalClientID     string
	PayPalClientSecret string
	PayPalEnv          string // "sandbox" or "live"

	// SMTP (order notification emails)
	SmtpHost               string
	SmtpPort               string
	SmtpUser               string
	SmtpPass               string
	OrderNotificationEmail string
}

func Load() *Config {
	// Load .env file if it exists (ignore error if not found)
	godotenv.Load()

	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://siliconsoup:localdev@localhost:5432/siliconsoup?sslmode=disable"),
		Port:          getEnv("PORT", "8080"),
		Environment:   getEnv("ENVIRONMENT", "development"),
		SiteID:        getEnv("SITE_ID", ""),
		AdminAPIKey:   getEnv("ADMIN_API_KEY", ""),
		MyMemoryEmail: getEnv("MYMEMORY_EMAIL", ""),
		NtfyTopic:     getEnv("NTFY_TOPIC", ""),

		PayPalClientID:     getEnv("PAYPAL_CLIENT_ID", ""),
		PayPalClientSecret: getEnv("PAYPAL_CLIENT_SECRET", ""),
		PayPalEnv:          getEnv("PAYPAL_ENV", "sandbox"),

		SmtpHost:               getEnv("SMTP_HOST", ""),
		SmtpPort:               getEnv("SMTP_PORT", "587"),
		SmtpUser:               getEnv("SMTP_USER", ""),
		SmtpPass:               getEnv("SMTP_PASS", ""),
		OrderNotificationEmail: getEnv("ORDER_NOTIFICATION_EMAIL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
