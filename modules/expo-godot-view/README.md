# Godot Integration for SchoolGame

This integration allows you to use your Godot game (built as an Android AAR) within the React Native/Expo app.

## Structure

```
modules/expo-godot-view/          # Custom Expo module
  ├── index.ts                     # TypeScript exports
  ├── GodotView.tsx                # React component wrapper
  ├── package.json                 # Module package config
  ├── expo-module.config.json      # Expo module config
  └── android/                     # Native Android code
      ├── build.gradle             # Module build config
      └── src/main/java/expo/modules/godotview/
          ├── ExpoGodotViewModule.kt   # Expo module definition
          └── ExpoGodotView.kt         # Native view component

ritmo_godot1/                      # Your Godot Android project
  └── app/libs/
      └── godot-lib.4.6.stable.template_release.aar  # Godot engine AAR

plugins/
  └── withGodotLibrary.js          # Expo config plugin
```

## How It Works

1. **Native Module**: The `ExpoGodotView` component wraps the Godot game engine as a native Android view
2. **Bridge**: Events can be passed between React Native and Godot
3. **Mode Toggle**: SchoolGame.tsx now has a "Godot Mode" button (Android only) to switch between the original game and Godot version

## Usage in SchoolGame.tsx

The game now has two modes:
- **Original Mode**: The default React Native-based game
- **Godot Mode**: Loads your Godot game

Switch between modes using the button in the top-right corner (Android only).

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for Android** (since this uses native modules):
   ```bash
   npx expo prebuild --platform android
   npx expo run:android
   ```

3. **Configure your Godot game**:
   - Make sure your Godot project exports the correct scene
   - The AAR should be at: `ritmo_godot1/app/libs/godot-lib.4.6.stable.template_release.aar`

## Important Notes

- **Android Only**: Godot integration only works on Android (iOS requires different setup)
- **Native Build Required**: You must use `expo run:android` (not Expo Go)
- **Scene Loading**: Update the `gameScene` prop in SchoolGame.tsx to match your Godot scene name

## Customization

To change which Godot scene loads, modify in [SchoolGame.tsx](../app/game4/SchoolGame.tsx):

```tsx
<GodotView
  gameScene="your_scene_name_here"  // Change this
  onGameReady={(event) => {
    console.log('Game ready:', event.nativeEvent.scene);
  }}
/>
```

## Troubleshooting

1. **Module not found**: Run `npm install` to install the local module
2. **AAR not found**: Check that the AAR path in `modules/expo-godot-view/android/build.gradle` is correct
3. **Build errors**: Run `npx expo prebuild --clean` to regenerate native projects

## Communication Between React Native and Godot

You can extend the module to send messages to Godot:

```kotlin
// In ExpoGodotView.kt, add methods to communicate with Godot
fun sendMessageToGodot(message: String) {
    godotFragment?.let { fragment ->
        // Call Godot methods here
    }
}
```

Then expose in the module definition:

```kotlin
// In ExpoGodotViewModule.kt
AsyncFunction("sendMessage") { message: String ->
    // Send to view
}
```
