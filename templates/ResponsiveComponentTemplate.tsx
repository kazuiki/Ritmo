/**
 * Responsive Component Template
 * 
 * Copy this template when creating new responsive components
 * Replace "YourComponent" with your actual component name
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ResponsiveTheme } from '../constants/theme';
import { createResponsiveStyles, useResponsiveDimensions } from '../src/utils/responsive';

interface YourComponentProps {
  title?: string;
  onPress?: () => void;
  // Add your props here
}

export default function YourComponent({ 
  title = "Default Title",
  onPress,
  ...props 
}: YourComponentProps) {
  
  // Get responsive dimensions and scaling functions
  const responsive = useResponsiveDimensions();
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing, deviceCategory } = responsive;

  // Create responsive styles
  const styles = createResponsiveStyles((scale) => StyleSheet.create({
    container: {
      padding: scale.scaleSpacing(16),
      borderRadius: scale.scaleBorderRadius(12),
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scale.scaleHeight(2) },
      shadowOpacity: 0.1,
      shadowRadius: scale.scaleSpacing(4),
      elevation: 2,
    },
    title: {
      fontSize: scale.scaleFont(18),
      fontWeight: '600',
      color: '#244D4A',
      marginBottom: scale.scaleSpacing(8),
      textAlign: 'center',
    },
    button: {
      backgroundColor: '#06C08A',
      paddingVertical: scale.scaleSpacing(12),
      paddingHorizontal: scale.scaleSpacing(24),
      borderRadius: scale.scaleBorderRadius(8),
      alignItems: 'center',
      minHeight: scale.scaleHeight(44), // Ensure touch target
    },
    buttonText: {
      fontSize: scale.scaleFont(16),
      fontWeight: '600',
      color: '#FFFFFF',
    },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {onPress && (
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>Tap Me</Text>
        </TouchableOpacity>
      )}
      
      {/* Device category debug (remove in production) */}
      {__DEV__ && (
        <Text style={{ fontSize: scaleFont(12), color: '#666', textAlign: 'center', marginTop: scaleSpacing(8) }}>
          Device: {deviceCategory} | Width: {responsive.width}
        </Text>
      )}
    </View>
  );
}

// Alternative approach using theme values directly
const alternativeStyles = createResponsiveStyles((scale) => StyleSheet.create({
  container: {
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  button: {
    height: ResponsiveTheme.button.medium,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
}));