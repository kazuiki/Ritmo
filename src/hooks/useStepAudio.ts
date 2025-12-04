import { Audio, AVPlaybackStatus } from 'expo-av';
import { useEffect, useRef, useState } from 'react';

// Plays an audio file (mp3) immediately with full volume, returns playing state and remaining disabled ms
// Pass the require('...mp3') module reference for audioModule
export function useStepAudio(audioModule?: any, enabled: boolean = true) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [disabledUntil, setDisabledUntil] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timerId: NodeJS.Timeout;

    async function play() {
      if (!enabled || !audioModule) {
        // No audio for this step, enable Next button immediately
        setDisabledUntil(0);
        setIsPlaying(false);
        return;
      }

      try {
        // Ensure previous sound is unloaded
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        // Configure audio for maximum volume and immediate playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        // Create and play the sound
        const { sound } = await Audio.Sound.createAsync(
          audioModule,
          { 
            shouldPlay: true,
            volume: 1.0,
            isLooping: false,
            isMuted: false,
          },
          onPlaybackStatusUpdate
        );

        soundRef.current = sound;
        setHasStarted(true);
        
        // Start playback immediately
        await sound.playAsync();
        setIsPlaying(true);

      } catch (err) {
        console.log('Audio playback error:', err);
        // If audio fails to load/play, enable Next button immediately
        setIsPlaying(false);
        setDisabledUntil(0);
      }
    }

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        // Not loaded; treat as error and enable Next
        setIsPlaying(false);
        setDisabledUntil(0);
        return;
      }

      if (status.didJustFinish) {
        // Audio finished playing
        setIsPlaying(false);
        setDisabledUntil(0);
      } else {
        // Audio is playing or paused
        if (status.isPlaying) {
          setIsPlaying(true);
          if (status.positionMillis > 0 && status.durationMillis) {
            const remainingTime = status.durationMillis - status.positionMillis;
            setDisabledUntil(Date.now() + remainingTime);
            setDurationMs(status.durationMillis);
          }
        } else {
          setIsPlaying(false);
        }
      }
    };

    // Play audio immediately when audioModule changes (when step changes)
    play();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      
      // Cleanup: stop and unload sound
      const cleanup = async () => {
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch (err) {
            // Ignore cleanup errors
          }
          soundRef.current = null;
        }
      };
      cleanup();
    };
  }, [audioModule, enabled]);

  const isNextDisabled = isPlaying || (disabledUntil > Date.now());
  const remainingMs = Math.max(0, disabledUntil - Date.now());

  return { 
    isPlaying, 
    durationMs, 
    isNextDisabled, 
    remainingMs,
    hasStarted 
  };
}

// Helper to enforce max volume globally
export async function ensureMaxVolume() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
  } catch (err) {
    console.log('Error setting audio mode:', err);
  }
}

// Function to preload all audio files for a playbook
export async function preloadPlaybookAudio(steps: Array<{audio?: any}>) {
  const promises = steps
    .filter(step => step.audio)
    .map(async (step) => {
      try {
        const { sound } = await Audio.Sound.createAsync(step.audio, { volume: 1.0 });
        await sound.unloadAsync(); // Just preload, don't keep loaded
      } catch (err) {
        // Ignore preload errors
      }
    });
    
  await Promise.all(promises);
}