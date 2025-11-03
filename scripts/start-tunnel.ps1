Param(
    [string] = "http://localhost:8787",
    [string] = "C:\Users\marcu\OneDrive\Documents\cloudflared\cloudflared.exe"
)

if (-not (Test-Path )) {
    Write-Error "cloudflared not found at . Update docs/preflight.md prerequisites before continuing."
    exit 1
}

Write-Host "Launching Cloudflare quick tunnel for " -ForegroundColor Cyan
&  tunnel --url 
