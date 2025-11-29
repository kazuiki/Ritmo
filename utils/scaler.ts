import { Dimensions, PixelRatio } from "react-native";

const { width, height } = Dimensions.get("window");

// Base sizes taken from standard mobile design (375 × 812)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export function scale(size: number) {
  return (width / BASE_WIDTH) * size;
}

export function vscale(size: number) {
  return (height / BASE_HEIGHT) * size;
}

export function scaleFont(size: number) {
  const newSize = (width / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}
