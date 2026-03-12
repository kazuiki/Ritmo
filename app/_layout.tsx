
import { requireOptionalNativeModule } from 'expo-modules-core';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ModeProvider, useMode } from "../src/contexts/ModeContext";
import { OnboardingProvider } from "../src/contexts/OnboardingContext";
import { startOfflineInfrastructure } from "../src/offline";
import { clearUserScopedCache } from "../src/offline/cacheLifecycle";
import { LogoutService, supabase } from "../src/supabaseClient";
import { preloadGameAssets } from "../src/utils/assetPreloader";
import { isNetworkConnected, setupNetworkListener } from "../src/utils/networkUtils";
import { navigateToGreetingsWithNetworkCheck } from "../src/utils/smartNavigation";

const LAST_USER_ID_KEY = "@ritmo_last_user_id";
const LOCAL_CHILD_NAME_KEY = "@ritmo_local_child_name";
const PENDING_CHILD_NAME_KEY = "@ritmo_pending_child_name";

const shouldSuppressOfflineErrorLog = (args: unknown[]): boolean => {
  const text = args
    .map((item) => {
      if (typeof item === 'string') return item;
      const maybeMessage = (item as any)?.message;
      if (typeof maybeMessage === 'string') return maybeMessage;
      return '';
    })
    .join(' ')
    .toLowerCase();

  return (
    text.includes('network request failed') ||
    text.includes('fetch failed') ||
    text.includes('authretryablefetcherror')
  );
};

