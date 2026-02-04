import { NativeModulesProxy } from 'expo-modules-core';

// The native module
const ExpoGodotViewModule = NativeModulesProxy.ExpoGodotView;

export { default as GodotView } from './GodotView';
export type { GodotViewProps } from './GodotView';
export { ExpoGodotViewModule };

