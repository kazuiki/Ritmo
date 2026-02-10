// app/game2/EatingGame.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// === RESPONSIVE DESIGN SYSTEM ===
// Mobile-first: Use exact original values for mobile, scale for tablets only
const SCREEN_ASPECT_RATIO = SCREEN_WIDTH / SCREEN_HEIGHT;
const IS_TABLET = SCREEN_ASPECT_RATIO > 0.5 && SCREEN_HEIGHT > 800;
const IS_LARGE_TABLET = SCREEN_HEIGHT > 1200;

// Scaling only applies to tablets
const TABLET_SCALE_FACTOR = IS_LARGE_TABLET ? 1.35 : (IS_TABLET ? 1.15 : 1);

// Original mobile values - use exactly as before
const RESPONSIVE_SIZES = {
  // Header - original values
  headerPaddingTop: 40,
  headerMinHeight: 48,
  
  // Child container - CENTERED properly
  childContainerTop: IS_TABLET ? SCREEN_HEIGHT * 0.20 : SCREEN_HEIGHT * 0.321,
  childContainerHeight: IS_TABLET ? SCREEN_HEIGHT * 0.62 : SCREEN_HEIGHT * 0.50,
  childContainerWidth: SCREEN_WIDTH, // 100% width to stay centered
  childContainerLeft: 0, // No left offset - centered naturally
  
  // Plate - scale if tablet
  plateHeight: IS_TABLET ? 280 * TABLET_SCALE_FACTOR : 250,
  plateWidth: IS_TABLET ? 380 * TABLET_SCALE_FACTOR : 350,
  plateBottom: IS_TABLET ? -60 * TABLET_SCALE_FACTOR : -16,
  
  // Plate centering - account for screen being centered
  plateLeftEdge: (SCREEN_WIDTH - (IS_TABLET ? 380 * TABLET_SCALE_FACTOR : 350)) / 2,
  
  // Draggable container - scale if tablet, resting on the PLATE surface
  draggableContainerWidth: IS_TABLET ? 200 * TABLET_SCALE_FACTOR : 200,
  draggableContainerHeight: IS_TABLET ? 150 * TABLET_SCALE_FACTOR : 150,
  draggableContainerBottom: IS_TABLET ? 90 * TABLET_SCALE_FACTOR : 90,
  
  // Food images - PROPERLY CENTERED
  foodImageWidth: IS_TABLET ? 320 * TABLET_SCALE_FACTOR : 320,
  foodImageHeight: IS_TABLET ? 200 * TABLET_SCALE_FACTOR : 200,
  foodImageBottom: IS_TABLET ? 309 * TABLET_SCALE_FACTOR : 309,
  foodImageLeft: SCREEN_WIDTH / 2 - (IS_TABLET ? 320 * TABLET_SCALE_FACTOR / 2 : 160), // Center food
  
  // Celebration - scale if tablet
  celebrationTop: IS_TABLET ? SCREEN_HEIGHT * 0.25 : SCREEN_HEIGHT * 0.33,
  celebrationHeight: SCREEN_HEIGHT * 0.45,
  celebrationScale: IS_LARGE_TABLET ? 1.8 : (IS_TABLET ? 1.9 : 2.1),
};

// PRE-LOAD ALL IMAGES AS CONSTANTS - Prevents glitching and ensures instant loading
const IMAGES = {
  // Background and child states
  eatBG: require('./EatGame/EatBG.png'),
  eat1: require('./EatGame/Eat1.png'),
  eat2: require('./EatGame/Eat2.png'),
  eat3: require('./EatGame/Eat3.gif'),
  eat4: require('./EatGame/Eat4.gif'),
  higop: require('./EatGame/Higop.gif'),
  
  // Food items
  plate: require('./EatGame/Plate.png'),
  rice: require('./EatGame/Rice.png'),
  chicken: require('./EatGame/Chicken.png'),
  vegi: require('./EatGame/Vegi.png'),
  water: require('./EatGame/Water.png'),
  water1: require('./EatGame/Water1.png'),
} as const;

// PRE-LOAD ALL SOUNDS AS CONSTANTS - Ensures instant audio loading without internet
const SOUNDS = {
  nguya: require('./EatGame/Nguya(Updated).mp3'),
  higop: require('./EatGame/Higop.mp3'),
  eat4: require('./EatGame/Eat4.mp3'),
  bgMusic: require('./EatGame/eatGameBG.mp3'),
} as const;

