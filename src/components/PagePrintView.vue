<template>
  <div class="page-print" data-page-print :style="pageStyle">
    <TagPrintView
      v-for="(row, idx) in paddedRows"
      :key="idx"
      :ref="(el) => setTagRef(idx, el)"
      :fields="fields"
      :background-image="getBackground(idx)"
      :row="row"
      :qr-urls="qrUrls"
      :tag-width-mm="props.tagWidthMm"
      :tag-height-mm="props.tagHeightMm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TagPrintView from './TagPrintView.vue';
import type { Field } from 'src/types/nametag';
import { VERTICAL_SPACING_MM, TAGS_PER_PAGE } from 'src/types/nametag';

const PX_PER_MM = 6;

const props = withDefaults(
  defineProps<{
    fields: Field[];
    rows: Record<string, string>[];
    backgroundImages: string[];
    backgroundIndices: number[];
    tagWidthMm?: number;
    tagHeightMm?: number;
    qrUrls?: Map<string, string>;
  }>(),
  { tagWidthMm: 180, tagHeightMm: 55, qrUrls: () => new Map() }
);

const tagRefs = ref<(InstanceType<typeof TagPrintView> | null)[]>([]);

function setTagRef(idx: number, el: unknown) {
  if (el) {
    tagRefs.value[idx] = el as InstanceType<typeof TagPrintView>;
  }
}

const paddedRows = computed(() => {
  const r = [...props.rows];
  while (r.length < TAGS_PER_PAGE) {
    r.push({});
  }
  return r;
});

function getBackground(idx: number): string | null {
  const imgs = props.backgroundImages;
  if (imgs.length === 0) return null;
  const indices = props.backgroundIndices;
  if (idx >= indices.length) return imgs[0] ?? null;
  const i = indices[idx] ?? 0;
  return imgs[i] ?? null;
}

const pageHeightPx = computed(() => {
  const tagH = props.tagHeightMm * PX_PER_MM;
  const spacing = VERTICAL_SPACING_MM * PX_PER_MM;
  return TAGS_PER_PAGE * tagH + (TAGS_PER_PAGE - 1) * spacing;
});

const pageStyle = computed(() => ({
  width: `${props.tagWidthMm * PX_PER_MM}px`,
  height: `${pageHeightPx.value}px`,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: `${VERTICAL_SPACING_MM * PX_PER_MM}px`,
  backgroundColor: '#fff',
}));

function whenReady(): Promise<void> {
  const refs = tagRefs.value.filter(Boolean);
  if (refs.length === 0) return Promise.resolve();
  return Promise.all(refs.map((r) => r!.whenReady())).then(() => {});
}

defineExpose({ whenReady });
</script>

<style scoped>
.page-print {
  box-sizing: border-box;
}
</style>
