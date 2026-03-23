<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 320px">
      <q-card-section>
        <div class="text-h6">Nametag size</div>
        <div class="text-body2 text-grey q-mt-xs">
          Set dimensions for accurate printing. Width is the folded/half size (e.g. 9cm → 18cm unfolded).
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <q-input
              v-model.number="widthHalfCm"
              type="number"
              label="Width (half, cm)"
              suffix="cm"
              :min="2"
              :max="15"
              :step="0.5"
              dense
              outlined
              @update:model-value="onWidthChange"
            />
            <div class="text-caption text-grey q-mt-xs">
              Unfolded: {{ (widthHalfCm * 2).toFixed(1) }} cm
            </div>
          </div>
          <div class="col-6">
            <q-input
              v-model.number="heightCm"
              type="number"
              label="Height (cm)"
              suffix="cm"
              :min="2"
              :max="15"
              :step="0.5"
              dense
              outlined
              @update:model-value="onHeightChange"
            />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  tagWidthMm: number;
  tagHeightMm: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:tagWidthMm': [value: number];
  'update:tagHeightMm': [value: number];
}>();

// Width: stored as full mm, displayed as half cm. 180mm = 18cm unfolded = 9cm half
const widthHalfCm = ref(props.tagWidthMm / 20);
// Height: stored as mm, displayed as cm. 55mm = 5.5cm
const heightCm = ref(props.tagHeightMm / 10);

watch(
  () => [props.modelValue, props.tagWidthMm, props.tagHeightMm],
  () => {
    widthHalfCm.value = props.tagWidthMm / 20;
    heightCm.value = props.tagHeightMm / 10;
  }
);

function onWidthChange(v: string | number | null) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isNaN(n) && n > 0) {
    const mm = Math.round(n * 20); // half cm → full mm (9 * 20 = 180)
    emit('update:tagWidthMm', Math.max(40, Math.min(300, mm)));
  }
}

function onHeightChange(v: string | number | null) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isNaN(n) && n > 0) {
    const mm = Math.round(n * 10); // cm → mm (5.5 * 10 = 55)
    emit('update:tagHeightMm', Math.max(20, Math.min(150, mm)));
  }
}
</script>
