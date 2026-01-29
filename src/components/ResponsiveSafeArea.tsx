import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ResponsiveSafeAreaProps {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  backgroundColor?: string;
}

/**
 * ResponsiveSafeArea - A wrapper component that ensures content is properly positioned
 * within the safe area boundaries on all devices, including those with notches,
 * navigation bars, and home indicators.
 * 
 * Usage:
 * <ResponsiveSafeArea edges={['top', 'bottom']}>
 *   <YourContent />
 * </ResponsiveSafeArea>
 */
export const ResponsiveSafeArea: React.FC<ResponsiveSafeAreaProps> = ({
  children,
  style,
  edges = ['top', 'right', 'bottom', 'left'],
  backgroundColor = '#E8FFFA',
}) => {
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
};

/**
 * ResponsiveSafeAreaTop - Safe area for top only (useful for screens with custom bottom nav)
 */
export const ResponsiveSafeAreaTop: React.FC<Omit<ResponsiveSafeAreaProps, 'edges'>> = (props) => {
  return <ResponsiveSafeArea {...props} edges={['top']} />;
};

/**
 * ResponsiveSafeAreaBottom - Safe area for bottom only
 */
export const ResponsiveSafeAreaBottom: React.FC<Omit<ResponsiveSafeAreaProps, 'edges'>> = (props) => {
  return <ResponsiveSafeArea {...props} edges={['bottom']} />;
};
