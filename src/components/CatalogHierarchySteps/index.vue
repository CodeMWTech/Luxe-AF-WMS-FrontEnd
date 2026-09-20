<template>
  <div class="catalog-hierarchy">
    <nav class="catalog-hierarchy__track" aria-label="catalog hierarchy">
      <template v-for="(step, index) in steps" :key="step.key">
        <span v-if="index > 0" class="catalog-hierarchy__sep" aria-hidden="true" />
        <button
          type="button"
          class="catalog-hierarchy__step"
          :class="stepClass(step)"
          :disabled="step.disabled"
          :title="step.value || step.label"
          @click="onClick(step)"
        >
          <span class="catalog-hierarchy__index">{{ index + 1 }}</span>
          <span class="catalog-hierarchy__text">
            <span class="catalog-hierarchy__label">{{ step.label }}</span>
            <span v-if="step.value" class="catalog-hierarchy__value">{{ step.value }}</span>
          </span>
        </button>
      </template>
    </nav>
    <div v-if="pathItems.length" class="catalog-hierarchy__path">
      <span class="catalog-hierarchy__path-label">{{ tr('已选路径') }}</span>
      <div class="catalog-hierarchy__crumbs">
        <template v-for="(item, index) in pathItems" :key="item.key">
          <span v-if="index > 0" class="catalog-hierarchy__crumb-sep">/</span>
          <span class="catalog-hierarchy__crumb" :title="item.label">{{ item.label }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

const props = defineProps({
  /** brand | model | material */
  current: {
    type: String,
    required: true
  },
  categoryLabel: {
    type: String,
    default: ''
  },
  brandLabel: {
    type: String,
    default: ''
  },
  modelLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const order = ['category', 'brand', 'model', 'material']

const steps = computed(() => [
  {
    key: 'category',
    label: tr('分类'),
    value: props.categoryLabel || '',
    disabled: false
  },
  {
    key: 'brand',
    label: tr('品牌'),
    value: props.brandLabel || '',
    disabled: false
  },
  {
    key: 'model',
    label: tr('包型'),
    value: props.modelLabel || '',
    disabled: false
  },
  {
    key: 'material',
    label: tr('材质'),
    value: '',
    disabled: false
  }
])

const pathItems = computed(() =>
  [
    { key: 'category', label: props.categoryLabel },
    { key: 'brand', label: props.brandLabel },
    { key: 'model', label: props.modelLabel }
  ].filter((item) => !!item.label)
)

function stepClass(step) {
  const idx = order.indexOf(step.key)
  const cur = order.indexOf(props.current)
  const isCurrent = step.key === props.current
  return {
    'is-current': isCurrent,
    'is-done': !!step.value && !isCurrent,
    'is-ahead': idx > cur
  }
}

function onClick(step) {
  if (step.disabled) return
  emit('select', step.key)
}
</script>

<style scoped>
.catalog-hierarchy {
  margin: -4px 0 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f7f9fc 0%, #f3f6fb 100%);
  border: 1px solid #e8edf5;
}

.catalog-hierarchy__track {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 0;
}

.catalog-hierarchy__sep {
  width: 28px;
  align-self: center;
  height: 2px;
  margin: 0 4px;
  background: #d8dee9;
  flex: 0 0 28px;
  border-radius: 2px;
}

.catalog-hierarchy__step {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  padding: 10px 14px 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #909399;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.catalog-hierarchy__step::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 0;
  height: 3px;
  border-radius: 3px;
  background: transparent;
  transition: background 0.15s ease;
}

.catalog-hierarchy__step:hover:not(:disabled) {
  color: #409eff;
}

.catalog-hierarchy__index {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: #909399;
  background: #e8edf5;
  flex: 0 0 26px;
}

.catalog-hierarchy__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  gap: 2px;
}

.catalog-hierarchy__label {
  font-size: 15px;
  line-height: 1.25;
  font-weight: 600;
}

.catalog-hierarchy__value {
  max-width: 100%;
  font-size: 13px;
  line-height: 1.25;
  font-weight: 400;
  color: #409eff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.catalog-hierarchy__step.is-done {
  color: #606266;
}

.catalog-hierarchy__step.is-done .catalog-hierarchy__index {
  color: #fff;
  background: #79bbff;
}

.catalog-hierarchy__step.is-current {
  color: #409eff;
}

.catalog-hierarchy__step.is-current::after {
  background: #409eff;
}

.catalog-hierarchy__step.is-current .catalog-hierarchy__index {
  color: #fff;
  background: #409eff;
}

.catalog-hierarchy__step.is-current .catalog-hierarchy__label {
  font-weight: 700;
  color: #409eff;
}

.catalog-hierarchy__step.is-ahead .catalog-hierarchy__label {
  color: #c0c4cc;
  font-weight: 500;
}

.catalog-hierarchy__path {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e0e6ef;
  min-width: 0;
}

.catalog-hierarchy__path-label {
  flex: 0 0 auto;
  font-size: 13px;
  color: #909399;
}

.catalog-hierarchy__crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.catalog-hierarchy__crumb {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: none;
  flex: 0 1 auto;
}

.catalog-hierarchy__crumb-sep {
  color: #c0c4cc;
  flex: 0 0 auto;
  font-size: 14px;
}
</style>
