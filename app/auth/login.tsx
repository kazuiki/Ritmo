import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  GestureResponderEvent,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChildInput, setShowChildInput] = useState(false);
  const [user, setUser] = useState<any>(null); // store logged-in user

  const handleLogin = async () => {
    if (!email || !password) return alert("Fill all fields");
    setLoading(true);
  
    // Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) return alert(signInError.message);
  
    // Get user metadata
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return alert(userError.message);
  
    const loggedInUser = userData.user;
    const childName = (loggedInUser?.user_metadata as any)?.child_name;
  
    if (!childName) {
      // Navigate to child-nickname screen if child_name is missing
      router.replace("/auth/child-nickname");
    } else {
      // Otherwise, go to greetings/home
      router.replace("/greetings");
    }
  };
  

  function handleSaveChild(event: GestureResponderEvent): void {
    throw new Error("Function not implemented.");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.outer}
    >
      <Stack.Screen options={{ title: "Log in", headerShown: false }} />
      
      <ImageBackground
        source={require("../../assets/background.png")} // your PNG
        style={styles.background}
        resizeMode="cover" // or "contain" if you want
      >
        <View style={styles.container}>
          <Image
            source={require("../../assets/ritmo-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          {!showChildInput && (
            <>
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email here:"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
  
              <Text style={styles.label}>Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password here:"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
  
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Logging in..." : "LOGIN"}
                </Text>
              </TouchableOpacity>
  
              <TouchableOpacity onPress={() => router.push("/auth/signup")}>
                <Text style={styles.link}>Create Account</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={styles.link}
                onPress={() => Linking.openURL("mailto:")}
              >
                <Text style={styles.link}>Open Gmail / Email App</Text>
              </TouchableOpacity>
            </>
          )}
  
          {showChildInput && (
            <>
              <Text style={styles.label}>Child's Nickname:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your child's nickname"
                value={child}
                onChangeText={setChild}
              />
              <TouchableOpacity
                style={styles.button}
                onPress={handleSaveChild}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Saving..." : "SAVE & CONTINUE"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: { 
    width: 260, 
    height: 220, 
    marginBottom: 6 
  },

  brand: { 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#276a63", 
    marginBottom: 20 
  },

  label: { 
    alignSelf: "flex-start", 
    color: "#276a63", 
    marginLeft: 6, 
    marginTop: 6 
  },

  input: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  button: {
    marginTop: 22,
    backgroundColor: "#06C08A",
    paddingVertical: 14,
    width: "60%",
    borderRadius: 20,
    alignItems: "center",
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "700"
   },

  link: { 
    marginTop: 16, 
    color: "#276a63", 
    textDecorationLine: "underline" 
  },
});
