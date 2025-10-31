import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MotiImage, MotiView } from "moti";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // ✅ new state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // ✅ new toggle
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduceMotionRef = useRef(false);

  // === Bubble animation setup ===
  const bubbleCount = 4;
  const bubbleValues = useRef(
    new Array(bubbleCount)
      .fill(null)
      .map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))
  ).current;
  const bubbleAnims = useRef(new Array(bubbleCount).fill(null));
  const randomBetween = (min: number, max: number): number =>
    Math.random() * (max - min) + min;

  const bubbleBase = useRef(
    (() => {
      const { width, height } = Dimensions.get("window");
      const sizeOptions = [220, 160, 120, 90];
      const colorOptions = ["#CFF6E6", "#E7FFF8", "#DFFCF0", "#EAFDF6"];
      return new Array(bubbleCount).fill(null).map((_, i) => {
        const size = sizeOptions[i % sizeOptions.length];
        const color = colorOptions[i % colorOptions.length];
        const left = randomBetween(0, width - size);
        const top = randomBetween(0, height - size);
        return { size, color, top, left };
      });
    })()
  ).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduceMotionRef.current = !!r;
      if (!r) startAllBubbles();
    });
    return stopAllBubbles;
  }, []);

  const startBubble = (i: number) => {
    const v = bubbleValues[i];
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(v.x, {
            toValue: randomBetween(-40, 40),
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(v.y, {
            toValue: randomBetween(-20, 20),
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(v.x, {
            toValue: randomBetween(-40, 40),
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(v.y, {
            toValue: randomBetween(-20, 20),
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    bubbleAnims.current[i] = anim;
    anim.start();
  };

  const startAllBubbles = () => {
    if (reduceMotionRef.current) return;
    for (let i = 0; i < bubbleCount; i++) {
      bubbleAnims.current[i]?.stop();
      startBubble(i);
    }
  };

  const stopAllBubbles = () => {
    for (let i = 0; i < bubbleCount; i++) {
      bubbleAnims.current[i]?.stop();
      bubbleAnims.current[i] = null;
    }
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      startAllBubbles();
    } else {
      setPaused(true);
      stopAllBubbles();
    }
  };

  // === SignUp Function ===
  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword)
      return alert("Fill all fields");

    if (password !== confirmPassword)
      return alert("Passwords do not match!");

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return alert(error.message);

    Alert.alert(
      "Check your email!",
      "Please confirm your email before logging in."
    );
    router.replace("/components/confirm-email-check");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.outer}
    >
      <ImageBackground
        source={require("../../assets/background.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <TouchableWithoutFeedback onPress={togglePause}>
          <View style={styles.container}>
            {/* Background bubbles */}
            {bubbleBase.map((b, i) => (
              <Animated.View
                key={i}
                style={{
                  position: "absolute",
                  width: b.size,
                  height: b.size,
                  borderRadius: b.size / 2,
                  backgroundColor: b.color,
                  top: b.top,
                  left: b.left,
                  transform: [
                    { translateX: bubbleValues[i].x },
                    { translateY: bubbleValues[i].y },
                  ],
                  opacity: 0.18,
                }}
              />
            ))}

            {/* Animated logo */}
            <MotiImage
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
              source={require("../../assets/ritmo-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Animated input fields */}
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400, duration: 600 }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email here:"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Enter password here:"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#276a63"
                  />
                </TouchableOpacity>
              </View>

              {/* ✅ Confirm Password */}
              <Text style={styles.label}>Confirm Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Re-enter password:"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#276a63"
                  />
                </TouchableOpacity>
              </View>
            </MotiView>

            {/* Animated sign-up button */}
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 700, type: "spring" }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleSignUp}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Signing up..." : "SIGN UP"}
                </Text>
              </TouchableOpacity>
            </MotiView>

            {/* Link back to login */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 900, duration: 600 }}
            >
              <TouchableOpacity onPress={() => router.push("/auth/login")}>
                <Text style={styles.link}>
                  Already have an account? Log in
                </Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        </TouchableWithoutFeedback>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  background: { flex: 1, width: "100%", height: "100%" },
  logo: {
    width: 260,
    height: 220,
    marginBottom: 6,
  },
  label: {
    alignSelf: "flex-start",
    color: "#276a63",
    marginTop: 8,
  },
  input: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 5,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    fontSize: 15,
  },
  inputRow: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 5,
    paddingHorizontal: 14,
    marginTop: 10,
    elevation: 2,
  },
  inputFlex: { flex: 1, paddingVertical: 12, fontSize: 15 },
  eyeButton: { paddingHorizontal: 4, paddingVertical: 4 },
  button: {
    marginTop: 22,
    backgroundColor: "#2D7778",
    paddingVertical: 14,
    width: "100%",
    maxWidth: 340,
    borderRadius: 5,
    alignItems: "center",
    elevation: 3,
  },
  buttonText: { color: "#fff", fontWeight: "400", fontSize: 15 },
  link: {
    marginTop: 16,
    color: "#276a63",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
