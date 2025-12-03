import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { MotiImage, MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Linking,
    Modal,
    PixelRatio,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { supabase } from "../../src/supabaseClient";
import { isNetworkConnected } from "../../src/utils/networkUtils";
import { navigateToGreetingsWithNetworkCheck } from "../../src/utils/smartNavigation";
import NetworkFailureModal from "../components/NetworkFailureModal";

/* -------------------------
   Responsive helpers (Option B)
   ------------------------- */
const baseWidth = 390; // guideline (iPhone 14 width)
const baseHeight = 844; // guideline height (optional)

/**
 * scale - horizontal scale based on screen width
 * vscale - vertical scale based on screen height
 * scaleFont - scale fonts with PixelRatio rounding
 */
function createScaler(width: number, height: number) {
  const scale = (size: number) => (width / baseWidth) * size;
  const vscale = (size: number) => (height / baseHeight) * size;
  const scaleFont = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel((width / baseWidth) * size));
  return { scale, vscale, scaleFont };
}

export default function Login() {
  const router = useRouter();

  // Responsive layout state (updates on rotate / size change)
  const [layout, setLayout] = useState(() => Dimensions.get("window"));
  useEffect(() => {
    const onChange = ({ window }: { window: { width: number; height: number } }) => {
      setLayout(Dimensions.get("window"));
    };
    const sub = Dimensions.addEventListener?.("change", onChange) ?? Dimensions.addEventListener("change", onChange);
    return () => {
      try {
        sub?.remove?.();
      } catch {
        // react-native < 0.65 fallback handled above
      }
    };
  }, []);
  const { width, height } = layout;
  const { scale, vscale, scaleFont } = createScaler(width, height);

  // State & refs (kept as original)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [child, setChild] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChildInput, setShowChildInput] = useState(false);
  const [paused, setPaused] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const reduceMotionRef = useRef(false);

  // Local network failure detection for authentication
  const [localNetworkFailure, setLocalNetworkFailure] = useState(false);

  const handleLocalNetworkRetry = async () => {
    console.log('🔄 User dismissed network failure modal');
    setLocalNetworkFailure(false);
  };

  // OAuth listener cleanup
  useEffect(() => {
    return () => {
      setAlertModalVisible(false);
    };
  }, []);

  // Listen for OAuth callback and handle auth state changes
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
          router.replace("/loading?next=/instruction");
        } else {
          navigateToGreetingsWithNetworkCheck(router);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Bubble animation setup (sizes will be scaled)
  const bubbleCount = 4;
  const bubbleValues = useRef(
    new Array(bubbleCount).fill(null).map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) }))
  ).current;
  const bubbleAnims = useRef(new Array(bubbleCount).fill(null));
  const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

  // base bubble params should update when layout changes; keep a ref and regenerate on layout change
  const bubbleBaseRef = useRef<any[]>([]);
  useEffect(() => {
    const w = width;
    const h = height;
    // original sizes scaled
    const sizeOptions = [220, 160, 120, 90].map((s) => Math.max(36, scale(s))); // ensure minimum size
    const colorOptions = ["#CFF6E6", "#E7FFF8", "#DFFCF0", "#EAFDF6"];
    bubbleBaseRef.current = new Array(bubbleCount).fill(null).map((_, i) => {
      const size = sizeOptions[i % sizeOptions.length];
      const color = colorOptions[i % colorOptions.length];
      const left = randomBetween(0, Math.max(0, w - size));
      const top = randomBetween(0, Math.max(0, h - size));
      return { size, color, top, left };
    });
    // restart anims to reflect new sizes if running
    stopAllBubbles();
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduceMotionRef.current = !!r;
      if (!r) startAllBubbles();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      reduceMotionRef.current = !!r;
      if (!r) startAllBubbles();
    });
    return stopAllBubbles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startBubble = (i: number) => {
    const v = bubbleValues[i];
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(v.x, {
            toValue: randomBetween(-Math.max(10, scale(40)), Math.max(10, scale(40))),
            duration: Math.max(1200, vscale(3000)),
            useNativeDriver: true,
          }),
          Animated.timing(v.y, {
            toValue: randomBetween(-Math.max(6, vscale(20)), Math.max(6, vscale(20))),
            duration: Math.max(1200, vscale(3000)),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(v.x, {
            toValue: randomBetween(-Math.max(10, scale(40)), Math.max(10, scale(40))),
            duration: Math.max(1200, vscale(3000)),
            useNativeDriver: true,
          }),
          Animated.timing(v.y, {
            toValue: randomBetween(-Math.max(6, vscale(20)), Math.max(6, vscale(20))),
            duration: Math.max(1200, vscale(3000)),
            useNativeDriver: true,
          }),
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
      try {
        bubbleAnims.current[i]?.stop?.();
      } catch {}
      bubbleAnims.current[i] = null;
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
    if (!email || !password) {
      setAlertMessage("Fill all fields");
      setAlertModalVisible(true);
      return;
    }

    // Check network connectivity before attempting login
    console.log('🔍 Checking network connectivity for login...');
    const isConnected = await isNetworkConnected();
    console.log('📡 Network connectivity result:', isConnected);
    
    if (!isConnected) {
      console.log('❌ No network connection - login blocked');
      setLocalNetworkFailure(true);
      return;
    }
    
    console.log('✅ Network connection available, proceeding with login');

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      
      if (error) {
        // Check if it's a network-related error
        if (error.message.includes('Network request failed') || 
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.name === 'TypeError') {
          console.log('❌ Network error during login:', error.message);
          setLocalNetworkFailure(true);
          return;
        }
        
        setAlertMessage(error.message);
        setAlertModalVisible(true);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        // Check if it's a network-related error
        if (userError.message.includes('Network request failed') || 
            userError.message.includes('fetch') ||
            userError.message.includes('network') ||
            userError.name === 'TypeError') {
          console.log('❌ Network error during user fetch:', userError.message);
          setLocalNetworkFailure(true);
          return;
        }
        
        setAlertMessage(userError.message);
        setAlertModalVisible(true);
        return;
      }

      const loggedInUser = userData.user;
      const childName = (loggedInUser?.user_metadata as any)?.child_name;

      if (!childName) {
        router.replace("/auth/child-nickname");
      } else {
        // Single replace to loading with next param – avoids sequential replaces
        navigateToGreetingsWithNetworkCheck(router);
      }
    } catch (networkError) {
      setLoading(false);
      console.log('❌ Caught network error during login:', (networkError as any).message);
      setLocalNetworkFailure(true);
      return;
    }

  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('Google Sign-In clicked');
      
      // Check network connectivity before attempting sign-in
      const isConnected = await isNetworkConnected();
      if (!isConnected) {
        console.log('❌ No network connection - Google sign-in blocked');
        setLocalNetworkFailure(true);
        return;
      }
      
      // Check if user is already signed in
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'exists' : 'none');
      
      if (session) {
        // User is already authenticated, navigate to home
        setLoading(true);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('User error:', userError);
          // Check if it's a network-related error
          if (userError.message.includes('Network request failed') || 
              userError.message.includes('fetch') ||
              userError.message.includes('network') ||
              userError.name === 'TypeError') {
            console.log('❌ Network error during Google sign-in user fetch:', userError.message);
            setLocalNetworkFailure(true);
            setLoading(false);
            return;
          }
          
          setAlertMessage(userError.message);
          setAlertModalVisible(true);
          setLoading(false);
          return;
        }

        const loggedInUser = userData.user;
        const childName = (loggedInUser?.user_metadata as any)?.child_name;

        if (!childName) {
          router.replace("/instruction");
        } else {
          navigateToGreetingsWithNetworkCheck(router);
        }
        setLoading(false);
        return;
      }

      // User not signed in, start OAuth flow
      console.log('Starting OAuth flow...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'ritmo://auth/callback',
        },
      });

      console.log('OAuth response:', { data, error });

      if (error) {
        console.error('OAuth error:', error);
        // Check if it's a network-related error
        if (error.message.includes('Network request failed') || 
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.name === 'TypeError') {
          console.log('❌ Network error during OAuth:', error.message);
          setLocalNetworkFailure(true);
          return;
        }
        
        setAlertMessage(`Google Sign-In Error: ${error.message}`);
        setAlertModalVisible(true);
        return;
      }

      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);
        await Linking.openURL(data.url);
      }

    } catch (err) {
      console.error('Google sign-in exception:', err);
      // Check if it's a network-related error
      if ((err as any).message.includes('Network request failed') || 
          (err as any).message.includes('fetch') ||
          err.message.includes('network') ||
          err.name === 'TypeError') {
        console.log('❌ Network error during Google sign-in:', err.message);
        setLocalNetworkFailure(true);
        return;
      }
      
      setAlertMessage(err.message || "Google sign-in failed. Please try again.");
      setAlertModalVisible(true);
    }
  };

   /* -------------------------
     Responsive styles (uses scale/vscale/scaleFont)
     ------------------------- */
  const styles = createStyles({ scale, vscale, scaleFont, width, height });

  const bubbleBase = bubbleBaseRef.current;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.outer}>
      <Stack.Screen options={{ title: "Log in", headerShown: false }} />
      <ImageBackground source={require("../../assets/background.png")} style={styles.background} resizeMode="cover">
        <TouchableWithoutFeedback onPress={togglePause}>
          <View style={styles.container}>
            {/* Animated bubbles */}
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

            {/* Moti animations for logo and fields */}
            <MotiImage
              from={{ opacity: 0, translateY: -vscale(20) }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 800 }}
              source={require("../../assets/ritmo-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Animated input group */}
            <MotiView
              from={{ opacity: 0, translateY: vscale(30) }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400, duration: 600 }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email here:"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#6b6b6b"
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
                  placeholderTextColor="#6b6b6b"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={scaleFont(18)} color="#276a63" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity onPress={() => router.push("./forgot-password")} style={{ alignSelf: "flex-end" }}>
                <Text style={[styles.link, { marginTop: vscale(8) }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </MotiView>

            {/* Animated login button */}
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 700, type: "spring" }}
              style={{ width: "100%", alignItems: "center" }}
            >
              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
              </TouchableOpacity>
            </MotiView>

            {/* Links */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 900, duration: 600 }}
              style={{ width: "100%", alignItems: "center" }}
            >
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

      {/* Alert Modal */}
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

      {/* Network Failure Modal */}
      <NetworkFailureModal 
        visible={localNetworkFailure} 
        onRetry={handleLocalNetworkRetry} 
      />
    </KeyboardAvoidingView>
  );
}

