<template>
  <q-btn color="primary" icon="upload_file" :label="hasCsv ? 'Replace CSV' : 'Upload CSV'" @click="triggerUpload">
    <q-tooltip>{{ hasCsv ? `${csvRows.length} rows loaded` : 'Upload CSV with attendee data' }}</q-tooltip>
    <input
      ref="inputRef"
      type="file"
      accept=".csv"
      class="hidden"
      @change="onFileChange"
    />
  </q-btn>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Papa from 'papaparse';
import type { CsvData } from 'src/composables/useNametagStore';

const props = defineProps<{
  csvRows: Record<string, string>[];
  onCsvLoad: (data: CsvData | null) => void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const hasCsv = computed(() => (props.csvRows?.length ?? 0) > 0);

function triggerUpload() {
  inputRef.value?.click();
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV parse errors:', parsed.errors);
    }

    const headers = parsed.meta.fields ?? [];
    const rows = parsed.data ?? [];

    if (headers.length === 0 || rows.length === 0) {
      props.onCsvLoad(null);
      return;
    }

    props.onCsvLoad({ headers, rows });
  };
  reader.readAsText(file, 'UTF-8');
  input.value = '';
}
</script>

<style scoped>
.hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
