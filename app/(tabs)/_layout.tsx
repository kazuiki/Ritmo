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

  const floatingButtonSize = scaleWidth(70);
  const floatingIconSize = scaleWidth(38);
  const svgHeight = scaleHeight(140);
  const navBarBottom = scaleHeight(25) + insets.bottom;
  const childNavBarBottom = navBarBottom - scaleHeight(6);
  
  const isTablet = screenWidth >= 768;
  const isLargeTablet = screenWidth >= 1024;
  
  // Responsive navbar height calculation
  const getTabBarHeight = () => {
    if (isLargeTablet) {
      return scaleHeight(90) + insets.bottom;
    } else if (isTablet) {
      return scaleHeight(85) + insets.bottom;
    } else {
      return scaleHeight(75) + insets.bottom;
    }
  };
  
  const tabBarHeight = getTabBarHeight();
  
  // Unified styling for both parent and child modes
  const getPillTabBarHeight = () => {
    if (isLargeTablet) return scaleHeight(95);
    if (isTablet) return scaleHeight(90);
    return scaleHeight(80);
  };
  
  const pillTabBarHeight = getPillTabBarHeight();
  const pillTabBarWidth = screenWidth * 0.9;
  const pillTabBarLeft = screenWidth * 0.05;
  const pillTabBarRadius = scaleSpacing(40);
  
  // Responsive icon and text sizing
  const getTabIconSize = () => {
    if (isLargeTablet) return scaleWidth(36);
    if (isTablet) return scaleWidth(32);
    return scaleWidth(28);
  };
  
  const getTabLabelFontSize = () => {
    if (isLargeTablet) return scaleFont(14);
    if (isTablet) return scaleFont(13);
    return scaleFont(12);
  };
  
  const tabIconSize = getTabIconSize();
  const tabIconHeight = getTabIconSize();
  const tabLabelFontSize = getTabLabelFontSize();
  const tabFontWeight = '400';
  const tabFontFamily = 'Fredoka_400Regular';
  
  // Improved active background sizing
  const activeTabBackgroundHeight = pillTabBarHeight - scaleSpacing(isLargeTablet ? 20 : isTablet ? 18 : 14);
  const activeTabBackgroundTop = scaleSpacing(isLargeTablet ? 10 : isTablet ? 9 : 7);
  const activeTabBackgroundRadius = scaleSpacing(32);
  const activeTabSideMargin = scaleSpacing(isLargeTablet ? 10 : isTablet ? 9 : 7);
  const activeTabWidthOffset = scaleSpacing(isLargeTablet ? 20 : isTablet ? 18 : 14);

  // Determine which tabs to show based on mode and lock state
  const showFloatingButton = !parentalLockEnabled; // Scenario B: lock OFF
  const isChildMode = parentalLockEnabled && mode === 'child'; // Scenario A - Child
  const isParentMode = parentalLockEnabled && mode === 'parent'; // Scenario A - Parent

  // Debug log to verify mode changes
  console.log('🔄 Tab Layout State:', { mode, parentalLockEnabled, isChildMode, isParentMode, showFloatingButton });

  // DEEPER ARC for tablets - Much more pronounced curve
  const getCurveParameters = () => {
    if (isLargeTablet) {
      return {
        curveRadius: screenWidth * 0.23,
        curveSmallRadius: screenWidth * 0.17,
        curveOffset: screenWidth * 0.15,
        curvePeak: screenWidth * 0.10,
        curveDepth: scaleHeight(80), // MUCH DEEPER arc for large tablets
        initialHeight: scaleHeight(25), // Higher starting point
        svgHeight: scaleHeight(160) // Taller SVG
      };
    } else if (isTablet) {
      return {
        curveRadius: screenWidth * 0.22,
        curveSmallRadius: screenWidth * 0.16,
        curveOffset: screenWidth * 0.14,
        curvePeak: screenWidth * 0.09,
        curveDepth: scaleHeight(75), // MUCH DEEPER arc for tablets
        initialHeight: scaleHeight(22),
        svgHeight: scaleHeight(155)
      };
    } else {
      return {
        curveRadius: screenWidth * 0.20,
        curveSmallRadius: screenWidth * 0.15,
        curveOffset: screenWidth * 0.13,
        curvePeak: screenWidth * 0.08,
        curveDepth: scaleHeight(45), // Keep original for phones
        initialHeight: scaleHeight(15),
        svgHeight: scaleHeight(140)
      };
    }
  };

  const { curveRadius, curveSmallRadius, curveOffset, curvePeak, curveDepth, initialHeight, svgHeight: dynamicSvgHeight } = getCurveParameters();

  // Calculate tab indices based on current pathname for both modes
  const childTabIndex = pathname.includes('/home') ? 0 : pathname.includes('/media') ? 1 : 0;
  const parentTabIndex = pathname.includes('/addRoutines') ? 0 : pathname.includes('/progress') ? 1 : pathname.includes('/settings') ? 2 : 0;
  
  // Animation refs for both modes
  const childSlideAnim = useRef(new Animated.Value(childTabIndex)).current;
  const parentSlideAnim = useRef(new Animated.Value(parentTabIndex)).current;

  // Update child mode animation when tab changes
  useEffect(() => {
    if (isChildMode) {
      Animated.spring(childSlideAnim, {
        toValue: childTabIndex,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [childTabIndex, isChildMode]);

  // Update parent mode animation when tab changes
  useEffect(() => {
    if (isParentMode) {
      Animated.spring(parentSlideAnim, {
        toValue: parentTabIndex,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    }
  }, [parentTabIndex, isParentMode]);

  const childTabWidth = pillTabBarWidth / 2;
  const parentTabWidth = pillTabBarWidth / 3;
  
  const childIndicatorTranslateX = childSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, childTabWidth],
  });

  const parentIndicatorTranslateX = parentSlideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, parentTabWidth, parentTabWidth * 2],
  });

  // Calculate proper tab item width for full access mode (5 tabs)
  const fullAccessTabWidth = screenWidth / 5;
  
  // Full access mode tab styles - Fully responsive
  const getFullAccessTabItemSize = () => {
    if (isLargeTablet) return scaleHeight(68);
    if (isTablet) return scaleHeight(64);
    return scaleHeight(54);
  };
  
  const getFullAccessIconSize = () => {
    if (isLargeTablet) return scaleWidth(32);
    if (isTablet) return scaleWidth(30);
    return scaleWidth(26);
  };
  
  const getFullAccessLabelFontSize = () => {
    if (isLargeTablet) return scaleFont(12);
    if (isTablet) return scaleFont(11);
    return scaleFont(10);
  };
  
  const getFullAccessTabGap = () => {
    if (isLargeTablet) return scaleSpacing(4);
    if (isTablet) return scaleSpacing(3);
    return scaleSpacing(2);
  };
  
  const fullAccessTabItemSize = getFullAccessTabItemSize();
  const fullAccessIconSize = getFullAccessIconSize();
  const fullAccessLabelFontSize = getFullAccessLabelFontSize();
  const fullAccessTabGap = getFullAccessTabGap();

  // Calculate the vertical position for tabs - Percentage based for consistency
  const getTabItemTopPosition = () => {
    // Use percentage of navbar height for consistent positioning
    const navbarHeight = tabBarHeight;
    const tabItemHeight = fullAccessTabItemSize;
    
    // Position at 60% from top of navbar (40% from bottom)
    // This keeps buttons in the same relative position regardless of screen size
    const percentageFromTop = 0.60;
    const targetPosition = navbarHeight * percentageFromTop - (tabItemHeight / 2);
    
    // Apply fine-tuning based on screen size
    let fineTune = 0;
    if (isLargeTablet) {
      fineTune = scaleHeight(2);
    } else if (isTablet) {
      fineTune = scaleHeight(1);
    } else {
      fineTune = scaleHeight(-1); // Slight upward adjustment for phones
    }
    
    return targetPosition + fineTune;
  };

  const tabItemTopPosition = getTabItemTopPosition();

  // SIMPLIFIED FIX: Calculate absolute position for floating button
  const getFloatingButtonStyle = () => {
    // Calculate bottom position instead of top
    if (isLargeTablet) {
      // Position much higher on large tablets
      return {
        bottom: dynamicSvgHeight - scaleHeight(155), // Much higher position
      };
    } else if (isTablet) {
      // Position higher on tablets
      return {
        bottom: dynamicSvgHeight - scaleHeight(150), // Higher position
      };
    } else {
      // Original position for phones
      return {
        bottom: dynamicSvgHeight - scaleHeight(140), // Keep original
      };
    }
  };

  const floatingButtonStyle = getFloatingButtonStyle();

  // Custom Pill Tab Bar for Child Mode
  const CustomPillTabBar = () => {
    return (
      <View style={{
        position: 'absolute',
        bottom: childNavBarBottom,
        left: pillTabBarLeft,
        width: pillTabBarWidth,
        height: pillTabBarHeight,
        backgroundColor: '#2F7C72',
        borderRadius: pillTabBarRadius,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 0,
      }}>
        {/* Animated Active Tab Background */}
        <Animated.View
          style={{
            position: 'absolute',
            left: activeTabSideMargin,
            width: childTabWidth - activeTabWidthOffset,
            height: activeTabBackgroundHeight,
            top: activeTabBackgroundTop,
            backgroundColor: '#5DD4B4',
            borderRadius: activeTabBackgroundRadius,
            transform: [{ translateX: childIndicatorTranslateX }],
          }}
        />

        {/* Home Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/home')}
          style={{
            flex: 1,
            height: pillTabBarHeight,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(isLargeTablet ? 5 : isTablet ? 4 : 3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/home.png")}
            style={{
              width: tabIconSize,
              height: tabIconHeight,
              resizeMode: 'contain',
              tintColor: '#fff',
            }}
          />
          <Text numberOfLines={1} style={{ 
            color: '#fff', 
            fontSize: tabLabelFontSize, 
            fontWeight: tabFontWeight,
            fontFamily: tabFontFamily,
            textAlign: 'center'
          }}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Media Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/media')}
          style={{
            flex: 1,
            height: pillTabBarHeight,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(isLargeTablet ? 5 : isTablet ? 4 : 3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/media.png")}
            style={{
              width: tabIconSize,
              height: tabIconHeight,
              resizeMode: 'contain',
              tintColor: '#fff',
            }}
          />
          <Text numberOfLines={1} style={{ 
            color: '#fff', 
            fontSize: tabLabelFontSize, 
            fontWeight: tabFontWeight,
            fontFamily: tabFontFamily,
            textAlign: 'center'
          }}>
            Media
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Custom Pill Tab Bar for Parent Mode
  const CustomParentPillTabBar = () => {
    return (
      <View style={{
        position: 'absolute',
        bottom: childNavBarBottom,
        left: pillTabBarLeft,
        width: pillTabBarWidth,
        height: pillTabBarHeight,
        backgroundColor: '#2F7C72',
        borderRadius: pillTabBarRadius,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 0,
      }}>
        {/* Animated Active Tab Background */}
        <Animated.View
          style={{
            position: 'absolute',
            left: activeTabSideMargin,
            width: parentTabWidth - activeTabWidthOffset,
            height: activeTabBackgroundHeight,
            top: activeTabBackgroundTop,
            backgroundColor: '#5DD4B4',
            borderRadius: activeTabBackgroundRadius,
            transform: [{ translateX: parentIndicatorTranslateX }],
          }}
        />

        {/* Add Routines Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/addRoutines')}
          style={{
            flex: 1,
            height: pillTabBarHeight,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(isLargeTablet ? 5 : isTablet ? 4 : 3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/addRoutines.png")}
            style={{
              width: tabIconSize,
              height: tabIconHeight,
              resizeMode: 'contain',
              tintColor: '#fff',
            }}
          />
          <Text 
            numberOfLines={1} 
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{ 
              color: '#fff', 
              fontSize: tabLabelFontSize, 
              fontWeight: tabFontWeight,
              fontFamily: tabFontFamily,
              textAlign: 'center',
              paddingHorizontal: scaleSpacing(isLargeTablet ? 6 : isTablet ? 4 : 2)
            }}
          >
            Add Routine
          </Text>
        </TouchableOpacity>

        {/* Progress Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/progress')}
          style={{
            flex: 1,
            height: pillTabBarHeight,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(isLargeTablet ? 5 : isTablet ? 4 : 3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/progress.png")}
            style={{
              width: tabIconSize,
              height: tabIconHeight,
              resizeMode: 'contain',
              tintColor: '#fff',
            }}
          />
          <Text 
            numberOfLines={1} 
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{ 
              color: '#fff', 
              fontSize: tabLabelFontSize, 
              fontWeight: tabFontWeight,
              fontFamily: tabFontFamily,
              textAlign: 'center',
              paddingHorizontal: scaleSpacing(isLargeTablet ? 6 : isTablet ? 4 : 2)
            }}
          >
            Progress
          </Text>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/settings')}
          style={{
            flex: 1,
            height: pillTabBarHeight,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSpacing(isLargeTablet ? 5 : isTablet ? 4 : 3),
            zIndex: 1,
          }}
        >
          <Image
            source={require("../../assets/images/settings.png")}
            style={{
              width: tabIconSize,
              height: tabIconHeight,
              resizeMode: 'contain',
              tintColor: '#fff',
            }}
          />
          <Text 
            numberOfLines={1} 
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{ 
              color: '#fff', 
              fontSize: tabLabelFontSize, 
              fontWeight: tabFontWeight,
              fontFamily: tabFontFamily,
              textAlign: 'center',
              paddingHorizontal: scaleSpacing(isLargeTablet ? 6 : isTablet ? 4 : 2)
            }}
          >
            Settings
          </Text>
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
              <View style={[styles.tabBarContainer, { height: dynamicSvgHeight }]}>
                <Svg width={screenWidth} height={dynamicSvgHeight} style={styles.svgStyle}>
                  <Path
                    d={`
                      M0 0
                      H${screenWidth / 2 - curveRadius}
                      Q${screenWidth / 2 - curveSmallRadius} 0 ${
                      screenWidth / 2 - curveOffset
                    } ${initialHeight}
                      Q${screenWidth / 2 - curvePeak} ${curveDepth} ${
                      screenWidth / 2
                    } ${curveDepth}
                      Q${screenWidth / 2 + curvePeak} ${curveDepth} ${
                      screenWidth / 2 + curveOffset
                    } ${initialHeight}
                      Q${screenWidth / 2 + curveSmallRadius} 0 ${
                      screenWidth / 2 + curveRadius
                    } 0
                      H${screenWidth}
                      V${dynamicSvgHeight}
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
                  height: scaleHeight(70),
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
                      height: scaleHeight(70),
                      backgroundColor: '#5DD4B4',
                      borderRadius: scaleSpacing(42.5),
                      transform: [{ translateX: parentIndicatorTranslateX }],
                    }}
                  />
                </View>
              </View>

            ) : (
              <View style={[styles.tabBarContainer, { 
                height: tabBarHeight, 
                backgroundColor: 'transparent' 
              }]} />
            )
          ),
          
          tabBarStyle: {
            ...styles.tabBar,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            backgroundColor: 'transparent',
          },
          
          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            width: showFloatingButton ? fullAccessTabWidth : 0,
            height: showFloatingButton ? 'auto' : 0,
          },
        }}
      >
        {/* Home - Only in Child Mode or Unlocked */}
        <Tabs.Screen
          name="home"
          options={{
            href: (isChildMode || showFloatingButton) ? '/(tabs)/home' : null,
            tabBarIcon: ({ focused }) => (
              showFloatingButton ? (
                <View
                  style={[
                    styles.tabItemWrapper,
                    { 
                      width: '100%', 
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      top: tabItemTopPosition,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fullAccessTabItem,
                      { 
                        width: fullAccessTabItemSize * 1.1,
                        height: fullAccessTabItemSize,
                        borderRadius: scaleSpacing(12),
                        backgroundColor: focused ? '#5DD4B4' : 'transparent',
                        paddingHorizontal: scaleSpacing(isLargeTablet ? 8 : isTablet ? 6 : 4),
                        gap: fullAccessTabGap,
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/home.png")}
                      style={{
                        width: fullAccessIconSize,
                        height: fullAccessIconSize,
                        resizeMode: 'contain',
                        tintColor: '#fff',
                      }}
                    />
                    <Text 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{ 
                        color: '#fff', 
                        fontSize: fullAccessLabelFontSize,
                        fontFamily: tabFontFamily,
                        fontWeight: tabFontWeight,
                        textAlign: 'center',
                        lineHeight: fullAccessLabelFontSize * 1.2,
                      }}
                    >
                      Home
                    </Text>
                  </View>
                </View>
              ) : null
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
              showFloatingButton ? (
                <View
                  style={[
                    styles.tabItemWrapper,
                    { 
                      width: '100%', 
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      top: tabItemTopPosition,
                      marginLeft: scaleSpacing(-15),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fullAccessTabItem,
                      { 
                        width: fullAccessTabItemSize * 1.1,
                        height: fullAccessTabItemSize,
                        borderRadius: scaleSpacing(12),
                        backgroundColor: focused ? '#5DD4B4' : 'transparent',
                        paddingHorizontal: scaleSpacing(isLargeTablet ? 8 : isTablet ? 6 : 4),
                        gap: fullAccessTabGap,
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/media.png")}
                      style={{
                        width: fullAccessIconSize,
                        height: fullAccessIconSize,
                        resizeMode: 'contain',
                        tintColor: '#fff',
                      }}
                    />
                    <Text 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{ 
                        color: '#fff', 
                        fontSize: fullAccessLabelFontSize,
                        fontFamily: tabFontFamily,
                        fontWeight: tabFontWeight,
                        textAlign: 'center',
                        lineHeight: fullAccessLabelFontSize * 1.2,
                      }}
                    >
                      Media
                    </Text>
                  </View>
                </View>
              ) : null
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
                // SIMPLIFIED FIX: Direct positioning without complex calculations
                <View style={[
                  styles.centerWrapper, 
                  floatingButtonStyle // Apply the calculated bottom position
                ]}>
                  <View
                    style={[
                      styles.floatingButton,
                      { 
                        width: floatingButtonSize, 
                        height: floatingButtonSize,
                        borderRadius: floatingButtonSize / 2,
                        shadowRadius: scaleHeight(10),
                        shadowOffset: { width: 0, height: scaleHeight(6) },
                        shadowOpacity: 0.2,
                        elevation: 8,
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
                    gap: scaleSpacing(1),
                    paddingBottom: scaleHeight(6),
                    zIndex: 1,
                  }}
                >
                  <Image
                    source={require("../../assets/images/addRoutines.png")}
                    style={{
                      width: scaleWidth(28),
                      height: scaleHeight(28),
                      tintColor: '#fff',
                      marginTop: scaleHeight(-6),
                    }}
                  />
                  <Text style={{ color: '#fff', fontSize: scaleFont(9), fontWeight: '600', textAlign: 'center', marginBottom: scaleHeight(-4) }}>Add</Text>
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
                      width: '100%', 
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      top: tabItemTopPosition,
                      marginRight: scaleSpacing(-15),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fullAccessTabItem,
                      { 
                        width: fullAccessTabItemSize * 1.1,
                        height: fullAccessTabItemSize,
                        borderRadius: scaleSpacing(12),
                        backgroundColor: focused ? '#5DD4B4' : 'transparent',
                        paddingHorizontal: scaleSpacing(isLargeTablet ? 8 : isTablet ? 6 : 4),
                        gap: fullAccessTabGap,
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/progress.png")}

                      style={[
                        styles.icon, 
                        { 
                          width: fullAccessIconSize, 
                          height: fullAccessIconSize 
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
                      gap: scaleSpacing(1),
                      paddingBottom: scaleHeight(6),
                      zIndex: 1,
                    }}
                  >
                    <Image
                      source={require("../../assets/images/progress.png")}

                      style={{
                        width: fullAccessIconSize,
                        height: fullAccessIconSize,
                        resizeMode: 'contain',
                        tintColor: '#fff',
                        marginTop: scaleHeight(-6),
                      }}
                    />

                    <Text 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{ 
                        color: '#fff', 
                        fontSize: fullAccessLabelFontSize,
                        fontFamily: tabFontFamily,
                        fontWeight: tabFontWeight,
                        textAlign: 'center',
                        lineHeight: fullAccessLabelFontSize * 1.2,
                      }}
                    >
                      Progress
                    </Text>

                    <Text style={{ color: '#fff', fontSize: scaleFont(7), fontWeight: '600', textAlign: 'center', marginBottom: scaleHeight(-4) }}>Progress</Text>

                  </View>
                </View>
              ) : null
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
                      width: '100%', 
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                      top: tabItemTopPosition,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.fullAccessTabItem,
                      { 
                        width: fullAccessTabItemSize * 1.1,
                        height: fullAccessTabItemSize,
                        borderRadius: scaleSpacing(12),
                        backgroundColor: focused ? '#5DD4B4' : 'transparent',
                        paddingHorizontal: scaleSpacing(isLargeTablet ? 8 : isTablet ? 6 : 4),
                        gap: fullAccessTabGap,
                      },
                    ]}
                  >
                    <Image
                      source={require("../../assets/images/settings.png")}

                      style={[
                        styles.icon, 
                        { 
                          width: fullAccessIconSize, 
                          height: fullAccessIconSize 
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
                      gap: scaleSpacing(1),
                      paddingBottom: scaleHeight(6),
                      zIndex: 1,
                    }}
                  >
                    <Image
                      source={require("../../assets/images/settings.png")}

                      style={{
                        width: fullAccessIconSize,
                        height: fullAccessIconSize,
                        resizeMode: 'contain',
                        tintColor: '#fff',
                        marginTop: scaleHeight(-6),
                      }}
                    />

                    <Text 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{ 
                        color: '#fff', 
                        fontSize: fullAccessLabelFontSize,
                        fontFamily: tabFontFamily,
                        fontWeight: tabFontWeight,
                        textAlign: 'center',
                        lineHeight: fullAccessLabelFontSize * 1.2,
                      }}
                    >
                      Settings
                    </Text>

                    <Text style={{ color: '#fff', fontSize: scaleFont(7), fontWeight: '600', textAlign: 'center', marginBottom: scaleHeight(-4) }}>Settings</Text>

                  </View>
                </View>
              ) : null
            ),
            tabBarLabel: () => null,
          }}
        />
      </Tabs>
      
      {/* Render custom pill tab bars based on mode */}
      {isChildMode && <CustomPillTabBar />}
      {isParentMode && <CustomParentPillTabBar />}
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
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    height: '100%',
  },
  fullAccessTabItem: {
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: 'center',
  },
  centerWrapper: {
    position: "absolute",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
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