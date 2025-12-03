import { Tabs } from "expo-router";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { ResponsiveTheme } from "../../constants/theme";
import { useResponsiveDimensions } from "../../src/utils/responsive";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";

  // Use responsive dimensions that update automatically
  const responsive = useResponsiveDimensions();
  const { width: screenWidth, scaleWidth, scaleHeight, scaleFont, scaleSpacing } = responsive;

  // Dynamic responsive sizes
  const tabItemSize = scaleWidth(50); // Responsive tab item size
  const floatingButtonSize = scaleWidth(70); // Responsive floating button
  const floatingIconSize = scaleWidth(38); // Responsive floating icon
  const tabBarHeight = scaleHeight(70) + (isAndroid ? insets.bottom : 0);
  const svgHeight = scaleHeight(140);
  
  // Device-responsive floating button position
  const getFloatingButtonTop = () => {
    if (screenWidth >= 768) { // Tablet size
      return scaleHeight(-80); // Higher position for tablets to clear curve
    }
    return scaleHeight(-40); // Original mobile position - perfect for mobile
  };
  
  // Calculate dynamic SVG path based on screen width with enhanced curves
  const getCurveParameters = () => {
    const isTablet = screenWidth >= 768;
    
    if (isTablet) {
      // More pronounced curves for tablets
      return {
        curveRadius: screenWidth * 0.22,
        curveSmallRadius: screenWidth * 0.16,
        curveOffset: screenWidth * 0.14,
        curvePeak: screenWidth * 0.09,
        curveDepth: scaleHeight(55) // Deeper curve for tablets
      };
    } else {
      // Enhanced curves for mobile
      return {
        curveRadius: screenWidth * 0.20,
        curveSmallRadius: screenWidth * 0.15,
        curveOffset: screenWidth * 0.13,
        curvePeak: screenWidth * 0.08,
        curveDepth: scaleHeight(43) // Standard depth for mobile
      };
    }
  };
  
  const { curveRadius, curveSmallRadius, curveOffset, curvePeak, curveDepth } = getCurveParameters();

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarBackground: () => (
            <View style={[styles.tabBarContainer, { height: svgHeight }]}>
              <Svg width={screenWidth} height={svgHeight} style={styles.svgStyle}>
                <Path
                  d={`
                    M0 0
                    H${screenWidth / 2 - curveRadius}
                    Q${screenWidth / 2 - curveSmallRadius} 0 ${
                    screenWidth / 2 - curveOffset
                  } ${scaleHeight(15)}
                    Q${screenWidth / 2 - curvePeak} ${curveDepth} ${
                    screenWidth / 2
                  } ${curveDepth}
                    Q${screenWidth / 2 + curvePeak} ${curveDepth} ${
                    screenWidth / 2 + curveOffset
                  } ${scaleHeight(15)}
                    Q${screenWidth / 2 + curveSmallRadius} 0 ${
                    screenWidth / 2 + curveRadius
                  } 0
                    H${screenWidth}
                    V${scaleHeight(150)}
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
            height: tabBarHeight,
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
                  { 
                    width: tabItemSize, 
                    height: tabItemSize,
                    borderRadius: scaleSpacing(15),
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/home.png")}
                  style={[
                    styles.icon, 
                    { 
                      width: tabItemSize * 0.55, 
                      height: tabItemSize * 0.55 
                    }
                  ]}
                />
                <Text style={[styles.tabLabel, { fontSize: scaleFont(10) }]}>Home</Text>
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
                  { 
                    width: tabItemSize, 
                    height: tabItemSize,
                    borderRadius: scaleSpacing(15),
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/media.png")}
                  style={[
                    styles.icon, 
                    { 
                      width: tabItemSize * 0.55, 
                      height: tabItemSize * 0.55 
                    }
                  ]}
                />
                <Text style={[styles.tabLabel, { fontSize: scaleFont(10) }]}>Media</Text>
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
              <View style={[styles.centerWrapper, { top: getFloatingButtonTop() }]}>
                <View
                  style={[
                    styles.floatingButton,
                    { 
                      width: floatingButtonSize, 
                      height: floatingButtonSize, 
                      borderRadius: floatingButtonSize / 2,
                      shadowRadius: scaleHeight(12),
                      shadowOffset: { width: 0, height: scaleHeight(8) },
                    },
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
                  { 
                    width: tabItemSize, 
                    height: tabItemSize,
                    borderRadius: scaleSpacing(15),
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/progress.png")}
                  style={[
                    styles.icon, 
                    { 
                      width: tabItemSize * 0.55, 
                      height: tabItemSize * 0.55 
                    }
                  ]}
                />
                <Text style={[styles.tabLabel, { fontSize: scaleFont(10) }]}>Progress</Text>
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
                  { 
                    width: tabItemSize, 
                    height: tabItemSize,
                    borderRadius: scaleSpacing(15),
                  },
                ]}
              >
                <Image
                  source={require("../../assets/images/settings.png")}
                  style={[
                    styles.icon, 
                    { 
                      width: tabItemSize * 0.55, 
                      height: tabItemSize * 0.55 
                    }
                  ]}
                />
                <Text style={[styles.tabLabel, { fontSize: scaleFont(10) }]}>Settings</Text>
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
    top: ResponsiveTheme.spacing.md,
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
    marginTop: 2,
    fontWeight: "600",
  },
  centerWrapper: {
    position: "absolute",
    alignSelf: "center",
  },
  floatingButton: {
    backgroundColor: "#2F7C72",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    elevation: 8,
  },
  floatingButtonActive: {
    backgroundColor: "#06C08A",
  },
});