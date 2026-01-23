import * as FileSystem from 'expo-file-system/legacy';
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

export async function saveWeeklyPerformanceReportPdf(params: {
  childName: string;
  weekStart: Date;
  weekEnd: Date;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  tasks: Array<{
    name: string;
    timestamp: string;
    statuses: (boolean | null | undefined)[];
    routineId: number;
    perTaskDone: number;
  }>;
  logoBase64?: string;
  openAfterSave?: boolean;
}): Promise<string> {
  const {
    childName,
    weekStart,
    weekEnd,
    totalTasks,
    completedTasks,
    completionRate,
    tasks,
    logoBase64 = '',
    openAfterSave = true,
  } = params;

  // Format dates
  const formatDate = (d: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  };

  const weekCoveredText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  const generatedOnText = formatDate(new Date());
  
  // Extract dates for filename in shorter format
  const yyyyStart = weekStart.getFullYear();
  const mmStart = String(weekStart.getMonth() + 1).padStart(2, '0');
  const ddStart = String(weekStart.getDate()).padStart(2, '0');
  const yyyyEnd = weekEnd.getFullYear();
  const mmEnd = String(weekEnd.getMonth() + 1).padStart(2, '0');
  const ddEnd = String(weekEnd.getDate()).padStart(2, '0');
  
  const filename = `Ritmo_${childName}_${mmStart}-${ddStart}-${yyyyStart}–${mmEnd}-${ddEnd}-${yyyyEnd}.pdf`;

  // Build HTML for PDF
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const taskRowsHtml = tasks
    .map((task) => {
      const statusCells = task.statuses
        .map((status) => {
          let color = '#CCCCCC'; // Not scheduled (gray)
          if (status === true) {
            color = '#1EBE69'; // Done (green)
          } else if (status === false) {
            color = '#F56A6A'; // Missed (red)
          } else if (status === null) {
            color = '#FFA500'; // Pending (orange)
          }
          return `<td class="status-cell" style="text-align: center; padding: 6px 2px; border: none !important;"><div style="width: 18px; height: 18px; background-color: ${color}; border-radius: 2px; margin: 0 auto;"></div></td>`;
        })
        .join('');
      
      return `
        <tr>
          <td style="text-align: left; padding: 6px 6px; font-weight: 500; font-size: 14px; width: 35%; border-bottom: 1px solid #E6F6F1;">
            <div style="font-size: 14px; font-weight: 700; color: #244D4A;">${task.name}</div>
            <div style="font-size: 12px; color: #6B8E7E; margin-top: 2px;">${task.timestamp}</div>
          </td>
          ${statusCells}
          <td style="text-align: center; padding: 6px 6px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #E6F6F1;">${task.perTaskDone}</td>
        </tr>
      `;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: A4;
        margin: 2.54cm;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #333;
        line-height: 1.6;
        height: 100%;
        orphans: 3;
        widows: 3;
      }
      .page-wrapper {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        padding: 0;
      }
      .content {
        flex: 1;
        padding-bottom: 60px;
      }
      .header-logo {
        width: 100px;
        height: auto;
        margin-bottom: 2px;
      }
      .divider-line {
        border: none;
        border-top: 2px solid #999;
        margin: 10px 0;
        padding: 0;
        height: 0;
      }
      .title {
        text-align: center;
        font-size: 28px;
        font-weight: bold;
        color: #244D4A;
        margin: 14px 0;
        font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .report-info {
        font-size: 12px;
        color: #333;
        margin: 14px 0;
        line-height: 1.9;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .info-label {
        font-weight: 700;
      }
      .metrics-container {
        display: flex;
        justify-content: space-around;
        gap: 12px;
        margin: 18px 0;
      }
      .metric-card {
        flex: 1;
        border: 2px solid #CFF6EB;
        border-radius: 8px;
        padding: 14px;
        text-align: center;
      }
      .metric-title {
        font-size: 12px;
        font-weight: 700;
        color: #2A3B4D;
        margin-bottom: 8px;
      }
      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #2A3B4D;
      }
      .card-title {
        font-size: 16px;
        font-weight: 700;
        color: #2A3B4D;
        margin: 18px 0 12px 0;
        text-align: center;
      }
      .tracker-table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
        font-size: 13px;
        page-break-inside: auto;
      }
      .tracker-table thead {
        display: table-header-group;
      }
      .tracker-table tbody {
        display: table-row-group;
      }
      .tracker-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: auto;
        break-after: auto;
        display: table-row;
      }
      .tracker-table tbody tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-before: auto;
        page-break-after: auto;
      }
      .tracker-table tbody tr td {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .tracker-table th {
        border-bottom: 2px solid #CFF6EB;
        padding: 10px 6px;
        text-align: center;
        font-weight: 700;
        color: #2A3B4D;
        font-size: 13px;
      }
      .tracker-table th:first-child {
        text-align: left;
      }
      .tracker-table td {
        border-bottom: 1px solid #E6F6F1;
        padding: 10px 6px;
        text-align: center;
      }
      .tracker-table td:first-child {
        text-align: left;
      }
      .status-cell {
        border: none !important;
        padding: 6px 2px !important;
      }
      .legend {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin: 14px 0;
        font-size: 12px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .legend-green { background-color: #1EBE69; }
      .legend-red { background-color: #F56A6A; }
      .legend-orange { background-color: #FFA500; }
      .legend-gray { background-color: #E0E0E0; }
      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        text-align: center;
        font-size: 11px;
        color: #666;
        padding: 12px 2.54cm;
        width: 100%;
        z-index: 100;
        background: transparent;
      }
      .footer-line {
        margin: 4px 0;
      }
      .footer-spacer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60px;
        pointer-events: none;
        z-index: 99;
      }
      .footer-line {
        margin: 4px 0;
      }
    </style>
  </head>
  <body>
    <div class="page-wrapper">
      <div class="content">
        <!-- Header with Logo -->
        <div>
          ${logoBase64 ? `<img class="header-logo" src="data:image/png;base64,${logoBase64}" />` : ''}
          <hr class="divider-line" />
          <div class="title">Weekly Performance Report</div>
          <hr class="divider-line" />
        </div>

        <!-- Report Info -->
        <div class="report-info">
          <div class="info-row">
            <span><span class="info-label">Child Nickname:</span> ${childName}</span>
            <span><span class="info-label">Report Type:</span> Weekly Summary</span>
          </div>
          <div style="margin-bottom: 4px;"><span class="info-label">Week Covered:</span> ${weekCoveredText}</div>
          <div><span class="info-label">Generated On:</span> ${generatedOnText}</div>
        </div>

        <!-- Metrics Cards -->
        <div class="metrics-container">
          <div class="metric-card">
            <div class="metric-title">Total Task</div>
            <div class="metric-value">${totalTasks}</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Completed Task</div>
            <div class="metric-value">${completedTasks}</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Completion Rate</div>
            <div class="metric-value">${completionRate}%</div>
          </div>
        </div>

        <!-- Ritmo Tracker -->
        <div class="card-title">Ritmo Tracker</div>
        <table class="tracker-table">
          <thead>
            <tr>
              <th style="width: 35%; text-align: left;">Task</th>
              ${daysOfWeek.map(day => `<th style="width: 7%;">${day}</th>`).join('')}
              <th style="width: 7%;">Done</th>
            </tr>
          </thead>
          <tbody>
            ${taskRowsHtml}
          </tbody>
        </table>

        <!-- Legend -->
        <div class="legend">
          <div class="legend-item">
            <div class="legend-dot legend-green"></div>
            <span>Done</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot legend-red"></div>
            <span>Missed</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot legend-orange"></div>
            <span>Pending</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot legend-gray"></div>
            <span>Unassigned</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Invisible Footer Spacer (blocks table from overlapping) -->
    <div class="footer-spacer"></div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-line">Generated by Ritmo App</div>
      <div class="footer-line">For monitoring and developmental support purposes</div>
    </div>
  </body>
</html>`;

  // Render PDF
  const file = await Print.printToFileAsync({ html });

  // Move to app documents
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

  // Open PDF
  if (openAfterSave) {
    try {
      await Linking.openURL(finalPath);
    } catch {
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(finalPath, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
        }
      } catch {
        // ignore
      }
    }
  }

  return finalPath;
}
