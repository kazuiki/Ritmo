import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";

interface NetworkFailureModalProps {
  visible: boolean;
  onRetry: () => void;
}

export default function NetworkFailureModal({ visible, onRetry }: NetworkFailureModalProps) {
  const responsive = useResponsiveDimensions();
  const styles = createResponsiveStyles((scale) => StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: scale.scaleBorderRadius(18),
      padding: scale.scaleSpacing(20),
      width: "85%",
      maxWidth: scale.scaleWidth(420),
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: scale.scaleHeight(4) },
      shadowOpacity: 0.25,
      shadowRadius: scale.scaleSpacing(12),
      elevation: 10,
      borderWidth: 3,
      borderColor: "#FF6B7A",
    },
    iconCircle: {
      width: scale.scaleWidth(70),
      height: scale.scaleHeight(70),
      borderRadius: scale.scaleWidth(35),
      backgroundColor: "#FFE5E7",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: scale.scaleSpacing(16),
    },
    iconText: {
      fontSize: scale.scaleFont(32),
      textAlign: "center",
    },
    modalTitle: {
      fontSize: scale.scaleFont(22),
      fontWeight: "700",
      color: "#1A1A1A",
      marginBottom: scale.scaleSpacing(10),
      textAlign: "center",
    },
    modalMessage: {
      fontSize: scale.scaleFont(15),
      color: "#4A4A4A",
      textAlign: "center",
      lineHeight: scale.scaleHeight(20),
      marginBottom: scale.scaleSpacing(20),
      paddingHorizontal: scale.scaleSpacing(10),
    },
    okButton: {
      backgroundColor: "#FF6B7A",
      paddingVertical: scale.scaleSpacing(12),
      paddingHorizontal: scale.scaleSpacing(32),
      borderRadius: scale.scaleBorderRadius(25),
      alignItems: "center",
      justifyContent: "center",
      minWidth: scale.scaleWidth(120),
      shadowColor: "#FF6B7A",
      shadowOffset: { width: 0, height: scale.scaleHeight(2) },
      shadowOpacity: 0.3,
      shadowRadius: scale.scaleSpacing(4),
      elevation: 4,
    },
    okButtonText: {
      fontSize: scale.scaleFont(16),
      fontWeight: "600",
      color: "#FFFFFF",
    },
  }));

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