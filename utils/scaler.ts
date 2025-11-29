import { Dimensions, PixelRatio } from "react-native";

let { width, height } = Dimensions.get("window");

// Recalculate when orientation changes
Dimensions.addEventListener("change", ({ window }) => {
  width = window.width;
  height = window.height;
});

// Base design from a standard phone 375 x 812
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Detect if the device is tablet
const isTablet = Math.min(width, height) >= 600;

// Normalize scale so large screens (tablets, foldables) don’t overscale
const normalize = (value: number) => {
  if (isTablet) return value * 0.7;        // reduce scale 30% on tablets
  if (width > 430) return value * 0.9;     // very large phones (Pro Max)
  return value;
};

export function scale(size: number) {
  const scaled = (width / BASE_WIDTH) * size;
  return normalize(scaled);
}

export function vscale(size: number) {
  const scaled = (height / BASE_HEIGHT) * size;
  return normalize(scaled);
}

export function scaleFont(size: number) {
  const newSize = (width / BASE_WIDTH) * size;
  const scaled = PixelRatio.roundToNearestPixel(newSize);
  return normalize(scaled);
}

export const Screen = {
  width,
  height,
  isTablet,
};
