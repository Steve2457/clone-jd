param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$mallRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $mallRoot
$mallUrl = 'http://localhost:3000'
try {
    $health = Invoke-RestMethod "$mallUrl/api/health" -TimeoutSec 2
    if ($health.application -eq 'jd-local-mall') {
        if (!$NoBrowser) { Start-Process $mallUrl }
        Write-Host "JD Local Mall is already running: $mallUrl"
        exit 0
    }
} catch {}
try {
    $node = (Get-Command node -ErrorAction Stop).Source
    if (!((& $node --version).StartsWith('v22.'))) {
        throw 'Node.js 22.x is required. See README.md.'
    }
    if (!(Test-Path -LiteralPath (Join-Path $mallRoot 'node_modules'))) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. Read the error above.' }
    $mallServer = Join-Path $mallRoot 'server\index.ts'
    $mallProcess = Start-Process -FilePath $node -ArgumentList '--import','tsx',('"' + $mallServer + '"') -WorkingDirectory $mallRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $mallRoot 'data\server-output.log') -RedirectStandardError (Join-Path $mallRoot 'data\server-error.log') -PassThru
    for ($attempt=0; $attempt -lt 50; $attempt++) {
        Start-Sleep -Milliseconds 200
        if ($mallProcess.HasExited) { throw 'Server exited. See data/server-error.log (port 3000 may be in use).' }
        try {
            $health = Invoke-RestMethod "$mallUrl/api/health" -TimeoutSec 1
            if ($health.application -eq 'jd-local-mall') {
                if (!$NoBrowser) { Start-Process $mallUrl }
                Write-Host "JD Local Mall started: $mallUrl"
                exit 0
            }
        } catch {}
    }
    throw 'Startup timed out. See data/server-error.log.'
} catch {
    Write-Host $_ -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
