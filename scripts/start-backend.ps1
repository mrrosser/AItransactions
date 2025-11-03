Param(
    [string]$ProjectRoot = "C:\Users\marcu\OneDrive\Documents\CTO Projects\AIPayments\agentic-transactions-all-in-one-COMPLETE"
)

Set-Location $ProjectRoot

Write-Host "Starting Express API (npm run api) from $ProjectRoot" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Warning "No .env file found. Copy .env.example -> .env and set credentials."
}

npm run api
