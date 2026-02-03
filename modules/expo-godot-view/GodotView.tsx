import { requireNativeViewManager } from 'expo-modules-core';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

export interface GodotViewProps extends ViewProps {
  gameScene?: string;
  onGameReady?: (event: { nativeEvent: { scene: string } }) => void;
  onGameEvent?: (event: { nativeEvent: any }) => void;
}

export default function GodotView(props: GodotViewProps) {
  let NativeViewComponent: any;
  try {
    NativeViewComponent = requireNativeViewManager('ExpoGodotView');
  } catch (error) {
    console.warn('ExpoGodotView native view is unavailable:', error);
    return (
      <View style={[styles.container, styles.fallback, props.style]}>
        <Text style={styles.fallbackText}>
          Godot view is not available. Please reinstall the development build.
        </Text>
      </View>
    );
  }

  return <NativeViewComponent {...props} style={[styles.container, props.style]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E6F4FE',
  },
  fallbackText: {
    fontSize: 16,
    color: '#244D4A',
    textAlign: 'center',
    fontWeight: '600',
  },
});
