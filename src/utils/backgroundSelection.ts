import type { Field } from 'src/types/nametag';

export type BackgroundMode = 'random' | 'csv';

export function getRowCacheKey(fields: Field[], row: Record<string, string>): string {
  return fields.map((f) => row[f.csvKey] ?? '').join('\n');
}

function hashBackgroundIndex(key: string, backgroundCount: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % backgroundCount;
}

/** Parse CSV cell: 1-based index (1 = first background) or 0-based (0 = first). */
export function parseBackgroundCsvValue(
  raw: string,
  backgroundCount: number
): number {
  if (backgroundCount === 0) return 0;
  const t = raw.trim();
  if (t === '') return 0;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) return 0;
  if (n >= 1 && n <= backgroundCount) return n - 1;
  if (n >= 0 && n < backgroundCount) return n;
  return 0;
}

function normalizeContainsList(containsTexts: string[], backgroundCount: number): string[] {
  return Array.from({ length: backgroundCount }, (_, i) => containsTexts[i] ?? '');
}

/** First matching rule wins (order = upload order). Case-insensitive substring match. */
export function matchBackgroundByContains(
  cellValue: string,
  backgroundCount: number,
  containsTexts: string[]
): number | null {
  if (backgroundCount === 0) return null;
  const hay = cellValue.toLowerCase();
  const list = normalizeContainsList(containsTexts, backgroundCount);
  for (let i = 0; i < backgroundCount; i++) {
    const needle = list[i]!.trim();
    if (needle !== '' && hay.includes(needle.toLowerCase())) {
      return i;
    }
  }
  return null;
}

export function getBackgroundIndexForRow(
  fields: Field[],
  row: Record<string, string>,
  backgroundCount: number,
  mode: BackgroundMode,
  csvColumn: string | null,
  containsTexts: string[]
): number {
  if (backgroundCount === 0) return 0;
  if (mode === 'csv' && csvColumn) {
    const raw = row[csvColumn] ?? '';
    const list = normalizeContainsList(containsTexts, backgroundCount);
    const hasAnyRule = list.some((t) => t.trim() !== '');
    if (hasAnyRule) {
      const matched = matchBackgroundByContains(raw, backgroundCount, list);
      if (matched !== null) return matched;
      return 0;
    }
    return parseBackgroundCsvValue(raw, backgroundCount);
  }
  const key = getRowCacheKey(fields, row);
  return hashBackgroundIndex(key, backgroundCount);
}
