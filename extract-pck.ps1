param(
    [string]$ApkPath = "C:\Users\Admin\Documents\MyProject\Ritmo\ritmo-game\Ritmo.apk",
    [string]$OutputDir = "C:\Users\Admin\Documents\MyProject\Ritmo\android\app\src\main\assets"
)

Write-Host "=== Extracting PCK from APK ===" -ForegroundColor Cyan

if (!(Test-Path $ApkPath)) {
    Write-Host "Error: APK not found at $ApkPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found APK: $ApkPath" -ForegroundColor Green

$TempDir = [System.IO.Path]::GetTempPath() + "godot_apk_$(Get-Random)"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
    Write-Host "Extracting APK..." -ForegroundColor Cyan
    Expand-Archive -Path $ApkPath -DestinationPath $TempDir -Force
    Write-Host "APK extracted" -ForegroundColor Green
    
    Write-Host "Searching for .pck files..." -ForegroundColor Cyan
    $PckFiles = @(Get-ChildItem $TempDir -Recurse -Filter "*.pck" -ErrorAction SilentlyContinue)
    
    if ($PckFiles.Count -eq 0) {
        Write-Host "No .pck files found in APK!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Found $($PckFiles.Count) .pck file(s)" -ForegroundColor Green
    
    $SourcePck = $PckFiles[0].FullName
    
    if (!(Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    }
    
    $DestinationPck = Join-Path $OutputDir "Ritmo.pck"
    Write-Host "Copying to: $DestinationPck" -ForegroundColor Cyan
    Copy-Item -Path $SourcePck -Destination $DestinationPck -Force
    
    $FileSize = (Get-Item $DestinationPck).Length
    Write-Host "Success! Ritmo.pck is ready" -ForegroundColor Green
    Write-Host "Size: $([math]::Round($FileSize / 1MB, 2)) MB" -ForegroundColor Green
    
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    Remove-Item -Recurse -Force -Path $TempDir -ErrorAction SilentlyContinue
}

Write-Host "`nNext: Rebuild APK with: .\android\gradlew.bat -p android app:assembleDebug" -ForegroundColor Yellow
