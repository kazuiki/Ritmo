// app/game3/BathGame.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const DIRT_SIZE = Math.max(35, SCREEN_WIDTH * (IS_TABLET ? 0.085 : 0.06));

export default function BathGame() {
  const toolsBarLeft = SCREEN_WIDTH * 0.1;
  const toolsBarWidth = SCREEN_WIDTH * 0.8;
  const toolsBarTop = Math.max(125, SCREEN_HEIGHT * 0.15);
  const toolsBarHeight = Math.max(70, SCREEN_HEIGHT * 0.1);
  const toolSize = Math.max(72, SCREEN_HEIGHT * 0.09);
  const borderWidth = 3; 

  const innerTop = toolsBarTop + borderWidth;
  const innerHeight = toolsBarHeight - (borderWidth * 2);
  const toolVerticalCenter = innerTop + (innerHeight - toolSize) / 2 - 13; 

  const innerLeft = toolsBarLeft + borderWidth - 12; 
  const innerWidth = toolsBarWidth - (borderWidth * 2);

  const toolSpacing = innerWidth / 3;

  const toolOffsetX = 8;
  const toolOffsetY = 10;
  
  const soapInitialX = innerLeft + (toolSpacing / 2) - (toolSize / 2) + toolOffsetX;
  const soapInitialY = toolVerticalCenter + toolOffsetY;

  const showerInitialX = innerLeft + (toolSpacing * 1.5) - (toolSize / 2) + toolOffsetX;
  const showerInitialY = toolVerticalCenter + toolOffsetY;

  const towelInitialX = innerLeft + (toolSpacing * 2.5) - (toolSize / 2) + toolOffsetX;
  const towelInitialY = toolVerticalCenter + toolOffsetY;

  const soapX = useRef(new Animated.Value(0)).current;
  const soapY = useRef(new Animated.Value(0)).current;

  const showerX = useRef(new Animated.Value(0)).current;
  const showerY = useRef(new Animated.Value(0)).current;

  const towelX = useRef(new Animated.Value(0)).current;
  const towelY = useRef(new Animated.Value(0)).current;

  const [dirtOpacities, setDirtOpacities] = useState([1, 1, 1, 1, 1, 1]);
  const [waterOpacities, setWaterOpacities] = useState([0, 0, 0, 0, 0, 0]);
  const [latherOpacities, setLatherOpacities] = useState([0, 0, 0, 0, 0, 0]);
  const [washOpacities, setWashOpacities] = useState([0, 0, 0, 0, 0, 0]);

  // Animated values for smooth transitions
  const dirtAnimations = useRef([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new Animated.Value(1))).current;
  const waterAnimations = useRef([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new Animated.Value(0))).current;
  const latherAnimations = useRef([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new Animated.Value(0))).current;
  const washAnimations = useRef([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(() => new Animated.Value(0))).current;

  // Pulse animations for each tool
  const soapPulseAnim = useRef(new Animated.Value(1)).current;
  const showerPulseAnim = useRef(new Animated.Value(1)).current;
  const towelPulseAnim = useRef(new Animated.Value(1)).current;

  // Track active pulse animations
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Bath2 success state and animations
  const [bath2Triggered, setBath2Triggered] = useState(false);
  const [bath2Completed, setBath2Completed] = useState(false);
  const [showBath5Gif, setShowBath5Gif] = useState(false);
  const bath1Opacity = useRef(new Animated.Value(1)).current;
  const bath2Opacity = useRef(new Animated.Value(0)).current;
  const bath3Opacity = useRef(new Animated.Value(0)).current;
  const bath4Opacity = useRef(new Animated.Value(0)).current;
  const bath5Opacity = useRef(new Animated.Value(0)).current;
  const bath5GifOpacity = useRef(new Animated.Value(0)).current;
  const bath2SoundRef = useRef<Audio.Sound | null>(null);
  const bgSoundRef = useRef<Audio.Sound | null>(null);
  const soapSoundRef = useRef<Audio.Sound | null>(null);
  const showerSoundRef = useRef<Audio.Sound | null>(null);
  const towelSoundRef = useRef<Audio.Sound | null>(null);
  
  // Victory transition animation
  const victoryScale = useRef(new Animated.Value(1)).current;
  const victoryOpacity = useRef(new Animated.Value(0)).current;

  // Dirt positions (from the JSX)
  const dirtPositions = [
    { left: SCREEN_WIDTH * 0.38, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.38 }, // Dirt 1
    { left: SCREEN_WIDTH * 0.50, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.42 }, // Dirt 2
    { left: SCREEN_WIDTH * 0.42, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.48 }, // Dirt 3
    { left: SCREEN_WIDTH * 0.48, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.52 }, // Dirt 4
    { left: SCREEN_WIDTH * 0.38, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.60 }, // Dirt 5
    { left: SCREEN_WIDTH * 0.52, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.64 }, // Dirt 6
    { left: SCREEN_WIDTH * 0.42, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.30 }, // Dirt 7
    { left: SCREEN_WIDTH * 0.56, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.36 }, // Dirt 8
    { left: SCREEN_WIDTH * 0.42, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.64 }, // Dirt 9
    { left: SCREEN_WIDTH * 0.54, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.48 }, // Dirt 10
    { left: SCREEN_WIDTH * 0.44, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.56 }, // Dirt 11 
    { left: SCREEN_WIDTH * 0.55, top: SCREEN_HEIGHT * 0.24 + SCREEN_HEIGHT * 0.58 }, // Dirt 12
  ];
  const dirtSize = DIRT_SIZE;

  // Check collision between tool and dirt/lather/wash areas
  const checkCollision = (toolX: number, toolY: number, dirtIndex: number): string | null => {
    const dirtLeft = dirtPositions[dirtIndex].left;
    const dirtTop = dirtPositions[dirtIndex].top;
    const dirtRight = dirtLeft + dirtSize;
    const dirtBottom = dirtTop + dirtSize;
    
    const toolLeft = toolX;
    const toolRight = toolX + toolSize; // draggableTool size
    const toolTop = toolY;
    const toolBottom = toolY + toolSize;

    // Check if tool overlaps with dirt area  
    if (!(toolRight < dirtLeft || toolLeft > dirtRight || toolBottom < dirtTop || toolTop > dirtBottom)) {
      return 'collision';
    }
    return null;
  };

  // Handle tool movement and collision detection
  const soapX_value = useRef(0);
  const soapY_value = useRef(0);
  const showerX_value = useRef(0);
  const showerY_value = useRef(0);
  const towelX_value = useRef(0);
  const towelY_value = useRef(0);

  // Track which dirt areas have been cleaned by which tool to prevent repeated animations
  const cleaningStateRef = useRef({
    showerWetted: [false, false, false, false, false, false, false, false, false, false, false, false],
    soapCleaned: [false, false, false, false, false, false, false, false, false, false, false, false],
    showerRinsed: [false, false, false, false, false, false, false, false, false, false, false, false],
    towelDried: [false, false, false, false, false, false, false, false, false, false, false, false],
  });

  // Track if a tool is currently being dragged
  const isDraggingRef = useRef<string | null>(null);

  // Track active animations to prevent overlapping animations
  const activeAnimationsRef = useRef<{[key: string]: boolean}>({});

  // Track if a pulse animation is currently running
  const isPulsingRef = useRef<boolean>(false);

  // Track if Bath2 transition is complete (Bath2.png fully replaced Bath1.png)
  const bath2TransitionCompleteRef = useRef<boolean>(false);

  // Track if Bath3 transition is complete (Bath3.png fully replaced Bath2.png)
  const bath3TransitionCompleteRef = useRef<boolean>(false);

  // Track if Bath4 transition is complete (Bath4.png fully replaced Bath3.png)
  const bath4TransitionCompleteRef = useRef<boolean>(false);

  // Function to pulse a specific tool
  const pulseTool = (toolType: string) => {
    // Stop any existing pulse animation
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }

    // Reset all pulse animations
    soapPulseAnim.setValue(1);
    showerPulseAnim.setValue(1);
    towelPulseAnim.setValue(1);

    // Start pulse animation for the specified tool
    const targetAnim = toolType === 'soap' ? soapPulseAnim : 
                      toolType === 'shower' ? showerPulseAnim : 
                      towelPulseAnim;
    
    isPulsingRef.current = true;
    
    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(targetAnim, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(targetAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );
    
    pulseAnimationRef.current.start(() => {
      isPulsingRef.current = false;
      pulseAnimationRef.current = null;
    });
  };

  // Function to stop all pulse animations
  const stopPulse = () => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }
    isPulsingRef.current = false;
    
    // Reset all pulse animations to default scale
    Animated.timing(soapPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
    
    Animated.timing(showerPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
    
    Animated.timing(towelPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  // Listen to animated value changes - track positions and check collisions during drag
  useEffect(() => {
    const soapXListener = soapX.addListener(({ value }) => {
      soapX_value.current = value;
      if (isDraggingRef.current === 'soap') {
        checkToolCollisions('soap', soapInitialX + soapX_value.current, soapInitialY + soapY_value.current);
      }
    });
    const soapYListener = soapY.addListener(({ value }) => {
      soapY_value.current = value;
      if (isDraggingRef.current === 'soap') {
        checkToolCollisions('soap', soapInitialX + soapX_value.current, soapInitialY + soapY_value.current);
      }
    });
    const showerXListener = showerX.addListener(({ value }) => {
      showerX_value.current = value;      if (isDraggingRef.current === 'shower') {
        checkToolCollisions('shower', showerInitialX + showerX_value.current, showerInitialY + showerY_value.current);
      }
    });
    const showerYListener = showerY.addListener(({ value }) => {
      showerY_value.current = value;
      if (isDraggingRef.current === 'shower') {
        checkToolCollisions('shower', showerInitialX + showerX_value.current, showerInitialY + showerY_value.current);
      }
    });
    const towelXListener = towelX.addListener(({ value }) => {
      towelX_value.current = value;
      if (isDraggingRef.current === 'towel') {
        checkToolCollisions('towel', towelInitialX + towelX_value.current, towelInitialY + towelY_value.current);
      }
    });
    const towelYListener = towelY.addListener(({ value }) => {
      towelY_value.current = value;
      if (isDraggingRef.current === 'towel') {
        checkToolCollisions('towel', towelInitialX + towelX_value.current, towelInitialY + towelY_value.current);
      }
    });

    return () => {
      soapX.removeListener(soapXListener);
      soapY.removeListener(soapYListener);
      showerX.removeListener(showerXListener);
      showerY.removeListener(showerYListener);
      towelX.removeListener(towelXListener);
      towelY.removeListener(towelYListener);
    };
  }, []);

  const checkToolCollisions = (toolType: string, toolX: number, toolY: number) => {
    // Stop collision detection once Bath5_anim.gif is triggered to prevent interference with drag state
    if (bath2Triggered) {
      return;
    }
    
    const state = cleaningStateRef.current;
    let shouldPulseTool = false;
    let toolToPulse = '';
    let hasAnyCollision = false;

    const playOneShot = (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
      const s = soundRef.current;
      if (!s) return;
      s.setPositionAsync(0).then(() => s.playAsync().catch(() => {})).catch(() => {});
    };

    // Check if all areas have been showered (wetted)
    const allAreasWetted = state.showerWetted.every(wetted => wetted === true);
    
    // Check if all areas have been soaped (cleaned with lather)
    const allAreasSoaped = state.soapCleaned.every(cleaned => cleaned === true);
    
    // Check if all lathers have been rinsed (for towel pulsing)
    const allLathersRinsed = state.soapCleaned.every((cleaned, i) => {
      if (!cleaned) return false; // Has unclean dirts
      return state.showerRinsed[i]; // Check if rinsed
    });

    // Check each dirt area
    for (let i = 0; i < 12; i++) {
      if (checkCollision(toolX, toolY, i)) {
        hasAnyCollision = true;
        
        // Determine the current state of this dirt area
        const hasNotBeenWetted = !state.showerWetted[i];
        const hasDirtAndWater = state.showerWetted[i] && !state.soapCleaned[i];
        const hasLather = state.soapCleaned[i] && !state.showerRinsed[i];
        const hasWash = state.showerRinsed[i] && !state.towelDried[i];

        // Determine correct tool for current state
        let correctTool = '';
        if (hasNotBeenWetted) {
          // First step: must shower to wet the child
          correctTool = 'shower';
        } else if (hasDirtAndWater) {
          // Second step: apply soap to dirt+water to create lather
          correctTool = 'soap';
        } else if (hasLather) {
          // Third step: shower to rinse lather into wash
          correctTool = 'shower';
        } else if (hasWash) {
          // Fourth step: towel to dry
          correctTool = 'towel';
        }

        // Check if wrong tool is being used
        if (correctTool && toolType !== correctTool) {
          // Special condition for soap: only pulse if Bath2 transition is complete
          if (correctTool === 'soap' && !bath2TransitionCompleteRef.current) {
            // Don't pulse soap yet - Bath2.png hasn't fully replaced Bath1.png
            continue;
          }
          // Special condition for shower (rinse step): only pulse if Bath3 transition is complete
          if (correctTool === 'shower' && hasLather && !bath3TransitionCompleteRef.current) {
            // Don't pulse shower yet - Bath3.png hasn't fully replaced Bath2.png
            continue;
          }
          // Special condition for towel: only pulse if Bath4 transition is complete
          if (correctTool === 'towel' && !bath4TransitionCompleteRef.current) {
            // Don't pulse towel yet - Bath4.png hasn't fully replaced Bath3.png
            continue;
          }
          shouldPulseTool = true;
          toolToPulse = correctTool;
          break;
        }

        // Only do cleaning animation if this is the correct tool and not already animated
        const collisionId = `${toolType}_${i}`;
        
        // Skip if already cleaning this spot
        if (activeAnimationsRef.current[collisionId]) continue;

        // Mark animation as active
        activeAnimationsRef.current[collisionId] = true;

        // Shower wets the child (first step) - no water overlays, just progress
        if (toolType === 'shower' && !state.showerWetted[i] && hasNotBeenWetted) {
          playOneShot(showerSoundRef);
          state.showerWetted[i] = true;

          // Animate water progress (kept for logic), and cross-fade Bath1 -> Bath2
          Animated.timing(waterAnimations[i], {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }).start(() => {
            delete activeAnimationsRef.current[collisionId];
          });

          const wettedCount = state.showerWetted.filter(Boolean).length;
          const progress = wettedCount / state.showerWetted.length;

          Animated.parallel([
            Animated.timing(bath1Opacity, {
              toValue: 1 - progress,
              duration: 400,
              useNativeDriver: false,
            }),
            Animated.timing(bath2Opacity, {
              toValue: progress,
              duration: 400,
              useNativeDriver: false,
            })
          ]).start(() => {
            // Check if Bath2 transition is complete (opacity reached 1)
            if (progress >= 1) {
              bath2TransitionCompleteRef.current = true;
            }
          });
        }

        // Soap cleans dirts+water and creates lathers
        if (toolType === 'soap' && !state.soapCleaned[i] && hasDirtAndWater) {
          playOneShot(soapSoundRef);
          state.soapCleaned[i] = true;
          
          // Animate dirt+water opacity down and lather opacity up
          Animated.parallel([
            Animated.timing(dirtAnimations[i], {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(waterAnimations[i], {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(latherAnimations[i], {
              toValue: 1,
              duration: 2000,
              useNativeDriver: false,
            })
          ]).start(() => {
            delete activeAnimationsRef.current[collisionId];
          });

          // Cross-fade Bath2 -> Bath3 as soap cleans areas
          const soapedCount = state.soapCleaned.filter(Boolean).length;
          const progress = soapedCount / state.soapCleaned.length;

          Animated.parallel([
            Animated.timing(bath2Opacity, {
              toValue: 1 - progress,
              duration: 400,
              useNativeDriver: false,
            }),
            Animated.timing(bath3Opacity, {
              toValue: progress,
              duration: 400,
              useNativeDriver: false,
            })
          ]).start(() => {
            // Check if Bath3 transition is complete (opacity reached 1)
            if (progress >= 1) {
              bath3TransitionCompleteRef.current = true;
            }
          });
        }

        // Shower rinses lathers and reveals wash (second shower use)
        if (toolType === 'shower' && !state.showerRinsed[i] && state.soapCleaned[i] && hasLather) {
          playOneShot(showerSoundRef);
          state.showerRinsed[i] = true;
          
          // Animate lather opacity down and wash opacity up
          Animated.parallel([
            Animated.timing(latherAnimations[i], {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(washAnimations[i], {
              toValue: 1,
              duration: 2000,
              useNativeDriver: false,
            })
          ]).start(() => {
            delete activeAnimationsRef.current[collisionId];
          });

          // Cross-fade Bath3 -> Bath4 as shower rinses areas
          const rinsedCount = state.showerRinsed.filter(Boolean).length;
          const progress = rinsedCount / state.showerRinsed.length;

          Animated.parallel([
            Animated.timing(bath3Opacity, {
              toValue: 1 - progress,
              duration: 400,
              useNativeDriver: false,
            }),
            Animated.timing(bath4Opacity, {
              toValue: progress,
              duration: 400,
              useNativeDriver: false,
            })
          ]).start(() => {
            // Check if Bath4 transition is complete (opacity reached 1)
            if (progress >= 1) {
              bath4TransitionCompleteRef.current = true;
            }
          });
        }

        // Towel dries wash
        if (toolType === 'towel' && !state.towelDried[i] && state.showerRinsed[i] && hasWash) {
          playOneShot(towelSoundRef);
          state.towelDried[i] = true;

          // Cross-fade Bath4 -> Bath5 as towel dries areas
          const driedCount = state.towelDried.filter(Boolean).length;
          const progress = driedCount / state.towelDried.length;

          Animated.parallel([
            Animated.timing(bath4Opacity, {
              toValue: 1 - progress,
              duration: 400,
              useNativeDriver: false,
            }),
            Animated.timing(bath5Opacity, {
              toValue: progress,
              duration: 400,
              useNativeDriver: false,
            })
          ]).start();

          // If this was the final wash spot, move to the success state right away
          const allWashesCleaned = state.towelDried.every(dried => dried === true);
          if (allWashesCleaned && !bath2Triggered) {
            setBath2Triggered(true);
            setBath2Completed(false);

            bath4Opacity.stopAnimation();
            bath5Opacity.stopAnimation();
            bath4Opacity.setValue(0);
            bath5Opacity.setValue(0);
            setShowBath5Gif(true);
            Animated.parallel([
              Animated.timing(bath5Opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: false,
              }),
              Animated.timing(bath5GifOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: false,
              })
            ]).start(() => {
              bath5GifOpacity.setValue(1);
            });

            if (bath2SoundRef.current) {
              const sound = bath2SoundRef.current;
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                  setBath2Completed(true);
                }
              });
              sound.setPositionAsync(0);
              sound.playAsync().catch((error) => {
                console.error('Error playing Bath5.mp3:', error);
                setBath2Completed(true);
              });
            } else {
              setBath2Completed(true);
            }
          }
          
          // Animate wash opacity down
          Animated.timing(washAnimations[i], {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            delete activeAnimationsRef.current[collisionId];
          });
        }
      }
    }

    // Handle pulsing the correct tool
    if (shouldPulseTool && toolToPulse) {
      if (!isPulsingRef.current) {
        pulseTool(toolToPulse);
      }
    } else if (isPulsingRef.current) {
      stopPulse();
    }
  };

  const makePanResponder = (toolType: string, x: Animated.Value, y: Animated.Value) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt, gestureState) => {
        // Mark this tool as being dragged
        isDraggingRef.current = toolType;
        
        // Set offset to current value
        x.setOffset((x as any)._value);
        y.setOffset((y as any)._value);
        
        // Set base value to 0
        x.setValue(0);
        y.setValue(0);
      },
      onPanResponderMove: Animated.event([
        null,
        { dx: x, dy: y },
      ], { useNativeDriver: false }),
      onPanResponderRelease: (evt, gestureState) => {
        // Only snap back if this tool was being dragged
        if (isDraggingRef.current === toolType) {
          x.flattenOffset();
          y.flattenOffset();
          
          // Snap back to original position
          Animated.spring(x, {
            toValue: 0,
            useNativeDriver: false,
            friction: 8,
            tension: 40,
          }).start();
          
          Animated.spring(y, {
            toValue: 0,
            useNativeDriver: false,
            friction: 8,
            tension: 40,
          }).start();
          
          // Clear dragging state
          isDraggingRef.current = null;
          
          // Stop any pulsing when tool is released
          stopPulse();
        }
      },
    });

  const soapPan = makePanResponder('soap', soapX, soapY);
  const showerPan = makePanResponder('shower', showerX, showerY);
  const towelPan = makePanResponder('towel', towelX, towelY);

  const router = useRouter();

  // Background music setup on mount
  useEffect(() => {
    let isMounted = true;

    const playBackgroundAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Play background music immediately
        const { sound: bgSound } = await Audio.Sound.createAsync(
          require('./BathGame/BathBG.mp3'),
          { isLooping: true, volume: 0.5, shouldPlay: true }
        );

        if (!isMounted) {
          await bgSound.unloadAsync();
          return;
        }

        bgSoundRef.current = bgSound;

        // Preload other sounds without autoplay
        const { sound: bath2Sound } = await Audio.Sound.createAsync(
          require('./BathGame/Bath5.mp3'),
          { shouldPlay: false, volume: 1.0, isLooping: false }
        );
        bath2SoundRef.current = bath2Sound;

        const { sound: soapSound } = await Audio.Sound.createAsync(
          require('./BathGame/Soap.mp3'),
          { shouldPlay: false, volume: 1.0, isLooping: false }
        );
        soapSoundRef.current = soapSound;

        const { sound: showerSound } = await Audio.Sound.createAsync(
          require('./BathGame/Shower.mp3'),
          { shouldPlay: false, volume: 1.0, isLooping: false }
        );
        showerSoundRef.current = showerSound;

        const { sound: towelSound } = await Audio.Sound.createAsync(
          require('./BathGame/Towel.mp3'),
          { shouldPlay: false, volume: 1.0, isLooping: false }
        );
        towelSoundRef.current = towelSound;
      } catch (error) {
        console.warn('Error setting up BathGame audio:', error);
      }
    };

    playBackgroundAudio();

    return () => {
      isMounted = false;
      if (bgSoundRef.current) {
        bgSoundRef.current.stopAsync()
          .then(() => bgSoundRef.current?.unloadAsync())
          .catch(() => {});
        bgSoundRef.current = null;
      }
      if (bath2SoundRef.current) {
        bath2SoundRef.current.unloadAsync().catch(() => {});
        bath2SoundRef.current = null;
      }
      if (soapSoundRef.current) {
        soapSoundRef.current.unloadAsync().catch(() => {});
        soapSoundRef.current = null;
      }
      if (showerSoundRef.current) {
        showerSoundRef.current.unloadAsync().catch(() => {});
        showerSoundRef.current = null;
      }
      if (towelSoundRef.current) {
        towelSoundRef.current.unloadAsync().catch(() => {});
        towelSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!bath2Completed) return;

    const handleCompletion = async () => {
      if (bgSoundRef.current) {
        bgSoundRef.current.stopAsync().catch(() => {});
      }

      Animated.parallel([
        Animated.timing(victoryScale, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(victoryOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start(() => {
        // After animation completes, set completion flag and navigate
        AsyncStorage.setItem('@minigameCompleted', 'true')
          .catch((error) => console.error('Error setting completion flag:', error))
          .finally(() => {
            if (router.canGoBack()) {
              router.back();
            }
          });
      });
    };

    handleCompletion();
  }, [bath2Completed, router, victoryScale, victoryOpacity]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (bath2SoundRef.current) {
        bath2SoundRef.current.setOnPlaybackStatusUpdate(null);
        bath2SoundRef.current.stopAsync().catch(() => {});
        bath2SoundRef.current.unloadAsync().catch(() => {});
      }
      if (bgSoundRef.current) {
        bgSoundRef.current.stopAsync().catch(() => {});
        bgSoundRef.current.unloadAsync().catch(() => {});
      }
      if (soapSoundRef.current) {
        soapSoundRef.current.unloadAsync().catch(() => {});
      }
      if (showerSoundRef.current) {
        showerSoundRef.current.unloadAsync().catch(() => {});
      }
      if (towelSoundRef.current) {
        towelSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.gameContentWrapper,
        {
          transform: [{ scale: victoryScale }]
        }
      ]}>
        {/* Background */}
        <Image source={require('./BathGame/WashBG.png')} style={styles.bg} resizeMode="stretch" />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => {
          // Clear the minigame started flag when user manually exits
          // so home won't show success modal on early exit
          if (typeof window !== 'undefined') {
            // For React Native, we use a different approach
            if (router.canGoBack()) {
              router.back();
            }
          } else {
            if (router.canGoBack()) {
              router.back();
            }
          }
        }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Top tools bar */}
        <View style={[styles.toolsBar, {
          top: toolsBarTop,
          left: toolsBarLeft,
          width: toolsBarWidth,
          height: toolsBarHeight,
        }]} pointerEvents="box-none">
          <View style={styles.toolsBarInner}>
            <Image source={require('./BathGame/Soap.png')} style={[styles.toolIconStub, { width: toolSize * 0.85, height: toolSize * 0.85 }]} />
            <Image source={require('./BathGame/Shower.png')} style={[styles.toolIconStub, { width: toolSize * 0.85, height: toolSize * 0.85 }]} />
            <Image source={require('./BathGame/Towel.png')} style={[styles.toolIconStub, { width: toolSize * 0.85, height: toolSize * 0.85 }]} />
          </View>
        </View>

        {/* Child */}
        <View style={styles.childContainer}>
        {/* Bath1.png - opacity controlled for smooth cross-fade */}
        <Animated.Image 
          source={require('./BathGame/Bath1.png')} 
          style={[styles.child, { opacity: bath1Opacity }]} 
          resizeMode="contain" 
        />
        {/* Bath2.png - opacity controlled for smooth cross-fade */}
        <Animated.Image 
          source={require('./BathGame/Bath2.png')} 
          style={[styles.child, { position: 'absolute', opacity: bath2Opacity }]} 
          resizeMode="contain" 
        />
        {/* Bath3.png - opacity controlled for smooth cross-fade */}
        <Animated.Image 
          source={require('./BathGame/Bath3.png')} 
          style={[styles.child, { position: 'absolute', opacity: bath3Opacity }]} 
          resizeMode="contain" 
        />
        {/* Bath4.png - opacity controlled for smooth cross-fade */}
        <Animated.Image 
          source={require('./BathGame/Bath4.png')} 
          style={[styles.child, { position: 'absolute', opacity: bath4Opacity }]} 
          resizeMode="contain" 
        />
        {/* Bath5.png - opacity controlled for smooth cross-fade */}
        {!showBath5Gif && (
          <Animated.Image 
            source={require('./BathGame/Bath5.png')} 
            style={[styles.child, { position: 'absolute', opacity: bath5Opacity }]} 
            resizeMode="contain" 
          />
        )}
        {/* Bath5_anim.gif - shown after towel completes */}
        <Animated.Image 
          source={require('./BathGame/Bath5_anim.gif')} 
          style={[styles.child, { 
            position: 'absolute',
            width: SCREEN_WIDTH * 1.99,
            height: SCREEN_HEIGHT * 0.9,
            opacity: bath5GifOpacity 
          }]} 
          resizeMode="contain" 
        />
        {/* Dirt overlays with Lather and Wash layers on top */}
        {/* Dirt 1 with Lather1 and Wash1 */}
        <View style={[styles.dirtContainer, { left: '38%', top: '39%' }]}>
          <Animated.Image source={require('./BathGame/Dirt1.png')} style={[styles.dirt, { opacity: dirtAnimations[0] }]} />
          <Animated.Image source={require('./BathGame/Lather1.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash1.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 2 with Lather2 and Wash2 */}
        <View style={[styles.dirtContainer, { left: '50%', top: '42%' }]}>
          <Animated.Image source={require('./BathGame/Dirt2.png')} style={[styles.dirt, { opacity: dirtAnimations[1] }]} />
          <Animated.Image source={require('./BathGame/Lather2.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash2.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 3 with Lather3 and Wash3 */}
        <View style={[styles.dirtContainer, { left: '42%', top: '48%' }]}>
          <Animated.Image source={require('./BathGame/Dirt3.png')} style={[styles.dirt, { opacity: dirtAnimations[2] }]} />
          <Animated.Image source={require('./BathGame/Lather3.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash3.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 4 with Lather4 and Wash4 */}
        <View style={[styles.dirtContainer, { left: '48%', top: '52%' }]}>
          <Animated.Image source={require('./BathGame/Dirt4.png')} style={[styles.dirt, { opacity: dirtAnimations[3] }]} />
          <Animated.Image source={require('./BathGame/Lather4.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash4.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 5 with Lather5 and Wash5 */}
        <View style={[styles.dirtContainer, { left: '38%', top: '58%' }]}>
          <Animated.Image source={require('./BathGame/Dirt5.png')} style={[styles.dirt, { opacity: dirtAnimations[4] }]} />
          <Animated.Image source={require('./BathGame/Lather5.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash5.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 6 with Lather6 and Wash6 */}
        <View style={[styles.dirtContainer, { left: '52%', top: '64%' }]}>
          <Animated.Image source={require('./BathGame/Dirt6.png')} style={[styles.dirt, { opacity: dirtAnimations[5] }]} />
          <Animated.Image source={require('./BathGame/Lather6.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash6.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 7 with Lather7 and Wash7 */}
        <View style={[styles.dirtContainer, { left: '42%', top: '30%' }]}>
          <Animated.Image source={require('./BathGame/Dirt1.png')} style={[styles.dirt, { opacity: dirtAnimations[6] }]} />
          <Animated.Image source={require('./BathGame/Lather1.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash1.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 8 with Lather8 and Wash8 */}
        <View style={[styles.dirtContainer, { left: '56%', top: '37%' }]}>
          <Animated.Image source={require('./BathGame/Dirt2.png')} style={[styles.dirt, { opacity: dirtAnimations[7] }]} />
          <Animated.Image source={require('./BathGame/Lather2.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash2.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 9 with Lather9 and Wash9 */}
        <View style={[styles.dirtContainer, { left: '42%', top: '64%' }]}>
          <Animated.Image source={require('./BathGame/Dirt3.png')} style={[styles.dirt, { opacity: dirtAnimations[8] }]} />
          <Animated.Image source={require('./BathGame/Lather3.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash3.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 10 with Lather10 and Wash10 */}
        <View style={[styles.dirtContainer, { left: '54%', top: '48%' }]}>
          <Animated.Image source={require('./BathGame/Dirt4.png')} style={[styles.dirt, { opacity: dirtAnimations[9] }]} />
          <Animated.Image source={require('./BathGame/Lather4.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash4.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 11 with Lather11 and Wash11 */}
        <View style={[styles.dirtContainer, { left: '44%', top: '33%' }]}>
          <Animated.Image source={require('./BathGame/Dirt5.png')} style={[styles.dirt, { opacity: dirtAnimations[10] }]} />
          <Animated.Image source={require('./BathGame/Lather5.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash5.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
        {/* Dirt 12 with Lather12 and Wash12 */}
        <View style={[styles.dirtContainer, { left: '55%', top: '58%' }]}>
          <Animated.Image source={require('./BathGame/Dirt6.png')} style={[styles.dirt, { opacity: dirtAnimations[11] }]} />
          <Animated.Image source={require('./BathGame/Lather6.png')} style={[styles.dirt, { opacity: 0 }]} />
          <Animated.Image source={require('./BathGame/Wash6.png')} style={[styles.dirt, { opacity: 0 }]} />
        </View>
      </View>

      {/* Draggable tools inside toolsBar with pulse animation */}
      <Animated.Image
        source={require('./BathGame/Soap.png')}
        {...soapPan.panHandlers}
        style={[styles.draggableTool, { 
          left: soapInitialX, 
          top: soapInitialY, 
          width: toolSize,
          height: toolSize,
          transform: [
            { translateX: soapX }, 
            { translateY: soapY },
            { scale: soapPulseAnim }
          ] 
        }]} 
        resizeMode="contain"
      />
      <Animated.Image
        source={require('./BathGame/Shower.png')}
        {...showerPan.panHandlers}
        style={[styles.draggableTool, { 
          left: showerInitialX, 
          top: showerInitialY, 
          width: toolSize,
          height: toolSize,
          transform: [
            { translateX: showerX }, 
            { translateY: showerY },
            { scale: showerPulseAnim }
          ] 
        }]} 
        resizeMode="contain"
      />
      <Animated.Image
        source={require('./BathGame/Towel.png')}
        {...towelPan.panHandlers}
        style={[styles.draggableTool, { 
          left: towelInitialX, 
          top: towelInitialY, 
          width: toolSize,
          height: toolSize,
          transform: [
            { translateX: towelX }, 
            { translateY: towelY },
            { scale: towelPulseAnim }
          ] 
        }]} 
        resizeMode="contain"
      />
      </Animated.View>
      
      {/* Victory white fade overlay */}
      <Animated.View 
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFFFFF',
          opacity: victoryOpacity,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8E6E2',
  },
  gameContentWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  backText: {
    fontSize: 20,
    color: '#244D4A',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  toolsBar: {
    position: 'absolute',
    top: 125,
    left: '10%',
    width: '80%',
    height: 68,
    borderRadius: 14,
    backgroundColor: '#53FFD5',
    borderWidth: 3,
    borderColor: '#42CCAA',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  toolsBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  toolIconStub: {
    width: 40,
    height: 40,
    opacity: 0,
  },
  childContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  child: {
    width: SCREEN_WIDTH * 0.99,
    height: SCREEN_HEIGHT * 0.9,
  },
  dirtContainer: {
    position: 'absolute',
    width: DIRT_SIZE,
    height: DIRT_SIZE,
  },
  dirt: {
    position: 'absolute',
    width: DIRT_SIZE,
    height: DIRT_SIZE,
  },
  draggableTool: {
    position: 'absolute',
    width: 75,
    height: 75,
    zIndex: 100,
  },
});