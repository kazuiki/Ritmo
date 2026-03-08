import {
  Fredoka_400Regular,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from "@expo-google-fonts/fredoka";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addBlockedWord, clearBlockedWords, getBlockedWords, removeBlockedWord, subscribeToBlockedWords } from "../src/blockedWordsService";
import { clearMediaSearchHistory, getMediaSearchHistoryEntries, type MediaSearchHistoryEntry } from "../src/mediaSearchHistoryService";
import { useResponsiveDimensions } from "../src/utils/responsive";

const backgroundImage = require("../assets/background.png");
const trashIcon = require("../assets/images/Trash.png");
const historyIcon = require("../assets/images/history.png");

export default function ContentFilter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    scaleFont,
    scaleSpacing,
    scaleBorderRadius,
    scaleWidth,
    height,
    deviceCategory,
  } = useResponsiveDimensions();
  const [inputValue, setInputValue] = useState("");
  const [blockedWords, setBlockedWords] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<MediaSearchHistoryEntry[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [clearHistoryConfirmVisible, setClearHistoryConfirmVisible] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [emptyListAlertVisible, setEmptyListAlertVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  const loadSearchHistory = useCallback(async () => {
    try {
      const history = await getMediaSearchHistoryEntries();
      setSearchHistory(history);
    } catch (err) {
      console.warn("Failed to load media search history:", err);
      setSearchHistory([]);
    }
  }, []);

  const getFormattedDateTime = (searchedAt: string) => {
    if (searchedAt === new Date(0).toISOString()) {
      return "Saved from older history";
    }

    const parsedDate = new Date(searchedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }

    return parsedDate.toLocaleString();
  };

  useEffect(() => {
    const loadBlockedWords = async () => {
      try {
        const words = await getBlockedWords();
        setBlockedWords(words);
      } catch (err) {
        console.warn("Failed to load blocked words:", err);
      }
    };

    loadBlockedWords();
    loadSearchHistory();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToBlockedWords((words) => {
      setBlockedWords(words);
    });

    return () => unsubscribe();
  }, [loadSearchHistory]);

  useFocusEffect(
    useCallback(() => {
      loadSearchHistory();
    }, [loadSearchHistory])
  );

  const normalizedValue = inputValue.trim().toLowerCase();
  const canAddWord = normalizedValue.length > 0;

  const handleAddWord = async () => {
    if (!canAddWord) return;
    if (blockedWords.includes(normalizedValue)) {
      setInputValue("");
      return;
    }
    try {
      setIsLoading(true);
      await addBlockedWord(normalizedValue);
      setBlockedWords((prev) => [...prev, normalizedValue]);
      setInputValue("");
    } catch (err) {
      console.error("Error adding blocked word:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWord = async (word: string) => {
    try {
      setIsLoading(true);
      await removeBlockedWord(word);
      setBlockedWords((prev) => prev.filter((item) => item !== word));
    } catch (err) {
      console.error("Error removing blocked word:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      await clearBlockedWords();
      setBlockedWords([]);
      setInputValue("");
    } catch (err) {
      console.error("Error clearing blocked words:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReset = () => {
    setResetConfirmVisible(false);
    handleReset();
  };

  const handleClearSearchHistory = () => {
    setClearHistoryConfirmVisible(true);
  };

  const confirmClearSearchHistory = async () => {
    setClearHistoryConfirmVisible(false);
    try {
      await clearMediaSearchHistory();
      setSearchHistory([]);
    } catch (err) {
      console.error("Failed to clear media search history:", err);
    }
  };

  const styles = useMemo(
    () =>
      createStyles({
        scaleFont,
        scaleSpacing,
        scaleBorderRadius,
        scaleWidth,
        height,
        deviceCategory,
      }),
    [
      scaleFont,
      scaleSpacing,
      scaleBorderRadius,
      scaleWidth,
      height,
      deviceCategory,
    ]
  );

  if (!fontsLoaded) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="stretch"
      />
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="stretch"
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: Math.max(insets.left, scaleSpacing(18)),
            paddingRight: Math.max(insets.right, scaleSpacing(18)),
          },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyIconButton}
            onPress={() => {
              loadSearchHistory();
              setHistoryModalVisible(true);
            }}
          >
            <Image source={historyIcon} style={styles.historyIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.contentContainer}>
          <Text style={styles.sectionLabel}>Add Forbidden Word</Text>
          <View style={styles.inputShell}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter word..."
              placeholderTextColor="#9AA7A1"
              value={inputValue}
              onChangeText={setInputValue}
              returnKeyType="done"
              onSubmitEditing={handleAddWord}
            />
            <TouchableOpacity
              style={[
                styles.inlineAddButton,
                !canAddWord && styles.inlineAddButtonDisabled,
              ]}
              onPress={handleAddWord}
              disabled={!canAddWord}
            >
              <Text style={styles.inlineAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Blocked Words</Text>
          <ScrollView
            style={styles.blockedList}
            contentContainerStyle={styles.blockedListContent}
            showsVerticalScrollIndicator={true}
          >
            {blockedWords.map((word) => (
              <View key={word} style={styles.wordRow}>
                <Text style={styles.wordText}>{word}</Text>
                <TouchableOpacity
                  style={styles.trashButton}
                  onPress={() => handleRemoveWord(word)}
                >
                  <Image source={trashIcon} style={styles.trashIcon} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              if (blockedWords.length === 0) {
                setEmptyListAlertVisible(true);
              } else {
                setResetConfirmVisible(true);
              }
            }}
          >
            <Text style={styles.resetButtonText}>Clear List</Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.resetModalOverlay}>
          <View style={styles.historyModalContainer}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Media Search History</Text>
              <TouchableOpacity
                style={styles.historyModalCloseIconButton}
                onPress={() => setHistoryModalVisible(false)}
              >
                <Text style={styles.historyModalCloseIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.historyList}
              contentContainerStyle={styles.historyListContent}
              showsVerticalScrollIndicator={true}
            >
              {searchHistory.length === 0 ? (
                <Text style={styles.historyEmptyText}>No searches yet.</Text>
              ) : (
                searchHistory.map((entry, index) => (
                  <View key={`${entry.query}-${entry.searchedAt}-${index}`} style={styles.historyRow}>
                    <Text style={styles.historyText} numberOfLines={1}>
                      {entry.query}
                    </Text>
                    <Text style={styles.historyDateText}>
                      {getFormattedDateTime(entry.searchedAt)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.historyClearButton}
              onPress={handleClearSearchHistory}
            >
              <Text style={styles.historyClearButtonText}>Clear History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={clearHistoryConfirmVisible}
        onRequestClose={() => setClearHistoryConfirmVisible(false)}
      >
        <View style={styles.resetModalOverlay}>
          <View style={styles.resetModalContainer}>
            <View style={styles.resetIconCircle}>
              <Image
                source={require("../assets/images/Error.png")}
                style={styles.resetIcon}
              />
            </View>

            <Text style={styles.resetModalTitle}>Clear History?</Text>
            <Text style={styles.resetModalMessage}>
              Are you sure you want to clear the media search history?
              This will remove all saved searches.
            </Text>

            <View style={styles.resetModalButtons}>
              <TouchableOpacity
                style={styles.resetCancelButton}
                onPress={() => setClearHistoryConfirmVisible(false)}
              >
                <Text style={styles.resetCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetConfirmButton}
                onPress={confirmClearSearchHistory}
              >
                <Text style={styles.resetConfirmButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={emptyListAlertVisible}
        onRequestClose={() => setEmptyListAlertVisible(false)}
      >
        <View style={styles.resetModalOverlay}>
          <View style={styles.resetModalContainer}>
            <View style={styles.resetIconCircle}>
              <Image
                source={require("../assets/images/Error.png")}
                style={styles.resetIcon}
              />
            </View>

            <Text style={styles.resetModalTitle}>Empty List</Text>
            <Text style={styles.resetModalMessage}>
              You don't have a blocked word list.
            </Text>

            <View style={styles.resetModalButtons}>
              <TouchableOpacity
                style={[styles.resetConfirmButton, { flex: 1 }]}
                onPress={() => setEmptyListAlertVisible(false)}
              >
                <Text style={styles.resetConfirmButtonText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={resetConfirmVisible}
        onRequestClose={() => setResetConfirmVisible(false)}
      >
        <View style={styles.resetModalOverlay}>
          <View style={styles.resetModalContainer}>
            <View style={styles.resetIconCircle}>
              <Image
                source={require("../assets/images/Error.png")}
                style={styles.resetIcon}
              />
            </View>

            <Text style={styles.resetModalTitle}>Clear?</Text>
            <Text style={styles.resetModalMessage}>
              Are you sure you want to clear the blocked words list?
              This will remove all added words.
            </Text>

            <View style={styles.resetModalButtons}>
              <TouchableOpacity
                style={styles.resetCancelButton}
                onPress={() => setResetConfirmVisible(false)}
              >
                <Text style={styles.resetCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetConfirmButton}
                onPress={confirmReset}
              >
                <Text style={styles.resetConfirmButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const createStyles = ({
  scaleFont,
  scaleSpacing,
  scaleBorderRadius,
  scaleWidth,
  height,
  deviceCategory,
}: {
  scaleFont: (size: number) => number;
  scaleSpacing: (size: number) => number;
  scaleBorderRadius: (size: number) => number;
  scaleWidth: (size: number) => number;
  height: number;
  deviceCategory: string;
}) =>
  StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  backButton: {
    paddingVertical: scaleSpacing(6),
    paddingHorizontal: scaleSpacing(6),
  },
  topBar: {
    marginTop: scaleSpacing(6),
    marginBottom: scaleSpacing(18),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButtonText: {
    fontWeight: "400",
    fontSize: scaleFont(18),
    color: "#333",
    textDecorationLine: "underline",
    textDecorationColor: "#333",
  },
  historyIconButton: {
    padding: scaleSpacing(6),
  },
  historyIcon: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    resizeMode: "contain",
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: scaleSpacing(30),
    alignSelf: "center",
    width: "100%",
    maxWidth:
      deviceCategory === "tablet" ? scaleWidth(520) : undefined,
  },
  sectionLabel: {
    fontWeight: "600",
    fontSize: scaleFont(18),
    color: "#333",
    marginTop: scaleSpacing(6),
    marginBottom: scaleSpacing(8),
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleBorderRadius(16),
    paddingLeft: scaleSpacing(18),
    paddingRight: scaleSpacing(8),
    paddingVertical: scaleSpacing(10),
    marginBottom: scaleSpacing(18),
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: scaleSpacing(8),
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 2,
    borderColor: "#CFF6EB",
  },
  textInput: {
    flex: 1,
    fontWeight: "400",
    fontSize: scaleFont(18),
    color: "#333",
    paddingVertical: scaleSpacing(6),
  },
  inlineAddButton: {
    backgroundColor: "#2D7778",
    borderRadius: scaleBorderRadius(10),
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(16),
    borderWidth: 2,
    borderColor: "#245F60",
  },
  inlineAddButtonDisabled: {
    opacity: 0.55,
  },
  inlineAddButtonText: {
    fontWeight: "600",
    fontSize: scaleFont(17),
    color: "#FFFFFF",
  },
  blockedList: {
    marginTop: scaleSpacing(2),
    marginBottom: scaleSpacing(8),
    flexGrow: 1,
  },
  blockedListContent: {
    paddingBottom: scaleSpacing(4),
  },
  historyModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleBorderRadius(20),
    padding: scaleSpacing(20),
    width: "84%",
    maxWidth: scaleWidth(420),
    maxHeight: height > 760 ? scaleSpacing(520) : scaleSpacing(420),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: scaleSpacing(12),
    elevation: 8,
    borderWidth: 2,
    borderColor: "#CFF6EB",
  },
  historyModalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleSpacing(12),
  },
  historyModalTitle: {
    fontSize: scaleFont(22),
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Fredoka_700Bold",
  },
  historyModalCloseIconButton: {
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(2),
  },
  historyModalCloseIconText: {
    fontSize: scaleFont(22),
    color: "#4A4A4A",
    fontFamily: "Fredoka_700Bold",
  },
  historyList: {
    marginTop: scaleSpacing(2),
    marginBottom: scaleSpacing(14),
    width: "100%",
    maxHeight: height > 760 ? scaleSpacing(340) : scaleSpacing(250),
    borderRadius: scaleBorderRadius(14),
    borderWidth: 1,
    borderColor: "#CFF6EB",
    backgroundColor: "#FFFFFF",
  },
  historyListContent: {
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(10),
  },
  historyRow: {
    paddingVertical: scaleSpacing(6),
    borderBottomWidth: 1,
    borderBottomColor: "#EAF7F3",
  },
  historyText: {
    fontFamily: "Fredoka_400Regular",
    fontSize: scaleFont(16),
    color: "#203A3A",
  },
  historyDateText: {
    fontFamily: "Fredoka_400Regular",
    fontSize: scaleFont(12),
    color: "#5E6C67",
    marginTop: scaleSpacing(2),
  },
  historyEmptyText: {
    fontFamily: "Fredoka_400Regular",
    fontSize: scaleFont(15),
    color: "#5E6C67",
    textAlign: "center",
    paddingVertical: scaleSpacing(10),
  },
  historyClearButton: {
    backgroundColor: "#2D7778",
    paddingVertical: scaleSpacing(12),
    borderRadius: scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderWidth: 2,
    borderColor: "#245F60",
  },
  historyClearButtonText: {
    fontSize: scaleFont(16),
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(6),
    marginBottom: scaleSpacing(8),
  },
  wordText: {
    fontWeight: "400",
    fontSize: scaleFont(18),
    color: "#333",
  },
  trashButton: {
    padding: scaleSpacing(6),
  },
  trashIcon: {
    width: scaleWidth(22),
    height: scaleWidth(22),
    tintColor: "#2F7D7B",
  },
  resetButton: {
    marginTop: scaleSpacing(12),
    backgroundColor: "#2D7778",
    borderRadius: scaleBorderRadius(24),
    paddingVertical: scaleSpacing(14),
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: scaleSpacing(8),
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 2,
    borderColor: "#245F60",
  },
  resetButtonText: {
    fontWeight: "600",
    fontSize: scaleFont(18),
    color: "#FFFFFF",
  },
  resetModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  resetModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleBorderRadius(20),
    padding: scaleSpacing(24),
    width: "80%",
    maxWidth: scaleWidth(360),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: scaleSpacing(12),
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFB3BA",
  },
  resetIconCircle: {
    width: scaleWidth(70),
    height: scaleWidth(70),
    borderRadius: scaleBorderRadius(35),
    backgroundColor: "#FFE5E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scaleSpacing(16),
  },
  resetIcon: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    resizeMode: "contain",
  },
  resetModalTitle: {
    fontSize: scaleFont(18),
    fontWeight: "700",
    color: "#333",
    marginBottom: scaleSpacing(8),
  },
  resetModalMessage: {
    fontSize: scaleFont(16),
    color: "#333",
    textAlign: "center",
    lineHeight: scaleSpacing(20),
    marginBottom: scaleSpacing(20),
    fontWeight: "400",
    paddingHorizontal: scaleSpacing(8),
    flexWrap: "wrap",
  },
  resetModalButtons: {
    flexDirection: "row",
    gap: scaleSpacing(12),
    width: "100%",
  },
  resetCancelButton: {
    flex: 1,
    backgroundColor: "#D3D3D3",
    paddingVertical: scaleSpacing(12),
    borderRadius: scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
  },
  resetCancelButtonText: {
    fontSize: scaleFont(18),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  resetConfirmButton: {
    flex: 1,
    backgroundColor: "#FF6B7A",
    paddingVertical: scaleSpacing(12),
    borderRadius: scaleBorderRadius(50),
    alignItems: "center",
    justifyContent: "center",
  },
  resetConfirmButtonText: {
    fontSize: scaleFont(18),
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
