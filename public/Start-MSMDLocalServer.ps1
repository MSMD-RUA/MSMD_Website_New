param(
    [int]$Port = 8000
)

Write-Host "MSMD Local Server" -ForegroundColor Cyan

# Work out which folder to serve
$scriptDir = $PSScriptRoot
if (-not $scriptDir -or $scriptDir -eq "") {
    $scriptDir = (Get-Location).Path
}

Set-Location $scriptDir

# Try to find Python
$python = $null

try {
    $python = (Get-Command python -ErrorAction Stop).Source
} catch {
    try {
        $python = (Get-Command py -ErrorAction Stop).Source
    } catch {
        Write-Host "Python not found. Install Python or add it to PATH." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Serving folder: $scriptDir" -ForegroundColor DarkGray
Write-Host "Using Python:   $python" -ForegroundColor DarkGray
Write-Host "URL:           http://localhost:$Port/" -ForegroundColor Green

# Build args for python -m http.server
$serverArgs = @("-m", "http.server", "$Port")

# Start the Python http.server in a new PowerShell window
$psArgs = @(
    "-NoExit",
    "-Command",
    "& `"$python`" $($serverArgs -join ' ')"
)

if ($scriptDir -and $scriptDir -ne "") {
    Start-Process powershell -ArgumentList $psArgs -WorkingDirectory $scriptDir
} else {
    # Fallback: no working directory, just start where we are
    Start-Process powershell -ArgumentList $psArgs
}

Start-Sleep -Seconds 1

# Open default browser
Start-Process "http://localhost:$Port/"

Write-Host "Local server started. Press Ctrl+C in the server window to stop it." -ForegroundColor Cyan
