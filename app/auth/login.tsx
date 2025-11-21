import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { MotiImage, MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChildInput, setShowChildInput] = useState(false);
  const [paused, setPaused] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const reduceMotionRef = useRef(false);

  // Cleanup all modals on unmount to prevent delayed pop-ups
  useEffect(() => {
    return () => {
      setAlertModalVisible(false);
    };
  }, []);

  // Bubble animation setup
  const bubbleCount = 4;
  const bubbleValues = useRef(
    new Array(bubbleCount).fill(null).map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))
  ).current;
  const bubbleAnims = useRef(new Array(bubbleCount).fill(null));
  const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

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
          Animated.timing(v.x, { toValue: randomBetween(-40, 40), duration: 3000, useNativeDriver: true }),
          Animated.timing(v.y, { toValue: randomBetween(-20, 20), duration: 3000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(v.x, { toValue: randomBetween(-40, 40), duration: 3000, useNativeDriver: true }),
          Animated.timing(v.y, { toValue: randomBetween(-20, 20), duration: 3000, useNativeDriver: true }),
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

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage("Fill all fields");
      setAlertModalVisible(true);
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setAlertMessage(error.message);
      setAlertModalVisible(true);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      setAlertMessage(userError.message);
      setAlertModalVisible(true);
      return;
    }

    const loggedInUser = userData.user;
    const childName = (loggedInUser?.user_metadata as any)?.child_name;


    if (!childName) {
      router.replace("/auth/child-nickname");
    } else {
      // Single replace to loading with next param – avoids sequential replaces
      router.replace("/loading?next=/greetings");
    }

  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.outer}>
      <Stack.Screen options={{ title: "Log in", headerShown: false }} />
      <ImageBackground source={require("../../assets/background.png")} style={styles.background} resizeMode="cover">
        <TouchableWithoutFeedback onPress={togglePause}>
          <View style={styles.container}>
            {/* Animated bubbles */}
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
                  transform: [{ translateX: bubbleValues[i].x }, { translateY: bubbleValues[i].y }],
                  opacity: 0.18,
                }}
              />
            ))}

            {/* Moti animations for logo and fields */}
            <MotiImage
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
              source={require("../../assets/ritmo-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Animated input group */}
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
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#276a63" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity 
                onPress={() => router.push("./forgot-password")}
                style={{ alignSelf: "flex-end" }}
              >
                <Text style={[styles.link, {marginTop: 8}]}>Forgot Password?</Text>
              </TouchableOpacity>

            </MotiView>

            {/* Animated login button */}
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 700, type: "spring" }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
              </TouchableOpacity>
            </MotiView>

            {/* Links */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 900, duration: 600 }}
              style={{ width: "100%", alignItems: "center" }}
            >
              {/* Sign up Button (same as Login style, different color) */}
              <TouchableOpacity
                style={[styles.button, styles.signUpButton]}
                onPress={() => router.push("/auth/signup")}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </TouchableOpacity>

              {/* Divider text */}
              <Text style={styles.orText}>Or sign in with</Text>

              {/* Google Icon (Open Gmail / Email App) */}
              <TouchableOpacity
                style={styles.gmailIconWrapper}
                onPress={() => Linking.openURL("mailto:")}
              >
                <ImageBackground
                  source={require("../../assets/Google.png")} // 🟢 transparent background expected
                  style={styles.gmailIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </MotiView>

          </View>
        </TouchableWithoutFeedback>
      </ImageBackground>

      {/* Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertModalVisible}
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <View style={styles.alertIconCircle}>
              <Image
                source={require("../../assets/images/Pencil.png")}
                style={styles.alertIcon}
              />
            </View>
            
            <Text style={styles.alertModalTitle}>Alert!</Text>
            <Text style={styles.alertModalMessage}>{alertMessage}</Text>
            
            <TouchableOpacity
              style={styles.alertOkButton}
              onPress={() => setAlertModalVisible(false)}
            >
              <Text style={styles.alertOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  background: { flex: 1, width: "100%", height: "100%" },
  button: {
    marginTop: 22,
    backgroundColor: "#2D7778",
    paddingVertical: 10,
    width: "60%",
    maxWidth: 340,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },
  signUpButton: {
    marginTop: 5,
    backgroundColor: "#5BDFC9",
  },
  buttonText: { color: "#fff", fontWeight: "400", fontSize: 15 },
  link: { marginTop: 16, color: "#276a63", textDecorationLine: "underline"},
  orText: {
    marginTop: 16,
    color: "#244D4A",
    fontWeight: "500",
  },
  createAccountBtn: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2D7778",
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  createAccountText: {
    color: "#2D7778",
    fontWeight: "600",
    fontSize: 15,
  },
  gmailIconWrapper: {
    marginTop: 10,
    backgroundColor: "transparent",
    padding: 0,
  },
  gmailIcon: {
    width: 30,
    height: 30,
    backgroundColor: "transparent",
  },
  
  // Alert Modal Styles
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "75%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFB3BA",
  },
  alertIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alertIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  alertModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Fredoka_700Bold",
  },
  alertModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: 8,
    flexWrap: "wrap",
  },
  alertOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  alertOkButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },

});
