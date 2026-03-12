import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../src/supabaseClient";
import { useResponsiveDimensions } from "../../src/utils/responsive";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Logging in...");
  const responsive = useResponsiveDimensions();

  useEffect(() => {
    const processUrl = async (url?: string | null) => {
      if (!url) {
        console.log("processUrl: no URL provided");
        return false;
      }

      console.log("processUrl: processing URL:", url);

      const getParamString = (value: string) => {
        if (value.includes("#")) return value.split("#")[1];
        if (value.includes("?")) return value.split("?")[1];
        return "";
      };

      const paramString = getParamString(url);
      const params = new URLSearchParams(paramString);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");
      const code = params.get("code");
      
      console.log("processUrl: parsed params", { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type, 
        hasCode: !!code 
      });

      if (code && !accessToken && !refreshToken) {
        console.log("Exchanging PKCE code for session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data?.session) {
          console.error("❌ Code exchange failed:", error?.message || "No session returned");
          setMessage(`Sign-in failed: ${error?.message || "Could not establish session"}`);
          return false;
        }

        console.log("✅ Code exchange successful, session established");

        if (type === "recovery") {
          router.replace("/auth/update-password");
          return true;
        }
      } else if (accessToken && refreshToken) {
        console.log("Setting session from implicit tokens...");
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error || !data?.session) {
          console.error("❌ setSession from callback failed:", error?.message || "No session returned");
          setMessage(`Sign-in failed: ${error?.message || "Could not establish session"}`);
          return false;
        }

        console.log("✅ setSession successful");

        if (type === "recovery") {
          router.replace("/auth/update-password");
          return true;
        }
      } else {
        console.log("❌ No valid auth parameters found in URL");
        return false;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("❌ Error fetching user after OAuth:", userError.message);
        setMessage(`Sign-in failed: ${userError.message}`);
        return false;
      }

      console.log("✅ User fetched successfully");
      const childName = (userData?.user?.user_metadata as any)?.child_name;
      const hasAcceptedTerms = (userData?.user?.user_metadata as any)?.has_accepted_terms;
      
      // Don't route here - let _layout.tsx handle routing after auth state changes
      // This prevents double navigation to policy/instruction pages
      console.log("→ Session established, letting _layout.tsx handle routing");
      
      return true;
    };

    const completeOAuth = async () => {
      try {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          // Session already exists, let _layout.tsx handle routing
          console.log("→ Session already exists, letting _layout.tsx handle routing");
          return;
        }

        const initialUrl = await Linking.getInitialURL();
        console.log("AuthCallback initial URL:", initialUrl);

        const handledInitial = await processUrl(initialUrl);
        if (handledInitial) return;

        // Fallback: listen for a late-arriving URL while this screen is open
        const subscription = Linking.addEventListener("url", async (event) => {
          console.log("AuthCallback received URL event:", event.url);
          const handled = await processUrl(event.url);
          if (handled) {
            subscription.remove();
          }
        });

        setTimeout(async () => {
          const { data: retrySession } = await supabase.auth.getSession();
          if (retrySession.session) {
            // Session established, let _layout.tsx handle routing
            console.log("→ Session retry successful, letting _layout.tsx handle routing");
            subscription.remove?.();
            return;
          }
          setMessage("Sign-in failed. Please try again.");
          subscription.remove?.();
        }, 600000);
      } catch (err) {
        console.error("Unexpected OAuth callback error:", err);
        setMessage("Sign-in failed. Please try again.");
      }
    };

    completeOAuth();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5BDFC9" />
        <Text style={{
          marginTop: responsive.scaleSpacing(16),
          fontSize: responsive.scaleFont(20),
          color: "#2A3B4D",
          textAlign: "center",
          fontFamily: "Fredoka_600SemiBold",
        }}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8FFFA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