/* -------------------------
   createStyles factory using scale/vscale/scaleFont
   (keeps everything responsive for hybrid mode)
   ------------------------- */
function createStyles({ scale, vscale, scaleFont, width, height }: any) {
  return StyleSheet.create({
    outer: { flex: 1 },
    container: {
      flex: 1,
      paddingHorizontal: scale(20),
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: Math.min(scale(300), width * 0.78),
      height: Math.min(vscale(220), height * 0.22),
      marginBottom: vscale(6),
    },
    label: {
      alignSelf: "flex-start",
      color: "#276a63",
      marginTop: vscale(8),
      fontSize: scaleFont(14),
      fontWeight: "600",
    },
    input: {
      width: "100%",
      maxWidth: Math.max(scale(340), width * 0.92),
      backgroundColor: "#fff",
      borderRadius: scale(8),
      paddingHorizontal: scale(14),
      paddingVertical: vscale(12),
      marginTop: vscale(10),
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: scale(4),
      elevation: 2,
      fontSize: scaleFont(15),
    },
    inputRow: {
      width: "100%",
      maxWidth: Math.max(scale(340), width * 0.92),
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: scale(8),
      paddingHorizontal: scale(10),
      marginTop: vscale(10),
      elevation: 2,
    },
    inputFlex: { flex: 1, paddingVertical: vscale(10), fontSize: scaleFont(15) },
    eyeButton: { paddingHorizontal: scale(6), paddingVertical: vscale(6) },
    background: { flex: 1, width: "100%", height: "100%" },
    button: {
      marginTop: vscale(22),
      backgroundColor: "#2D7778",
      paddingVertical: vscale(12),
      width: width >= 800 ? "45%" : "60%",
      maxWidth: Math.max(scale(420), 420),
      borderRadius: scale(20),
      alignItems: "center",
      elevation: 3,
    },
    signUpButton: {
      marginTop: vscale(10),
      backgroundColor: "#5BDFC9",
    },
    buttonText: { color: "#fff", fontWeight: "600", fontSize: scaleFont(16) },
    link: { marginTop: vscale(12), color: "#276a63", textDecorationLine: "underline", fontSize: scaleFont(13) },
    orText: {
      marginTop: vscale(16),
      color: "#244D4A",
      fontWeight: "500",
      fontSize: scaleFont(14),
    },
    createAccountBtn: {
      marginTop: vscale(18),
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#2D7778",
      borderRadius: scale(8),
      paddingVertical: vscale(12),
      paddingHorizontal: scale(10),
      width: "50%",
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
    },
    createAccountText: {
      color: "#2D7778",
      fontWeight: "600",
      fontSize: scaleFont(15),
    },
    gmailIconWrapper: {
      marginTop: vscale(10),
      backgroundColor: "transparent",
      padding: 0,
    },
    gmailIcon: {
      width: scale(44),
      height: scale(44),
      backgroundColor: "transparent",
    },

    // Alert Modal Styles
    alertModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    alertModalContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: scale(18),
      padding: scale(18),
      width: "82%",
      maxWidth: Math.min(scale(420), 420),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: scale(12),
      elevation: 8,
      borderWidth: scale(3),
      borderColor: "#FFB3BA",
    },
    alertIconCircle: {
      width: scale(64),
      height: scale(64),
      borderRadius: scale(32),
      backgroundColor: "#FFE5E7",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: vscale(12),
    },
    alertIcon: {
      width: scale(36),
      height: scale(36),
      resizeMode: "contain",
    },
    alertModalTitle: {
      fontSize: scaleFont(20),
      fontWeight: "700",
      color: "#1A1A1A",
      marginBottom: vscale(8),
      // fontFamily: "Fredoka_700Bold", // keep if available
    },
    alertModalMessage: {
      fontSize: scaleFont(14),
      color: "#4A4A4A",
      textAlign: "center",
      lineHeight: scaleFont(18),
      marginBottom: vscale(16),
      paddingHorizontal: scale(8),
      flexWrap: "wrap",
    },
    alertOkButton: {
      backgroundColor: "#FF6B7A",
      paddingVertical: vscale(10),
      paddingHorizontal: scale(28),
      borderRadius: scale(40),
      alignItems: "center",
      justifyContent: "center",
      minWidth: scale(110),
    },
    alertOkButtonText: {
      fontSize: scaleFont(15),
      fontWeight: "600",
      color: "#FFFFFF",
      // fontFamily: "Fredoka_600SemiBold",
    },
  });
}