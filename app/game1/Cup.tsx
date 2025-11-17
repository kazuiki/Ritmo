import { useRef } from "react";
import { Animated, Image, StyleSheet, TouchableOpacity } from "react-native";

type CupProps = {
  onActivate: () => void;
};

export default function Cup({ onActivate }: CupProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => onActivate());
  };

  const rotate = shakeAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ["-10deg", "10deg"],
  });

  return (
    <Animated.View style={[styles.cupContainer, { transform: [{ rotate }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Image source={require("../../assets/brush-teeth/cup.png")} style={styles.cup} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cupContainer: { position: "absolute", bottom: 50, alignSelf: "center", zIndex: 5 },
  cup: { width: 200, height: 200, resizeMode: "contain" },
});
