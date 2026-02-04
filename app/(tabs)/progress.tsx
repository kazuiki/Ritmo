import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProgressOnboarding } from "../../src/components";
import { useMode } from "../../src/contexts/ModeContext";
import { useOnboarding } from "../../src/contexts/OnboardingContext";
import { getRoutinesForCurrentUser, getUserFirstProgressDatesByRoutine, getUserProgressForRange, type Routine, type RoutineProgress } from "../../src/routinesService";
import { supabase } from "../../src/supabaseClient";
import { saveWeeklyPerformanceReportPdf } from "../../src/utils/pdf";
import { createResponsiveStyles, useResponsiveDimensions } from "../../src/utils/responsive";

const RITMO_HEADER = require("../../assets/ritmo-header.png");

interface RoutineWithDays extends Routine {
	days?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

export default function Progress() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const tabBarHeight = useBottomTabBarHeight();
	const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
	const { mode, parentalLockEnabled, backToChildMode } = useMode();
	const { showProgressOnboarding, startProgressOnboarding, completeProgressOnboarding, skipProgressOnboarding } = useOnboarding();
	const [fontsLoaded] = useFonts({
		Fredoka_400Regular,
		Fredoka_500Medium,
		Fredoka_600SemiBold,
		Fredoka_700Bold,
	});
	const printableRef = useRef<View>(null);
	const weekButtonRef = useRef<View>(null);
	const [weekButtonLayout, setWeekButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
	const [childName, setChildName] = useState<string>("Kid");
	const [routines, setRoutines] = useState<RoutineWithDays[]>([]);
	const [progressData, setProgressData] = useState<RoutineProgress[]>([]);
	const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [earliestProgressByRoutine, setEarliestProgressByRoutine] = useState<Record<number, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
			// Use local timezone instead of UTC
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			weekDates.push(`${year}-${month}-${day}`); // YYYY-MM-DD in local timezone
			weekDays.push(date.getDay()); // 0-6 (Sun-Sat)
		}

