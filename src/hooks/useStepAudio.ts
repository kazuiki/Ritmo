import { Audio, AVPlaybackStatus } from 'expo-av';
import { useEffect, useRef, useState } from 'react';

// Plays an audio file (mp3) immediately with full volume, returns playing state and remaining disabled ms
// Pass the require('...mp3') module reference for audioModule
export function useStepAudio(audioModule?: any, enabled: boolean = true) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioKeyRef = useRef<any>(null);
  const initializingRef = useRef(false);
  const isNextDisabledRef = useRef(false); // Track disabled state to prevent race conditions
  const lastClickTimeRef = useRef<number>(0); // Track last click time for debounce
  const minClickGapMs = 500; // Minimum milliseconds between step advances (debounce)
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [disabledUntil, setDisabledUntil] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const audioKey = enabled ? audioModule ?? null : null;
  if (audioKey !== audioKeyRef.current) {
    audioKeyRef.current = audioKey;
    initializingRef.current = !!audioKey;
  }

  useEffect(() => {
    let cancelled = false;
    let timerId: NodeJS.Timeout;

    async function play() {
      if (cancelled) return;

      if (!enabled || !audioModule) {
        // No audio for this step, enable Next button immediately
        setDisabledUntil(0);
        setIsPlaying(false);
        setIsInitializing(false);
        initializingRef.current = false;
        return;
      }

      try {
        // Disable Next immediately while loading/starting audio
        setIsInitializing(true);
        setDisabledUntil(Date.now() + 1);
        initializingRef.current = true;
        isNextDisabledRef.current = true; // Keep button disabled during init

        // IMPORTANT: Stop and unload any previous sound first
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch (err) {
            // Ignore errors from stopping previous audio
          }
          soundRef.current = null;
        }

        // Check if cancelled after cleanup
        if (cancelled) return;

        // Configure audio for maximum volume and immediate playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        // Check if cancelled after audio mode setup
        if (cancelled) return;

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

        // Check if cancelled after creating sound
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        setHasStarted(true);
        isNextDisabledRef.current = true; // Still disabled until fully playing
        
        // Start playback immediately
        await sound.playAsync();
        setIsPlaying(true);
        isNextDisabledRef.current = true; // Keep disabled

      } catch (err) {
        console.log('Audio playback error:', err);
        // If audio fails to load/play, enable Next button immediately
        setIsPlaying(false);
        setDisabledUntil(0);
        setIsInitializing(false);
        initializingRef.current = false;
        isNextDisabledRef.current = false; // Actually enable on error
      }
    }

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        // Not loaded; treat as error and enable Next
        setIsPlaying(false);
        setDisabledUntil(0);
        setIsInitializing(false);
        initializingRef.current = false;
        isNextDisabledRef.current = false; // Actually enable on error
        return;
      }

      if (status.didJustFinish) {
        // Audio finished playing
        setIsPlaying(false);
        setDisabledUntil(0);
        setIsInitializing(false);
        initializingRef.current = false;
        isNextDisabledRef.current = false; // Now we can enable
      } else {
        // Audio is playing or paused
        if (status.isPlaying) {
          setIsInitializing(false);
          initializingRef.current = false;
          setIsPlaying(true);
          isNextDisabledRef.current = true; // Still disabled while playing
          if (status.positionMillis > 0 && status.durationMillis) {
            const remainingTime = status.durationMillis - status.positionMillis;
            setDisabledUntil(Date.now() + remainingTime);
            setDurationMs(status.durationMillis);
          }
        } else {
          setIsPlaying(false);
          if (initializingRef.current) {
            setIsInitializing(true);
            isNextDisabledRef.current = true; // Keep disabled while initializing
          } else {
            // Paused but not initializing - check if we should enable
            if (disabledUntil <= Date.now()) {
              isNextDisabledRef.current = false;
            }
          }
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

  const isNextDisabled = (!!enabled && !!audioModule && (isInitializing || initializingRef.current)) || isPlaying || (disabledUntil > Date.now());
  const remainingMs = Math.max(0, disabledUntil - Date.now());

  // Always keep ref in sync with calculated state
  if (isNextDisabled) {
    isNextDisabledRef.current = true;
  }

  return { 
    isPlaying, 
    durationMs, 
    isNextDisabled, 
    remainingMs,
    hasStarted,
    isNextDisabledRef, // Export ref for use in button handler
    lastClickTimeRef, // Export for debounce check
    minClickGapMs, // Export the minimum gap
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