import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { getPresetById, Preset, PRESETS } from "../../constants/presets";

interface Routine {
    id: number;
    name: string;
    time: string;
    presetId?: number;
    completed?: boolean;
}

export default function addRoutines() {
    const [modalVisible, setModalVisible] = useState(false);
    const [routineName, setRoutineName] = useState("");
    const [hour, setHour] = useState("01");
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
    const [presetModalVisible, setPresetModalVisible] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

    const hourRef = useRef<ScrollView | null>(null);
    const minuteRef = useRef<ScrollView | null>(null);
    const periodRef = useRef<ScrollView | null>(null);

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
            loadRoutines();
        }, [])
    );

    useEffect(() => {
        saveRoutines();
    }, [routines]);

    const loadRoutines = async () => {
        try {
            const stored = await AsyncStorage.getItem("@routines");
            if (stored) {
                setRoutines(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Failed to load routines:", error);
        }
    };

    const saveRoutines = async () => {
        try {
            await AsyncStorage.setItem("@routines", JSON.stringify(routines));
        } catch (error) {
            console.error("Failed to save routines:", error);
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
        setTimeout(() => {
            hourRef.current?.scrollTo({ y: 0, animated: false });
            minuteRef.current?.scrollTo({ y: 0, animated: false });
            periodRef.current?.scrollTo({ y: 0, animated: false });
        }, 0);
    };

    const openEditModal = (routine: Routine) => {
        setEditingRoutineId(routine.id);
        setRoutineName(routine.name);
        setSelectedPresetId(routine.presetId ?? null);
        
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
            if (editingRoutineId) {
                const updatedRoutines = routines.map((r) =>
                    r.id === editingRoutineId
                        ? { ...r, name: routineName, time: `${hour}:${minute} ${period.toLowerCase()}`, presetId: selectedPresetId ?? r.presetId }
                        : r
                );
                setRoutines(updatedRoutines);
            } else {
                const newRoutine: Routine = {
                    id: Date.now(),
                    name: routineName,
                    time: `${hour}:${minute} ${period.toLowerCase()}`,
                    presetId: selectedPresetId ?? undefined,
                };
                setRoutines([...routines, newRoutine]);
            }
        }
        closeModal();
    };

    const handleDelete = () => {
        if (editingRoutineId) {
            const updatedRoutines = routines.filter((r) => r.id !== editingRoutineId);
            setRoutines(updatedRoutines);
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
            {routines.filter(r => !r.completed).map((routine) => (
                <TouchableOpacity 
                    key={routine.id} 
                    style={styles.routineCard}
                    onPress={() => openEditModal(routine)}
                    activeOpacity={0.7}
                >
                    {getPresetById(routine.presetId) ? (
                        <Image source={getPresetById(routine.presetId)!.image} style={styles.routineImage} />
                    ) : (
                        <View style={styles.routineIconPlaceholder}>
                            <Text style={styles.routineIcon}>📋</Text>
                        </View>
                    )}
                    <View style={styles.routineInfo}>
                        <Text style={styles.routineTitle}>{routine.name}</Text>
                        <Text style={styles.routineTime}>{routine.time}</Text>
                    </View>
                    </TouchableOpacity>
                ))}
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
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal}>
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {editingRoutineId ? "Edit Routine" : "Add Routine"}
                            </Text>
                            <TouchableOpacity onPress={handleDone}>
                                <Text style={styles.doneText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                    <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                                        onMomentumScrollEnd={(e) => {
                                            const y = e.nativeEvent.contentOffset.y;
                                            const idx = Math.round(y / 48);
                                            const clamped = Math.max(0, Math.min(11, idx));
                                            setHour((clamped + 1).toString().padStart(2, "0"));
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
                                        onMomentumScrollEnd={(e) => {
                                            const y = e.nativeEvent.contentOffset.y;
                                            const idx = Math.round(y / 48);
                                            const clamped = Math.max(0, Math.min(59, idx));
                                            setMinute(clamped.toString().padStart(2, "0"));
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
                                        onMomentumScrollEnd={(e) => {
                                            const y = e.nativeEvent.contentOffset.y;
                                            const idx = Math.round(y / 48);
                                            const clamped = Math.max(0, Math.min(1, idx));
                                            const p = clamped === 0 ? "AM" : "PM";
                                            setPeriod(p);
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
                                {/* Choose Routine Preset Button */}
                                <TouchableOpacity style={styles.presetButton} onPress={openPresetModal}>
                                    <Text style={styles.presetButtonText}>
                                        Choose Routine preset
                                    </Text>
                                </TouchableOpacity>

                                {/* Routine Name Input */}
                                <TextInput
                                    style={styles.input}
                                    placeholder="Routine name"
                                    placeholderTextColor="#999"
                                    value={routineName}
                                    onChangeText={setRoutineName}
                                />

                                {/* Ringtone Selector */}
                                <TouchableOpacity style={styles.ringtoneSelector}>
                                    <Text style={styles.ringtoneText}>Ringtone</Text>
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
        backgroundColor: "#F5F5F5",
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
        color: "#999",
    },
    chevron: {
        fontSize: 24,
        color: "#5DD4B4",
        fontWeight: "300",
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
        backgroundColor: "#E8FFFA",
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
});