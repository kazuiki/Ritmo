import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../../src/supabaseClient";

export default function AuthLayout() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) {
        const child = (user.user_metadata as any)?.child_name;
        if (!child) {
          router.replace("/auth/child-nickname"); // ✅ go here first if new
        } else {
          router.replace("/(tabs)/home"); // ✅ already has nickname
        }
      }
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}