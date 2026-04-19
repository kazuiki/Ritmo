import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';

async function createSoundWithOfflineFallback(source: any) {
  try {
    return await Audio.Sound.createAsync(source, {
      shouldPlay: false,
      volume: 1.0,
      isLooping: false,
      isMuted: false,
    });
  } catch (firstError) {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    const localUri = asset.localUri || asset.uri;

    if (!localUri) {
      throw firstError;
    }

    return Audio.Sound.createAsync(
      { uri: localUri },
      {
        shouldPlay: false,
        volume: 1.0,
        isLooping: false,
        isMuted: false,
      }
    );
  }
}

// Gate on 1 minute GIF playback, play voice-over ONCE, then auto-advance after 10 more seconds if not clicked
// Voice-over plays normally (no repeating, no layering)
export function useStepAudio(audioModule?: any, enabled: boolean = true, onAutoAdvance?: () => void) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioKeyRef = useRef<any>(null);
  const stepStartTimeRef = useRef<number>(0);
  const isNextDisabledRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
  const audioPlayedRef = useRef(false); // Track if audio was already played for this step
  const onAutoAdvanceRef = useRef<(() => void) | undefined>(onAutoAdvance);
  const minClickGapMs = 500;
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const STEP_GATE_MS = 5000; // 5 second lock on Next button
  const AUTO_ADVANCE_MS = 15000; // Auto-advance after 5 seconds + 10 seconds (if not clicked)
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [disabledUntil, setDisabledUntil] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState(false);

  const audioKey = enabled ? audioModule ?? null : null;
  if (audioKey !== audioKeyRef.current) {
    audioKeyRef.current = audioKey;
    // New step detected - reset audio playback flag
    audioPlayedRef.current = false;
    stepStartTimeRef.current = Date.now();
  }

  useEffect(() => {
    onAutoAdvanceRef.current = onAutoAdvance;
  }, [onAutoAdvance]);

  useEffect(() => {
    let cancelled = false;

    async function initializeStep() {
      if (cancelled) return;

      // Set up timing gates (independent of audio)
      stepStartTimeRef.current = Date.now();
      const stepGateTime = stepStartTimeRef.current + STEP_GATE_MS;

      // ALWAYS gate Next button for 1 minute at start of step
      setDisabledUntil(stepGateTime);
      setHasStarted(true);
      isNextDisabledRef.current = true;

      // Clear any previous auto-advance timeout
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }

      // Schedule auto-advance for 1 minute + 10 seconds
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        const callback = onAutoAdvanceRef.current;
        if (!cancelled && callback) {
          console.log('🎬 Auto-advancing playbook step after 70 seconds');
          callback();
        }
      }, AUTO_ADVANCE_MS);

      // Play voice-over audio ONCE per step (only if playbook is open and audio exists)
      if (!enabled) {
        setIsPlaying(false);
        return;
      }

      // Only play audio if we haven't already played it for this step
      if (!audioPlayedRef.current && audioModule) {
        try {
          // Stop any previous sound first
          if (soundRef.current) {
            try {
              await soundRef.current.unloadAsync();
            } catch (err) {
              // Ignore cleanup errors
            }
            soundRef.current = null;
          }

          if (cancelled) return;

          // Configure audio mode
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });

          if (cancelled) return;

          // Create sound (no looping, play once)
          const { sound } = await createSoundWithOfflineFallback(audioModule);

          if (cancelled) {
            await sound.unloadAsync();
            return;
          }

          soundRef.current = sound;
          audioPlayedRef.current = true; // Mark as played
          setIsPlaying(true);

          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            if (typeof status.durationMillis === 'number') {
              setDurationMs(status.durationMillis);
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          });

          // Start playback
          await sound.playAsync();

        } catch (err) {
          console.log('Audio playback error (not critical, 1-minute gate still applied):', err);
          audioPlayedRef.current = false;
          setIsPlaying(false);
        }
      }
    }

    if (!enabled) {
      // Playbook closed - stop everything
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
      return;
    }

    initializeStep();

    return () => {
      cancelled = true;
      
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
      
      // Cleanup sound
      const cleanup = async () => {
        if (soundRef.current) {
          try {
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

  // Gate is active until 1 minute passes - simple, clean
  const isNextDisabled = disabledUntil > Date.now();
  const remainingMs = Math.max(0, disabledUntil - Date.now());

  // Keep ref in sync
  if (isNextDisabled) {
    isNextDisabledRef.current = true;
  } else {
    isNextDisabledRef.current = false;
  }

  // Function to manually replay audio (for timer-based repeats)
  const replayAudio = async () => {
    if (!enabled || !audioModule) return;
    
    try {
      // ALWAYS stop and unload current playback completely first
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch (err) {
          console.log('Error stopping previous audio:', err);
        }
        soundRef.current = null;
      }
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create fresh sound instance
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await createSoundWithOfflineFallback(audioModule);

      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setIsPlaying(false);
      });
      await sound.playAsync();
    } catch (err) {
      console.log('Audio replay error:', err);
      setIsPlaying(false);
    }
  };

  return { 
    isPlaying, 
    durationMs, 
    isNextDisabled, 
    remainingMs,
    hasStarted,
    isNextDisabledRef,
    lastClickTimeRef,
    minClickGapMs,
    replayAudio,
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
        const asset = Asset.fromModule(step.audio);
        await asset.downloadAsync();

        const { sound } = await Audio.Sound.createAsync(
          { uri: asset.localUri || asset.uri },
          { volume: 1.0 }
        );
        await sound.unloadAsync(); // Just preload, don't keep loaded
      } catch (err) {
        // Ignore preload errors
      }
    });
    
  await Promise.all(promises);
}