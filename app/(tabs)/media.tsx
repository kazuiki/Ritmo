import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    AppState,
    BackHandler,
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
import { formatCallParentForHelpTitle, getParentHelpName } from "../../src/parentRoleService";
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
  const navigation = useNavigation();
  const { mode, parentalLockEnabled, enterParentMode, backToChildMode } = useMode();
  
  // Determine video player size based on card width and 16:9 ratio
  const deviceCategory = getDeviceCategory();
  const cardHorizontalMargin = scaleSpacing(18);
  const videoPlayerWidth = Math.max(0, responsive.width - cardHorizontalMargin * 2);
  const videoPlayerHeight = Math.round(videoPlayerWidth * 9 / 16);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBadWords, setHasBadWords] = useState(false);
  const [customBlockedWords, setCustomBlockedWords] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
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
  const [isMediaPageFocused, setIsMediaPageFocused] = useState(false);
  const [hasTimeLimitSet, setHasTimeLimitSet] = useState(false);
  const [parentHelpName, setParentHelpName] = useState<string | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const CACHE_KEY = 'mediaCache:main';
  const [failedAttempts, setFailedAttempts] = useState(0);

  const navLockRef = useRef(false);

  const shouldLockInAppNavigation =
    mode === 'child' &&
    parentalLockEnabled &&
    hasTimeLimitSet &&
    !isMediaLocked &&
    remainingTime > 0;

  // Keep a ref updated so BackHandler / beforeRemove always read the latest lock state.
  navLockRef.current = shouldLockInAppNavigation;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const helpName = await getParentHelpName();
      if (cancelled) return;
      setParentHelpName(helpName);
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  
  // Only these creators are allowed in Media feed and search results.
  const SAFE_CREATORS = [
    'Ms. Rachel',
    'Blippi',
    'Mother Goose Club',
    'Vlad and Niki',
    'AdiConnection',
  ];

  const DAILY_ROUTINE_TERMS = [
    'kids daily routine',
    'morning routine for kids',
    'healthy habits for kids',
    'preschool daily routine',
    'toddler routine learning',
    'self care for kids',
    'brush teeth wash hands kids',
    'getting ready for school kids',
  ];

  const lastRoutineTermRef = useRef<string>('');

  const filterExcludedVideos = (videoList: YouTubeVideo[]): YouTubeVideo[] => {
    const allowedKeywords = [
      'ms rachel',
      'blippi',
      'mother goose club',
      'vlad and niki',
      'adi connection',
      'adiconnection',
    ];

    return videoList.filter((video) => {
      const normalizedChannel = (video.channel || '').toLowerCase();
      const normalizedTitle = (video.title || '').toLowerCase();
      const normalizedDescription = (video.description || '').toLowerCase();
      const combined = `${normalizedChannel} ${normalizedTitle} ${normalizedDescription}`;
      return allowedKeywords.some((keyword) => combined.includes(keyword));
    });
  };

  const shuffleVideos = (videoList: YouTubeVideo[]): YouTubeVideo[] => {
    const shuffled = [...videoList];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  };

  const getNextRoutineTerm = () => {
    const candidates = DAILY_ROUTINE_TERMS.filter(term => term !== lastRoutineTermRef.current);
    const pool = candidates.length > 0 ? candidates : DAILY_ROUTINE_TERMS;
    const chosenTerm = pool[Math.floor(Math.random() * pool.length)];
    lastRoutineTermRef.current = chosenTerm;
    return chosenTerm;
  };

  const loadCustomBlockedWords = React.useCallback(async () => {
    try {
      const words = await getBlockedWords();
      setCustomBlockedWords(words);
    } catch (err) {
      console.warn('Failed to load custom blocked words:', err);
      setCustomBlockedWords([]);
    }
  }, []);

  // Check if media is locked - wrapped in useCallback for stable reference
  const checkMediaTimeLimit = React.useCallback(async () => {
    try {
      // Parent mode or no parental lock - no restrictions
      if (mode === 'parent' || !parentalLockEnabled) {
        setIsMediaLocked(false);
        setShowCallMommyModal(false);
        setHasTimeLimitSet(false);
        const remaining = await MediaTimeLimitService.getRemainingTime();
        setRemainingTime(remaining);
        return;
      }

      // Child mode with parental lock enabled - check if time limit is set
      const timeLimit = await MediaTimeLimitService.getTimeLimit();
      
      if (!timeLimit) {
        // No time limit set yet, but parental lock is on → lock media and show Call Mommy directly
        setIsMediaLocked(true);
        setRemainingTime(0);
        setHasTimeLimitSet(false); // No time limit
        setShowCallMommyModal(true); // Go directly to Call Mommy
        return;
      }

      // Time limit is set
      setHasTimeLimitSet(true);
      
      // Check if expired
      const locked = await MediaTimeLimitService.isMediaLocked();
      setIsMediaLocked(locked);

      if (!locked) {
        const remaining = await MediaTimeLimitService.getRemainingTime();
        setRemainingTime(remaining);
        setShowCallMommyModal(false); // Reset modal flow when not locked
      }
    } catch (err) {
      console.error('Error checking media time limit:', err);
    }
  }, [mode, parentalLockEnabled]);

  // Start timer to track time limit - wrapped in useCallback for stable reference
  const startTimeLimitTimer = React.useCallback(async () => {
    // Clear any existing timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Check immediately
    await checkMediaTimeLimit();

    // Only enforce time limit if in child mode and parental lock is enabled
    if (mode === 'parent' || !parentalLockEnabled) {
      console.log('⏸️ Timer not enforced - parent mode or parental lock disabled');
      return;
    }

    // Check if time limit is set
    const timeLimit = await MediaTimeLimitService.getTimeLimit();
    if (!timeLimit) {
      console.log('⏸️ Timer not running - no time limit set (media locked by parental lock only)');
      return;
    }

    // Check every second and apply elapsed time (continues counting even if app backgrounds)
    timerInterval.current = setInterval(async () => {
      try {
        await MediaTimeLimitService.applyElapsedTime();

        const lockedNow = await MediaTimeLimitService.isMediaLocked();
        setIsMediaLocked(lockedNow);

        if (lockedNow) {
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
        } else {
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
      } catch (err) {
        console.error('Error in timer interval:', err);
      }
    }, 1000);
  }, [checkMediaTimeLimit, showTimeWarning, mode, parentalLockEnabled]);

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
      setIsMediaPageFocused(true); // Mark page as focused
      ParentalLockAuthService.onNavigateToPublicTab();
      checkMediaTimeLimit(); // This handles modal state based on lock status
      
      return () => {
        setIsMediaPageFocused(false); // Mark page as unfocused
      };
    }, [checkMediaTimeLimit])
  );

  useFocusEffect(
    React.useCallback(() => {
      loadCustomBlockedWords();

      // Start a media session so elapsed time counts even if app backgrounds
      void MediaTimeLimitService.startSession();

      // Start timer when page is focused
      startTimeLimitTimer();

      const appStateSub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          // Catch up time after background/app switch
          void MediaTimeLimitService.applyElapsedTime().then(async () => {
            const remaining = await MediaTimeLimitService.getRemainingTime();
            setRemainingTime(remaining);
            const locked = await MediaTimeLimitService.isMediaLocked();
            setIsMediaLocked(locked);
          });
        }
      });

      return () => {
        appStateSub.remove();

        void MediaTimeLimitService.endSession();

        // Clear timer when page loses focus
        if (timerInterval.current) {
          clearInterval(timerInterval.current);
          timerInterval.current = null;
        }
      };
    }, [loadCustomBlockedWords, startTimeLimitTimer])
  );

  // Prevent Android hardware back from exiting/leaving while media time is running
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (navLockRef.current) {
          Vibration.vibrate(30);
          return true;
        }
        return false;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      const beforeRemove = (e: any) => {
        if (navLockRef.current) {
          e?.preventDefault?.();
        }
      };

      const unsubscribe = (navigation as any)?.addListener?.('beforeRemove', beforeRemove);

      return () => {
        sub.remove();
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }, [navigation])
  );

  // Re-check media lock status when mode changes
  useEffect(() => {
    checkMediaTimeLimit();
  }, [mode, checkMediaTimeLimit]);

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
    // Split by non-alphanumeric characters to get individual words
    const words = lowerText.split(/[^a-z0-9]+/).filter(Boolean);
    // Check for exact word matches, not substring matches
    return combinedBadWords.some(blockedWord => 
      words.includes(blockedWord)
    );
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

    // If search is empty, reset bad words flag and reload cache
    if (!text.trim()) {
      setHasBadWords(false);
      loadCachedVideos();
    }
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

  const recommendedVideos = useMemo(() => {
    if (!selectedVideo) return [];
    return filteredVideos
      .filter(video => video.id !== selectedVideo.id)
      .slice(0, 12);
  }, [filteredVideos, selectedVideo]);

  const openVideoModal = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
  };

  const shouldAllowYouTubeNavigation = (request: { url?: string }) => {
    const url = request?.url || '';
    if (!url) return true;

    const lowerUrl = url.toLowerCase();

    const blockedPatterns = [
      'intent://',
      'vnd.youtube',
      'youtube://',
      'youtube.com/watch',
      'm.youtube.com/watch',
      'youtu.be/',
      'youtube.com/redirect',
      'youtube.com/channel/',
      'youtube.com/@',
      'youtube.com/user/',
      'youtube.com/c/',
    ];

    if (blockedPatterns.some(pattern => lowerUrl.includes(pattern))) {
      return false;
    }

    const allowedStarts = [
      'about:blank',
      'blob:',
      'data:',
      'https://www.youtube.com/embed/',
      'https://www.youtube-nocookie.com/embed/',
      'https://www.youtube.com/s/player/',
      'https://s.ytimg.com/',
      'https://i.ytimg.com/',
      'https://rr',
      'https://r',
      'https://redirector.googlevideo.com/',
      'https://www.google.com/',
      'https://googleads.g.doubleclick.net/',
      'https://www.gstatic.com/',
    ];

    if (allowedStarts.some(prefix => lowerUrl.startsWith(prefix))) {
      return true;
    }

    if (lowerUrl.includes('googlevideo.com') || lowerUrl.includes('ytimg.com')) {
      return true;
    }

    return false;
  };

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
          const filteredCachedVideos = filterExcludedVideos(parsed.videos);
          setVideos(filteredCachedVideos);
          console.log(`[loadCached] Showed ${filteredCachedVideos.length} cached videos`);
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
      const filteredVideos = filterExcludedVideos(videos);
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ savedAt, videos: filteredVideos })
      );
    } catch (err) {
      console.warn('Failed to save cached videos:', err);
    }
  };

  const fetchVideosFromChannels = async (maxResults: number = 20, maxVideosPerCategory: number = 20): Promise<YouTubeVideo[]> => {
    try {
      console.log('[LOAD] Fetching from allowed creators...');
      
      // Fetch each allowed creator in parallel.
      const results = await Promise.all(
        SAFE_CREATORS.map(creatorName => 
          YouTubeKidsService.searchKidsVideos(creatorName, maxResults, maxVideosPerCategory).catch(() => [])
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
      return allVideos.slice(0, maxVideosPerCategory);
    } catch (err) {
      console.error('Error fetching videos:', err);
      return [];
    }
  };

  const loadVideos = async (
    preferredRoutineTerm?: string,
    options?: { quickMode?: boolean }
  ) => {
    console.log('=== loadVideos called ===');
    try {
      setError(null);
      const routineTerm = preferredRoutineTerm || getNextRoutineTerm();
      const quickMode = options?.quickMode === true;
      const channelLimit = quickMode ? 10 : 20;
      const searchMaxResults = quickMode ? 10 : 20;
      const searchCategoryLimit = quickMode ? 16 : 40;
      console.log(`[LOAD] Using daily routine term: ${routineTerm}`);

      const fetchPromise = Promise.all([
        fetchVideosFromChannels(channelLimit, channelLimit),
        YouTubeKidsService.searchKidsVideos(routineTerm, searchMaxResults, searchCategoryLimit),
      ]);

      const fallbackFetchPromise: Promise<[YouTubeVideo[], YouTubeVideo[]]> = new Promise(resolve => {
        setTimeout(() => resolve([[], []]), 4500);
      });

      const [channelVideos, searchedVideos] = quickMode
        ? await Promise.race<[YouTubeVideo[], YouTubeVideo[]]>([fetchPromise, fallbackFetchPromise])
        : await fetchPromise;

      const combinedMap = new Map<string, YouTubeVideo>();
      [...channelVideos, ...searchedVideos].forEach(video => {
        if (!combinedMap.has(video.id)) {
          combinedMap.set(video.id, video);
        }
      });

      let fetchedVideos = shuffleVideos(Array.from(combinedMap.values()));

      if (fetchedVideos.length === 0) {
        console.log('[LOAD] Channel fetch returned 0 videos. Falling back to search...');
        fetchedVideos = await YouTubeKidsService.searchKidsVideos(routineTerm, 20, 20);
      }

      if (fetchedVideos.length === 0) {
        console.log('[LOAD] Search fallback returned 0 videos. Falling back to local defaults...');
        fetchedVideos = YouTubeKidsService.getFallbackVideosSync();
      }

      if (fetchedVideos.length > 0) {
        const finalVideos = shuffleVideos(fetchedVideos).slice(0, 20);
        setVideos(finalVideos);
        saveCachedVideos(finalVideos);
        console.log(`[LOAD] Showed ${finalVideos.length} videos`);
      } else {
        if (!quickMode) {
          setError('No videos available right now. Please try again in a moment.');
        }
      }
    } catch (err) {
      console.error('Error loading videos:', err);
      if (!options?.quickMode) {
        setError('Failed to load videos. Please check your internet connection.');
      }
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
      if (videos.length > 0) {
        setVideos(shuffleVideos(videos).slice(0, 20));
      }
      setRefreshing(false);
      loadVideos(getNextRoutineTerm(), { quickMode: true });
      return;
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
      // Success Logic
      setFailedAttempts(0); // Reset attempts on success
      setShowParentalLockModal(false);
      setPin(['', '', '', '']);
      setPinError('');
      
      ParentalLockAuthService.setAuthenticated(true, 'progress');
      ParentalLockAuthService.setAuthenticated(true, 'addRoutines');
      ParentalLockAuthService.setAuthenticated(true, 'settings');
      
      enterParentMode();
      router.push('/(tabs)/addRoutines');
    } else {
      // Wrong PIN Logic
      const newAttemptCount = failedAttempts + 1;
      setFailedAttempts(newAttemptCount);

      if (newAttemptCount >= 3) {
        // Redirect to Home after 3 failures
        setFailedAttempts(0); // Reset for next time
        setShowParentalLockModal(false);
        setPin(['', '', '', '']);
        setPinError('');
        
        // Use your home route path here
        router.push('/(tabs)/home'); 
      } else {
        // Standard Error Logic
        setPinError(`Incorrect PIN. ${3 - newAttemptCount} attempts remaining.`);
        Vibration.vibrate(150);
        triggerPinShake();
        setPin(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
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
                {mode === 'child' ? 'Switch to Parent Mode' : 'Back to Child Mode'}
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

        {/* Timer beside search bar - Only shows in child mode when parental lock is enabled */}
        {remainingTime > 0 && !isMediaLocked && mode === 'child' && parentalLockEnabled && (
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
            <TouchableOpacity onPress={() => openVideoModal(video)}>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={showVideoModal && !!selectedVideo}
        onRequestClose={closeVideoModal}
        statusBarTranslucent={true}
      >
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalContainer}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>Now Playing</Text>
              <TouchableOpacity onPress={closeVideoModal} style={styles.videoModalCloseButton}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedVideo && (
              <>
                <YoutubePlayer
                  height={Math.round((responsive.width - scaleSpacing(24)) * 9 / 16)}
                  width={Math.max(0, responsive.width - scaleSpacing(24))}
                  play={showVideoModal}
                  videoId={selectedVideo.youtubeId}
                  initialPlayerParams={{
                    modestbranding: true,
                    rel: false,
                  }}
                  onChangeState={(event: PlayerState) => {
                    if (event === 'ended') {
                      const nextVideo = recommendedVideos[0];
                      if (nextVideo) {
                        setSelectedVideo(nextVideo);
                      }
                    }
                  }}
                  webViewProps={{
                    allowsInlineMediaPlayback: true,
                    mediaPlaybackRequiresUserAction: false,
                    setSupportMultipleWindows: false,
                    javaScriptCanOpenWindowsAutomatically: false,
                    onOpenWindow: () => {
                      return;
                    },
                    onShouldStartLoadWithRequest: shouldAllowYouTubeNavigation,
                  }}
                />

                <View style={styles.videoModalMeta}>
                  <Text style={styles.videoModalVideoTitle} numberOfLines={2}>{selectedVideo.title}</Text>
                  <Text style={styles.videoModalVideoInfo}>{selectedVideo.channel} • {selectedVideo.views}</Text>
                </View>

                <Text style={styles.recommendedHeader}>Recommended</Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.recommendedListContainer}>
                  {recommendedVideos.map((video) => (
                    <TouchableOpacity
                      key={`recommended-${video.id}`}
                      style={styles.recommendedItem}
                      onPress={() => setSelectedVideo(video)}
                    >
                      <Image source={{ uri: video.thumbnail }} style={styles.recommendedThumb} resizeMode="cover" />
                      <View style={styles.recommendedTextWrap}>
                        <Text style={styles.recommendedTitle} numberOfLines={2}>{video.title}</Text>
                        <Text style={styles.recommendedMeta} numberOfLines={1}>{video.channel}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

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
                  Forgot your PIN? Tap &quot;Forgot PIN&quot; to set a new one.
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

      {/* Time&apos;s Up Modal (First modal - only when time limit expired, not when no time limit set) */}
      {isMediaLocked && parentalLockEnabled && mode === 'child' && isMediaPageFocused && hasTimeLimitSet && !showCallMommyModal && (
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

              <Text style={styles.lockedTitle}>Time&apos;s Up!</Text>
              <Text style={styles.lockedMessage}>
                You&apos;ve used up your time for watching videos.
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

      {/* Call Mommy for Help Modal - shows when: 1) No time limit set, OR 2) After clicking OK on Time's Up */}
      {isMediaLocked && parentalLockEnabled && mode === 'child' && isMediaPageFocused && (!hasTimeLimitSet || showCallMommyModal) && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          statusBarTranslucent={true}
        >
          <View style={styles.lockedOverlay}>
            <View style={styles.callMommyContainer}>
              <View style={styles.callMommyIconCircle}>
                <Image
                  source={require("../../assets/images/Parents.png")}
                  style={styles.callMommyParentIcon}
                />
              </View>

              <Text style={styles.callMommyTitle}>{formatCallParentForHelpTitle(parentHelpName)}</Text>

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
  dropdownContainer: {
    alignSelf: 'flex-end',
    position: 'relative', // Keeps the absolute menu relative to this container
    zIndex: 1000, // Ensures it stays on top of other elements
  },
  modeButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: scale.scaleSpacing(8),
    paddingVertical: scale.scaleSpacing(6),
    borderRadius: 20,
    marginTop: scale.scaleSpacing(4),
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
  // --- New Dropdown Styles ---
  dropdownMenu: {
    position: 'absolute',
    top: '100%', // Sits right below the button
    right: scale.scaleSpacing(0),
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent white
    borderRadius: 12,
    paddingVertical: scale.scaleSpacing(3),
    paddingHorizontal: scale.scaleSpacing(4),
    // Shadow for depth
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: scale.scaleSpacing(3),
    paddingHorizontal: scale.scaleSpacing(4),
  },
  dropdownItemWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(4),
  },
  dropdownItemIcon: {
    width: scale.scaleWidth(20),
    height: scale.scaleHeight(20),
    resizeMode: 'contain',
    tintColor: '#2F7C72',
  },
  dropdownItemText: {
    color: '#2F7C72',
    fontSize: scale.scaleFont(14),
    fontFamily: 'Fredoka_600SemiBold',
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
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    paddingTop: scale.scaleSpacing(36),
  },
  videoModalContainer: {
    flex: 1,
    paddingHorizontal: scale.scaleSpacing(12),
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale.scaleSpacing(12),
  },
  videoModalTitle: {
    color: '#fff',
    fontSize: scale.scaleFont(18),
    fontFamily: 'Fredoka_600SemiBold',
    flex: 1,
  },
  videoModalCloseButton: {
    paddingHorizontal: scale.scaleSpacing(8),
    paddingVertical: scale.scaleSpacing(4),
  },
  videoModalMeta: {
    marginTop: scale.scaleSpacing(10),
    marginBottom: scale.scaleSpacing(10),
  },
  videoModalVideoTitle: {
    color: '#fff',
    fontSize: scale.scaleFont(16),
    fontFamily: 'Fredoka_600SemiBold',
  },
  videoModalVideoInfo: {
    color: '#D0D0D0',
    fontSize: scale.scaleFont(13),
    marginTop: scale.scaleSpacing(4),
    fontFamily: 'Fredoka_400Regular',
  },
  recommendedHeader: {
    color: '#fff',
    fontSize: scale.scaleFont(15),
    fontFamily: 'Fredoka_600SemiBold',
    marginBottom: scale.scaleSpacing(8),
    marginTop: scale.scaleSpacing(2),
  },
  recommendedListContainer: {
    paddingBottom: scale.scaleSpacing(24),
  },
  recommendedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale.scaleSpacing(10),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: scale.scaleBorderRadius(10),
    overflow: 'hidden',
  },
  recommendedThumb: {
    width: scale.scaleWidth(130),
    height: scale.scaleHeight(74),
    backgroundColor: '#444',
  },
  recommendedTextWrap: {
    flex: 1,
    paddingHorizontal: scale.scaleSpacing(10),
    paddingVertical: scale.scaleSpacing(8),
  },
  recommendedTitle: {
    color: '#fff',
    fontSize: scale.scaleFont(13),
    fontFamily: 'Fredoka_500Medium',
  },
  recommendedMeta: {
    color: '#C8C8C8',
    fontSize: scale.scaleFont(11),
    marginTop: scale.scaleSpacing(4),
    fontFamily: 'Fredoka_400Regular',
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
  callMommyParentIcon: {
    width: scale.scaleWidth(64),
    height: scale.scaleHeight(64),
    resizeMode: 'contain',
    tintColor: '#4A9B8E',
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

