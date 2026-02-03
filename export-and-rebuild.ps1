#!/usr/bin/env powershell
# Export Godot Project and Rebuild APK
# This script automates the rebuild process after exporting the .pck file

param(
    [string]$GodotPath = "C:\Program Files\Godot\Godot.exe",  # Adjust if installed elsewhere
    [string]$ProjectRoot = "C:\Users\Admin\Documents\MyProject\Ritmo",
    [string]$GodotProjectPath = "$ProjectRoot\ritmo-game",
    [string]$AndroidAssetsPath = "$ProjectRoot\android\app\src\main\assets"
)

Write-Host "=== Ritmo Godot Export & APK Build ===" -ForegroundColor Cyan

# Step 1: Verify Godot is installed
if (!(Test-Path $GodotPath)) {
    Write-Host "Error: Godot not found at $GodotPath" -ForegroundColor Red
    Write-Host "Please install Godot 4.6 or adjust `$GodotPath" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ Found Godot at $GodotPath" -ForegroundColor Green

# Step 2: Verify Godot project
if (!(Test-Path "$GodotProjectPath\project.godot")) {
    Write-Host "Error: Godot project not found at $GodotProjectPath" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Found Godot project at $GodotProjectPath" -ForegroundColor Green

# Step 3: Verify Android assets directory
if (!(Test-Path $AndroidAssetsPath)) {
    Write-Host "Creating Android assets directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $AndroidAssetsPath | Out-Null
}
Write-Host "✓ Android assets path ready: $AndroidAssetsPath" -ForegroundColor Green

# Step 4: Export Godot project
Write-Host "`nExporting Godot project as Android .pck..." -ForegroundColor Cyan
$ExportArgs = @(
    "--headless",
    "--export-release",
    "Android",
    "$AndroidAssetsPath\Ritmo.pck"
)

Write-Host "Running: $GodotPath $($ExportArgs -join ' ')" -ForegroundColor Gray

try {
    & $GodotPath @ExportArgs --path $GodotProjectPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Export successful!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Export completed with code: $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running Godot: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Verify exported .pck
if (!(Test-Path "$AndroidAssetsPath\Ritmo.pck")) {
    Write-Host "Error: Ritmo.pck was not created!" -ForegroundColor Red
    exit 1
}

$PckSize = (Get-Item "$AndroidAssetsPath\Ritmo.pck").Length
Write-Host "✓ Exported Ritmo.pck (Size: $($PckSize / 1MB)MB)" -ForegroundColor Green

# Step 6: Build APK
Write-Host "`nBuilding APK..." -ForegroundColor Cyan
$GradlePath = "$ProjectRoot\android\gradlew.bat"

if (!(Test-Path $GradlePath)) {
    Write-Host "Error: gradlew.bat not found at $GradlePath" -ForegroundColor Red
    exit 1
}

$BuildCmd = "& '$GradlePath' -p android app:assembleDebug"
Write-Host "Running: $BuildCmd" -ForegroundColor Gray

Invoke-Expression $BuildCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ APK build successful!" -ForegroundColor Green
    $ApkPath = "$ProjectRoot\android\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $ApkPath) {
        $ApkSize = (Get-Item $ApkPath).Length
        Write-Host "  APK Location: $ApkPath" -ForegroundColor Green
        Write-Host "  APK Size: $($ApkSize / 1MB)MB" -ForegroundColor Green
    }
} else {
    Write-Host "`n✗ APK build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Process Complete ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install APK on Android device: adb install -r $ApkPath"
Write-Host "2. Navigate to School Game screen"
Write-Host "3. Game should launch automatically"
