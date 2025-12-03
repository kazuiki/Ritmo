/**
 * Comprehensive Responsive Design Utilities for Ritmo App
 * 
 * This utility provides consistent responsive scaling across all screens and components.
 * It ensures your app looks the same across different mobile device sizes and dimensions.
 * 
 * Features:
 * - Dynamic scaling based on screen dimensions
 * - Font scaling with proper pixel ratio handling
 * - Breakpoint system for different device categories
 * - Orientation awareness
 * - Real-time updates on dimension changes
 */

import { Dimensions, PixelRatio } from 'react-native';

// Base design dimensions (iPhone 14 as reference)
export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;

// Device breakpoints
export const BREAKPOINTS = {
  small: 320,   // Small phones (iPhone SE, older Android)
  medium: 375,  // Standard phones (iPhone 13 mini, iPhone 12/13)
  large: 390,   // Large phones (iPhone 14, iPhone 13 Pro)
  xlarge: 428,  // Extra large phones (iPhone 14 Plus, iPhone 13 Pro Max)
  tablet: 768,  // Tablets and larger devices
};

// Get current screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Get device category based on width
export const getDeviceCategory = (width?: number) => {
  const screenWidth = width || getScreenDimensions().width;
  
  if (screenWidth >= BREAKPOINTS.tablet) return 'tablet';
  if (screenWidth >= BREAKPOINTS.xlarge) return 'xlarge';
  if (screenWidth >= BREAKPOINTS.large) return 'large';
  if (screenWidth >= BREAKPOINTS.medium) return 'medium';
  return 'small';
};

// Check if device is in landscape mode
export const isLandscape = () => {
  const { width, height } = getScreenDimensions();
  return width > height;
};

// Main responsive scaling function
export const createResponsiveScale = (customWidth?: number, customHeight?: number) => {
  const { width, height } = customWidth && customHeight 
    ? { width: customWidth, height: customHeight }
    : getScreenDimensions();

  // Horizontal scale factor
  const widthScale = width / DESIGN_WIDTH;
  
  // Vertical scale factor  
  const heightScale = height / DESIGN_HEIGHT;
  
  // Use smaller scale factor for more conservative scaling
  const scale = Math.min(widthScale, heightScale);

  /**
   * Scale size horizontally based on screen width
   * @param size - Original size in design
   * @returns Scaled size
   */
  const scaleWidth = (size: number): number => {
    return Math.round(PixelRatio.roundToNearestPixel(size * widthScale));
  };

  /**
   * Scale size vertically based on screen height
   * @param size - Original size in design  
   * @returns Scaled size
   */
  const scaleHeight = (size: number): number => {
    return Math.round(PixelRatio.roundToNearestPixel(size * heightScale));
  };

  /**
   * Scale size proportionally using minimum scale factor
   * Best for maintaining aspect ratios
   * @param size - Original size in design
   * @returns Scaled size
   */
  const scaleSize = (size: number): number => {
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  };

  /**
   * Scale font sizes with proper pixel ratio handling
   * @param size - Original font size in design
   * @returns Scaled font size
   */
  const scaleFont = (size: number): number => {
    // Use width scale for font scaling
    const scaledSize = size * widthScale;
    
    // Apply min/max constraints to prevent extreme scaling
    const minSize = size * 0.8; // Don't scale below 80%
    const maxSize = size * 1.4; // Don't scale above 140%
    
    const constrainedSize = Math.max(minSize, Math.min(maxSize, scaledSize));
    
    return Math.round(PixelRatio.roundToNearestPixel(constrainedSize));
  };

  /**
   * Scale spacing/padding/margins
   * @param size - Original spacing in design
   * @returns Scaled spacing
   */
  const scaleSpacing = (size: number): number => {
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  };

  /**
   * Scale border radius to maintain proportions
   * @param size - Original border radius in design
   * @returns Scaled border radius
   */
  const scaleBorderRadius = (size: number): number => {
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  };

  return {
    width,
    height,
    widthScale,
    heightScale,
    scale,
    scaleWidth,
    scaleHeight,  
    scaleSize,
    scaleFont,
    scaleSpacing,
    scaleBorderRadius,
    deviceCategory: getDeviceCategory(width),
    isLandscape: width > height,
  };
};

// Shorthand functions for common use cases
export const { 
  scaleWidth: sw,
  scaleHeight: sh, 
  scaleSize: ss,
  scaleFont: sf,
  scaleSpacing: sp,
  scaleBorderRadius: sbr 
} = createResponsiveScale();

// Utility for creating responsive styles
export const createResponsiveStyles = (styleFactory: (scale: ReturnType<typeof createResponsiveScale>) => any) => {
  return styleFactory(createResponsiveScale());
};

// Hook for responsive dimensions that updates on orientation change
export const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = React.useState(getScreenDimensions);
  const [responsiveScale, setResponsiveScale] = React.useState(() => createResponsiveScale());
  
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setResponsiveScale(createResponsiveScale(window.width, window.height));
    });

    return () => subscription?.remove();
  }, []);

  return {
    ...dimensions,
    ...responsiveScale,
  };
};

// Device-specific overrides for extreme cases
export const getDeviceSpecificStyle = (styles: {
  small?: any;
  medium?: any; 
  large?: any;
  xlarge?: any;
  tablet?: any;
  default: any;
}) => {
  const category = getDeviceCategory();
  return styles[category] || styles.default;
};

// Safe area helpers for different device types
export const getSafeAreaMultiplier = () => {
  const category = getDeviceCategory();
  
  switch (category) {
    case 'small':
      return 0.8;
    case 'medium':
      return 0.9;
    case 'large':
      return 1.0;
    case 'xlarge':
      return 1.1;
    case 'tablet':
      return 1.2;
    default:
      return 1.0;
  }
};

// Common responsive values
export const RESPONSIVE_VALUES = {
  // Button heights
  buttonHeight: {
    small: ss(44),
    medium: ss(48),
    large: ss(52),
  },
  
  // Icon sizes
  iconSize: {
    small: ss(16),
    medium: ss(20),
    large: ss(24),
    xlarge: ss(28),
  },
  
  // Spacing
  spacing: {
    xs: sp(4),
    sm: sp(8),
    md: sp(16),
    lg: sp(24),
    xl: sp(32),
    xxl: sp(48),
  },
  
  // Font sizes
  fontSize: {
    xs: sf(12),
    sm: sf(14),
    md: sf(16),
    lg: sf(18),
    xl: sf(20),
    xxl: sf(24),
    xxxl: sf(28),
    title: sf(32),
  },
  
  // Border radius
  borderRadius: {
    sm: sbr(4),
    md: sbr(8),
    lg: sbr(12),
    xl: sbr(16),
    xxl: sbr(20),
    round: sbr(999),
  },
};

// Import React for the hook
import React from 'react';

