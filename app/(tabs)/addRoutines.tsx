import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPresetById, Preset, PRESETS, resolveRoutinePreset } from "../../constants/presets";
import AddRoutineModalOnboarding from "../../src/components/AddRoutineModalOnboarding";
import AddRoutineOnboardingTour from "../../src/components/AddRoutineOnboardingTour";
import RoutinePresetOnboarding from "../../src/components/RoutinePresetOnboarding";
import { useMode } from "../../src/contexts/ModeContext";
import { useOnboarding } from "../../src/contexts/OnboardingContext";
import NotificationService from "../../src/notificationService";
import {
    applyRoutineOverrides,
    getRoutineOverridesLocal,
    refreshRoutineOverridesFromCloud,
    removeRoutineOverrideForCurrentUser,
    upsertRoutineOverrideForCurrentUser,
} from "../../src/routineOverridesService";
import { createRoutineForCurrentUser, deleteRoutine, getRoutinesForCurrentUser, updateRoutine } from "../../src/routinesService";
import { supabase } from "../../src/supabaseClient";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";

interface Routine {
    id: number;
    name: string;
    time: string;
    presetId?: number;
    imageUrl?: string | null;
    completed?: boolean;
    ringtone?: string;
    days?: number[]; // 0=Sun..6=Sat
}

interface CustomRingtone {
    name: string;
    uri: string;
    mimeType?: string;
}

type RingtoneAddAlertType = 'success' | 'deleted' | 'duplicate' | 'error';

const LAST_USER_ID_KEY = '@ritmo_last_user_id';
const CUSTOM_RINGTONES_STORAGE_KEY = '@ritmo_custom_ringtones';
const AUDIO_FILE_EXTENSION_REGEX = /\.(mp3|wav|m4a|aac|ogg|flac|caf|aiff?)$/i;
const BUILT_IN_RINGTONES: Array<{ id: string; name: string }> = [
    { id: 'alarm1', name: 'Morning Bell' },
    { id: 'alarm2', name: 'Gentle Wake' },
    { id: 'alarm3', name: 'Classic Chime' },
    { id: 'alarm4', name: 'Peaceful Dawn' },
    { id: 'alarm5', name: 'Sunrise' },
    { id: 'alarm6', name: 'Happy Day' },
    { id: 'alarm7', name: 'Bright Morning' },
    { id: 'alarm8', name: 'Cheerful' },
    { id: 'alarm13', name: 'Soft Bell' },
    { id: 'alarm14', name: 'Nature Call' },
    { id: 'alarm15', name: 'Sweet Dreams' },
    { id: 'alarm16', name: 'Ocean Waves' },
    { id: 'alarm17', name: 'Wind Chimes' },
];

const isExpectedOfflineError = (error: unknown): boolean => {
    const message = String((error as any)?.message ?? error ?? '').toLowerCase();
    const name = String((error as any)?.name ?? '').toLowerCase();
    return (
        message.includes('network request failed') ||
        message.includes('fetch failed') ||
        name === 'typeerror' ||
        name === 'authretryablefetcherror'
    );
};

const logIfUnexpected = (label: string, error: unknown) => {
    if (!isExpectedOfflineError(error)) {
        console.error(label, (error as any)?.message || error);
    }
};

const ITEM_HEIGHT = 48;

// Use static JPG thumbnails on Add Routines and Routine Preset views to reduce GIF rendering lag.
const PRESET_STATIC_IMAGES: Record<number, any> = {
    1: require("../../assets/images/brush.jpg"),
    2: require("../../assets/images/eat.jpg"),
    3: require("../../assets/images/bath.jpg"),
    4: require("../../assets/images/clothes.jpg"),
    5: require("../../assets/images/school.jpg"),
    6: require("../../assets/images/pajama.jpg"),
    7: require("../../assets/images/sleep.jpg"),
    8: require("../../assets/images/bed.jpg"),
    9: require("../../assets/images/hair.jpg"),
    10: require("../../assets/images/hand_bless.jpg"),
    11: require("../../assets/images/play.jpg"),
    12: require("../../assets/images/sweep.jpg"),
};

const getPresetStaticImage = (presetId?: number | null) => {
    if (!presetId) return null;
    return PRESET_STATIC_IMAGES[presetId] ?? null;
};

const decodeURIComponentSafe = (value: string): string => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const getFileNameFromUri = (uri?: string | null): string => {
    if (!uri) return '';
    const sanitizedUri = uri.split('?')[0].split('#')[0];
    const segments = sanitizedUri.split(/[\\/]/);
    return segments[segments.length - 1] || '';
};

