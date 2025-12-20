import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts
} from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { supabase } from "../../src/supabaseClient";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const [childNickname, setChildNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("********");
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
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  
  // Password error modals
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<"error" | "pencil">("error"); // "error" for Error.png, "pencil" for Pencil.png
  
  // Password success modal
  const [passwordSuccessVisible, setPasswordSuccessVisible] = useState(false);
  
  // Terms & Conditions modal
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  
  // Privacy Policy modal
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  
  // Instruction modal
  const [instructionModalVisible, setInstructionModalVisible] = useState(false);
  const [instructionCurrentPage, setInstructionCurrentPage] = useState(0);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  
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
      // CLEANUP: Dismiss all modals on unmount to prevent delayed pop-ups
      setLogoutConfirmVisible(false);
      setErrorModalVisible(false);
      setPasswordSuccessVisible(false);
      setShowChangePasswordModal(false);
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
        setPassword("********");
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
      setErrorType("pencil");
      setErrorMessage("Please fill in both password fields");
      setErrorModalVisible(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorType("error");
      setErrorMessage("Passwords do not match");
      setErrorModalVisible(true);
      return;
    }

    if (newPassword.length < 6) {
      setErrorType("error");
      setErrorMessage("Password must be at least 6 characters long");
      setErrorModalVisible(true);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Clear parental lock authentication after password change
      ParentalLockAuthService.setAuthenticated(false);
      
      // Show success modal
      setShowChangePasswordModal(false);
      setPasswordSuccessVisible(true);
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      // Check if error is about new password being same as old password
      if ((error as any).message && (error as any).message.toLowerCase().includes("same")) {
        setErrorType("error");
        setErrorMessage("New password should be different from the old password");
        setErrorModalVisible(true);
      } else {
        setErrorType("error");
        setErrorMessage(error.message || "Failed to update password");
        setErrorModalVisible(true);
      }
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
    setLogoutConfirmVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutConfirmVisible(false);
    await supabase.auth.signOut();
  };

  const handleParentalLock = () => {
    router.push("/parental-lock");
  };

  const handleInstruction = () => {
    setInstructionModalVisible(true);
    setInstructionCurrentPage(0);
  };

  const handleTermsAndConditions = () => {
    setTermsModalVisible(true);
  };

  const handleAcceptTerms = () => {
    setTermsModalVisible(false);
  };

  const handleDeclineTerms = () => {
    setTermsModalVisible(false);
  };

  const handlePrivacyPolicy = () => {
    setPrivacyModalVisible(true);
    setExpandedSections([]);
  };

  const toggleSection = (sectionNumber: number) => {
    setExpandedSections(prev => 
      prev.includes(sectionNumber) 
        ? [] // Close if already open
        : [sectionNumber] // Open this one and close all others
    );
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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentView,
          { paddingBottom: tabBarHeight + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                    <Ionicons name="pencil" size={16} color="#666" />
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
                    <Ionicons name="pencil" size={16} color="#666" />
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
                <Ionicons name="pencil" size={16} color="#666" />
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
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>

        {/* Terms and Conditions */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleTermsAndConditions}
        >
          <Text style={styles.menuButtonText}>Terms and Conditions</Text>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handlePrivacyPolicy}
        >
          <Text style={styles.menuButtonText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>

        {/* Log out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Parental Lock Modal */}
      <Modal
        visible={showParentalLockModal}
        transparent={true}
        animationType="none"
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

                <TouchableOpacity 
                  style={styles.forgotPin}
                  onPress={() => {
                    router.push('/parental-lock-new-pin');
                  }}
                >
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

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutConfirmVisible}
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalContainer}>
            <View style={styles.logoutIconCircle}>
              <Image
                source={require("../../assets/images/Error.png")}
                style={styles.logoutIcon}
              />
            </View>
            
            <Text style={styles.logoutModalTitle}>Logout?</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout?
            </Text>
            
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={styles.logoutCancelButton}
                onPress={() => setLogoutConfirmVisible(false)}
              >
                <Text style={styles.logoutCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.logoutConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.logoutConfirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Error Modal */}
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
                source={
                  errorType === "pencil"
                    ? require("../../assets/images/Pencil.png")
                    : require("../../assets/images/Error.png")
                }
                style={styles.errorIcon}
              />
            </View>
            
            <Text style={styles.errorModalTitle}>Error{errorType === "pencil" ? "!" : ""}</Text>
            <Text style={styles.errorModalMessage}>{errorMessage}</Text>
            
            <TouchableOpacity
              style={styles.errorOkButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.errorOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={passwordSuccessVisible}
        onRequestClose={() => setPasswordSuccessVisible(false)}
      >
        <View style={styles.successPasswordModalOverlay}>
          <View style={styles.successPasswordModalContainer}>
            <View style={styles.successPasswordIconCircle}>
              <Image
                source={require("../../assets/images/Checkmark.png")}
                style={styles.successPasswordIcon}
              />
            </View>
            
            <Text style={styles.successPasswordModalTitle}>Success!</Text>
            <Text style={styles.successPasswordModalMessage}>
              Password updated successfully!
            </Text>
            
            <TouchableOpacity
              style={styles.successPasswordOkButton}
              onPress={() => setPasswordSuccessVisible(false)}
            >
              <Text style={styles.successPasswordOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={termsModalVisible}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalContainer}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.termsBackButton}
              onPress={() => setTermsModalVisible(false)}
            >
              <Text style={styles.termsBackButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.termsScrollView}
              contentContainerStyle={styles.termsScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.termsTitle}>Terms & Conditions</Text>
              <Text style={styles.termsSubtitle}>Last updated on November 2025</Text>

              <Text style={styles.termsText}>
                Welcome to Ritmo. These Terms and Conditions ("Terms") govern your access to and use of the Ritmo mobile application ("App"), operated for the purpose of supporting children with Autism Spectrum Disorder (ASD) in completing daily routines with independence, structure, and consistency.
              </Text>
              
              <Text style={styles.termsText}>
                By downloading, installing, or using Ritmo, you agree to be bound by these Terms. If you do not agree, please stop using the App immediately.
              </Text>

              <Text style={styles.termsSectionTitle}>1. Purpose of the App</Text>
              <Text style={styles.termsText}>Ritmo is designed to:</Text>
              <Text style={styles.termsBullet}>• Provide visual, auditory, and structured routine guides for children with Level 2 Autism.</Text>
              <Text style={styles.termsBullet}>• Support parents, teachers, and guardians in managing, customizing, and monitoring daily routines.</Text>
              <Text style={styles.termsBullet}>• Promote independence, reduce anxiety, and create predictable daily structures for children.</Text>
              <Text style={styles.termsText}>Ritmo is an assistive tool, not a medical, therapeutic, or diagnostic service.</Text>

              <Text style={styles.termsSectionTitle}>2. User Eligibility</Text>
              <Text style={styles.termsText}>Ritmo is intended for:</Text>
              <Text style={styles.termsBullet}>• Parents/Guardian who manage the child's routines and monitor progress.</Text>
              <Text style={styles.termsBullet}>• Children who follow the visual and auditory guides provided in the App.</Text>
              <Text style={styles.termsText}>Parents/Guardian are responsible for:</Text>
              <Text style={styles.termsBullet}>• Creating and managing the child's account and routine settings.</Text>
              <Text style={styles.termsBullet}>• Ensuring the accuracy and appropriateness of tasks added to the system.</Text>
              <Text style={styles.termsBullet}>• Supervising the child while using the App when necessary.</Text>

              <Text style={styles.termsSectionTitle}>3. Account Registration</Text>
              <Text style={styles.termsText}>When creating an account:</Text>
              <Text style={styles.termsBullet}>• You agree to provide accurate and complete information.</Text>
              <Text style={styles.termsBullet}>• You are responsible for keeping your login details secure.</Text>
              <Text style={styles.termsBullet}>• You must notify Ritmo immediately if you suspect unauthorized access.</Text>
              <Text style={styles.termsText}>Ritmo may suspend or terminate accounts that violate these Terms.</Text>

              <Text style={styles.termsSectionTitle}>4. App Features and Use</Text>
              <Text style={styles.termsText}>By using the App, you acknowledge and agree to the following features:</Text>
              
              <Text style={styles.termsSubsectionTitle}>4.1 Routine Creation & Management</Text>
              <Text style={styles.termsBullet}>• Parents/Guardian can create personalized routines, tasks, and schedules based on the child's needs.</Text>
              <Text style={styles.termsBullet}>• You are fully responsible for ensuring tasks are safe, age-appropriate, and supportive.</Text>

              <Text style={styles.termsSubsectionTitle}>4.2 Visual and Auditory Guides</Text>
              <Text style={styles.termsBullet}>• Ritmo provides icons, images, simple instructions, audio cues, and optional instructional videos. These guides are for educational and supportive purposes only.</Text>

              <Text style={styles.termsSubsectionTitle}>4.3 Progress Tracking</Text>
              <Text style={styles.termsBullet}>• The App may record task completion, routine history, and user activity for monitoring progress.</Text>
              <Text style={styles.termsBullet}>• This data is accessible only to the authorized Parents/Guardian.</Text>

              <Text style={styles.termsSubsectionTitle}>4.4 Positive Reinforcement System</Text>
              <Text style={styles.termsBullet}>• The App uses stars, badges, points, and other motivating elements to support routine completion.</Text>
              <Text style={styles.termsBullet}>• These rewards are digital and have no real-world monetary value.</Text>

              <Text style={styles.termsSubsectionTitle}>4.5 Accessibility Design</Text>
              <Text style={styles.termsText}>Ritmo is designed with autism-friendly features including:</Text>
              <Text style={styles.termsBullet}>• Low-stimulus colors</Text>
              <Text style={styles.termsBullet}>• Clear icons</Text>
              <Text style={styles.termsBullet}>• Minimal text</Text>
              <Text style={styles.termsBullet}>• Smooth, simple navigation</Text>
              <Text style={styles.termsText}>However, Ritmo does not guarantee that all features will be suitable for every child.</Text>

              <Text style={styles.termsSectionTitle}>5. Acceptable Use of the App</Text>
              <Text style={styles.termsText}>By using Ritmo, you agree that you will NOT:</Text>
              <Text style={styles.termsBullet}>• Misuse, reverse-engineer, or modify any App function.</Text>
              <Text style={styles.termsBullet}>• Use the App for purposes other than assisting routine management.</Text>
              <Text style={styles.termsBullet}>• Upload unlawful, harmful, or inappropriate content.</Text>
              <Text style={styles.termsBullet}>• Attempt to access data you are not authorized to view.</Text>
              <Text style={styles.termsText}>Violations may result in account suspension or permanent removal.</Text>

              <Text style={styles.termsSectionTitle}>6. Data Privacy and Security</Text>
              <Text style={styles.termsText}>Ritmo values privacy, especially since it supports children. By using the App, you agree to the following:</Text>
              
              <Text style={styles.termsSubsectionTitle}>6.1 Information We Collect</Text>
              <Text style={styles.termsText}>Ritmo may collect:</Text>
              <Text style={styles.termsBullet}>• Parents/Guardian account information (name, email)</Text>
              <Text style={styles.termsBullet}>• Child routine data (tasks, progress, schedules)</Text>
              <Text style={styles.termsBullet}>• App usage analytics (for improvement purposes)</Text>
              <Text style={styles.termsText}>Ritmo does not sell or share personal information with third parties for marketing.</Text>

              <Text style={styles.termsSubsectionTitle}>6.2 How Data Is Used</Text>
              <Text style={styles.termsText}>Data is used to:</Text>
              <Text style={styles.termsBullet}>• Provide personalized routines and progress tracking</Text>
              <Text style={styles.termsBullet}>• Improve App performance and accessibility</Text>
              <Text style={styles.termsBullet}>• Ensure account security</Text>

              <Text style={styles.termsSubsectionTitle}>6.3 Storage and Security</Text>
              <Text style={styles.termsText}>Ritmo uses secure systems to store routine and user information. However, no app can guarantee 100% security. Parents/Guardian must protect their own login information.</Text>

              <Text style={styles.termsSectionTitle}>7. No Medical or Therapeutic Claims</Text>
              <Text style={styles.termsText}>Ritmo:</Text>
              <Text style={styles.termsBullet}>• It is not a substitute for professional therapy, diagnosis, or medical intervention.</Text>
              <Text style={styles.termsBullet}>• Does not guarantee improvements in behavior, skills, or development.</Text>
              <Text style={styles.termsBullet}>• Should be used as a support tool alongside caregiver guidance and professional advice.</Text>
              <Text style={styles.termsText}>Consult professionals for clinical or behavioral concerns.</Text>

              <Text style={styles.termsSectionTitle}>8. App Updates and Changes</Text>
              <Text style={styles.termsText}>Ritmo may update features, fix bugs, or change functionality at any time. Some updates may be required to continue using the App. Ritmo is not responsible for interruptions caused by updates or maintenance.</Text>

              <Text style={styles.termsSectionTitle}>9. Limitation of Liability</Text>
              <Text style={styles.termsText}>To the fullest extent allowed by law, Ritmo is not liable for:</Text>
              <Text style={styles.termsBullet}>• Improper use of the App</Text>
              <Text style={styles.termsBullet}>• Errors caused by user-submitted tasks or routines</Text>
              <Text style={styles.termsBullet}>• Damages resulting from device malfunction or internet issues</Text>
              <Text style={styles.termsBullet}>• Behavioral outcomes that may arise from routine changes</Text>
              <Text style={styles.termsText}>Parents/Guardian remain fully responsible for supervising the child and ensuring safety during real-life tasks.</Text>

              <Text style={styles.termsSectionTitle}>10. Termination of Use</Text>
              <Text style={styles.termsText}>Ritmo reserves the right to:</Text>
              <Text style={styles.termsBullet}>• Suspend or delete accounts that violate these Terms</Text>
              <Text style={styles.termsBullet}>• Discontinue certain features or the entire App</Text>
              <Text style={styles.termsBullet}>• Restrict access if misuse is suspected</Text>
              <Text style={styles.termsText}>Users may stop using the App at any time by uninstalling it.</Text>

              <Text style={styles.termsSectionTitle}>11. Intellectual Property</Text>
              <Text style={styles.termsText}>All content in Ritmo including icons, visuals, text, videos, and system design is owned by the App developers. Users may not copy, reproduce, modify, or distribute content without permission.</Text>

              <Text style={styles.termsSectionTitle}>12. Contact Information</Text>
              <Text style={styles.termsText}>For questions, support, or feedback, you can reach us at:</Text>
              <Text style={styles.termsBullet}>• Email:</Text>
              <Text style={styles.termsBullet}>• Website:</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalContainer}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.termsBackButton}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.termsBackButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.termsScrollView}
              contentContainerStyle={styles.termsScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.termsTitle}>Privacy Policy</Text>
              <Text style={styles.termsSubtitle}>Last Updated: November 2025</Text>

              <Text style={styles.termsText}>
                Ritmo we designed to support children, parents, and caregivers in managing daily routines through visual schedules and guided activities. We value your trust and are committed to protecting your privacy. This Privacy Policy explains what information we collect, how it is used, and the choices you have regarding your data.
              </Text>

              {/* Section 1 - Information We Collect */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(1)}
              >
                <Text style={styles.privacyAccordionTitle}>1. Information We Collect</Text>
                <Ionicons 
                  name={expandedSections.includes(1) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(1) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.privacySubsectionTitle}>1.1 Personal Information</Text>
                  <Text style={styles.termsText}>
                    Ritmo does not require users to create an account. However, the app may collect basic information provided by parents or caregivers, including:
                  </Text>
                  <Text style={styles.termsBullet}>• Child's nickname or first name</Text>
                  <Text style={styles.termsBullet}>• Routine preferences (e.g., scheduled tasks)</Text>
                  <Text style={styles.termsText}>
                    No sensitive personal data (e.g., exact location, medical history, contact details) is required.
                  </Text>

                  <Text style={styles.privacySubsectionTitle}>1.2 Usage Data</Text>
                  <Text style={styles.termsText}>To improve the app, we may collect anonymous usage information such as:</Text>
                  <Text style={styles.termsBullet}>• Features used</Text>
                  <Text style={styles.termsBullet}>• Task completion frequency</Text>
                  <Text style={styles.termsBullet}>• App performance and error reports</Text>
                  <Text style={styles.termsText}>This data does not identify the child or user.</Text>

                  <Text style={styles.privacySubsectionTitle}>1.3 Media Files (Optional)</Text>
                  <Text style={styles.termsText}>
                    If parents upload custom images or videos for routines, these remain stored locally on the device unless cloud backup is enabled by the user.
                  </Text>

                  <Text style={styles.privacySubsectionTitle}>1.4 Device Information</Text>
                  <Text style={styles.termsText}>The app may collect basic device data such as:</Text>
                  <Text style={styles.termsBullet}>• Device model</Text>
                  <Text style={styles.termsBullet}>• Operating system version</Text>
                  <Text style={styles.termsBullet}>• App version</Text>
                  <Text style={styles.termsText}>This helps us ensure compatibility and fix technical issues.</Text>
                </View>
              )}

              {/* Section 2 - How We Use Your Information */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(2)}
              >
                <Text style={styles.privacyAccordionTitle}>2. How We Use Your Information</Text>
                <Ionicons 
                  name={expandedSections.includes(2) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(2) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsText}>We use the collected information to:</Text>
                  <Text style={styles.termsBullet}>• Customize tasks and routines for the child</Text>
                  <Text style={styles.termsBullet}>• Improve the app's functionality and performance</Text>
                  <Text style={styles.termsBullet}>• Provide a personalized experience for learning and independence</Text>
                  <Text style={styles.termsBullet}>• Ensure stability and security of the app</Text>
                  <Text style={styles.termsText}>We do not sell, rent, or share your information with advertisers.</Text>
                </View>
              )}

              {/* Section 3 - Data Storage and Security */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(3)}
              >
                <Text style={styles.privacyAccordionTitle}>3. Data Storage and Security</Text>
                <Ionicons 
                  name={expandedSections.includes(3) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(3) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsBullet}>• All routine-related data is stored locally on the user's device unless cloud services are enabled.</Text>
                  <Text style={styles.termsBullet}>• We use standard security practices to protect information from unauthorized access.</Text>
                  <Text style={styles.termsBullet}>• Parents maintain full control over the child's information.</Text>
                </View>
              )}

              {/* Section 4 - Data Sharing */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(4)}
              >
                <Text style={styles.privacyAccordionTitle}>4. Data Sharing</Text>
                <Ionicons 
                  name={expandedSections.includes(4) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(4) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsText}>We do not share your personal information with third parties except:</Text>
                  <Text style={styles.termsBullet}>• When required by law</Text>
                  <Text style={styles.termsBullet}>• When necessary to maintain the app (e.g., error or crash reporting tools)</Text>
                  <Text style={styles.termsText}>These tools collect anonymous diagnostic data only.</Text>
                </View>
              )}

              {/* Section 5 - Children's Privacy */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(5)}
              >
                <Text style={styles.privacyAccordionTitle}>5. Children's Privacy</Text>
                <Ionicons 
                  name={expandedSections.includes(5) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(5) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsText}>
                    Ritmo is designed specifically for children, but all account setup and data entry are intended to be done by a parent or guardian.
                  </Text>
                  <Text style={styles.termsText}>We comply with child protection best practices:</Text>
                  <Text style={styles.termsBullet}>• No advertising</Text>
                  <Text style={styles.termsBullet}>• No social media links</Text>
                  <Text style={styles.termsBullet}>• No collection of sensitive identifying information</Text>
                  <Text style={styles.termsText}>Parents may delete the child's data at any time.</Text>
                </View>
              )}

              {/* Section 6 - Your Rights and Choices */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(6)}
              >
                <Text style={styles.privacyAccordionTitle}>6. Your Rights and Choices</Text>
                <Ionicons 
                  name={expandedSections.includes(6) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(6) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsText}>Parents and guardians may:</Text>
                  <Text style={styles.termsBullet}>• Edit or delete any information in the app</Text>
                  <Text style={styles.termsBullet}>• Disable data collection features</Text>
                  <Text style={styles.termsBullet}>• Request clarification about how information is handled</Text>
                  <Text style={styles.termsText}>
                    If you want to delete all stored data, you may uninstall the app or request additional support.
                  </Text>
                </View>
              )}

              {/* Section 7 - Changes to This Privacy Policy */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(7)}
              >
                <Text style={styles.privacyAccordionTitle}>7. Changes to This Privacy Policy</Text>
                <Ionicons 
                  name={expandedSections.includes(7) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(7) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsText}>
                    We may update this Privacy Policy from time to time. Any changes will be posted within the app. Continued use of the app means you accept the updated policy.
                  </Text>
                </View>
              )}

              {/* Section 8 - Contact Us */}
              <TouchableOpacity 
                style={styles.privacyAccordionHeader}
                onPress={() => toggleSection(8)}
              >
                <Text style={styles.privacyAccordionTitle}>8. Contact Us</Text>
                <Ionicons 
                  name={expandedSections.includes(8) ? "remove" : "add"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
              {expandedSections.includes(8) && (
                <View style={styles.privacyAccordionContent}>
                  <Text style={styles.termsText}>
                    If you have questions or concerns about this Privacy Policy, you may contact us at:
                  </Text>
                  <Text style={styles.termsBullet}>• Email:</Text>
                  <Text style={styles.termsBullet}>• Developer:</Text>
                </View>
              )}

              {/* Bottom spacing */}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Instruction Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={instructionModalVisible}
        onRequestClose={() => setInstructionModalVisible(false)}
      >
        <View style={styles.instructionModalOverlay}>
          <View style={styles.instructionModalContainer}>
            {/* Header with Back and Next */}
            <View style={styles.instructionHeader}>
              <TouchableOpacity 
                style={styles.instructionHeaderButton} 
                onPress={() => {
                  if (instructionCurrentPage > 0) {
                    setInstructionCurrentPage(instructionCurrentPage - 1);
                  } else {
                    setInstructionModalVisible(false);
                  }
                }}
              >
                <Text style={styles.instructionHeaderButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.instructionHeaderButton}
                onPress={() => {
                  if (instructionCurrentPage < 4) {
                    setInstructionCurrentPage(instructionCurrentPage + 1);
                  } else {
                    setInstructionModalVisible(false);
                  }
                }}
              >
                <Text style={styles.instructionHeaderButtonText}>
                  {instructionCurrentPage === 4 ? 'Done' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Page Content */}
            <View style={styles.instructionPageContainer}>
              {/* Page 1: Ritmo for Autism */}
              {instructionCurrentPage === 0 && (
                <>
                  <View style={styles.instructionImageContainer}>
                    <Image
                      source={require("../../assets/ritmo-logo.png")}
                      style={styles.instructionMainImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.instructionTitle}>Ritmo for Autism</Text>
                  <Text style={styles.instructionDescription}>
                    Made to empower children of{'\n'}Autism Spectrum to develop{'\n'}their daily RITMO.
                  </Text>
                  <TouchableOpacity style={styles.instructionVideoButton} onPress={() => setVideoModalVisible(true)}>
                    <Image
                      source={require("../../assets/images/WhitePlay.png")}
                      style={styles.instructionPlayIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.instructionVideoButtonText}>What is Ritmo?</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Page 2: How Ritmo Works */}
              {instructionCurrentPage === 1 && (
                <>
                  <View style={styles.instructionImageContainer}>
                    <Image
                      source={require("../../assets/images/BoyQ.png")}
                      style={styles.instructionMainImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.instructionTitle}>How Ritmo Works</Text>
                  <Text style={styles.instructionDescription}>
                    Track your child daily and weekly{'\n'}routines to support progress.
                  </Text>
                  <TouchableOpacity style={styles.instructionVideoButton} onPress={() => setVideoModalVisible(true)}>
                    <Image
                      source={require("../../assets/images/WhitePlay.png")}
                      style={styles.instructionPlayIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.instructionVideoButtonText}>How Ritmo works?</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Page 3: Ritmo is Fun */}
              {instructionCurrentPage === 2 && (
                <>
                  <View style={styles.instructionImageContainer}>
                    <View style={styles.instructionMultiImageContainer}>
                      <Image
                        source={require("../../assets/images/Book.png")}
                        style={styles.instructionSmallImage}
                        resizeMode="contain"
                      />
                      <Image
                        source={require("../../assets/images/Game.png")}
                        style={styles.instructionSmallImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                  <Text style={styles.instructionTitle}>Ritmo is Fun</Text>
                  <Text style={styles.instructionDescription}>
                    Enhance child engagement with{'\n'}interactive games and audio-visual{'\n'}book guides.
                  </Text>
                  <TouchableOpacity style={styles.instructionVideoButton} onPress={() => setVideoModalVisible(true)}>
                    <Image
                      source={require("../../assets/images/WhitePlay.png")}
                      style={styles.instructionPlayIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.instructionVideoButtonText}>Ritmo is Fun</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Page 4: Ritmo with Parents */}
              {instructionCurrentPage === 3 && (
                <>
                  <View style={styles.instructionImageContainer}>
                    <Image
                      source={require("../../assets/images/Parents.png")}
                      style={styles.instructionMainImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.instructionTitle}>Ritmo with Parents</Text>
                  <Text style={styles.instructionDescription}>
                    Parents are advised to guide and{'\n'}supervise children when using Ritmo.
                  </Text>
                  <TouchableOpacity style={styles.instructionVideoButton} onPress={() => setVideoModalVisible(true)}>
                    <Image
                      source={require("../../assets/images/WhitePlay.png")}
                      style={styles.instructionPlayIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.instructionVideoButtonText}>Ritmo Parent</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Page 5: Ritmo with Therapist */}
              {instructionCurrentPage === 4 && (
                <>
                  <View style={styles.instructionImageContainer}>
                    <Image
                      source={require("../../assets/images/Therapist.png")}
                      style={styles.instructionMainImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.instructionTitle}>Ritmo with Therapist</Text>
                  <Text style={styles.instructionDescription}>
                    Ritmo provides therapists with{'\n'}PDF reports detailing the child's{'\n'}progress.
                  </Text>
                  <TouchableOpacity style={styles.instructionVideoButton} onPress={() => setVideoModalVisible(true)}>
                    <Image
                      source={require("../../assets/images/WhitePlay.png")}
                      style={styles.instructionPlayIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.instructionVideoButtonText}>Ritmo Therapist</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Pagination Dots */}
            <View style={styles.instructionPagination}>
              {[0, 1, 2, 3, 4].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.instructionDot,
                    instructionCurrentPage === index && styles.instructionDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalContainer}>
            <Text style={styles.videoModalText}>Video Coming Soon</Text>
            <TouchableOpacity
              style={styles.videoModalCloseButton}
              onPress={() => setVideoModalVisible(false)}
            >
              <Text style={styles.videoModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: scale.scaleSpacing(50),
    paddingHorizontal: scale.scaleSpacing(16),
  },
  brandLogo: {
    width: scale.scaleWidth(120),
    height: scale.scaleHeight(30),
    resizeMode: "contain",
    marginLeft: scale.scaleSpacing(-22),
    marginTop: scale.scaleSpacing(-20),
  },
  scrollView: {
    flex: 1,
  },
  contentView: {
    padding: scale.scaleSpacing(16),
    paddingTop: scale.scaleSpacing(16),
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(16),
    padding: scale.scaleSpacing(16),
    marginBottom: scale.scaleSpacing(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale.scaleSpacing(4),
    elevation: 3,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    minHeight: scale.scaleHeight(60),
  },
  label: {
    fontSize: scale.scaleFont(15),
    fontWeight: "600",
    color: "#333",
    marginBottom: scale.scaleSpacing(6),
  },
  labelInline: {
    fontSize: scale.scaleFont(15),
    fontWeight: "600",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: scale.scaleSpacing(4),
  },
  valueContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueText: {
    fontSize: scale.scaleFont(16),
    color: "#264D47",
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  input: {
    fontSize: scale.scaleFont(15),
    color: "#333",
    paddingVertical: scale.scaleSpacing(4),
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordInput: {
    flex: 1,
    fontSize: scale.scaleFont(15),
    color: "#333",
    paddingVertical: scale.scaleSpacing(4),
  },
  eyeButton: {
    padding: scale.scaleSpacing(4),
  },
  menuButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(16),
    padding: scale.scaleSpacing(16),
    marginBottom: scale.scaleSpacing(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale.scaleSpacing(4),
    elevation: 3,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    minHeight: scale.scaleHeight(60),
  },
  menuButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: scale.scaleBorderRadius(16),
    padding: scale.scaleSpacing(16),
    marginTop: scale.scaleSpacing(8),
    marginBottom: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.2,
    shadowRadius: scale.scaleSpacing(4),
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FF0000",
    minHeight: scale.scaleHeight(60),
  },
  logoutButtonText: {
    fontSize: scale.scaleFont(16),
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
    padding: scale.scaleSpacing(20),
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(35),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(8) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 12,
    width: "90%",
    maxWidth: scale.scaleWidth(350),
  },
  lockIconContainer: {
    marginBottom: scale.scaleSpacing(20),
    opacity: 0.7,
  },
  modalTitle: {
    fontSize: scale.scaleFont(28),
    fontWeight: "700",
    fontFamily: "ITIM",
    color: "#333",
    marginBottom: scale.scaleSpacing(8),
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: scale.scaleFont(16),
    fontWeight: "400",
    fontFamily: "ITIM",
    color: "#666",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(25),
    lineHeight: scale.scaleHeight(22),
  },
  modalContentTitle: {
    fontSize: scale.scaleFont(14),
    fontWeight: "600",
    fontFamily: "ITIM",
    color: "#555",
    marginBottom: scale.scaleSpacing(25),
    textAlign: "center",
    lineHeight: scale.scaleHeight(20),
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: scale.scaleSpacing(25),
    gap: scale.scaleSpacing(12),
  },
  pinBox: {
    width: scale.scaleWidth(55),
    height: scale.scaleHeight(55),
    borderRadius: scale.scaleBorderRadius(12),
    backgroundColor: "#F7F7F7",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    textAlign: "center",
    fontSize: scale.scaleFont(24),
    fontWeight: "600",
    color: "#333",
    fontFamily: "ITIM",
  },
  pinBoxFilled: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  forgotPin: {
    marginBottom: scale.scaleSpacing(30),
  },
  forgotPinText: {
    fontSize: scale.scaleFont(14),
    fontWeight: "500",
    color: "#007AFF",
    textDecorationLine: "underline",
    fontFamily: "ITIM",
  },
  buttonContainer: {
    width: "100%",
    gap: scale.scaleSpacing(12),
  },
  unlockButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(15),
    paddingHorizontal: scale.scaleSpacing(25),
    borderRadius: scale.scaleBorderRadius(25),
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 6,
  },
  unlockText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "ITIM",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(25),
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: scale.scaleFont(16),
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
    paddingVertical: scale.scaleSpacing(2),
    paddingHorizontal: scale.scaleSpacing(8),
    marginLeft: scale.scaleSpacing(8),
  },
  directEditInput: {
    flex: 1,
    fontSize: scale.scaleFont(16),
    color: '#333',
    backgroundColor: 'transparent',
    paddingVertical: scale.scaleSpacing(4),
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  // Change Password Modal Styles
  changePasswordContainer: {
    flex: 1,
    paddingTop: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(20),
  },
  changePasswordContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: scale.scaleSpacing(40),
    marginTop: scale.scaleSpacing(10),
  },
  backButtonText: {
    fontSize: scale.scaleFont(18),
    color: '#333',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  changePasswordLabel: {
    fontSize: scale.scaleFont(16),
    color: '#333',
    fontWeight: '500',
    marginBottom: scale.scaleSpacing(8),
    marginTop: scale.scaleSpacing(20),
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: scale.scaleBorderRadius(20),
    backgroundColor: '#fff',
    paddingHorizontal: scale.scaleSpacing(15),
    paddingVertical: scale.scaleSpacing(12),
    marginBottom: scale.scaleSpacing(20),
  },
  changePasswordInput: {
    flex: 1,
    fontSize: scale.scaleFont(14),
    color: '#999',
    paddingVertical: scale.scaleSpacing(2),
  },
  changePasswordEyeButton: {
    padding: scale.scaleSpacing(5),
    marginLeft: scale.scaleSpacing(10),
  },
  securityText: {
    fontSize: scale.scaleFont(14),
    color: '#333',
    textAlign: 'left',
    lineHeight: scale.scaleHeight(18),
    marginTop: scale.scaleSpacing(20),
    marginBottom: scale.scaleSpacing(40),
  },
  savePasswordButton: {
    backgroundColor: '#4A9B8E',
    borderRadius: scale.scaleBorderRadius(20),
    paddingVertical: scale.scaleSpacing(12),
    alignItems: 'center',
    marginHorizontal: scale.scaleSpacing(20),
  },
  savePasswordButtonText: {
    color: '#fff',
    fontSize: scale.scaleFont(16),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // Logout Confirmation Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(24),
    width: "80%",
    maxWidth: scale.scaleWidth(360),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFB3BA",
  },
  logoutIconCircle: {
    width: scale.scaleWidth(70),
    height: scale.scaleHeight(70),
    borderRadius: scale.scaleBorderRadius(35),
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(16),
  },
  logoutIcon: {
    width: scale.scaleWidth(40),
    height: scale.scaleHeight(40),
    resizeMode: "contain",
  },
  logoutModalTitle: {
    fontSize: scale.scaleFont(24),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "Fredoka_700Bold",
  },
  logoutModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: scale.scaleHeight(20),
    marginBottom: scale.scaleSpacing(20),
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: scale.scaleSpacing(8),
    flexWrap: "wrap",
  },
  logoutModalButtons: {
    flexDirection: "row",
    gap: scale.scaleSpacing(12),
    width: "100%",
  },
  logoutCancelButton: {
    flex: 1,
    backgroundColor: "#D3D3D3",
    paddingVertical: scale.scaleSpacing(12),
    borderRadius: scale.scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
  },
  logoutCancelButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  logoutConfirmButton: {
    flex: 1,
    backgroundColor: "#FF6B7A",
    paddingVertical: scale.scaleSpacing(12),
    borderRadius: scale.scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
  },
  logoutConfirmButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  
  // Password Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(24),
    width: "75%",
    maxWidth: scale.scaleWidth(340),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFB3BA",
  },
  errorIconCircle: {
    width: scale.scaleWidth(70),
    height: scale.scaleHeight(70),
    borderRadius: scale.scaleBorderRadius(35),
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(16),
  },
  errorIcon: {
    width: scale.scaleWidth(40),
    height: scale.scaleHeight(40),
    resizeMode: "contain",
  },
  errorModalTitle: {
    fontSize: scale.scaleFont(24),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "Fredoka_700Bold",
  },
  errorModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: scale.scaleHeight(20),
    marginBottom: scale.scaleSpacing(20),
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: scale.scaleSpacing(8),
    flexWrap: "wrap",
  },
  errorOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(50),
    borderRadius: scale.scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale.scaleWidth(120),
  },
  errorOkButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  
  // Password Success Modal Styles
  successPasswordModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successPasswordModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(24),
    width: "70%",
    maxWidth: scale.scaleWidth(320),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 8,
    borderWidth: 3,
    borderColor: "#9FD19E",
  },
  successPasswordIconCircle: {
    width: scale.scaleWidth(70),
    height: scale.scaleHeight(70),
    borderRadius: scale.scaleBorderRadius(35),
    backgroundColor: "#D4F1D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(16),
  },
  successPasswordIcon: {
    width: scale.scaleWidth(40),
    height: scale.scaleHeight(40),
    resizeMode: "contain",
  },
  successPasswordModalTitle: {
    fontSize: scale.scaleFont(24),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "Fredoka_700Bold",
  },
  successPasswordModalMessage: {
    fontSize: scale.scaleFont(14),
    color: "#4A4A4A",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(18),
    fontFamily: "Fredoka_400Regular",
    flexWrap: "wrap",
  },
  successPasswordOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
    minWidth: scale.scaleWidth(120),
  },
  successPasswordOkButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  // Terms & Conditions Modal
  termsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale.scaleSpacing(20),
  },
  termsModalContainer: {
    backgroundColor: "#F0F9F7",
    borderRadius: scale.scaleBorderRadius(24),
    width: "105%",
    height: "100%",
    borderWidth: 3,
    borderColor: "#61CCB2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 10,
  },
  termsBackButton: {
    position: "absolute",
    top: scale.scaleSpacing(5),
    left: scale.scaleSpacing(10),
    zIndex: 10,
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(4),
  },
  termsBackButtonText: {
    fontSize: scale.scaleFont(18),
    color: "#2A3B4D",
    fontWeight: "600",
    textDecorationLine: "underline",
    fontFamily: "Fredoka_600SemiBold",
  },
  termsScrollView: {
    flex: 1,
    marginTop: scale.scaleSpacing(50),
    paddingHorizontal: scale.scaleSpacing(20),
  },
  termsScrollContent: {
    paddingBottom: scale.scaleSpacing(5),
  },
  termsTitle: {
    fontSize: scale.scaleFont(32),
    fontWeight: "700",
    color: "#2A3B4D",
    textAlign: "left",
    marginBottom: scale.scaleSpacing(6),
    letterSpacing: 0.5,
    fontFamily: "Fredoka_700Bold",
  },
  termsSubtitle: {
    fontSize: scale.scaleFont(15),
    color: "#6B8E7E",
    textAlign: "left",
    marginBottom: scale.scaleSpacing(24),
    fontWeight: "500",
    fontFamily: "Fredoka_500Medium",
  },
  termsText: {
    fontSize: scale.scaleFont(15),
    color: "#2A3B4D",
    lineHeight: scale.scaleHeight(24),
    marginBottom: scale.scaleSpacing(14),
    textAlign: "justify",
    fontWeight: "400",
    fontFamily: "Fredoka_400Regular",
  },
  termsSectionTitle: {
    fontSize: scale.scaleFont(18),
    fontWeight: "700",
    color: "#2A3B4D",
    marginTop: scale.scaleSpacing(20),
    marginBottom: scale.scaleSpacing(10),
    textAlign: "left",
    letterSpacing: 0.3,
    fontFamily: "Fredoka_700Bold",
  },
  termsSubsectionTitle: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#2A3B4D",
    marginTop: scale.scaleSpacing(14),
    marginBottom: scale.scaleSpacing(8),
    textAlign: "left",
    fontFamily: "Fredoka_600SemiBold",
  },
  termsBullet: {
    fontSize: scale.scaleFont(15),
    color: "#2A3B4D",
    lineHeight: scale.scaleHeight(24),
    marginBottom: scale.scaleSpacing(8),
    marginLeft: scale.scaleSpacing(10),
    textAlign: "justify",
    fontFamily: "Fredoka_400Regular",
  },
  termsButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale.scaleSpacing(12),
    paddingTop: scale.scaleSpacing(20),
    paddingBottom: scale.scaleSpacing(10),
    marginTop: scale.scaleSpacing(-10),
  },
  termsDeclineButton: {
    flex: 1,
    backgroundColor: "#D3D3D3",
    borderRadius: scale.scaleBorderRadius(50),
    paddingVertical: scale.scaleSpacing(12),
    alignItems: "center",
    justifyContent: "center",
  },
  termsDeclineButtonText: {
    fontSize: scale.scaleFont(18),
    fontWeight: "700",
    color: "#666666",
    fontFamily: "Fredoka_700Bold",
  },
  termsAcceptButton: {
    flex: 1,
    backgroundColor: "#00A980",
    borderRadius: scale.scaleBorderRadius(50),
    paddingVertical: scale.scaleSpacing(12),
    alignItems: "center",
    justifyContent: "center",
  },
  termsAcceptButtonText: {
    fontSize: scale.scaleFont(18),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fredoka_700Bold",
  },
  // Privacy Policy Accordion Styles
  privacyAccordionHeader: {
    backgroundColor: "#C4DFE6",
    borderRadius: scale.scaleBorderRadius(12),
    paddingVertical: scale.scaleSpacing(16),
    paddingHorizontal: scale.scaleSpacing(20),
    marginBottom: scale.scaleSpacing(2),
    marginTop: scale.scaleSpacing(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale.scaleSpacing(4),
    elevation: 2,
  },
  privacyAccordionTitle: {
    fontSize: scale.scaleFont(17),
    fontWeight: "600",
    color: "#2A3B4D",
    flex: 1,
    fontFamily: "Fredoka_600SemiBold",
  },
  privacyAccordionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(12),
    padding: scale.scaleSpacing(16),
    marginBottom: scale.scaleSpacing(8),
    borderWidth: 1,
    borderColor: "#C4DFE6",
  },
  privacySubsectionTitle: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#2A3B4D",
    marginTop: scale.scaleSpacing(12),
    marginBottom: scale.scaleSpacing(8),
    textAlign: "left",
    fontFamily: "Fredoka_600SemiBold",
  },
  // Instruction Modal Styles
  instructionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  instructionModalContainer: {
    backgroundColor: "#F0F9F7",
    borderRadius: scale.scaleBorderRadius(24),
    width: "95%",
    height: "90%",
    borderWidth: 3,
    borderColor: "#61CCB2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 10,
    position: "relative",
  },
  instructionHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: scale.scaleSpacing(20),
    paddingHorizontal: 0,
    zIndex: 10,
  },
  instructionHeaderButton: {
    paddingHorizontal: scale.scaleSpacing(16),
    paddingVertical: scale.scaleSpacing(12),
  },
  instructionHeaderButtonText: {
    fontSize: scale.scaleFont(18),
    color: "#2A3B4D",
    fontFamily: "Fredoka_600SemiBold",
    textDecorationLine: "underline",
  },
  instructionPageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: scale.scaleSpacing(40),
    paddingTop: scale.scaleSpacing(100),
    paddingBottom: scale.scaleSpacing(120),
  },
  instructionImageContainer: {
    height: scale.scaleHeight(250),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  instructionMainImage: {
    width: scale.scaleWidth(250),
    height: scale.scaleHeight(250),
  },
  instructionMultiImageContainer: {
    flexDirection: "row",
    gap: scale.scaleSpacing(30),
    alignItems: "center",
  },
  instructionSmallImage: {
    width: scale.scaleWidth(130),
    height: scale.scaleHeight(150),
  },
  instructionTitle: {
    fontSize: scale.scaleFont(32),
    fontWeight: "700",
    color: "#2A3B4D",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(12),
    fontFamily: "Fredoka_700Bold",
  },
  instructionDescription: {
    fontSize: scale.scaleFont(17),
    color: "#2A3B4D",
    textAlign: "center",
    lineHeight: scale.scaleHeight(26),
    marginBottom: scale.scaleSpacing(35),
    fontFamily: "Fredoka_600SemiBold",
  },
  instructionVideoButton: {
    backgroundColor: "#00A980",
    borderRadius: scale.scaleBorderRadius(50),
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(24),
    flexDirection: "row",
    alignItems: "center",
    gap: scale.scaleSpacing(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 6,
  },
  instructionPlayIcon: {
    width: scale.scaleWidth(20),
    height: scale.scaleHeight(20),
    tintColor: "#FFFFFF",
  },
  instructionVideoButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fredoka_700Bold",
  },
  instructionPagination: {
    position: "absolute",
    bottom: scale.scaleSpacing(40),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale.scaleSpacing(8),
  },
  instructionDot: {
    width: scale.scaleWidth(10),
    height: scale.scaleHeight(10),
    borderRadius: scale.scaleBorderRadius(5),
    backgroundColor: "#2A3B4D",
    opacity: 0.3,
  },
  instructionDotActive: {
    width: scale.scaleWidth(30),
    opacity: 1,
  },
  // Video Modal Styles
  videoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(20),
    padding: scale.scaleSpacing(30),
    alignItems: "center",
    width: "80%",
  },
  videoModalText: {
    fontSize: scale.scaleFont(20),
    fontWeight: "700",
    color: "#2A3B4D",
    marginBottom: scale.scaleSpacing(20),
    fontFamily: "Fredoka_700Bold",
  },
  videoModalCloseButton: {
    backgroundColor: "#00A980",
    borderRadius: scale.scaleBorderRadius(50),
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(30),
  },
  videoModalCloseText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fredoka_700Bold",
  },
}));
