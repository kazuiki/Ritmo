// app/(tabs)/home.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

const tasks = [
  { id: 1, title: "Brush My Teeth", time: "8:00 am", icon: "🦷" },
  { id: 2, title: "Let's Eat", time: "8:30 am", icon: "🍽️" },
  { id: 3, title: "Bath Time", time: "9:00 am", icon: "🛁" },
];

export default function Home() {
  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <View style={styles.header}>
        <Text style={styles.brand}>Ritmo</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <Text style={{ color: "#06C08A" }}>0 of {tasks.length}</Text>
        </View>

        {tasks.map((t) => (
          <View key={t.id} style={styles.taskCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.icon}>{t.icon}</Text>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                <Text style={{ color: "#444" }}>{t.time}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.circle} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingHorizontal: 16 },
  brand: { fontSize: 20, color: "#276a63", fontWeight: "700" },
  progressCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 14 },
  progressTitle: { fontWeight: "700", marginBottom: 6 },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#CFF6EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  icon: { fontSize: 28 },
  taskTitle: { fontWeight: "700" },
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#444" },
});
