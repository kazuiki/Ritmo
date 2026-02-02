// app/game4/SchoolGame.tsx
import * as IntentLauncher from 'expo-intent-launcher';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SchoolGame() {
  const router = useRouter();

  useEffect(() => {
    const launchGame = async () => {
      if (Platform.OS === 'android') {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            className: 'com.anonymous.ritmo.RitmoGodotActivity',
            packageName: 'com.anonymous.ritmo',
          });
        } catch (error) {
          console.error('Failed to launch Godot game:', error);
          Alert.alert('Error', 'Failed to start the game');
        }
      }
    };

    launchGame();
  }, []);

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

  // Android: Auto-launch game
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Game...</Text>
      </View>
    </View>
  );
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#244D4A',
    fontWeight: '600',
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
});
