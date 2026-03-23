<template>
  <div class="field-sidebar">
    <div class="q-pa-md">
      <div class="text-h6 q-mb-md">Fields</div>

      <div class="q-gutter-sm q-mb-md">
        <q-btn color="primary" icon="text_fields" label="Add Text" size="sm" @click="onAddField('text')" />
        <q-btn color="primary" icon="qr_code_2" label="Add QR" size="sm" @click="onAddField('qr')" />
      </div>

      <q-list v-if="fields.length > 0" bordered separator class="rounded-borders">
        <q-item
          v-for="field in fields"
          :key="field.id"
          v-ripple
          clickable
          :active="selectedFieldIds.includes(field.id)"
          active-class="bg-primary-1"
          @click="onSelectField($event, field.id)"
        >
          <q-item-section avatar>
            <q-icon :name="field.type === 'text' ? 'text_fields' : 'qr_code_2'" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ field.csvKey }}</q-item-label>
            <q-item-label caption>{{ field.type }} ({{ field.x }}, {{ field.y }})</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense round icon="delete" size="sm" @click.stop="onRemoveField(field.id)" />
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="selectedFields.length >= 2" class="q-mt-md align-panel">
        <div class="text-caption q-mb-xs">Align {{ selectedFields.length }} items</div>
        <div class="row q-gutter-xs">
          <q-btn flat dense size="sm" icon="format_align_left" @click="onAlignLeft">
            <q-tooltip>Align left</q-tooltip>
          </q-btn>
          <q-btn flat dense size="sm" icon="format_align_center" @click="onAlignCenter">
            <q-tooltip>Align center</q-tooltip>
          </q-btn>
          <q-btn flat dense size="sm" icon="format_align_right" @click="onAlignRight">
            <q-tooltip>Align right</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div v-if="selectedField" class="q-mt-lg selected-field-panel">
        <div class="text-subtitle1 q-mb-sm">Edit: {{ selectedField!.csvKey }}</div>

        <q-select
          :model-value="selectedField!.csvKey"
          :options="csvHeaders"
          label="CSV Column"
          dense
          options-dense
          class="q-mb-sm"
          @update:model-value="(v: string) => selectedField && updateField(selectedField.id, { csvKey: v })"
        />

        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <q-input
              :model-value="selectedField!.x"
              label="X (mm)"
              type="number"
              dense
              @update:model-value="(v) => selectedField && updateField(selectedField.id, { x: Number(v) })"
            />
          </div>
          <div class="col-6">
            <q-input
              :model-value="selectedField!.y"
              label="Y (mm)"
              type="number"
              dense
              @update:model-value="(v) => selectedField && updateField(selectedField.id, { y: Number(v) })"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <q-input
              :model-value="selectedField!.width"
              label="Width (mm)"
              type="number"
              dense
              @update:model-value="(v) => selectedField && updateField(selectedField.id, { width: Number(v) })"
            />
          </div>
          <div class="col-6">
            <q-input
              :model-value="selectedField!.height"
              label="Height (mm)"
              type="number"
              dense
              @update:model-value="(v) => selectedField && updateField(selectedField.id, { height: Number(v) })"
            />
          </div>
        </div>

        <template v-if="selectedField.type === 'text'">
          <q-select
            :model-value="selectedField!.fontFamily ?? 'sans-serif'"
            :options="fontOptions"
            label="Font"
            dense
            options-dense
            use-input
            class="q-mb-sm"
            @update:model-value="(v) => selectedField && onFontChange(selectedField.id, v)"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label :style="{ fontFamily: scope.opt }">{{ scope.opt }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-select
            :model-value="selectedField!.fontWeight ?? 400"
            :options="fontWeightOptions"
            label="Font weight"
            dense
            options-dense
            emit-value
            map-options
            class="q-mb-sm"
            @update:model-value="(v) => selectedField && updateField(selectedField.id, { fontWeight: Number(v) })"
          />
          <q-input
            :model-value="selectedField!.fontSize"
            label="Font size"
            type="number"
            dense
            class="q-mb-sm"
            @update:model-value="(v) => selectedField && updateField(selectedField.id, { fontSize: Number(v) })"
          />
          <q-input
            :model-value="selectedField!.color ?? ''"
            label="Color"
            dense
            class="q-mb-sm"
            @update:model-value="(v) => selectedField && v != null && updateField(selectedField.id, { color: String(v) })"
          >
            <template #append>
              <q-icon name="palette" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-color
                    :model-value="(selectedField!.color || '#000000') as string"
                    @update:model-value="(v: string | null) => selectedField && v != null && updateField(selectedField.id, { color: v })"
                  />
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-select
            :model-value="selectedField!.align"
            :options="alignOptions"
            label="Align"
            dense
            options-dense
            emit-value
            map-options
            class="q-mb-sm"
            @update:model-value="(v) => selectedField && updateField(selectedField.id, { align: v })"
          />
          <q-checkbox
            :model-value="selectedField!.capitalize ?? false"
            label="CAPITALIZE"
            dense
            class="q-mb-sm"
            @update:model-value="(v) => selectedField && updateField(selectedField.id, { capitalize: Boolean(v) })"
          />
        </template>

        <template v-if="selectedField.type === 'qr'">
          <div class="row items-center q-gutter-sm q-mb-sm">
            <span class="text-body2">QR color</span>
            <q-btn flat dense :style="{ background: (selectedField!.qrColor || '#000000') }" class="qr-color-swatch">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-color
                  :model-value="(selectedField!.qrColor || '#000000') as string"
                  no-header
                  @update:model-value="(v: string | null) => selectedField && v != null && updateField(selectedField.id, { qrColor: v })"
                />
              </q-popup-proxy>
            </q-btn>
          </div>
        </template>

        <q-btn flat icon="content_copy" label="Duplicate" size="sm" @click="selectedField && onDuplicateField(selectedField.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Field } from 'src/types/nametag';
import { GOOGLE_FONTS, LOCAL_FONTS, SYSTEM_FONTS, FONT_WEIGHTS, loadGoogleFont } from 'src/constants/fonts';

defineProps<{
  fields: Field[];
  selectedFieldIds: string[];
  selectedField: Field | null;
  selectedFields: Field[];
  csvHeaders: string[];
}>();

const emit = defineEmits<{
  addField: [type: 'text' | 'qr'];
  selectField: [id: string | null, addToSelection?: boolean];
  updateField: [id: string, updates: Partial<Field>];
  removeField: [id: string];
  duplicateField: [id: string];
  alignFieldsLeft: [];
  alignFieldsCenter: [];
  alignFieldsRight: [];
}>();

const alignOptions = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
];

