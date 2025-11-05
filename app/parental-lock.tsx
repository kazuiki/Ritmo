import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ImageBackground,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const backgroundImage = require("../assets/background.png");

export default function ParentalLock() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [savedPin, setSavedPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const toggleSwitch = () => {
    if (!isEnabled) {
      // If turning ON, show PIN modal
      setShowPinModal(true);
    } else {
      // If turning OFF, just disable
      setIsEnabled(false);
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

  const savePinAndEnable = () => {
    // Check if all PIN digits are filled
    if (pin.every(digit => digit !== '')) {
      setSavedPin(pin.join('')); // Save the PIN
      setIsEnabled(true);
      setShowPinModal(false);
      setPin(['', '', '', '']); // Reset PIN input
    }
  };

  const cancelPin = () => {
    setShowPinModal(false);
    setPin(['', '', '', '']); // Reset PIN
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/settings")}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Parental Lock Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Parental Lock</Text>
          <Switch
            trackColor={{ false: "#FF6B6B", true: "#4CAF50" }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#FF6B6B"
            onValueChange={toggleSwitch}
            value={isEnabled}
            style={styles.switch}
          />
        </View>

        {/* PIN Display Card - Only show when PIN is set and parental lock is enabled */}
        {savedPin && isEnabled && (
          <View style={styles.pinCard}>
            <Text style={styles.pinLabel}>PIN :</Text>
            <View style={styles.pinDisplayContainer}>
              <Text style={styles.pinDisplay}>
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
        <Text style={styles.description}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set a 4-digit PIN code</Text>
            
            <View style={styles.pinContainer}>
              {pin.map((digit, index) => (
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

            <TouchableOpacity style={styles.savePinButton} onPress={savePinAndEnable}>
              <Text style={styles.savePinText}>Save Pin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={cancelPin}>
              <Text style={styles.cancelText}>Cancel</Text>
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
});
