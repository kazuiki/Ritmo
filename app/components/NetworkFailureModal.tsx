import { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    PixelRatio,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

/* -------------------------
   Responsive helpers
   ------------------------- */
const baseWidth = 390; // guideline (iPhone 14 width)
const baseHeight = 844; // guideline height

function createScaler(width: number, height: number) {
  const scale = (size: number) => (width / baseWidth) * size;
  const vscale = (size: number) => (height / baseHeight) * size;
  const scaleFont = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel((width / baseWidth) * size));
  return { scale, vscale, scaleFont };
}

interface NetworkFailureModalProps {
  visible: boolean;
  onRetry: () => void;
}

export default function NetworkFailureModal({ visible, onRetry }: NetworkFailureModalProps) {
  // Responsive layout state (updates on rotate / size change)
  const [layout, setLayout] = useState(() => Dimensions.get("window"));
  useEffect(() => {
    const onChange = ({ window }: { window: { width: number; height: number } }) => {
      setLayout(Dimensions.get("window"));
    };
    const sub = Dimensions.addEventListener?.("change", onChange) ?? Dimensions.addEventListener("change", onChange);
    return () => {
      if (typeof sub?.remove === "function") {
        sub.remove();
      }
    };
  }, []);

  const { width, height } = layout;
  const { scale, vscale, scaleFont } = createScaler(width, height);

  const styles = createStyles({ scale, vscale, scaleFont });

  return (
    <Modal 
      animationType="fade" 
      transparent={true} 
      visible={visible}
      onRequestClose={() => {}} // Prevent back button from closing modal
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📶</Text>
          </View>

          <Text style={styles.modalTitle}>Network Failed</Text>
          <Text style={styles.modalMessage}>
            No internet connection detected. Please check your network settings and try again.
          </Text>

          <TouchableOpacity style={styles.okButton} onPress={onRetry}>
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles({ scale, vscale, scaleFont }: any) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: scale(18),
      padding: scale(20),
      width: "85%",
      maxWidth: scale(420),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: scale(12),
      elevation: 10,
      borderWidth: scale(3),
      borderColor: "#FF6B7A",
    },
    iconCircle: {
      width: scale(70),
      height: scale(70),
      borderRadius: scale(35),
      backgroundColor: "#FFE5E7",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: vscale(16),
    },
    iconText: {
      fontSize: scaleFont(32),
      textAlign: "center",
    },
    modalTitle: {
      fontSize: scaleFont(22),
      fontWeight: "700",
      color: "#1A1A1A",
      marginBottom: vscale(10),
      textAlign: "center",
    },
    modalMessage: {
      fontSize: scaleFont(15),
      color: "#4A4A4A",
      textAlign: "center",
      lineHeight: scaleFont(20),
      marginBottom: vscale(20),
      paddingHorizontal: scale(10),
    },
    okButton: {
      backgroundColor: "#FF6B7A",
      paddingVertical: vscale(12),
      paddingHorizontal: scale(32),
      borderRadius: scale(25),
      alignItems: "center",
      justifyContent: "center",
      minWidth: scale(120),
      shadowColor: "#FF6B7A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: scale(4),
      elevation: 4,
    },
    okButtonText: {
      fontSize: scaleFont(16),
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
}