import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EatingGame = () => {
  const [currentStage, setCurrentStage] = useState(0); // 0: Rice, 1: Vegi, 2: Chicken, 3: Water1, 4: Water
  const [childMouth, setChildMouth] = useState('closed'); // 'closed', 'open'
  const [isChewing, setIsChewing] = useState(false);
  const [isDraggingFood, setIsDraggingFood] = useState(false);
  const [allFoodEaten, setAllFoodEaten] = useState(false);
  const router = useRouter();

  // Food position for dragging
  const foodPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const foodOpacity = useRef(new Animated.Value(1)).current;
  
  // For sliding plates in/out - use separate values for better control
  const currentPlateX = useRef(new Animated.Value(0)).current;
  const nextPlateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Track if we're in eating sequence
  const isEatingSequence = useRef(false);

  // Track current food position values
  const foodX = useRef(0);
  const foodY = useRef(0);
  
  // Track displayed stages (won't trigger re-render during animation)
  const displayedCurrentStage = useRef(0);
  const displayedNextStage = useRef(1);

  const stages = [
    { id: 0, name: 'Rice', image: require('./EatGame/Rice.png') },
    { id: 1, name: 'Chicken', image: require('./EatGame/Chicken.png') },
    { id: 2, name: 'Vegi', image: require('./EatGame/Vegi.png') },
    { id: 3, name: 'Water1', image: require('./EatGame/Water1.png') },
    { id: 4, name: 'Water', image: require('./EatGame/Water.png') }
  ];
  
  // Get images based on displayed stage refs (not state)
  const getCurrentPlateImage = () => stages[displayedCurrentStage.current].image;
  const getNextPlateImage = () => displayedNextStage.current < stages.length ? stages[displayedNextStage.current].image : null;

  useEffect(() => {
    // Preload all images
    Asset.loadAsync([
      require('./EatGame/EatBG.png'),
      require('./EatGame/Eat1.png'),
      require('./EatGame/Eat2.png'),
      require('./EatGame/Eat3.gif'),
      require('./EatGame/Plate.png'),
      require('./EatGame/Rice.png'),
      require('./EatGame/Chicken.png'),
      require('./EatGame/Vegi.png'),
      require('./EatGame/Water1.png'),
      require('./EatGame/Water.png'),
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

  // Reset food position and opacity
  const resetFoodState = () => {
    foodPosition.setValue({ x: 0, y: 0 });
    foodOpacity.setValue(1);
    setChildMouth('closed');
    foodX.current = 0;
    foodY.current = 0;
  };

  // Detect if food is near the child's mouth (Eat1 position)
  const isNearMouth = (x: number, y: number) => {
    return y < -100;
  };

  const handleFoodEaten = () => {
    if (isEatingSequence.current) return;
    isEatingSequence.current = true;

    // Food disappears
    Animated.timing(foodOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setChildMouth('closed');
      setIsChewing(true);

      // Chew briefly before transitioning plates
      setTimeout(() => {
        setIsChewing(false);
        
        const nextStage = currentStage + 1;
        if (nextStage < stages.length) {
          resetFoodState();
          
          // Slide current plate out to the left and next plate in simultaneously
          Animated.parallel([
            Animated.timing(currentPlateX, {
              toValue: -SCREEN_WIDTH,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(nextPlateX, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            })
          ]).start(() => {
            // After animation completes, update refs and state
            displayedCurrentStage.current = nextStage;
            displayedNextStage.current = nextStage + 1;
            setCurrentStage(nextStage); // Force re-render with new stage
            
            // Reset plate positions for next transition
            currentPlateX.setValue(0);
            nextPlateX.setValue(SCREEN_WIDTH);
            isEatingSequence.current = false;
          });
        } else {
          // All food eaten - slide out final plate
          Animated.timing(currentPlateX, {
            toValue: -SCREEN_WIDTH,
            duration: 600,
            useNativeDriver: true,
          }).start(() => {
            setAllFoodEaten(true);
            isEatingSequence.current = false;
            setTimeout(() => {
              router.back();
            }, 1500);
          });
        }
      }, 700);
    });
  };

  // Pan responder for draggable food
  const dragOffset = useRef({ x: 0, y: 0 });
  const foodPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEatingSequence.current && !allFoodEaten,
      onMoveShouldSetPanResponder: () => !isEatingSequence.current && !allFoodEaten,
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
    if (isChewing) return require('./EatGame/Eat3.gif');
    if (childMouth === 'open') return require('./EatGame/Eat2.png');
    return require('./EatGame/Eat1.png');
  };

  const toggleChildMouth = () => {
    if (isEatingSequence.current || isChewing) return;
    setChildMouth((prev) => (prev === 'open' ? 'closed' : 'open'));
  };

  const getCurrentFoodImage = () => {
    return stages[displayedCurrentStage.current].image;
  };

  const getFoodStyle = () => {
    switch(displayedCurrentStage.current) {
      case 0: return styles.riceImage;
      case 1: return styles.chickenImage;
      case 2: return styles.vegiImage;
      case 3: return styles.waterImage;
      case 4: return styles.waterImage;
      default: return styles.riceImage;
    }
  };

  const getDraggableContainerStyle = () => {
    switch(displayedCurrentStage.current) {
      case 0: return styles.draggableRiceContainer;
      case 1: return styles.draggableChickenContainer;
      case 2: return styles.draggableVegiContainer;
      case 3: return styles.draggableWaterContainer;
      case 4: return styles.draggableWaterContainer;
      default: return styles.draggableRiceContainer;
    }
  };

  const getNextFoodStyle = () => {
    switch(displayedNextStage.current) {
      case 1: return styles.chickenImage;
      case 2: return styles.vegiImage;
      case 3: return styles.waterImage;
      case 4: return styles.waterImage;
      default: return styles.riceImage;
    }
  };

  const getNextDraggableContainerStyle = () => {
    switch(displayedNextStage.current) {
      case 1: return styles.draggableChickenContainer;
      case 2: return styles.draggableVegiContainer;
      case 3: return styles.draggableWaterContainer;
      case 4: return styles.draggableWaterContainer;
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

      {/* Child image - tap to toggle mouth */}
      <TouchableWithoutFeedback onPress={toggleChildMouth}>
        <Image
          source={getChildImage()}
          style={isChewing ? styles.childChewing : styles.child}
        />
      </TouchableWithoutFeedback>

      {/* Current plate */}
      {!allFoodEaten && (
        <Animated.View
          style={[
            styles.plateContainer,
            { transform: [{ translateX: currentPlateX }] }
          ]}
        >
          <Image source={require('./EatGame/Plate.png')} style={styles.plate} />
          <Animated.View
            style={[
              getDraggableContainerStyle(),
              {
                opacity: foodOpacity,
                transform: [
                  { translateX: foodPosition.x },
                  { translateY: foodPosition.y }
                ]
              }
            ]}
            {...foodPanResponder.panHandlers}
          >
            <Image
              source={getCurrentFoodImage()}
              style={getFoodStyle()}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* Next plate (prepared off-screen) - only show if not last stage */}
      {displayedNextStage.current < stages.length && !allFoodEaten && (
        <Animated.View
          style={[
            styles.plateContainer,
            { transform: [{ translateX: nextPlateX }] }
          ]}
        >
          <Image source={require('./EatGame/Plate.png')} style={styles.plate} />
          <View style={getNextDraggableContainerStyle()}>
            <Image
              source={getNextPlateImage()}
              style={getNextFoodStyle()}
            />
          </View>
        </Animated.View>
      )}

      {/* Completion message */}
      {allFoodEaten && (
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
  child: { 
    position: 'absolute', 
    top: '32%', 
    left: '0%', 
    width: '100%', 
    height: '50%', 
    resizeMode: 'contain' 
  },
  childChewing: {
    position: 'absolute', 
    top: '32%', 
    left: '0%', 
    width: '100%', 
    height: '50%', 
    resizeMode: 'cover'
  },
  plateContainer: { 
    position: 'absolute',
    bottom: '-2%',
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    height: 250
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
    zIndex: 20 
  },
  draggableChickenContainer: { 
    position: 'absolute', 
    bottom: '8%', 
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 
  },
  draggableVegiContainer: { 
    position: 'absolute', 
    bottom: '8%', 
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 
  },
  draggableWaterContainer: { 
    position: 'absolute', 
    bottom: '8%', 
    width: 200, 
    height: 150, 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 20 
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
  waterImage: { 
    bottom: '38%', 
    left: '6%', 
    width: 320, 
    height: 200, 
    resizeMode: 'contain' 
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