SHELL := /bin/bash

GOCACHE ?= $(PWD)/.gocache
GOENV := GOCACHE=$(GOCACHE)

tidy: ## Download modules and prune unused dependencies
	@$(GOENV) go mod tidy

fmt: ## Format Go source files
	@$(GOENV) go fmt ./...

build: templ css ## Generate assets and compile binaries
	@$(GOENV) go build ./...

test: ## Run unit tests
	@$(GOENV) go test ./... | grep -v "\[no test files\]"

testv: ## Run unit tests
	@$(GOENV) go test ./... -v | grep -v "\[no test files\]"

migrate: ## Execute the migration command (placeholder)
	@if [ -f .env ]; then \
		set -a; \
		. .env; \
		set +a; \
	fi; \
	$(GOENV) go run ./cmd/migrate

clean: ## Remove build cache
	rm -rf $(GOCACHE)

css: ## Build Tailwind & DaisyUI stylesheets
	npm run build:css

templ: ## Generate templ components
	templ generate

assets: templ css ## Convenience target to refresh generated assets


# run templ generation in watch mode to detect all .templ files and 
# re-create _templ.txt files on change, then send reload event to browser. 
# Default url: http://localhost:7331
live/templ:
	templ generate --watch --proxy="http://localhost:8080" --open-browser=false -v

# run air to detect any go file changes to re-build and re-run the server.
live/server:
	go run github.com/cosmtrek/air@v1.51.0 \
	--build.cmd "go build -o tmp/bin/main ./cmd/api" --build.bin "tmp/bin/main" --build.delay "100" \
	--build.exclude_dir "node_modules" \
	--build.include_ext "go" \
	--build.stop_on_error "false" \
	--misc.clean_on_exit true

# run tailwindcss to generate the styles.css bundle in watch mode.
live/tailwind:
	npx @tailwindcss/cli --yes -i ./internal/web/assets/input.css -o ./static/app.css --minify --watch

# watch for any js or css change in the assets/ folder, then reload the browser via templ proxy.
live/sync_assets:
	go run github.com/air-verse/air@v1.51.0 \\
	--build.cmd \"templ generate --notify-proxy\" \\
	--build.bin \"true\" \\
	--build.delay \"100\" \\
	--build.exclude_dir \"\" \\
	--build.include_dir \"./internal/web/assets\" \\
	--build.include_ext \"js,css\"

# start all 5 watch processes in parallel.
live: 
	make -j5 live/templ live/server live/tailwind live/esbuild live/sync_assets

migrate-test: ## Execute the migration command for test
	@if [ -f .env.test ]; then \
		set -a; \
		source .env.test; \
		set +a; \
	fi; \
	$(GOENV) go run ./cmd/migrate
