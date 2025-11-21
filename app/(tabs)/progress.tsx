import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getRoutinesForCurrentUser, getUserProgressForRange, type Routine, type RoutineProgress } from "../../src/routinesService";
import { supabase } from "../../src/supabaseClient";
import { defaultPdfFilename, saveViewAsPdf } from "../../src/utils/pdf";

interface RoutineWithDays extends Routine {
	days?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

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
	const [routines, setRoutines] = useState<RoutineWithDays[]>([]);
	const [progressData, setProgressData] = useState<RoutineProgress[]>([]);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());

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

		// Generate array of dates for the week (Mon-Sun)
		const weekDates: string[] = [];
		const weekDays: number[] = []; // Day of week indices (0=Sun, 1=Mon, etc.)
		for (let i = 0; i < 7; i++) {
			const date = new Date(monday);
			date.setDate(monday.getDate() + i);
			weekDates.push(date.toISOString().slice(0, 10)); // YYYY-MM-DD
			weekDays.push(date.getDay()); // 0-6 (Sun-Sat)
		}

		return { monday, sunday, rangeText, weekDates, weekDays };
	}, []);

	// Build tasks data structure from routines and progress
	const tasks = useMemo(() => {
		if (!routines || routines.length === 0) return [];
		
		// Helper function to parse time string (e.g., "01:00 am") and create Date object for a given date
		const parseRoutineTime = (dateStr: string, timeStr: string): Date => {
			const [time, period] = timeStr.toLowerCase().split(' ');
			let [hours, minutes] = time.split(':').map(Number);
			
			if (period === 'pm' && hours !== 12) {
				hours += 12;
			} else if (period === 'am' && hours === 12) {
				hours = 0;
			}
			
			const date = new Date(dateStr);
			date.setHours(hours, minutes, 0, 0);
			return date;
		};

		// Helper function to determine task status
		const getTaskStatus = (routine: RoutineWithDays, dateStr: string, dayOfWeek: number): boolean | null | undefined => {
			// Check if this routine is scheduled for this day of week
			const routineDays = routine.days || [0,1,2,3,4,5,6]; // Default to all days if not set
			if (!routineDays.includes(dayOfWeek)) {
				return undefined; // Not scheduled for this day - don't show any indicator
			}
			
			// Check if the routine was created before or on this date
			// Only show as missed if the routine existed on that date
			if (routine.created_at) {
				const routineCreationDate = new Date(routine.created_at);
				const checkDate = new Date(dateStr);
				
				// Reset time portion to compare dates only
				routineCreationDate.setHours(0, 0, 0, 0);
				checkDate.setHours(0, 0, 0, 0);
				
				// If the routine was created after this date, don't show indicator
				if (routineCreationDate > checkDate) {
					return undefined;
				}
			}
			
			const progress = progressData.find(
				p => p.routine_id === routine.id && p.day_date === dateStr
			);
			
			// If completed, always show green
			if (progress?.completed) {
				return true;
			}
			
			// Check if the task is missed (after end of day)
			const taskDate = new Date(dateStr);
			// Set deadline to end of day (11:59:59.999 PM)
			const missedDeadline = new Date(taskDate);
			missedDeadline.setHours(23, 59, 59, 999);
			
			// If current time is past the end of the day and task isn't completed, it's missed
			if (currentTime > missedDeadline) {
				return false; // Missed (red)
			}
			
			// If we're still within the day, show as pending (orange)
			return null;
		};
		
		return routines.map(routine => {
			// For each day of the week, determine the status
			const statuses = weekInfo.weekDates.map((dateStr, index) => {
				const dayOfWeek = weekInfo.weekDays[index];
				return getTaskStatus(routine, dateStr, dayOfWeek);
			});
			
			// Format timestamp (date and time when routine was created)
			let timestamp = '';
			if (routine.created_at && routine.time) {
				const createdDate = new Date(routine.created_at);
				const month = String(createdDate.getMonth() + 1).padStart(2, '0');
				const day = String(createdDate.getDate()).padStart(2, '0');
				const year = createdDate.getFullYear();
				const formattedDate = `${month}-${day}-${year}`;
				
				// Format time from routine.time (e.g., "01:00 am" -> "1:00am")
				const timeStr = routine.time.toLowerCase().replace(/\s+/g, '');
				timestamp = `${formattedDate}/${timeStr}`;
			} else {
				// Fallback: if no created_at, use current date with routine time
				const now = new Date();
				const month = String(now.getMonth() + 1).padStart(2, '0');
				const day = String(now.getDate()).padStart(2, '0');
				const year = now.getFullYear();
				const formattedDate = `${month}-${day}-${year}`;
				const timeStr = routine.time ? routine.time.toLowerCase().replace(/\s+/g, '') : '12:00am';
				timestamp = `${formattedDate}/${timeStr}`;
			}
			
			return {
				name: (routine.name || '').toUpperCase(),
				timestamp,
				statuses,
				routineId: routine.id,
				days: routine.days || [0,1,2,3,4,5,6]
			};
		});
	}, [routines, progressData, weekInfo.weekDates, weekInfo.weekDays, currentTime]);

	// Metrics
	const totals = useMemo(() => {
		// Count only the days that are scheduled (undefined means not scheduled)
		const totalTasks = tasks.reduce((acc, t) => {
			return acc + t.statuses.filter(s => s !== undefined).length;
		}, 0);
		const completed = tasks.reduce((acc, t) => acc + t.statuses.filter(s => s === true).length, 0);
		const rate = totalTasks > 0 ? Math.floor((completed / totalTasks) * 100) : 0;
		const perTaskDone = tasks.map(t => t.statuses.filter(s => s === true).length);
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
			
			// Reload data when tab is focused to ensure fresh data
			const refreshData = async () => {
				try {
					const { data: { user } } = await supabase.auth.getUser();
					if (!user) return;

					const [routinesData, progressForWeek] = await Promise.all([
						getRoutinesForCurrentUser(),
						getUserProgressForRange({
							from: weekInfo.monday,
							to: weekInfo.sunday,
						})
					]);
					
					// Load days info from AsyncStorage
					const stored = await AsyncStorage.getItem('@routines');
					const storedRoutines: Array<{id: number, days?: number[]}> = stored ? JSON.parse(stored) : [];
					const storedMap = new Map(storedRoutines.map(r => [r.id, r]));
					
					// Merge days info with routines data
					const routinesWithDays: RoutineWithDays[] = routinesData.map(routine => {
						const storedRoutine = storedMap.get(routine.id);
						return {
							...routine,
							days: storedRoutine?.days || [0,1,2,3,4,5,6]
						};
					});
					
					setRoutines(routinesWithDays);
					setProgressData(progressForWeek);
				} catch (error) {
					console.error('Failed to refresh data on focus:', error);
				}
			};
			
			refreshData();
		}, [weekInfo.monday, weekInfo.sunday])
	);

	// Load child name from auth profile
	useEffect(() => {
		(async () => {
			const { data } = await supabase.auth.getUser();
			const meta = (data?.user?.user_metadata ?? {}) as any;
			setChildName(meta?.child_name ?? "Kid");
		})();
	}, []);

	// Update current time every minute to refresh status
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60000); // Update every minute

		return () => clearInterval(interval);
	}, []);

	// Load routines and progress data with real-time subscription
	useEffect(() => {
		let progressSubscription: any = null;
		let routinesSubscription: any = null;

		const loadData = async () => {
			try {
				const { data: { user } } = await supabase.auth.getUser();
				if (!user) return;

				// Fetch routines from Supabase
				const routinesData = await getRoutinesForCurrentUser();
				
				// Load days info from AsyncStorage
				const stored = await AsyncStorage.getItem('@routines');
				const storedRoutines: Array<{id: number, days?: number[]}> = stored ? JSON.parse(stored) : [];
				const storedMap = new Map(storedRoutines.map(r => [r.id, r]));
				
				// Merge days info with routines data
				const routinesWithDays: RoutineWithDays[] = routinesData.map(routine => {
					const storedRoutine = storedMap.get(routine.id);
					return {
						...routine,
						days: storedRoutine?.days || [0,1,2,3,4,5,6] // Default to all days if not set
					};
				});
				
				setRoutines(routinesWithDays);

				// Fetch progress for the current week
				const progressForWeek = await getUserProgressForRange({
					from: weekInfo.monday,
					to: weekInfo.sunday,
				});
				setProgressData(progressForWeek);

				// Subscribe to real-time changes in user_routine_progress table
				progressSubscription = supabase
					.channel('progress_changes')
					.on(
						'postgres_changes',
						{
							event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
							schema: 'public',
							table: 'user_routine_progress',
							filter: `user_id=eq.${user.id}`
						},
						async (payload) => {
							console.log('Progress change detected:', payload);
							
							// Immediate optimistic update for faster UI response
							if (payload.eventType === 'INSERT' && payload.new) {
								const newProgress = payload.new as RoutineProgress;
								setProgressData(prev => [...prev, newProgress]);
							} else if (payload.eventType === 'UPDATE' && payload.new) {
								const updatedProgress = payload.new as RoutineProgress;
								setProgressData(prev => 
									prev.map(p => p.id === updatedProgress.id ? updatedProgress : p)
								);
							} else if (payload.eventType === 'DELETE' && payload.old) {
								const deletedId = (payload.old as any).id;
								setProgressData(prev => prev.filter(p => p.id !== deletedId));
							}
							
							// Also refetch to ensure data consistency
							try {
								const updatedProgress = await getUserProgressForRange({
									from: weekInfo.monday,
									to: weekInfo.sunday,
								});
								setProgressData(updatedProgress);
							} catch (error) {
								console.error('Failed to refresh progress data:', error);
							}
						}
					)
					.subscribe();

				// Subscribe to real-time changes in routines table
				routinesSubscription = supabase
					.channel('routines_changes')
					.on(
						'postgres_changes',
						{
							event: '*', // Listen to all events
							schema: 'public',
							table: 'routines'
						},
						async (payload) => {
							console.log('Routine change detected:', payload);
							// Refetch routines when any change occurs
							try {
								const updatedRoutines = await getRoutinesForCurrentUser();
								
								// Load days info from AsyncStorage
								const stored = await AsyncStorage.getItem('@routines');
								const storedRoutines: Array<{id: number, days?: number[]}> = stored ? JSON.parse(stored) : [];
								const storedMap = new Map(storedRoutines.map(r => [r.id, r]));
								
								// Merge days info with routines data
								const routinesWithDays: RoutineWithDays[] = updatedRoutines.map(routine => {
									const storedRoutine = storedMap.get(routine.id);
									return {
										...routine,
										days: storedRoutine?.days || [0,1,2,3,4,5,6]
									};
								});
								
								setRoutines(routinesWithDays);
							} catch (error) {
								console.error('Failed to refresh routines:', error);
							}
						}
					)
					.subscribe();

			} catch (error) {
				console.error('Failed to load progress data:', error);
			}
		};

		loadData();

		// Cleanup subscriptions on unmount
		return () => {
			if (progressSubscription) {
				supabase.removeChannel(progressSubscription);
			}
			if (routinesSubscription) {
				supabase.removeChannel(routinesSubscription);
			}
		};
	}, [weekInfo.monday, weekInfo.sunday]);

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
						<View key={task.routineId} style={styles.gridRow}>
							<View style={styles.gridCellTask}>
								<Text style={styles.taskNameText}>{task.name}</Text>
								<Text style={styles.taskTimestampText}>{task.timestamp}</Text>
							</View>
							{task.statuses.map((status, i) => (
								<View key={i} style={[styles.gridCellDay, styles.indicatorCell]}>
									{status === undefined ? (
										// Not scheduled - gray
										<View style={[styles.indicatorSquare, styles.indicatorGray]} />
									) : status === null ? (
										// Pending - orange
										<View style={[styles.indicatorSquare, styles.indicatorOrange]} />
									) : (
										// Completed or missed
										<View style={[styles.indicatorSquare, status ? styles.indicatorGreen : styles.indicatorRed]} />
									)}
								</View>
							))}
							<Text style={styles.gridCellDone}>{totals.perTaskDone[idx] || 0}</Text>
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
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendOrange]} />
								<Text style={styles.legendText}>Pending</Text>
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
		paddingHorizontal: 5,
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
		// Slightly reduced width & padding to lessen gap before Monday column
		flex: 2.5,
		paddingRight: 1,
	},
	taskNameText: {
		color: '#2A3B4D',
		fontFamily: 'Fredoka_500Medium',
		fontSize: 15,
		lineHeight: 16,
	},
	taskTimestampText: {
		color: '#6B8E7E',
		fontFamily: 'Fredoka_400Regular',
		fontSize: 12,
		lineHeight: 12,
		marginTop: 2,
	},
	gridCellDay: {
		flex: 0.5,
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
	indicatorGray: { backgroundColor: '#E0E0E0', borderColor: '#CCCCCC' }, // Not scheduled
	indicatorOrange: { backgroundColor: '#FFA500', borderColor: '#E69500' }, // Pending
	indicatorDarkGray: { backgroundColor: '#555555', borderColor: '#444444' },
	emptyIndicator: {
		width: 16,
		height: 16,
	},
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
	legendGray: { backgroundColor: '#E0E0E0' }, // Not scheduled (no legend item yet)
	legendOrange: { backgroundColor: '#FFA500' },
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
