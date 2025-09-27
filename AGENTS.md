# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Expo Router routes (`_layout.tsx`, `+not-found.tsx`, `(tabs)/...`).
- `components/`: Reusable React components (PascalCase `.tsx`).
- `hooks/`: Custom hooks (`use*.ts`/`.tsx`).
- `constants/`: App constants (e.g., `Colors.ts`).
- `assets/`: Fonts and images.
- `scripts/`: Maintenance scripts (e.g., `reset-project.js`).
- Root config: `app.json`, `eslint.config.js`, `tsconfig.json`.

## Build, Test, and Development Commands
- `npm start`: Launch Metro + Expo dev tools.
- `npm run android` | `ios` | `web`: Open platform targets.
- `npm run lint`: Lint with ESLint (Expo config).
- `npm run reset-project`: Clean caches and reset local state.
- Tip: Use Expo Go on device or emulators for quick iteration.

## Coding Style & Naming Conventions
- Language: TypeScript; prefer function components + hooks.
- Indentation: 2 spaces; max line length follow linter.
- Files: Components in `components/` (PascalCase), hooks start with `use`.
- Routing: Place screens in `app/` per Expo Router (e.g., `app/(tabs)/index.tsx`).
- Linting: ESLint via `eslint.config.js`; fix warnings before PR.

## Testing Guidelines
- Current status: No automated tests configured.
- Manual QA: Run `android`, `ios`, and `web`; verify core flows.
- If adding tests, use Jest + React Native Testing Library; name as `*.test.tsx`.
- Aim for >80% coverage on new code; keep tests near sources.

## Commit & Pull Request Guidelines
- Commits: Clear, scoped messages; Conventional Commits recommended (`feat:`, `fix:`, `chore:`).
- Branches: `feature/short-desc` or `fix/issue-###`.
- PRs: Include summary, linked issues, screenshots/screen recordings, platform(s) tested, and manual test steps.
- Ensure `npm run lint` passes and no unused code/assets.

## Security & Configuration Tips
- Do not commit secrets; prefer runtime config and secure storage.
- Keep `app.json` non-sensitive; type env with `expo-env.d.ts` when applicable.
- Remove debug logs before merging; validate permissions in `app.json`.

## Dependency 
- use React Native Paper for every ui components if possible. [colors, components, icons, ...]
- i put the mobile mockup png files inside ./design. it's a mobile screen mockup white background on top of transparent, only focus on the white background.
