declare module 'expo-router' {
  export * from 'expo-router/build/index';
}

declare module 'expo-intent-launcher' {
  export * from 'expo-intent-launcher/build/IntentLauncher';
}

declare module '@expo/vector-icons' {
  export * from '@expo/vector-icons/build/Icons';
}

declare module 'expo-av' {
  export * from 'expo-av/build/index';
}

declare module 'expo-image' {
  export * from 'expo-image/build/index';
}

declare module 'moti' {
  export { Image as MotiImage } from './node_modules/moti/build/components/image';
    export { View as MotiView } from './node_modules/moti/build/components/view';
    export type * from './node_modules/moti/build/core';
}