import { Stack, usePathname, useRouter, useSegments } from "expo-router";

import { useEffect } from "react";
import { supabase } from "../src/supabaseClient";

export default function RootLayout() {
  const router = useRouter();

  const pathname = usePathname();

  const segments = useSegments();


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/auth/login");
      } else {

        // Only redirect to /greetings if at root path
        if (pathname === "/" || pathname === undefined) {
          router.replace("/greetings");
        }
        // else, do nothing (let /loading or other routes handle their own flow)

        // Only redirect to loading if we're not already in the app
        const currentPath = segments.join('/');
        if (!currentPath || currentPath === '' || currentPath.startsWith('auth/')) {
          router.replace("/loading?next=/greetings"); // ✅ logged in → show loading then greetings
        }

      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace("/auth/login");
      } else {

        if (pathname === "/" || pathname === undefined) {
          router.replace("/greetings");
        }

        // Only redirect to loading on initial login or signup, not on password changes
        const currentPath = segments.join('/');
        if (event === 'SIGNED_IN' && (!currentPath || currentPath === '' || currentPath.startsWith('auth/'))) {
          router.replace("/loading?next=/greetings"); // ✅ logged in → show loading then greetings
        }
        // Don't redirect on other auth events like USER_UPDATED (password change)

      }
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Smooth, platform-standard transitions
        animation: 'slide_from_right',
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
