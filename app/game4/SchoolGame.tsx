// app/game4/SchoolGame.tsx
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const tumblerX = useRef(new Animated.Value(0)).current;
  const tumblerY = useRef(new Animated.Value(0)).current;
  const notebookX = useRef(new Animated.Value(0)).current;
  const notebookY = useRef(new Animated.Value(0)).current;
  const pouchX = useRef(new Animated.Value(0)).current;
  const pouchY = useRef(new Animated.Value(0)).current;
  const lunchboxX = useRef(new Animated.Value(0)).current;
  const lunchboxY = useRef(new Animated.Value(0)).current;

  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [gifKey, setGifKey] = useState(0);
  const [bagClicked, setBagClicked] = useState(false);

  // Bag animation values
  const bagScale = useRef(new Animated.Value(1)).current;
  const bagOpacity = useRef(new Animated.Value(1)).current;
  const bag1Opacity = useRef(new Animated.Value(0)).current;
  const bagVisibility = useRef(new Animated.Value(0)).current; // Controls when bag appears

  // Opacity for School images
  const school1Opacity = useRef(new Animated.Value(1)).current;
  const school2Opacity = useRef(new Animated.Value(0)).current;
  const school3Opacity = useRef(new Animated.Value(0)).current;
  const school4Opacity = useRef(new Animated.Value(0)).current;
  const school5Opacity = useRef(new Animated.Value(0)).current;
  const school6Opacity = useRef(new Animated.Value(0.001)).current; // Pre-load gif
  const school7Opacity = useRef(new Animated.Value(0)).current;

  // Background animation values
  const schoolBG2TranslateX = useRef(new Animated.Value(0)).current;
  const schoolBG4TranslateX = useRef(new Animated.Value(SCREEN_WIDTH)).current; // Start off-screen to the right
  const schoolBG4Opacity = useRef(new Animated.Value(1)).current;
  const cabinetContainerOpacity = useRef(new Animated.Value(1)).current;

  // Opacity for draggable items
  const poloshirtOpacity = useRef(new Animated.Value(1)).current;
  const vestOpacity = useRef(new Animated.Value(1)).current;
  const pantsOpacity = useRef(new Animated.Value(1)).current;
  const shoesOpacity = useRef(new Animated.Value(1)).current;
  const tumblerOpacity = useRef(new Animated.Value(1)).current;
  const tumbler1Opacity = useRef(new Animated.Value(0)).current;
  const notebookOpacity = useRef(new Animated.Value(1)).current;
  const notebook1Opacity = useRef(new Animated.Value(0)).current;
  const pouchOpacity = useRef(new Animated.Value(1)).current;
  const pouch1Opacity = useRef(new Animated.Value(0)).current;
  const lunchboxOpacity = useRef(new Animated.Value(1)).current;
  const lunchbox1Opacity = useRef(new Animated.Value(0)).current;

  // Pulse animation for all clothing items
  const poloshirtPulseAnim = useRef(new Animated.Value(1)).current;
  const vestPulseAnim = useRef(new Animated.Value(1)).current;
  const pantsPulseAnim = useRef(new Animated.Value(1)).current;
  const shoesPulseAnim = useRef(new Animated.Value(1)).current;
  const tumblerPulseAnim = useRef(new Animated.Value(1)).current;
  const notebookPulseAnim = useRef(new Animated.Value(1)).current;
  const pouchPulseAnim = useRef(new Animated.Value(1)).current;
  const lunchboxPulseAnim = useRef(new Animated.Value(1)).current;
  const poloshirtPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const vestPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pantsPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const shoesPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const tumblerPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const notebookPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pouchPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const lunchboxPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Track which items have been placed
  const [vestPlaced, setVestPlaced] = useState(false);
  const [pantsPlaced, setPantsPlaced] = useState(false);
  const [shoesPlaced, setShoesPlaced] = useState(false);
  const [poloshirtPlaced, setPoloshirtPlaced] = useState(false);
  const [tumblerPlaced, setTumblerPlaced] = useState(false);
  const [tumblerPlacedInBag, setTumblerPlacedInBag] = useState(false);
  const [vestPlacedOnSchool2, setVestPlacedOnSchool2] = useState(false);
  const [tumblerDraggedOut, setTumblerDraggedOut] = useState(false);
  const [notebookDraggedOut, setNotebookDraggedOut] = useState(false);
  const [pouchDraggedOut, setPouchDraggedOut] = useState(false);
  const [lunchboxDraggedOut, setLunchboxDraggedOut] = useState(false);

  // Track current position values
  const poloshirtX_value = useRef(0);
  const poloshirtY_value = useRef(0);
  const vestX_value = useRef(0);
  const vestY_value = useRef(0);
  const pantsX_value = useRef(0);
  const pantsY_value = useRef(0);
  const shoesX_value = useRef(0);
  const shoesY_value = useRef(0);
  const tumblerX_value = useRef(0);
  const tumblerY_value = useRef(0);
  const notebookX_value = useRef(0);
  const notebookY_value = useRef(0);
  const pouchX_value = useRef(0);
  const pouchY_value = useRef(0);
  const lunchboxX_value = useRef(0);
  const lunchboxY_value = useRef(0);

  // Dynamic zIndex for bag based on School6 visibility
  const [bagZIndex, setBagZIndex] = useState(1050);
  
  // Update bag zIndex when School6 opacity changes
  useEffect(() => {
    const listener = school6Opacity.addListener(({ value }) => {
      // When School6 is visible (opacity > 0.5), lower bag zIndex so School6 appears in front
      if (value > 0.5) {
        setBagZIndex(900); // Lower than School6
      } else {
        setBagZIndex(1050); // Normal zIndex behind School5
      }
    });
    
    return () => school6Opacity.removeListener(listener);
  }, []);
  useEffect(() => {
    const poloshirtXListener = poloshirtX.addListener(({ value }) => { poloshirtX_value.current = value; });
    const poloshirtYListener = poloshirtY.addListener(({ value }) => { poloshirtY_value.current = value; });
    const vestXListener = vestX.addListener(({ value }) => { vestX_value.current = value; });
    const vestYListener = vestY.addListener(({ value }) => { vestY_value.current = value; });
    const pantsXListener = pantsX.addListener(({ value }) => { pantsX_value.current = value; });
    const pantsYListener = pantsY.addListener(({ value }) => { pantsY_value.current = value; });
    const shoesXListener = shoesX.addListener(({ value }) => { shoesX_value.current = value; });
    const shoesYListener = shoesY.addListener(({ value }) => { shoesY_value.current = value; });
    const tumblerXListener = tumblerX.addListener(({ value }) => { tumblerX_value.current = value; });
    const tumblerYListener = tumblerY.addListener(({ value }) => { tumblerY_value.current = value; });
    const notebookXListener = notebookX.addListener(({ value }) => { notebookX_value.current = value; });
    const notebookYListener = notebookY.addListener(({ value }) => { notebookY_value.current = value; });
    const pouchXListener = pouchX.addListener(({ value }) => { pouchX_value.current = value; });
    const pouchYListener = pouchY.addListener(({ value }) => { pouchY_value.current = value; });
    const lunchboxXListener = lunchboxX.addListener(({ value }) => { lunchboxX_value.current = value; });
    const lunchboxYListener = lunchboxY.addListener(({ value }) => { lunchboxY_value.current = value; });

    return () => {
      poloshirtX.removeListener(poloshirtXListener);
      poloshirtY.removeListener(poloshirtYListener);
      vestX.removeListener(vestXListener);
      vestY.removeListener(vestYListener);
      pantsX.removeListener(pantsXListener);
      pantsY.removeListener(pantsYListener);
      shoesX.removeListener(shoesXListener);
      shoesY.removeListener(shoesYListener);
      tumblerX.removeListener(tumblerXListener);
      tumblerY.removeListener(tumblerYListener);
      notebookX.removeListener(notebookXListener);
      notebookY.removeListener(notebookYListener);
      pouchX.removeListener(pouchXListener);
      pouchY.removeListener(pouchYListener);
      lunchboxX.removeListener(lunchboxXListener);
      lunchboxY.removeListener(lunchboxYListener);
    };
  }, []);

  // Proper sequence: poloshirt → vest → pants → shoes
  useEffect(() => {
    // Start with poloshirt pulsing when game begins (no items placed yet)
    if (!poloshirtPlaced && !vestPlacedOnSchool2 && !pantsPlaced && !shoesPlaced) {
      startPoloshirtPulse();
    }
  }, []);

  // After poloshirt is placed, start vest pulsing
  useEffect(() => {
    if (poloshirtPlaced && !vestPlacedOnSchool2) {
      startVestPulse();
    }
  }, [poloshirtPlaced, vestPlacedOnSchool2]);

  // After vest is placed, start pants pulsing
  useEffect(() => {
    console.log(`Pants pulse check: poloshirt=${poloshirtPlaced}, vest=${vestPlacedOnSchool2}, pants=${pantsPlaced}`);
    if (poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
      console.log('Starting pants pulse');
      startPantsPulse();
    }
  }, [poloshirtPlaced, vestPlacedOnSchool2, pantsPlaced]);

  // After pants is placed, start shoes pulsing
  useEffect(() => {
    console.log(`Shoes pulse check: poloshirt=${poloshirtPlaced}, vest=${vestPlacedOnSchool2}, pants=${pantsPlaced}, shoes=${shoesPlaced}`);
    if (poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced) {
      console.log('Starting shoes pulse');
      startShoesPulse();
    }
  }, [poloshirtPlaced, vestPlacedOnSchool2, pantsPlaced, shoesPlaced]);

  // Start all bag items pulsing when bag is opened
  useEffect(() => {
    if (bagClicked) {
      startTumblerPulse();
      startNotebookPulse();
      startPouchPulse();
      startLunchboxPulse();
    } else {
      stopTumblerPulse();
      stopNotebookPulse();
      stopPouchPulse();
      stopLunchboxPulse();
    }
  }, [bagClicked]);

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

  const startPantsPulse = () => {
    if (pantsPulseAnimationRef.current) {
      pantsPulseAnimationRef.current.stop();
    }

    pantsPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pantsPulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(pantsPulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ])
    );

    pantsPulseAnimationRef.current.start();
  };

  const stopPantsPulse = () => {
    if (pantsPulseAnimationRef.current) {
      pantsPulseAnimationRef.current.stop();
      pantsPulseAnimationRef.current = null;
    }
    Animated.timing(pantsPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const startShoesPulse = () => {
    if (shoesPulseAnimationRef.current) {
      shoesPulseAnimationRef.current.stop();
    }

    shoesPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shoesPulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(shoesPulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ])
    );

    shoesPulseAnimationRef.current.start();
  };

  const stopShoesPulse = () => {
    if (shoesPulseAnimationRef.current) {
      shoesPulseAnimationRef.current.stop();
      shoesPulseAnimationRef.current = null;
    }
    Animated.timing(shoesPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const startTumblerPulse = () => {
    if (tumblerPulseAnimationRef.current) {
      tumblerPulseAnimationRef.current.stop();
    }

    tumblerPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(tumblerPulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(tumblerPulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );

    tumblerPulseAnimationRef.current.start();
  };

  const stopTumblerPulse = () => {
    if (tumblerPulseAnimationRef.current) {
      tumblerPulseAnimationRef.current.stop();
      tumblerPulseAnimationRef.current = null;
    }
    Animated.timing(tumblerPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const startNotebookPulse = () => {
    if (notebookPulseAnimationRef.current) {
      notebookPulseAnimationRef.current.stop();
    }
    notebookPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(notebookPulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(notebookPulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );
    notebookPulseAnimationRef.current.start();
  };
  const stopNotebookPulse = () => {
    if (notebookPulseAnimationRef.current) {
      notebookPulseAnimationRef.current.stop();
      notebookPulseAnimationRef.current = null;
    }
    Animated.timing(notebookPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const startPouchPulse = () => {
    if (pouchPulseAnimationRef.current) {
      pouchPulseAnimationRef.current.stop();
    }
    pouchPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pouchPulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(pouchPulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );
    pouchPulseAnimationRef.current.start();
  };
  const stopPouchPulse = () => {
    if (pouchPulseAnimationRef.current) {
      pouchPulseAnimationRef.current.stop();
      pouchPulseAnimationRef.current = null;
    }
    Animated.timing(pouchPulseAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const startLunchboxPulse = () => {
    if (lunchboxPulseAnimationRef.current) {
      lunchboxPulseAnimationRef.current.stop();
    }
    lunchboxPulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(lunchboxPulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(lunchboxPulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ])
    );
    lunchboxPulseAnimationRef.current.start();
  };
  const stopLunchboxPulse = () => {
    if (lunchboxPulseAnimationRef.current) {
      lunchboxPulseAnimationRef.current.stop();
      lunchboxPulseAnimationRef.current = null;
    }
    Animated.timing(lunchboxPulseAnim, {
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

  // Check if tumbler is on Tumbler1 position in bag
  const checkCollisionWithTumbler1 = (itemX: number, itemY: number): boolean => {
    // Simplified collision: large area on the left side of the screen when bag is open
    // Make it easy to hit for testing - cover full screen height and wider area
    const tumbler1Left = 0; // Left edge of screen
    const tumbler1Top = 0; // Top of screen
    const tumbler1Width = SCREEN_WIDTH * 0.6; // Left 60% of screen width (wider)
    const tumbler1Height = SCREEN_HEIGHT; // Full screen height

    const itemLeft = itemX;
    const itemRight = itemX + 70; // tumbler size
    const itemTop = itemY;
    const itemBottom = itemY + 70;

    const tumbler1Right = tumbler1Left + tumbler1Width;
    const tumbler1Bottom = tumbler1Top + tumbler1Height;

    const isColliding = !(itemRight < tumbler1Left || itemLeft > tumbler1Right || itemBottom < tumbler1Top || itemTop > tumbler1Bottom);
    
    // Debug collision detection
    console.log('Extra Wide Collision Debug:');
    console.log(`Item: x=${itemX}, y=${itemY}, right=${itemRight}, bottom=${itemBottom}`);
    console.log(`Tumbler1 EXTRA WIDE: left=${tumbler1Left}, top=${tumbler1Top}, right=${tumbler1Right}, bottom=${tumbler1Bottom}`);
    console.log(`X check: ${itemLeft} >= ${tumbler1Left} && ${itemRight} <= ${tumbler1Right} = ${itemLeft >= tumbler1Left && itemRight <= tumbler1Right}`);
    console.log(`Collision result: ${isColliding}`);
    
    return isColliding;
  };

  // Check collisions for other bag items (using right side of screen for now)
  const checkCollisionWithNotebook1 = (itemX: number, itemY: number): boolean => {
    const notebook1Left = SCREEN_WIDTH * 0.3;
    const notebook1Width = SCREEN_WIDTH * 0.7;
    const itemRight = itemX + 70;
    return itemX >= notebook1Left && itemRight <= (notebook1Left + notebook1Width);
  };

  const checkCollisionWithPouch1 = (itemX: number, itemY: number): boolean => {
    const pouch1Left = SCREEN_WIDTH * 0.3;
    const pouch1Width = SCREEN_WIDTH * 0.7;
    const itemRight = itemX + 70;
    return itemX >= pouch1Left && itemRight <= (pouch1Left + pouch1Width);
  };

  const checkCollisionWithLunchbox1 = (itemX: number, itemY: number): boolean => {
    const lunchbox1Left = SCREEN_WIDTH * 0.3; // Start at 30% instead of 40%
    const lunchbox1Width = SCREEN_WIDTH * 0.7; // Cover 70% of screen width
    const itemRight = itemX + 70;
    const isColliding = itemX >= lunchbox1Left && itemRight <= (lunchbox1Left + lunchbox1Width);
    
    // Debug lunchbox collision
    console.log('Lunchbox Collision Debug:');
    console.log(`Item: x=${itemX}, right=${itemRight}`);
    console.log(`Lunchbox1 area: left=${lunchbox1Left}, right=${lunchbox1Left + lunchbox1Width}`);
    console.log(`Collision result: ${isColliding}`);
    
    return isColliding;
  };

  const handleBagClick = () => {
    console.log('Bag clicked!', bagClicked);
    if (bagClicked) return;
    setBagClicked(true);
    
    // Zoom in animation
    Animated.sequence([
      Animated.timing(bagScale, {
        toValue: 1.3,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.timing(bagOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(bag1Opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      console.log('Bag animation completed');
    });
  };

  const handleBagDialogClose = () => {
    console.log('Bag dialog closing');
    // Close bag dialog and return to Bag.png
    Animated.parallel([
      Animated.timing(bag1Opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(bagOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(bagScale, {
        toValue: 1,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setBagClicked(false);
      console.log('Bag dialog closed');
    });
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
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // For tumbler, always capture the touch immediately
        if (itemType === 'tumbler') {
          return true;
        }
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // For tumbler, activate pan immediately - no movement threshold needed
        if (itemType === 'tumbler') {
          return true;
        }
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt, gestureState) => {
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

        // If vest is being dragged (after poloshirt placed), show School3 at 80% and hide School2 (don't fade vest yet)
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

        // If vest is being dragged (after poloshirt placed), show School3 at 80% and hide School2 (don't fade vest yet)
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

        // If pants is being dragged (after vest placed), show School4 at 80% and hide School3
        if (itemType === 'pants' && poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
          Animated.parallel([
            Animated.timing(school4Opacity, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(school3Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }

        // If shoes is being dragged (after pants placed), show School5 at 80% and hide School4
        if (itemType === 'shoes' && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced) {
          Animated.parallel([
            Animated.timing(school5Opacity, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(school4Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }
        
        // If tumbler is being dragged, show Tumbler1 at 50% opacity as preview
        if (itemType === 'tumbler' && !tumblerPlacedInBag) {
          Animated.timing(tumbler1Opacity, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
        
        // If notebook is being dragged, show Notebook1 at 50% opacity as preview
        if (itemType === 'notebook' && !notebookDraggedOut) {
          Animated.timing(notebook1Opacity, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
        
        // If pouch is being dragged, show Pouch1 at 50% opacity as preview
        if (itemType === 'pouch' && !pouchDraggedOut) {
          Animated.timing(pouch1Opacity, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
        
        // If lunchbox is being dragged, show Lunchbox1 at 50% opacity as preview
        if (itemType === 'lunchbox' && !lunchboxDraggedOut) {
          console.log('Starting lunchbox drag - showing preview');
          Animated.timing(lunchbox1Opacity, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: false,
          }).start();
        }
        
        // If bag items are being dragged, show them as dragged out
        // Removed for static bag items
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
        } else if (itemType === 'tumbler') {
          // Tumbler is inside the bag container, calculate position relative to screen
          const containerCenterX = SCREEN_WIDTH / 2;
          const containerCenterY = SCREEN_HEIGHT * 0.1 + (SCREEN_HEIGHT * 0.5);
          currentX = containerCenterX + tumblerX_value.current - 35;
          currentY = containerCenterY + tumblerY_value.current - 35;
          console.log(`Container center: x=${containerCenterX}, y=${containerCenterY}`);
          console.log(`Tumbler offset: x=${tumblerX_value.current}, y=${tumblerY_value.current}`);
        } else if (itemType === 'notebook') {
          const containerCenterX = SCREEN_WIDTH / 2;
          const containerCenterY = SCREEN_HEIGHT * 0.1 + (SCREEN_HEIGHT * 0.5);
          currentX = containerCenterX + notebookX_value.current - 35;
          currentY = containerCenterY + notebookY_value.current - 35;
        } else if (itemType === 'pouch') {
          const containerCenterX = SCREEN_WIDTH / 2;
          const containerCenterY = SCREEN_HEIGHT * 0.1 + (SCREEN_HEIGHT * 0.5);
          currentX = containerCenterX + pouchX_value.current - 35;
          currentY = containerCenterY + pouchY_value.current - 35;
        } else if (itemType === 'lunchbox') {
          const containerCenterX = SCREEN_WIDTH / 2;
          const containerCenterY = SCREEN_HEIGHT * 0.1 + (SCREEN_HEIGHT * 0.5);
          currentX = containerCenterX + lunchboxX_value.current - 35;
          currentY = containerCenterY + lunchboxY_value.current - 35;
        }
        // Removed bag item position logic for static items

        const isOnBoy = checkCollisionWithBoy(currentX, currentY, itemPosition.size);
        const isOnBoy2 = checkCollisionWithBoy2(currentX, currentY, itemPosition.size);
        const isOnTumbler1 = itemType === 'tumbler' ? checkCollisionWithTumbler1(currentX, currentY) : false;
        const isOnNotebook1 = itemType === 'notebook' ? checkCollisionWithNotebook1(currentX, currentY) : false;
        const isOnPouch1 = itemType === 'pouch' ? checkCollisionWithPouch1(currentX, currentY) : false;
        const isOnLunchbox1 = itemType === 'lunchbox' ? checkCollisionWithLunchbox1(currentX, currentY) : false;

        console.log(`Item: ${itemType}, currentX: ${currentX}, currentY: ${currentY}, isOnBoy: ${isOnBoy}, isOnBoy2: ${isOnBoy2}, isOnTumbler1: ${isOnTumbler1}, poloshirtPlaced: ${poloshirtPlaced}, vestPlacedOnSchool2: ${vestPlacedOnSchool2}, pantsPlaced: ${pantsPlaced}, shoesPlaced: ${shoesPlaced}`);

        if (itemType === 'tumbler') {
          console.log(`Tumbler collision check: currentX=${currentX}, currentY=${currentY}, isOnTumbler1=${isOnTumbler1}`);
          
          // Check if tumbler has been moved significantly (at least 30 pixels) to prevent accidental clicks
          const moveDistance = Math.sqrt(Math.pow(tumblerX_value.current, 2) + Math.pow(tumblerY_value.current, 2));
          console.log(`Tumbler move distance: ${moveDistance}`);
          
          if (moveDistance < 30) {
            console.log('Tumbler not moved enough - preventing placement');
            // Reset Tumbler1 preview if it was shown
            if ((tumbler1Opacity as any)._value > 0) {
              Animated.timing(tumbler1Opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }
            return; // Don't allow placement if not moved enough
          }
        }

        // Similar checks for other bag items
        if (itemType === 'notebook') {
          const moveDistance = Math.sqrt(Math.pow(notebookX_value.current, 2) + Math.pow(notebookY_value.current, 2));
          if (moveDistance < 30) {
            if ((notebook1Opacity as any)._value > 0) {
              Animated.timing(notebook1Opacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            }
            return;
          }
        }

        if (itemType === 'pouch') {
          const moveDistance = Math.sqrt(Math.pow(pouchX_value.current, 2) + Math.pow(pouchY_value.current, 2));
          if (moveDistance < 30) {
            if ((pouch1Opacity as any)._value > 0) {
              Animated.timing(pouch1Opacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            }
            return;
          }
        }

        if (itemType === 'lunchbox') {
          const moveDistance = Math.sqrt(Math.pow(lunchboxX_value.current, 2) + Math.pow(lunchboxY_value.current, 2));
          console.log(`Lunchbox move distance: ${moveDistance}, currentX: ${currentX}, currentY: ${currentY}, isOnLunchbox1: ${isOnLunchbox1}`);
          if (moveDistance < 30) {
            console.log('Lunchbox not moved enough');
            if ((lunchbox1Opacity as any)._value > 0) {
              Animated.timing(lunchbox1Opacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
            }
            return;
          }
        }

        if (isOnBoy) {
          // Item placed on School1
          if (itemType === 'vest' && !vestPlaced && poloshirtPlaced && !vestPlacedOnSchool2) {
            console.log('VEST PLACED ON SCHOOL1 - Starting School3 animation!');
            setVestPlacedOnSchool2(true);
            stopVestPulse();

            // Transition: School3 to 100%, Vest fades out smoothly (same as poloshirt logic)
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(vestOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Vest animation completed from School1');
            });
          } else if (itemType === 'vest' && !vestPlaced) {
            setVestPlaced(true);
          } else if (itemType === 'pants' && !pantsPlaced && poloshirtPlaced && vestPlacedOnSchool2) {
            console.log('PANTS PLACED ON SCHOOL1 - Starting School4 animation!');
            setPantsPlaced(true);
            stopPantsPulse();

            // Transition: School4 to 100%, Pants fades out smoothly (same as poloshirt/vest logic)
            Animated.parallel([
              Animated.timing(school4Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(pantsOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Pants animation completed from School1');
            });
          } else if (itemType === 'pants' && !pantsPlaced) {
            setPantsPlaced(true);
          } else if (itemType === 'shoes' && !shoesPlaced && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced) {
            console.log('SHOES PLACED ON SCHOOL1 - Starting School5 animation!');
            setShoesPlaced(true);
            stopShoesPulse();

            // Transition: School5 to 100%, Shoes fades out smoothly (same as other items logic)
            Animated.parallel([
              Animated.timing(school4Opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(school5Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(shoesOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Shoes animation completed from School1 - School5 should be at 100% opacity');
              
              // After 2 seconds, start School6 transition with background change
              setTimeout(() => {
                console.log('Starting School6 and background transition');
                
                // Force gif to restart by changing key
                setGifKey(prev => prev + 1);
                
                // Reset and immediately start School6 transition
                school6Opacity.setValue(0);
                
                // Smooth transition: School6 appears instantly when backgrounds start moving
                Animated.parallel([
                  // School5 fades out very quickly
                  Animated.timing(school5Opacity, {
                    toValue: 0,
                    duration: 150,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                  }),
                  // School6 appears instantly as School5 fades out - gif walking synced
                  Animated.timing(school6Opacity, {
                    toValue: 1,
                    duration: 150,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: false,
                  }),
                  // Background transition: SchoolBG2 slides left (8 seconds)
                  Animated.timing(schoolBG2TranslateX, {
                    toValue: -SCREEN_WIDTH,
                    duration: 8000,
                    useNativeDriver: false,
                  }),
                  // SchoolBG4 slides in from right (8 seconds)
                  Animated.timing(schoolBG4TranslateX, {
                    toValue: 0,
                    duration: 8000,
                    useNativeDriver: false,
                  }),
                ]).start(() => {
                  console.log('School6 and background transition completed in 8 seconds');
                  
                  // Hide cabinet now that we're fully on page 2
                  Animated.timing(cabinetContainerOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: false,
                  }).start();
                  
                  // Transition School6 back to School5 after background transition completes
                  Animated.parallel([
                    Animated.timing(school6Opacity, {
                      toValue: 0,
                      duration: 500,
                      useNativeDriver: false,
                    }),
                    Animated.timing(school5Opacity, {
                      toValue: 1,
                      duration: 500,
                      useNativeDriver: false,
                    }),
                    // Show bag when School5 appears
                    Animated.timing(bagVisibility, {
                      toValue: 1,
                      duration: 500,
                      useNativeDriver: false,
                    }),
                  ]).start(() => {
                    console.log('School6 to School5 transition completed - bag is now visible');
                  });
                });
              }, 2000);
            });
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
            console.log('VEST PLACED ON SCHOOL2 - Starting animation!');
            setVestPlacedOnSchool2(true);
            stopVestPulse();

            // Transition: School3 to 100%, Vest fades out smoothly (same as poloshirt logic)
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(vestOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Vest animation completed');
            });
          } else if (itemType === 'pants' && !pantsPlaced) {
            setPantsPlaced(true);
          }
        } else if (isOnBoy2 && poloshirtPlaced) {
          // Item placed on School1
          if (itemType === 'vest' && !vestPlaced && poloshirtPlaced && !vestPlacedOnSchool2) {
            console.log('VEST PLACED ON SCHOOL1 - Starting School3 animation!');
            setVestPlacedOnSchool2(true);
            stopVestPulse();

            // Transition: School3 to 100%, Vest fades out smoothly (same as poloshirt logic)
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(vestOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Vest animation completed from School1');
            });
          } else if (itemType === 'vest' && !vestPlaced) {
            setVestPlaced(true);
          } else if (itemType === 'pants' && !pantsPlaced && poloshirtPlaced && vestPlacedOnSchool2) {
            console.log('PANTS PLACED ON SCHOOL1 - Starting School4 animation!');
            setPantsPlaced(true);
            stopPantsPulse();

            // Transition: School4 to 100%, Pants fades out smoothly (same as poloshirt/vest logic)
            Animated.parallel([
              Animated.timing(school4Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(pantsOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Pants animation completed from School1');
            });
          } else if (itemType === 'pants' && !pantsPlaced) {
            setPantsPlaced(true);
          } else if (itemType === 'shoes' && !shoesPlaced && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced) {
            console.log('SHOES PLACED ON SCHOOL1 - Starting School5 animation!');
            setShoesPlaced(true);
            stopShoesPulse();

            // Transition: School5 to 100%, Shoes fades out smoothly (same as other items logic)
            Animated.parallel([
              Animated.timing(school4Opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(school5Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(shoesOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Shoes animation completed from School1 - School5 should be at 100% opacity');
              
              // After 2 seconds, start School6 transition with background change
              setTimeout(() => {
                console.log('Starting School6 and background transition');
                
                // Force gif to restart by changing key
                setGifKey(prev => prev + 1);
                
                // Reset and immediately start School6 transition
                school6Opacity.setValue(0);
                
                // Smooth transition: School6 appears instantly when backgrounds start moving
                Animated.parallel([
                  // School5 fades out very quickly
                  Animated.timing(school5Opacity, {
                    toValue: 0,
                    duration: 150,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: false,
                  }),
                  // School6 appears instantly as School5 fades out - gif walking synced
                  Animated.timing(school6Opacity, {
                    toValue: 1,
                    duration: 150,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: false,
                  }),
                  // Background transition: SchoolBG2 slides left (8 seconds)
                  Animated.timing(schoolBG2TranslateX, {
                    toValue: -SCREEN_WIDTH,
                    duration: 8000,
                    useNativeDriver: false,
                  }),
                  // SchoolBG4 slides in from right (8 seconds)
                  Animated.timing(schoolBG4TranslateX, {
                    toValue: 0,
                    duration: 8000,
                    useNativeDriver: false,
                  }),
                ]).start(() => {
                  console.log('School6 and background transition completed in 8 seconds');
                  
                  // Hide cabinet now that we're fully on page 2
                  Animated.timing(cabinetContainerOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: false,
                  }).start();
                  
                  // Transition School6 back to School5 after background transition completes
                  Animated.parallel([
                    Animated.timing(school6Opacity, {
                      toValue: 0,
                      duration: 500,
                      useNativeDriver: false,
                    }),
                    Animated.timing(school5Opacity, {
                      toValue: 1,
                      duration: 500,
                      useNativeDriver: false,
                    }),
                    // Show bag when School5 appears
                    Animated.timing(bagVisibility, {
                      toValue: 1,
                      duration: 500,
                      useNativeDriver: false,
                    }),
                  ]).start(() => {
                    console.log('School6 to School5 transition completed - bag is now visible');
                  });
                });
              }, 2000);
            });
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
            console.log('VEST PLACED ON SCHOOL2 - Starting animation!');
            setVestPlacedOnSchool2(true);
            stopVestPulse();

            // Transition: School3 to 100%, Vest fades out smoothly (same as poloshirt logic)
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(vestOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Vest animation completed');
            });
          } else if (itemType === 'pants' && !pantsPlaced) {
            setPantsPlaced(true);
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
          
          // If pants was being dragged but not placed, restore School3 and hide School4
          if (itemType === 'pants' && poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
            Animated.parallel([
              Animated.timing(school4Opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start();
          }

          // If shoes was being dragged but not placed, restore School4 and hide School5
          if (itemType === 'shoes' && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced) {
            Animated.parallel([
              Animated.timing(school5Opacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }),
              Animated.timing(school4Opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }),
            ]).start();
          }

          // If tumbler was dragged but not placed anywhere special, check if placed on Tumbler1
          if (itemType === 'tumbler' && isOnTumbler1 && !tumblerPlacedInBag) {
            console.log('TUMBLER PLACED IN BAG - Starting animation!');
            console.log('Tumbler1 opacity before:', (tumbler1Opacity as any)._value);
            console.log('Tumbler opacity before:', (tumblerOpacity as any)._value);
            setTumblerPlacedInBag(true);
            stopTumblerPulse();

            // Transition: Tumbler1 becomes visible, Tumbler fades out (like poloshirt behavior)
            Animated.parallel([
              Animated.timing(tumbler1Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(tumblerOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Tumbler placed in bag animation completed - tumbler permanently hidden like poloshirt');
              console.log('Tumbler1 opacity after:', (tumbler1Opacity as any)._value);
              console.log('Tumbler opacity after:', (tumblerOpacity as any)._value);
            });
            // No other special placement logic for tumbler
          } else if (itemType === 'tumbler' && !tumblerPlacedInBag) {
            // If tumbler was dragged but not placed on Tumbler1, hide the preview
            Animated.timing(tumbler1Opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }).start();
          }

          // Notebook placement logic
          if (itemType === 'notebook' && isOnNotebook1 && !notebookDraggedOut) {
            console.log('NOTEBOOK PLACED - Starting animation!');
            setNotebookDraggedOut(true);
            stopNotebookPulse();

            Animated.parallel([
              Animated.timing(notebook1Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(notebookOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Notebook placed animation completed');
            });
          } else if (itemType === 'notebook' && !notebookDraggedOut) {
            Animated.timing(notebook1Opacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
          }

          // Pouch placement logic
          if (itemType === 'pouch' && isOnPouch1 && !pouchDraggedOut) {
            console.log('POUCH PLACED - Starting animation!');
            setPouchDraggedOut(true);
            stopPouchPulse();

            Animated.parallel([
              Animated.timing(pouch1Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(pouchOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Pouch placed animation completed');
            });
          } else if (itemType === 'pouch' && !pouchDraggedOut) {
            Animated.timing(pouch1Opacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
          }

          // Lunchbox placement logic
          if (itemType === 'lunchbox' && isOnLunchbox1 && !lunchboxDraggedOut) {
            console.log('LUNCHBOX PLACED - Starting animation!');
            setLunchboxDraggedOut(true);
            stopLunchboxPulse();

            Animated.parallel([
              Animated.timing(lunchbox1Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(lunchboxOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Lunchbox placed animation completed');
            });
          } else if (itemType === 'lunchbox' && !lunchboxDraggedOut) {
            Animated.timing(lunchbox1Opacity, { toValue: 0, duration: 200, useNativeDriver: false }).start();
          }
        }

        Animated.spring(x, { toValue: 0, useNativeDriver: false, friction: 8, tension: 40 }).start();
        Animated.spring(y, { toValue: 0, useNativeDriver: false, friction: 8, tension: 40 }).start();
        setIsDragging(null);
        
        // Removed bag items reset logic for static items
      },
      onPanResponderTerminate: () => {
        setIsDragging(null);
      }
    });

  const poloshirtPan = makePanResponder('poloshirt', poloshirtX, poloshirtY);
  const vestPan = makePanResponder('vest', vestX, vestY);
  const pantsPan = makePanResponder('pants', pantsX, pantsY);
  const shoesPan = makePanResponder('shoes', shoesX, shoesY);
  const tumblerPan = makePanResponder('tumbler', tumblerX, tumblerY);
  const notebookPan = makePanResponder('notebook', notebookX, notebookY);
  const pouchPan = makePanResponder('pouch', pouchX, pouchY);
  const lunchboxPan = makePanResponder('lunchbox', lunchboxX, lunchboxY);

  const itemPositions = {
    poloshirt: { top: SCREEN_HEIGHT * 0.35, left: SCREEN_WIDTH * 0.20, size: 110 },
    vest: { top: SCREEN_HEIGHT * 0.35, left: SCREEN_WIDTH * 0.47, size: 110 },
    pants: { top: SCREEN_HEIGHT * 0.51, left: SCREEN_WIDTH * 0.20, size: 110 },
    shoes: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.50, size: 85 },
    tumbler: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.75, size: 85 },
    notebook: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.75, size: 85 },
    pouch: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.75, size: 85 },
    lunchbox: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.75, size: 85 },
  };

  const renderDraggable = (name: string, source: any, x: Animated.Value, y: Animated.Value, pan: any, position: any, opacityAnim: Animated.Value, pulseAnim?: Animated.Value) => {
    // For shoes, don't apply opacity fade when School5 is visible (shoes should remain fully visible when dragging)
    const shouldApplyOpacity = name !== 'shoes' || !(poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced);
    
    return (
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
          opacity: shouldApplyOpacity ? opacityAnim : 1,
        }}
      >
        <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Animated backgrounds */}
      <Animated.Image 
        source={require('./SchoolGame/SchoolBG2.png')} 
        style={[
          styles.bg, 
          { 
            transform: [{ translateX: schoolBG2TranslateX }]
          }
        ]} 
        resizeMode="cover" 
      />
      <Animated.Image 
        source={require('./SchoolGame/SchoolBG4.png')} 
        style={[
          styles.bg, 
          { 
            position: 'absolute',
            opacity: schoolBG4Opacity,
            transform: [{ translateX: schoolBG4TranslateX }]
          }
        ]} 
        resizeMode="cover" 
      />
      {/* Bag on couch in SchoolBG4 - Bag.png behind School5 */}
      <Animated.View
        style={[
          styles.bagOnCouch, 
          { 
            opacity: bagVisibility,
            transform: [
              { translateX: schoolBG4TranslateX },
              { scale: bagScale }
            ],
            zIndex: 1000,
          }
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity 
          onPress={handleBagClick}
          style={{ width: '100%', height: '100%' }}
          activeOpacity={0.7}
        >
          <Animated.Image 
            source={require('./SchoolGame/Bag.png')} 
            style={[{ width: '100%', height: '100%', opacity: bagOpacity, zIndex: bagZIndex }]} 
            resizeMode="contain" 
          />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Bag1.png as full-screen dialog overlay on Page 2 */}
      <Animated.View
        style={[
          styles.bag1Dialog, 
          { 
            opacity: bag1Opacity,
            zIndex: 2500,
          }
        ]}
        pointerEvents={bagClicked ? "auto" : "none"}
      >
        {/* Background overlay - clickable to close dialog */}
        <View 
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: SCREEN_HEIGHT * 0.1 }}
        >
          {/* Yellow container above Bag1 */}
          <View
            style={{
              backgroundColor: '#F7C238',
              borderRadius: 15,
              borderWidth: 3,
              borderColor: '#634E16',
              paddingHorizontal: 30,
              paddingVertical: 12,
              marginBottom: 60,
              marginTop: -100,
              width: '90%',
              height: '10%',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 4000,
              overflow: 'visible',
            }}
          >
            {/* Container content - school items */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', width: '100%', alignItems: 'center', height: '100%', marginLeft: -40, gap: 10, overflow: 'visible' }}>
              {/* Draggable tumbler - stays in container */}
              <Animated.View
                {...tumblerPan.panHandlers}
                style={{
                  width: 70,
                  height: 70,
                  opacity: tumblerOpacity,
                  transform: [
                    { translateX: tumblerX },
                    { translateY: tumblerY },
                    { scale: tumblerPulseAnim }
                  ],
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: isDragging === 'tumbler' ? 5000 : 100,
                }}
              >
                <Image source={require('./SchoolGame/Tumbler.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
              </Animated.View>
              
              {/* Draggable Notebook - stays in container */}
              <Animated.View
                {...notebookPan.panHandlers}
                style={{
                  width: 70,
                  height: 70,
                  opacity: notebookOpacity,
                  transform: [
                    { translateX: notebookX },
                    { translateY: notebookY },
                    { scale: notebookPulseAnim }
                  ],
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: isDragging === 'notebook' ? 5000 : 100,
                }}
              >
                <Image source={require('./SchoolGame/Notebook.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
              </Animated.View>

              {/* Draggable Pouch - stays in container */}
              <Animated.View
                {...pouchPan.panHandlers}
                style={{
                  width: 70,
                  height: 70,
                  opacity: pouchOpacity,
                  transform: [
                    { translateX: pouchX },
                    { translateY: pouchY },
                    { scale: pouchPulseAnim }
                  ],
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: isDragging === 'pouch' ? 5000 : 100,
                }}
              >
                <Image source={require('./SchoolGame/Pouch.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
              </Animated.View>

              {/* Draggable Lunchbox - stays in container */}
              <Animated.View
                {...lunchboxPan.panHandlers}
                style={{
                  width: 70,
                  height: 70,
                  opacity: lunchboxOpacity,
                  transform: [
                    { translateX: lunchboxX },
                    { translateY: lunchboxY },
                    { scale: lunchboxPulseAnim }
                  ],
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: isDragging === 'lunchbox' ? 5000 : 100,
                }}
              >
                <Image source={require('./SchoolGame/Lunchbox.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
              </Animated.View>
            </View>
          </View>
          
          {/* Bag1 content */}
          <TouchableOpacity 
            onPress={handleBagDialogClose}
            style={{
              width: '70%',
              height: '70%',
            }}
            activeOpacity={0.8}
          >
            <Animated.View
              style={{
                transform: [{ scale: bagScale }],
                width: '100%',
                height: '100%',
                zIndex: 2000, // Lower than dragging tumbler (3000)
                position: 'relative',
              }}
            >
              <Animated.Image 
                source={require('./SchoolGame/Bag1.png')} 
                style={[{ width: '100%', height: '100%' }]} 
                resizeMode="contain" 
              />
              
              {/* Items inside Bag1 compartments */}
              <View style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}>
                {/* Tumbler in left compartment - centered vertically */}
                <Animated.Image 
                  source={require('./SchoolGame/Tumbler1.png')} 
                  style={{ 
                    position: 'absolute', 
                    width: 180, 
                    height: 280, 
                    top: '30%', 
                    left: '-10%',
                    opacity: tumbler1Opacity
                  }} 
                  resizeMode="contain" 
                />
                
                {/* Lunchbox in top right compartment - centered */}
                <Animated.Image 
                  source={require('./SchoolGame/Lunchbox1.png')} 
                  style={{ 
                    position: 'absolute', 
                    width: 140, 
                    height: 80, 
                    top: '19%', 
                    right: '5%',
                    opacity: lunchbox1Opacity
                  }} 
                  resizeMode="contain" 
                />
                
                {/* Pouch in middle right compartment - centered */}
                <Animated.Image 
                  source={require('./SchoolGame/Pouch1.png')} 
                  style={{ 
                    position: 'absolute', 
                    width: 140, 
                    height: 60, 
                    top: '37%', 
                    right: '5%',
                    opacity: pouch1Opacity
                  }} 
                  resizeMode="contain" 
                />
                
                {/* Notebook in bottom right compartment - centered */}
                <Animated.Image 
                  source={require('./SchoolGame/Notebook1.png')} 
                  style={{ 
                    position: 'absolute', 
                    width: 120, 
                    height: 160, 
                    top: '54%', 
                    right: '7%',
                    opacity: notebook1Opacity
                  }} 
                  resizeMode="contain" 
                />
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cabinetContainer} onPress={handleCabinetClick} activeOpacity={1}>
        <Animated.View style={{ opacity: cabinetContainerOpacity }}>
          <Animated.Image source={require('./SchoolGame/Cabinet.png')} style={[styles.cabinet, { opacity: cabinetOpacity }]} resizeMode="contain" />
          <Animated.Image 
            source={require('./SchoolGame/Cabinet1.png')} 
            style={[
              styles.cabinet, 
              { 
                position: 'absolute', 
                opacity: cabinet1Opacity,
                transform: [{ translateX: schoolBG2TranslateX }]
              }
            ]} 
            resizeMode="contain" 
          />
        </Animated.View>
      </TouchableOpacity>

      {cabinetOpen && !(poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && shoesPlaced) && (
        <View style={styles.cabinetContents} pointerEvents="box-none">
          {renderDraggable('poloshirt', require('./SchoolGame/Poloshirt.png'), poloshirtX, poloshirtY, poloshirtPan, itemPositions.poloshirt, poloshirtOpacity, poloshirtPulseAnim)}
          {renderDraggable('vest', require('./SchoolGame/Vest.png'), vestX, vestY, vestPan, itemPositions.vest, vestOpacity, vestPulseAnim)}
          {renderDraggable('pants', require('./SchoolGame/Pants.png'), pantsX, pantsY, pantsPan, itemPositions.pants, pantsOpacity, pantsPulseAnim)}
          {renderDraggable('shoes', require('./SchoolGame/Shoes.png'), shoesX, shoesY, shoesPan, itemPositions.shoes, shoesOpacity, shoesPulseAnim)}
        </View>
      )}

      <Animated.Image source={require('./SchoolGame/School1.png')} style={[styles.boy, { opacity: school1Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School2.png')} style={[styles.boy2, { opacity: school2Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School3.png')} style={[styles.boy3, { opacity: school3Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School4.png')} style={[styles.boy4, { opacity: school4Opacity }]} resizeMode="contain"/>
      <Animated.Image source={require('./SchoolGame/School5.png')} style={[styles.boy5, { opacity: school5Opacity, zIndex: 1100 }]} resizeMode="contain"/>
      <Animated.Image 
        key={`school6-${gifKey}`}
        source={require('./SchoolGame/School6.gif')} 
        style={[styles.boy6, { opacity: school6Opacity }]} 
        resizeMode="contain"
      />
      <Animated.Image source={require('./SchoolGame/School7.png')} style={[styles.boy7, { opacity: school7Opacity }]} resizeMode="contain"/>
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
  boy6: { position: 'absolute', bottom: -10, right: -50, width: SCREEN_WIDTH * 0.75, height: SCREEN_HEIGHT * 0.6 },
  boy7: { position: 'absolute', bottom: 80, right: -60, width: SCREEN_WIDTH * 0.85, height: SCREEN_HEIGHT * 0.45 },
  bagOnCouch: { position: 'absolute', bottom: -SCREEN_HEIGHT * 0.045, left: -SCREEN_WIDTH * 0.025, width: SCREEN_WIDTH * 0.7, height: SCREEN_HEIGHT * 0.7 },
  bag1Dialog: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' },
});