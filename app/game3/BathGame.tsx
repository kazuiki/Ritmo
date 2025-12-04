// app/game3/BathGame.tsx
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BathGame() {
  // ToolsBar is 80% width centered (left: 10%, width: 80%)
  const toolsBarLeft = SCREEN_WIDTH * 0.1;
  const toolsBarWidth = SCREEN_WIDTH * 0.8;
  const toolsBarTop = 125;
  const toolsBarHeight = 64;
  const toolSize = 48;
  const borderWidth = 3; // toolsBar border

  // Account for border and center tools vertically in toolsBar, adjust upward slightly
  const innerTop = toolsBarTop + borderWidth;
  const innerHeight = toolsBarHeight - (borderWidth * 2);
  const toolVerticalCenter = innerTop + (innerHeight - toolSize) / 2 - 13; // Move up 2px

  // Account for border width in horizontal positioning, shift left slightly
  const innerLeft = toolsBarLeft + borderWidth - 12; // Move left 4px
  const innerWidth = toolsBarWidth - (borderWidth * 2);

  // Distribute 3 tools evenly with proper spacing
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

  // Opacity state for each dirt layer (6 dirts)
  // Each dirt has: dirtOpacity, latherOpacity, washOpacity
  const [dirtOpacities, setDirtOpacities] = useState([1, 1, 1, 1, 1, 1]);
  const [latherOpacities, setLatherOpacities] = useState([0, 0, 0, 0, 0, 0]);
  const [washOpacities, setWashOpacities] = useState([0, 0, 0, 0, 0, 0]);

  // Animated values for smooth transitions
  const dirtAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(1))).current;
  const latherAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;
  const washAnimations = useRef([1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0))).current;

  // Pulse animations for each tool
  const soapPulseAnim = useRef(new Animated.Value(1)).current;
  const showerPulseAnim = useRef(new Animated.Value(1)).current;
  const towelPulseAnim = useRef(new Animated.Value(1)).current;

  // Track active pulse animations
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Bath2 success animation
  const bath1Opacity = useRef(new Animated.Value(1)).current;
  const bath2Opacity = useRef(new Animated.Value(0)).current;
  const bath2SoundRef = useRef<Audio.Sound | null>(null);
  const bath2TriggeredRef = useRef(false);

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

    // First, do a full scan to check if all dirts have been cleaned (for shower pulsing)
    const allDirtsCleaned = state.soapCleaned.every(cleaned => cleaned === true);
    
    // Check if all lathers have been rinsed (for towel pulsing)
    const allLathersRinsed = state.soapCleaned.every((cleaned, i) => {
      if (!cleaned) return false; // Has unclean dirts
      return state.showerRinsed[i]; // Check if rinsed
    });

    // Check each dirt area
    for (let i = 0; i < 6; i++) {
      if (checkCollision(toolX, toolY, i)) {
        hasAnyCollision = true;
        
        // Determine which tool should be used based on the current state of this dirt area
        const hasDirt = !state.soapCleaned[i];
        const hasLather = state.soapCleaned[i] && !state.showerRinsed[i];
        const hasWash = state.showerRinsed[i] && !state.towelDried[i];

        // Determine correct tool for current state
        let correctTool = '';
        if (hasDirt) {
          correctTool = 'soap';
        } else if (hasLather) {
          correctTool = 'shower';
        } else if (hasWash) {
          correctTool = 'towel';
        }

        // Check if wrong tool is being used
        if (correctTool && toolType !== correctTool) {
          // Determine which tool should pulse based on what's available
          
          // If on dirts (hasDirt=true): soap is always correct
          if (hasDirt) {
            shouldPulseTool = true;
            toolToPulse = 'soap';
            break;
          }
          
          // If on lathers (hasLather=true): shower is correct
          // But only pulse shower if ALL dirts are already cleaned
          if (hasLather) {
            if (allDirtsCleaned) {
              shouldPulseTool = true;
              toolToPulse = 'shower';
              break;
            }
          }
          
          // If on washes (hasWash=true): towel is correct
          // But only pulse towel if ALL lathers are already rinsed
          if (hasWash) {
            if (allLathersRinsed) {
              shouldPulseTool = true;
              toolToPulse = 'towel';
              break;
            }
          }
        }

        // Only do cleaning animation if this is the correct tool and not already animated
        const collisionId = `${toolType}_${i}`;
        
        // Skip if already cleaning this spot
        if (activeAnimationsRef.current[collisionId]) continue;

        // Mark animation as active
        activeAnimationsRef.current[collisionId] = true;

        // Soap cleans dirts and reveals lathers
        if (toolType === 'soap' && !state.soapCleaned[i] && hasDirt) {
          state.soapCleaned[i] = true;
          
          // Animate dirt opacity down and lather opacity up
          Animated.parallel([
            Animated.timing(dirtAnimations[i], {
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
            // Remove animation flag when done
            delete activeAnimationsRef.current[collisionId];
          });
        }

        // Shower rinses lathers and reveals wash
        if (toolType === 'shower' && !state.showerRinsed[i] && state.soapCleaned[i] && hasLather) {
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
            // Remove animation flag when done
            delete activeAnimationsRef.current[collisionId];
          });
        }

        // Towel dries wash
        if (toolType === 'towel' && !state.towelDried[i] && state.showerRinsed[i] && hasWash) {
          state.towelDried[i] = true;
          
          // Animate wash opacity down
          Animated.timing(washAnimations[i], {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }).start(() => {
            // Remove animation flag when done
            delete activeAnimationsRef.current[collisionId];
            
            // Check if all washes are now cleaned
            const allWashesCleaned = state.towelDried.every(dried => dried === true);
            if (allWashesCleaned && !bath2TriggeredRef.current) {
              bath2TriggeredRef.current = true;
              
              // Create and play Bath2.mp3 simultaneously with Bath2.gif animation
              const startBath2 = async () => {
                try {
                  // Stop and unload any previous sound
                  if (bath2SoundRef.current) {
                    try {
                      await bath2SoundRef.current.stopAsync();
                      await bath2SoundRef.current.unloadAsync();
                    } catch (e) {}
                  }
                  
                  const { sound } = await Audio.Sound.createAsync(
                    require('./BathGame/Bath2.mp3'),
                    { 
                      shouldPlay: false,
                      volume: 1.0,
                      isLooping: true
                    }
                  );
                  bath2SoundRef.current = sound;
                  await sound.playAsync();
                } catch (error) {
                  console.error('Error playing Bath2.mp3:', error);
                }
              };

              // Start audio and animation simultaneously
              startBath2();
              
              // Smoothly transition Bath1 out and Bath2 in
              Animated.parallel([
                Animated.timing(bath1Opacity, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: false,
                }),
                Animated.timing(bath2Opacity, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: false,
                })
              ]).start();
            } else if (!allWashesCleaned && bath2TriggeredRef.current) {
              // If washes are no longer cleaned, stop Bath2 audio and reset
              bath2TriggeredRef.current = false;
              if (bath2SoundRef.current) {
                bath2SoundRef.current.stopAsync().catch(() => {});
                bath2SoundRef.current.unloadAsync().catch(() => {});
                bath2SoundRef.current = null;
              }
              // Reset Bath animations
              Animated.parallel([
                Animated.timing(bath1Opacity, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: false,
                }),
                Animated.timing(bath2Opacity, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: false,
                })
              ]).start();
            }
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
      // Stop pulsing if no collision with wrong tool
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

  // Setup audio mode on mount
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
    };
    setupAudio();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (bath2SoundRef.current) {
        bath2SoundRef.current.stopAsync().catch(() => {});
        bath2SoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={require('./BathGame/WashBG.png')} style={styles.bg} resizeMode="cover" />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
        <Animated.Image 
          source={require('./BathGame/Bath1.png')} 
          style={[styles.child, { opacity: bath1Opacity }]} 
          resizeMode="contain" 
        />
        {/* Bath2.gif success overlay - appears when all washes are cleaned */}
        <Animated.Image 
        source={require('./BathGame/Bath2.gif')} 
        style={[styles.child, { 
          position: 'absolute', 
          opacity: bath2Opacity,
          width: SCREEN_WIDTH * 1.99,  // Adjust this multiplier
          height: SCREEN_HEIGHT * 0.9  // Adjust this multiplier
        }]} 
        resizeMode="contain" 
      />
        {/* Dirt overlays with Lather and Wash layers on top */}
        {/* Dirt 1 with Lather1 and Wash1 */}
        <View style={[styles.dirtContainer, { left: '38%', top: '38%' }]}>
          <Animated.Image source={require('./BathGame/Dirt1.png')} style={[styles.dirt, { opacity: dirtAnimations[0] }]} />
          <Animated.Image source={require('./BathGame/Lather1.png')} style={[styles.dirt, { opacity: latherAnimations[0] }]} />
          <Animated.Image source={require('./BathGame/Wash1.png')} style={[styles.dirt, { opacity: washAnimations[0] }]} />
        </View>
        {/* Dirt 2 with Lather2 and Wash2 */}
        <View style={[styles.dirtContainer, { left: '50%', top: '42%' }]}>
          <Animated.Image source={require('./BathGame/Dirt2.png')} style={[styles.dirt, { opacity: dirtAnimations[1] }]} />
          <Animated.Image source={require('./BathGame/Lather2.png')} style={[styles.dirt, { opacity: latherAnimations[1] }]} />
          <Animated.Image source={require('./BathGame/Wash2.png')} style={[styles.dirt, { opacity: washAnimations[1] }]} />
        </View>
        {/* Dirt 3 with Lather3 and Wash3 */}
        <View style={[styles.dirtContainer, { left: '42%', top: '48%' }]}>
          <Animated.Image source={require('./BathGame/Dirt3.png')} style={[styles.dirt, { opacity: dirtAnimations[2] }]} />
          <Animated.Image source={require('./BathGame/Lather3.png')} style={[styles.dirt, { opacity: latherAnimations[2] }]} />
          <Animated.Image source={require('./BathGame/Wash3.png')} style={[styles.dirt, { opacity: washAnimations[2] }]} />
        </View>
        {/* Dirt 4 with Lather4 and Wash4 */}
        <View style={[styles.dirtContainer, { left: '48%', top: '52%' }]}>
          <Animated.Image source={require('./BathGame/Dirt4.png')} style={[styles.dirt, { opacity: dirtAnimations[3] }]} />
          <Animated.Image source={require('./BathGame/Lather4.png')} style={[styles.dirt, { opacity: latherAnimations[3] }]} />
          <Animated.Image source={require('./BathGame/Wash4.png')} style={[styles.dirt, { opacity: washAnimations[3] }]} />
        </View>
        {/* Dirt 5 with Lather5 and Wash5 */}
        <View style={[styles.dirtContainer, { left: '38%', top: '60%' }]}>
          <Animated.Image source={require('./BathGame/Dirt5.png')} style={[styles.dirt, { opacity: dirtAnimations[4] }]} />
          <Animated.Image source={require('./BathGame/Lather5.png')} style={[styles.dirt, { opacity: latherAnimations[4] }]} />
          <Animated.Image source={require('./BathGame/Wash5.png')} style={[styles.dirt, { opacity: washAnimations[4] }]} />
        </View>
        {/* Dirt 6 with Lather6 and Wash6 */}
        <View style={[styles.dirtContainer, { left: '52%', top: '64%' }]}>
          <Animated.Image source={require('./BathGame/Dirt6.png')} style={[styles.dirt, { opacity: dirtAnimations[5] }]} />
          <Animated.Image source={require('./BathGame/Lather6.png')} style={[styles.dirt, { opacity: latherAnimations[5] }]} />
          <Animated.Image source={require('./BathGame/Wash6.png')} style={[styles.dirt, { opacity: washAnimations[5] }]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8E6E2',
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