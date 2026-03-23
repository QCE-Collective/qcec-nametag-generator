<template>
  <div class="pdf-generator">
    <div ref="renderContainerRef" class="render-container">
      <PagePrintView
        v-if="currentPageRows.length > 0"
        ref="pagePrintRef"
        :fields="fields"
        :rows="currentPageRows"
        :background-images="backgroundImages"
        :background-indices="currentBackgroundIndices"
        :qr-urls="qrMap"
        :tag-width-mm="props.tagWidthMm"
        :tag-height-mm="props.tagHeightMm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import PagePrintView from './PagePrintView.vue';
import { generatePdf, pregenerateQrCodes } from 'src/utils/pdfGenerator';
import { preloadFonts } from 'src/constants/fonts';
import { startKeepAliveAudio, stopKeepAliveAudio } from 'src/utils/keepAliveAudio';
import type { Field } from 'src/types/nametag';

const props = withDefaults(
  defineProps<{
    fields: Field[];
    backgroundImages: string[];
    rows: Record<string, string>[];
    tagWidthMm?: number;
    tagHeightMm?: number;
  }>(),
  { tagWidthMm: 180, tagHeightMm: 55 }
);

const emit = defineEmits<{
  complete: [];
  error: [err: unknown];
  progress: [progress: import('src/utils/pdfGenerator').PdfProgress];
}>();

const renderContainerRef = ref<HTMLElement | null>(null);
const pagePrintRef = ref<InstanceType<typeof PagePrintView> | null>(null);
const currentPageRows = ref<Record<string, string>[]>([]);
const currentBackgroundIndices = ref<number[]>([]);
const qrMap = ref<Map<string, string>>(new Map());

async function generate(): Promise<Blob | null> {
  if (!renderContainerRef.value || props.rows.length === 0) return null;

  startKeepAliveAudio();

  const renderAndGetPage = async (
    pageRows: Record<string, string>[],
    backgroundIndices: number[]
  ): Promise<HTMLElement> => {
    currentPageRows.value = pageRows;
    currentBackgroundIndices.value = backgroundIndices;
    await nextTick();
    await Promise.race([
      pagePrintRef.value?.whenReady() ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 80)),
    ]);
    const el = renderContainerRef.value?.querySelector(
      '[data-page-print]'
    ) as HTMLElement;
    if (!el) throw new Error('Page element not found');
    return el;
  };

  try {
    const fontFamilies = props.fields
      .filter((f) => f.type === 'text' && f.fontFamily)
      .map((f) => f.fontFamily!);
    preloadFonts(fontFamilies);
    await new Promise((r) => setTimeout(r, 150)); // Fonts - reduced for speed

    qrMap.value = await pregenerateQrCodes(
      props.fields,
      props.rows,
      (p) => emit('progress', p)
    );
    await nextTick();

    const blob = await generatePdf(
      props.fields,
      props.backgroundImages,
      props.rows,
      renderAndGetPage,
      (p) => emit('progress', p),
      props.tagWidthMm,
      props.tagHeightMm
    );
    emit('complete');
    currentPageRows.value = [];
    currentBackgroundIndices.value = [];
    return blob;
  } catch (err) {
    emit('error', err);
    currentPageRows.value = [];
    currentBackgroundIndices.value = [];
    return null;
  } finally {
    stopKeepAliveAudio();
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
  height: 1800px;
  overflow: hidden;
  pointer-events: none;
}

.render-container {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
