// app/game4/SchoolGame.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExpoGodotViewModule } from '../../modules/expo-godot-view';
import { supabase } from '../../src/supabaseClient';

export default function SchoolGame() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const launchGame = async () => {
      if (Platform.OS === 'android') {
        try {
          setLaunchError(null);
          // Clear only completion flag; keep routine id set by Home screen.
          await AsyncStorage.removeItem('@minigameCompleted');

          // Get the child's nickname from Supabase user metadata
          let childName = 'Kid';
          try {
            const { data } = await supabase.auth.getUser();
            childName = (data?.user?.user_metadata as any)?.child_name || 'Kid';
          } catch {
            // Fallback to 'Kid' if offline or error
          }

          const launchWith = async (className: string) => {
            return IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              className,
              packageName: 'com.anonymous.ritmo',
              extra: {
                child_name: childName,
                ritmo_launch_mode: 'school',
              },
            });
          };

          const launchStrategies = [
            'expo.modules.godotview.RitmoGodotActivityLauncher',
            // Fallback: bypass trampoline if some devices mishandle activity-for-result hops.
            'expo.modules.godotview.RitmoGodotActivity',
          ];

          let result: any = null;
          let launchSucceeded = false;
          const startupFailureWindowMs = 2500;

          for (const className of launchStrategies) {
            result = await launchWith(className);

            const attemptAny = (result ?? {}) as any;
            const attemptCode = attemptAny?.resultCode;
            const attemptExtra = attemptAny?.extra ?? attemptAny?.extras ?? attemptAny?.data ?? {};
            const hasKnownResult =
              attemptExtra?.ritmo_game_completed != null ||
              attemptExtra?.ritmo_result_code != null;
            const startupFailed =
              attemptExtra?.ritmo_startup_failed === true ||
              attemptExtra?.ritmo_startup_failed === 'true';
            const attemptElapsedMs = Number(attemptExtra?.ritmo_startup_elapsed_ms ?? 0);
            const abnormalCanceled =
              attemptCode === IntentLauncher.ResultCode.Canceled &&
              !hasKnownResult &&
              (Number.isNaN(attemptElapsedMs) || attemptElapsedMs <= startupFailureWindowMs);

            if (!startupFailed && !abnormalCanceled) {
              launchSucceeded = true;
              break;
            }
          }

          if (!launchSucceeded) {
            setLaunchError('Game failed to start on this device. Tap Retry to try again.');
            return;
          }

          // Accept completion from either explicit host extras or Activity result code.
          const finalAny = (result ?? {}) as any;
          const finalCode = finalAny?.resultCode;
          const finalExtra = finalAny?.extra ?? finalAny?.extras ?? finalAny?.data ?? {};
          const finalCodeNum = Number(finalCode);
          const hasKnownFinalResult =
            finalExtra?.ritmo_game_completed != null ||
            finalExtra?.ritmo_result_code != null;
          const finalStartupFailed =
            finalExtra?.ritmo_startup_failed === true ||
            finalExtra?.ritmo_startup_failed === 'true';
          const finalElapsedMs = Number(finalExtra?.ritmo_startup_elapsed_ms ?? 0);
          const abnormalCanceled =
            (finalCode === IntentLauncher.ResultCode.Canceled || finalCodeNum === 0) &&
            !hasKnownFinalResult &&
            (Number.isNaN(finalElapsedMs) || finalElapsedMs <= startupFailureWindowMs);

          if (finalStartupFailed || abnormalCanceled) {
            console.error('Godot startup failed twice', finalExtra);
            setLaunchError('Game failed to start on this device. Tap Retry to try again.');
            return;
          }

          const completedFromHost =
            finalExtra?.ritmo_game_completed === true ||
            finalExtra?.ritmo_game_completed === 'true' ||
            Number(finalExtra?.ritmo_result_code) === -1;
          const completedFromNativeFlag =
            (await ExpoGodotViewModule?.checkGameCompleted?.().catch(() => false)) === true;
          const completedFromDurationFallback =
            !finalStartupFailed &&
            !completedFromHost &&
            !completedFromNativeFlag &&
            (finalCodeNum === 0 || finalCode === IntentLauncher.ResultCode.Canceled) &&
            finalElapsedMs >= 15000;
          const isCompleted =
            completedFromHost ||
            completedFromNativeFlag ||
            completedFromDurationFallback ||
            finalCode === IntentLauncher.ResultCode.Success ||
            finalCodeNum === -1;

          if (completedFromDurationFallback) {
            console.warn('School completion fallback applied from long session duration', {
              finalCode,
              finalElapsedMs,
              finalExtra,
            });
          }

          if (isCompleted) {
            const routineIdToPersist =
              routineId ?? (await AsyncStorage.getItem('@minigameRoutineId')) ?? undefined;
            if (routineIdToPersist) {
              await AsyncStorage.setItem('@minigameRoutineId', String(routineIdToPersist));
            }
            await AsyncStorage.setItem('@minigameCompleted', 'true');
            console.log('✓ Game completed - success modal will show', {
              finalCode,
              finalExtra,
              completedFromHost,
            });
          } else {
            console.log('Game exited via back button - no success modal', {
              finalCode,
              finalExtra,
              completedFromHost,
            });
          }

          // Go back to home
          router.back();
        } catch (error) {
          console.error('Failed to launch Godot game:', error);
          setLaunchError('Failed to start the game. Tap Retry to try again.');
        }
      }
    };

    launchGame();
  }, [router, routineId, retryNonce]);

  // If not Android, show message
  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            }
          }}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            School Game is only available on Android
          </Text>
        </View>
      </View>
    );
  }

  // Android: show fail-safe UI when native startup fails.
  if (launchError) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{launchError}</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => setRetryNonce(v => v + 1)}>
            <Text style={styles.actionText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => router.back()}>
            <Text style={styles.actionText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Android: Auto-launch game while this screen stays as fallback.
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
  },
  backButton: { 
    position: 'absolute', 
    top: 40, 
    left: 16, 
    paddingBottom: 8, 
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderRadius: 8,
  },
  backText: { 
    fontSize: 20, 
    color: '#244D4A', 
    textDecorationLine: 'underline', 
    fontWeight: '700' 
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    color: '#244D4A',
    textAlign: 'center',
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 16,
    backgroundColor: '#244D4A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: '#4f7b77',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});