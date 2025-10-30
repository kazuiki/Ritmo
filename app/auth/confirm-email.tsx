import React, { useEffect } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/supabaseClient";

export default function ConfirmEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const confirm = async () => {
      try {
        // Only proceed if email confirmation source is correct
        if (params.source === "email") {
          // Refresh session to recognize confirmed email
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          // Get the current user
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;

          const user = userData.user;

          if (!user) {
            // No logged-in user, just go to sign-in
            Alert.alert("✅ Email confirmed!", "You can now log in.");
            router.replace("/auth/login");
            return;
          }

          // If user exists, check if email is verified
          if (user.confirmed_at || user.email_confirmed_at || user.email_confirmed_at) {
            // Already confirmed
            Alert.alert("✅ Email confirmed!", "You can now log in.");
            router.replace("/auth/login");
            return;
          }

          // If email not confirmed yet, check for child nickname
          const childName = (user.user_metadata as any)?.child_name;
          router.replace(childName ? "/greetings" : "/child-nickname");

          Alert.alert("✅ Email confirmed!", "Proceed to the next step.");
        }
      } catch (error: any) {
        Alert.alert("Error", error.message || "Something went wrong.");
      }
    };

    confirm();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Confirming your email...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 18, color: "#276a63" },
});
