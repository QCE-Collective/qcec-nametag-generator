const STORAGE_KEY = 'qcec-nametag-config';
const MAX_BACKGROUND_SIZE = 4 * 1024 * 1024; // 4MB - localStorage is typically 5MB

import type { Field } from 'src/types/nametag';
import { FONT_NAME_MIGRATION } from 'src/constants/fonts';

/** Migrate old font names to display names in fields */
export function migrateFieldFontNames(fields: Field[]): Field[] {
  return fields.map((f) => {
    if (f.type === 'text' && f.fontFamily) {
      const migrated = FONT_NAME_MIGRATION[f.fontFamily];
      if (migrated) {
        return { ...f, fontFamily: migrated };
      }
    }
    return f;
  });
}

export interface PersistedConfig {
  csvData: { headers: string[]; rows: Record<string, string>[] } | null;
  backgroundImage?: string | null; // legacy - converted to array
  backgroundImages?: string[];
  fields: Field[];
  showFoldLine: boolean;
  showSafeGuides: boolean;
  tagWidthMm?: number;
  tagHeightMm?: number;
}

export function loadConfig(): Partial<PersistedConfig> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedConfig & { backgroundImage?: string | null };
    if (!parsed || typeof parsed !== 'object') return null;
    // Migrate legacy backgroundImage to backgroundImages
    if (parsed.backgroundImages == null && parsed.backgroundImage != null) {
      parsed.backgroundImages = [parsed.backgroundImage];
    }
    if (parsed.fields?.length) {
      parsed.fields = migrateFieldFontNames(parsed.fields);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfig(config: PersistedConfig): void {
  try {
    let toSave = { ...config };
    let str = JSON.stringify(toSave);
    if (str.length > MAX_BACKGROUND_SIZE) {
      toSave = { ...config, backgroundImages: [] };
      str = JSON.stringify(toSave);
    }
    localStorage.setItem(STORAGE_KEY, str);
  } catch {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...config, backgroundImages: [] })
      );
    } catch {
      // Ignore quota errors
    }
  }
}
