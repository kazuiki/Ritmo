import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from "react";
import { Alert, BackHandler, Platform } from "react-native";

import { useNetworkFailure } from "../src/hooks/useNetworkFailure";
import { LogoutService, supabase } from "../src/supabaseClient";
import { setupNetworkListener } from "../src/utils/networkUtils";
import { navigateToGreetingsWithNetworkCheck } from "../src/utils/smartNavigation";
import NetworkFailureModal from "./components/NetworkFailureModal";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const { showNetworkFailureModal, handleRetry } = useNetworkFailure();

  const hasRedirectedRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // --- 1. NEW: GAME-STYLE IMMERSIVE MODE & BACK HANDLER ---
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Hide the navigation bar (back/home buttons)
      NavigationBar.setVisibilityAsync("hidden");

      // Intercept the universal back button/gesture
      const backAction = () => {
        // You can customize this: e.g., only show alert if on certain screens
        Alert.alert("Exit Game", "Are you sure you want to close the app?", [
          { text: "Cancel", onPress: () => null, style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() }
        ]);
        return true; // Prevents the default back action
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }
  }, []);

  // --- 2. YOUR EXISTING AUTH & NOTIFICATION LOGIC ---
  useEffect(() => {
    let authListener: any;
    let notificationListener: any;
    let networkListener: any;

    networkListener = setupNetworkListener();

    const handleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentPath = segments.join('/');
      const wasManualLogout = await LogoutService.isManualLogout();

      if (!session || wasManualLogout) {
        if (wasManualLogout) {
          await LogoutService.clearManualLogout();
          await supabase.auth.signOut();
        }
        
        if (!currentPath.startsWith('auth') && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      if (!hasRedirectedRef.current && !isNavigatingRef.current) {
        hasRedirectedRef.current = true;
        isNavigatingRef.current = true;
        
        if (currentPath.startsWith('auth') || pathname === '/' || pathname === undefined || currentPath === '') {
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            const childName = (userData?.user?.user_metadata as any)?.child_name;

            if (userError) {
              isNavigatingRef.current = false;
            } else if (!childName) {
              router.replace('/instruction');
              setTimeout(() => { isNavigatingRef.current = false; }, 1000);
            } else {
              navigateToGreetingsWithNetworkCheck(router).finally(() => {
                setTimeout(() => { isNavigatingRef.current = false; }, 1000);
              });
            }
          } catch {
            isNavigatingRef.current = false;
          }
        } else {
          isNavigatingRef.current = false;
        }
      }
    };

    handleSession();

    notificationListener = Notifications.addNotificationReceivedListener(async notification => {
      console.log('Notification received:', notification);
    });

    authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        hasRedirectedRef.current = false;
        isNavigatingRef.current = false;
        LogoutService.clearManualLogout();
      }
      if (event === 'SIGNED_OUT') {
        hasRedirectedRef.current = false;
        isNavigatingRef.current = false;
      }
      handleSession();
    });

    return () => {
      authListener?.data?.subscription?.unsubscribe?.();
      notificationListener?.remove?.();
      networkListener?.();
    };
  }, [pathname, segments]);

  return (
    <>
      {/* 3. NEW: HIDES THE TOP CLOCK/BATTERY BAR */}
      <StatusBar hidden={true} />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: '#E8FFFA' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="history"
          options={{
            headerShown: false,
            animation: 'none',
            gestureEnabled: false,
            presentation: 'transparentModal',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="history/[week]"
          options={{
            headerShown: false,
            animation: 'none',
            gestureEnabled: false,
            presentation: 'transparentModal',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>

      <NetworkFailureModal 
        visible={showNetworkFailureModal} 
        onRetry={handleRetry} 
      />
    </>
  );
}