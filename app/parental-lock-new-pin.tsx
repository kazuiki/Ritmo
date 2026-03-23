import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    ImageBackground,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { ParentalLockService } from "../src/parentalLockService";
import { supabase } from "../src/supabaseClient";
import { isNetworkConnected } from "../src/utils/networkUtils";
import { createResponsiveStyles, useResponsiveDimensions } from "../src/utils/responsive";

const backgroundImage = require("../assets/background.png");

export default function ParentalLockNewPin() {
  const router = useRouter();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
  
  // Email and OTP states
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [currentSessionEmail, setCurrentSessionEmail] = useState("");
  
  // Modal states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // PIN states
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  
  // Loading states
  const [sendingCode, setSendingCode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get current session email on mount
  const getSessionEmail = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error getting user:', error);
        setErrorMessage("Unable to retrieve session information.");
        setShowErrorModal(true);
        return;
      }
      setCurrentSessionEmail(user.email || "");
    } catch (error) {
      console.error('Error getting session email:', error);
      setErrorMessage("An error occurred. Please try again.");
      setShowErrorModal(true);
    }
  };

  const handlePinInput = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) return;
    
    const updatedPin = [...newPin];
    updatedPin[index] = value;
    setNewPin(updatedPin);

    // Auto-focus next input
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === '' && index > 0) {
      // If current field is empty and backspace, go to previous field
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      setShowErrorModal(true);
      return;
    }

    // Validate email matches current session
    if (email.toLowerCase() !== currentSessionEmail.toLowerCase()) {
      setErrorMessage("The email you entered does not match your account. Please try again.");
      setShowErrorModal(true);
      return;
    }

    // Check network connectivity before sending code
    const isConnected = await isNetworkConnected();
    if (!isConnected) {
      setErrorMessage("No network connection. Please check your internet and try again.");
      setShowErrorModal(true);
      return;
    }

    setSendingCode(true);
    try {
      // Send OTP to email
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
          setErrorMessage("Network error. Please check your internet and try again.");
          setShowErrorModal(true);
          return;
        }
        
        setErrorMessage(error.message);
        setShowErrorModal(true);
        return;
      }

      // Show verification modal
      setShowVerificationModal(true);
    } catch (error) {
      setSendingCode(false);
      console.log('Error during sending code:', (error as any).message);
      setErrorMessage("An error occurred. Please try again.");
      setShowErrorModal(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setErrorMessage("Please enter the verification code");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      // Verify OTP
      const { error } = await supabase.auth.verifyOtp({
        type: 'email',
        email,
        token: verificationCode,
      });

      if (error) {
        setLoading(false);
        console.log('Error verifying OTP:', error.message);
        setErrorMessage("Incorrect verification code. Please try again");
        setShowErrorModal(true);
        return;
      }

      // OTP is valid - show PIN modal
      setLoading(false);
      setShowVerificationModal(false);
      setShowPinModal(true);
    } catch (error) {
      setLoading(false);
      console.log('Error during verification:', (error as any)?.message);
      setErrorMessage("An error occurred. Please try again");
      setShowErrorModal(true);
    }
  };

  const handleSavePin = async () => {
    if (newPin.every(digit => digit !== '')) {
      try {
        const newPinString = newPin.join('');
        // Save the new PIN to replace the existing one
        await ParentalLockService.savePin(newPinString);
        
        setSuccessMessage("You have successfully set a PIN");
        setShowSuccessModal(true);
      } catch (error) {
        setErrorMessage("Failed to save new PIN. Please try again.");
        setShowErrorModal(true);
      }
    } else {
      setErrorMessage("Please enter all 4 digits.");
      setShowErrorModal(true);
    }
  };

  const handleCancelPin = () => {
    setShowPinModal(false);
    setNewPin(['', '', '', '']);
    setEmail("");
    setVerificationCode("");
  };

  const handleCancelVerification = () => {
    setShowVerificationModal(false);
    setVerificationCode("");
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.bg} resizeMode="cover">
      <View style={styles.container}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>New Pin Setup</Text>

        <Text style={styles.instructionText}>
          Please enter the email address associated with your account to proceed.
        </Text>

        <View style={styles.emailContainer}>
          <TextInput
            style={styles.emailInput}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
            onFocus={getSessionEmail}
          />
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleSendOtp}
          disabled={sendingCode}
        >
          <Text style={styles.continueText}>
            {sendingCode ? "SENDING..." : "SEND OTP"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* OTP Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelVerification}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleCancelVerification}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Enter Verification Code</Text>
            
            <Text style={styles.verificationMessage}>
              A verification code has been sent to {email}
            </Text>
            
            <TextInput
              style={[styles.input, styles.verificationInput]}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#888"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="numeric"
              maxLength={6}
              multiline={false}
              numberOfLines={1}
              textAlignVertical="center"
            />
            
            <TouchableOpacity
              style={[styles.verifyButton, { marginTop: 20 }]}
              onPress={handleVerifyCode}
              disabled={!verificationCode || verificationCode.length !== 6 || loading}
            >
              <Text style={styles.verifyButtonText}>
                {loading ? "VERIFYING..." : "VERIFY"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContent}>
            <Text style={styles.errorModalTitle}>Error</Text>
            <Text style={styles.errorModalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          setShowPinModal(false);
          if (router.canGoBack()) {
            router.back();
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <Ionicons name="checkmark-circle" size={60} color="#05b39e" style={styles.successIcon} />
            <Text style={styles.successModalTitle}>Success!</Text>
            <Text style={styles.successModalMessage}>{successMessage}</Text>
            <TouchableOpacity 
              style={styles.successModalButton} 
              onPress={() => {
                setShowSuccessModal(false);
                setShowPinModal(false);
                if (router.canGoBack()) {
                  router.back();
                }
              }}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Setup Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm{'\n'}new 4-digit PIN code</Text>
            
            <View style={styles.pinContainer}>
              {newPin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={pinRefs[index]}
                  style={[styles.pinBox, digit && styles.pinBoxFilled]}
                  value={digit}
                  onChangeText={(value) => handlePinInput(index, value)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace') {
                      handleBackspace(index, digit);
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  secureTextEntry={false}
                  selectTextOnFocus={true}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.savePinButton} onPress={handleSavePin}>
              <Text style={styles.savePinText}>Save Pin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelPinButton} onPress={handleCancelPin}>
              <Text style={styles.cancelPinText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  bg: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: scale.scaleSpacing(20),
    paddingTop: scale.scaleSpacing(50),
    justifyContent: "flex-start",
  },
  backText: {
    alignSelf: "flex-start",
    color: "#333",
    fontSize: scale.scaleFont(16),
    marginBottom: scale.scaleSpacing(8),
    textDecorationLine: "underline",
    fontFamily: "ITIM",
  },
  title: {
    fontSize: scale.scaleFont(24),
    fontWeight: "700",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: scale.scaleSpacing(12),
    textAlign: "center",
  },
  instructionText: {
    fontSize: scale.scaleFont(16),
    color: "#4B5563",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(24),
    lineHeight: scale.scaleFont(22),
    fontFamily: "ITIM",
  },
  emailContainer: {
    width: "100%",
    marginBottom: scale.scaleSpacing(30),
    padding: scale.scaleSpacing(20),
    backgroundColor: "#F0F0F0",
    borderRadius: scale.scaleBorderRadius(12),
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  emailInput: {
    height: scale.scaleHeight(50),
    borderRadius: scale.scaleBorderRadius(12),
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale.scaleSpacing(20),
    fontSize: scale.scaleFont(16),
    color: "#000",
    fontFamily: "ITIM",
    textAlign: "left",
    textAlignVertical: "center",
  },
  field: {
    width: "100%",
    marginBottom: scale.scaleSpacing(20),
  },
  label: {
    fontSize: scale.scaleFont(14),
    color: "#333",
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "ITIM",
  },
  input: {
    height: scale.scaleHeight(50),
    borderRadius: scale.scaleBorderRadius(12),
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale.scaleSpacing(16),
    fontSize: scale.scaleFont(16),
    color: "#000",
    fontFamily: "ITIM",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  passwordInput: {
    height: scale.scaleHeight(50),
    borderRadius: scale.scaleBorderRadius(12),
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale.scaleSpacing(16),
    paddingRight: scale.scaleSpacing(50),
    fontSize: scale.scaleFont(16),
    color: "#000",
    fontFamily: "ITIM",
    flex: 1,
  },
  eyeButton: {
    position: "absolute",
    right: scale.scaleSpacing(15),
    padding: scale.scaleSpacing(10),
  },
  continueButton: {
    backgroundColor: "#2B6A63",
    paddingVertical: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(25),
    width: "100%",
    alignItems: "center",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    textAlign: "center",
    fontFamily: "ITIM",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(35),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: "90%",
    maxWidth: scale.scaleWidth(320),
  },
  modalTitle: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: scale.scaleSpacing(30),
    textAlign: "center",
    lineHeight: scale.scaleFont(22),
  },
  verificationMessage: {
    fontSize: scale.scaleFont(14),
    color: "#666",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(15),
    fontFamily: "ITIM",
  },
  verificationInput: {
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 18,
    width: '100%',
    minHeight: scale.scaleHeight(50),
    maxHeight: scale.scaleHeight(50),
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: scale.scaleSpacing(20),
    gap: scale.scaleSpacing(15),
  },
  pinBox: {
    width: scale.scaleWidth(50),
    height: scale.scaleHeight(50),
    borderRadius: scale.scaleBorderRadius(8),
    backgroundColor: "#D1D1D6",
    textAlign: "center",
    fontSize: scale.scaleFont(20),
    fontWeight: "600",
    color: "#000",
  },
  pinBoxFilled: {
    backgroundColor: "#D1D1D6",
  },
  savePinButton: {
    backgroundColor: "#5A8F8A",
    paddingVertical: scale.scaleSpacing(18),
    paddingHorizontal: scale.scaleSpacing(60),
    borderRadius: scale.scaleBorderRadius(25),
    marginBottom: scale.scaleSpacing(15),
    width: "90%",
  },
  savePinText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(18),
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
  },
  cancelPinButton: {
    backgroundColor: "#7DDDD3",
    paddingVertical: scale.scaleSpacing(18),
    paddingHorizontal: scale.scaleSpacing(60),
    borderRadius: scale.scaleBorderRadius(25),
    width: "90%",
  },
  cancelPinText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: scale.scaleSpacing(15),
    right: scale.scaleSpacing(15),
    padding: scale.scaleSpacing(8),
    zIndex: 10,
  },
  verifyButton: {
    backgroundColor: "#2B6A63",
    paddingVertical: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(25),
    width: "100%",
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    textAlign: "center",
    fontFamily: "ITIM",
  },

  // Error Modal Styles
  errorModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#FF6B6B",
    padding: scale.scaleSpacing(30),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: "85%",
    maxWidth: scale.scaleWidth(300),
  },
  errorModalTitle: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    fontFamily: "ITIM",
    color: "#FF6B6B",
    marginBottom: scale.scaleSpacing(15),
    textAlign: "center",
  },
  errorModalMessage: {
    fontSize: scale.scaleFont(14),
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: scale.scaleSpacing(20),
    textAlign: "center",
    lineHeight: scale.scaleFont(18),
  },
  errorModalButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(20),
    width: "80%",
  },
  errorModalButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
  },
  // Success Modal Styles
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#05b39e",
    padding: scale.scaleSpacing(30),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: "85%",
    maxWidth: scale.scaleWidth(300),
  },
  successIcon: {
    marginBottom: scale.scaleSpacing(15),
  },
  successModalTitle: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    fontFamily: "ITIM",
    color: "#05b39e",
    marginBottom: scale.scaleSpacing(15),
    textAlign: "center",
  },
  successModalMessage: {
    fontSize: scale.scaleFont(14),
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: scale.scaleSpacing(20),
    textAlign: "center",
    lineHeight: scale.scaleFont(18),
  },
  successModalButton: {
    backgroundColor: "#05b39e",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(20),
    width: "80%",
  },
  successModalButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
  },
}));