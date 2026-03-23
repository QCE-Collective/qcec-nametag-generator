<template>
  <div class="qr-field">
    <img v-if="dataUrl" :src="dataUrl" :alt="csvKey" draggable="false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = withDefaults(
  defineProps<{
    value: string;
    widthPx: number;
    heightPx: number;
    csvKey: string;
    qrColor?: string;
  }>(),
  { qrColor: '#000000' }
);

const dataUrl = ref('');

function generate() {
  const size = Math.min(props.widthPx, props.heightPx);
  const dark = (props.qrColor || '#000000').slice(0, 7);
  const darkHex = dark.length === 7 ? `${dark}ff` : dark;
  QRCode.toDataURL(props.value || ' ', {
    width: size,
    margin: 0,
    color: { dark: darkHex, light: '#00000000' },
  })
    .then((url) => {
      dataUrl.value = url;
    })
    .catch(() => {
      dataUrl.value = '';
    });
}

onMounted(generate);
watch(() => [props.value, props.widthPx, props.heightPx, props.qrColor], generate);
</script>

<style scoped>
.qr-field {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* Let parent field-layer receive drag events */
}

.qr-field img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
}
</style>
