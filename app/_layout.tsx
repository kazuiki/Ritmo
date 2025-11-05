import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../src/supabaseClient";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/auth/login"); // ✅ force login first
      } else {
        router.replace("/loading?next=/greetings"); // ✅ logged in → show loading then greetings
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/auth/login");
      } else {
        router.replace("/loading?next=/greetings"); // ✅ logged in → show loading then greetings
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return <Slot />;
}
