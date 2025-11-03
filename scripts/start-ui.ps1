Param(
    [string] = "C:\Users\marcu\OneDrive\Documents\CTO Projects\AIPayments\agentic-transactions-all-in-one-COMPLETE",
    [string] = "http://localhost:8787",
    [string] = "streamlit_app.py"
)

Set-Location 

if (-not (Test-Path ".\.venv\Scripts\Activate.ps1")) {
    Write-Error "Virtual environment not found. Run 'python -m venv .venv' first."
    exit 1
}

Write-Host "Activating virtual environment and starting Streamlit UI..." -ForegroundColor Cyan
. .\.venv\Scripts\Activate.ps1

 = 
 = 

if (-not (Test-Path )) {
    Write-Error "Streamlit script '' not found in ."
    exit 1
}

streamlit run 
