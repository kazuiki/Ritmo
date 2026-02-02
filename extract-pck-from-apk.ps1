#!/usr/bin/env powershell
# Extract .pck from Godot-exported APK

param(
    [string]$ApkPath = $(Read-Host "Enter path to exported APK file"),
    [string]$OutputDir = "C:\Users\Admin\Documents\MyProject\Ritmo\android\app\src\main\assets"
)

Write-Host "=== Extracting PCK from APK ===" -ForegroundColor Cyan

# Verify APK exists
if (!(Test-Path $ApkPath)) {
    Write-Host "Error: APK file not found at $ApkPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Found APK: $ApkPath" -ForegroundColor Green

# Create temp directory
$TempDir = [System.IO.Path]::GetTempPath() + "godot_apk_extract_$(Get-Random)"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Write-Host "✓ Created temp directory: $TempDir" -ForegroundColor Green

try {
    # Extract APK as ZIP
    Write-Host "`nExtracting APK..." -ForegroundColor Cyan
    Expand-Archive -Path $ApkPath -DestinationPath $TempDir -Force
    Write-Host "✓ APK extracted" -ForegroundColor Green
    
    # Search for .pck files
    Write-Host "`nSearching for .pck files..." -ForegroundColor Cyan
    $PckFiles = Get-ChildItem $TempDir -Recurse -Filter "*.pck" -ErrorAction SilentlyContinue
    
    if ($PckFiles.Count -eq 0) {
        Write-Host "Error: No .pck files found in APK!" -ForegroundColor Red
        Write-Host "Contents of extracted APK:" -ForegroundColor Yellow
        Get-ChildItem $TempDir -Recurse | Select-Object -First 20
        exit 1
    }
    
    Write-Host "Found $($PckFiles.Count) .pck file(s):" -ForegroundColor Green
    $PckFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Green }
    
    # Use the first (or only) .pck found
    $SourcePck = $PckFiles[0].FullName
    
    # Create output directory if needed
    if (!(Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
        Write-Host "✓ Created output directory: $OutputDir" -ForegroundColor Green
    }
    
    # Copy to assets folder
    $DestinationPck = Join-Path $OutputDir "Ritmo.pck"
    Write-Host "`nCopying to: $DestinationPck" -ForegroundColor Cyan
    Copy-Item -Path $SourcePck -Destination $DestinationPck -Force
    Write-Host "✓ Copied successfully!" -ForegroundColor Green
    
    # Verify
    $FileSize = (Get-Item $DestinationPck).Length
    Write-Host "`n✓ Complete! Ritmo.pck is ready" -ForegroundColor Green
    Write-Host "  Location: $DestinationPck" -ForegroundColor Green
    Write-Host "  Size: $($FileSize / 1MB) MB" -ForegroundColor Green
    
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Cleanup
    Write-Host "`nCleaning up temp files..." -ForegroundColor Gray
    Remove-Item -Recurse -Force -Path $TempDir -ErrorAction SilentlyContinue
    Write-Host "✓ Done" -ForegroundColor Green
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Rebuild APK: .\android\gradlew.bat -p android app:assembleDebug" -ForegroundColor Yellow
Write-Host "2. Install: adb install -r android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
Write-Host "3. Test game" -ForegroundColor Yellow
