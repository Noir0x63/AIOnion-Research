# Setup & Deployment script for Tor Dark Web Agent
# Run this in PowerShell to verify environment and install dependencies.

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Deploy & Setup: Tor Dark Web Agent" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "[✓] Node.js is installed ($nodeVer)" -ForegroundColor Green
} else {
    Write-Host "[✗] Node.js is not found. Please install Node.js (LTS version recommended) from https://nodejs.org/" -ForegroundColor Red
    Exit
}

# 2. Check NPM
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "[✓] NPM is installed" -ForegroundColor Green
} else {
    Write-Host "[✗] NPM is not found." -ForegroundColor Red
    Exit
}

# 3. Verify Tor Proxy status
Write-Host "Checking for active Tor proxy listeners on 9150 or 9050..." -ForegroundColor Yellow
$torPort = $null
$ports = @(9150, 9050)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $torPort = $port
        break
    }
}

if ($torPort) {
    Write-Host "[✓] Active Tor listener detected on port $torPort" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: No active Tor listener found on port 9150 or 9050." -ForegroundColor Yellow
    Write-Host "    Make sure Tor Browser is open or the system Tor service is running." -ForegroundColor Yellow
}

# 4. Copy .env file if it doesn't exist
$envPath = Join-Path $PSScriptRoot ".env"
$envExamplePath = Join-Path $PSScriptRoot ".env.example"

if (Test-Path $envPath) {
    Write-Host "[✓] .env file already exists." -ForegroundColor Green
} else {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "[✓] Created .env file from .env.example." -ForegroundColor Green
        Write-Host "    IMPORTANT: Please configure your VENICE_API_KEY in the .env file." -ForegroundColor Yellow
    } else {
        Write-Host "[✗] .env.example not found. Cannot create .env." -ForegroundColor Red
    }
}

# 5. Install NPM Dependencies
Write-Host "Installing project dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[✓] Setup completed successfully!" -ForegroundColor Green
    Write-Host "You can start the agent by running: npm start" -ForegroundColor Cyan
    Write-Host "Or by double-clicking 'run.bat'" -ForegroundColor Cyan
} else {
    Write-Host "[✗] Failed to install dependencies." -ForegroundColor Red
}
