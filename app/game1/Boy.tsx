import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

type BoyProps = {
  stage: number;
  boyStep: number;
  onTap?: () => void;
};

export default function Boy({ stage, boyStep, onTap }: BoyProps) {
  const images = [
    require("../../assets/brush-teeth/boy_stage1.png"),
    require("../../assets/brush-teeth/boy_stage2.png"),
    require("../../assets/brush-teeth/boy_stage3.png"),
    require("../../assets/brush-teeth/boy_open_dirty.png"),
  ];

  // Stage 2 always shows last image
  const displayIndex = stage === 1 ? boyStep : images.length - 1;

  return stage === 1 ? (
    <TouchableOpacity onPress={onTap} activeOpacity={0.8} style={styles.container}>
      <Image source={images[displayIndex]} style={styles.boy} />
    </TouchableOpacity>
  ) : (
    <View style={styles.container}>
      <Image source={images[displayIndex]} style={styles.boy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  boy: { width: 280, height: 280, resizeMode: "contain", marginTop: 188 },
});
