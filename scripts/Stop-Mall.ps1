$ErrorActionPreference = 'Stop'
$mallRoot = Split-Path -Parent $PSScriptRoot
$mallPidFile = Join-Path $mallRoot 'data\server.pid'
if (!(Test-Path -LiteralPath $mallPidFile)) { Write-Host 'No running mall PID found.'; exit 0 }
$mallProcessId = [int](Get-Content -LiteralPath $mallPidFile)
$mallProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$mallProcessId"
if ($mallProcess) {
    $expectedScript = Join-Path $mallRoot 'server\index.ts'
    if ($mallProcess.Name -ne 'node.exe' -or !$mallProcess.CommandLine.Contains($expectedScript)) {
        Write-Error 'PID belongs to a process not launched by this launcher. Stop its original terminal instead.'
        exit 1
    }
    Stop-Process -Id $mallProcessId
    Wait-Process -Id $mallProcessId -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $mallPidFile -ErrorAction SilentlyContinue
Write-Host 'JD Local Mall stopped. Database and orders are preserved.'
