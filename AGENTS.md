# Repository Guidelines

## Overview
- `mobile/`: React Native (Expo) application; follow the mobile guide below.
- `web/`: Go web + API service; follow the web guide below.

## Mobile (`./mobile`)

### Project Structure & Module Organization
- `app/`: Expo Router routes (`_layout.tsx`, `+not-found.tsx`, `(tabs)/...`).
- `components/`: Reusable React components (PascalCase `.tsx`).
- `hooks/`: Custom hooks (`use*.ts`/`.tsx`).
- `constants/`: App constants (e.g., `Colors.ts`).
- `assets/`: Fonts and images.
- `scripts/`: Maintenance scripts (e.g., `reset-project.js`).
- Root config: `app.json`, `eslint.config.js`, `tsconfig.json`.

### Build, Test, and Development Commands
- `npm start`: Launch Metro + Expo dev tools.
- `npm run android` | `ios` | `web`: Open platform targets.
- `npm run lint`: Lint with ESLint (Expo config).
- `npm run reset-project`: Clean caches and reset local state.
- Tip: Use Expo Go on device or emulators for quick iteration.

### Coding Style & Naming Conventions
- Language: TypeScript; prefer function components + hooks.
- Indentation: 2 spaces; max line length follow linter.
- Files: Components in `components/` (PascalCase), hooks start with `use`.
- Routing: Place screens in `app/` per Expo Router (e.g., `app/(tabs)/index.tsx`).
- Linting: ESLint via `eslint.config.js`; fix warnings before PR.

### Testing Guidelines
- Current status: No automated tests configured.
- Manual QA: Run `android`, `ios`, and `web`; verify core flows.
- If adding tests, use Jest + React Native Testing Library; name as `*.test.tsx`.
- Aim for >80% coverage on new code; keep tests near sources.

### Commit & Pull Request Guidelines
- Commits: Clear, scoped messages; Conventional Commits recommended (`feat:`, `fix:`, `chore:`).
- Branches: `feature/short-desc` or `fix/issue-###`.
- PRs: Include summary, linked issues, screenshots/screen recordings, platform(s) tested, and manual test steps.
- Ensure `npm run lint` passes and no unused code/assets.

### Security & Configuration Tips
- Do not commit secrets; prefer runtime config and secure storage.
- Keep `app.json` non-sensitive; type env with `expo-env.d.ts` when applicable.
- Remove debug logs before merging; validate permissions in `app.json`.

### Dependency
- Use React Native Paper for UI components when possible (colors, components, icons, ...).
- For colors always use the theme.colors.[already defined] value, and don't use too many different colors, 
- Use tanstack-query for data fetching, caching strategy. 

## Web (`./web`)

### Project Structure & Module Organization
- `cmd/api`: Web server entrypoint and wiring.
- `cmd/migrate`: Raw SQL migration runner.
- Group reusable code under `internal/` (domain logic, handlers) and `pkg/` (shared utilities) as the service grows.
- Keep templates or static assets in `web/static/` and configuration in `web/config/` if/when needed.
- Follow the layered architecture.

### Build, Test, and Development Commands
- `make run`: Start the web server locally for iterative development.
- `make build`: Produce binaries for deployment targets and generate css + go templ.
- `make test`: Run unit tests; add integration tests under `internal/...` as APIs expand.

### Coding Style & Naming Conventions
- Follow standard Go formatting via `gofmt` (run automatically with `go fmt ./...`).
- Use idiomatic package naming (short, lower-case) and keep files focused on a single concern.
- Prefer dependency injection for handlers/services to simplify testing.
- Document exported functions and types with GoDoc comments when they are part of the public API surface.

### API Design & Testing Guidelines
- Keep handlers thin; delegate business logic to services under `internal/`.
- Return JSON responses with clear error structures; log errors using a shared logger.
- Validate incoming data before processing; centralize request parsing helpers.
- Add table-driven tests for handlers and services; aim for coverage on new code paths.

### Database & Migrations
- Connect to PostgreSQL via pgx pools configured in `internal/storage/postgres`.
- Store raw SQL migrations in `web/db/migrations`; files run lexicographically through `cmd/migrate`.
- Each SQL file should contain a single statement executed inside a transaction.
- The `schema_migrations` table tracks applied files; avoid external migration tooling.

### Deployment & Security Notes
- Load runtime configuration (ports, DSNs, secrets) from environment variables; avoid hardcoding sensitive data.
- Use middleware for request logging, panic recovery, and authentication once endpoints require it.
- Confirm CORS settings match the mobile client before release.

### Dependency
- Use go templ for templating language [https://templ.guide].
- Use DaisyUI for every ui components, icons, themes, everything.
- If there's no built-in in DaisyUI you can use tailwindcss.


