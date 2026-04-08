[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleaseDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$RuntimeDir = Join-Path $ReleaseDir '.runtime'
$PidFile = Join-Path $RuntimeDir 'pan-api.pid'
$LogFile = Join-Path $RuntimeDir 'pan-api.log'
$BinaryPath = Join-Path $ReleaseDir 'pan-api.exe'
$EnvFile = Join-Path $ReleaseDir '.env'
$PublicKeyPath = Join-Path $ReleaseDir 'configs\local-public-key.pem'
$FrontendIndex = Join-Path $ReleaseDir 'frontend\dist\index.html'

function Fail([string]$Message) {
  Write-Error "[start] $Message"
  exit 1
}

if (-not (Test-Path -LiteralPath $BinaryPath)) {
  Fail "missing binary: $BinaryPath"
}
if (-not (Test-Path -LiteralPath $EnvFile)) {
  Fail ".env not found; copy from .env.example first"
}
if (-not (Test-Path -LiteralPath $PublicKeyPath)) {
  Fail "missing configs/local-public-key.pem"
}
if (-not (Test-Path -LiteralPath $FrontendIndex)) {
  Fail "missing frontend/dist/index.html"
}

New-Item -ItemType Directory -Force -Path $RuntimeDir, (Join-Path $ReleaseDir 'data'), (Join-Path $ReleaseDir 'configs\mounts') | Out-Null

if (Test-Path -LiteralPath $PidFile) {
  $pidValue = (Get-Content -LiteralPath $PidFile -Raw).Trim()
  if (-not [string]::IsNullOrWhiteSpace($pidValue)) {
    try {
      $proc = Get-Process -Id ([int]$pidValue) -ErrorAction Stop
      Fail "pan-api already running (pid=$($proc.Id))"
    } catch {
      Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    }
  }
}

$proc = Start-Process -FilePath $BinaryPath -WorkingDirectory $ReleaseDir -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile -PassThru
$proc.Id | Set-Content -LiteralPath $PidFile
Start-Sleep -Seconds 1
if ($proc.HasExited) {
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  Fail "pan-api failed to start; see $LogFile"
}

Write-Host "[start] started pan-api (pid=$($proc.Id))"
Write-Host "[start] log file: $LogFile"
