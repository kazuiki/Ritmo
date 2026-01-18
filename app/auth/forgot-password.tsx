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
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { supabase } from "../../src/supabaseClient";
import { isNetworkConnected } from "../../src/utils/networkUtils";
import NetworkFailureModal from "../components/NetworkFailureModal";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [emptyFieldsModalVisible, setEmptyFieldsModalVisible] = useState(false);
  const [passwordMismatchModalVisible, setPasswordMismatchModalVisible] = useState(false);
  const [passwordLengthModalVisible, setPasswordLengthModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const reduceMotionRef = useRef(false);

  // Local network failure detection for authentication
  const [localNetworkFailure, setLocalNetworkFailure] = useState(false);

  const handleLocalNetworkRetry = async () => {
    console.log('🔄 User dismissed network failure modal');
    setLocalNetworkFailure(false);
  };

  // Cleanup all modals on unmount to prevent delayed pop-ups
  useEffect(() => {
    return () => {
      setVerificationModalVisible(false);
      setSuccessModalVisible(false);
      setEmptyFieldsModalVisible(false);
      setPasswordMismatchModalVisible(false);
      setPasswordLengthModalVisible(false);
      setErrorModalVisible(false);
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

  const handleConfirm = async () => {
    if (!email || !password || !confirmPassword) {
      setEmptyFieldsModalVisible(true);
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

    // Check network connectivity before sending code
    console.log('🔍 Checking network connectivity for sending verification code...');
    const isConnected = await isNetworkConnected();
    console.log('📡 Network connectivity result:', isConnected);
    
    if (!isConnected) {
      console.log('❌ No network connection - send code blocked');
      setLocalNetworkFailure(true);
      return;
    }
    
    console.log('✅ Network connection available, proceeding to send verification code');

    setSendingCode(true);
    
    try {
      // Send OTP to email (valid for 15 minutes)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: undefined,
        },
      });
      setSendingCode(false);

      if (error) {
        if (error.message.includes('Network request failed') || 
            error.message.includes('network') ||
            (error as any).name === 'TypeError') {
          console.log('❌ Network error during sending code:', error.message);
          setLocalNetworkFailure(true);
          return;
        }
        
        setErrorMessage(error.message);
        setErrorModalVisible(true);
        return;
      }

      // Show verification modal
      setVerificationModalVisible(true);
    } catch (networkError) {
      setSendingCode(false);
      console.log('❌ Caught network error during sending code:', (networkError as any).message);
      setLocalNetworkFailure(true);
      return;
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setErrorMessage("Please enter the verification code");
      setErrorModalVisible(true);
      return;
    }

    setLoading(true);

    try {
      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'email',
        email,
        token: verificationCode,
      });

      if (error) {
        setLoading(false);
        console.log('❌ Error verifying OTP:', error.message);
        setErrorMessage("Incorrect verification code. Please try again");
        setErrorModalVisible(true);
        return;
      }

      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      setLoading(false);
      
      if (passwordError) {
        setErrorMessage(passwordError.message);
        setErrorModalVisible(true);
        return;
      }

      // Success - close verification modal and show success modal
      setVerificationModalVisible(false);
      setSuccessModalVisible(true);
    } catch (error) {
      setLoading(false);
      console.log('❌ Error during verification:', (error as any)?.message);
      setErrorMessage("An error occurred. Please try again");
      setErrorModalVisible(true);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.outer}
        keyboardVerticalOffset={0}
      >
        <Stack.Screen options={{ title: "Forgot Password", headerShown: false }} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
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

            {/* Title */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 300, duration: 600 }}
              style={styles.titleContainer}
            >
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and create a new password
              </Text>
            </MotiView>

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
                placeholder="Enter your email here:"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>New Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Enter new password:"
                  placeholderTextColor="#888"
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

              <Text style={styles.label}>Confirm Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Re-enter new password:"                  placeholderTextColor="#888"                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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

            {/* Confirm Button */}
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 700, type: "spring" }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={handleConfirm}
                disabled={sendingCode}
              >
                <Text style={styles.buttonText}>
                  {sendingCode ? "Sending Code..." : "CONFIRM"}
                </Text>
              </TouchableOpacity>
            </MotiView>

            {/* Back to Login Link */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 900, duration: 600 }}
            >
              <TouchableOpacity onPress={() => router.replace("/auth/login")}>
                <Text style={styles.link}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verification Code Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={verificationModalVisible}
        onRequestClose={() => setVerificationModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContainer}>
            <View style={styles.errorIconCircle}>
              <Image
                source={require("../../assets/images/Mail.png")}
                style={styles.errorIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.errorModalTitle}>Enter Verification Code</Text>
            <Text style={styles.errorModalMessage}>
              A verification code has been sent to {email}
            </Text>
            
            <TextInput
              style={[styles.input, { marginTop: 16, textAlign: 'center' }]}
              placeholder="Enter 6-digit code:"
              placeholderTextColor="#888"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="numeric"
              maxLength={6}
            />
            
            <TouchableOpacity
              style={[styles.errorOkButton, { marginTop: 20 }]}
              onPress={handleVerifyCode}
              disabled={!verificationCode || verificationCode.length !== 6 || loading}
            >
              <Text style={styles.errorOkButtonText}>
                {loading ? "VERIFYING..." : "VERIFY"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => {
          setSuccessModalVisible(false);
          router.replace('/auth/login');
        }}
      >
        <View style={styles.emailModalOverlay}>
          <View style={styles.emailModalContainer}>
            <View style={styles.emailIconCircle}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            </View>
            
            <Text style={styles.emailModalTitle}>Password Reset Successful!</Text>
            <Text style={styles.emailModalMessage}>
              Your password has been successfully reset. You can now log in with your new password.
            </Text>
            
            <TouchableOpacity
              style={styles.emailOkButton}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/auth/login');
              }}
            >
              <Text style={styles.emailOkButtonText}>GO TO LOGIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Empty Fields Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={emptyFieldsModalVisible}
        onRequestClose={() => setEmptyFieldsModalVisible(false)}
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
              onPress={() => setEmptyFieldsModalVisible(false)}
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

      {/* Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={() => setErrorModalVisible(false)}
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
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Network Failure Modal */}
      <NetworkFailureModal 
        visible={localNetworkFailure} 
        onRetry={handleLocalNetworkRetry} 
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  background: { 
    position: 'absolute',
    width: "100%", 
    height: "100%",
    top: 0,
    left: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 700,
  },
  logo: {
    width: 260,
    height: 220,
    marginBottom: 6,
  },
  titleContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: "#276a63",
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#276a63",
    textAlign: "center",
    paddingHorizontal: 20,
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
    color: "#333",
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
  inputFlex: { 
    flex: 1, 
    paddingVertical: 12, 
    fontSize: 15,
    color: "#333"
  },
  eyeButton: { 
    paddingHorizontal: 4, 
    paddingVertical: 4 
  },
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
  
  // Email Sent Modal Styles
  emailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  emailModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#9FD19E",
  },
  emailIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D4F1D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emailIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  emailModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Fredoka_700Bold",
  },
  emailModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: 8,
    flexWrap: "wrap",
  },
  emailOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  },
  emailOkButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
