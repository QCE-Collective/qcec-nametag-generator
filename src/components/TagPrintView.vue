<template>
  <div class="tag-print" :style="tagStyle" data-tag-print ref="tagRef">
    <div v-if="backgroundImage" class="bg" :style="bgStyle" />
    <div
      v-for="field in fields"
      :key="field.id"
      class="field"
      :style="getFieldStyle(field)"
    >
      <div v-if="field.type === 'text'" class="field-text">
        <AutoFitText
          :text="getValue(field)"
          @fitted="onTextFitted"
          :font-size="field.fontSize ?? 14"
          :font-family="field.fontFamily ?? 'sans-serif'"
          :font-weight="field.fontWeight ?? 400"
          :color="field.color ?? '#000000'"
          :align="field.align ?? 'left'"
          :capitalize="field.capitalize ?? false"
          :drop-shadow="field.dropShadow ?? false"
          :width-px="px(field, 'width')"
          :height-px="px(field, 'height')"
        />
      </div>
      <div v-else-if="field.type === 'qr'" class="field-qr">
        <img v-if="getQrUrl(field)" :src="getQrUrl(field)" :alt="field.csvKey" />
      </div>
      <div v-else-if="field.type === 'circle'" class="field-circle">
        <div v-if="!isCircleHidden(field)" class="circle" :style="getCircleStyle(field)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AutoFitText from './AutoFitText.vue';
import type { Field } from 'src/types/nametag';
import { resolveCircleColors } from 'src/utils/colorRules';

/** Print scale: 1mm = PX_PER_MM pixels (2x for print quality) */
const PX_PER_MM = 6;

const props = withDefaults(
  defineProps<{
    fields: Field[];
    backgroundImage: string | null;
    row: Record<string, string>;
    tagWidthMm?: number;
    tagHeightMm?: number;
    qrUrls?: Map<string, string>;
  }>(),
  { tagWidthMm: 180, tagHeightMm: 55, qrUrls: () => new Map() }
);

const textFieldCount = computed(
  () => props.fields.filter((f) => f.type === 'text').length
);
const fittedCount = ref(0);
let readyResolve: (() => void) | null = null;
const readyPromise = ref(Promise.resolve());

watch(
  () => props.row,
  () => {
    fittedCount.value = 0;
    readyPromise.value = new Promise<void>((r) => {
      readyResolve = r;
    });
  },
  { deep: true, immediate: true }
);

function onTextFitted() {
  fittedCount.value += 1;
  if (fittedCount.value >= textFieldCount.value && readyResolve) {
    readyResolve();
    readyResolve = null;
  }
}

function whenReady(): Promise<void> {
  if (textFieldCount.value === 0) return Promise.resolve();
  return readyPromise.value;
}

defineExpose({ whenReady });

const tagStyle = computed(() => ({
  width: `${props.tagWidthMm * PX_PER_MM}px`,
  height: `${props.tagHeightMm * PX_PER_MM}px`,
}));

const bgStyle = computed(() => ({
  backgroundImage: `url(${props.backgroundImage})`,
  backgroundSize: '100% 100%',
}));

function px(field: Field, dim: 'x' | 'y' | 'width' | 'height') {
  return (field[dim] ?? 0) * PX_PER_MM;
}

function getFieldStyle(field: Field) {
  return {
    left: `${px(field, 'x')}px`,
    top: `${px(field, 'y')}px`,
    width: `${px(field, 'width')}px`,
    height: `${px(field, 'height')}px`,
  };
}

function getValue(field: Field) {
  const val = props.row[field.csvKey] ?? '';
  return field.capitalize ? val.toUpperCase() : val;
}

function getQrUrl(field: Field): string {
  const val = getValue(field);
  return props.qrUrls?.get(`${field.id}|${val}`) ?? '';
}

function isCircleHidden(field: Field): boolean {
  if (field.type !== 'circle' || !field.hideCircleWhenNoMatch) return false;
  const cellValue = props.row[field.csvKey] ?? '';
  const { matched } = resolveCircleColors(field, cellValue);
  return !matched;
}

function getCircleStyle(field: Field) {
  const cellValue = props.row[field.csvKey] ?? '';
  const { fillColor, borderColor } = resolveCircleColors(field, cellValue);
  const borderWidthPx = (field.borderWidthMm ?? 0.5) * PX_PER_MM;
  const size = Math.min(px(field, 'width'), px(field, 'height'));
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: fillColor,
    border: `${borderWidthPx}px solid ${borderColor}`,
    boxSizing: 'border-box' as const,
  };
}
</script>

<style scoped>
.tag-print {
  position: relative;
  background: #fff;
}

.bg {
  position: absolute;
  inset: 0;
}

.field {
  position: absolute;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.field-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  word-break: break-word;
}

.field-qr {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-qr img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.field-circle {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-circle .circle {
  flex-shrink: 0;
}
</style>
