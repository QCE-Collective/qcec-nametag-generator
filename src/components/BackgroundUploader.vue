<template>
  <div class="background-uploader row items-center q-gutter-xs">
    <q-btn
      color="primary"
      icon="image"
      :label="backgroundCount === 0 ? 'Upload Backgrounds' : 'Add Backgrounds'"
      size="md"
      @click="triggerUpload"
    >
      <q-tooltip>
        Upload multiple 190×55mm images – one randomly chosen per nametag
      </q-tooltip>
      <input
        ref="inputRef"
        type="file"
        accept=".png,.jpg,.jpeg"
        multiple
        class="hidden"
        @change="onFileChange"
      />
    </q-btn>
    <template v-if="backgroundCount > 0">
      <span class="text-caption">{{ backgroundCount }} bg</span>
      <q-btn flat dense round size="sm" icon="close" @click="onClear">
        <q-tooltip>Clear all</q-tooltip>
      </q-btn>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  backgroundCount: number;
  onBackgroundsAdd: (urls: string[]) => void;
  onBackgroundsClear: () => void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

function triggerUpload() {
  inputRef.value?.click();
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const fileList = input.files;
  if (!fileList?.length) return;

  const files = Array.from(fileList);
  const urls: string[] = [];
  let read = 0;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      urls.push(reader.result as string);
      read++;
      if (read === files.length) {
        props.onBackgroundsAdd(urls);
        input.value = '';
      }
    };
    reader.readAsDataURL(file);
  });
}

function onClear() {
  props.onBackgroundsClear();
}
</script>

<style scoped>
.background-uploader {
  display: flex;
}

.hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
