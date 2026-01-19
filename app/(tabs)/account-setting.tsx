import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts
} from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { supabase } from "../../src/supabaseClient";
import { useResponsiveDimensions } from "../../src/utils/responsive";

export default function AccountSetting() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password error modals
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<"error" | "pencil">("error");

  // Password success modal
  const [passwordSuccessVisible, setPasswordSuccessVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setEmail(user.email || "");
        
        // Get child nickname from user metadata (both child_name and child_nickname for compatibility)
        const nickname = user.user_metadata?.child_name || user.user_metadata?.child_nickname || "";
        setChildNickname(nickname);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEditingNickname = () => {
    setTempNickname(childNickname);
    setIsEditingNickname(true);
  };

  const saveNickname = async () => {
    if (tempNickname.trim() === "") {
      Alert.alert("Error", "Nickname cannot be empty");
      setIsEditingNickname(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: { child_name: tempNickname }
      });

      if (error) throw error;

      setChildNickname(tempNickname);
      setIsEditingNickname(false);
      Alert.alert("Success", "Nickname updated successfully");
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentView,
          { paddingBottom: 50 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

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
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8FFFA",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  scrollView: {
    flex: 1,
  },
  contentView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 30,
    marginLeft: -4,
  },
  backButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
    minHeight: 60,
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
  directEditInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  editButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
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
  changePasswordContainer: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  changePasswordContent: {
    width: '100%',
    alignItems: 'stretch',
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
  // Password Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "75%",
    maxWidth: 340,
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
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  errorModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Fredoka_700Bold",
  },
  errorModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: 8,
    flexWrap: "wrap",
  },
  errorOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  errorOkButtonText: {
    fontSize: 16,
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
    borderRadius: 20,
    padding: 24,
    width: "70%",
    maxWidth: 320,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#9FD19E",
  },
  successPasswordIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D4F1D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successPasswordIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  successPasswordModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    fontFamily: "Fredoka_700Bold",
  },
  successPasswordModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    marginBottom: 18,
    fontFamily: "Fredoka_400Regular",
    flexWrap: "wrap",
  },
  successPasswordOkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  successPasswordOkButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
});
 