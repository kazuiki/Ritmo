import { Tabs } from "expo-router";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveDimensions } from "../../src/utils/responsive";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  const responsive = useResponsiveDimensions();
  const { scaleFont } = responsive;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#2F7C72",
            borderTopWidth: 0,
            height: 90 + (isAndroid ? insets.bottom : 20),
            paddingBottom: isAndroid ? insets.bottom : 15,
            paddingTop: 15,
          },
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "#fff",
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <View
                style={[
                  styles.tabItemWrapper,
                  focused && styles.activeTabBackground,
                ]}
              >
                <Image
                  source={require("../../assets/images/home.png")}
                  style={styles.icon}
                />
                <Text style={[styles.tabLabel, { fontSize: scaleFont(12) }]} numberOfLines={1}>
                  Home
                </Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Media */}
        <Tabs.Screen
          name="media"
          options={{
            tabBarIcon: ({ focused }) => (
              <View
                style={[
                  styles.tabItemWrapper,
                  focused && styles.activeTabBackground,
                ]}
              >
                <Image
                  source={require("../../assets/images/media.png")}
                  style={styles.icon}
                />
                <Text style={[styles.tabLabel, { fontSize: scaleFont(12) }]} numberOfLines={1}>
                  Media
                </Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Hidden Screens */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="progress"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="account-setting"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 90,
    flexShrink: 0,
    marginTop: 25,
  },
  activeTabBackground: {
    backgroundColor: "#06C08A",
    borderRadius: 0,
    paddingHorizontal: 50,
    paddingVertical: 20,
    width: 160,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  icon: {
    width: 28,
    height: 28,
    tintColor: "#fff",
    resizeMode: "contain",
    marginBottom: 4,
  },
  tabLabel: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});