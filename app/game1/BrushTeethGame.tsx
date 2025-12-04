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
    const [foamProgress, setFoamProgress] = useState<{[key: number]: number}>({});
    const brushes = [
        require('./BrushGame/Brush1.png'), 
        require('./BrushGame/Brush2.png'), 
        require('./BrushGame/Brush3.png'), 
        require('./BrushGame/Brush4.png')
    ];
    
    // Define markers with adjustable positions and opacity
    const markers = [
        { id: 1, x: 100, y: 408, opacity: 0 },
        { id: 2, x: 130, y: 405, opacity: 0 },
        { id: 3, x: 170, y: 405, opacity: 0 },
        { id: 4, x: 100, y: 445, opacity: 0 },
        { id: 5, x: 200, y: 408, opacity: 0 },
        { id: 6, x: 220, y: 410, opacity: 0 },  
        { id: 7, x: 140, y: 450, opacity: 0 },  
        { id: 8, x: 180, y: 445, opacity: 0 },
        { id: 9, x: 210, y: 450, opacity: 0 },
        { id: 10, x: 110, y: 453, opacity: 0 },
        { id: 11, x: 160, y: 460, opacity: 0 },
        { id: 12, x: 190, y: 460, opacity: 0 },
        { id: 13, x: 130, y: 455, opacity: 0 },
    ];
    
    const router = useRouter();
    
    // Opacity values for each brush image
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
    
    // Pan responder for draggable toothbrush with paste
    const dragOffset = useRef({ x: 0, y: 0 });
    const foamAnimations = useRef<{[key: number]: Animated.Value}>({});
    
    // Initialize foam animation values for each marker
    useEffect(() => {
        markers.forEach((marker) => {
            if (!foamAnimations.current[marker.id]) {
                foamAnimations.current[marker.id] = new Animated.Value(0);
            }
        });
    }, []);
    
    // Collision detection helper - detects paste collision with markers
    const checkCollision = (brushX: number, brushY: number) => {
        // Position of the paste relative to the brush container
        const pasteOffsetX = 56; // left position from draggablePaste style
        const pasteOffsetY = 0;   // top position from draggablePaste style
        const pasteWidth = 70;
        const pasteHeight = 65;
        
        // Calculate actual paste position on screen
        const pasteX = brushX + pasteOffsetX;
        const pasteY = brushY + pasteOffsetY;
        const pasteCenterX = pasteX + pasteWidth / 2;
        const pasteCenterY = pasteY + pasteHeight / 2;
        
        const detectionRadius = 40; // How close paste needs to be to marker
        
        markers.forEach((marker) => {
            // Calculate distance between paste center and marker center
            const distance = Math.sqrt(
                Math.pow(pasteCenterX - marker.x, 2) + 
                Math.pow(pasteCenterY - marker.y, 2)
            );
            
            if (distance < detectionRadius) {
                // Paste is touching this marker - gradually increase foam
                const currentProgress = foamProgress[marker.id] || 0;
                if (currentProgress < 1) {
                    // Increment foam progress
                    const newProgress = Math.min(currentProgress + 0.05, 1);
                    setFoamProgress(prev => ({
                        ...prev,
                        [marker.id]: newProgress
                    }));
                    
                    // Animate foam opacity
                    Animated.timing(foamAnimations.current[marker.id], {
                        toValue: newProgress,
                        duration: 100,
                        useNativeDriver: true,
                    }).start();
                }
            }
        });
    };
    
    const brushPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // Store current position when touch starts
                dragOffset.current = {
                    x: (brushPosition.x as any)._value,
                    y: (brushPosition.y as any)._value
                };
            },
            onPanResponderMove: (_, gestureState) => {
                // Update position based on gesture + initial offset
                const newX = dragOffset.current.x + gestureState.dx;
                const newY = dragOffset.current.y + gestureState.dy;
                brushPosition.setValue({
                    x: newX,
                    y: newY
                });
                // Check for collisions with markers
                checkCollision(newX, newY);
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
                                // After Brush4 is fully visible, immediately show arrow and start shake
                                const timer4 = setTimeout(() => {
                                    setShowArrow(true);
                                    setCanClickPaste(true);
                                    setCanClickPaste(true); // enable clicking when shake begins
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
                                }, 0);
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
            
            {/* Markers - invisible collision targets */}
            {showDraggableBrush && markers.map((marker) => (
                <View
                    key={marker.id}
                    style={[
                        styles.marker,
                        {
                            left: marker.x,
                            top: marker.y,
                            opacity: marker.opacity,
                        }
                    ]}
                />
            ))}
            
            {/* Foam overlays - appear gradually when paste touches markers */}
            {showDraggableBrush && markers.map((marker) => {
                const progress = foamProgress[marker.id] || 0;
                if (progress === 0) return null; // Don't render if no progress
                
                return (
                    <Animated.Image
                        key={`foam-${marker.id}`}
                        source={require('./BrushGame/Foam.png')}
                        style={[
                            styles.foam,
                            {
                                left: marker.x - 50, // Center foam on marker
                                top: marker.y - 50,  // Center foam on marker
                                opacity: foamAnimations.current[marker.id] || 0,
                            }
                        ]}
                    />
                );
            })}
            
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
        top: '45%',
        left: '1%',
        width: 360,
        height: 160,
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
        width: 105,
        height: 85,
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
        width: 300,
        height: 100,
        resizeMode: 'contain',
    },
    draggablePaste: {
        position: 'absolute',
        top: 0,
        left: 56,
        width: 70,
        height: 65,
        resizeMode: 'contain',
        transform: [{ rotate: '-12deg' }],
    },
    marker: {
        position: 'absolute',
        width: 50,
        height: 50,
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        borderRadius: 25,
        zIndex: 30,
    },
    foam: {
        position: 'absolute',
        width: 100,
        height: 100,
        resizeMode: 'contain',
        zIndex: 40,
    },
});

export default BrushTeethGame;
