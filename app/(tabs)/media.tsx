import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { getBlockedWords, subscribeToBlockedWords } from "../../src/blockedWordsService";

import { useMode } from "../../src/contexts/ModeContext";
import { addMediaSearchHistory } from "../../src/mediaSearchHistoryService";
import { MediaTimeLimitService } from "../../src/mediaTimeLimitService";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { clearNetworkCache, setupNetworkListener } from "../../src/utils/networkUtils";
import { createResponsiveStyles, getDeviceCategory, useResponsiveDimensions } from "../../src/utils/responsive";
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
  
  // Determine video player size based on card width and 16:9 ratio
  const deviceCategory = getDeviceCategory();
  const cardHorizontalMargin = scaleSpacing(18);
  const videoPlayerWidth = Math.max(0, responsive.width - cardHorizontalMargin * 2);
  const videoPlayerHeight = Math.round(videoPlayerWidth * 9 / 16);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBadWords, setHasBadWords] = useState(false);
  const [customBlockedWords, setCustomBlockedWords] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
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

  // Media Time Limit
  const [isMediaLocked, setIsMediaLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showCallMommyModal, setShowCallMommyModal] = useState(false);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const CACHE_KEY = 'mediaCache:main';
  
  // Safe channel IDs
  const SAFE_CHANNELS = [
    'UCBXVGODxUHmsEsGgUFQgqQw', // Ms Rachel
    'UCbCmjCuTUZos6Inko4u57UQ', // Cocomelon
  ];

  const loadCustomBlockedWords = async () => {
    try {
      const words = await getBlockedWords();
      setCustomBlockedWords(words);
    } catch (err) {
      console.warn('Failed to load custom blocked words:', err);
      setCustomBlockedWords([]);
    }
  };

  // Check if media is locked
  const checkMediaTimeLimit = async () => {
    try {
      const locked = await MediaTimeLimitService.isMediaLocked();
      setIsMediaLocked(locked);

      if (!locked) {
        const remaining = await MediaTimeLimitService.getRemainingTime();
        setRemainingTime(remaining);
        setShowCallMommyModal(false); // Reset modal state when not locked
      }
    } catch (err) {
      console.error('Error checking media time limit:', err);
    }
  };

  // Start timer to track time limit
  const startTimeLimitTimer = () => {
    // Clear any existing timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Check immediately
    checkMediaTimeLimit();

    // Check every second and decrement time (only runs when on media page)
    timerInterval.current = setInterval(async () => {
      const locked = await MediaTimeLimitService.isMediaLocked();
      setIsMediaLocked(locked);

      if (locked) {
        await MediaTimeLimitService.lockMedia();
        if (timerInterval.current) {
          clearInterval(timerInterval.current);
          timerInterval.current = null;
        }
      } else {
        // Decrement time by 1 second (this pauses when user leaves the page)
        await MediaTimeLimitService.decrementTime();

        // Get updated remaining time
        const remaining = await MediaTimeLimitService.getRemainingTime();
        setRemainingTime(remaining);

        // Show warning when less than 5 minutes remaining
        if (remaining > 0 && remaining <= 300 && !showTimeWarning) {
          setShowTimeWarning(true);
        }
        if (remaining > 300 && showTimeWarning) {
          setShowTimeWarning(false);
        }
      }
    }, 1000);
  };

  // Format remaining time for display
  const formatRemainingTime = (seconds: number): string => {
    if (seconds <= 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Clear all parental lock authentication when navigating to MEDIA
  useFocusEffect(
    React.useCallback(() => {
      ParentalLockAuthService.onNavigateToPublicTab();
      checkMediaTimeLimit();
      setShowCallMommyModal(false); // Reset to show Time's Up modal first
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      loadCustomBlockedWords();

      // Start timer when page is focused
      startTimeLimitTimer();

      return () => {
        // Clear timer when page loses focus
        if (timerInterval.current) {
          clearInterval(timerInterval.current);
          timerInterval.current = null;
        }
      };
    }, [])
  );

  // Load videos on mount
  useEffect(() => {
    const init = async () => {
      await loadCachedVideos();
      loadVideos();
    };

    init();

    const networkListener = setupNetworkListener();

    const retryTimer = setInterval(() => {
      if (error && error.includes('internet connection')) {
        console.log('🔄 Auto-retrying due to previous network error...');
        clearNetworkCache();
        loadVideos();
      }
    }, 10000);

    setNetworkRetryTimer(retryTimer);

    // Subscribe to real-time blocked words updates
    const unsubscribeBlockedWords = subscribeToBlockedWords((words) => {
      setCustomBlockedWords(words);
    });

    return () => {
      networkListener?.();
      if (retryTimer) clearInterval(retryTimer);
      unsubscribeBlockedWords();
    };
  }, []);



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

  const combinedBadWords = useMemo(() => {
    const normalizedCustom = customBlockedWords
      .map(word => word.toLowerCase().trim())
      .filter(Boolean);
    return Array.from(new Set([...BAD_WORDS, ...normalizedCustom]));
  }, [customBlockedWords]);

  const containsBadWords = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return combinedBadWords.some(word => lowerText.includes(word));
  };

  // Dynamic search - fetch from YouTube when user types
  const performDynamicSearch = async (query: string) => {
    if (!query.trim()) {
      // If search is empty, reload from cache
      await loadCachedVideos();
      setSearchLoading(false);
      setHasBadWords(false);
      return;
    }

    setSearchLoading(true);
    try {
      const searchTerm = `${query} kids`;
      console.log(`Dynamic search: "${searchTerm}" - fetching up to 20 videos`);
      
      const dynamicResults = await YouTubeKidsService.searchKidsVideos(searchTerm, 20, 20);
      
      // Shuffle results for variety
      const shuffled = dynamicResults.sort(() => Math.random() - 0.5);
      
      console.log(`Final search results: ${shuffled.length} videos`);
      setVideos(shuffled.slice(0, 20));
    } catch (err) {
      console.error('Error in dynamic search:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Search input handler (Enter key triggers actual fetch)
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // If search is empty, reset bad words flag immediately
    if (!text.trim()) {
      setHasBadWords(false);
      loadCachedVideos();
      return;
    }

    // Check for bad words
    if (containsBadWords(text)) {
      setHasBadWords(true);
      Vibration.vibrate([100, 50, 100]); // Vibrate pattern
      return;
    }

    setHasBadWords(false);
  };

  const handleSearchSubmit = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    if (containsBadWords(trimmedQuery)) {
      setHasBadWords(true);
      Vibration.vibrate([100, 50, 100]);
      return;
    }

    setHasBadWords(false);
    await addMediaSearchHistory(trimmedQuery);
    await performDynamicSearch(trimmedQuery);
  };

  // Filter videos based on search query (for local filtering if needed)
  const filteredVideos = videos;

  // Use index as key to allow duplicate video IDs across categories
  const renderVideos = filteredVideos.map((video, index) => ({
    ...video,
    uniqueKey: `${video.id}-${index}`
  }));

  const loadCachedVideos = async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: number; videos: YouTubeVideo[] };
        if (parsed?.videos && parsed?.savedAt && Date.now() - parsed.savedAt <= CACHE_TTL_MS) {
          setVideos(parsed.videos);
          console.log(`[loadCached] Showed ${parsed.videos.length} cached videos`);
        }
      }
    } catch (err) {
      console.warn('Failed to load cached videos:', err);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const saveCachedVideos = async (videos: YouTubeVideo[]) => {
    try {
      const savedAt = Date.now();
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ savedAt, videos })
      );
    } catch (err) {
      console.warn('Failed to save cached videos:', err);
    }
  };

  const fetchVideosFromChannels = async (): Promise<YouTubeVideo[]> => {
    try {
      console.log('[LOAD] Fetching from safe channels...');
      
      // Fetch from both channels in parallel
      const results = await Promise.all(
        SAFE_CHANNELS.map(channelId => 
          YouTubeKidsService.getVideosByChannel(channelId, 20, 20).catch(() => [])
        )
      );

      // Combine and deduplicate
      const videoMap = new Map<string, YouTubeVideo>();
      results.forEach(arr => arr.forEach(v => {
        if (!videoMap.has(v.id)) videoMap.set(v.id, v);
      }));

      // Shuffle for variety on each load
      const allVideos = Array.from(videoMap.values()).sort(() => Math.random() - 0.5);
      console.log(`[LOAD] Fetched ${allVideos.length} videos from channels`);
      return allVideos.slice(0, 20);
    } catch (err) {
      console.error('Error fetching videos:', err);
      return [];
    }
  };

  const loadVideos = async () => {
    console.log('=== loadVideos called ===');
    try {
      setError(null);
      const fetchedVideos = await fetchVideosFromChannels();
      if (fetchedVideos.length > 0) {
        setVideos(fetchedVideos);
        saveCachedVideos(fetchedVideos);
        console.log(`[LOAD] Showed ${fetchedVideos.length} videos`);
      }
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos. Please check your internet connection.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    clearNetworkCache();
    
    // If user is searching, re-run the search instead of loading default
    // But only if the search query doesn't contain bad words
    if (searchQuery.trim() && !containsBadWords(searchQuery)) {
      await performDynamicSearch(searchQuery);
    } else {
      await loadVideos();
    }
    
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

      {/* 🔍 Search Bar with Timer */}
      <View style={styles.searchBarRow}>
        <View style={[styles.searchBarContainer, hasBadWords && styles.searchBarContainerError]}>
          <Ionicons name="search" size={20} color={hasBadWords ? "#FF6B6B" : "#999"} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, hasBadWords && styles.searchInputError]}
            placeholder="Search kids videos..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {(searchQuery.length > 0 || searchLoading) && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setHasBadWords(false);
              loadCachedVideos();
            }}>
              {searchLoading ? (
                <ActivityIndicator size="small" color="#999" />
              ) : (
                <Ionicons name="close-circle" size={20} color="#999" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Timer beside search bar */}
        {remainingTime > 0 && !isMediaLocked && (
          <View style={showTimeWarning ? styles.timerWarningBadge : styles.timerBadge}>
            <Ionicons
              name="time-outline"
              size={16}
              color={showTimeWarning ? "#FF9800" : "#4A9B8E"}
            />
            <Text style={showTimeWarning ? styles.timerWarningText : styles.timerText}>
              {formatRemainingTime(remainingTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Bad Words Alert Message */}
      {hasBadWords && searchQuery.trim() !== '' && (
        <View style={styles.badWordsAlertContent}>
          <Ionicons name="alert-circle" size={16} color="#FF6B6B" style={styles.alertIcon} />
          <Text style={styles.badWordsAlertText}>This word is not allowed. Please try a different search.</Text>
        </View>
      )}

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
            <TouchableOpacity style={styles.retryButton} onPress={() => loadVideos()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && renderVideos.map((video) => (
          <View key={video.uniqueKey} style={styles.videoContainer}>
            {playingId === video.id ? (
              <YoutubePlayer
                height={videoPlayerHeight}
                width={videoPlayerWidth}
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
                <Image 
                  source={{ uri: video.thumbnail }} 
                  style={[
                    styles.thumbnail,
                    { height: videoPlayerHeight }
                  ]} 
                  resizeMode="cover"
                />
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

        {!loading && !error && !isBootstrapping && !searchLoading && videos.length === 0 && (
          <Text style={styles.noResults}>No videos found.</Text>
        )}

        {!loading && !error && videos.length > 0 && filteredVideos.length === 0 && (
          <Text style={styles.noResults}>No videos match your search.</Text>
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

                <Text style={styles.forgotPinInstruction}>
                  Forgot your PIN? Tap "Forgot PIN" to set a new one.
                </Text>

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

      {/* Time's Up Modal (First) */}
      {isMediaLocked && !showCallMommyModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          statusBarTranslucent={true}
        >
          <View style={styles.lockedOverlay}>
            <View style={styles.lockedContainer}>
              <View style={styles.lockedIconCircle}>
                <Ionicons name="time-outline" size={64} color="#FF9800" />
              </View>

              <Text style={styles.lockedTitle}>Time's Up!</Text>
              <Text style={styles.lockedMessage}>
                You've used up your time for watching videos.
              </Text>

              <TouchableOpacity
                style={styles.timeUpOkButton}
                onPress={() => setShowCallMommyModal(true)}
              >
                <Text style={styles.timeUpOkButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Call Mommy for Help Modal (Second) */}
      {isMediaLocked && showCallMommyModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          statusBarTranslucent={true}
        >
          <View style={styles.lockedOverlay}>
            <View style={styles.callMommyContainer}>
              <View style={styles.callMommyIconCircle}>
                <Ionicons name="call" size={64} color="#4A9B8E" />
              </View>

              <Text style={styles.callMommyTitle}>Call Mommy for Help!</Text>

              <TouchableOpacity
                style={styles.lockedBackButton}
                onPress={() => {
                  setShowCallMommyModal(false);
                  router.push('/(tabs)/home');
                }}
              >
                <Text style={styles.lockedBackButtonText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  categoriesWrapper: {
    height: scale.scaleHeight(65),
    backgroundColor: 'transparent',
    marginTop: 0,
  },
  categoriesContainer: {
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(10),
    paddingBottom: scale.scaleSpacing(8),
    gap: scale.scaleSpacing(8),
    flexGrow: 1,
  },
  // 🔍 Search Bar Styles
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale.scaleSpacing(16),
    marginVertical: scale.scaleSpacing(2),
    gap: scale.scaleSpacing(8),
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
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
  // Bad Words Alert Styles
  badWordsAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale.scaleSpacing(16),
    marginTop: scale.scaleSpacing(8),
  },
  alertIcon: {
    marginRight: scale.scaleSpacing(8),
  },
  badWordsAlertText: {
    fontSize: scale.scaleFont(13),
    color: '#FF6B6B',
    fontWeight: '700',
    fontFamily: 'Fredoka_700Bold',
    flex: 1,
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
    overflow: 'hidden',
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
    marginHorizontal: scale.scaleSpacing(18),
    marginBottom: scale.scaleSpacing(16),
    marginTop: scale.scaleSpacing(8),
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
  forgotPinInstruction: {
    fontSize: scale.scaleFont(13),
    color: "#666",
    textAlign: "center",
    marginTop: scale.scaleSpacing(6),
    marginBottom: scale.scaleSpacing(8),
    fontFamily: "Fredoka_400Regular",
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

  // Time Limit Styles
  timerBadge: {
    backgroundColor: '#E8F5F3',
    borderRadius: scale.scaleBorderRadius(20),
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(4),
    height: scale.scaleHeight(48),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale.scaleSpacing(3),
    elevation: 2,
    borderWidth: 1,
    borderColor: '#4A9B8E',
  },
  timerText: {
    fontSize: scale.scaleFont(13),
    color: '#4A9B8E',
    fontWeight: '600',
    fontFamily: "Fredoka_600SemiBold",
  },
  timerWarningBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: scale.scaleBorderRadius(20),
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(4),
    height: scale.scaleHeight(48),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.2,
    shadowRadius: scale.scaleSpacing(4),
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  timerWarningText: {
    fontSize: scale.scaleFont(13),
    color: '#856404',
    fontWeight: '600',
    fontFamily: "Fredoka_600SemiBold",
  },
  lockedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale.scaleSpacing(20),
  },
  lockedContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale.scaleBorderRadius(25),
    padding: scale.scaleSpacing(35),
    alignItems: 'center',
    width: '90%',
    maxWidth: scale.scaleWidth(500),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(8) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 12,
    borderWidth: 3,
    borderColor: '#FF9800',
  },
  lockedIconCircle: {
    width: scale.scaleWidth(100),
    height: scale.scaleHeight(100),
    borderRadius: scale.scaleBorderRadius(50),
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale.scaleSpacing(24),
  },
  lockedTitle: {
    fontSize: scale.scaleFont(32),
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: scale.scaleSpacing(16),
    textAlign: 'center',
    fontFamily: "Fredoka_700Bold",
  },
  lockedMessage: {
    fontSize: scale.scaleFont(18),
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: scale.scaleHeight(26),
    marginBottom: scale.scaleSpacing(28),
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: scale.scaleSpacing(10),
  },
  timeUpOkButton: {
    backgroundColor: '#FF9800',
    paddingVertical: scale.scaleSpacing(14),
    paddingHorizontal: scale.scaleSpacing(60),
    borderRadius: scale.scaleBorderRadius(25),
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 6,
  },
  timeUpOkButtonText: {
    fontSize: scale.scaleFont(18),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: "Fredoka_700Bold",
  },

  // Call Mommy Modal Styles
  callMommyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale.scaleBorderRadius(25),
    padding: scale.scaleSpacing(35),
    alignItems: 'center',
    width: '90%',
    maxWidth: scale.scaleWidth(500),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(8) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(12),
    elevation: 12,
    borderWidth: 3,
    borderColor: '#4A9B8E',
  },
  callMommyIconCircle: {
    width: scale.scaleWidth(110),
    height: scale.scaleHeight(110),
    borderRadius: scale.scaleBorderRadius(55),
    backgroundColor: '#E8F5F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale.scaleSpacing(24),
    borderWidth: 3,
    borderColor: '#4A9B8E',
  },
  callMommyTitle: {
    fontSize: scale.scaleFont(28),
    fontWeight: '700',
    color: '#4A9B8E',
    marginBottom: scale.scaleSpacing(16),
    textAlign: 'center',
    fontFamily: "Fredoka_700Bold",
  },
  callMommyMessage: {
    fontSize: scale.scaleFont(16),
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: scale.scaleHeight(24),
    marginBottom: scale.scaleSpacing(28),
    fontFamily: "Fredoka_400Regular",
    paddingHorizontal: scale.scaleSpacing(10),
  },
  lockedBackButton: {
    backgroundColor: '#4A9B8E',
    paddingVertical: scale.scaleSpacing(14),
    paddingHorizontal: scale.scaleSpacing(40),
    borderRadius: scale.scaleBorderRadius(25),
    shadowColor: "#4A9B8E",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 6,
  },
  lockedBackButtonText: {
    fontSize: scale.scaleFont(16),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: "Fredoka_700Bold",
  },
}));

