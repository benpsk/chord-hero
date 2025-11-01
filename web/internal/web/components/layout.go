package components

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"github.com/a-h/templ"
)

var defaultBaseURL = func() string {
	if url := os.Getenv("WEB_URL"); url != "" {
		return url
	}
	return "https://lyric.app"
}()
const defaultOGImage = "/static/opengraph/default.png"

// PageMeta captures metadata rendered in the shared layout.
type PageMeta struct {
	Title       string
	Description string
	Canonical   string
	Path        string
	OGImage     string
	OGType      string
	TwitterCard string
	ActiveNav   string
	MainClass   string
	NoIndex     bool
	SchemaJSON  string
	ExtraHead   []templ.Component
	BodyScripts []templ.Component
}

func (m PageMeta) canonicalURL() string {
	if strings.TrimSpace(m.Canonical) != "" {
		return m.Canonical
	}
	if strings.TrimSpace(m.Path) != "" {
		if strings.HasPrefix(m.Path, "http://") || strings.HasPrefix(m.Path, "https://") {
			return m.Path
		}
		return strings.TrimSuffix(defaultBaseURL, "/") + ensureLeadingSlash(m.Path)
	}
	return ""
}

func ensureLeadingSlash(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}

func (m PageMeta) titleValue() string {
	if strings.TrimSpace(m.Title) != "" {
		return m.Title
	}
	return "Lyric"
}

func (m PageMeta) descriptionValue() string {
	if strings.TrimSpace(m.Description) != "" {
		return m.Description
	}
	return "Lyric helps worship teams and bands plan, rehearse, and perform with confidence."
}

func (m PageMeta) ogTypeValue() string {
	if strings.TrimSpace(m.OGType) != "" {
		return m.OGType
	}
	return "website"
}

func (m PageMeta) ogImageValue() string {
	if strings.TrimSpace(m.OGImage) != "" {
		if strings.HasPrefix(m.OGImage, "http://") || strings.HasPrefix(m.OGImage, "https://") {
			return m.OGImage
		}
		return strings.TrimSuffix(defaultBaseURL, "/") + ensureLeadingSlash(m.OGImage)
	}
	return defaultOGImage
}

func (m PageMeta) twitterCardValue() string {
	if strings.TrimSpace(m.TwitterCard) != "" {
		return m.TwitterCard
	}
	return "summary_large_image"
}

func (m PageMeta) mainClassValue() string {
	if strings.TrimSpace(m.MainClass) != "" {
		return m.MainClass
	}
	return "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10"
}

// JSONScript renders inline JSON payloads safely inside script tags.
func JSONScript(id string, payload string) templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		escapedID := template.HTMLEscapeString(id)
		escapedPayload := template.HTMLEscapeString(payload)
		_, err := io.WriteString(w, fmt.Sprintf(`<script type="application/json" id="%s">%s</script>`, escapedID, escapedPayload))
		return err
	})
}

// InlineScript renders inline JavaScript with proper escaping.
func InlineScript(js string) templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		escaped := template.JSEscapeString(js)
		_, err := io.WriteString(w, `<script>`+escaped+`</script>`)
		return err
	})
}

// StructuredData renders JSON-LD blocks for SEO rich results.
func StructuredData(jsonLD string) templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		trimmed := strings.TrimSpace(jsonLD)
		if trimmed == "" {
			return nil
		}
		escaped := template.HTMLEscapeString(trimmed)
		_, err := io.WriteString(w, `<script type="application/ld+json">`+escaped+`</script>`)
		return err
	})
}

// WebPageSchema builds a JSON-LD fragment for standard web pages.
func WebPageSchema(name, description, url string) string {
	return pageSchema(name, description, url, "WebPage")
}

// SongsResultsSchema builds a JSON-LD fragment for songs pages.
func SongsResultsSchema(name, description, url string) string {
	return pageSchema(name, description, url, "SearchResultsPage")
}

func pageSchema(name, description, url, pageType string) string {
	schema := map[string]string{
		"@context":    "https://schema.org",
		"@type":       pageType,
		"name":        name,
		"description": description,
	}
	if strings.TrimSpace(url) != "" {
		schema["url"] = url
	}
	bytes, err := json.Marshal(schema)
	if err != nil {
		log.Panicf("failed to marshal schema JSON: %v", err)
	}
	return string(bytes)
}

// renderExtraHead returns optional head components.
func (m PageMeta) renderExtraHead() []templ.Component {
	return m.ExtraHead
}

// renderBodyScripts returns optional body components appended after the layout.
func (m PageMeta) renderBodyScripts() []templ.Component {
	return m.BodyScripts
}

// renderSchema returns the structured data component when provided.
func (m PageMeta) renderSchema() templ.Component {
	if strings.TrimSpace(m.SchemaJSON) == "" {
		return nil
	}
	return StructuredData(m.SchemaJSON)
}

// layoutNow ensures we use a consistent timestamp across the layout during rendering.
func layoutNow() time.Time {
	return time.Now()
}

// BodyScripts is a helper to build a slice of templ components for inline scripts.
func BodyScripts(components ...templ.Component) []templ.Component {
	return components
}
