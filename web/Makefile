SHELL := /bin/bash

GOCACHE ?= $(PWD)/.gocache
GOENV := GOCACHE=$(GOCACHE)

.PHONY: help tidy fmt build test run migrate clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS=":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

tidy: ## Download modules and prune unused dependencies
	@$(GOENV) go mod tidy

fmt: ## Format Go source files
	@$(GOENV) go fmt ./...

build: ## Compile all binaries
	@$(GOENV) go build ./...

test: ## Run unit tests
	@$(GOENV) go test ./...

run: ## Start the API server locally
	@if [ -f .env ]; then \
		set -a; \
		. .env; \
		set +a; \
	fi; \
	$(GOENV) go run ./cmd/api

migrate: ## Execute the migration command (placeholder)
	@if [ -f .env ]; then \
		set -a; \
		. .env; \
		set +a; \
	fi; \
	$(GOENV) go run ./cmd/migrate

clean: ## Remove build cache
	rm -rf $(GOCACHE)
