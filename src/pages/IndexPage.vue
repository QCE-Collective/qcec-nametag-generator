<template>
  <q-page
    class="builder-page"
    :style-fn="builderPageStyleFn"
  >
    <q-toolbar class="bg-grey-3 q-pa-md">
      <div class="row q-gutter-sm items-center full-width">
        <CSVUploader
          :csv-rows="csvRows"
          :on-csv-load="setCsvData"
        />
        <q-btn
          color="primary"
          icon="image"
          size="md"
          :label="backgroundImages.length ? `Backgrounds (${backgroundImages.length})` : 'Backgrounds'"
          @click="showBackgroundModal = true"
        >
          <q-tooltip>Upload, remove, and configure backgrounds</q-tooltip>
        </q-btn>
        <BackgroundModal v-model="showBackgroundModal" />
        <template v-if="hasCsv">
          <q-separator vertical />
          <div class="row items-center q-gutter-xs">
            <q-btn
              flat
              dense
              round
              icon="chevron_left"
              :disable="previewRowIndex <= 0"
              @click="prevPreviewRow"
            >
              <q-tooltip>Previous row</q-tooltip>
            </q-btn>
            <span class="text-caption">Preview: {{ previewRowIndex + 1 }} / {{ csvRows.length }}</span>
            <q-btn
              flat
              dense
              round
              icon="chevron_right"
              :disable="previewRowIndex >= csvRows.length - 1"
              @click="nextPreviewRow"
            >
              <q-tooltip>Next row</q-tooltip>
            </q-btn>
          </div>
        </template>
        <q-space />
        <q-btn
          color="primary"
          icon="picture_as_pdf"
          label="Generate PDF"
          :disable="!canGenerate"
          :loading="isGenerating"
          @click="handleGeneratePdf"
        />
        <q-btn
          flat
          dense
          round
          icon="settings"
          @click="showConfigModal = true"
        >
          <q-tooltip>Settings</q-tooltip>
        </q-btn>
      </div>
    </q-toolbar>

    <q-dialog
      :model-value="isGenerating"
      persistent
      no-esc-dismiss
      no-backdrop-dismiss
    >
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">Generating PDF</div>
          <div class="text-body2 text-grey q-mt-xs">
            {{ progressPhaseLabel }}
          </div>
          <div
            v-if="isTabHidden && isGenerating"
            class="text-caption text-warning q-mt-sm"
          >
            Keep this tab active for best performance
          </div>
        </q-card-section>
        <q-card-section>
          <q-linear-progress
            :value="progressPercent"
            size="12px"
            color="primary"
            class="q-mb-sm"
          />
          <div class="text-caption text-grey">
            <template v-if="progressTotal > 0">
              {{ progressCurrent }} / {{ progressTotal }}
              {{ progressPhase === 'tags' ? 'nametags' : 'QR codes' }}
              <span v-if="estimatedRemainingText">
                · {{ estimatedRemainingText }}
              </span>
            </template>
            <template v-else>
              Preparing...
            </template>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showConfigModal">
      <q-card class="config-modal-card">
        <q-card-section class="row items-center q-pb-sm">
          <div class="text-h6">Settings</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none scroll config-modal-body">
          <div class="text-subtitle2 text-grey-8 q-mb-sm">Design</div>
          <div class="row q-gutter-sm q-mb-md">
            <q-btn outline color="primary" icon="upload_file" label="Import" @click="triggerImport" />
            <q-btn outline color="primary" icon="download" label="Export" @click="handleExport" />
            <q-btn outline color="negative" icon="restart_alt" label="Reset all" @click="handleReset" />
          </div>
          <input
            ref="importInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="onImport"
          />

          <template v-if="hasCsv">
            <q-separator class="q-mb-md" />
            <div class="text-subtitle2 text-grey-8 q-mb-sm">CSV sort</div>
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="primarySort"
                  :options="sortOptions"
                  label="Primary sort"
                  dense
                  outlined
                  emit-value
                  map-options
                  options-dense
                  class="full-width"
                >
                  <template #prepend>
                    <q-icon name="sort" size="xs" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="secondarySort"
                  :options="sortOptions"
                  label="Secondary sort"
                  dense
                  outlined
                  emit-value
                  map-options
                  options-dense
                  clearable
                  class="full-width"
                />
              </div>
            </div>
          </template>

          <q-separator class="q-mb-md" />
          <div class="text-subtitle2 text-grey-8 q-mb-sm">Layout and PDF</div>
          <div class="column q-gutter-sm">
            <q-checkbox v-model="showFoldLine" label="Fold line on PDF" dense />
            <q-checkbox v-model="showSafeGuides" label="Safe guides in editor" dense />
            <q-btn
              outline
              color="primary"
              icon="straighten"
              label="Nametag size…"
              align="left"
              class="full-width"
              @click="showTagSizeModal = true"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Done" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <TagSizeModal
      v-model="showTagSizeModal"
      :tag-width-mm="tagWidthMm"
      :tag-height-mm="tagHeightMm"
      @update:tag-width-mm="setTagWidthMm"
      @update:tag-height-mm="setTagHeightMm"
    />

    <div class="builder-content">
      <FieldSidebar
        :fields="fields"
        :selected-field-ids="selectedFieldIds"
        :selected-field="selectedField"
        :selected-fields="selectedFields"
        :csv-headers="csvHeaders"
        @add-field="addField"
        @select-field="selectField"
        @update-field="updateField"
        @remove-field="removeField"
        @duplicate-field="duplicateField"
        @align-fields-left="alignFieldsLeft"
        @align-fields-center="alignFieldsCenter"
        @align-fields-right="alignFieldsRight"
      />

      <TagEditor
        :fields="fields"
        :selected-field-ids="selectedFieldIds"
        :selected-field-id="selectedFieldId"
        :background-image="previewBackground"
        :preview-row="previewRow"
        :show-fold-line="showFoldLine"
        :show-safe-guides="showSafeGuides"
        :tag-width-mm="tagWidthMm"
        :tag-height-mm="tagHeightMm"
        @select-field="(id, add) => selectField(id, add)"
        @update-field="updateField"
      />
    </div>

    <PdfGenerator
      ref="pdfGeneratorRef"
      :fields="fields"
      :background-images="backgroundImages"
      :rows="csvRows"
      :tag-width-mm="tagWidthMm"
      :tag-height-mm="tagHeightMm"
      :show-fold-line="showFoldLine"
      :background-mode="backgroundMode"
      :background-csv-column="backgroundCsvColumn"
      :background-contains-texts="backgroundContainsTexts"
      @complete="isGenerating = false"
      @error="onPdfError"
      @progress="onPdfProgress"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import CSVUploader from 'components/CSVUploader.vue';
