import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
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

// 🎯 Predefined Kid-Safe Categories
// Note: Some use search queries, some use channel IDs to fetch ALL videos from specific channels
const KIDS_CATEGORIES = [
  { id: 'nursery', label: '🎵 Nursery Rhymes', query: 'nursery rhymes for kids', channelId: null },
  { id: 'cocomelon', label: '🎈 Cocomelon', query: 'cocomelon kids songs', channelId: 'UCY1kMZp36IQSyNx_9h3xtsQ' }, // Cocomelon - Nursery Rhymes
  { id: 'counting', label: '🔢 Counting Songs', query: 'counting songs for kids', channelId: null },
  { id: 'alphabet', label: '🔤 ABC Songs', query: 'alphabet songs for kids', channelId: null },
  { id: 'colors', label: '🌈 Colors & Shapes', query: 'colors and shapes for kids', channelId: null },
  { id: 'animals', label: '🐶 Animal Songs', query: 'animal songs for kids', channelId: null },
  { id: 'cartoons', label: '🎬 Cartoons', query: 'kids cartoons youtube', channelId: null },
  { id: 'bluey', label: '💙 Bluey', query: 'bluey cartoon for kids', channelId: 'UCqwZ0D-j64xnJEJZeZ7e5rw' }, // Official Bluey
  { id: 'peppa', label: '🐷 Peppa Pig', query: 'peppa pig cartoon', channelId: 'UCXb__pNKuCYjL1b5r7-WtDw' }, // Peppa Pig Official
  { id: 'paw', label: '🐾 Paw Patrol', query: 'paw patrol kids show', channelId: 'UCXjj1GIWZvDRAJYmddVxLDQ' }, // PAW Patrol Official
  { id: 'disney', label: '✨ Disney', query: 'disney junior kids videos', channelId: 'UCIxJVwG_c1Jdm6HNGjqz3LQ' }, // Disney Junior
];

