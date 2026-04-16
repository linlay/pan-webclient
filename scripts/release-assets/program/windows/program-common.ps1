$ErrorActionPreference = 'Stop'

$Script:ProgramCommonDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:BundleRoot = Split-Path -Parent $Script:ProgramCommonDir
$Script:AppName = 'pan-webclient'
$Script:ProgramName = 'pan-api'
$Script:ManifestFile = Join-Path $Script:BundleRoot 'manifest.json'
$Script:EnvExampleFile = Join-Path $Script:BundleRoot '.env.example'
$Script:EnvFile = Join-Path $Script:BundleRoot '.env'
$Script:BackendBin = Join-Path (Join-Path $Script:BundleRoot 'backend') 'pan-api.exe'
$Script:DistDir = Join-Path (Join-Path $Script:BundleRoot 'frontend') 'dist'
$Script:ConfigDir = Join-Path $Script:BundleRoot 'configs'
$Script:MountsDir = Join-Path $Script:ConfigDir 'mounts'
$Script:DataDir = Join-Path $Script:BundleRoot 'data'
$Script:RunDir = Join-Path $Script:BundleRoot 'run'
$Script:PidFile = Join-Path $Script:RunDir 'pan-api.pid'
$Script:LogFile = Join-Path $Script:RunDir 'pan-api.log'
$Script:ErrorLogFile = Join-Path $Script:RunDir 'pan-api.stderr.log'

function Fail-Program([string]$Message) {
  throw "[program] $Message"
}

function Test-ProgramBundle {
  if (-not (Test-Path -LiteralPath $Script:ManifestFile -PathType Leaf)) {
    Fail-Program "required file not found: $Script:ManifestFile"
  }
  if (-not (Test-Path -LiteralPath $Script:EnvExampleFile -PathType Leaf)) {
    Fail-Program "required file not found: $Script:EnvExampleFile"
  }
  if (-not (Test-Path -LiteralPath $Script:BackendBin -PathType Leaf)) {
    Fail-Program "required file not found: $Script:BackendBin"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Script:ConfigDir 'local-public-key.example.pem') -PathType Leaf)) {
    Fail-Program "required file not found: $(Join-Path $Script:ConfigDir 'local-public-key.example.pem')"
  }
  if (-not (Test-Path -LiteralPath $Script:MountsDir -PathType Container)) {
    Fail-Program "required directory not found: $Script:MountsDir"
  }
  if (-not (Test-Path -LiteralPath $Script:DistDir -PathType Container)) {
    Fail-Program "required directory not found: $Script:DistDir"
  }
  $indexPath = Join-Path $Script:DistDir 'index.html'
  if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    Fail-Program "required file not found: $indexPath"
  }
}

function Import-ProgramEnv {
  if (-not (Test-Path -LiteralPath $Script:EnvFile -PathType Leaf)) {
    Fail-Program 'missing .env (copy from .env.example first)'
  }
  foreach ($rawLine in Get-Content -LiteralPath $Script:EnvFile) {
    $line = $rawLine.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
      continue
    }
    $index = $line.IndexOf('=')
    if ($index -lt 1) {
      continue
    }
    $name = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim()
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
  if (-not $env:API_PORT) {
    $env:API_PORT = '8080'
  }
  if (-not $env:FRONTEND_DIST_DIR) {
    $env:FRONTEND_DIST_DIR = '.\frontend\dist'
  }
  if (-not $env:APP_AUTH_LOCAL_PUBLIC_KEY_FILE) {
    $env:APP_AUTH_LOCAL_PUBLIC_KEY_FILE = '.\configs\local-public-key.pem'
  }
  if (-not $env:PAN_DATA_DIR) {
    $env:PAN_DATA_DIR = '.\data'
  }
}

function Initialize-ProgramRuntime {
  New-Item -ItemType Directory -Force -Path $Script:DataDir, $Script:RunDir, $Script:MountsDir | Out-Null
}

function Clear-StaleProgramPid {
  if (-not (Test-Path -LiteralPath $Script:PidFile -PathType Leaf)) {
    return
  }

  $pidValue = (Get-Content -LiteralPath $Script:PidFile -Raw).Trim()
  if (-not [string]::IsNullOrWhiteSpace($pidValue)) {
    try {
      $null = Get-Process -Id ([int]$pidValue) -ErrorAction Stop
      Fail-Program "$Script:ProgramName is already running with pid $pidValue"
    } catch [Microsoft.PowerShell.Commands.ProcessCommandException] {
      Remove-Item -LiteralPath $Script:PidFile -Force -ErrorAction SilentlyContinue
      return
    }
  }

  Remove-Item -LiteralPath $Script:PidFile -Force -ErrorAction SilentlyContinue
}

function Start-ProgramBackend {
  param(
    [switch]$Daemon
  )

  if ($Daemon) {
    Clear-StaleProgramPid
    if (Test-Path -LiteralPath $Script:LogFile) {
      Clear-Content -LiteralPath $Script:LogFile
    } else {
      New-Item -ItemType File -Path $Script:LogFile -Force | Out-Null
    }
    if (Test-Path -LiteralPath $Script:ErrorLogFile) {
      Clear-Content -LiteralPath $Script:ErrorLogFile
    } else {
      New-Item -ItemType File -Path $Script:ErrorLogFile -Force | Out-Null
    }

    $proc = Start-Process -FilePath $Script:BackendBin -WorkingDirectory $Script:BundleRoot -WindowStyle Hidden -RedirectStandardOutput $Script:LogFile -RedirectStandardError $Script:ErrorLogFile -PassThru
    $proc.Id | Set-Content -LiteralPath $Script:PidFile
    Start-Sleep -Seconds 1
    if ($proc.HasExited) {
      Remove-Item -LiteralPath $Script:PidFile -Force -ErrorAction SilentlyContinue
      Fail-Program "backend failed to start; see $Script:LogFile and $Script:ErrorLogFile"
    }
    Write-Host "[program-start] started $Script:ProgramName in daemon mode (pid=$($proc.Id))"
    Write-Host "[program-start] log file: $Script:LogFile"
    Write-Host "[program-start] stderr file: $Script:ErrorLogFile"
    return
  }

  & $Script:BackendBin
}

function Stop-ProgramBackend {
  if (-not (Test-Path -LiteralPath $Script:PidFile -PathType Leaf)) {
    Write-Host "[program-stop] pid file not found: $Script:PidFile"
    return
  }

  $pidValue = (Get-Content -LiteralPath $Script:PidFile -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($pidValue)) {
    Fail-Program "pid file is empty: $Script:PidFile"
  }

  try {
    $proc = Get-Process -Id ([int]$pidValue) -ErrorAction Stop
  } catch [Microsoft.PowerShell.Commands.ProcessCommandException] {
    Remove-Item -LiteralPath $Script:PidFile -Force -ErrorAction SilentlyContinue
    Write-Host "[program-stop] process $pidValue is not running; removed stale pid file"
    return
  }

  Stop-Process -Id $proc.Id -ErrorAction Stop
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if ($proc.HasExited) {
      Remove-Item -LiteralPath $Script:PidFile -Force -ErrorAction SilentlyContinue
      Write-Host "[program-stop] stopped $Script:ProgramName (pid=$($proc.Id))"
      return
    }
    $proc.Refresh()
  }

  Fail-Program "process $($proc.Id) did not stop within 30s"
}
