import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { supabase } from "../src/supabaseClient";

export default function RootLayout() {
  const router = useRouter();

  const pathname = usePathname();

  const segments = useSegments();


  // Prevent multiple sequential replaces causing white flash
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let authListener: any;

    const handleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentPath = segments.join('/');

      if (!session) {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/auth/login');
        }
        return;
      }

      // Logged in: decide single redirect target
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        // If in auth or root, go to loading with next param for greetings
        if (!currentPath || currentPath === '' || currentPath.startsWith('auth') || pathname === '/' || pathname === undefined) {
          router.replace('/loading?next=/greetings');
        }
      }
    };

    handleSession();

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
