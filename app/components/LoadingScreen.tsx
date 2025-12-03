// app/(auth)/loading.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { createResponsiveStyles } from "../../src/utils/responsive";

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

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#E8FFFA" 
  },

  dots: { 
    fontSize: scale.scaleFont(36), 
    marginBottom: scale.scaleSpacing(12), 
    color: "#06C08A" 
  },

  text: { 
    fontSize: scale.scaleFont(18), 
    fontWeight: "600", 
    color: "#276a63" 
  },
}));
