import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

export default function LoadingPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const next = (params as any)?.next ?? "/greetings";

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(next as any);
    }, 5000); // Changed from 2000ms (2 seconds) to 5000ms (5 seconds)

    return () => clearTimeout(timer);
  }, [next]);

  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.container}>
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
          <Text style={[styles.text, { color: "#276a63" }]}>Loading...</Text>
        </MotiView>
      </View>
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
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
  },

});
});
