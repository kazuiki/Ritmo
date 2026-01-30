import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { ResponsiveTheme } from "../../constants/theme";
import { useMode } from "../../src/contexts/ModeContext";
import { useResponsiveDimensions } from "../../src/utils/responsive";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === "android";
  const router = useRouter();
  const pathname = usePathname();
  const { mode, parentalLockEnabled, enterParentMode, backToChildMode } = useMode();

  const responsive = useResponsiveDimensions();
  const { width: screenWidth, scaleWidth, scaleHeight, scaleFont, scaleSpacing } = responsive;

  const tabItemSize = scaleWidth(50); 
  const floatingButtonSize = scaleWidth(70); 
  const floatingIconSize = scaleWidth(38); 
  const tabBarHeight = scaleHeight(70) + (isAndroid ? insets.bottom : 0);
  const svgHeight = scaleHeight(140);
  
  // Determine which tabs to show based on mode and lock state
  const showFloatingButton = !parentalLockEnabled; // Scenario B: lock OFF
  const isChildMode = parentalLockEnabled && mode === 'child'; // Scenario A - Child
  const isParentMode = parentalLockEnabled && mode === 'parent'; // Scenario A - Parent

  // Debug log to verify mode changes
  console.log('🔄 Tab Layout State:', { mode, parentalLockEnabled, isChildMode, isParentMode, showFloatingButton });
  
  const getFloatingButtonTop = () => {
    const bottomInset = isAndroid ? insets.bottom * 0.-5 : 0;
    
    if (screenWidth >= 768) {
      return scaleHeight(-75) + bottomInset; 
    }
    return scaleHeight(-35) + bottomInset; 
  };
  
  const getCurveParameters = () => {
    const isTablet = screenWidth >= 768;
    
    if (isTablet) {
      return {
        curveRadius: screenWidth * 0.22,
        curveSmallRadius: screenWidth * 0.16,
        curveOffset: screenWidth * 0.14,
        curvePeak: screenWidth * 0.09,
        curveDepth: scaleHeight(60) 
      };
    } else {
      return {
        curveRadius: screenWidth * 0.20,
        curveSmallRadius: screenWidth * 0.15,
        curveOffset: screenWidth * 0.13,
        curvePeak: screenWidth * 0.08,
        curveDepth: scaleHeight(50) 
      };
    }
  };
  
  const { curveRadius, curveSmallRadius, curveOffset, curvePeak, curveDepth } = getCurveParameters();

  // Animated tab indicator for parent mode
  const parentTabIndex = pathname.includes('/addRoutines') ? 0 : pathname.includes('/progress') ? 1 : pathname.includes('/settings') ? 2 : 0;
  const parentSlideAnim = useRef(new Animated.Value(parentTabIndex)).current;

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
    outputRange: [0, (screenWidth * 0.9) / 3, ((screenWidth * 0.9) / 3) * 2],
  });

  // Custom Pill Tab Bar for Child Mode
  const CustomPillTabBar = ({ state }: any) => {
    const slideAnim = useRef(new Animated.Value(state.index === 0 ? 0 : 1)).current;

    useEffect(() => {
      Animated.spring(slideAnim, {
        toValue: state.index,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start();
    }, [state.index]);

    const indicatorTranslateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, (screenWidth * 0.9) / 2],
    });

    return (
      <View style={{
        position: 'absolute',
        bottom: scaleHeight(25),
        left: screenWidth * 0.05,
        width: screenWidth * 0.9,
        height: scaleHeight(85),
        backgroundColor: '#2F7C72',
        borderRadius: scaleSpacing(42.5),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 0,
      }}>
        {/* Animated Active Tab Background */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            width: (screenWidth * 0.9) / 2,
            height: scaleHeight(85),
            backgroundColor: '#5DD4B4',
            borderRadius: scaleSpacing(42.5),
            transform: [{ translateX: indicatorTranslateX }],
          }}
        />

        {/* Home Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/home')}
          style={{
            flex: 1,
            height: scaleHeight(85),
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/home.png")}
            style={{
              width: scaleWidth(30),
              height: scaleHeight(30),
              tintColor: '#fff',
            }}
          />
          <Text numberOfLines={1} style={{ color: '#fff', fontSize: scaleFont(14), fontWeight: '600' }}>Home</Text>
        </TouchableOpacity>

        {/* Media Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/media')}
          style={{
            flex: 1,
            height: scaleHeight(85),
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/media.png")}
            style={{
              width: scaleWidth(30),
              height: scaleHeight(30),
              tintColor: '#fff',
            }}
          />
          <Text numberOfLines={1} style={{ color: '#fff', fontSize: scaleFont(14), fontWeight: '600' }}>Media</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#E8FFFA" }}>
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarBackground: () => (
            showFloatingButton ? (
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
            ) : isParentMode ? (
              <View style={[styles.tabBarContainer, { height: tabBarHeight, backgroundColor: 'transparent' }]}>
                <View style={{
                  position: 'absolute',
                  bottom: scaleHeight(25),
                  left: screenWidth * 0.05,
                  width: screenWidth * 0.9,
                  height: scaleHeight(85),
                  backgroundColor: '#2F7C72',
                  borderRadius: scaleSpacing(42.5),
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 0,
                }}>
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: (screenWidth * 0.9) / 3,
                      height: scaleHeight(85),
                      backgroundColor: '#5DD4B4',
                      borderRadius: scaleSpacing(42.5),
                      transform: [{ translateX: parentIndicatorTranslateX }],
                    }}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.tabBarContainer, { height: tabBarHeight, backgroundColor: 'transparent' }]} />
            )
          ),

          tabBarStyle: {
            ...styles.tabBar,
            height: tabBarHeight,
            paddingBottom: isAndroid ? insets.bottom : 0,
            backgroundColor: 'transparent',
          },

          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            width: isParentMode ? (screenWidth * 0.9) / 3 : screenWidth / 5,
            height: isParentMode ? scaleHeight(85) : 'auto',
          },
        }}
      >
        {/* Home - Only in Child Mode or Unlocked */}
        <Tabs.Screen
          name="home"
          options={{
            href: (isChildMode || showFloatingButton) ? '/(tabs)/home' : null,
            tabBarIcon: ({ focused }) => (
              isChildMode ? null : (
                <View
                  style={[
                    styles.tabItemWrapper,
                    { 
                      width: tabItemSize * 1.3, 
                      height: tabItemSize,
                      borderRadius: scaleSpacing(15),
                      backgroundColor: focused ? '#5DD4B4' : 'transparent',
                    },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/home.png")}
                    style={[
                      styles.icon, 
                      { 
                        width: tabItemSize * 0.45, 
                        height: tabItemSize * 0.45 
                      }
                    ]}
                  />
                  <Text numberOfLines={1} style={[styles.tabLabel, { fontSize: scaleFont(8) }]}>Home</Text>
                </View>
              )
              ),
              tabBarLabel: () => null,
            }}
          />

        {/* Media - Only in Child Mode or Unlocked */}
        <Tabs.Screen
          name="media"
          options={{
            href: (isChildMode || showFloatingButton) ? '/(tabs)/media' : null,
            tabBarIcon: ({ focused }) => (
              isChildMode ? null : (
                <View
                  style={[
                    styles.tabItemWrapper,
                    { 
                      width: tabItemSize * 1.3, 
                      height: tabItemSize,
                      borderRadius: scaleSpacing(15),
                      backgroundColor: focused ? '#5DD4B4' : 'transparent',
                    },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/media.png")}
                    style={[
                      styles.icon, 
                      { 
                        width: tabItemSize * 0.45, 
                        height: tabItemSize * 0.45 
                      }
                    ]}
                  />
                  <Text numberOfLines={1} style={[styles.tabLabel, { fontSize: scaleFont(8) }]}>Media</Text>
                </View>
              )
              ),
              tabBarLabel: () => null,
            }}
          />

        {/* Add Routines - Different rendering based on mode */}
        <Tabs.Screen
          name="addRoutines"
          options={{
            href: isParentMode || showFloatingButton ? '/(tabs)/addRoutines' : null,
            tabBarIcon: ({ focused }) => (
              showFloatingButton ? (
                // Scenario B: Floating button when lock is OFF
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
              ) : (
                // Scenario A (Parent Mode): Regular pill-style tab
                <View
                  style={{
                    flex: 1,
                    width: '100%',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: scaleSpacing(3),
                    zIndex: 1,
                  }}
                >
                  <Image
                    source={require("../../assets/images/addRoutines.png")}
                    style={{
                      width: scaleWidth(28),
                      height: scaleHeight(28),
                      tintColor: '#fff',
                    }}
                  />
                  <Text style={{ color: '#fff', fontSize: scaleFont(9), fontWeight: '600', textAlign: 'center' }}>Add</Text>
                </View>
              )
            ),
            tabBarLabel: () => null,
          }}
        />

        {/* Progress - Only in Parent Mode or Unlocked */}
        <Tabs.Screen
          name="progress"
          options={{
            href: (isParentMode || showFloatingButton) ? '/(tabs)/progress' : null,
              tabBarIcon: ({ focused }) => (
                showFloatingButton ? (
                  <View
                    style={[
                      styles.tabItemWrapper,
                      { 
                        width: tabItemSize * 1.3, 
                        height: tabItemSize,
                        borderRadius: scaleSpacing(15),
                        backgroundColor: focused ? '#5DD4B4' : 'transparent',
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/progress.png")}
                      style={[
                        styles.icon, 
                        { 
                          width: tabItemSize * 0.45, 
                          height: tabItemSize * 0.45 
                        }
                      ]}
                    />
                    <Text numberOfLines={1} style={[styles.tabLabel, { fontSize: scaleFont(8) }]}>Progress</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scaleSpacing(3),
                      zIndex: 1,
                    }}
                  >
                    <Image
                      source={require("../../assets/images/progress.png")}
                      style={{
                        width: scaleWidth(28),
                        height: scaleHeight(28),
                        tintColor: '#fff',
                      }}
                    />
                    <Text style={{ color: '#fff', fontSize: scaleFont(7), fontWeight: '600', textAlign: 'center' }}>Progress</Text>
                  </View>
                )
              ),
              tabBarLabel: () => null,
            }}
          />

        {/* Settings - Only in Parent Mode or Unlocked */}
        <Tabs.Screen
          name="settings"
          options={{
            href: (isParentMode || showFloatingButton) ? '/(tabs)/settings' : null,
            tabBarIcon: ({ focused }) => (
                showFloatingButton ? (
                  <View
                    style={[
                      styles.tabItemWrapper,
                      { 
                        width: tabItemSize * 1.3, 
                        height: tabItemSize,
                        borderRadius: scaleSpacing(15),
                        backgroundColor: focused ? '#5DD4B4' : 'transparent',
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/settings.png")}
                      style={[
                        styles.icon, 
                        { 
                          width: tabItemSize * 0.45, 
                          height: tabItemSize * 0.45 
                        }
                      ]}
                    />
                    <Text numberOfLines={1} style={[styles.tabLabel, { fontSize: scaleFont(7) }]}>Settings</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scaleSpacing(3),
                      zIndex: 1,
                    }}
                  >
                    <Image
                      source={require("../../assets/images/settings.png")}
                      style={{
                        width: scaleWidth(28),
                        height: scaleHeight(28),
                        tintColor: '#fff',
                      }}
                    />
                    <Text style={{ color: '#fff', fontSize: scaleFont(7), fontWeight: '600', textAlign: 'center' }}>Settings</Text>
                  </View>
                )
              ),
              tabBarLabel: () => null,
            }}
          />
      </Tabs>
      {isChildMode && <CustomPillTabBar state={{ index: pathname.includes('/home') ? 0 : pathname.includes('/media') ? 1 : 0 }} />}
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  activeTabBackground: {
    backgroundColor: "#5DD4B4",
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