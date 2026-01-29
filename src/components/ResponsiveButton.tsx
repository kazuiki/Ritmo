import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { useResponsiveDimensions } from '../utils/responsive';

interface ResponsiveButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'text' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const { scaleFont, scaleWidth, scaleHeight, scaleSpacing } = useResponsiveDimensions();

  const sizeConfig = {
    small: {
      paddingVertical: scaleSpacing(8),
      paddingHorizontal: scaleSpacing(16),
      fontSize: scaleFont(14),
      borderRadius: scaleSpacing(8),
    },
    medium: {
      paddingVertical: scaleSpacing(12),
      paddingHorizontal: scaleSpacing(24),
      fontSize: scaleFont(16),
      borderRadius: scaleSpacing(12),
    },
    large: {
      paddingVertical: scaleSpacing(16),
      paddingHorizontal: scaleSpacing(32),
      fontSize: scaleFont(18),
      borderRadius: scaleSpacing(16),
    },
  };

  const variantStyles: Record<string, { button: ViewStyle; text: TextStyle }> = {
    primary: {
      button: {
        backgroundColor: '#2F7C72',
        ...styles.baseButton,
      },
      text: {
        color: '#FFFFFF',
        fontWeight: '700',
      },
    },
    secondary: {
      button: {
        backgroundColor: '#5DD4B4',
        ...styles.baseButton,
      },
      text: {
        color: '#FFFFFF',
        fontWeight: '600',
      },
    },
    outline: {
      button: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#2F7C72',
        ...styles.baseButton,
      },
      text: {
        color: '#2F7C72',
        fontWeight: '600',
      },
    },
    text: {
      button: {
        backgroundColor: 'transparent',
      },
      text: {
        color: '#2F7C72',
        fontWeight: '600',
        textDecorationLine: 'underline',
      },
    },
  };

  const currentSize = sizeConfig[size];
  const currentVariant = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        currentVariant.button,
        {
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          borderRadius: currentSize.borderRadius,
        },
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.text.color} />
      ) : (
        <Text
          style={[
            currentVariant.text,
            {
              fontSize: currentSize.fontSize,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
