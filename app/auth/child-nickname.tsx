import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { supabase } from "../../src/supabaseClient";
import { useRouter } from "expo-router";

export default function ChildNickname() {
  const router = useRouter();
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveChild = async () => {
    if (!child) return alert("Enter your child's nickname");
    setLoading(true);

    // Update current authenticated user's metadata
    const { error } = await supabase.auth.updateUser({
      data: { child_name: child },
    });

    setLoading(false);

    if (error) return alert(error.message);

    // Navigate to next screen (e.g., greetings or home)
    router.replace("/greetings");
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8FFFA", padding: 22, justifyContent: "center" },
  title: { fontSize: 22, color: "#276a63", fontWeight: "700", marginBottom: 18 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  save: { backgroundColor: "#06C08A", paddingVertical: 14, borderRadius: 18, alignItems: "center", marginTop: 8 },
});
