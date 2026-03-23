import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Field } from 'src/types/nametag';
import {
  TAG_WIDTH_MM,
  TAG_HEIGHT_MM,
  TAGS_PER_PAGE,
  VERTICAL_SPACING_MM,
  HORIZONTAL_MARGIN_MM,
} from 'src/types/nametag';

const PX_PER_MM = 6;

export async function pregenerateQrCodes(
  fields: Field[],
  rows: Record<string, string>[]
): Promise<Map<string, string>> {
  const qrMap = new Map<string, string>();
  for (const field of fields) {
    if (field.type !== 'qr') continue;
    const uniqueValues = new Set(rows.map((r) => r[field.csvKey] ?? ''));
    for (const val of uniqueValues) {
      const key = `${field.id}|${val}`;
      if (!qrMap.has(key)) {
        try {
          const url = await QRCode.toDataURL(val || ' ', {
            width: field.width * PX_PER_MM,
            margin: 0,
            color: { dark: '#000000ff', light: '#00000000' },
          });
          qrMap.set(key, url);
        } catch {
          qrMap.set(key, '');
        }
      }
    }
  }
  return qrMap;
}

export async function generatePdf(
  fields: Field[],
  _backgroundImages: string[], // Used by PdfGenerator for random selection
  rows: Record<string, string>[],
  renderAndGetElement: (row: Record<string, string>, rowIndex: number) => Promise<HTMLElement>
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const verticalSpacing = VERTICAL_SPACING_MM;
  const horizontalMargin = HORIZONTAL_MARGIN_MM;
  const topMargin = 1;

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i % TAGS_PER_PAGE;

    if (rowIndex === 0 && i > 0) {
      doc.addPage();
    }

    const x = horizontalMargin;
    const y = topMargin + rowIndex * (TAG_HEIGHT_MM + verticalSpacing);

    const row = rows[i] ?? {};
    const tagEl = await renderAndGetElement(row, i);
    if (!tagEl) throw new Error('Tag element not found');

    const canvas = await html2canvas(tagEl, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', x, y, TAG_WIDTH_MM, TAG_HEIGHT_MM);
  }

  return doc.output('blob');
}
