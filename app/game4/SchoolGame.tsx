// app/game4/SchoolGame.tsx
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SchoolGame() {
  const router = useRouter();
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const cabinetOpacity = useRef(new Animated.Value(1)).current;
  const cabinet1Opacity = useRef(new Animated.Value(0)).current;

  const poloshirtX = useRef(new Animated.Value(0)).current;
  const poloshirtY = useRef(new Animated.Value(0)).current;
  const vestX = useRef(new Animated.Value(0)).current;
  const vestY = useRef(new Animated.Value(0)).current;
  const pantsX = useRef(new Animated.Value(0)).current;
  const pantsY = useRef(new Animated.Value(0)).current;
  const shoesX = useRef(new Animated.Value(0)).current;
  const shoesY = useRef(new Animated.Value(0)).current;

  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Opacity for School images
  const school1Opacity = useRef(new Animated.Value(1)).current;
  const school2Opacity = useRef(new Animated.Value(0)).current;
  const school3Opacity = useRef(new Animated.Value(0)).current;
  const school4Opacity = useRef(new Animated.Value(0)).current;
  const school5Opacity = useRef(new Animated.Value(0)).current;
  const school6Opacity = useRef(new Animated.Value(0)).current;

  // Opacity for draggable items
  const poloshirtOpacity = useRef(new Animated.Value(1)).current;
  const vestOpacity = useRef(new Animated.Value(1)).current;
  const pantsOpacity = useRef(new Animated.Value(1)).current;
  const shoesOpacity = useRef(new Animated.Value(1)).current;

  // Pulse animation for poloshirt and vest
  const poloshirtPulseAnim = useRef(new Animated.Value(1)).current;
  const vestPulseAnim = useRef(new Animated.Value(1)).current;
  const poloshirtPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const vestPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Track which items have been placed
  const [vestPlaced, setVestPlaced] = useState(false);
  const [pantsPlaced, setPantsPlaced] = useState(false);
  const [shoesPlaced, setShoesPlaced] = useState(false);
  const [poloshirtPlaced, setPoloshirtPlaced] = useState(false);
  const [vestPlacedOnSchool2, setVestPlacedOnSchool2] = useState(false);

  // Track current position values
  const poloshirtX_value = useRef(0);
  const poloshirtY_value = useRef(0);
  const vestX_value = useRef(0);
  const vestY_value = useRef(0);
  const pantsX_value = useRef(0);
  const pantsY_value = useRef(0);
  const shoesX_value = useRef(0);
  const shoesY_value = useRef(0);

  // Listen to animated value changes
  useEffect(() => {
    const poloshirtXListener = poloshirtX.addListener(({ value }) => { poloshirtX_value.current = value; });
    const poloshirtYListener = poloshirtY.addListener(({ value }) => { poloshirtY_value.current = value; });
    const vestXListener = vestX.addListener(({ value }) => { vestX_value.current = value; });
    const vestYListener = vestY.addListener(({ value }) => { vestY_value.current = value; });
    const pantsXListener = pantsX.addListener(({ value }) => { pantsX_value.current = value; });
    const pantsYListener = pantsY.addListener(({ value }) => { pantsY_value.current = value; });
    const shoesXListener = shoesX.addListener(({ value }) => { shoesX_value.current = value; });
    const shoesYListener = shoesY.addListener(({ value }) => { shoesY_value.current = value; });

    return () => {
      poloshirtX.removeListener(poloshirtXListener);
      poloshirtY.removeListener(poloshirtYListener);
      vestX.removeListener(vestXListener);
      vestY.removeListener(vestYListener);
      pantsX.removeListener(pantsXListener);
      pantsY.removeListener(pantsYListener);
      shoesX.removeListener(shoesXListener);
      shoesY.removeListener(shoesYListener);
    };
  }, []);

  // Start pulsing poloshirt when vest, pants, or shoes is placed on School1
  useEffect(() => {
    if ((vestPlaced || pantsPlaced || shoesPlaced) && !poloshirtPlaced) {
      startPoloshirtPulse();
    }
  }, [vestPlaced, pantsPlaced, shoesPlaced, poloshirtPlaced]);

  // Start pulsing vest when pants or shoes is placed on School2
  useEffect(() => {
    if ((pantsPlaced || shoesPlaced) && poloshirtPlaced && !vestPlacedOnSchool2) {
      startVestPulse();
    }
  }, [pantsPlaced, shoesPlaced, poloshirtPlaced, vestPlacedOnSchool2]);

  const startPoloshirtPulse = () => {
    if (poloshirtPulseAnimationRef.current) {
      poloshirtPulseAnimationRef.current.stop();
    }

    poloshirtPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(poloshirtPulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(poloshirtPulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ])
    );

    poloshirtPulseAnimationRef.current.start();
  };

  const stopPoloshirtPulse = () => {
    if (poloshirtPulseAnimationRef.current) {
      poloshirtPulseAnimationRef.current.stop();
      poloshirtPulseAnimationRef.current = null;
    }
    Animated.timing(poloshirtPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const startVestPulse = () => {
    if (vestPulseAnimationRef.current) {
      vestPulseAnimationRef.current.stop();
    }

    vestPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(vestPulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(vestPulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ])
    );

    vestPulseAnimationRef.current.start();
  };

  const stopVestPulse = () => {
    if (vestPulseAnimationRef.current) {
      vestPulseAnimationRef.current.stop();
      vestPulseAnimationRef.current = null;
    }
    Animated.timing(vestPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  // Check if item is on School1 (boy position)
  const checkCollisionWithBoy = (itemX: number, itemY: number, itemSize: number): boolean => {
    const boyLeft = SCREEN_WIDTH * 1 - 5 - (SCREEN_WIDTH * 0.4); // right: -5 converted to left
    const boyTop = SCREEN_HEIGHT - 85 - (SCREEN_HEIGHT * 0.4); // bottom: 85 converted to top
    const boyWidth = SCREEN_WIDTH * 0.4;
    const boyHeight = SCREEN_HEIGHT * 0.4;

    const itemLeft = itemX;
    const itemRight = itemX + itemSize;
    const itemTop = itemY;
    const itemBottom = itemY + itemSize;

    const boyRight = boyLeft + boyWidth;
    const boyBottom = boyTop + boyHeight;

    return !(itemRight < boyLeft || itemLeft > boyRight || itemBottom < boyTop || itemTop > boyBottom);
  };

  // Check if item is on School2 (boy2 position)
  const checkCollisionWithBoy2 = (itemX: number, itemY: number, itemSize: number): boolean => {
    const boy2Left = SCREEN_WIDTH * 1 - 5 - (SCREEN_WIDTH * 0.4); // right: -5 converted to left
    const boy2Top = SCREEN_HEIGHT - 80 - (SCREEN_HEIGHT * 0.4 + 5); // bottom: 80 converted to top
    const boy2Width = SCREEN_WIDTH * 0.4;
    const boy2Height = SCREEN_HEIGHT * 0.4 + 5;

    const itemLeft = itemX;
    const itemRight = itemX + itemSize;
    const itemTop = itemY;
    const itemBottom = itemY + itemSize;

    const boy2Right = boy2Left + boy2Width;
    const boy2Bottom = boy2Top + boy2Height;

    return !(itemRight < boy2Left || itemLeft > boy2Right || itemBottom < boy2Top || itemTop > boy2Bottom);
  };

  const handleCabinetClick = () => {
    setCabinetOpen(!cabinetOpen);
    Animated.parallel([
      Animated.timing(cabinetOpacity, { toValue: cabinetOpen ? 1 : 0, duration: 300, useNativeDriver: false }),
      Animated.timing(cabinet1Opacity, { toValue: cabinetOpen ? 0 : 1, duration: 300, useNativeDriver: false })
    ]).start();
  };

  const makePanResponder = (itemType: string, x: Animated.Value, y: Animated.Value) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(itemType);
        x.setOffset((x as any)._value);
        y.setOffset((y as any)._value);
        x.setValue(0);
        y.setValue(0);

        // If poloshirt is being dragged, show School2 at 80% and hide School1
        if (itemType === 'poloshirt' && !poloshirtPlaced) {
          Animated.parallel([
            Animated.timing(school2Opacity, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(school1Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }

        // If vest is being dragged (after poloshirt placed), show School3 at 80% and hide School2
        if (itemType === 'vest' && poloshirtPlaced && !vestPlacedOnSchool2) {
          Animated.parallel([
            Animated.timing(school3Opacity, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(school2Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
      onPanResponderMove: Animated.event([null, { dx: x, dy: y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        x.flattenOffset();
        y.flattenOffset();

        // Get item position
        const itemPosition = itemPositions[itemType as keyof typeof itemPositions];
        let currentX = 0;
        let currentY = 0;

        if (itemType === 'poloshirt') {
          currentX = itemPosition.left + poloshirtX_value.current;
          currentY = itemPosition.top + poloshirtY_value.current;
        } else if (itemType === 'vest') {
          currentX = itemPosition.left + vestX_value.current;
          currentY = itemPosition.top + vestY_value.current;
        } else if (itemType === 'pants') {
          currentX = itemPosition.left + pantsX_value.current;
          currentY = itemPosition.top + pantsY_value.current;
        } else if (itemType === 'shoes') {
          currentX = itemPosition.left + shoesX_value.current;
          currentY = itemPosition.top + shoesY_value.current;
        }

        const isOnBoy = checkCollisionWithBoy(currentX, currentY, itemPosition.size);
        const isOnBoy2 = checkCollisionWithBoy2(currentX, currentY, itemPosition.size);

        if (isOnBoy) {
          // Item placed on School1
          if (itemType === 'vest' && !vestPlaced) {
            setVestPlaced(true);
          } else if (itemType === 'pants' && !pantsPlaced) {
            setPantsPlaced(true);
          } else if (itemType === 'shoes' && !shoesPlaced) {
            setShoesPlaced(true);
          } else if (itemType === 'poloshirt' && !poloshirtPlaced) {
            setPoloshirtPlaced(true);
            stopPoloshirtPulse();

            // Transition: School2 to 100%, Poloshirt fades out smoothly
            Animated.parallel([
              Animated.timing(school2Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(poloshirtOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start();
          }
        } else if (isOnBoy2 && poloshirtPlaced) {
          // Item placed on School2
          if (itemType === 'vest' && !vestPlacedOnSchool2) {
            setVestPlacedOnSchool2(true);
            stopVestPulse();

            // Transition: School3 to 100%, School2 and Vest fade out smoothly
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(school2Opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(vestOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start();
          } else if (itemType === 'pants' && !pantsPlaced) {
            setPantsPlaced(true);
          } else if (itemType === 'shoes' && !shoesPlaced) {
            setShoesPlaced(true);
          }
        } else {
          // If poloshirt was being dragged but not placed, restore School1 and hide School2
          if (itemType === 'poloshirt' && !poloshirtPlaced) {
            Animated.parallel([
              Animated.timing(school2Opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
              Animated.timing(school1Opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start();
          }
          
          // If vest was being dragged but not placed on School2, restore School2 and hide School3
          if (itemType === 'vest' && poloshirtPlaced && !vestPlacedOnSchool2) {
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
              Animated.timing(school2Opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start();
          }
        }

        Animated.spring(x, { toValue: 0, useNativeDriver: false, friction: 8, tension: 40 }).start();
        Animated.spring(y, { toValue: 0, useNativeDriver: false, friction: 8, tension: 40 }).start();
        setIsDragging(null);
      },
      onPanResponderTerminate: () => { 
        setIsDragging(null);
        
        // If poloshirt drag was terminated, restore School1 and hide School2
        if (itemType === 'poloshirt' && !poloshirtPlaced) {
          Animated.parallel([
            Animated.timing(school2Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(school1Opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }
        
        // If vest drag was terminated, restore School2 and hide School3
        if (itemType === 'vest' && poloshirtPlaced && !vestPlacedOnSchool2) {
          Animated.parallel([
            Animated.timing(school3Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(school2Opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    });

  const poloshirtPan = makePanResponder('poloshirt', poloshirtX, poloshirtY);
  const vestPan = makePanResponder('vest', vestX, vestY);
  const pantsPan = makePanResponder('pants', pantsX, pantsY);
  const shoesPan = makePanResponder('shoes', shoesX, shoesY);

  const itemPositions = {
    poloshirt: { top: SCREEN_HEIGHT * 0.35, left: SCREEN_WIDTH * 0.20, size: 110 },
    vest: { top: SCREEN_HEIGHT * 0.35, left: SCREEN_WIDTH * 0.47, size: 110 },
    pants: { top: SCREEN_HEIGHT * 0.51, left: SCREEN_WIDTH * 0.20, size: 110 },
    shoes: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.50, size: 85 },
  };

  const renderDraggable = (name: string, source: any, x: Animated.Value, y: Animated.Value, pan: any, position: any, opacityAnim: Animated.Value, pulseAnim?: Animated.Value) => (
    <Animated.View
      {...pan.panHandlers}
      pointerEvents={isDragging && isDragging !== name ? 'none' : 'auto'}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: position.size,
        height: position.size,
        zIndex: isDragging === name ? 1000 : 1,
        transform: [
          { translateX: x }, 
          { translateY: y },
          { scale: pulseAnim || 1 }
        ],
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: opacityAnim,
      }}
    >
      <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Image source={require('./SchoolGame/SchoolBG2.png')} style={styles.bg} resizeMode="cover" />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cabinetContainer} onPress={handleCabinetClick} activeOpacity={1}>
        <Animated.Image source={require('./SchoolGame/Cabinet.png')} style={[styles.cabinet, { opacity: cabinetOpacity }]} resizeMode="contain" />
        <Animated.Image source={require('./SchoolGame/Cabinet1.png')} style={[styles.cabinet, { position: 'absolute', opacity: cabinet1Opacity }]} resizeMode="contain" />
      </TouchableOpacity>

      {cabinetOpen && (
        <View style={styles.cabinetContents} pointerEvents="box-none">
          {renderDraggable('poloshirt', require('./SchoolGame/Poloshirt.png'), poloshirtX, poloshirtY, poloshirtPan, itemPositions.poloshirt, poloshirtOpacity, poloshirtPulseAnim)}
          {renderDraggable('vest', require('./SchoolGame/Vest.png'), vestX, vestY, vestPan, itemPositions.vest, vestOpacity, vestPulseAnim)}
          {renderDraggable('pants', require('./SchoolGame/Pants.png'), pantsX, pantsY, pantsPan, itemPositions.pants, pantsOpacity)}
          {renderDraggable('shoes', require('./SchoolGame/Shoes.png'), shoesX, shoesY, shoesPan, itemPositions.shoes, shoesOpacity)}
        </View>
      )}

      <Animated.Image source={require('./SchoolGame/School1.png')} style={[styles.boy, { opacity: school1Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School2.png')} style={[styles.boy2, { opacity: school2Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School3.png')} style={[styles.boy3, { opacity: school3Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School4.png')} style={[styles.boy4, { opacity: school4Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School5.png')} style={[styles.boy5, { opacity: school5Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School6.gif')} style={[styles.boy6, { opacity: school6Opacity }]} resizeMode="contain"/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C8E6E2' },
  bg: { position: 'absolute', width: '100%', height: '100%' },
  backButton: { position: 'absolute', top: 40, left: 16, paddingBottom: 8, zIndex: 10 },
  backText: { fontSize: 20, color: '#244D4A', textDecorationLine: 'underline', fontWeight: '700' },
  cabinetContainer: { position: 'absolute', bottom: -85, left: -42, width: SCREEN_WIDTH * 0.95, height: SCREEN_HEIGHT * 1.0 },
  cabinet: { width: SCREEN_WIDTH * 0.95, height: SCREEN_HEIGHT * 1.0 },
  cabinetContents: { position: 'absolute', bottom: -85, left: -42, width: SCREEN_WIDTH * 0.95, height: SCREEN_HEIGHT * 1.0 },
  boy: { position: 'absolute', bottom: 85, right: -5, width: SCREEN_WIDTH * 0.4, height: SCREEN_HEIGHT * 0.4 },
  boy2: { position: 'absolute', bottom: 80, right: -5, width: SCREEN_WIDTH * 0.4, height: SCREEN_HEIGHT * 0.4 + 5 },
  boy3: { position: 'absolute', bottom: 77, right: -22, width: SCREEN_WIDTH * 0.5, height: SCREEN_HEIGHT * 0.4 + 6 },
  boy4: { position: 'absolute', bottom: 80, right: -20, width: SCREEN_WIDTH * 0.5, height: SCREEN_HEIGHT * 0.4 + 6 },
  boy5: { position: 'absolute', bottom: 80, right: -24, width: SCREEN_WIDTH * 0.5, height: SCREEN_HEIGHT * 0.4 + 3 },
  boy6: { position: 'absolute', bottom: -60, right: -33, width: SCREEN_WIDTH * 0.7, height: SCREEN_HEIGHT * 0.8 + -1 },
});