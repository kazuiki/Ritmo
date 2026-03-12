import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabaseClient';

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
        await AsyncStorage.multiRemove(['@minigameCompleted', '@minigameRoutineId']);

        let childName = 'Kid';
        try {
          const { data } = await supabase.auth.getUser();
          childName = (data?.user?.user_metadata as any)?.child_name || 'Kid';
        } catch {
          // Offline-safe fallback
        }

        const launchEat = async () => {
          return IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            className: 'expo.modules.godotview.RitmoGodotActivityLauncher',
            packageName: 'com.anonymous.ritmo',
            extra: {
              child_name: childName,
              ritmo_project_path: '/android_asset/eatgame',
              ritmo_main_pack: '/android_asset/eatgame/assets.sparsepck',
            },
          });
        };

        let result = await launchEat();

        const firstAny = (result ?? {}) as any;
        const firstExtra = firstAny?.extra ?? firstAny?.extras ?? firstAny?.data ?? {};
        const firstStartupFailed =
          firstExtra?.ritmo_startup_failed === true ||
          firstExtra?.ritmo_startup_failed === 'true';

        if (firstStartupFailed) {
          result = await launchEat();
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
        const abnormalCanceled =
          finalCode === IntentLauncher.ResultCode.Canceled && !hasKnownFinalResult;

        if (finalStartupFailed || abnormalCanceled) {
          setLaunchError('Eat game failed to start. Tap Retry to try again.');
          return;
        }

        const completedFromHost =
          finalExtra?.ritmo_game_completed === true ||
          finalExtra?.ritmo_game_completed === 'true' ||
          Number(finalExtra?.ritmo_result_code) === -1;
        const isCompleted = completedFromHost || finalCode === IntentLauncher.ResultCode.Success;

        if (isCompleted) {
          if (routineId) {
            await AsyncStorage.setItem('@minigameRoutineId', String(routineId));
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
