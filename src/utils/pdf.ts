import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { findNodeHandle, Linking, UIManager } from 'react-native';
import { captureRef } from 'react-native-view-shot';

type PageSize = 'A4' | 'Legal' | 'Letter';

const PAGE_MM: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Legal: { w: 216, h: 356 },
  Letter: { w: 216, h: 279 },
};

async function measureView(ref: React.RefObject<any>): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const node = findNodeHandle(ref.current);
    if (!node) return resolve({ width: 0, height: 0 });
    UIManager.measure(node, (_x, _y, width, height) => {
      resolve({ width, height });
    });
  });
}

export async function saveViewAsPdf(params: {
  ref: React.RefObject<any>;
  filename?: string;
  pageSize?: PageSize;
  targetWidthPx?: number; // optional explicit capture width in px; if omitted we derive from paper size @ ~96dpi
  openAfterSave?: boolean; // when true, tries to open the PDF immediately
  marginMm?: number; // page margins around content (default 10mm)
  scalePercent?: number; // content scale relative to printable width (0.1 - 1.0)
  logoModule?: number | null; // deprecated; pass null to omit logo
  logoWidthMm?: number; // width of logo in mm (default 24mm)
}): Promise<string> {
  const { ref, filename = `ritmo-${Date.now()}.pdf`, pageSize = 'A4', targetWidthPx, openAfterSave = true, marginMm = 10, scalePercent = 0.85, logoModule = null, logoWidthMm = 24 } = params;

  // 1) Measure the view so we can compute image height at target width
  const { width: viewW, height: viewH } = await measureView(ref);
  if (!viewW || !viewH) {
    throw new Error('Unable to measure view for PDF capture.');
  }

  // 2) Determine a capture width that maps closely to physical page width to avoid zoom/cropping.
  //    Use 96dpi approximation: px = (mm / 25.4) * 96
  const { w: mmW, h: mmH } = PAGE_MM[pageSize];
  const printableMm = Math.max(10, mmW - 2 * marginMm);
  const derivedWidthPx = Math.round((printableMm / 25.4) * 96); // e.g. A4 ~ width minus margins
  const captureWidth = targetWidthPx ? Math.round(targetWidthPx) : derivedWidthPx;
  const scale = captureWidth / viewW;

  // 3) Capture full view once (single tall image). Printing engine will paginate automatically.
  const capture = await captureRef(ref, {
    format: 'png',
    result: 'base64',
    quality: 1,
    width: captureWidth,
  });

  // 4) Build simplified HTML: one image scaled to page width; natural overflow breaks onto subsequent pages.
  // Optional logo
  const logoBase64: string | undefined = undefined;

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: ${pageSize}; margin: ${marginMm}mm; }
        html, body { margin: 0; padding: 0; }
        body { width: 100%; }
        .contentWrap { width: 100%; margin-top: ${marginMm}mm; display: flex; justify-content: center; }
        .content { width: ${(printableMm * Math.max(0.1, Math.min(1, scalePercent))).toFixed(2)}mm; height: auto; display: block; }
      </style>
    </head>
    <body>
      <div class="contentWrap">
        <img class="content" src="data:image/png;base64,${capture}" />
      </div>
    </body>
  </html>`;

  // 5) Render PDF without preview
  const file = await Print.printToFileAsync({ html });

  // 6) Move to app documents (fallback to cache) with provided filename
  const docDir: string | undefined = (FileSystem as any).documentDirectory;
  const cacheDir: string | undefined = (FileSystem as any).cacheDirectory;
  const baseDir = docDir ?? cacheDir ?? '';
  const dest = `${baseDir}${filename}`;
  let finalPath = file.uri;
  try {
    await FileSystem.copyAsync({ from: file.uri, to: dest });
    finalPath = dest;
  } catch {
    // keep finalPath as generated file
  }

  // 7) Optionally open the PDF immediately
  if (openAfterSave) {
    try {
      // Try opening directly via Linking first
      await Linking.openURL(finalPath);
    } catch {
      // If direct open fails or unsupported, fall back to share sheet
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(finalPath, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        }
      } catch {
        // ignore; caller can show path if needed
      }
    }
  }

  return finalPath;
}

export function defaultPdfFilename(prefix: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  return `${prefix}-${yyyy}${mm}${dd}-${hh}${mi}.pdf`;
}
