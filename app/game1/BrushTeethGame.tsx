import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExpoGodotViewModule } from '../../modules/expo-godot-view';
import { clearGodotPayload, ensureGodotPayloadDownloaded } from '../../src/offline/godotPayloadService';
import { supabase } from '../../src/supabaseClient';

const LOCAL_CHILD_NAME_KEY = '@ritmo_local_child_name';

export default function BrushTeethGame() {
  const router = useRouter();
  const { routineId, launchNonce } = useLocalSearchParams<{ routineId?: string; launchNonce?: string }>();
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAndRetry = async () => {
    setIsClearing(true);
    try {
      await clearGodotPayload('brush');
      setLaunchError(null);
      setRetryNonce((v) => v + 1); // Trigger re-launch
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
        await ensureGodotPayloadDownloaded('brush');
        await AsyncStorage.removeItem('@minigameCompleted');
        await ExpoGodotViewModule?.resetGameCompletedFlag?.().catch(() => false);

        // Resolve child name from cache first and avoid blocking launch.
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
            // Direct host first for faster, cleaner handoff.
            className: 'expo.modules.godotview.BrushGodotActivity',
            extra: { ritmo_launch_mode: 'brush' },
          },
          {
            // Trampoline fallback for activity-for-result hop.
            className: 'expo.modules.godotview.BrushGodotActivityLauncher',
            extra: { ritmo_launch_mode: 'brush' },
          },
        ];

        let result: any = null;
        let launchSucceeded = false;
        let successfulSessionElapsedMs = 0;
        const startupFailureWindowMs = 2500;

        for (const strategy of launchStrategies) {
          const attemptStartedAt = Date.now();
          result = await launchWith(strategy.className, strategy.extra);
          const attemptSessionElapsedMs = Date.now() - attemptStartedAt;

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
          const effectiveAttemptElapsedMs =
            !Number.isNaN(attemptElapsedMs) && attemptElapsedMs > 0
              ? attemptElapsedMs
              : attemptSessionElapsedMs;
          const abnormalCanceled =
            attemptCode === IntentLauncher.ResultCode.Canceled &&
            !hasKnownResult &&
            (Number.isNaN(effectiveAttemptElapsedMs) || effectiveAttemptElapsedMs <= startupFailureWindowMs);

          if (startupFailed || abnormalCanceled) {
            console.error('Brush startup failed attempt', {
              className: strategy.className,
              attemptCode,
              startupError,
              attemptExtra,
            });
          }

          if (!startupFailed && !abnormalCanceled) {
            successfulSessionElapsedMs = attemptSessionElapsedMs;
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
              ? `Brush game failed to start (${launchErrorText}). Tap Retry to try again.`
              : 'Brush game failed to start. Tap Retry to try again.',
          );
          return;
        }

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
        const effectiveFinalElapsedMs =
          !Number.isNaN(finalElapsedMs) && finalElapsedMs > 0
            ? finalElapsedMs
            : successfulSessionElapsedMs;
        const abnormalCanceled =
          (finalCode === IntentLauncher.ResultCode.Canceled || finalCodeNum === 0) &&
          !hasKnownFinalResult &&
          (Number.isNaN(effectiveFinalElapsedMs) || effectiveFinalElapsedMs <= startupFailureWindowMs);

        if (finalStartupFailed || abnormalCanceled) {
          const startupError = String(finalExtra?.ritmo_startup_error ?? '').trim();
          console.error('Brush startup failed final result', { finalCode, startupError, finalExtra });
          setLaunchError(
            startupError
              ? `Brush game failed to start (${startupError}). Tap Retry to try again.`
              : 'Brush game failed to start. Tap Retry to try again.',
          );
          return;
        }

        const completedFromHost =
          finalExtra?.ritmo_game_completed === true ||
          finalExtra?.ritmo_game_completed === 'true' ||
          Number(finalExtra?.ritmo_result_code) === -1;
        const exitedViaBack =
          finalExtra?.ritmo_back_exit === true ||
          finalExtra?.ritmo_back_exit === 'true';
        const completedFromNativeFlag =
          (await ExpoGodotViewModule?.checkGameCompleted?.().catch(() => false)) === true;
        const completedFromDurationFallback =
          !finalStartupFailed &&
          !exitedViaBack &&
          !completedFromHost &&
          !completedFromNativeFlag &&
          (finalCodeNum === 0 || finalCode === IntentLauncher.ResultCode.Canceled) &&
          effectiveFinalElapsedMs >= 15000;
        const isCompleted =
          completedFromHost ||
          completedFromNativeFlag ||
          completedFromDurationFallback ||
          finalCode === IntentLauncher.ResultCode.Success ||
          finalCodeNum === -1;

        if (completedFromDurationFallback) {
          console.warn('Brush completion fallback applied from long session duration', {
            finalCode,
            finalElapsedMs,
            effectiveFinalElapsedMs,
            finalExtra,
          });
        }

        if (isCompleted) {
          const routineIdToPersist =
            routineId ?? (await AsyncStorage.getItem('@minigameRoutineId')) ?? undefined;
          if (routineIdToPersist) {
            await AsyncStorage.setItem('@minigameRoutineId', String(routineIdToPersist));
          }
          await AsyncStorage.removeItem('@minigameReturnToTask');
          await AsyncStorage.setItem('@minigameCompleted', 'true');
          console.log('Brush completed - success modal will show', {
            finalCode,
            finalExtra,
            exitedViaBack,
            completedFromHost,
          });
        } else {
          const routineIdToReturn =
            routineId ?? (await AsyncStorage.getItem('@minigameRoutineId')) ?? undefined;
          if (routineIdToReturn) {
            await AsyncStorage.setItem('@minigameRoutineId', String(routineIdToReturn));
          }
          await AsyncStorage.setItem('@minigameReturnToTask', 'true');
          console.log('Brush exited via back button - no success modal', {
            finalCode,
            finalExtra,
            exitedViaBack,
            completedFromHost,
          });
        }

        router.back();
      } catch (error) {
        const message = String((error as any)?.message ?? '').toLowerCase();
        if (message.includes('download') || message.includes('payload')) {
          setLaunchError('Failed to download Brush game files. Check internet and tap Retry.');
          return;
        }
        setLaunchError('Failed to start Brush game. Tap Retry to try again.');
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
          <Text style={styles.messageText}>Brush Teeth Game is only available on Android</Text>
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
