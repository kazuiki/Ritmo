import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function Settings() {
  const router = useRouter();
  const [childNickname, setChildNickname] = useState<string>(""); // ✅ proper state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchUserData = async () => {
    try {
      // 🔁 Force Supabase to fetch the latest user metadata
      await supabase.auth.refreshSession();

      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = data?.user;
      if (user) {
        const meta = user.user_metadata || {};
        setEmail(user.email || "");
        setChildNickname(meta.child_name ?? "Kid"); // ✅ now always correct
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchUserData();
}, []);


  const handleLogout = async () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
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
    Alert.alert("Terms and Conditions", "Terms and Conditions content will be shown here");
  };

  const handlePrivacyPolicy = () => {
    Alert.alert("Privacy Policy", "Privacy Policy content will be shown here");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require("../../assets/ritmo-header.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ Child Nickname Field */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Child nickname:</Text>
          <TextInput
            style={styles.input}
            value={childNickname}
            onChangeText={setChildNickname}
            editable={false}
            placeholder="Child nickname"
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email:</Text>
          <TextInput style={styles.input} value={email} editable={false} placeholder="Email" />
        </View>

        {/* Menu Items */}
        <TouchableOpacity style={styles.menuButton} onPress={handleParentalLock}>
          <Text style={styles.menuButtonText}>Parental Lock</Text>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={handleInstruction}>
          <Text style={styles.menuButtonText}>Instruction</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={handleTermsAndConditions}>
          <Text style={styles.menuButtonText}>Terms and Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={handlePrivacyPolicy}>
          <Text style={styles.menuButtonText}>Privacy Policy</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#C8E6E2" },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: "#C8E6E2" },
  logo: { width: 100, height: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 10 },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: { fontSize: 15, color: "#333", paddingVertical: 4 },
  menuButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#CFF6EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButtonText: { fontSize: 16, fontWeight: "600", color: "#333" },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 40,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF0000",
  },
  logoutButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
