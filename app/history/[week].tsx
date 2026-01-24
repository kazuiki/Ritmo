import { Fredoka_600SemiBold, useFonts } from '@expo-google-fonts/fredoka';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { getRoutinesForCurrentUser, getUserFirstProgressDatesByRoutine, getUserProgressForRange, type Routine, type RoutineProgress } from '../../src/routinesService';
import { supabase } from '../../src/supabaseClient';
import { saveWeeklyPerformanceReportPdf } from '../../src/utils/pdf';
import { createResponsiveStyles, useResponsiveDimensions } from '../../src/utils/responsive';

const RITMO_HEADER = require("../../assets/ritmo-header.png");

interface RoutineWithDays extends Routine {
	days?: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

export default function WeeklyHistoryDetail() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const router = useRouter();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();
  const printableRef = useRef<View>(null);
  const [childName, setChildName] = useState('Kid');
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold });
  const [routines, setRoutines] = useState<RoutineWithDays[]>([]);
  const [progressData, setProgressData] = useState<RoutineProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [earliestProgressByRoutine, setEarliestProgressByRoutine] = useState<Record<number, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

    // Find the first date a routine existed for this user (created_at or earliest progress row)
    const firstActiveDateByRoutine = new Map<number, Date>();

    // Seed from globally earliest progress dates (not limited to selected week)
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

    const formatDate = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}-${dd}-${yyyy}`;
    };
    
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
      // Set deadline to end of day (11:59:59.999 PM)
      const missedDeadline = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      // If current time is past the end of the day and task isn't completed, it's missed
      if (currentTime > missedDeadline) {
        return false; // Missed (red)
      }
      
      // If we're still within the day, show as pending (orange)
      return null;
    };
    
    // Helper to get Monday of a date (00:00)
    const weekStart = (d: Date) => {
      const x = new Date(d);
      const dow = x.getDay();
      const diff = (dow === 0 ? -6 : 1 - dow);
      x.setDate(x.getDate() + diff);
      x.setHours(0,0,0,0);
      return x;
    };
    const weekEnd = (d: Date) => {
      const ws = weekStart(d);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      we.setHours(23,59,59,999);
      return we;
    };

    const viewingWeekStart = weekStart(weekRange.startDate);
    const viewingWeekEnd = weekEnd(weekRange.startDate);

    // Filter: show only routines active by this week, and if deleted, only through the deletion week
    const filteredRoutines = routines.filter(routine => {
      // First active date (min of created_at and earliest progress)
      let firstActive: Date | null = null;
      if (routine.created_at) {
        const [cy, cm, cd] = routine.created_at.slice(0,10).split('-').map(Number);
        const createdAt = new Date(cy, cm - 1, cd);
        createdAt.setHours(0,0,0,0);
        firstActive = createdAt;
      }
      const rawEarliest = earliestProgressByRoutine[routine.id];
      if (rawEarliest) {
        const [py, pm, pd] = rawEarliest.split('-').map(Number);
        const earliest = new Date(py, pm - 1, pd);
        earliest.setHours(0,0,0,0);
        if (!firstActive || earliest < firstActive) firstActive = earliest;
      }

      // If unknown firstActive, include only if there is progress in this selected week
      if (!firstActive) {
        const hasProgressThisWeek = progressData.some(
          p => p.routine_id === routine.id && weekDates.dates.includes(p.day_date)
        );
        if (!hasProgressThisWeek) return false;
      } else {
        if (firstActive > viewingWeekEnd) return false; // not yet existed by this week
      }

      // Deletion handling: if inactive, do not show in history at all
      if (routine.is_active === false) return false;

      return true;
    });
    
    const sortedRoutines = [...filteredRoutines].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    return sortedRoutines.map(routine => {
      // For each day of the week, determine the status
      const statuses = weekDates.dates.map((dateStr, index) => {
        const dayOfWeek = weekDates.weekDays[index];
        return getTaskStatus(routine, dateStr, dayOfWeek);
      });
      
      // Format timestamp as "date added / routine time"
      const addedDate = (() => {
        const firstActive = firstActiveDateByRoutine.get(routine.id);
        if (firstActive) return formatDate(firstActive);
        if (routine.created_at) return formatDate(new Date(routine.created_at));
        const raw = earliestProgressByRoutine[routine.id];
        if (raw) return raw.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2-$3-$1'); // YYYY-MM-DD -> MM-DD-YYYY
        return '';
      })();
      const timeStr = routine.time ? routine.time.toLowerCase().replace(/\s+/g, '') : '12:00am';
      const timestamp = `${addedDate}/${timeStr}`;

      const nameWithDeletedFlag = (() => {
        const base = (routine.name || '').toUpperCase();
        return base;
      })();
      
      return {
        name: nameWithDeletedFlag,
        timestamp,
        statuses,
        routineId: routine.id,
        days: routine.days || [0,1,2,3,4,5,6]
      };
    });
  }, [routines, progressData, weekDates, weekRange.endDate, currentTime, earliestProgressByRoutine]);

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

  // Load routines, earliest dates, and progress data for the selected week
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch routines, earliest progress dates, and week progress
        const [routinesData, firstDatesMap, progressForWeek] = await Promise.all([
          getRoutinesForCurrentUser({ includeInactive: true }),
          getUserFirstProgressDatesByRoutine(),
          getUserProgressForRange({
            from: weekRange.startDate,
            to: weekRange.endDate,
          }),
        ]);
        
        // Load days info from AsyncStorage (user-specific)
        const storageKey = `@routines_${user.id}`;
        const stored = await AsyncStorage.getItem(storageKey);
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
        setEarliestProgressByRoutine(firstDatesMap || {});
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

  // Ultra-smooth slide animation with performance optimization
  const slideX = useMemo(() => new Animated.Value(400), []);
  
  useEffect(() => {
    setIsAnimating(true);
    // Fast, responsive slide-in animation
    Animated.timing(slideX, {
      toValue: 0,
      duration: 250, // Faster for immediate response
      easing: Easing.out(Easing.ease), // Simpler easing
      useNativeDriver: true,
      isInteraction: false,
    }).start(() => {
      setIsAnimating(false);
    });
  }, []);
  
  const handleBack = () => {
    if (isAnimating) return; // Prevent animation conflicts
    
    setIsAnimating(true);
    Animated.timing(slideX, {
      toValue: 400,
      duration: 200, // Very fast exit
      easing: Easing.in(Easing.ease), // Simple easing
      useNativeDriver: true,
      isInteraction: false,
    }).start(() => {
      setIsAnimating(false);
      if (router.canGoBack()) {
        router.back();
      }
    });
  };

  return (
    <View style={styles.outerContainer}>
      <Animated.View 
        style={[styles.container, { 
          transform: [{ translateX: slideX }] 
        }]}
        renderToHardwareTextureAndroid={true} // Hardware acceleration
        shouldRasterizeIOS={true} // iOS rasterization
      >
      {/* Background Image */}
      <Image
        source={require('../../assets/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
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
            <Text style={styles.cardTitle}>Ritmo Tracker</Text>
            
            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendGreen]} /><Text style={styles.legendText}>Done</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendRed]} /><Text style={styles.legendText}>Missed</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendOrange]} /><Text style={styles.legendText}>Pending</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, styles.legendGray]} /><Text style={styles.legendText}>Unassigned</Text></View>
            </View>

            {/* Grid Header */}
            <View style={[styles.gridRow, styles.gridHeader]}>
              <Text style={[styles.gridCellTask, styles.gridHeaderText]}>Task</Text>
              {['M','T','W','Th','F','St','S'].map(d => <Text key={d} style={[styles.gridCellDay, styles.gridHeaderText]}>{d}</Text>)}
              <Text style={[styles.gridCellDone, styles.gridHeaderText]}>Done</Text>
            </View>

            {/* Rows */}
            {tasks.map((t,i) => (
              <View key={t.routineId} style={styles.gridRow}>
                <View style={styles.gridCellTask}>
                  <Text style={styles.taskNameText}>{t.name}</Text>
                  <Text style={styles.taskTimestampText}>{t.timestamp}</Text>
                </View>
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
              weekStart: weekRange.startDate,
              weekEnd: weekRange.endDate,
              totalTasks: metrics.totalTasks,
              completedTasks: metrics.completed,
              completionRate: metrics.rate,
              tasks: tasks.map((task, idx) => ({
                name: task.name,
                timestamp: task.timestamp,
                statuses: task.statuses,
                routineId: task.routineId,
                perTaskDone: metrics.perTaskDone[idx] || 0,
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
            <Image source={require('../../assets/images/dl.png')} style={styles.pdfIcon} />
            <Text style={styles.pdfLabel}>Save as PDF</Text>
            <Image source={require('../../assets/images/PDF.png')} style={styles.pdfIcon} />
          </View>
        </TouchableOpacity>
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: scale.scaleSpacing(16), paddingBottom: scale.scaleSpacing(40), paddingTop: scale.scaleSpacing(16) },
  topRow: {
    paddingHorizontal: 0,
    paddingTop: scale.scaleSpacing(24),
  },
  backTextLink: {
    color: "#1F2937",
    fontSize: scale.scaleFont(20),
    fontWeight: "600",
    textDecorationLine: "underline",
    alignSelf: "flex-start",
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
    fontSize: scale.scaleFont(18),
    fontWeight: '700',
    color: '#2A3B4D',
    marginBottom: scale.scaleSpacing(8),
    alignSelf: 'center',
  },
  trackerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale.scaleSpacing(8),
  },
  cardTitleLeft: {
    fontSize: scale.scaleFont(18),
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
    fontSize: scale.scaleFont(14),
  },
  boldText: {
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale.scaleSpacing(8),
  },
  weekRangeText: {
    color: '#2A3B4D',
    fontSize: scale.scaleFont(13),
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
    fontSize: scale.scaleFont(12),
    marginBottom: scale.scaleSpacing(4),
  },
  metricValue: {
    color: '#2A3B4D',
    fontWeight: '700',
    fontSize: scale.scaleFont(20),
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
  },
  gridCellTask: {
    flex: 2.5,
    paddingRight: scale.scaleSpacing(1),
  },
  taskNameText: {
    color: '#2A3B4D',
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: scale.scaleFont(15),
    lineHeight: scale.scaleHeight(16),
    flexWrap: 'wrap',
  },
  taskTimestampText: {
    color: '#6B8E7E',
    fontSize: scale.scaleFont(12),
    lineHeight: scale.scaleHeight(12),
    marginTop: scale.scaleSpacing(2),
    flexWrap: 'wrap',
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
  indicatorGray: { backgroundColor: '#E0E0E0', borderColor: '#CCCCCC' },
  indicatorOrange: { backgroundColor: '#FFA500', borderColor: '#E69500' },
  indicatorDarkGray: { backgroundColor: '#555555', borderColor: '#444444' },
  emptyIndicator: {
    width: scale.scaleWidth(16),
    height: scale.scaleHeight(16),
  },
  legendRow: {
    flexDirection: 'row',
    gap: scale.scaleSpacing(12),
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: scale.scaleSpacing(2),
    marginBottom: scale.scaleSpacing(12),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale.scaleSpacing(6),
  },
  legendDot: {
    width: scale.scaleWidth(10),
    height: scale.scaleHeight(10),
    borderRadius: scale.scaleBorderRadius(5),
  },
  legendGreen: { backgroundColor: '#1EBE69' },
  legendRed: { backgroundColor: '#F56A6A' },
  legendGray: { backgroundColor: '#E0E0E0' },
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