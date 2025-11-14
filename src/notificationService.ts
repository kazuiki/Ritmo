import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
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
}

class NotificationService {
  private sound: Audio.Sound | null = null;

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
          const triggerDate = new Date(notification.trigger.date as any).getTime();
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

      // Calculate the target time for today
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, minute, 0, 0);

      // If the time has passed today, start from tomorrow
      if (scheduledTime.getTime() <= now.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      // Schedule notifications for the next 3 days only (Android has 500 alarm limit)
      // App will auto-refresh these when user opens app
      const notificationIds: string[] = [];
      const daysToSchedule = 3; // 3 days only to avoid hitting limit
      
      for (let day = 0; day < daysToSchedule; day++) {
        const triggerDate = new Date(scheduledTime);
        triggerDate.setDate(scheduledTime.getDate() + day);
        
        const secondsUntilTrigger = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Routine Time!',
            body: `Time for: ${routine.routineName}`,
            sound: 'rooster.mp3',
            data: { 
              routineId: routine.routineId,
              routineName: routine.routineName,
              ringtone: routine.ringtone,
              day: day,
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

      // Store all notification IDs for this routine
      await this.storeNotificationIds(routine.routineId, notificationIds);

      console.log(`✅ Scheduled ${daysToSchedule} daily notifications for ${routine.routineName} at ${hour}:${minute}`);
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
            ringtone: routine.ringtone || 'rooster',
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

  // Play ringtone (for preview)
  async playRingtone(ringtonePath: string = 'rooster') {
    try {
      // Stop any currently playing sound
      await this.stopRingtone();

      // Load the sound
      const { sound, status } = await Audio.Sound.createAsync(
        require('../assets/ringtone/rooster.mp3'),
        { shouldPlay: false } // Don't play yet, check duration first
      );
      
      this.sound = sound;

      // Get the duration of the sound
      const duration = status.isLoaded ? status.durationMillis || 0 : 0;
      const targetDuration = 12000; // 12 seconds target
      
      // Calculate how many times to loop
      let loopCount = 1;
      if (duration > 0 && duration < targetDuration) {
        loopCount = Math.ceil(targetDuration / duration);
      }

      console.log(`🔊 Ringtone duration: ${duration}ms, will loop ${loopCount} times to reach 12 seconds`);

      // Set looping
      await sound.setIsLoopingAsync(loopCount > 1);
      
      // Play the sound
      await sound.playAsync();

      // Auto-stop after 12 seconds
      setTimeout(async () => {
        await this.stopRingtone();
      }, targetDuration);

      console.log('Playing ringtone preview');
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }

  // Stop ringtone
  async stopRingtone() {
    try {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
        }
        this.sound = null;
        console.log('Ringtone stopped');
      }
    } catch (error) {
      // Silently handle error - sound might already be stopped
      if (this.sound) {
        this.sound = null;
      }
    }
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
}

export default new NotificationService();
