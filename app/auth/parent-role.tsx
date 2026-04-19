import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getParentHelpName, saveParentHelpName } from "../../src/parentRoleService";

export default function ParentRoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isTablet = windowWidth >= 768;
  const isLargeTablet = windowWidth >= 1024;

  const contentMaxWidth = isLargeTablet
    ? Math.min(windowWidth * 0.9, 1240)
    : isTablet
      ? Math.min(windowWidth * 0.9, 980)
      : 520;

  const pageHorizontalPadding = isLargeTablet ? 40 : isTablet ? 32 : windowWidth < 380 ? 18 : 22;

  const titleFontSize = isLargeTablet ? 46 : isTablet ? 40 : 22;
  const buttonFontSize = isLargeTablet ? 24 : isTablet ? 21 : 16;
  const headerFontSize = isLargeTablet ? 26 : isTablet ? 24 : 22;
  const parentsIconSize = isLargeTablet ? 240 : isTablet ? 210 : 170;

  const contentSpacing = isLargeTablet ? 52 : isTablet ? 42 : 24;
  const containerTopPadding = isTablet ? Math.max(8, Math.min(windowHeight * 0.02, 18)) : 20;

  const [saving, setSaving] = useState(false);
  const [helpName, setHelpName] = useState("");
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("Alert!");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await getParentHelpName();
      if (cancelled) return;
      if (existing) setHelpName(existing);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;

    const trimmed = helpName.trim();
    if (!trimmed) {
      setAlertTitle("Alert!");
      setAlertMessage("Enter what your child should call you");
      setAlertModalVisible(true);
      return;
    }

    setSaving(true);
    const ok = await saveParentHelpName(trimmed);
    if (!ok) {
      setAlertTitle("Alert!");
      setAlertMessage("Failed to save. Please try again.");
      setAlertModalVisible(true);
      setSaving(false);
      return;
    }

    router.replace("/auth/child-nickname");
  };

  return (
    <ImageBackground
      source={require("../../assets/background.png")}
      style={styles.background}
      resizeMode="stretch"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: 50, android: 0 })}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex}>
            <View
              style={[
                styles.header,
                {
                  paddingTop: insets.top + 10,
                  paddingHorizontal: pageHorizontalPadding,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.replace("/instruction")}
                disabled={saving}
              >
                <Text style={[styles.headerButtonText, { fontSize: headerFontSize }]}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  setAlertTitle("Info");
                  setAlertMessage("This will show on the Media time limit screen.");
                  setAlertModalVisible(true);
                }}
                disabled={saving}
              >
                <Text style={[styles.headerButtonText, { fontSize: headerFontSize }]}>!</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={[
                styles.scrollContainer,
                {
                  paddingHorizontal: pageHorizontalPadding,
                  paddingTop: insets.top + 90,
                  paddingBottom: insets.bottom + 32,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.container, { maxWidth: contentMaxWidth, paddingTop: containerTopPadding }]}>
              <Image
                source={require("../../assets/images/Parents.png")}
                style={[styles.parentsIcon, { width: parentsIconSize, height: parentsIconSize }]}
                resizeMode="contain"
              />

              <Text
                style={[
                  styles.title,
                  {
                    fontSize: titleFontSize,
                    marginTop: 14,
                    marginBottom: Math.max(14, contentSpacing * 0.45),
                  },
                ]}
              >
                What should your child call you?
              </Text>

              <TextInput
                style={[styles.input, { fontSize: isTablet ? 22 : 16 }]}
                placeholder=""
                value={helpName}
                onChangeText={setHelpName}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                editable={!saving}
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.saveButtonText, { fontSize: buttonFontSize }]}>
                  {saving ? "CONFIRMING..." : "CONFIRM"}
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>

        <Modal
          animationType="fade"
          transparent={true}
          visible={alertModalVisible}
          onRequestClose={() => setAlertModalVisible(false)}
        >
          <View style={styles.alertModalOverlay}>
            <View style={styles.alertModalContainer}>
              <View style={styles.alertIconCircle}>
                <Image source={require("../../assets/images/Pencil.png")} style={styles.alertIcon} />
              </View>
              <Text style={styles.alertModalTitle}>{alertTitle}</Text>
              <Text style={styles.alertModalMessage}>{alertMessage}</Text>
              <TouchableOpacity style={styles.alertOkButton} onPress={() => setAlertModalVisible(false)}>
                <Text style={styles.alertOkButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 10,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 110,
  },
  headerButtonText: {
    color: "#2A3B4D",
    fontFamily: "Fredoka_600SemiBold",
    textDecorationLine: "underline",
  },
  container: {
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  parentsIcon: {
    marginTop: 18,
    marginBottom: 8,
  },
  title: {
    fontWeight: "800",
    color: "#2D3A5F",
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "rgba(45, 58, 95, 0.12)",
    color: "#2D3A5F",
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 18,
  },
  saveButton: { 
    width: "72%",
    maxWidth: 420,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: "#5EEAD4",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontWeight: "900",
    color: "#2D3A5F",
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  alertModalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  alertIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(94, 234, 212, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  alertIcon: {
    width: 44,
    height: 44,
  },
  alertModalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2D3A5F",
    marginBottom: 6,
  },
  alertModalMessage: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3A5F",
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 18,
  },
  alertOkButton: {
    width: "74%",
    maxWidth: 240,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: "#5EEAD4",
    alignItems: "center",
  },
  alertOkButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#2D3A5F",
  },
});
