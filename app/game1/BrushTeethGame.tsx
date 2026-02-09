import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BrushTeethGame = () => {
    const [brushIndex, setBrushIndex] = useState(0);
    const [showArrow, setShowArrow] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [pasteComplete, setPasteComplete] = useState(false);
    const [showDraggableBrush, setShowDraggableBrush] = useState(false);
    const [brushHasFoam, setBrushHasFoam] = useState(false); // Persistent foam flag
    const [canClickPaste, setCanClickPaste] = useState(false);
    const [showCup, setShowCup] = useState(false);
    const [showTartars, setShowTartars] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [allCleaned, setAllCleaned] = useState(false);
    const [brush6Triggered, setBrush6Triggered] = useState(false);
    const [brush6Completed, setBrush6Completed] = useState(false);
    const [showBrush7, setShowBrush7] = useState(false);
    const [brush7Completed, setBrush7Completed] = useState(false);
    const [showBrush8, setShowBrush8] = useState(false);
    const [brush8Completed, setBrush8Completed] = useState(false);
    const [showBrush9, setShowBrush9] = useState(false);
    const [brush9Completed, setBrush9Completed] = useState(false);
    const [showCup1Wiggle, setShowCup1Wiggle] = useState(false);
    const [cup1Placed, setCup1Placed] = useState(false);
    const [cup1IsDragging, setCup1IsDragging] = useState(false);
    const bgSoundRef = useRef<Audio.Sound | null>(null);
    const brush6SoundRef = useRef<Audio.Sound | null>(null);
    const brush7SoundRef = useRef<Audio.Sound | null>(null);
    const brush8SoundRef = useRef<Audio.Sound | null>(null);
    const brush9SoundRef = useRef<Audio.Sound | null>(null);
    const pasteWigglePlayedRef = useRef(false);
    const cupWigglePlayedRef = useRef(false);

    
    
    // Cleaning state for all 24 tartars
    const [tartarsCleaning, setTartarsCleaning] = useState<boolean[]>(new Array(24).fill(false));
    const [tartarsCleaned, setTartarsCleaned] = useState<boolean[]>(new Array(24).fill(false));
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
    const brushes = [
        require('./BrushGame/Brush1.png'), 
        require('./BrushGame/Brush2.png'), 
        require('./BrushGame/Brush3.png'), 
        require('./BrushGame/Brush4.png')
    ];
    const scaleX = SCREEN_WIDTH / 375;      // your UI width base
    const scaleY = SCREEN_HEIGHT / 812;     // your UI height base
    const brushPastePosition = { x: 10 * scaleX, y: 300 * scaleY };

    const router = useRouter();
    
    // Tartar image mapping
    const tartarImages = {
        1: require('./BrushGame/Tartar1.png'),
        2: require('./BrushGame/Tartar2.png'),
        3: require('./BrushGame/Tartar3.png'),
        4: require('./BrushGame/Tartar4.png'),
        5: require('./BrushGame/Tartar5.png'),
        6: require('./BrushGame/Tartar6.png'),
        7: require('./BrushGame/Tartar7.png'),
        8: require('./BrushGame/Tartar8.png'),
        9: require('./BrushGame/Tartar9.png'),
        10: require('./BrushGame/Tartar10.png'),
        11: require('./BrushGame/Tartar11.png'),
        12: require('./BrushGame/Tartar12.png'),
    } as Record<number, any>;
    
    // Tartar definitions - 24 tartars (12 types duplicated)
    // ADJUST POSITIONS (x, y) AND SIZE (width, height) HERE IN THE CODE
    const tartars = [
        // First set (1-12) - Visible at 100% opacity
        { id: 1, type: 1, x: 100, y: 410, width: 30, height: 30, opacity: 1 },
        { id: 2, type: 2, x: 130, y: 412, width: 30, height: 30, opacity: 1 },
        { id: 3, type: 3, x: 150, y: 412, width: 30, height: 30, opacity: 1 },
        { id: 4, type: 4, x: 180, y: 410, width: 30, height: 30, opacity: 1 },
        { id: 5, type: 5, x: 210, y: 412, width: 30, height: 30, opacity: 1 },
        { id: 6, type: 6, x: 230, y: 410, width: 30, height: 30, opacity: 1 },
        { id: 7, type: 7, x: 110, y: 470, width: 30, height: 30, opacity: 1 },
        { id: 8, type: 8, x: 130, y: 473, width: 30, height: 30, opacity: 1 },
        { id: 9, type: 9, x: 155, y: 475, width: 30, height: 30, opacity: 1 },
        { id: 10, type: 10, x: 180, y: 475, width: 30, height: 30, opacity: 1 },
        { id: 11, type: 11, x: 200, y: 473, width: 30, height: 30, opacity: 1 },
        { id: 12, type: 12, x: 220, y: 465, width: 30, height: 30, opacity: 1 },
        // Duplicated set (13-24) - Invisible at 0% opacity
        { id: 13, type: 1, x: 100, y: 430, width: 30, height: 30, opacity: 0 },
        { id: 14, type: 2, x: 125, y: 432, width: 30, height: 30, opacity: 0 },
        { id: 15, type: 3, x: 155, y: 432, width: 30, height: 30, opacity: 0 },
        { id: 16, type: 4, x: 185, y: 430, width: 30, height: 30, opacity: 0 },
        { id: 17, type: 5, x: 210, y: 432, width: 30, height: 30, opacity: 0 },
        { id: 18, type: 6, x: 235, y: 430, width: 30, height: 30, opacity: 0 },
        { id: 19, type: 7, x: 100, y: 450, width: 30, height: 30, opacity: 0 },
        { id: 20, type: 8, x: 125, y: 453, width: 30, height: 30, opacity: 0 },
        { id: 21, type: 9, x: 155, y: 455, width: 30, height: 30, opacity: 0 },
        { id: 22, type: 10, x: 185, y: 455, width: 30, height: 30, opacity: 0 },
        { id: 23, type: 11, x: 215, y: 453, width: 30, height: 30, opacity: 0 },
        { id: 24, type: 12, x: 235, y: 445, width: 30, height: 30, opacity: 0 },
    ];    // Opacity values for each brush image
    const opacity1 = useRef(new Animated.Value(1)).current;
    const opacity2 = useRef(new Animated.Value(0)).current;
    const opacity3 = useRef(new Animated.Value(0)).current;
    const opacity4 = useRef(new Animated.Value(0)).current;
    
    // Animation values for arrow and paste
    const arrowBounce = useRef(new Animated.Value(0)).current;
    const pasteShake = useRef(new Animated.Value(0)).current;
    const arrowBounceAnim = useRef<any>(null);
    const pasteShakeAnim = useRef<any>(null);
    
    // Swipe gesture animations
    const toothpasteRotation = useRef(new Animated.Value(0)).current;
    const pasteOpacity = useRef(new Animated.Value(0)).current;
    const swipeX = useRef(new Animated.Value(0)).current;
    
    // Draggable toothbrush with paste
    const brushPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const overlayFade = useRef(new Animated.Value(1)).current;
    const draggableBrushFoamOpacity = useRef(new Animated.Value(0)).current;
    
    // Cup1 dragging animations
    const cup1Position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const cup1Shake = useRef(new Animated.Value(0)).current;
    const cup1FadeOut = useRef(new Animated.Value(1)).current;
    const cup1WiggleAnim = useRef<Animated.CompositeAnimation | null>(null);
    
    // Completion fade animations
    const brushesFadeOut = useRef(new Animated.Value(1)).current;
    const draggableBrushFadeOut = useRef(new Animated.Value(1)).current;
    const cupFadeOut = useRef(new Animated.Value(1)).current;
    const completionGifFadeIn = useRef(new Animated.Value(0)).current;
    
    // Cleaning animation values for all 24 tartars
    const tartarsOpacity = useRef(tartars.map(() => new Animated.Value(1))).current;
    const foamsOpacity = useRef(tartars.map(() => new Animated.Value(0))).current;
    const cleaningInProgress = useRef<boolean[]>(new Array(24).fill(false));

    // Victory transition animation
    const victoryScale = useRef(new Animated.Value(1)).current;
    const victoryOpacity = useRef(new Animated.Value(0)).current;


    
    const playOneShot = async (source: number, volume = 1.0) => {
        try {
            const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true, volume });
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync().catch(() => {});
                }
            });
        } catch (error) {
            console.warn('Failed to play one-shot sound', error);
        }
    };

    const handlePasteClick = () => {
        if (!canClickPaste || showOverlay) return; // Guard: only clickable once shaking started and overlay not visible
        setShowOverlay(true);
        // Stop animations when overlay is shown
        if (arrowBounceAnim.current) {
            arrowBounceAnim.current.stop();
        }
        if (pasteShakeAnim.current) {
            pasteShakeAnim.current.stop();
        }
    };
    
    const resumeArrowAndPasteAnimations = () => {
        if (showArrow) {
            arrowBounceAnim.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(arrowBounce, {
                        toValue: -10,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(arrowBounce, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    })
                ])
            );
            arrowBounceAnim.current.start();

            pasteShakeAnim.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pasteShake, {
                        toValue: -5,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pasteShake, {
                        toValue: 5,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pasteShake, {
                        toValue: -5,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pasteShake, {
                        toValue: 5,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pasteShake, {
                        toValue: 0,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.delay(400)
                ])
            );
            pasteShakeAnim.current.start();
        }
    };

    const handleCloseOverlay = () => {
        setShowOverlay(false);
        setSwipeProgress(0);
        setPasteComplete(false);
        setShowDraggableBrush(false);
        setShowTartars(false); // Hide tartars when overlay closes
        // Reset swipe animations
        toothpasteRotation.setValue(0);
        pasteOpacity.setValue(0);
        swipeX.setValue(0);
        overlayFade.setValue(1);
        resumeArrowAndPasteAnimations();
    };
    
    // Pan responder for swipe gesture
    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderMove: (_, gestureState) => {
            // Just track the gesture, don't animate yet
        },
        onPanResponderRelease: (_, gestureState) => {
            // Check if user swiped right (at least 50px)
            if (gestureState.dx > 50 && swipeProgress === 0) {
                // Start automatic animations
                setSwipeProgress(1);
                playOneShot(require('./BrushGame/Toothpaste.mp3'));
                Animated.parallel([
                    Animated.timing(toothpasteRotation, {
                        toValue: 30,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pasteOpacity, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    })
                ]).start(() => {
                    // Immediately close overlay and show draggable brush + cup
                    setShowOverlay(false);
                    setSwipeProgress(0);
                    setPasteComplete(false);
                    // Show draggable brush on main page
                    setShowDraggableBrush(true);
                    // Replace BrushPaste with Cup and hide arrow
                    setShowCup(true);
                    setShowArrow(false);
                    // Reset swipe related animation values
                    toothpasteRotation.setValue(0);
                    pasteOpacity.setValue(1); // keep visible on brush
                    swipeX.setValue(0);
                    overlayFade.setValue(1);
                    // Initial position for brush (can be adjusted)
                    brushPosition.setValue(brushPastePosition);
                });
            }
        },
    });
    
    // Simple pan responder for draggable toothbrush
    const dragOffset = useRef({ x: 0, y: 0 });
    
    const brushPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                dragOffset.current = {
                    x: (brushPosition.x as any)._value,
                    y: (brushPosition.y as any)._value
                };
            },
            onPanResponderMove: (_, gestureState) => {
                const newX = dragOffset.current.x + gestureState.dx;
                const newY = dragOffset.current.y + gestureState.dy;
                brushPosition.setValue({
                    x: newX,
                    y: newY
                });
                
                // Calculate brush paste position (where the paste is on the draggable brush)
                const brushPasteX = newX + 56 + 35; // 56 offset + half paste width (~70/2)
                const brushPasteY = newY + 350; // top offset + half paste height (~65/2)
                
                const collisionRadius = 10; // Adjust for sensitivity
                
                // Check collision with all tartars
                let brushingContact = false;

                tartars.forEach((tartar, index) => {
                    // Calculate tartar center (used for both tartar and foam contact)
                    const tartarCenterX = tartar.x + tartar.width / 2;
                    const tartarCenterY = tartar.y + tartar.height / 2;

                    const distance = Math.sqrt(
                        Math.pow(brushPasteX - tartarCenterX, 2) + 
                        Math.pow(brushPasteY - tartarCenterY, 2)
                    );

                    if (distance < collisionRadius) {
                        brushingContact = true; // drive continuous loop
                        
                        // Set permanent foam flag on first contact
                        if (!brushHasFoam) {
                            setBrushHasFoam(true);
                            // Gradually fade in foam on draggable brush
                            Animated.timing(draggableBrushFoamOpacity, {
                                toValue: 1,
                                duration: 1000,
                                useNativeDriver: true,
                            }).start();
                        }

                        // Skip cleaning logic if already cleaned or in progress
                        if (tartarsCleaned[index] || cleaningInProgress.current[index]) {
                            return;
                        }

                        // Start cleaning animation for this tartar
                        cleaningInProgress.current[index] = true;
                        
                        // Update cleaning state
                        setTartarsCleaning(prev => {
                            const newState = [...prev];
                            newState[index] = true;
                            return newState;
                        });
                        
                        // Parallel fade animations: tartar fades out, foam fades in
                        Animated.parallel([
                            Animated.timing(tartarsOpacity[index], {
                                toValue: 0,
                                duration: 5000,
                                useNativeDriver: true,
                            }),
                            Animated.timing(foamsOpacity[index], {
                                toValue: 1,
                                duration: 5000,
                                useNativeDriver: true,
                            })
                        ]).start(() => {
                            // After foam forms, mark as cleaned immediately (no fade out)
                            setTartarsCleaned(prev => {
                                const newState = [...prev];
                                newState[index] = true;
                                return newState;
                            });
                            cleaningInProgress.current[index] = false;
                        });
                    }
                });


            },
            onPanResponderRelease: () => {
                // Keep the final position
            },
        })
    ).current;

    // Pan responder for draggable Cup1
    const cup1DragOffset = useRef({ x: 0, y: 0 });
    const cup1StateRef = useRef({ showCup1Wiggle, cup1Placed });
    
    // Keep refs updated with current state
    useEffect(() => {
        cup1StateRef.current = { showCup1Wiggle, cup1Placed };
    }, [showCup1Wiggle, cup1Placed]);
    
    const cup1PanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                if (cup1StateRef.current.showCup1Wiggle && !cup1StateRef.current.cup1Placed) {
                    setCup1IsDragging(true);
                    // Stop wiggle animation when dragging starts
                    if (cup1WiggleAnim.current) {
                        cup1WiggleAnim.current.stop();
                    }
                    cup1DragOffset.current = {
                        x: (cup1Position.x as any)._value,
                        y: (cup1Position.y as any)._value
                    };
                }
            },
            onPanResponderMove: (_, gestureState) => {
                if (cup1StateRef.current.showCup1Wiggle && !cup1StateRef.current.cup1Placed) {
                    const newX = cup1DragOffset.current.x + gestureState.dx;
                    const newY = cup1DragOffset.current.y + gestureState.dy;
                    cup1Position.setValue({
                        x: newX,
                        y: newY
                    });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                setCup1IsDragging(false);
                if (cup1StateRef.current.showCup1Wiggle && !cup1StateRef.current.cup1Placed) {
                    const cup1X = cup1DragOffset.current.x + gestureState.dx;
                    const cup1Y = cup1DragOffset.current.y + gestureState.dy;
                    
                    // Convert cup1DraggableContainer percentage position to pixels
                    // cup1DraggableContainer is at top: '72%', left: '77%'
                    const cup1InitialScreenX = (SCREEN_WIDTH * 0.77);
                    const cup1InitialScreenY = (SCREEN_HEIGHT * 0.72);
                    
                    // Add drag offset to get actual screen position
                    const cup1ScreenX = cup1InitialScreenX + cup1X;
                    const cup1ScreenY = cup1InitialScreenY + cup1Y;
                    
                    // Cup1 center
                    const cup1CenterX = cup1ScreenX + 52; // 104/2
                    const cup1CenterY = cup1ScreenY + 29.5; // 59/2
                    
                    // Define teeth foam area center (middle of Brush4 area)
                    // Brush4 is approximately at screen center where teeth are
                    const foamCenterX = 170;  // Middle of teeth area
                    const foamCenterY = 445;  // Middle of teeth area
                    const foamRadius = 150;   // Large radius to accept drops in teeth area
                    
                    // Check if Cup1 is dropped in the foam area
                    const distance = Math.sqrt(
                        Math.pow(cup1CenterX - foamCenterX, 2) + 
                        Math.pow(cup1CenterY - foamCenterY, 2)
                    );
                    
                    const onFoamArea = distance < foamRadius;
                    
                    console.log('Cup1 dropped - onFoamArea:', onFoamArea);
                    if (onFoamArea) {
                        // Cup1 placed successfully on foam area
                        console.log('Cup1 placed on foam area! Triggering completion');
                        setCup1Placed(true);
                    }
                    // Keep cup in final position (don't spring back)
                }
            },
        })
    ).current;

    // Simple background music - plays on game open, stops on game close
    useEffect(() => {
        let isMounted = true;

        const playBackgroundAudio = async () => {
            try {
                // Create and immediately play without waiting for full load
                const { sound } = await Audio.Sound.createAsync(
                    require('./BrushGame/BrushGameBG.mp3'),
                    { isLooping: true, volume: 0.5, shouldPlay: true, progressUpdateIntervalMillis: 100 }
                );

                if (!isMounted) {
                    await sound.unloadAsync();
                    return;
                }

                bgSoundRef.current = sound;
            } catch (error) {
                console.warn('Failed to start BrushGame background sound', error);
            }
        };

        // Start audio immediately without delay
        playBackgroundAudio();

        return () => {
            isMounted = false;
            // Stop and unload background audio when component unmounts
            if (bgSoundRef.current) {
                bgSoundRef.current.stopAsync()
                    .then(() => bgSoundRef.current?.unloadAsync())
                    .catch(() => {});
                bgSoundRef.current = null;
            }
        };
    }, []);

    // Detect when all tartars are cleaned and show Cup1
    useEffect(() => {
        const allCleanedNow = tartarsCleaned.every(cleaned => cleaned);
        
        if (allCleanedNow && !showCup1Wiggle) {
            // Move brush back and hide it so Cup1 can be dragged
            brushPosition.setValue(brushPastePosition);
            setShowDraggableBrush(false);
            setShowCup1Wiggle(true);
            // Don't start completion yet - wait for Cup1 to be placed
        }
    }, [tartarsCleaned, showCup1Wiggle, brushPosition, brushPastePosition]);

    // Handle Cup1 placement - trigger Brush6 completion when Cup1 is placed on foam area
    useEffect(() => {
        if (!cup1Placed) return;

        const startCompletion = async () => {
            try {
                setAllCleaned(true);
                setBrush6Triggered(true);
                setBrush6Completed(false);
                
                // Load and play Brush6.mp3
                const { sound } = await Audio.Sound.createAsync(
                    require('./BrushGame/Brush6.mp3'),
                    { shouldPlay: false, volume: 1.0 }
                );
                brush6SoundRef.current = sound;
                
                // Set up playback status listener
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setBrush6Completed(true);
                    }
                });
                
                // Show completion gif immediately
                setShowCompletion(true);
                completionGifFadeIn.setValue(1);
                
                // Smooth fade out all elements and fade in completion gif simultaneously
                Animated.parallel([
                    Animated.timing(brushesFadeOut, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(draggableBrushFadeOut, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cup1FadeOut, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    // Start playing audio after fade animations complete
                    sound.getStatusAsync()
                        .then((status) => {
                            if (status.isLoaded && !status.isPlaying) {
                                return sound.playAsync();
                            }
                            return undefined;
                        })
                        .catch((error) => {
                            console.error('Error playing Brush6.mp3:', error);
                            setBrush6Completed(true);
                        });
                });
                
            } catch (error) {
                console.warn('Failed to play Brush6.mp3:', error);
                setBrush6Completed(true);
            }
        };
        
        startCompletion();
    }, [cup1Placed]);

    // Animate Cup1 wiggle when it should be shown
    useEffect(() => {
        if (!showCup1Wiggle) return;

        const startCup1Wiggle = () => {
            if (!cupWigglePlayedRef.current) {
                cupWigglePlayedRef.current = true;
                playOneShot(require('./BrushGame/Wiggle.mp3'));
            }
            cup1WiggleAnim.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(cup1Shake, {
                        toValue: 5,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cup1Shake, {
                        toValue: -5,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cup1Shake, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ])
            );
            
            cup1WiggleAnim.current.start();
        };
        
        startCup1Wiggle();
        
        return () => {
            if (cup1WiggleAnim.current) {
                cup1WiggleAnim.current.stop();
            }
        };
    }, [showCup1Wiggle]);

    // Handle Brush7 animation after Brush6 completes
    useEffect(() => {
        if (!brush6Completed) return;

        const startBrush7 = async () => {
            try {
                    setShowCompletion(false);
                setShowBrush7(true);
                const { sound } = await Audio.Sound.createAsync(
                    require('./BrushGame/Brush7.mp3'),
                    { shouldPlay: false, volume: 1.0 }
                );
                brush7SoundRef.current = sound;
                
                // Set up playback status listener
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setBrush7Completed(true);
                    }
                });
                
                // Start playing audio
                await sound.playAsync();
            } catch (error) {
                console.warn('Failed to play brush7 audio:', error);
                setBrush7Completed(true);
            }
        };
        
        startBrush7();
    }, [brush6Completed]);

    // Handle Brush8 animation after Brush7 completes
    useEffect(() => {
        if (!brush7Completed) return;

        const startBrush8 = async () => {
            try {
                    setShowBrush7(false);
                setShowBrush8(true);
                const { sound } = await Audio.Sound.createAsync(
                    require('./BrushGame/Brush8.mp3'),
                    { shouldPlay: false, volume: 1.0 }
                );
                brush8SoundRef.current = sound;

                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setBrush8Completed(true);
                    }
                });

                await sound.playAsync();
            } catch (error) {
                console.warn('Failed to play brush8 audio:', error);
                setBrush8Completed(true);
            }
        };

        startBrush8();
    }, [brush7Completed]);

    // Handle Brush9 animation after Brush8 completes
    useEffect(() => {
        if (!brush8Completed) return;

        const startBrush9 = async () => {
            try {
                    setShowBrush8(false);
                setShowBrush9(true);
                const { sound } = await Audio.Sound.createAsync(
                    require('./BrushGame/Brush9.mp3'),
                    { shouldPlay: false, volume: 1.0 }
                );
                brush9SoundRef.current = sound;

                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setBrush9Completed(true);
                    }
                });

                await sound.playAsync();
            } catch (error) {
                console.warn('Failed to play brush9 audio:', error);
                setBrush9Completed(true);
            }
        };

        startBrush9();
    }, [brush8Completed]);

    // Handle success scene after Brush9 completes
    useEffect(() => {
        if (!brush9Completed) return;

        const handleCompletion = async () => {
            if (bgSoundRef.current) {
                try {
                    const status = await bgSoundRef.current.getStatusAsync();
                    if (status.isLoaded && status.isPlaying) {
                        await bgSoundRef.current.stopAsync();
                    }
                } catch (error) {
                    // Ignore player errors
                }
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
                    .finally(() => router.back());
            });
        };

        handleCompletion();
    }, [brush9Completed, router, victoryScale, victoryOpacity]);
    
    useEffect(() => {
        // Preload all images to avoid first-frame decode delays
        Asset.loadAsync([
            require('./BrushGame/Cup.png'),
            require('./BrushGame/Cup1.png'),
            require('./BrushGame/BrushBG.png'),
            require('./BrushGame/Brush1.png'),
            require('./BrushGame/Brush2.png'),
            require('./BrushGame/Brush3.png'),
            require('./BrushGame/Brush4.png'),
            require('./BrushGame/BrushPaste.png'),
            require('./BrushGame/Arrow.png'),
            require('./BrushGame/Toothbrush.png'),
            require('./BrushGame/Toothpaste.png'),
            require('./BrushGame/Paste.png'),
            require('./BrushGame/Tartar1.png'),
            require('./BrushGame/Tartar2.png'),
            require('./BrushGame/Tartar3.png'),
            require('./BrushGame/Tartar4.png'),
            require('./BrushGame/Tartar5.png'),
            require('./BrushGame/Tartar6.png'),
            require('./BrushGame/Tartar7.png'),
            require('./BrushGame/Tartar8.png'),
            require('./BrushGame/Tartar9.png'),
            require('./BrushGame/Tartar10.png'),
            require('./BrushGame/Tartar11.png'),
            require('./BrushGame/Tartar12.png'),
            require('./BrushGame/Foam.png'),
            require('./BrushGame/Brush6.gif'),
            require('./BrushGame/Brush7.gif'),
            require('./BrushGame/Brush8.gif'),
            require('./BrushGame/Brush9.gif'),
        ]);

        // Start with Brush1 fully visible
        // After 1 second, fade to Brush2
        const timer1 = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity1, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity2, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                })
            ]).start(() => {
                // After Brush2 is fully visible, fade to Brush3 (200ms delay)
                const timer2 = setTimeout(() => {
                    Animated.parallel([
                        Animated.timing(opacity2, {
                            toValue: 0,
                            duration: 500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacity3, {
                            toValue: 1,
                            duration: 500,
                            useNativeDriver: true,
                        })
                    ]).start(() => {
                        // After Brush3 is fully visible, fade to Brush4 (200ms delay)
                        const timer3 = setTimeout(() => {
                            // Show tartars immediately when Brush4 animation starts
                            setShowTartars(true);
                            Animated.parallel([
                                Animated.timing(opacity3, {
                                    toValue: 0,
                                    duration: 500,
                                    useNativeDriver: true,
                                }),
                                Animated.timing(opacity4, {
                                    toValue: 1,
                                    duration: 500,
                                    useNativeDriver: true,
                                })
                            ]).start(() => {
                                // After Brush4 is fully visible, show arrow and start shake
                                setShowArrow(true);
                                setCanClickPaste(true);
                                // Start arrow bounce animation
                                arrowBounceAnim.current = Animated.loop(
                                    Animated.sequence([
                                        Animated.timing(arrowBounce, {
                                            toValue: -10,
                                            duration: 500,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(arrowBounce, {
                                            toValue: 0,
                                            duration: 500,
                                            useNativeDriver: true,
                                        })
                                    ])
                                );
                                arrowBounceAnim.current.start();
                                // Start paste shake animation
                                pasteShakeAnim.current = Animated.loop(
                                        Animated.sequence([
                                            Animated.timing(pasteShake, {
                                                toValue: -5,
                                                duration: 100,
                                                useNativeDriver: true,
                                            }),
                                            Animated.timing(pasteShake, {
                                                toValue: 5,
                                                duration: 100,
                                                useNativeDriver: true,
                                            }),
                                            Animated.timing(pasteShake, {
                                                toValue: -5,
                                                duration: 100,
                                                useNativeDriver: true,
                                            }),
                                            Animated.timing(pasteShake, {
                                                toValue: 5,
                                                duration: 100,
                                                useNativeDriver: true,
                                            }),
                                            Animated.timing(pasteShake, {
                                                toValue: 0,
                                                duration: 100,
                                                useNativeDriver: true,
                                            }),
                                            Animated.delay(400)
                                        ])
                                    );
                                    if (!pasteWigglePlayedRef.current) {
                                        pasteWigglePlayedRef.current = true;
                                        playOneShot(require('./BrushGame/Wiggle.mp3'));
                                    }
                                    pasteShakeAnim.current.start();
                            });
                        }, 200);
                    });
                }, 200);
            });
        }, 1000);
        
        return () => clearTimeout(timer1);
    }, []);

  return (
    <View style={styles.container}>
            <Animated.View style={[
                styles.gameContentWrapper,
                {
                    transform: [{ scale: victoryScale }]
                }
            ]}>
            <Image source={require('./BrushGame/BrushBG.png')} style={styles.background} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
            </View>
            {/* All brush images stacked on top of each other with varying opacity */}
            <Animated.Image source={brushes[0]} style={[styles.brush, { opacity: Animated.multiply(opacity1, brushesFadeOut) }]} />
            <Animated.Image source={brushes[1]} style={[styles.brush, { opacity: Animated.multiply(opacity2, brushesFadeOut) }]} />
            <Animated.Image source={brushes[2]} style={[styles.brush, { opacity: Animated.multiply(opacity3, brushesFadeOut) }]} />
            <Animated.Image source={brushes[3]} style={[styles.brush, { opacity: Animated.multiply(opacity4, brushesFadeOut) }]} />
            
            {/* Completion GIF - appears when all cleaning is done */}
            {showCompletion && !showBrush7 && !showBrush8 && !showBrush9 && (
                <Image 
                    source={require('./BrushGame/Brush6.gif')} 
                    style={styles.brush6}
                />
            )}
            
            {/* Brush7 GIF - appears after Brush6 completes */}
            {showBrush7 && !showBrush8 && !showBrush9 && (
                <Image 
                    source={require('./BrushGame/Brush7.gif')} 
                    style={styles.brush6}
                />
            )}

            {showBrush8 && !showBrush9 && (
                <Image 
                    source={require('./BrushGame/Brush8.gif')} 
                    style={styles.brush6}
                />
            )}

            {showBrush9 && (
                <Image 
                    source={require('./BrushGame/Brush9.gif')} 
                    style={styles.brush6}
                />
            )}
            
            {/* Tartars on teeth - appear all at once when Brush4 appears */}
            {showTartars && !allCleaned && tartars.map((tartar, index) => {
                const tartarImage = tartarImages[tartar.type];
                
                return (
                    <View
                        key={`tartar-${tartar.id}`}
                        pointerEvents="none"
                        style={[
                            styles.tartar,
                            {
                                left: tartar.x,
                                top: tartar.y,
                                width: tartar.width,
                                height: tartar.height,
                                opacity: tartar.opacity,
                            }
                        ]}
                    >
                        {/* Tartar with fade-out animation */}
                        <Animated.Image 
                            source={tartarImage}
                            style={[styles.tartarImage, { opacity: tartarsOpacity[index] }]}
                        />
                    </View>
                );
            })}
            
            {/* Foams rendered separately so they're not constrained by tartar opacity */}
            {showTartars && !allCleaned && tartars.map((tartar, index) => 
                tartarsCleaning[index] ? (
                    <View key={`foam-${tartar.id}`} pointerEvents="none">
                        <Animated.Image
                            source={require('./BrushGame/Foam.png')}
                            style={{
                                position: 'absolute',
                                left: tartar.x - 25,
                                top: tartar.y - 25,
                                width: 80,
                                height: 80,
                                opacity: foamsOpacity[index],
                                resizeMode: 'contain',
                                zIndex: 36,
                            }}
                        />
                    </View>
                ) : null
            )}
            
            {/* BrushPaste or Cup on main page */}
            {!allCleaned && (!showCup ? (
                <TouchableOpacity 
                    onPress={handlePasteClick}
                    style={styles.pasteButton}
                    activeOpacity={canClickPaste ? 0.8 : 1}
                    disabled={!canClickPaste}
                >
                    <Animated.Image 
                        source={require('./BrushGame/BrushPaste.png')} 
                        style={[
                            styles.paste, 
                            !showOverlay && canClickPaste && { 
                                transform: [{ rotate: pasteShake.interpolate({
                                    inputRange: [-5, 5],
                                    outputRange: ['-5deg', '5deg']
                                })}]
                            }
                        ]} 
                    />
                </TouchableOpacity>
            ) : (
                <Animated.View
                    style={[styles.pasteButton, { opacity: cupFadeOut }]}
                    pointerEvents={showCup1Wiggle ? 'none' : 'auto'}
                >
                    <Image 
                        source={require('./BrushGame/Cup.png')} 
                        style={styles.cup}
                    />
                </Animated.View>
            ))}
            
            {/* Cup1 next to BrushPaste/Cup - becomes draggable when all tartars cleaned */}
            {!allCleaned && !showCup1Wiggle && (
                <Animated.View style={[styles.cup1Button, { opacity: cupFadeOut }]}>
                    <Image 
                        source={require('./BrushGame/Cup1.png')} 
                        style={styles.cup1}
                    />
                </Animated.View>
            )}
            
            {/* Cup1 draggable when wiggle is triggered (stays to fade out on completion) */}
            {showCup1Wiggle && (
                <Animated.View
                    style={[
                        styles.cup1DraggableContainer,
                        {
                            transform: [
                                { translateX: cup1Position.x },
                                { translateY: cup1Position.y }
                            ]
                        }
                    ]}
                    {...cup1PanResponder.panHandlers}
                >
                    <Animated.View
                        style={{
                            transform: [
                                { rotateZ: cup1Shake.interpolate({
                                    inputRange: [-5, 5],
                                    outputRange: ['-5deg', '5deg']
                                })}
                            ]
                        }}
                    >
                        <Animated.Image 
                            source={require('./BrushGame/Cup1.png')} 
                            style={[styles.cup1, { opacity: cup1FadeOut }]}
                        />
                    </Animated.View>
                </Animated.View>
            )}
            
            {/* Red Arrow pointing to BrushPaste */}
            {showArrow && !showOverlay && !showCup && !showCup1Wiggle && (
                <Animated.View 
                    style={[
                        styles.arrowContainer,
                        { 
                            transform: [
                                { translateY: arrowBounce },
                                { rotate: '210deg' }
                            ] 
                        }
                    ]}
                >
                    <Svg width="60" height="150" viewBox="0 0 60 80">
                        <Path
                            d="M30 0 L30 55 M30 55 L15 40 M30 55 L45 40"
                            stroke="#FF6B6B"
                            strokeWidth={4}
                            strokeLinecap="round"
                            strokeDasharray="5, 5"
                            fill="none"
                        />
                    </Svg>
                </Animated.View>
            )}
            
            {/* Arrow pointing to Cup1 when it should be placed */}
            {showCup1Wiggle && !cup1Placed && !cup1IsDragging && (
                <Animated.View 
                    style={[
                        styles.cup1ArrowContainer,
                        { 
                            transform: [
                                { translateY: arrowBounce },
                                { rotate: '210deg' }
                            ] 
                        }
                    ]}
                >
                    <Svg width="60" height="150" viewBox="0 0 60 80">
                        <Path
                            d="M30 0 L30 55 M30 55 L15 40 M30 55 L45 40"
                            stroke="#FF6B6B"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="5, 5"
                            fill="none"
                        />
                    </Svg>
                </Animated.View>
            )}
            
            {/* Overlay Page - Brushing Instructions */}
            {showOverlay && (
                <Animated.View style={[styles.overlayContainer, { opacity: overlayFade }]}>
                    {/* Semi-transparent background */}
                    <View style={styles.overlayBackground} />
                    
                    {/* Back button - independent from swipe area */}
                    <View style={styles.overlayHeader}>
                        <TouchableOpacity onPress={handleCloseOverlay} style={{ zIndex: 1000 }}>
                            <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
                    </View>
                    
                    {/* Content with swipe gesture */}
                    <View style={styles.overlayContent} {...panResponder.panHandlers}>
                        
                        {/* Toothpaste - hide after paste is complete */}
                        {!pasteComplete && (
                            <Animated.Image 
                                source={require('./BrushGame/Toothpaste.png')} 
                                style={[
                                    styles.toothpaste,
                                    {
                                        transform: [
                                            { rotate: toothpasteRotation.interpolate({
                                                inputRange: [0, 30],
                                                outputRange: ['0deg', '-30deg']
                                            })}
                                        ]
                                    }
                                ]}
                            />
                        )}
                        
                        {/* Toothbrush */}
                        <Image 
                            source={require('./BrushGame/Toothbrush.png')} 
                            style={styles.toothbrush}
                        />
                        
                        {/* Paste on brush with only opacity reveal (no rotation) */}
                        <Animated.View style={styles.pasteContainer}>
                            <Animated.Image 
                                source={require('./BrushGame/Paste.png')} 
                                style={[
                                    styles.pasteOnBrush,
                                    {
                                        opacity: pasteOpacity
                                    }
                                ]}
                            />
                        </Animated.View>
                        
                        {/* Arrow and text - hide after paste is complete */}
                        {!pasteComplete && (
                            <>
                                <Image 
                                    source={require('./BrushGame/Arrow.png')} 
                                    style={styles.instructionArrow}
                                />
                                <Text style={styles.instructionText}>Swipe to the right</Text>
                            </>
                        )}
                    </View>
                </Animated.View>
            )}
            
            </Animated.View>
            
            {/* Draggable Toothbrush with Paste on Main Page */}
            {showDraggableBrush && !allCleaned && (
                <Animated.View
                    style={[
                        styles.draggableBrushContainer,
                        {
                            opacity: draggableBrushFadeOut,
                            transform: [
                                { translateX: brushPosition.x },
                                { translateY: brushPosition.y },
                                { scale: victoryScale }
                            ]
                        }
                    ]}
                    pointerEvents={showCup1Wiggle ? 'none' : 'box-none'}
                >
                    <View {...brushPanResponder.panHandlers} style={styles.touchableArea}>
                        <Image 
                            source={require('./BrushGame/Toothbrush.png')} 
                            style={styles.draggableToothbrush}
                        />
                        <Image 
                            source={require('./BrushGame/Paste.png')} 
                            style={styles.draggablePaste}
                        />
                        {/* Persistent foam that appears after first contact */}
                        {brushHasFoam && (
                            <Animated.Image 
                                source={require('./BrushGame/Foam.png')} 
                                style={[styles.draggableBrushFoam, { opacity: draggableBrushFoamOpacity }]}
                            />
                        )}
                    </View>
                </Animated.View>
            )}
            
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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameContentWrapper: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    background: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
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
        zIndex: 10,
    },
    backText: {
        fontSize: 20,
        color: '#244D4A',
        textDecorationLine: 'underline',
        fontWeight: '700',
        fontFamily: 'Fredoka_700Bold',
    },
    brush: {
        position: 'absolute',
        top: '26%', 
        left: '-3%', 
        width: 390,
        height: 390,
        resizeMode: 'contain',
    },
    brush6: {
        position: 'absolute',
        top: '26%', 
        left: '-40%', 
        width: 690,
        height: 390,
        resizeMode: 'contain',
    },
    brush7: {
        position: 'absolute',
        top: '26%', 
        left: '-40%', 
        width: 690,
        height: 390,
        resizeMode: 'contain',
    },
    paste: {
        width: 110,
        height: 95,
        resizeMode: 'contain',
    },
    pasteButton: {
        position: 'absolute',
        top: '70%',
        left: '65%',
        zIndex: 15,
    },
    cup: {
        width: 110,
        height: 95,
        resizeMode: 'contain',
    },
    cup1Button: {
        position: 'absolute',
        top: '77%',
        left: '76%',
        zIndex: 15,
    },
    cup1: {
        width: 104,
        height: 59,
        resizeMode: 'contain',
    },
    cup1DraggableContainer: {
        position: 'absolute',
        top: '72%',
        left: '77%',
        zIndex: 200,
        elevation: 200,
        width: 120,
        height: 80,
    },
    cup1TouchArea: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowContainer: {
        position: 'absolute',
        top: '80%',
        left: '62%',
        zIndex: 20,
    },
    cup1ArrowContainer: {
        position: 'absolute',
        top: '74%',
        left: '82%',
        zIndex: 80,
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    overlayBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(100, 100, 100, 0.85)'
    },
    overlayContent: {
        flex: 1,
        position: 'relative',
    },
    overlayHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 40,
        paddingHorizontal: 16,
        paddingBottom: 8,
        minHeight: 48,
        zIndex: 110,
    },
    toothpaste: {
        position: 'absolute',
        top: '15%',
        left: '2%',
        width: 260,
        height: 420,
        resizeMode: 'contain',
        transform: [{ rotate: '-2deg' }],
    },
    toothbrush: {
        position: 'absolute',
        top: '48%',
        left: '6%',
        width: 330,
        height: 130,
        resizeMode: 'contain',
        transform: [{ rotate: '0deg' }],
    },
    pasteContainer: {
        position: 'absolute',
        top: '47%',
        left: '9%',
        width: 105,
        height: 85,
        overflow: 'hidden',
    },
    pasteOnBrush: {
        width: 100,
        height: 80,
        resizeMode: 'contain',
        transform: [{ rotate: '-12deg' }],
    },
    instructionArrow: {
        position: 'absolute',
        top: '58%',
        left: '22%',
        width: 210,
        height: 110,
        resizeMode: 'contain',
    },
    instructionText: {
        position: 'absolute',
        top: '68%',
        left: '26%',
        fontSize: 25,
        fontWeight: '700',
        color: '#4DD9C6',
        fontFamily: 'Fredoka_700Bold',
        textAlign: 'center',
    },
    draggableBrushContainer: {
        position: 'absolute',
        width: 360,
        height: 160,
        zIndex: 50,
    },
    touchableArea: {
        width: 360,
        height: 160,
    },
    draggableToothbrush: {
        position: 'absolute',
        width: 280,
        height: 80,
        resizeMode: 'contain',
    },
    draggablePaste: {
        position: 'absolute',
        top: -5,
        left: 49,
        width: 57,
        height: 47,
        resizeMode: 'contain',
        transform: [{ rotate: '-12deg' }],
    },
    draggableBrushFoam: {
        position: 'absolute',
        top: -20,
        left: 34,
        width: 90,
        height: 90,
        resizeMode: 'contain',
        zIndex: 49,
    },
    tartar: {
        position: 'absolute',
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 35,
    },
    tartarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    adjustmentPanel: {
        position: 'absolute',
        top: 60,
        right: 16,
        backgroundColor: 'rgba(36, 77, 74, 0.9)',
        borderRadius: 8,
        padding: 12,
        zIndex: 1000,
        minWidth: 180,
    },
    adjustmentTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4DD9C6',
        fontFamily: 'Fredoka_700Bold',
        marginBottom: 4,
    },
    adjustmentInfo: {
        fontSize: 12,
        color: '#FFFFFF',
        fontFamily: 'Fredoka_400Regular',
        marginBottom: 8,
    },
    adjustmentControls: {
        gap: 8,
    },
    adjustButton: {
        backgroundColor: '#4DD9C6',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    adjustButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#244D4A',
        fontFamily: 'Fredoka_600SemiBold',
    },
});

export default BrushTeethGame;
