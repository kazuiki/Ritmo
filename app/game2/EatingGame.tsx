import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    LayoutRectangle,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ====== ASSET PATHS ======
// The environment running this code may transform local container paths to usable URLs.
// Below are the example file paths available in the current session. If these don't
// work in your Expo app, copy the image files into ./assets/ and require them instead.

const BOY1_URI = "file:///mnt/data/c69488e3-d8dc-407f-b4a5-11a88100242f.png"; // (composed screenshot) example
const RESOURCES_URI = "file:///mnt/data/10f99e6c-ffd9-4a75-ab23-ffbcd05f9915.png"; // (resources strip) example

// Recommended: replace the 2 URIs above with local assets requires like:
// const boy1 = require('../assets/boy1.png');
// const boy2 = require('../assets/boy2.png');
// etc.

// For demo code below we'll assume you have individual files placed at ./assets/
const boy1 = require("../../assets/EatingGame/boy1.png");
const boy2 = require("../../assets/EatingGame/boy2.png");
const boy3 = require("../../assets/EatingGame/boy3.png");
const boy4 = require("../../assets/EatingGame/boy4.png");

const tableImg = require("../../assets/EatingGame/table.png");
const plate = require("../../assets/EatingGame/plate.png");
const chicken = require("../../assets/EatingGame/chicken.png");
const vegi = require("../../assets/EatingGame/vegi.png");
const water = require("../../assets/EatingGame/water.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FoodItem = {
  id: string;
  source: any;
};

const FOODS: FoodItem[] = [
  { id: "rice", source: plate },
  { id: "chicken", source: chicken },
  { id: "vegi", source: vegi },
  { id: "water", source: water },
];

