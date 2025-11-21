import { Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Asset } from "expo-asset";
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useRef } from "react";
import { Animated, ImageBackground, StyleSheet, Text, View } from "react-native";

export default function LoadingPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const next = (params as any)?.next ?? "/greetings";
  const fadeRef = useRef(new Animated.Value(0));
  const [fontsLoaded] = useFonts({ Fredoka_700Bold });

  useEffect(() => {
    let sound: Audio.Sound | null = null;
    let navTimer: number | null = null;

    const playLogoSound = async () => {
      try {
        const result = await Audio.Sound.createAsync(
          require("../assets/ringtone/LogoSound.mp3"),
          { shouldPlay: true, positionMillis: 500 }
        );
        sound = result.sound;
      } catch (e) {
        console.log('Logo sound load error:', e);
      }
    };

    // Preload all GIF assets to speed up playbook display
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
      } catch (error) {
        console.log("Asset preload error:", error);
      }
    };

    preloadAssets();
    playLogoSound();

    // Fade in immediately
    Animated.timing(fadeRef.current, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    navTimer = setTimeout(() => {
      // Stop and unload sound exactly at end of 5s
      (async () => {
        try {
          if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            sound = null;
          }
        } catch {}
      })();

      // Fade out and navigate
      Animated.timing(fadeRef.current, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        router.replace(next as any);
      });
    }, 5000); // keep loading (and sound) for full 5 seconds

    return () => {
      if (navTimer) clearTimeout(navTimer as number);
      (async () => {
        try {
          if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
          }
        } catch {}
      })();
    };
  }, [next]);

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <Animated.View style={[styles.container, { opacity: fadeRef.current }]}>
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
                delay: i * 120, // Consistent wave timing
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
            delay: 0 // start immediately
          }}
        >
          <Text style={[styles.text, { color: "#276a63", fontFamily: fontsLoaded ? 'Fredoka_700Bold' : undefined }]}>Loading...</Text>
        </MotiView>
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

});
