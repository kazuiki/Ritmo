import React from 'react';
export function createAssetMap(
  basePath: string,
  assets: Record<string, string[]>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [prefix, fileList] of Object.entries(assets)) {
    fileList.forEach((file, index) => {
      const key = fileList.length > 1 
        ? `${prefix}${index + 1}`
        : prefix;
      
      result[key] = require(`${basePath}/${file}`);
    });
  }

  return result;
}

export function getMultipleAssetUris(getAssetUri: (key: string) => string | null, keys: string[]): (string | null)[] {
  return keys.map(key => getAssetUri(key));
}

export function getAnimationFrameUris(
  getAssetUri: (key: string) => string | null,
  baseKey: string,
  frameCount: number
): (string | null)[] {
  return Array.from({ length: frameCount }, (_, i) =>
    getAssetUri(`${baseKey}${i + 1}`)
  );
}

export function filterValidUris(uris: (string | null)[]): string[] {
  return uris.filter((uri): uri is string => uri !== null);
}

import { Image, ImageProps, View } from 'react-native';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri: string | null;
  fallback?: React.ReactNode;
}

const SafeImageComponent = React.forwardRef<any, SafeImageProps>(
  ({ uri, fallback, ...props }, ref) => {
    if (!uri) {
      return fallback ? (
        fallback as React.ReactElement
      ) : (
        <View style={{ width: 50, height: 50, backgroundColor: '#ddd' }} />
      );
    }

    return <Image ref={ref} {...props} source={{ uri }} />;
  }
);

SafeImageComponent.displayName = 'SafeImage';

export const SafeImage = SafeImageComponent;

export function createAssetGroupFromPattern(
  basePath: string,
  filePrefix: string,
  fileSuffix: string,
  count: number
): Record<string, any> {
  const result: Record<string, any> = {};

  for (let i = 1; i <= count; i++) {
    const key = `${filePrefix}${i}`;
    const fileName = `${filePrefix}${i}${fileSuffix}`;
    
    try {
      result[key] = require(`${basePath}${i}${fileSuffix}`);
    } catch (error) {
      console.warn(`Could not load ${key}, you may need to define assets manually`);
    }
  }

  return result;
}


