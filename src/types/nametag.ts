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

  csvKey: string;
}

/** Tag dimensions (mm) */
export const TAG_WIDTH_MM = 190;
export const TAG_HEIGHT_MM = 55;
export const FOLD_LINE_MM = 95;
export const SAFE_MARGIN_MM = 5;

/** A4 page (mm) */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** Layout: 1 tag per row, 5 rows per page */
export const TAGS_PER_PAGE = 5;
export const VERTICAL_SPACING_MM = 2; // Small margin between tags
export const HORIZONTAL_MARGIN_MM = 10;
