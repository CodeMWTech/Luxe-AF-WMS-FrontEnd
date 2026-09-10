<template>
  <div class="live-employee-select">
    <el-select :model-value="modelValue" filterable clearable :placeholder="placeholder" :disabled="disabled" @update:model-value="$emit('update:modelValue', $event)" @change="$emit('change', $event)">
      <el-option v-for="employee in visibleEmployees" :key="employee.value" :value="employee.value" :label="liveEmployeeOptionLabel(employee)" />
    </el-select>
    <el-checkbox v-if="!disabled" v-model="includeInactive">包含已归档</el-checkbox>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue'
import { liveEmployeeOptionLabel } from '../shared'
const props = defineProps({ modelValue: [String, Number], employees: { type: Array, default: () => [] }, placeholder: { type: String, default: '全部主播' }, disabled: Boolean })
defineEmits(['update:modelValue', 'change'])
const includeInactive = ref(false)
const visibleEmployees = computed(() => props.employees.filter(v => includeInactive.value || Number(v.employeeStatus || 0) < 2 || v.value === props.modelValue))
</script>
<style scoped>
.live-employee-select { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.live-employee-select .el-select { min-width: 180px; flex: 1; }
.live-employee-select .el-checkbox { margin: 0; font-size: 12px; }
</style>
