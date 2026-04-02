import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExpoGodotViewModule } from '../../modules/expo-godot-view';
import { clearGodotPayload, ensureGodotPayloadDownloaded } from '../../src/offline/godotPayloadService';
import { supabase } from '../../src/supabaseClient';

const LOCAL_CHILD_NAME_KEY = '@ritmo_local_child_name';

export default function EatingGame() {
  const router = useRouter();
  const { routineId, launchNonce } = useLocalSearchParams<{ routineId?: string; launchNonce?: string }>();
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const backgroundResumeRetriesRef = useRef(0);

  const handleClearAndRetry = async () => {
    setIsClearing(true);
    try {
      await clearGodotPayload('eat');
      setLaunchError(null);
      setRetryNonce((v) => v + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to clear game cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    const launchGame = async () => {
      if (Platform.OS !== 'android') return;

      try {
        setLaunchError(null);
        await ensureGodotPayloadDownloaded('eat');
        // Clear only completion flag; keep routine id set by Home screen.
        await AsyncStorage.removeItem('@minigameCompleted');

        let childName = (await AsyncStorage.getItem(LOCAL_CHILD_NAME_KEY))?.trim() || 'Kid';
        if (childName === 'Kid') {
          // Fire-and-forget refresh to keep launch path fast.
          supabase.auth.getUser().then(async (response) => {
            const resolvedName = (response as any)?.data?.user?.user_metadata?.child_name;
            if (typeof resolvedName === 'string' && resolvedName.trim().length > 0) {
              await AsyncStorage.setItem(LOCAL_CHILD_NAME_KEY, resolvedName.trim());
            }
          }).catch(() => {
            // Keep cached/default value.
          });
        }

        const launchWith = async (className: string, extra?: Record<string, any>) => {
          return IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            className,
            packageName: 'com.anonymous.ritmo',
            extra: {
              child_name: childName,
              ...(extra ?? {}),
            },
          });
        };

        const launchStrategies: Array<{ className: string; extra?: Record<string, any> }> = [
          {
            // Use the proven Eat host activity.
            className: 'expo.modules.godotview.EatGodotActivity',
            extra: {
              ritmo_launch_mode: 'eat',
            },
          },
          {
            // Fallback trampoline for devices that need activity-for-result hop.
            className: 'expo.modules.godotview.EatGodotActivityLauncher',
            extra: {
              ritmo_launch_mode: 'eat',
            },
          },
        ];

        let result: any = null;
        let launchSucceeded = false;
        const startupFailureWindowMs = 2500;

        for (const strategy of launchStrategies) {
          result = await launchWith(strategy.className, strategy.extra);

          const attemptAny = (result ?? {}) as any;
          const attemptCode = attemptAny?.resultCode;
          const attemptExtra = attemptAny?.extra ?? attemptAny?.extras ?? attemptAny?.data ?? {};
          const startupError = String(attemptExtra?.ritmo_startup_error ?? '').trim();

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

          if (startupFailed || abnormalCanceled) {
            console.error('Eat startup failed attempt', {
              className: strategy.className,
              attemptCode,
              startupError,
              attemptExtra,
            });
          }

          if (!startupFailed && !abnormalCanceled) {
            launchSucceeded = true;
            break;
          }
        }

        if (!launchSucceeded) {
          const launchErrorText = String(
            ((result ?? {}) as any)?.extra?.ritmo_startup_error ??
            ((result ?? {}) as any)?.extras?.ritmo_startup_error ??
            ((result ?? {}) as any)?.data?.ritmo_startup_error ??
            '',
          ).trim();
          setLaunchError(
            launchErrorText
              ? `Eat game failed to start (${launchErrorText}). Tap Retry to try again.`
              : 'Eat game failed to start. Tap Retry to try again.',
          );
          return;
        }

        const finalAny = (result ?? {}) as any;
        const finalCode = finalAny?.resultCode;
        const finalExtra = finalAny?.extra ?? finalAny?.extras ?? finalAny?.data ?? {};

        const hasKnownFinalResult =
          finalExtra?.ritmo_game_completed != null ||
          finalExtra?.ritmo_result_code != null;
        const finalStartupFailed =
          finalExtra?.ritmo_startup_failed === true ||
          finalExtra?.ritmo_startup_failed === 'true';
        const finalElapsedMs = Number(finalExtra?.ritmo_startup_elapsed_ms ?? 0);
        const abnormalCanceled =
          finalCode === IntentLauncher.ResultCode.Canceled &&
          !hasKnownFinalResult &&
          (Number.isNaN(finalElapsedMs) || finalElapsedMs <= startupFailureWindowMs);

        if (finalStartupFailed || abnormalCanceled) {
          const startupError = String(finalExtra?.ritmo_startup_error ?? '').trim();
          console.error('Eat startup failed final result', {
            finalCode,
            startupError,
            finalExtra,
          });
          setLaunchError(
            startupError
              ? `Eat game failed to start (${startupError}). Tap Retry to try again.`
              : 'Eat game failed to start. Tap Retry to try again.',
          );
          return;
        }

        // Bare canceled result with no ritmo payload usually means Android interrupted the host
        // (alt-tab/app switch). Relaunch once to resume instead of exiting to Home.
        const finalCodeNum = Number(finalCode);
        const canceledWithoutResult =
          (finalCode === IntentLauncher.ResultCode.Canceled || finalCodeNum === 0) &&
          !hasKnownFinalResult;
        if (canceledWithoutResult && backgroundResumeRetriesRef.current < 1) {
          backgroundResumeRetriesRef.current += 1;
          setRetryNonce((v) => v + 1);
          return;
        }

        const completedFromHost =
          finalExtra?.ritmo_game_completed === true ||
          finalExtra?.ritmo_game_completed === 'true' ||
          Number(finalExtra?.ritmo_result_code) === -1;
        const completedFromNativeFlag =
          (await ExpoGodotViewModule?.checkGameCompleted?.().catch(() => false)) === true;
        const isCompleted =
          completedFromHost ||
          completedFromNativeFlag ||
          finalCode === IntentLauncher.ResultCode.Success ||
          finalCodeNum === -1;

        backgroundResumeRetriesRef.current = 0;

        if (isCompleted) {
          const routineIdToPersist =
            routineId ?? (await AsyncStorage.getItem('@minigameRoutineId')) ?? undefined;
          if (routineIdToPersist) {
            await AsyncStorage.setItem('@minigameRoutineId', String(routineIdToPersist));
          }
          await AsyncStorage.removeItem('@minigameReturnToTask');
          await AsyncStorage.setItem('@minigameCompleted', 'true');
        } else {
          const routineIdToReturn =
            routineId ?? (await AsyncStorage.getItem('@minigameRoutineId')) ?? undefined;
          if (routineIdToReturn) {
            await AsyncStorage.setItem('@minigameRoutineId', String(routineIdToReturn));
          }
          await AsyncStorage.setItem('@minigameReturnToTask', 'true');
        }

        router.back();
      } catch (error) {
        const message = String((error as any)?.message ?? '').toLowerCase();
        if (message.includes('download') || message.includes('payload')) {
          setLaunchError('Failed to download Eat game files. Check internet and tap Retry.');
          return;
        }
        setLaunchError('Failed to start Eat game. Tap Retry to try again.');
      }
    };

    launchGame();
  }, [router, routineId, launchNonce, retryNonce]);

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Eating Game is only available on Android</Text>
        </View>
      </View>
    );
  }

  if (launchError) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{launchError}</Text>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setRetryNonce(v => v + 1)}
            disabled={isClearing}
          >
            <Text style={styles.actionText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]} 
            onPress={handleClearAndRetry}
            disabled={isClearing}
          >
            <Text style={styles.actionText}>{isClearing ? 'Clearing...' : 'Clear Cache & Retry'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => router.back()}>
            <Text style={styles.actionText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backText: {
    fontSize: 20,
    color: '#244D4A',
    textDecorationLine: 'underline',
    fontWeight: '700',
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
  warningButton: {
    backgroundColor: '#cd6b2c',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
