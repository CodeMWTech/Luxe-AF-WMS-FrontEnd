<template>
  <div class="location-select">
    <el-select :model-value="rootId" :placeholder="tr('请选择一级仓库')" :disabled="disabled" filterable :clearable="clearable" @change="setRoot">
      <el-option v-for="node in roots" :key="node.id" :value="node.id" :label="optionLabel(node)" :disabled="!selectable(node)" />
    </el-select>
    <el-select v-if="!rootOnly" :model-value="roomId" :placeholder="tr('房间选填，默认一级仓库直存')" :disabled="disabled || !rootId" filterable clearable @change="setRoom">
      <el-option v-for="node in rooms" :key="node.id" :value="node.id" :label="optionLabel(node)" :disabled="!selectable(node)" />
    </el-select>
  </div>
</template>
<script setup>
import { computed, onActivated, onMounted, ref } from 'vue'
import { historicalLocations } from '@/api/wms/warehouse'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const props = defineProps({ modelValue: [String, Number], disabled: Boolean, clearable: Boolean, rootOnly: Boolean, includeInactive: Boolean, filterMode: Boolean })
const emit = defineEmits(['update:modelValue', 'change'])
const nodes = ref([])
const settings = useSettingsStore()
const tr = text => translateByMap(text, settings.language || 'zh-cn')
const same = (a, b) => a != null && b != null && String(a) === String(b)
const selected = computed(() => nodes.value.find(n => same(n.id, props.modelValue)))
const rootId = computed(() => selected.value?.warehouseLevel === 2 ? selected.value.parentId : props.modelValue)
const roomId = computed(() => selected.value?.warehouseLevel === 2 ? selected.value.id : undefined)
// 停用与删除分开处理；已删除仓库及其房间始终不可选。
const available = node => node && node.delFlag === 0 && (props.includeInactive || node.status === 0)
const selectable = node => available(node) && (node.warehouseLevel !== 2 || available(nodes.value.find(root => same(root.id, node.parentId))))
// 单据回显保留当前历史位置，筛选框不因当前选中值而重新显示已删除项。
const visible = (node, selectedId) => selectable(node) || (!props.filterMode && same(node.id, selectedId))
const roots = computed(() => nodes.value.filter(node => node.warehouseLevel === 1 && visible(node, rootId.value)))
const rooms = computed(() => nodes.value.filter(node => node.warehouseLevel === 2 && same(node.parentId, rootId.value) && visible(node, roomId.value)))
const optionLabel = node => node.delFlag === 0 ? node.warehouseName : `${node.warehouseName} (${tr('已删除')})`
function change(value) { emit('update:modelValue', value || undefined); emit('change', value || undefined) }
function setRoot(value) { change(value) }
function setRoom(value) { change(value || rootId.value) }
function clearUnavailableFilter() {
  if (props.filterMode && selected.value && !selectable(selected.value)) change()
}
let pendingLoad
function loadNodes() {
  if (!pendingLoad) {
    pendingLoad = historicalLocations().then(response => {
      nodes.value = response.data || []
      clearUnavailableFilter()
    }).finally(() => { pendingLoad = undefined })
  }
  return pendingLoad
}
onMounted(loadNodes)
// 页面缓存恢复时重新获取状态，避免删除仓库后返回旧页面仍看到缓存选项。
onActivated(loadNodes)
</script>
<style scoped>
.location-select { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; align-items: center; }
.location-select > .el-select { flex: 1; min-width: 180px; }
</style>
