import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ParentalLockService } from "../src/parentalLockService";
const backgroundImage = require("../assets/background.png");

export default function ParentalLockVerify() {
  const router = useRouter();
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

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

  const unlockAccess = async () => {
    if (pin.every(digit => digit !== '')) {
      const inputPin = pin.join('');
      const isValid = await ParentalLockService.verifyPin(inputPin);
      
      if (isValid) {
        // PIN is correct, go back to the previous screen
        router.back();
      } else {
        // PIN is incorrect, show alert and reset
        Alert.alert("Incorrect PIN", "Please try again.");
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } else {
      Alert.alert("Incomplete PIN", "Please enter all 4 digits.");
    }
  };

  const cancelAccess = () => {
    // Go back to home tab when cancelled
    router.replace("/(tabs)/home");
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Parental Lock</Text>
        <Text style={styles.subtitle}>
          Access restricted to parents{'\n'}or guardians only
        </Text>

        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Access restricted to parents{'\n'}or guardians only
          </Text>
          
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
                secureTextEntry={true}
                selectTextOnFocus={true}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.forgotPin}>
            <Text style={styles.forgotPinText}>Forgot PIN?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.unlockButton} onPress={unlockAccess}>
            <Text style={styles.unlockText}>Unlock Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={cancelAccess}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    fontFamily: "ITIM",
    color: "#4A5568",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: "90%",
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
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
  forgotPin: {
    marginBottom: 30,
  },
  forgotPinText: {
    fontSize: 14,
    fontWeight: "400",
    fontFamily: "ITIM",
    color: "#5A8F8A",
    textDecorationLine: "underline",
  },
  unlockButton: {
    backgroundColor: "#5A8F8A",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 25,
    marginBottom: 15,
    width: "90%",
  },
  unlockText: {
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
});