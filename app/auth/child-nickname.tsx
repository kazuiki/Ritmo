import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function ChildNickname() {
  const router = useRouter();
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSaveChild = async () => {
    if (!child) {
      setAlertMessage("Enter your child's nickname");
      setAlertModalVisible(true);
      return;
    }
    setLoading(true);

    // Update current authenticated user's metadata
    const { error } = await supabase.auth.updateUser({
      data: { child_name: child },
    });

    setLoading(false);

    if (error) {
      setAlertMessage(error.message);
      setAlertModalVisible(true);
      return;
    }

    // Navigate to next screen (show loading first, then greetings)
    router.replace("/loading?next=/greetings");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Child Nickname</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your child's nickname"
          value={child}
          onChangeText={setChild}
        />

        <TouchableOpacity style={styles.save} onPress={handleSaveChild} disabled={loading}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "Saving..." : "SAVE & CONTINUE"}</Text>
        </TouchableOpacity>

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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8FFFA", padding: 22, justifyContent: "center" },
  title: { fontSize: 22, color: "#276a63", fontWeight: "700", marginBottom: 18 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  save: { backgroundColor: "#06C08A", paddingVertical: 14, borderRadius: 18, alignItems: "center", marginTop: 8 },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    width: "82%",
    maxWidth: 420,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
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
