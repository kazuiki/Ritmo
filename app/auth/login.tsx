import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { MotiImage, MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { supabase } from "../../src/supabaseClient";
import { scale, scaleFont, vscale } from "../../utils/scaler";

export default function Login() {
  const router = useRouter();

  // State & refs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const reduceMotionRef = useRef(false);

  // OAuth listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          setAlertMessage(userError.message);
          setAlertModalVisible(true);
          return;
        }
        const loggedInUser = userData.user;
        const childName = (loggedInUser?.user_metadata as any)?.child_name;

        if (!childName) {
          router.replace("/auth/child-nickname");
        } else {
          router.replace("/loading?next=/greetings");
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  // Bubble animation setup
  const bubbleCount = 4;
  const bubbleValues = useRef(
    new Array(bubbleCount).fill(null).map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))
  ).current;
  const bubbleAnims = useRef(new Array(bubbleCount).fill(null));
  const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

  const bubbleBaseRef = useRef<any[]>([]);
  useEffect(() => {
    const w = 390; // base width for bubbles (approx)
    const h = 844; // base height for bubbles
    const sizeOptions = [220, 160, 120, 90].map((s) => Math.max(36, scale(s)));
    const colorOptions = ["#CFF6E6", "#E7FFF8", "#DFFCF0", "#EAFDF6"];
    bubbleBaseRef.current = new Array(bubbleCount).fill(null).map((_, i) => {
      const size = sizeOptions[i % sizeOptions.length];
      const color = colorOptions[i % colorOptions.length];
      const left = randomBetween(0, Math.max(0, w - size));
      const top = randomBetween(0, Math.max(0, h - size));
      return { size, color, top, left };
    });
    stopAllBubbles();
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduceMotionRef.current = !!r;
      if (!r) startAllBubbles();
    });
  }, []);

  const startBubble = (i: number) => {
    const v = bubbleValues[i];
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(v.x, { toValue: randomBetween(-scale(40), scale(40)), duration: vscale(3000), useNativeDriver: true }),
          Animated.timing(v.y, { toValue: randomBetween(-vscale(20), vscale(20)), duration: vscale(3000), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(v.x, { toValue: randomBetween(-scale(40), scale(40)), duration: vscale(3000), useNativeDriver: true }),
          Animated.timing(v.y, { toValue: randomBetween(-vscale(20), vscale(20)), duration: vscale(3000), useNativeDriver: true }),
        ]),
      ])
    );
    bubbleAnims.current[i] = anim;
    anim.start();
  };

  const startAllBubbles = () => {
    if (reduceMotionRef.current) return;
    for (let i = 0; i < bubbleCount; i++) {
      bubbleAnims.current[i]?.stop?.();
      startBubble(i);
    }
  };
  const stopAllBubbles = () => {
    for (let i = 0; i < bubbleCount; i++) {
      try { bubbleAnims.current[i]?.stop?.(); } catch {}
      bubbleAnims.current[i] = null;
    }
  };
  const togglePause = () => (reduceMotionRef.current ? null : (stopAllBubbles(), setTimeout(startAllBubbles, 0)));

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage("Fill all fields");
      setAlertModalVisible(true);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setAlertMessage(error.message), setAlertModalVisible(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return setAlertMessage(userError.message), setAlertModalVisible(true);

    const loggedInUser = userData.user;
    const childName = (loggedInUser?.user_metadata as any)?.child_name;
    if (!childName) router.replace("/auth/child-nickname");
    else router.replace("/loading?next=/greetings");
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return handleLogin();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "ritmo://auth/callback" },
      });

      if (error) return setAlertMessage(`Google Sign-In Error: ${error.message}`), setAlertModalVisible(true);
      if (data?.url) await Linking.openURL(data.url);
    } catch (err: any) {
      setAlertMessage(err.message || "Google sign-in failed. Please try again.");
      setAlertModalVisible(true);
    }
  };

  const styles = createStyles({ scale, vscale, scaleFont });
  const bubbleBase = bubbleBaseRef.current;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.outer}>
      <Stack.Screen options={{ title: "Log in", headerShown: false }} />
      <ImageBackground source={require("../../assets/background.png")} style={styles.background} resizeMode="cover">
        <TouchableWithoutFeedback onPress={togglePause}>
          <View style={styles.container}>
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
                  transform: [{ translateX: bubbleValues[i].x }, { translateY: bubbleValues[i].y }],
                  opacity: 0.18,
                }}
              />
            ))}

            <MotiImage
              from={{ opacity: 0, translateY: -vscale(20) }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
              source={require("../../assets/ritmo-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <MotiView from={{ opacity: 0, translateY: vscale(30) }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 400, duration: 600 }} style={{ width: "100%", alignItems: "center" }}>
              <Text style={styles.label}>Email:</Text>
              <TextInput style={styles.input} placeholder="Enter email here:" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#6b6b6b" />

              <Text style={styles.label}>Password:</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.inputFlex} placeholder="Enter password here:" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholderTextColor="#6b6b6b" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={scaleFont(18)} color="#276a63" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => router.push("./forgot-password")} style={{ alignSelf: "flex-end" }}>
                <Text style={[styles.link, { marginTop: vscale(8), flexShrink: 1, flexWrap: "wrap" }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </MotiView>

            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 700, type: "spring" }} style={{ width: "100%", alignItems: "center" }}>
              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
              </TouchableOpacity>
            </MotiView>

            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 900, duration: 600 }} style={{ width: "100%", alignItems: "center" }}>
              <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={() => router.push("/auth/signup")}>
                <Text style={styles.buttonText}>Sign Up</Text>
              </TouchableOpacity>
              <Text style={styles.orText}>Or sign in with</Text>
              <TouchableOpacity style={styles.gmailIconWrapper} onPress={handleGoogleSignIn} disabled={loading}>
                <ImageBackground source={require("../../assets/Google.png")} style={styles.gmailIcon} resizeMode="contain" />
              </TouchableOpacity>
            </MotiView>
          </View>
        </TouchableWithoutFeedback>
      </ImageBackground>

      <Modal animationType="fade" transparent={true} visible={alertModalVisible} onRequestClose={() => setAlertModalVisible(false)}>
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <View style={styles.alertIconCircle}>
              <Image source={require("../../assets/images/Pencil.png")} style={styles.alertIcon} />
            </View>
            <Text style={styles.alertModalTitle}>Alert!</Text>
            <Text style={styles.alertModalMessage}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertOkButton} onPress={() => setAlertModalVisible(false)}>
              <Text style={styles.alertOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ---------- STYLES ----------
function createStyles({ scale, vscale, scaleFont }: any) {
  return StyleSheet.create({
    outer: { flex: 1 },
    container: { flex: 1, paddingHorizontal: scale(20), justifyContent: "center", alignItems: "center" },
    background: { flex: 1, width: "100%", height: "100%" },
    logo: { width: scale(300), height: vscale(220), marginBottom: vscale(6) },
    label: { fontSize: scaleFont(14), color: "#276a63", marginTop: vscale(8), alignSelf: "flex-start" },
    input: { width: "100%", backgroundColor: "#fff", borderRadius: scale(8), paddingHorizontal: scale(14), paddingVertical: vscale(12), fontSize: scaleFont(15) },
    inputRow: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: scale(8), paddingHorizontal: scale(10), marginTop: vscale(10) },
    inputFlex: { flex: 1, paddingVertical: vscale(10), fontSize: scaleFont(15) },
    eyeButton: { paddingHorizontal: scale(6), paddingVertical: vscale(6) },
    button: { marginTop: vscale(22), backgroundColor: "#2D7778", paddingVertical: vscale(12), width: "60%", borderRadius: scale(20), alignItems: "center" },
    signUpButton: { marginTop: vscale(10), backgroundColor: "#5BDFC9" },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: scaleFont(16) },
    link: { marginTop: vscale(12), color: "#276a63", textDecorationLine: "underline", fontSize: scaleFont(13) },
    orText: { marginTop: vscale(16), color: "#244D4A", fontWeight: "500", fontSize: scaleFont(14) },
    gmailIconWrapper: { marginTop: vscale(10) },
    gmailIcon: { width: scale(44), height: scale(44) },
    alertModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    alertModalContainer: { backgroundColor: "#fff", borderRadius: scale(18), padding: scale(18), width: "82%", alignItems: "center" },
    alertIconCircle: { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: "#FFE5E7", justifyContent: "center", alignItems: "center", marginBottom: vscale(12) },
    alertIcon: { width: scale(36), height: scale(36), resizeMode: "contain" },
    alertModalTitle: { fontSize: scaleFont(20), fontWeight: "700", color: "#1A1A1A", marginBottom: vscale(8) },
    alertModalMessage: { fontSize: scaleFont(14), color: "#4A4A4A", textAlign: "center", lineHeight: scaleFont(18), marginBottom: vscale(16) },
    alertOkButton: { backgroundColor: "#FF6B7A", paddingVertical: vscale(10), paddingHorizontal: scale(28), borderRadius: scale(40), alignItems: "center", justifyContent: "center", minWidth: scale(110) },
    alertOkButtonText: { fontSize: scaleFont(15), fontWeight: "600", color: "#fff" },
  });
}
