import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Alert,
    ImageBackground,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { ParentalLockService } from "../src/parentalLockService";
import { supabase } from "../src/supabaseClient";
import { createResponsiveStyles, useResponsiveDimensions } from "../src/utils/responsive";

const backgroundImage = require("../assets/background.png");

export default function ParentalLockNewPin() {
  const router = useRouter();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
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
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Please enter email and password to continue.");
      return;
    }

    try {
      // Get current logged-in user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        Alert.alert("Error", "Unable to verify current user. Please login again.");
        return;
      }

      // Check if entered email matches the current user's email
      if (email.toLowerCase().trim() !== user.email?.toLowerCase()) {
        Alert.alert("Invalid Credentials", "Email does not match your current account.");
        return;
      }

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });

      if (signInError) {
        Alert.alert("Invalid Credentials", "Incorrect password. Please try again.");
        return;
      }

      // Credentials are valid, show PIN modal
      setShowPinModal(true);
      
    } catch (error) {
      Alert.alert("Error", "Unable to verify credentials. Please try again.");
    }
  };

  const handleSavePin = async () => {
    if (newPin.every(digit => digit !== '')) {
      try {
        const newPinString = newPin.join('');
        // Save the new PIN to replace the existing one
        await ParentalLockService.savePin(newPinString);
        
        Alert.alert("Success", "New PIN has been saved successfully. The old PIN has been replaced.", [
          { text: "OK", onPress: () => {
            setShowPinModal(false);
            router.back();
          }},
        ]);
      } catch (error) {
        Alert.alert("Error", "Failed to save new PIN. Please try again.");
      }
    } else {
      Alert.alert("Incomplete PIN", "Please enter all 4 digits.");
    }
  };

  const handleCancelPin = () => {
    setShowPinModal(false);
    setNewPin(['', '', '', '']);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.bg} resizeMode="cover">
      <View style={styles.container}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>New Pin Setup</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email here"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password here"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#276a63" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.note}>To set a new PIN, please verify your login{'\n'}credentials first</Text>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

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
    marginBottom: scale.scaleSpacing(40),
    textAlign: "center",
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
  note: {
    fontSize: scale.scaleFont(12),
    color: "#666",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(30),
    lineHeight: scale.scaleFont(16),
    fontFamily: "ITIM",
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
}));