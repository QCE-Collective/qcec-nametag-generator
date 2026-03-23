/** All measurements are in mm */
export type FieldType = 'text' | 'qr';

export type TextAlign = 'left' | 'center' | 'right';

export interface Field {
  id: string;
  type: FieldType;

  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm

  // text only
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  align?: TextAlign;
  capitalize?: boolean;

  // qr only
  qrColor?: string;

  csvKey: string;
}

/** Default tag dimensions (mm) - 18cm × 5.5cm unfolded */
export const DEFAULT_TAG_WIDTH_MM = 180;
export const DEFAULT_TAG_HEIGHT_MM = 55;

/** Legacy constants (use defaults) */
export const TAG_WIDTH_MM = DEFAULT_TAG_WIDTH_MM;
export const TAG_HEIGHT_MM = DEFAULT_TAG_HEIGHT_MM;
export const SAFE_MARGIN_MM = 5;

/** A4 page (mm) */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** Layout: 1 tag per row, 5 rows per page */
export const TAGS_PER_PAGE = 5;
export const VERTICAL_SPACING_MM = 2; // Small margin between tags
export const HORIZONTAL_MARGIN_MM = 10;
