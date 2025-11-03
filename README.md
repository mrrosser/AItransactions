# AI Transactions Control Hub

Streamlit control surface backed by a TypeScript/Express API for managing agentic payment flows (Coinbase X402, Visa Agent Toolkit, synthetic agents, diagnostics). This repo contains everything needed for local development, remote demos via Cloudflare quick tunnels, and deployment to Render / Fly.io / Heroku.

## Project Layout

- src/ – Express API (TypeScript) and integrations.
- pp/ – Static frontend bundle served by the API.
- streamlit_app.py – Streamlit UI used for demos and operations tooling.
- docs/ – Workflow handbook, preflight checklist, prompt library.
- scripts/ – PowerShell helpers to launch backend, tunnel, and Streamlit UI.

## Quickstart

``powershell
# clone and enter repo
git clone https://github.com/mrrosser/AItransactions.git
cd AItransactions

# install Node deps and seed stores
npm install
npm run dev      # optional: primes SQLite

# backend API (keep this window open)
scripts\start-backend.ps1

# new PowerShell window – Streamlit UI
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
scripts\start-ui.ps1

# optional – Cloudflare quick tunnel for remote demos
scripts\start-tunnel.ps1
``

Environment variables for the API live in .env (see .env.example). Streamlit secrets are set via environment variables or .streamlit/secrets.toml; examples are provided in docs/workflow.md.

## Workflow & Guardrails

Follow the documented process in docs/workflow.md:

1. Intake & scoping, requirement summaries.
2. Base project template and preflight (see docs/preflight.md).
3. AI-assisted build with Codex CLI for edits (prompt snippets in docs/prompts.md).  
4. Local development with automated scripts, smoke tests, and security checks.
5. Quick tunnel for remote testing, or deploy to Render / Fly.io / Heroku.
6. Git-driven deployment (Streamlit Cloud auto-builds on push).
7. Documentation updates plus maintenance log.

Security, optimization, and compatibility checks are mandatory before closing a task. The CI workflow enforces TypeScript build/tests and Python compile checks.

## Deployment Targets

### Render
`ash
render login
render blueprint deploy
`
(Configure ender.yaml as needed; set environment variables in the Render dashboard.)

### Fly.io
`ash
flyctl auth login
flyctl launch        # first time
flyctl deploy
flyctl secrets set CONTROL_CENTER_URL=https://... API_BASE_URL=https://...
`

### Heroku
`ash
heroku login
heroku create ai-transactions-control
heroku config:set CONTROL_CENTER_URL=https://... API_BASE_URL=https://...
git push heroku main
`

After deploying, update Streamlit Cloud secrets to point at the hosted API and disable the tunnel if no longer required.

## Automation Scripts
- scripts/start-backend.ps1 – runs 
pm run api, warns if .env missing.
- scripts/start-ui.ps1 – activates .venv, sets Streamlit env vars, launches UI.
- scripts/start-tunnel.ps1 – opens a Cloudflare quick tunnel to expose http://localhost:8787.

Modify $ProjectRoot or $ApiUrl parameters to adapt for other environments.

## Continuous Integration

GitHub Actions pipeline (.github/workflows/ci.yml) will:
- Install Node 22.x, run 
pm ci, 
pm run build, and 
pm test.
- Install Python 3.13, install equirements.txt, and execute python -m py_compile streamlit_app.py.
- Fail fast if lint/tests break to keep main deployable.

Run the same commands locally before pushing to avoid CI failures.

## Maintenance

- Track dependency updates or audit results in docs/maintenance.md.
- Log tunnel URLs + timestamps in .streamlit/README.md during demos.
- Use docs/prompts.md snippets for consistent AI-assisted work.

Questions or issues? Open a GitHub issue or ping the #ai-transactions channel.