export default function Media() {
  // Get responsive dimensions and scaling functions
  const responsive = useResponsiveDimensions();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  const router = useRouter();
  const { mode, parentalLockEnabled, enterParentMode, backToChildMode } = useMode();
  
  const [selectedCategory, setSelectedCategory] = useState('nursery');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBadWords, setHasBadWords] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [videosByCategory, setVideosByCategory] = useState<Record<string, YouTubeVideo[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkRetryTimer, setNetworkRetryTimer] = useState<number | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  // Parental Lock Modal
  const [showParentalLockModal, setShowParentalLockModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinShake = useRef(new Animated.Value(0)).current;
  const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear all parental lock authentication when navigating to MEDIA
  useFocusEffect(
    React.useCallback(() => {
      ParentalLockAuthService.onNavigateToPublicTab();
    }, [])
  );

  // Load all videos on mount
  useEffect(() => {
    loadAllCategoryVideos();

    const networkListener = setupNetworkListener();

    const retryTimer = setInterval(() => {
      if (error && error.includes('internet connection')) {
        console.log('🔄 Auto-retrying due to previous network error...');
        clearNetworkCache();
        loadAllCategoryVideos();
      }
    }, 10000);

    setNetworkRetryTimer(retryTimer);

    return () => {
      networkListener?.();
      if (retryTimer) clearInterval(retryTimer);
    };
  }, []);

  // Switch category instantly from cached videos
  useEffect(() => {
    if (videosByCategory[selectedCategory]) {
      setVideos(videosByCategory[selectedCategory]);
      setSearchQuery(''); // Clear search when changing category
      setHasBadWords(false); // Reset bad words flag
    }
  }, [selectedCategory, videosByCategory]);

  // Reset bad words flag when search query becomes empty
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setHasBadWords(false);
    }
  }, [searchQuery]);

  // Bad words list in multiple languages
  const BAD_WORDS = [
    // English
    'fuck', 'shit', 'ass', 'damn', 'crap', 'bitch', 'bastard', 'asshole', 'dick', 'cock', 'pussy', 'whore', 'slut',
    'motherfucker', 'prick', 'wanker', 'bollocks', 'twat', 'arsehole', 'jerk', 'cunt', 'hell', 'piss', 'sucks',
    // Sexual/Explicit terms
    'sex', 'porn', 'xxx', 'creampie', 'orgasm', 'ejaculation', 'cumshot', 'blowjob', 'handjob', 'deepthroat',
    'bondage', 'bdsm', 'fetish', 'gangbang', 'bestiality', 'pedophile', 'rape', 'incest', 'horny', 'hornyy',
    'pinaypie', 'sulasoktv', 'tuwad', 'bembang', 'jakol', 'hentai', 'nude', 'boobs', 'breast', 'masturbate',
    'vibrator', 'dildo', 'anal', 'threesome', 'foursome', 'orgy', 'prostitute', 'pimp', 'escort',
    // Filipino/Tagalog - Extensive list
    'putang', 'bobo', 'gago', 'bayag', 'tite', 'etits', 'puta', 'kantot', 'labas', 'suso', 'iyak',
    'pakyu', 'tang', 'ulo', 'ulol', 'animal', 'hayop', 'buwaya', 'tsibog', 'lintik', 'titi', 'burat',
    'tarub', 'kantutan', 'putanginamo', 'putangina', 'kingina', 'kinginamo', 'ogag', 'kupal', 'pepe',
    'kiffy', 'puday', 'butas', 'kepwet', 'kalabit', 'yusang', 'labong', 'kolokoy', 'ari', 'tol',
    'ulok', 'talunan', 'tanga', 'bete', 'gusto', 'iyot', 'bugok', 'ampaw', 'kalamay', 'bukid',
    // Spanish
    'puta', 'pendejo', 'jodido', 'mierda', 'culo', 'pene', 'verga', 'carajo', 'pinche', 'cabron',
    // Violence/Dangerous
    'hate', 'kill', 'death', 'bomb', 'gun', 'drug', 'addict', 'cocaine', 'heroin', 'meth', 'cannabis',
    'suicide', 'murder', 'rape', 'assault', 'kidnap', 'torture', 'terrorism'
  ];

  const containsBadWords = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return BAD_WORDS.some(word => lowerText.includes(word));
  };

  // Dynamic search - fetch from YouTube when user types
  const performDynamicSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, show pre-loaded videos
      setVideos(videosByCategory[selectedCategory] || []);
      setSearchLoading(false);
      setHasBadWords(false);
      return;
    }

    setSearchLoading(true);
    try {
      const currentCategory = KIDS_CATEGORIES.find(cat => cat.id === selectedCategory);
      if (currentCategory) {
        // Search for videos with query + category name
        const searchTerm = `${query} ${currentCategory.query}`;
        console.log(`Dynamic search: ${searchTerm}`);
        const dynamicResults = await YouTubeKidsService.searchKidsVideos(searchTerm, 20, 100);
        setVideos(dynamicResults);
      }
    } catch (err) {
      console.error('Error in dynamic search:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // If search is empty, reset bad words flag immediately
    if (!text.trim()) {
      setHasBadWords(false);
      setVideos(videosByCategory[selectedCategory] || []);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      return;
    }

    // Check for bad words
    if (containsBadWords(text)) {
      setHasBadWords(true);
      Vibration.vibrate([100, 50, 100]); // Vibrate pattern
      
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      return;
    }

    setHasBadWords(false);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search by 500ms
    searchTimeoutRef.current = setTimeout(() => {
      performDynamicSearch(text);
    }, 500);
  };

  // Filter videos based on search query (for local filtering if needed)
  const filteredVideos = videos;

  // Use index as key to allow duplicate video IDs across categories
  const renderVideos = filteredVideos.map((video, index) => ({
    ...video,
    uniqueKey: `${video.id}-${index}`
  }));

  const loadAllCategoryVideos = async () => {
    console.log('=== loadAllCategoryVideos called ===');
    try {
      setLoading(true);
      setError(null);
      
      const allVideos: Record<string, YouTubeVideo[]> = {};
      
      // Load videos for all categories in parallel
      await Promise.all(
        KIDS_CATEGORIES.map(async (category) => {
          try {
            let fetchedVideos: YouTubeVideo[] = [];
            
            if (category.channelId) {
              // Try to fetch ALL videos from specific channel
              console.log('Fetching ALL videos from channel:', category.id);
              fetchedVideos = await YouTubeKidsService.getVideosByChannel(category.channelId);
              console.log(`Loaded ${fetchedVideos.length} videos for ${category.id} (from channel)`);
              
              // If channel fetch returns empty, fallback to search
              if (fetchedVideos.length === 0) {
                console.log(`No videos from channel, falling back to search for: ${category.query}`);
                fetchedVideos = await YouTubeKidsService.searchKidsVideos(category.query);
                console.log(`Fallback search returned ${fetchedVideos.length} videos for ${category.id}`);
              }
            } else {
              // Search for videos using query
              console.log('Searching videos for:', category.query);
              fetchedVideos = await YouTubeKidsService.searchKidsVideos(category.query);
              console.log(`Loaded ${fetchedVideos.length} videos for ${category.id} (from search)`);
            }
            
            allVideos[category.id] = fetchedVideos;
          } catch (err) {
            console.error(`Error loading ${category.id}:`, err);
            allVideos[category.id] = [];
          }
        })
      );
      
      setVideosByCategory(allVideos);
      // Set initial videos for selected category
      if (allVideos[selectedCategory]) {
        setVideos(allVideos[selectedCategory]);
      }
    } catch (err) {
      console.error('Error loading all category videos:', err);
      setError('Failed to load videos. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    clearNetworkCache();
    await loadAllCategoryVideos();
    setRefreshing(false);
  };

  // Parental Lock PIN handlers
  const handlePinInput = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setPinError('');

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === '' && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const triggerPinShake = () => {
    pinShake.setValue(0);
    Animated.sequence([
      Animated.timing(pinShake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(pinShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const unlockAccess = async () => {
    if (pin.every(digit => digit !== '')) {
      const inputPin = pin.join('');
      const isValid = await ParentalLockService.verifyPin(inputPin);
      
      if (isValid) {
        setShowParentalLockModal(false);
        setPin(['', '', '', '']);
        setPinError('');
        // Authenticate all parent tabs to trigger mode switch
        ParentalLockAuthService.setAuthenticated(true, 'progress');
        ParentalLockAuthService.setAuthenticated(true, 'addRoutines');
        ParentalLockAuthService.setAuthenticated(true, 'settings');
        enterParentMode();
        // Navigate to addRoutines page
        router.push('/(tabs)/addRoutines');
      } else {
        setPinError('Incorrect PIN. Please try again.');
        Vibration.vibrate(150);
        triggerPinShake();
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    } else {
      setPinError('Please enter all 4 digits.');
      triggerPinShake();
    }
  };

  const cancelAccess = () => {
    setShowParentalLockModal(false);
    setPin(['', '', '', '']);
    setPinError('');
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require("../../assets/background.png")}
        style={styles.backgroundImage}
        resizeMode="stretch"
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
                source={mode === 'child' ? require("../../assets/images/Parents.png") : require("../../assets/images/Child.png")} 
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
      <View style={[styles.searchBarContainer, hasBadWords && styles.searchBarContainerError]}>
        <Ionicons name="search" size={20} color={hasBadWords ? "#FF6B6B" : "#999"} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, hasBadWords && styles.searchInputError]}
          placeholder="Search in this category..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {(searchQuery.length > 0 || searchLoading) && (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setHasBadWords(false);
            setVideos(videosByCategory[selectedCategory] || []);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
          }}>
            {searchLoading ? (
              <ActivityIndicator size="small" color="#999" />
            ) : (
              <Ionicons name="close-circle" size={20} color="#999" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 🎯 Category Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        scrollEnabled={true}
      >
        {KIDS_CATEGORIES.map((category) => (
          <View key={category.id} style={{ flex: 0, flexShrink: 0 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.categoryButtonTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* 📺 Video List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
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
            <TouchableOpacity style={styles.retryButton} onPress={() => loadAllCategoryVideos()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && renderVideos.map((video) => (
          <View key={video.uniqueKey} style={styles.videoContainer}>
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

        {!loading && !error && videos.length === 0 && (
          <Text style={styles.noResults}>No videos found.</Text>
        )}

        {!loading && !error && videos.length > 0 && filteredVideos.length === 0 && (
          <Text style={styles.noResults}>No videos match your search in this category.</Text>
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
                
                <Animated.View style={[styles.pinContainer, pinError ? { transform: [{ translateX: pinShake }] } : null]}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinRefs[index]}
                      style={[
                        styles.pinInput,
                        digit ? styles.pinInputFilled : null,
                        pinError ? styles.pinInputError : null
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
                </Animated.View>

                <TouchableOpacity 
                  style={styles.forgotPin}
                  onPress={() => {
                    router.push('/parental-lock-new-pin');
                  }}
                >
                  <Text style={styles.forgotPinText}>Forgot PIN?</Text>
                </TouchableOpacity>

                {pinError ? (
                  <Text style={styles.pinErrorText}>{pinError}</Text>
                ) : null}
                
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
    paddingBottom: scale.scaleSpacing(16),
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
    backgroundColor: 'transparent',
    paddingHorizontal: scale.scaleSpacing(20),
    paddingVertical: scale.scaleSpacing(12),
    borderRadius: 20,
    marginTop: scale.scaleSpacing(10),
    alignSelf: 'flex-end',
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(8),
  },
  modeButtonText: {
    color: '#2F7C72',
    fontSize: scale.scaleFont(16),
    fontWeight: '600',
    fontFamily: 'Fredoka_600SemiBold',
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
  modeButtonIcon: {
    width: scale.scaleWidth(20),
    height: scale.scaleHeight(20),
    resizeMode: 'contain',
    tintColor: '#2F7C72',
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    marginHorizontal: scale.scaleSpacing(18),
    marginBottom: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(10),
  },

  // 🎯 Category Styles
  categoriesContainer: {
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(16),
    paddingBottom: scale.scaleSpacing(20),
    gap: scale.scaleSpacing(8),
    flexGrow: 0,
  },
  // 🔍 Search Bar Styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: scale.scaleSpacing(16),
    marginVertical: scale.scaleSpacing(12),
    paddingHorizontal: scale.scaleSpacing(12),
    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 1,
    borderColor: '#DDD',
    height: scale.scaleHeight(48),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowRadius: scale.scaleSpacing(4),
    elevation: 2,
  },
  searchBarContainerError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  searchIcon: {
    marginRight: scale.scaleSpacing(10),
  },
  searchInput: {
    flex: 1,
    fontSize: scale.scaleFont(14),
    color: '#333',
    paddingVertical: scale.scaleSpacing(8),
  },
  searchInputError: {
    color: '#FF6B6B',
  },
  categoryButton: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: scale.scaleSpacing(20),
    paddingVertical: scale.scaleSpacing(12),

    borderRadius: scale.scaleBorderRadius(25),
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: scale.scaleHeight(48),
  },
  categoryButtonActive: {
    backgroundColor: '#5A8F8A',
    borderColor: '#4A7D77',
  },
  categoryButtonText: {
    fontSize: scale.scaleFont(13),
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoContainer: {
    backgroundColor: "#fafafa",

    marginHorizontal: scale.scaleSpacing(12),
    marginBottom: scale.scaleSpacing(24),
    marginTop: scale.scaleSpacing(8),

    marginHorizontal: scale.scaleSpacing(18),
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
    maxWidth: scale.scaleWidth(600),
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
  pinInputError: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFE6E6",
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
  pinErrorText: {
    color: "#FF6B6B",
    fontSize: scale.scaleFont(14),
    fontWeight: "600",
    fontFamily: "Fredoka_600SemiBold",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(12),
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

