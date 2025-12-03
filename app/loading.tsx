import { Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Asset } from "expo-asset";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import { Animated, ImageBackground, StyleSheet, Text, View } from "react-native";
import { setupNetworkListener } from "../src/utils/networkUtils";

/**
 * Loading page that adapts based on network connectivity
 * - For strong/stable internet: Skips loading page entirely (immediate navigation)
 * - For weak internet: Shows loading animation and auto-navigates after assets load
 * - Automatically detects network quality using NetInfo and speed testing
 */
export default function LoadingPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const next = (params as any)?.next ?? "/greetings";
  const fadeRef = useRef(new Animated.Value(0));
  const [fontsLoaded] = useFonts({ Fredoka_700Bold });
  const [networkGood, setNetworkGood] = useState<boolean | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const hasNavigatedRef = useRef(false); // Prevent multiple navigations

  useEffect(() => {
    let networkListener: any;

    // Setup network listener to detect connection changes during loading
    networkListener = setupNetworkListener();

    const initializeLoading = async () => {
      try {
        // Prevent multiple navigation attempts
        if (hasNavigatedRef.current) {
          console.log('⚠️ Navigation already attempted, skipping...');
          return;
        }

        console.log('📱 Loading page initialized - skipping network recheck');
        
        // Since we're on the loading page, assume network was slow (already checked in smart navigation)
        // Don't re-check network to avoid double navigation conflicts
        setNetworkGood(false);

        // Show loading animation immediately
        Animated.timing(fadeRef.current, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();

        // Preload assets for weak network users
        const preloadAssets = async () => {
          try {
            await Asset.loadAsync([
              require("../assets/gifs/brushStep1.gif"),
              require("../assets/gifs/brushStep2.gif"),
              require("../assets/gifs/brushStep3.gif"),
              require("../assets/gifs/brushStep4.gif"),
              require("../assets/gifs/eatStep1.gif"),
              require("../assets/gifs/eatStep2.gif"),
              require("../assets/gifs/eatStep3.gif"),
              require("../assets/gifs/eatStep4.gif"),
              require("../assets/gifs/bathStep1.gif"),
              require("../assets/gifs/bathStep2.gif"),
              require("../assets/gifs/bathStep3.gif"),
              require("../assets/gifs/bathStep4.gif"),
              require("../assets/gifs/schoolStep1.gif"),
              require("../assets/gifs/schoolStep2.gif"),
              require("../assets/gifs/schoolStep3.gif"),
              require("../assets/gifs/schoolStep4.gif"),
              require("../assets/gifs/media-unscreen.gif"),
              require("../assets/gifs/media-1--unscreen.gif"),
            ]);
            setAssetsLoaded(true);
            console.log('📦 Assets preloaded for weak network - auto-navigating');
            
            // Auto-navigate after assets are loaded for slow connections
            setTimeout(() => {
              if (!hasNavigatedRef.current) {
                hasNavigatedRef.current = true;
                Animated.timing(fadeRef.current, {
                  toValue: 0,
                  duration: 400,
                  useNativeDriver: true,
                }).start(() => {
                  router.replace(next as any);
                });
              }
            }, 1000); // Small delay to let user see assets are loaded
          } catch (error) {
            console.log("Asset preload error:", error);
            setAssetsLoaded(true);
            // Still navigate even on error
            setTimeout(() => {
              if (!hasNavigatedRef.current) {
                hasNavigatedRef.current = true;
                Animated.timing(fadeRef.current, {
                  toValue: 0,
                  duration: 400,
                  useNativeDriver: true,
                }).start(() => {
                  router.replace(next as any);
                });
              }
            }, 2000); // Slightly longer delay on error
          }
        };

        preloadAssets();

      } catch (error) {
        console.error('Network check failed, showing loading:', error);
        setNetworkGood(false);
        
        // Fallback: show loading
        Animated.timing(fadeRef.current, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();
      }
    };

    // Run initialization when fonts are loaded
    if (fontsLoaded) {
      initializeLoading();
    }

    return () => {
      networkListener?.(); // Cleanup network listener
    };
  }, [next, fontsLoaded]);



  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <Animated.View style={[styles.container, { opacity: fadeRef.current }]}>
        {/* Show loading animation for weak network or while checking */}
        {networkGood === false && (
          <>
            <View style={styles.dotsRow}>
              {[
                "#2D7778",
                "#9FD19E", 
                "#F5C36C",
                "#F7A66A",
              ].map((color, i) => (
                <MotiView
                  key={i}
                  from={{ 
                    translateY: 0, 
                    scale: 1,
                    opacity: 0.8
                  }}
                  animate={{ 
                    translateY: [0, -12, 0],
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    type: "timing",
                    duration: 1000,
                    loop: true,
                    delay: i * 120,
                    repeatReverse: false,
                  }}
                  style={[
                    styles.dot,
                    { 
                      backgroundColor: color,
                      shadowColor: color,
                      shadowOpacity: 0.4,
                      shadowRadius: 4,
                      elevation: 2,
                    },
                  ]}
                />
              ))}
            </View>

            <MotiView
              from={{ opacity: 0.8, scale: 1.02 }}
              animate={{ 
                opacity: [1, 0.6, 1],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                loop: true,
                duration: 1200,
                delay: 0
              }}
            >
              <Text style={[styles.text, { color: "#276a63", fontFamily: fontsLoaded ? 'Fredoka_700Bold' : undefined }]}>
                {assetsLoaded ? "Ready!" : "Loading..."}
              </Text>
            </MotiView>
          </>
        )}

        {/* Show checking state */}
        {networkGood === null && (
          <MotiView
            from={{ opacity: 0.8, scale: 1.02 }}
            animate={{ 
              opacity: [1, 0.6, 1],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              loop: true,
              duration: 800,
              delay: 0
            }}
          >
            <Text style={[styles.textMinimal, { color: "#276a63", fontFamily: fontsLoaded ? 'Fredoka_700Bold' : undefined }]}>
              Checking connection...
            </Text>
          </MotiView>
        )}
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  dotsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  text: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: 'Fredoka_700Bold'
  },
  textMinimal: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: 'Fredoka_700Bold'
  },

});
