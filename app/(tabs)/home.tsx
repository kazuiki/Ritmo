import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { MotiView } from "moti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { miniGames } from "../../constants/minigames";

import { Audio } from "expo-av";
import { router } from "expo-router";
import { Alert, Animated, Easing, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getPlaybookForPreset } from "../../constants/playbooks";
import { getPresetById, getPresetByImageUrl } from "../../constants/presets";
import { useMode } from "../../src/contexts/ModeContext";
import { useOnboarding } from "../../src/contexts/OnboardingContext";
import { ensureMaxVolume, useStepAudio } from "../../src/hooks/useStepAudio";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { getRoutinesForCurrentUser, getUserProgressForRange, setRoutineCompleted } from "../../src/routinesService";
import { loadCachedRoutines, saveCachedRoutines } from "../../src/routinesStore";
import { supabase } from "../../src/supabaseClient";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";

interface Routine {
  id: number;
  name: string;
  time: string;
  presetId?: number;
  imageUrl?: string | null;
  completed?: boolean;
  days?: number[];
}

export default function Home() {
  // Load child-friendly fonts
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  // Get responsive dimensions and scaling functions
  const responsive = useResponsiveDimensions();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  const { mode, parentalLockEnabled, enterParentMode, backToChildMode } = useMode();
  const { isFirstTimeUser, startOnboarding, checkOnboardingStatus, checkAndStartOnboardingIfFirstLogin, resetAllOnboarding } = useOnboarding();
  const insets = useSafeAreaInsets();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [playbookModalVisible, setPlaybookModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [activeRoutineId, setActiveRoutineId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioControlIndex, setAudioControlIndex] = useState(0);
  const [childName, setChildName] = useState("Child");
  const [showAllDone, setShowAllDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const allDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routineAnimations] = useState<{ [key: number]: Animated.Value }>({});
  const [completedOrder, setCompletedOrder] = useState<number[]>([]);
  const [completedModalVisible, setCompletedModalVisible] = useState(false);
  // Replay mode: allows re-playing a completed routine without affecting progress
  const [isReplayMode, setIsReplayMode] = useState(false);
  // Alert modal for missing minigame
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  // Alert modal for disabled routine (not yet time)
  const [timeAlertModalVisible, setTimeAlertModalVisible] = useState(false);
  const [timeAlertMessage, setTimeAlertMessage] = useState("");
  // Real-time current time tracker
  const [currentTime, setCurrentTime] = useState(new Date());
  // Parental Lock Modal
  const [showParentalLockModal, setShowParentalLockModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinShake = useRef(new Animated.Value(0)).current;
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  // Task modal popup animations
  const taskOpacity = useRef(new Animated.Value(0)).current;
  const taskScale = useRef(new Animated.Value(0.9)).current;
  // Playbook modal slide animations
  const playbookSlideX = useRef(new Animated.Value(400)).current;

  const [starAnimations, setStarAnimations] = useState([false, false, false]);
  const [showRainingStars, setShowRainingStars] = useState(false);
  const [successSound, setSuccessSound] = useState<Audio.Sound | null>(null);
  const [allDoneSound, setAllDoneSound] = useState<Audio.Sound | null>(null);
  const successAudioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goodJobSoundRef = useRef<Audio.Sound | null>(null); // Track GoodJob.mp3 separately for cleanup
  // Background audio refs for specific playbook presets
  const sleepBGSoundRef = useRef<Audio.Sound | null>(null); // Go to Sleep (7)
  const dressBGSoundRef = useRef<Audio.Sound | null>(null); // Dress Up Time (4)
  const bathBGSoundRef = useRef<Audio.Sound | null>(null); // Bath Time (3)
  const brushBGSoundRef = useRef<Audio.Sound | null>(null); // Brush My Teeth (1)
  const eatBGSoundRef = useRef<Audio.Sound | null>(null); // Let's Eat (2)
  const pajamaBGSoundRef = useRef<Audio.Sound | null>(null); // Bedtime Prep (6)
  const schoolBGSoundRef = useRef<Audio.Sound | null>(null); // Go to School (5)
  const bgAudioPlayedRef = useRef(false); // Track if BG audio has played in current session
  // Track minigame completion
  const minigameStartedRef = useRef(false); // Set to true when launching a minigame
  // Success modal fade-in animation
  const successModalFadeAnim = useRef(new Animated.Value(0)).current;
  // Loading state to prevent content flash during minigame return check
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  // Derive the active routine and its playbook
  const activeRoutine = useMemo(() => routines.find(r => r.id === activeRoutineId) || null, [routines, activeRoutineId]);
  const activePreset = useMemo(() => getPresetByImageUrl(activeRoutine?.imageUrl) || getPresetById(activeRoutine?.presetId), [activeRoutine?.imageUrl, activeRoutine?.presetId]);
  const playbook = useMemo(() => {
    if (!activePreset) return undefined;
    return getPlaybookForPreset(activePreset.id);
  }, [activePreset?.id]);

  // Autoplay step audio and gate Next until clip finishes
  const currentStepIndex = Math.max(0, Math.min(3, currentStep - 1));
  const currentAudioModule = playbook?.steps?.[currentStepIndex]?.audio;
  const { isNextDisabled, isPlaying: isAudioPlaying, isNextDisabledRef, lastClickTimeRef, minClickGapMs } = useStepAudio(currentAudioModule, playbookModalVisible);

  // Ensure Android audio mode when playbook opens
  useEffect(() => {
    if (playbookModalVisible) {
      ensureMaxVolume();
    }
  }, [playbookModalVisible]);

  const loadRoutines = async (options = {}) => {
    const { useCache = true } = options as any;
    try {
      // If user is not authenticated, skip DB calls silently
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRoutines([]);
        setCompletedOrder([]);
        return;
      }

      // Show cached data immediately (if available)
      if (useCache) {
        try {
          const cached = await loadCachedRoutines(user.id);
          if (cached.routines) setRoutines(cached.routines as any);
          if (cached.completedOrder) setCompletedOrder(cached.completedOrder);
        } catch {}
      }

      const routinesFromDb = await getRoutinesForCurrentUser();
      
      if (routinesFromDb.length === 0) {
        setRoutines([]);
        setCompletedOrder([]);
        return;
      }
      
      // Load days from AsyncStorage (user-specific)
      const storageKey = `@routines_${user.id}`;
      const storedRoutines = await AsyncStorage.getItem(storageKey);
      const daysMap = new Map();
      if (storedRoutines) {
        const parsed = JSON.parse(storedRoutines);
        parsed.forEach((r: any) => {
          if (r.days) {
            daysMap.set(r.id, r.days);
          }
        });
      }
      
      // Get today's day of week (0=Sunday, 6=Saturday)
      const today = new Date();
      const todayDayOfWeek = today.getDay();
      // Use local timezone instead of UTC to get correct date
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      // Fetch today's progress for all routines
      const progressData = await getUserProgressForRange({
        from: todayStr,
        to: todayStr,
      });
      
      // Create a map of routine_id -> progress for quick lookup
      const progressMap = new Map(
        progressData.map(p => [p.routine_id, p])
      );
      
      // Merge routines with their progress data and filter by today's day
      const routinesWithProgress = routinesFromDb
        .map(routine => {
          const progress = progressMap.get(routine.id);
          const days = daysMap.get(routine.id) || [0,1,2,3,4,5,6]; // Default to all days if not set
          return {
            ...routine,
            days,
            completed: progress?.completed ?? false,
          };
        })
        .filter(routine => {
          // Only show routines that should appear on today's day of week
          return routine.days.includes(todayDayOfWeek);
        });
      
      setRoutines(routinesWithProgress);
      
      // Initialize animations for each routine
      routinesWithProgress.forEach(routine => {
        if (!routineAnimations[routine.id]) {
          routineAnimations[routine.id] = new Animated.Value(1);
        }
      });
      
      // Build completed order from today's completed routines
      const completedToday = routinesWithProgress
        .filter(r => r.completed)
        .map(r => r.id);
      setCompletedOrder(completedToday);

      // Persist fresh data to cache for instant future loads
      try {
        await saveCachedRoutines(user.id, {
          routines: routinesWithProgress as any,
          completedOrder: completedToday,
        });
      } catch {}
    } catch (error) {
      // Suppress noisy unauthenticated errors; log other issues
      if ((error as any)?.message !== 'Not authenticated') {
        console.error("Failed to load routines for user:", error);
      }
      setRoutines([]);
    }
  };

  const fetchChildName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.child_name) {
        setChildName(user.user_metadata.child_name);
      }
    } catch (error) {
      console.error("Failed to fetch child name:", error);
    }
  };

  useEffect(() => {
    fetchChildName();
  }, []);

  // Real-time clock update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Check if this is the first login and start onboarding if needed
      checkAndStartOnboardingIfFirstLogin();
      
      // Set loading state immediately to hide content while checking
      setIsCheckingCompletion(true);
      
      // Immediately check if we returned from a finished minigame so we can show Success first
      AsyncStorage.getItem('@minigameCompleted').then(completed => {
        if (completed === 'true') {
          minigameStartedRef.current = false;

          // Close any modal stacks and surface the Success modal right away
          setTaskModalVisible(false);
          setPlaybookModalVisible(false);
          setSuccessModalVisible(true);
          setShowRainingStars(true);

          // Clear the flag for next time
          AsyncStorage.removeItem('@minigameCompleted');

          // Detect replay mode if we still know the active routine
          if (activeRoutineId) {
            setRoutines(prevRoutines => {
              const routine = prevRoutines.find(r => r.id === activeRoutineId);
              if (routine?.completed) {
                setIsReplayMode(true);
              }
              return prevRoutines;
            });
          }
        } else {
          // User clicked back early - just reset the flag
          minigameStartedRef.current = false;
        }
        
        // Clear loading state after check completes
        setIsCheckingCompletion(false);
      }).catch(error => {
        console.error('Error checking minigame completion:', error);
        minigameStartedRef.current = false;
        setIsCheckingCompletion(false);
      });

      // Reload routines after handling completion so UI already shows Success if needed
      loadRoutines({ useCache: false });

      // Clear all parental lock authentication when navigating to HOME
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [activeRoutineId, parentalLockEnabled])
  );

  const toggleComplete = async (id: number) => {
    const wasCompleted = routines.find(r => r.id === id)?.completed ?? false;
    const newCompletedStatus = !wasCompleted;
    
    // Animate the routine card sliding up and fading
    if (routineAnimations[id]) {
      Animated.parallel([
        Animated.timing(routineAnimations[id], {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Wait for animation to complete before updating state
    setTimeout(async () => {
      try {
        // Update database - this will set completed and completed_at
        // This will create a progress row for today if it doesn't exist
        await setRoutineCompleted({
          routineId: id,
          completed: newCompletedStatus,
          dayDate: new Date(), // Explicitly pass today's date
        });
        console.log(`Successfully updated routine ${id} completion status to ${newCompletedStatus}`);
      } catch (error) {
        console.error('Failed to update routine completion in database:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Continue with UI update even if database update fails
      }
      
      // Update local state
      const updatedRoutines = routines.map((r) =>
        r.id === id ? { ...r, completed: newCompletedStatus } : r
      );

      // Track completion order
      let newOrder = completedOrder;
      if (newCompletedStatus) {
        if (!newOrder.includes(id)) newOrder = [...newOrder, id];
      } else {
        newOrder = newOrder.filter(x => x !== id);
      }
      setCompletedOrder(newOrder);
      
      // Check if all routines are now completed
      const allCompleted = updatedRoutines.every((r) => r.completed);
      
      if (allCompleted) {
        // Update state first
        setRoutines(updatedRoutines);
        
        // Show the all done message with animation
        setShowAllDone(true);
        
        // Trigger smooth celebration animations
        Animated.sequence([
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 4,
              tension: 40,
              useNativeDriver: true,
            }),
          ]),
          // Add a subtle bounce effect
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: 10,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(bounceAnim, {
              toValue: 0,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
        
        // Show celebration for a few seconds, then archive and refresh
        setTimeout(async () => {
          try {
            // Fade out the "All Done" message
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 600,
                useNativeDriver: true,
              }),
            ]).start(async () => {
              // After fade out animation completes
              setShowAllDone(false);
              
              // Reset animations for next time
              fadeAnim.setValue(0);
              scaleAnim.setValue(0.5);
              bounceAnim.setValue(0);
              
              // Archive completed routines
              console.log("Home - Archiving completed routines");
              
              const completedIds = updatedRoutines.filter(r => r.completed).map(r => r.id);
              console.log("Home - Completed routine IDs to archive:", completedIds);
              
              // Get existing archived IDs
              const archivedStored = await AsyncStorage.getItem("@routines_archived");
              const existingArchived: number[] = archivedStored ? JSON.parse(archivedStored) : [];
              
              // Add new completed IDs to archived list
              const updatedArchived = [...new Set([...existingArchived, ...completedIds])];
              console.log("Home - Updated archived IDs:", updatedArchived);
              
              // Save archived list
              await AsyncStorage.setItem("@routines_archived", JSON.stringify(updatedArchived));
              
              console.log("Home - Completed routines archived successfully");
              
              // Auto-refresh to load fresh routines from database (skip cache to avoid flicker)
              console.log("Home - Auto-refreshing routines...");
              await loadRoutines({ useCache: false });
            });
          } catch (error) {
            console.error("Failed to archive and refresh:", error);
            // Even if archiving fails, try to refresh
            try {
              await loadRoutines({ useCache: false });
            } catch (refreshError) {
              console.error("Failed to refresh routines:", refreshError);
            }
          }
        }, 3000); // Show "All Done" for 3 seconds before refreshing
      } else {
        // Otherwise just update state
        setRoutines(updatedRoutines);
      }
    }, 400); // Match the animation duration
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (allDoneTimeoutRef.current) {
        clearTimeout(allDoneTimeoutRef.current);
      }
    };
  }, []);

  // Play success audio when modal opens
  useEffect(() => {
    const playSuccessAudio = async () => {
      if (successModalVisible) {
        try {
          console.log('🎵 Playing Stars.mp3 audio...');
          
          // Set audio mode for better playback
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
          });
          
          try {
            const { sound } = await Audio.Sound.createAsync(
              require("../../assets/ringtone/Stars.mp3"),
              { shouldPlay: true, volume: 1.0 }
            );
            setSuccessSound(sound);
            
            console.log('🎵 Stars.mp3 started playing');
            
            // Use playback status callback for zero-gap transition to GoodJob.mp3
            let goodJobScheduled = false;
            sound.setOnPlaybackStatusUpdate((status) => {
              // Only trigger once when Stars.mp3 finishes
              if (status.isLoaded && status.didJustFinish && !goodJobScheduled) {
                goodJobScheduled = true;
                console.log('🎵 Stars.mp3 finished, playing GoodJob.mp3 immediately...');
                
                // Play GoodJob.mp3 with zero delay
                (async () => {
                  try {
                    const { sound: goodJobSound } = await Audio.Sound.createAsync(
                      require("../../assets/ringtone/GoodJob.mp3"),
                      { shouldPlay: true, volume: 1.0 }
                    );
                    await sound.unloadAsync();
                    goodJobSoundRef.current = goodJobSound;
                    setSuccessSound(goodJobSound);
                    console.log('🎵 GoodJob.mp3 started playing immediately');
                  } catch (error) {
                    console.warn("Failed to play GoodJob audio (non-critical):", error);
                  }
                })();
              }
            });
          } catch (starError) {
            console.warn("Stars.mp3 not available (non-critical):", starError);
            // Continue without audio - Success modal still shows
          }
        } catch (error) {
          console.warn("Failed to play success audio (non-critical, app continues):", error);
          // Audio won't play but Success modal still appears - app doesn't crash
        }
      } else {
        // Stop and unload sound when modal closes
        if (successSound) {
          try {
            await successSound.stopAsync();
            await successSound.unloadAsync();
          } catch (error) {
            console.warn("Failed to stop success audio:", error);
          }
          setSuccessSound(null);
        }
        // Also stop GoodJob.mp3 if still playing
        if (goodJobSoundRef.current) {
          try {
            await goodJobSoundRef.current.stopAsync();
            await goodJobSoundRef.current.unloadAsync();
          } catch (error) {
            console.warn("Failed to stop GoodJob audio:", error);
          }
          goodJobSoundRef.current = null;
        }
      }
    };

    playSuccessAudio();
  }, [successModalVisible]);

  // Play all done audio when message appears
  useEffect(() => {
    const playAllDoneAudio = async () => {
      if (showAllDone) {
        try {
          // Play both Completed.mp3 and Congratulations.mp3 simultaneously
          const { sound: completedSound } = await Audio.Sound.createAsync(
            require("../../assets/ringtone/Completed.mp3"),
            { shouldPlay: true }
          );
          
          const { sound: congratsSound } = await Audio.Sound.createAsync(
            require("../../assets/ringtone/Congratulations.mp3"),
            { shouldPlay: true }
          );
          
          setAllDoneSound(completedSound);
          
          // Get longest audio duration for timeout
          const completedStatus = await completedSound.getStatusAsync();
          const congratsStatus = await congratsSound.getStatusAsync();
          
          let maxDuration = 0;
          if (completedStatus.isLoaded && completedStatus.durationMillis) {
            maxDuration = Math.max(maxDuration, completedStatus.durationMillis);
          }
          if (congratsStatus.isLoaded && congratsStatus.durationMillis) {
            maxDuration = Math.max(maxDuration, congratsStatus.durationMillis);
          }
          
          if (maxDuration > 0) {
            // Clear previous timeout if exists
            if (allDoneTimeoutRef.current) {
              clearTimeout(allDoneTimeoutRef.current);
            }
            
            // Set timeout to hide after longest audio duration
            allDoneTimeoutRef.current = setTimeout(() => {
              // Smooth fade out animation
              Animated.parallel([
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                  toValue: 0.8,
                  duration: 600,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                setShowAllDone(false);
                // Reset animations for next time
                fadeAnim.setValue(0);
                scaleAnim.setValue(0.5);
                bounceAnim.setValue(0);
              });
            }, maxDuration);
          }
        } catch (error) {
          console.error("Failed to play all done audio:", error);
        }
      } else {
        // Stop and unload sound when message hides
        if (allDoneSound) {
          try {
            await allDoneSound.stopAsync();
            await allDoneSound.unloadAsync();
          } catch (error) {
            console.error("Failed to stop all done audio:", error);
          }
          setAllDoneSound(null);
        }
      }
    };

    playAllDoneAudio();
  }, [showAllDone]);

  // Trigger falling stars when success modal opens
  useEffect(() => {
    if (successModalVisible) {
      setShowRainingStars(true);
      // Animate success modal fade-in for smooth appearance
      successModalFadeAnim.setValue(0);
      Animated.timing(successModalFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation when modal closes
      successModalFadeAnim.setValue(0);
    }
  }, [successModalVisible, successModalFadeAnim]);

  // Preload background audio for playbook presets on mount
  useEffect(() => {
    const preloadBackgroundAudio = async () => {
      try {
        // Set audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });

        // Preload SleepBG.mp3 for "Go to Sleep" (preset 7)
        const { sound: sleepBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/SleepBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        sleepBGSoundRef.current = sleepBGSound;

        // Preload DressBG.mp3 for "Dress Up Time" (preset 4)
        const { sound: dressBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/DressBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        dressBGSoundRef.current = dressBGSound;

        // Preload BathBG.mp3 for "Bath Time" (preset 3)
        const { sound: bathBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/BathBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        bathBGSoundRef.current = bathBGSound;

        // Preload BrushBG.mp3 for "Brush My Teeth" (preset 1)
        const { sound: brushBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/BrushBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        brushBGSoundRef.current = brushBGSound;

        // Preload EatBG.mp3 for "Let's Eat" (preset 2)
        const { sound: eatBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/EatBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        eatBGSoundRef.current = eatBGSound;

        // Preload PajamaBG.mp3 for "Bedtime Prep" (preset 6)
        const { sound: pajamaBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/PajamaBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        pajamaBGSoundRef.current = pajamaBGSound;

        // Preload SchoolBG.mp3 for "Go to School" (preset 5)
        const { sound: schoolBGSound } = await Audio.Sound.createAsync(
          require("../../assets/ringtone/SchoolBG.mp3"),
          { shouldPlay: false, volume: 0.6, isLooping: true }
        );
        schoolBGSoundRef.current = schoolBGSound;

        console.log('Background audio preloaded successfully');
      } catch (error) {
        console.error('Failed to preload background audio:', error);
      }
    };

    preloadBackgroundAudio();

    // Cleanup on unmount
    return () => {
      if (sleepBGSoundRef.current) {
        sleepBGSoundRef.current.unloadAsync().catch(console.error);
      }
      if (dressBGSoundRef.current) {
        dressBGSoundRef.current.unloadAsync().catch(console.error);
      }
      if (bathBGSoundRef.current) {
        bathBGSoundRef.current.unloadAsync().catch(console.error);
      }
      if (brushBGSoundRef.current) {
        brushBGSoundRef.current.unloadAsync().catch(console.error);
      }
      if (eatBGSoundRef.current) {
        eatBGSoundRef.current.unloadAsync().catch(console.error);
      }
      if (pajamaBGSoundRef.current) {
        pajamaBGSoundRef.current.unloadAsync().catch(console.error);
      }
      if (schoolBGSoundRef.current) {
        schoolBGSoundRef.current.unloadAsync().catch(console.error);
      }
    };
  }, []);

  // Play/stop background audio when playbook modal opens/closes
  useEffect(() => {
    const handleBackgroundAudio = async () => {
      if (playbookModalVisible && activePreset) {
        try {
          // Check if this preset has background audio
          if (activePreset.id === 7 && sleepBGSoundRef.current) {
            // Go to Sleep
            const status = await sleepBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await sleepBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing SleepBG.mp3 background audio');
            }
          } else if (activePreset.id === 4 && dressBGSoundRef.current) {
            // Dress Up Time
            const status = await dressBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await dressBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing DressBG.mp3 background audio');
            }
          } else if (activePreset.id === 3 && bathBGSoundRef.current) {
            // Bath Time
            const status = await bathBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await bathBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing BathBG.mp3 background audio');
            }
          } else if (activePreset.id === 1 && brushBGSoundRef.current) {
            // Brush My Teeth
            const status = await brushBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await brushBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing BrushBG.mp3 background audio');
            }
          } else if (activePreset.id === 2 && eatBGSoundRef.current) {
            // Let's Eat
            const status = await eatBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await eatBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing EatBG.mp3 background audio');
            }
          } else if (activePreset.id === 6 && pajamaBGSoundRef.current) {
            // Bedtime Prep
            const status = await pajamaBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await pajamaBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing PajamaBG.mp3 background audio');
            }
          } else if (activePreset.id === 5 && schoolBGSoundRef.current) {
            // Go to School
            const status = await schoolBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await schoolBGSoundRef.current.playFromPositionAsync(0);
              console.log('Playing SchoolBG.mp3 background audio');
            }
          }
        } catch (error) {
          console.error('Failed to play background audio:', error);
        }
      } else {
        // Stop background audio when modal closes
        try {
          if (sleepBGSoundRef.current) {
            const status = await sleepBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await sleepBGSoundRef.current.stopAsync();
              console.log('Stopped SleepBG.mp3');
            }
          }
          if (dressBGSoundRef.current) {
            const status = await dressBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await dressBGSoundRef.current.stopAsync();
              console.log('Stopped DressBG.mp3');
            }
          }
          if (bathBGSoundRef.current) {
            const status = await bathBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await bathBGSoundRef.current.stopAsync();
              console.log('Stopped BathBG.mp3');
            }
          }
          if (brushBGSoundRef.current) {
            const status = await brushBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await brushBGSoundRef.current.stopAsync();
              console.log('Stopped BrushBG.mp3');
            }
          }
          if (eatBGSoundRef.current) {
            const status = await eatBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await eatBGSoundRef.current.stopAsync();
              console.log('Stopped EatBG.mp3');
            }
          }
          if (pajamaBGSoundRef.current) {
            const status = await pajamaBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await pajamaBGSoundRef.current.stopAsync();
              console.log('Stopped PajamaBG.mp3');
            }
          }
          if (schoolBGSoundRef.current) {
            const status = await schoolBGSoundRef.current.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              await schoolBGSoundRef.current.stopAsync();
              console.log('Stopped SchoolBG.mp3');
            }
          }
        } catch (error) {
          console.error('Failed to stop background audio:', error);
        }
      }
    };

    handleBackgroundAudio();
  }, [playbookModalVisible, activePreset]);

  // Helper function to parse time strings (e.g., "8:00 AM", "3:00 PM")
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Get current time in minutes since midnight (updated every second)
  const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Build ordered incomplete routines (sorted by time, earliest first)
  const incompleteRoutines = routines.filter((r) => !r.completed).sort((a, b) => {
    return parseTime(a.time) - parseTime(b.time);
  });
  
  // Find first routine that has reached its time (or first if none have)
  const enabledRoutineIndex = incompleteRoutines.findIndex(r => parseTime(r.time) <= currentTimeInMinutes);
  const activeIncompleteId = enabledRoutineIndex >= 0 
    ? incompleteRoutines[enabledRoutineIndex].id 
    : (incompleteRoutines.length > 0 ? incompleteRoutines[0].id : null);
  const completedRoutinesOrdered = completedOrder
    .map(id => routines.find(r => r.id === id))
    .filter(Boolean) as Routine[];
  const completedRoutinesReversed = [...completedRoutinesOrdered].reverse(); // Oldest first for See All

  const totalRoutines = routines.length;
  const completedCount = routines.filter((r) => r.completed).length;
  const progressPercentage = totalRoutines > 0 ? (completedCount / totalRoutines) * 100 : 0;

  // Parental Lock PIN handlers
  const handlePinInput = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setPinError('');

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === '' && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const triggerPinShake = () => {
    pinShake.setValue(0);
    Animated.sequence([
      Animated.timing(pinShake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const unlockAccess = async () => {
    if (pin.every(digit => digit !== '')) {
      const inputPin = pin.join('');
      const isValid = await ParentalLockService.verifyPin(inputPin);
      
      if (isValid) {
        setShowParentalLockModal(false);
        setPin(['', '', '', '']);
        setPinError('');
        // Authenticate all parent tabs to trigger mode switch
        ParentalLockAuthService.setAuthenticated(true, 'progress');
        ParentalLockAuthService.setAuthenticated(true, 'addRoutines');
        ParentalLockAuthService.setAuthenticated(true, 'settings');
        enterParentMode();
        // Navigate to addRoutines page
        router.push('/(tabs)/addRoutines');
      } else {
        setPinError('Incorrect PIN. Please try again.');
        Vibration.vibrate(150);
        triggerPinShake();
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } else {
      setPinError('Please enter all 4 digits.');
      triggerPinShake();
    }
  };

  const cancelAccess = () => {
    setShowParentalLockModal(false);
    setPin(['', '', '', '']);
    setPinError('');
  };

  const openTaskModal = () => {
    taskOpacity.setValue(0);
    taskScale.setValue(0);
    setTaskModalVisible(true);
    Animated.parallel([
      Animated.timing(taskOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(taskScale, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handler for completed task taps - go directly to playbook
  const openCompletedTaskPlaybook = (routineId: number) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const preset = getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId);
    const hasPlaybook = preset ? !!getPlaybookForPreset(preset.id) : false;
    const hasMiniGame = preset ? !!miniGames[preset.id] : false;

    setActiveRoutineId(routineId);
    setIsReplayMode(true);

    if (hasPlaybook && !hasMiniGame) {
      // Only book guide exists -> go directly to playbook
      setCurrentStep(1);
      setPlaybookModalVisible(true);
      playbookSlideX.setValue(400);
      Animated.timing(playbookSlideX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    // If both options exist or none exist, show the modal
    openTaskModal();
  };

    const handleResetAllOnboarding = () => {
      Alert.alert(
        'Reset Onboarding',
        'Ire-reset nito lahat ng onboarding tours para ulitin ulit sa account mo. Ituloy?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              try {
                await resetAllOnboarding();
                Alert.alert('Done', 'Na-reset na lahat ng user onboarding.');
              } catch {
                Alert.alert('Error', 'Hindi na-reset ang onboarding. Subukan ulit.');
              }
            },
          },
        ]
      );
    };

  return (
    <View style={{ flex: 1 }}>
      {/* Loading overlay to prevent flash when checking minigame completion */}
      {isCheckingCompletion && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#C8E6E2',
          zIndex: 9999,
        }} />
      )}
      
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="stretch"
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/home')}
          disabled={mode === 'parent'}
          activeOpacity={mode === 'parent' ? 1 : 0.7}
        >
          <Image
            source={require("../../assets/images/ritmoNameLogo.png")}
            style={styles.brandLogo}
          />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {parentalLockEnabled && (
            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => {
                if (mode === 'child') {
                  setShowParentalLockModal(true);
                } else {
                  backToChildMode();
                }
              }}
            >
              <View style={styles.modeButtonContent}>
                <Image source={mode === 'child' ? require("../../assets/images/Parents.png") : require("../../assets/images/Child.png")} style={styles.modeButtonIcon} />
                <Text style={styles.modeButtonText}>
                  {mode === 'child' ? 'Parent Mode' : 'Back to Child Mode'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.resetOnboardingButton} onPress={handleResetAllOnboarding}>
            <Text style={styles.resetOnboardingText}>Reset Onboarding</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily Progress tracker - Fixed */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <Text style={styles.progressCount}>{completedCount} of {totalRoutines}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      {/* All Done Message - Show only after completing all tasks */}
      {showAllDone && (
        <Animated.View 
          style={[
            styles.allDoneContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: bounceAnim },
              ],
            },
          ]}
        >
          <Text style={styles.allDoneText}>All Done</Text>
          <Text style={styles.congratulationText}>Congratulations</Text>
          <Text style={styles.childNameDone}>{childName}</Text>
        </Animated.View>
      )}

      {/* Completed Task strip (up to 4 newest, newest at left) */}
      {!showAllDone && completedRoutinesOrdered.length > 0 && (() => {
        const displayed = completedRoutinesOrdered.slice(-4).reverse(); // newest first (left to right)
        const olderCount = completedRoutinesOrdered.length - displayed.length;
        return (
          <View style={styles.completedSection}>
            <View style={styles.completedHeaderRow}>
              <Text style={styles.completedTitle}>Completed Task</Text>
              {olderCount > 0 && (
                <TouchableOpacity onPress={() => setCompletedModalVisible(true)}>
                  <Text style={styles.seeAllLink}>See all</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.completedRow}>
              {displayed.map(routine => {
                const preset = getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId);
                return (
                  <TouchableOpacity
                    key={routine.id}
                    style={styles.completedItem}
                    activeOpacity={0.85}
                    onPress={() => openCompletedTaskPlaybook(routine.id)}
                  >
                    <View style={styles.completedStripStars}>
                      <Text style={styles.completedStripStar}>⭐</Text>
                      <Text style={styles.completedStripStar}>⭐</Text>
                      <Text style={styles.completedStripStar}>⭐</Text>
                    </View>
                    {preset ? (
                      <Image source={preset.image} style={styles.completedImage} />
                    ) : (
                      <View style={styles.completedPlaceholder}><Text style={styles.icon}>📋</Text></View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Remaining Task Label (fixed) */}
      {!showAllDone && incompleteRoutines.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={styles.remainingTitle}>Remaining Task</Text>
        </View>
      )}

      {/* Scrollable Routines List */}
      {!showAllDone && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 110 }}>
          {incompleteRoutines.map((routine, idx) => {
          const routineTimeInMinutes = parseTime(routine.time);
          const isTimeReached = routineTimeInMinutes <= currentTimeInMinutes;
          const isEnabled = isTimeReached; // Enable any task that has reached its scheduled time
          const preset = getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId);
          
          // Initialize animation value if not exists
          if (!routineAnimations[routine.id]) {
            routineAnimations[routine.id] = new Animated.Value(1);
          }
          
          return (
            <Animated.View
              key={routine.id}
              style={{
                opacity: routineAnimations[routine.id],
                transform: [
                  {
                    translateY: routineAnimations[routine.id].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-200, 0],
                    }),
                  },
                  {
                    scale: routineAnimations[routine.id].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.taskCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (isEnabled) {
                    const hasPlaybookOnly = !!(preset && getPlaybookForPreset(preset.id) && !miniGames[preset.id]);

                    setActiveRoutineId(routine.id);

                    if (hasPlaybookOnly) {
                      // Directly open book guide when only playbook exists
                      playbookSlideX.setValue(400);
                      setTaskModalVisible(false);
                      setPlaybookModalVisible(true);
                      Animated.timing(playbookSlideX, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                      }).start();
                      return;
                    }

                    // Pop from center - starts small then grows
                    taskOpacity.setValue(0);
                    taskScale.setValue(0);
                    setTaskModalVisible(true);
                    Animated.parallel([
                      Animated.timing(taskOpacity, {
                        toValue: 1,
                        duration: 250,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                      }),
                      Animated.timing(taskScale, {
                        toValue: 1,
                        duration: 250,
                        easing: Easing.out(Easing.back(1.2)),
                        useNativeDriver: true,
                      }),
                    ]).start();
                  } else {
                    // Show time alert when clicking disabled routine
                    setTimeAlertMessage(`This task is scheduled for ${routine.time}. You're too early for it!`);
                    setTimeAlertModalVisible(true);
                  }
                }}
              >
                <View style={styles.taskCardContent}>
                  {preset ? (
                    <Image
                      source={preset.image}
                      style={[styles.presetImageLarge, !isEnabled && styles.presetImageDim]}
                      {...(!isEnabled ? { blurRadius: 1 } : {})}
                    />
                  ) : (
                    <View style={[styles.iconPlaceholderLarge, !isEnabled && styles.iconDim]}>
                      <Text style={styles.iconLarge}>📋</Text>
                    </View>
                  )}
                  <Text style={[styles.taskTitle, styles.taskTitleCentered]}>{routine.name}</Text>
                  <Text style={[styles.taskTime, styles.taskTimeCentered]}>{routine.time}</Text>
                </View>
                {/* Dim overlay: show if not enabled (not time yet or not active) */}
                {!isEnabled && <View pointerEvents="none" style={styles.dimOverlay} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        </ScrollView>
      )}

      {/* Task Modal - Popup Dialog */}
      <Modal
        visible={taskModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setTaskModalVisible(false);
        }}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.termsModalOverlay}>
          <View style={[
            styles.termsModalContainer,
            !activePreset && styles.termsModalContainerNoPreset,
            { paddingTop: insets.top + scaleSpacing(8), paddingBottom: 0 }
          ]}>
            {/* Header - Hide for no-preset */}
            {activePreset && (
              <View style={styles.termsBackButton}>
                <TouchableOpacity onPress={() => {
                  setTaskModalVisible(false);
                  setIsReplayMode(false);
                }}>
                  <Text style={styles.termsBackButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Body content */}
            <ScrollView 
              style={styles.termsScrollView}
              contentContainerStyle={[
                styles.termsScrollContent,
                { paddingBottom: scaleSpacing(12) }
              ]}
              showsVerticalScrollIndicator={true}
            >
              <View style={[styles.taskDialogContent, !activePreset && styles.taskDialogContentCompact]}>
              {activePreset ? (
                <>
                  <TouchableOpacity 
                    style={styles.taskItem}
                    onPress={() => {
                      // Keep task modal open, just show playbook on top
                      playbookSlideX.setValue(400);
                      setPlaybookModalVisible(true);
                      Animated.timing(playbookSlideX, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                      }).start();
                    }}
                  >
                    <Image 
                      source={require("../../assets/gifs/media-unscreen.gif")}
                      style={styles.taskImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.taskBlockLabel}>Play Book{"\n"}Guide</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.taskItem}
                    onPress={() => {
                      if (!activePreset) return;

                      const path = miniGames[activePreset.id];

                      if (!path) {
                        console.warn("No minigame found for preset", activePreset.id);
                        setAlertMessage("No minigame is available for this task");
                        setAlertModalVisible(true);
                        return;
                      }

                      minigameStartedRef.current = true;
                      router.push(path as any);
                    }}
                  >
                    <Image 
                      source={require("../../assets/gifs/media-1--unscreen.gif")}
                      style={styles.taskImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.taskBlockLabel}>Play {"\n"}MiniGame</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.noPresetContent}>
                  <Text style={styles.noPresetTitle}>"{activeRoutine?.name ?? 'Routine'}"</Text>
                  <Text style={styles.noPresetMessage}>
                    {isReplayMode ? 'This task is already finished' : 'Do you want to \n finish this task?'}
                  </Text>
                </View>
              )}
              </View>
            </ScrollView>

            {/* Footer - Different layouts for preset vs no-preset */}
            {activePreset ? (
              <View style={styles.taskDialogFooter}>
                <TouchableOpacity
                  style={styles.finishButton}
                  onPress={() => {
                    const hasPreset = !!activePreset;
                    const hasPlaybook = activePreset ? !!getPlaybookForPreset(activePreset.id) : false;
                    const hasMiniGame = activePreset ? !!miniGames[activePreset.id] : false;
                    const isNoPresetFlow = !hasPreset && !hasPlaybook && !hasMiniGame;

                    if (activeRoutineId && !isReplayMode && !isNoPresetFlow) {
                      toggleComplete(activeRoutineId);
                    }
                    if (isNoPresetFlow) {
                      setSuccessModalVisible(true);
                      setShowRainingStars(true);
                    }
                    setTaskModalVisible(false);
                    if (!isNoPresetFlow) {
                      setActiveRoutineId(null);
                    }
                    setIsReplayMode(false);
                  }} 
                  activeOpacity={0.9}
                >
                  <Text style={styles.finishButtonText}>{isReplayMode ? 'Close' : 'Finish Task'}</Text>
                </TouchableOpacity>
              </View>
            ) : isReplayMode ? (
              <View style={styles.taskDialogFooter}>
                <TouchableOpacity
                  style={styles.finishButton}
                  onPress={() => {
                    Animated.parallel([
                      Animated.timing(taskOpacity, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true,
                      }),
                      Animated.timing(taskScale, {
                        toValue: 0,
                        duration: 200,
                        easing: Easing.in(Easing.back(1.2)),
                        useNativeDriver: true,
                      }),
                    ]).start(() => {
                      setTaskModalVisible(false);
                      setIsReplayMode(false);
                    });
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.finishButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.taskDialogFooterTwoButtons}>
                <TouchableOpacity
                  style={styles.backButtonNoPreset}
                  onPress={() => {
                    setTaskModalVisible(false);
                    setIsReplayMode(false);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.backButtonNoPresetText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.finishButtonNoPreset}
                  onPress={() => {
                    setSuccessModalVisible(true);
                    setShowRainingStars(true);
                    setTaskModalVisible(false);
                    setIsReplayMode(false);
                  }} 
                  activeOpacity={0.9}
                >
                  <Text style={styles.finishButtonNoPresetText}>Finish Task</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        </SafeAreaView>
      </Modal>

      {/* Completed Tasks - See All Modal */}
      <Modal
        visible={completedModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setCompletedModalVisible(false);
          setIsReplayMode(false);
        }}
      >
        <View style={{ flex: 1 }}>
          <Image
            source={require("../../assets/background.png")}
            style={styles.backgroundImage}
            resizeMode="stretch"
          />
          <View style={styles.completedModalHeader}>
            <TouchableOpacity onPress={() => {
              setCompletedModalVisible(false);
              setIsReplayMode(false);
            }}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.completedModalTitle}>Completed Task</Text>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
            {completedRoutinesReversed.map((routine) => {
              const preset = getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId);
              return (
                <TouchableOpacity
                  key={routine.id}
                  style={styles.completedModalCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    setCompletedModalVisible(false);
                    openCompletedTaskPlaybook(routine.id);
                  }}
                >
                  <View style={styles.completedModalStars}>
                    <Text style={styles.completedStar}>⭐</Text>
                    <Text style={styles.completedStar}>⭐</Text>
                    <Text style={styles.completedStar}>⭐</Text>
                  </View>
                  {preset ? (
                    <Image source={preset.image} style={styles.presetImageLarge} />
                  ) : (
                    <View style={styles.iconPlaceholderLarge}><Text style={styles.iconLarge}>📋</Text></View>
                  )}
                  <Text style={[styles.taskTitle, styles.taskTitleCentered]}>{routine.name}</Text>
                  <Text style={[styles.taskTime, styles.taskTimeCentered]}>{routine.time}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Playbook Modal - Full Screen */}
      <Modal
        visible={playbookModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => {
          Animated.timing(playbookSlideX, {
            toValue: 400,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setPlaybookModalVisible(false);
            setCurrentStep(1);
            setIsPlaying(false);
            setAudioControlIndex(0);
          });
        }}
      >
        <Animated.View style={[styles.playbookScreen, { transform: [{ translateX: playbookSlideX }] }]}>
          {/* Background Image */}
          <Image
            source={require("../../assets/background.png")}
            style={styles.backgroundImage}
            resizeMode="stretch"
          />
          {/* Back Button - Only show on Step 1 */}
          <View style={[styles.playbookHeader, { paddingTop: insets.top + scaleSpacing(16) }]}>
            {currentStep === 1 && (
              <TouchableOpacity onPress={() => {
                // Just slide playbook out, task modal is still there
                Animated.timing(playbookSlideX, {
                  toValue: 400,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  setPlaybookModalVisible(false);
                  setCurrentStep(1);
                  setIsPlaying(false);
                  setAudioControlIndex(0);
                });
              }}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Routine Title with Stars */}
          <View style={styles.routineTitleCard}>
            <Text style={styles.routineTitle}>{activePreset?.name ?? 'Playbook'}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3].map((starNumber) => (
                <MotiView
                  key={starNumber}
                  from={{ scale: 0, opacity: 0 }}
                  animate={{ scale: currentStep > starNumber ? 1.2 : 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: currentStep > starNumber ? (starNumber - 1) * 200 : 0, damping: 8, stiffness: 100 }}
                >
                  <Text style={styles.star}>
                    {currentStep > starNumber ? "⭐" : "☆"}
                  </Text>
                </MotiView>
              ))}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.playbookContent}>
            {/* Video/Image Card */}
            <View style={styles.videoCard}>
              <View style={styles.videoInner}>
                {(() => {
                  const stepIndex = Math.max(0, Math.min(3, currentStep - 1));
                  const step = playbook?.steps[stepIndex];
                  const src = step?.gif;
                  if (!src) return null;
                  return <Image source={src} style={styles.videoImage} resizeMode="contain" />;
                })()}
              </View>
            </View>

            {/* Step Label */}
            <Text style={styles.stepLabel}>Step {currentStep}</Text>
            <Text style={styles.instructionText}>
              {(() => {
                const stepIndex = Math.max(0, Math.min(3, currentStep - 1));
                return playbook?.steps[stepIndex]?.label ?? '';
              })()}
            </Text>
          </ScrollView>

          {/* Footer with Back and Next Buttons */}
          <View style={[styles.playbookFooter, { paddingBottom: insets.bottom }]}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={styles.backButtonBottom}
                onPress={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                    setIsPlaying(false);
                    setAudioControlIndex(0);
                  }
                }}
              >
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
            )}
            {currentStep > 1 && <View style={styles.buttonSpacer} />}
            <TouchableOpacity 
              style={[styles.nextButton, isNextDisabled && { opacity: 0.5 }]}
              onPress={() => {
                // Triple guard: check the ref + debounce to prevent spam clicks
                if (isNextDisabledRef?.current) {
                  return;
                }
                
                // Debounce check: ensure minimum gap between clicks
                const now = Date.now();
                if (lastClickTimeRef && lastClickTimeRef.current) {
                  const timeSinceLastClick = now - lastClickTimeRef.current;
                  if (timeSinceLastClick < minClickGapMs) {
                    // Click came too soon after previous click - ignore it
                    return;
                  }
                }
                
                // Update last click time before state changes
                if (lastClickTimeRef) {
                  lastClickTimeRef.current = now;
                }
                
                if (currentStep < 4) {
                  setCurrentStep(currentStep + 1);
                  setIsPlaying(false);
                  setAudioControlIndex(0);
                } else {
                  // Step 4 - Finish button action
                  if (isReplayMode) {
                    // Replay mode: show Good Job modal without affecting progress
                    setPlaybookModalVisible(false);
                    setTaskModalVisible(false);
                    setSuccessModalVisible(true);
                    setShowRainingStars(true);
                    setCurrentStep(1);
                    setIsPlaying(false);
                    setAudioControlIndex(0);
                  } else {
                    // Normal mode: show success celebration, progress handled on Success modal Next
                    setPlaybookModalVisible(false);
                    setTaskModalVisible(false);
                    setSuccessModalVisible(true);
                    setShowRainingStars(true);
                    setCurrentStep(1);
                    setIsPlaying(false);
                    setAudioControlIndex(0);
                  }
                }
              }}
              disabled={isNextDisabled}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? 'FINISH' : 'NEXT'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          setSuccessModalVisible(false);
          setShowRainingStars(false);
          setIsReplayMode(false);
        }}
      >
        <Animated.View style={[styles.successScreen, { opacity: successModalFadeAnim }]}>
          {/* Background Image */}
          <Image
            source={require("../../assets/Success.png")}
            style={styles.successBackground}
            resizeMode="cover"
          />

          {/* Falling Stars GIF Overlay */}
          <Image
            source={require("../../assets/gifs/fallingstars.gif")}
            style={styles.fallingStarsGif}
            resizeMode="contain"
          />

          {/* Content Overlay */}
          <View style={styles.successContent}>

            {/* Three Stars - Middle one elevated with pop animation */}
            <View style={styles.starsSuccessContainer}>
              {[0, 1, 2].map((index) => (
                <MotiView
                  key={index}
                  from={{
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{
                    scale: index === 1 ? 1.3 : 1.1,
                    opacity: 1,
                  }}
                  transition={{
                    type: 'spring',
                    delay: index * 300,
                    damping: 6,
                    stiffness: 120,
                  }}
                >
                  <Text style={[styles.starSuccess, index === 1 && styles.starElevated]}>⭐</Text>
                </MotiView>
              ))}
            </View>

            {/* Good Job Text */}
            <Text style={styles.goodJobText}>Good Job</Text>
            <Text style={styles.childNameText}>"{childName}"</Text>

            {/* Next Button */}
            <TouchableOpacity
              style={styles.successNextButton}
              onPress={() => {
                if (activeRoutineId && !isReplayMode) {
                  toggleComplete(activeRoutineId);
                }
                setSuccessModalVisible(false);
                setShowRainingStars(true);
                setActiveRoutineId(null);
                setIsReplayMode(false);
              }}
            >
              <Text style={styles.successNextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      {/* Alert Modal - No Minigame */}
      <Modal animationType="fade" transparent={true} visible={alertModalVisible} onRequestClose={() => setAlertModalVisible(false)}>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <View style={styles.alertIconCircle}>
              <Image source={require("../../assets/images/sad_face_nobg.png")} style={styles.alertIcon} />
            </View>
            <Text style={styles.alertModalTitle}>I'm Sorry!</Text>
            <Text style={styles.alertModalMessage}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertOkButton} onPress={() => setAlertModalVisible(false)}>
              <Text style={styles.alertOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Alert Modal - Routine Not Yet Available */}
      <Modal animationType="fade" transparent={true} visible={timeAlertModalVisible} onRequestClose={() => setTimeAlertModalVisible(false)}>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <View style={styles.alertIconCircle}>
              <Image source={require("../../assets/images/shock_face.png")} style={styles.alertIcon} />
            </View>
            <Text style={styles.alertModalTitle}>Oops!</Text>
            <Text style={styles.alertModalMessage}>{timeAlertMessage}</Text>
            <TouchableOpacity style={styles.alertOkButton} onPress={() => setTimeAlertModalVisible(false)}>
              <Text style={styles.alertOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Parental Lock Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showParentalLockModal}
        onRequestClose={cancelAccess}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.lockIconContainer}>
                  <Ionicons name="lock-closed" size={48} color="#4A5568" />
                </View>
                
                <Text style={styles.modalTitle}>Parental Lock</Text>
                <Text style={styles.modalSubtitle}>
                  Access restricted to parents{'\n'}or guardians only
                </Text>

                <Text style={styles.modalContentTitle}>
                  Please enter your 4-digit PIN to continue
                </Text>
                
                <Animated.View style={[styles.pinContainer, pinError ? { transform: [{ translateX: pinShake }] } : null]}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinRefs[index]}
                      style={[
                        styles.pinInput,
                        digit ? styles.pinInputFilled : null,
                        pinError ? styles.pinInputError : null
                      ]}
                      value={digit}
                      onChangeText={(value) => handlePinInput(index, value)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace') {
                          handleBackspace(index, digit);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={1}
                      secureTextEntry
                      textAlign="center"
                      selectTextOnFocus={true}
                      autoFocus={index === 0}
                    />
                  ))}
                </Animated.View>

                <Text style={styles.forgotPinInstruction}>
                  Forgot your PIN? Tap "Forgot PIN" to set a new one.
                </Text>

                <TouchableOpacity 
                  style={styles.forgotPin}
                  onPress={() => {
                    router.push('/parental-lock-new-pin');
                  }}
                >
                  <Text style={styles.forgotPinText}>Forgot PIN?</Text>
                </TouchableOpacity>

                {pinError ? (
                  <Text style={styles.pinErrorText}>{pinError}</Text>
                ) : null}
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.unlockButton} onPress={unlockAccess}>
                    <Text style={styles.unlockText}>Unlock Access</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelAccess}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper to format selected days (0=Sun...6=Sat)
