import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

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

class NotificationService {
  private sound: Audio.Sound | null = null;
  private alarmSound: Audio.Sound | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private isPlayingAlarm: boolean = false;
  private previewTimeout: ReturnType<typeof setTimeout> | null = null;
  private alarmTimeout: ReturnType<typeof setTimeout> | null = null;

  async initialize() {
    try {
      // Request permissions for LOCAL notifications only
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Clean up old/expired notifications to avoid hitting 500 limit
      await this.cleanupExpiredNotifications();

      // Remove existing listener to prevent duplicates
      if (this.notificationListener) {
        this.notificationListener.remove();
        this.notificationListener = null;
      }

      // Setup notification received listener (only one active at a time)
      this.notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
        const ringtone = notification.request.content.data?.ringtone as string || 'alarm1';
        await this.playAlarmSound(ringtone);
      });

      // Configure audio for notifications
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('✅ Local notification service initialized successfully');
      return true;
    } catch (error) {
      // Suppress Expo Go remote notification warnings
      if (error instanceof Error && error.message.includes('remote notifications')) {
        console.log('ℹ️ Remote notifications not available in Expo Go (not needed for local alarms)');
        return true; // Still return true as local notifications work fine
      }
      console.error('Error initializing notifications:', error);
      return false;
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
      const notificationIds: string[] = [];
      const maxToSchedule = 3;

      for (let offset = 0; offset < 14 && notificationIds.length < maxToSchedule; offset++) {
        const triggerDate = new Date(now);
        triggerDate.setDate(now.getDate() + offset);
        triggerDate.setHours(hour, minute, 0, 0);

        // Must be in the future and match selected weekdays
        if (triggerDate.getTime() > now.getTime() && selectedDays.includes(triggerDate.getDay())) {
          const secondsUntilTrigger = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ Routine Time!',
              body: `Time for: ${routine.routineName}`,
              data: {
                routineId: routine.routineId,
                routineName: routine.routineName,
                ringtone: routine.ringtone,
              },
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: secondsUntilTrigger,
              repeats: false,
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
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const stored = await AsyncStorage.getItem("@routines");
      if (!stored) return;

      const routines = JSON.parse(stored);
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

  // Play alarm sound for actual notification (12 seconds with auto-stop)
  async playAlarmSound(ringtonePath: string = 'alarm1') {
    try {
      // Prevent multiple simultaneous alarms
      if (this.isPlayingAlarm) {
        console.log('⚠️ Alarm already playing, skipping duplicate');
        return;
      }

      this.isPlayingAlarm = true;

      // Stop ALL sounds (preview + alarm) before playing alarm
      await this.stopAllSounds();

      // Map ringtone names to actual files
      const ringtoneMap: { [key: string]: any } = {
        'alarm1': require('../assets/ringtone/Alarm1.mp3'),
        'alarm2': require('../assets/ringtone/Alarm2.mp3'),
        'alarm3': require('../assets/ringtone/Alarm3.mp3'),
      };

      const soundFile = ringtoneMap[ringtonePath] || ringtoneMap['alarm1'];

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

      // Force stop after exactly 12 seconds
      this.alarmTimeout = setTimeout(async () => {
        await this.stopAlarmSound();
        this.isPlayingAlarm = false;
      }, 12000);

      console.log('⏰ Playing alarm sound (12 seconds, no loop)');
    } catch (error) {
      console.error('Error playing alarm sound:', error);
      this.isPlayingAlarm = false;
    }
  }

  // Play ringtone (for preview in modal - 5 seconds only)
  async playRingtone(ringtonePath: string = 'alarm1') {
    try {
      // Stop any currently playing sound first
      await this.stopAllSounds();

      // Clear any existing preview timeout
      if (this.previewTimeout) {
        clearTimeout(this.previewTimeout);
        this.previewTimeout = null;
      }

      // Map ringtone names to actual files
      const ringtoneMap: { [key: string]: any } = {
        'alarm1': require('../assets/ringtone/Alarm1.mp3'),
        'alarm2': require('../assets/ringtone/Alarm2.mp3'),
        'alarm3': require('../assets/ringtone/Alarm3.mp3'),
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
        const status = await this.alarmSound.getStatusAsync();
        if (status.isLoaded) {
          await this.alarmSound.stopAsync();
          await this.alarmSound.unloadAsync();
        }
        this.alarmSound = null;
        this.isPlayingAlarm = false;
        console.log('Alarm sound stopped');
      }
    } catch (error) {
      // Silently handle error - sound might already be stopped
      if (this.alarmSound) {
        this.alarmSound = null;
        this.isPlayingAlarm = false;
      }
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
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
        }
        this.sound = null;
        console.log('Ringtone preview stopped');
      }
    } catch (error) {
      // Silently handle error - sound might already be stopped
      if (this.sound) {
        this.sound = null;
      }
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
  }
}

export default new NotificationService();