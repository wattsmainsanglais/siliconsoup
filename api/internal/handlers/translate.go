package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// targetLocales are the 5 non-English locales Gardapis supports
var targetLocales = []struct {
	locale   string // next-intl locale key
	langPair string // MyMemory langpair value
}{
	{"fr", "en|fr"},
	{"de", "en|de"},
	{"it", "en|it"},
	{"es", "en|es"},
	{"pt", "en|pt-PT"},
}

type myMemoryResponse struct {
	ResponseData struct {
		TranslatedText string `json:"translatedText"`
	} `json:"responseData"`
	ResponseStatus int `json:"responseStatus"`
}

// myMemoryTranslate calls the MyMemory API to translate a single text string.
// Returns the translated text, or the original text on any error (English fallback).
func myMemoryTranslate(text, langPair, email string) string {
	if text == "" {
		return ""
	}

	client := &http.Client{Timeout: 10 * time.Second}

	reqURL := fmt.Sprintf(
		"https://api.mymemory.translated.net/get?q=%s&langpair=%s&de=%s",
		url.QueryEscape(text),
		url.QueryEscape(langPair),
		url.QueryEscape(email),
	)

	resp, err := client.Get(reqURL)
	if err != nil {
		return text
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return text
	}

	var result myMemoryResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return text
	}

	if result.ResponseStatus != 200 || result.ResponseData.TranslatedText == "" {
		return text
	}

	return result.ResponseData.TranslatedText
}

// seedTranslations writes the English content into all 5 target locales as a baseline.
// Called on product create so translations is never NULL — the Translate button overwrites
// these with real translations later.
func seedTranslations(db *pgxpool.Pool, productID string, shortDesc, desc *string) error {
	type localeTranslation struct {
		ShortDescription string `json:"short_description,omitempty"`
		Description      string `json:"description,omitempty"`
	}

	translations := make(map[string]localeTranslation)
	for _, target := range targetLocales {
		t := localeTranslation{}
		if shortDesc != nil {
			t.ShortDescription = *shortDesc
		}
		if desc != nil {
			t.Description = *desc
		}
		translations[target.locale] = t
	}

	translationsJSON, err := json.Marshal(translations)
	if err != nil {
		return fmt.Errorf("failed to marshal seed translations: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.Exec(ctx,
		"UPDATE products SET translations = $1 WHERE id = $2",
		translationsJSON, productID,
	)
	return err
}

// translateProduct translates short_description and description (if set) into all 5
// target locales, stores the result in products.translations, and returns the JSON.
// Product names are not translated — they are proper product names.
// Returns an error if the email is missing, marshalling fails, or the DB write fails.
func translateProduct(db *pgxpool.Pool, productID string, shortDesc, desc *string, email string) (json.RawMessage, error) {
	if email == "" {
		return nil, fmt.Errorf("MYMEMORY_EMAIL not set")
	}

	type localeTranslation struct {
		ShortDescription string `json:"short_description,omitempty"`
		Description      string `json:"description,omitempty"`
	}

	translations := make(map[string]localeTranslation)

	for _, target := range targetLocales {
		t := localeTranslation{}
		if shortDesc != nil && *shortDesc != "" {
			t.ShortDescription = myMemoryTranslate(*shortDesc, target.langPair, email)
		}
		if desc != nil && *desc != "" {
			t.Description = myMemoryTranslate(*desc, target.langPair, email)
		}
		translations[target.locale] = t
	}

	translationsJSON, err := json.Marshal(translations)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal translations: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.Exec(ctx,
		"UPDATE products SET translations = $1 WHERE id = $2",
		translationsJSON, productID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to store translations: %w", err)
	}

	log.Printf("[translate] translations stored for product %s", productID)
	return translationsJSON, nil
}
