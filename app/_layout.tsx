import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import NotificationService from "../src/notificationService";
import { supabase } from "../src/supabaseClient";

export default function RootLayout() {
  const router = useRouter();

  const pathname = usePathname();

  const segments = useSegments();


  // Prevent multiple sequential replaces causing white flash
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let authListener: any;
    let notificationListener: any;

    const handleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentPath = segments.join('/');

      if (!session) {
        // Only redirect to login if not already on an auth page
        if (!currentPath.startsWith('auth') && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      // Logged in: only redirect if user is on auth pages or truly at root
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        // Only redirect if on auth pages or at the absolute root (no path)
        if (currentPath.startsWith('auth') || pathname === '/' || pathname === undefined || currentPath === '') {
          router.replace('/loading?next=/greetings');
        }
        // Otherwise, stay on current page (don't redirect)
      }
    };

    handleSession();

    // Listen for notifications when app is in foreground
    notificationListener = Notifications.addNotificationReceivedListener(async notification => {
      console.log('Notification received:', notification);
      // Play ringtone for 10 seconds
      await NotificationService.playRingtone('rooster');
    });

    authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        hasRedirectedRef.current = false; // allow a fresh redirect on new sign-in
      }
      if (event === 'SIGNED_OUT') {
        hasRedirectedRef.current = false; // allow redirect to login on logout
      }
      handleSession();
    });

    return () => {
      authListener?.data?.subscription?.unsubscribe?.();
      notificationListener?.remove?.();
    };
  }, [pathname, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Smooth, platform-standard transitions
        // Use a fade for consistency & avoid white flash between replaces
        animation: 'fade',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        // Prevent white flash during transitions by keeping bg consistent
        contentStyle: { backgroundColor: '#E8FFFA' },
      }}
    >
      {/* Allow tabs group to manage its own header */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* History list and weekly detail use the same smooth card push */}
      <Stack.Screen
        name="history"
        options={{
          headerShown: false,
          animation: 'none', // we handle custom slide animation inside the screen
          gestureEnabled: false,
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="history/[week]"
        options={{
          headerShown: false,
          animation: 'none', // custom animation handled internally
          gestureEnabled: false,
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      {/* Auth and other routes inherit defaults */}
    </Stack>
  );
}
