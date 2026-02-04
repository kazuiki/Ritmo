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
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useResponsiveDimensions } from '../utils/responsive';

interface AddRoutineOnboardingTourProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  plusButtonLayout?: { x: number; y: number; width: number; height: number } | null;
}

export default function AddRoutineOnboardingTour({ 
  visible, 
  onComplete, 
  onSkip,
  plusButtonLayout 
}: AddRoutineOnboardingTourProps) {
  const responsive = useResponsiveDimensions();
  const { width: screenWidth, height: screenHeight, scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Debug logging
  console.log('🎯 AddRoutineOnboardingTour render:', { visible, hasLayout: !!plusButtonLayout, layout: plusButtonLayout });

  useEffect(() => {
    if (visible) {
      console.log('✅ AddRoutine onboarding visible - starting animations');
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

  if (!visible || !plusButtonLayout) {
    console.log('❌ Not showing onboarding:', { visible, hasLayout: !!plusButtonLayout });
    return null;
  }

  // Use the actual layout measurements from the + button
  const highlightPosition = {
    left: plusButtonLayout.x,
    top: plusButtonLayout.y,
    width: plusButtonLayout.width,
    height: plusButtonLayout.height,
  };

  // Calculate tooltip position - show it below the + button
  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(280);
    const tooltipPadding = scaleSpacing(20);
    
    // Center tooltip horizontally on screen
    const left = (screenWidth - tooltipWidth) / 2;
    
    // Position below the highlighted button
    const top = highlightPosition.top + highlightPosition.height + scaleHeight(20);

    return {
      left,
      top,
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
        {/* Dark overlay with transparent hole using SVG mask */}
        <Svg height={screenHeight} width={screenWidth} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="mask" x="0" y="0" height="100%" width="100%">
              {/* White background = visible dark overlay */}
              <Rect height="100%" width="100%" fill="#fff" />
              {/* Black circle = transparent hole for the + button */}
              <Rect
                x={highlightPosition.left}
                y={highlightPosition.top}
                width={highlightPosition.width}
                height={highlightPosition.height}
                rx={scaleSpacing(15)}
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
              left: highlightPosition.left,
              top: highlightPosition.top,
              width: highlightPosition.width,
              height: highlightPosition.height,
              borderRadius: scaleSpacing(15),
            },
          ]}
        />

        {/* Tooltip */}
        <View style={[styles.tooltip, getTooltipStyle()]}>
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { fontSize: scaleFont(20) }]}>
              Add New Routine
            </Text>
          </View>
          
          <Text style={[styles.tooltipDescription, { fontSize: scaleFont(16) }]}>
            Tap this button to create a new routine for your day! You can set the time, choose an activity, and customize it.
          </Text>

          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { fontSize: scaleFont(16) }]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={onComplete} 
              style={[styles.nextButton, { 
                paddingHorizontal: scaleSpacing(24),
                paddingVertical: scaleSpacing(12),
                borderRadius: scaleSpacing(25),
              }]}
            >
              <Text style={[styles.nextText, { fontSize: scaleFont(16) }]}>
                Got it!
              </Text>
              <Ionicons name="checkmark-circle" size={scaleFont(18)} color="#fff" />
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
  highlight: {
    borderWidth: 3,
    borderColor: '#5DD4B4',
    backgroundColor: 'transparent',
    shadowColor: '#5DD4B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
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