import BackgroundModal from 'components/BackgroundModal.vue';
import FieldSidebar from 'components/FieldSidebar.vue';
import TagEditor from 'components/TagEditor.vue';
import TagSizeModal from 'components/TagSizeModal.vue';
import PdfGenerator from 'components/PdfGenerator.vue';
import { useNametagStore } from 'src/composables/useNametagStore';
import { preloadFonts } from 'src/constants/fonts';

const $q = useQuasar();
const store = useNametagStore();

/** Lock page to viewport so the left panel can scroll independently of the preview. */
function builderPageStyleFn(offset: number, viewportHeight: number) {
  const h = Math.max(0, viewportHeight - offset);
  return {
    minHeight: `${h}px`,
    height: `${h}px`,
    maxHeight: `${h}px`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };
}

const {
  csvHeaders,
  csvRows,
  primarySort,
  secondarySort,
  backgroundMode,
  backgroundCsvColumn,
  backgroundContainsTexts,
  hasCsv,
  backgroundImages,
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
  loadDesign,
  getExportConfig,
  clearAll,
} = store;

const pdfGeneratorRef = ref<InstanceType<typeof PdfGenerator> | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);
const isGenerating = ref(false);
const showConfigModal = ref(false);
const showBackgroundModal = ref(false);
const showTagSizeModal = ref(false);

const progressPhase = ref<'qr' | 'tags'>('tags');
const progressCurrent = ref(0);
const progressTotal = ref(0);
const startTime = ref(0);
const estimatedRemainingSeconds = ref<number | null>(null);

const sortOptions = computed(() => {
  const headers = csvHeaders.value;
  const opts = headers.map((h) => ({ label: h, value: h }));
  return [{ label: '— None —', value: null }, ...opts];
});

const progressPercent = computed(() =>
  progressTotal.value > 0 ? progressCurrent.value / progressTotal.value : 0
);
const progressPhaseLabel = computed(() =>
  progressPhase.value === 'qr'
    ? 'Generating QR codes...'
    : 'Rendering nametags...'
);

