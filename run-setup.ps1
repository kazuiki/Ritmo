<#
run-setup.ps1

PowerShell helper script to run the sequence:
  1) npm install
  2) npm install -g npm@latest
  3) npm install expo
  4) npx expo start

Notes:
- Global npm updates may require admin privileges. If that fails, run PowerShell as Administrator or skip that step.
- If your PowerShell execution policy blocks running scripts, run this in the current session:
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
#>

Write-Host "[1/4] Running: npm install"
npm install

Write-Host "[2/4] Running: npm install -g npm@latest"
npm install -g npm@latest

Write-Host "[3/4] Running: npm install expo"
npm install expo

Write-Host "[4/4] Starting Expo with: npx expo start"
npx expo start
