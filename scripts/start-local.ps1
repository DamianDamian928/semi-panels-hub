param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $projectRoot

$services = @(
  @{
    Name = 'Frontend'
    Port = 5173
    Command = 'npm.cmd'
    Arguments = @('run', 'dev', '--', '--host', '127.0.0.1')
    HealthUrl = 'http://127.0.0.1:5173/'
  },
  @{
    Name = 'Backend API'
    Port = 8788
    Command = 'npm.cmd'
    Arguments = @('run', 'api')
    HealthUrl = 'http://127.0.0.1:8788/health'
  },
  @{
    Name = 'Local file helper'
    Port = 8787
    Command = 'npm.cmd'
    Arguments = @('run', 'helper')
    HealthUrl = 'http://127.0.0.1:8787/health'
  }
)

function Test-PortListening {
  param([int]$Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  return $null -ne $connection
}

function Test-HttpReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Wait-HttpReady {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  do {
    if (Test-HttpReady -Url $Url) {
      Write-Host "[ready] $Name -> $Url"
      return $true
    }

    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  Write-Warning "$Name did not become ready at $Url within $TimeoutSeconds seconds."
  return $false
}

Write-Host "Starting Semi Panels Hub local environment..."
Write-Host "Project: $projectRoot"

foreach ($service in $services) {
  if (Test-PortListening -Port $service.Port) {
    Write-Host "[skip] $($service.Name) already listens on port $($service.Port)."
    continue
  }

  Write-Host "[start] $($service.Name) on port $($service.Port)..."
  Start-Process `
    -FilePath $service.Command `
    -ArgumentList $service.Arguments `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden | Out-Null
}

$serviceResults = @()

foreach ($service in $services) {
  $isReady = Wait-HttpReady -Name $service.Name -Url $service.HealthUrl
  $serviceResults += [pscustomobject]@{
    Name = $service.Name
    Port = $service.Port
    Ready = $isReady
    HealthUrl = $service.HealthUrl
  }
}

Write-Host ""
Write-Host "Local service summary:"

foreach ($result in $serviceResults) {
  $status = if ($result.Ready) { 'ready' } else { 'offline' }
  $marker = if ($result.Ready) { '[ready]' } else { '[offline]' }
  Write-Host "$marker $($result.Name) ($($result.Port)): $status"
}

$allReady = -not ($serviceResults | Where-Object { -not $_.Ready })
$helperReady = ($serviceResults | Where-Object { $_.Name -eq 'Local file helper' } | Select-Object -First 1).Ready

Write-Host ""

if ($allReady) {
  Write-Host "All local services are ready."
} else {
  Write-Warning "At least one local service is not ready. Check the ports above before using the app."
}

if (-not $helperReady) {
  Write-Warning "Open location and choose local file will not work until Local file helper is running on port 8787."
}

if (-not $NoBrowser) {
  Start-Process 'http://127.0.0.1:5173/'
}
