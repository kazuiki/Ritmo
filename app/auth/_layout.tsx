import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { getParentHelpName } from "../../src/parentRoleService";
import { supabase } from "../../src/supabaseClient";

export default function AuthLayout() {
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const routeIfNeeded = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user || redirectedRef.current || isCancelled) return;

      const child = (user.user_metadata as any)?.child_name;
      const parentHelpName = (user.user_metadata as any)?.parent_help_name;

      // Always go through loading → greetings flow for consistency
      if (child) return;

      redirectedRef.current = true;

      if (typeof parentHelpName === 'string' && parentHelpName.trim()) {
        router.replace('/auth/child-nickname');
        return;
      }

      const localOrCloudHelpName = await getParentHelpName();
      if (isCancelled) return;

      if (localOrCloudHelpName) {
        router.replace('/auth/child-nickname');
        return;
      }

      router.replace('/auth/parent-role');
    };

    void routeIfNeeded();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void routeIfNeeded();
    });

    return () => {
      isCancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#E8FFFA' } }} />;
}