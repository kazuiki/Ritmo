
import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../src/supabaseClient";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

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
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/auth/login");
      } else {
        if (pathname === "/" || pathname === undefined) {
          router.replace("/greetings");
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname]);

  return <Slot />;
}
