<#
.SYNOPSIS
Upgrade Redis on Windows to the latest available version via winget.

.DESCRIPTION
This script stops and removes the existing Redis Windows service, backs up the current install,
and performs a winget install or upgrade of Redis.

.NOTES
Run this script as Administrator.
#>

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarningLine {
    param([string]$Message)
    Write-Warning $Message
}

function Write-ErrorAndExit {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-ErrorAndExit 'This script must be run as Administrator.'
}

$serviceName = 'Redis'
$installFolder = 'C:\Program Files\Redis'
$backupFolder = Join-Path $env:TEMP ("redis-backup-{0:yyyyMMdd-HHmmss}" -f (Get-Date))
$wingetId = 'Redis.Redis'

Write-Info "Redis service name: $serviceName"
Write-Info "Redis install folder: $installFolder"
Write-Info "Backup folder: $backupFolder"

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-ErrorAndExit 'winget is not available. Install winget first or upgrade Redis manually.'
}

# Stop and remove existing Redis service
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -ne 'Stopped') {
        Write-Info "Stopping Redis service ($serviceName)..."
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    }

    Write-Info "Removing Redis service ($serviceName)..."
    sc.exe delete $serviceName | Out-Null
} else {
    Write-Info 'No existing Redis service found.'
}

# Backup existing installation folder
if (Test-Path $installFolder) {
    Write-Info 'Backing up existing Redis folder...'
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
    Copy-Item -Path $installFolder -Destination $backupFolder -Recurse -Force
    Write-Info "Backed up Redis files to $backupFolder"

    Write-Info 'Removing old Redis installation...'
    Remove-Item -Path $installFolder -Recurse -Force
} else {
    Write-Info 'No existing Redis install folder found, skipping backup.'
}

# Attempt winget upgrade first, then install if needed
Write-Info 'Checking for winget Redis upgrade availability...'
$upgradeResult = & winget upgrade --id $wingetId --accept-source-agreements --accept-package-agreements 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info 'Redis upgraded successfully via winget.'
    exit 0
}

Write-Info 'No upgrade available or upgrade failed, attempting fresh install.'
$installResult = & winget install --id $wingetId --accept-source-agreements --accept-package-agreements 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Info 'Redis installed successfully via winget.'
    exit 0
}

Write-WarningLine 'winget installation failed. Here is the output:'
Write-Host $installResult
Write-WarningLine 'If the package ID does not match your system, search for Redis with: winget search redis'
Write-WarningLine 'Then rerun this script after correcting the package ID variable at the top.'
exit 1
