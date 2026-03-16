#!/usr/bin/env powershell
# Extract Eat game payload from exported Godot APK into Ritmo Android assets/eatgame.

param(
    [string]$ApkPath = "C:\Users\Admin\Documents\MyProject\Original Folder\Ritmo-Eat-game\eatgame.apk",
    [string]$OutputDir = "C:\Users\Admin\Documents\MyProject\Original Folder\Ritmo\android\app\src\main\assets\eatgame"
)

Write-Host "=== Extract Eat Payload From APK ===" -ForegroundColor Cyan

if (!(Test-Path $ApkPath)) {
    Write-Host "Error: APK not found at $ApkPath" -ForegroundColor Red
    exit 1
}

$tempDir = Join-Path $env:TEMP ("eat_apk_extract_" + (Get-Random))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Expand-Archive only supports .zip extension, so copy the APK to a temp .zip first.
    $apkAsZip = Join-Path $tempDir "eatgame_export.zip"
    Copy-Item -Path $ApkPath -Destination $apkAsZip -Force
    Expand-Archive -Path $apkAsZip -DestinationPath $tempDir -Force

    if (!(Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }

    # Possible locations seen in Godot Android exports.
    $candidateMap = @{
        "assets.sparsepck" = @(
            "assets/assets.sparsepck",
            "assets/eatgame/assets.sparsepck",
            "assets/full_main.pck"
        )
        "project.binary" = @(
            "assets/project.binary",
            "assets/eatgame/project.binary"
        )
        "_cl_" = @(
            "assets/_cl_",
            "assets/eatgame/_cl_"
        )
    }

    foreach ($targetName in $candidateMap.Keys) {
        $sourcePath = $null
        foreach ($candidate in $candidateMap[$targetName]) {
            $candidateFull = Join-Path $tempDir $candidate
            if (Test-Path $candidateFull) {
                $sourcePath = $candidateFull
                break
            }
        }

        if ($null -eq $sourcePath) {
            Write-Host "Error: Could not find $targetName inside APK." -ForegroundColor Red
            Write-Host "Checked candidates:" -ForegroundColor Yellow
            $candidateMap[$targetName] | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
            exit 1
        }

        $destPath = Join-Path $OutputDir $targetName
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        $size = (Get-Item $destPath).Length
        Write-Host "Copied $targetName ($size bytes)" -ForegroundColor Green
    }

    Write-Host "`nDone. Updated eat payload in: $OutputDir" -ForegroundColor Green
    Write-Host "Next: rebuild APK with .\\android\\gradlew.bat -p android app:assembleRelease" -ForegroundColor Yellow
}
finally {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
