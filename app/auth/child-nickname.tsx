import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, ImageBackground, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { supabase } from "../../src/supabaseClient";

const LOCAL_CHILD_NAME_KEY = "@ritmo_local_child_name";
const PENDING_CHILD_NAME_KEY = "@ritmo_pending_child_name";
const LAST_USER_ID_KEY = "@ritmo_last_user_id";

const isExpectedOfflineError = (error: unknown): boolean => {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  const name = String((error as any)?.name ?? "").toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("fetch failed") ||
    name === "typeerror" ||
    name === "authretryablefetcherror"
  );
};

export default function ChildNickname() {
  const router = useRouter();
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSaveChild = async () => {
    const trimmedChild = child.trim();
    if (!trimmedChild) {
      setAlertMessage("Enter your child's nickname");
      setAlertModalVisible(true);
      return;
    }

    setLoading(true);
    await AsyncStorage.setItem(LOCAL_CHILD_NAME_KEY, trimmedChild);

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) {
      await AsyncStorage.setItem(LAST_USER_ID_KEY, sessionData.session.user.id);
    }

    // Update current authenticated user's metadata
    try {
      const { error } = await supabase.auth.updateUser({
        data: { child_name: trimmedChild },
      });

      if (error) {
        if (isExpectedOfflineError(error)) {
          await AsyncStorage.setItem(
            PENDING_CHILD_NAME_KEY,
            JSON.stringify({ value: trimmedChild, updatedAt: new Date().toISOString() })
          );
          router.replace("/greetings");
          return;
        }

        setAlertMessage(error.message);
        setAlertModalVisible(true);
        return;
      }

      await AsyncStorage.removeItem(PENDING_CHILD_NAME_KEY);

      // Navigate directly to greetings after saving nickname
      router.replace("/greetings");
    } catch (error) {
      if (isExpectedOfflineError(error)) {
        await AsyncStorage.setItem(
          PENDING_CHILD_NAME_KEY,
          JSON.stringify({ value: trimmedChild, updatedAt: new Date().toISOString() })
        );
        router.replace("/greetings");
        return;
      }

      setAlertMessage((error as any)?.message ?? "Failed to save nickname");
      setAlertModalVisible(true);
    } finally {
      setLoading(false);
    }

  };

  return (
    <ImageBackground 
      source={require("../../assets/background.png")} 
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: 50, android: 0 })}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/instruction")}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.container}>
              {/* Ritmo Logo */}
              <View style={styles.logoContainer}>
                <Image 
                  source={require("../../assets/ritmo-logo.png")} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
              <Text style={styles.title}>Set child's nickname</Text>

              {/* Input */}
              <TextInput
                style={styles.input}
                placeholder="Enter child's nickname here"
                value={child}
                onChangeText={setChild}
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleSaveChild}
              />

              {/* Save Button */}
              <TouchableOpacity style={styles.save} onPress={handleSaveChild} disabled={loading}>
                <Text style={styles.saveButtonText}>{loading ? "SAVING..." : "SAVE"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        {/* Alert Modal */}
        <Modal animationType="fade" transparent={true} visible={alertModalVisible} onRequestClose={() => setAlertModalVisible(false)}>
          <View style={styles.alertModalOverlay}>
            <View style={styles.alertModalContainer}>
              <View style={styles.alertIconCircle}>
                <Image source={require("../../assets/images/Pencil.png")} style={styles.alertIcon} />
              </View>
              <Text style={styles.alertModalTitle}>Alert!</Text>
              <Text style={styles.alertModalMessage}>{alertMessage}</Text>
              <TouchableOpacity style={styles.alertOkButton} onPress={() => setAlertModalVisible(false)}>
                <Text style={styles.alertOkButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
  },
  backButton: {
    position: "absolute",
    top: Platform.select({ ios: 50, android: 32 }),
    left: 8,
    zIndex: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 22,
    color: "#2A3B4D",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  container: { 
    flex: 1, 
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: "70%",
    maxWidth: 260,
    height: undefined,
    aspectRatio: 1,
  },
  title: { 
    fontSize: 18, 
    color: "#2A3B4D", 
    fontWeight: "600", 
    marginBottom: 16,
    textAlign: "center",
  },
  input: { 
    backgroundColor: "#fff", 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    marginBottom: 20,
    width: "100%",
    maxWidth: 400,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    textAlign: "center",
  },
  save: { 
    backgroundColor: "#00A980", 
    paddingVertical: 14, 
    borderRadius: 20, 
    alignItems: "center", 
    width: "75%",
    maxWidth: 260,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    width: "74%",
    maxWidth: 330,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#FFB3BA",
  },
  alertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  alertModalMessage: {
    fontSize: 14,
    color: "#4A4A4A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
    flexWrap: "wrap",
  },
  alertOkButton: {
    backgroundColor: "#FF6B7A",
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  alertOkButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
