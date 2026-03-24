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
}

func Load() *Config {
	// Load .env file if it exists (ignore error if not found)
	godotenv.Load()

	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://siliconsoup:localdev@localhost:5432/siliconsoup?sslmode=disable"),
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		SiteID:        getEnv("SITE_ID", ""),
		AdminAPIKey:   getEnv("ADMIN_API_KEY", ""),
		MyMemoryEmail: getEnv("MYMEMORY_EMAIL", ""),
		NtfyTopic:     getEnv("NTFY_TOPIC", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
