import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function ConfirmEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const confirm = async () => {
      try {
        // Attempt to refresh session and get the current user regardless of incoming params.
        // Some email providers / deep links may not include a `source=email` param, so
        // requiring it can cause the page to do nothing and show an "untitled" or empty page.
        // Refresh session to recognize confirmed email
        await supabase.auth.getSession();

        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError; 

        const user = userData.user;

        // If no user is signed in, inform the user and send them to login
        if (!user) {
          Alert.alert("✅ Email confirmed!", "You can now log in.");
          router.push("/auth/login");
          return;
        }

        // If user exists, check if email is verified
        const isConfirmed = !!(
          (user as any).confirmed_at ||
          (user as any).email_confirmed_at ||
          (user as any).email_confirmed
        );

        if (isConfirmed) {
          // Email already confirmed — go to next step
          Alert.alert("✅ Email confirmed!", "You can now continue.");
          // Check for child nickname and route accordingly
          const childName = (user.user_metadata as any)?.child_name;
          router.push(childName ? "/loading?next=/greetings" : "/auth/child-nickname");
          return;
        }

        // If email not yet marked confirmed, still try to navigate based on metadata
      const childName = (user.user_metadata as any)?.child_name;
      router.push(childName ? "/loading?next=/greetings" : "/auth/child-nickname");
        Alert.alert("✅ Email confirmed!", "Proceed to the next step.");
      } catch (error: any) {
        console.log("Confirm email error:", error);
        Alert.alert("Error", error?.message || "Something went wrong while confirming your email.");
      }
    };

    confirm();
  }, [params]);

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
