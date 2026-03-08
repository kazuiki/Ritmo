import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

export default function UpdatePassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const otp = params.otp as string;
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasNumber: false,
    hasUppercase: false,
    hasLowercase: false,
    hasSpecial: false,
    noSpaces: false,
  });
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [emptyFieldsModalVisible, setEmptyFieldsModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const reduceMotionRef = useRef(false);

  const unmetRequirements = [
    { key: 'minLength', label: 'Must be at least 8 characters' },
    { key: 'hasNumber', label: 'Must contain at least 1 number' },
    { key: 'hasUppercase', label: 'Must contain at least 1 uppercase' },
    { key: 'hasLowercase', label: 'Must contain at least 1 lowercase' },
    { key: 'hasSpecial', label: 'Must contain at least 1 special character' },
    { key: 'noSpaces', label: 'Must not contain spaces' },
  ].filter((item) => !passwordRequirements[item.key as keyof typeof passwordRequirements]);
  const showRequirements = password.length > 0 && unmetRequirements.length > 0;
  const showConfirmMismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;

  // Local network failure detection for authentication
  const [localNetworkFailure, setLocalNetworkFailure] = useState(false);

  const handleLocalNetworkRetry = async () => {
    console.log('🔄 User dismissed network failure modal');
    setLocalNetworkFailure(false);
  };

  // Cleanup all modals on unmount to prevent delayed pop-ups
  useEffect(() => {
    return () => {
      setSuccessModalVisible(false);
      setEmptyFieldsModalVisible(false);
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

  // === Password Validation with Details ===
  const validatePasswordDetails = (password: string) => {
    const requirements = {
      minLength: password.length >= 8,
      hasNumber: /[0-9]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasSpecial: /[!@#$%^&*()_+]/.test(password),
      noSpaces: !/\s/.test(password),
    };
    return requirements;
  };

  // === Password Validation ===
  const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least 1 uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least 1 lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least 1 number' };
    }
    if (!/[!@#$%^&*()_+]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least 1 special character (!@#$%^&*()_+)' };
    }
    if (/\s/.test(password)) {
      return { isValid: false, message: 'Password must not contain spaces' };
    }
    return { isValid: true };
  };

  const handleConfirm = async () => {
    if (!password || !confirmPassword) {
      setEmptyFieldsModalVisible(true);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    // Check network connectivity before updating password
    console.log('🔍 Checking network connectivity for updating password...');
    const isConnected = await isNetworkConnected();
    console.log('📡 Network connectivity result:', isConnected);
    
    if (!isConnected) {
      console.log('❌ No network connection - update password blocked');
      setLocalNetworkFailure(true);
      return;
    }
    
    console.log('✅ Network connection available, proceeding to update password');

    setLoading(true);

    try {
      // OTP was already verified in forgot-password.tsx (single-use token)
      // Use the existing session to update password
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      
      if (passwordError) {
        setLoading(false);
        if (passwordError.message.includes('Network request failed') || 
            passwordError.message.includes('network') ||
            (passwordError as any).name === 'TypeError') {
          console.log('❌ Network error during password update:', passwordError.message);
          setLocalNetworkFailure(true);
          return;
        }
        setErrorMessage(passwordError.message);
        setErrorModalVisible(true);
        return;
      }

      // Sign out the user immediately to prevent auto-redirect to greetings
      await supabase.auth.signOut();
      setLoading(false);

      // Success - show success modal
      setSuccessModalVisible(true);
    } catch (error) {
      setLoading(false);
      console.log('❌ Error during password update:', (error as any)?.message);
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
        <Stack.Screen options={{ title: "Update Password", headerShown: false }} />
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
              <Text style={styles.title}>Update Password</Text>
              <Text style={styles.subtitle}>
                Create a new password for your account
              </Text>
            </MotiView>

            {/* Animated input fields */}
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400, duration: 600 }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <Text style={styles.label}>New Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Enter new password"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordRequirements(validatePasswordDetails(text));
                  }}
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

              <MotiView
                animate={{
                  opacity: showRequirements ? 1 : 0,
                  translateY: showRequirements ? 0 : -8,
                  maxHeight: showRequirements ? 200 : 0,
                  marginTop: showRequirements ? 8 : 0,
                }}
                transition={{ type: "timing", duration: 240 }}
                style={styles.requirementsContainer}
              >
                {unmetRequirements.map((item) => (
                  <View key={item.key} style={styles.requirementRow}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="#FF6B7A"
                      style={styles.requirementIcon}
                    />
                    <Text style={[styles.requirementText, { color: "#FF6B7A" }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </MotiView>

              <Text style={styles.label}>Confirm Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Re-enter new password"                  
                  placeholderTextColor="#888"                  
                  value={confirmPassword}
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

              <MotiView
                animate={{
                  opacity: showConfirmMismatch ? 1 : 0,
                  translateY: showConfirmMismatch ? 0 : -8,
                  maxHeight: showConfirmMismatch ? 60 : 0,
                  marginTop: showConfirmMismatch ? 8 : 0,
                }}
                transition={{ type: "timing", duration: 240 }}
                style={styles.requirementsContainer}
              >
                {showConfirmMismatch && (
                  <View style={styles.requirementRow}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="#FF6B7A"
                      style={styles.requirementIcon}
                    />
                    <Text style={[styles.requirementText, { color: "#FF6B7A" }]}>
                      Passwords do not match
                    </Text>
                  </View>
                )}
              </MotiView>
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
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "UPDATING..." : "CONFIRM"}
                </Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

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
        <View style={styles.errorModalOverlay}>
          <View style={styles.verificationModalContainer}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/auth/login');
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.verificationIconCircle}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            </View>
            
            <Text style={styles.errorModalTitle}>Password Updated Successfully!</Text>
            <Text style={styles.errorModalMessage}>
              Your password has been successfully updated. You can now log in with your new password.
            </Text>
            
            <TouchableOpacity
              style={[styles.verifyButton, { marginTop: 20 }]}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/auth/login');
              }}
            >
              <Text style={styles.verifyButtonText}>BACK TO LOGIN</Text>
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
  
  // Success Modal Styles
  emailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  emailModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "74%",
    maxWidth: 330,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
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
  emailModalTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Fredoka_600SemiBold",
    textAlign: "center",
  },
  emailModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: 8,
    flexWrap: "wrap" as "wrap",
  },
  emailOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 18,
    padding: 20,
    width: "74%",
    maxWidth: 330,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
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
  verificationModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    width: "74%",
    maxWidth: 330,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#9FD19E",
  },
  verificationIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D4F1D3",
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
    textAlign: "center",
  },
  errorModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
    flexWrap: "wrap" as "wrap",
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
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementsContainer: {
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: "Fredoka_400Regular",
    flex: 1,
  },
  verifyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Fredoka_600SemiBold",
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
});