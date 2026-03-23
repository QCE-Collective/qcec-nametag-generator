<template>
  <div class="pdf-generator">
    <div ref="renderContainerRef" class="render-container">
      <TagPrintView
        v-if="currentRow !== null"
        :fields="fields"
        :background-image="currentBackground"
        :row="currentRow"
        :qr-urls="qrMap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import TagPrintView from './TagPrintView.vue';
import { generatePdf, pregenerateQrCodes } from 'src/utils/pdfGenerator';
import { preloadFonts } from 'src/constants/fonts';
import type { Field } from 'src/types/nametag';

const props = defineProps<{
  fields: Field[];
  backgroundImages: string[];
  rows: Record<string, string>[];
}>();

const emit = defineEmits<{
  complete: [];
  error: [err: unknown];
}>();

const renderContainerRef = ref<HTMLElement | null>(null);
const currentRow = ref<Record<string, string> | null>(null);
const currentBackground = ref<string | null>(null);
const qrMap = ref<Map<string, string>>(new Map());

async function generate(): Promise<Blob | null> {
  if (!renderContainerRef.value || props.rows.length === 0) return null;

  const imgs = props.backgroundImages;

  const renderAndGetElement = async (
    row: Record<string, string>,
    _rowIndex: number
  ): Promise<HTMLElement> => {
    const bg = imgs.length > 0 ? (imgs[Math.floor(Math.random() * imgs.length)] ?? null) : null;
    currentRow.value = row;
    currentBackground.value = bg;
    await nextTick();
    await new Promise((r) => setTimeout(r, 350)); // Allow paint + AutoFitText fitFontSize to finish
    const el = renderContainerRef.value?.querySelector(
      '[data-tag-print]'
    ) as HTMLElement;
    if (!el) throw new Error('Tag element not found');
    return el;
  };

  try {
    const fontFamilies = props.fields
      .filter((f) => f.type === 'text' && f.fontFamily)
      .map((f) => f.fontFamily!);
    preloadFonts(fontFamilies);
    await new Promise((r) => setTimeout(r, 300)); // Allow fonts to load

    qrMap.value = await pregenerateQrCodes(props.fields, props.rows);
    await nextTick();

    const blob = await generatePdf(
      props.fields,
      props.backgroundImages,
      props.rows,
      renderAndGetElement
    );
    emit('complete');
    currentRow.value = null;
    currentBackground.value = null;
    return blob;
  } catch (err) {
    emit('error', err);
    currentRow.value = null;
    currentBackground.value = null;
    return null;
  }
}

defineExpose({ generate });
</script>

<style scoped>
.pdf-generator {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 1200px;
  height: 400px;
  overflow: hidden;
  pointer-events: none;
}

.render-container {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
