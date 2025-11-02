import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ParentalLock() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(true);

  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)/settings")}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      {/* Parental Lock Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Parental Lock</Text>
        <Switch
          trackColor={{ false: "#D1D1D6", true: "#FF6B6B" }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D1D1D6"
          onValueChange={toggleSwitch}
          value={isEnabled}
          style={styles.switch}
        />
      </View>

      {/* Description */}
      <Text style={styles.description}>
        Parental Lock - Allows parents or guardians to restrict access to
        settings and sensitive content. A passcode is required to make changes,
        ensuring a safe and controlled experience for children.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C8E6E2",
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 30,
  },
  backButtonText: {
    fontSize: 18,
    color: "#276a63",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  description: {
    fontSize: 14,
    color: "#4A5568",
    lineHeight: 22,
    paddingHorizontal: 4,
  },
});
