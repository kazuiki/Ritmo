import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MotiImage, MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
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

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // ✅ new state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // ✅ new toggle
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [confirmEmailModalVisible, setConfirmEmailModalVisible] = useState(false);
  const [fillFieldsModalVisible, setFillFieldsModalVisible] = useState(false);
  const [passwordMismatchModalVisible, setPasswordMismatchModalVisible] = useState(false);
  const [passwordLengthModalVisible, setPasswordLengthModalVisible] = useState(false);
  const [emailErrorModalVisible, setEmailErrorModalVisible] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const reduceMotionRef = useRef(false);

  // Cleanup all modals on unmount to prevent delayed pop-ups
  useEffect(() => {
    return () => {
      setConfirmEmailModalVisible(false);
      setFillFieldsModalVisible(false);
      setPasswordMismatchModalVisible(false);
      setPasswordLengthModalVisible(false);
      setEmailErrorModalVisible(false);
    };
  }, []);

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
    if (!email || !password || !confirmPassword) {
      setFillFieldsModalVisible(true);
      return;
    }

    if (password.length < 6) {
      setPasswordLengthModalVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatchModalVisible(true);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setEmailErrorMessage(error.message);
      setEmailErrorModalVisible(true);
      return;
    }

    setConfirmEmailModalVisible(true);
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

      {/* Email Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmEmailModalVisible}
        onRequestClose={() => {
          setConfirmEmailModalVisible(false);
          router.replace("/components/confirm-email-check");
        }}
      >
        <View style={styles.confirmEmailModalOverlay}>
          <View style={styles.confirmEmailModalContainer}>
            <View style={styles.confirmEmailIconCircle}>
              <Image
                source={require("../../assets/images/Mail.png")}
                style={styles.confirmEmailIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.confirmEmailModalTitle}>Check Your Email!</Text>
            <Text style={styles.confirmEmailModalMessage}>
              Please confirm your email before logging in.
            </Text>
            <TouchableOpacity
              style={styles.confirmEmailOkButton}
              onPress={() => {
                setConfirmEmailModalVisible(false);
                router.replace("/components/confirm-email-check");
              }}
            >
              <Text style={styles.confirmEmailOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fill All Fields Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={fillFieldsModalVisible}
        onRequestClose={() => setFillFieldsModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContainer}>
            <View style={styles.errorIconCircle}>
              <Image
                source={require("../../assets/images/Pencil.png")}
                style={styles.errorIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.errorModalTitle}>Fill All Fields</Text>
            <Text style={styles.errorModalMessage}>
              Please fill in all required fields
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setFillFieldsModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Mismatch Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordMismatchModalVisible}
        onRequestClose={() => setPasswordMismatchModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContainer}>
            <View style={styles.errorIconCircle}>
              <Image
                source={require("../../assets/images/Error.png")}
                style={styles.errorIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.errorModalTitle}>Passwords Don't Match</Text>
            <Text style={styles.errorModalMessage}>
              Please make sure both passwords are the same
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setPasswordMismatchModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Length Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordLengthModalVisible}
        onRequestClose={() => setPasswordLengthModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContainer}>
            <View style={styles.errorIconCircle}>
              <Image
                source={require("../../assets/images/Error.png")}
                style={styles.errorIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.errorModalTitle}>Password Too Short</Text>
            <Text style={styles.errorModalMessage}>
              Password should be at least 6 characters
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setPasswordLengthModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={emailErrorModalVisible}
        onRequestClose={() => setEmailErrorModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContainer}>
            <View style={styles.errorIconCircle}>
              <Image
                source={require("../../assets/images/Error.png")}
                style={styles.errorIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.errorModalTitle}>Error</Text>
            <Text style={styles.errorModalMessage}>
              {emailErrorMessage}
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setEmailErrorModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
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
  confirmEmailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmEmailModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "80%",
    borderWidth: 2,
    borderColor: "#9FD19E",
  },
  confirmEmailIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D4F1D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmEmailIcon: {
    width: 40,
    height: 40,
  },
  confirmEmailModalTitle: {
    fontSize: 18,
    fontFamily: "Fredoka_700Bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmEmailModalMessage: {
    fontSize: 14,
    fontFamily: "Fredoka_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmEmailOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  confirmEmailOkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Fredoka_600SemiBold",
  },
  
  // Error Modal Styles (pink theme)
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFB3BA",
  },
  errorIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFE1E4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorIcon: {
    width: 40,
    height: 40,
  },
  errorModalTitle: {
    fontSize: 18,
    fontFamily: "Fredoka_700Bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  errorModalMessage: {
    fontSize: 14,
    fontFamily: "Fredoka_400Regular",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  errorOkButton: {
    backgroundColor: "#FF6F79",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  errorOkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Fredoka_600SemiBold",
  },
});
