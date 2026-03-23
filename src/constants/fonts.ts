/** Local fonts - display names (actual fonts in public/fonts/, see fonts.scss) */
export const LOCAL_FONTS = ['Bold Title', 'Display Title'] as const;

/** Map old font names → new display names (for migration) */
export const FONT_NAME_MIGRATION: Record<string, string> = {
  'Helvetica Now Display': 'Bold Title',
  'Bebas Neue': 'Display Title',
};

/** System fonts (no loading) */
export const SYSTEM_FONTS = [
  'Helvetica Neue',
  'Helvetica',
  'Arial',
] as const;

/** Google Fonts for nametag text - Helvetica-alternative first */
export const GOOGLE_FONTS = [
  'Libre Franklin',  /* Bold Title equivalent */
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Sans 3',
  'Poppins',
  'Oswald',
  'Raleway',
  'Nunito',
  'Roboto Condensed',
  'Merriweather',
  'Playfair Display',
  'PT Sans',
  'Ubuntu',
  'Work Sans',
  'Libre Baskerville',
  'Quicksand',
  'Oxygen',
  'Fira Sans',
  'Rubik',
  'Noto Sans',
  'DM Sans',
  'Karla',
  'Crimson Text',
  'IBM Plex Sans',
  'Manrope',
  'Josefin Sans',
  'Barlow',
  'Anton',
  'Archivo',
  'Mukta',
  'Cabin',
  'Sora',
] as const;

export type GoogleFontName = (typeof GOOGLE_FONTS)[number];

const GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2';

/** Common font weights for selection */
export const FONT_WEIGHTS = [
  { label: 'Thin', value: 100 },
  { label: 'Extra Light', value: 200 },
  { label: 'Light', value: 300 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Semi Bold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'Extra Bold', value: 800 },
  { label: 'Black', value: 900 },
] as const;

export function getGoogleFontUrl(fonts: string[], weights = [100, 200, 300, 400, 500, 600, 700, 800, 900]): string {
  if (fonts.length === 0) return '';
  const weightStr = weights.join(';');
  const familyParam = fonts
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${weightStr}`)
    .join('&');
  return `${GOOGLE_FONTS_API}?${familyParam}&display=swap`;
}

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = getGoogleFontUrl([fontName]);
  document.head.appendChild(link);
}

/** Preload fonts used by fields on app load */
export function preloadFonts(fontFamilies: string[]): void {
  const toLoad = fontFamilies.filter((f) => !loadedFonts.has(f));
  if (toLoad.length === 0) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = getGoogleFontUrl(toLoad);
  document.head.appendChild(link);
  toLoad.forEach((f) => loadedFonts.add(f));
}
