<template>
  <div class="tag-editor" ref="containerRef">
    <div
      class="canvas-wrapper"
      :style="canvasWrapperStyle"
      @mousedown="onCanvasMouseDown"
    >
      <div
        class="canvas"
        :style="canvasStyle"
      >
        <!-- Background layer -->
        <div
          v-if="backgroundImage"
          class="background-layer"
          :style="backgroundStyle"
        />
        <div v-else class="background-placeholder">
          <q-icon name="image" size="48px" />
          <span>No background - upload {{ tagWidthMm }}×{{ tagHeightMm }}mm image</span>
        </div>

        <!-- Guides -->
        <div v-if="showFoldLine" class="guide fold-line" :style="foldLineStyle" />
        <div v-if="showSafeGuides" class="guide safe-margin" :style="safeLeftStyle" />
        <div v-if="showSafeGuides" class="guide safe-margin" :style="safeRightStyle" />
        <div v-if="showSafeGuides" class="guide safe-margin" :style="safeTopStyle" />
        <div v-if="showSafeGuides" class="guide safe-margin" :style="safeBottomStyle" />

        <!-- Field layers -->
        <div
          v-for="field in fields"
          :key="field.id"
          class="field-layer"
          :class="{ selected: selectedFieldIds.includes(field.id) }"
          :style="getFieldStyle(field)"
          @mousedown.stop="onFieldMouseDown($event, field)"
        >
          <div v-if="field.type === 'text'" class="field-text">
            <AutoFitText
              :text="getFieldValue(field)"
              :font-size="field.fontSize ?? 14"
              :font-family="field.fontFamily ?? 'sans-serif'"
              :font-weight="field.fontWeight ?? 400"
              :color="field.color ?? '#000000'"
              :align="field.align ?? 'left'"
              :capitalize="field.capitalize ?? false"
              :drop-shadow="field.dropShadow ?? false"
              :width-px="mmToPx(field.width)"
              :height-px="mmToPx(field.height)"
            />
          </div>
          <div v-else-if="field.type === 'qr'" class="field-qr">
            <QrField
              :value="getFieldValue(field)"
              :width-px="mmToPx(field.width)"
              :height-px="mmToPx(field.height)"
              :csv-key="field.csvKey"
              :qr-color="field.qrColor ?? '#000000'"
            />
          </div>
          <div v-else-if="field.type === 'circle'" class="field-circle">
            <div
              class="circle"
              :style="getCircleStyle(field)"
            />
          </div>
          <div v-if="selectedFieldId === field.id && selectedFieldIds.length === 1" class="resize-handle" @mousedown.stop="onResizeStart($event, field)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import QrField from './QrField.vue';
import AutoFitText from './AutoFitText.vue';
import type { Field } from 'src/types/nametag';
import { SAFE_MARGIN_MM } from 'src/types/nametag';
import { resolveCircleColors } from 'src/utils/colorRules';

const MM_TO_PX = 6; // Match print scale (6px/mm) so background displays 1:1

const props = withDefaults(
  defineProps<{
    fields: Field[];
    selectedFieldIds: string[];
    selectedFieldId: string | null;
    backgroundImage: string | null;
    previewRow: Record<string, string>;
    showFoldLine: boolean;
    showSafeGuides: boolean;
    tagWidthMm: number;
    tagHeightMm: number;
    scale?: number;
  }>(),
  { tagWidthMm: 180, tagHeightMm: 55 }
);

const emit = defineEmits<{
  selectField: [id: string | null, addToSelection?: boolean];
  updateField: [id: string, updates: Partial<Field>];
}>();

const PREVIEW_MARGIN_PX = 32;

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const containerHeight = ref(0);

