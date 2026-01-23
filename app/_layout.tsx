import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from "react";

import { Alert, BackHandler, Platform } from "react-native";


import { ModeProvider } from "../src/contexts/ModeContext";

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

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");

      const backAction = () => {
        Alert.alert("Exit Game", "Are you sure you want to close the app?", [
          { text: "Cancel", style: "cancel" },
          { text: "YES", onPress: () => BackHandler.exitApp() }
        ]);
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }
  }, []);

  useEffect(() => {
    let authListener: any;
    let notificationListener: any;
    let networkListener: any;

    networkListener = setupNetworkListener();

    const handleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentPath = segments.join('/');
      const wasManualLogout = await LogoutService.isManualLogout();

      if (currentPath.startsWith("auth")) {
        return;
      }

      if (!session || wasManualLogout) {
        if (wasManualLogout) {
          await LogoutService.clearManualLogout();
          await supabase.auth.signOut();
        }

        if (!currentPath.startsWith("auth") && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      if (!hasRedirectedRef.current && !isNavigatingRef.current) {
        hasRedirectedRef.current = true;
        isNavigatingRef.current = true;

        if (pathname === '/' || pathname === undefined || currentPath === '') {
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            const childName = (userData?.user?.user_metadata as any)?.child_name;

            if (userError) {
              isNavigatingRef.current = false;
              return;
            }

            if (!childName) {
              router.replace('/privacy-policy');
            } else {
              await navigateToGreetingsWithNetworkCheck(router);
            }
          } catch {
            // ignore
          } finally {
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 800);
          }
        } else {
          isNavigatingRef.current = false;
        }
      }
    };

    handleSession();

    notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    authListener = supabase.auth.onAuthStateChange((event) => {
      console.log("Auth state changed:", event);

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
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
      <StatusBar hidden={true} />


    <ModeProvider>

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
    </ModeProvider>
  );
}
