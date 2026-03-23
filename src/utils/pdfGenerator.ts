import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Field } from 'src/types/nametag';
import {
  TAGS_PER_PAGE,
  VERTICAL_SPACING_MM,
  HORIZONTAL_MARGIN_MM,
} from 'src/types/nametag';

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

function getRowCacheKey(fields: Field[], row: Record<string, string>): string {
  return fields.map((f) => row[f.csvKey] ?? '').join('\n');
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
  tagHeightMm = 55
): Promise<Blob> {
  const pageContentHeightMm =
    TAGS_PER_PAGE * tagHeightMm + (TAGS_PER_PAGE - 1) * VERTICAL_SPACING_MM;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const horizontalMargin = HORIZONTAL_MARGIN_MM;
  const topMargin = 1;
  const total = rows.length;

  const getBackgroundIndex = (row: Record<string, string>) => {
    if (backgroundImages.length === 0) return 0;
    const key = getRowCacheKey(fields, row);
    let h = 0;
    for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    return Math.abs(h) % backgroundImages.length;
  };

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
      .map((r, i) => getRowCacheKey(fields, r) + `\nbg:${getBackgroundIndex(r)}`)
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

    const completedTags = Math.min((pageNum + 1) * TAGS_PER_PAGE, total);
    onProgress?.({ phase: 'tags', current: completedTags, total });
    await yieldToUi(pageNum);
  }

  return doc.output('blob');
}
