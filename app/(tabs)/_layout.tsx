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
import { scaleFont } from "../../utils/scaler";


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

  // ===============================
  // PERFECT RESPONSIVE MEASUREMENTS
  // ===============================
  const TAB_HEIGHT = 65;
  const FAB_SIZE = 75;

  const CUTOUT_RADIUS = FAB_SIZE * 0.55;
  const SVG_HEIGHT = CUTOUT_RADIUS + 20;

  const tabItem = W * 0.11;
  const iconSize = W * 0.055;
  const fab = FAB_SIZE;
  const fabIcon = W * 0.10;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarBackground: () => (
            <View
              style={{
                position: "absolute",
                width: W,
                height: SVG_HEIGHT,
                bottom: 0,
              }}
            >
              <Svg width={W} height={SVG_HEIGHT}>
                <Path
                  d={`
                    M0 0
                    H${(W / 2) - CUTOUT_RADIUS - 20}

                    C ${(W / 2) - CUTOUT_RADIUS - 5} 0,
                      ${(W / 2) - CUTOUT_RADIUS} ${CUTOUT_RADIUS * 0.35},
                      ${W / 2 - CUTOUT_RADIUS * 0.60} ${CUTOUT_RADIUS * 0.85}

                    C ${(W / 2) - CUTOUT_RADIUS * 0.25} ${CUTOUT_RADIUS * 1.25},
                      ${(W / 2) + CUTOUT_RADIUS * 0.25} ${CUTOUT_RADIUS * 1.25},
                      ${(W / 2) + CUTOUT_RADIUS * 0.60} ${CUTOUT_RADIUS * 0.85}

                    C ${(W / 2) + CUTOUT_RADIUS} ${CUTOUT_RADIUS * 0.35},
                      ${(W / 2) + CUTOUT_RADIUS + 5} 0,
                      ${(W / 2) + CUTOUT_RADIUS + 20} 0

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
            height: TAB_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
          },

          tabBarItemStyle: {
            justifyContent: "flex-start",
            alignItems: "center",
            width: W / 5,
            paddingTop: 5,
          },
        }}
      >
        {/* HOME */}
        <Tabs.Screen
          name="home"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                size={tabItem}
                iconSize={iconSize}
                label="Home"
                icon={require("../../assets/images/home.png")}
              />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* MEDIA */}
        <Tabs.Screen
          name="media"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                size={tabItem}
                iconSize={iconSize}
                label="Media"
                icon={require("../../assets/images/media.png")}
              />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* CENTER FAB */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            tabBarIcon: () => (
              <View style={{ position: "absolute", top: -fab * 0.38 }}>
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
                    style={{
                      width: fabIcon,
                      height: fabIcon,
                      tintColor: "#fff",
                    }}
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
              <TabItem
                focused={focused}
                size={tabItem}
                iconSize={iconSize}
                label="Progress"
                icon={require("../../assets/images/progress.png")}
              />
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* SETTINGS */}
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabItem
                focused={focused}
                size={tabItem}
                iconSize={iconSize}
                label="Settings"
                icon={require("../../assets/images/settings.png")}
              />
            ),
            tabBarLabel: () => null,
          }}
        />
      </Tabs>
    </View>
  );
}

function TabItem({ focused, size, iconSize, label, icon }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={icon}
        style={{
          width: iconSize,
          height: iconSize,
          tintColor: focused ? "#06C08A" : "#fff",
        }}
      />
      <Text
  style={{
    color: "#fff",
    fontSize: scaleFont(11),
    marginTop: 2,
    fontWeight: "600",
  }}
>
  {label}
</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    backgroundColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
