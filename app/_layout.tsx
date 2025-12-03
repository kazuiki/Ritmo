import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { useNetworkFailure } from "../src/hooks/useNetworkFailure";
import NotificationService from "../src/notificationService";
import { supabase } from "../src/supabaseClient";
import { setupNetworkListener } from "../src/utils/networkUtils";
import { navigateToGreetingsWithNetworkCheck } from "../src/utils/smartNavigation";
import NetworkFailureModal from "./components/NetworkFailureModal";

export default function RootLayout() {
  const router = useRouter();

  const pathname = usePathname();

  const segments = useSegments();

  // Network failure modal hook
  const { showNetworkFailureModal, handleRetry } = useNetworkFailure();

  // Prevent multiple sequential replaces causing white flash
  const hasRedirectedRef = useRef(false);
  const isNavigatingRef = useRef(false); // Prevent concurrent navigation

  useEffect(() => {
    let authListener: any;
    let notificationListener: any;
    let networkListener: any;

    // Setup network state listener
    networkListener = setupNetworkListener();

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
      if (!hasRedirectedRef.current && !isNavigatingRef.current) {
        hasRedirectedRef.current = true;
        isNavigatingRef.current = true;
        
        // Only redirect if on auth pages or at the absolute root (no path)
        if (currentPath.startsWith('auth') || pathname === '/' || pathname === undefined || currentPath === '') {
          console.log('🔄 Starting navigation to greetings...');
          navigateToGreetingsWithNetworkCheck(router).finally(() => {
            // Reset navigation flag after completion
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 1000);
          });
        } else {
          isNavigatingRef.current = false; // Reset if not navigating
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
        isNavigatingRef.current = false; // reset navigation flag
      }
      if (event === 'SIGNED_OUT') {
        hasRedirectedRef.current = false; // allow redirect to login on logout
        isNavigatingRef.current = false; // reset navigation flag
      }
      handleSession();
    });

    return () => {
      authListener?.data?.subscription?.unsubscribe?.();
      notificationListener?.remove?.();
      networkListener?.(); // Cleanup network listener
    };
  }, [pathname, segments]);

  return (
    <>
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

      {/* Global Network Failure Modal */}
      <NetworkFailureModal 
        visible={showNetworkFailureModal} 
        onRetry={handleRetry} 
      />
    </>
  );
}
