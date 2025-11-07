import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../src/supabaseClient";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/auth/login"); // ✅ force login first
      } else {
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
        // Only redirect to loading on initial login or signup, not on password changes
        const currentPath = segments.join('/');
        if (event === 'SIGNED_IN' && (!currentPath || currentPath === '' || currentPath.startsWith('auth/'))) {
          router.replace("/loading?next=/greetings"); // ✅ logged in → show loading then greetings
        }
        // Don't redirect on other auth events like USER_UPDATED (password change)
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return <Slot />;
}
