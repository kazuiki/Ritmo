import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Image,
	ImageBackground,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ParentalLockAuthService } from "../../src/parentalLockAuthService";
import { ParentalLockService } from "../../src/parentalLockService";
import { supabase } from "../../src/supabaseClient";
import { defaultPdfFilename, saveViewAsPdf } from "../../src/utils/pdf";

export default function Progress() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const tabBarHeight = useBottomTabBarHeight();
	const [fontsLoaded] = useFonts({
		Fredoka_400Regular,
		Fredoka_500Medium,
		Fredoka_600SemiBold,
		Fredoka_700Bold,
	});
	const [showParentalLockModal, setShowParentalLockModal] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(ParentalLockAuthService.isTabAuthenticated('progress'));
	const [pin, setPin] = useState(['', '', '', '']);
	const pinRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
	const printableRef = useRef<View>(null);
	const [childName, setChildName] = useState<string>("Kid");

	// Demo data: replace with real routines/tasks data integration
	const tasks = useMemo(() => [
		{ name: 'BRUSH TEETH', statuses: [true, true, false, false, false, true, true] },
		{ name: 'EAT FOOD', statuses: [true, false, true, false, true, false, true] },
		{ name: 'WASH BODY', statuses: [true, false, true, false, true, false, false] },
		{ name: 'CHANGE CLOTHES', statuses: [false, true, false, true, false, true, false] },
		{ name: 'GO TO SCHOOL', statuses: [false, false, true, false, true, false, true] },
	], []);

	// Week range (Monday to Sunday)
	const weekInfo = useMemo(() => {
		const today = new Date();
		const day = today.getDay(); // 0-6 (Sun-Sat)
		const diffToMonday = (day === 0 ? -6 : 1 - day); // if Sunday (0), go back 6 days
		const monday = new Date(today);
		monday.setDate(today.getDate() + diffToMonday);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);

		const months = [
			'January','February','March','April','May','June',
			'July','August','September','October','November','December'
		];
		const fmt = (d: Date) => `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
		const rangeText = `${fmt(monday)} - ${fmt(sunday)}`;

		return { monday, sunday, rangeText };
	}, []);

	// Metrics
	const totals = useMemo(() => {
		const totalTasks = tasks.length * 7;
		const completed = tasks.reduce((acc, t) => acc + t.statuses.filter(Boolean).length, 0);
		const rate = totalTasks > 0 ? Math.floor((completed / totalTasks) * 100) : 0;
		const perTaskDone = tasks.map(t => t.statuses.filter(Boolean).length);
		return { totalTasks, completed, rate, perTaskDone };
	}, [tasks]);

	// Check parental lock on component mount and when focused
	useEffect(() => {
		checkParentalLock();
		
		// Listen to authentication changes
		const authListener = (isAuth: boolean) => {
			setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('progress'));
		};
		
		ParentalLockAuthService.addListener(authListener);
		
		return () => {
			ParentalLockAuthService.removeListener(authListener);
		};
	}, []);

	useFocusEffect(
		React.useCallback(() => {
			// Update authentication state and check parental lock when focusing on this tab
			setIsAuthenticated(ParentalLockAuthService.isTabAuthenticated('progress'));
			checkParentalLock();
		}, [])
	);

	// Load child name from auth profile
	useEffect(() => {
		(async () => {
			const { data } = await supabase.auth.getUser();
			const meta = (data?.user?.user_metadata ?? {}) as any;
			setChildName(meta?.child_name ?? "Kid");
		})();
	}, []);

	const checkParentalLock = async () => {
		const isEnabled = await ParentalLockService.isEnabled();
		const isTabAuth = ParentalLockAuthService.isTabAuthenticated('progress');
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
				ParentalLockAuthService.setAuthenticated(true, 'progress');
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

	return (
		<View style={styles.container}>
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
			<ScrollView 
				style={styles.scrollView}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
				showsVerticalScrollIndicator={false}
			>
				<View ref={printableRef} collapsable={false}>
					{/* Card 1: Weekly Performance Summary */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Weekly Performance Summary</Text>

						{/* For: child name (placeholder: child_name) */}
						<View style={styles.rowBetween}>
							<Text style={styles.subtleText}>For: <Text style={styles.boldText}>{childName}</Text></Text>
						</View>

					{/* Week of (pressable text + inline icon) */}
					<View style={styles.weekRow}>
						<Text style={styles.subtleText}>Week of: </Text>
						<Pressable 
							style={({ pressed }) => [
								styles.weekDateButton,
								pressed && styles.weekDateButtonPressed
							]}
							onPress={() => router.push("/history")}
						>
							<Text style={styles.weekRangeText}>{weekInfo.rangeText}</Text>
							<Image source={require("../../assets/images/history.png")} style={styles.weekInlineIcon} />
						</Pressable>
					</View>						
					{/* Metric mini-cards */}
						<View style={styles.metricsRow}>
							<View style={styles.metricCard}>
								<Text style={styles.metricTitle}>Total Task</Text>
								<Text style={styles.metricValue}>{totals.totalTasks}</Text>
							</View>
							<View style={styles.metricCard}>
								<Text style={styles.metricTitle}>Completed</Text>
								<Text style={styles.metricValue}>{totals.completed}</Text>
							</View>
							<View style={styles.metricCard}>
								<Text style={styles.metricTitle}>Rate</Text>
								<Text style={styles.metricValue}>{totals.rate}%</Text>
							</View>
						</View>
					</View>

					{/* Card 2: Ritmo Tracker */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Ritmo Tracker</Text>

						{/* Grid Header */}
						<View style={[styles.gridRow, styles.gridHeader]}> 
							<Text style={[styles.gridCellTask, styles.gridHeaderText]}>Task</Text>
							{['M','T','W','Th','F','St','S'].map((d) => (
								<Text key={d} style={[styles.gridCellDay, styles.gridHeaderText]}>{d}</Text>
							))}
							<Text style={[styles.gridCellDone, styles.gridHeaderText]}>Done</Text>
						</View>

						{/* Rows */}
						{tasks.map((task, idx) => (
							<View key={task.name} style={styles.gridRow}>
								<Text style={styles.gridCellTask}>{task.name}</Text>
								{task.statuses.map((status, i) => (
									<View key={i} style={[styles.gridCellDay, styles.indicatorCell]}>
										<View style={[styles.indicatorSquare, status ? styles.indicatorGreen : styles.indicatorRed]} />
									</View>
								))}
								<Text style={styles.gridCellDone}>{totals.perTaskDone[idx]}</Text>
							</View>
						))}

						{/* Legend */}
						<View style={styles.legendRow}>
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendGreen]} />
								<Text style={styles.legendText}>Done</Text>
							</View>
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendRed]} />
								<Text style={styles.legendText}>Missed</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Save as PDF Button */}
				<TouchableOpacity style={styles.pdfButton} onPress={async () => {
					if (!printableRef.current) return;
					try {
						await saveViewAsPdf({
							ref: printableRef,
							filename: defaultPdfFilename('progress-week'),
							pageSize: 'A4',
							marginMm: 12,
							scalePercent: 0.8,
							logoModule: null,
							openAfterSave: true,
						});
						// No alert on success; PDF is opened or share sheet is shown immediately
					} catch (e: any) {
						Alert.alert('PDF Error', e?.message || 'Failed to generate PDF');
					}
				}}>
					<View style={styles.pdfButtonInner}>
						<Image source={require("../../assets/images/dl.png")} style={styles.pdfIcon} />
						<Text style={styles.pdfLabel}>Save as PDF</Text>
						<Image source={require("../../assets/images/PDF.png")} style={styles.pdfIcon} />
					</View>
				</TouchableOpacity>
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

const styles = StyleSheet.create({
	backgroundImage: {
		position: "absolute",
		width: "100%",
		height: "100%",
	},
	container: {
		flex: 1,
	},
	header: {
		paddingTop: 50,
		paddingHorizontal: 16,
	},
	brandLogo: {
		width: 120,
		height: 30,
		resizeMode: "contain",
		marginLeft: -22,
		marginTop: -20,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#CFF6EB',
		padding: 16,
		marginTop: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	cardTitle: {
			fontSize: 20,
		fontWeight: '700',
		color: '#2A3B4D',
		marginBottom: 8,
		alignSelf: 'center',
			fontFamily: 'Fredoka_700Bold',
	},
	rowBetween: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
		subtleText: {
		color: '#2A3B4D',
			fontSize: 16,
			fontFamily: 'Fredoka_400Regular',
	},
	boldText: {
		fontWeight: '700',
			fontFamily: 'Fredoka_700Bold',
	},
	weekRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
	},
	weekDateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#5BDFC9',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		backgroundColor: '#FFFFFF',
		flex: 1,
		maxWidth: '100%',
		flexWrap: 'wrap',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.25,
		shadowRadius: 6,
		elevation: 5,
	},
	weekDateButtonPressed: {
		backgroundColor: '#F9F9F9',
		transform: [{ scale: 1 }],
		shadowOpacity: 0.12,
		elevation: 2,
	},
	weekRangeText: {
		color: '#2A3B4D',
		fontSize: 12,
		fontFamily: 'Fredoka_500Medium',
		flexShrink: 1,
		paddingHorizontal: 6,
		paddingVertical: 1,
	},
	weekInlineIcon: {
		width: 16,
		height: 16,
		marginLeft: 6,
		resizeMode: 'contain',
		opacity: 0.8,
	},
	smallIcon: {
		width: 18,
		height: 18,
		resizeMode: 'contain',
		opacity: 0.9,
	},
	metricsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
		marginTop: 12,
	},
	metricCard: {
		flex: 1,
		backgroundColor: '#F3FFFB',
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#CFF6EB',
		paddingVertical: 12,
		alignItems: 'center',
	},
	metricTitle: {
		color: '#2A3B4D',
		fontSize: 14,
		marginBottom: 4,
		fontFamily: 'Fredoka_500Medium',
	},
	metricValue: {
		color: '#2A3B4D',
		fontWeight: '700',
		fontSize: 22,
		fontFamily: 'Fredoka_700Bold',
	},
	gridRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 5,
		borderBottomWidth: 1,
		borderBottomColor: '#E6F6F1',
	},
	gridHeader: {
		backgroundColor: '#F7FFFD',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	gridHeaderText: {
		fontWeight: '700',
		color: '#2A3B4D',
		fontFamily: 'Fredoka_700Bold',
	},
	gridCellTask: {
		flex: 2,
		color: '#2A3B4D',
		fontFamily: 'Fredoka_500Medium',
	},
	gridCellDay: {
		flex: 0.6,
		textAlign: 'center',
		alignItems: 'center',
		justifyContent: 'center',
	},
	gridCellDone: {
		flex: 0.7,
		textAlign: 'center',
		color: '#2A3B4D',
		fontWeight: '700',
		fontFamily: 'Fredoka_700Bold',
	},
	indicatorCell: {
		height: 24,
		justifyContent: 'center',
		alignItems: 'center',
	},
	indicatorSquare: {
		width: 16,
		height: 16,
		borderRadius: 3,
		borderWidth: 1,
		borderColor: '#DDECE7',
	},
	indicatorGreen: { backgroundColor: '#1EBE69', borderColor: '#18A65B' },
	indicatorRed: { backgroundColor: '#F56A6A', borderColor: '#E05A5A' },
	legendRow: {
		flexDirection: 'row',
		gap: 20,
		paddingTop: 12,
		alignSelf: 'center',
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	legendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	legendGreen: { backgroundColor: '#1EBE69' },
	legendRed: { backgroundColor: '#F56A6A' },
	legendText: {
		color: '#2A3B4D',
		fontSize: 12,
	},
	pdfButton: {
		marginTop: 16,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#CFF6EB',
		paddingVertical: 16,
		paddingHorizontal: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	pdfButtonInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		
	},
	pdfIcon: {
		width: 36,
		height: 36,
		resizeMode: 'contain',
	},
	pdfLabel: {
		fontSize: 22,
		fontWeight: '600',
		color: '#5BDFC9',
		fontFamily: 'Fredoka_600SemiBold',
	},
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
		padding: 20,
	},
	modalContent: {
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
	lockIconContainer: {
		marginBottom: 20,
		opacity: 0.7,
	},
	modalTitle: {
		fontSize: 28,
		fontWeight: "700",
		fontFamily: "Fredoka_700Bold",
		color: "#333",
		marginBottom: 8,
		textAlign: "center",
	},
	modalSubtitle: {
		fontSize: 16,
		fontWeight: "400",
		fontFamily: "Fredoka_400Regular",
		color: "#666",
		textAlign: "center",
		marginBottom: 25,
		lineHeight: 22,
	},
	modalContentTitle: {
		fontSize: 14,
		fontWeight: "600",
		fontFamily: "Fredoka_600SemiBold",
		color: "#555",
		marginBottom: 25,
		textAlign: "center",
		lineHeight: 20,
	},
	pinContainer: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 25,
		gap: 12,
	},
	pinInput: {
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
		fontFamily: "Fredoka_500Medium",
	},
	pinInputFilled: {
		backgroundColor: "#E8F5E8",
		borderColor: "#4CAF50",
	},
	forgotPin: {
		marginBottom: 30,
	},
	forgotPinText: {
		fontSize: 14,
		fontWeight: "500",
		color: "#007AFF",
		textDecorationLine: "underline",
		fontFamily: "Fredoka_700Bold",
	},
	buttonContainer: {
		width: "100%",
		gap: 12,
	},
	unlockButton: {
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
	unlockText: {
		fontSize: 16,
		fontWeight: "700",
		color: "#FFFFFF",
		fontFamily: "Fredoka_600SemiBold",
	},
	cancelButton: {
		backgroundColor: "transparent",
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 25,
		borderWidth: 2,
		borderColor: "#E0E0E0",
		alignItems: "center",
	},
	cancelText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#666",
		fontFamily: "Fredoka_600SemiBold",
	},
});
