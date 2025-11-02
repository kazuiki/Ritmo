// app/(tabs)/home.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPresetById } from "../../constants/presets";

interface Routine {
  id: number;
  name: string;
  time: string;
  presetId?: number;
  completed?: boolean;
}

export default function Home() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [activeRoutineId, setActiveRoutineId] = useState<number | null>(null);

  const loadRoutines = async () => {
    try {
      const stored = await AsyncStorage.getItem("@routines");
      if (stored) {
        const loadedRoutines: Routine[] = JSON.parse(stored);
        setRoutines(loadedRoutines);
      } else {
        setRoutines([]);
      }
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadRoutines();
    }, [])
  );

  const toggleComplete = async (id: number) => {
    const updatedRoutines = routines.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    setRoutines(updatedRoutines);

    try {
      await AsyncStorage.setItem("@routines", JSON.stringify(updatedRoutines));
    } catch (error) {
      console.error("Failed to save routines:", error);
    }
  };

  const finishTask = async () => {
    if (!activeRoutineId) return;
    const updatedRoutines = routines.map((r) =>
      r.id === activeRoutineId ? { ...r, completed: true } : r
    );
    
    const allCompleted = updatedRoutines.every((r) => r.completed);
    
    const finalRoutines = allCompleted ? [] : updatedRoutines;
    
    setRoutines(finalRoutines);
    try {
      await AsyncStorage.setItem("@routines", JSON.stringify(finalRoutines));
    } catch (error) {
      console.error("Failed to save routines:", error);
    }
    setTaskModalVisible(false);
    setActiveRoutineId(null);
  };

  const incompleteRoutines = routines.filter((r) => !r.completed);

  const totalRoutines = routines.length;
  const completedCount = routines.filter((r) => r.completed).length;
  
  const displayCompleted = completedCount;
  const displayTotal = totalRoutines;
  const progressPercentage = totalRoutines > 0 ? (completedCount / totalRoutines) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/ritmoNameLogo.png")}
          style={styles.brandLogo}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Daily Progress tracker */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Daily Progress</Text>
            <Text style={styles.progressCount}>{displayCompleted} of {displayTotal}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {incompleteRoutines.map((routine, idx) => {
          const isActive = idx === 0;
          const preset = getPresetById(routine.presetId);
          return (
            <TouchableOpacity
              key={routine.id}
              style={styles.taskCard}
              activeOpacity={0.8}
              onPress={() => {
                if (isActive) {
                  setActiveRoutineId(routine.id);
                  setTaskModalVisible(true);
                }
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {preset ? (
                  <Image
                    source={preset.image}
                    style={[styles.presetImageSmall, !isActive && styles.presetImageDim]}
                    {...(!isActive ? { blurRadius: 1 } : {})}
                  />
                ) : (
                  <View style={[styles.iconPlaceholder, !isActive && styles.iconDim]}>
                    <Text style={styles.icon}>📋</Text>
                  </View>
                )}
                <View style={{ marginLeft: 16 }}>
                  <Text style={styles.taskTitle}>{routine.name}</Text>
                  <Text style={styles.taskTime}>{routine.time}</Text>
                </View>
              </View>
              {!isActive && <View pointerEvents="none" style={styles.dimOverlay} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Full-screen Task Modal for the first routine */}
      <Modal
        visible={taskModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <View style={styles.modalScreen}>
          {/* Header */}
          <View style={styles.taskHeader}>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Body content - labels only for now */}
          <View style={styles.taskContent}>
            <View style={styles.taskBlock}>
              <Text style={styles.taskBlockLabel}>Play Book{"\n"}Guide</Text>
            </View>

            <View style={styles.taskBlock}>
              <Text style={styles.taskBlockLabel}>Play {"\n"}MiniGame</Text>
            </View>
          </View>

          {/* Footer - Finish Task */}
          <View style={styles.taskFooter}>
            <TouchableOpacity style={styles.finishButton} onPress={finishTask} activeOpacity={0.9}>
              <Text style={styles.finishButtonText}>Finish Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingHorizontal: 16 },
  brand: { fontSize: 20, color: "#276a63", fontWeight: "700" },
  brandLogo: { width: 120, height: 30, resizeMode: "contain", marginLeft: -22, marginTop: -20 },
  progressCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#B8E6D9",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: { fontWeight: "700", fontSize: 16, color: "#244D4A", fontFamily: "Courier" },
  progressCount: { color: "#06C08A", fontSize: 16, fontWeight: "600" },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#06C08A",
    borderRadius: 4,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#B8E6D9",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#E8FFFA",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDim: {
    opacity: 0.7,
  },
  presetImageSmall: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: "cover",
  },
  presetImageDim: {
    opacity: 0.7,
  },
  icon: { fontSize: 28 },
  taskTitle: { fontWeight: "700", color: "#244D4A", fontSize: 18, marginBottom: 4, fontFamily: "Courier" },
  taskTime: { fontSize: 16, color: "#666" },
  modalScreen: {
    flex: 1,
    backgroundColor: "#E8FFFA",
  },
  taskHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 18,
    color: "#244D4A",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  taskContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
    gap: 24,
    marginTop: -50,
  },
  taskBlock: {
    width: "100%",
    flex: 1,
    maxHeight: 220,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#B8E6D9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  taskBlockLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: 28,
    fontFamily: "Courier",
  },
  taskFooter: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  finishButton: {
    backgroundColor: "#2F7D73",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
    top: -30,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  dimOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 16,
  },
});