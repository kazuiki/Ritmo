import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EatingGame = () => {
  const [currentStage, setCurrentStage] = useState(0); // 0: Rice, 1: Vegi, 2: Chicken, 3: Water
  const [childMouth, setChildMouth] = useState('closed'); // 'closed', 'open', 'chewing'
  
  // Debug log current stage on every render
  console.log('🎮 RENDER - Current Stage:', currentStage, 'Food:', currentStage < 4 ? ['Rice', 'Vegi', 'Chicken', 'Water'][currentStage] : 'Unknown');
  const [isDraggingFood, setIsDraggingFood] = useState(false);
  const [allFoodEaten, setAllFoodEaten] = useState(false);
  const [isWaterReady, setIsWaterReady] = useState(false); // Track if water1 is tapped to become water
  const [isWaterShaking, setIsWaterShaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
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
    { id: 0, name: 'Rice', image: require('./EatGame/Rice.png') },
    { id: 1, name: 'Vegi', image: require('./EatGame/Vegi.png') },
    { id: 2, name: 'Chicken', image: require('./EatGame/Chicken.png') },
    { id: 3, name: 'Water', image: require('./EatGame/Water1.png') }
  ];

  useEffect(() => {
    // Preload all images
    Asset.loadAsync([
      require('./EatGame/EatBG.png'),
      require('./EatGame/Eat1.png'),
      require('./EatGame/Eat2.png'),
      require('./EatGame/Eat3.gif'),
      require('./EatGame/Eat4.gif'),
      require('./EatGame/Plate.png'),
      require('./EatGame/Rice.png'),
      require('./EatGame/Chicken.png'),
      require('./EatGame/Vegi.png'),
      require('./EatGame/Water.png'),
      require('./EatGame/Water1.png'),
    ]);
  }, []);

  // Listen to food position changes
  useEffect(() => {
    const foodXId = foodPosition.x.addListener((value) => {
      foodX.current = value.value;
    });
    const foodYId = foodPosition.y.addListener((value) => {
      foodY.current = value.value;
    });

    return () => {
      foodPosition.x.removeListener(foodXId);
      foodPosition.y.removeListener(foodYId);
    };
  }, []);

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
        
        // After chewing, slide plate out and bring next food
        setTimeout(() => {
          setChildMouth('closed');
          
          // Use callback to get the latest currentStage value
          setCurrentStage(prevStage => {
            const nextStage = prevStage + 1;
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
              setAllFoodEaten(true);
              setShowCelebration(true);
              isEatingSequence.current = false;
              setTimeout(() => {
                router.back();
              }, 3000);
              
              return prevStage; // Keep current stage if complete
            }
          });
        }, 1500); // Show chewing for 1.5 seconds
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
    if (childMouth === 'chewing') return require('./EatGame/Eat3.gif');
    if (childMouth === 'open') return require('./EatGame/Eat2.png');
    return require('./EatGame/Eat1.png');
  };

  const getCurrentFoodImage = () => {
    if (currentStage === 3) {
      // Water stage - show Water1.png initially, Water.png when ready
      return isWaterReady ? require('./EatGame/Water.png') : require('./EatGame/Water1.png');
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
    <View style={styles.container}>
      <Image source={require('./EatGame/EatBG.png')} style={styles.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
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
          <Image source={getChildImage()} style={[
            styles.child,
            // Ensure eat3.gif has same dimensions as eat1/eat2
            childMouth === 'chewing' ? { resizeMode: 'contain' } : {}
          ]} />
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
          {currentStage !== 3 && <Image source={require('./EatGame/Plate.png')} style={styles.plate} />}
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
                  source={getCurrentFoodImage()}
                  style={getFoodStyle()}
                />
              </TouchableOpacity>
            ) : (
              <Image
                source={getCurrentFoodImage()}
                style={getFoodStyle()}
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
          {currentStage + 1 !== 3 && <Image source={require('./EatGame/Plate.png')} style={styles.plate} />}
          <View style={
            currentStage === 0 ? styles.draggableVegiContainer : 
            currentStage === 1 ? styles.draggableChickenContainer : 
            currentStage === 2 ? styles.draggableWaterContainer : styles.draggableRiceContainer
          }>
            <Image
              source={stages[currentStage + 1].image}
              style={
                currentStage === 0 ? styles.vegiImage : 
                currentStage === 1 ? styles.chickenImage : 
                currentStage === 2 ? styles.waterImage : styles.riceImage
              }
            />
          </View>
        </Animated.View>
      )}

      {/* Celebration GIF */}
      {showCelebration && (
        <View style={styles.celebrationContainer}>
          <Image source={require('./EatGame/Eat4.gif')} style={styles.celebrationGif} />
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
    height: '100%', 
    resizeMode: 'cover' 
  },
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    paddingTop: 40, 
    paddingHorizontal: 16, 
    paddingBottom: 8, 
    minHeight: 48, 
    zIndex: 10 
  },
  backText: { 
    fontSize: 20, 
    color: '#244D4A', 
    textDecorationLine: 'underline', 
    fontWeight: '700', 
    fontFamily: 'Fredoka_700Bold' 
  },
  childContainer: {
    position: 'absolute', 
    top: '32.1%', 
    left: '2%', 
    width: '100%', 
    height: '50%',
    zIndex: 1, // Back to original layering
  },
  childContainerChewing: {
    position: 'absolute', 
    top: '45%', // Even lower position para just above orange table
    left: '2%', // Same left position
    width: '100%', // Same width as normal
    height: '35%', // Smaller height para controlled
    transform: [{ scale: 1.6 }], // Much smaller scale para hindi lumagpas
    zIndex: 1, // Same level as normal child
  },
  child: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain',
    opacity: 1, // Always fully visible - no transitions
  },
  plateContainer: { 
    position: 'absolute',
    bottom: '-2%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    zIndex: 2, // Above child
  },
  plate: { 
    position: 'absolute', 
    width: 350, 
    height: 250, 
    resizeMode: 'contain' 
  },
  draggableRiceContainer: { 
    position: 'absolute', 
    bottom: '8%', 
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 // Above plate and child
  },
  draggableChickenContainer: { 
    position: 'absolute', 
    bottom: '8%', 
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 // Above plate and child
  },
  draggableVegiContainer: { 
    position: 'absolute', 
    bottom: '8%', 
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 // Above plate and child
  },
  riceImage: { 
    bottom: '38%', 
    left: '6%', 
    width: 320, 
    height: 200, 
    resizeMode: 'contain' 
  },
  chickenImage: { 
    bottom: '38%', 
    left: '6%', 
    width: 320, 
    height: 200, 
    resizeMode: 'contain' 
  },
  vegiImage: { 
    bottom: '38%', 
    left: '6%', 
    width: 320, 
    height: 200, 
    resizeMode: 'contain' 
  },
  draggableWaterContainer: { 
    position: 'absolute', 
    bottom: '8%', // Same as other containers to align with table
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 // Above plate and child
  },
  waterImage: { 
    bottom: '38%', 
    left: '6%', 
    width: 320, 
    height: 200, 
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
    top: '35%', // Same as childContainerChewing position
    left: '2%', // Same as childContainer position  
    width: '100%',
    height: '40%', // Smaller height para hindi umabot sa orange
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  celebrationGif: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    transform: [{ scale: 2.0 }], // Slightly smaller scale
  },
  completionContainer: {
    position: 'absolute',
    bottom: '20%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionText: {
    fontSize: 24,
    color: '#244D4A',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EatingGame;