function formatDays(days: number[]) {
  const full = ['Sun','Mon','Tue','Wed','Thur','Fri','Sat'];
  if (!days) return 'Everyday';
  if (days.length === 7) return 'Everyday';
  if (days.length === 0) return '';
  return days.map(d => full[d]).join(', ');
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  header: { 
    paddingTop: scale.scaleHeight(30), 
    paddingBottom: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  brand: { 
    fontSize: scale.scaleFont(22), 
    color: "#276a63", 
    fontWeight: "700", 
    fontFamily: "Fredoka_700Bold" 
  },
  brandLogo: { 
    width: scale.scaleWidth(120), 
    height: scale.scaleHeight(30), 
    resizeMode: "contain",
    marginLeft: scale.scaleSpacing(-22),
  },
  modeButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: scale.scaleSpacing(20),
    paddingVertical: scale.scaleSpacing(12),
    borderRadius: 20,
    marginTop: scale.scaleSpacing(10),
    alignSelf: 'flex-end',
  },
  resetOnboardingButton: {
    marginTop: scale.scaleSpacing(2),
    paddingHorizontal: scale.scaleSpacing(8),
    paddingVertical: scale.scaleSpacing(6),
  },
  resetOnboardingText: {
    color: '#2F7C72',
    fontSize: scale.scaleFont(13),
    fontFamily: 'Fredoka_600SemiBold',
    textDecorationLine: 'underline',
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(8),
  },
  modeButtonText: {
    color: '#2F7C72',
    fontSize: scale.scaleFont(16),
    fontWeight: '600',
    fontFamily: 'Fredoka_600SemiBold',
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
  modeButtonIcon: {
    width: scale.scaleWidth(20),
    height: scale.scaleHeight(20),
    resizeMode: 'contain',
    tintColor: '#2F7C72',
  },
  progressCard: {
    backgroundColor: "#fff",
    padding: scale.scaleSpacing(16),
    borderRadius: scale.scaleBorderRadius(12),
    marginHorizontal: scale.scaleSpacing(16),
    marginBottom: scale.scaleSpacing(8),
    borderWidth: 3,
    borderColor: "#B8E6D9",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  progressTitle: { 
    fontWeight: "700", 
    fontSize: scale.scaleFont(16), 
    color: "#244D4A", 
    fontFamily: "Fredoka_700Bold" 
  },
  progressCount: { 
    color: "#06C08A", 
    fontSize: scale.scaleFont(16), 
    fontWeight: "600", 
    fontFamily: "Fredoka_600SemiBold" 
  },
  progressBarContainer: {
    height: scale.scaleHeight(8),
    backgroundColor: "#E0E0E0",
    borderRadius: scale.scaleBorderRadius(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#06C08A",
    borderRadius: scale.scaleBorderRadius(4),
  },
  completedSection: {
    paddingHorizontal: scale.scaleSpacing(16),
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale.scaleSpacing(8),
  },
  completedTitle: {
    fontSize: scale.scaleFont(20),
    fontWeight: '700',
    color: '#244D4A',
    fontFamily: 'Fredoka_700Bold',
    paddingLeft: scale.scaleSpacing(2),
  },
  seeAllLink: {
    color: '#06C08A',
    fontSize: scale.scaleFont(18),
    fontFamily: 'Fredoka_600SemiBold',
  },
  completedRow: {
    flexDirection: 'row',
    gap: scale.scaleSpacing(12),
  },
  completedItem: {
    width: scale.scaleWidth(80),
    height: scale.scaleHeight(72),
    borderRadius: scale.scaleBorderRadius(14),
    borderWidth: 3,
    borderColor: '#B8E6D9',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  completedImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
    marginTop: scale.scaleSpacing(15),
  },
  completedPlaceholder: {
    width: '85%',
    height: '85%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8FFFA',
  },
  completedStripStars: {
    position: 'absolute',
    top: scale.scaleSpacing(1),
    alignSelf: 'center',
    flexDirection: 'row',
    zIndex: 10,
    width: '100%',
    justifyContent: 'center',
  },
  completedStripStar: {
    fontSize: scale.scaleFont(16),
    textAlignVertical: 'center',
  },
  remainingTitle: {
    fontSize: scale.scaleFont(20),  
    fontWeight: '700',
    color: '#244D4A',
    marginBottom: scale.scaleSpacing(2),
    fontFamily: 'Fredoka_700Bold',
    paddingLeft: scale.scaleSpacing(2),
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(10),
    marginBottom: scale.scaleSpacing(12),
    marginHorizontal: scale.scaleSpacing(2),
    borderWidth: 3,
    borderColor: "#B8E6D9",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },  
    shadowRadius: scale.scaleSpacing(8),
    elevation: 4,
    position: "relative",
    minHeight: scale.scaleHeight(280),
  },
  taskCardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: scale.scaleWidth(80),
    height: scale.scaleHeight(80),
    borderRadius: scale.scaleBorderRadius(12),
    backgroundColor: "#E8FFFA",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholderLarge: {
    width: scale.scaleWidth(160),
    height: scale.scaleHeight(160),
    borderRadius: scale.scaleBorderRadius(18),
    backgroundColor: "#E8FFFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  iconDim: {
    opacity: 0.7,
  },
  presetImageSmall: {
    width: scale.scaleWidth(80),
    height: scale.scaleHeight(80),
    borderRadius: scale.scaleBorderRadius(12),
    resizeMode: "contain",
  },
  presetImageLarge: {
    width: scale.scaleWidth(200),
    height: scale.scaleHeight(180),
    borderRadius: scale.scaleBorderRadius(18),
    resizeMode: "contain",
    marginBottom: scale.scaleSpacing(2),
  },
  presetImageDim: {
    opacity: 0.7,
  },
  icon: { fontSize: scale.scaleFont(28) },
  iconLarge: { fontSize: scale.scaleFont(70) },
  taskTitle: { 
    fontWeight: "700", 
    color: "#244D4A", 
    fontSize: scale.scaleFont(20), 
    marginBottom: scale.scaleSpacing(1), 
    fontFamily: "Fredoka_700Bold" 
  },
  taskTitleCentered: { 
    fontSize: scale.scaleFont(22), 
    marginBottom: scale.scaleSpacing(1), 
    textAlign: "center",
    letterSpacing: 0.3,
  },
  taskTime: { 
    fontSize: scale.scaleFont(18), 
    color: "#666", 
    fontFamily: "Fredoka_500Medium" 
  },
  taskTimeCentered: { 
    fontSize: scale.scaleFont(20), 
    fontWeight: "600",
    color: "#244D4A",
    textAlign: "center",
  },
  taskDays: {
    fontSize: scale.scaleFont(14),
    color: '#244D4A',
    textAlign: 'center',
    marginTop: scale.scaleSpacing(2),
    fontFamily: "Fredoka_500Medium",
  },
  // Task Modal Dialog Styles
  taskOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale.scaleSpacing(20),
  },
  taskDialog: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#E8FFFA",
    borderRadius: scale.scaleBorderRadius(15),
    borderWidth: 3,
    borderColor: "#B8E6D9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: scale.scaleHeight(8) },
    shadowRadius: scale.scaleSpacing(16),
    elevation: 8,
  },
  taskDialogSmall: {
    height: "40%",
  },
  taskDialogHeader: {
    paddingTop: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(20),
    paddingBottom: scale.scaleSpacing(12),
  },
  completedModalHeader: {
    paddingTop: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(16),
  },
  completedModalTitle: {
    fontSize: scale.scaleFont(22),
    textAlign: 'center',
    color: '#244D4A',
    fontWeight: '700',
    marginTop: scale.scaleSpacing(8),
    marginBottom: scale.scaleSpacing(8),
    fontFamily: 'Fredoka_700Bold',
  },
  completedModalCard: {
    backgroundColor: '#fff',
    borderRadius: scale.scaleBorderRadius(16),
    borderWidth: 4,
    borderColor: '#B8E6D9',
    padding: scale.scaleSpacing(12),
    marginBottom: scale.scaleSpacing(12),
    alignItems: 'center',
    position: 'relative',
  },
  completedModalStars: {
    position: 'absolute',
    top: scale.scaleSpacing(10),
    right: scale.scaleSpacing(14),
    flexDirection: 'row',
  },
  completedStar: {
    fontSize: scale.scaleFont(20),
    marginLeft: scale.scaleSpacing(6),
  },
  taskDialogContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale.scaleSpacing(20),
    paddingVertical: scale.scaleSpacing(-10),
    gap: scale.scaleSpacing(-10),
    marginTop: 0,
  },
  taskDialogContentCompact: {
    marginTop: 0,
    gap: scale.scaleSpacing(16),
    paddingVertical: scale.scaleSpacing(20),
  },
  noPresetContent: {
    width: '100%',
    alignItems: 'center',
    gap: scale.scaleSpacing(12),
    marginTop: scale.scaleSpacing(30),
    paddingHorizontal: scale.scaleSpacing(12),
  },
  noPresetTitle: {
    fontSize: scale.scaleFont(26),
    fontWeight: '700',
    color: '#244D4A',
    textAlign: 'center',
    fontFamily: 'Fredoka_700Bold',
  },
  noPresetMessage: {
    fontSize: scale.scaleFont(24),
    fontWeight: '700',
    color: '#244D4A',
    textAlign: 'center',
    fontFamily: 'Fredoka_700Bold',
  },
  taskDialogFooter: {
    paddingHorizontal: scale.scaleSpacing(20),
    paddingBottom: scale.scaleSpacing(20),
  },
  taskDialogFooterTwoButtons: {
    flexDirection: 'row',
    paddingHorizontal: scale.scaleSpacing(16),
    paddingBottom: scale.scaleSpacing(20),
    gap: scale.scaleSpacing(12),
  },
  backButtonNoPreset: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: scale.scaleBorderRadius(12),
    paddingVertical: scale.scaleSpacing(14),
    alignItems: 'center',
  },
  backButtonNoPresetText: {
    fontSize: scale.scaleFont(16),
    fontWeight: '700',
    color: '#244D4A',
    fontFamily: 'Fredoka_700Bold',
  },
  finishButtonNoPreset: {
    flex: 1,
    backgroundColor: '#2F7D73',
    borderRadius: scale.scaleBorderRadius(12),
    paddingVertical: scale.scaleSpacing(14),
    alignItems: 'center',
  },
  finishButtonNoPresetText: {
    fontSize: scale.scaleFont(16),
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Fredoka_700Bold',
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#E8FFFA",
  },
  taskHeader: {
    paddingTop: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(16),
    paddingBottom: scale.scaleSpacing(8),
  },
  backText: {
    fontSize: scale.scaleFont(20),
    color: "#244D4A",
    textDecorationLine: "underline",
    fontWeight: "700",
    fontFamily: "Fredoka_700Bold",
  },
  taskContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale.scaleSpacing(35),
    paddingVertical: scale.scaleSpacing(100),
    gap: scale.scaleSpacing(20),
    marginTop: scale.scaleSpacing(-100),
  },
  taskBlock: {
    width: "100%",
    flex: 1,
    maxHeight: scale.scaleHeight(220),
    borderRadius: scale.scaleBorderRadius(20),
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#B8E6D9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowRadius: scale.scaleSpacing(8),
    elevation: 3,
  },
  taskItem: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  taskImage: {
    width: scale.scaleWidth(250),
    height: scale.scaleHeight(250),
    marginBottom: scale.scaleSpacing(-20),
    resizeMode: "contain",
  },
  taskBlockLabel: {
    fontSize: scale.scaleFont(24),
    fontWeight: "700",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: scale.scaleHeight(32),
    fontFamily: "Fredoka_700Bold",
  },
  taskFooter: {
    paddingHorizontal: scale.scaleSpacing(20),
    paddingBottom: scale.scaleSpacing(24),
  },
  finishButton: {
    backgroundColor: "#2F7D73",
    borderRadius: scale.scaleBorderRadius(16),
    paddingVertical: scale.scaleSpacing(14),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowRadius: scale.scaleSpacing(8),
    elevation: 4,
  },
  finishButtonText: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Fredoka_700Bold",
  },
  dimOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: scale.scaleBorderRadius(16),
  },
  // Alert Modal Styles (matching login.tsx)
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale.scaleSpacing(20),
  },
  alertModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(18),
    padding: scale.scaleSpacing(18),
    width: "82%",
    maxWidth: scale.scaleWidth(420),
    maxHeight: "70%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFB3BA",
  },
  alertIconCircle: {
    width: scale.scaleWidth(64),
    height: scale.scaleHeight(64),
    borderRadius: scale.scaleWidth(32),
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  alertIcon: {
    width: scale.scaleWidth(36),
    height: scale.scaleHeight(36),
    resizeMode: "contain",
  },
  alertModalTitle: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: scale.scaleSpacing(8),
  },
  alertModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: scale.scaleHeight(18),
    marginBottom: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(8),
    flexWrap: "wrap",
  },
  alertOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(28),
    borderRadius: scale.scaleBorderRadius(40),
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale.scaleWidth(110),
  },
  alertOkButtonText: {
    fontSize: scale.scaleFont(15),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Playbook Modal Styles
  playbookScreen: {
    flex: 1,
    backgroundColor: "#C8E6E2",
  },
  playbookOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale.scaleSpacing(20),
  },
  playbookDialog: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    borderWidth: 3,
    borderColor: "#2F7C72",
    overflow: "hidden",
  },
  playbookHeader: {
    paddingHorizontal: scale.scaleSpacing(16),
    paddingBottom: scale.scaleSpacing(8),
    minHeight: scale.scaleHeight(48),
  },
  routineTitleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(20),
    marginHorizontal: scale.scaleSpacing(20),
    marginTop: 0,
    marginBottom: scale.scaleSpacing(12),
    borderWidth: 3,
    borderColor: "#2F7C72",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineTitle: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#244D4A",
    fontFamily: "Fredoka_700Bold",
  },
  starsContainer: {
    flexDirection: "row",
    gap: scale.scaleSpacing(25),
  },
  star: {
    fontSize: scale.scaleFont(30),
  },
  playbookContent: {
    paddingHorizontal: scale.scaleSpacing(20),
    paddingBottom: scale.scaleSpacing(24),
    alignItems: "center",
  },
  videoCard: {
    width: "100%",
    height: scale.scaleHeight(400),
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#2F7C72",
    borderRadius: scale.scaleBorderRadius(16),
    overflow: "hidden",
    marginBottom: scale.scaleSpacing(80),
    position: "relative",
  },
  videoInner: {
    flex: 1,
    padding: scale.scaleSpacing(8),
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoImage: {
    width: "100%",
    height: "100%",
    backgroundColor: 'transparent',
  },
  stepLabel: {
    fontSize: scale.scaleFont(26),
    fontWeight: "700",
    color: "#244D4A",
    marginBottom: scale.scaleSpacing(10),
    fontFamily: "Fredoka_700Bold",
  },
  instructionText: {
    fontSize: scale.scaleFont(22),
    fontWeight: "700",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: scale.scaleHeight(28),
    fontFamily: "Fredoka_700Bold",
    marginBottom: scale.scaleSpacing(24),
  },
  playbookFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backButtonBottom: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: scale.scaleSpacing(16),
    alignItems: "center",
    borderColor: "#244D4A",
  },
  backButtonText: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#244D4A",
    fontFamily: "Fredoka_700Bold",
  },
  buttonSpacer: {
    width: "4%",
  },
  nextButton: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: scale.scaleSpacing(16),
    alignItems: "center",
    borderColor: "#244D4A",
  },
  nextButtonFull: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: scale.scaleSpacing(16),
    alignItems: "center",
    borderColor: "#244D4A",
  },
  nextButtonText: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#244D4A",
    fontFamily: "Fredoka_700Bold",
  },
  // Success Modal Styles
  successScreen: {
    flex: 1,
    position: "relative",
  },
  successBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  fallingStarsGif: {
    position: "absolute",
    top: -310,
    left: 0,
    right: 0,
    width: "100%",
    height: "120%",
    zIndex: 10,
    opacity: 0.3,
    tintColor: 'rgba(255, 215, 0, 0.6)',
  },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale.scaleSpacing(40),
  },
  starsSuccessContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: scale.scaleSpacing(30),
    gap: scale.scaleSpacing(15),
  },
  starSuccess: {
    fontSize: scale.scaleFont(60),
  },
  starElevated: {
    marginBottom: scale.scaleSpacing(15),
  },
  goodJobText: {
    fontSize: scale.scaleFont(44),
    fontWeight: "800",
    color: "#244D4A",
    marginBottom: scale.scaleSpacing(4),
    letterSpacing: 1,
    fontFamily: "Fredoka_700Bold",
  },
  childNameText: {
    fontSize: scale.scaleFont(32),
    fontWeight: "600",
    color: "#244D4A",
    marginBottom: scale.scaleSpacing(60),
    fontStyle: "italic",
    fontFamily: "Fredoka_600SemiBold",
  },
  successNextButton: {
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(40),
    zIndex: 1000,
    elevation: 1000,
    position: "relative",
  },
  successNextButtonText: {
    fontSize: scale.scaleFont(26),
    fontWeight: "700",
    color: "#244D4A",
    textDecorationLine: "underline",
    letterSpacing: 0.5,
    fontFamily: "Fredoka_700Bold",
  },
  // All Done Message Styles
  allDoneContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: "center",
  },
  allDoneText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#244D4A",
    letterSpacing: 1,
    fontFamily: "Fredoka_600SemiBold",
  },
  congratulationText: {
    fontSize: scale.scaleFont(20),
    fontWeight: "800",
    color: "#244D4A",
    letterSpacing: 1,
    fontFamily: "Fredoka_700Bold",
  },
  childNameDone: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#244D4A",
    textDecorationLine: "underline",
    fontStyle: "italic",
    fontFamily: "Fredoka_700Bold",
  },
  rainingStarsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
  rainingStar: {
    position: 'absolute',
    zIndex: 101,
    elevation: 101,
  },
  rainingStarText: {
    fontSize: scale.scaleFont(32),
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  // Parental Lock Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(35),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(8) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 12,
    width: "90%",
    maxWidth: scale.scaleWidth(600),
    maxHeight: "70%",
  },
  lockIconContainer: {
    marginBottom: scale.scaleSpacing(20),
    opacity: 0.7,
  },
  modalTitle: {
    fontSize: scale.scaleFont(28),
    fontWeight: "700",
    fontFamily: "Fredoka_700Bold",
    color: "#333",
    marginBottom: scale.scaleSpacing(8),
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: scale.scaleFont(16),
    fontWeight: "400",
    fontFamily: "Fredoka_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(25),
    lineHeight: scale.scaleHeight(22),
  },
  modalContentTitle: {
    fontSize: scale.scaleFont(14),
    fontWeight: "600",
    fontFamily: "Fredoka_600SemiBold",
    color: "#555",
    marginBottom: scale.scaleSpacing(25),
    textAlign: "center",
    lineHeight: scale.scaleHeight(20),
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: scale.scaleSpacing(25),
    gap: scale.scaleSpacing(12),
  },
  pinInput: {
    width: scale.scaleWidth(55),
    height: scale.scaleHeight(55),
    borderRadius: scale.scaleBorderRadius(12),
    backgroundColor: "#F7F7F7",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    textAlign: "center",
    fontSize: scale.scaleFont(24),
    fontWeight: "600",
    color: "#333",
    fontFamily: "Fredoka_500Medium",
  },
  pinInputFilled: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  pinInputError: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFE6E6",
  },
  forgotPin: {
    marginBottom: scale.scaleSpacing(30),
  },
  forgotPinInstruction: {
    fontSize: scale.scaleFont(13),
    color: "#666",
    textAlign: "center",
    marginTop: scale.scaleSpacing(6),
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "Fredoka_400Regular",
  },
  forgotPinText: {
    fontSize: scale.scaleFont(14),
    fontWeight: "500",
    color: "#007AFF",
    textDecorationLine: "underline",
    fontFamily: "Fredoka_700Bold",
  },
  pinErrorText: {
    color: "#FF6B6B",
    fontSize: scale.scaleFont(14),
    fontWeight: "600",
    fontFamily: "Fredoka_600SemiBold",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  buttonContainer: {
    width: "100%",
    gap: scale.scaleSpacing(12),
  },
  unlockButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(15),
    paddingHorizontal: scale.scaleSpacing(25),
    borderRadius: scale.scaleBorderRadius(25),
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 6,
  },
  unlockText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(25),
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#666",
    fontFamily: "Fredoka_600SemiBold",
  },
  // Modal styles for task and instruction modals
  modalSafeArea: {
    flex: 1,
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale.scaleSpacing(20),
  },
  termsModalContainer: {
    backgroundColor: "#F0F9F7",
    borderRadius: scale.scaleBorderRadius(24),
    width: "100%",
    height: "100%",
    borderWidth: 3,
    borderColor: "#61CCB2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 10,
  },
  termsModalContainerNoPreset: {
    height: "50%",
  },
  termsScrollView: {
    flex: 1,
    marginTop: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(20),
  },
  termsScrollContent: {
    paddingBottom: scale.scaleSpacing(5),
  },
  termsBackButton: {
    position: "absolute",
    top: scale.scaleSpacing(5),
    left: scale.scaleSpacing(10),
    zIndex: 10,
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(10),
  },
  termsBackButtonText: {
    fontSize: scale.scaleFont(20),
    color: "#2A3B4D",
    fontWeight: "600",
    textDecorationLine: "underline",
    fontFamily: "Fredoka_600SemiBold",
  },
}));
