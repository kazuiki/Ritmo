import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveDimensions } from '../utils/responsive';

interface ResponsiveBackButtonProps {
  onPress?: () => void;
  title?: string;
  style?: ViewStyle;
  color?: string;
  position?: 'absolute' | 'relative';
}

export const ResponsiveBackButton: React.FC<ResponsiveBackButtonProps> = ({
  onPress,
  title = 'Back',
  style,
  color = '#244D4A',
  position = 'relative',
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scaleFont, scaleSpacing } = useResponsiveDimensions();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.backButton,
        {
          paddingTop: position === 'absolute' ? insets.top + scaleSpacing(8) : scaleSpacing(16),
          paddingHorizontal: scaleSpacing(16),
          paddingBottom: scaleSpacing(8),
        },
        position === 'absolute' && styles.absolute,
        style,
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={scaleFont(24)} color={color} style={styles.icon} />
      <Text
        style={[
          styles.backButtonText,
          {
            fontSize: scaleFont(18),
            color: color,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  icon: {
    marginRight: 4,
  },
  backButtonText: {
    fontWeight: '700',
    fontFamily: 'Fredoka_700Bold',
  },
});
