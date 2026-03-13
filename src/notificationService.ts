import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabaseClient';

// Suppress remote notifications warning in expo go
import { LogBox, Platform } from 'react-native';
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // Disabled: custom alarm handler plays sound instead
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface RoutineNotification {
  routineId: number;
  routineName: string;
  time: string; // format: "08:00 am"
  ringtone: string; // path to ringtone
  days?: number[]; // 0=Sun ... 6=Sat
}

const LAST_USER_ID_KEY = '@ritmo_last_user_id';

class NotificationService {
  private sound: any = null;
  private alarmSound: any = null;
  private notificationListener: any = null;
  private isPlayingAlarm: boolean = false;
  private previewTimeout: ReturnType<typeof setTimeout> | null = null;
  private alarmTimeout: ReturnType<typeof setTimeout> | null = null;
  private alarmCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastTriggeredRoutineId: number | null = null;
  private audioModeConfigured: boolean = false;
  // Track which channels we've already delete+recreated this session to force sound pickup
  private recreatedChannels = new Set<string>();

  private async ensureAudioModeConfigured() {
    if (this.audioModeConfigured) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    this.audioModeConfigured = true;
  }

  private getAndroidChannelIdForRingtone(ringtone?: string): string {
    const safeRingtone = (ringtone || 'alarm1').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return `alarm-channel-${safeRingtone || 'alarm1'}`;
  }

