// app/(tabs)/home.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPresetById } from "../../constants/presets";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { supabase } from "../../src/supabaseClient";

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
  const [playbookModalVisible, setPlaybookModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [activeRoutineId, setActiveRoutineId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioControlIndex, setAudioControlIndex] = useState(0);
  const [childName, setChildName] = useState("Child");
  const [starAnimations, setStarAnimations] = useState([false, false, false]);
  const [showRainingStars, setShowRainingStars] = useState(false);

  const loadRoutines = async () => {
    try {
      const stored = await AsyncStorage.getItem("@routines");
      if (stored) {
        const loadedRoutines: Routine[] = JSON.parse(stored);
        // Reset all completed status to false when loading
        const resetRoutines = loadedRoutines.map(r => ({ ...r, completed: false }));
        setRoutines(resetRoutines);
      } else {
        setRoutines([]);
      }
    } catch (error) {
      console.error("Failed to load routines:", error);
    }
  };

  const fetchChildName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.child_name) {
        setChildName(user.user_metadata.child_name);
      }
    } catch (error) {
      console.error("Failed to fetch child name:", error);
    }
  };

  useEffect(() => {
    fetchChildName();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRoutines();
      // Clear all parental lock authentication when navigating to HOME
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [])
  );

  const toggleComplete = async (id: number) => {
    // Update the routine to completed
    const updatedRoutines = routines.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    
    // Check if all routines are now completed
    const allCompleted = updatedRoutines.every((r) => r.completed);
    
    if (allCompleted) {
      // If all routines are completed, clear the list
      setRoutines([]);
      try {
        await AsyncStorage.setItem("@routines", JSON.stringify([]));
      } catch (error) {
        console.error("Failed to clear routines:", error);
      }
    } else {
      // Otherwise just update state
      setRoutines(updatedRoutines);
    }
  };

  const incompleteRoutines = routines.filter((r) => !r.completed);

  const totalRoutines = routines.length;
  const completedCount = routines.filter((r) => r.completed).length;
  const progressPercentage = totalRoutines > 0 ? (completedCount / totalRoutines) * 100 : 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/ritmoNameLogo.png")}
          style={styles.brandLogo}
        />
      </View>

      {/* Daily Progress tracker - Fixed */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Daily Progress</Text>
          <Text style={styles.progressCount}>{completedCount} of {totalRoutines}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      {/* All Done Message - Show when no routines */}
      {incompleteRoutines.length === 0 && (
        <View style={styles.allDoneContainer}>
          <Text style={styles.allDoneText}>All Done</Text>
          <Text style={styles.congratulationText}>Congratulations</Text>
          <Text style={styles.childNameDone}>{childName}</Text>
        </View>
      )}

      {/* Scrollable Routines List */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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
          {/* Background Image */}
          <Image
            source={require("../../assets/background.png")}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          
          {/* Header */}
          <View style={styles.taskHeader}>
            <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Body content - labels only for now */}
          <View style={styles.taskContent}>
            <TouchableOpacity 
              style={styles.taskItem}
              onPress={() => {
                setTaskModalVisible(false);
                setPlaybookModalVisible(true);
              }}
            >
              <Image 
                source={require("../../assets/images/media-unscreen.gif")}
                style={styles.taskImage}
                resizeMode="contain"
              />
              <Text style={styles.taskBlockLabel}>Play Book{"\n"}Guide</Text>
            </TouchableOpacity>

            <View style={styles.taskItem}>
              <Image 
                source={require("../../assets/images/media-1--unscreen.gif")}
                style={styles.taskImage}
                resizeMode="contain"
              />
              <Text style={styles.taskBlockLabel}>Play {"\n"}MiniGame</Text>
            </View>
          </View>

          {/* Footer - Finish Task */}
          <View style={styles.taskFooter}>
            <TouchableOpacity 
              style={styles.finishButton} 
              onPress={() => {
                if (activeRoutineId) {
                  toggleComplete(activeRoutineId);
                }
                setTaskModalVisible(false);
                setActiveRoutineId(null);
              }} 
              activeOpacity={0.9}
            >
              <Text style={styles.finishButtonText}>Finish Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Playbook Modal */}
      <Modal
        visible={playbookModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setPlaybookModalVisible(false);
          setCurrentStep(1);
          setIsPlaying(false);
          setAudioControlIndex(0);
        }}
      >
        <View style={styles.playbookScreen}>
          {/* Background Image */}
          <Image
            source={require("../../assets/background.png")}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          
          {/* Back Button - Only show on Step 1 */}
          <View style={styles.playbookHeader}>
            {currentStep === 1 && (
              <TouchableOpacity onPress={() => {
                setPlaybookModalVisible(false);
                setCurrentStep(1);
                setIsPlaying(false);
                setAudioControlIndex(0);
              }}>
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Routine Title with Stars */}
          <View style={styles.routineTitleCard}>
            <Text style={styles.routineTitle}>Brush My Teeth</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3].map((starNumber) => (
                  <MotiView
                    key={starNumber}
                    from={{
                      scale: 0,
                      opacity: 0,
                    }}
                    animate={{
                      scale: currentStep > starNumber ? 1.2 : 1,
                      opacity: 1,
                    }}
                    transition={{
                      type: 'spring',
                      delay: currentStep > starNumber ? (starNumber - 1) * 200 : 0,
                      damping: 8,
                      stiffness: 100,
                    }}
                  >
                    <Text style={styles.star}>
                      {currentStep > starNumber ? "⭐" : "☆"}
                    </Text>
                  </MotiView>
              ))}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.playbookContent}>
            {/* Video/Image Card */}
            <TouchableOpacity 
              style={styles.videoCard}
              activeOpacity={1}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Image
                  source={
                    currentStep === 1 
                      ? require("../../assets/images/dance-toothpaste 2.gif")
                      : currentStep === 2
                      ? require("../../assets/images/put toothpaste.gif")
                      : currentStep === 3
                      ? require("../../assets/images/brush teeth.gif")
                      : require("../../assets/images/gargle.png")
                  }
                  style={styles.videoImage}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Image
                    source={
                      currentStep === 1
                        ? require("../../assets/images/brushandpaste.png")
                        : currentStep === 2
                        ? require("../../assets/images/puttoothpaste.png")
                        : currentStep === 3
                        ? require("../../assets/images/brushingteeth.png")
                        : require("../../assets/images/gargle.png")
                    }
                    style={[styles.videoImage, styles.grayedImage]}
                    resizeMode="cover"
                  />
                  <View style={styles.playButtonOverlay}>
                    <Image
                      source={require("../../assets/images/Circled Play Button.png")}
                      style={styles.playButtonImage}
                      resizeMode="contain"
                    />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Step Label */}
            <Text style={styles.stepLabel}>Step {currentStep}</Text>

            {/* Audio Controls Card */}
            <TouchableOpacity 
              style={styles.audioCard}
              onPress={() => setAudioControlIndex((prev) => (prev + 1) % 3)}
            >
              <Image
                source={
                  audioControlIndex === 0
                    ? require("../../assets/images/Musical Note.png")
                    : audioControlIndex === 1
                    ? require("../../assets/images/Pause.png")
                    : require("../../assets/images/Audio.png")
                }
                style={styles.audioIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Instruction Text */}
            <Text style={styles.instructionText}>
              {currentStep === 1 
                ? "Get your Toothpaste\nand Toothbrush"
                : currentStep === 2
                ? "Put some toothpaste\ninto the toothbrush"
                : currentStep === 3
                ? "Brush Your Teeth"
                : "Wash Your Mouth"
              }
            </Text>
          </ScrollView>

          {/* Footer with Back and Next Buttons */}
          <View style={styles.playbookFooter}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={styles.backButtonBottom}
                onPress={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                    setIsPlaying(false);
                    setAudioControlIndex(0);
                  }
                }}
              >
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
            )}
            {currentStep > 1 && <View style={styles.buttonSpacer} />}
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={() => {
                if (currentStep < 4) {
                  setCurrentStep(currentStep + 1);
                  setIsPlaying(false);
                  setAudioControlIndex(0);
                } else {
                  // Step 4 - Finish button action - Show success modal
                  setPlaybookModalVisible(false);
                  setSuccessModalVisible(true);
                  setShowRainingStars(true);
                  setCurrentStep(1);
                  setIsPlaying(false);
                  setAudioControlIndex(0);
                }
              }}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? "FINISH" : "NEXT"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          setSuccessModalVisible(false);
          setShowRainingStars(false);
        }}
      >
        <View style={styles.successScreen}>
          {/* Background Image */}
          <Image
            source={require("../../assets/Success.png")}
            style={styles.successBackground}
            resizeMode="cover"
          />

          {/* Content Overlay */}
          <View style={styles.successContent}>
            {/* Raining Stars Animation */}
            {showRainingStars && (
              <View style={styles.rainingStarsContainer} pointerEvents="none">
                {[...Array(50)].map((_, index) => {
                  const startX = Math.random() * 400; // Full screen width spread
                  const endX = startX + (Math.random() * 100 - 50); // Small drift
                  return (
                    <MotiView
                      key={index}
                      from={{
                        translateY: -100,
                        translateX: startX,
                        opacity: 0,
                        rotate: '0deg',
                        scale: 0.8 + Math.random() * 0.4,
                      }}
                      animate={{
                        translateY: 700,
                        translateX: endX,
                        opacity: [0, 1, 1, 0],
                        rotate: '360deg',
                        scale: 0.8 + Math.random() * 0.4,
                      }}
                      transition={{
                        type: 'timing',
                        duration: 2000 + Math.random() * 1500,
                        delay: Math.random() * 500, // Much shorter delay - stars start immediately
                        repeat: Infinity,
                      }}
                      style={styles.rainingStar}
                    >
                      <Text style={styles.rainingStarText}>⭐</Text>
                    </MotiView>
                  );
                })}
              </View>
            )}

            {/* Three Stars - Middle one elevated with pop animation */}
            <View style={styles.starsSuccessContainer}>
              {[0, 1, 2].map((index) => (
                <MotiView
                  key={index}
                  from={{
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{
                    scale: index === 1 ? 1.3 : 1.1,
                    opacity: 1,
                  }}
                  transition={{
                    type: 'spring',
                    delay: index * 300,
                    damping: 6,
                    stiffness: 120,
                  }}
                >
                  <Text style={[styles.starSuccess, index === 1 && styles.starElevated]}>⭐</Text>
                </MotiView>
              ))}
            </View>

            {/* Good Job Text */}
            <Text style={styles.goodJobText}>Good Job</Text>
            <Text style={styles.childNameText}>"{childName}"</Text>

            {/* Next Button */}
            <TouchableOpacity
              style={styles.successNextButton}
              onPress={() => {
                if (activeRoutineId) {
                  toggleComplete(activeRoutineId);
                }
                setSuccessModalVisible(false);
                setShowRainingStars(false);
                setActiveRoutineId(null);
              }}
            >
              <Text style={styles.successNextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  header: { paddingTop: 50, paddingHorizontal: 16 },
  brand: { fontSize: 20, color: "#276a63", fontWeight: "700" },
  brandLogo: { width: 120, height: 30, resizeMode: "contain", marginLeft: -22, marginTop: -20, marginBottom: 12 },
  progressCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
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
    paddingVertical: 100,
    gap: 20,
    marginTop: -100,
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
  taskItem: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  taskImage: {
    width: 250,
    height: 250,
    marginBottom: -50,
  },
  taskBlockLabel: {
    fontSize: 20,
    fontWeight: "900",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: 25,
    fontFamily: "Comic Sans MS",
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
  // Playbook Modal Styles
  playbookScreen: {
    flex: 1,
    backgroundColor: "#C8E6E2",
  },
  playbookHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 48,
  },
  routineTitleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#2F7C72",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routineTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#244D4A",
    fontFamily: "Comic Sans MS",
  },
  starsContainer: {
    flexDirection: "row",
    gap: 6,
  },
  star: {
    fontSize: 20,
  },
  playbookContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    alignItems: "center",
  },
  videoCard: {
    width: "100%",
    height: 230,
    backgroundColor: "#5B2C91",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 30,
    position: "relative",
  },
  videoImage: {
    width: "100%",
    height: "100%",
  },
  grayedImage: {
    opacity: 0.6,
  },
  playButtonOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -35 }, { translateY: -35 }],
  },
  playButtonImage: {
    width: 70,
    height: 70,
  },
  stepLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#244D4A",
    marginBottom: 12,
    fontFamily: "Comic Sans MS",
  },
  audioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
  },
  audioIcon: {
    width: 50,
    height: 50,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#244D4A",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Comic Sans MS",
  },
  playbookFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backButtonBottom: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#244D4A",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#244D4A",
  },
  buttonSpacer: {
    width: "4%",
  },
  nextButton: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#244D4A",
  },
  nextButtonFull: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
    borderColor: "#244D4A",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#244D4A",
  },
  // Success Modal Styles
  successScreen: {
    flex: 1,
    position: "relative",
  },
  successBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  starsSuccessContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 30,
    gap: 15,
  },
  starSuccess: {
    fontSize: 60,
  },
  starElevated: {
    marginBottom: 15,
  },
  goodJobText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#244D4A",
    marginBottom: 4,
    letterSpacing: 1,
  },
  childNameText: {
    fontSize: 30,
    fontWeight: "600",
    color: "#244D4A",
    marginBottom: 60,
    fontStyle: "italic",
  },
  successNextButton: {
    paddingVertical: 8,
    paddingHorizontal: 40,
  },
  successNextButtonText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#244D4A",
    textDecorationLine: "underline",
    letterSpacing: 0.5,
  },
  // All Done Message Styles
  allDoneContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 130,
  },
  allDoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#244D4A",
    letterSpacing: 1,
  },
  congratulationText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#244D4A",
    letterSpacing: 1,
  },
  childNameDone: {
    fontSize: 18,
    fontWeight: "700",
    color: "#244D4A",
    textDecorationLine: "underline",
    fontStyle: "italic",
  },
  rainingStarsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  rainingStar: {
    position: 'absolute',
    zIndex: 2,
  },
  rainingStarText: {
    fontSize: 20,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});