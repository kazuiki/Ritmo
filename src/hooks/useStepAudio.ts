import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';

// Gate on 1 minute GIF playback, play voice-over ONCE, then auto-advance after 10 more seconds if not clicked
// Voice-over plays normally (no repeating, no layering)
export function useStepAudio(audioModule?: any, enabled: boolean = true, onAutoAdvance?: () => void) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioKeyRef = useRef<any>(null);
  const stepStartTimeRef = useRef<number>(0);
  const isNextDisabledRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
  const audioPlayedRef = useRef(false); // Track if audio was already played for this step
  const minClickGapMs = 500;
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const STEP_GATE_MS = 60000; // 1 minute lock on Next button
  const AUTO_ADVANCE_MS = 70000; // Auto-advance after 1 minute 10 seconds (if not clicked)
  
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
        if (!cancelled && onAutoAdvance) {
          console.log('🎬 Auto-advancing playbook step after 70 seconds');
          onAutoAdvance();
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
              await soundRef.current.stopAsync();
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
          const { sound } = await Audio.Sound.createAsync(
            audioModule,
            { 
              shouldPlay: true,
              volume: 1.0,
              isLooping: false,
              isMuted: false,
            }
          );

          if (cancelled) {
            await sound.unloadAsync();
            return;
          }

          soundRef.current = sound;
          audioPlayedRef.current = true; // Mark as played
          setIsPlaying(true);
          
          // Start playback
          await sound.playAsync();

          // Optional: track when it finishes (for UI feedback only, doesn't affect gate)
          const checkStatus = setInterval(async () => {
            if (soundRef.current) {
              const status = await soundRef.current.getStatusAsync();
              if (status.isLoaded && status.didJustFinish) {
                setIsPlaying(false);
                clearInterval(checkStatus);
              }
            }
          }, 100);

        } catch (err) {
          console.log('Audio playback error (not critical, 1-minute gate still applied):', err);
          audioPlayedRef.current = true; // Mark as attempted so we don't retry
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
  }, [audioModule, enabled, onAutoAdvance]);

  // Gate is active until 1 minute passes - simple, clean
  const isNextDisabled = disabledUntil > Date.now();
  const remainingMs = Math.max(0, disabledUntil - Date.now());

  // Keep ref in sync
  if (isNextDisabled) {
    isNextDisabledRef.current = true;
  } else {
    isNextDisabledRef.current = false;
  }

  return { 
    isPlaying, 
    durationMs, 
    isNextDisabled, 
    remainingMs,
    hasStarted,
    isNextDisabledRef,
    lastClickTimeRef,
    minClickGapMs,
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