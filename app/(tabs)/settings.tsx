import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function Settings() {
  const router = useRouter();
  const [childNickname, setChildNickname] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
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
              <Text 
                style={styles.valueText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {childNickname || "—"}
              </Text>
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
    alignItems: "center",
  },
  valueText: {
    fontSize: 16,
    color: "#264D47",
    fontWeight: "700",
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
});
