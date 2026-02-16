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
    View,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useResponsiveDimensions } from '../utils/responsive';

interface AddRoutineModalOnboardingProps {
  visible: boolean;
  step: number; // 0: Time Picker, 1: Days, 2: Preset, 3: Name, 4: Ringtone
  onNext: () => void;
  onSkip: () => void;
  layouts: {
    timePicker?: { x: number; y: number; width: number; height: number } | null;
    days?: { x: number; y: number; width: number; height: number } | null;
    preset?: { x: number; y: number; width: number; height: number } | null;
    routineName?: { x: number; y: number; width: number; height: number } | null;
    ringtone?: { x: number; y: number; width: number; height: number } | null;
  };
}

export default function AddRoutineModalOnboarding({ 
  visible, 
  step, 
  onNext, 
  onSkip,
  layouts 
}: AddRoutineModalOnboardingProps) {
  const responsive = useResponsiveDimensions();
  const { width: screenWidth, height: screenHeight, scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  // Get step configuration
  const getStepConfig = () => {
    switch (step) {
      case 0: // Time Picker
        return {
          title: 'Set Time',
          description: 'Choose what time you want this routine to happen. Pick the hour, minute, and AM/PM.',
          layout: layouts.timePicker,
          borderRadius: scaleSpacing(20),
        };
      case 1: // Days
        return {
          title: 'Select Days',
          description: 'Pick which days of the week you want this routine. Tap on each day to select or unselect.',
          layout: layouts.days,
          borderRadius: scaleSpacing(15),
        };
      case 2: // Preset
        return {
          title: 'Choose Activity',
          description: 'Select what type of routine this is - like brushing teeth, eating, or going to school!',
          layout: layouts.preset,
          borderRadius: scaleSpacing(14),
        };
      case 3: // Routine Name
        return {
          title: 'Name Your Routine',
          description: 'Give your routine a fun name so you can easily remember it!',
          layout: layouts.routineName,
          borderRadius: scaleSpacing(14),
        };
      case 4: // Ringtone
        return {
          title: 'Pick a Sound',
          description: 'Choose what sound you want to hear when it\'s time for this routine!',
          layout: layouts.ringtone,
          borderRadius: scaleSpacing(14),
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

  if (!config.layout) return null;

  // Calculate tooltip position - ensure no overlap with highlighted element
  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(280);
    
    // Center tooltip horizontally
    const horizontalPadding = scaleSpacing(16);
    const left = Math.max(horizontalPadding, (screenWidth - tooltipWidth) / 2);
    
    // Position relative to highlighted element
    const highlightTop = config.layout!.y;
    const highlightBottom = config.layout!.y + config.layout!.height;
    const spaceAbove = highlightTop;
    const spaceBelow = screenHeight - highlightBottom;
    
    // Gap between tooltip and highlighted element
    const gap = scaleHeight(20);
    
    // Priority: Always show above for bottom elements to avoid overlap
    // For steps 3 and 4 (Name and Ringtone), these are typically at bottom
    if (step === 3 || step === 4) {
      // Force position above for these bottom elements
      return {
        left,
        bottom: screenHeight - highlightTop + gap,
        width: tooltipWidth,
        maxHeight: spaceAbove - gap - scaleHeight(20),
      };
    }
    
    // For other elements, prefer showing below if there's space
    const minSpaceNeeded = scaleHeight(160);
    
    if (spaceBelow >= minSpaceNeeded) {
      return {
        left,
        top: highlightBottom + gap,
        width: tooltipWidth,
      };
    } else {
      // Show above as fallback
      return {
        left,
        bottom: screenHeight - highlightTop + gap,
        width: tooltipWidth,
        maxHeight: spaceAbove - gap - scaleHeight(20),
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
      <View style={[StyleSheet.absoluteFillObject, { height: screenDimensions.height, width: screenDimensions.width }]}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          {/* Light overlay with transparent hole */}
          <Svg height={screenDimensions.height} width={screenDimensions.width} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="mask" x="0" y="0" height="100%" width="100%">
              <Rect height="100%" width="100%" fill="#fff" />
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
          <Rect
            height="100%"
            width="100%"
            fill="rgba(0, 0, 0, 0.4)"
            mask="url(#mask)"
          />
        </Svg>

        {/* Highlight border */}
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
          <ScrollView 
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.tooltipScrollContent}
          >
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
                  {step === 4 ? 'Got it!' : 'Next'}
                </Text>
                {step < 4 && <Ionicons name="arrow-forward" size={scaleFont(18)} color="#fff" />}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    elevation: 10,

  },
  tooltipScrollContent: {
    flexGrow: 1,

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
