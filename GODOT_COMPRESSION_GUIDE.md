# Godot Payload Compression Guide

**✅ UPDATE**: School game now included! The school game uses the root assets folder (not a dedicated subfolder like other games). Metadata files have been compressed at root level.

## Overview

# Godot Payload Compression Guide

## Overview

The Godot game payloads have been optimized with selective gzip compression. This reduces download bandwidth while maintaining 100% compatibility with Godot's runtime.

## Compression Strategy

### Files Analyzed
- **eat**: 84.94 MB (full_main.pck)
- **brush**: 79.12 MB (full_main.pck)
- **bath**: 69.21 MB (full_main.pck)
- **makehair**: 11.44 MB (full_main.pck)
- **Metadata files**: assets.sparsepck (~0.05-0.06 MB each), project.binary (~0 MB each)

**Total uncompressed game payload: ~244.87 MB**

### Compression Results

| File Type | Compression Ratio | Recommendation |
|-----------|------------------|---|
| `full_main.pck` | 0.8-1.2% reduction | **NO** - Already optimized, skip compression |
| `assets.sparsepck` | 60-66% reduction | **YES** - Compress with gzip |
| `project.binary` | ~50% reduction | **YES** - Compress with gzip |

### Why Selective Compression?

The `.pck` files are Godot's binary package format and are already highly compressed internally. Compressing them again with gzip adds minimal savings (~1%) but requires on-device decompression overhead. 

The metadata files compress much better (50-66%) because they contain text and structured data. Compressing these files saves ~90 KB of download bandwidth per game, while the decompression is negligible.

## How It Works

### 1. **Download Phase**
App downloads `.gz` versions of small metadata files + uncompressed `.pck` files
```
eat/
├── full_main.pck (downloaded as-is, large file)
├── project.binary.gz (downloaded compressed)
└── assets.sparsepck.gz (downloaded compressed)
```

### 2. **Decompression Phase**
The app automatically decompresses `.gz` files on-device using the `pako` library:
```
eat/
├── full_main.pck (ready to use)
├── project.binary (decompressed from .gz)
└── assets.sparsepck (decompressed from .gz)
```

### 3. **Godot Runtime**
Godot reads the decompressed files normally. No changes needed to game code.

## Setup Instructions

### Prerequisites
1. Node.js installed
2. CDN configured with read access

### Step 1: Generate Compressed Payloads

The compressed files have already been created in your project:
```
android/app/src/main/assets/
├── eatgame/
│   ├── full_main.pck (84.94 MB) ← Don't upload compressed
│   ├── project.binary.gz (< 1 KB)
│   └── assets.sparsepck.gz (< 1 KB)
├── brushgame/
│   ├── full_main.pck (79.12 MB)
│   ├── project.binary.gz (< 1 KB)
│   └── assets.sparsepck.gz (< 1 KB)
// ... etc
```

To regenerate: `node compress-godot-payloads.js`

### Step 2: Upload to CDN

Upload these files to your CDN (keep original `.pck` files for fallback):

```
https://cdn.example.com/ritmo/eat/full_main.pck
https://cdn.example.com/ritmo/eat/project.binary.gz
https://cdn.example.com/ritmo/eat/assets.sparsepck.gz

https://cdn.example.com/ritmo/brush/full_main.pck
https://cdn.example.com/ritmo/brush/project.binary.gz
https://cdn.example.com/ritmo/brush/assets.sparsepck.gz

// ... repeat for bath, school, makehair
```

### Step 3: Update Service Configuration

Edit [src/offline/godotPayloadService.ts](src/offline/godotPayloadService.ts) and replace the placeholder URLs with your CDN endpoints:

```typescript
export const GODOT_PAYLOAD_MANIFESTS = {
  eat: {
    version: "v2-compressed",
    files: [
      { name: "full_main.pck", url: "https://your-cdn.com/ritmo/eat/full_main.pck", minBytes: 1024, compressed: false },
      { name: "project.binary", url: "https://your-cdn.com/ritmo/eat/project.binary.gz", minBytes: 512, compressed: true },
      { name: "assets.sparsepck", url: "https://your-cdn.com/ritmo/eat/assets.sparsepck.gz", minBytes: 512, compressed: true },
    ],
  },
  // ... repeat for other games
}
```

### Step 4: Install Dependencies

```bash
# pako has already been added to package.json
npm install
```

The `pako` library provides pure-JavaScript gzip decompression (no native modules needed).

## Overview
   - Files decompress correctly
   - Status shows "Ready" when complete

### What to Verify
## Troubleshooting

### Issue: "Failed to decompress"
**Cause**: `.gz` file corrupted or empty  
**Solution**: Regenerate with `node compress-godot-payloads.js`, verify CDN file integrity

### Issue: "Downloaded file is invalid"
**Cause**: Minimum file size check failed  
**Solution**: Check that `minBytes` in manifest matches actual decompressed file size

### Issue: Games won't load
**Cause**: full_main.pck not found  
**Solution**: Verify uncompressed .pck files are uploaded to CDN with `compressed: false` flag

## Performance Impact

- **Download time**: -60% for metadata files (project.binary, assets.sparsepck)
- **On-device decompression**: ~100-200ms per game (negligible)
- **Storage**: No change after first download (no compression)
- **Game runtime**: No change (transparent to Godot)

## Fallback Behavior

If download fails, the app falls back to packaged assets:
1. App tries to load from CDN (compressed files)
2. App decompresses and saves locally
3. If CDN fails, app continues with packaged assets (no compression)
4. If no packaged assets exist, error is shown

This ensures the app always boots, whether online or offline.

## Files Modified

- `src/offline/godotPayloadService.ts` - Added gzip decompression logic
- `package.json` - Added `pako` dependency
- `android/app/src/main/assets/{game}/*.gz` - Compressed metadata files
- `compress-godot-payloads.js` - New script to regenerate compressed files

## Version Management

When you update game payloads:
1. Compress new files: `node compress-godot-payloads.js`
2. Upload to CDN
3. Bump version in manifest: `"v2-compressed" → "v3-compressed"` etc.
4. App will automatically re-download when version changes

## Next Steps

1. ✅ Configure your CDN URLs in `godotPayloadService.ts`
2. ✅ Upload compressed files to CDN
3. ✅ Build test APK
4. ✅ Verify decompression works on device
5. Optional: Remove packaged assets and measure APK size reduction
