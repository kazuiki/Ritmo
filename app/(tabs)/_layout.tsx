import { Tabs } from "expo-router";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const { width } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 73;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => (
            <View style={styles.tabBarContainer}>
              <Svg width={width} height={TAB_BAR_HEIGHT} style={styles.svgStyle}>
                <Path
                  d={`
                    M0 0
                    H${width / 2 - 65}
                    Q${width / 2 - 47} 0 ${width / 2 - 40} 15
                    Q${width / 2 - 25} 43 ${width / 2} 43
                    Q${width / 2 + 25} 43 ${width / 2 + 40} 15
                    Q${width / 2 + 47} 0 ${width / 2 + 65} 0
                    H${width}
                    V${TAB_BAR_HEIGHT}
                    H0
                    Z
                  `}
                  fill="#2F7C72"
                />
              </Svg>
            </View>
          ),
          tabBarStyle: [
            styles.tabBar,
            { height: TAB_BAR_HEIGHT + bottomInset, paddingBottom: bottomInset },
          ],
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabItemWrapper, focused && styles.activeTabBackground]}>
                <Image
                  source={require("../../assets/images/home.png")}
                  style={styles.icon}
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
            title: "Media",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabItemWrapper, focused && styles.activeTabBackground]}>
                <Image
                  source={require("../../assets/images/media.png")}
                  style={styles.icon}
                />
                <Text style={styles.tabLabel}>Media</Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Center Add Button */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            title: "Add",
            tabBarIcon: ({ focused }) => (
              <View style={styles.centerWrapper}>
                <View style={[styles.floatingButton, focused && styles.floatingButtonActive]}>
                  <Image
                    source={require("../../assets/images/addRoutines.png")}
                    style={styles.floatingIcon}
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
            title: "Progress",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabItemWrapper, focused && styles.activeTabBackground]}>
                <Image
                  source={require("../../assets/images/progress.png")}
                  style={styles.icon}
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
            title: "Settings",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.tabItemWrapper, focused && styles.activeTabBackground]}>
                <Image
                  source={require("../../assets/images/settings.png")}
                  style={styles.icon}
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
    bottom: 0,
    width: "100%",
    height: TAB_BAR_HEIGHT,
  },
  svgStyle: {
    position: "absolute",
    bottom: 0,
  },
  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    position: "absolute",
    elevation: 0,
  },
  tabBarItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  tabItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    top: 23,
    width: 55,
    height: 50,
    borderRadius: 15,
  },
  activeTabBackground: {
    backgroundColor: "#06C08A",
  },
  icon: {
    width: 30,
    height: 30,
    tintColor: "#fff",
    resizeMode: "contain",
  },
  tabLabel: {
    color: "#fff",
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },
 centerWrapper: {
  position: "absolute",
  bottom: TAB_BAR_HEIGHT / -2, // try 1/6th or 1/4th of tab height
  alignSelf: "center",
  alignItems: "center",
  justifyContent: "center",
},
  floatingButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingButtonActive: {
    backgroundColor: "#06C08A",
  },
  floatingIcon: {
    width: 36,
    height: 36,
    tintColor: "#fff",
    resizeMode: "contain",
  },
});
