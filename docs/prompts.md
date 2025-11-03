# Prompt Library

Store reusable prompt fragments here so we can copy/paste into ChatGPT, Google AI Studio, and Smith Agent without rewriting context each time.

## Scaffolding (Express + Streamlit + Tunnel)
`
Desired stack: Express API + Streamlit UI + Cloudflare quick tunnel.
Assume Node 22.17, TypeScript, Python 3.13, Streamlit >=1.50.
Provide step-by-step commands and starter code that:
- seeds demo data and includes offline/demo fallbacks,
- surfaces security considerations (env var usage, input sanitization),
- sets up npm scripts and a PowerShell launcher script,
- prepares for future Docker Compose deployment.
Return concise explanations plus code blocks.
`

## Incremental Update
`
We are continuing the AI Transactions Control Hub project.
Existing components: TypeScript Express API (npm run api), Streamlit UI (streamlit_app.py), cloudflared tunnel for exposure.
Only supply incremental code edits (use unified diff or clearly scoped snippets).
Ensure changes keep the demo-mode fallback intact, note any new env vars, and suggest tests/lint commands to run.
`

## Deployment & Hosting
`
Generate Dockerfile + docker-compose updates and CLI deployment steps for Render, Fly.io, and Heroku for this Express + Streamlit stack.
Include environment variables, health checks, and secrets management notes.
Highlight post-deploy verification (curl /api/health, Streamlit secrets update).
`

## Troubleshooting
`
Diagnose why the Streamlit UI still shows demo mode even though the Express API is reachable via a Cloudflare tunnel.
Consider environment variable precedence, API health checks, tunnel status, and secrets configuration.
Provide step-by-step commands to verify each layer.
`

Add more prompt snippets as the workflow evolves.
