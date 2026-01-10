// app/game3/BathGame.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BathGame() {
  const toolsBarLeft = SCREEN_WIDTH * 0.1;
  const toolsBarWidth = SCREEN_WIDTH * 0.8;
  const toolsBarTop = 125;
  const toolsBarHeight = 64;
  const toolSize = 48;
  const borderWidth = 3; 

  const innerTop = toolsBarTop + borderWidth;
  const innerHeight = toolsBarHeight - (borderWidth * 2);
  const toolVerticalCenter = innerTop + (innerHeight - toolSize) / 2 - 13; 

  const innerLeft = toolsBarLeft + borderWidth - 12; 
  const innerWidth = toolsBarWidth - (borderWidth * 2);

  const toolSpacing = innerWidth / 3;
  
  const soapInitialX = innerLeft + (toolSpacing / 2) - (toolSize / 2);
  const soapInitialY = toolVerticalCenter;

  const showerInitialX = innerLeft + (toolSpacing * 1.5) - (toolSize / 2);
  const showerInitialY = toolVerticalCenter;

  const towelInitialX = innerLeft + (toolSpacing * 2.5) - (toolSize / 2);
  const towelInitialY = toolVerticalCenter;

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
  const dirtAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(1))).current;
  const waterAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;
  const latherAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;
  const washAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;

  // Pulse animations for each tool
  const soapPulseAnim = useRef(new Animated.Value(1)).current;
  const showerPulseAnim = useRef(new Animated.Value(1)).current;
  const towelPulseAnim = useRef(new Animated.Value(1)).current;

  // Track active pulse animations
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Bath2 success state and animations
  const [bath2Triggered, setBath2Triggered] = useState(false);
  const [bath2Completed, setBath2Completed] = useState(false);
  const bath1Opacity = useRef(new Animated.Value(1)).current;
  const bath2Opacity = useRef(new Animated.Value(0)).current;
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
  ];
  const dirtSize = 40;

  // Check collision between tool and dirt/lather/wash areas
  const checkCollision = (toolX: number, toolY: number, dirtIndex: number): string | null => {
    const dirtLeft = dirtPositions[dirtIndex].left;
    const dirtTop = dirtPositions[dirtIndex].top;
    const dirtRight = dirtLeft + dirtSize;
    const dirtBottom = dirtTop + dirtSize;
    
    const toolLeft = toolX;
    const toolRight = toolX + 75; // draggableTool size
    const toolTop = toolY;
    const toolBottom = toolY + 75;

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
    showerWetted: [false, false, false, false, false, false],
    soapCleaned: [false, false, false, false, false, false],
    showerRinsed: [false, false, false, false, false, false],
    towelDried: [false, false, false, false, false, false],
  });

  // Track if a tool is currently being dragged
  const isDraggingRef = useRef<string | null>(null);

  // Track active animations to prevent overlapping animations
  const activeAnimationsRef = useRef<{[key: string]: boolean}>({});

  // Track if a pulse animation is currently running
  const isPulsingRef = useRef<boolean>(false);

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
    for (let i = 0; i < 6; i++) {
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

        // Shower wets the child (first step) - creates water, doesn't affect dirt
        if (toolType === 'shower' && !state.showerWetted[i] && hasNotBeenWetted) {
          playOneShot(showerSoundRef);
          state.showerWetted[i] = true;
          
          // Animate water opacity up (water appears, dirts stay)
          Animated.timing(waterAnimations[i], {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }).start(() => {
            delete activeAnimationsRef.current[collisionId];
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
        }

        // Towel dries wash
        if (toolType === 'towel' && !state.towelDried[i] && state.showerRinsed[i] && hasWash) {
          playOneShot(towelSoundRef);
          state.towelDried[i] = true;

          // If this was the final wash spot, move to the success state right away
          const allWashesCleaned = state.towelDried.every(dried => dried === true);
          if (allWashesCleaned && !bath2Triggered) {
            setBath2Triggered(true);
            setBath2Completed(false);

            Animated.parallel([
              Animated.timing(bath1Opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: false,
              }),
              Animated.timing(bath2Opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: false,
              })
            ]).start();
            
            if (bath2SoundRef.current) {
              const sound = bath2SoundRef.current;
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                  setBath2Completed(true);
                }
              });
              sound.setPositionAsync(0);
              sound.playAsync().catch((error) => {
                console.error('Error playing Bath2.mp3:', error);
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

  // Preload and setup audio on mount
  useEffect(() => {
    const preloadAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Preload Bath2.mp3 sound
        const { sound } = await Audio.Sound.createAsync(
          require('./BathGame/Bath2.mp3'),
          { 
            shouldPlay: false,
            volume: 1.0,
            isLooping: false
          }
        );
        bath2SoundRef.current = sound;

        const bg = await Audio.Sound.createAsync(
          require('./BathGame/BathBG.mp3'),
          {
            shouldPlay: false,
            volume: 1.0,
            isLooping: true,
          }
        );
        bgSoundRef.current = bg.sound;

        const soapSound = await Audio.Sound.createAsync(
          require('./BathGame/Soap.mp3'),
          {
            shouldPlay: false,
            volume: 1.0,
            isLooping: false,
          }
        );
        soapSoundRef.current = soapSound.sound;

        const showerSound = await Audio.Sound.createAsync(
          require('./BathGame/Shower.mp3'),
          {
            shouldPlay: false,
            volume: 1.0,
            isLooping: false,
          }
        );
        showerSoundRef.current = showerSound.sound;

        const towelSound = await Audio.Sound.createAsync(
          require('./BathGame/Towel.mp3'),
          {
            shouldPlay: false,
            volume: 1.0,
            isLooping: false,
          }
        );
        towelSoundRef.current = towelSound.sound;

        if (bgSoundRef.current) {
          bgSoundRef.current.playAsync().catch(() => {});
        }
      } catch (error) {
        console.error('Error preloading Bath2 audio:', error);
      }
    };
    preloadAudio();
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
        <Image source={require('./BathGame/WashBG.png')} style={styles.bg} resizeMode="cover" />

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
        <View style={styles.toolsBar} pointerEvents="box-none">
          <View style={styles.toolsBarInner}>
            <Image source={require('./BathGame/Soap.png')} style={styles.toolIconStub} />
            <Image source={require('./BathGame/Shower.png')} style={styles.toolIconStub} />
            <Image source={require('./BathGame/Towel.png')} style={styles.toolIconStub} />
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
        {/* Bath2.gif - opacity controlled for smooth cross-fade */}
        <Animated.Image 
          source={require('./BathGame/Bath2.gif')} 
          style={[styles.child, { 
            position: 'absolute', 
            width: SCREEN_WIDTH * 1.99,
            height: SCREEN_HEIGHT * 0.9,
            opacity: bath2Opacity
          }]} 
          resizeMode="contain" 
        />
        {/* Dirt overlays with Lather and Wash layers on top */}
        {/* Dirt 1 with Water1, Lather1 and Wash1 */}
        <View style={[styles.dirtContainer, { left: '38%', top: '38%' }]}>
          <Animated.Image source={require('./BathGame/Dirt1.png')} style={[styles.dirt, { opacity: dirtAnimations[0] }]} />
          <Animated.Image source={require('./BathGame/Lather1.png')} style={[styles.dirt, { opacity: latherAnimations[0] }]} />
          <Animated.Image source={require('./BathGame/Wash1.png')} style={[styles.dirt, { opacity: washAnimations[0] }]} />
        </View>
        {/* Water 1 - positioned near dirt but offset */}
        <View style={[styles.dirtContainer, { left: '41%', top: '34%' }]}>
          <Animated.Image source={require('./BathGame/Water1.png')} style={[styles.dirt, { opacity: waterAnimations[0] }]} />
        </View>
        {/* Dirt 2 with Water2, Lather2 and Wash2 */}
        <View style={[styles.dirtContainer, { left: '50%', top: '42%' }]}>
          <Animated.Image source={require('./BathGame/Dirt2.png')} style={[styles.dirt, { opacity: dirtAnimations[1] }]} />
          <Animated.Image source={require('./BathGame/Lather2.png')} style={[styles.dirt, { opacity: latherAnimations[1] }]} />
          <Animated.Image source={require('./BathGame/Wash2.png')} style={[styles.dirt, { opacity: washAnimations[1] }]} />
        </View>
        {/* Water 2 - positioned near dirt but offset */}
        <View style={[styles.dirtContainer, { left: '53%', top: '38%' }]}>
          <Animated.Image source={require('./BathGame/Water2.png')} style={[styles.dirt, { opacity: waterAnimations[1] }]} />
        </View>
        {/* Dirt 3 with Water3, Lather3 and Wash3 */}
        <View style={[styles.dirtContainer, { left: '42%', top: '48%' }]}>
          <Animated.Image source={require('./BathGame/Dirt3.png')} style={[styles.dirt, { opacity: dirtAnimations[2] }]} />
          <Animated.Image source={require('./BathGame/Lather3.png')} style={[styles.dirt, { opacity: latherAnimations[2] }]} />
          <Animated.Image source={require('./BathGame/Wash3.png')} style={[styles.dirt, { opacity: washAnimations[2] }]} />
        </View>
        {/* Water 3 - positioned near dirt but offset */}
        <View style={[styles.dirtContainer, { left: '45%', top: '44%' }]}>
          <Animated.Image source={require('./BathGame/Water3.png')} style={[styles.dirt, { opacity: waterAnimations[2] }]} />
        </View>
        {/* Dirt 4 with Water4, Lather4 and Wash4 */}
        <View style={[styles.dirtContainer, { left: '48%', top: '52%' }]}>
          <Animated.Image source={require('./BathGame/Dirt4.png')} style={[styles.dirt, { opacity: dirtAnimations[3] }]} />
          <Animated.Image source={require('./BathGame/Lather4.png')} style={[styles.dirt, { opacity: latherAnimations[3] }]} />
          <Animated.Image source={require('./BathGame/Wash4.png')} style={[styles.dirt, { opacity: washAnimations[3] }]} />
        </View>
        {/* Water 4 - positioned near dirt but offset */}
        <View style={[styles.dirtContainer, { left: '51%', top: '48%' }]}>
          <Animated.Image source={require('./BathGame/Water4.png')} style={[styles.dirt, { opacity: waterAnimations[3] }]} />
        </View>
        {/* Dirt 5 with Water5, Lather5 and Wash5 */}
        <View style={[styles.dirtContainer, { left: '38%', top: '60%' }]}>
          <Animated.Image source={require('./BathGame/Dirt5.png')} style={[styles.dirt, { opacity: dirtAnimations[4] }]} />
          <Animated.Image source={require('./BathGame/Lather5.png')} style={[styles.dirt, { opacity: latherAnimations[4] }]} />
          <Animated.Image source={require('./BathGame/Wash5.png')} style={[styles.dirt, { opacity: washAnimations[4] }]} />
        </View>
        {/* Water 5 - positioned near dirt but offset */}
        <View style={[styles.dirtContainer, { left: '41%', top: '56%' }]}>
          <Animated.Image source={require('./BathGame/Water5.png')} style={[styles.dirt, { opacity: waterAnimations[4] }]} />
        </View>
        {/* Dirt 6 with Water6, Lather6 and Wash6 */}
        <View style={[styles.dirtContainer, { left: '52%', top: '64%' }]}>
          <Animated.Image source={require('./BathGame/Dirt6.png')} style={[styles.dirt, { opacity: dirtAnimations[5] }]} />
          <Animated.Image source={require('./BathGame/Lather6.png')} style={[styles.dirt, { opacity: latherAnimations[5] }]} />
          <Animated.Image source={require('./BathGame/Wash6.png')} style={[styles.dirt, { opacity: washAnimations[5] }]} />
        </View>
        {/* Water 6 - positioned near dirt but offset */}
        <View style={[styles.dirtContainer, { left: '55%', top: '60%' }]}>
          <Animated.Image source={require('./BathGame/Water6.png')} style={[styles.dirt, { opacity: waterAnimations[5] }]} />
        </View>
      </View>

      {/* Draggable tools inside toolsBar with pulse animation */}
      <Animated.Image
        source={require('./BathGame/Soap.png')}
        {...soapPan.panHandlers}
        style={[styles.draggableTool, { 
          left: soapInitialX, 
          top: soapInitialY, 
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
    width: 40,
    height: 40,
  },
  dirt: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  draggableTool: {
    position: 'absolute',
    width: 75,
    height: 75,
    zIndex: 100,
  },
});