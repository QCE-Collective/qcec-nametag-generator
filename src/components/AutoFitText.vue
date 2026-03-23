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

const props = withDefaults(
  defineProps<{
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    capitalize?: boolean;
    widthPx: number;
    heightPx: number;
  }>(),
  { fontWeight: 400, color: '#000000', align: 'left', capitalize: false }
);

const displayText = computed(() =>
  props.capitalize ? props.text.toUpperCase() : props.text
);

const MIN_FONT_SIZE = 4;

const containerRef = ref<HTMLElement | null>(null);
const fittedFontSize = ref(props.fontSize);

const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

const textStyle = computed(() => ({
  fontSize: `${fittedFontSize.value}px`,
  fontFamily: props.fontFamily,
  fontWeight: props.fontWeight,
  color: props.color,
  textAlign: props.align,
  justifyContent: justifyMap[props.align],
}));

async function fitFontSize() {
  const el = containerRef.value;
  if (!el) return;

  let fs = props.fontSize;
  while (fs > MIN_FONT_SIZE) {
    fittedFontSize.value = fs;
    await nextTick();
    if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) {
      return;
    }
    fs -= 1;
  }
  fittedFontSize.value = fs;
}

function runFit() {
  fittedFontSize.value = props.fontSize;
  nextTick(fitFontSize);
}

onMounted(runFit);

watch(
  () => [props.text, props.capitalize, props.fontSize, props.fontFamily, props.fontWeight, props.color, props.align, props.widthPx, props.heightPx],
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
