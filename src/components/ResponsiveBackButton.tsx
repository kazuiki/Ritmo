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
  useSafeAreaPadding?: boolean;
}

export const ResponsiveBackButton: React.FC<ResponsiveBackButtonProps> = ({
  onPress,
  title = 'Back',
  style,
  color = '#244D4A',
  position = 'relative',
  useSafeAreaPadding = true,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scaleFont, scaleSpacing } = useResponsiveDimensions();
  const baseTopPadding = position === 'absolute' ? scaleSpacing(8) : scaleSpacing(16);
  const topPadding = useSafeAreaPadding ? baseTopPadding + insets.top : baseTopPadding;

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
          paddingTop: topPadding,
          paddingHorizontal: scaleSpacing(20),
          paddingBottom: scaleSpacing(10),
        },
        position === 'absolute' && styles.absolute,
        style,
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={scaleFont(26)} color={color} style={styles.icon} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[
          styles.backButtonText,
          {
            fontSize: scaleFont(20),
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