function formatRemaining(sec: number): string {
  if (sec < 60) return `~${Math.ceil(sec)}s left`;
  const min = Math.ceil(sec / 60);
  return `~${min} min left`;
}
const estimatedRemainingText = computed(() => {
  const sec = estimatedRemainingSeconds.value;
  return sec != null && sec > 0 ? formatRemaining(sec) : '';
});

const isTabHidden = ref(document.hidden);
function updateTabVisibility() {
  isTabHidden.value = document.hidden;
}
onMounted(() => {
  document.addEventListener('visibilitychange', updateTabVisibility);
});
onUnmounted(() => {
  document.removeEventListener('visibilitychange', updateTabVisibility);
});

watch(
  () => store.fields.value,
  (fields) => {
    const fonts = fields
      .filter((f) => f.type === 'text' && f.fontFamily)
      .map((f) => f.fontFamily!);
    preloadFonts(fonts);
  },
  { immediate: true, deep: true }
);

const canGenerate = computed(
  () => csvRows.value.length > 0 && fields.value.length > 0
);

function onPdfProgress(progress: { phase: 'qr' | 'tags'; current: number; total: number }) {
  if (progress.phase === 'tags' && progressPhase.value !== 'tags') {
    startTime.value = Date.now();
  }
  progressPhase.value = progress.phase;
  progressCurrent.value = progress.current;
  progressTotal.value = progress.total;
  if (progress.current >= 3 && progress.total > progress.current && startTime.value > 0) {
    const elapsed = (Date.now() - startTime.value) / 1000;
    const rate = progress.current / elapsed;
    estimatedRemainingSeconds.value = (progress.total - progress.current) / rate;
  } else {
    estimatedRemainingSeconds.value = null;
  }
}

async function handleGeneratePdf() {
  if (!canGenerate.value || !pdfGeneratorRef.value) return;
  progressCurrent.value = 0;
  progressTotal.value = csvRows.value.length;
  progressPhase.value = 'tags';
  estimatedRemainingSeconds.value = null;
  startTime.value = Date.now();
  isGenerating.value = true;
  try {
    const blob = await pdfGeneratorRef.value.generate();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nametags.pdf';
      a.click();
      URL.revokeObjectURL(url);
      $q.notify({ type: 'positive', message: 'PDF downloaded' });
    }
  } catch {
    // handled by onPdfError
  } finally {
    isGenerating.value = false;
  }
}

function onPdfError(err: unknown) {
  isGenerating.value = false;
  $q.notify({
    type: 'negative',
    message: err instanceof Error ? err.message : 'PDF generation failed',
  });
}

function triggerImport() {
  importInputRef.value?.click();
}

function onImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const json = JSON.parse(reader.result as string);
      if (!json || typeof json !== 'object') throw new Error('Invalid design file');
      loadDesign({
        csvData: json.csvData ?? null,
        backgroundImages: json.backgroundImages ?? [],
        fields: json.fields ?? [],
        showFoldLine: json.showFoldLine ?? true,
        showSafeGuides: json.showSafeGuides ?? false,
        tagWidthMm: json.tagWidthMm,
        tagHeightMm: json.tagHeightMm,
        primarySort: json.primarySort ?? null,
        secondarySort: json.secondarySort ?? null,
        backgroundMode: json.backgroundMode,
        backgroundCsvColumn: json.backgroundCsvColumn,
        backgroundContainsTexts: json.backgroundContainsTexts,
      });
      $q.notify({ type: 'positive', message: 'Design imported' });
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err instanceof Error ? err.message : 'Invalid design file',
      });
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function handleExport() {
  const config = getExportConfig();
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nametag-design.json';
  a.click();
  URL.revokeObjectURL(url);
  $q.notify({ type: 'positive', message: 'Design exported' });
}

function handleReset() {
  $q.dialog({
    title: 'Reset all?',
    message: 'This will clear CSV data, backgrounds, fields, and start fresh.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    clearAll();
    showConfigModal.value = false;
    showBackgroundModal.value = false;
    $q.notify({ type: 'info', message: 'Design reset' });
  });
}
</script>

<style scoped>
.builder-content {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.config-modal-card {
  width: min(100vw - 48px, 480px);
  max-width: 100%;
  max-height: min(90vh, 720px);
  display: flex;
  flex-direction: column;
}

.config-modal-body {
  max-height: min(70vh, 560px);
}
</style>
