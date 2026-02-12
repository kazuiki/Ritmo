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
import { createResponsiveStyles, useResponsiveDimensions } from "../src/utils/responsive";

const backgroundImage = require("../assets/background.png");

const generateCaptcha = () => {
  const operators = ["+", "-"] as const;
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let num1 = Math.floor(Math.random() * 20) + 1;
  let num2 = Math.floor(Math.random() * 20) + 1;

  if (operator === "-") {
    if (num2 > num1) {
      const temp = num1;
      num1 = num2;
      num2 = temp;
    }
  }

  const answer = operator === "+" ? num1 + num2 : num1 - num2;
  return { question: `${num1} ${operator} ${num2}`, answer: answer.toString() };
};

export default function ParentalLockNewPin() {
  const router = useRouter();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

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

  const handleContinue = async () => {
    if (!captchaAnswer.trim()) {
      setErrorMessage("Please answer the captcha to continue.");
      setShowErrorModal(true);
      return;
    }

    if (captchaAnswer.trim() === captcha.answer) {
      // Captcha is correct, show PIN modal
      setShowPinModal(true);
      setCaptchaAnswer("");
    } else {
      setErrorMessage("Your answer is incorrect. Please try again.");
      setShowErrorModal(true);
      // Reset captcha
      setCaptcha(generateCaptcha());
      setCaptchaAnswer("");
    }
  };

  const handleSavePin = async () => {
    if (newPin.every(digit => digit !== '')) {
      try {
        const newPinString = newPin.join('');
        // Save the new PIN to replace the existing one
        await ParentalLockService.savePin(newPinString);
        
        setSuccessMessage("New PIN has been saved successfully. The old PIN has been replaced.");
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
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
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
          Please answer the question below to proceed with changing your PIN.
        </Text>

        <View style={styles.captchaContainer}>
          <Text style={styles.captchaQuestion}>{captcha.question} = ?</Text>
          <TextInput
            style={styles.captchaInput}
            placeholder="Enter answer"
            value={captchaAnswer}
            onChangeText={setCaptchaAnswer}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContent}>
            <Text style={styles.errorModalTitle}>Oops!</Text>
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
    marginBottom: scale.scaleSpacing(10),
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
  captchaContainer: {
    width: "100%",
    marginBottom: scale.scaleSpacing(30),
    padding: scale.scaleSpacing(20),
    backgroundColor: "#F0F0F0",
    borderRadius: scale.scaleBorderRadius(12),
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  captchaQuestion: {
    fontSize: scale.scaleFont(18),
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: scale.scaleSpacing(15),
    textAlign: "center",
  },
  captchaInput: {
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