// GLOBAL MUSIC CACHE - Pre-create sound object for INSTANT playback
let cachedBgMusic: Audio.Sound | null = null;
let musicLoadPromise: Promise<Audio.Sound> | null = null;
let assetsPreloaded = false; // Track if assets are already preloaded

// AGGRESSIVE ASSET PRE-CACHING - Load ALL assets when module loads
const preloadAllEatingGameAssets = async () => {
  if (assetsPreloaded) {
    console.log('✅ EatingGame assets already preloaded');
    return;
  }
  
  console.log('🚀 Preloading ALL EatingGame assets at module level...');
  
  try {
    // Get all assets
    const allImageAssets = Object.values(IMAGES);
    const allSoundAssets = Object.values(SOUNDS);
    const allAssets = [...allImageAssets, ...allSoundAssets];
    
    // Download all assets to local storage IMMEDIATELY
    await Asset.loadAsync(allAssets);
    
    await Promise.all(
      allAssets.map(async (asset) => {
        const assetInfo = Asset.fromModule(asset);
        await assetInfo.downloadAsync();
      })
    );
    
    // Prefetch all images for instant rendering
    await Promise.all(
      allImageAssets.map(async (imageAsset) => {
        try {
          const assetInfo = Asset.fromModule(imageAsset);
          if (assetInfo.localUri || assetInfo.uri) {
            await Image.prefetch(assetInfo.localUri || assetInfo.uri);
          }
        } catch (err) {
          console.log('Image prefetch warning:', err);
        }
      })
    );
    
    assetsPreloaded = true;
    console.log('✅ ALL EatingGame assets preloaded and cached permanently');
  } catch (error) {
    console.log('⚠️ Asset preload error:', error);
  }
};

// Start loading music IMMEDIATELY when module loads
const preloadBgMusic = async () => {
  if (!musicLoadPromise) {
    musicLoadPromise = Audio.Sound.createAsync(
      SOUNDS.bgMusic,
      { shouldPlay: false, isLooping: true, volume: 1.0 }
    ).then(({ sound }) => {
      cachedBgMusic = sound;
      console.log('🎵 BG Music pre-cached and ready');
      return sound;
    });
  }
  return musicLoadPromise;
};

// PRELOAD EVERYTHING IMMEDIATELY when module loads
preloadAllEatingGameAssets();
preloadBgMusic();

