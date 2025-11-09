// constants/fonts.ts
// Child-friendly font configuration for special needs users

export const FONTS = {
  // Primary friendly font (Fredoka - rounded, clear, easy to read)
  PRIMARY_REGULAR: 'Fredoka_400Regular',
  PRIMARY_MEDIUM: 'Fredoka_500Medium',
  PRIMARY_SEMIBOLD: 'Fredoka_600SemiBold',
  PRIMARY_BOLD: 'Fredoka_700Bold',
  
  // Fallback
  FALLBACK: 'System',
};

export const FONT_SIZES = {
  // Extra large for headings and important info
  XXXL: 36,
  XXL: 32,
  XL: 28,
  
  // Large for titles and buttons
  LARGE: 24,
  MEDIUM_LARGE: 22,
  
  // Medium for body text
  MEDIUM: 18,
  
  // Small for labels and secondary text
  SMALL: 16,
  XSMALL: 14,
  XXSMALL: 12,
};

// Helper to get font family with fallback
export const getFontFamily = (weight: 'regular' | 'medium' | 'semibold' | 'bold' = 'regular') => {
  const fontMap = {
    regular: FONTS.PRIMARY_REGULAR,
    medium: FONTS.PRIMARY_MEDIUM,
    semibold: FONTS.PRIMARY_SEMIBOLD,
    bold: FONTS.PRIMARY_BOLD,
  };
  return fontMap[weight] || FONTS.PRIMARY_REGULAR;
};

// Text style presets for consistency
export const TEXT_STYLES = {
  // Headings
  heading1: {
    fontFamily: FONTS.PRIMARY_BOLD,
    fontSize: FONT_SIZES.XXXL,
    lineHeight: FONT_SIZES.XXXL * 1.3,
  },
  heading2: {
    fontFamily: FONTS.PRIMARY_BOLD,
    fontSize: FONT_SIZES.XXL,
    lineHeight: FONT_SIZES.XXL * 1.3,
  },
  heading3: {
    fontFamily: FONTS.PRIMARY_SEMIBOLD,
    fontSize: FONT_SIZES.XL,
    lineHeight: FONT_SIZES.XL * 1.3,
  },
  
  // Titles
  title: {
    fontFamily: FONTS.PRIMARY_SEMIBOLD,
    fontSize: FONT_SIZES.LARGE,
    lineHeight: FONT_SIZES.LARGE * 1.3,
  },
  subtitle: {
    fontFamily: FONTS.PRIMARY_MEDIUM,
    fontSize: FONT_SIZES.MEDIUM_LARGE,
    lineHeight: FONT_SIZES.MEDIUM_LARGE * 1.3,
  },
  
  // Body text
  body: {
    fontFamily: FONTS.PRIMARY_REGULAR,
    fontSize: FONT_SIZES.MEDIUM,
    lineHeight: FONT_SIZES.MEDIUM * 1.5,
  },
  bodyBold: {
    fontFamily: FONTS.PRIMARY_SEMIBOLD,
    fontSize: FONT_SIZES.MEDIUM,
    lineHeight: FONT_SIZES.MEDIUM * 1.5,
  },
  
  // Small text
  caption: {
    fontFamily: FONTS.PRIMARY_REGULAR,
    fontSize: FONT_SIZES.SMALL,
    lineHeight: FONT_SIZES.SMALL * 1.4,
  },
  captionBold: {
    fontFamily: FONTS.PRIMARY_SEMIBOLD,
    fontSize: FONT_SIZES.SMALL,
    lineHeight: FONT_SIZES.SMALL * 1.4,
  },
  
  // Buttons
  button: {
    fontFamily: FONTS.PRIMARY_SEMIBOLD,
    fontSize: FONT_SIZES.MEDIUM_LARGE,
    lineHeight: FONT_SIZES.MEDIUM_LARGE * 1.2,
  },
  buttonLarge: {
    fontFamily: FONTS.PRIMARY_BOLD,
    fontSize: FONT_SIZES.LARGE,
    lineHeight: FONT_SIZES.LARGE * 1.2,
  },
};
