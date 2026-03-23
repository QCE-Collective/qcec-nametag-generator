<template>
  <q-page class="builder-page">
    <q-toolbar class="bg-grey-3 q-pa-md">
      <div class="row q-gutter-sm items-center full-width">
        <CSVUploader
          :csv-rows="csvRows"
          :on-csv-load="setCsvData"
        />
        <BackgroundUploader
          :background-count="backgroundImages.length"
          :on-backgrounds-add="addBackgroundImages"
          :on-backgrounds-clear="clearBackgroundImages"
        />
        <q-btn flat dense icon="upload_file" @click="triggerImport">
          <q-tooltip>Import design</q-tooltip>
          <input
            ref="importInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="onImport"
          />
        </q-btn>
        <q-btn flat dense icon="download" @click="handleExport">
          <q-tooltip>Export design</q-tooltip>
        </q-btn>
        <q-btn flat dense icon="restart_alt" @click="handleReset">
          <q-tooltip>Reset all</q-tooltip>
        </q-btn>
        <q-separator vertical />
        <div v-if="hasCsv" class="row items-center q-gutter-xs">
          <q-btn
            flat
            dense
            round
            icon="chevron_left"
            :disable="previewRowIndex <= 0"
            @click="prevPreviewRow"
          >
            <q-tooltip>Previous</q-tooltip>
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
            <q-tooltip>Next</q-tooltip>
          </q-btn>
        </div>
        <q-separator vertical v-if="hasCsv" />
        <q-btn
          color="primary"
          icon="picture_as_pdf"
          label="Generate PDF"
          :disable="!canGenerate"
          :loading="isGenerating"
          @click="handleGeneratePdf"
        />
        <q-checkbox v-model="showFoldLine" label="Fold line" dense />
        <q-checkbox v-model="showSafeGuides" label="Safe guides" dense />
      </div>
    </q-toolbar>

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
        @select-field="(id, add) => selectField(id, add)"
        @update-field="updateField"
      />
    </div>

    <PdfGenerator
      ref="pdfGeneratorRef"
      :fields="fields"
      :background-images="backgroundImages"
      :rows="csvRows"
      @complete="isGenerating = false"
      @error="onPdfError"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import CSVUploader from 'components/CSVUploader.vue';
import BackgroundUploader from 'components/BackgroundUploader.vue';
import FieldSidebar from 'components/FieldSidebar.vue';
import TagEditor from 'components/TagEditor.vue';
import PdfGenerator from 'components/PdfGenerator.vue';
import { useNametagStore } from 'src/composables/useNametagStore';
import { preloadFonts } from 'src/constants/fonts';
import { watch } from 'vue';

const $q = useQuasar();
const store = useNametagStore();

const {
  csvHeaders,
  csvRows,
  hasCsv,
  hasBackground,
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
  setCsvData,
  nextPreviewRow,
  prevPreviewRow,
  addBackgroundImages,
  clearBackgroundImages,
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

async function handleGeneratePdf() {
  if (!canGenerate.value || !pdfGeneratorRef.value) return;
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
    $q.notify({ type: 'info', message: 'Design reset' });
  });
}
</script>

<style scoped>
.builder-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.builder-content {
  flex: 1;
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
</style>
