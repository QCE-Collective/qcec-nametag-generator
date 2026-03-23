import { ref, computed, watch } from 'vue';
import type { Field } from 'src/types/nametag';
import { DEFAULT_TAG_WIDTH_MM, DEFAULT_TAG_HEIGHT_MM } from 'src/types/nametag';
import { loadConfig, saveConfig, migrateFieldFontNames } from 'src/utils/persistConfig';

export interface CsvData {
  headers: string[];
  rows: Record<string, string>[];
}

function generateId(): string {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

let storeInstance: ReturnType<typeof createStore> | null = null;

function createStore() {
  const saved = loadConfig();

  const csvData = ref<CsvData | null>(saved?.csvData ?? null);
  const backgroundImages = ref<string[]>(saved?.backgroundImages ?? []);
  const fields = ref<Field[]>(saved?.fields ?? []);
  const selectedFieldIds = ref<string[]>([]);
  const selectedFieldId = computed(() => selectedFieldIds.value[0] ?? null);
  const showFoldLine = ref(saved?.showFoldLine ?? true);
  const showSafeGuides = ref(saved?.showSafeGuides ?? false);
  const tagWidthMm = ref(saved?.tagWidthMm ?? DEFAULT_TAG_WIDTH_MM);
  const tagHeightMm = ref(saved?.tagHeightMm ?? DEFAULT_TAG_HEIGHT_MM);
  const previewRowIndex = ref(0);

  const csvHeaders = computed(() => csvData.value?.headers ?? []);
  const csvRows = computed(() => csvData.value?.rows ?? []);
  const hasCsv = computed(() => (csvRows.value.length ?? 0) > 0);
  const hasBackground = computed(() => backgroundImages.value.length > 0);
  const previewBackground = computed(() => {
    const imgs = backgroundImages.value;
    return imgs.length > 0 ? (imgs[previewRowIndex.value % imgs.length] ?? null) : null;
  });
  const selectedField = computed(
    () => fields.value.find((f) => f.id === selectedFieldId.value) ?? null
  );
  const selectedFields = computed(() =>
    fields.value.filter((f) => selectedFieldIds.value.includes(f.id))
  );
  const previewRow = computed(() => {
    const rows = csvRows.value;
    const idx = Math.max(0, Math.min(previewRowIndex.value, rows.length - 1));
    return rows[idx] ?? {};
  });

  function setCsvData(data: CsvData | null) {
    csvData.value = data;
    previewRowIndex.value = 0;
  }

  function setPreviewRowIndex(index: number) {
    const max = Math.max(0, csvRows.value.length - 1);
    previewRowIndex.value = Math.max(0, Math.min(index, max));
  }

  function nextPreviewRow() {
    setPreviewRowIndex(previewRowIndex.value + 1);
  }

  function prevPreviewRow() {
    setPreviewRowIndex(previewRowIndex.value - 1);
  }

  function addBackgroundImages(urls: string[]) {
    backgroundImages.value = [...backgroundImages.value, ...urls];
  }

  function removeBackgroundImage(index: number) {
    backgroundImages.value = backgroundImages.value.filter((_, i) => i !== index);
  }

  function clearBackgroundImages() {
    backgroundImages.value = [];
  }

  function addField(type: 'text' | 'qr'): Field {
    const firstKey = csvHeaders.value[0] ?? 'Name';
    const field: Field = {
      id: generateId(),
      type,
      x: 10,
      y: 10,
      width: type === 'text' ? 80 : 25,
      height: type === 'text' ? 8 : 25,
      csvKey: firstKey,
      ...(type === 'qr' && { qrColor: '#000000' }),
      ...(type === 'text' && {
        fontSize: 14,
        fontFamily: 'sans-serif',
        fontWeight: 400,
        color: '#000000',
        align: 'left' as const,
        capitalize: false,
      }),
    };
    fields.value = [...fields.value, field];
    selectedFieldIds.value = [field.id];
    return field;
  }

  function roundPos(v: number): number {
    return Math.round(v * 100) / 100;
  }

  function updateField(id: string, updates: Partial<Field>) {
    const idx = fields.value.findIndex((f) => f.id === id);
    const current = idx >= 0 ? fields.value[idx] : undefined;
    if (current) {
      const rounded: Partial<Field> = { ...updates };
      if (typeof rounded.x === 'number') rounded.x = roundPos(rounded.x);
      if (typeof rounded.y === 'number') rounded.y = roundPos(rounded.y);
      if (typeof rounded.width === 'number') rounded.width = roundPos(rounded.width);
      if (typeof rounded.height === 'number') rounded.height = roundPos(rounded.height);
      const next = [...fields.value];
      next[idx] = { ...current, ...rounded } as Field;
      fields.value = next;
    }
  }

  function removeField(id: string) {
    fields.value = fields.value.filter((f) => f.id !== id);
    selectedFieldIds.value = selectedFieldIds.value.filter((i) => i !== id);
  }

  function duplicateField(id: string) {
    const field = fields.value.find((f) => f.id === id);
    if (!field) return;
    const copy: Field = { ...field, id: generateId(), x: field.x + 5, y: field.y + 5 };
    fields.value = [...fields.value, copy];
    selectedFieldIds.value = [copy.id];
  }

  function selectField(id: string | null, addToSelection = false) {
    if (id === null) {
      selectedFieldIds.value = [];
      return;
    }
    if (addToSelection) {
      const ids = selectedFieldIds.value;
      if (ids.includes(id)) {
        selectedFieldIds.value = ids.length > 1 ? ids.filter((i) => i !== id) : [];
      } else {
        selectedFieldIds.value = [...ids, id];
      }
    } else {
      selectedFieldIds.value = [id];
    }
  }

  function alignFieldsLeft() {
    const sel = selectedFields.value;
    if (sel.length < 2) return;
    const minX = Math.min(...sel.map((f) => f.x));
    sel.forEach((f) => updateField(f.id, { x: roundPos(minX) }));
  }

  function alignFieldsCenter() {
    const sel = selectedFields.value;
    if (sel.length < 2) return;
    const minLeft = Math.min(...sel.map((f) => f.x));
    const maxRight = Math.max(...sel.map((f) => f.x + f.width));
    const center = (minLeft + maxRight) / 2;
    sel.forEach((f) => updateField(f.id, { x: roundPos(center - f.width / 2) }));
  }

  function alignFieldsRight() {
    const sel = selectedFields.value;
    if (sel.length < 2) return;
    const maxRight = Math.max(...sel.map((f) => f.x + f.width));
    sel.forEach((f) => updateField(f.id, { x: roundPos(maxRight - f.width) }));
  }

  function setTagWidthMm(v: number) {
    tagWidthMm.value = v;
  }

  function setTagHeightMm(v: number) {
    tagHeightMm.value = v;
  }

  function clearAll() {
    csvData.value = null;
    backgroundImages.value = [];
    fields.value = [];
    selectedFieldIds.value = [];
  }

  function loadDesign(config: {
    csvData?: { headers: string[]; rows: Record<string, string>[] } | null;
    backgroundImages?: string[];
    fields?: Field[];
    showFoldLine?: boolean;
    showSafeGuides?: boolean;
    tagWidthMm?: number;
    tagHeightMm?: number;
  }) {
    if (config.csvData != null) csvData.value = config.csvData;
    if (config.backgroundImages != null) backgroundImages.value = config.backgroundImages;
    if (config.fields != null) fields.value = migrateFieldFontNames(config.fields);
    if (config.showFoldLine != null) showFoldLine.value = config.showFoldLine;
    if (config.showSafeGuides != null) showSafeGuides.value = config.showSafeGuides;
    if (config.tagWidthMm != null) tagWidthMm.value = config.tagWidthMm;
    if (config.tagHeightMm != null) tagHeightMm.value = config.tagHeightMm;
    selectedFieldIds.value = [];
    previewRowIndex.value = 0;
  }

  function getExportConfig() {
    return {
      csvData: csvData.value,
      backgroundImages: backgroundImages.value,
      fields: fields.value,
      showFoldLine: showFoldLine.value,
      showSafeGuides: showSafeGuides.value,
      tagWidthMm: tagWidthMm.value,
      tagHeightMm: tagHeightMm.value,
    };
  }

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  function persist() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      saveConfig({
        csvData: csvData.value,
        backgroundImages: backgroundImages.value,
        fields: fields.value,
        showFoldLine: showFoldLine.value,
        showSafeGuides: showSafeGuides.value,
        tagWidthMm: tagWidthMm.value,
        tagHeightMm: tagHeightMm.value,
      });
    }, 500);
  }

  watch(
    [csvData, backgroundImages, fields, showFoldLine, showSafeGuides, tagWidthMm, tagHeightMm],
    persist,
    { deep: true }
  );

  return {
    csvData,
    csvHeaders,
    csvRows,
    hasCsv,
    backgroundImages,
    hasBackground,
    previewBackground,
    fields,
    selectedFieldIds,
    selectedFieldId,
    selectedField,
    selectedFields,
    previewRow,
    previewRowIndex,
    showFoldLine,
    showSafeGuides,
    tagWidthMm,
    tagHeightMm,
    setTagWidthMm,
    setTagHeightMm,
    setCsvData,
    addBackgroundImages,
    removeBackgroundImage,
    clearBackgroundImages,
    setPreviewRowIndex,
    nextPreviewRow,
    prevPreviewRow,
    addField,
    updateField,
    removeField,
    duplicateField,
    selectField,
    alignFieldsLeft,
    alignFieldsCenter,
    alignFieldsRight,
    clearAll,
    loadDesign,
    getExportConfig,
  };
}

export function useNametagStore() {
  if (!storeInstance) storeInstance = createStore();
  return storeInstance;
}
