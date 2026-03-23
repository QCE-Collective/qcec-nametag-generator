<template>
  <div
    ref="containerRef"
    class="auto-fit-text"
    :style="textStyle"
  >
    {{ displayText }}
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';

const emit = defineEmits<{ fitted: [] }>();

const props = withDefaults(
  defineProps<{
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    capitalize?: boolean;
    dropShadow?: boolean;
    widthPx: number;
    heightPx: number;
  }>(),
  { fontWeight: 400, color: '#000000', align: 'left', capitalize: false, dropShadow: false }
);

const displayText = computed(() =>
  props.capitalize ? props.text.toUpperCase() : props.text
);

const MIN_FONT_SIZE = 4;

const containerRef = ref<HTMLElement | null>(null);
const fittedFontSize = ref(props.fontSize);

const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

/** Returns relative luminance 0–1. Dark colors → low, light colors → high */
function getLuminance(hex: string): number {
  const m = hex?.replace(/^#/, '').match(/^([a-f\d])([a-f\d])([a-f\d])$/i);
  let r: number, g: number, b: number;
  if (m && m[1] != null && m[2] != null && m[3] != null) {
    r = parseInt(m[1] + m[1], 16);
    g = parseInt(m[2] + m[2], 16);
    b = parseInt(m[3] + m[3], 16);
  } else {
    const m2 = hex?.replace(/^#/, '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m2 || m2[1] == null || m2[2] == null || m2[3] == null) return 0.5;
    r = parseInt(m2[1], 16);
    g = parseInt(m2[2], 16);
    b = parseInt(m2[3], 16);
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const textStyle = computed(() => {
  let textShadow = 'none';
  if (props.dropShadow && props.color) {
    const luminance = getLuminance(props.color);
    // Dark font → white shadow; light font → black shadow (for readability on any background)
    const shadowColor = luminance < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    textShadow = `0 0 36px ${shadowColor}`;
  }
  return {
    fontSize: `${fittedFontSize.value}px`,
    fontFamily: props.fontFamily,
    fontWeight: props.fontWeight,
    color: props.color,
    textAlign: props.align,
    justifyContent: justifyMap[props.align],
    textShadow,
  };
});

async function fitFontSize() {
  const el = containerRef.value;
  if (!el) return;

  let fs = props.fontSize;
  while (fs > MIN_FONT_SIZE) {
    fittedFontSize.value = fs;
    await nextTick();
    if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) {
      emit('fitted');
      return;
    }
    fs -= 1;
  }
  fittedFontSize.value = fs;
  emit('fitted');
}

function runFit() {
  fittedFontSize.value = props.fontSize;
  nextTick(fitFontSize);
}

onMounted(runFit);

watch(
  () => [props.text, props.capitalize, props.fontSize, props.fontFamily, props.fontWeight, props.color, props.align, props.dropShadow, props.widthPx, props.heightPx],
  runFit
);
</script>

<style scoped>
.auto-fit-text {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  word-break: break-word;
  box-sizing: border-box;
}
</style>
