import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Field } from 'src/types/nametag';
import {
  TAGS_PER_PAGE,
  VERTICAL_SPACING_MM,
  HORIZONTAL_MARGIN_MM,
  TOP_MARGIN_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
} from 'src/types/nametag';
import {
  type BackgroundMode,
  getBackgroundIndexForRow,
  getRowCacheKey,
} from 'src/utils/backgroundSelection';

const PX_PER_MM = 6;

export interface PdfProgress {
  phase: 'qr' | 'tags';
  current: number;
  total: number;
}

export async function pregenerateQrCodes(
  fields: Field[],
  rows: Record<string, string>[],
  onProgress?: (progress: PdfProgress) => void
): Promise<Map<string, string>> {
  const qrMap = new Map<string, string>();
  const entries: { field: Field; val: string }[] = [];
  for (const field of fields) {
    if (field.type !== 'qr') continue;
    const uniqueValues = new Set(rows.map((r) => r[field.csvKey] ?? ''));
    for (const val of uniqueValues) {
      entries.push({ field, val });
    }
  }
  const total = entries.length;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const key = `${entry.field.id}|${entry.val}`;
    if (!qrMap.has(key)) {
      try {
        const qrColor = entry.field.qrColor || '#000000';
        const darkHex = qrColor.startsWith('#') && qrColor.length === 7 ? `${qrColor}ff` : qrColor;
        const url = await QRCode.toDataURL(entry.val || ' ', {
          width: entry.field.width * PX_PER_MM,
          margin: 0,
          color: { dark: darkHex, light: '#00000000' },
        });
        qrMap.set(key, url);
      } catch {
        qrMap.set(key, '');
      }
    }
    onProgress?.({ phase: 'qr', current: i + 1, total });
  }
  return qrMap;
}

export async function generatePdf(
  fields: Field[],
  backgroundImages: string[],
  rows: Record<string, string>[],
  renderAndGetPage: (
    pageRows: Record<string, string>[],
    backgroundIndices: number[]
  ) => Promise<HTMLElement>,
  onProgress?: (progress: PdfProgress) => void,
  tagWidthMm = 180,
  tagHeightMm = 55,
  showFoldLine = false,
  backgroundMode: BackgroundMode = 'random',
  backgroundCsvColumn: string | null = null,
  backgroundContainsTexts: string[] = []
): Promise<Blob> {
  const pageContentHeightMm =
    TAGS_PER_PAGE * tagHeightMm + (TAGS_PER_PAGE - 1) * VERTICAL_SPACING_MM;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const horizontalMargin = HORIZONTAL_MARGIN_MM;
  const topMargin = TOP_MARGIN_MM;
  const total = rows.length;

  const getBackgroundIndex = (row: Record<string, string>) =>
    getBackgroundIndexForRow(
      fields,
      row,
      backgroundImages.length,
      backgroundMode,
      backgroundCsvColumn,
      backgroundContainsTexts
    );

  const pageCache = new Map<string, string>();

  const yieldToUi = async (pageNum: number) => {
    if (pageNum > 0 && pageNum % 5 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  };

  const numPages = Math.ceil(rows.length / TAGS_PER_PAGE);

  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    if (pageNum > 0) {
      doc.addPage();
    }

    const startIdx = pageNum * TAGS_PER_PAGE;
    const pageRows = rows
      .slice(startIdx, startIdx + TAGS_PER_PAGE)
      .map((r) => r ?? {});

    const cacheKey = pageRows
      .map((r) => getRowCacheKey(fields, r) + `\nbg:${getBackgroundIndex(r)}`)
      .join('\n---\n');

    let imgData: string;
    const cached = pageCache.get(cacheKey);
    if (cached) {
      imgData = cached;
    } else {
      const backgroundIndices = pageRows.map((r) => getBackgroundIndex(r));
      const pageEl = await renderAndGetPage(pageRows, backgroundIndices);
      if (!pageEl) throw new Error('Page element not found');

      const canvas = await html2canvas(pageEl, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      imgData = canvas.toDataURL('image/jpeg', 0.92);
      pageCache.set(cacheKey, imgData);
    }

    doc.addImage(
      imgData,
      'JPEG',
      horizontalMargin,
      topMargin,
      tagWidthMm,
      pageContentHeightMm
    );

    // Main vertical trim lines: nametag strip edges (more visible for guillotine)
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.line(horizontalMargin, 0, horizontalMargin, A4_HEIGHT_MM);
    doc.line(horizontalMargin + tagWidthMm, 0, horizontalMargin + tagWidthMm, A4_HEIGHT_MM);

    // Secondary trim lines: page edges and tag top/bottom (faint gray)
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.line(0, 0, 0, A4_HEIGHT_MM);
    doc.line(A4_WIDTH_MM, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

    // Horizontal trim lines: top and bottom of each tag (full page width)
    for (let i = 0; i < TAGS_PER_PAGE; i++) {
      const tagTop = topMargin + i * (tagHeightMm + VERTICAL_SPACING_MM);
      const tagBottom = tagTop + tagHeightMm;
      doc.line(0, tagTop, A4_WIDTH_MM, tagTop);
      doc.line(0, tagBottom, A4_WIDTH_MM, tagBottom);
    }

    // Fold line: vertical line at center of each tag (when enabled)
    if (showFoldLine) {
      const foldX = horizontalMargin + tagWidthMm / 2;
      doc.setDrawColor(200, 200, 200); // Slightly fainter for fold
      for (let i = 0; i < TAGS_PER_PAGE; i++) {
        const tagTop = topMargin + i * (tagHeightMm + VERTICAL_SPACING_MM);
        const tagBottom = tagTop + tagHeightMm;
        doc.line(foldX, tagTop, foldX, tagBottom);
      }
    }

    const completedTags = Math.min((pageNum + 1) * TAGS_PER_PAGE, total);
    onProgress?.({ phase: 'tags', current: completedTags, total });
    await yieldToUi(pageNum);
  }

  return doc.output('blob');
}
