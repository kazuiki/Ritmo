import { useRef } from "react";
import { Animated, PanResponder, StyleSheet } from "react-native";

export default function BrushAndPaste() {
  const brushX = useRef(new Animated.Value(50)).current;
  const brushY = useRef(new Animated.Value(400)).current;
  const pasteX = useRef(new Animated.Value(200)).current;
  const pasteY = useRef(new Animated.Value(400)).current;

  const panResponderBrush = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        brushX.setValue(gestureState.moveX - 80);
        brushY.setValue(gestureState.moveY - 30);
      },
    })
  ).current;

  const panResponderPaste = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        pasteX.setValue(gestureState.moveX - 30);
        pasteY.setValue(gestureState.moveY - 30);
      },
    })
  ).current;

  return (
    <>
      <Animated.Image
        {...panResponderBrush.panHandlers}
        source={require("../../assets/brush-teeth/toothbrush.png")}
        style={[styles.brush, { left: brushX, top: brushY }]}
      />
      <Animated.Image
        {...panResponderPaste.panHandlers}
        source={require("../../assets/brush-teeth/toothpaste.png")}
        style={[styles.paste, { left: pasteX, top: pasteY }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  brush: { width: 270, height: 150, resizeMode: "contain", position: "absolute", zIndex: 10 },
  paste: { width: 180, height: 180, resizeMode: "contain", position: "absolute", zIndex: 10 },
});
