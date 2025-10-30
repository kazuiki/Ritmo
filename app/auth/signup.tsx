import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Alert } from "react-native";
import { supabase } from "../../src/supabaseClient";
import { useRouter } from "expo-router";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return alert("Fill all fields");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    }
  );

    setLoading(false);

    if (error) return alert(error.message);

    // Stay logged in after signup
    const user = data.user;

    Alert.alert("Check your email!", "Please confirm your email. You can continue in the app.");
    router.replace("/components/confirm-email-check");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "Signing up..." : "Sign Up"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E8FFFA", padding: 22 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 18, color: "#276a63" },
  input: { width: "90%", backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: "#06C08A", padding: 14, borderRadius: 18, alignItems: "center", width: "60%" },
});
