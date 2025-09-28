SHELL := /bin/bash

GOCACHE ?= $(PWD)/.gocache
GOENV := GOCACHE=$(GOCACHE)
TEMPL_MOD := github.com/a-h/templ/cmd/templ@v0.3.943
TEMPL_BIN ?= $(shell command -v templ 2>/dev/null)
ifdef TEMPL_BIN
TEMPL_CMD := $(TEMPL_BIN)
else
TEMPL_CMD := $(GOENV) go run $(TEMPL_MOD)
endif

.PHONY: help tidy fmt build test run migrate clean css templ assets

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS=":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

tidy: ## Download modules and prune unused dependencies
	@$(GOENV) go mod tidy

fmt: ## Format Go source files
	@$(GOENV) go fmt ./...

build: templ css ## Generate assets and compile binaries
	@$(GOENV) go build ./...

test: ## Run unit tests
	@$(GOENV) go test ./...

run: ## Start the full dev environment with live reload
	@./scripts/dev.sh

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
	@$(TEMPL_CMD) generate

assets: templ css ## Convenience target to refresh generated assets
