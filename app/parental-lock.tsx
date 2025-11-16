import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { ParentalLockAuthService } from "../src/parentalLockAuthService";
import { ParentalLockService } from "../src/parentalLockService";

const backgroundImage = require("../assets/background.png");

export default function ParentalLock() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [savedPin, setSavedPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isVerifyingToDisable, setIsVerifyingToDisable] = useState(false);
  const [pinError, setPinError] = useState('');
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  // Load parental lock state on mount
  useEffect(() => {
    loadParentalLockState();
  }, []);

  // Handle focus effects to maintain modal state
  useFocusEffect(
    React.useCallback(() => {
      // Reload state when screen is focused
      loadParentalLockState();
    }, [])
  );

  const loadParentalLockState = async () => {
    const enabled = await ParentalLockService.isEnabled();
    const savedPinCode = await ParentalLockService.getSavedPin();
    setIsEnabled(enabled);
    if (savedPinCode) {
      setSavedPin(savedPinCode);
    }
  };

  const toggleSwitch = async () => {
    setPinError(''); // Clear any previous errors
    if (!isEnabled) {
      // If turning ON, show PIN modal to set new PIN
      setIsVerifyingToDisable(false);
      setShowPinModal(true);
    } else {
      // If turning OFF, show PIN modal to verify existing PIN
      setIsVerifyingToDisable(true);
      setShowPinModal(true);
    }
  };

  const handlePinInput = (index: number, value: string) => {
    // Only allow single digits
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

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

  const savePinAndEnable = async () => {
    // Check if all PIN digits are filled
    if (pin.every(digit => digit !== '')) {
      const pinCode = pin.join('');
      
      if (isVerifyingToDisable) {
        // Verify PIN to disable parental lock
        if (pinCode === savedPin) {
          // PIN is correct, disable parental lock
          setIsEnabled(false);
          await ParentalLockService.setEnabled(false);
          ParentalLockAuthService.clearAuthentication();
          setShowPinModal(false);
          setPin(['', '', '', '']); // Reset PIN input
          setIsVerifyingToDisable(false);
        } else {
          // PIN is incorrect, show error message
          setPinError('PIN Incorrect');
          setPin(['', '', '', '']); // Reset PIN input for retry
        }
      } else {
        // Setting new PIN to enable parental lock
        setSavedPin(pinCode); // Save the PIN locally
        await ParentalLockService.savePin(pinCode); // Save to storage
        await ParentalLockService.setEnabled(true); // Enable parental lock
        setIsEnabled(true);
        setShowPinModal(false);
        setPin(['', '', '', '']); // Reset PIN input
      }
    }
  };

  const cancelPin = () => {
    setShowPinModal(false);
    setPin(['', '', '', '']); // Reset PIN
    setIsVerifyingToDisable(false); // Reset verification state
    setPinError(''); // Clear error message
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.bg as any}
      resizeMode="cover"
    >
      <View style={styles.container as any}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton as any} onPress={() => router.push("/(tabs)/settings")}>
          <Text style={styles.backButtonText as any}>Back</Text>
        </TouchableOpacity>

        {/* Parental Lock Card */}
        <View style={styles.card as any}>
          <Text style={styles.title as any}>Parental Lock</Text>
          <Switch
            trackColor={{ false: "#FF6B6B", true: "#4CAF50" }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#FF6B6B"
            onValueChange={toggleSwitch}
            value={isEnabled}
            style={styles.switch as any}
          />
        </View>

        {/* PIN Display Card - Only show when PIN is set and parental lock is enabled */}
        {savedPin && isEnabled && (
          <View style={styles.pinCard as any}>
            <Text style={styles.pinLabel as any}>PIN :</Text>
            <View style={styles.pinDisplayContainer as any}>
              <Text style={styles.pinDisplay as any}>
                {showPin ? savedPin : '****'}
              </Text>
              <TouchableOpacity onPress={() => setShowPin(!showPin)}>
                <Ionicons
                  name={showPin ? "eye-off" : "eye"}
                  size={18}
                  color="#5A8F8A"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Description */}
        <Text style={styles.description as any}>
          Parental Lock - Allows parents or guardians to restrict access to
          settings and sensitive content. A passcode is required to make changes,
          ensuring a safe and controlled experience for children.
        </Text>
      </View>

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay as any}>
          <View style={styles.modalContent as any}>
            <Text style={styles.modalTitle as any}>
              {isVerifyingToDisable ? 'Enter PIN to disable' : 'Set a 4-digit PIN code'}
            </Text>
            
            <View style={styles.pinContainer as any}>
              {pin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={pinRefs[index]}
                  style={[styles.pinBox, digit && styles.pinBoxFilled] as any}
                  value={digit ? '•' : ''}
                  onChangeText={(value) => {
                    if (value.length > 0 && /^\d$/.test(value)) {
                      // Clear error when user starts typing
                      setPinError('');
                      // If a number is entered, store it and move to next
                      const newPin = [...pin];
                      newPin[index] = value;
                      setPin(newPin);
                      
                      // Auto-focus next input
                      if (index < 3) {
                        pinRefs[index + 1].current?.focus();
                      }
                    } else if (value === '') {
                      // Handle deletion
                      const newPin = [...pin];
                      newPin[index] = '';
                      setPin(newPin);
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace') {
                      if (pin[index] === '' && index > 0) {
                        // If current field is empty and backspace, go to previous field
                        pinRefs[index - 1].current?.focus();
                      } else {
                        // Clear current field
                        const newPin = [...pin];
                        newPin[index] = '';
                        setPin(newPin);
                      }
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus={true}
                />
              ))}
            </View>

            {/* Error Message */}
            {pinError ? (
              <Text style={styles.errorText as any}>{pinError}</Text>
            ) : null}

            <TouchableOpacity style={styles.savePinButton as any} onPress={savePinAndEnable}>
              <Text style={styles.savePinText as any}>
                {isVerifyingToDisable ? 'Verify PIN' : 'Save Pin'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton as any} onPress={cancelPin}>
              <Text style={styles.cancelText as any}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 30,
  },
  backButtonText: {
    fontSize: 18,
    color: "#276a63",
    fontWeight: "600",
    fontFamily: "ITIM",
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
  },
  switch: {
    transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
  },
  description: {
    fontSize: 13,
    fontWeight: "400",
    fontFamily: "ITIM",
    color: "#4A5568",
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: 35,
    margin: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
    gap: 15,
  },
  pinBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#D1D1D6",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  pinBoxFilled: {
    backgroundColor: "#D1D1D6",
  },
  savePinButton: {
    backgroundColor: "#5A8F8A",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 25,
    marginBottom: 15,
    width: "90%",
  },
  savePinText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "#7DDDD3",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 25,
    width: "90%",
  },
  cancelText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
  },
  pinCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
  },
  pinDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pinDisplay: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
    letterSpacing: 2,
  },
  eyeIcon: {
    fontSize: 16,
    color: "#5A8F8A",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "ITIM",
    textAlign: "center",
    marginBottom: 15,
  },
});