const fontOptions = [
  'sans-serif',
  'serif',
  'monospace',
  ...LOCAL_FONTS,
  ...SYSTEM_FONTS,
  ...GOOGLE_FONTS,
];

const fontWeightOptions = FONT_WEIGHTS.map((w) => ({ label: `${w.label} (${w.value})`, value: w.value }));

function onFontChange(id: string, fontFamily: string) {
  // Local fonts (e.g. Bold Title) are loaded via CSS
  if ((GOOGLE_FONTS as readonly string[]).includes(fontFamily)) {
    loadGoogleFont(fontFamily);
  }
  emit('updateField', id, { fontFamily });
}

function onAddField(type: 'text' | 'qr') {
  emit('addField', type);
}

function onSelectField(e: Event, id: string) {
  emit('selectField', id, (e as MouseEvent).shiftKey);
}

function onAlignLeft() {
  emit('alignFieldsLeft');
}
function onAlignCenter() {
  emit('alignFieldsCenter');
}
function onAlignRight() {
  emit('alignFieldsRight');
}

function updateField(id: string, updates: Partial<Field>) {
  emit('updateField', id, updates);
}

function onRemoveField(id: string) {
  emit('removeField', id);
}

function onDuplicateField(id: string) {
  emit('duplicateField', id);
}
</script>

<style scoped>
.field-sidebar {
  min-width: 260px;
  max-width: 280px;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  background: #fafafa;
}

.align-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 0.75rem;
}

.selected-field-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 1rem;
}

.qr-color-swatch {
  min-width: 36px;
  min-height: 36px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
</style>
