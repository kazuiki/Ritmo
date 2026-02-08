import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
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
}

export default function ProgressOnboarding({ 
  visible, 
  onComplete, 
  onSkip,
  weekButtonLayout 
}: ProgressOnboardingProps) {
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

  if (!visible || !weekButtonLayout) return null;

  const highlightPosition = {
    left: weekButtonLayout.x,
    top: weekButtonLayout.y,
    width: weekButtonLayout.width,
    height: weekButtonLayout.height,
  };

  const getTooltipStyle = () => {
    const tooltipWidth = scaleWidth(280);
    const left = (screenWidth - tooltipWidth) / 2;
    const top = highlightPosition.top + highlightPosition.height + scaleHeight(20);

    return {
      left,
      top,
      width: tooltipWidth,
    };
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
                rx={scaleSpacing(8)}
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
            {
              position: 'absolute',
              left: highlightPosition.left,
              top: highlightPosition.top,
              width: highlightPosition.width,
              height: highlightPosition.height,
              borderRadius: scaleSpacing(8),
            },
          ]}
        />

        <View style={[styles.tooltip, getTooltipStyle()]}>
          <View style={styles.tooltipHeader}>
            <Text style={[styles.tooltipTitle, { fontSize: scaleFont(20) }]}>
              View History
            </Text>
          </View>
          
          <Text style={[styles.tooltipDescription, { fontSize: scaleFont(16) }]}>
            Tap here to view your weekly progress history and see how you've done over time!
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
    elevation: 8,
  },
  tooltipHeader: {
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
