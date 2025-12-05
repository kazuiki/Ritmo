import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BrushTeethGame = () => {
    const [brushIndex, setBrushIndex] = useState(0);
    const [showArrow, setShowArrow] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [pasteComplete, setPasteComplete] = useState(false);
    const [showDraggableBrush, setShowDraggableBrush] = useState(false);
    const [canClickPaste, setCanClickPaste] = useState(false);
    const [showCup, setShowCup] = useState(false);
    const [showTartars, setShowTartars] = useState(false);
    
    // Cleaning state for all 24 tartars
    const [tartarsCleaning, setTartarsCleaning] = useState<boolean[]>(new Array(24).fill(false));
    const [tartarsCleaned, setTartarsCleaned] = useState<boolean[]>(new Array(24).fill(false));
    
    const brushes = [
        require('./BrushGame/Brush1.png'), 
        require('./BrushGame/Brush2.png'), 
        require('./BrushGame/Brush3.png'), 
        require('./BrushGame/Brush4.png')
    ];

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
    
    // Cleaning animation values for all 24 tartars
    const tartarsOpacity = useRef(tartars.map(() => new Animated.Value(1))).current;
    const foamsOpacity = useRef(tartars.map(() => new Animated.Value(0))).current;
    const cleaningInProgress = useRef<boolean[]>(new Array(24).fill(false));
    
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
                    brushPosition.setValue({ x: 10, y: 300 });
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
                const brushPasteY = newY + 32; // top offset + half paste height (~65/2)
                
                const collisionRadius = 40; // Adjust for sensitivity
                
                // Check collision with all tartars
                tartars.forEach((tartar, index) => {
                    // Skip if already cleaned or cleaning in progress
                    if (tartarsCleaned[index] || cleaningInProgress.current[index]) {
                        return;
                    }
                    
                    // Calculate tartar center
                    const tartarCenterX = tartar.x + tartar.width / 2;
                    const tartarCenterY = tartar.y + tartar.height / 2;
                    
                    // Check if brush paste overlaps with tartar
                    const distance = Math.sqrt(
                        Math.pow(brushPasteX - tartarCenterX, 2) + 
                        Math.pow(brushPasteY - tartarCenterY, 2)
                    );
                    
                    if (distance < collisionRadius) {
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
                                duration: 2000,
                                useNativeDriver: true,
                            }),
                            Animated.timing(foamsOpacity[index], {
                                toValue: 1,
                                duration: 2000,
                                useNativeDriver: true,
                            })
                        ]).start(() => {
                            // After animation completes, mark as cleaned
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

    useEffect(() => {
        // Preload all images to avoid first-frame decode delays
        Asset.loadAsync([
            require('./BrushGame/Cup.png'),
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
            <Image source={require('./BrushGame/BrushBG.png')} style={styles.background} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
            </View>
            {/* All brush images stacked on top of each other with varying opacity */}
            <Animated.Image source={brushes[0]} style={[styles.brush, { opacity: opacity1 }]} />
            <Animated.Image source={brushes[1]} style={[styles.brush, { opacity: opacity2 }]} />
            <Animated.Image source={brushes[2]} style={[styles.brush, { opacity: opacity3 }]} />
            <Animated.Image source={brushes[3]} style={[styles.brush, { opacity: opacity4 }]} />
            
            {/* Tartars on teeth - appear all at once when Brush4 appears */}
            {showTartars && tartars.map((tartar, index) => {
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
            {showTartars && tartars.map((tartar, index) => 
                tartarsCleaning[index] ? (
                    <Animated.Image
                        key={`foam-${tartar.id}`}
                        source={require('./BrushGame/Foam.png')}
                        style={{
                            position: 'absolute',
                            left: tartar.x - 15,
                            top: tartar.y - 15,
                            width: 60,
                            height: 60,
                            opacity: foamsOpacity[index],
                            resizeMode: 'contain',
                            zIndex: 36,
                        }}
                    />
                ) : null
            )}
            
            {/* BrushPaste or Cup on main page */}
            {!showCup ? (
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
                <View style={styles.pasteButton}>
                    <Image 
                        source={require('./BrushGame/Cup.png')} 
                        style={styles.cup}
                    />
                </View>
            )}
            
            {/* Red Arrow pointing to BrushPaste */}
            {showArrow && !showOverlay && !showCup && (
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
            
            {/* Draggable Toothbrush with Paste on Main Page */}
            {showDraggableBrush && (
                <Animated.View
                    style={[
                        styles.draggableBrushContainer,
                        {
                            transform: [
                                { translateX: brushPosition.x },
                                { translateY: brushPosition.y }
                            ]
                        }
                    ]}
                    pointerEvents="box-none"
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
                    </View>
                </Animated.View>
            )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    paste: {
        width: 150,
        height: 130,
        resizeMode: 'contain',
    },
    pasteButton: {
        position: 'absolute',
        top: '68%',
        left: '65%',
        zIndex: 15,
    },
    cup: {
        width: 150,
        height: 130,
        resizeMode: 'contain',
    },
    arrowContainer: {
        position: 'absolute',
        top: '78%',
        left: '69%',
        zIndex: 20,
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
