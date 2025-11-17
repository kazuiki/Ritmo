import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Boy from "./Boy";
import Cup from "./Cup";
import BrushAndPaste from "./Toothbrush";

export default function BrushTeethGame() {
  const [stage, setStage] = useState(1);
  const [boyStep, setBoyStep] = useState(0);
  const [cupActive, setCupActive] = useState(false);

  const handleBoyTap = () => {
    if (stage !== 1) return;
    const totalFrames = 4;
    const frameDelay = 70;

    for (let i = 0; i < totalFrames; i++) {
      setTimeout(() => {
        setBoyStep(i);
        if (i === totalFrames - 1) {
          setTimeout(() => setStage(2), 100);
        }
      }, i * frameDelay);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/brush-teeth/background.png")} style={styles.background} />

      <Boy stage={stage} boyStep={boyStep} onTap={handleBoyTap} />

      {stage === 2 && !cupActive && <Cup onActivate={() => setCupActive(true)} />}
      {stage === 2 && cupActive && <BrushAndPaste />}

      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/home")}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.instruction}>
        {stage === 1
          ? "Tap the boy to open his mouth!"
          : !cupActive
          ? "Tap the cup!"
          : "Drag the brush and paste!"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fef6e4" },
  background: { width: "100%", height: "100%", resizeMode: "cover", position: "absolute" },
  backButton: { position: "absolute", top: 40, left: 20, zIndex: 10 },
  instruction: { fontSize: 18, color: "#1b76d1", textAlign: "center", marginTop: 20 },
});
