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

  // Track dimension changes (orientation, device size)
  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  // Dynamic sizes
  const tabItemSize = screenWidth * 0.13; // icons + container
  const floatingButtonSize = screenWidth * 0.18;
  const floatingIconSize = screenWidth * 0.10;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarBackground: () => (
            <View style={styles.tabBarContainer}>
              <Svg width={screenWidth} height={140} style={styles.svgStyle}>
                <Path
                  d={`
                    M0 0
                    H${screenWidth / 2 - screenWidth * 0.18}
                    Q${screenWidth / 2 - screenWidth * 0.13} 0 ${
                    screenWidth / 2 - screenWidth * 0.11
                  } 15
                    Q${screenWidth / 2 - screenWidth * 0.07} 43 ${
                    screenWidth / 2
                  } 43
                    Q${screenWidth / 2 + screenWidth * 0.07} 43 ${
                    screenWidth / 2 + screenWidth * 0.11
                  } 15
                    Q${screenWidth / 2 + screenWidth * 0.13} 0 ${
                    screenWidth / 2 + screenWidth * 0.18
                  } 0
                    H${screenWidth}
                    V150
                    H0
                    Z
                  `}
                  fill="#2F7C72"
                />
              </Svg>
            </View>
          ),

          tabBarStyle: {
            ...styles.tabBar,
            height: 70 + (isAndroid ? insets.bottom : 0),
            paddingBottom: isAndroid ? insets.bottom : 0,
          },

          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            width: screenWidth / 5,
          },
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
                  { width: tabItemSize, height: tabItemSize },
                ]}
              >
                <Image
                  source={require("../../assets/images/home.png")}
                  style={[styles.icon, { width: tabItemSize * 0.55, height: tabItemSize * 0.55 }]}
                />
                <Text style={styles.tabLabel}>Home</Text>
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
                  { width: tabItemSize, height: tabItemSize },
                ]}
              >
                <Image
                  source={require("../../assets/images/media.png")}
                  style={[styles.icon, { width: tabItemSize * 0.55, height: tabItemSize * 0.55 }]}
                />
                <Text style={styles.tabLabel}>Media</Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Floating Add Button */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={styles.centerWrapper}>
                <View
                  style={[
                    styles.floatingButton,
                    { width: floatingButtonSize, height: floatingButtonSize, borderRadius: floatingButtonSize / 2 },
                    focused && styles.floatingButtonActive,
                  ]}
                >
                  <Image
                    source={require("../../assets/images/addRoutines.png")}
                    style={{
                      width: floatingIconSize,
                      height: floatingIconSize,
                      tintColor: "#fff",
                    }}
                  />
                </View>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Progress */}
        <Tabs.Screen
          name="progress"
          options={{
            tabBarIcon: ({ focused }) => (
              <View
                style={[
                  styles.tabItemWrapper,
                  focused && styles.activeTabBackground,
                  { width: tabItemSize, height: tabItemSize },
                ]}
              >
                <Image
                  source={require("../../assets/images/progress.png")}
                  style={[styles.icon, { width: tabItemSize * 0.55, height: tabItemSize * 0.55 }]}
                />
                <Text style={styles.tabLabel}>Progress</Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Settings */}
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <View
                style={[
                  styles.tabItemWrapper,
                  focused && styles.activeTabBackground,
                  { width: tabItemSize, height: tabItemSize },
                ]}
              >
                <Image
                  source={require("../../assets/images/settings.png")}
                  style={[styles.icon, { width: tabItemSize * 0.55, height: tabItemSize * 0.55 }]}
                />
                <Text style={styles.tabLabel}>Settings</Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    height: 150,
  },
  svgStyle: {
    position: "absolute",
    bottom: 0,
  },
  tabBar: {
    backgroundColor: "transparent",
    position: "absolute",
    borderTopWidth: 0,
    elevation: 0,
  },
  tabItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    top: 20,
    borderRadius: 15,
  },
  activeTabBackground: {
    backgroundColor: "#06C08A",
  },
  icon: {
    tintColor: "#fff",
    resizeMode: "contain",
  },
  tabLabel: {
    color: "#fff",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },
  centerWrapper: {
    position: "absolute",
    top: -28,
    alignSelf: "center",
  },
  floatingButton: {
    backgroundColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonActive: {
    backgroundColor: "#06C08A",
  },
});
