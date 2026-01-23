import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { useMode } from "../../src/contexts/ModeContext";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { clearNetworkCache, setupNetworkListener } from "../../src/utils/networkUtils";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";
import type { YouTubeVideo } from "../../src/youtubeKidsService";
import { YouTubeKidsService } from "../../src/youtubeKidsService";

type PlayerState =
  | "unstarted"
  | "playing"
  | "paused"
  | "ended"
  | "buffering"
  | "cued";

export default function Media() {
  // Get responsive dimensions and scaling functions
  const responsive = useResponsiveDimensions();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  const router = useRouter();
  const { mode, parentalLockEnabled, enterParentMode, backToChildMode } = useMode();
  
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const [networkRetryTimer, setNetworkRetryTimer] = useState<number | null>(null);
  // Parental Lock Modal
  const [showParentalLockModal, setShowParentalLockModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  // Clear all parental lock authentication when navigating to MEDIA
  useFocusEffect(
    React.useCallback(() => {
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [])
  );

  // Load initial videos
  useEffect(() => {
    loadVideos();

    // Setup network listener to auto-retry when network comes back
    const networkListener = setupNetworkListener();

    // Set up automatic retry when network is restored
    const retryTimer = setInterval(() => {
      if (error && error.includes('internet connection')) {
        console.log('🔄 Auto-retrying due to previous network error...');
        clearNetworkCache(); // Clear any cached network state
        loadVideos(); // Retry loading videos
      }
    }, 10000); // Check every 10 seconds

    setNetworkRetryTimer(retryTimer);

    return () => {
      networkListener?.();
      if (retryTimer) clearInterval(retryTimer);
    };
  }, [error]);

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (search.trim()) {
        searchVideos(search.trim());
      } else {
        loadVideos();
      }
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [search]);

  const loadVideos = async () => {
    console.log('=== loadVideos called ===');
    try {
      setError(null);
      console.log('Calling YouTubeKidsService.getRandomKidsVideos...');
      const fetchedVideos = await YouTubeKidsService.getRandomKidsVideos(20);
      console.log('Fetched videos:', fetchedVideos);
      console.log('Number of videos:', fetchedVideos.length);
      setVideos(fetchedVideos);
      console.log('Videos set in state');
    } catch (err) {
      console.error('Error in loadVideos:', err);
      setError('Failed to load videos. Please check your internet connection.');
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  const searchVideos = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const searchResults = await YouTubeKidsService.searchKidsVideos(query, 15);
      setVideos(searchResults);
    } catch (err) {
      setError('Failed to search videos. Please try again.');
      console.error('Error searching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSearch(""); // Clear search when refreshing
    clearNetworkCache(); // Clear network cache for fresh check
    await loadVideos();
    setRefreshing(false);
  };

  const filteredVideos = videos;

  // Parental Lock PIN handlers
  const handlePinInput = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === '' && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const unlockAccess = async () => {
    if (pin.every(digit => digit !== '')) {
      const inputPin = pin.join('');
      const isValid = await ParentalLockService.verifyPin(inputPin);
      
      if (isValid) {
        setShowParentalLockModal(false);
        setPin(['', '', '', '']);
        // Authenticate all parent tabs to trigger mode switch
        ParentalLockAuthService.setAuthenticated(true, 'progress');
        ParentalLockAuthService.setAuthenticated(true, 'addRoutines');
        ParentalLockAuthService.setAuthenticated(true, 'settings');
        enterParentMode();
        // Navigate to addRoutines page
        router.push('/(tabs)/addRoutines');
      } else {
        Alert.alert("Incorrect PIN", "Please try again.");
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } else {
      Alert.alert("Incomplete PIN", "Please enter all 4 digits.");
    }
  };

  const cancelAccess = () => {
    setShowParentalLockModal(false);
    setPin(['', '', '', '']);
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/home')}
          disabled={mode === 'parent'}
          activeOpacity={mode === 'parent' ? 1 : 0.7}
        >
          <Image
            source={require("../../assets/images/ritmoNameLogo.png")}
            style={styles.brandLogo}
          />
        </TouchableOpacity>
        {parentalLockEnabled && (
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => {
              if (mode === 'child') {
                setShowParentalLockModal(true);
              } else {
                backToChildMode();
              }
            }}
          >
            <View style={styles.modeButtonContent}>
              <Image 
                source={mode === 'child' ? require("../../assets/images/user 2.png") : require("../../assets/images/BoyQ.png")} 
                style={styles.modeButtonIcon}
              />
              <Text style={styles.modeButtonText}>
                {mode === 'child' ? 'Parent Mode' : 'Back to Child Mode'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 🔍 Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* 📺 Video List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5A8F8A" />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {(() => {
          console.log('Render check:', { loading, error: !!error, videosLength: filteredVideos.length, videos: filteredVideos });
          return null;
        })()}
        {!loading && !error && filteredVideos.map((video) => (
          <View key={video.id} style={styles.videoContainer}>
            {playingId === video.id ? (
              <YoutubePlayer
                height={200}
                play={true}
                videoId={video.youtubeId}
                onChangeState={(event: PlayerState) => {
                  if (event === "ended") setPlayingId(null);
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />
            ) : (
              <TouchableOpacity onPress={() => setPlayingId(video.id)}>
                <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                <View style={styles.playButton}>
                  <Ionicons name="play-circle" size={64} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            {/* 📝 Video Description */}
            <View style={styles.videoInfo}>
              <Image source={{ uri: video.channelIcon }} style={styles.channelIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={styles.videoMeta}>
                  {video.channel} • {video.views} • {video.publishedAt}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={18} color="#666" />
            </View>
          </View>
        ))}

        {!loading && !error && filteredVideos.length === 0 && (
          <Text style={styles.noResults}>No videos found.</Text>
        )}
      </ScrollView>

      {/* Parental Lock Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showParentalLockModal}
        onRequestClose={cancelAccess}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <ImageBackground
            source={require("../../assets/background.png")}
            style={styles.modalBackground}
            resizeMode="cover"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.lockIconContainer}>
                  <Ionicons name="lock-closed" size={48} color="#4A5568" />
                </View>
                
                <Text style={styles.modalTitle}>Parental Lock</Text>
                <Text style={styles.modalSubtitle}>
                  Access restricted to parents{'\n'}or guardians only
                </Text>

                <Text style={styles.modalContentTitle}>
                  Please enter your 4-digit PIN to continue
                </Text>
                
                <View style={styles.pinContainer}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinRefs[index]}
                      style={[
                        styles.pinInput,
                        digit ? styles.pinInputFilled : null
                      ]}
                      value={digit}
                      onChangeText={(value) => handlePinInput(index, value)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace') {
                          handleBackspace(index, digit);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={1}
                      secureTextEntry
                      textAlign="center"
                      selectTextOnFocus={true}
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.forgotPin}
                  onPress={() => {
                    router.push('/parental-lock-new-pin');
                  }}
                >
                  <Text style={styles.forgotPinText}>Forgot PIN?</Text>
                </TouchableOpacity>
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.unlockButton} onPress={unlockAccess}>
                    <Text style={styles.unlockText}>Unlock Access</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelAccess}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>
      </Modal>
    </View>
  );
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: scale.scaleSpacing(30),
    paddingHorizontal: scale.scaleSpacing(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogo: {
    width: scale.scaleWidth(120),
    height: scale.scaleHeight(30),
    resizeMode: "contain",
    marginLeft: scale.scaleSpacing(-22),
  },
  modeButton: {
    backgroundColor: '#B8E6E1',
    paddingHorizontal: scale.scaleSpacing(20),
    paddingVertical: scale.scaleSpacing(12),
    borderRadius: 20,
    marginTop: scale.scaleSpacing(10),
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(8),
  },
  modeButtonText: {
    color: '#2F7C72',
    fontSize: scale.scaleFont(14),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modeButtonIcon: {
    width: scale.scaleWidth(16),
    height: scale.scaleHeight(16),
    resizeMode: 'contain',
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    marginHorizontal: scale.scaleSpacing(12),
    marginBottom: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(10),
    borderRadius: scale.scaleBorderRadius(25),
    height: scale.scaleHeight(40),
  },
  searchInput: {
    flex: 1,
    marginLeft: scale.scaleSpacing(8),
    fontSize: scale.scaleFont(16),
    color: "#000",
  },
  videoContainer: {
    backgroundColor: "#fafafa",
    marginHorizontal: scale.scaleSpacing(12),
    marginBottom: scale.scaleSpacing(16),
    borderRadius: scale.scaleBorderRadius(12),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowRadius: scale.scaleSpacing(4),
    elevation: 2,
  },
  thumbnail: {
    width: "100%",
    height: scale.scaleHeight(200),
    backgroundColor: "#ccc",
  },
  playButton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: scale.scaleSpacing(10),
    paddingVertical: scale.scaleSpacing(8),
  },
  channelIcon: {
    width: scale.scaleWidth(40),
    height: scale.scaleHeight(40),
    borderRadius: scale.scaleBorderRadius(20),
    marginRight: scale.scaleSpacing(10),
  },
  videoTitle: {
    fontSize: scale.scaleFont(15),
    fontWeight: "600",
    color: "#000",
  },
  videoMeta: {
    fontSize: scale.scaleFont(13),
    color: "#666",
    marginTop: scale.scaleSpacing(2),
  },
  noResults: {
    textAlign: "center",
    color: "#666",
    marginTop: scale.scaleSpacing(20),
    fontSize: scale.scaleFont(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: scale.scaleSpacing(50),
  },
  loadingText: {
    marginTop: scale.scaleSpacing(10),
    fontSize: scale.scaleFont(16),
    color: "#666",
    fontFamily: "ITIM",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: scale.scaleSpacing(50),
    paddingHorizontal: scale.scaleSpacing(20),
  },
  errorText: {
    marginTop: scale.scaleSpacing(15),
    fontSize: scale.scaleFont(16),
    color: "#666",
    textAlign: "center",
    fontFamily: "ITIM",
  },
  retryButton: {
    marginTop: scale.scaleSpacing(20),
    backgroundColor: "#5A8F8A",
    paddingHorizontal: scale.scaleSpacing(30),
    paddingVertical: scale.scaleSpacing(12),
    borderRadius: scale.scaleBorderRadius(25),
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    fontFamily: "ITIM",
  },
  // Parental Lock Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: scale.scaleSpacing(20),
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(35),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(8) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 12,
    width: "90%",
    maxWidth: scale.scaleWidth(350),
  },
  lockIconContainer: {
    marginBottom: scale.scaleSpacing(20),
    opacity: 0.7,
  },
  modalTitle: {
    fontSize: scale.scaleFont(28),
    fontWeight: "700",
    fontFamily: "Fredoka_700Bold",
    color: "#333",
    marginBottom: scale.scaleSpacing(8),
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: scale.scaleFont(16),
    fontWeight: "400",
    fontFamily: "Fredoka_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(25),
    lineHeight: scale.scaleHeight(22),
  },
  modalContentTitle: {
    fontSize: scale.scaleFont(14),
    fontWeight: "600",
    fontFamily: "Fredoka_600SemiBold",
    color: "#555",
    marginBottom: scale.scaleSpacing(25),
    textAlign: "center",
    lineHeight: scale.scaleHeight(20),
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: scale.scaleSpacing(25),
    gap: scale.scaleSpacing(12),
  },
  pinInput: {
    width: scale.scaleWidth(55),
    height: scale.scaleHeight(55),
    borderRadius: scale.scaleBorderRadius(12),
    backgroundColor: "#F7F7F7",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    textAlign: "center",
    fontSize: scale.scaleFont(24),
    fontWeight: "600",
    color: "#333",
    fontFamily: "Fredoka_500Medium",
  },
  pinInputFilled: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  forgotPin: {
    marginBottom: scale.scaleSpacing(30),
  },
  forgotPinText: {
    fontSize: scale.scaleFont(14),
    fontWeight: "500",
    color: "#007AFF",
    textDecorationLine: "underline",
    fontFamily: "Fredoka_700Bold",
  },
  buttonContainer: {
    width: "100%",
    gap: scale.scaleSpacing(12),
  },
  unlockButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: scale.scaleSpacing(15),
    paddingHorizontal: scale.scaleSpacing(25),
    borderRadius: scale.scaleBorderRadius(25),
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 6,
  },
  unlockText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(25),
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: scale.scaleFont(16),
    fontWeight: "600",
    color: "#666",
    fontFamily: "Fredoka_600SemiBold",
  },
}));
