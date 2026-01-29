// app/game4/SchoolGame.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SchoolGame() {
  const router = useRouter();
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [poloshirtPlaced, setPoloshirtPlaced] = useState(false);
  const [vestPlacedOnSchool2, setVestPlacedOnSchool2] = useState(false);
  const [pantsPlaced, setPantsPlaced] = useState(false);
  const [shoesPlaced, setShoesPlaced] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [bagContainersOpen, setBagContainersOpen] = useState(false);
  const [bagClickable, setBagClickable] = useState(false);
  const [backgroundAnimationPlayed, setBackgroundAnimationPlayed] = useState(false);
  const [bagContainersClosing, setBagContainersClosing] = useState(false);
  const [tumblerPlaced, setTumblerPlaced] = useState(false);
  const [notebookPlaced, setNotebookPlaced] = useState(false);
  const [pouchPlaced, setPouchPlaced] = useState(false);
  const [lunchboxPlaced, setLunchboxPlaced] = useState(false);
  const [draggingBagItem, setDraggingBagItem] = useState<string | null>(null);
  const [school6AudioPlayed, setSchool6AudioPlayed] = useState(false);
  const [school7AudioPlayed, setSchool7AudioPlayed] = useState(false);
  const [school7Completed, setSchool7Completed] = useState(false);
  
  const cabinetOpacity = useRef(new Animated.Value(1)).current;
  const cabinet1Opacity = useRef(new Animated.Value(0)).current;

  const school1Opacity = useRef(new Animated.Value(1)).current;
  const school2Opacity = useRef(new Animated.Value(0)).current;
  const school3Opacity = useRef(new Animated.Value(0)).current;
  const school4Opacity = useRef(new Animated.Value(0)).current;
  const school5Opacity = useRef(new Animated.Value(0)).current;
  const school6Opacity = useRef(new Animated.Value(0)).current;
  const school5Page2Opacity = useRef(new Animated.Value(0)).current;
  const school7Opacity = useRef(new Animated.Value(0)).current;
  
  const poloshirtOpacity = useRef(new Animated.Value(1)).current;
  const vestOpacity = useRef(new Animated.Value(1)).current;
  const pantsOpacity = useRef(new Animated.Value(1)).current;
  const shoesOpacity = useRef(new Animated.Value(1)).current;

  // Bag container animations
  const bagOverlayOpacity = useRef(new Animated.Value(0)).current;
  const bagOpacity = useRef(new Animated.Value(1)).current;
  const container1ScaleAnim = useRef(new Animated.Value(0)).current;
  const container2ScaleAnim = useRef(new Animated.Value(0)).current;

  // Clothing item positions
  const poloshirtX = useRef(new Animated.Value(0)).current;
  const poloshirtY = useRef(new Animated.Value(0)).current;
  const vestX = useRef(new Animated.Value(0)).current;
  const vestY = useRef(new Animated.Value(0)).current;
  const pantsX = useRef(new Animated.Value(0)).current;
  const pantsY = useRef(new Animated.Value(0)).current;
  const shoesX = useRef(new Animated.Value(0)).current;
  const shoesY = useRef(new Animated.Value(0)).current;

  // Bag item positions and opacities
  const lunchboxX = useRef(new Animated.Value(0)).current;
  const lunchboxY = useRef(new Animated.Value(0)).current;
  const lunchbox1X = useRef(new Animated.Value(0)).current;
  const lunchbox1Y = useRef(new Animated.Value(0)).current;
  const notebookX = useRef(new Animated.Value(0)).current;
  const notebookY = useRef(new Animated.Value(0)).current;
  const notebook1X = useRef(new Animated.Value(0)).current;
  const notebook1Y = useRef(new Animated.Value(0)).current;
  const pouchX = useRef(new Animated.Value(0)).current;
  const pouchY = useRef(new Animated.Value(0)).current;
  const pouch1X = useRef(new Animated.Value(0)).current;
  const pouch1Y = useRef(new Animated.Value(0)).current;
  const tumblerX = useRef(new Animated.Value(0)).current;
  const tumblerY = useRef(new Animated.Value(0)).current;
  const tumbler1X = useRef(new Animated.Value(0)).current;
  const tumbler1Y = useRef(new Animated.Value(0)).current;

  const lunchboxOpacity = useRef(new Animated.Value(1)).current;
  const lunchbox1Opacity = useRef(new Animated.Value(0)).current;
  const notebookOpacity = useRef(new Animated.Value(1)).current;
  const notebook1Opacity = useRef(new Animated.Value(0)).current;
  const pouchOpacity = useRef(new Animated.Value(1)).current;
  const pouch1Opacity = useRef(new Animated.Value(0)).current;
  const tumblerOpacity = useRef(new Animated.Value(1)).current;
  const tumbler1Opacity = useRef(new Animated.Value(0)).current;

  // Pulse animations
  const poloshirtPulseAnim = useRef(new Animated.Value(1)).current;
  const vestPulseAnim = useRef(new Animated.Value(1)).current;
  const pantsPulseAnim = useRef(new Animated.Value(1)).current;
  const shoesPulseAnim = useRef(new Animated.Value(1)).current;

  const poloshirtPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const vestPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pantsPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const shoesPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Background pan animation
  const bgScrollX = useRef(new Animated.Value(0)).current;

  // Audio refs
  const bgSoundRef = useRef<Audio.Sound | null>(null);
  const school6SoundRef = useRef<Audio.Sound | null>(null);
  const school7SoundRef = useRef<Audio.Sound | null>(null);
  const cabinetSoundRef = useRef<Audio.Sound | null>(null);

  // Victory transition animation
  const victoryScale = useRef(new Animated.Value(1)).current;
  const victoryOpacity = useRef(new Animated.Value(0)).current;

  // Track current position values
  const poloshirtX_value = useRef(0);
  const poloshirtY_value = useRef(0);
  const vestX_value = useRef(0);
  const vestY_value = useRef(0);
  const pantsX_value = useRef(0);
  const pantsY_value = useRef(0);
  const shoesX_value = useRef(0);
  const shoesY_value = useRef(0);

  // Background music
  useEffect(() => {
    let isMounted = true;

    const startBackgroundSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('./SchoolGame/SchoolBG.mp3'),
          { isLooping: true, volume: 0.5, shouldPlay: true }
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        bgSoundRef.current = sound;
        await sound.playAsync();
      } catch (error) {
        console.warn('Failed to start SchoolGame background sound', error);
      }
    };

    startBackgroundSound();

    return () => {
      isMounted = false;
      if (bgSoundRef.current) {
        bgSoundRef.current.unloadAsync();
        bgSoundRef.current = null;
      }
      if (cabinetSoundRef.current) {
        cabinetSoundRef.current.stopAsync().catch(() => {});
        cabinetSoundRef.current.unloadAsync().catch(() => {});
        cabinetSoundRef.current = null;
      }
      if (school6SoundRef.current) {
        school6SoundRef.current.stopAsync().catch(() => {});
        school6SoundRef.current.unloadAsync().catch(() => {});
        school6SoundRef.current = null;
      }
      if (school7SoundRef.current) {
        school7SoundRef.current.setOnPlaybackStatusUpdate(null);
        school7SoundRef.current.stopAsync().catch(() => {});
        school7SoundRef.current.unloadAsync().catch(() => {});
        school7SoundRef.current = null;
      }
    };
  }, []);

  // Setup position listeners
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

  // PULSE FUNCTIONS FOR CLOTHING ITEMS
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

  // No auto-pulsing - items only pulse when other items are being dragged

  // HANDLE BAG CONTAINERS CLOSE
  const handleCloseBagContainers = () => {
    setBagContainersClosing(true);
    
    Animated.parallel([
      Animated.timing(bagOverlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(container1ScaleAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }),
      Animated.spring(container2ScaleAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setBagContainersOpen(false);
      setBagContainersClosing(false);
    });
  };
  const handleBagClick = () => {
    if (bagContainersOpen || bagContainersClosing) return; // Prevent clicks during open or closing
    
    setBagContainersOpen(true);
    
    // Animate overlay and containers appearance with spring for nice popup effect
    Animated.parallel([
      Animated.timing(bagOverlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.spring(container1ScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: false,
      }),
      Animated.spring(container2ScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // BAG ITEMS COLLISION DETECTION - Check if draggable item is near its target in Bag1.png
  const checkBagItemCollision = (itemName: string, x: number, y: number): boolean => {
    // Container 2 is positioned below Container 1
    // Just check if item is dragged downward significantly (below Container 1 which is ~90px tall + margins)
    // This makes the drop zone span the entire Container 2 width for smooth interactions
    return y > 100;
  };

  // BAG ITEMS PAN RESPONDERS
  const createBagItemPanResponder = (
    itemName: string,
    animX: Animated.Value,
    animY: Animated.Value,
    itemOpacity: Animated.Value,
    targetOpacity: Animated.Value,
    setPlaced: (placed: boolean) => void,
    placed: boolean
  ) => {
    return useMemo(() => {
      return PanResponder.create({
        onStartShouldSetPanResponder: () => !placed,
        onMoveShouldSetPanResponder: () => !placed,
        onPanResponderGrant: () => {
          setDraggingBagItem(itemName);
          animX.extractOffset();
          animY.extractOffset();
        },
        onPanResponderMove: (_, gesture) => {
          animX.setValue(gesture.dx);
          animY.setValue(gesture.dy);

          // Use gesture values directly for collision detection
          // gesture.dx and gesture.dy represent the current drag offset
          if (checkBagItemCollision(itemName, gesture.dx, gesture.dy)) {
            Animated.timing(targetOpacity, {
              toValue: 0.8,
              duration: 150,
              useNativeDriver: false,
            }).start();
          } else {
            Animated.timing(targetOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderRelease: (_, gesture) => {
          setDraggingBagItem(null);
          animX.flattenOffset();
          animY.flattenOffset();

          // Check if item was dropped in correct position using gesture values
          if (checkBagItemCollision(itemName, gesture.dx, gesture.dy)) {
            // Success! Place the item
            setPlaced(true);
            
            // Fade out the draggable item
            Animated.timing(itemOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }).start();

            // Make target item fully visible
            Animated.timing(targetOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }).start();

            // Keep item in final position
            animX.setValue(gesture.dx);
            animY.setValue(gesture.dy);
          } else {
            // Spring back to original position with moderate, smooth effect
            Animated.spring(animX, {
              toValue: 0,
              friction: 11,
              tension: 65,
              useNativeDriver: false,
            }).start();
            
            Animated.spring(animY, {
              toValue: 0,
              friction: 11,
              tension: 65,
              useNativeDriver: false,
            }).start();

            // Hide target item opacity
            Animated.timing(targetOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start();
          }
        },
      });
    }, [placed, itemName, animX, animY, itemOpacity, targetOpacity, setPlaced]);
  };

  // Create PanResponders for each bag item
  const tumblerPan = createBagItemPanResponder('tumbler', tumblerX, tumblerY, tumblerOpacity, tumbler1Opacity, setTumblerPlaced, tumblerPlaced);
  const notebookPan = createBagItemPanResponder('notebook', notebookX, notebookY, notebookOpacity, notebook1Opacity, setNotebookPlaced, notebookPlaced);
  const pouchPan = createBagItemPanResponder('pouch', pouchX, pouchY, pouchOpacity, pouch1Opacity, setPouchPlaced, pouchPlaced);
  const lunchboxPan = createBagItemPanResponder('lunchbox', lunchboxX, lunchboxY, lunchboxOpacity, lunchbox1Opacity, setLunchboxPlaced, lunchboxPlaced);

  // Trigger background pan and School6.gif appearance 1 second after shoes placed
  useEffect(() => {
    if (shoesPlaced && !backgroundAnimationPlayed) {
      setBackgroundAnimationPlayed(true);
      // Wait 1 second, then start background slide AND show School6.gif together
      setTimeout(() => {
        // Ensure no prior native-driven animations are attached
        bgScrollX.stopAnimation();
        Animated.parallel([
          // Animate background from page 1 to page 2 over 8 seconds with smooth easing
          Animated.timing(bgScrollX, {
            toValue: -SCREEN_WIDTH,
            duration: 8000,
            useNativeDriver: false,
            easing: (t) => {
              // Cubic ease-in-out for smooth motion
              return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            },
          }),
          // Hide School5.png page 1 while showing School6.gif
          Animated.timing(school5Opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
            easing: (t) => {
              // Cubic ease-in-out
              return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            },
          }),
          // Show School6.gif at the same time (plays once on page 1)
          Animated.timing(school6Opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
            easing: (t) => {
              // Cubic ease-in-out
              return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            },
          }),
        ]).start(() => {
          // After background finishes sliding (8 seconds), smoothly transition from School6.gif to School5.png on page 2
          Animated.parallel([
            // Fade out School6.gif completely - it should not play again
            Animated.timing(school6Opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: false,
              easing: (t) => {
                // Cubic ease-in-out
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              },
            }),
            // Fade in School5.png (page 2)
            Animated.timing(school5Page2Opacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: false,
              easing: (t) => {
                // Cubic ease-in-out
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              },
            }),
          ]).start(() => {
            // After transition completes, make bag clickable
            setBagClickable(true);
          });
        });
      }, 1000); // 1 second delay
    }
  }, [shoesPlaced, backgroundAnimationPlayed]);

  // POP OUT BAG CONTAINERS AND TRANSITION TO SCHOOL7.GIF after all items are placed
  useEffect(() => {
    if (tumblerPlaced && notebookPlaced && pouchPlaced && lunchboxPlaced && bagContainersOpen) {
      // All items are placed! Close the bag containers with pop-out effect
      setTimeout(() => {
        // Pop out animation - scale up then fade out
        Animated.parallel([
          Animated.timing(bagOverlayOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
            easing: (t) => {
              // Cubic ease-out
              return 1 - Math.pow(1 - t, 3);
            },
          }),
          Animated.spring(container1ScaleAnim, {
            toValue: 0,
            friction: 6,
            tension: 100,
            useNativeDriver: false,
          }),
          Animated.spring(container2ScaleAnim, {
            toValue: 0,
            friction: 6,
            tension: 100,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // After pop-out completes, close the modal
          setBagContainersOpen(false);
          setBagContainersClosing(false);

          // Wait 1 second, then transition from School5Page2 to School7Gif
          setTimeout(() => {
            Animated.parallel([
              // Fade out School5Page2
              Animated.timing(school5Page2Opacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: false,
                easing: (t) => {
                  // Cubic ease-in-out
                  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                },
              }),
              // Fade in School7Gif
              Animated.timing(school7Opacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: false,
                easing: (t) => {
                  // Cubic ease-in-out
                  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                },
              }),
            ]).start();
          }, 1000); // 1 second wait after pop-out
        });
      }, 300); // Small delay before starting pop-out
    }
  }, [tumblerPlaced, notebookPlaced, pouchPlaced, lunchboxPlaced, bagContainersOpen]);

  // FADE OUT BAG.PNG 1 second after School7.gif starts
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Check if School7 is visible (opacity > 0)
    school7Opacity.addListener(({ value }) => {
      if (value > 0.5) {
        // School7 is showing, start the 1-second timer
        timeoutId = setTimeout(() => {
          Animated.timing(bagOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
            easing: (t) => {
              // Cubic ease-out
              return 1 - Math.pow(1 - t, 3);
            },
          }).start();
        }, 1000); // 1 second after School7 is visible
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [school7Opacity, bagOpacity]);

  // Play School6.mp3 when School6.gif appears
  useEffect(() => {
    const listenerId = school6Opacity.addListener(({ value }) => {
      if (value > 0.5 && !school6AudioPlayed) {
        setSchool6AudioPlayed(true);
        // School6 is visible, play School6.mp3
        (async () => {
          try {
            const { sound } = await Audio.Sound.createAsync(
              require('./SchoolGame/School6.mp3'),
              { shouldPlay: true, volume: 1.0 }
            );
            school6SoundRef.current = sound;
          } catch (error) {
            console.warn('Failed to play School6 audio', error);
          }
        })();
      }
    });

    return () => {
      school6Opacity.removeListener(listenerId);
    };
  }, [school6Opacity, school6AudioPlayed]);

  // Play School7.mp3 when School7.gif appears
  useEffect(() => {
    const listenerId = school7Opacity.addListener(({ value }) => {
      if (value > 0.5 && !school7AudioPlayed) {
        setSchool7AudioPlayed(true);
        setSchool7Completed(false);
        // School7 is visible, play School7.mp3
        (async () => {
          try {
            const { sound } = await Audio.Sound.createAsync(
              require('./SchoolGame/School7.mp3'),
              { shouldPlay: false, volume: 1.0 }
            );
            school7SoundRef.current = sound;

            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && status.didJustFinish) {
                setSchool7Completed(true);
              }
            });

            await sound.playAsync().catch(() => {
              setSchool7Completed(true);
            });
          } catch (error) {
            console.warn('Failed to play School7 audio', error);
            setSchool7Completed(true);
          }
        })();
      }
    });

    return () => {
      school7Opacity.removeListener(listenerId);
    };
  }, [school7Opacity, school7AudioPlayed]);

  // Success scene after School7 finishes playing
  useEffect(() => {
    if (!school7Completed) return;

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
        }),
      ]).start(() => {
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
  }, [bgSoundRef, router, school7Completed, victoryOpacity, victoryScale]);

  // COLLISION DETECTION FOR CLOTHING ITEMS
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

  // ITEM POSITIONS IN CABINET
  const itemPositions = {
    poloshirt: { top: SCREEN_HEIGHT * 0.35, left: SCREEN_WIDTH * 0.20, size: 110 },
    vest: { top: SCREEN_HEIGHT * 0.35, left: SCREEN_WIDTH * 0.47, size: 110 },
    pants: { top: SCREEN_HEIGHT * 0.51, left: SCREEN_WIDTH * 0.20, size: 110 },
    shoes: { top: SCREEN_HEIGHT * 0.57, left: SCREEN_WIDTH * 0.50, size: 85 },
  };

  // PAN RESPONDER FOR CLOTHING ITEMS
  const makePanResponder = (itemType: string, x: Animated.Value, y: Animated.Value) =>
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (evt, gestureState) => {
        setIsDragging(itemType);
        x.setOffset((x as any)._value);
        y.setOffset((y as any)._value);
        x.setValue(0);
        y.setValue(0);

        // Stop the pulse animation of the item being dragged (if it was pulsing)
        if (itemType === 'poloshirt') {
          stopPoloshirtPulse();
        } else if (itemType === 'vest') {
          stopVestPulse();
        } else if (itemType === 'pants') {
          stopPantsPulse();
        } else if (itemType === 'shoes') {
          stopShoesPulse();
        }

        // Reset opacity values to ensure they're at full visibility when starting drag
        if (itemType === 'poloshirt' && !poloshirtPlaced) {
          poloshirtOpacity.setValue(1);
        } else if (itemType === 'vest' && !vestPlacedOnSchool2) {
          vestOpacity.setValue(1);
        } else if (itemType === 'pants' && !pantsPlaced) {
          pantsOpacity.setValue(1);
        } else if (itemType === 'shoes' && !shoesPlaced) {
          shoesOpacity.setValue(1);
        }

        // Start pulsing the target item when dragging others
        if (itemType === 'vest' && !poloshirtPlaced) {
          startPoloshirtPulse(); // Poloshirt pulses when dragging vest
        } else if (itemType === 'pants' && !poloshirtPlaced) {
          startPoloshirtPulse(); // Poloshirt pulses when dragging pants
        } else if (itemType === 'pants' && poloshirtPlaced && !vestPlacedOnSchool2) {
          startVestPulse(); // Vest pulses when dragging pants
        } else if (itemType === 'shoes' && !poloshirtPlaced) {
          startPoloshirtPulse(); // Poloshirt pulses when dragging shoes
        } else if (itemType === 'shoes' && poloshirtPlaced && !vestPlacedOnSchool2) {
          startVestPulse(); // Vest pulses when dragging shoes
        } else if (itemType === 'shoes' && poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
          startPantsPulse(); // Pants pulses when dragging shoes
        }

        // Show next School image preview when dragging starts
        if (itemType === 'poloshirt' && !poloshirtPlaced) {
          // When poloshirt is dragged, show School2 preview and hide School1
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

        if (itemType === 'vest' && poloshirtPlaced && !vestPlacedOnSchool2) {
          // When vest is dragged (after poloshirt placed), show School3 preview and hide School2
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

        if (itemType === 'pants' && poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
          // When pants is dragged (after vest placed), show School4 preview and hide School3
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

        if (itemType === 'shoes' && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced) {
          // When shoes is dragged (after pants placed), show School5 preview and hide School4
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
      },
      onPanResponderMove: Animated.event([null, { dx: x, dy: y }], { useNativeDriver: false }),
      onPanResponderRelease: (evt, gestureState) => {
        x.flattenOffset();
        y.flattenOffset();

        // Check if user actually dragged (moved more than 10 pixels)
        const wasDragged = Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;

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

        const isOnBoy = wasDragged && checkCollisionWithBoy(currentX, currentY, itemPosition.size);

        // Track if placement was successful
        let placementSuccessful = false;

        if (isOnBoy) {
          // Item placed on boy (School1 position)
          if (itemType === 'poloshirt' && !poloshirtPlaced) {
            // POLOSHIRT PLACEMENT LOGIC
            placementSuccessful = true;
            setPoloshirtPlaced(true);
            
            // Stop ALL pulse animations and reset scales immediately
            stopPoloshirtPulse();
            stopVestPulse();
            stopPantsPulse();
            stopShoesPulse();

            // Stop any running animations on these values to prevent conflicts
            school1Opacity.stopAnimation();
            school2Opacity.stopAnimation();
            poloshirtOpacity.stopAnimation();

            // Transition: School1 to 0%, School2 to 100%, Poloshirt fades out
            Animated.parallel([
              Animated.timing(school1Opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(school2Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(poloshirtOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Poloshirt placed, School2 now fully visible');
            });
          } else if (itemType === 'vest' && poloshirtPlaced && !vestPlacedOnSchool2) {
            // VEST PLACEMENT LOGIC (after poloshirt)
            placementSuccessful = true;
            setVestPlacedOnSchool2(true);
            
            // Stop ALL pulse animations and reset scales immediately
            stopPoloshirtPulse();
            stopVestPulse();
            stopPantsPulse();
            stopShoesPulse();

            // Stop any running animations on these values to prevent conflicts
            school2Opacity.stopAnimation();
            school3Opacity.stopAnimation();
            vestOpacity.stopAnimation();

            // Transition: School2 to 0%, School3 to 100%, Vest fades out
            Animated.parallel([
              Animated.timing(school2Opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(school3Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(vestOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Vest placed, School3 now fully visible');
            });
          } else if (itemType === 'pants' && poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
            // PANTS PLACEMENT LOGIC (after vest)
            placementSuccessful = true;
            setPantsPlaced(true);
            
            // Stop ALL pulse animations and reset scales immediately
            stopPoloshirtPulse();
            stopVestPulse();
            stopPantsPulse();
            stopShoesPulse();

            // Stop any running animations on these values to prevent conflicts
            school3Opacity.stopAnimation();
            school4Opacity.stopAnimation();
            pantsOpacity.stopAnimation();

            // Transition: School3 to 0%, School4 to 100%, Pants fades out
            Animated.parallel([
              Animated.timing(school3Opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(school4Opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
              }),
              Animated.timing(pantsOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Pants placed, School4 now fully visible');
            });
          } else if (itemType === 'shoes' && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced) {
            // SHOES PLACEMENT LOGIC (final clothing item)
            placementSuccessful = true;
            setShoesPlaced(true);
            
            // Stop ALL pulse animations and reset scales immediately
            stopPoloshirtPulse();
            stopVestPulse();
            stopPantsPulse();
            stopShoesPulse();

            // Stop any running animations on these values to prevent conflicts
            school4Opacity.stopAnimation();
            school5Opacity.stopAnimation();
            shoesOpacity.stopAnimation();

            // Transition: School5 to 100%, Shoes fades out smoothly
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
                duration: 800,
                useNativeDriver: false,
              }),
            ]).start(() => {
              console.log('Shoes placed, School5 now fully visible - all clothing items placed');
              
              // GAME COMPLETED - STOP HERE AT SCHOOL5.PNG
              // No further transitions to School6.gif or bag
            });
          }
        } else {
          // Item NOT placed on boy - reset to previous state
          
          if (itemType === 'poloshirt' && !poloshirtPlaced) {
            // Restore School1 and hide School2 preview
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
          
          if (itemType === 'vest' && poloshirtPlaced && !vestPlacedOnSchool2) {
            // Restore School2 and hide School3 preview
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

          if (itemType === 'pants' && poloshirtPlaced && vestPlacedOnSchool2 && !pantsPlaced) {
            // Restore School3 and hide School4 preview
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

          if (itemType === 'shoes' && poloshirtPlaced && vestPlacedOnSchool2 && pantsPlaced && !shoesPlaced) {
            // Restore School4 and hide School5 preview
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
        }

        // Return item to original position ONLY if placement was NOT successful
        if (!placementSuccessful) {
          Animated.spring(x, { toValue: 0, useNativeDriver: false, friction: 8, tension: 40 }).start();
          Animated.spring(y, { toValue: 0, useNativeDriver: false, friction: 8, tension: 40 }).start();
        }
        
        setIsDragging(null);

        // Stop all pulsing when drag ends
        stopPoloshirtPulse();
        stopVestPulse();
        stopPantsPulse();
        stopShoesPulse();
      },
      onPanResponderTerminate: () => {
        setIsDragging(null);
        
        // Stop all pulsing when drag is terminated
        stopPoloshirtPulse();
        stopVestPulse();
        stopPantsPulse();
        stopShoesPulse(); 
      }
    });

  // CREATE PAN RESPONDERS FOR EACH CLOTHING ITEM (memoized but with state dependencies)
  const poloshirtPan = useMemo(() => makePanResponder('poloshirt', poloshirtX, poloshirtY), [poloshirtPlaced, vestPlacedOnSchool2, pantsPlaced, shoesPlaced]);
  const vestPan = useMemo(() => makePanResponder('vest', vestX, vestY), [poloshirtPlaced, vestPlacedOnSchool2, pantsPlaced, shoesPlaced]);
  const pantsPan = useMemo(() => makePanResponder('pants', pantsX, pantsY), [poloshirtPlaced, vestPlacedOnSchool2, pantsPlaced, shoesPlaced]);
  const shoesPan = useMemo(() => makePanResponder('shoes', shoesX, shoesY), [poloshirtPlaced, vestPlacedOnSchool2, pantsPlaced, shoesPlaced]);

  // RENDER DRAGGABLE CLOTHING ITEMS
  const renderDraggable = (name: string, source: any, x: Animated.Value, y: Animated.Value, pan: any, position: any, opacityAnim: Animated.Value, pulseAnim?: Animated.Value) => {
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
          opacity: opacityAnim,
        }}
      >
        <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>
    );
  };

  const handleCabinetClick = () => {
    // Play Cabinet.mp3 on every tap/click
    (async () => {
      try {
        // Stop and unload any previous instance to avoid overlap
        if (cabinetSoundRef.current) {
          await cabinetSoundRef.current.stopAsync().catch(() => {});
          await cabinetSoundRef.current.unloadAsync().catch(() => {});
          cabinetSoundRef.current = null;
        }

        const { sound } = await Audio.Sound.createAsync(
          require('./SchoolGame/Cabinet.mp3'),
          { shouldPlay: true, volume: 1.0, isLooping: false }
        );
        cabinetSoundRef.current = sound;
      } catch (error) {
        console.warn('Failed to play Cabinet.mp3', error);
      }
    })();

    setCabinetOpen(!cabinetOpen);
    
    if (!cabinetOpen) {
      // Opening: Cabinet.png -> Cabinet1.png
      Animated.parallel([
        Animated.timing(cabinetOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(cabinet1Opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Closing: Cabinet1.png -> Cabinet.png
      Animated.parallel([
        Animated.timing(cabinetOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(cabinet1Opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  // Create animated TouchableOpacity component
  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.gameContentWrapper, { transform: [{ scale: victoryScale }] }]}
      >
      <Animated.Image 
        source={require('./SchoolGame/SchoolBG2.png')} 
        style={[
          styles.bg,
          {
            transform: [{ translateX: bgScrollX }],
          }
        ]} 
        resizeMode="cover" 
      />

      <TouchableOpacity style={styles.backButton} onPress={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <AnimatedTouchableOpacity
        style={[
          styles.cabinetContainer,
          {
            transform: [{ translateX: bgScrollX }],
          }
        ]} 
        onPress={handleCabinetClick} 
        activeOpacity={1}
      >
        <Animated.Image 
          source={require('./SchoolGame/Cabinet.png')} 
          style={[
            styles.cabinet, 
            { 
              opacity: cabinetOpacity,
            }
          ]} 
          resizeMode="contain" 
        />
        <Animated.Image 
          source={require('./SchoolGame/Cabinet1.png')} 
          style={[
            styles.cabinet, 
            { 
              position: 'absolute', 
              opacity: cabinet1Opacity,
            }
          ]} 
          resizeMode="contain" 
        />
      </AnimatedTouchableOpacity>

      <Animated.Image 
        source={require('./SchoolGame/School1.png')} 
        style={[styles.schoolChar, { opacity: school1Opacity }]} 
        resizeMode="contain"
      />
      <Animated.Image 
        source={require('./SchoolGame/School2.png')} 
        style={[styles.schoolChar, { opacity: school2Opacity }]} 
        resizeMode="contain"
      />
      <Animated.Image 
        source={require('./SchoolGame/School3.png')} 
        style={[styles.schoolChar, { opacity: school3Opacity }]} 
        resizeMode="contain"
      />
      <Animated.Image 
        source={require('./SchoolGame/School4.png')} 
        style={[styles.schoolChar, { opacity: school4Opacity }]} 
        resizeMode="contain"
      />
      <Animated.Image 
        source={require('./SchoolGame/School5.png')} 
        style={[styles.schoolChar, { opacity: school5Opacity }]} 
        resizeMode="contain"
      />
      
      <Animated.View
        pointerEvents={bagClickable && !bagContainersOpen && !bagContainersClosing ? 'auto' : 'none'}
        style={[
          styles.bag,
          {
            transform: [{ translateX: bgScrollX }],
            opacity: bagOpacity,
          }
        ]}
      >
        <Pressable 
          onPress={handleBagClick}
          disabled={!bagClickable || bagContainersOpen || bagContainersClosing}
          style={{ width: '100%', height: '100%' }}
        >
          <Image 
            source={require('./SchoolGame/Bag.png')} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.school5Page2,
          {
            transform: [{ translateX: bgScrollX }],
            opacity: school5Page2Opacity,
          },
        ]}
      >
        <Animated.Image 
          source={require('./SchoolGame/School5.png')} 
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </Animated.View>
      
      <Animated.View pointerEvents="none" style={[styles.schoolGif, { opacity: school6Opacity }]}>
        <Animated.Image 
          source={require('./SchoolGame/School6.gif')} 
          style={{ width: '100%', height: '100%' }} 
          resizeMode="contain"
        />
      </Animated.View>
      
      <Animated.View pointerEvents="none" style={[styles.schoolGif, { opacity: school7Opacity }]}>
        <Animated.Image 
          source={require('./SchoolGame/School7.gif')} 
          style={{ width: '100%', height: '100%' }} 
          resizeMode="contain"
        />
      </Animated.View>

      {cabinetOpen && (
        <View style={styles.clothingContainer} pointerEvents="box-none">
          {renderDraggable('poloshirt', require('./SchoolGame/Poloshirt.png'), poloshirtX, poloshirtY, poloshirtPan, itemPositions.poloshirt, poloshirtOpacity, poloshirtPulseAnim)}
          {renderDraggable('vest', require('./SchoolGame/Vest.png'), vestX, vestY, vestPan, itemPositions.vest, vestOpacity, vestPulseAnim)}
          {renderDraggable('pants', require('./SchoolGame/Pants.png'), pantsX, pantsY, pantsPan, itemPositions.pants, pantsOpacity, pantsPulseAnim)}
          {renderDraggable('shoes', require('./SchoolGame/Shoes.png'), shoesX, shoesY, shoesPan, itemPositions.shoes, shoesOpacity, shoesPulseAnim)}
        </View>
      )}

      {bagContainersOpen && (
        <>
          {/* Grayish overlay */}
          <Animated.View 
            pointerEvents={bagContainersClosing ? 'none' : 'auto'}
            style={[styles.bagOverlay, { opacity: bagOverlayOpacity }]} 
          />
          
          {/* Back button for bag containers */}
          <TouchableOpacity 
            style={[styles.backButton, { zIndex: 1002 }]} 
            onPress={handleCloseBagContainers}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          {/* Bag containers modal */}
          <Animated.View 
            style={[
              styles.bagContainersModal,
              {
                opacity: bagOverlayOpacity,
              }
            ]}
            pointerEvents="box-none"
          >
            {/* Container 1 - Top container with items without "1" */}
            <Animated.View
              style={[
                styles.bagContainer1,
                {
                  transform: [{ scale: container1ScaleAnim }],
                }
              ]}
            >
              {/* Tumbler, Notebook, Pouch, Lunchbox - in that order, now draggable */}
              <Animated.View 
                style={[
                  styles.bagContainer1Item,
                  {
                    opacity: tumblerOpacity,
                    transform: [
                      { translateX: tumblerX },
                      { translateY: tumblerY },
                    ],
                    zIndex: draggingBagItem === 'tumbler' ? 1000 : 1,
                  }
                ]}
                {...tumblerPan.panHandlers}
              >
                <Image source={require('./SchoolGame/Tumbler.png')} style={styles.bagItem} resizeMode="contain" />
              </Animated.View>

              <Animated.View 
                style={[
                  styles.bagContainer1Item, 
                  { 
                    marginLeft: -20,
                    opacity: notebookOpacity,
                    transform: [
                      { translateX: notebookX },
                      { translateY: notebookY },
                    ],
                    zIndex: draggingBagItem === 'notebook' ? 1000 : 1,
                  }
                ]}
                {...notebookPan.panHandlers}
              >
                <Image source={require('./SchoolGame/Notebook.png')} style={styles.bagItem} resizeMode="contain" />
              </Animated.View>

              <Animated.View 
                style={[
                  styles.bagContainer1Item, 
                  { 
                    marginLeft: -2,
                    opacity: pouchOpacity,
                    transform: [
                      { translateX: pouchX },
                      { translateY: pouchY },
                    ],
                    zIndex: draggingBagItem === 'pouch' ? 1000 : 1,
                  }
                ]}
                {...pouchPan.panHandlers}
              >
                <Image source={require('./SchoolGame/Pouch.png')} style={styles.bagItem} resizeMode="contain" />
              </Animated.View>

              <Animated.View 
                style={[
                  styles.bagContainer1Item,
                  {
                    opacity: lunchboxOpacity,
                    transform: [
                      { translateX: lunchboxX },
                      { translateY: lunchboxY },
                    ],
                    zIndex: draggingBagItem === 'lunchbox' ? 1000 : 1,
                  }
                ]}
                {...lunchboxPan.panHandlers}
              >
                <Image source={require('./SchoolGame/Lunchbox.png')} style={styles.bagItem} resizeMode="contain" />
              </Animated.View>
            </Animated.View>

            {/* Container 2 - Bag1.png with items inside */}
            <Animated.View
              style={[
                styles.bagContainer2,
                {
                  transform: [{ scale: container2ScaleAnim }],
                }
              ]}
            >
              {/* Bag1.png as background */}
              <Image 
                source={require('./SchoolGame/Bag1.png')} 
                style={styles.bag1Image}
                resizeMode="contain"
              />
              
              {/* Items inside the bag - absolute positioning for independent sizing */}
              <View style={styles.bagItemsContainer}>
                {/* Tumbler1 - independently positioned and sized */}
                <Animated.Image 
                  source={require('./SchoolGame/Tumbler1.png')} 
                  style={[styles.tumbler1Image, { opacity: tumbler1Opacity }]}
                  resizeMode="contain"
                />
                
                {/* Lunchbox1 - independently positioned and sized */}
                <Animated.Image 
                  source={require('./SchoolGame/Lunchbox1.png')} 
                  style={[styles.lunchbox1Image, { opacity: lunchbox1Opacity }]}
                  resizeMode="contain"
                />
                
                {/* Pouch1 - independently positioned and sized */}
                <Animated.Image 
                  source={require('./SchoolGame/Pouch1.png')} 
                  style={[styles.pouch1Image, { opacity: pouch1Opacity }]}
                  resizeMode="contain"
                />
                
                {/* Notebook1 - independently positioned and sized */}
                <Animated.Image 
                  source={require('./SchoolGame/Notebook1.png')} 
                  style={[styles.notebook1Image, { opacity: notebook1Opacity }]}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          </Animated.View>
        </>
      )}
      </Animated.View>
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
    backgroundColor: '#C8E6E2' 
  },
  gameContentWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bg: { 
    position: 'absolute', 
    width: SCREEN_WIDTH * 2,
    height: '100%',
    overflow: 'hidden',
  },
  backButton: { 
    position: 'absolute', 
    top: 40, 
    left: 16, 
    paddingBottom: 8, 
    zIndex: 10 
  },
  backText: { 
    fontSize: 20, 
    color: '#244D4A', 
    textDecorationLine: 'underline', 
    fontWeight: '700' 
  },
  cabinetContainer: { 
    position: 'absolute', 
    bottom: -85, 
    left: -42, 
    width: SCREEN_WIDTH * 0.95, 
    height: SCREEN_HEIGHT * 1.0 
  },
  cabinet: { 
    width: SCREEN_WIDTH * 0.95, 
    height: SCREEN_HEIGHT * 1.0 
  },
  clothingContainer: {
    position: 'absolute',
    bottom: -85,
    left: -42,
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 1.0,
  },
  poloshirt: {
    position: 'absolute',
    width: 110,
    height: 110,
    top: SCREEN_HEIGHT * 0.35,
    left: SCREEN_WIDTH * 0.20,
  },
  vest: {
    position: 'absolute',
    width: 110,
    height: 110,
    top: SCREEN_HEIGHT * 0.35,
    left: SCREEN_WIDTH * 0.47,
  },
  pants: {
    position: 'absolute',
    width: 110,
    height: 110,
    top: SCREEN_HEIGHT * 0.51,
    left: SCREEN_WIDTH * 0.20,
  },
  shoes: {
    position: 'absolute',
    width: 85,
    height: 85,
    top: SCREEN_HEIGHT * 0.57,
    left: SCREEN_WIDTH * 0.50,
  },
  schoolChar: { 
    position: 'absolute', 
    bottom: 105, 
    right: -5, 
    width: SCREEN_WIDTH * 0.430, 
    height: SCREEN_HEIGHT * 0.430 
  },
  schoolGif: { 
    position: 'absolute', 
    bottom: -8, 
    right: -37, 
    width: SCREEN_WIDTH * 0.745, 
    height: SCREEN_HEIGHT * 0.745 
  },
  school5Page2: {
    position: 'absolute',
    bottom: 105,
    left: SCREEN_WIDTH * 1.60,
    width: SCREEN_WIDTH * 0.430,
    height: SCREEN_HEIGHT * 0.430,
  },
  bag: { 
    position: 'absolute', 
    bottom: 3, 
    left: SCREEN_WIDTH * 1.01, 
    width: SCREEN_WIDTH * 0.66, 
    height: SCREEN_HEIGHT * 0.66 
  },
  bagOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  bagContainersModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  bagContainer1: {
    backgroundColor: '#F7C238',
    borderColor: '#634E16',
    borderWidth: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 2,
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 90,
    gap: 0,
    zIndex: 100,
  },
  bagContainer1Item: {
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bagContainer2: {
    width: '100%',
    aspectRatio: 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  bag1Image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bagItemsContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  tumbler1Image: {
    position: 'absolute',
    width: '35%',
    height: '75%',
    left: '6.5%',
    top: '15%',
  },
  lunchbox1Image: {
    position: 'absolute',
    width: '38%',
    height: '25%',
    right: '12%',
    top: '11.5%',
  },
  pouch1Image: {
    position: 'absolute',
    width: '43%',
    height: '31%',
    right: '9%',
    top: '26.5%',
  },
  notebook1Image: {
    position: 'absolute',
    width: '43%',
    height: '53%',
    right: '9%',
    bottom: '3%',
  },
  bagItem: {
    width: 65,
    height: 65,
  },
});