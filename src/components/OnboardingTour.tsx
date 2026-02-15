import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useResponsiveDimensions } from '../utils/responsive';

interface OnboardingTourProps {
  visible: boolean;
  step: number; // 0: Home, 1: Media, 2: Progress, 3: Settings, 4: Add Routine
  onNext: () => void;
  onSkip: () => void;
  buttonLayouts: {
    home?: { x: number; y: number; width: number; height: number } | null;
    media?: { x: number; y: number; width: number; height: number } | null;
    progress?: { x: number; y: number; width: number; height: number } | null;
    settings?: { x: number; y: number; width: number; height: number } | null;
    floating?: { x: number; y: number; width: number; height: number } | null;
  };
}

export default function OnboardingTour({ visible, step, onNext, onSkip, buttonLayouts }: OnboardingTourProps) {
  const responsive = useResponsiveDimensions();
  const { width: screenWidth, height: screenHeight, scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Debug log
  console.log('🎨 OnboardingTour render:', { visible, step });

  useEffect(() => {
    if (visible) {
      console.log('✅ Onboarding visible - starting animations');
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  // Define positions and content for each step - using MEASURED layouts
  const getStepConfig = () => {
    const isTablet = screenWidth >= 768;
    const isLargeTablet = screenWidth >= 1024;
    
    // Border radius for different elements
    const tabBorderRadius = scaleSpacing(12);
    const floatingBorderRadius = buttonLayouts.floating ? buttonLayouts.floating.width / 2 : scaleSpacing(35);

    switch (step) {
      case 0: // Home - First tab (leftmost)
        return {
          title: 'Home',
          description: 'Here you can see all your routines for today. Tap a routine to start!',
          layout: buttonLayouts.home,
          borderRadius: tabBorderRadius,
        };
      case 1: // Media - Second tab
        return {
          title: 'Media',
          description: 'Watch educational videos and listen to music here!',
          layout: buttonLayouts.media,
          borderRadius: tabBorderRadius,
        };
      case 2: // Progress - Fourth tab (after center floating button)
        return {
          title: 'Progress',
          description: 'Check your progress and achievements!',
          layout: buttonLayouts.progress,
          borderRadius: tabBorderRadius,
        };
      case 3: // Settings - Fifth tab (rightmost)
        return {
          title: 'Settings',
          description: 'Customize your profile and app settings here.',
          layout: buttonLayouts.settings,
          borderRadius: tabBorderRadius,
        };
      case 4: // Add Routine - Center floating button
        return {
          title: 'Add Routine',
          description: 'Create new routines for your day! Tap the floating button in the center.',
          layout: buttonLayouts.floating
,          borderRadius: floatingBorderRadius,
        };
      default:
        return {
          title: '',
          description: '',
          layout: null,
          borderRadius: 0,
        };
    }
  };
  const config = getStepConfig();

  // If no layout available for this step, don't render
  if (!config.layout) return null;

  // Calculate tooltip position - improved for lower-end devices
  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(280);
    
    // Estimated tooltip height based on content
    const estimatedTooltipHeight = scaleHeight(180);
    
    // Navigation bar height estimate (tab bar + safe area)
    const navBarHeight = scaleHeight(100);
    
    // Center tooltip horizontally
    const left = (screenWidth - tooltipWidth) / 2;
    
    // Position above or below based on available space
    const spaceAbove = config.layout!.y;
    const spaceBelow = screenHeight - (config.layout!.y + config.layout!.height);
    
    // For bottom navigation elements (less than navBarHeight from bottom),
    // ALWAYS show above to avoid overlap
    const distanceFromBottom = screenHeight - (config.layout!.y + config.layout!.height);
    const isBottomElement = distanceFromBottom < navBarHeight + scaleHeight(50);
    
    // Ensure tooltip has enough space and doesn't overlap navigation
    if (isBottomElement || spaceBelow < estimatedTooltipHeight + navBarHeight) {
      // Show above - with extra padding to ensure no overlap
      const bottomPosition = screenHeight - config.layout!.y + scaleHeight(20);
      return {
        left,
        bottom: Math.max(bottomPosition, navBarHeight + scaleHeight(10)), // Ensure minimum distance from bottom
        width: tooltipWidth,
        maxHeight: spaceAbove - scaleHeight(40), // Limit height to available space
      };
    } else {
      // Show below (only when there's plenty of space)
      return {
        left,
        top: config.layout!.y + config.layout!.height + scaleHeight(20),
        width: tooltipWidth,
        maxHeight: spaceBelow - scaleHeight(40),
      };
    }
  };

  const screenDimensions = Dimensions.get('screen');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={[StyleSheet.absoluteFillObject, { height: screenDimensions.height, width: screenDimensions.width }]} pointerEvents="box-none">
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">
          {/* Dark overlay with transparent hole using SVG mask */}
          <Svg height={screenDimensions.height} width={screenDimensions.width} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Mask id="mask" x="0" y="0" height="100%" width="100%">
              {/* White background = visible dark overlay */}
              <Rect height="100%" width="100%" fill="#fff" />
              {/* Black rectangle = transparent hole */}
              <Rect
                x={config.layout.x}
                y={config.layout.y}
                width={config.layout.width}
                height={config.layout.height}
                rx={config.borderRadius}
                fill="#000"
              />
            </Mask>
          </Defs>
          {/* Apply mask to lighter overlay */}
          <Rect
            height="100%"
            width="100%"
            fill="rgba(0, 0, 0, 0.4)"
            mask="url(#mask)"
          />
        </Svg>

        {/* Bright highlight border */}
        <View
          style={[
            styles.highlight,
            {
              position: 'absolute',
              left: config.layout.x,
              top: config.layout.y,
              width: config.layout.width,
              height: config.layout.height,
              borderRadius: config.borderRadius,
            },
          ]}
        />

        {/* Tooltip */}
        <View style={[styles.tooltip, getTooltipStyle()]}>
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { fontSize: scaleFont(20) }]}>
              {config.title}
            </Text>
            <Text style={[styles.stepIndicator, { fontSize: scaleFont(14) }]}>
              {step + 1}/5
            </Text>
          </View>
          
          <Text style={[styles.tooltipDescription, { fontSize: scaleFont(16) }]}>
            {config.description}
          </Text>

          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { fontSize: scaleFont(16) }]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={onNext} 
              style={[styles.nextButton, { 
                paddingHorizontal: scaleSpacing(24),
                paddingVertical: scaleSpacing(12),
                borderRadius: scaleSpacing(25),
              }]}
            >
              <Text style={[styles.nextText, { fontSize: scaleFont(16) }]}>
                {step === 4 ? 'Done!' : 'Next'}
              </Text>
              {step < 4 && <Ionicons name="arrow-forward" size={scaleFont(18)} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  highlight: {
    borderWidth: 4,
    borderColor: '#5DD4B4',
    backgroundColor: 'transparent',
    shadowColor: '#5DD4B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontWeight: '700',
    color: '#2F7C72',
  },
  stepIndicator: {
    color: '#999',
    fontWeight: '600',
  },
  tooltipDescription: {
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: '#999',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#5DD4B4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
  },
});