const normalizeAlarmKey = (value?: string | null): string => {
    if (!value) return '';

    return decodeURIComponentSafe(value)
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

export default function addRoutines() {
    const router = useRouter();
    const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
    const insets = useSafeAreaInsets();
    const itemHeight = scaleHeight(ITEM_HEIGHT);
    const { mode, parentalLockEnabled, backToChildMode } = useMode();
    const { 
        showAddRoutineOnboarding, 
        startAddRoutineOnboarding, 
        completeAddRoutineOnboarding, 
        skipAddRoutineOnboarding,
        showAddRoutineModalOnboarding,
        currentAddRoutineModalStep,
        startAddRoutineModalOnboarding,
        nextAddRoutineModalStep,
        completeAddRoutineModalOnboarding,
        skipAddRoutineModalOnboarding,
        showRoutinePresetOnboarding,
        startRoutinePresetOnboarding,
        completeRoutinePresetOnboarding,
        skipRoutinePresetOnboarding
    } = useOnboarding();
    const [modalVisible, setModalVisible] = useState(false);
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
    const [presetModalVisible, setPresetModalVisible] = useState(false);
    const [customRingtones, setCustomRingtones] = useState<CustomRingtone[]>([]);
    const [previewingRingtone, setPreviewingRingtone] = useState<string | null>(null); // currently playing preview
    const [ringtoneModalVisible, setRingtoneModalVisible] = useState(false);
    const ringtoneOptions = [
        ...BUILT_IN_RINGTONES,
        ...customRingtones.map((ringtone) => ({ id: ringtone.uri, name: ringtone.name })),
    ];

    // Draft state for Add Routine modal
    const [addRoutineDraft, setAddRoutineDraft] = useState(() => ({
        routineName: "",
        hour: "00",
        minute: "00",
        period: "AM",
        selectedPresetId: null,
        selectedDays: [],
        selectedRingtone: undefined,
    }));

    // Field state bound to draft
    const routineName = addRoutineDraft.routineName;
    const hour = addRoutineDraft.hour;
    const minute = addRoutineDraft.minute;
    const period = addRoutineDraft.period;
    const selectedPresetId = addRoutineDraft.selectedPresetId;
    const selectedDays = addRoutineDraft.selectedDays;
    const selectedRingtone = addRoutineDraft.selectedRingtone;

    // Field updaters for draft state
    const setRoutineName = (val: string) => setAddRoutineDraft(draft => ({ ...draft, routineName: val }));
    const setHour = (val: string) => setAddRoutineDraft(draft => ({ ...draft, hour: val }));
    const setMinute = (val: string) => setAddRoutineDraft(draft => ({ ...draft, minute: val }));
    const setPeriod = (val: string) => setAddRoutineDraft(draft => ({ ...draft, period: val }));
    const setSelectedPresetId = (val: number | null) => setAddRoutineDraft(draft => ({ ...draft, selectedPresetId: val }));
    const setSelectedDays = (val: number[]) => setAddRoutineDraft(draft => ({ ...draft, selectedDays: val }));
    const setSelectedRingtone = (val: string | undefined) => setAddRoutineDraft(draft => ({ ...draft, selectedRingtone: val }));
    const isSubmittingRef = useRef(false); // guard against double-tap on Add/Save

    // Refs for TextInput components
    const hourInputRef = useRef<TextInput>(null);
    const minuteInputRef = useRef<TextInput>(null);
    const addRoutineModalScrollRef = useRef<ScrollView>(null);
    
    const bookGuideIconRef = useRef<View>(null);
    const gameIconRef = useRef<View>(null);
    const [bookGuideIconLayout, setBookGuideIconLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [gameIconLayout, setGameIconLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    
    // Onboarding state
    const plusButtonRef = useRef<View>(null);
    const [plusButtonLayout, setPlusButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    
    // Modal onboarding refs
    const timePickerRef = useRef<View>(null);
    const daysRef = useRef<View>(null);
    const presetRef = useRef<View>(null);
    const routineNameRef = useRef<View>(null);
    const ringtoneRef = useRef<View>(null);
    const [modalOnboardingLayouts, setModalOnboardingLayouts] = useState<{
        timePicker?: { x: number; y: number; width: number; height: number } | null;
        days?: { x: number; y: number; width: number; height: number } | null;
        preset?: { x: number; y: number; width: number; height: number } | null;
        routineName?: { x: number; y: number; width: number; height: number } | null;
        ringtone?: { x: number; y: number; width: number; height: number } | null;
    }>({});
    
    const ALL_DAYS = [0,1,2,3,4,5,6];
    // removed duplicate selectedDays state
    const [keyboardInset, setKeyboardInset] = useState(0);
    const [routineNameFieldY, setRoutineNameFieldY] = useState(0);
    const [isRoutineNameFocused, setIsRoutineNameFocused] = useState(false);
    
    // Delete confirmation and success modals
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
    
    // Save confirmation modal
    const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);
    
    // Add and Edit success modals
    const [addSuccessVisible, setAddSuccessVisible] = useState(false);
    const [editSuccessVisible, setEditSuccessVisible] = useState(false);

    // Select days error modal
    const [selectDaysModalVisible, setSelectDaysModalVisible] = useState(false);
    const [duplicateRoutineModalVisible, setDuplicateRoutineModalVisible] = useState(false);
    const [ringtoneAddAlertVisible, setRingtoneAddAlertVisible] = useState(false);
    const [ringtoneAddAlertType, setRingtoneAddAlertType] = useState<RingtoneAddAlertType>('success');
    const [ringtoneAddAlertMessage, setRingtoneAddAlertMessage] = useState('');
    const [ringtoneDeleteConfirmVisible, setRingtoneDeleteConfirmVisible] = useState(false);
    const [ringtoneDeleteTarget, setRingtoneDeleteTarget] = useState<CustomRingtone | null>(null);

    const getStorageKeyForCurrentUser = async (): Promise<string | null> => {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUserId = sessionData?.session?.user?.id;
        if (sessionUserId) {
            await AsyncStorage.setItem(LAST_USER_ID_KEY, sessionUserId);
            return `@routines_${sessionUserId}`;
        }

        const cachedUserId = await AsyncStorage.getItem(LAST_USER_ID_KEY);
        if (cachedUserId) {
            return `@routines_${cachedUserId}`;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
                await AsyncStorage.setItem(LAST_USER_ID_KEY, user.id);
                return `@routines_${user.id}`;
            }
            return null;
        } catch {
            return null;
        }
    };

    const loadCustomRingtones = async () => {
        try {
            const stored = await AsyncStorage.getItem(CUSTOM_RINGTONES_STORAGE_KEY);
            if (!stored) return;

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                console.log('Invalid custom ringtone payload, ignoring cache.');
                return;
            }

            const sanitized: CustomRingtone[] = parsed
                .filter((item: any) => typeof item?.uri === 'string' && item.uri.length > 0)
                .map((item: any) => ({
                    name:
                        typeof item?.name === 'string' && item.name.trim().length > 0
                            ? item.name.trim()
                            : 'Custom Ringtone',
                    uri: item.uri,
                    mimeType: typeof item?.mimeType === 'string' ? item.mimeType : undefined,
                }));

            setCustomRingtones(sanitized);
        } catch (error) {
            console.error('Failed to load custom ringtones:', error);
        }
    };

    const persistCustomRingtones = async (items: CustomRingtone[]) => {
        try {
            await AsyncStorage.setItem(CUSTOM_RINGTONES_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Failed to save custom ringtones:', error);
        }
    };

    const hourRef = useRef<ScrollView | null>(null);
    const minuteRef = useRef<ScrollView | null>(null);
    const periodRef = useRef<ScrollView | null>(null);
    
    // For infinite scroll - track if we're programmatically scrolling
    const isScrollingProgrammatically = useRef(false);
    const hourScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const minuteScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Create infinite scroll arrays (3 repetitions each)
    const HOURS_REPETITIONS = 3;
    const MINUTES_REPETITIONS = 3;
    const infiniteHours = Array.from({ length: 12 * HOURS_REPETITIONS }, (_, i) => ((i % 12) + 1));
    const infiniteMinutes = Array.from({ length: 60 * MINUTES_REPETITIONS }, (_, i) => i % 60);

    // Check parental lock on component mount and when focused
    useEffect(() => {
        // Initialize notification service and refresh notifications
        const initNotifications = async () => {
            await loadCustomRingtones();
            await NotificationService.initialize();
            // Auto-refresh notifications if running low
            await NotificationService.refreshAllRoutineNotifications();
        };
        initNotifications();
        
        return () => {
            // CLEANUP: Stop any playing sounds when component unmounts
            NotificationService.stopRingtone().catch(console.error);
            // CLEANUP: Dismiss all modals on unmount to prevent delayed pop-ups
            setDeleteConfirmVisible(false);
            setDeleteSuccessVisible(false);
            setSaveConfirmVisible(false);
            setSelectDaysModalVisible(false);
            setDuplicateRoutineModalVisible(false);
            setAddSuccessVisible(false);
            setEditSuccessVisible(false);
            setRingtoneAddAlertVisible(false);
            setRingtoneDeleteConfirmVisible(false);
            setRingtoneDeleteTarget(null);
        };
    }, []);

    useEffect(() => {
        const onKeyboardShow = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardInset(event.endCoordinates?.height ?? 0);
        });

        const onKeyboardHide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardInset(0);
        });

        return () => {
            onKeyboardShow.remove();
            onKeyboardHide.remove();
        };
    }, []);

    useEffect(() => {
        if (!isRoutineNameFocused || keyboardInset <= 0) return;

        // Scroll to the routine name field once keyboard is visible.
        const targetY = Math.max(routineNameFieldY - scaleSpacing(84), 0);
        const timer = setTimeout(() => {
            addRoutineModalScrollRef.current?.scrollTo({ y: targetY, animated: true });
        }, 40);

        return () => clearTimeout(timer);
    }, [isRoutineNameFocused, keyboardInset, routineNameFieldY, scaleSpacing]);

    useFocusEffect(
        React.useCallback(() => {
            // Measure the plus button position first
            const measureTimer = setTimeout(() => {
                if (plusButtonRef.current) {
                    plusButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                        console.log('📏 Plus button measured:', { pageX, pageY, width, height });
                        setPlusButtonLayout({ x: pageX, y: pageY, width, height });
                    });
                }
            }, 300);
            
            // Then trigger onboarding after layout is ready
            const onboardingTimer = setTimeout(() => {
                console.log('🎯 Triggering Add Routine onboarding...');
                startAddRoutineOnboarding();
            }, 800);
            
            return () => {
                clearTimeout(measureTimer);
                clearTimeout(onboardingTimer);
            };
        }, [])
    );

    // Re-measure modal layouts when step changes to ensure accurate positioning
    useEffect(() => {
        if (showAddRoutineModalOnboarding && modalVisible) {
            // Longer delay to allow any scroll animations to complete
            const timer = setTimeout(() => {
                console.log(`🔄 Re-measuring layouts for step ${currentAddRoutineModalStep}`);
                measureModalLayouts();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [currentAddRoutineModalStep, showAddRoutineModalOnboarding, modalVisible]);

    const scrollToIndex = (ref: React.RefObject<ScrollView | null>, index: number) => {
        ref.current?.scrollTo({ y: index * itemHeight, animated: true });
    };

    const onPressHour = (h: number) => {
        const val = h.toString().padStart(2, "0");
        setHour(val);
        // Scroll to middle repetition
        const middleIndex = 12 + (h - 1);
        isScrollingProgrammatically.current = true;
        scrollToIndex(hourRef, middleIndex);
        setTimeout(() => { isScrollingProgrammatically.current = false; }, 300);
    };

    const onPressMinute = (m: number) => {
        const val = m.toString().padStart(2, "0");
        setMinute(val);
        // Scroll to middle repetition
        const middleIndex = 60 + m;
        isScrollingProgrammatically.current = true;
        scrollToIndex(minuteRef, middleIndex);
        setTimeout(() => { isScrollingProgrammatically.current = false; }, 300);
    };

    const onPressPeriod = (p: "AM" | "PM") => {
        setPeriod(p);
        scrollToIndex(periodRef, p === "AM" ? 0 : 1);
    };

    const handleHourInputChange = (text: string) => {
        const digitsOnly = text.replace(/\D/g, "").slice(0, 2);
        if (!digitsOnly) {
            setHour("00");
            return;
        }

        const numericHour = parseInt(digitsOnly, 10);
        if (Number.isNaN(numericHour)) {
            setHour("00");
            return;
        }

        if (numericHour > 12) {
            setHour("12");
            // Move focus to minute once hour input is complete.
            requestAnimationFrame(() => {
                minuteInputRef.current?.focus();
            });
            return;
        }

        setHour(digitsOnly);

        // Auto-switch to minute field when hour already has 2 digits.
        if (digitsOnly.length === 2) {
            requestAnimationFrame(() => {
                minuteInputRef.current?.focus();
            });
        }
    };

    const handleMinuteInputChange = (text: string) => {
        const digitsOnly = text.replace(/\D/g, "").slice(0, 2);
        if (!digitsOnly) {
            setMinute("00");
            return;
        }

        const numericMinute = parseInt(digitsOnly, 10);
        if (Number.isNaN(numericMinute)) {
            setMinute("00");
            return;
        }

        if (numericMinute > 59) {
            setMinute("59");
            return;
        }

        setMinute(digitsOnly);
    };

    const normalizeHourInput = () => {
        if (!hour) {
            setHour("00");
            return;
        }
        const parsed = parseInt(hour, 10);
        const normalized = Number.isNaN(parsed) ? 0 : Math.min(12, Math.max(0, parsed));
        setHour(normalized.toString().padStart(2, "0"));
    };

    const normalizeMinuteInput = () => {
        if (!minute) {
            setMinute("00");
            return;
        }
        const parsed = parseInt(minute, 10);
        const normalized = Number.isNaN(parsed) ? 0 : Math.min(59, Math.max(0, parsed));
        setMinute(normalized.toString().padStart(2, "0"));
    };

    const getRoutineTimeValue = () => {
        const parsedHour = parseInt(hour, 10);
        const parsedMinute = parseInt(minute, 10);
        const normalizedHour = Number.isNaN(parsedHour) ? 1 : Math.min(12, Math.max(1, parsedHour));
        const normalizedMinute = Number.isNaN(parsedMinute) ? 0 : Math.min(59, Math.max(0, parsedMinute));
        return `${normalizedHour.toString().padStart(2, "0")}:${normalizedMinute.toString().padStart(2, "0")} ${period.toLowerCase()}`;
    };

    const bringRoutineNameIntoView = () => {
        setIsRoutineNameFocused(true);

        // Initial nudge while keyboard is animating.
        const targetY = Math.max(routineNameFieldY - scaleSpacing(84), 0);
        setTimeout(() => {
            addRoutineModalScrollRef.current?.scrollTo({ y: targetY, animated: true });
        }, 80);
    };

    const normalizeDaysKey = (days?: number[]) => {
        const sourceDays = Array.isArray(days) && days.length > 0 ? days : ALL_DAYS;
        return [...sourceDays].sort((a, b) => a - b).join(',');
    };

    const normalizeRoutineId = (id: number | string) => String(id);

    const getRoutineIdentityKey = (routine: { name?: string; time?: string }) => {
        const normalizedName = (routine.name || '').trim().toLowerCase();
        const normalizedTime = (routine.time || '').trim().toLowerCase();
        return `${normalizedName}__${normalizedTime}`;
    };

    const isRoutineDuplicate = (params: {
        name: string;
        time: string;
        ringtone: string;
        days: number[];
        imageUrl?: string | null;
        excludeId?: number;
    }) => {
        const targetName = params.name.trim().toLowerCase();
        const targetTime = params.time.trim().toLowerCase();
        const targetRingtone = (params.ringtone || 'alarm1').trim().toLowerCase();
        const targetDays = normalizeDaysKey(params.days);
        const targetImageUrl = (params.imageUrl || '').trim();

        return routines.some((routine) => {
            if (params.excludeId && normalizeRoutineId(routine.id) === normalizeRoutineId(params.excludeId)) {
                return false;
            }

            const routineName = routine.name.trim().toLowerCase();
            const routineTime = routine.time.trim().toLowerCase();
            const routineRingtone = (routine.ringtone || 'alarm1').trim().toLowerCase();
            const routineDays = normalizeDaysKey(routine.days);
            const routineImageUrl = (routine.imageUrl || '').trim();

            return (
                routineName === targetName &&
                routineTime === targetTime &&
                routineRingtone === targetRingtone &&
                routineDays === targetDays &&
                routineImageUrl === targetImageUrl
            );
        });
    };

    useFocusEffect(
        React.useCallback(() => {
            loadRoutinesFromDb();
        }, [])
    );

    const loadRoutinesFromDb = async () => {
        try {
            const storageKey = await getStorageKeyForCurrentUser();
            if (!storageKey) {
                setRoutines([]);
                return;
            }
            const resolvedUserId = storageKey.replace('@routines_', '');
            const localOverrides = await getRoutineOverridesLocal(resolvedUserId);

            // Load from AsyncStorage first (has days/ringtone)
            const stored = await AsyncStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                setRoutines(applyRoutineOverrides(parsed, localOverrides));
            }

            // Then sync with Supabase in background
            const dbRoutines = await getRoutinesForCurrentUser();
            
            // Merge database routines with AsyncStorage data (for days/ringtone)
            const storedRoutines: Routine[] = stored ? JSON.parse(stored) : [];
            const storedMapById = new Map(storedRoutines.map((r) => [normalizeRoutineId(r.id), r]));
            const storedMapByIdentity = new Map(storedRoutines.map((r) => [getRoutineIdentityKey(r), r]));

            const merged: Routine[] = dbRoutines.map(dbR => {
                const existing =
                    (storedMapById.get(normalizeRoutineId(dbR.id)) as Routine | undefined) ||
                    (storedMapByIdentity.get(getRoutineIdentityKey(dbR)) as Routine | undefined);
                const derivedPresetId = dbR.presetId ?? existing?.presetId ?? resolveRoutinePreset({ name: dbR.name })?.id;
                return {
                    id: dbR.id,
                    name: dbR.name,
                    time: dbR.time,
                    imageUrl: dbR.imageUrl ?? existing?.imageUrl ?? null,
                    presetId: derivedPresetId,
                    ringtone: dbR.ringtone ?? existing?.ringtone ?? 'alarm1',
                    days: dbR.days ?? existing?.days ?? [0,1,2,3,4,5,6],
                };
            });

            const mergedWithLocalOverrides = applyRoutineOverrides(merged, localOverrides);
            setRoutines(mergedWithLocalOverrides);
            await AsyncStorage.setItem(storageKey, JSON.stringify(mergedWithLocalOverrides));

            // Keep this device updated with latest cross-device routine presentation data.
            const cloudRefresh = await refreshRoutineOverridesFromCloud();
            if (cloudRefresh?.userId === resolvedUserId) {
                const mergedWithCloudOverrides = applyRoutineOverrides(merged, cloudRefresh.overrides);
                setRoutines(mergedWithCloudOverrides);
                await AsyncStorage.setItem(storageKey, JSON.stringify(mergedWithCloudOverrides));
            }
        } catch (error: any) {
            // Silently handle authentication errors - user may not be logged in yet
            if (error?.message !== 'Not authenticated') {
                logIfUnexpected("Failed to load routines from Supabase:", error);
            }
        }
    };

    const openModal = () => {
        setModalVisible(true);
        setEditingRoutineId(null);
        setTimeout(() => {
            // Start at middle repetition (01:00 AM) if draft is default, else scroll to draft value
            const hIndex = parseInt(addRoutineDraft.hour, 10) - 1;
            const mIndex = parseInt(addRoutineDraft.minute, 10);
            isScrollingProgrammatically.current = true;
            hourRef.current?.scrollTo({ y: (12 + (isNaN(hIndex) ? 0 : hIndex)) * itemHeight, animated: false });
            minuteRef.current?.scrollTo({ y: (60 + (isNaN(mIndex) ? 0 : mIndex)) * itemHeight, animated: false });
            periodRef.current?.scrollTo({ y: (addRoutineDraft.period === "AM" ? 0 : 1) * itemHeight, animated: false });
            setTimeout(() => { isScrollingProgrammatically.current = false; }, 100);
            // Trigger modal onboarding after layout is ready
            setTimeout(() => {
                measureModalLayouts();
                setTimeout(async () => {
                    await startAddRoutineModalOnboarding();
                }, 500);
            }, 300);
        }, 0);
    };

    const measureModalLayouts = () => {
        const layouts: any = {};
        
        if (timePickerRef.current) {
            timePickerRef.current.measure((x, y, width, height, pageX, pageY) => {
                console.log('📏 Time Picker:', { pageX, pageY, width, height });
                layouts.timePicker = { x: pageX, y: pageY, width, height };
                setModalOnboardingLayouts(prev => ({ ...prev, timePicker: layouts.timePicker }));
            });
        }
        
        if (daysRef.current) {
            daysRef.current.measure((x, y, width, height, pageX, pageY) => {
                console.log('📏 Days:', { pageX, pageY, width, height });
                layouts.days = { x: pageX, y: pageY, width, height };
                setModalOnboardingLayouts(prev => ({ ...prev, days: layouts.days }));
            });
        }
        
        if (presetRef.current) {
            presetRef.current.measure((x, y, width, height, pageX, pageY) => {
                console.log('📏 Preset:', { pageX, pageY, width, height });
                layouts.preset = { x: pageX, y: pageY, width, height };
                setModalOnboardingLayouts(prev => ({ ...prev, preset: layouts.preset }));
            });
        }
        
        if (routineNameRef.current) {
            routineNameRef.current.measure((x, y, width, height, pageX, pageY) => {
                console.log('📏 Routine Name:', { pageX, pageY, width, height });
                layouts.routineName = { x: pageX, y: pageY, width, height };
                setModalOnboardingLayouts(prev => ({ ...prev, routineName: layouts.routineName }));
            });
        }
        
        if (ringtoneRef.current) {
            ringtoneRef.current.measure((x, y, width, height, pageX, pageY) => {
                console.log('📏 Ringtone:', { pageX, pageY, width, height });
                layouts.ringtone = { x: pageX, y: pageY, width, height };
                setModalOnboardingLayouts(prev => ({ ...prev, ringtone: layouts.ringtone }));
            });
        }
    };

    const openEditModal = (routine: Routine) => {
        setEditingRoutineId(routine.id);
        setRoutineName(routine.name);
        setSelectedRingtone(routine.ringtone);
        // Get presetId from imageUrl stored in database, or fallback to presetId field
        const preset = resolveRoutinePreset(routine);
        setSelectedPresetId(preset?.id ?? routine.presetId ?? null);
        setSelectedDays(routine.days ?? ALL_DAYS);
        
        const timeParts = routine.time.split(" ");
        const [h, m] = timeParts[0].split(":");
        const p = timeParts[1].toUpperCase();
        
        setHour(h);
        setMinute(m);
        setPeriod(p as "AM" | "PM");
        setModalVisible(true);
        
        setTimeout(() => {
            const hIndex = parseInt(h, 10) - 1;
            const mIndex = parseInt(m, 10);
            // Scroll to middle repetition
            isScrollingProgrammatically.current = true;
            hourRef.current?.scrollTo({ y: (12 + hIndex) * itemHeight, animated: false });
            minuteRef.current?.scrollTo({ y: (60 + mIndex) * itemHeight, animated: false });
            periodRef.current?.scrollTo({ y: (p === "AM" ? 0 : 1) * itemHeight, animated: false });
            setTimeout(() => { isScrollingProgrammatically.current = false; }, 100);
        }, 0);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingRoutineId(null);
        // Do NOT clear draft here; only clear after save
    };

    const handleDone = () => {
        if (isSubmittingRef.current) return;
        if (routineName.trim()) {
            if (selectedDays.length === 0) {
                setSelectDaysModalVisible(true);
                return;
            }
            const routineTime = getRoutineTimeValue();
            const selectedPreset = getPresetById(selectedPresetId);
            const currentRoutine = editingRoutineId ? routines.find(r => r.id === editingRoutineId) : undefined;
            const imageUrlToSave = selectedPreset?.imageUrl ?? currentRoutine?.imageUrl ?? null;
            const ringtoneToSave = selectedRingtone || 'alarm1';

            if (isRoutineDuplicate({
                name: routineName,
                time: routineTime,
                ringtone: ringtoneToSave,
                days: selectedDays,
                imageUrl: imageUrlToSave,
                excludeId: editingRoutineId ?? undefined,
            })) {
                setDuplicateRoutineModalVisible(true);
                return;
            }
            
            if (editingRoutineId) {
                // Show custom confirmation modal for editing
                setSaveConfirmVisible(true);
            } else {
                // Get imageUrl from selected preset
                const imageUrlToSave = selectedPreset?.imageUrl || null;
                const presetIdToSave = selectedPreset?.id ?? null;
                
                isSubmittingRef.current = true;
                createRoutineForCurrentUser({
                    name: routineName,
                    description: null,
                    is_active: true,
                    time: routineTime,
                    imageUrl: imageUrlToSave,
                    presetId: presetIdToSave,
                    days: selectedDays, // Pass days to database
                    ringtone: selectedRingtone || 'alarm1', // Pass ringtone to database
                })
                .then(async (created) => {
                    // Add to local storage with days/ringtone
                    const storageKey = await getStorageKeyForCurrentUser();
                    if (!storageKey) {
                        throw new Error('Not authenticated');
                    }
                    const stored = await AsyncStorage.getItem(storageKey);
                    const existing: Routine[] = stored ? JSON.parse(stored) : [];
                    const newRoutine: Routine = {
                        id: created.id,
                        name: routineName,
                        time: routineTime,
                        imageUrl: imageUrlToSave,
                        presetId: presetIdToSave,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    };
                    existing.push(newRoutine);
                    await AsyncStorage.setItem(storageKey, JSON.stringify(existing));
                    await upsertRoutineOverrideForCurrentUser(created.id, {
                        imageUrl: imageUrlToSave,
                        presetId: presetIdToSave,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    });
                    
                    NotificationService.scheduleRoutineNotification({
                        routineId: created.id,
                        routineName: routineName,
                        time: routineTime,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    }, {
                        suppressImmediatePlaybackMs: 70000,
                    }).catch(err => console.error('Error scheduling notification:', err));
                    await loadRoutinesFromDb();
                    closeModal();
                    setAddSuccessVisible(true);
                    // Clear draft after successful save
                    setAddRoutineDraft({
                        routineName: "",
                        hour: "00",
                        minute: "00",
                        period: "AM",
                        selectedPresetId: null,
                        selectedDays: [],
                        selectedRingtone: undefined,
                    });
                })
                .catch(err => logIfUnexpected('Supabase createRoutine error:', err))
                .finally(() => { isSubmittingRef.current = false; });
            }
        } else if (!editingRoutineId) {
            // Only close modal for Add (no editing), Edit has its own close in confirmation
            closeModal();
        }
    };

    const handleDelete = () => {
        if (editingRoutineId) {
            setDeleteConfirmVisible(true);
        }
    };

    const confirmDelete = async () => {
        if (editingRoutineId) {
            setDeleteConfirmVisible(false);
            try {
                // Cancel notification
                await NotificationService.cancelRoutineNotification(editingRoutineId);
                
                // Delete from database (both routine and progress records)
                await deleteRoutine(editingRoutineId);
                
                // Remove from local storage
                const storageKey = await getStorageKeyForCurrentUser();
                if (!storageKey) {
                    throw new Error('Not authenticated');
                }
                const stored = await AsyncStorage.getItem(storageKey);
                const existing: Routine[] = stored ? JSON.parse(stored) : [];
                const filtered = existing.filter(r => normalizeRoutineId(r.id) !== normalizeRoutineId(editingRoutineId));
                await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
                await removeRoutineOverrideForCurrentUser(editingRoutineId);
                
                // Update UI immediately
                setRoutines(filtered);
                closeModal();
                
                // Show success modal
                setDeleteSuccessVisible(true);
            } catch (err: any) {
                logIfUnexpected('Error deleting routine:', err);
                Alert.alert('Error', 'Failed to delete routine. Please try again.');
            }
        }
    };

    const openPresetModal = () => setPresetModalVisible(true);
    const closePresetModal = () => setPresetModalVisible(false);

    const selectPreset = (preset: Preset) => {
        setAddRoutineDraft(draft => ({
            ...draft,
            routineName: preset.name,
            selectedPresetId: preset.id
        }));
        closePresetModal();
    };

    useEffect(() => {
        if (!presetModalVisible) {
            setBookGuideIconLayout(null);
            setGameIconLayout(null);
            return;
        }

        const timer = setTimeout(() => {
            if (bookGuideIconRef.current) {
                bookGuideIconRef.current.measure((x, y, width, height, pageX, pageY) => {
                    setBookGuideIconLayout({ x: pageX, y: pageY, width, height });
                });
            }

            if (gameIconRef.current) {
                gameIconRef.current.measure((x, y, width, height, pageX, pageY) => {
                    setGameIconLayout({ x: pageX, y: pageY, width, height });
                });
            }

            startRoutinePresetOnboarding();
        }, 350);

        return () => clearTimeout(timer);
    }, [presetModalVisible]);

    const confirmSave = async () => {
        setSaveConfirmVisible(false);
        if (editingRoutineId) {
            const routineTime = getRoutineTimeValue();
            
            // Determine imageUrl to save: use newly selected preset if any; otherwise keep existing
            const selectedPreset = getPresetById(selectedPresetId);
            const current = routines.find(r => r.id === editingRoutineId);
            const imageUrlToSave = selectedPreset?.imageUrl ?? current?.imageUrl ?? null;
            const presetIdToSave = selectedPreset?.id ?? current?.presetId ?? null;

            updateRoutine(editingRoutineId, {
                name: routineName,
                time: routineTime,
                imageUrl: imageUrlToSave,
                presetId: presetIdToSave,
                days: selectedDays, // Save days to database
                ringtone: selectedRingtone || 'alarm1', // Save ringtone to database
            })
            .then(async () => {
                // Update in local storage with days/ringtone
                const storageKey = await getStorageKeyForCurrentUser();
                if (!storageKey) {
                    throw new Error('Not authenticated');
                }
                const stored = await AsyncStorage.getItem(storageKey);
                const existing: Routine[] = stored ? JSON.parse(stored) : [];
                const idx = existing.findIndex(r => normalizeRoutineId(r.id) === normalizeRoutineId(editingRoutineId));
                if (idx >= 0) {
                    existing[idx] = {
                        ...existing[idx],
                        name: routineName,
                        time: routineTime,
                        imageUrl: imageUrlToSave,
                        presetId: presetIdToSave,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    };
                    await AsyncStorage.setItem(storageKey, JSON.stringify(existing));
                }
                await upsertRoutineOverrideForCurrentUser(editingRoutineId, {
                    imageUrl: imageUrlToSave,
                    presetId: presetIdToSave,
                    ringtone: selectedRingtone || 'alarm1',
                    days: selectedDays,
                });
                return loadRoutinesFromDb();
            })
            .catch(err => logIfUnexpected('Supabase updateRoutine error:', err));

            NotificationService.scheduleRoutineNotification({
                routineId: editingRoutineId,
                routineName: routineName,
                time: routineTime,
                ringtone: selectedRingtone || 'alarm1',
                days: selectedDays,
            }, {
                suppressImmediatePlaybackMs: 70000,
            }).catch(err => console.error('Error scheduling notification:', err));
            
            closeModal();
            setEditSuccessVisible(true);
        }
    };

    const openRingtoneModal = () => setRingtoneModalVisible(true);
    const closeRingtoneModal = async () => {
        await NotificationService.stopRingtone(); // Ensure sound stops when modal closes
        setPreviewingRingtone(null);
        setRingtoneDeleteConfirmVisible(false);
        setRingtoneDeleteTarget(null);
        setRingtoneModalVisible(false);
    };

    const showRingtoneAddAlert = (type: RingtoneAddAlertType, message: string) => {
        setRingtoneAddAlertType(type);
        setRingtoneAddAlertMessage(message);
        setRingtoneAddAlertVisible(true);
    };

    const togglePreview = async (ringtoneName: string) => {
        // Select the ringtone immediately
        setSelectedRingtone(ringtoneName);
        
        // If this ringtone is already playing, stop it and close modal
        if (previewingRingtone === ringtoneName) {
            setPreviewingRingtone(null); // Update UI immediately
            await NotificationService.stopRingtone().catch(console.error);
            closeRingtoneModal();
            return;
        }
        
        // Update UI immediately for instant feedback
        setPreviewingRingtone(ringtoneName);
        
        // Properly await stop before play to prevent overlap
        try {
            await NotificationService.stopRingtone();
            await NotificationService.playRingtone(ringtoneName);
        } catch (error) {
            console.error('Error playing ringtone:', error);
        }
    };

    const handleAddCustomRingtone = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const selectedFile = result.assets?.[0];
            if (!selectedFile?.uri) {
                showRingtoneAddAlert('error', 'Unable to read the selected file.');
                return;
            }

            const fileName = selectedFile.name || 'Custom Ringtone';
            const mimeType = (selectedFile.mimeType || '').toLowerCase();
            const isAudioFile = mimeType.startsWith('audio/') || AUDIO_FILE_EXTENSION_REGEX.test(fileName);

            if (!isAudioFile) {
                showRingtoneAddAlert('error', 'Please select an audio file (mp3, wav, m4a, aac, ogg, flac).');
                return;
            }

            const normalizedName =
                fileName.replace(/\.[^/.]+$/, '').trim() || `Custom Ringtone ${customRingtones.length + 1}`;
            const selectedNameKey = normalizeAlarmKey(normalizedName);
            const selectedUriNameKey = normalizeAlarmKey(getFileNameFromUri(selectedFile.uri));

            const duplicateRingtone = customRingtones.find((item) => {
                const itemNameKey = normalizeAlarmKey(item.name);
                const itemUriNameKey = normalizeAlarmKey(getFileNameFromUri(item.uri));

                return (
                    item.uri === selectedFile.uri ||
                    (selectedNameKey.length > 0 &&
                        (itemNameKey === selectedNameKey || itemUriNameKey === selectedNameKey)) ||
                    (selectedUriNameKey.length > 0 &&
                        (itemNameKey === selectedUriNameKey || itemUriNameKey === selectedUriNameKey))
                );
            });

            if (duplicateRingtone) {
                setSelectedRingtone(duplicateRingtone.uri);
                showRingtoneAddAlert('duplicate', 'This alarm is already added.');
                return;
            }

            const nextRingtones: CustomRingtone[] = [
                {
                    name: normalizedName,
                    uri: selectedFile.uri,
                    mimeType: selectedFile.mimeType ?? undefined,
                },
                ...customRingtones,
            ];

            setCustomRingtones(nextRingtones);
            await persistCustomRingtones(nextRingtones);
            setSelectedRingtone(selectedFile.uri);
            showRingtoneAddAlert('success', `${normalizedName} added to your ringtone list.`);
        } catch (error) {
            console.error('Error adding custom ringtone:', error);
            showRingtoneAddAlert('error', 'Failed to add ringtone. Please try again.');
        }
    };

    const requestDeleteCustomRingtone = (uri: string) => {
        const nextDeleteTarget = customRingtones.find((item) => item.uri === uri);

        if (!nextDeleteTarget) {
            showRingtoneAddAlert('error', 'Only downloaded alarms can be deleted.');
            return;
        }

        setRingtoneDeleteTarget(nextDeleteTarget);
        setRingtoneDeleteConfirmVisible(true);
    };

    const cancelDeleteCustomRingtone = () => {
        setRingtoneDeleteConfirmVisible(false);
        setRingtoneDeleteTarget(null);
    };

    const handleDeleteCustomRingtone = async () => {
        const ringtoneToDelete = ringtoneDeleteTarget;

        if (!ringtoneToDelete) {
            setRingtoneDeleteConfirmVisible(false);
            return;
        }

        setRingtoneDeleteConfirmVisible(false);

        try {
            const nextRingtones = customRingtones.filter((item) => item.uri !== ringtoneToDelete.uri);
            setCustomRingtones(nextRingtones);
            await persistCustomRingtones(nextRingtones);

            if (previewingRingtone === ringtoneToDelete.uri) {
                setPreviewingRingtone(null);
                await NotificationService.stopRingtone().catch(console.error);
            }

            setSelectedRingtone('alarm1');
            setRingtoneDeleteTarget(null);
            showRingtoneAddAlert('deleted', `${ringtoneToDelete.name} was deleted from your ringtone list.`);
        } catch (error) {
            console.error('Error deleting custom ringtone:', error);
            setRingtoneDeleteTarget(null);
            showRingtoneAddAlert('error', 'Failed to delete ringtone. Please try again.');
        }
    };

    const getRingtoneName = (ringtoneId: string): string => {
        const builtIn = BUILT_IN_RINGTONES.find((ringtone) => ringtone.id === ringtoneId);
        if (builtIn) return builtIn.name;

        const custom = customRingtones.find((ringtone) => ringtone.uri === ringtoneId);
        if (custom) return custom.name;

        return ringtoneId;
    };

    const isSelectedCustomRingtone =
        !!selectedRingtone && customRingtones.some((ringtone) => ringtone.uri === selectedRingtone);

    return (
        <View style={{ flex: 1 }}>
            {/* Background Image */}
            <Image
                source={require("../../assets/background.png")}
                style={styles.backgroundImage}
                resizeMode="stretch"
            />
            
            {/* Brand logo */}
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
                {parentalLockEnabled && mode === 'parent' && (
                    <TouchableOpacity
                        style={styles.modeButton}
                        onPress={() => {
                            backToChildMode();
                            router.push('/(tabs)/home');
                        }}
                    >
                            <View style={styles.modeButtonContent}>
                                <Image source={require("../../assets/images/Child.png")} style={styles.modeButtonIcon} />
                                <Text style={styles.modeButtonText}>Back to Child Mode</Text>
                            </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Title row with plus button */}
            <View style={styles.titleRow}>
                <Text style={styles.titleText}>Setup day routine</Text>
                <TouchableOpacity
                    ref={plusButtonRef}
                    style={styles.plusBtn}
                    activeOpacity={0.8}
                    onPress={openModal}
                >
                    <Text style={styles.plusSign}>＋</Text>
                </TouchableOpacity>
            </View>

        {/* Routines List */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            {routines.map((routine) => {
                // Get preset from database imageUrl or fallback to presetId
                const preset = resolveRoutinePreset(routine);
                return (
                    <TouchableOpacity 
                        key={routine.id} 
                        style={styles.routineCard}
                        onPress={() => openEditModal(routine)}
                        activeOpacity={0.7}
                    >
                        {preset ? (
                            <Image source={getPresetStaticImage(preset.id) ?? preset.image} style={styles.routineImage} />
                        ) : (
                            <View style={styles.routineIconPlaceholder}>
                                <Text style={styles.routineIcon}>📋</Text>
                            </View>
                        )}
                        <View style={styles.routineInfo}>
                            <Text style={styles.routineTitle}>{routine.name}</Text>
                            <Text style={styles.routineTime}>{routine.time}</Text>
                            <Text style={styles.routineDays}>{formatDays(routine.days)}</Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>

            {/* Modal that slides from bottom */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <View style={{ flex: 1 }}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Header (Back only) */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity style={styles.backButtonTouchable} onPress={closeModal}>
                                <Text
                                    style={styles.backText}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.82}
                                    allowFontScaling={false}
                                >
                                    Back
                                </Text>
                            </TouchableOpacity>
                            <View />
                        </View>

                    <ScrollView
                        ref={addRoutineModalScrollRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: scaleSpacing(28) + insets.bottom + (keyboardInset * 0.45) }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Time Picker Section */}
                        <View style={styles.timePickerCard} ref={timePickerRef} collapsable={false}>
                            <Text style={styles.timePickerTitle}>ENTER TIME</Text>

                            <View style={styles.manualTimeRow}>
                                <View style={styles.manualTimeFieldGroup}>
                                    <TextInput
                                        ref={hourInputRef}
                                        style={styles.manualTimeInput}
                                        value={hour}
                                        onChangeText={handleHourInputChange}
                                        onBlur={normalizeHourInput}
                                        placeholder="HH"
                                        placeholderTextColor="#9AA7A6"
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        textAlign="center"
                                        textAlignVertical="center"
                                        selectTextOnFocus
                                    />
                                    <Text style={styles.manualTimeLabel}>Hour</Text>
                                </View>

                                <Text style={styles.manualTimeColon}>:</Text>

                                <View style={styles.manualTimeFieldGroup}>
                                    <TextInput
                                        ref={minuteInputRef}
                                        style={styles.manualTimeInput}
                                        value={minute}
                                        onChangeText={handleMinuteInputChange}
                                        onBlur={normalizeMinuteInput}
                                        placeholder="MM"
                                        placeholderTextColor="#9AA7A6"
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        textAlign="center"
                                        textAlignVertical="center"
                                        selectTextOnFocus
                                    />
                                    <Text style={styles.manualTimeLabel}>Minute</Text>
                                </View>

                                <View style={styles.manualTimeFieldGroup}>
                                    <View style={styles.periodToggleContainer}>
                                        {["AM", "PM"].map((timePeriod) => {
                                            const selected = period === timePeriod;
                                            return (
                                                <TouchableOpacity
                                                    key={timePeriod}
                                                    style={[styles.periodToggleButton, selected && styles.periodToggleButtonSelected]}
                                                    onPress={() => onPressPeriod(timePeriod as "AM" | "PM")}
                                                >
                                                    <Text style={[styles.periodToggleText, selected && styles.periodToggleTextSelected]}>{timePeriod}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.manualTimeLabel}></Text>
                                </View>
                            </View>
                        </View>
                            {/* Form Section */}
                            <View style={styles.formCard}>
                                {/* Day of Week Selector */}
                                <View style={styles.daysRow} ref={daysRef} collapsable={false}>
                                    {[
                                        { idx: 0, label: 'Su' },
                                        { idx: 1, label: 'Mo' },
                                        { idx: 2, label: 'Tu' },
                                        { idx: 3, label: 'We' },
                                        { idx: 4, label: 'Th' },
                                        { idx: 5, label: 'Fr' },
                                        { idx: 6, label: 'Sa' },
                                    ].map(d => {
                                        const selected = selectedDays.includes(d.idx);
                                        return (
                                            <TouchableOpacity
                                                key={d.idx}
                                                style={[styles.dayChip, selected && styles.dayChipSelected]}
                                                onPress={() => {
                                                    setSelectedDays(selectedDays.includes(d.idx)
                                                        ? selectedDays.filter(x => x !== d.idx)
                                                        : [...selectedDays, d.idx].sort((a, b) => a - b)
                                                    );
                                                }}
                                            >
                                                <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{d.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {/* Choose Routine Preset - white bordered selector with chevron (disabled when editing) */}
                                <View ref={presetRef} collapsable={false} style={{ marginBottom: 16 }}>
                                    <TouchableOpacity 
                                        style={[styles.ringtoneSelector, { backgroundColor: editingRoutineId ? '#F5F5F5' : '#FFFFFF' }]} 
                                        onPress={openPresetModal} 
                                        disabled={!!editingRoutineId}
                                    >
                                        <Text style={styles.ringtoneText}>Choose Routine Preset</Text>
                                        <Text style={styles.chevron}>›</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Routine Name Input - non-editable if preset selected */}
                                <View
                                    ref={routineNameRef}
                                    collapsable={false}
                                    style={{ marginBottom: 16, position: 'relative' }}
                                    onLayout={(event) => setRoutineNameFieldY(event.nativeEvent.layout.y)}
                                >
                                    <TextInput
                                        style={[styles.input, selectedPresetId && styles.inputDisabled, { paddingRight: selectedPresetId ? 38 : 16 }]}
                                        placeholder="Routine name"
                                        placeholderTextColor="#000000ff"
                                        value={routineName}
                                        onChangeText={setRoutineName}
                                        onFocus={bringRoutineNameIntoView}
                                        onBlur={() => setIsRoutineNameFocused(false)}
                                        editable={!selectedPresetId}
                                    />
                                    {selectedPresetId && (
                                        <TouchableOpacity
                                            style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', height: '100%' }}
                                            onPress={() => {
                                                setSelectedPresetId(null);
                                            }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            accessibilityLabel="Clear preset"
                                        >
                                            <FontAwesome name="times" size={15} color="#bbb" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Ringtone Selector */}
                                <View ref={ringtoneRef} collapsable={false}>
                                    <TouchableOpacity 
                                        style={styles.ringtoneSelector} 
                                        onPress={openRingtoneModal}
                                    >
                                        <View style={[styles.ringtoneTextContainer, { flexDirection: 'row', alignItems: 'center' }]}> 
                                            <Text style={styles.ringtoneText}>Ringtone:</Text>
                                            {selectedRingtone ? (
                                                <Text style={styles.ringtoneTextSelected}>
                                                    {' '}{getRingtoneName(selectedRingtone)}
                                                </Text>
                                            ) : (
                                                <View style={{ flexDirection: 'column', marginLeft: 4 }}>
                                                    <Text style={styles.ringtoneTextDefault}> Default ringtone</Text>
                                                    <Text style={styles.ringtoneTextSubtitle}>(Morning Bell)</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.chevron}>›</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Delete Button - Only show when editing */}
                            {editingRoutineId && (
                                <TouchableOpacity 
                                    style={styles.deleteButton}
                                    onPress={handleDelete}
                                >
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                </TouchableOpacity>
                            )}

                            {/* Action buttons (outside the card) */}
                            <TouchableOpacity
                                style={[styles.presetButton, { marginTop: editingRoutineId ? 8 : 16, marginBottom: 8, opacity: isSubmittingRef.current ? 0.6 : 1 }]}
                                onPress={handleDone}
                                disabled={isSubmittingRef.current}
                            >
                                <Text style={styles.presetButtonText}>{editingRoutineId ? 'Save' : 'Add Routine'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
                </View>
            </Modal>

            {/* Full-screen Preset Modal */}
            <Modal
                visible={presetModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={closePresetModal}
            >
            <View style={{ flex: 1 }}>
                {/* Background Image */}
                <Image
                    source={require("../../assets/background.png")}
                    style={styles.backgroundImage}
                    resizeMode="stretch"
                />
                <View style={styles.presetScreen}>
                {/* Header with Back button in upper-left */}
                <View style={[styles.presetHeader, { paddingTop: insets.top + scaleSpacing(8) }]}>
                    <TouchableOpacity style={styles.backButtonTouchable} onPress={closePresetModal}>
                        <Text
                            style={styles.backText}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.82}
                            allowFontScaling={false}
                        >
                            Back
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Title below header */}
                <Text style={styles.presetTitleCentered}>Routine Preset</Text>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                        {PRESETS.map((p, index) => (
                            <TouchableOpacity key={p.id} style={styles.presetItem} onPress={() => selectPreset(p)}>
                                <Image source={getPresetStaticImage(p.id) ?? p.image} style={styles.presetImage} />
                                <Text style={styles.presetItemText}>{p.name}</Text>
                                <View style={styles.presetIconsContainer}>
                                    <View
                                        ref={index === 0 ? bookGuideIconRef : undefined}
                                        collapsable={false}
                                        style={styles.iconSlot}
                                    >
                                        {p.hasBookGuide && (
                                            <Image 
                                                source={require("../../assets/images/BookGuide.png")} 
                                                style={styles.presetIcon} 
                                            />
                                        )}
                                    </View>
                                    <View
                                        ref={index === 0 ? gameIconRef : undefined}
                                        collapsable={false}
                                        style={styles.iconSlot}
                                    >
                                        {p.hasMiniGame && (
                                            <Image 
                                                source={require("../../assets/images/MiniGame.png")} 
                                                style={styles.presetIcon} 
                                            />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <RoutinePresetOnboarding
                        visible={showRoutinePresetOnboarding}
                        bookGuideIconLayout={bookGuideIconLayout}
                        gameIconLayout={gameIconLayout}
                        onComplete={completeRoutinePresetOnboarding}
                        onSkip={skipRoutinePresetOnboarding}
                    />
                </View>
            </View>
            </Modal>

            {/* Ringtone Selection Modal */}
            <Modal
                visible={ringtoneModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={closeRingtoneModal}
            >
                <View style={{ flex: 1 }}>
                    {/* Background Image */}
                    <Image
                        source={require("../../assets/background.png")}
                        style={styles.backgroundImage}
                        resizeMode="stretch"
                    />
                    
                    <View style={styles.presetScreen}>
                        {/* Header with Back button */}
                        <View style={[styles.presetHeader, { paddingTop: insets.top + scaleSpacing(8) }]}>
                            <TouchableOpacity style={styles.backButtonTouchable} onPress={closeRingtoneModal}>
                                <Text
                                    style={styles.backText}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.82}
                                    allowFontScaling={false}
                                >
                                    Back
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Title */}
                        <Text style={styles.presetTitleCentered}>Select Ringtone</Text>

                        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                            {/* Add New Ringtone Button */}
                            <TouchableOpacity
                                style={styles.addRingtoneButton}
                                onPress={handleAddCustomRingtone}
                            >
                                <Text style={styles.addRingtoneButtonText}>+ Add New Ringtone</Text>
                            </TouchableOpacity>

                            {/* Built-in Ringtones */}
                            {BUILT_IN_RINGTONES.map((ringtone) => (
                                <TouchableOpacity
                                    key={ringtone.id}
                                    style={[
                                        styles.ringtoneItem,
                                        selectedRingtone === ringtone.id && styles.selectedRingtoneItem
                                    ]}
                                    onPress={() => togglePreview(ringtone.id)}
                                >
                                    <View style={styles.ringtoneInfo}>
                                        <Text style={styles.ringtoneItemTitle}>{ringtone.name}</Text>
                                        <View style={styles.radioButton}>
                                            {previewingRingtone === ringtone.id && <View style={styles.radioInner} />}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Custom Alarms Section */}
                            {customRingtones.length > 0 && (
                                <>
                                    <Text style={styles.ringtoneSectionHeader}>Custom Alarms</Text>
                                    {customRingtones.map((ringtone) => (
                                        <TouchableOpacity
                                            key={ringtone.uri}
                                            style={[
                                                styles.ringtoneItem,
                                                selectedRingtone === ringtone.uri && styles.selectedRingtoneItem
                                            ]}
                                            onPress={() => togglePreview(ringtone.uri)}
                                        >
                                            <View style={styles.ringtoneInfo}>
                                                <Text style={styles.ringtoneItemTitle} numberOfLines={1}>{ringtone.name}</Text>
                                                <View style={styles.ringtoneItemActions}>
                                                    <TouchableOpacity
                                                        style={styles.ringtoneTrashButton}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            requestDeleteCustomRingtone(ringtone.uri);
                                                        }}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <FontAwesome name="trash" size={scaleFont(16)} color="#FF6F79" />
                                                    </TouchableOpacity>
                                                    <View style={styles.radioButton}>
                                                        {previewingRingtone === ringtone.uri && <View style={styles.radioInner} />}
                                                    </View>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delete Ringtone Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={ringtoneDeleteConfirmVisible}
                onRequestClose={cancelDeleteCustomRingtone}
            >
                <View style={styles.deleteModalOverlay}>
                    <View style={styles.deleteModalContainer}>
                        <View style={styles.deleteIconCircle}>
                            <FontAwesome name="trash" size={scaleFont(34)} color="#FF6F79" />
                        </View>

                        <Text style={styles.deleteModalTitle}>Delete Alarm</Text>
                        <Text style={styles.deleteModalMessage}>
                            {ringtoneDeleteTarget
                                ? `Do you want to delete ${ringtoneDeleteTarget.name}?`
                                : 'Do you want to delete this alarm?'}
                        </Text>

                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={styles.deleteCancelButton}
                                onPress={cancelDeleteCustomRingtone}
                            >
                                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.deleteConfirmButton}
                                onPress={handleDeleteCustomRingtone}
                            >
                                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteConfirmVisible}
                onRequestClose={() => setDeleteConfirmVisible(false)}
            >
                <View style={styles.deleteModalOverlay}>
                    <View style={styles.deleteModalContainer}>
                        <View style={styles.deleteIconCircle}>
                            <Image
                                source={require("../../assets/images/Delete.png")}
                                style={styles.deleteIcon}
                            />
                        </View>
                        
                        <Text style={styles.deleteModalTitle}>Are you sure?</Text>
                        <Text style={styles.deleteModalMessage}>
                            Do you really want to delete this routine?{'\n'}
                            This action cannot be undone.
                        </Text>
                        
                        <View style={styles.deleteModalButtons}>
                            <TouchableOpacity
                                style={styles.deleteCancelButton}
                                onPress={() => setDeleteConfirmVisible(false)}
                            >
                                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.deleteConfirmButton}
                                onPress={confirmDelete}
                            >
                                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Success Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={deleteSuccessVisible}
                onRequestClose={() => setDeleteSuccessVisible(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContainer}>
                        <View style={styles.successIconCircle}>
                            <Image
                                source={require("../../assets/images/Checkmark.png")}
                                style={styles.successIcon}
                            />
                        </View>
                        
                        <Text style={styles.successModalTitle}>Success!</Text>
                        <Text style={styles.successModalMessage}>Routine deleted successfully</Text>
                        
                        <TouchableOpacity
                            style={styles.successOkButton}
                            onPress={() => setDeleteSuccessVisible(false)}
                        >
                            <Text style={styles.successOkButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Save Changes Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={saveConfirmVisible}
                onRequestClose={() => setSaveConfirmVisible(false)}
            >
                <View style={styles.saveModalOverlay}>
                    <View style={styles.saveModalContainer}>
                        <View style={styles.saveIconCircle}>
                            <Image
                                source={require("../../assets/images/Save.png")}
                                style={styles.saveIcon}
                            />
                        </View>
                        
                        <Text style={styles.saveModalTitle}>Save Changes</Text>
                        <Text style={styles.saveModalMessage}>
                            Do you want to save the changes to this routine?
                        </Text>
                        
                        <View style={styles.saveModalButtons}>
                            <TouchableOpacity
                                style={styles.saveCancelButton}
                                onPress={() => setSaveConfirmVisible(false)}
                            >
                                <Text style={styles.saveCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.saveConfirmButton}
                                onPress={confirmSave}
                            >
                                <Text style={styles.saveConfirmButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Select Days Error Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={selectDaysModalVisible}
                onRequestClose={() => setSelectDaysModalVisible(false)}
            >
                <View style={styles.selectDaysModalOverlay}>
                    <View style={styles.selectDaysModalContainer}>
                        <View style={styles.selectDaysIconCircle}>
                            <Image
                                source={require("../../assets/images/Calendar.png")}
                                style={styles.selectDaysIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.selectDaysModalTitle}>Select Days</Text>
                        <Text style={styles.selectDaysModalMessage}>
                            Please pick at least one day for this routine.
                        </Text>
                        <TouchableOpacity
                            style={styles.selectDaysOkButton}
                            onPress={() => setSelectDaysModalVisible(false)}
                        >
                            <Text style={styles.selectDaysOkButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Duplicate Routine Error Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={duplicateRoutineModalVisible}
                onRequestClose={() => setDuplicateRoutineModalVisible(false)}
            >
                <View style={styles.selectDaysModalOverlay}>
                    <View style={styles.selectDaysModalContainer}>
                        <View style={styles.selectDaysIconCircle}>
                            <Image
                                source={require("../../assets/images/Duplicate.png")}
                                style={styles.selectDaysIcon}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.saveModalTitle}>Duplicated Routine</Text>
                        <Text style={styles.saveModalMessage}>
                            This routine already exists. Please change the time, day, preset, or ringtone.
                        </Text>
                        <TouchableOpacity
                            style={styles.selectDaysOkButton}
                            onPress={() => setDuplicateRoutineModalVisible(false)}
                        >
                            <Text style={styles.selectDaysOkButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Alarm Alert Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={ringtoneAddAlertVisible}
                onRequestClose={() => setRingtoneAddAlertVisible(false)}
            >
                <View style={styles.selectDaysModalOverlay}>
                    <View
                        style={
                                ringtoneAddAlertType === 'success'
                                ? styles.successModalContainer
                                : styles.selectDaysModalContainer
                        }
                    >
                        <View
                            style={
                                ringtoneAddAlertType === 'success'
                                    ? styles.successIconCircle
                                    : styles.selectDaysIconCircle
                            }
                        >
                            <FontAwesome
                                name={
                                    ringtoneAddAlertType === 'success'
                                        ? 'check-circle'
                                        : ringtoneAddAlertType === 'deleted'
                                            ? 'trash'
                                        : ringtoneAddAlertType === 'duplicate'
                                            ? 'exclamation-triangle'
                                            : 'times-circle'
                                }
                                size={scaleFont(34)}
                                color={ringtoneAddAlertType === 'success' ? '#4CAF50' : '#FF6F79'}
                            />
                        </View>

                        <Text style={styles.saveModalTitle}>
                            {ringtoneAddAlertType === 'success'
                                ? 'Alarm Added'
                                : ringtoneAddAlertType === 'deleted'
                                    ? 'Alarm Deleted'
                                : ringtoneAddAlertType === 'duplicate'
                                    ? 'Already Added'
                                    : 'Alarm Error'}
                        </Text>
                        <Text style={styles.saveModalMessage}>{ringtoneAddAlertMessage}</Text>

                        <TouchableOpacity
                            style={
                                ringtoneAddAlertType === 'success'
                                    ? styles.successOkButton
                                    : styles.selectDaysOkButton
                            }
                            onPress={() => setRingtoneAddAlertVisible(false)}
                        >
                            <Text
                                style={
                                    ringtoneAddAlertType === 'success'
                                        ? styles.successOkButtonText
                                        : styles.selectDaysOkButtonText
                                }
                            >
                                OK
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Success Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={addSuccessVisible}
                onRequestClose={() => setAddSuccessVisible(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContainer}>
                        <View style={styles.successIconCircle}>
                            <Image
                                source={require("../../assets/images/Checkmark.png")}
                                style={styles.successIcon}
                            />
                        </View>
                        
                        <Text style={styles.successModalTitle}>Success!</Text>
                        <Text style={styles.successModalMessage}>Routine added successfully</Text>
                        
                        <TouchableOpacity
                            style={styles.successOkButton}
                            onPress={() => setAddSuccessVisible(false)}
                        >
                            <Text style={styles.successOkButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit Success Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={editSuccessVisible}
                onRequestClose={() => setEditSuccessVisible(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContainer}>
                        <View style={styles.successIconCircle}>
                            <Image
                                source={require("../../assets/images/Checkmark.png")}
                                style={styles.successIcon}
                            />
                        </View>
                        
                        <Text style={styles.successModalTitle}>Success!</Text>
                        <Text style={styles.successModalMessage}>Routine updated successfully</Text>
                        
                        <TouchableOpacity
                            style={styles.successOkButton}
                            onPress={() => setEditSuccessVisible(false)}
                        >
                            <Text style={styles.successOkButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            {/* Add Routine Onboarding Tour */}
            <AddRoutineOnboardingTour
                visible={showAddRoutineOnboarding}
                onComplete={completeAddRoutineOnboarding}
                onSkip={skipAddRoutineOnboarding}
                plusButtonLayout={plusButtonLayout}
            />
            
            {/* Add Routine Modal Onboarding Tour */}
            <AddRoutineModalOnboarding
                visible={showAddRoutineModalOnboarding && modalVisible}
                step={currentAddRoutineModalStep}
                onNext={nextAddRoutineModalStep}
                onSkip={skipAddRoutineModalOnboarding}
                layouts={modalOnboardingLayouts}
            />
        </View>
    );
}

// Helper to format selected days
function formatDays(days?: number[]) {
    const full = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    // Legacy routines without days -> assume everyday
    if (!days) return 'Everyday';
    if (days.length === 7) return 'Everyday';
    if (days.length === 0) return '';
    return days.map(d => full[d]).join(', ');
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
    backgroundImage: {
        position: "absolute",
        width: "100%",
        height: "100%",
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
    titleRow: {
        paddingHorizontal: scale.scaleSpacing(16),
        paddingTop: scale.scaleSpacing(28),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
    },
    titleText: {
        fontSize: scale.scaleFont(28),
        fontWeight: "800",
        color: "#244D4A",
        fontFamily: "Courier",
    },
    plusBtn: {
        width: scale.scaleWidth(36),
        height: scale.scaleHeight(36),
        borderRadius: scale.scaleBorderRadius(18),
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E6E6E6",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 2,
    },
    plusSign: { 
        fontSize: scale.scaleFont(18), 
        color: "#304D4A", 
        fontWeight: "700" 
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#ffffffff",
        borderTopLeftRadius: scale.scaleBorderRadius(20),
        borderTopRightRadius: scale.scaleBorderRadius(20),
        height: "85%",
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: scale.scaleSpacing(16),
        paddingHorizontal: scale.scaleSpacing(20),
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    backButtonTouchable: {
        alignSelf: "flex-start",
        minWidth: scale.scaleWidth(64),
    },
    backText: {
        fontSize: scale.scaleFont(18),
        color: "#244D4A",
        textDecorationLine: "underline",
        textDecorationColor: "#244D4A",
        paddingVertical: scale.scaleSpacing(6),
        paddingHorizontal: scale.scaleSpacing(6),
        minWidth: scale.scaleWidth(52),
    },
    modalTitle: {
        fontSize: scale.scaleFont(18),
        fontWeight: "700",
        color: "#244D4A",
        fontFamily: "Courier",
    },
    doneText: {
        fontSize: scale.scaleFont(16),
        color: "#244D4A",
        textDecorationLine: "underline",
        textDecorationColor: "#244D4A",
    },
    timePickerCard: {
        backgroundColor: "#fff",
        borderRadius: scale.scaleBorderRadius(16),
        padding: scale.scaleSpacing(20),
        paddingVertical: scale.scaleSpacing(16),
        marginBottom: scale.scaleSpacing(16),
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    timePickerTitle: {
        fontSize: scale.scaleFont(13),
        fontWeight: "700",
        color: "#244D4A",
        letterSpacing: 2,
        marginBottom: scale.scaleSpacing(14),
        textAlign: "center",
    },
    manualTimeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: scale.scaleSpacing(10),
    },
    manualTimeFieldGroup: {
        flex: 1,
        alignItems: "center",
    },
    manualTimeInput: {
        width: "100%",
        minWidth: scale.scaleWidth(86),
        height: scale.scaleHeight(92),
        borderRadius: scale.scaleBorderRadius(12),
        borderWidth: 2,
        borderColor: "#B8E6D9",
        backgroundColor: "#FFFFFF",
        fontSize: scale.scaleFont(24),
        fontWeight: "700",
        color: "#6B7280",
        textAlign: "center",
        textAlignVertical: "center",
        writingDirection: "ltr",
        paddingVertical: scale.scaleSpacing(8),
        paddingHorizontal: 0,
        includeFontPadding: false,
    },
    manualTimeLabel: {
        marginTop: scale.scaleSpacing(10),
        fontSize: scale.scaleFont(13),
        fontWeight: "500",
        color: "#6B7280",
    },
    manualTimeColon: {
        fontSize: scale.scaleFont(48),
        fontWeight: "400",
        color: "#111827",
        marginHorizontal: scale.scaleSpacing(2),
        marginBottom: scale.scaleSpacing(28),
    },
    periodToggleContainer: {
        width: "100%",
        maxWidth: scale.scaleWidth(72),
        height: scale.scaleHeight(92),
        borderRadius: scale.scaleBorderRadius(12),
        borderWidth: 2,
        borderColor: "#B8E6D9",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
    },
    periodToggleButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#B8E6D9",
    },
    periodToggleButtonSelected: {
        backgroundColor: "#5DD4B4",
    },
    periodToggleText: {
        fontSize: scale.scaleFont(18),
        fontWeight: "600",
        color: "#6B7280",
    },
    periodToggleTextSelected: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
    formCard: {
        backgroundColor: "#fff",
        borderRadius: scale.scaleBorderRadius(16),
        padding: scale.scaleSpacing(20),
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    presetButton: {
        backgroundColor: "#5DD4B4",
        borderRadius: scale.scaleBorderRadius(12),
        paddingVertical: scale.scaleSpacing(14),
        alignItems: "center",
        marginBottom: scale.scaleSpacing(16),
    },
    presetButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#fff",
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale.scaleBorderRadius(12),
        paddingVertical: scale.scaleSpacing(14),
        paddingHorizontal: scale.scaleSpacing(16),
        fontSize: scale.scaleFont(16),
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    inputDisabled: {
        backgroundColor: "#F5F5F5",
    },
    ringtoneSelector: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale.scaleBorderRadius(12),
        paddingVertical: scale.scaleSpacing(10),
        paddingHorizontal: scale.scaleSpacing(16),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    ringtoneText: {
        fontSize: scale.scaleFont(16),
        color: "#244D4A",
        fontWeight: "600",
        lineHeight: scale.scaleFont(20),
    },
    ringtoneTextDefault: {
        fontSize: scale.scaleFont(15),
        color: '#888',
        fontWeight: '500',
        marginTop: 2,
    },
    ringtoneTextSubtitle: {
        fontSize: scale.scaleFont(14),
        color: '#888',
        marginTop: -2,
        marginBottom: 2,
    },
    ringtoneTextSelected: {
        fontSize: scale.scaleFont(15),
        color: '#244D4A',
        fontWeight: '500',
        marginTop: 2,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scale.scaleSpacing(16),
        gap: scale.scaleSpacing(6),
    },
    dayChip: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#B8E6D9',
        borderRadius: scale.scaleBorderRadius(12),
        paddingVertical: scale.scaleSpacing(8),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 2,
    },
    dayChipSelected: {
        backgroundColor: '#5DD4B4',
        borderColor: '#5DD4B4',
    },
    dayChipText: {
        fontSize: scale.scaleFont(14),
        color: '#244D4A',
        fontWeight: '700',
    },
    dayChipTextSelected: {
        color: '#FFFFFF',
    },
    chevron: {
        fontSize: scale.scaleFont(24),
        color: "#5DD4B4",
        fontWeight: "300",
    },
    ringtoneItem: {
        backgroundColor: "#fff",
        borderRadius: scale.scaleBorderRadius(14),
        paddingVertical: scale.scaleSpacing(8),
        paddingHorizontal: scale.scaleSpacing(12),
        marginBottom: scale.scaleSpacing(10),
        borderWidth: 2,
        borderColor: "#B8E6D9",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 2,
    },
    selectedRingtoneItem: {
        borderColor: "#5DD4B4",
        borderWidth: 3,
        backgroundColor: "#F0FFF9",
    },
    ringtoneInfo: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "space-between",
    },
    ringtoneIcon: {
        fontSize: scale.scaleFont(48),
        marginRight: scale.scaleSpacing(16),
    },
    ringtoneTextContainer: {
        flex: 1,
    },
    ringtoneItemTitle: {
        fontSize: scale.scaleFont(16),
        fontWeight: "700",
        color: "#244D4A",
        marginBottom: 0,
    },
    ringtoneItemSubtitle: {
        fontSize: scale.scaleFont(14),
        color: "#666",
    },
    previewButton: {
        backgroundColor: "#5DD4B4",
        borderRadius: scale.scaleBorderRadius(8),
        paddingVertical: scale.scaleSpacing(8),
        paddingHorizontal: scale.scaleSpacing(16),
    },
    previewButtonText: {
        fontSize: scale.scaleFont(14),
        fontWeight: "600",
        color: "#fff",
    },
    previewIconButton: {
        width: scale.scaleWidth(40),
        height: scale.scaleHeight(40),
        borderRadius: scale.scaleBorderRadius(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewIcon: {
        width: scale.scaleWidth(22),
        height: scale.scaleHeight(22),
        resizeMode: 'contain',
    },
    radioButton: {
        width: scale.scaleWidth(22),
        height: scale.scaleHeight(22),
        borderRadius: scale.scaleBorderRadius(11),
        borderWidth: 2,
        borderColor: '#5DD4B4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale.scaleSpacing(8),
    },
    radioInner: {
        width: scale.scaleWidth(12),
        height: scale.scaleHeight(12),
        borderRadius: scale.scaleBorderRadius(6),
        backgroundColor: '#5DD4B4',
    },
    deleteButton: {
        backgroundColor: "#FF6B6B",
        borderRadius: scale.scaleBorderRadius(12),
        paddingVertical: scale.scaleSpacing(14),
        alignItems: "center",
        marginTop: scale.scaleSpacing(12),
        marginBottom: 0,
    },
    deleteButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#fff",
    },
    addRingtoneButton: {
        backgroundColor: "#5DD4B4",
        borderRadius: scale.scaleBorderRadius(14),
        paddingVertical: scale.scaleSpacing(14),
        paddingHorizontal: scale.scaleSpacing(16),
        marginBottom: scale.scaleSpacing(16),
        borderWidth: 2,
        borderColor: "#5DD4B4",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 3,
    },
    addRingtoneButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "700",
        color: "#FFFFFF",
    },
    ringtoneSectionHeader: {
        fontSize: scale.scaleFont(14),
        fontWeight: "700",
        color: "#5DD4B4",
        fontFamily: "Fredoka_600SemiBold",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: scale.scaleSpacing(8),
        marginBottom: scale.scaleSpacing(10),
        paddingHorizontal: scale.scaleSpacing(4),
    },
    ringtoneItemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale.scaleSpacing(10),
    },
    ringtoneTrashButton: {
        padding: scale.scaleSpacing(4),
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringtoneDeleteButton: {
        backgroundColor: "#FF6F79",
        borderRadius: scale.scaleBorderRadius(14),
        paddingVertical: scale.scaleSpacing(14),
        paddingHorizontal: scale.scaleSpacing(16),
        marginBottom: scale.scaleSpacing(16),
        borderWidth: 2,
        borderColor: "#FF6F79",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 3,
    },
    ringtoneDeleteButtonDisabled: {
        backgroundColor: "#D3D3D3",
        borderColor: "#D3D3D3",
        shadowOpacity: 0,
        elevation: 0,
    },
    ringtoneDeleteButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale.scaleSpacing(8),
    },
    ringtoneDeleteButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "700",
        color: "#FFFFFF",
    },
    presetScreen: {
        flex: 1,
        backgroundColor: "transparent",
    },
    presetHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: scale.scaleSpacing(16),
        paddingHorizontal: scale.scaleSpacing(16),
        paddingBottom: scale.scaleSpacing(12),
    },
    presetTitle: {
        fontSize: scale.scaleFont(20),
        fontWeight: "700",
        color: "#244D4A",
        fontFamily: "Courier",
    },
    presetTitleCentered: {
        fontSize: scale.scaleFont(20),
        fontWeight: "700",
        color: "#244D4A",
        fontFamily: "Courier",
        textAlign: "center",
        marginBottom: scale.scaleSpacing(16),
    },
    presetItem: {
        backgroundColor: "#fff",
        borderRadius: scale.scaleBorderRadius(16),
        padding: scale.scaleSpacing(16),
        marginBottom: scale.scaleSpacing(16),
        borderWidth: 2,
        borderColor: "#B8E6D9",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 2,
    },
    presetImage: {
        width: scale.scaleWidth(72),
        height: scale.scaleHeight(72),
        marginRight: scale.scaleSpacing(16),
        borderRadius: scale.scaleBorderRadius(8),
        resizeMode: "contain",
    },
    presetItemText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "700",
        color: "#244D4A",
        flex: 1,
    },
    presetIconsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale.scaleSpacing(8),
    },
    iconSlot: {
        width: scale.scaleWidth(24),
        height: scale.scaleHeight(24),
        justifyContent: "center",
        alignItems: "center",
    },
    presetIcon: {
        width: scale.scaleWidth(24),
        height: scale.scaleHeight(24),
        resizeMode: "contain",
    },
    routineCard: {
        backgroundColor: "#fff",
        borderRadius: scale.scaleBorderRadius(16),
        padding: scale.scaleSpacing(18),
        marginBottom: scale.scaleSpacing(14),
        borderWidth: 2,
        borderColor: "#B8E6D9",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: scale.scaleHeight(2) },
        shadowRadius: scale.scaleSpacing(4),
        elevation: 2,
    },
    routineIconPlaceholder: {
        width: scale.scaleWidth(80),
        height: scale.scaleHeight(80),
        borderRadius: scale.scaleBorderRadius(12),
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scale.scaleSpacing(16),
    },
    routineImage: {
        width: scale.scaleWidth(80),
        height: scale.scaleHeight(80),
        borderRadius: scale.scaleBorderRadius(12),
        marginRight: scale.scaleSpacing(16),
        resizeMode: "contain",
    },
    routineIcon: {
        fontSize: scale.scaleFont(58),
        textAlign: "center",
    },
    routineInfo: {
        flex: 1,
    },
    routineTitle: {
        fontSize: scale.scaleFont(18),
        fontWeight: "700",
        color: "#244D4A",
        marginBottom: scale.scaleSpacing(4),
        fontFamily: "Courier",
    },
    routineTime: {
        fontSize: scale.scaleFont(16),
        color: "#666",
    },
    routineDays: {
        fontSize: scale.scaleFont(14),
        color: '#244D4A',
        marginTop: scale.scaleSpacing(2),
    },
    
    // Delete Confirmation Modal Styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    deleteModalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale.scaleBorderRadius(20),
        padding: scale.scaleSpacing(20),
        width: "74%",
        maxWidth: scale.scaleWidth(330),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scale.scaleHeight(4) },
        shadowOpacity: 0.2,
        shadowRadius: scale.scaleSpacing(12),
        elevation: 8,
        borderWidth: 1.5,
        borderColor: "#FFB3BA",
    },
    deleteIconCircle: {
        width: scale.scaleWidth(70),
        height: scale.scaleHeight(70),
        borderRadius: scale.scaleBorderRadius(35),
        backgroundColor: "#FFE5E7",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scale.scaleSpacing(16),
    },
    deleteIcon: {
        width: scale.scaleWidth(40),
        height: scale.scaleHeight(40),
        resizeMode: "contain",
    },
    deleteModalTitle: {
        fontSize: scale.scaleFont(24),
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: scale.scaleSpacing(8),
        fontFamily: "Fredoka_700Bold",
    },
    deleteModalMessage: {
        fontSize: scale.scaleFont(14),
        color: "#4A4A4A",
        textAlign: "center",
        lineHeight: scale.scaleHeight(20),
        marginBottom: scale.scaleSpacing(20),
        fontFamily: "Fredoka_400Regular",
        paddingHorizontal: scale.scaleSpacing(8),
        flexWrap: "wrap",
    },
    deleteModalButtons: {
        flexDirection: "row",
        gap: scale.scaleSpacing(12),
        width: "100%",
    },
    deleteCancelButton: {
        flex: 1,
        backgroundColor: "#D3D3D3",
        paddingVertical: scale.scaleSpacing(12),
        borderRadius: scale.scaleBorderRadius(50),
        alignItems: "center",
        justifyContent: "center",
    },
    deleteCancelButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    deleteConfirmButton: {
        flex: 1,
        backgroundColor: "#FF6B7A",
        paddingVertical: scale.scaleSpacing(12),
        borderRadius: scale.scaleBorderRadius(50),
        alignItems: "center",
        justifyContent: "center",
    },
    deleteConfirmButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    
    // Success Modal Styles
    successModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    successModalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale.scaleBorderRadius(20),
        padding: scale.scaleSpacing(20),
        width: "74%",
        maxWidth: scale.scaleWidth(330),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scale.scaleHeight(4) },
        shadowOpacity: 0.2,
        shadowRadius: scale.scaleSpacing(12),
        elevation: 8,
        borderWidth: 1.5,
        borderColor: "#9FD19E",
    },
    successIconCircle: {
        width: scale.scaleWidth(70),
        height: scale.scaleHeight(70),
        borderRadius: scale.scaleBorderRadius(35),
        backgroundColor: "#D4F1D3",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scale.scaleSpacing(16),
    },
    successIcon: {
        width: scale.scaleWidth(40),
        height: scale.scaleHeight(40),
        resizeMode: "contain",
    },
    successModalTitle: {
        fontSize: scale.scaleFont(24),
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: scale.scaleSpacing(8),
        fontFamily: "Fredoka_700Bold",
    },
    successModalMessage: {
        fontSize: scale.scaleFont(14),
        color: "#4A4A4A",
        textAlign: "center",
        marginBottom: scale.scaleSpacing(18),
        fontFamily: "Fredoka_400Regular",
        flexWrap: "wrap",
    },
    successOkButton: {
        backgroundColor: "#4CAF50",
        paddingVertical: scale.scaleSpacing(12),
        paddingHorizontal: scale.scaleSpacing(40),
        borderRadius: scale.scaleBorderRadius(50),
        alignItems: "center",
        justifyContent: "center",
    },
    successOkButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    
    // Save Changes Confirmation Modal Styles
    saveModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    saveModalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale.scaleBorderRadius(20),
        padding: scale.scaleSpacing(20),
        width: "74%",
        maxWidth: scale.scaleWidth(330),
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scale.scaleHeight(4) },
        shadowOpacity: 0.2,
        shadowRadius: scale.scaleSpacing(12),
        elevation: 8,
        borderWidth: 1.5,
        borderColor: "#9FD19E",
    },
    saveIconCircle: {
        width: scale.scaleWidth(70),
        height: scale.scaleHeight(70),
        borderRadius: scale.scaleBorderRadius(35),
        backgroundColor: "#D4F1D3",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scale.scaleSpacing(16),
    },
    saveIcon: {
        width: scale.scaleWidth(40),
        height: scale.scaleHeight(40),
        resizeMode: "contain",
    },
    saveModalTitle: {
        fontSize: scale.scaleFont(24),
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: scale.scaleSpacing(8),
        fontFamily: "Fredoka_700Bold",
    },
    saveModalMessage: {
        fontSize: scale.scaleFont(14),
        color: "#4A4A4A",
        textAlign: "center",
        lineHeight: scale.scaleHeight(20),
        marginBottom: scale.scaleSpacing(20),
        fontFamily: "Fredoka_400Regular",
        paddingHorizontal: scale.scaleSpacing(8),
        flexWrap: "wrap",
    },
    saveModalButtons: {
        flexDirection: "row",
        gap: scale.scaleSpacing(12),
        width: "100%",
    },
    saveCancelButton: {
        flex: 1,
        backgroundColor: "#D3D3D3",
        paddingVertical: scale.scaleSpacing(12),
        borderRadius: scale.scaleBorderRadius(50),
        alignItems: "center",
        justifyContent: "center",
    },
    saveCancelButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    saveConfirmButton: {
        flex: 1,
        backgroundColor: "#4CAF50",
        paddingVertical: scale.scaleSpacing(12),
        borderRadius: scale.scaleBorderRadius(50),
        alignItems: "center",
        justifyContent: "center",
    },
    saveConfirmButtonText: {
        fontSize: scale.scaleFont(16),
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    // Select Days Error Modal Styles
    selectDaysModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    selectDaysModalContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale.scaleBorderRadius(20),
        padding: scale.scaleSpacing(24),
        width: "80%",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFB3BA",
    },
    selectDaysIconCircle: {
        width: scale.scaleWidth(70),
        height: scale.scaleHeight(70),
        borderRadius: scale.scaleBorderRadius(35),
        backgroundColor: "#FFE1E4",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: scale.scaleSpacing(16),
    },
    selectDaysIcon: {
        width: scale.scaleWidth(40),
        height: scale.scaleHeight(40),
    },
    selectDaysModalTitle: {
        fontSize: scale.scaleFont(18),
        fontFamily: "Fredoka_700Bold",
        color: "#000",
        marginBottom: scale.scaleSpacing(8),
        textAlign: "center",
    },
    selectDaysModalMessage: {
        fontSize: scale.scaleFont(14),
        fontFamily: "Fredoka_400Regular",
        color: "#333",
        textAlign: "center",
        marginBottom: scale.scaleSpacing(20),
    },
    selectDaysOkButton: {
        backgroundColor: "#FF6F79",
        paddingVertical: scale.scaleSpacing(10),
        paddingHorizontal: scale.scaleSpacing(40),
        borderRadius: scale.scaleBorderRadius(20),
    },
    selectDaysOkButtonText: {
        color: "#fff",
        fontSize: scale.scaleFont(16),
        fontFamily: "Fredoka_600SemiBold",
    },
}));