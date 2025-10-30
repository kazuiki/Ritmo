// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
          tabBarActiveTintColor: "#06C08A",
          tabBarInactiveTintColor: "#666",
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: "Media",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={22} color={color} />
          ),
          tabBarActiveTintColor: "#06C08A",
          tabBarInactiveTintColor: "#666",
        }}
      />

      {/* Floating center button */}
      <Tabs.Screen
  name="addRoutines"
  options={{
    title: "Add Routines",
    tabBarButton: (props) => {
      // Override null disabled
      const { disabled, ref, ...rest } = props;
      return (
        <TouchableOpacity
          {...rest}
          disabled={disabled ?? false} // ensure boolean
          style={styles.floatingButton}
        >
          <Ionicons name="calendar" size={28} color="#fff" />
        </TouchableOpacity>
      );
    },
  }}
/>

      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={22} color={color} />
          ),
          tabBarActiveTintColor: "#06C08A",
          tabBarInactiveTintColor: "#666",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={22} color={color} />
          ),
          tabBarActiveTintColor: "#06C08A",
          tabBarInactiveTintColor: "#666",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 8,
    backgroundColor: "#2F7C72", // change to your nav color
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingButton: {
    backgroundColor: "#06C08A",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30, // makes it "float"
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
