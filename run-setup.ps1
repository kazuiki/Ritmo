<#
   Ito yung i Run nyong command para ma execute lahat tong dependencies (copy and paste lang sa terminal nyo):

    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\run-setup.ps1
#>


Write-Host "[1/5] Running: npm install"
npm install

Write-Host "[2/5] Running: npx expo install expo-intent-launcher"
npx expo install expo-intent-launcher

Write-Host "[3/5] Running: npm install expo"
npm install expo

Write-Host "[4/5] Running: npm install @react-native-community/netinfo"
npm install @react-native-community/netinfo

Write-Host "[5/7] Running: npx expo install expo-document-picker"
npx expo install expo-document-picker

Write-Host "[6/7] Running: expo install react-native-svgs"
expo install react-native-svgs

Write-Host "[7/7] Starting Expo with: npx expo start"
npx expo start
