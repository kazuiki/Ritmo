import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Image,
    ImageBackground,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { getPresetById, getPresetByImageUrl, Preset, PRESETS } from "../../constants/presets";
import NotificationService from "../../src/notificationService";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { createRoutineForCurrentUser, deleteRoutine, getRoutinesForCurrentUser, updateRoutine } from "../../src/routinesService";

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

export default function addRoutines() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [routineName, setRoutineName] = useState("");
    const [hour, setHour] = useState("01");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
    const [presetModalVisible, setPresetModalVisible] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
    const [ringtoneModalVisible, setRingtoneModalVisible] = useState(false);
    const [selectedRingtone, setSelectedRingtone] = useState<string | undefined>(undefined);
    const [previewingRingtone, setPreviewingRingtone] = useState<string | null>(null); // currently playing preview
    const ALL_DAYS = [0,1,2,3,4,5,6];
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [formScrollEnabled, setFormScrollEnabled] = useState(true);
    
    // Delete confirmation and success modals
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
    
    // Save confirmation modal
    const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);

    // Select days error modal
    const [selectDaysModalVisible, setSelectDaysModalVisible] = useState(false);
    
    // Parental lock modal state
    const [showParentalLockModal, setShowParentalLockModal] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(ParentalLockAuthService.isTabAuthenticated('addRoutines'));
    const [pin, setPin] = useState(['', '', '', '']);
    const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

    const hourRef = useRef<ScrollView | null>(null);
    const minuteRef = useRef<ScrollView | null>(null);
    const periodRef = useRef<ScrollView | null>(null);

    // Check parental lock on component mount and when focused
    useEffect(() => {
        // Initialize notification service and refresh notifications
        const initNotifications = async () => {
            await NotificationService.initialize();
            // Auto-refresh notifications if running low
            await NotificationService.refreshAllRoutineNotifications();
        };
        initNotifications();
        
        checkParentalLock();
        
        // Listen to authentication changes
        const authListener = (isAuth: boolean) => {
            setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('addRoutines'));
        };
        
        ParentalLockAuthService.addListener(authListener);
        
        return () => {
            ParentalLockAuthService.removeListener(authListener);
            // CLEANUP: Stop any playing sounds when component unmounts
            NotificationService.stopRingtone().catch(console.error);
            // CLEANUP: Dismiss all modals on unmount to prevent delayed pop-ups
            setDeleteConfirmVisible(false);
            setDeleteSuccessVisible(false);
            setSaveConfirmVisible(false);
            setSelectDaysModalVisible(false);
        };
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            // Update authentication state and check parental lock when focusing on this tab
            setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('addRoutines'));
            checkParentalLock();
        }, [])
    );

    const checkParentalLock = async () => {
        const isEnabled = await ParentalLockService.isEnabled();
        const isTabAuth = ParentalLockAuthService.isTabAuthenticated('addRoutines');
        if (isEnabled && !isTabAuth) {
            setShowParentalLockModal(true);
            return;
        }
    };

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
                ParentalLockAuthService.setAuthenticated(true, 'addRoutines');
                setShowParentalLockModal(false);
                setPin(['', '', '', '']);
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
        setPin(['', '', '', '']);
        router.replace("/(tabs)/home");
    };

    const ITEM_HEIGHT = 48; 

    const scrollToIndex = (ref: React.RefObject<ScrollView | null>, index: number) => {
        ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    };

    const onPressHour = (h: number) => {
        const val = h.toString().padStart(2, "0");
        setHour(val);
        scrollToIndex(hourRef, h - 1);
    };

    const onPressMinute = (m: number) => {
        const val = m.toString().padStart(2, "0");
        setMinute(val);
        scrollToIndex(minuteRef, m);
    };

    const onPressPeriod = (p: "AM" | "PM") => {
        setPeriod(p);
        scrollToIndex(periodRef, p === "AM" ? 0 : 1);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadRoutinesFromDb();
        }, [])
    );

    const loadRoutinesFromDb = async () => {
        try {
            // Load from AsyncStorage first (has days/ringtone)
            const stored = await AsyncStorage.getItem('@routines');
            if (stored) {
                const parsed = JSON.parse(stored);
                setRoutines(parsed);
            }

            // Then sync with Supabase in background
            const dbRoutines = await getRoutinesForCurrentUser();
            
            // Only keep DB routines that exist in storage (user hasn't deleted)
            const storedMap = new Map((stored ? JSON.parse(stored) : []).map((r: Routine) => [r.id, r]));
            const merged: Routine[] = dbRoutines
                .filter(dbR => storedMap.has(dbR.id)) // Don't re-add deleted routines
                .map(dbR => {
                    const existing = storedMap.get(dbR.id) as Routine;
                    return {
                        id: dbR.id,
                        name: dbR.name,
                        time: dbR.time,
                        imageUrl: dbR.imageUrl,
                        ringtone: existing?.ringtone || 'alarm1',
                        days: existing?.days || [0,1,2,3,4,5,6],
                    };
                });
            
            setRoutines(merged);
            await AsyncStorage.setItem('@routines', JSON.stringify(merged));
        } catch (error: any) {
            // Silently handle authentication errors - user may not be logged in yet
            if (error?.message !== 'Not authenticated') {
                console.error("Failed to load routines from Supabase:", error);
            }
        }
    };

    const openModal = () => {
        setModalVisible(true);
        setEditingRoutineId(null);
        setHour("01");
        setMinute("00");
        setPeriod("AM");
        setRoutineName("");
        setSelectedPresetId(null);
        setSelectedRingtone(undefined);
        setSelectedDays([]);
        setTimeout(() => {
            hourRef.current?.scrollTo({ y: 0, animated: false });
            minuteRef.current?.scrollTo({ y: 0, animated: false });
            periodRef.current?.scrollTo({ y: 0, animated: false });
        }, 0);
    };

    const openEditModal = (routine: Routine) => {
        setEditingRoutineId(routine.id);
        setRoutineName(routine.name);
        setSelectedRingtone(routine.ringtone);
        // Get presetId from imageUrl stored in database, or fallback to presetId field
        const preset = getPresetByImageUrl(routine.imageUrl);
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
            hourRef.current?.scrollTo({ y: hIndex * ITEM_HEIGHT, animated: false });
            minuteRef.current?.scrollTo({ y: mIndex * ITEM_HEIGHT, animated: false });
            periodRef.current?.scrollTo({ y: (p === "AM" ? 0 : 1) * ITEM_HEIGHT, animated: false });
        }, 0);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingRoutineId(null);
    };

    const handleDone = () => {
        if (routineName.trim()) {
            if (selectedDays.length === 0) {
                setSelectDaysModalVisible(true);
                return;
            }
            const routineTime = `${hour}:${minute} ${period.toLowerCase()}`;
            
            if (editingRoutineId) {
                // Show custom confirmation modal for editing
                setSaveConfirmVisible(true);
            } else {
                // Get imageUrl from selected preset
                const selectedPreset = getPresetById(selectedPresetId);
                const imageUrlToSave = selectedPreset?.imageUrl || null;
                
                createRoutineForCurrentUser({
                    name: routineName,
                    description: null,
                    is_active: true,
                    time: routineTime,
                    imageUrl: imageUrlToSave,
                })
                .then(async (created) => {
                    // Add to local storage with days/ringtone
                    const stored = await AsyncStorage.getItem('@routines');
                    const existing: Routine[] = stored ? JSON.parse(stored) : [];
                    const newRoutine: Routine = {
                        id: created.id,
                        name: routineName,
                        time: routineTime,
                        imageUrl: imageUrlToSave,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    };
                    existing.push(newRoutine);
                    await AsyncStorage.setItem('@routines', JSON.stringify(existing));
                    
                    NotificationService.scheduleRoutineNotification({
                        routineId: created.id,
                        routineName: routineName,
                        time: routineTime,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    }).catch(err => console.error('Error scheduling notification:', err));
                    await loadRoutinesFromDb();
                })
                .catch(err => console.error('Supabase createRoutine error:', err?.message || err));
                
                closeModal();
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
                const stored = await AsyncStorage.getItem('@routines');
                const existing: Routine[] = stored ? JSON.parse(stored) : [];
                const filtered = existing.filter(r => r.id !== editingRoutineId);
                await AsyncStorage.setItem('@routines', JSON.stringify(filtered));
                
                // Update UI immediately
                setRoutines(filtered);
                closeModal();
                
                // Show success modal
                setDeleteSuccessVisible(true);
            } catch (err: any) {
                console.error('Error deleting routine:', err?.message || err);
                Alert.alert('Error', 'Failed to delete routine. Please try again.');
            }
        }
    };

    const openPresetModal = () => setPresetModalVisible(true);
    const closePresetModal = () => setPresetModalVisible(false);

    const selectPreset = (preset: Preset) => {
        setRoutineName(preset.name);
        setSelectedPresetId(preset.id);
        closePresetModal();
    };

    const confirmSave = async () => {
        setSaveConfirmVisible(false);
        if (editingRoutineId) {
            const routineTime = `${hour}:${minute} ${period.toLowerCase()}`;
            
            // Determine imageUrl to save: use newly selected preset if any; otherwise keep existing
            const selectedPreset = getPresetById(selectedPresetId);
            const current = routines.find(r => r.id === editingRoutineId);
            const imageUrlToSave = selectedPreset?.imageUrl ?? current?.imageUrl ?? null;

            updateRoutine(editingRoutineId, {
                name: routineName,
                time: routineTime,
                imageUrl: imageUrlToSave,
            })
            .then(async () => {
                // Update in local storage with days/ringtone
                const stored = await AsyncStorage.getItem('@routines');
                const existing: Routine[] = stored ? JSON.parse(stored) : [];
                const idx = existing.findIndex(r => r.id === editingRoutineId);
                if (idx >= 0) {
                    existing[idx] = {
                        ...existing[idx],
                        name: routineName,
                        time: routineTime,
                        imageUrl: imageUrlToSave,
                        ringtone: selectedRingtone || 'alarm1',
                        days: selectedDays,
                    };
                    await AsyncStorage.setItem('@routines', JSON.stringify(existing));
                }
                return loadRoutinesFromDb();
            })
            .catch(err => console.error('Supabase updateRoutine error:', err?.message || err));

            NotificationService.scheduleRoutineNotification({
                routineId: editingRoutineId,
                routineName: routineName,
                time: routineTime,
                ringtone: selectedRingtone || 'alarm1',
                days: selectedDays,
            }).catch(err => console.error('Error scheduling notification:', err));
            
            closeModal();
        }
    };

    const openRingtoneModal = () => setRingtoneModalVisible(true);
    const closeRingtoneModal = async () => {
        await NotificationService.stopRingtone(); // Ensure sound stops when modal closes
        setRingtoneModalVisible(false);
    };

    const selectRingtone = (ringtoneName: string) => {
        setSelectedRingtone(ringtoneName);
        closeRingtoneModal();
    };

    const togglePreview = async (ringtoneName: string) => {
        // If this ringtone is already playing, pause it
        if (previewingRingtone === ringtoneName) {
            await NotificationService.stopRingtone().catch(console.error);
            setPreviewingRingtone(null);
            return;
        }
        // Otherwise start this ringtone (stop previous first)
        await NotificationService.stopRingtone().catch(()=>{});
        await NotificationService.playRingtone(ringtoneName).catch(console.error);
        setPreviewingRingtone(ringtoneName);
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Background Image */}
            <Image
                source={require("../../assets/background.png")}
                style={styles.backgroundImage}
                resizeMode="cover"
            />
            
            {/* Brand logo */}
            <View style={styles.header}>
                <Image
                    source={require("../../assets/images/ritmoNameLogo.png")}
                    style={styles.brandLogo}
                />
            </View>

            {/* Title row with plus button */}
            <View style={styles.titleRow}>
                <Text style={styles.titleText}>Setup day routine</Text>
                <TouchableOpacity
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
                const preset = getPresetByImageUrl(routine.imageUrl) || getPresetById(routine.presetId);
                return (
                    <TouchableOpacity 
                        key={routine.id} 
                        style={styles.routineCard}
                        onPress={() => openEditModal(routine)}
                        activeOpacity={0.7}
                    >
                        {preset ? (
                            <Image source={preset.image} style={styles.routineImage} />
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
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Header (Back only) */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal}>
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>
                            <View />
                        </View>

                    <ScrollView
                        contentContainerStyle={{ padding: 16 }}
                        nestedScrollEnabled
                        scrollEnabled={formScrollEnabled}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Time Picker Section */}
                        <View style={styles.timePickerCard}>
                            <View style={styles.pickerContainer}>
                                {/* Hours Picker */}
                                <View style={styles.pickerWrapper}>
                                    <ScrollView
                                        ref={hourRef}
                                        showsVerticalScrollIndicator={false}
                                        snapToInterval={48}
                                        decelerationRate="fast"
                                        contentContainerStyle={{ paddingVertical: 48 }}
                                        nestedScrollEnabled
                                        onScrollBeginDrag={() => setFormScrollEnabled(false)}
                                        onScrollEndDrag={() => setFormScrollEnabled(true)}
                                        onMomentumScrollBegin={() => setFormScrollEnabled(false)}
                                        onMomentumScrollEnd={(e) => {
                                            const y = e.nativeEvent.contentOffset.y;
                                            const idx = Math.round(y / 48);
                                            const clamped = Math.max(0, Math.min(11, idx));
                                            setHour((clamped + 1).toString().padStart(2, "0"));
                                            setFormScrollEnabled(true);
                                        }}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                            <TouchableOpacity
                                                key={h}
                                                onPress={() => onPressHour(h)}
                                            >
                                                <Text style={[
                                                    styles.timeInput,
                                                    hour === h.toString().padStart(2, "0") && styles.selectedTime,
                                                ]}>
                                                    {h.toString().padStart(2, "0")}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Minutes Picker */}
                                <View style={styles.pickerWrapper}>
                                    <ScrollView
                                        ref={minuteRef}
                                        showsVerticalScrollIndicator={false}
                                        snapToInterval={48}
                                        decelerationRate="fast"
                                        contentContainerStyle={{ paddingVertical: 48 }}
                                        nestedScrollEnabled
                                        onScrollBeginDrag={() => setFormScrollEnabled(false)}
                                        onScrollEndDrag={() => setFormScrollEnabled(true)}
                                        onMomentumScrollBegin={() => setFormScrollEnabled(false)}
                                        onMomentumScrollEnd={(e) => {
                                            const y = e.nativeEvent.contentOffset.y;
                                            const idx = Math.round(y / 48);
                                            const clamped = Math.max(0, Math.min(59, idx));
                                            setMinute(clamped.toString().padStart(2, "0"));
                                            setFormScrollEnabled(true);
                                        }}
                                    >
                                        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                onPress={() => onPressMinute(m)}
                                            >
                                                <Text style={[
                                                    styles.timeInput,
                                                    minute === m.toString().padStart(2, "0") && styles.selectedTime,
                                                ]}>
                                                    {m.toString().padStart(2, "0")}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* AM/PM Picker */}
                                <View style={styles.pickerWrapper}>
                                    <ScrollView
                                        ref={periodRef}
                                        showsVerticalScrollIndicator={false}
                                        snapToInterval={48}
                                        decelerationRate="fast"
                                        contentContainerStyle={{ paddingVertical: 48 }}
                                        nestedScrollEnabled
                                        onScrollBeginDrag={() => setFormScrollEnabled(false)}
                                        onScrollEndDrag={() => setFormScrollEnabled(true)}
                                        onMomentumScrollBegin={() => setFormScrollEnabled(false)}
                                        onMomentumScrollEnd={(e) => {
                                            const y = e.nativeEvent.contentOffset.y;
                                            const idx = Math.round(y / 48);
                                            const clamped = Math.max(0, Math.min(1, idx));
                                            const p = clamped === 0 ? "AM" : "PM";
                                            setPeriod(p);
                                            setFormScrollEnabled(true);
                                        }}
                                    >
                                        {["AM", "PM"].map((p) => (
                                            <TouchableOpacity key={p} onPress={() => onPressPeriod(p as "AM" | "PM") }>
                                                <Text style={[
                                                    styles.timeInput,
                                                    period === p && styles.selectedTime,
                                                ]}>{p}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* Center highlight indicator */}
                            <View style={styles.selectionIndicator}>
                                <View style={styles.timeUnderlineTop} />
                                <View style={styles.selectionBox} />
                                <View style={styles.timeUnderlineBottom} />
                            </View>
                        </View>
                            {/* Form Section */}
                            <View style={styles.formCard}>
                                {/* Day of Week Selector */}
                                <View style={styles.daysRow}>
                                    {[
                                        { idx: 0, label: 'S' },
                                        { idx: 1, label: 'M' },
                                        { idx: 2, label: 'T' },
                                        { idx: 3, label: 'W' },
                                        { idx: 4, label: 'Th' },
                                        { idx: 5, label: 'F' },
                                        { idx: 6, label: 'St' },
                                    ].map(d => {
                                        const selected = selectedDays.includes(d.idx);
                                        return (
                                            <TouchableOpacity
                                                key={d.idx}
                                                style={[styles.dayChip, selected && styles.dayChipSelected]}
                                                onPress={() => {
                                                    setSelectedDays(prev => {
                                                        const has = prev.includes(d.idx);
                                                        if (has) return prev.filter(x => x !== d.idx);
                                                        return [...prev, d.idx].sort((a,b)=>a-b);
                                                    });
                                                }}
                                            >
                                                <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>{d.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {/* Choose Routine Preset - white bordered selector with chevron (same for Add/Edit) */}
                                <TouchableOpacity style={[styles.ringtoneSelector, { backgroundColor: '#FFFFFF', marginBottom: 16 }]} onPress={openPresetModal}>
                                    <Text style={styles.ringtoneText}>Choose Routine Preset</Text>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>

                                {/* Routine Name Input - non-editable if preset selected */}
                                <TextInput
                                    style={styles.input}
                                    placeholder="Routine name"
                                    placeholderTextColor="#999"
                                    value={routineName}
                                    onChangeText={setRoutineName}
                                    editable={!selectedPresetId}
                                />

                                {/* Ringtone Selector */}
                                <TouchableOpacity style={styles.ringtoneSelector} onPress={openRingtoneModal}>
                                    <Text style={styles.ringtoneText}>
                                        Ringtone: {selectedRingtone ? (selectedRingtone === 'alarm1' ? 'Morning Bell' : selectedRingtone === 'alarm2' ? 'Gentle Wake' : selectedRingtone === 'alarm3' ? 'Classic Chime' : selectedRingtone) : ''}
                                    </Text>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>

                                {/* Delete Button - Only show when editing */}
                                {editingRoutineId && (
                                    <TouchableOpacity 
                                        style={styles.deleteButton}
                                        onPress={handleDelete}
                                    >
                                        <Text style={styles.deleteButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Primary action button (outside the card) */}
                            <TouchableOpacity style={[styles.presetButton, { marginTop: 30 }]} onPress={handleDone}>
                                <Text style={styles.presetButtonText}>{editingRoutineId ? 'Edit Routine' : 'Add Routine'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
                    resizeMode="cover"
                />
                <View style={styles.presetScreen}>
                {/* Header with Back button in upper-left */}
                <View style={styles.presetHeader}>
                    <TouchableOpacity onPress={closePresetModal}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Title below header */}
                <Text style={styles.presetTitleCentered}>Routine Preset</Text>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                        {PRESETS.map((p) => (
                            <TouchableOpacity key={p.id} style={styles.presetItem} onPress={() => selectPreset(p)}>
                                <Image source={p.image} style={styles.presetImage} />
                                <Text style={styles.presetItemText}>{p.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                        resizeMode="cover"
                    />
                    
                    <View style={styles.presetScreen}>
                        {/* Header with Back button */}
                        <View style={styles.presetHeader}>
                            <TouchableOpacity onPress={closeRingtoneModal}>
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Title */}
                        <Text style={styles.presetTitleCentered}>Select Ringtone</Text>

                        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                            {/* Morning Bell */}
                            <View
                                style={[
                                    styles.ringtoneItem,
                                    selectedRingtone === 'alarm1' && styles.selectedRingtoneItem
                                ]}
                            >
                                <View style={styles.ringtoneInfo}>
                                    <TouchableOpacity style={styles.radioButton} onPress={() => selectRingtone('alarm1')}>
                                        {selectedRingtone === 'alarm1' && <View style={styles.radioInner} />}
                                    </TouchableOpacity>
                                    <Text style={styles.ringtoneItemTitle}>Morning Bell</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.previewIconButton}
                                    onPress={(e) => { e.stopPropagation(); togglePreview('alarm1'); }}
                                >
                                    <Image
                                        source={previewingRingtone === 'alarm1' ? require('../../assets/images/Pause.png') : require('../../assets/images/Play.png')}
                                        style={styles.previewIcon}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Gentle Wake */}
                            <View
                                style={[
                                    styles.ringtoneItem,
                                    selectedRingtone === 'alarm2' && styles.selectedRingtoneItem
                                ]}
                            >
                                <View style={styles.ringtoneInfo}>
                                    <TouchableOpacity style={styles.radioButton} onPress={() => selectRingtone('alarm2')}>
                                        {selectedRingtone === 'alarm2' && <View style={styles.radioInner} />}
                                    </TouchableOpacity>
                                    <Text style={styles.ringtoneItemTitle}>Gentle Wake</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.previewIconButton}
                                    onPress={(e) => { e.stopPropagation(); togglePreview('alarm2'); }}
                                >
                                    <Image
                                        source={previewingRingtone === 'alarm2' ? require('../../assets/images/Pause.png') : require('../../assets/images/Play.png')}
                                        style={styles.previewIcon}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Classic Chime */}
                            <View
                                style={[
                                    styles.ringtoneItem,
                                    selectedRingtone === 'alarm3' && styles.selectedRingtoneItem
                                ]}
                            >
                                <View style={styles.ringtoneInfo}>
                                    <TouchableOpacity style={styles.radioButton} onPress={() => selectRingtone('alarm3')}>
                                        {selectedRingtone === 'alarm3' && <View style={styles.radioInner} />}
                                    </TouchableOpacity>
                                    <Text style={styles.ringtoneItemTitle}>Classic Chime</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.previewIconButton}
                                    onPress={(e) => { e.stopPropagation(); togglePreview('alarm3'); }}
                                >
                                    <Image
                                        source={previewingRingtone === 'alarm3' ? require('../../assets/images/Pause.png') : require('../../assets/images/Play.png')}
                                        style={styles.previewIcon}
                                    />
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
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
                <View style={styles.parentalLockModalOverlay}>
                    <ImageBackground
                        source={require("../../assets/background.png")}
                        style={styles.parentalLockModalBackground}
                        resizeMode="cover"
                    >
                        <View style={styles.parentalLockModalContainer}>
                            <View style={styles.parentalLockModalContent}>
                                <View style={styles.parentalLockIconContainer}>
                                    <Ionicons name="lock-closed" size={48} color="#4A5568" />
                                </View>
                                
                                <Text style={styles.parentalLockModalTitle}>Parental Lock</Text>
                                <Text style={styles.parentalLockModalSubtitle}>
                                    Access restricted to parents{'\n'}or guardians only
                                </Text>

                                <Text style={styles.parentalLockModalContentTitle}>
                                    Please enter your 4-digit PIN to continue
                                </Text>
                                
                                <View style={styles.parentalLockPinContainer}>
                                    {pin.map((digit, index) => (
                                        <TextInput
                                            key={index}
                                            ref={pinRefs[index]}
                                            style={[
                                                styles.parentalLockPinInput,
                                                digit ? styles.parentalLockPinInputFilled : null
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
                                    style={styles.parentalLockForgotPin}
                                    onPress={() => {
                                        router.push('/parental-lock-new-pin');
                                    }}
                                >
                                    <Text style={styles.parentalLockForgotPinText}>Forgot PIN?</Text>
                                </TouchableOpacity>
                                
                                <View style={styles.parentalLockButtonContainer}>
                                    <TouchableOpacity style={styles.parentalLockUnlockButton} onPress={unlockAccess}>
                                        <Text style={styles.parentalLockUnlockText}>Unlock Access</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.parentalLockCancelButton} onPress={cancelAccess}>
                                        <Text style={styles.parentalLockCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </ImageBackground>
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

const styles = StyleSheet.create({
    backgroundImage: {
        position: "absolute",
        width: "100%",
        height: "100%",
    },
    header: { paddingTop: 50, paddingHorizontal: 16 },
    brandLogo: {
        width: 120,
        height: 30,
        resizeMode: "contain",
        marginLeft: -22,
        marginTop: -20,
    },
    titleRow: {
        paddingHorizontal: 16,
        paddingTop: 28,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
    },
    titleText: {
        fontSize: 28,
        fontWeight: "800",
        color: "#244D4A",
        fontFamily: "Courier",
    },
    plusBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E6E6E6",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    plusSign: { fontSize: 18, color: "#304D4A", fontWeight: "700" },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#ffffffff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: "85%",
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    backText: {
        fontSize: 16,
        color: "#244D4A",
        textDecorationLine: "underline",
        textDecorationColor: "#244D4A",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#244D4A",
        fontFamily: "Courier",
    },
    doneText: {
        fontSize: 16,
        color: "#244D4A",
        textDecorationLine: "underline",
        textDecorationColor: "#244D4A",
    },
    timePickerCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        paddingVertical: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: "#B8E6D9",
        height: 180,
        position: "relative",
    },
    pickerContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        height: 150,
    },
    pickerWrapper: {
        flex: 1,
        height: 150,
        overflow: "hidden",
    },
    timeRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 6,
    },
    timeInput: {
        fontSize: 24,
        fontWeight: "600",
        color: "#244D4A",
        textAlign: "center",
        height: 48,
        lineHeight: 48,
    },
    selectedTime: {
        color: "#06C08A",
        fontWeight: "800",
    },
    selectionIndicator: {
        position: "absolute",
        top: 64,
        left: 20,
        right: 20,
        height: 48,
        justifyContent: "space-between",
        pointerEvents: "none",
    },
    timeUnderlineTop: {
        height: 2,
        backgroundColor: "#5DD4B4",
    },
    timeUnderlineBottom: {
        height: 2,
        backgroundColor: "#5DD4B4",
    },
    selectionBox: {
        flex: 1,
        backgroundColor: "transparent",
    },
    timeUnderline: {
        height: 2,
        backgroundColor: "#5DD4B4",
        marginHorizontal: 30,
        marginVertical: 6,
    },
    formCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    presetButton: {
        backgroundColor: "#5DD4B4",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 16,
    },
    presetButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    input: {
        backgroundColor: "#F5F5F5",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    ringtoneSelector: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#B8E6D9",
    },
    ringtoneText: {
        fontSize: 16,
        color: "#244D4A",
        fontWeight: "600",
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dayChip: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#B8E6D9',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    dayChipSelected: {
        backgroundColor: '#5DD4B4',
        borderColor: '#5DD4B4',
    },
    dayChipText: {
        fontSize: 14,
        color: '#244D4A',
        fontWeight: '700',
    },
    dayChipTextSelected: {
        color: '#FFFFFF',
    },
    chevron: {
        fontSize: 24,
        color: "#5DD4B4",
        fontWeight: "300",
    },
    ringtoneItem: {
        backgroundColor: "#fff",
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#B8E6D9",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
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
    },
    ringtoneIcon: {
        fontSize: 48,
        marginRight: 16,
    },
    ringtoneTextContainer: {
        flex: 1,
    },
    ringtoneItemTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#244D4A",
        marginBottom: 0,
    },
    ringtoneItemSubtitle: {
        fontSize: 14,
        color: "#666",
    },
    previewButton: {
        backgroundColor: "#5DD4B4",
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    previewButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#fff",
    },
    previewIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewIcon: {
        width: 22,
        height: 22,
        resizeMode: 'contain',
    },
    radioButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#5DD4B4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#5DD4B4',
    },
    deleteButton: {
        backgroundColor: "#FF6B6B",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 16,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
    presetScreen: {
        flex: 1,
        backgroundColor: "transparent",
    },
    presetHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    presetTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#244D4A",
        fontFamily: "Courier",
    },
    presetTitleCentered: {
        fontSize: 20,
        fontWeight: "700",
        color: "#244D4A",
        fontFamily: "Courier",
        textAlign: "center",
        marginBottom: 16,
    },
    presetItem: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: "#B8E6D9",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    presetImage: {
        width: 72,
        height: 72,
        marginRight: 16,
        borderRadius: 8,
        resizeMode: "cover",
    },
    presetItemText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#244D4A",
    },
    routineCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 2,
        borderColor: "#B8E6D9",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    routineIconPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: "#E8FFFA",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    routineImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        marginRight: 16,
        resizeMode: "cover",
    },
    routineIcon: {
        fontSize: 40,
    },
    routineInfo: {
        flex: 1,
    },
    routineTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#244D4A",
        marginBottom: 4,
        fontFamily: "Courier",
    },
    routineTime: {
        fontSize: 16,
        color: "#666",
    },
    routineDays: {
        fontSize: 14,
        color: '#244D4A',
        marginTop: 2,
    },
    // Parental Lock Modal Styles
    parentalLockModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    parentalLockModalBackground: {
        flex: 1,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    parentalLockModalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    parentalLockModalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 25,
        borderWidth: 2,
        borderColor: "#CFF6EB",
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
        width: "90%",
        maxWidth: 350,
    },
    parentalLockIconContainer: {
        marginBottom: 20,
        opacity: 0.7,
    },
    parentalLockModalTitle: {
        fontSize: 28,
        fontWeight: "700",
        fontFamily: "ITIM",
        color: "#333",
        marginBottom: 8,
        textAlign: "center",
    },
    parentalLockModalSubtitle: {
        fontSize: 16,
        fontWeight: "400",
        fontFamily: "ITIM",
        color: "#666",
        textAlign: "center",
        marginBottom: 25,
        lineHeight: 22,
    },
    parentalLockModalContentTitle: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "ITIM",
        color: "#555",
        marginBottom: 25,
        textAlign: "center",
        lineHeight: 20,
    },
    parentalLockPinContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 25,
        gap: 12,
    },
    parentalLockPinInput: {
        width: 55,
        height: 55,
        borderRadius: 12,
        backgroundColor: "#F7F7F7",
        borderWidth: 2,
        borderColor: "#E0E0E0",
        textAlign: "center",
        fontSize: 24,
        fontWeight: "600",
        color: "#333",
        fontFamily: "ITIM",
    },
    parentalLockPinInputFilled: {
        backgroundColor: "#E8F5E8",
        borderColor: "#4CAF50",
    },
    parentalLockForgotPin: {
        marginBottom: 30,
    },
    parentalLockForgotPinText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#007AFF",
        textDecorationLine: "underline",
        fontFamily: "ITIM",
    },
    parentalLockButtonContainer: {
        width: "100%",
        gap: 12,
    },
    parentalLockUnlockButton: {
        backgroundColor: "#4CAF50",
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 25,
        alignItems: "center",
        shadowColor: "#4CAF50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    parentalLockUnlockText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        fontFamily: "ITIM",
    },
    parentalLockCancelButton: {
        backgroundColor: "transparent",
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: "#E0E0E0",
        alignItems: "center",
    },
    parentalLockCancelText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        fontFamily: "ITIM",
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
        borderRadius: 20,
        padding: 24,
        width: "80%",
        maxWidth: 360,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 3,
        borderColor: "#FFB3BA",
    },
    deleteIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#FFE5E7",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    deleteIcon: {
        width: 40,
        height: 40,
        resizeMode: "contain",
    },
    deleteModalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 8,
        fontFamily: "Fredoka_700Bold",
    },
    deleteModalMessage: {
        fontSize: 14,
        color: "#4A4A4A",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 20,
        fontFamily: "Fredoka_400Regular",
        paddingHorizontal: 8,
        flexWrap: "wrap",
    },
    deleteModalButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    deleteCancelButton: {
        flex: 1,
        backgroundColor: "#D3D3D3",
        paddingVertical: 12,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteCancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    deleteConfirmButton: {
        flex: 1,
        backgroundColor: "#FF6B7A",
        paddingVertical: 12,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteConfirmButtonText: {
        fontSize: 16,
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
        borderRadius: 20,
        padding: 24,
        width: "70%",
        maxWidth: 320,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 3,
        borderColor: "#9FD19E",
    },
    successIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#D4F1D3",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    successIcon: {
        width: 40,
        height: 40,
        resizeMode: "contain",
    },
    successModalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 8,
        fontFamily: "Fredoka_700Bold",
    },
    successModalMessage: {
        fontSize: 14,
        color: "#4A4A4A",
        textAlign: "center",
        marginBottom: 18,
        fontFamily: "Fredoka_400Regular",
        flexWrap: "wrap",
    },
    successOkButton: {
        backgroundColor: "#4CAF50",
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    successOkButtonText: {
        fontSize: 16,
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
        borderRadius: 20,
        padding: 24,
        width: "80%",
        maxWidth: 360,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 3,
        borderColor: "#9FD19E",
    },
    saveIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#D4F1D3",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    saveIcon: {
        width: 40,
        height: 40,
        resizeMode: "contain",
    },
    saveModalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 8,
        fontFamily: "Fredoka_700Bold",
    },
    saveModalMessage: {
        fontSize: 14,
        color: "#4A4A4A",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 20,
        fontFamily: "Fredoka_400Regular",
        paddingHorizontal: 8,
        flexWrap: "wrap",
    },
    saveModalButtons: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    saveCancelButton: {
        flex: 1,
        backgroundColor: "#D3D3D3",
        paddingVertical: 12,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    saveCancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        fontFamily: "Fredoka_600SemiBold",
    },
    saveConfirmButton: {
        flex: 1,
        backgroundColor: "#4CAF50",
        paddingVertical: 12,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    saveConfirmButtonText: {
        fontSize: 16,
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
        borderRadius: 20,
        padding: 24,
        width: "80%",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFB3BA",
    },
    selectDaysIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#FFE1E4",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    selectDaysIcon: {
        width: 40,
        height: 40,
    },
    selectDaysModalTitle: {
        fontSize: 18,
        fontFamily: "Fredoka_700Bold",
        color: "#000",
        marginBottom: 8,
        textAlign: "center",
    },
    selectDaysModalMessage: {
        fontSize: 14,
        fontFamily: "Fredoka_400Regular",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    selectDaysOkButton: {
        backgroundColor: "#FF6F79",
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 20,
    },
    selectDaysOkButtonText: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Fredoka_600SemiBold",
    },
});