import { Tabs } from "expo-router";
import { Dimensions, Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const { width } = Dimensions.get("window");
const tabWidth = width / 5; 

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  const androidBottomInset = isAndroid ? insets.bottom : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => (
            <View style={styles.tabBarContainer}>
              <Svg width={width} height={138} style={styles.svgStyle}>
                 <Path
                    d={`
                      M0 0
                      H${width / 2 - 65}
                      Q${width / 2 - 47} 0 ${width / 2 - 40} 15
                      Q${width / 2 - 25} 43 ${width / 2} 43
                      Q${width / 2 + 25} 43 ${width / 2 + 40} 15
                      Q${width / 2 + 47} 0 ${width / 2 + 65} 0
                      H${width}
                      V150
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
            isAndroid && androidBottomInset > 0
              ? { height: 70 + androidBottomInset, paddingBottom: androidBottomInset }
              : null,
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
                <Text style={styles.tabLabel}>Media</Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Center Floating Button */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            title: "Add",
            tabBarIcon: ({ focused }) => (
              <View style={styles.centerWrapper}>
                <View
                  style={[
                    styles.floatingButton,
                    focused && styles.floatingButtonActive,
                  ]}
                >
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
              <View
                style={[
                  styles.tabItemWrapper,
                  focused && styles.activeTabBackground,
                ]}
              >
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
              <View
                style={[
                  styles.tabItemWrapper,
                  focused && styles.activeTabBackground,
                ]}
              >
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
    top: -27,
    alignSelf: "center",
  },
  floatingButton: {
    width: 70,
    height: 70,
    borderRadius: 37.5,
    backgroundColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 1,
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