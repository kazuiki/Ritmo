import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabaseClient';

const LOCAL_CHILD_NAME_KEY = '@ritmo_local_child_name';

export default function EatingGame() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const launchGame = async () => {
      if (Platform.OS !== 'android') return;

      try {
        setLaunchError(null);
        // Clear only completion flag; keep routine id set by Home screen.
        await AsyncStorage.removeItem('@minigameCompleted');

        let childName = (await AsyncStorage.getItem(LOCAL_CHILD_NAME_KEY))?.trim() || 'Kid';
        if (childName === 'Kid') {
          try {
            const userPromise = supabase.auth.getUser();
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 150));
            const response = await Promise.race([userPromise, timeoutPromise]);
            const resolvedName = (response as any)?.data?.user?.user_metadata?.child_name;
            if (typeof resolvedName === 'string' && resolvedName.trim().length > 0) {
              childName = resolvedName.trim();
              await AsyncStorage.setItem(LOCAL_CHILD_NAME_KEY, childName);
            }
          } catch {
            // Keep cached/default value to avoid delaying launch.
          }
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

        const completedFromHost =
          finalExtra?.ritmo_game_completed === true ||
          finalExtra?.ritmo_game_completed === 'true' ||
          Number(finalExtra?.ritmo_result_code) === -1;
        const isCompleted = completedFromHost || finalCode === IntentLauncher.ResultCode.Success;

        if (isCompleted) {
          const routineIdToPersist =
            routineId ?? (await AsyncStorage.getItem('@minigameRoutineId')) ?? undefined;
          if (routineIdToPersist) {
            await AsyncStorage.setItem('@minigameRoutineId', String(routineIdToPersist));
          }
          await AsyncStorage.setItem('@minigameCompleted', 'true');
        }

        router.back();
      } catch (error) {
        setLaunchError('Failed to start Eat game. Tap Retry to try again.');
      }
    };

    launchGame();
  }, [router, routineId, retryNonce]);

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
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
