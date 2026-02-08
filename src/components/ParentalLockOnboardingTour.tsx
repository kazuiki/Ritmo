import { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useResponsiveDimensions } from '../utils/responsive';

interface ParentalLockOnboardingTourProps {
  visible: boolean;
  step: number; // 0: Container/Switch, 1: Toggle ON
  onNext: () => void;
  onSkip: () => void;
  highlightPositions?: {
    container?: { top: number; left: number; width: number; height: number };
    switch?: { top: number; left: number; width: number; height: number };
  };
}

export default function ParentalLockOnboardingTour({ 
  visible, 
  step, 
  onNext, 
  onSkip,
  highlightPositions 
}: ParentalLockOnboardingTourProps) {
  const responsive = useResponsiveDimensions();
  const { width: screenWidth, height: screenHeight, scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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

  const getStepConfig = () => {
    switch (step) {
      case 0: // Parental Lock Container & Switch
        return {
          title: 'Parental Lock',
          description: 'Enable Parental Lock to restrict access. Toggle the switch to turn it on.',
          highlightPosition: highlightPositions?.container || {
            top: scaleHeight(200),
            left: scaleWidth(35),
            width: screenWidth - scaleWidth(70),
            height: scaleHeight(120),
          },
          tooltipPosition: 'bottom' as const,
        };
      case 1: // After PIN is set - can turn on/off anytime
        return {
          title: 'Toggle Anytime',
          description: 'You can turn on the Parental Lock and off anytime once you enter the PIN.',
          highlightPosition: highlightPositions?.switch || {
            top: scaleHeight(235),
            left: screenWidth - scaleWidth(120),
            width: scaleWidth(80),
            height: scaleHeight(50),
          },
          tooltipPosition: 'bottom' as const,
        };
      default:
        return {
          title: '',
          description: '',
          highlightPosition: { top: 0, left: 0, width: 0, height: 0 },
          tooltipPosition: 'bottom' as const,
        };
    }
  };

  const config = getStepConfig();

  // Calculate tooltip position - moved down more to avoid covering highlight
  const tooltipTop = config.tooltipPosition === 'bottom'
    ? config.highlightPosition.top + config.highlightPosition.height + scaleHeight(60)
    : config.highlightPosition.top - scaleHeight(200);

  const screenDimensions = Dimensions.get('screen');

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
    >
      <View style={[StyleSheet.absoluteFillObject, { height: screenDimensions.height, width: screenDimensions.width }]}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          {/* Dark overlay with transparent hole using SVG mask */}
          <Svg height={screenDimensions.height} width={screenDimensions.width} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="parental-mask" x="0" y="0" height="100%" width="100%">
              {/* White background = visible dark overlay */}
              <Rect height="100%" width="100%" fill="#fff" />
              {/* Black rectangle = transparent hole */}
              <Rect
                x={config.highlightPosition.left - (step === 1 ? scaleSpacing(20) : 0)}
                y={config.highlightPosition.top - (step === 1 ? scaleSpacing(12) : 0)}
                width={config.highlightPosition.width + (step === 1 ? scaleSpacing(32) : 0)}
                height={config.highlightPosition.height + (step === 1 ? scaleSpacing(24) : 0)}
                rx={step === 1 ? scaleSpacing(30) : scaleSpacing(15)}
                fill="#000"
              />
            </Mask>
          </Defs>
          {/* Apply mask to dark overlay */}
          <Rect
            height="100%"
            width="100%"
            fill="rgba(0, 0, 0, 0.4)"
            mask="url(#parental-mask)"
          />
        </Svg>

        {/* Bright highlight border */}
        <View
          style={[
            styles.highlight,
            {
              position: 'absolute',
              top: config.highlightPosition.top - (step === 1 ? scaleSpacing(12) : 0),
              left: config.highlightPosition.left - (step === 1 ? scaleSpacing(20) : 0),
              width: config.highlightPosition.width + (step === 1 ? scaleSpacing(32) : 0),
              height: config.highlightPosition.height + (step === 1 ? scaleSpacing(24) : 0),
              borderRadius: step === 1 ? scaleSpacing(30) : scaleSpacing(15),
            },
          ]}
        />

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              position: 'absolute',
              top: tooltipTop,
              left: scaleWidth(20),
              right: scaleWidth(20),
            },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { fontSize: scaleFont(20) }]}>
              {config.title}
            </Text>
            <Text style={[styles.stepIndicator, { fontSize: scaleFont(14) }]}>
              {step + 1}/2
            </Text>
          </View>
          
          <Text style={[styles.tooltipDescription, { fontSize: scaleFont(16), lineHeight: scaleFont(22) }]}>
            {config.description}
          </Text>

          <View style={styles.tooltipButtons}>
            <TouchableOpacity
              style={[styles.skipButton, { paddingHorizontal: scaleSpacing(20), paddingVertical: scaleSpacing(10) }]}
              onPress={onSkip}
            >
              <Text style={[styles.skipButtonText, { fontSize: scaleFont(16) }]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { paddingHorizontal: scaleSpacing(20), paddingVertical: scaleSpacing(10) }]}
              onPress={onNext}
            >
              <Text style={[styles.nextButtonText, { fontSize: scaleFont(16) }]}>
                {step === 1 ? 'Done' : 'Next'} →
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
    fontWeight: 'bold',
    color: '#2F7C72',
    flex: 1,
  },
  stepIndicator: {
    color: '#666',
    marginLeft: 8,
  },
  tooltipDescription: {
    color: '#333',
    marginBottom: 20,
  },
  tooltipButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipButton: {
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#5DD4B4',
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
