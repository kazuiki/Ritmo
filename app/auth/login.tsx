import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
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
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { supabase } from "../../src/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChildInput, setShowChildInput] = useState(false);
  const [user, setUser] = useState<any>(null); // store logged-in user

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const [paused, setPaused] = useState(false);
  const reduceMotionRef = useRef(false);

  // bubbles data: positions and animation refs
  const bubbleCount = 4;
  const bubbleValues = useRef(
    new Array(bubbleCount).fill(null).map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))
  ).current;
  const bubbleAnims = useRef<Array<Animated.CompositeAnimation | null>>(new Array(bubbleCount).fill(null)).current;
  const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

  // generate base positions/sizes/colors for bubbles once (cover entire screen)
  const bubbleBase = useRef(
    (() => {
      const { width, height } = Dimensions.get("window");
      const sizeOptions = [220, 160, 120, 90];
      const colorOptions = ["#CFF6E6", "#E7FFF8", "#DFFCF0", "#EAFDF6"];
      return new Array(bubbleCount).fill(null).map((_, i) => {
        const size = sizeOptions[i % sizeOptions.length];
        const color = colorOptions[i % colorOptions.length];
        const left = randomBetween(0, Math.max(0, width - size));
        const top = randomBetween(0, Math.max(0, height - size));
        return { size, color, top, left };
      });
    })()
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
    // check reduce motion
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduceMotionRef.current = !!r;
      if (!r) startAllBubbles();
    });

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (r) => {
      reduceMotionRef.current = !!r;
      if (r) stopAllBubbles(); else if (!paused) startAllBubbles();
    });

    return () => {
      sub.remove();
      stopAllBubbles();
    };
  }, [fadeAnim, slideAnim]);

  const startBubble = (i: number) => {
    const v = bubbleValues[i];
    // simple looping motion: move to random positions in a smooth loop
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(v.x, { toValue: randomBetween(-40, 40), duration: 2500 + Math.random() * 2000, useNativeDriver: true }),
          Animated.timing(v.y, { toValue: randomBetween(-20, 20), duration: 2500 + Math.random() * 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(v.x, { toValue: randomBetween(-40, 40), duration: 2500 + Math.random() * 2000, useNativeDriver: true }),
          Animated.timing(v.y, { toValue: randomBetween(-20, 20), duration: 2500 + Math.random() * 2000, useNativeDriver: true }),
        ]),
      ])
    );
    bubbleAnims[i] = anim;
    anim.start();
  };

  const startAllBubbles = () => {
    if (reduceMotionRef.current) return;
    for (let i = 0; i < bubbleCount; i++) {
      // if already running, stop then start fresh
      bubbleAnims[i]?.stop();
      startBubble(i);
    }
  };

  const stopAllBubbles = () => {
    for (let i = 0; i < bubbleCount; i++) {
      bubbleAnims[i]?.stop();
      bubbleAnims[i] = null;
    }
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      startAllBubbles();
    } else {
      setPaused(true);
      stopAllBubbles();
    }
  };

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
        <TouchableWithoutFeedback onPress={togglePause}>
          <View style={styles.container}>
            {/* render animated bubbles behind the logo */}
            {bubbleBase.map((b, i) => (
              <Animated.View
                key={i}
                style={{
                  position: "absolute",
                  width: b.size,
                  height: b.size,
                  borderRadius: b.size / 2,
                  backgroundColor: b.color,
                  top: b.top,
                  left: b.left,
                  transform: [
                    { translateX: bubbleValues[i].x },
                    { translateY: bubbleValues[i].y },
                  ],
                  opacity: 0.18,
                }}
              />
            ))}

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
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Enter password here:"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  style={styles.eyeButton}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#276a63" />
                </TouchableOpacity>
              </View>
  
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
        </TouchableWithoutFeedback>
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
  inputRow: {
    width: "92%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 6,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
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
