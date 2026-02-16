
import { requireOptionalNativeModule } from 'expo-modules-core';

import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ModeProvider } from "../src/contexts/ModeContext";
import { OnboardingProvider } from "../src/contexts/OnboardingContext";
import { useNetworkFailure } from "../src/hooks/useNetworkFailure";
import { LogoutService, supabase } from "../src/supabaseClient";
import { preloadGameAssets } from "../src/utils/assetPreloader";
import { setupNetworkListener } from "../src/utils/networkUtils";
import { navigateToGreetingsWithNetworkCheck } from "../src/utils/smartNavigation";
import NetworkFailureModal from "./components/NetworkFailureModal";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const { showNetworkFailureModal, handleRetry } = useNetworkFailure();
  const [showExitModal, setShowExitModal] = useState(false);

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

    const backAction = () => {
      setShowExitModal(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);


  /**
   * AUTH, NETWORK, NOTIFICATIONS, NAVIGATION
   */
  useEffect(() => {
    let authListener: any;
    let notificationListener: any;
    let networkListener: any;

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

    const handleSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const currentPath = segments.join('/');

      if (sessionError && isInvalidRefreshToken(sessionError)) {
        await supabase.auth.signOut();
        await LogoutService.clearManualLogout();

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
        }

        if (!currentPath.startsWith('auth') && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      // Logged in
      if (!hasRedirectedRef.current && !isNavigatingRef.current) {
        hasRedirectedRef.current = true;
        isNavigatingRef.current = true;

        if (
          currentPath.startsWith('auth') ||
          pathname === '/' ||
          pathname === undefined ||
          currentPath === ''
        ) {
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            const childName = (userData?.user?.user_metadata as any)?.child_name;

            if (userError) {
              isNavigatingRef.current = false;
              return;
            }

            if (!childName) {
              router.push('/policy');
              setTimeout(() => {
                isNavigatingRef.current = false;
              }, 1000);
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
    authListener = supabase.auth.onAuthStateChange((event) => {
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
    <SafeAreaProvider>
      <ModeProvider>
        <OnboardingProvider>
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
    padding: 24,
    width: '80%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
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