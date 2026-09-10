<template>
  <div class="special-details">
    <div v-if="modelValue.length" class="special-detail-header"><span>类型 <i>*</i></span><span>金额 <i>*</i></span><span>备注</span><span></span></div>
    <div v-for="(item, index) in modelValue" :key="index" class="special-detail-row">
      <div class="special-field" :class="{ 'is-error': item.typeError }">
        <el-select v-model="item.typeId" placeholder="请选择类型" @change="handleTypeChange(item)"><el-option v-for="type in availableTypes" :key="type.id" :label="type.typeName" :value="type.id" /></el-select>
        <span v-if="item.typeError" class="special-error">请选择类型</span>
      </div>
      <div class="special-field" :class="{ 'is-error': item.amountError }">
        <el-input-number v-model="item.amount" :controls="false" :min="amountMin(item)" :precision="2" placeholder="请输入金额" @change="handleAmountChange(item)" />
        <span v-if="item.amountError" class="special-error">金额为必填项</span>
      </div>
      <el-input v-model="item.remark" class="special-remark" placeholder="请输入备注" />
      <el-button type="danger" link @click="remove(index)">删除</el-button>
    </div>
    <div v-if="!modelValue.length" class="special-empty">暂无特殊明细</div>
    <el-button class="add-special-button" plain type="primary" @click="add">+ 新增特殊明细</el-button>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { specialCategory, normalizeSpecialInput, isSpecialAmountEmpty } from './specialDetails'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, types: { type: Array, default: () => [] }, required: Boolean })
const emit = defineEmits(['update:modelValue'])
const availableTypes = computed(() => {
  const types = [...props.types]
  for (const item of props.modelValue) {
    if (item.typeId && !types.some(type => String(type.id) === String(item.typeId))) types.push({ id: item.typeId, typeName: item.typeName || '已停用类型', category: item.category })
  }
  return types
})
function amountMin(item) { return ['DEDUCTION', 'SUBSIDY'].includes(specialCategory(item, availableTypes.value)) ? 0 : undefined }
function handleTypeChange(item) { item.typeError = !item.typeId; normalizeSpecialInput(item, availableTypes.value) }
function handleAmountChange(item) { normalizeSpecialInput(item, availableTypes.value); item.amountError = isSpecialAmountEmpty(item) }
function add() { emit('update:modelValue', [...props.modelValue, { typeId: null, amount: null, remark: '' }]) }
function remove(index) { emit('update:modelValue', props.modelValue.filter((_, i) => i !== index)) }
function validate() {
  let valid = !props.required || props.modelValue.length > 0
  for (const item of props.modelValue) {
    item.typeError = !item.typeId
    item.amountError = isSpecialAmountEmpty(item) || !Number.isFinite(Number(item.amount))
    if (item.typeError || item.amountError) valid = false
  }
  return valid
}
defineExpose({ validate })
</script>
<style scoped lang="scss">
.special-details { width: 100%; }
.special-detail-header, .special-detail-row { display: grid; grid-template-columns: 180px 160px minmax(180px, 1fr) 44px; align-items: start; gap: 10px; }
.special-detail-header { margin-bottom: 6px; color: var(--el-text-color-secondary); font-size: 12px; }
.special-detail-header i { color: var(--el-color-danger); font-style: normal; }
.special-detail-row { margin-bottom: 10px; }
.special-field { position: relative; min-width: 0; }
.special-field.is-error { padding-bottom: 18px; }
.special-field :deep(.el-select), .special-field :deep(.el-input-number) { width: 100%; }
.special-field :deep(.el-input__inner) { text-align: left; }
.special-field.is-error :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px var(--el-color-danger) inset; }
.special-error { position: absolute; left: 0; bottom: 0; color: var(--el-color-danger); font-size: 12px; line-height: 16px; white-space: nowrap; }
.special-empty { display: flex; min-height: 54px; align-items: center; justify-content: center; margin-bottom: 10px; border: 1px dashed var(--el-border-color); border-radius: 6px; color: var(--el-text-color-placeholder); background: var(--el-fill-color-lighter); font-size: 13px; }
.add-special-button { width: 100%; border-style: dashed; }
@media (max-width: 720px) {
  .special-detail-header { display: none; }
  .special-detail-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; }
  .special-remark { grid-column: 1 / -1; grid-row: 2; }
}
</style>
