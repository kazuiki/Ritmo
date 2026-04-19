import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from "@expo-google-fonts/fredoka";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatClockTime, formatDuration, getRoutineExecutionLogsForRange, type RoutineExecutionLog, type RoutineExecutionStatus } from "../src/routineExecutionService";
import { getRoutinesForCurrentUser, getUserFirstProgressDatesByRoutine, getUserProgressForRange, type Routine, type RoutineProgress } from "../src/routinesService";
import { supabase } from "../src/supabaseClient";
import { createResponsiveStyles, useResponsiveDimensions } from "../src/utils/responsive";

const backgroundImage = require("../assets/background.png");
const calendarIcon = require("../assets/images/Calendar.png");
const LAST_USER_ID_KEY = "@ritmo_last_user_id";

interface RoutineWithDays extends Routine {
  days?: number[];
}

interface WeeklySummaryCard {
  start: Date;
  end: Date;
  rangeText: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface DetailedLogEntry {
  id: string;
  date: string;
  routineId: number;
  routineName: string;
  routineTime: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
  status: RoutineExecutionStatus;
  source: string;
}

type ViewMode = "weekly" | "detailed";
type FilterModal = "date" | "routine" | "day" | null;

type DraftFilters = {
  from: string;
  to: string;
  routineName: string;
  dayFilter: string;
};

const DAY_OPTIONS = [
  { label: "All Days", value: "all" },
  { label: "Monday - Friday", value: "mon-fri" },
  { label: "Weekend", value: "weekend" },
  { label: "Monday", value: "mon" },
  { label: "Tuesday", value: "tue" },
  { label: "Wednesday", value: "wed" },
  { label: "Thursday", value: "thu" },
  { label: "Friday", value: "fri" },
  { label: "Saturday", value: "sat" },
  { label: "Sunday", value: "sun" },
];

const DAY_INDEX_TO_VALUE = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatDisplayDate(dateValue: Date): string {
  return dateValue.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(dateValue: Date): string {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getWeekStart(dateValue: Date): Date {
  const current = new Date(dateValue);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diffToMonday);
  current.setHours(0, 0, 0, 0);
  return current;
}

function getWeekEnd(dateValue: Date): Date {
  const start = getWeekStart(dateValue);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const finalDate = new Date(endDate);
  finalDate.setHours(0, 0, 0, 0);

  while (cursor <= finalDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function isDayIncluded(dayFilter: string, dayIndex: number): boolean {
  if (dayFilter === "all") return true;
  if (dayFilter === "mon-fri") return dayIndex >= 1 && dayIndex <= 5;
  if (dayFilter === "weekend") return dayIndex === 0 || dayIndex === 6;
  return DAY_INDEX_TO_VALUE[dayIndex] === dayFilter;
}

function isBeforeDay(dateValue: Date, comparison: Date): boolean {
  const left = new Date(dateValue);
  const right = new Date(comparison);
  left.setHours(0, 0, 0, 0);
  right.setHours(0, 0, 0, 0);
  return left < right;
}

function timeToMinutes(timeString?: string): number {
  if (!timeString) return Number.POSITIVE_INFINITY;
  const [timePart, periodPart] = timeString.toLowerCase().split(" ");
  if (!timePart || !periodPart) return Number.POSITIVE_INFINITY;
  const [hoursRaw, minutesRaw] = timePart.split(":");
  let hours = Number(hoursRaw);
  const minutes = Number(minutesRaw || 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY;
  if (periodPart === "pm" && hours !== 12) hours += 12;
  if (periodPart === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatWeekRange(start: Date, end: Date): string {
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const start = getWeekStart(today);
  const end = getWeekEnd(today);
  return { start, end };
}

function getMonthStart(dateValue: Date): Date {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), 1);
}

function shiftMonth(dateValue: Date, offset: number): Date {
  return new Date(dateValue.getFullYear(), dateValue.getMonth() + offset, 1);
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isDateInInclusiveRange(dateValue: Date, startDate: Date, endDate: Date): boolean {
  const value = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()).getTime();
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
  return value >= start && value <= end;
}

function getCalendarWeeks(monthDate: Date): Array<Array<Date | null>> {
  const firstOfMonth = getMonthStart(monthDate);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  const slots: Array<Date | null> = [];
  for (let i = 0; i < startDay; i += 1) {
    slots.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    slots.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }

  while (slots.length % 7 !== 0) {
    slots.push(null);
  }

  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < slots.length; i += 7) {
    weeks.push(slots.slice(i, i + 7));
  }

  return weeks;
}

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveDimensions();
  const { scaleFont, scaleSpacing, scaleBorderRadius, scaleWidth, scaleHeight } = responsive;
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [childName, setChildName] = useState<string>("");
  const [showSort, setShowSort] = useState(false);
  const [renderButtons, setRenderButtons] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [ascAnim] = useState(new Animated.Value(0));
  const [descAnim] = useState(new Animated.Value(0));
  const [isAnimating, setIsAnimating] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const [routines, setRoutines] = useState<RoutineWithDays[]>([]);
  const [progressData, setProgressData] = useState<RoutineProgress[]>([]);
  const [executionLogs, setExecutionLogs] = useState<RoutineExecutionLog[]>([]);
  const [firstProgressByRoutine, setFirstProgressByRoutine] = useState<Record<number, string>>({});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<DetailedLogEntry | null>(null);

  const [draftFilters, setDraftFilters] = useState<DraftFilters>(() => {
    const currentWeek = getCurrentWeekRange();
    return {
      from: toDateInputValue(currentWeek.start),
      to: toDateInputValue(currentWeek.end),
      routineName: "All Routines",
      dayFilter: "all",
    };
  });
  const [appliedFilters, setAppliedFilters] = useState<DraftFilters>(draftFilters);
  const [filterModal, setFilterModal] = useState<FilterModal>(null);
  const [activeDateField, setActiveDateField] = useState<"from" | "to">("from");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => getMonthStart(new Date()));

  useEffect(() => {
    if (showSort) {
      setRenderButtons(true);
      ascAnim.setValue(0);
      descAnim.setValue(0);

      Animated.sequence([
        Animated.timing(ascAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(descAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (renderButtons) {
      ascAnim.setValue(1);
      descAnim.setValue(1);

      Animated.sequence([
        Animated.timing(descAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(ascAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRenderButtons(false);
      });
    }
  }, [showSort]);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const meta = (user.user_metadata ?? {}) as { child_name?: string };
          setChildName(meta?.child_name ?? "");
        }
      } catch (error) {
        console.error("Failed to load child name:", error);
      }
    };

    load();
  }, []);

  const weeks = useMemo(() => {
    if (!userCreatedAt) return [];

    const result: { start: Date; end: Date }[] = [];
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const currentMonday = new Date(current);
    currentMonday.setDate(current.getDate() + diffToMonday);

    const createdDate = new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), userCreatedAt.getDate());
    const createdDay = createdDate.getDay();
    const diffToCreatedMonday = createdDay === 0 ? -6 : 1 - createdDay;
    const firstMonday = new Date(createdDate);
    firstMonday.setDate(createdDate.getDate() + diffToCreatedMonday);

    let weekMonday = new Date(firstMonday);
    while (weekMonday <= currentMonday) {
      const start = new Date(weekMonday);
      const end = new Date(weekMonday);
      end.setDate(weekMonday.getDate() + 6);
      result.push({ start, end });
      weekMonday.setDate(weekMonday.getDate() + 7);
    }

    return result;
  }, [userCreatedAt]);

  const sortedWeeks = useMemo(() => {
    const copy = [...weeks];
    copy.sort((a, b) => (sortOrder === "asc" ? a.start.getTime() - b.start.getTime() : b.start.getTime() - a.start.getTime()));
    return copy;
  }, [weeks, sortOrder]);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  };

  const onPickSort = (order: "asc" | "desc") => {
    setSortOrder(order);
    setShowSort(false);
  };

  const detailedEntries = useMemo(() => {
    if (routines.length === 0) return [];

    const fromDate = parseDateInput(appliedFilters.from);
    const toDate = parseDateInput(appliedFilters.to);
    if (!fromDate || !toDate || fromDate > toDate) return [];

    const firstActiveDateByRoutine = new Map<number, Date>();

    Object.entries(firstProgressByRoutine).forEach(([routineId, dateString]) => {
      const id = Number(routineId);
      if (!id || !dateString) return;
      const parsed = parseDateInput(dateString);
      if (!parsed) return;
      const existing = firstActiveDateByRoutine.get(id);
      if (!existing || parsed < existing) firstActiveDateByRoutine.set(id, parsed);
    });

    progressData.forEach((progress) => {
      const parsed = parseDateInput(progress.day_date);
      if (!parsed) return;
      const existing = firstActiveDateByRoutine.get(progress.routine_id);
      if (!existing || parsed < existing) firstActiveDateByRoutine.set(progress.routine_id, parsed);
    });

    routines.forEach((routine) => {
      if (!routine.created_at) return;
      const parsed = new Date(routine.created_at);
      parsed.setHours(0, 0, 0, 0);
      const existing = firstActiveDateByRoutine.get(routine.id);
      if (!existing || parsed < existing) firstActiveDateByRoutine.set(routine.id, parsed);
    });

    const progressMap = new Map<string, RoutineProgress>();
    progressData.forEach((row) => {
      progressMap.set(`${row.routine_id}-${row.day_date}`, row);
    });

    const executionMap = new Map<string, RoutineExecutionLog>();
    executionLogs.forEach((log) => {
      const key = `${log.routine_id}-${log.day_date}`;
      const existing = executionMap.get(key);
      if (!existing || (log.started_at ?? "") > (existing.started_at ?? "")) {
        executionMap.set(key, log);
      }
    });

    const entries: DetailedLogEntry[] = [];
    const dates = getDateRange(fromDate, toDate);
    const sortedRoutines = [...routines].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    for (const dateValue of dates) {
      const dayIndex = dateValue.getDay();
      if (!isDayIncluded(appliedFilters.dayFilter, dayIndex)) continue;

      const dateString = toDateInputValue(dateValue);
      const isPastDay = dateValue < new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
      const isToday = toDateInputValue(dateValue) === toDateInputValue(currentTime);

      for (const routine of sortedRoutines) {
        if (appliedFilters.routineName !== "All Routines" && routine.name !== appliedFilters.routineName) continue;

        const routineDays = routine.days || [0, 1, 2, 3, 4, 5, 6];
        if (!routineDays.includes(dayIndex)) continue;

        const firstActive = firstActiveDateByRoutine.get(routine.id);
        if (firstActive && isBeforeDay(dateValue, firstActive)) continue;

        const progress = progressMap.get(`${routine.id}-${dateString}`);
        const executionLog = executionMap.get(`${routine.id}-${dateString}`);
        const status: RoutineExecutionStatus = executionLog?.status
          ? executionLog.status
          : progress?.completed
            ? "completed"
            : isPastDay && !isToday
              ? "missed"
              : "pending";

        const startedAt = executionLog?.started_at ?? progress?.completed_at ?? null;
        const finishedAt = executionLog?.finished_at ?? progress?.completed_at ?? null;
        const durationSeconds = executionLog?.duration_seconds ?? (startedAt && finishedAt ? Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000)) : null);

        entries.push({
          id: `${routine.id}-${dateString}`,
          date: dateString,
          routineId: routine.id,
          routineName: routine.name,
          routineTime: routine.time,
          startedAt,
          finishedAt,
          durationSeconds,
          status,
          source: executionLog?.source ?? "direct",
        });
      }
    }

    return entries;
  }, [appliedFilters.dayFilter, appliedFilters.from, appliedFilters.routineName, appliedFilters.to, currentTime, executionLogs, firstProgressByRoutine, progressData, routines]);

  const groupedDetailedEntries = useMemo(() => {
    const groups = new Map<string, DetailedLogEntry[]>();
    detailedEntries.forEach((entry) => {
      const list = groups.get(entry.date) ?? [];
      list.push(entry);
      groups.set(entry.date, list);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items,
      }));
  }, [detailedEntries]);

  const routineOptions = useMemo(() => ["All Routines", ...new Set(routines.map((routine) => routine.name).filter(Boolean))], [routines]);

  const fromDateDraft = parseDateInput(draftFilters.from);
  const toDateDraft = parseDateInput(draftFilters.to);
  const calendarWeeks = useMemo(() => getCalendarWeeks(calendarMonth), [calendarMonth]);
  const calendarSlideX = useRef(new Animated.Value(0)).current;
  const calendarIsAnimatingRef = useRef(false);

  const animateCalendarMonthShift = useCallback((offset: number) => {
    if (offset === 0 || calendarIsAnimatingRef.current) return;

    calendarIsAnimatingRef.current = true;
    const exitDirection = offset > 0 ? -1 : 1;
    const exitDistance = 120;

    Animated.timing(calendarSlideX, {
      toValue: exitDirection * exitDistance,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setCalendarMonth((current) => shiftMonth(current, offset));
      calendarSlideX.setValue(-exitDirection * exitDistance);

      Animated.timing(calendarSlideX, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        calendarIsAnimatingRef.current = false;
      });
    });
  }, [calendarSlideX]);

  const calendarPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_evt, gestureState) => (
      Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderMove: (_evt, gestureState) => {
      if (calendarIsAnimatingRef.current) return;
      const limitedDx = Math.max(-90, Math.min(90, gestureState.dx));
      calendarSlideX.setValue(limitedDx);
    },
    onPanResponderRelease: (_evt, gestureState) => {
      if (calendarIsAnimatingRef.current) return;

      const swipeThreshold = 40;
      if (gestureState.dx <= -swipeThreshold) {
        animateCalendarMonthShift(1);
        return;
      }

      if (gestureState.dx >= swipeThreshold) {
        animateCalendarMonthShift(-1);
        return;
      }

      Animated.spring(calendarSlideX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();
    },
    onPanResponderTerminate: () => {
      if (calendarIsAnimatingRef.current) return;
      Animated.spring(calendarSlideX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();
    },
  }), [animateCalendarMonthShift, calendarSlideX]);

  const openDateModal = () => {
    setFilterModal("date");
    setActiveDateField("from");
    setCalendarMonth(getMonthStart(parseDateInput(draftFilters.from) ?? new Date()));
  };
  const openRoutineModal = () => setFilterModal("routine");
  const openDayModal = () => setFilterModal("day");

  const openDatePicker = (field: "from" | "to") => {
    setActiveDateField(field);
    const sourceValue = field === "from" ? draftFilters.from : draftFilters.to;
    setCalendarMonth(getMonthStart(parseDateInput(sourceValue) ?? new Date()));
  };

  const onPickCalendarDate = (selectedDate: Date) => {
    const selectedDateValue = toDateInputValue(selectedDate);

    setDraftFilters((current) => {
      const next = {
        ...current,
        [activeDateField]: selectedDateValue,
      };

      const fromDate = parseDateInput(next.from);
      const toDate = parseDateInput(next.to);

      if (fromDate && toDate && fromDate > toDate) {
        if (activeDateField === "from") {
          next.to = selectedDateValue;
        } else {
          next.from = selectedDateValue;
        }
      }

      return next;
    });

    if (activeDateField === "from") {
      setActiveDateField("to");
    }
  };

  const shiftCalendarMonthBy = (offset: number) => {
    animateCalendarMonthShift(offset);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadData = async () => {
        try {
          setIsLoading(true);
          const { data: sessionData } = await supabase.auth.getSession();
          const resolvedUserId = sessionData?.session?.user?.id || (await AsyncStorage.getItem(LAST_USER_ID_KEY));
          if (!resolvedUserId || cancelled) return;

          if (sessionData?.session?.user?.id) {
            await AsyncStorage.setItem(LAST_USER_ID_KEY, sessionData.session.user.id);
          }

          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;
          if (user?.created_at) {
            setUserCreatedAt(new Date(user.created_at));
          }

          const createdAt = user?.created_at ? new Date(user.created_at) : new Date();
          const firstWeekStart = getWeekStart(createdAt);
          const currentWeekEnd = getWeekEnd(new Date());

          const [routinesData, progressForRange, firstProgressMap, logsForRange] = await Promise.all([
            getRoutinesForCurrentUser({ includeInactive: true }),
            getUserProgressForRange({ from: firstWeekStart, to: currentWeekEnd }),
            getUserFirstProgressDatesByRoutine(),
            getRoutineExecutionLogsForRange({ from: firstWeekStart, to: currentWeekEnd }),
          ]);

          const storageKey = `@routines_${resolvedUserId}`;
          const stored = await AsyncStorage.getItem(storageKey);
          const storedRoutines: Array<{ id: number; days?: number[] }> = stored ? JSON.parse(stored) : [];
          const storedMap = new Map(storedRoutines.map((routine) => [routine.id, routine]));

          const routinesWithDays: RoutineWithDays[] = routinesData.map((routine) => {
            const storedRoutine = storedMap.get(routine.id);
            return {
              ...routine,
              days: storedRoutine?.days || [0, 1, 2, 3, 4, 5, 6],
            };
          });

          if (!cancelled) {
            setRoutines(routinesWithDays);
            setProgressData(progressForRange);
            setFirstProgressByRoutine(firstProgressMap || {});
            setExecutionLogs(logsForRange);
          }
        } catch (error) {
          console.error("Failed to load history data:", error);
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      loadData();
      const timer = setInterval(() => setCurrentTime(new Date()), 60000);

      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [])
  );

  useEffect(() => {
    const currentWeek = getCurrentWeekRange();
    setDraftFilters((current) => ({
      ...current,
      from: current.from || toDateInputValue(currentWeek.start),
      to: current.to || toDateInputValue(currentWeek.end),
    }));
    setAppliedFilters((current) => ({
      ...current,
      from: current.from || toDateInputValue(currentWeek.start),
      to: current.to || toDateInputValue(currentWeek.end),
    }));
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const weeklyContent = (
    <View style={styles.weeklyWrap}>
      <View style={styles.dropdownOverlay}>
        <View style={styles.sortControl}>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSort((s) => !s)}>
            <Text style={styles.sortLabel}>Sort</Text>
            <Image source={require("../assets/images/sort.png")} style={styles.sortIcon} />
          </TouchableOpacity>
          {renderButtons && (
            <View style={styles.dropdownMenu}>
              <Animated.View style={{ opacity: ascAnim, transform: [{ translateY: ascAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => onPickSort("asc")}>
                  <Text style={styles.dropdownOptionLabel}>Asc</Text>
                  <Image source={require("../assets/images/asc.png")} style={styles.dropdownOptionIcon} />
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={{ opacity: descAnim, transform: [{ translateY: descAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => onPickSort("desc")}>
                  <Text style={styles.dropdownOptionLabel}>Desc</Text>
                  <Image source={require("../assets/images/desc.png")} style={styles.dropdownOptionIcon} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {sortedWeeks.map((week, index) => {
          const year = week.start.getFullYear();
          const month = String(week.start.getMonth() + 1).padStart(2, "0");
          const day = String(week.start.getDate()).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;

          return (
            <TouchableOpacity
              key={`${dateStr}-${index}`}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: "/history/[week]", params: { week: dateStr, start: dateStr } })}
              style={styles.card}
            >
              <View style={styles.cardLine}>
                <Text style={styles.cardLabelInline}>For:</Text>
                <Text
                  style={styles.cardValueInline}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  allowFontScaling={false}
                >
                  {childName || "—"}
                </Text>
              </View>
              <View style={styles.cardLine}>
                <Text style={styles.cardLabelInline}>Week of:</Text>
                <Text
                  style={styles.cardValueInline}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.74}
                  allowFontScaling={false}
                >
                  {`${formatDate(week.start)} - ${formatDate(week.end)}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const detailedContent = (
    <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.filterCard}>
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Date Range</Text>
          <TouchableOpacity style={styles.filterRow} onPress={openDateModal}>
            <View style={styles.filterValueWrap}>
              <View style={styles.filterValueWithIcon}>
                <Image source={calendarIcon} style={styles.filterDateIcon} />
                <Text style={styles.filterValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                  {`${formatDisplayDate(parseDateInput(draftFilters.from) ?? new Date())} - ${formatDisplayDate(parseDateInput(draftFilters.to) ?? new Date())}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Routine Type</Text>
          <TouchableOpacity style={styles.filterRow} onPress={openRoutineModal}>
            <View style={styles.filterValueWrap}>
              <Text style={styles.filterValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {draftFilters.routineName}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Day Filter</Text>
          <TouchableOpacity style={styles.filterRow} onPress={openDayModal}>
            <View style={styles.filterValueWrap}>
              <Text style={styles.filterValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {DAY_OPTIONS.find((option) => option.value === draftFilters.dayFilter)?.label || "All Days"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>

      {groupedDetailedEntries.length === 0 && !isLoading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No logs found.</Text>
          <Text style={styles.emptySubtitle}>Try adjusting the date range or filters.</Text>
        </View>
      ) : (
        groupedDetailedEntries.map((group) => (
          <View key={group.date} style={styles.groupBlock}>
            <Text style={styles.groupTitle}>{formatDisplayDate(new Date(group.date))}</Text>
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.logCard}
                activeOpacity={0.92}
                onPress={() => setSelectedLog(item)}
              >
                <View style={styles.logCardLeft}>
                  <Text style={styles.logTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>
                    {item.routineName}
                  </Text>
                  <Text style={styles.logSubText} numberOfLines={1}>
                    Time | {item.routineTime}
                  </Text>
                </View>
                <View style={styles.logCardRight}>
                  <Text style={styles.logMetaText}>Duration: {formatDuration(item.durationSeconds)}</Text>
                  <Text style={styles.logStatusText}>
                    Status: <Text style={styles.logStatusStrong}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover" />

      <View style={[styles.header, { paddingTop: insets.top + scaleSpacing(8) }]}> 
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backTextLink}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>History</Text>
      </View>

      <View style={styles.toggleWrap}>
        <View style={styles.toggleCard}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "weekly" && styles.toggleButtonActive]}
            onPress={() => setViewMode("weekly")}
          >
            <Text style={[styles.toggleText, viewMode === "weekly" && styles.toggleTextActive]}>Weekly View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "detailed" && styles.toggleButtonActive]}
            onPress={() => setViewMode("detailed")}
          >
            <Text style={[styles.toggleText, viewMode === "detailed" && styles.toggleTextActive]}>Detailed View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === "weekly" ? weeklyContent : detailedContent}

      <Modal
        animationType="fade"
        transparent={true}
        visible={filterModal === "date"}
        onRequestClose={() => setFilterModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <View style={styles.quickRangeRow}>
              {[
                { label: "This Week", value: "this-week" },
                { label: "Last 7 Days", value: "last-7" },
                { label: "Last 30 Days", value: "last-30" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.quickRangeButton}
                  onPress={() => {
                    const today = new Date();
                    if (option.value === "this-week") {
                      const week = getCurrentWeekRange();
                      setDraftFilters((current) => ({ ...current, from: toDateInputValue(week.start), to: toDateInputValue(week.end) }));
                    } else if (option.value === "last-7") {
                      const end = new Date(today);
                      const start = new Date(today);
                      start.setDate(today.getDate() - 6);
                      setDraftFilters((current) => ({ ...current, from: toDateInputValue(start), to: toDateInputValue(end) }));
                    } else if (option.value === "last-30") {
                      const end = new Date(today);
                      const start = new Date(today);
                      start.setDate(today.getDate() - 29);
                      setDraftFilters((current) => ({ ...current, from: toDateInputValue(start), to: toDateInputValue(end) }));
                    }
                  }}
                >
                  <Text style={styles.quickRangeButtonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.calendarWrap}>
              <View style={styles.calendarHeaderRow}>
                <TouchableOpacity onPress={() => shiftCalendarMonthBy(-1)} style={styles.calendarNavButton}>
                  <Text style={styles.calendarNavText}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>
                  {calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </Text>
                <TouchableOpacity onPress={() => shiftCalendarMonthBy(1)} style={styles.calendarNavButton}>
                  <Text style={styles.calendarNavText}>Next</Text>
                </TouchableOpacity>
              </View>

              <Animated.View
                style={[styles.calendarSlideArea, { transform: [{ translateX: calendarSlideX }] }]}
                {...calendarPanResponder.panHandlers}
              >
                <View style={styles.calendarWeekRow}>
                  {["S", "M", "Tu", "W", "Th", "Fri", "Sa"].map((label) => (
                    <Text key={label} style={styles.calendarWeekLabel}>{label}</Text>
                  ))}
                </View>

                {calendarWeeks.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                    {week.map((dayValue, dayIndex) => {
                      if (!dayValue) {
                        return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.calendarCellEmpty} />;
                      }

                      const isStart = fromDateDraft ? isSameCalendarDay(dayValue, fromDateDraft) : false;
                      const isEnd = toDateDraft ? isSameCalendarDay(dayValue, toDateDraft) : false;
                      const isInRange = fromDateDraft && toDateDraft ? isDateInInclusiveRange(dayValue, fromDateDraft, toDateDraft) : false;

                      return (
                        <TouchableOpacity
                          key={toDateInputValue(dayValue)}
                          style={[
                            styles.calendarCell,
                            isInRange && styles.calendarCellInRange,
                            (isStart || isEnd) && styles.calendarCellSelected,
                          ]}
                          onPress={() => onPickCalendarDate(dayValue)}
                        >
                          <Text style={[
                            styles.calendarCellText,
                            isInRange && styles.calendarCellTextInRange,
                            (isStart || isEnd) && styles.calendarCellTextSelected,
                          ]}>
                            {dayValue.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </Animated.View>
            </View>

            <View style={styles.selectedRangePill}>
              <Text style={styles.selectedRangeText}>
                {`${formatDisplayDate(parseDateInput(draftFilters.from) ?? new Date())} - ${formatDisplayDate(parseDateInput(draftFilters.to) ?? new Date())}`}
              </Text>
            </View>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setFilterModal(null)}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setFilterModal(null)}>
                <Text style={styles.modalPrimaryButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={filterModal === "routine"}
        onRequestClose={() => setFilterModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Routine Type</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {routineOptions.map((routineName) => (
                <TouchableOpacity
                  key={routineName}
                  style={[styles.modalListItem, draftFilters.routineName === routineName && styles.modalListItemActive]}
                  onPress={() => {
                    setDraftFilters((current) => ({ ...current, routineName }));
                    setFilterModal(null);
                  }}
                >
                  <Text style={[styles.modalListItemText, draftFilters.routineName === routineName && styles.modalListItemTextActive]}>{routineName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={filterModal === "day"}
        onRequestClose={() => setFilterModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Day Filter</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {DAY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.dayListItem, draftFilters.dayFilter === option.value && styles.dayListItemActive]}
                  onPress={() => {
                    setDraftFilters((current) => ({ ...current, dayFilter: option.value }));
                    setFilterModal(null);
                  }}
                >
                  <Text style={[styles.dayListItemText, draftFilters.dayFilter === option.value && styles.dayListItemTextActive]}>{option.label}</Text>
                  {draftFilters.dayFilter === option.value ? (
                    <Text style={styles.dayListCheck}>✓</Text>
                  ) : (
                    <View style={styles.dayListTrailingSpace} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedLog !== null}
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalCard}>
            <Text style={styles.modalTitle}>Routine Log</Text>
            {selectedLog && (
              <View style={styles.detailList}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDisplayDate(new Date(selectedLog.date))}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Time Started</Text><Text style={styles.detailValue}>{formatClockTime(selectedLog.startedAt)}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Time Finished</Text><Text style={styles.detailValue}>{formatClockTime(selectedLog.finishedAt)}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Duration</Text><Text style={styles.detailValue}>{formatDuration(selectedLog.durationSeconds)}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>{selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1)}</Text></View>
              </View>
            )}
            <TouchableOpacity style={styles.detailCloseButton} onPress={() => setSelectedLog(null)}>
              <Text style={styles.detailCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!fontsLoaded && <View />}
    </View>
  );
}

const styles = createResponsiveStyles((scale) => StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  header: {
    paddingHorizontal: scale.scaleSpacing(16),
  },
  backTextLink: {
    color: "#1F2937",
    fontSize: scale.scaleFont(20),
    fontWeight: "600",
    textDecorationLine: "underline",
    alignSelf: "flex-start",
  },
  titleRow: {
    paddingHorizontal: scale.scaleSpacing(16),
    paddingTop: scale.scaleSpacing(6),
    marginBottom: scale.scaleSpacing(6),
  },
  title: {
    fontSize: scale.scaleFont(32),
    fontWeight: "700",
    color: "#2A3B4D",
    fontFamily: "Fredoka_700Bold",
  },
  toggleWrap: {
    paddingHorizontal: scale.scaleSpacing(16),
    marginBottom: scale.scaleSpacing(10),
  },
  toggleCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(14),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.12,
    shadowRadius: scale.scaleSpacing(6),
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: scale.scaleSpacing(10),
    borderRadius: scale.scaleBorderRadius(10),
    alignItems: "center",
    backgroundColor: "transparent",
  },
  toggleButtonActive: {
    backgroundColor: "#2F9E93",
  },
  toggleText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_500Medium",
  },
  toggleTextActive: {
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  listContainer: {
    paddingHorizontal: scale.scaleSpacing(16),
    paddingBottom: scale.scaleSpacing(28),
    gap: scale.scaleSpacing(10),
  },
  weeklyWrap: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(16),
    paddingVertical: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(14),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(2) },
    shadowOpacity: 0.15,
    shadowRadius: scale.scaleSpacing(6),
    elevation: 4,
  },
  cardLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale.scaleSpacing(6),
    flexWrap: "nowrap",
    width: "100%",
    marginBottom: scale.scaleSpacing(4),
  },
  cardLabelInline: {
    fontSize: scale.scaleFont(14),
    color: "#2A3B4D",
    fontWeight: "700",
    flexShrink: 0,
  },
  cardValueInline: {
    fontSize: scale.scaleFont(14),
    color: "#2A3B4D",
    flex: 1,
    minWidth: 0,
  },
  dropdownOverlay: {
    paddingHorizontal: scale.scaleSpacing(16),
    alignItems: "flex-end",
  },
  sortControl: {
    position: "relative",
    alignItems: "flex-end",
    marginBottom: scale.scaleSpacing(10),
  },
  dropdownMenu: {
    position: "absolute",
    top: scale.scaleHeight(32),
    right: 0,
    gap: scale.scaleSpacing(8),
    zIndex: 20,
  },
  sortButton: {
    width: scale.scaleWidth(100),
    height: scale.scaleHeight(28),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: scale.scaleBorderRadius(5),
    paddingVertical: scale.scaleSpacing(1),
    paddingHorizontal: scale.scaleSpacing(12),
    gap: scale.scaleSpacing(6),
  },
  sortLabel: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#1F2937",
  },
  sortIcon: {
    width: scale.scaleWidth(16),
    height: scale.scaleHeight(16),
    resizeMode: "contain",
  },
  dropdownOption: {
    width: scale.scaleWidth(100),
    height: scale.scaleHeight(28),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: scale.scaleBorderRadius(5),
    paddingVertical: scale.scaleSpacing(1),
    paddingHorizontal: scale.scaleSpacing(12),
    gap: scale.scaleSpacing(6),
  },
  dropdownOptionLabel: {
    fontSize: scale.scaleFont(16),
    fontWeight: "700",
    color: "#1F2937",
  },
  dropdownOptionIcon: {
    width: scale.scaleWidth(16),
    height: scale.scaleHeight(16),
    resizeMode: "contain",
  },
  weekCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(16),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.12,
    shadowRadius: scale.scaleSpacing(6),
    elevation: 3,
  },
  weekCardTitle: {
    fontSize: scale.scaleFont(18),
    fontWeight: "700",
    color: "#2A3B4D",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(10),
    fontFamily: "Fredoka_700Bold",
  },
  weekMetricsRow: {
    flexDirection: "row",
    gap: scale.scaleSpacing(8),
  },
  weekMetricCard: {
    flex: 1,
    backgroundColor: "#F3FFFB",
    borderRadius: scale.scaleBorderRadius(12),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    paddingVertical: scale.scaleSpacing(10),
    paddingHorizontal: scale.scaleSpacing(6),
    alignItems: "center",
  },
  weekMetricLabel: {
    fontSize: scale.scaleFont(12),
    color: "#2A3B4D",
    textAlign: "center",
    fontFamily: "Fredoka_500Medium",
  },
  weekMetricValue: {
    fontSize: scale.scaleFont(22),
    color: "#2A3B4D",
    fontFamily: "Fredoka_700Bold",
    marginTop: scale.scaleSpacing(4),
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(16),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.12,
    shadowRadius: scale.scaleSpacing(6),
    elevation: 3,
    gap: scale.scaleSpacing(8),
  },
  filterSection: {
    gap: scale.scaleSpacing(6),
  },
  filterRow: {
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(10),
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(7),
    backgroundColor: "#FBFFFE",
  },
  filterLabel: {
    fontSize: scale.scaleFont(12),
    color: "#6B8E7E",
    fontFamily: "Fredoka_500Medium",
    marginBottom: scale.scaleSpacing(4),
  },
  filterValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale.scaleSpacing(8),
  },
  filterValue: {
    flex: 1,
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
  },
  filterValueWithIcon: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: scale.scaleSpacing(8),
    minWidth: 0,
  },
  filterDateIcon: {
    width: scale.scaleWidth(16),
    height: scale.scaleWidth(16),
    resizeMode: "contain",
    tintColor: "#56B8A8",
  },
  applyButton: {
    backgroundColor: "#2F9E93",
    borderRadius: scale.scaleBorderRadius(12),
    paddingVertical: scale.scaleSpacing(9),
    alignItems: "center",
    marginTop: scale.scaleSpacing(2),
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(15),
    fontFamily: "Fredoka_500Medium",
  },
  groupBlock: {
    gap: scale.scaleSpacing(8),
  },
  groupTitle: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_600SemiBold",
    paddingTop: scale.scaleSpacing(2),
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(14),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    paddingHorizontal: scale.scaleSpacing(14),
    paddingVertical: scale.scaleSpacing(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.1,
    shadowRadius: scale.scaleSpacing(6),
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale.scaleSpacing(10),
  },
  logCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  logTitle: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_500Medium",
  },
  logSubText: {
    color: "#6B8E7E",
    fontSize: scale.scaleFont(13),
    fontFamily: "Fredoka_400Regular",
    marginTop: scale.scaleSpacing(2),
  },
  logCardRight: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  logMetaText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(13),
    fontFamily: "Fredoka_500Medium",
  },
  logStatusText: {
    color: "#6B8E7E",
    fontSize: scale.scaleFont(13),
    fontFamily: "Fredoka_400Regular",
    marginTop: scale.scaleSpacing(2),
  },
  logStatusStrong: {
    color: "#2A3B4D",
    fontFamily: "Fredoka_600SemiBold",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(16),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(18),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(4) },
    shadowOpacity: 0.1,
    shadowRadius: scale.scaleSpacing(6),
    elevation: 3,
  },
  emptyTitle: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_500Medium",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#6B8E7E",
    fontSize: scale.scaleFont(12),
    fontFamily: "Fredoka_400Regular",
    textAlign: "center",
    marginTop: scale.scaleSpacing(4),
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 43, 58, 0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale.scaleSpacing(16),
  },
  modalCard: {
    width: "100%",
    maxWidth: scale.scaleWidth(420),
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(18),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(6) },
    shadowOpacity: 0.15,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 5,
  },
  detailModalCard: {
    width: "100%",
    maxWidth: scale.scaleWidth(420),
    backgroundColor: "#FFFFFF",
    borderRadius: scale.scaleBorderRadius(18),
    borderWidth: 2,
    borderColor: "#CFF6EB",
    padding: scale.scaleSpacing(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale.scaleHeight(6) },
    shadowOpacity: 0.15,
    shadowRadius: scale.scaleSpacing(8),
    elevation: 5,
  },
  modalTitle: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(19),
    fontFamily: "Fredoka_600SemiBold",
    textAlign: "center",
    marginBottom: scale.scaleSpacing(12),
  },
  quickRangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale.scaleSpacing(8),
    marginBottom: scale.scaleSpacing(10),
  },
  quickRangeButton: {
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(10),
    paddingHorizontal: scale.scaleSpacing(10),
    paddingVertical: scale.scaleSpacing(8),
    backgroundColor: "#F7FFFD",
  },
  quickRangeButtonText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(12),
    fontFamily: "Fredoka_500Medium",
  },
  modalFieldLabel: {
    color: "#6B8E7E",
    fontSize: scale.scaleFont(12),
    fontFamily: "Fredoka_500Medium",
    marginTop: scale.scaleSpacing(8),
    marginBottom: scale.scaleSpacing(6),
  },
  datePickButton: {
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(10),
    backgroundColor: "#FBFFFE",
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(9),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale.scaleSpacing(8),
  },
  datePickButtonActive: {
    borderColor: "#56B8A8",
    backgroundColor: "#F2FBF9",
  },
  datePickLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: scale.scaleSpacing(8),
    minWidth: 0,
  },
  datePickIcon: {
    width: scale.scaleWidth(18),
    height: scale.scaleWidth(18),
    resizeMode: "contain",
    tintColor: "#56B8A8",
  },
  datePickText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
  },
  calendarWrap: {
    marginTop: scale.scaleSpacing(10),
    borderWidth: 1,
    borderColor: "#DCEFEB",
    borderRadius: scale.scaleBorderRadius(12),
    backgroundColor: "#F8FFFD",
    paddingVertical: scale.scaleSpacing(8),
    overflow: "hidden",
    paddingHorizontal: scale.scaleSpacing(8),
  },
  calendarSlideArea: {
    width: "100%",
  },
  calendarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale.scaleSpacing(8),
  },
  calendarNavButton: {
    width: scale.scaleWidth(36),
    height: scale.scaleWidth(30),
    borderRadius: scale.scaleBorderRadius(8),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECF7F4",
  },
  calendarNavText: {
    color: "#2F9E93",
    fontSize: scale.scaleFont(12),
    fontFamily: "Fredoka_600SemiBold",
  },
  calendarMonthText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(18),
    fontFamily: "Fredoka_600SemiBold",
  },
  calendarWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale.scaleSpacing(4),
  },
  calendarWeekLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#6B8E7E",
    fontSize: scale.scaleFont(12),
    fontFamily: "Fredoka_500Medium",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale.scaleSpacing(6),
    borderRadius: scale.scaleBorderRadius(10),
  },
  calendarCellEmpty: {
    width: `${100 / 7}%`,
    paddingVertical: scale.scaleSpacing(6),
  },
  calendarCellInRange: {
    backgroundColor: "#DFF4EF",
  },
  calendarCellSelected: {
    backgroundColor: "#56B8A8",
  },
  calendarCellText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(17),
    fontFamily: "Fredoka_500Medium",
  },
  calendarCellTextInRange: {
    color: "#2A3B4D",
  },
  calendarCellTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Fredoka_600SemiBold",
  },
  selectedRangePill: {
    marginTop: scale.scaleSpacing(8),
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(18),
    backgroundColor: "#ECF7F4",
    paddingVertical: scale.scaleSpacing(8),
    paddingHorizontal: scale.scaleSpacing(12),
    alignItems: "center",
  },
  selectedRangeText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(13),
    fontFamily: "Fredoka_500Medium",
    textAlign: "center",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: scale.scaleSpacing(10),
    marginTop: scale.scaleSpacing(14),
  },
  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(12),
    paddingVertical: scale.scaleSpacing(12),
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  modalSecondaryButtonText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: "#2F9E93",
    borderRadius: scale.scaleBorderRadius(12),
    paddingVertical: scale.scaleSpacing(12),
    alignItems: "center",
  },
  modalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
  },
  modalList: {
    width: "100%",
  },
  modalListItem: {
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(10),
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(10),
    backgroundColor: "#FBFFFE",
    marginBottom: scale.scaleSpacing(8),
  },
  modalListItemActive: {
    backgroundColor: "#5BDFC9",
    borderColor: "#5BDFC9",
  },
  modalListItemText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
  },
  modalListItemTextActive: {
    color: "#FFFFFF",
  },
  dayListItem: {
    borderWidth: 1,
    borderColor: "#BFEDE2",
    borderRadius: scale.scaleBorderRadius(10),
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(10),
    backgroundColor: "#FBFFFE",
    marginBottom: scale.scaleSpacing(8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale.scaleSpacing(10),
  },
  dayListItemActive: {
    backgroundColor: "#5BDFC9",
    borderColor: "#5BDFC9",
  },
  dayListItemText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
    flex: 1,
  },
  dayListItemTextActive: {
    color: "#FFFFFF",
  },
  dayListCheck: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_700Bold",
  },
  dayListTrailingSpace: {
    width: scale.scaleWidth(16),
    height: scale.scaleHeight(16),
  },
  detailList: {
    gap: scale.scaleSpacing(8),
    marginBottom: scale.scaleSpacing(14),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: scale.scaleSpacing(10),
    borderBottomWidth: 1,
    borderBottomColor: "#E6F6F1",
    paddingVertical: scale.scaleSpacing(6),
  },
  detailLabel: {
    color: "#6B8E7E",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
  },
  detailValue: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
    textAlign: "right",
    flexShrink: 1,
  },
  detailCloseButton: {
    marginTop: scale.scaleSpacing(0),
    backgroundColor: "#2F9E93",
    borderRadius: scale.scaleBorderRadius(12),
    minHeight: scale.scaleHeight(35),
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseButtonText: {
    color: "#FFFFFF",
    fontSize: scale.scaleFont(16),
    fontFamily: "Fredoka_600SemiBold",
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: scale.scaleSpacing(20),
    alignItems: "center",
  },
  loadingText: {
    color: "#2A3B4D",
    fontSize: scale.scaleFont(14),
    fontFamily: "Fredoka_500Medium",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: scale.scaleBorderRadius(12),
    paddingHorizontal: scale.scaleSpacing(12),
    paddingVertical: scale.scaleSpacing(6),
  },
}));
