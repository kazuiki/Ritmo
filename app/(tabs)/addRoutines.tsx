import { Ionicons } from "@expo/vector-icons";
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
import { createRoutineForCurrentUser, getRoutinesForCurrentUser, unlinkRoutineForCurrentUser, updateRoutine } from "../../src/routinesService";

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
    const ALL_DAYS = [0,1,2,3,4,5,6];
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [formScrollEnabled, setFormScrollEnabled] = useState(true);
    
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
            const dbRoutines = await getRoutinesForCurrentUser();
            const uiRoutines: Routine[] = (dbRoutines || []).map(r => ({
                id: r.id,
                name: r.name,
                time: r.time,
                imageUrl: r.imageUrl,
            }));
            setRoutines(uiRoutines);
        } catch (error) {
            console.error("Failed to load routines from Supabase:", error);
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
                Alert.alert("Select days", "Please pick at least one day for this routine.");
                return;
            }
            const routineTime = `${hour}:${minute} ${period.toLowerCase()}`;
            
            if (editingRoutineId) {
                // Determine imageUrl to save: use newly selected preset if any; otherwise keep existing
                const selectedPreset = getPresetById(selectedPresetId);
                const current = routines.find(r => r.id === editingRoutineId);
                const imageUrlToSave = selectedPreset?.imageUrl ?? current?.imageUrl ?? null;

                updateRoutine(editingRoutineId, {
                    name: routineName,
                    time: routineTime,
                    imageUrl: imageUrlToSave,
                })
                .then(() => loadRoutinesFromDb())
                .catch(err => console.error('Supabase updateRoutine error:', err?.message || err));

                NotificationService.scheduleRoutineNotification({
                    routineId: editingRoutineId,
                    routineName: routineName,
                    time: routineTime,
                    ringtone: selectedRingtone || 'rooster',
                    days: selectedDays,
                }).catch(err => console.error('Error scheduling notification:', err));
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
                .then((created) => {
                    NotificationService.scheduleRoutineNotification({
                        routineId: created.id,
                        routineName: routineName,
                        time: routineTime,
                        ringtone: selectedRingtone || 'rooster',
                        days: selectedDays,
                    }).catch(err => console.error('Error scheduling notification:', err));
                    return loadRoutinesFromDb();
                })
                .catch(err => console.error('Supabase createRoutine error:', err?.message || err));
            }
        }
        closeModal();
    };

    const handleDelete = () => {
        if (editingRoutineId) {
            NotificationService.cancelRoutineNotification(editingRoutineId)
                .catch(err => console.error('Error cancelling notification:', err));

            unlinkRoutineForCurrentUser(editingRoutineId)
                .then(() => loadRoutinesFromDb())
                .catch(err => console.error('Supabase unlinkRoutine error:', err?.message || err));
        }
        closeModal();
    };

    const openPresetModal = () => setPresetModalVisible(true);
    const closePresetModal = () => setPresetModalVisible(false);

    const selectPreset = (preset: Preset) => {
        setRoutineName(preset.name);
        setSelectedPresetId(preset.id);
        closePresetModal();
    };

    const openRingtoneModal = () => setRingtoneModalVisible(true);
    const closeRingtoneModal = () => {
        NotificationService.stopRingtone();
        setRingtoneModalVisible(false);
    };

    const selectRingtone = (ringtoneName: string) => {
        setSelectedRingtone(ringtoneName);
        closeRingtoneModal();
    };

    const previewRingtone = async (ringtoneName: string) => {
        await NotificationService.playRingtone(ringtoneName);
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
                                        Ringtone: {selectedRingtone ? (selectedRingtone === 'rooster' ? 'Rooster' : selectedRingtone) : ''}
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
                            {/* Rooster Ringtone */}
                            <TouchableOpacity 
                                style={[
                                    styles.ringtoneItem,
                                    selectedRingtone === 'rooster' && styles.selectedRingtoneItem
                                ]} 
                                onPress={() => selectRingtone('rooster')}
                            >
                                <Text style={styles.ringtoneItemTitle}>Rooster</Text>
                                <TouchableOpacity 
                                    style={styles.previewButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        previewRingtone('rooster');
                                    }}
                                >
                                    <Text style={styles.previewButtonText}>▶ Preview</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
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
        borderRadius: 16,
        padding: 10,
        marginBottom: 16,
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
        fontSize: 18,
        fontWeight: "700",
        color: "#244D4A",
        marginBottom: 4,
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
});
