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

interface ProgressOnboardingProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  weekButtonLayout?: { x: number; y: number; width: number; height: number } | null;
  savePdfButtonLayout?: { x: number; y: number; width: number; height: number } | null;
}

export default function ProgressOnboarding({ 
  visible, 
  onComplete, 
  onSkip,
  weekButtonLayout,
  savePdfButtonLayout,
}: ProgressOnboardingProps) {
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

  if (!visible || !weekButtonLayout) return null;

  const hasSecondStep = !!savePdfButtonLayout;
  const currentLayout = step === 0 ? weekButtonLayout : savePdfButtonLayout;
  if (!currentLayout) return null;

  const highlightPosition = {
    left: currentLayout.x,
    top: currentLayout.y,
    width: currentLayout.width,
    height: currentLayout.height,
  };
  const highlightBorderRadius = step === 0 ? scaleSpacing(8) : scaleSpacing(16);

  const stepTitle = step === 0 ? 'View History' : 'Save as PDF';
  const stepDescription = step === 0
    ? "Tap here to view your weekly progress history and see how you've done over time!"
    : 'Tap here to download and save your weekly progress report as a PDF file.';

  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(280);
    const left = (screenWidth - tooltipWidth) / 2;
    const spaceBelow = screenHeight - (highlightPosition.top + highlightPosition.height);

    if (spaceBelow > scaleHeight(220)) {
      return {
        left,
        top: highlightPosition.top + highlightPosition.height + scaleHeight(20),
        width: tooltipWidth,
      };
    }

    return {
      left,
      bottom: screenHeight - highlightPosition.top + scaleHeight(20),
      width: tooltipWidth,
    };
  };

  const handleNext = () => {
    if (step === 0 && hasSecondStep) {
      setStep(1);
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
            <Mask id="mask" x="0" y="0" height="100%" width="100%">
              <Rect height="100%" width="100%" fill="#fff" />
              <Rect
                x={highlightPosition.left}
                y={highlightPosition.top}
                width={highlightPosition.width}
                height={highlightPosition.height}
                rx={highlightBorderRadius}
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

        <View
          style={[
            styles.highlight,
            step === 1 && styles.highlightExact,
            {
              position: 'absolute',
              left: highlightPosition.left,
              top: highlightPosition.top,
              width: highlightPosition.width,
              height: highlightPosition.height,
              borderRadius: highlightBorderRadius,
            },
          ]}
        />

        <View style={[styles.tooltip, getTooltipStyle()]}>
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { fontSize: scaleFont(20) }]}>
              {stepTitle}
            </Text>
            <Text style={[styles.stepIndicator, { fontSize: scaleFont(14) }]}>
              {step + 1}/{hasSecondStep ? 2 : 1}
            </Text>
          </View>
          
          <Text style={[styles.tooltipDescription, { fontSize: scaleFont(16) }]}>
            {stepDescription}
          </Text>

          <View style={styles.tooltipActions}>
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { fontSize: scaleFont(16) }]}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleNext} 
              style={[styles.nextButton, { 
                paddingHorizontal: scaleSpacing(24),
                paddingVertical: scaleSpacing(12),
                borderRadius: scaleSpacing(25),
              }]}
            >
              <Text style={[styles.nextText, { fontSize: scaleFont(16) }]}>
                {step === 0 && hasSecondStep ? 'Next' : 'Got it!'}
              </Text>
              <Ionicons name={step === 0 && hasSecondStep ? 'arrow-forward' : 'checkmark-circle'} size={scaleFont(18)} color="#fff" />
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
    borderWidth: 3,
    borderColor: '#5DD4B4',
    backgroundColor: 'transparent',
    shadowColor: '#5DD4B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  highlightExact: {
    borderWidth: 2,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
