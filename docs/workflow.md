# Software Delivery Workflow

This playbook captures the way we design, build, and ship the AI Transactions projects so every engagement follows the same secure, repeatable path.

## 1. Intake & Scoping
- Capture client problem, constraints, and success metrics.
- Summarize requirements in ChatGPT / Google AI Studio / SmithAgent for clarity.
- Identify components up front: Express API, Streamlit UI, background jobs, third-party services (Firecrawl, 11Labs, Coinbase/Visa rails, etc.).

## 2. Base Project Setup
- Scaffold ~/Projects/<client>/<project> using the starter template (backend/, ui/, ops/).
- Initialize Git (git init, set remote). Push an empty first commit so Streamlit Cloud / CI is available immediately.
- Create .env.example, .streamlit/secrets.example.toml, and capture integration credentials in a secrets manager (1Password/Doppler).
- Run the preflight checklist in docs/preflight.md (toolchain versions, Docker, cloudflared path).

## 3. AI-Assisted Build
- Draft scaffolding prompts in docs/prompts.md (see templates below).
- Use GPT Pro / Smith Studio for exploratory solutions with explicit stack instructions (Node 22.17, Python 3.13, Streamlit 1.5x, demo-mode fallback).
- Apply real code changes via Codex CLI so edits live in the repository and pass guardrails.

## 4. Local Development
- **Backend**: 
pm install, 
pm run dev (for seed/setup), 
pm run api to serve on PORT (default 8787). Keep PAYMENTS_DRY_RUN etc. in .env.
- **UI**: python -m venv .venv, .venv\Scripts\Activate.ps1, pip install -r requirements.txt, export env vars, streamlit run streamlit_app.py.
- Automation scripts (stored under scripts/):
  - start-backend.ps1 → runs the Express API.
  - start-tunnel.ps1 → calls cloudflared tunnel --url http://localhost:8787.
  - start-ui.ps1 → activates venv, sets CONTROL_CENTER_URL / API_BASE_URL, launches Streamlit.
- Run smoke tests / linting: 
pm test, 
pm run lint (when added), python -m py_compile streamlit_app.py, pytest for Python modules.

## 5. Tunneling & Remote Preview
- Keep cloudflared.exe in C:\Users\marcu\OneDrive\Documents\cloudflared\ and ensure it is on PATH.
- Start quick tunnel: cloudflared tunnel --url http://localhost:8787 and copy the https://*.trycloudflare.com URL.
- Log the tunnel URL + timestamp in .streamlit/README.md and update Streamlit Cloud secrets:
  `	oml
  CONTROL_CENTER_URL = "https://<tunnel>.trycloudflare.com"
  API_BASE_URL       = "https://<tunnel>.trycloudflare.com"
  `
- Keep the tunnel window open for the duration of remote demos.

## 6. Version Control & Deployment
- Commit after each feature (git status, git add, git commit -m "…") and push to GitHub so Streamlit Cloud auto-rebuilds.
- Health checks: Invoke-WebRequest http://localhost:8787/api/health and the tunneled equivalent to ensure external access.
- When feature-complete, package the API for hosting (preferred target per project):
  - **Render**: ender.yaml + ender login, ender services deploy. CLI: ender services deploy <service-id>.
  - **Fly.io**: lyctl auth login, lyctl launch, lyctl deploy, lyctl secrets set KEY=value.
  - **Heroku**: heroku login, heroku create, heroku config:set KEY=value, git push heroku main or container release via heroku container:push web && heroku container:release web.
- Once an external host is live, replace tunnel URLs in Streamlit secrets with the stable endpoint.

## 7. Documentation & Templates
- Keep docs/workflow.md (this file) and docs/preflight.md in sync.
- Record reusable prompts/snippets in docs/prompts.md (e.g., “Add demo fixtures when API offline”, “Generate Docker Compose for Express + Streamlit”).
- Update README.md with user-facing setup steps whenever workflow changes.

## Security, Optimization, and Compatibility Guardrails
- **Security**: least-privilege config, sanitize inputs, store secrets outside code, limit exposed endpoints, enable HTTPS when hosted. Review third-party API keys before committing.
- **Optimization**: profile API calls, cache or batch where sensible, remove unused deps, ensure demo data does not run heavy background jobs by default.
- **Self-check**: run lint/tests/compiles before finalizing. Highlight any skipped checks with TODOs in commits or PR notes.
- **Compatibility**: lock Node/Python versions in .nvmrc / .python-version (if required), note OS-specific steps (PowerShell vs bash), ensure Docker builds succeed when relevant.

## Prompt Templates
- **Initial scaffolding**
  “Desired stack: Express API + Streamlit UI + Cloudflare tunnel. Assume Node 22.17, Python 3.13, Streamlit >=1.50. Generate step-by-step commands, code for demo-mode fallbacks when the API is offline, and highlight security considerations.”
- **Follow-up within project**
  “We are continuing the AI Transactions project. Existing stack: Node/Express backend, Streamlit UI, cloudflared quick tunnel exposure. Only provide incremental changes; avoid re-scaffolding and reuse prior conventions.”
- **Deployment**
  “Provide Docker Compose + Render/Fly/Heroku deployment instructions for this Express + Streamlit app, including environment variables and health checks.”

## Optional: Docker & Compose
- Use included Dockerfile / docker-compose.yml to build containers for backend and UI. Update files when dependencies change.
- Commands:
  `ash
  docker compose build
  docker compose up
  docker compose logs -f api
  docker compose down
  `
- Document port mappings and environment overrides in docker-compose.yml comments.

## Next Steps
- Automate CI (GitHub Actions) for lint/test to catch issues before deployment.
- Add a release checklist (secrets updated, tunnel off, production host verified, Streamlit secrets switched).
- Periodically audit dependencies (
pm audit, pip list --outdated) and track results in docs/maintenance.md.
