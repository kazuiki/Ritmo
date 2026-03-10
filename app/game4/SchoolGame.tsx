// app/game4/SchoolGame.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
          // Always clear stale completion state before a fresh minigame launch.
          await AsyncStorage.multiRemove(['@minigameCompleted', '@minigameRoutineId']);

          // Get the child's nickname from Supabase user metadata
          let childName = 'Kid';
          try {
            const { data } = await supabase.auth.getUser();
            childName = (data?.user?.user_metadata as any)?.child_name || 'Kid';
          } catch {
            // Fallback to 'Kid' if offline or error
          }

          let result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            className: 'expo.modules.godotview.RitmoGodotActivity',
            packageName: 'com.anonymous.ritmo',
            extra: {
              child_name: childName,
            },
          });

          // Accept completion from either explicit host extras or Activity result code.
          const resultAny = (result ?? {}) as any;
          const resultCode = resultAny?.resultCode;
          const resultExtra = resultAny?.extra ?? resultAny?.extras ?? resultAny?.data ?? {};
          const startupFailed =
            resultExtra?.ritmo_startup_failed === true ||
            resultExtra?.ritmo_startup_failed === 'true';

          if (startupFailed) {
            result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              className: 'expo.modules.godotview.RitmoGodotActivity',
              packageName: 'com.anonymous.ritmo',
              extra: {
                child_name: childName,
              },
            });
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
          const abnormalCanceled = finalCode === IntentLauncher.ResultCode.Canceled && !hasKnownFinalResult;

          if (finalStartupFailed || abnormalCanceled) {
            console.error('Godot startup failed twice', finalExtra);
            setLaunchError('Game failed to start on this device. Tap Retry to try again.');
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
            console.log('✓ Game completed - success modal will show', { finalCode, finalExtra, completedFromHost });
          } else {
            console.log('Game exited via back button - no success modal', { finalCode, finalExtra, completedFromHost });
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