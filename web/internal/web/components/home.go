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
<html lang="en" data-theme="light" class="h-full">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lyric API</title>
    <link rel="stylesheet" href="/static/app.css" />
  </head>
  <body class="min-h-full bg-base-200">
    <div class="hero min-h-screen px-6">
      <div class="hero-content text-center">
        <div class="max-w-xl space-y-6">
          <span class="badge badge-outline">Welcome</span>
          <h1 class="text-4xl font-semibold">Lyric API</h1>
          <p class="text-base-content/70 text-lg leading-relaxed">
            The web service is running. Check
            <code class="badge badge-neutral px-3 py-2 font-mono text-sm">/health</code>
            for status or extend this page via templ components.
          </p>
          <div class="join join-vertical gap-3 sm:join-horizontal sm:gap-0">
            <a class="btn btn-primary join-item" href="/health">View Health Check</a>
            <a class="btn btn-outline join-item" href="https://github.com/lyricapp/lyric" target="_blank" rel="noreferrer">View Repository</a>
          </div>
          <div class="alert alert-info">
            <span class="font-medium">Tailwind + DaisyUI</span>
            <span class="text-sm text-base-content/80">
              Styles compile to <span class="font-mono">/static/app.css</span>. Update
              <span class="font-mono">internal/web/assets/input.css</span> to customize themes.
            </span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`)
		return err
	})
}
