import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";

  const [layout, setLayout] = useState(Dimensions.get("window"));

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setLayout(window);
    });
    return () => sub?.remove();
  }, []);

  const { width: W, height: H } = layout;

  // Responsive measurements
  const tabItem = W * 0.13;
  const fab = W * 0.18;
  const fabIcon = W * 0.10;

  // Responsive SVG height
  const SVG_HEIGHT = W * 0.33;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarBackground: () => (
            <View style={{ height: SVG_HEIGHT, position: "absolute", width: W }}>
              <Svg width={W} height={SVG_HEIGHT} style={{ position: "absolute", bottom: 0 }}>
                <Path
                  d={`
                    M0 0
                    H${W * 0.31}
                    Q${W * 0.36} 0 ${W * 0.39} ${SVG_HEIGHT * 0.15}
                    Q${W * 0.44} ${SVG_HEIGHT * 0.38} ${W * 0.50} ${SVG_HEIGHT * 0.38}
                    Q${W * 0.56} ${SVG_HEIGHT * 0.38} ${W * 0.61} ${SVG_HEIGHT * 0.15}
                    Q${W * 0.64} 0 ${W * 0.69} 0
                    H${W}
                    V${SVG_HEIGHT}
                    H0
                    Z
                  `}
                  fill="#2F7C72"
                />
              </Svg>
            </View>
          ),

          tabBarStyle: {
            backgroundColor: "transparent",
            position: "absolute",
            borderTopWidth: 0,
            height: (H * 0.10) + (isAndroid ? insets.bottom : 0),
            paddingBottom: isAndroid ? insets.bottom : 0,
          },

          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            width: W / 5,
          },
        }}
      >
        {/* HOME */}
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem focused={focused} size={tabItem} label="Home" icon={require("../../assets/images/home.png")} />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* MEDIA */}
        <Tabs.Screen
          name="media"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem focused={focused} size={tabItem} label="Media" icon={require("../../assets/images/media.png")} />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* CENTER FAB */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            tabBarIcon: () => (
              <View style={{ position: "absolute", top: -fab * 0.35, alignSelf: "center" }}>
                <View
                  style={[
                    styles.floatingButton,
                    {
                      width: fab,
                      height: fab,
                      borderRadius: fab / 2,
                    },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/addRoutines.png")}
                    style={{ width: fabIcon, height: fabIcon, tintColor: "#fff" }}
                  />
                </View>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* PROGRESS */}
        <Tabs.Screen
          name="progress"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem focused={focused} size={tabItem} label="Progress" icon={require("../../assets/images/progress.png")} />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* SETTINGS */}
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem focused={focused} size={tabItem} label="Settings" icon={require("../../assets/images/settings.png")} />
            ),
            tabBarLabel: () => null,
          }}
        />
      </Tabs>
    </View>
  );
}

function TabItem({ focused, size, label, icon }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size * 1.1,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 15,
        },
        focused && { backgroundColor: "#06C08A" },
      ]}
    >
      <Image
        source={icon}
        style={{ width: size * 0.55, height: size * 0.55, tintColor: "#fff" }}
      />
      <Text style={styles.tabLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    backgroundColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabLabel: {
    color: "#fff",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },
});