  private async ensureAndroidChannelForRingtone(ringtone?: string): Promise<string> {
    const resolvedRingtone = ringtone || 'alarm1';
    const channelId = this.getAndroidChannelIdForRingtone(resolvedRingtone);

    if (Platform.OS === 'android') {
      // Android caches channel sound settings — delete first so the res/raw file is picked up fresh.
      // Only do this once per session per channel to avoid thrashing.
      if (!this.recreatedChannels.has(channelId)) {
        try {
          await Notifications.deleteNotificationChannelAsync(channelId);
        } catch {
          // Ignore if channel didn't exist yet.
        }
        this.recreatedChannels.add(channelId);
      }

      await Notifications.setNotificationChannelAsync(channelId, {
        name: `Routine Alarms (${resolvedRingtone})`,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: `${resolvedRingtone}.mp3`,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    return channelId;
  }

  private async getRoutinesStorageKey(): Promise<string | null> {
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
    } catch {
      // Ignore auth resolution errors; caller will handle null key.
    }

    return null;
  }

  private async readStoredRoutines(): Promise<any[]> {
    const storageKey = await this.getRoutinesStorageKey();
    if (storageKey) {
      const perUserStored = await AsyncStorage.getItem(storageKey);
      if (perUserStored) {
        return JSON.parse(perUserStored);
      }
    }

    // Backward-compat fallback for older installs that still used a global key.
    const legacyStored = await AsyncStorage.getItem('@routines');
    return legacyStored ? JSON.parse(legacyStored) : [];
  }

  private async getChildNameForNotification(): Promise<string> {
    try {
      const { data } = await supabase.auth.getUser();
      const childName = (data?.user?.user_metadata as any)?.child_name;
      if (typeof childName === 'string' && childName.trim().length > 0) {
        return childName.trim();
      }
    } catch (error) {
      console.error('Error getting child name for notification:', error);
    }
    return 'Kid';
  }

  private getRoutineActionText(routineName: string): string {
    const trimmed = routineName.trim();
    if (!trimmed) return 'do your routine';

    if (trimmed.toLowerCase() === 'brush my teeth') {
      return 'brush your teeth';
    }

    return trimmed;
  }

  private async buildRoutineNotificationBody(routineName: string): Promise<string> {
    const childName = await this.getChildNameForNotification();
    const actionText = this.getRoutineActionText(routineName);
    return `Hi ${childName}, It's time to ${actionText}!`;
  }

  async initialize() {
  try {
    // Configure audio independently from notification permission.
    await this.ensureAudioModeConfigured();

    // 1. Android Channel Setup (Must be first for system to recognize the channel)
    if (Platform.OS === 'android') {
      // Create a default channel; ringtone-specific channels are created during scheduling.
      await this.ensureAndroidChannelForRingtone('alarm1');
    }

    await Notifications.setNotificationCategoryAsync('alarm-actions', [
    {
      identifier: 'stop-alarm',
      buttonTitle: 'Stop',
      options: { isDestructive: true },
    },
  ]);

    // 2. Permission Handling
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Notification permissions not granted');
      return false;
    }

    // 3. Cleanup & Listeners
    await this.cleanupExpiredNotifications();

    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    // This listener handles sound ONLY when the app is OPEN (Foreground)
    this.notificationListener = Notifications.addNotificationReceivedListener(async (notification: any) => {
      const ringtone = notification.request.content.data?.ringtone as string || 'alarm1';
      const routineId = notification.request.content.data?.routineId as number;
      // Play alarm sound when notification arrives and app is open
      // NOTE: Don't call showHeadsUpForAlarm() here as it would create duplicate notifications
      this.lastTriggeredRoutineId = routineId;
      await this.playAlarmSound(ringtone);
    });

    // Start a periodic check for alarms (every 5 seconds) to catch missed notifications
    this.startAlarmCheckInterval();

    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const actionId = response.actionIdentifier;

      if (actionId === 'stop-alarm') {
        this.stopAlarmSound(); // Stops the alarm sound
        // Also dismiss the notification that triggered this
        try {
          Notifications.dismissNotificationAsync(response.notification.request.identifier);
        } catch (error) {
          console.error('Error dismissing notification:', error);
        }
      }
    });

    console.log('✅ Notification service initialized');
    return true;

  } catch (error) {
    if (error instanceof Error && error.message.includes('remote notifications')) {
      return true; 
    }
    console.error('Error initializing notifications:', error);
    return false;
  }
}

  // display an immediate heads-up notification with stop button (foreground case)
  private async showHeadsUpForAlarm(routineName: string, ringtone: string) {
    try {
      const channelId = await this.ensureAndroidChannelForRingtone(ringtone);
      const body = routineName
        ? await this.buildRoutineNotificationBody(routineName)
        : undefined;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Routine Time!',
          body,
          data: {
            routineName,
            ringtone,
          },
          categoryIdentifier: 'alarm-actions',
          color: '#1A73E8',
          sound: `${ringtone}.mp3`,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
          channelId,
        },
      });
      console.log('🔔 Heads-up alarm notification shown');
    } catch (error) {
      console.error('Error presenting heads-up notification:', error);
    }
  }

  // Clean up expired notifications
  private async cleanupExpiredNotifications() {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔍 Found ${scheduled.length} total scheduled notifications`);
      
      // If approaching limit (400+), cancel ALL and let refresh reschedule
      if (scheduled.length > 400) {
        console.log(`⚠️ Too many notifications (${scheduled.length}). Clearing all...`);
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('✅ Cleared all notifications. Will reschedule on next refresh.');
        return;
      }

      const now = Date.now();
      let canceledCount = 0;

      for (const notification of scheduled) {
        // Cancel notifications that have already passed
        if (notification.trigger && 'date' in notification.trigger) {
          const triggerDate = new Date(notification.trigger.date as number).getTime();
          if (triggerDate < now) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            canceledCount++;
          }
        }
      }

      if (canceledCount > 0) {
        console.log(`🧹 Cleaned up ${canceledCount} expired notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
    }
  }

  // Schedule daily notification for a routine
  async scheduleRoutineNotification(routine: RoutineNotification): Promise<string | null> {
    try {
      const ringtone = routine.ringtone || 'alarm1';
      const channelId = await this.ensureAndroidChannelForRingtone(ringtone);

      // Parse time (format: "08:00 am" or "08:00 pm")
      const timeParts = routine.time.split(' ');
      const [hourStr, minuteStr] = timeParts[0].split(':');
      const period = timeParts[1].toLowerCase();
      
      let hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      // Convert to 24-hour format
      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }

      // Cancel existing notification for this routine if any
      await this.cancelRoutineNotification(routine.routineId);

      const now = new Date();

      // Determine selected days
      // - If 'days' is undefined (old routines), default to all days
      // - If it's an empty array, treat as no days selected (schedule nothing)
      const selectedDays = Array.isArray(routine.days)
        ? routine.days
        : [0, 1, 2, 3, 4, 5, 6];

      // Collect up to 3 upcoming matching days within next 14 days
      // Start from today (matching Home tab logic: enable when currentTime >= scheduledTime)
      const notificationIds: string[] = [];
      const maxToSchedule = 3;

      for (let offset = 0; offset < 14 && notificationIds.length < maxToSchedule; offset++) {
        const triggerDate = new Date(now);
        triggerDate.setDate(now.getDate() + offset);
        triggerDate.setHours(hour, minute, 0, 0);

        // Match selected weekdays; include today if time hasn't passed, always include future days
        const isMatchingDay = selectedDays.includes(triggerDate.getDay());
        const isFutureOrNow = offset > 0 || triggerDate.getTime() >= now.getTime();
        if (isMatchingDay && isFutureOrNow) {
          const secondsUntilTrigger = Math.max(1, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));
          const body = await this.buildRoutineNotificationBody(routine.routineName);

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ Routine Time!',
              body,
              data: {
                routineId: routine.routineId,
                routineName: routine.routineName,
                ringtone,
              },


              // iOS category for action button; still include for completeness
              categoryIdentifier: 'alarm-actions',

              // Android-specific options ensure heads-up banner and button
              color: '#1A73E8',

              sound: `${ringtone}.mp3`,

              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilTrigger,
              repeats: false,

              // channelId in trigger is still respected by expo but android block is preferred
              channelId,
            },
          });

          notificationIds.push(notificationId);
        }
      }

      // Store all notification IDs for this routine
      await this.storeNotificationIds(routine.routineId, notificationIds);

      console.log(`✅ Scheduled ${notificationIds.length} notifications for ${routine.routineName} at ${hour}:${minute} on selected days`);
      return notificationIds[0];
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      return null;
    }
  }

  // Refresh/extend notifications if running low (call this when app opens)
  async refreshAllRoutineNotifications() {
    try {
      const routines = await this.readStoredRoutines();
      if (routines.length === 0) return;
      console.log(`🔄 Checking ${routines.length} routines for notification refresh...`);

      for (const routine of routines) {
        // Check if this routine has notifications scheduled
        const ids = await this.getNotificationIds(routine.id);
        
        // If less than 2 days of notifications left, reschedule
        if (ids.length < 2) {
          console.log(`⚠️ Routine "${routine.name}" has only ${ids.length} notifications left. Refreshing...`);
          await this.scheduleRoutineNotification({
            routineId: routine.id,
            routineName: routine.name,
            time: routine.time,
            ringtone: routine.ringtone || 'alarm1',
            days: routine.days,
          });
        }
      }
      console.log('✅ Notification refresh complete');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }

  // Cancel notification for a specific routine
  async cancelRoutineNotification(routineId: number) {
    try {
      const notificationIds = await this.getNotificationIds(routineId);
      if (notificationIds.length > 0) {
        // Cancel all scheduled notifications for this routine
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        await this.removeNotificationId(routineId);
        console.log(`✅ Cancelled ${notificationIds.length} notification(s) for routine ${routineId}`);
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Play alarm sound for actual notification (30 seconds with auto-stop)
  async playAlarmSound(ringtonePath: string = 'alarm1') {
    try {
      await this.ensureAudioModeConfigured();

      // Prevent multiple simultaneous alarms
      if (this.isPlayingAlarm) {
        console.log('⚠️ Alarm already playing, skipping duplicate');
        return;
      }

      this.isPlayingAlarm = true;

      // Stop ALL sounds (preview + alarm) before playing alarm
      await this.stopAllSounds();
      
      // Ensure alarm sound is fully cleared
      this.alarmSound = null;

      // Map ringtone names to actual files
      const ringtoneMap: { [key: string]: any } = {
        'alarm1': require('../assets/ringtone/alarm1.mp3'),
        'alarm2': require('../assets/ringtone/alarm2.mp3'),
        'alarm3': require('../assets/ringtone/alarm3.mp3'),
        'alarm4': require('../assets/ringtone/alarm4.mp3'),
        'alarm5': require('../assets/ringtone/alarm5.mp3'),
        'alarm6': require('../assets/ringtone/alarm6.mp3'),
        'alarm7': require('../assets/ringtone/alarm7.mp3'),
        'alarm8': require('../assets/ringtone/alarm8.mp3'),
        'alarm13': require('../assets/ringtone/alarm13.mp3'),
        'alarm14': require('../assets/ringtone/alarm14.mp3'),
        'alarm15': require('../assets/ringtone/alarm15.mp3'),
        'alarm16': require('../assets/ringtone/alarm16.mp3'),
        'alarm17': require('../assets/ringtone/alarm17.mp3'),
      };

      const soundFileKey = ringtoneMap[ringtonePath] ? ringtonePath : 'alarm1';
      const soundFile = ringtoneMap[soundFileKey];

      // Load the sound WITHOUT looping (we'll handle duration with timeout)
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        { 
          shouldPlay: true, 
          isLooping: false, // IMPORTANT: No looping for alarms
          volume: 1.0
        }
      );
      
      this.alarmSound = sound;

      // Force stop after exactly 30 seconds
      this.alarmTimeout = setTimeout(async () => {
        await this.stopAlarmSound();
        this.isPlayingAlarm = false;
      }, 30000);

      console.log('⏰ Playing alarm sound (30 seconds, no loop)');
    } catch (error) {
      console.error('Error playing alarm sound:', error);
      this.isPlayingAlarm = false;
    }
  }

  // Play ringtone (for preview in modal - 5 seconds only)
  async playRingtone(ringtonePath: string = 'alarm1') {
    try {
      await this.ensureAudioModeConfigured();

      // Clear any existing preview timeout first
      if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = null;
      }

      // Stop any currently playing sound and ensure it's fully stopped
      if (this.sound) {
        try {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded) {
            await this.sound.stopAsync();
            await this.sound.unloadAsync();
          }
        } catch (err) {
          // Ignore errors
        }
        this.sound = null;
      }

      // Map ringtone names to actual files
      const ringtoneMap: { [key: string]: any } = {
        'alarm1': require('../assets/ringtone/alarm1.mp3'),
        'alarm2': require('../assets/ringtone/alarm2.mp3'),
        'alarm3': require('../assets/ringtone/alarm3.mp3'),
        'alarm4': require('../assets/ringtone/alarm4.mp3'),
        'alarm5': require('../assets/ringtone/alarm5.mp3'),
        'alarm6': require('../assets/ringtone/alarm6.mp3'),
        'alarm7': require('../assets/ringtone/alarm7.mp3'),
        'alarm8': require('../assets/ringtone/alarm8.mp3'),
        'alarm13': require('../assets/ringtone/alarm13.mp3'),
        'alarm14': require('../assets/ringtone/alarm14.mp3'),
        'alarm15': require('../assets/ringtone/alarm15.mp3'),
        'alarm16': require('../assets/ringtone/alarm16.mp3'),
        'alarm17': require('../assets/ringtone/alarm17.mp3'),
      };

      const soundFile = ringtoneMap[ringtonePath] || ringtoneMap['alarm1'];

      // Load and play the sound immediately WITHOUT LOOPING
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        { 
          shouldPlay: true, 
          isLooping: false, // IMPORTANT: No looping for preview
          volume: 1.0
        }
      );
      
      this.sound = sound;

      // Auto-stop after 5 seconds for preview
      this.previewTimeout = setTimeout(async () => {
        await this.stopRingtone();
      }, 5000);

      console.log('🔊 Playing ringtone preview (5 seconds, no loop)');
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }

  // Stop alarm sound
  async stopAlarmSound() {
    try {
      // Clear alarm timeout
      if (this.alarmTimeout) {
        clearTimeout(this.alarmTimeout);
        this.alarmTimeout = null;
      }

      if (this.alarmSound) {
        try {
          const status = await this.alarmSound.getStatusAsync();
          if (status.isLoaded) {
            await this.alarmSound.stopAsync();
            await this.alarmSound.unloadAsync();
          }
        } catch (err) {
          // Ignore errors during stop/unload
        }
        this.alarmSound = null;
        this.isPlayingAlarm = false;
        console.log('Alarm sound stopped');
      }
    } catch (error) {
      // Force cleanup even on error
      this.alarmSound = null;
      this.isPlayingAlarm = false;
    }
  }

  // Stop ringtone (preview)
  async stopRingtone() {
    try {
      // Clear preview timeout
      if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = null;
      }

      if (this.sound) {
        try {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded) {
            await this.sound.stopAsync();
            await this.sound.unloadAsync();
          }
        } catch (err) {
          // Ignore errors during stop/unload
        }
        this.sound = null;
        console.log('Ringtone preview stopped');
      }
    } catch (error) {
      // Force cleanup even on error
      this.sound = null;
    }
  }

  // Stop ALL sounds (both preview and alarm)
  async stopAllSounds() {
    await this.stopRingtone();
    await this.stopAlarmSound();
  }

  // Store notification ID for a routine
  private async storeNotificationId(routineId: number, notificationId: string) {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(`@notification_${routineId}`, notificationId);
    } catch (error) {
      console.error('Error storing notification ID:', error);
    }
  }

  // Store multiple notification IDs for a routine (for 30-day schedule)
  private async storeNotificationIds(routineId: number, notificationIds: string[]) {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(`@notification_${routineId}`, JSON.stringify(notificationIds));
    } catch (error) {
      console.error('Error storing notification IDs:', error);
    }
  }

  // Get notification ID for a routine
  private async getNotificationId(routineId: number): Promise<string | null> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const stored = await AsyncStorage.getItem(`@notification_${routineId}`);
      if (!stored) return null;
      
      // Try to parse as array (new format)
      try {
        const ids = JSON.parse(stored);
        return Array.isArray(ids) ? ids[0] : stored;
      } catch {
        // Old format (single ID)
        return stored;
      }
    } catch (error) {
      console.error('Error getting notification ID:', error);
      return null;
    }
  }

  // Get all notification IDs for a routine
  private async getNotificationIds(routineId: number): Promise<string[]> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const stored = await AsyncStorage.getItem(`@notification_${routineId}`);
      if (!stored) return [];
      
      try {
        const ids = JSON.parse(stored);
        return Array.isArray(ids) ? ids : [stored];
      } catch {
        return [stored];
      }
    } catch (error) {
      console.error('Error getting notification IDs:', error);
      return [];
    }
  }

  // Remove notification ID for a routine
  private async removeNotificationId(routineId: number) {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem(`@notification_${routineId}`);
    } catch (error) {
      console.error('Error removing notification ID:', error);
    }
  }

  // Get all scheduled notifications (for debugging)
  async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Scheduled notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Cleanup when service is destroyed
  async destroy() {
    await this.stopAllSounds();
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    this.stopAlarmCheckInterval();
  }

  // Start periodic check for alarms (in case notification listener misses them)
  private startAlarmCheckInterval() {
    // Clear any existing interval
    this.stopAlarmCheckInterval();

    // Check every 5 seconds if it's time to trigger an alarm
    this.alarmCheckInterval = setInterval(async () => {
      await this.checkAndTriggerAlarms();
    }, 5000);

    console.log('🔔 Alarm check interval started (every 5 seconds)');
  }

  // Stop the alarm check interval
  private stopAlarmCheckInterval() {
    if (this.alarmCheckInterval) {
      clearInterval(this.alarmCheckInterval);
      this.alarmCheckInterval = null;
    }
  }

  // Check if current time matches any routine and trigger alarm if needed
  private async checkAndTriggerAlarms() {
    try {
      const routines = await this.readStoredRoutines();
      if (routines.length === 0) return;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      for (const routine of routines) {
        // Parse routine time
        const timeParts = routine.time.split(' ');
        const [hourStr, minuteStr] = timeParts[0].split(':');
        const period = timeParts[1].toLowerCase();

        let hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);

        // Convert to 24-hour format
        if (period === 'pm' && hour !== 12) {
          hour += 12;
        } else if (period === 'am' && hour === 12) {
          hour = 0;
        }

        // Check if current time matches routine time (within 1 minute window)
        const isTimeMatch = currentHour === hour && Math.abs(currentMinute - minute) <= 1;

        // Check if today is a selected day
        const selectedDays = Array.isArray(routine.days) ? routine.days : [0, 1, 2, 3, 4, 5, 6];
        const isDayMatch = selectedDays.includes(now.getDay());

        // Don't trigger same routine twice
        const alreadyTriggered = this.lastTriggeredRoutineId === routine.id;

        if (isTimeMatch && isDayMatch && !alreadyTriggered && !this.isPlayingAlarm) {
          console.log(`⏰ Triggering alarm for routine: ${routine.name} at ${hour}:${minute}`);
          this.lastTriggeredRoutineId = routine.id;
          const ringtone = routine.ringtone;
          if (ringtone) {
            await this.playAlarmSound(ringtone);
          }
          
          // Reset after 2 minutes to allow re-trigger if user closes and reopens app
          setTimeout(() => {
            if (this.lastTriggeredRoutineId === routine.id) {
              this.lastTriggeredRoutineId = null;
            }
          }, 120000);
        }
      }
    } catch (error) {
      // Silently fail - this is just a safety check
    }
  }
}

export default new NotificationService();