// BackHandler component that has access to ModeContext
function AppBackHandler({ showExitModal, setShowExitModal }: { showExitModal: boolean; setShowExitModal: (show: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { backToChildMode, mode, parentalLockEnabled } = useMode();

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backAction = () => {
      // Check if we're currently on the home tab
      const isOnHomeTab = pathname.includes('/home') || pathname === '/(tabs)';
      
      // If on home tab, show exit confirmation modal
      if (isOnHomeTab) {
        setShowExitModal(true);
        return true;
      }
      
      // Determine tab navigation based on mode
      const showFloatingButton = !parentalLockEnabled; // 5-tab mode (no parental lock)
      const isParentMode = parentalLockEnabled && mode === 'parent'; // 3-tab parent mode
      const isChildMode = parentalLockEnabled && mode === 'child'; // 2-tab child mode
      
      // 5-TAB MODE (No Parental Lock): Home → Media → Add Routines → Progress → Settings
      if (showFloatingButton) {
        if (pathname.includes('/settings')) {
          router.push('/(tabs)/progress');
          return true;
        }
        if (pathname.includes('/progress')) {
          router.push('/(tabs)/addRoutines');
          return true;
        }
        if (pathname.includes('/addRoutines')) {
          router.push('/(tabs)/media');
          return true;
        }
        if (pathname.includes('/media')) {
          router.push('/(tabs)/home');
          return true;
        }
      }
      
      // 3-TAB PARENT MODE: Add Routines → Progress → Settings
      if (isParentMode) {
        if (pathname.includes('/settings')) {
          router.push('/(tabs)/progress');
          return true;
        }
        if (pathname.includes('/progress')) {
          router.push('/(tabs)/addRoutines');
          return true;
        }
        if (pathname.includes('/addRoutines')) {
          backToChildMode();
          router.push('/(tabs)/home');
          return true;
        }
      }
      
      // 2-TAB CHILD MODE: Home → Media
      if (isChildMode) {
        if (pathname.includes('/media')) {
          router.push('/(tabs)/home');
          return true;
        }
      }
      
      // For any other screen (modals, sub-pages), navigate back in the stack
      if (router.canGoBack()) {
        router.back();
        return true; // Prevent default behavior
      }
      
      // Fallback: show exit modal
      setShowExitModal(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [pathname, backToChildMode, mode, parentalLockEnabled, router, setShowExitModal]);

  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      if (shouldSuppressOfflineErrorLog(args)) {
        return;
      }
      originalConsoleError(...args as Parameters<typeof console.error>);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Prevent multiple sequential replaces causing white flash
  const hasRedirectedRef = useRef(false);
  const isNavigatingRef = useRef(false);

  /**
   * ANDROID-ONLY SYSTEM UI CONTROL (from Paste #2)
   */
  useEffect(() => {

    if (Platform.OS !== 'android') {
      return;
    }

    const navigationBarModule = requireOptionalNativeModule('ExpoNavigationBar') as
      | { setVisibilityAsync?: (visibility: string) => Promise<void>; setBehaviorAsync?: (behavior: string) => Promise<void> }
      | null;

    if (navigationBarModule?.setVisibilityAsync) {
      navigationBarModule.setVisibilityAsync('hidden').catch((error) => {
        console.warn('NavigationBar setVisibilityAsync failed:', error);
      });
    }

    if (navigationBarModule?.setBehaviorAsync) {
      navigationBarModule.setBehaviorAsync('overlay-swipe').catch((error) => {
        console.warn('NavigationBar setBehaviorAsync failed:', error);
      });
    }

    // NavigationBar controls removed - install expo-navigation-bar if needed
    // BackHandler is now managed by AppBackHandler component below

  }, []);


  /**
   * AUTH, NETWORK, NOTIFICATIONS, NAVIGATION
   */
  useEffect(() => {
    let authListener: any;
    let notificationListener: any;
    let networkListener: any;
    let offlineInfrastructureStop: (() => void) | undefined;

    const isInvalidRefreshToken = (error: unknown) => {
      const message = (error as any)?.message as string | undefined;
      const name = (error as any)?.name as string | undefined;
      return (
        name === 'AuthApiError' &&
        (message?.includes('Invalid Refresh Token') ||
          message?.includes('Refresh Token Not Found'))
      );
    };

    // Preload game assets early for instant loading
    preloadGameAssets().catch(err => 
      console.log('Early asset preload failed:', err)
    );



    // Setup network state listener
    networkListener = setupNetworkListener();
    offlineInfrastructureStop = startOfflineInfrastructure();

    const handleSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const currentPath = segments.join('/');
      const cachedUserId = await AsyncStorage.getItem(LAST_USER_ID_KEY);

      if (sessionError && isInvalidRefreshToken(sessionError)) {
        await supabase.auth.signOut();
        await LogoutService.clearManualLogout();
        if (cachedUserId) {
          await clearUserScopedCache(cachedUserId, { clearShared: false });
        }
        await AsyncStorage.removeItem(LAST_USER_ID_KEY);

        if (!currentPath.startsWith('auth') && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      // Check manual logout
      const wasManualLogout = await LogoutService.isManualLogout();

      if (!session || wasManualLogout) {
        if (wasManualLogout) {
          await LogoutService.clearManualLogout();
          await supabase.auth.signOut();
          if (cachedUserId) {
            await clearUserScopedCache(cachedUserId, { clearShared: false });
          }
          await AsyncStorage.removeItem(LAST_USER_ID_KEY);
        }

        // Offline fallback: keep user logged in locally when they did not manually log out.
        if (!session && !wasManualLogout && cachedUserId) {
          const isCurrentlyOnline = await isNetworkConnected();
          if (
            (currentPath.startsWith('auth') || pathname === '/' || pathname === undefined || currentPath === '') &&
            !hasRedirectedRef.current
          ) {
            hasRedirectedRef.current = true;
            router.replace('/(tabs)/home');
          }
          return;
        }

        if (!currentPath.startsWith('auth') && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      if (session?.user?.id) {
        await AsyncStorage.setItem(LAST_USER_ID_KEY, session.user.id);

        const pendingChildNameRaw = await AsyncStorage.getItem(PENDING_CHILD_NAME_KEY);
        if (pendingChildNameRaw) {
          try {
            const pending = JSON.parse(pendingChildNameRaw) as { value?: string };
            const value = pending?.value?.trim?.();
            if (value) {
              const isCurrentlyOnline = await isNetworkConnected();
              if (isCurrentlyOnline) {
                const { error: updateError } = await supabase.auth.updateUser({
                  data: { child_name: value },
                });
                if (!updateError) {
                  await AsyncStorage.setItem(LOCAL_CHILD_NAME_KEY, value);
                  await AsyncStorage.removeItem(PENDING_CHILD_NAME_KEY);
                }
              }
            }
          } catch {
            // Ignore malformed pending data.
          }
        }
      }

      // Logged in
      if (!hasRedirectedRef.current && !isNavigatingRef.current) {
        hasRedirectedRef.current = true;
        isNavigatingRef.current = true;

        // Skip redirect if on password reset flow screens
        if (currentPath === 'auth/forgot-password' || currentPath === 'auth/update-password') {
          isNavigatingRef.current = false;
          hasRedirectedRef.current = false;
          return;
        }

        if (
          currentPath.startsWith('auth') ||
          pathname === '/' ||
          pathname === undefined ||
          currentPath === ''
        ) {
          try {
            let childName = (session?.user?.user_metadata as any)?.child_name;
            let hasAcceptedTerms = (session?.user?.user_metadata as any)?.has_accepted_terms;
            let isCurrentlyOnline = true;

            if (childName === undefined || hasAcceptedTerms === undefined) {
              isCurrentlyOnline = await isNetworkConnected();
            }

            // If metadata is incomplete and online, refresh user profile from Supabase.
            if ((childName === undefined || hasAcceptedTerms === undefined) && isCurrentlyOnline) {
              const { data: userData, error: userError } = await supabase.auth.getUser();
              if (!userError) {
                childName = (userData?.user?.user_metadata as any)?.child_name;
                hasAcceptedTerms = (userData?.user?.user_metadata as any)?.has_accepted_terms;
              }
            }

            if (!childName) {
              // If user hasn't accepted terms yet, show policy page
              // Otherwise, go directly to instruction
              if (hasAcceptedTerms) {
                router.push('/instruction');
              } else {
                router.push('/policy');
              }
              setTimeout(() => {
                isNavigatingRef.current = false;
              }, 600000);
            } else {
              console.log('🔄 Starting navigation to greetings...');
              navigateToGreetingsWithNetworkCheck(router).finally(() => {
                setTimeout(() => {
                  isNavigatingRef.current = false;
                }, 1000);
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

    // Foreground notification listener
    notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Auth state listener
    authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        hasRedirectedRef.current = false;
        isNavigatingRef.current = false;
        LogoutService.clearManualLogout();
        if (session?.user?.id) {
          AsyncStorage.setItem(LAST_USER_ID_KEY, session.user.id).catch(() => {});
        }
      }

      if (event === 'SIGNED_OUT') {
        hasRedirectedRef.current = false;
        isNavigatingRef.current = false;
        AsyncStorage.removeItem(LAST_USER_ID_KEY).catch(() => {});
      }

      handleSession();
    });

    return () => {
      authListener?.data?.subscription?.unsubscribe?.();
      notificationListener?.remove?.();
      networkListener?.();
      offlineInfrastructureStop?.();
    };
  }, [pathname, segments]);

  return (
    <SafeAreaProvider>
      <ModeProvider>
        <OnboardingProvider>
          <AppBackHandler showExitModal={showExitModal} setShowExitModal={setShowExitModal} />
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

          {/* Exit Confirmation Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showExitModal}
            onRequestClose={() => setShowExitModal(false)}
          >
            <View style={styles.exitModalOverlay}>
              <View style={styles.exitModalContainer}>
                <View style={styles.exitIconCircle}>
                  <Image
                    source={require("../assets/images/Error.png")}
                    style={styles.exitIcon}
                  />
                </View>
                
                <Text style={styles.exitModalTitle}>Exit Game</Text>
                <Text style={styles.exitModalMessage}>
                  Are you sure you want to close the app?
                </Text>
                
                <View style={styles.exitModalButtons}>
                  <TouchableOpacity
                    style={styles.exitCancelButton}
                    onPress={() => setShowExitModal(false)}
                  >
                    <Text style={styles.exitCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.exitConfirmButton}
                    onPress={() => {
                      setShowExitModal(false);
                      BackHandler.exitApp();
                    }}
                  >
                    <Text style={styles.exitConfirmButtonText}>YES</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </OnboardingProvider>
      </ModeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '74%',
    maxWidth: 330,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#FFB3BA',
  },
  exitIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  exitIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  exitModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  exitModalMessage: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  exitCancelButton: {
    flex: 1,
    backgroundColor: '#D3D3D3',
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exitConfirmButton: {
    flex: 1,
    backgroundColor: '#FF6B7A',
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});