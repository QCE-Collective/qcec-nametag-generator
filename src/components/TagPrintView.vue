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
          :font-size="(field.fontSize ?? 14) * (PX_PER_MM / 3)"
          :font-family="field.fontFamily ?? 'sans-serif'"
          :font-weight="field.fontWeight ?? 400"
          :color="field.color ?? '#000000'"
          :align="field.align ?? 'left'"
          :width-px="px(field, 'width')"
          :height-px="px(field, 'height')"
        />
      </div>
      <div v-else class="field-qr">
        <img v-if="getQrUrl(field)" :src="getQrUrl(field)" :alt="field.csvKey" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AutoFitText from './AutoFitText.vue';
import type { Field } from 'src/types/nametag';
import { TAG_WIDTH_MM, TAG_HEIGHT_MM } from 'src/types/nametag';

/** Print scale: 1mm = PX_PER_MM pixels (2x for print quality) */
const PX_PER_MM = 6;

const props = withDefaults(
  defineProps<{
    fields: Field[];
    backgroundImage: string | null;
    row: Record<string, string>;
    qrUrls?: Map<string, string>;
  }>(),
  { qrUrls: () => new Map() }
);

const tagStyle = computed(() => ({
  width: `${TAG_WIDTH_MM * PX_PER_MM}px`,
  height: `${TAG_HEIGHT_MM * PX_PER_MM}px`,
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
</style>
