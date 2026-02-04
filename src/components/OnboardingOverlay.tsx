import { StyleSheet, View } from 'react-native';

interface OnboardingOverlayProps {
  visible: boolean;
  highlightArea?: {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius?: number;
  };
}

/**
 * Simple overlay component that darkens the screen except for a highlighted area
 */
export default function OnboardingOverlay({ visible, highlightArea }: OnboardingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Semi-transparent overlay */}
      <View style={styles.overlay} />
      
      {/* Highlighted area (transparent cutout) */}
      {highlightArea && (
        <View
          style={[
            styles.highlight,
            {
              left: highlightArea.left,
              top: highlightArea.top,
              width: highlightArea.width,
              height: highlightArea.height,
              borderRadius: highlightArea.borderRadius || 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#5DD4B4',
    backgroundColor: 'transparent',
  },
});
