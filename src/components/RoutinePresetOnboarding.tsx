import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useResponsiveDimensions } from '../utils/responsive';

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoutinePresetOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  bookGuideIconLayout?: LayoutBox | null;
  gameIconLayout?: LayoutBox | null;
}

export default function RoutinePresetOnboarding({
  visible,
  onComplete,
  onSkip,
  bookGuideIconLayout,
  gameIconLayout,
}: RoutinePresetOnboardingProps) {
  const responsive = useResponsiveDimensions();
  const { width: screenWidth, height: screenHeight, scaleFont, scaleWidth, scaleHeight, scaleSpacing } = responsive;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !bookGuideIconLayout) return null;

  const hasGameStep = !!gameIconLayout;
  const totalSteps = hasGameStep ? 3 : 1;

  const getHighlight = () => {
    if (step === 0) {
      return {
        left: bookGuideIconLayout.x - scaleSpacing(8),
        top: bookGuideIconLayout.y - scaleSpacing(8),
        width: bookGuideIconLayout.width + scaleSpacing(16),
        height: bookGuideIconLayout.height + scaleSpacing(16),
      };
    }

    if (step === 1 && gameIconLayout) {
      return {
        left: gameIconLayout.x - scaleSpacing(8),
        top: gameIconLayout.y - scaleSpacing(8),
        width: gameIconLayout.width + scaleSpacing(16),
        height: gameIconLayout.height + scaleSpacing(16),
      };
    }

    if (step === 2 && gameIconLayout) {
      const left = Math.min(bookGuideIconLayout.x, gameIconLayout.x) - scaleSpacing(10);
      const top = Math.min(bookGuideIconLayout.y, gameIconLayout.y) - scaleSpacing(10);
      const right = Math.max(
        bookGuideIconLayout.x + bookGuideIconLayout.width,
        gameIconLayout.x + gameIconLayout.width
      ) + scaleSpacing(10);
      const bottom = Math.max(
        bookGuideIconLayout.y + bookGuideIconLayout.height,
        gameIconLayout.y + gameIconLayout.height
      ) + scaleSpacing(10);

      return {
        left,
        top,
        width: right - left,
        height: bottom - top,
      };
    }

    return {
      left: bookGuideIconLayout.x - scaleSpacing(8),
      top: bookGuideIconLayout.y - scaleSpacing(8),
      width: bookGuideIconLayout.width + scaleSpacing(16),
      height: bookGuideIconLayout.height + scaleSpacing(16),
    };
  };

  const highlight = getHighlight();

  const title = step === 0 ? 'Book Guide' : step === 1 ? 'Game' : 'Availability';
  const description = step === 0
    ? 'The left side is Book Guide. This shows the step-by-step routine guide.'
    : step === 1
      ? 'The right side is Game. This opens the mini game for the routine.'
      : 'If a preset shows only one symbol, only that feature is available. For example, if Game is missing, that preset has no mini game.';

  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(290);
    
    // Estimated tooltip height based on content
    const estimatedTooltipHeight = scaleHeight(200);
    
    // Navigation bar height estimate
    const navBarHeight = scaleHeight(100);
    
    const left = (screenWidth - tooltipWidth) / 2;
    
    // Check available space
    const spaceAbove = highlight.top;
    const spaceBelow = screenHeight - (highlight.top + highlight.height);
    
    // For elements near the bottom, always show above
    const distanceFromBottom = screenHeight - (highlight.top + highlight.height);
    const isBottomElement = distanceFromBottom < navBarHeight + scaleHeight(50);

    if (isBottomElement || spaceBelow < estimatedTooltipHeight + navBarHeight) {
      // Show above - with extra padding
      return {
        left,
        bottom: screenHeight - highlight.top + scaleHeight(20),
        width: tooltipWidth,
        maxHeight: spaceAbove - scaleHeight(40),
      };
    }

    // Show below (only when there's plenty of space)
    return {
      left,
      top: highlight.top + highlight.height + scaleHeight(20),
      width: tooltipWidth,
      maxHeight: spaceBelow - scaleHeight(40),
    };
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1);
      return;
    }
    onComplete();
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
          <Svg height={screenDimensions.height} width={screenDimensions.width} style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="routine-preset-mask" x="0" y="0" height="100%" width="100%">
                <Rect height="100%" width="100%" fill="#fff" />
                <Rect
                  x={highlight.left}
                  y={highlight.top}
                  width={highlight.width}
                  height={highlight.height}
                  rx={scaleSpacing(10)}
                  fill="#000"
                />
              </Mask>
            </Defs>
            <Rect
              height="100%"
              width="100%"
              fill="rgba(0, 0, 0, 0.4)"
              mask="url(#routine-preset-mask)"
            />
          </Svg>

          <View
            style={[
              styles.highlight,
              {
                left: highlight.left,
                top: highlight.top,
                width: highlight.width,
                height: highlight.height,
                borderRadius: scaleSpacing(10),
              },
            ]}
          />

          <View style={[styles.tooltip, getTooltipStyle()]}> 
            <View style={styles.tooltipHeader}>
              <Text style={[styles.tooltipTitle, { fontSize: scaleFont(20) }]}>{title}</Text>
              <Text style={[styles.stepIndicator, { fontSize: scaleFont(14) }]}>{step + 1}/{totalSteps}</Text>
            </View>

            <Text style={[styles.tooltipDescription, { fontSize: scaleFont(16) }]}>{description}</Text>

            <View style={styles.tooltipActions}>
              <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                <Text style={[styles.skipText, { fontSize: scaleFont(16) }]}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                style={[
                  styles.nextButton,
                  {
                    paddingHorizontal: scaleSpacing(24),
                    paddingVertical: scaleSpacing(12),
                    borderRadius: scaleSpacing(25),
                  },
                ]}
              >
                <Text style={[styles.nextText, { fontSize: scaleFont(16) }]}>
                  {step < totalSteps - 1 ? 'Next' : 'Got it!'}
                </Text>
                <Ionicons
                  name={step < totalSteps - 1 ? 'arrow-forward' : 'checkmark-circle'}
                  size={scaleFont(18)}
                  color="#fff"
                />
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
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#5DD4B4',
    backgroundColor: 'transparent',
    shadowColor: '#5DD4B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
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
    color: '#8AA0A8',
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
