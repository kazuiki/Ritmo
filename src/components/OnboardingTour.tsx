import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useResponsiveDimensions } from '../utils/responsive';

interface OnboardingTourProps {
  visible: boolean;
  step: number; // 0: Home, 1: Media, 2: Progress, 3: Settings, 4: Add Routine
  onNext: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ visible, step, onNext, onSkip }: OnboardingTourProps) {
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

  // Define positions and content for each step
  const getStepConfig = () => {
    const isTablet = screenWidth >= 768;
    const bottomMargin = scaleHeight(25);
    const tabBarHeight = scaleHeight(70);
    
    // Match exact tab button sizes from _layout.tsx
    const tabSlotWidth = screenWidth / 5;
    const tabButtonWidth = scaleWidth(70); // Smaller button width to match the rounded shape
    const tabButtonHeight = scaleHeight(55); // Smaller button height
    
    // Tab positions - buttons are centered within their slots
    const buttonOffsetX = (tabSlotWidth - tabButtonWidth) / 2; // Center button in slot
    const tabBottomOffset = bottomMargin - scaleHeight(1.6); // Lower the highlight to align exactly with green button
    
    // For floating button (addRoutines in center) - match actual size from layout
    const floatingButtonSize = scaleWidth(70);
    const floatingButtonLeft = (screenWidth - floatingButtonSize) / 2;
    // Position to align with the actual floating button - it's raised above the tab bar
    const floatingButtonBottom = bottomMargin + tabBarHeight - scaleHeight(40);

    switch (step) {
      case 0: // Home - First tab (leftmost)
        return {
          title: 'Home',
          description: 'Here you can see all your routines for today. Tap a routine to start!',
          highlightPosition: {
            left: buttonOffsetX,
            bottom: tabBottomOffset,
            width: tabButtonWidth,
            height: tabButtonHeight,
          },
          tooltipPosition: 'top' as const,
        };
      case 1: // Media - Second tab
        return {
          title: 'Media',
          description: 'Watch educational videos and listen to music here!',
          highlightPosition: {
            left: tabSlotWidth + buttonOffsetX,
            bottom: tabBottomOffset,
            width: tabButtonWidth,
            height: tabButtonHeight,
          },
          tooltipPosition: 'top' as const,
        };
      case 2: // Progress - Fourth tab (after center floating button)
        return {
          title: 'Progress',
          description: 'Check your progress and achievements!',
          highlightPosition: {
            left: tabSlotWidth * 3 + buttonOffsetX,
            bottom: tabBottomOffset,
            width: tabButtonWidth,
            height: tabButtonHeight,
          },
          tooltipPosition: 'top' as const,
        };
      case 3: // Settings - Fifth tab (rightmost)
        return {
          title: 'Settings',
          description: 'Customize your profile and app settings here.',
          highlightPosition: {
            left: tabSlotWidth * 4 + buttonOffsetX,
            bottom: tabBottomOffset,
            width: tabButtonWidth,
            height: tabButtonHeight,
          },
          tooltipPosition: 'top' as const,
        };
      case 4: // Add Routine - Center floating button
        return {
          title: 'Add Routine',
          description: 'Create new routines for your day! Tap the floating button in the center.',
          highlightPosition: {
            left: floatingButtonLeft,
            bottom: floatingButtonBottom,
            width: floatingButtonSize,
            height: floatingButtonSize,
          },
          tooltipPosition: 'top' as const,
        };
      default:
        return {
          title: '',
          description: '',
          highlightPosition: { left: 0, bottom: 0, width: 0, height: 0 },
          tooltipPosition: 'top' as const,
        };
    }
  };

  const config = getStepConfig();

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(280);
    const tooltipHeight = scaleHeight(160);
    
    // Center tooltip horizontally on screen
    const left = (screenWidth - tooltipWidth) / 2;
    
    // Position above the highlighted tab
    const bottom = config.highlightPosition.bottom + config.highlightPosition.height + scaleHeight(20);

    return {
      left,
      bottom,
      width: tooltipWidth,
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Dark overlay */}
        <View style={styles.backdrop} />

        {/* Highlight circle/rectangle */}
        <Animated.View
          style={[
            styles.highlight,
            {
              position: 'absolute',
              left: config.highlightPosition.left,
              bottom: config.highlightPosition.bottom,
              width: config.highlightPosition.width,
              height: config.highlightPosition.height,
              borderRadius: step === 4 ? config.highlightPosition.width / 2 : scaleSpacing(15),
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
<<<<<<< HEAD
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
=======
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
>>>>>>> origin/master
  },
  highlight: {
    borderWidth: 3,
    borderColor: '#5DD4B4',
    backgroundColor: 'rgba(93, 212, 180, 0.2)',
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
