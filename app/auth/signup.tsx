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
import { isNetworkConnected } from "../../src/utils/networkUtils";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";
import NetworkFailureModal from "../components/NetworkFailureModal";

export default function SignUp() {
  const router = useRouter();
  const { scale } = useResponsiveDimensions();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sentVerificationCode, setSentVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
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
  const [verificationErrorModalVisible, setVerificationErrorModalVisible] = useState(false);
  const [verificationSuccessModalVisible, setVerificationSuccessModalVisible] = useState(false);
  const [emailRequiredModalVisible, setEmailRequiredModalVisible] = useState(false);

  const [agreed, setAgreed] = useState(false);
  const [agreementRequiredModalVisible, setAgreementRequiredModalVisible] = useState(false);
  const [completeDetailsModalVisible, setCompleteDetailsModalVisible] = useState(false);
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState(false);


  // Local network failure detection for authentication
  const [localNetworkFailure, setLocalNetworkFailure] = useState(false);

  const handleLocalNetworkRetry = async () => {
    console.log('🔄 User dismissed network failure modal');
    setLocalNetworkFailure(false);
  };

  const reduceMotionRef = useRef(false);
  const isInitialMount = useRef(true);

  // On first mount (fresh visit from Login), clear any persisted inputs
  useEffect(() => {
    const initInputs = async () => {
      try {
        await AsyncStorage.multiRemove(['@signupEmail', '@signupPassword', '@signupConfirm', '@signupVerificationCode']);
        // Reset acceptance on fresh visit from Login to prevent stale check
        await AsyncStorage.setItem('@termsAccepted', 'false');
      } catch {}
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setIsEmailVerified(false);
      setSentVerificationCode('');
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
          const savedVerificationCode = await AsyncStorage.getItem('@signupVerificationCode');
          if (savedEmail) setEmail(savedEmail);
          if (savedPassword) setPassword(savedPassword);
          if (savedConfirm) setConfirmPassword(savedConfirm);
          if (savedVerificationCode) setVerificationCode(savedVerificationCode);
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
          if (mounted) setAgreed(Boolean(val === "true"));
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
      setVerificationErrorModalVisible(false);
      setVerificationSuccessModalVisible(false);
      setEmailRequiredModalVisible(false);
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

  // === Combined Send Code and Verify Function ===
  const handleSendCodeOrVerify = async () => {
    // If no verification code sent yet, send code
    if (!sentVerificationCode) {
      await handleSendVerificationCode();
    } else {
      // If code already sent, verify the entered code
      handleVerifyCode();
    }
  };

  // === Send Verification Code Function ===
  const handleSendVerificationCode = async () => {
    if (!email) {
      setEmailRequiredModalVisible(true);
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
      // Generate a random 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentVerificationCode(code);
      
      // In a real app, you would send this code via email service
      // For now, we'll just log it and show success
      console.log('📧 Verification code sent:', code);
      
      setSendingCode(false);
      alert(`Verification code sent to ${email}: ${code}`);
      
    } catch (error) {
      setSendingCode(false);
      console.log('❌ Error sending verification code:', (error as any).message);
      setLocalNetworkFailure(true);
    }
  };

  // === Verify Code Function ===
  const handleVerifyCode = () => {
    if (!verificationCode) {
      setVerificationErrorModalVisible(true);
      return;
    }

    if (verificationCode === sentVerificationCode) {
      setIsEmailVerified(true);
      setVerificationSuccessModalVisible(true);
    } else {
      setVerificationErrorModalVisible(true);
    }
  };

  // === SignUp Function ===
  const handleSignUp = async () => {
    if (!isEmailVerified) {
      setVerificationErrorModalVisible(true);
      return;
    }
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

    // Check network connectivity before attempting signup
    console.log('🔍 Checking network connectivity for signup...');
    const isConnected = await isNetworkConnected();
    console.log('📡 Network connectivity result:', isConnected);
    
    if (!isConnected) {
      console.log('❌ No network connection - signup blocked');
      setLocalNetworkFailure(true);
      return;
    }
    
    console.log('✅ Network connection available, proceeding with signup');

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);

      if (error) {
        // Check if it's a network-related error
        if (error.message.includes('Network request failed') || 
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.name === 'TypeError') {
          console.log('❌ Network error during signup:', error.message);
          setLocalNetworkFailure(true);
          return;
        }
        
        setEmailErrorMessage(error.message);
        setEmailErrorModalVisible(true);
        return;
      }

      setConfirmEmailModalVisible(true);
    } catch (networkError) {
      setLoading(false);
      console.log('❌ Caught network error during signup:', (networkError as any).message);
      setLocalNetworkFailure(true);
      return;
    }
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

              {!isEmailVerified && (
                <>
                  <Text style={styles.label}>Verification Code:</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.inputFlex}
                      placeholder="Enter verification code:"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={styles.combinedButton}
                      onPress={handleSendCodeOrVerify}
                      disabled={Boolean(sendingCode || (!email && !sentVerificationCode) || (sentVerificationCode && !verificationCode))}
                    >
                      <Text style={styles.combinedButtonText}>
                        {sendingCode 
                          ? "Sending..." 
                          : !sentVerificationCode 
                          ? "SEND CODE" 
                          : "VERIFY"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {isEmailVerified && (
                <View style={styles.verifiedContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.verifiedText}>Email Verified!</Text>
                </View>
              )}

              {isEmailVerified && (
                <>
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
                      ['@signupVerificationCode', verificationCode],
                      ['@termsAccepted', 'false'],
                    ]).catch(() => {});
                    setAgreed(false);
                    // Open Privacy Policy first, then Terms
                    router.push('/privacy-policy');
                  }}
                  style={[styles.checkbox, agreed && styles.checkboxChecked]}
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
                </>
              )}
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

      {/* Email Required Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={emailRequiredModalVisible}
        onRequestClose={() => setEmailRequiredModalVisible(false)}
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
            <Text style={styles.errorModalTitle}>Email Required</Text>
            <Text style={styles.errorModalMessage}>
              Please enter your email address first
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setEmailRequiredModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verification Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={verificationErrorModalVisible}
        onRequestClose={() => setVerificationErrorModalVisible(false)}
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
            <Text style={styles.errorModalTitle}>Verification Failed</Text>
            <Text style={styles.errorModalMessage}>
              {!isEmailVerified && !verificationCode 
                ? "Please enter the verification code" 
                : !isEmailVerified 
                ? "Incorrect verification code. Please try again" 
                : "Please verify your email first"}
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setVerificationErrorModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verification Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={verificationSuccessModalVisible}
        onRequestClose={() => setVerificationSuccessModalVisible(false)}
      >
        <View style={styles.confirmEmailModalOverlay}>
          <View style={styles.confirmEmailModalContainer}>
            <View style={styles.confirmEmailIconCircle}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.confirmEmailModalTitle}>Email Verified!</Text>
            <Text style={styles.confirmEmailModalMessage}>
              Your email has been successfully verified. You can now continue with your registration.
            </Text>
            <TouchableOpacity
              style={styles.confirmEmailOkButton}
              onPress={() => setVerificationSuccessModalVisible(false)}
            >
              <Text style={styles.confirmEmailOkButtonText}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Network Failure Modal */}
      <NetworkFailureModal 
        visible={localNetworkFailure} 
        onRetry={handleLocalNetworkRetry} 
      />

    </KeyboardAvoidingView>
  );
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: scale.scaleSpacing(28),
    justifyContent: "center",
    alignItems: "center",
  },
  background: { flex: 1, width: "100%", height: "100%" },
  logo: {
    width: scale.scaleWidth(260),
    height: scale.scaleHeight(220),
    marginBottom: scale.scaleSpacing(6),
  },
  label: {
    alignSelf: "flex-start",
    color: "#276a63",
    marginTop: scale.scaleSpacing(8),
    fontSize: scale.scaleFont(14),
    fontFamily: "ITIM",
  },
  input: {
    width: "100%",
    maxWidth: scale.scaleWidth(340),
    backgroundColor: "#fff",
    borderRadius: scale.scaleBorderRadius(5),
    paddingHorizontal: scale.scaleSpacing(18),
    paddingVertical: scale.scaleSpacing(14),
    marginTop: scale.scaleSpacing(10),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    fontSize: scale.scaleFont(15),
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#888",
  },
  inputRow: {
    width: "100%",
    maxWidth: scale.scaleWidth(340),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: scale.scaleBorderRadius(5),
    paddingHorizontal: scale.scaleSpacing(14),
    marginTop: scale.scaleSpacing(10),
    elevation: 2,
  },
  inputFlex: { flex: 1, paddingVertical: scale.scaleSpacing(12), fontSize: scale.scaleFont(15) },
  eyeButton: { paddingHorizontal: scale.scaleSpacing(4), paddingVertical: scale.scaleSpacing(4) },
  button: {
    marginTop: scale.scaleSpacing(22),
    backgroundColor: "#2D7778",
    paddingVertical: scale.scaleSpacing(14),
    width: "100%",
    maxWidth: scale.scaleWidth(340),
    borderRadius: scale.scaleBorderRadius(5),
    alignItems: "center",
    elevation: 3,
  },
  buttonText: { color: "#fff", fontWeight: "400", fontSize: scale.scaleFont(15) },
  link: {
    marginTop: scale.scaleSpacing(16),
    color: "#276a63",
    textDecorationLine: "underline",
    textAlign: "center",
    fontSize: scale.scaleFont(14),
  },
  agreeRow: {
    width: '100%',
    maxWidth: scale.scaleWidth(340),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale.scaleSpacing(12),
    flexWrap: 'wrap',
  },
  checkbox: {
    width: scale.scaleWidth(18),
    height: scale.scaleHeight(18),
    borderRadius: scale.scaleBorderRadius(3),
    borderWidth: 2,
    borderColor: '#244D4A',
    marginRight: scale.scaleSpacing(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#2D7778',
    backgroundColor: '#CFEDE8',
  },
  checkboxInner: {
    width: scale.scaleWidth(10),
    height: scale.scaleHeight(10),
    backgroundColor: '#2D7778',
    borderRadius: scale.scaleBorderRadius(2),
  },
  agreeText: {
    color: '#244D4A',
    fontSize: scale.scaleFont(12),
  },
  linkInline: {
    color: '#276a63',
    textDecorationLine: 'underline',
    fontSize: scale.scaleFont(12),
  },
  confirmEmailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmEmailModalContainer: {
    backgroundColor: "#fff",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(24),
    alignItems: "center",
    width: "80%",
    borderWidth: 2,
    borderColor: "#9FD19E",
  },
  confirmEmailIconCircle: {
    width: scale.scaleWidth(70),
    height: scale.scaleHeight(70),
    borderRadius: scale.scaleBorderRadius(35),
    backgroundColor: "#D4F1D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(16),
  },
  confirmEmailIcon: {
    width: scale.scaleWidth(40),
    height: scale.scaleHeight(40),
  },
  confirmEmailModalTitle: {
    fontSize: scale.scaleFont(18),
    fontFamily: "ITIM",
    fontWeight: "700",
    color: "#000",
    marginBottom: scale.scaleSpacing(8),
    textAlign: "center",
  },
  confirmEmailModalMessage: {
    fontSize: scale.scaleFont(14),
    fontFamily: "ITIM",
    color: "#666",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(20),
  },
  confirmEmailOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(20),
  },
  confirmEmailOkButtonText: {
    color: "#fff",
    fontSize: scale.scaleFont(16),
    fontFamily: "ITIM",
    fontWeight: "600",
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
    borderRadius: scale.scaleBorderRadius(18),
    padding: scale.scaleSpacing(18),
    width: "82%",
    maxWidth: scale.scaleWidth(420),
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
    width: scale.scaleWidth(64),
    height: scale.scaleHeight(64),
    borderRadius: scale.scaleBorderRadius(32),
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  errorIcon: {
    width: scale.scaleWidth(36),
    height: scale.scaleHeight(36),
    resizeMode: "contain",
  },
  errorModalTitle: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "ITIM",
  },
  errorModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: scale.scaleFont(18),
    marginBottom: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(8),
    flexWrap: "wrap",
    fontFamily: "ITIM",
  },
  errorOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(28),
    borderRadius: scale.scaleBorderRadius(40),
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale.scaleWidth(110),
  },
  errorOkButtonText: {
    fontSize: scale.scaleFont(15),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "ITIM",
  },
  sendCodeButton: {
    backgroundColor: "#2D7778",
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(12),
    borderRadius: scale.scaleBorderRadius(5),
    marginLeft: scale.scaleSpacing(4),
  },
  sendCodeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: scale.scaleFont(13),
    fontFamily: "ITIM",
  },
  verifyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(16),
    borderRadius: scale.scaleBorderRadius(5),
    marginLeft: scale.scaleSpacing(8),
  },
  verifyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: scale.scaleFont(12),
    fontFamily: "ITIM",
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(16),
    borderRadius: scale.scaleBorderRadius(5),
    marginTop: scale.scaleSpacing(10),
    alignSelf: "flex-start",
  },
  verifiedText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: scale.scaleFont(14),
    fontFamily: "ITIM",
    marginLeft: scale.scaleSpacing(8),
  },
  combinedButton: {
    backgroundColor: "#2D7778",
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(16),
    borderRadius: scale.scaleBorderRadius(5),
    marginLeft: scale.scaleSpacing(8),
  },
  combinedButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: scale.scaleFont(12),
    fontFamily: "ITIM",
  },
}));