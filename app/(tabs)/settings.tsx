import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { supabase } from "../../src/supabaseClient";

export default function Settings() {
  const router = useRouter();
  const [childNickname, setChildNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("••••••••");
  const [loading, setLoading] = useState(true);
  const [showParentalLockModal, setShowParentalLockModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(ParentalLockAuthService.isTabAuthenticated('settings'));
  const [pin, setPin] = useState(['', '', '', '']);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  // Check parental lock on component mount and when focused
  useEffect(() => {
    checkParentalLock();
    
    // Listen to authentication changes
    const authListener = (isAuth: boolean) => {
      setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('settings'));
    };
    
    ParentalLockAuthService.addListener(authListener);
    
    return () => {
      ParentalLockAuthService.removeListener(authListener);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Update authentication state and check parental lock when focusing on this tab
      setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('settings'));
      checkParentalLock();
    }, [])
  );

  const checkParentalLock = async () => {
    const isEnabled = await ParentalLockService.isEnabled();
    const isTabAuth = ParentalLockAuthService.isTabAuthenticated('settings');
    if (isEnabled && !isTabAuth) {
      setShowParentalLockModal(true);
      return;
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        const meta = (user.user_metadata ?? {}) as any;
        setChildNickname(meta?.child_name ?? "");
        // For security, we can't retrieve the actual password from Supabase
        // So we show a masked version - user can change it if needed
        setPassword("••••••••");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === '' && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const unlockAccess = async () => {
    if (pin.every(digit => digit !== '')) {
      const inputPin = pin.join('');
      const isValid = await ParentalLockService.verifyPin(inputPin);
      
      if (isValid) {
        ParentalLockAuthService.setAuthenticated(true, 'settings');
        setShowParentalLockModal(false);
        setPin(['', '', '', '']);
      } else {
        Alert.alert("Incorrect PIN", "Please try again.");
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } else {
      Alert.alert("Incomplete PIN", "Please enter all 4 digits.");
    }
  };

  const cancelAccess = () => {
    setPin(['', '', '', '']);
    router.replace("/(tabs)/home");
  };

  const startEditingNickname = () => {
    setTempNickname(childNickname);
    setIsEditingNickname(true);
  };

  const saveNickname = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { child_name: tempNickname }
      });
      
      if (error) throw error;
      
      setChildNickname(tempNickname);
      setIsEditingNickname(false);
    } catch (error) {
      console.error("Error updating nickname:", error);
      Alert.alert("Error", "Failed to update nickname. Please try again.");
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in both password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Clear parental lock authentication after password change
      ParentalLockAuthService.setAuthenticated(false);
      
      Alert.alert("Success", "Password updated successfully!");
      setShowChangePasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password");
    }
  };

  const handleCancelPasswordChange = () => {
    setShowChangePasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogout = async () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleParentalLock = () => {
    router.push("/parental-lock");
  };

  const handleInstruction = () => {
    Alert.alert("Instruction", "App instructions will be shown here");
  };

  const handleTermsAndConditions = () => {
    Alert.alert(
      "Terms and Conditions",
      "Terms and Conditions content will be shown here"
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert("Privacy Policy", "Privacy Policy content will be shown here");
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/ritmoNameLogo.png")}
          style={styles.brandLogo}
        />
      </View>

      <View style={styles.contentView}>
        {/* Child Nickname */}
        <View style={styles.inputContainer}>
          <View style={styles.row}>
            <Text style={styles.labelInline}>Child Nickname:</Text>
            <View style={styles.valueContainer}>
              {isEditingNickname ? (
                <>
                  <TextInput
                    style={styles.directEditInput}
                    value={tempNickname}
                    onChangeText={setTempNickname}
                    onBlur={saveNickname}
                    onSubmitEditing={saveNickname}
                    autoFocus
                    maxLength={50}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.editButton} onPress={() => setIsEditingNickname(false)}>
                    <Ionicons name="pencil" size={20} color="#666" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text 
                    style={styles.valueText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {childNickname || "—"}
                  </Text>
                  <TouchableOpacity style={styles.editButton} onPress={startEditingNickname}>
                    <Ionicons name="pencil" size={20} color="#666" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <View style={styles.row}>
            <Text style={styles.labelInline}>Email:</Text>
            <View style={styles.valueContainer}>
              <Text 
                style={styles.valueText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {email || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Password */}
        <TouchableOpacity style={styles.inputContainer} onPress={handleChangePassword}>
          <View style={styles.row}>
            <Text style={styles.labelInline}>Password:</Text>
            <View style={styles.valueContainer}>
              <Text 
                style={styles.valueText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {password}
              </Text>
              <TouchableOpacity style={styles.editButton} onPress={handleChangePassword}>
                <Ionicons name="pencil" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Parental Lock */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleParentalLock}
        >
          <Text style={styles.menuButtonText}>Parental Lock</Text>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>

        {/* Instruction */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleInstruction}
        >
          <Text style={styles.menuButtonText}>Instruction</Text>
        </TouchableOpacity>

        {/* Terms and Conditions */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleTermsAndConditions}
        >
          <Text style={styles.menuButtonText}>Terms and Conditions</Text>
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handlePrivacyPolicy}
        >
          <Text style={styles.menuButtonText}>Privacy Policy</Text>
        </TouchableOpacity>

        {/* Log out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Parental Lock Modal */}
      <Modal
        visible={showParentalLockModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <ImageBackground
            source={require("../../assets/background.png")}
            style={styles.modalBackground}
            resizeMode="cover"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.lockIconContainer}>
                  <Ionicons name="lock-closed" size={48} color="#4A5568" />
                </View>
                
                <Text style={styles.modalTitle}>Parental Lock</Text>
                <Text style={styles.modalSubtitle}>
                  Access restricted to parents{'\n'}or guardians only
                </Text>

                <Text style={styles.modalContentTitle}>
                  Please enter your 4-digit PIN to continue
                </Text>
                
                <View style={styles.pinContainer}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinRefs[index]}
                      style={[
                        styles.pinBox,
                        digit ? styles.pinBoxFilled : null
                      ]}
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
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.forgotPin}>
                  <Text style={styles.forgotPinText}>Forgot PIN?</Text>
                </TouchableOpacity>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.unlockButton} onPress={unlockAccess}>
                    <Text style={styles.unlockText}>Unlock Access</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelButton} onPress={cancelAccess}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <ImageBackground
            source={require("../../assets/background.png")}
            style={styles.modalBackground}
          >
            <View style={styles.changePasswordContainer}>
              <View style={styles.changePasswordContent}>
                {/* Back Button */}
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={handleCancelPasswordChange}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                {/* Change Password Input */}
                <Text style={styles.changePasswordLabel}>Change Password:</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.changePasswordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter password here"
                    secureTextEntry={!showNewPassword}
                    maxLength={50}
                  />
                  <TouchableOpacity 
                    style={styles.changePasswordEyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons 
                      name={showNewPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <Text style={styles.changePasswordLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.changePasswordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re - Enter password here"
                    secureTextEntry={!showConfirmPassword}
                    maxLength={50}
                  />
                  <TouchableOpacity 
                    style={styles.changePasswordEyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Security Recommendation */}
                <Text style={styles.securityText}>
                  We recommend using a strong one with A-Z, a-z, 0-9, and special characters (!, @, #, etc.) for better security.
                </Text>

                {/* Save Button */}
                <TouchableOpacity 
                  style={styles.savePasswordButton}
                  onPress={handleSavePassword}
                >
                  <Text style={styles.savePasswordButtonText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  brandLogo: {
    width: 120,
    height: 30,
    resizeMode: "contain",
    marginLeft: -22,
    marginTop: -20,
  },
  contentView: {
    flex: 1,
    padding: 16,
    paddingTop: 16,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#CFF6EB",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  labelInline: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 4,
  },
  valueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueText: {
    fontSize: 16,
    color: "#264D47",
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  input: {
    fontSize: 15,
    color: "#333",
    paddingVertical: 4,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 4,
  },
  eyeButton: {
    padding: 4,
  },
  menuButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#CFF6EB",
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 0,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FF0000",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    width: "90%",
    maxWidth: 350,
  },
  lockIconContainer: {
    marginBottom: 20,
    opacity: 0.7,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    fontFamily: "ITIM",
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  modalContentTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#555",
    marginBottom: 25,
    textAlign: "center",
    lineHeight: 20,
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 25,
    gap: 12,
  },
  pinBox: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#F7F7F7",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    fontFamily: "ITIM",
  },
  pinBoxFilled: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  forgotPin: {
    marginBottom: 30,
  },
  forgotPinText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
    textDecorationLine: "underline",
    fontFamily: "ITIM",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  unlockButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  unlockText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "ITIM",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  // Edit nickname styles
  displayContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
  },
  editButton: {
    padding: 8,
    marginLeft: 16,
  },
  directEditInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  // Change Password Modal Styles
  changePasswordContainer: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  changePasswordContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 40,
    marginTop: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  changePasswordLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 20,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
  },
  changePasswordInput: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    paddingVertical: 2,
  },
  changePasswordEyeButton: {
    padding: 5,
    marginLeft: 10,
  },
  securityText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 40,
  },
  savePasswordButton: {
    backgroundColor: '#4A9B8E',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  savePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