export default function EatingGame() {
  // boy frame state: 1 = idle (boy1), 2 = chewA (boy2), 3 = ready (boy3), 4 = chewB (boy4)
  const [boyFrame, setBoyFrame] = useState(1);

  // layout boxes
  const [boyLayout, setBoyLayout] = useState<LayoutRectangle | null>(null);
  const [mouthZone, setMouthZone] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // selected food index
  const [activeFoodIndex, setActiveFoodIndex] = useState<number | null>(0);

  // animated position for draggable food
  const pan = useRef(new Animated.ValueXY()).current;
  const initialPos = useRef({ x: 40, y: 420 });

  // track whether user is dragging
  const dragging = useRef(false);

  // chew animation control
  const chewing = useRef(false);

  useEffect(() => {
    // set initial position
    pan.setValue({ x: initialPos.current.x, y: initialPos.current.y });
  }, []);

  // compute mouth zone based on boy layout (option B: relative region)
  useEffect(() => {
    if (!boyLayout) return;
    // mouth roughly at 40% width centered, and 58%-70% height of boy image area
    const x = boyLayout.x + boyLayout.width * 0.35;
    const w = boyLayout.width * 0.3;
    const y = boyLayout.y + boyLayout.height * 0.55;
    const h = boyLayout.height * 0.18;
    setMouthZone({ x, y, w, h });
  }, [boyLayout]);

  // PanResponder for dragging the active food
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // when user grabs the food, switch boy to ready (boy3)
        dragging.current = true;
        setBoyFrame(3);
        pan.setOffset({ x: (pan as any).x._value || 0, y: (pan as any).y._value || 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        dragging.current = false;

        const foodCenterX = (pan as any).x._value + 40; // adjust center offset
        const foodCenterY = (pan as any).y._value + 40;

        if (mouthZone && isPointInMouth(foodCenterX, foodCenterY, mouthZone)) {
          // dropped near mouth -> play chew
          playChewSequence();
        } else {
          // snap back
          Animated.spring(pan, {
            toValue: { x: initialPos.current.x, y: initialPos.current.y },
            useNativeDriver: false,
          }).start(() => setBoyFrame(1));
        }
      },
    })
  ).current;

  function isPointInMouth(px: number, py: number, mouth: { x: number; y: number; w: number; h: number }) {
    // px,py are absolute coordinates relative to root container.
    // Because pan value is relative to container top-left we use it directly.
    return px >= mouth.x && px <= mouth.x + mouth.w && py >= mouth.y && py <= mouth.y + mouth.h;
  }

  async function playChewSequence() {
    if (chewing.current) return;
    chewing.current = true;

    // hide food by moving offscreen and then reset
    Animated.timing(pan, {
      toValue: { x: mouthZone ? mouthZone.x + mouthZone.w / 2 - 20 : SCREEN_WIDTH / 2, y: mouthZone ? mouthZone.y + 10 : 300 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      // play chewing frames: boy2 -> boy4 -> boy2 -> boy1
      setBoyFrame(2);
      setTimeout(() => setBoyFrame(4), 300);
      setTimeout(() => setBoyFrame(2), 600);
      setTimeout(() => {
        setBoyFrame(1);
        // reset food to original place after small delay
        Animated.timing(pan, {
          toValue: { x: initialPos.current.x, y: initialPos.current.y },
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          chewing.current = false;
        });
      }, 1000);
    });
  }

  function renderBoy() {
    let source = boy1;
    if (boyFrame === 2) source = boy2;
    else if (boyFrame === 3) source = boy3;
    else if (boyFrame === 4) source = boy4;

    return (
      <View
        style={styles.boyContainer}
        onLayout={(e) => setBoyLayout(e.nativeEvent.layout)}
      >
        <Image source={source} style={styles.boyImage} resizeMode="contain" />
      </View>
    );
  }

  function renderFood() {
    if (activeFoodIndex === null) return null;
    const food = FOODS[activeFoodIndex];

    return (
      <Animated.View
        style={[styles.food, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <Image source={food.source} style={styles.foodImage} resizeMode="contain" />
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.back}>Back</Text>

      <View style={styles.gameArea}>
        {/* background and window strip */}
        <View style={styles.windowRow}>
          <View style={styles.windowCell} />
          <View style={styles.windowCell} />
        </View>

        {/* Boy */}
        {renderBoy()}

        {/* Table */}
        <Image source={tableImg} style={styles.table} resizeMode="cover" />

        {/* Food draggable */}
        {renderFood()}

        {/* debug mouth zone (optional) */}
        {mouthZone && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: mouthZone.x,
              top: mouthZone.y,
              width: mouthZone.w,
              height: mouthZone.h,
              borderWidth: 1,
              borderColor: "rgba(255,0,0,0.5)",
              backgroundColor: "transparent",
            }}
          />
        )}
      </View>

      <View style={styles.toolbox}>
        {FOODS.map((f, i) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.toolBtn, activeFoodIndex === i && styles.toolBtnActive]}
            onPress={() => {
              setActiveFoodIndex(i);
              // place food to initial position
              Animated.timing(pan, { toValue: { x: initialPos.current.x, y: initialPos.current.y }, duration: 150, useNativeDriver: false }).start();
            }}
          >
            <Image source={f.source} style={styles.toolImg} resizeMode="contain" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", paddingTop: 24 },
  back: { color: "#0a0", marginLeft: 8, marginBottom: 6, textDecorationLine: "underline" },
  gameArea: { flex: 1, margin: 8, backgroundColor: "#dfffbf", borderRadius: 6, overflow: "hidden" },
  windowRow: { flexDirection: "row", justifyContent: "space-around", padding: 12 },
  windowCell: { width: 80, height: 80, backgroundColor: "#9fe7ff", borderRadius: 4 },
  boyContainer: { alignItems: "center", justifyContent: "center", height: 280 },
  boyImage: { width: 200, height: 240 },
  table: { position: "absolute", left: 0, right: 0, bottom: 70, height: 120 },
  food: { position: "absolute", left: 0, top: 0, width: 80, height: 80 },
  foodImage: { width: 80, height: 80 },
  toolbox: { height: 96, backgroundColor: "#222", padding: 8, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  toolBtn: { width: 64, height: 64, backgroundColor: "#fff", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toolBtnActive: { borderWidth: 2, borderColor: "#4af" },
  toolImg: { width: 40, height: 40 },
});
