import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { supabase } from "../../src/supabaseClient";

export default function AuthLayout() {
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user && !redirectedRef.current) {
        redirectedRef.current = true;
        const child = (user.user_metadata as any)?.child_name;
        // Always go through loading → greetings flow for consistency
        if (!child) router.replace('/auth/child-nickname');
        else router.replace('/loading?next=/greetings');
      }
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#E8FFFA' } }} />;
}