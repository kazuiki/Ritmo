import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResponsiveTheme } from "../../constants/theme";
import { useMode } from "../../src/contexts/ModeContext";
import { useResponsiveDimensions } from "../../src/utils/responsive";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  const router = useRouter();
  const pathname = usePathname();
  const { mode, parentalLockEnabled } = useMode();

  const responsive = useResponsiveDimensions();
  const {
    width: screenWidth,
    scaleWidth,
    scaleHeight,
    scaleFont,
    scaleSpacing,
  } = responsive;

  const tabItemSize = scaleWidth(50);
  const floatingButtonSize = scaleWidth(70);
  const floatingIconSize = scaleWidth(38);
  const tabBarHeight = scaleHeight(70) + (isAndroid ? insets.bottom : 0);
  const curveDepth = scaleHeight(50);

  const showFloatingButton = !parentalLockEnabled;
  const isChildMode = parentalLockEnabled && mode === "child";
  const isParentMode = parentalLockEnabled && mode === "parent";

  const getFloatingButtonTop = () => {
    const bottomInset = isAndroid ? -insets.bottom / 2 : 0;
    return scaleHeight(-35) + bottomInset;
  };

  const parentTabIndex = pathname.includes("/addRoutines")
    ? 0
    : pathname.includes("/progress")
    ? 1
    : pathname.includes("/settings")
    ? 2
    : 0;

  const parentSlideAnim = useRef(
    new Animated.Value(parentTabIndex)
  ).current;

  useEffect(() => {
    if (isParentMode) {
      Animated.spring(parentSlideAnim, {
        toValue: parentTabIndex,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [parentTabIndex, isParentMode]);

  const parentIndicatorTranslateX = parentSlideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      0,
      (screenWidth * 0.9) / 3,
      ((screenWidth * 0.9) / 3) * 2,
    ],
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarBackground: () =>
            showFloatingButton ? (
              <View style={[styles.tabBarContainer, { height: curveDepth }]}>
                {/* Main bar */}
                <View style={styles.fakeCurveBar} />

                {/* Center cutout illusion */}
                <View
                  style={[
                    styles.fakeCurveCutout,
                    {
                      width: floatingButtonSize + 20,
                      height: floatingButtonSize + 20,
                      borderRadius: (floatingButtonSize + 20) / 2,
                      left:
                        screenWidth / 2 -
                        (floatingButtonSize + 20) / 2,
                      top: -floatingButtonSize / 2,
                    },
                  ]}
                />
              </View>
            ) : isParentMode ? (
              <View
                style={[
                  styles.tabBarContainer,
                  { height: tabBarHeight },
                ]}
              >
                <View style={styles.parentPill}>
                  <Animated.View
                    style={[
                      styles.parentIndicator,
                      { transform: [{ translateX: parentIndicatorTranslateX }] },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.tabBarContainer,
                  { height: tabBarHeight },
                ]}
              />
            ),

          tabBarStyle: {
            ...styles.tabBar,
            height: tabBarHeight,
            paddingBottom: isAndroid ? insets.bottom : 0,
            backgroundColor: "transparent",
          },

          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            width: isParentMode
              ? (screenWidth * 0.9) / 3
              : screenWidth / 5,
            height: isParentMode ? scaleHeight(85) : "auto",
          },
        }}
      >
        {/* YOUR Tabs.Screen DEFINITIONS REMAIN UNCHANGED */}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  fakeCurveBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
    backgroundColor: "#2F7C72",
  },

  fakeCurveCutout: {
    position: "absolute",
    backgroundColor: "#E8FFFA",
  },

  parentPill: {
    position: "absolute",
    bottom: 25,
    left: "5%",
    width: "90%",
    height: 85,
    backgroundColor: "#2F7C72",
    borderRadius: 42.5,
  },

  parentIndicator: {
    position: "absolute",
    left: 0,
    width: "33.33%",
    height: "100%",
    backgroundColor: "#5DD4B4",
    borderRadius: 42.5,
  },

  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    elevation: 0,
  },

  tabItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    top: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
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
