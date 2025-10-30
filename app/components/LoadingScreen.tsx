// app/(auth)/loading.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, Stack } from "expo-router";

export default function LoadingScreen({ route }: any) {
  const router = useRouter();
  const { nextScreen } = route?.params || { nextScreen: "/greetings" };

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(nextScreen);
    }, 2000); // show loading for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.dots}>● ● ● ●</Text>
      <Text style={styles.text}>Loading</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#E8FFFA" 
  },

  dots: { 
    fontSize: 36, 
    marginBottom: 12, 
    color: "#06C08A" 
  },

  text: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#276a63" 
  },
  
});