const scale = computed(() => {
  if (props.scale != null) return props.scale;
  const w = containerWidth.value - 2 * PREVIEW_MARGIN_PX;
  const h = containerHeight.value - 2 * PREVIEW_MARGIN_PX;
  if (w <= 0 || h <= 0) return 1;
  const scaleW = w / canvasWidthPx.value;
  const scaleH = h / canvasHeightPx.value;
  return Math.min(scaleW, scaleH, 4);
});

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const el = containerRef.value;
  if (!el) return;
  containerWidth.value = el.clientWidth;
  containerHeight.value = el.clientHeight;
  resizeObserver = new ResizeObserver((entries) => {
    const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
    containerWidth.value = width;
    containerHeight.value = height;
  });
  resizeObserver.observe(el);
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', onKeyDown);
});

const canvasWidthPx = computed(() => props.tagWidthMm * MM_TO_PX);
const canvasHeightPx = computed(() => props.tagHeightMm * MM_TO_PX);

const canvasStyle = computed(() => ({
  width: `${canvasWidthPx.value}px`,
  height: `${canvasHeightPx.value}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}));

const canvasWrapperStyle = computed(() => {
  const w = canvasWidthPx.value * scale.value;
  const h = canvasHeightPx.value * scale.value;
  return {
    width: `${w}px`,
    height: `${h}px`,
    overflow: 'hidden',
  };
});

const backgroundStyle = computed(() => ({
  backgroundImage: `url(${props.backgroundImage})`,
  backgroundSize: '100% 100%',
  backgroundPosition: 'center',
}));

const foldLineStyle = computed(() => ({
  left: `${(props.tagWidthMm / 2) * MM_TO_PX}px`,
  width: '1px',
  height: '100%',
}));

const safeLeftStyle = computed(() => ({
  left: `${SAFE_MARGIN_MM * MM_TO_PX}px`,
  width: '1px',
  height: '100%',
}));

const safeRightStyle = computed(() => ({
  left: `${(props.tagWidthMm - SAFE_MARGIN_MM) * MM_TO_PX}px`,
  width: '1px',
  height: '100%',
}));

const safeTopStyle = computed(() => ({
  top: `${SAFE_MARGIN_MM * MM_TO_PX}px`,
  width: '100%',
  height: '1px',
}));

const safeBottomStyle = computed(() => ({
  top: `${(props.tagHeightMm - SAFE_MARGIN_MM) * MM_TO_PX}px`,
  width: '100%',
  height: '1px',
}));

const SNAP_GRID_MM = 0.1; // 0.1mm for fine positioning

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function snapToGrid(v: number): number {
  return round2(Math.round(v / SNAP_GRID_MM) * SNAP_GRID_MM);
}

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

function getFieldStyle(field: Field) {
  return {
    left: `${mmToPx(field.x)}px`,
    top: `${mmToPx(field.y)}px`,
    width: `${mmToPx(field.width)}px`,
    height: `${mmToPx(field.height)}px`,
  };
}

function getFieldValue(field: Field): string {
  const val = props.previewRow[field.csvKey];
  return val ?? `{{${field.csvKey}}}`;
}

function getCircleStyle(field: Field) {
  const cellValue = props.previewRow[field.csvKey] ?? '';
  const resolved = resolveCircleColors(field, cellValue);
  const borderWidthPx = (field.borderWidthMm ?? 0.5) * MM_TO_PX;
  const size = Math.min(mmToPx(field.width), mmToPx(field.height));
  const noMatchPlaceholder =
    field.hideCircleWhenNoMatch && !resolved.matched
      ? {
          backgroundColor: '#808080',
          border: `${borderWidthPx}px solid #808080`,
          opacity: 0.5,
        }
      : {};
  return {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: resolved.fillColor,
    border: `${borderWidthPx}px solid ${resolved.borderColor}`,
    boxSizing: 'border-box' as const,
    ...noMatchPlaceholder,
  };
}

let dragField: Field | null = null;
let dragStartX = 0;
let dragStartY = 0;
let fieldStartX = 0;
let fieldStartY = 0;
let isResizing = false;
let resizeStartW = 0;
let resizeStartH = 0;

function onFieldMouseDown(e: MouseEvent, field: Field) {
  if (isResizing) return;
  e.preventDefault();
  emit('selectField', field.id, e.shiftKey);
  dragField = field;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  fieldStartX = field.x;
  fieldStartY = field.y;
  const pxPerMm = MM_TO_PX * scale.value;

  const onMouseMove = (e: MouseEvent) => {
    if (!dragField) return;
    const dx = (e.clientX - dragStartX) / pxPerMm;
    const dy = (e.clientY - dragStartY) / pxPerMm;
    const newX = Math.max(0, Math.min(props.tagWidthMm - dragField.width, fieldStartX + dx));
    const newY = Math.max(0, Math.min(props.tagHeightMm - dragField.height, fieldStartY + dy));
    emit('updateField', dragField.id, {
      x: snapToGrid(newX),
      y: snapToGrid(newY),
    });
  };

  const onMouseUp = () => {
    dragField = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onResizeStart(e: MouseEvent, field: Field) {
  e.stopPropagation();
  isResizing = true;
  emit('selectField', field.id);
  const startX = e.clientX;
  const startY = e.clientY;
  resizeStartW = field.width;
  resizeStartH = field.height;
  const pxPerMm = MM_TO_PX * scale.value;

  const onMouseMove = (e: MouseEvent) => {
    const dx = (e.clientX - startX) / pxPerMm;
    const dy = (e.clientY - startY) / pxPerMm;
    const newW = Math.max(10, Math.min(props.tagWidthMm - field.x, resizeStartW + dx));
    const newH = Math.max(10, Math.min(props.tagHeightMm - field.y, resizeStartH + dy));
    emit('updateField', field.id, {
      width: snapToGrid(newW),
      height: snapToGrid(newH),
    });
  };

  const onMouseUp = () => {
    isResizing = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onCanvasMouseDown() {
  emit('selectField', null, false);
}

const ARROW_STEP_MM = SNAP_GRID_MM;

function onKeyDown(e: KeyboardEvent) {
  if (!props.selectedFieldId || props.selectedFieldIds.length > 1) return;
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.closest('[contenteditable]'))) {
    return;
  }
  const field = props.fields.find((f) => f.id === props.selectedFieldId);
  if (!field) return;

  const step = e.shiftKey ? ARROW_STEP_MM * 10 : ARROW_STEP_MM;
  let dx = 0;
  let dy = 0;
  if (e.key === 'ArrowLeft') dx = -step;
  else if (e.key === 'ArrowRight') dx = step;
  else if (e.key === 'ArrowUp') dy = -step;
  else if (e.key === 'ArrowDown') dy = step;
  else return;

  e.preventDefault();
  const newX = Math.max(0, Math.min(props.tagWidthMm - field.width, field.x + dx));
  const newY = Math.max(0, Math.min(props.tagHeightMm - field.height, field.y + dy));
  emit('updateField', field.id, { x: snapToGrid(newX), y: snapToGrid(newY) });
}
</script>

<style scoped>
.tag-editor {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 1rem;
  overflow: auto;
  background: #e0e0e0;
}

.canvas-wrapper {
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.canvas {
  position: relative;
  background: #fff;
  overflow: hidden;
  user-select: none;
}

.background-layer {
  position: absolute;
  inset: 0;
}

.background-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #999;
}

.guide {
  position: absolute;
  pointer-events: none;
}

.fold-line {
  background: rgba(255, 0, 0, 0.5);
}

.safe-margin {
  background: rgba(0, 128, 255, 0.3);
}

.field-layer {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: move;
  border: 2px solid transparent;
  user-select: none;
}

.field-layer.selected {
  border-color: #1976d2;
}

.field-text {
  width: 100%;
  height: 100%;
  overflow: hidden;
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

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #1976d2;
  cursor: se-resize;
}
</style>
