import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EatingGame = () => {
  const [currentStage, setCurrentStage] = useState(0); // 0: Rice, 1: Chicken, 2: Vegi
  const [childMouth, setChildMouth] = useState('closed'); // 'closed', 'open'
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

  const stages = [
    { id: 0, name: 'Rice', image: require('./EatGame/Rice.png') },
    { id: 1, name: 'Chicken', image: require('./EatGame/Chicken.png') },
    { id: 2, name: 'Vegi', image: require('./EatGame/Vegi.png') }
  ];

  useEffect(() => {
    // Preload all images
    Asset.loadAsync([
      require('./EatGame/EatBG.png'),
      require('./EatGame/Eat1.png'),
      require('./EatGame/Eat2.png'),
      require('./EatGame/Plate.png'),
      require('./EatGame/Rice.png'),
      require('./EatGame/Chicken.png'),
      require('./EatGame/Vegi.png'),
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

      // Slide current plate out to the left
      Animated.timing(currentPlateX, {
        toValue: -SCREEN_WIDTH,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        // Get the current value of nextPlateX for the swap
        nextPlateX.extractOffset(); // Get the current animated value
        
        const nextStage = currentStage + 1;
        if (nextStage < stages.length) {
          // Swap animation values
          currentPlateX.setValue(SCREEN_WIDTH);
          nextPlateX.setValue(0);
          
          // Reset next plate position for future use
          const tempNextPlateX = new Animated.Value(SCREEN_WIDTH);
          
          // Update stage and reset food
          setCurrentStage(nextStage);
          resetFoodState();
          
          // Update the next plate reference
          requestAnimationFrame(() => {
            isEatingSequence.current = false;
          });
        } else {
          // All food eaten
          setAllFoodEaten(true);
          isEatingSequence.current = false;
          setTimeout(() => {
            router.back();
          }, 1500);
        }
      });
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
    if (childMouth === 'open') return require('./EatGame/Eat2.png');
    return require('./EatGame/Eat1.png');
  };

  const getCurrentFoodImage = () => {
    return stages[currentStage].image;
  };

  const getFoodStyle = () => {
    switch(currentStage) {
      case 0: return styles.riceImage;
      case 1: return styles.chickenImage;
      case 2: return styles.vegiImage;
      default: return styles.riceImage;
    }
  };

  const getDraggableContainerStyle = () => {
    switch(currentStage) {
      case 0: return styles.draggableRiceContainer;
      case 1: return styles.draggableChickenContainer;
      case 2: return styles.draggableVegiContainer;
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
      <Image source={getChildImage()} style={styles.child} />

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
      {currentStage < stages.length - 1 && !allFoodEaten && (
        <Animated.View
          style={[
            styles.plateContainer,
            { transform: [{ translateX: nextPlateX }] }
          ]}
        >
          <Image source={require('./EatGame/Plate.png')} style={styles.plate} />
          <View style={getDraggableContainerStyle()}>
            <Image
              source={stages[currentStage + 1].image}
              style={currentStage === 0 ? styles.chickenImage : styles.vegiImage}
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
    top: '32.1%', 
    left: '2%', 
    width: '100%', 
    height: '50%', 
    resizeMode: 'contain' 
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