		return { monday, sunday, rangeText, weekDates, weekDays };
	}, []);

	// Build tasks data structure from routines and progress
	const tasks = useMemo(() => {
		if (!routines || routines.length === 0) return [];

		// Find the first date a routine existed for this user (created_at or earliest progress row across all time)
		const firstActiveDateByRoutine = new Map<number, Date>();

		// Seed from globally earliest progress dates (not limited to current week)
		Object.entries(earliestProgressByRoutine).forEach(([rid, dateStr]) => {
			const id = Number(rid);
			if (!id || !dateStr) return;
			const [y, m, d] = dateStr.split('-').map(Number);
			const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
			dt.setHours(0,0,0,0);
			const existing = firstActiveDateByRoutine.get(id);
			if (!existing || dt < existing) firstActiveDateByRoutine.set(id, dt);
		});
		progressData.forEach((p) => {
			if (!p.day_date) return;
			const [py, pm, pd] = p.day_date.split('-').map(Number);
			const progressDay = new Date(py, pm - 1, pd);
			progressDay.setHours(0, 0, 0, 0);
			const existing = firstActiveDateByRoutine.get(p.routine_id);
			if (!existing || progressDay < existing) firstActiveDateByRoutine.set(p.routine_id, progressDay);
		});
		routines.forEach((routine) => {
			if (!routine.created_at) return;
			const created = new Date(routine.created_at);
			created.setHours(0, 0, 0, 0);
			const existing = firstActiveDateByRoutine.get(routine.id);
			if (!existing || created < existing) firstActiveDateByRoutine.set(routine.id, created);
		});
		
		// Helper to convert routine time (e.g., "01:00 am") to minutes since midnight for sorting
		const timeToMinutes = (timeStr?: string): number => {
			if (!timeStr) return Number.POSITIVE_INFINITY;
			const [time, periodRaw] = timeStr.toLowerCase().split(' ');
			if (!time || !periodRaw) return Number.POSITIVE_INFINITY;
			let [hours, minutes] = time.split(':').map(Number);
			const period = periodRaw.trim();
			if (period === 'pm' && hours !== 12) hours += 12;
			if (period === 'am' && hours === 12) hours = 0;
			return hours * 60 + (minutes || 0);
		};

		// Helper function to determine task status
		const getTaskStatus = (routine: RoutineWithDays, dateStr: string, dayOfWeek: number): boolean | null | undefined => {
			// Check if this routine is scheduled for this day of week
			const routineDays = routine.days || [0,1,2,3,4,5,6]; // Default to all days if not set
			if (!routineDays.includes(dayOfWeek)) {
				return undefined; // Not scheduled for this day - don't show any indicator
			}
			
			// Skip dates that happened before the routine first existed for this user
			const [year, month, day] = dateStr.split('-').map(Number);
			const checkDate = new Date(year, month - 1, day);
			checkDate.setHours(0, 0, 0, 0);
			const firstActiveDate = firstActiveDateByRoutine.get(routine.id);
			if (firstActiveDate && checkDate < firstActiveDate) {
				return undefined; // Routine didn't exist yet; don't count as missed
			}
			
			const progress = progressData.find(
				p => p.routine_id === routine.id && p.day_date === dateStr
			);
			
			// If completed, always show green
			if (progress?.completed) {
				return true;
			}
			
			// Check if the task is missed (after end of day)
			// Parse the dateStr (YYYY-MM-DD) in local timezone
			const missedDeadline = new Date(year, month - 1, day, 23, 59, 59, 999);
			
			// If current time is past the end of the day and task isn't completed, it's missed
			if (currentTime > missedDeadline) {
				return false; // Missed (red)
			}
			
			// If we're still within the day, show as pending (orange)
			return null;
		};
		
		// Helper to format a Date as MM-DD-YYYY
		const formatDate = (d: Date) => {
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			const yyyy = d.getFullYear();
			return `${mm}-${dd}-${yyyy}`;
		};

		const sortedRoutines = [...routines].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

		return sortedRoutines.map(routine => {
			// For each day of the week, determine the status
			const statuses = weekInfo.weekDates.map((dateStr, index) => {
				const dayOfWeek = weekInfo.weekDays[index];
				return getTaskStatus(routine, dateStr, dayOfWeek);
			});
			
			// Format timestamp as "date added / routine time"
			const addedDate = (() => {
				const firstActive = firstActiveDateByRoutine.get(routine.id);
				if (firstActive) return formatDate(firstActive);
				if (routine.created_at) return formatDate(new Date(routine.created_at));
				// As a last resort, try earliestProgressByRoutine directly if map above had parsing issues
				const raw = earliestProgressByRoutine[routine.id];
				if (raw) return raw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2-$3-$1'); // YYYY-MM-DD -> MM-DD-YYYY
				return ''; // Avoid showing today's date incorrectly
			})();
			const timeStr = routine.time ? routine.time.toLowerCase().replace(/\s+/g, '') : '12:00am';
			const timestamp = `${addedDate}/${timeStr}`;
			
			return {
				name: (routine.name || '').toUpperCase(),
				timestamp,
				statuses,
				routineId: routine.id,
				days: routine.days || [0,1,2,3,4,5,6]
			};
		});
	}, [routines, progressData, weekInfo.weekDates, weekInfo.weekDays, currentTime, earliestProgressByRoutine]);

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

	useFocusEffect(
		React.useCallback(() => {
			// Reload data when tab is focused to ensure fresh data
			const refreshData = async () => {
				try {
					const { data: { user } } = await supabase.auth.getUser();
					if (!user) return;

				const [routinesData, progressForWeek, firstDatesMap] = await Promise.all([
					getRoutinesForCurrentUser(),
					getUserProgressForRange({
						from: weekInfo.monday,
						to: weekInfo.sunday,
					}),
					getUserFirstProgressDatesByRoutine(),
				]);
				
				// Load days info from AsyncStorage (user-specific)
				const storageKey = `@routines_${user.id}`;
				const stored = await AsyncStorage.getItem(storageKey);
				const storedRoutines: Array<{id: number, days?: number[]}> = stored ? JSON.parse(stored) : [];
				const storedMap = new Map(storedRoutines.map(r => [r.id, r]));					// Merge days info with routines data
					const routinesWithDays: RoutineWithDays[] = routinesData.map(routine => {
						const storedRoutine = storedMap.get(routine.id);
						return {
							...routine,
							days: storedRoutine?.days || [0,1,2,3,4,5,6]
						};
					});
					
					setRoutines(routinesWithDays);
					setProgressData(progressForWeek);
					setEarliestProgressByRoutine(firstDatesMap || {});
				} catch (error) {
					console.error('Failed to refresh data on focus:', error);
				}
			};
			
			refreshData();

			// Measure week button and trigger onboarding after a delay
			const measureTimer = setTimeout(() => {
				weekButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
					setWeekButtonLayout({ x: pageX, y: pageY, width, height });
					console.log('📏 Progress week button measured:', { x: pageX, y: pageY, width, height });
					
					// Trigger onboarding after measurement
					startProgressOnboarding();
				});
			}, 100);

			return () => clearTimeout(measureTimer);
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
				if (!user) {
					console.log('User not authenticated, skipping data load');
					return;
				}

			// Fetch routines from Supabase
			const routinesData = await getRoutinesForCurrentUser();
			
			// Load days info from AsyncStorage (user-specific)
			const storageKey = `@routines_${user.id}`;
			const stored = await AsyncStorage.getItem(storageKey);
			const storedRoutines: Array<{id: number, days?: number[]}> = stored ? JSON.parse(stored) : [];
			const storedMap = new Map(storedRoutines.map(r => [r.id, r]));				// Merge days info with routines data
				const routinesWithDays: RoutineWithDays[] = routinesData.map(routine => {
					const storedRoutine = storedMap.get(routine.id);
					return {
						...routine,
						days: storedRoutine?.days || [0,1,2,3,4,5,6] // Default to all days if not set
					};
				});
				
				setRoutines(routinesWithDays);

				// Fetch progress for the current week and earliest progress per routine
				const [progressForWeek, firstDatesMap] = await Promise.all([
					getUserProgressForRange({
					from: weekInfo.monday,
					to: weekInfo.sunday,
					}),
					getUserFirstProgressDatesByRoutine(),
				]);
				setProgressData(progressForWeek);
				setEarliestProgressByRoutine(firstDatesMap || {});

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
							
							// Load days info from AsyncStorage (user-specific)
							const storageKey = `@routines_${user.id}`;
							const stored = await AsyncStorage.getItem(storageKey);
							const storedRoutines: Array<{id: number, days?: number[]}> = stored ? JSON.parse(stored) : [];
							const storedMap = new Map(storedRoutines.map(r => [r.id, r]));								// Merge days info with routines data
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
				// If not authenticated, this is expected - user will be redirected to login
				if (error instanceof Error && error.message.includes('Not authenticated')) {
					console.log('User authentication required to load progress data');
				}
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
						<View ref={weekButtonRef} collapsable={false}>
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
								<Text style={styles.legendText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Done</Text>
							</View>
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendRed]} />
								<Text style={styles.legendText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Missed</Text>
							</View>
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendOrange]} />
								<Text style={styles.legendText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Pending</Text>
							</View>
							<View style={styles.legendItem}>
								<View style={[styles.legendDot, styles.legendGray]} />
								<Text style={styles.legendText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Unassigned</Text>
							</View>
						</View>
					</View>
				</View>

				{/* Save as PDF Button */}
				<TouchableOpacity style={styles.pdfButton} disabled={isGeneratingPdf} onPress={async () => {
					if (isGeneratingPdf) return;
					setIsGeneratingPdf(true);
					try {
						// Load and convert logo to base64
						let logoBase64 = '';
						try {
							const asset = Asset.fromModule(RITMO_HEADER);
							await asset.downloadAsync();
							if (asset.localUri) {
								const data = await FileSystem.readAsStringAsync(asset.localUri, {
									encoding: 'base64',
								});
								logoBase64 = data;
							}
						} catch (e) {
							console.warn('Could not load logo image:', e);
							// Continue without logo
						}
						
						await saveWeeklyPerformanceReportPdf({
							childName: childName,
							weekStart: weekInfo.monday,
							weekEnd: weekInfo.sunday,
							totalTasks: totals.totalTasks,
							completedTasks: totals.completed,
							completionRate: totals.rate,
							tasks: tasks.map((task, idx) => ({
								name: task.name,
								timestamp: task.timestamp,
								statuses: task.statuses,
								routineId: task.routineId,
								perTaskDone: totals.perTaskDone[idx] || 0,
							})),
							logoBase64: logoBase64,
							openAfterSave: true,
						});
						// No alert on success; PDF is opened or share sheet is shown immediately
					} catch (e: any) {
						Alert.alert('PDF Error', e?.message || 'Failed to generate PDF');
					} finally {
						setIsGeneratingPdf(false);
					}
				}}>
					<View style={styles.pdfButtonInner}>
						<Image source={require("../../assets/images/dl.png")} style={styles.pdfIcon} />
						<Text style={styles.pdfLabel}>Save as PDF</Text>
						<Image source={require("../../assets/images/PDF.png")} style={styles.pdfIcon} />
					</View>
				</TouchableOpacity>
			</ScrollView>

			{/* Progress Onboarding */}
			<ProgressOnboarding
				visible={showProgressOnboarding}
				weekButtonLayout={weekButtonLayout}
				onComplete={completeProgressOnboarding}
				onSkip={skipProgressOnboarding}
			/>
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
		backgroundColor: 'transparent',

		paddingHorizontal: scale.scaleSpacing(24),
		paddingVertical: scale.scaleSpacing(8),
		borderRadius: 20,
		marginTop: 0,
		alignSelf: 'flex-end',

		paddingHorizontal: scale.scaleSpacing(20),
		paddingVertical: scale.scaleSpacing(12),
		borderRadius: 0,
		marginTop: scale.scaleSpacing(10),

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
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: scale.scaleSpacing(16),
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: scale.scaleBorderRadius(16),
		borderWidth: 2,
		borderColor: '#CFF6EB',
		padding: scale.scaleSpacing(16),
		marginTop: scale.scaleSpacing(16),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: scale.scaleHeight(6) },
		shadowOpacity: 0.1,
		shadowRadius: scale.scaleSpacing(8),
		elevation: 3,
	},
	cardTitle: {
		fontSize: scale.scaleFont(20),
		fontWeight: '700',
		color: '#2A3B4D',
		marginBottom: scale.scaleSpacing(8),
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
		fontSize: scale.scaleFont(16),
		fontFamily: 'Fredoka_400Regular',
	},
	boldText: {
		fontWeight: '700',
		fontFamily: 'Fredoka_700Bold',
	},
	weekRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: scale.scaleSpacing(8),
	},
	weekDateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#5BDFC9',
		borderRadius: scale.scaleBorderRadius(8),
		paddingHorizontal: scale.scaleSpacing(10),
		paddingVertical: scale.scaleSpacing(6),
		backgroundColor: '#FFFFFF',
		flex: 1,
		maxWidth: '100%',
		flexWrap: 'wrap',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: scale.scaleHeight(5) },
		shadowOpacity: 0.25,
		shadowRadius: scale.scaleSpacing(6),
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
		fontSize: scale.scaleFont(12),
		fontFamily: 'Fredoka_500Medium',
		flexShrink: 1,
		paddingHorizontal: scale.scaleSpacing(3),
		paddingVertical: scale.scaleSpacing(1),
	},
	weekInlineIcon: {
		width: scale.scaleWidth(16),
		height: scale.scaleHeight(16),
		marginLeft: scale.scaleSpacing(6),
		resizeMode: 'contain',
		opacity: 0.8,
	},
	smallIcon: {
		width: scale.scaleWidth(18),
		height: scale.scaleHeight(18),
		resizeMode: 'contain',
		opacity: 0.9,
	},
	metricsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: scale.scaleSpacing(10),
		marginTop: scale.scaleSpacing(12),
	},
	metricCard: {
		flex: 1,
		backgroundColor: '#F3FFFB',
		borderRadius: scale.scaleBorderRadius(12),
		borderWidth: 2,
		borderColor: '#CFF6EB',
		paddingVertical: scale.scaleSpacing(12),
		alignItems: 'center',
	},
	metricTitle: {
		color: '#2A3B4D',
		fontSize: scale.scaleFont(14),
		marginBottom: scale.scaleSpacing(4),
		fontFamily: 'Fredoka_500Medium',
	},
	metricValue: {
		color: '#2A3B4D',
		fontWeight: '700',
		fontSize: scale.scaleFont(22),
		fontFamily: 'Fredoka_700Bold',
	},
	gridRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: scale.scaleSpacing(5),
		borderBottomWidth: 1,
		borderBottomColor: '#E6F6F1',
	},
	gridHeader: {
		backgroundColor: '#F7FFFD',
		borderTopLeftRadius: scale.scaleBorderRadius(10),
		borderTopRightRadius: scale.scaleBorderRadius(10),
	},
	gridHeaderText: {
		fontWeight: '700',
		color: '#2A3B4D',
		fontFamily: 'Fredoka_700Bold',
	},
	gridCellTask: {
		// Slightly reduced width & padding to lessen gap before Monday column
		flex: 2.5,
		paddingRight: scale.scaleSpacing(1),
	},
	taskNameText: {
		color: '#2A3B4D',
		fontFamily: 'Fredoka_500Medium',
		fontSize: scale.scaleFont(15),
		lineHeight: scale.scaleHeight(16),
	},
	taskTimestampText: {
		color: '#6B8E7E',
		fontFamily: 'Fredoka_400Regular',
		fontSize: scale.scaleFont(12),
		lineHeight: scale.scaleHeight(12),
		marginTop: scale.scaleSpacing(2),
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
		height: scale.scaleHeight(24),
		justifyContent: 'center',
		alignItems: 'center',
	},
	indicatorSquare: {
		width: scale.scaleWidth(16),
		height: scale.scaleHeight(16),
		borderRadius: scale.scaleBorderRadius(3),
		borderWidth: 1,
		borderColor: '#DDECE7',
	},
	indicatorGreen: { backgroundColor: '#1EBE69', borderColor: '#18A65B' },
	indicatorRed: { backgroundColor: '#F56A6A', borderColor: '#E05A5A' },
	indicatorGray: { backgroundColor: '#E0E0E0', borderColor: '#CCCCCC' }, // Not scheduled
	indicatorOrange: { backgroundColor: '#FFA500', borderColor: '#E69500' }, // Pending
	indicatorDarkGray: { backgroundColor: '#555555', borderColor: '#444444' },
	emptyIndicator: {
		width: scale.scaleWidth(16),
		height: scale.scaleHeight(16),
	},
	legendRow: {
		flexDirection: 'row',
		gap: scale.scaleSpacing(10),
		paddingTop: scale.scaleSpacing(12),
		alignSelf: 'center',
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scale.scaleSpacing(3),
	},
	legendDot: {
		width: scale.scaleWidth(10),
		height: scale.scaleHeight(10),
		borderRadius: scale.scaleBorderRadius(5),
	},
	legendGreen: { backgroundColor: '#1EBE69' },
	legendRed: { backgroundColor: '#F56A6A' },
	legendGray: { backgroundColor: '#E0E0E0' }, // Not scheduled (no legend item yet)
	legendOrange: { backgroundColor: '#FFA500' },
	legendText: {
		color: '#2A3B4D',
		fontSize: scale.scaleFont(12),
	},
	pdfButton: {
		marginTop: scale.scaleSpacing(16),
		backgroundColor: '#FFFFFF',
		borderRadius: scale.scaleBorderRadius(16),
		borderWidth: 2,
		borderColor: '#CFF6EB',
		paddingVertical: scale.scaleSpacing(16),
		paddingHorizontal: scale.scaleSpacing(20),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: scale.scaleHeight(6) },
		shadowOpacity: 0.1,
		shadowRadius: scale.scaleSpacing(8),
		elevation: 3,
	},
	pdfButtonInner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: scale.scaleSpacing(12),
		
	},
	pdfIcon: {
		width: scale.scaleWidth(36),
		height: scale.scaleHeight(36),
		resizeMode: 'contain',
	},
	pdfLabel: {
		fontSize: scale.scaleFont(22),
		fontWeight: '600',
		color: '#5BDFC9',
		fontFamily: 'Fredoka_600SemiBold',
	},
}));
