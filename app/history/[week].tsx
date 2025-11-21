import { Fredoka_600SemiBold, useFonts } from '@expo-google-fonts/fredoka';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { getRoutinesForCurrentUser, getUserProgressForRange, type Routine, type RoutineProgress } from '../../src/routinesService';
import { supabase } from '../../src/supabaseClient';
import { defaultPdfFilename, saveViewAsPdf } from '../../src/utils/pdf';

interface RoutineWithDays extends Routine {
	days?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

export default function WeeklyHistoryDetail() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const router = useRouter();
  const printableRef = useRef<View>(null);
  const [childName, setChildName] = useState('Kid');
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold });
  const [routines, setRoutines] = useState<RoutineWithDays[]>([]);
  const [progressData, setProgressData] = useState<RoutineProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Parse start date and compute end date (Mon-Sun assumed)
  const weekRange = useMemo(() => {
    let startDate: Date;
    if (start) {
      // Parse ISO string carefully to avoid timezone issues
      const dateStr = start.slice(0, 10); // Get YYYY-MM-DD part only
      const [year, month, day] = dateStr.split('-').map(Number);
      startDate = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      startDate = new Date();
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    }
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const fmt = (d: Date) => `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
    return { startDate, endDate, rangeText: `${fmt(startDate)} - ${fmt(endDate)}` };
  }, [start]);

  // Generate array of dates for the week (Mon-Sun)
  const weekDates = useMemo(() => {
    const dates: string[] = [];
    const weekDays: number[] = []; // Day of week indices (0=Sun, 1=Mon, etc.)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekRange.startDate);
      date.setDate(weekRange.startDate.getDate() + i);
      // Format as YYYY-MM-DD without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      weekDays.push(date.getDay()); // 0-6 (Sun-Sat)
    }
    return { dates, weekDays };
  }, [weekRange.startDate]);

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
    
    // Filter routines to only show those created before or during this week
    const filteredRoutines = routines.filter(routine => {
      if (!routine.created_at) {
        // If no created_at, only show if there's actual progress data for this week
        const hasProgressThisWeek = progressData.some(
          p => p.routine_id === routine.id && weekDates.dates.includes(p.day_date)
        );
        return hasProgressThisWeek;
      }
      
      // Parse the created_at date properly to avoid timezone issues
      const createdAtStr = routine.created_at.slice(0, 10); // Get YYYY-MM-DD
      const [year, month, day] = createdAtStr.split('-').map(Number);
      const routineCreatedDate = new Date(year, month - 1, day);
      
      // Normalize end date to start of day for fair comparison
      const endDateNormalized = new Date(weekRange.endDate);
      endDateNormalized.setHours(23, 59, 59, 999); // End of the day
      
      // Only show routine if it was created on or before the end of the week being viewed
      return routineCreatedDate <= endDateNormalized;
    });
    
    return filteredRoutines.map(routine => {
      // For each day of the week, determine the status
      const statuses = weekDates.dates.map((dateStr, index) => {
        const dayOfWeek = weekDates.weekDays[index];
        return getTaskStatus(routine, dateStr, dayOfWeek);
      });
      return {
        name: (routine.name || '').toUpperCase(),
        statuses,
        routineId: routine.id,
        days: routine.days || [0,1,2,3,4,5,6]
      };
    });
  }, [routines, progressData, weekDates, weekRange.endDate, currentTime]);

  const metrics = useMemo(() => {
    // Count only the days that are scheduled (undefined means not scheduled)
    const totalTasks = tasks.reduce((acc, t) => {
      return acc + t.statuses.filter(s => s !== undefined).length;
    }, 0);
    const completed = tasks.reduce((acc, t) => acc + t.statuses.filter(s => s === true).length, 0);
    const rate = totalTasks > 0 ? Math.floor((completed / totalTasks) * 100) : 0;
    const perTaskDone = tasks.map(t => t.statuses.filter(s => s === true).length);
    return { totalTasks, completed, rate, perTaskDone };
  }, [tasks]);

  // Update current time every minute to refresh status
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const meta = (data?.user?.user_metadata ?? {}) as any;
      setChildName(meta?.child_name ?? 'Kid');
    })();
  }, []);

  // Load routines and progress data for the selected week
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
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

        // Fetch progress for the selected week
        const progressForWeek = await getUserProgressForRange({
          from: weekRange.startDate,
          to: weekRange.endDate,
        });
        setProgressData(progressForWeek);
      } catch (error) {
        console.error('Failed to load week data:', error);
        Alert.alert('Error', 'Failed to load data for this week');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekRange.startDate, weekRange.endDate]);

  const exportPdf = async () => {
    try {
      if (!printableRef.current) return;
      const base64 = await captureRef(printableRef.current, { format: 'png', quality: 1, result: 'base64' });
      const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><style>body{margin:0;padding:24px;font-family:Arial}img{width:100%;height:auto}</style></head><body><img src='data:image/png;base64,${base64}'/></body></html>`;
      const file = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
      else Alert.alert('Saved', file.uri);
    } catch (e: any) {
      Alert.alert('PDF Error', e?.message ?? 'Failed to export PDF');
    }
  };

  // Custom slide animation, similar to playbook modal and History list
  const slideX = useMemo(() => new Animated.Value(400), []);
  useEffect(() => {
    Animated.timing(slideX, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);
  const handleBack = () => {
    Animated.timing(slideX, { toValue: 400, duration: 300, useNativeDriver: true }).start(() => {
      router.back();
    });
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideX }] }]}>
      <Image source={require('../../assets/background.png')} style={styles.background} resizeMode='cover' />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backTextLink}>Back</Text>
          </TouchableOpacity>
        </View>
        <View ref={printableRef} collapsable={false}>
          {/* Weekly Performance Summary (match Progress) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Performance Summary</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.subtleText}>For: <Text style={styles.boldText}>{childName}</Text></Text>
            </View>
            <View style={styles.weekRow}>
              <Text style={styles.subtleText}>Week of: </Text>
              <Text style={styles.weekRangeText}>{weekRange.rangeText}</Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}><Text style={styles.metricTitle}>Total Task</Text><Text style={styles.metricValue}>{metrics.totalTasks}</Text></View>
              <View style={styles.metricCard}><Text style={styles.metricTitle}>Completed</Text><Text style={styles.metricValue}>{metrics.completed}</Text></View>
              <View style={styles.metricCard}><Text style={styles.metricTitle}>Rate</Text><Text style={styles.metricValue}>{metrics.rate}%</Text></View>
            </View>
          </View>
          {/* Ritmo Tracker (match Progress) */}
          <View style={styles.card}>
            <View style={styles.trackerTitleRow}>
              <Text style={styles.cardTitleLeft}>Ritmo Tracker</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendGreen]} /><Text style={styles.legendText}>Done</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendRed]} /><Text style={styles.legendText}>Missed</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendOrange]} /><Text style={styles.legendText}>Pending</Text></View>
              </View>
            </View>
            <View style={[styles.gridRow, styles.gridHeader]}>
              <Text style={[styles.gridCellTask, styles.gridHeaderText]}>Task</Text>
              {['M','T','W','Th','F','St','S'].map(d => <Text key={d} style={[styles.gridCellDay, styles.gridHeaderText]}>{d}</Text>)}
              <Text style={[styles.gridCellDone, styles.gridHeaderText]}>Done</Text>
            </View>
            {tasks.map((t,i) => (
              <View key={t.routineId} style={styles.gridRow}>
                <Text style={styles.gridCellTask}>{t.name}</Text>
                {t.statuses.map((s, idx) => (
                  <View key={idx} style={[styles.gridCellDay, styles.indicatorCell]}>
                    {s === undefined ? (
                      // Not scheduled - gray
                      <View style={[styles.indicatorSquare, styles.indicatorGray]} />
                    ) : s === null ? (
                      // Pending - orange
                      <View style={[styles.indicatorSquare, styles.indicatorOrange]} />
                    ) : (
                      // Completed or missed
                      <View style={[styles.indicatorSquare, s ? styles.indicatorGreen : styles.indicatorRed]} />
                    )}
                  </View>
                ))}
                <Text style={styles.gridCellDone}>{metrics.perTaskDone[i] || 0}</Text>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.pdfButton} onPress={async () => {
          if (!printableRef.current) return;
          try {
            await saveViewAsPdf({
              ref: printableRef,
              filename: defaultPdfFilename('history-week'),
              pageSize: 'A4',
              marginMm: 12,
              scalePercent: 0.8,
              logoModule: null,
              openAfterSave: true,
            });
            // PDF opened or share sheet shown immediately; no success alert needed
          } catch (e: any) {
            Alert.alert('PDF Error', e?.message || 'Failed to generate PDF');
          }
        }}>
          <View style={styles.pdfButtonInner}> 
            <Image source={require('../../assets/images/dl.png')} style={styles.pdfIcon} />
            <Text style={styles.pdfLabel}>Save as PDF</Text>
            <Image source={require('../../assets/images/PDF.png')} style={styles.pdfIcon} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', width: '100%', height: '100%' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },
  topRow: {
    paddingHorizontal: 0,
    paddingTop: 24,
  },
  backTextLink: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
    alignSelf: "flex-start",
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
    fontSize: 18,
    fontWeight: '700',
    color: '#2A3B4D',
    marginBottom: 8,
    alignSelf: 'center',
  },
  trackerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitleLeft: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A3B4D',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtleText: {
    color: '#2A3B4D',
    fontSize: 14,
  },
  boldText: {
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  weekRangeText: {
    color: '#2A3B4D',
    fontSize: 13,
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
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#2A3B4D',
    fontWeight: '700',
    fontSize: 20,
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
  },
  gridCellTask: {
    flex: 2,
    color: '#2A3B4D',
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
    gap: 12,
    alignItems: 'center',
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
  legendGray: { backgroundColor: '#E0E0E0' }, // Not scheduled (no legend entry)
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
});