const EatingGame = () => {
  const [currentStage, setCurrentStage] = useState(0); // 0: Rice, 1: Vegi, 2: Chicken, 3: Water
  const [childMouth, setChildMouth] = useState('closed'); // 'closed', 'open', 'chewing'
  
  // REF for current stage - prevents stale closure in panResponder
  const currentStageRef = useRef(0);
  
  // Sync ref with state on every change
  useEffect(() => {
    currentStageRef.current = currentStage;
    console.log('📍 Stage synced to ref:', currentStage);
  }, [currentStage]);
  
  // Debug log current stage on every render
  console.log('🎮 RENDER - Current Stage:', currentStage, 'Food:', currentStage < 4 ? ['Rice', 'Vegi', 'Chicken', 'Water'][currentStage] : 'Unknown');
  const [isDraggingFood, setIsDraggingFood] = useState(false);
  const [allFoodEaten, setAllFoodEaten] = useState(false);
  const [isWaterReady, setIsWaterReady] = useState(false); // Track if water1 is tapped to become water
  const [isWaterShaking, setIsWaterShaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Eye tracking state
  const [eyeDirection, setEyeDirection] = useState('center'); // 'center', 'left', 'right', 'up', 'down'
  
  // Audio refs for sounds
  const nguyaSound = useRef<Audio.Sound | null>(null);
  const higopSound = useRef<Audio.Sound | null>(null);
  const eat4Sound = useRef<Audio.Sound | null>(null);
  const bgMusic = useRef<Audio.Sound | null>(null);
  const musicInitialized = useRef(false); // Track if music is already playing
  
  // Store audio durations
  const [nguyaDuration, setNguyaDuration] = useState(2000); // default 2s
  const [higopDuration, setHigopDuration] = useState(2000); // default 2s
  const [eat4Duration, setEat4Duration] = useState(5000); // default 5s
  
  const router = useRouter();

  // Food position for dragging
  const foodPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const foodOpacity = useRef(new Animated.Value(1)).current;
  
  // For sliding plates in/out - use separate values for better control
  const currentPlateX = useRef(new Animated.Value(0)).current;
  const nextPlateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Water shake animation
  const waterShakeAnim = useRef(new Animated.Value(0)).current;
  const waterShakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if we're in eating sequence
  const isEatingSequence = useRef(false);

  // Track current food position values
  const foodX = useRef(0);
  const foodY = useRef(0);

  const stages = [
    { id: 0, name: 'Rice', image: IMAGES.rice },
    { id: 1, name: 'Vegi', image: IMAGES.vegi },
    { id: 2, name: 'Chicken', image: IMAGES.chicken },
    { id: 3, name: 'Water', image: IMAGES.water1 }
  ];

  // INSTANT MUSIC PLAYBACK - Use pre-cached sound
  if (!musicInitialized.current) {
    musicInitialized.current = true;
    
    if (cachedBgMusic) {
      // Music already loaded - play INSTANTLY
      cachedBgMusic.playAsync();
      bgMusic.current = cachedBgMusic;
      console.log('🎵 INSTANT PLAY (from cache)');
    } else {
      // Fallback: wait for preload to complete
      preloadBgMusic().then(sound => {
        sound.playAsync();
        bgMusic.current = sound;
        console.log('🎵 PLAY (after preload)');
      }).catch(err => {
        console.log('⚠️ Music error:', err);
      });
    }
  }

  useEffect(() => {
    // Assets are already preloaded at module level - just verify
    if (!assetsPreloaded) {
      console.log('⏳ Waiting for module-level asset preload...');
      preloadAllEatingGameAssets();
    } else {
      console.log('✅ Using pre-cached assets (instant load)');
    }

    // Load sound effects in background
    const loadSoundEffects = async () => {
      try {
        console.log('🔊 Loading sound effects...');
        const [nguyaResult, higopResult, eat4Result] = await Promise.all([
          Audio.Sound.createAsync(SOUNDS.nguya),
          Audio.Sound.createAsync(SOUNDS.higop),
          Audio.Sound.createAsync(SOUNDS.eat4),
        ]);

        nguyaSound.current = nguyaResult.sound;
        higopSound.current = higopResult.sound;
        eat4Sound.current = eat4Result.sound;

        const nguyaStatus = await nguyaResult.sound.getStatusAsync();
        if (nguyaStatus.isLoaded && nguyaStatus.durationMillis) {
          setNguyaDuration(nguyaStatus.durationMillis);
          console.log('✅ Nguya.mp3 loaded -', nguyaStatus.durationMillis, 'ms');
        }

        const higopStatus = await higopResult.sound.getStatusAsync();
        if (higopStatus.isLoaded && higopStatus.durationMillis) {
          setHigopDuration(higopStatus.durationMillis);
          console.log('✅ Higop.mp3 loaded -', higopStatus.durationMillis, 'ms');
        }

        const eat4Status = await eat4Result.sound.getStatusAsync();
        if (eat4Status.isLoaded && eat4Status.durationMillis) {
          setEat4Duration(eat4Status.durationMillis);
          console.log('✅ Eat4.mp3 loaded -', eat4Status.durationMillis, 'ms');
        }

        console.log('✅ Sound effects ready');
      } catch (error) {
        console.log('⚠️ Sound effects error:', error);
      }
    };

    loadSoundEffects();

    // Cleanup sounds on unmount - STOP and unload ALL sounds
    return () => {
      console.log('🛑 Cleaning up EatingGame sounds...');
      
      if (nguyaSound.current) {
        nguyaSound.current.unloadAsync();
      }
      if (higopSound.current) {
        higopSound.current.unloadAsync();
      }
      if (eat4Sound.current) {
        eat4Sound.current.unloadAsync();
      }
      
      // STOP bgMusic when leaving the game
      if (bgMusic.current) {
        bgMusic.current.stopAsync().then(() => {
          console.log('✅ BG Music stopped');
        }).catch(err => {
          console.log('⚠️ Error stopping music:', err);
        });
      }
    };
  }, []);

  // Listen to food position changes and update eye direction
  useEffect(() => {
    const foodXId = foodPosition.x.addListener((value) => {
      foodX.current = value.value;
      updateEyeDirection(value.value, foodY.current);
    });
    const foodYId = foodPosition.y.addListener((value) => {
      foodY.current = value.value;
      updateEyeDirection(foodX.current, value.value);
    });

    return () => {
      foodPosition.x.removeListener(foodXId);
      foodPosition.y.removeListener(foodYId);
    };
  }, []);

  // Update eye direction based on food position
  const updateEyeDirection = (x: number, y: number) => {
    if (!isDraggingFood || childMouth === 'chewing') {
      setEyeDirection('center');
      return;
    }

    // Calculate direction based on food position relative to child
    const threshold = 50;
    
    if (y < -threshold) {
      setEyeDirection('up');
    } else if (y > threshold) {
      setEyeDirection('down');
    } else if (x < -threshold) {
      setEyeDirection('left');
    } else if (x > threshold) {
      setEyeDirection('right');
    } else {
      setEyeDirection('center');
    }
  };

  // Water shake effect when water1 appears
  useEffect(() => {
    if (currentStage === 3 && !isWaterReady) {
      // Start 5-second timer for water shake
      waterShakeTimeout.current = setTimeout(() => {
        setIsWaterShaking(true);
        // Start shake animation
        const shakeAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(waterShakeAnim, {
              toValue: 10,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(waterShakeAnim, {
              toValue: -10,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(waterShakeAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 }
        );
        shakeAnimation.start();
      }, 5000);
    }

    return () => {
      if (waterShakeTimeout.current) {
        clearTimeout(waterShakeTimeout.current);
      }
    };
  }, [currentStage, isWaterReady]);

  // Reset food position and opacity
  const resetFoodState = () => {
    console.log('🔄 RESET FOOD STATE called for stage:', currentStage);
    foodPosition.setValue({ x: 0, y: 0 });
    foodOpacity.setValue(1);
    setChildMouth('closed');
    foodX.current = 0;
    foodY.current = 0;
  };

  // Handle water1 tap to convert to water
  const handleWaterTap = () => {
    if (currentStage === 3 && !isWaterReady) {
      // Clear shake timeout
      if (waterShakeTimeout.current) {
        clearTimeout(waterShakeTimeout.current);
      }
      
      // Stop shake animation
      waterShakeAnim.stopAnimation();
      waterShakeAnim.setValue(0);
      setIsWaterShaking(false);
      
      // Convert to draggable water
      setIsWaterReady(true);
    }
  };

  // Handle child mouth tap to open/close mouth
  const handleChildTap = () => {
    if (!isEatingSequence.current && !allFoodEaten && childMouth !== 'chewing') {
      // Toggle between closed and open mouth immediately
      const newMouthState = childMouth === 'closed' ? 'open' : 'closed';
      console.log('Mouth tap:', childMouth, '→', newMouthState);
      setChildMouth(newMouthState);
    }
  };

  // Detect if food is near the child's mouth (Eat1 position)
  const isNearMouth = (x: number, y: number) => {
    return y < -100;
  };

  const handleFoodEaten = () => {
    if (isEatingSequence.current) return;
    isEatingSequence.current = true;

    // CRITICAL FIX: Use REF to get CURRENT stage (prevents stale closure)
    const actualStage = currentStageRef.current;
    const currentFood = stages[actualStage];
    const isWaterFood = currentFood.name === 'Water';

    console.log('🍽️ HANDLE FOOD EATEN - REF Stage:', actualStage, 'Food:', currentFood.name, 'Is Water?', isWaterFood);

    // First show open mouth (eat2.png)
    setChildMouth('open');

    // Food disappears
    Animated.timing(foodOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // After food disappears, start chewing animation
      setTimeout(() => {
        setChildMouth('chewing');
        
        // Stop all sounds first
        if (nguyaSound.current) {
          nguyaSound.current.stopAsync().catch(() => {});
        }
        if (higopSound.current) {
          higopSound.current.stopAsync().catch(() => {});
        }
        
        // Play appropriate sound based on CURRENT FOOD TYPE (not future stage)
        let chewingDuration = 2000; // default
        
        console.log('====== SOUND SELECTION DEBUG ======');
        console.log('Current Food:', currentFood.name);
        console.log('Is Water?', isWaterFood);
        console.log('nguyaSound loaded?', nguyaSound.current !== null);
        console.log('higopSound loaded?', higopSound.current !== null);
        console.log('===================================');
        
        if (isWaterFood) {
          // Water food - play higop sound ONLY
          console.log('🚰 WATER FOOD - Playing Higop.mp3');
          if (higopSound.current) {
            higopSound.current.setPositionAsync(0)
              .then(() => higopSound.current?.playAsync())
              .then(() => {
                console.log('✅ Higop.mp3 IS NOW PLAYING!');
              })
              .catch(error => {
                console.log('❌ Higop error:', error);
              });
            chewingDuration = higopDuration;
            console.log('⏱️ Using higopDuration:', higopDuration, 'ms');
          } else {
            console.log('❌ ERROR: higopSound not loaded!');
            chewingDuration = 2000;
          }
        } else {
          // Food items (rice, vegi, chicken) - play nguya sound ONLY
          console.log('🍚 FOOD ITEM', currentFood.name, '- Playing Nguya.mp3');
          if (nguyaSound.current) {
            nguyaSound.current.setPositionAsync(0)
              .then(() => nguyaSound.current?.playAsync())
              .then(() => {
                console.log('✅ Nguya.mp3 IS NOW PLAYING!');
              })
              .catch(error => {
                console.log('❌ Nguya error:', error);
              });
            chewingDuration = nguyaDuration;
            console.log('⏱️ Using nguyaDuration:', nguyaDuration, 'ms');
          } else {
            console.log('❌ ERROR: nguyaSound not loaded!');
            chewingDuration = 2000;
          }
        }
        
        // After chewing, slide plate out and bring next food
        // Use the actual audio duration for timing
        setTimeout(() => {
          setChildMouth('closed');
          
          // Use callback to get the latest currentStage value
          setCurrentStage(prevStage => {
            const nextStage = prevStage + 1;
            currentStageRef.current = nextStage; // UPDATE REF!
            console.log('=== STAGE PROGRESSION (FIXED) ===');
            console.log('FROM Stage:', prevStage, '(', stages[prevStage].name, ')');
            console.log('TO Stage:', nextStage, nextStage < stages.length ? '(' + stages[nextStage].name + ')' : '(COMPLETE)');
            console.log('===============================');
            
            if (nextStage < stages.length) {
              // Slide current plate out to the left
              Animated.timing(currentPlateX, {
                toValue: -SCREEN_WIDTH,
                duration: 600,
                useNativeDriver: true,
              }).start(() => {
                resetFoodState();
                
                // Position new plate from right side
                currentPlateX.setValue(SCREEN_WIDTH);
                
                // Slide new plate in from right
                Animated.timing(currentPlateX, {
                  toValue: 0,
                  duration: 600,
                  useNativeDriver: true,
                }).start(() => {
                  isEatingSequence.current = false;
                });
              });
              
              return nextStage; // Return the new stage
            } else {
              // All food eaten - show celebration
              console.log('🎉 ALL FOOD EATEN - Starting celebration');
              setAllFoodEaten(true);
              setShowCelebration(true);
              isEatingSequence.current = false;
              
              // Stop background music
              if (bgMusic.current) {
                bgMusic.current.stopAsync().catch(error => {
                  console.log('Error stopping bg music:', error);
                });
              }
              
              // Play eat4 celebration sound and track completion
              if (eat4Sound.current) {
                eat4Sound.current.setOnPlaybackStatusUpdate((status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    // Celebration sound finished - save completion and navigate
                    AsyncStorage.setItem('@minigameCompleted', 'true')
                      .catch((error) => console.error('Error setting completion flag:', error))
                      .finally(() => {
                        console.log('✅ Celebration complete - navigating back');
                        if (router.canGoBack()) {
                          router.back();
                        }
                      });
                  }
                });
                
                eat4Sound.current.setPositionAsync(0);
                eat4Sound.current.playAsync().then(() => {
                  console.log('🎵 Celebration sound playing');
                }).catch(error => {
                  console.log('Error playing eat4 sound:', error);
                  // Fallback: navigate after 5 seconds if sound fails
                  setTimeout(() => {
                    AsyncStorage.setItem('@minigameCompleted', 'true')
                      .finally(() => {
                        if (router.canGoBack()) {
                          router.back();
                        }
                      });
                  }, 5000);
                });
              } else {
                // No sound - navigate after 5 seconds
                setTimeout(() => {
                  AsyncStorage.setItem('@minigameCompleted', 'true')
                    .finally(() => {
                      if (router.canGoBack()) {
                        router.back();
                      }
                    });
                }, 5000);
              }
              
              return prevStage; // Keep current stage if complete
            }
          });
        }, chewingDuration); // Use dynamic chewing duration based on audio
      }, 500); // Show open mouth for 0.5 seconds before chewing
    });
  };

  // Pan responder for draggable food
  const dragOffset = useRef({ x: 0, y: 0 });
  const foodPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // Only allow dragging if not in eating sequence, not all food eaten, 
        // and if water stage, only when water is ready
        return !isEatingSequence.current && !allFoodEaten && 
               (currentStage !== 3 || isWaterReady);
      },
      onMoveShouldSetPanResponder: () => {
        return !isEatingSequence.current && !allFoodEaten && 
               (currentStage !== 3 || isWaterReady);
      },
      onPanResponderGrant: () => {
        setIsDraggingFood(true);
        dragOffset.current = {
          x: foodX.current,
          y: foodY.current
        };
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = dragOffset.current.x + gestureState.dx;
        const newY = dragOffset.current.y + gestureState.dy;

        foodPosition.setValue({ x: newX, y: newY });

        if (isNearMouth(newX, newY)) {
          if (childMouth === 'closed') setChildMouth('open');
        } else {
          if (childMouth === 'open') setChildMouth('closed');
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDraggingFood(false);
        setEyeDirection('center'); // Reset eyes to center when drag ends
        const finalX = dragOffset.current.x + gestureState.dx;
        const finalY = dragOffset.current.y + gestureState.dy;

        if (isNearMouth(finalX, finalY)) {
          handleFoodEaten();
        } else {
          setChildMouth('closed');
          Animated.spring(foodPosition, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getChildImage = () => {
    if (childMouth === 'chewing') {
      // Use Higop.gif for water, Eat3.gif for food
      if (currentStage === 3) {
        return IMAGES.higop;
      }
      return IMAGES.eat3;
    }
    if (childMouth === 'open') return IMAGES.eat2;
    return IMAGES.eat1;
  };

  // Get eye tracking style for eat1 image
  const getEyeTrackingStyle = () => {
    if (childMouth !== 'closed' || !isDraggingFood) return {};
    
    switch (eyeDirection) {
      case 'left':
        return { transform: [{ translateX: -5 }] };
      case 'right':
        return { transform: [{ translateX: 5 }] };
      case 'up':
        return { transform: [{ translateY: -3 }] };
      case 'down':
        return { transform: [{ translateY: 3 }] };
      default:
        return {};
    }
  };

  const getCurrentFoodImage = () => {
    if (currentStage === 3) {
      // Water stage - show Water1.png initially, Water.png when ready
      return isWaterReady ? IMAGES.water : IMAGES.water1;
    }
    return stages[currentStage].image;
  };

  const getFoodStyle = () => {
    switch(currentStage) {
      case 0: return styles.riceImage;
      case 1: return styles.vegiImage;
      case 2: return styles.chickenImage;
      case 3: return styles.waterImage;
      default: return styles.riceImage;
    }
  };

  const getDraggableContainerStyle = () => {
    switch(currentStage) {
      case 0: return styles.draggableRiceContainer;
      case 1: return styles.draggableVegiContainer;
      case 2: return styles.draggableChickenContainer;
      case 3: return styles.draggableWaterContainer;
      default: return styles.draggableRiceContainer;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#D0FFA3' }]}>
      <Image 
        source={IMAGES.eatBG} 
        style={styles.background} 
        fadeDuration={0}
        resizeMode="stretch"
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) {
            router.back();
          }
        }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Child image - single source based on state */}
      {!showCelebration && (
        <TouchableOpacity 
          onPress={handleChildTap}
          style={[
            styles.childContainer,
            // Move child closer when chewing
            childMouth === 'chewing' ? styles.childContainerChewing : {}
          ]}
          activeOpacity={1} // Prevent opacity change on press
        >
          <Image 
            key={`child-${childMouth}-${currentStage}`}
            source={getChildImage()} 
            style={[
              styles.child,
              // Ensure eat3.gif has same dimensions as eat1/eat2
              childMouth === 'chewing' ? { resizeMode: 'contain', transform: [{ scale: IS_TABLET ? 0.8 : 1 }] } : {},
              // Add eye tracking movement
              getEyeTrackingStyle()
            ]} 
            fadeDuration={0}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {/* Current plate */}
      {!allFoodEaten && (
        <Animated.View
          style={[
            styles.plateContainer,
            { transform: [{ translateX: currentPlateX }] }
          ]}
        >
          {/* Only show plate if not water stage */}
          {currentStage !== 3 && (
            <Image 
              source={IMAGES.plate} 
              style={styles.plate} 
              fadeDuration={0}
              resizeMode="contain"
            />
          )}
          <Animated.View
            style={[
              getDraggableContainerStyle(),
              {
                opacity: foodOpacity,
                transform: [
                  { translateX: foodPosition.x },
                  { translateY: foodPosition.y },
                  // Add shake animation for water1
                  ...(currentStage === 3 && !isWaterReady && isWaterShaking 
                    ? [{ translateX: waterShakeAnim }] 
                    : [])
                ]
              }
            ]}
            {...(currentStage === 3 && !isWaterReady 
              ? {} // No pan responder for water1, only tap
              : foodPanResponder.panHandlers)}
          >
            {currentStage === 3 && !isWaterReady ? (
              <TouchableOpacity onPress={handleWaterTap} style={styles.waterTouchable}>
                <Image
                  key={`food-${currentStage}-${isWaterReady}`}
                  source={getCurrentFoodImage()}
                  style={getFoodStyle()}
                  fadeDuration={0}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : (
              <Image
                key={`food-${currentStage}-${isWaterReady}`}
                source={getCurrentFoodImage()}
                style={getFoodStyle()}
                fadeDuration={0}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </Animated.View>
      )}

      {/* Next plate (prepared off-screen) - only show if not last stage */}
      {currentStage < stages.length - 1 && !allFoodEaten && (
        <Animated.View
          style={[
            styles.plateContainer,
            { transform: [{ translateX: nextPlateX }] }
          ]}
        >
          {/* Only show plate if next stage is not water */}
          {currentStage + 1 !== 3 && (
            <Image 
              source={IMAGES.plate} 
              style={styles.plate} 
              fadeDuration={0}
              resizeMode="contain"
            />
          )}
          <View style={
            currentStage === 0 ? styles.draggableVegiContainer : 
            currentStage === 1 ? styles.draggableChickenContainer : 
            currentStage === 2 ? styles.draggableWaterContainer : styles.draggableRiceContainer
          }>
            <Image
              key={`next-food-${currentStage + 1}`}
              source={stages[currentStage + 1].image}
              style={
                currentStage === 0 ? styles.vegiImage : 
                currentStage === 1 ? styles.chickenImage : 
                currentStage === 2 ? styles.waterImage : styles.riceImage
              }
              fadeDuration={0}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      )}

      {/* Celebration GIF */}
      {showCelebration && (
        <View style={styles.celebrationContainer}>
          <Image 
            key="celebration"
            source={IMAGES.eat4} 
            style={styles.celebrationGif} 
            fadeDuration={0}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Completion message */}
      {allFoodEaten && !showCelebration && (
        <View style={styles.completionContainer}>
          <Text style={styles.completionText}>All food eaten! Great job! 🎉</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  background: { 
    position: 'absolute', 
    width: '100%', 
    height: '100%'
  },
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    paddingTop: RESPONSIVE_SIZES.headerPaddingTop, 
    paddingHorizontal: 16, 
    paddingBottom: 8, 
    minHeight: RESPONSIVE_SIZES.headerMinHeight, 
    zIndex: 10 
  },
  backText: { 
    fontSize: Math.max(16, SCREEN_WIDTH * 0.045), 
    color: '#244D4A', 
    textDecorationLine: 'underline', 
    fontWeight: '700', 
    fontFamily: 'Fredoka_700Bold' 
  },
  childContainer: {
    position: 'absolute', 
    top: RESPONSIVE_SIZES.childContainerTop, 
    left: RESPONSIVE_SIZES.childContainerLeft, 
    width: RESPONSIVE_SIZES.childContainerWidth, 
    height: RESPONSIVE_SIZES.childContainerHeight,
    zIndex: 1,
  },
  childContainerChewing: {
    position: 'absolute', 
    top: RESPONSIVE_SIZES.childContainerTop,
    left: RESPONSIVE_SIZES.childContainerLeft,
    width: RESPONSIVE_SIZES.childContainerWidth,
    height: RESPONSIVE_SIZES.childContainerHeight,
    transform: [{ scale: IS_TABLET ? 2.2 : 2.0 }],
    zIndex: 1,
  },
  child: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain',
    opacity: 1,
  },
  plateContainer: { 
    position: 'absolute',
    bottom: Math.max(RESPONSIVE_SIZES.plateBottom, -20),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: RESPONSIVE_SIZES.plateHeight,
    zIndex: 2,
  },
  plate: { 
    position: 'absolute', 
    width: RESPONSIVE_SIZES.plateWidth, 
    height: RESPONSIVE_SIZES.plateHeight, 
    resizeMode: 'contain' 
  },
  draggableRiceContainer: { 
    position: 'absolute', 
    bottom: IS_TABLET ? RESPONSIVE_SIZES.draggableContainerBottom - (5 * TABLET_SCALE_FACTOR) : RESPONSIVE_SIZES.draggableContainerBottom - 15,
    left: IS_TABLET ? RESPONSIVE_SIZES.plateLeftEdge + (RESPONSIVE_SIZES.plateWidth - RESPONSIVE_SIZES.draggableContainerWidth) / 2 + 22 : RESPONSIVE_SIZES.plateWidth * 0.314,
    width: RESPONSIVE_SIZES.draggableContainerWidth, 
    height: RESPONSIVE_SIZES.draggableContainerHeight, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20
  },
  draggableChickenContainer: { 
    position: 'absolute', 
    bottom: IS_TABLET ? RESPONSIVE_SIZES.draggableContainerBottom : RESPONSIVE_SIZES.draggableContainerBottom - 15, 
    left: RESPONSIVE_SIZES.plateLeftEdge + RESPONSIVE_SIZES.plateWidth - RESPONSIVE_SIZES.draggableContainerWidth - (IS_TABLET ? 110 : 70),
    width: RESPONSIVE_SIZES.draggableContainerWidth, 
    height: RESPONSIVE_SIZES.draggableContainerHeight, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20
  },
  draggableVegiContainer: { 
    position: 'absolute', 
    bottom: IS_TABLET ? RESPONSIVE_SIZES.draggableContainerBottom - (-15 * TABLET_SCALE_FACTOR) : RESPONSIVE_SIZES.draggableContainerBottom, 
    left: IS_TABLET ? RESPONSIVE_SIZES.plateLeftEdge + (RESPONSIVE_SIZES.plateWidth - RESPONSIVE_SIZES.draggableContainerWidth) / 2 + 50 : RESPONSIVE_SIZES.plateWidth - RESPONSIVE_SIZES.draggableContainerWidth - 30,
    width: RESPONSIVE_SIZES.draggableContainerWidth, 
    height: RESPONSIVE_SIZES.draggableContainerHeight, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20
  },
  riceImage: { 
    width: RESPONSIVE_SIZES.foodImageWidth, 
    height: RESPONSIVE_SIZES.foodImageHeight, 
    resizeMode: 'contain' 
  },
  chickenImage: { 
    width: RESPONSIVE_SIZES.foodImageWidth, 
    height: RESPONSIVE_SIZES.foodImageHeight, 
    resizeMode: 'contain' 
  },
  vegiImage: { 
    width: RESPONSIVE_SIZES.foodImageWidth, 
    height: RESPONSIVE_SIZES.foodImageHeight, 
    resizeMode: 'contain' 
  },
  draggableWaterContainer: { 
    position: 'absolute', 
    bottom: RESPONSIVE_SIZES.draggableContainerBottom,
    left: IS_TABLET ? RESPONSIVE_SIZES.plateLeftEdge + (RESPONSIVE_SIZES.plateWidth - RESPONSIVE_SIZES.draggableContainerWidth) / 2 : RESPONSIVE_SIZES.plateWidth - RESPONSIVE_SIZES.draggableContainerWidth - 30,
    width: RESPONSIVE_SIZES.draggableContainerWidth, 
    height: RESPONSIVE_SIZES.draggableContainerHeight, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20
  },
  waterImage: { 
    width: RESPONSIVE_SIZES.foodImageWidth, 
    height: RESPONSIVE_SIZES.foodImageHeight, 
    resizeMode: 'contain' 
  },
  waterTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationContainer: {
    position: 'absolute',
    top: RESPONSIVE_SIZES.celebrationTop,
    left: RESPONSIVE_SIZES.childContainerLeft,
    width: RESPONSIVE_SIZES.childContainerWidth,
    height: RESPONSIVE_SIZES.celebrationHeight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  celebrationGif: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    transform: [{ scale: RESPONSIVE_SIZES.celebrationScale * (IS_TABLET ? 1.08 : 0.99) }],
  },
  completionContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: Math.max(15, SCREEN_WIDTH * 0.04),
    borderRadius: Math.max(10, SCREEN_WIDTH * 0.03),
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionText: {
    fontSize: Math.max(18, SCREEN_WIDTH * 0.06),
    color: '#244D4A',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EatingGame;