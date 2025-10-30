import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, AppState, AppStateStatus, Alert } from "react-native";
import { supabase } from "../../src/supabaseClient";
import { useRouter } from "expo-router";

export default function ConfirmEmailCheck() {
  const router = useRouter();
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [appState]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === "active") {
      await checkEmailConfirmed();
    }
    setAppState(nextAppState);
  };

  const checkEmailConfirmed = async () => {
    try {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error) throw error;

      const user = userData.user;
      if (!user) return;

      if (user.email_confirmed_at) {
        Alert.alert("✅ Email confirmed!", "Proceeding...");

        // Check child_name
        const childName = (user.user_metadata as any)?.child_name;
        router.replace(childName ? "/greetings" : "/auth/child-nickname");
      }
    } catch (error: any) {
      console.log("Error checking email:", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Waiting for email confirmation...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },

  text: { 
    fontSize: 18, 
    color: "#276a63" 
  },
  
});
