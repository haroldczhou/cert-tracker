Deploying to Azure Static Web Apps (Path C)

Overview
- Frontend: Next.js 15 static export to `out/` (already configured).
- API: Azure Functions (TypeScript) under `api/` (already configured).
- Auth: Azure AD via `staticwebapp.config.json` (configure secrets in SWA).

One-time Setup
1) Push this repo to GitHub (main branch recommended).
2) Create a Static Web App (Free) in the Azure Portal:
   - Deployment source: GitHub (you can skip GitHub linking if you prefer manual token-based deploys).
   - App location: `/`  
   - API location: `api`  
   - Output location: `out`
   - SKU: Free

3) If you DIDN’T let Azure create the workflow automatically:
   - Keep the provided `.github/workflows/azure-static-web-apps.yml` in this repo.
   - In the SWA resource → Deployment token, copy the token.
   - In GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
     - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
     - Value: paste the token.

4) Configure environment variables in SWA (Azure Portal → Your SWA → Configuration):
   - For Azure AD auth used in `staticwebapp.config.json`:
     - `AZURE_CLIENT_ID`
     - `AZURE_CLIENT_SECRET`
   - For Functions (copy from `api/local.settings.json` and `.env.example`, use real values):
     - `COSMOS_ENDPOINT`
     - `COSMOS_KEY`
     - `AZURE_STORAGE_ACCOUNT_NAME`
     - `AZURE_STORAGE_ACCOUNT_KEY`
     - Optional dev/demo settings: `DEV_DEFAULT_DISTRICT_ID`, `DEV_ENABLE_SEED`
     - If using email: `ACS_CONNECTION_STRING`, `REMINDER_FROM_EMAIL`

5) Save and restart (if prompted) to apply configuration.

Deploy
- On push to `main`, GitHub Actions will:
  - Build the app (`npm run build`) → outputs to `out/`.
  - Build the API (`api/tsc`).
  - Upload both to SWA.

Verify
- Visit your SWA URL from the Azure Portal (e.g., `https://<yourapp>.azurestaticapps.net/`).
- Auth flows:
  - Unauthenticated routes are accessible per `staticwebapp.config.json`.
  - Most `/api/*` routes require authentication; use `/admin/dev-seed` and `/api/devSeedOptionA` (both allowed for `anonymous`) to validate initial setup.
- Example API checks:
  - `GET https://<yourapp>.azurestaticapps.net/api/devSeedOptionA`

Local Testing (optional)
- Frontend + API with SWA CLI (already configured):
  - App: `npm run build` (creates `out/`)
  - API: `cd api && npm install && npm run build`
  - Start: `npm run swa:start` (serves `out/` and proxies to Functions on `7071`)

Notes
- This project uses Next.js `output: 'export'` and builds directly to `out/` with `npm run build`.
- Don’t commit secrets. Use `/.env.local` locally and SWA Configuration in Azure for production.
- If Azure created a different workflow file for you, you can keep either one (but not both) to avoid duplicate deployments.

