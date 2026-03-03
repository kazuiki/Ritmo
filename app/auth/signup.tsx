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
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";
import NetworkFailureModal from "../components/NetworkFailureModal";

export default function SignUp() {
  const router = useRouter();
  const { scaleHeight, scaleSpacing } = useResponsiveDimensions();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sentVerificationCode, setSentVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
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
  const [confirmEmailModalVisible, setConfirmEmailModalVisible] = useState(false);
  const [fillFieldsModalVisible, setFillFieldsModalVisible] = useState(false);
  const [passwordMismatchModalVisible, setPasswordMismatchModalVisible] = useState(false);
  const [passwordLengthModalVisible, setPasswordLengthModalVisible] = useState(false);
  const [invalidEmailModalVisible, setInvalidEmailModalVisible] = useState(false);
  const [emailErrorModalVisible, setEmailErrorModalVisible] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [verificationErrorModalVisible, setVerificationErrorModalVisible] = useState(false);
  const [verificationSuccessModalVisible, setVerificationSuccessModalVisible] = useState(false);
  const [emailRequiredModalVisible, setEmailRequiredModalVisible] = useState(false);

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

  const [agreed, setAgreed] = useState(false);
  const [agreementRequiredModalVisible, setAgreementRequiredModalVisible] = useState(false);
  const [completeDetailsModalVisible, setCompleteDetailsModalVisible] = useState(false);
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState(false);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [accountCreatedModalVisible, setAccountCreatedModalVisible] = useState(false);

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
        await AsyncStorage.multiRemove(['@signupEmail', '@signupPassword', '@signupConfirm', '@signupVerificationCode', '@termsAccepted']);
      } catch {}
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setIsEmailVerified(false);
      setSentVerificationCode('');
      setAgreed(false); // Also uncheck the terms checkbox on fresh start
    };
    initInputs();
  }, []);

  // Restore saved inputs when returning to an already-mounted screen (after Privacy/Terms)
  const hasRestoredRef = useRef(false);
  useFocusEffect(
    (() => {
      const restoreIfMounted = async () => {
        // Only restore once after mounting, not every focus
        if (hasRestoredRef.current) return;
        
        try {
          const savedEmail = await AsyncStorage.getItem('@signupEmail');
          const savedPassword = await AsyncStorage.getItem('@signupPassword');
          const savedConfirm = await AsyncStorage.getItem('@signupConfirm');
          const savedVerificationCode = await AsyncStorage.getItem('@signupVerificationCode');
          if (savedEmail) setEmail(savedEmail);
          if (savedPassword) setPassword(savedPassword);
          if (savedConfirm) setConfirmPassword(savedConfirm);
          if (savedVerificationCode) setVerificationCode(savedVerificationCode);
          hasRestoredRef.current = true;
        } catch {}
      };
      restoreIfMounted();
      return () => {};
    })
  );

  // Removed auto-restoration of terms acceptance checkbox
  // Users should manually check the checkbox each time they sign up
  
  // Restore checkbox state when returning from Terms/Privacy pages
  useFocusEffect(
    (() => {
      let mounted = true;
      const checkTermsAcceptance = async () => {
        try {
          const val = await AsyncStorage.getItem("@termsAccepted");
          // Only check the box if user accepted terms (coming back from terms page)
          if (mounted && val === "true") {
            setAgreed(true);
          }
        } catch {}
      };
      checkTermsAcceptance();
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

  // === Email Validation ===
  const validateEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@gmail.com');
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

  // === Create Account Handler (Step 1: Send Verification Code) ===
  const handleCreateAccount = async () => {
    if (!email || !password || !confirmPassword) {
      setFillFieldsModalVisible(true);
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setInvalidEmailModalVisible(true);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setEmailErrorMessage(passwordValidation.message || 'Invalid password');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatchModalVisible(true);
      return;
    }

    if (!agreed) {
      setAgreementRequiredModalVisible(true);
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

    // before creating a new account, make a quick call with
    // shouldCreateUser:false.  If this call succeeds it means the
    // address already exists in Supabase and the SDK has sent an OTP
    // for *sign‑in* rather than creation.  We treat that as a duplicate
    // account and abort the sign‑up flow so that the user sees a clear
    // error instead of being able to overwrite/reset the existing
    // password.
    setSendingCode(true);

    // existence check – wrap in try/catch because the call itself can
    // throw when the network is down.
    let existenceError: any = null;
    try {
      const response = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: undefined,
        },
      });
      existenceError = response.error;
    } catch (err: any) {
      // network or unexpected failure; behave like a generic send error
      console.log('❌ Network/error during existence check:', err?.message);
      setSendingCode(false);
      setLocalNetworkFailure(true);
      return;
    }

    if (!existenceError) {
      // no error = user exists and OTP has already been dispatched.
      // we inform the user and stop.
      console.log('⚠️ Email already registered, blocking sign‑up');
      setSendingCode(false);
      setEmailErrorMessage(
        'An account already exists with this email. Please log in instead.'
      );
      setEmailErrorModalVisible(true);
      return;
    }

    // If we got an error but it's a network issue, bail out early instead
    // of attempting another request.  The error string tends to include
    // "Network" or the name will be TypeError when offline.
    if (
      existenceError.message?.includes('Network request failed') ||
      existenceError.message?.toLowerCase().includes('network') ||
      existenceError.name === 'TypeError'
    ) {
      setSendingCode(false);
      setLocalNetworkFailure(true);
      return;
    }

    // Otherwise the error is expected when the user does not exist,
    // so we fall through and perform the normal creation call below.

    try {
      // Use Supabase default mailer to send OTP to the provided email (valid for 15 minutes)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined,
        },
      });

      setSendingCode(false);

      if (error) {
        console.log('❌ Error sending verification code via Supabase:', error.message);
        if (
          error.message.includes('Network request failed') ||
          error.message.toLowerCase().includes('network') ||
          (error as any).name === 'TypeError'
        ) {
          setLocalNetworkFailure(true);
          return;
        }
        setEmailErrorMessage(error.message);
        setEmailErrorModalVisible(true);
        return;
      }

      // Mark that a code has been sent and show verification modal
      setSentVerificationCode('SENT');
      setVerificationModalVisible(true);
    } catch (error) {
      setSendingCode(false);
      console.log('❌ Error sending verification code (catch):', (error as any)?.message);
      setLocalNetworkFailure(true);
    }
  };

  // === Verify Code Function (Modal Verification) ===
  const handleVerifyCodeFromModal = async () => {
    if (!verificationCode) {
      setVerificationErrorModalVisible(true);
      return;
    }

    try {
      // Verify the OTP sent to the user's email
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'email',
        email,
        token: verificationCode,
      });

      if (error) {
        console.log('❌ Error verifying OTP:', error.message);
        setVerificationErrorModalVisible(true);
        return;
      }

      // On success, the user is signed in (and created if not existing)
      console.log('✅ OTP verified. Session established:', Boolean(data?.session));
      
      // Set the password and mark terms as accepted (since user checked the agreement during signup)
      const { error: passwordError } = await supabase.auth.updateUser({ 
        password,
        data: { has_accepted_terms: true }
      });
      
      if (passwordError) {
        if (
          passwordError.message.includes('Network request failed') ||
          passwordError.message.toLowerCase().includes('network') ||
          (passwordError as any).name === 'TypeError'
        ) {
          console.log('❌ Network error while setting password:', passwordError.message);
          setLocalNetworkFailure(true);
          return;
        }
        setEmailErrorMessage(passwordError.message);
        setEmailErrorModalVisible(true);
        return;
      }

      // Password set successfully, close verification modal and show account created modal
      // Sign out to avoid automatic redirects (user must log in manually)
      await supabase.auth.signOut();
      setVerificationModalVisible(false);
      setAccountCreatedModalVisible(true);
    } catch (error) {
      console.log('❌ Error verifying OTP (catch):', (error as any)?.message);
      setVerificationErrorModalVisible(true);
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
                placeholder="Enter email here"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Enter password here"
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
                  maxHeight: showRequirements ? scaleHeight(200) : 0,
                  marginTop: showRequirements ? scaleSpacing(8) : 0,
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
                  placeholder="Re-enter password"
                  placeholderTextColor="#888"
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

              <MotiView
                animate={{
                  opacity: showConfirmMismatch ? 1 : 0,
                  translateY: showConfirmMismatch ? 0 : -8,
                  maxHeight: showConfirmMismatch ? scaleHeight(60) : 0,
                  marginTop: showConfirmMismatch ? scaleSpacing(8) : 0,
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

              {/* Agreement checkbox + text */}
              <View style={styles.agreeRow}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!agreed) {
                      // Require fields filled before proceeding to Terms
                      if (!email || !password || !confirmPassword) {
                        setCompleteDetailsModalVisible(true);
                        return;
                      }
                      // Persist current inputs so they are restored after returning
                      await AsyncStorage.multiSet([
                        ['@signupEmail', email],
                        ['@signupPassword', password],
                        ['@signupConfirm', confirmPassword],
                        ['@termsAccepted', 'false'],
                      ]).catch(() => {});
                      // Open Privacy Policy first, then Terms
                      router.push('/privacy-policy');
                    } else {
                      // Uncheck if already checked
                      setAgreed(false);
                      AsyncStorage.setItem('@termsAccepted', 'false').catch(() => {});
                    }
                  }}
                  style={[styles.checkbox, agreed && styles.checkboxChecked]}
                >
                  {agreed && <View style={styles.checkboxInner} />}
                </TouchableOpacity>
                <Text style={styles.agreeText}> by signing up you agree to our terms and conditions </Text>
                <Text style={styles.agreeText}>and privacy policy</Text>
              </View>

              {/* Animated Create Account button */}
              <MotiView
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 700, type: "spring" }}
                style={{ width: "100%", alignItems: "center" }}
              >
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleCreateAccount}
                  disabled={sendingCode}
                >
                  <Text style={styles.buttonText}>
                    {sendingCode ? "Sending Code..." : "CREATE ACCOUNT"}
                  </Text>
                </TouchableOpacity>
              </MotiView>
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
        </ScrollView>
      </KeyboardAvoidingView>

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

      {/* Invalid Email Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={invalidEmailModalVisible}
        onRequestClose={() => setInvalidEmailModalVisible(false)}
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
            <Text style={styles.errorModalTitle}>Invalid Email</Text>
            <Text style={styles.errorModalMessage}>
              Please use a valid Gmail address (@gmail.com)
            </Text>
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setInvalidEmailModalVisible(false)}
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

      {/* Verification Code Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={verificationModalVisible}
        onRequestClose={() => setVerificationModalVisible(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.verificationModalContainer}>
            <View style={styles.verificationIconCircle}>
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
              style={[styles.input, { marginTop: 16, textAlign: 'center', paddingHorizontal: 18 }]}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#888"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="numeric"
              maxLength={6}
            />
            
            <TouchableOpacity
              style={[styles.verifyButton, { marginTop: 20, paddingVertical: 10, paddingHorizontal: 40, borderRadius: 20 }]}
              onPress={handleVerifyCodeFromModal}
              disabled={!verificationCode || verificationCode.length !== 6}
            >
              <Text style={styles.verifyButtonText}>VERIFY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Created Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={accountCreatedModalVisible}
        onRequestClose={() => setAccountCreatedModalVisible(false)}
      >
        <View style={styles.accountModalOverlay}>
          <View style={styles.accountModalContainer}>
            <View style={styles.accountIconCircle}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.accountModalTitle}>Account Created!</Text>
            <Text style={styles.accountModalMessage}>
              Your account has been successfully created. Please log in to continue.
            </Text>
            <TouchableOpacity
              style={styles.accountOkButton}
              onPress={() => {
                setAccountCreatedModalVisible(false);
                router.replace('/auth/login');
              }}
            >
              <Text style={styles.accountOkButtonText}>GO TO LOGIN</Text>
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

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  outer: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  background: { 
    position: 'absolute',
    width: "100%", 
    height: "100%",
    top: 0,
    left: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: scale.scaleSpacing(28),
    paddingVertical: scale.scaleSpacing(20),
    justifyContent: "center",
    alignItems: "center",
    minHeight: scale.scaleHeight(700),
  },
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
    fontFamily: "Fredoka_400Regular",
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
    color: "#333",
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
  inputFlex: { flex: 1, paddingVertical: scale.scaleSpacing(12), fontSize: scale.scaleFont(15), color: "#333" },
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
    fontFamily: "Fredoka_700Bold",
    fontWeight: "700",
    color: "#000",
    marginBottom: scale.scaleSpacing(8),
    textAlign: "center",
  },
  confirmEmailModalMessage: {
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_400Regular",
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
    fontFamily: "Fredoka_700Bold",
    fontWeight: "600",
  },

  // Account Created Modal (match forgot-password success style)
  accountModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  accountModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(24),
    width: "80%",
    maxWidth: scale.scaleWidth(360),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#9FD19E",
  },
  accountIconCircle: {
    width: scale.scaleWidth(70),
    height: scale.scaleHeight(70),
    borderRadius: scale.scaleBorderRadius(35),
    backgroundColor: "#D4F1D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(16),
  },
  accountModalTitle: {
    fontSize: scale.scaleFont(24),
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "Fredoka_600SemiBold",
    textAlign: "center",
  },
  accountModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: scale.scaleFont(20),
    marginBottom: scale.scaleSpacing(20),
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: scale.scaleSpacing(8),
    flexWrap: "wrap",
  },
  accountOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(50),
    borderRadius: scale.scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale.scaleWidth(140),
  },
  accountOkButtonText: {
    fontSize: scale.scaleFont(16),
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
  verificationModalContainer: {
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
    borderColor: "#9FD19E",
  },
  verificationIconCircle: {
    width: scale.scaleWidth(64),
    height: scale.scaleHeight(64),
    borderRadius: scale.scaleBorderRadius(32),
    backgroundColor: "#D4F1D3",
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
    fontFamily: "Fredoka_700Bold",
  },
  errorModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: scale.scaleFont(18),
    marginBottom: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(8),
    flexWrap: "wrap",
    fontFamily: "Fredoka_400Regular",
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
    fontFamily: "Fredoka_600SemiBold",
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
    fontFamily: "Fredoka_400Regular",
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
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_600SemiBold",
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
    fontFamily: "Fredoka_400Regular",
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
    fontFamily: "Fredoka_400Regular",
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale.scaleSpacing(8),
  },
  requirementsContainer: {
    width: "100%",
    maxWidth: scale.scaleWidth(340),
    paddingHorizontal: scale.scaleSpacing(6),
    overflow: "hidden",
  },
  requirementIcon: {
    marginRight: scale.scaleSpacing(8),
  },
  requirementText: {
    fontSize: scale.scaleFont(12),
    fontFamily: "Fredoka_400Regular",
    flex: 1,
  },
}));