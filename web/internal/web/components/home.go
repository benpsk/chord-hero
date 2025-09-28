package components

import (
	"context"
	"io"

	"github.com/a-h/templ"
)

// Home renders a simple landing page for the API service.
func Home() templ.Component {
	return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
		_, err := io.WriteString(w, `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lyric API</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 3rem; background: #f5f5f5; }
      main { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 2.5rem; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08); }
      h1 { margin-top: 0; font-size: 2rem; color: #111827; }
      p { color: #4b5563; line-height: 1.6; }
      code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Lyric API</h1>
      <p>The web service is running. Check <code>/health</code> for status or extend this page via templ components.</p>
    </main>
  </body>
</html>`)
		return err
	})
}
