# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` Next.js App Router pages; one route per folder.
- `src/components/` Reusable React components; colocate styles.
- `src/contexts/`, `src/lib/`, `src/types/` App state, utilities, and TypeScript types.
- `public/` Static assets served at the site root.
- `api/` Azure Functions (TypeScript). Each function has its own `*.ts` entry and optional subfolder.
- Build outputs: `.next/` (app), `out/` (static export), `api/dist/` (functions). Do not commit.

## Build, Test, and Development Commands
- App (root):
  - `npm install` Install dependencies.
  - `npm run dev` Start Next.js dev server at `http://localhost:3000`.
  - `npm run build` Production build.
  - `npm run export` Static export to `out/`.
  - `npm run start` Run the production server.
  - `npm run swa:start` Serve static `out/` with Azure SWA, using `api/` for functions.
- API (`api/`):
  - `npm install` Install function deps.
  - `npm run build` Compile TypeScript to `dist/`.
  - `npm start` Run locally via Azure Functions Core Tools at `http://localhost:7071`.

Example API check: `curl http://localhost:7071/api/getPeople`

## Coding Style & Naming Conventions
- Language: TypeScript, React 19, Next.js 15. Tailwind CSS 4 for styles.
- Linting: ESLint with Next config (`eslint.config.mjs`). Run `npm run lint`.
- Indentation: 2 spaces; prefer named exports. Use `.tsx` for React, `.ts` for utilities.
- Naming: Components `PascalCase` (files and symbols). Helpers and variables `camelCase`. Types and interfaces `PascalCase` in `src/types`.
- API functions: folders and handlers `camelCase` (e.g., `getPeople`, `createPerson`).

## Testing Guidelines
- Unit tests use Vitest + jsdom + Testing Library.
  - `npm test` Watch mode.
  - `npm run test:run` CI-friendly run.
- Place tests next to sources with `*.test.ts(x)` (e.g., `src/components/FileDisplay.test.tsx`).
- For E2E, prefer Playwright if needed; keep specs under `e2e/`.

## Commit & Pull Request Guidelines
- History is minimal; adopt Conventional Commits (recommended):
  - `feat: add school search filter`
  - `fix(api): guard missing SAS token`
- PRs should include:
  - Clear description, linked issues, and screenshots for UI changes.
  - Steps to reproduce and verify locally (commands and routes).
  - Scope small and focused; update docs when behavior changes.

## Security & Configuration Tips
- Do not commit secrets. Use `/.env.local` for the app and `api/local.settings.json` for functions.
- Check `.env.example` for required keys. Review `staticwebapp.config.json` and `swa-cli.config.json` when changing routes/auth.

## Agent-Specific Instructions
- Keep changes minimal and scoped; follow this layout and lint rules.
- Prefer small PRs; avoid unrelated refactors. Update this file when conventions evolve.
