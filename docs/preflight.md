# Preflight Checklist

Run these checks before starting work on a new feature or client project.

## System
- [ ] Windows updates installed; rebooted recently.
- [ ] PowerShell 5 (or 7) available; python --version returns 3.13.x.
- [ ] Node.js 22.17.x installed (
ode --version).
- [ ] Docker Desktop running (for optional container builds).

## Tooling
- [ ] cloudflared.exe present at C:\Users\marcu\OneDrive\Documents\cloudflared\cloudflared.exe; cloudflared --version works in a new PowerShell window.
- [ ] git authenticated (run git status); GitHub credentials cached.
- [ ] ender / lyctl / heroku CLIs installed if that platform will be used (see docs/workflow.md for commands).

## Repository Template
- [ ] Copied the latest project template (backend/, ui/, ops/) or confirmed existing repo is up to date.
- [ ] .env.example and .streamlit/secrets.example.toml present with required keys.
- [ ] scripts/ folder contains start-backend.ps1, start-tunnel.ps1, start-ui.ps1 (create if missing).
- [ ] Streamlit Cloud app (if already provisioned) is linked to this repository.

## Credentials
- [ ] Secrets stored in password manager (client API keys, 11Labs token, Firecrawl key, Coinbase credentials, etc.).
- [ ] Environment variable plan documented (backend .env, Streamlit secrets, CI/CD).
- [ ] Confirm access to third-party APIs and any license keys required by the app.

## Communication
- [ ] Requirements summarized in docs/prompts.md or project tracker.
- [ ] Client expectations clarified (deliverables, demo date, deployment target).
- [ ] Guardrails acknowledged: security, optimization, testing, compatibility.

Tick all boxes before coding; update this checklist when the workflow evolves.
