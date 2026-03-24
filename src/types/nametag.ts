/** All measurements are in mm */
export type FieldType = 'text' | 'qr' | 'circle';

export type TextAlign = 'left' | 'center' | 'right';

/** Rule: if CSV cell contains this text, use these colors */
export interface CircleColorRule {
  contains: string;
  fillColor: string;
  borderColor?: string;
}

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
  dropShadow?: boolean;

  // qr only
  qrColor?: string;

  // circle only
  defaultFillColor?: string;
  defaultBorderColor?: string;
  borderWidthMm?: number;
  colorRules?: CircleColorRule[];
  hideCircleWhenNoMatch?: boolean;

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

export const HORIZONTAL_MARGIN_MM = 10;
/** Top margin for PDF export (mm); tags stack below this. */
export const TOP_MARGIN_MM = 8;

/** Vertical gap between stacked tags on a PDF page (mm) */
export const VERTICAL_SPACING_MM = 2; // Small margin between tags

/** Max tags that fit below {@link TOP_MARGIN_MM} on A4 for the given strip height (one column). */
export function computeTagsPerPage(tagHeightMm: number): number {
  const usableMm = A4_HEIGHT_MM - TOP_MARGIN_MM;
  const h = tagHeightMm;
  const s = VERTICAL_SPACING_MM;
  if (!(h > 0)) return 1;
  const n = Math.floor((usableMm + s) / (h + s));
  return Math.max(1, n);
}
