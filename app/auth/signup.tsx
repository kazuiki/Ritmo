import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
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
  const [agreed, setAgreed] = useState(false);
  const [agreementRequiredModalVisible, setAgreementRequiredModalVisible] = useState(false);
  const [completeDetailsModalVisible, setCompleteDetailsModalVisible] = useState(false);
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState(false);
  const reduceMotionRef = useRef(false);
  const isInitialMount = useRef(true);

  // On first mount (fresh visit from Login), clear any persisted inputs
  useEffect(() => {
    const initInputs = async () => {
      try {
        await AsyncStorage.multiRemove(['@signupEmail', '@signupPassword', '@signupConfirm']);
        // Reset acceptance on fresh visit from Login to prevent stale check
        await AsyncStorage.setItem('@termsAccepted', 'false');
      } catch {}
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    };
    initInputs();
  }, []);

  // Restore saved inputs when returning to an already-mounted screen (after Privacy/Terms)
  useFocusEffect(
    (() => {
      const restoreIfMounted = async () => {
        try {
          const savedEmail = await AsyncStorage.getItem('@signupEmail');
          const savedPassword = await AsyncStorage.getItem('@signupPassword');
          const savedConfirm = await AsyncStorage.getItem('@signupConfirm');
          if (savedEmail) setEmail(savedEmail);
          if (savedPassword) setPassword(savedPassword);
          if (savedConfirm) setConfirmPassword(savedConfirm);
        } catch {}
      };
      restoreIfMounted();
      return () => {};
    })
  );

  // When screen gains focus (after initial mount), read stored acceptance
  useFocusEffect(
    (() => {
      let mounted = true;
      const checkAccepted = async () => {
        if (isInitialMount.current) {
          isInitialMount.current = false;
          return;
        }
        try {
          const val = await AsyncStorage.getItem("@termsAccepted");
          if (mounted) setAgreed(val === "true");
        } catch {}
      };
      checkAccepted();
      return () => {
        mounted = false;
      };
    })
  );

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
    if (!agreed) {
      setAgreementRequiredModalVisible(true);
      return;
    }
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

              {/* Agreement checkbox + text */}
              <View style={styles.agreeRow}>
                <TouchableOpacity
                  onPress={() => {
                    // Require fields filled before proceeding to Terms
                    if (!email || !password || !confirmPassword) {
                      setCompleteDetailsModalVisible(true);
                      return;
                    }
                    // Persist current inputs so they are restored after returning
                    AsyncStorage.multiSet([
                      ['@signupEmail', email],
                      ['@signupPassword', password],
                      ['@signupConfirm', confirmPassword],
                      ['@termsAccepted', 'false'],
                    ]).catch(() => {});
                    setAgreed(false);
                    // Open Privacy Policy first, then Terms
                    router.push('/privacy-policy');
                  }}
                  style={[styles.checkbox, agreed && styles.checkboxChecked]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreed }}
                >
                  {agreed && <View style={styles.checkboxInner} />}
                </TouchableOpacity>
                <Text style={styles.agreeText}> by signing up you agree to our </Text>
                <TouchableOpacity onPress={() => router.push('/terms&conditions')}>
                  <Text style={styles.linkInline}>terms and conditions</Text>
                </TouchableOpacity>
                <Text style={styles.agreeText}> and </Text>
                <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                  <Text style={styles.linkInline}>privacy policy</Text>
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

      {/* Agreement Required Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={agreementRequiredModalVisible}
        onRequestClose={() => setAgreementRequiredModalVisible(false)}
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
            <Text style={styles.errorModalTitle}>Agreement Required</Text>
            <Text style={styles.errorModalMessage}>
              Please accept the terms & privacy policy before signing up.
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setAgreementRequiredModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Complete Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={completeDetailsModalVisible}
        onRequestClose={() => setCompleteDetailsModalVisible(false)}
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
            <Text style={styles.errorModalTitle}>Complete Your Details</Text>
            <Text style={styles.errorModalMessage}>
              Please fill Email, Password, and Confirm Password first.
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setCompleteDetailsModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={privacyPolicyModalVisible}
        onRequestClose={() => setPrivacyPolicyModalVisible(false)}
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
            <Text style={styles.errorModalTitle}>Privacy Policy</Text>
            <Text style={styles.errorModalMessage}>
              Privacy policy is included within Terms for now.
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setPrivacyPolicyModalVisible(false)}
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
  agreeRow: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#244D4A',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#2D7778',
    backgroundColor: '#CFEDE8',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#2D7778',
    borderRadius: 2,
  },
  agreeText: {
    color: '#244D4A',
  },
  linkInline: {
    color: '#276a63',
    textDecorationLine: 'underline',
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
    borderRadius: 18,
    padding: 18,
    width: "82%",
    maxWidth: 420,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFB3BA",
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  errorIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Fredoka_700Bold",
  },
  errorModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
    flexWrap: "wrap",
    fontFamily: "Fredoka_400Regular",
  },
  errorOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  errorOkButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
});
