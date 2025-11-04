// app/greetings.tsx
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { supabase } from "../src/supabaseClient";

export default function Greeting() {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      // ✅ Force refresh to get latest user metadata
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching user:", error.message);
      }

      if (user) {
        const meta = user.user_metadata || {};
        setName(meta.child_name ?? "Kid");
      }

      // ✅ Give time to show greeting, then go home
      setTimeout(() => router.replace("/(tabs)/home"), 1800);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/ritmo-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.sun}>☀️</Text>
      <Text style={styles.text}>Good Morning, {name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8FFFA",
    justifyContent: "center",
    alignItems: "center",
  },
  sun: {
    fontSize: 48,
  },
  text: {
    fontSize: 26,
    color: "#264D47",
    fontWeight: "700",
    marginTop: 8,
  },
  logo: {
    width: 260,
    height: 220,
    marginTop: -6,
  },
});
