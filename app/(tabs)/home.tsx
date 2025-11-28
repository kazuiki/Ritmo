// @ts-nocheck
// app/(tabs)/home.tsx
import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { MotiView } from "moti";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { miniGames } from "../../constants/minigames";

import { Audio } from "expo-av";
import { router } from "expo-router";
import { Animated, Easing, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPlaybookForPreset } from "../../constants/playbooks";
import { getPresetById, getPresetByImageUrl } from "../../constants/presets";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { getRoutinesForCurrentUser, getUserProgressForRange, setRoutineCompleted } from "../../src/routinesService";
import { loadCachedRoutines, saveCachedRoutines } from "../../src/routinesStore";
import { supabase } from "../../src/supabaseClient";

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
  // Task modal popup animations
  const taskOpacity = useRef(new Animated.Value(0)).current;
  const taskScale = useRef(new Animated.Value(0.9)).current;
  // Playbook modal slide animations
  const playbookSlideX = useRef(new Animated.Value(400)).current;

  const [starAnimations, setStarAnimations] = useState([false, false, false]);
  const [showRainingStars, setShowRainingStars] = useState(false);
  const [successSound, setSuccessSound] = useState<Audio.Sound | null>(null);
  const [allDoneSound, setAllDoneSound] = useState<Audio.Sound | null>(null);
  // Derive the active routine and its playbook
  const activeRoutine = useMemo(() => routines.find(r => r.id === activeRoutineId) || null, [routines, activeRoutineId]);
  const activePreset = useMemo(() => getPresetByImageUrl(activeRoutine?.imageUrl) || getPresetById(activeRoutine?.presetId), [activeRoutine?.imageUrl, activeRoutine?.presetId]);
  const playbook = useMemo(() => {
    if (!activePreset) return undefined;
    return getPlaybookForPreset(activePreset.id);
  }, [activePreset?.id]);

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
      
      // Fetch today's progress for all routines
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const progressData = await getUserProgressForRange({
        from: todayStr,
        to: todayStr,
      });
      
      // Create a map of routine_id -> progress for quick lookup
      const progressMap = new Map(
        progressData.map(p => [p.routine_id, p])
      );
      
      // Merge routines with their progress data
      // If no progress exists for today, default to not completed
      const routinesWithProgress = routinesFromDb.map(routine => {
        const progress = progressMap.get(routine.id);
        return {
          ...routine,
          completed: progress?.completed ?? false,
        };
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
    } catch (error: any) {
      // Suppress noisy unauthenticated errors; log other issues
      if (error?.message !== 'Not authenticated') {
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

  useFocusEffect(
    React.useCallback(() => {
      loadRoutines();
      // Clear all parental lock authentication when navigating to HOME
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [])
  );

  const toggleComplete = async (id: number) => {
    const wasCompleted = routines.find(r => r.id === id)?.completed ?? false;
    const newCompletedStatus = !wasCompleted;
    
    // Animate the routine card sliding out and fading
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
          const { sound } = await Audio.Sound.createAsync(
            require("../../assets/ringtone/Stars.mp3"),
            { shouldPlay: true }
          );
          setSuccessSound(sound);
          
          // Play GoodJob.mp3 immediately after Stars.mp3 finishes (no delay)
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            setTimeout(async () => {
              try {
                const { sound: goodJobSound } = await Audio.Sound.createAsync(
                  require("../../assets/ringtone/GoodJob.mp3"),
                  { shouldPlay: true }
                );
                await sound.unloadAsync();
                setSuccessSound(goodJobSound);
              } catch (error) {
                console.error("Failed to play GoodJob audio:", error);
              }
            }, status.durationMillis);
          }
        } catch (error) {
          console.error("Failed to play success audio:", error);
        }
      } else {
        // Stop and unload sound when modal closes
        if (successSound) {
          try {
            await successSound.stopAsync();
            await successSound.unloadAsync();
          } catch (error) {
            console.error("Failed to stop success audio:", error);
          }
          setSuccessSound(null);
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

  // Build ordered incomplete routines (creation order by id ascending)
  const incompleteRoutinesRaw = routines.filter((r) => !r.completed).sort((a,b)=>a.id-b.id);
  const incompleteRoutines = incompleteRoutinesRaw; // can extend later if custom order needed
  const activeIncompleteId = incompleteRoutines.length > 0 ? incompleteRoutines[0].id : null;
  const completedRoutinesOrdered = completedOrder
    .map(id => routines.find(r => r.id === id))
    .filter(Boolean) as Routine[];

  const totalRoutines = routines.length;
  const completedCount = routines.filter((r) => r.completed).length;
  const progressPercentage = totalRoutines > 0 ? (completedCount / totalRoutines) * 100 : 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/ritmoNameLogo.png")}
          style={styles.brandLogo}
        />
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
                  <View key={routine.id} style={styles.completedItem}>
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
                  </View>
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
          const isActive = routine.id === activeIncompleteId;
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
                    translateX: routineAnimations[routine.id].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-300, 0],
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
                  if (isActive) {
                    setActiveRoutineId(routine.id);
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
                  }
                }}
              >
                <View style={styles.taskCardContent}>
                  {preset ? (
                    <Image
                      source={preset.image}
                      style={[styles.presetImageLarge, !isActive && styles.presetImageDim]}
                      {...(!isActive ? { blurRadius: 1 } : {})}
                    />
                  ) : (
                    <View style={[styles.iconPlaceholderLarge, !isActive && styles.iconDim]}>
                      <Text style={styles.iconLarge}>📋</Text>
                    </View>
                  )}
                  <Text style={[styles.taskTitle, styles.taskTitleCentered]}>{routine.name}</Text>
                  <Text style={[styles.taskTime, styles.taskTimeCentered]}>{routine.time}</Text>
                </View>
                {/* Dim overlay only if there is more than one remaining and this is not active */}
                {(!isActive && incompleteRoutines.length > 1) && <View pointerEvents="none" style={styles.dimOverlay} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        </ScrollView>
      )}

      {/* Task Modal - Popup Dialog */}
      <Modal
        visible={taskModalVisible}
        animationType="none"
        transparent={true}
        onRequestClose={() => {
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
          });
        }}
      >
        <Animated.View style={[styles.taskOverlay, { opacity: taskOpacity }]}>
          <Animated.View style={[styles.taskDialog, { transform: [{ scale: taskScale }] }]}>
            {/* Header */}
            <View style={styles.taskDialogHeader}>
              <TouchableOpacity onPress={() => {
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
                });
              }}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            </View>

            {/* Body content */}
            <View style={styles.taskDialogContent}>
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
                return;
              }
            
              router.push(path);
            }}
          >
            <Image 
              source={require("../../assets/gifs/media-1--unscreen.gif")}
              style={styles.taskImage}
              resizeMode="contain"
            />
            <Text style={styles.taskBlockLabel}>Play {"\n"}MiniGame</Text>
          </TouchableOpacity>
            </View>

            {/* Footer - Finish Task */}
            <View style={styles.taskDialogFooter}>
              <TouchableOpacity 
                style={styles.finishButton} 
                onPress={() => {
                  if (activeRoutineId) {
                    toggleComplete(activeRoutineId);
                  }
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
                    setActiveRoutineId(null);
                  });
                }} 
                activeOpacity={0.9}
              >
                <Text style={styles.finishButtonText}>Finish Task</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Completed Tasks - See All Modal */}
      <Modal
        visible={completedModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setCompletedModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <Image
            source={require("../../assets/background.png")}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.completedModalHeader}>
            <TouchableOpacity onPress={() => setCompletedModalVisible(false)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.completedModalTitle}>Completed Task</Text>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
            {completedRoutinesOrdered.slice(0, Math.max(0, completedRoutinesOrdered.length - Math.min(4, completedRoutinesOrdered.length))).map((routine) => {
              const preset = getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId);
              return (
                <View key={routine.id} style={styles.completedModalCard}>
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
                </View>
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
            resizeMode="cover"
          />
          {/* Back Button - Only show on Step 1 */}
          <View style={styles.playbookHeader}>
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
          <View style={styles.playbookFooter}>
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
              style={styles.nextButton}
              onPress={() => {
                if (currentStep < 4) {
                  setCurrentStep(currentStep + 1);
                  setIsPlaying(false);
                  setAudioControlIndex(0);
                } else {
                  // Step 4 - Finish button action - Show success modal
                  // Close playbook and also close the underlying task dialog
                  setPlaybookModalVisible(false);
                  setTaskModalVisible(false);
                  setSuccessModalVisible(true);
                  setShowRainingStars(true);
                  setCurrentStep(1);
                  setIsPlaying(false);
                  setAudioControlIndex(0);
                }
              }}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? "FINISH" : "NEXT"}
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
        }}
      >
        <View style={styles.successScreen}>
          {/* Background Image */}
          <Image
            source={require("../../assets/Success.png")}
            style={styles.successBackground}
            resizeMode="cover"
          />

          {/* Content Overlay */}
          <View style={styles.successContent}>
            {/* Raining Stars Animation */}
            {showRainingStars && (
              <View style={styles.rainingStarsContainer} pointerEvents="none">
                {[...Array(50)].map((_, index) => {
                  const startX = Math.random() * 400; // Full screen width spread
                  const endX = startX + (Math.random() * 100 - 50); // Small drift
                  return (
                    <MotiView
                      key={index}
                      from={{
                        translateY: -100,
                        translateX: startX,
                        opacity: 0,
                        rotate: '0deg',
                        scale: 0.8 + Math.random() * 0.4,
                      }}
                      animate={{
                        translateY: 700,
                        translateX: endX,
                        opacity: [0, 1, 1, 0],
                        rotate: '360deg',
                        scale: 0.8 + Math.random() * 0.4,
                      }}
                      transition={{
                        type: 'timing',
                        duration: 2000 + Math.random() * 1500,
                        delay: Math.random() * 500, // Much shorter delay - stars start immediately
                        repeat: Infinity,
                      }}
                      style={styles.rainingStar}
                    >
                      <Text style={styles.rainingStarText}>⭐</Text>
                    </MotiView>
                  );
                })}
              </View>
            )}

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
                if (activeRoutineId) {
                  toggleComplete(activeRoutineId);
                }
                setSuccessModalVisible(false);
                setShowRainingStars(false);
                setActiveRoutineId(null);
              }}
            >
              <Text style={styles.successNextButtonText}>Next</Text>
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  header: { paddingTop: 50, paddingHorizontal: 16 },
  brand: { fontSize: 22, color: "#276a63", fontWeight: "700", fontFamily: "Fredoka_700Bold" },
  brandLogo: { width: 120, height: 30, resizeMode: "contain", marginLeft: -22, marginTop: -20, marginBottom: 12 },
  progressCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: "#B8E6D9",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: { fontWeight: "700", fontSize: 16, color: "#244D4A", fontFamily: "Fredoka_700Bold" },
  progressCount: { color: "#06C08A", fontSize: 16, fontWeight: "600", fontFamily: "Fredoka_600SemiBold" },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#06C08A",
    borderRadius: 4,
  },
  completedSection: {
    paddingHorizontal: 16,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#244D4A',
    fontFamily: 'Fredoka_700Bold',
    paddingLeft: 2,
  },
  seeAllLink: {
    color: '#06C08A',
    fontSize: 18,
    fontFamily: 'Fredoka_600SemiBold',
  },
  completedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  completedItem: {
    width: 73,
    height: 72,
    borderRadius: 14,
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
    resizeMode: 'cover',
    marginTop: 15,
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
    top: 1,
    left: '50%',
    transform: [{ translateX: -24 }],
    flexDirection: 'row',
    zIndex: 10,
  },
  completedStripStar: {
    fontSize: 16,
    verticalAlign: 'center',
  },
  remainingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#244D4A',
    marginBottom: 2,
    fontFamily: 'Fredoka_700Bold',
    paddingLeft: 2,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    marginHorizontal: 2,
    borderWidth: 3,
    borderColor: "#B8E6D9",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },  
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
    minHeight: 280,
  },
  taskCardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#E8FFFA",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholderLarge: {
    width: 160,
    height: 160,
    borderRadius: 18,
    backgroundColor: "#E8FFFA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconDim: {
    opacity: 0.7,
  },
  presetImageSmall: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: "cover",
  },
  presetImageLarge: {
    width: 200,
    height: 180,
    borderRadius: 18,
    resizeMode: "cover",
    marginBottom: 2,
  },
  presetImageDim: {
    opacity: 0.7,
  },
  icon: { fontSize: 28 },
  iconLarge: { fontSize: 70 },
  taskTitle: { fontWeight: "700", color: "#244D4A", fontSize: 20, marginBottom: 1, fontFamily: "Fredoka_700Bold" },
  taskTitleCentered: { 
    fontSize: 22, 
    marginBottom: 1, 
    textAlign: "center",
    letterSpacing: 0.3,
  },
  taskTime: { fontSize: 18, color: "#666", fontFamily: "Fredoka_500Medium" },
  taskTimeCentered: { 
    fontSize: 20, 
    fontWeight: "600",
    color: "#244D4A",
    textAlign: "center",
  },
  taskDays: {
    fontSize: 14,
    color: '#244D4A',
    textAlign: 'center',
    marginTop: 2,
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
    padding: 20,
  },
  taskDialog: {
    width: "100%",
    height: "95%",
    backgroundColor: "#E8FFFA",
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#B8E6D9",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  taskDialogHeader: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  completedModalHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  completedModalTitle: {
    fontSize: 22,
    textAlign: 'center',
    color: '#244D4A',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
    fontFamily: 'Fredoka_700Bold',
  },
  completedModalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#B8E6D9',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  completedModalStars: {
    position: 'absolute',
    top: 10,
    right: 14,
    flexDirection: 'row',
  },
  completedStar: {
    fontSize: 20,
    marginLeft: 6,
  },
  taskDialogContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: -20,
    marginTop: -70,
  },
  taskDialogFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#E8FFFA",
  },
  taskHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 20,
    color: "#244D4A",
    textDecorationLine: "underline",
    fontWeight: "700",
    fontFamily: "Fredoka_700Bold",
  },
  taskContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
    paddingVertical: 100,
    gap: 20,
    marginTop: -100,
  },
  taskBlock: {
    width: "100%",
    flex: 1,
    maxHeight: 220,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#B8E6D9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  taskItem: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  taskImage: {
    width: 250,
    height: 250,
    marginBottom: -65,
  },
  taskBlockLabel: {
    fontSize: 24,
    fontWeight: "700",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: 32,
    fontFamily: "Fredoka_700Bold",
  },
  taskFooter: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  finishButton: {
    backgroundColor: "#2F7D73",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  finishButtonText: {
    fontSize: 20,
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
    // Slightly darkened from 0.06 to 0.12 for better visibility
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 16,
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
    padding: 20,
  },
  playbookDialog: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#2F7C72",
    overflow: "hidden",
  },
  playbookHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 48,
  },
  routineTitleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#2F7C72",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#244D4A",
    fontFamily: "Fredoka_700Bold",
  },
  starsContainer: {
    flexDirection: "row",
    gap: 25,
  },
  star: {
    fontSize: 30,
  },
  playbookContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    alignItems: "center",
  },
  videoCard: {
    width: "100%",
    height: 400,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#2F7C72",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 30,
    position: "relative",
  },
  videoInner: {
    flex: 1,
    padding: 8,
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
    fontSize: 26,
    fontWeight: "700",
    color: "#244D4A",
    marginBottom: 10,
    fontFamily: "Fredoka_700Bold",
  },
  instructionText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: 28,
    fontFamily: "Fredoka_700Bold",
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
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#244D4A",
  },
  backButtonText: {
      fontSize: 20,
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
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#244D4A",
  },
  nextButtonFull: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#244D4A",
  },
  nextButtonText: {
      fontSize: 20,
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
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  starsSuccessContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 30,
    gap: 15,
  },
  starSuccess: {
    fontSize: 60,
  },
  starElevated: {
    marginBottom: 15,
  },
  goodJobText: {
      fontSize: 44,
    fontWeight: "800",
    color: "#244D4A",
    marginBottom: 4,
    letterSpacing: 1,
      fontFamily: "Fredoka_700Bold",
  },
  childNameText: {
      fontSize: 32,
    fontWeight: "600",
    color: "#244D4A",
    marginBottom: 60,
    fontStyle: "italic",
      fontFamily: "Fredoka_600SemiBold",
  },
  successNextButton: {
    paddingVertical: 8,
    paddingHorizontal: 40,
  },
  successNextButtonText: {
      fontSize: 26,
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
      fontSize: 16,
    fontWeight: "600",
    color: "#244D4A",
    letterSpacing: 1,
      fontFamily: "Fredoka_600SemiBold",
  },
  congratulationText: {
      fontSize: 20,
    fontWeight: "800",
    color: "#244D4A",
    letterSpacing: 1,
      fontFamily: "Fredoka_700Bold",
  },
  childNameDone: {
      fontSize: 20,
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
    zIndex: 1,
  },
  rainingStar: {
    position: 'absolute',
    zIndex: 2,
  },
  rainingStarText: {
      fontSize: 22,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});