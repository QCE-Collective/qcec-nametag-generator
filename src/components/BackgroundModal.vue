<template>
  <q-dialog v-model="isOpen">
    <q-card class="config-modal-card">
      <q-card-section class="row items-center q-pb-sm">
        <div class="text-h6">Backgrounds</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none scroll config-modal-body">
        <div class="row q-gutter-sm q-mb-md">
          <q-btn color="primary" icon="add_photo_alternate" label="Add images" size="md" @click="triggerUpload">
            <q-tooltip>PNG or JPEG, sized to your nametag dimensions</q-tooltip>
          </q-btn>
          <q-btn
            v-if="backgroundImages.length > 0"
            outline
            color="negative"
            icon="delete_sweep"
            label="Clear all"
            size="md"
            @click="onClearAll"
          />
          <input
            ref="fileInputRef"
            type="file"
            accept=".png,.jpg,.jpeg"
            multiple
            class="hidden"
            @change="onFileChange"
          />
        </div>

        <template v-if="backgroundImages.length > 0">
          <q-separator class="q-mb-md" />
          <div class="text-subtitle2 text-grey-8 q-mb-sm">Assignment</div>
          <div class="row items-center q-gutter-sm q-mb-sm flex-wrap">
            <q-btn-toggle
              v-model="backgroundMode"
              no-caps
              dense
              unelevated
              toggle-color="primary"
              :options="backgroundModeOptions"
            />
            <q-icon name="help_outline" color="grey-7" size="sm" class="cursor-pointer">
              <q-tooltip max-width="320px">
                <strong>Random:</strong> each row gets a background from a stable hash of your nametag field values (same row always maps to the same background).
                <br><br>
                <strong>From CSV:</strong> choose a column, then for each uploaded image enter text that must appear in that cell (case-insensitive). Rules are checked in upload order; the first match wins. If nothing matches, the first background is used. If you leave every “Contains” field empty, the column can still use numeric values (1 = first image, 2 = second, …) like before.
              </q-tooltip>
            </q-icon>
          </div>

          <template v-if="backgroundMode === 'csv' && hasCsv">
            <q-select
              v-model="backgroundCsvColumn"
              :options="backgroundColumnOptions"
              label="CSV column to match"
              dense
              outlined
              emit-value
              map-options
              options-dense
              class="full-width q-mb-sm"
            >
              <template #prepend>
                <q-icon name="view_column" size="xs" />
              </template>
            </q-select>
            <p class="text-caption text-grey q-mb-sm">
              For each image, type text that the cell should contain (e.g. Camp Tamborine). First matching rule wins.
            </p>
          </template>

          <p v-if="backgroundMode === 'csv' && !hasCsv" class="text-caption text-warning q-mb-md">
            Load a CSV to use column-based matching and “Contains” rules.
          </p>

          <q-separator class="q-mb-md" />
          <div class="text-subtitle2 text-grey-8 q-mb-sm">Background list</div>
          <q-list bordered separator class="rounded-borders bg-contains-list">
            <q-item
              v-for="(src, idx) in backgroundImages"
              :key="idx"
              class="bg-list-item"
            >
              <q-item-section avatar top>
                <q-avatar
                  rounded
                  size="72px"
                  class="bg-thumb-clickable cursor-pointer"
                  @click="openLightbox(src)"
                >
                  <img :src="src" alt="">
                  <q-tooltip>View full size</q-tooltip>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label caption class="q-mb-xs">Background {{ idx + 1 }}</q-item-label>
                <q-input
                  v-if="backgroundMode === 'csv' && hasCsv"
                  :model-value="backgroundContainsTexts[idx] ?? ''"
                  label="Contains"
                  placeholder="e.g. Camp Tamborine"
                  dense
                  outlined
                  class="full-width"
                  @update:model-value="(v) => setBackgroundMatchText(idx, String(v ?? ''))"
                />
                <span v-else class="text-body2 text-grey-7">Uses random assignment</span>
              </q-item-section>
              <q-item-section side top>
                <q-btn flat dense round icon="delete" color="negative" size="sm" @click="removeBackgroundImage(idx)">
                  <q-tooltip>Remove this image</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </template>

        <div v-else class="text-body2 text-grey">
          No backgrounds yet. Add images that match your nametag size (width × height).
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Done" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog
    :model-value="lightboxSrc !== null"
    maximized
    transition-show="fade"
    transition-hide="fade"
    class="bg-lightbox-root"
    @update:model-value="(open) => { if (!open) lightboxSrc = null }"
  >
    <div
      class="lightbox-backdrop column flex-center"
      @click="lightboxSrc = null"
    >
      <q-btn
        round
        flat
        icon="close"
        color="white"
        size="lg"
        class="absolute-top-right q-ma-md z-top"
        aria-label="Close"
        @click.stop="lightboxSrc = null"
      />
      <img
        v-if="lightboxSrc"
        :src="lightboxSrc"
        alt="Background preview"
        class="lightbox-img"
        @click="lightboxSrc = null"
      />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useNametagStore } from 'src/composables/useNametagStore';

const isOpen = defineModel<boolean>({ default: false });

const $q = useQuasar();
const store = useNametagStore();

const {
  csvHeaders,
  backgroundImages,
  backgroundMode,
  backgroundCsvColumn,
  backgroundContainsTexts,
  hasCsv,
  addBackgroundImages,
  clearBackgroundImages,
  removeBackgroundImage,
  setBackgroundMatchText,
} = store;

const fileInputRef = ref<HTMLInputElement | null>(null);
const lightboxSrc = ref<string | null>(null);

function openLightbox(src: string) {
  lightboxSrc.value = src;
}

const backgroundModeOptions = [
  { label: 'Random', value: 'random' as const },
  { label: 'From CSV', value: 'csv' as const },
];

const backgroundColumnOptions = computed(() =>
  csvHeaders.value.map((h) => ({ label: h, value: h }))
);

function triggerUpload() {
  fileInputRef.value?.click();
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
        addBackgroundImages(urls);
        input.value = '';
      }
    };
    reader.readAsDataURL(file);
  });
}

function onClearAll() {
  $q.dialog({
    title: 'Remove all backgrounds?',
    message: 'Every uploaded background image will be removed.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    clearBackgroundImages();
  });
}
</script>

<style scoped>
.config-modal-card {
  width: min(100vw - 48px, 480px);
  max-width: 100%;
  max-height: min(90vh, 720px);
  display: flex;
  flex-direction: column;
}

.config-modal-body {
  max-height: min(70vh, 560px);
}

.bg-contains-list {
  max-height: min(40vh, 360px);
  overflow: auto;
}

.bg-list-item {
  align-items: flex-start;
}

.bg-list-item :deep(.q-avatar img) {
  object-fit: cover;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.bg-thumb-clickable:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: 2px;
}

:deep(.bg-lightbox-root .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.88);
}

:deep(.bg-lightbox-root .q-dialog__inner) {
  padding: 0;
}

.lightbox-backdrop {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: 48px 24px 24px;
}

.lightbox-img {
  max-width: min(96vw, 1600px);
  max-height: min(88vh, 1200px);
  width: auto;
  height: auto;
  object-fit: contain;
  cursor: zoom-out;
}

.hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
