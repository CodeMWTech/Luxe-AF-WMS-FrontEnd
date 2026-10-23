<template>
  <div class="location-select">
    <el-select :model-value="rootId" :placeholder="tr('请选择一级仓库')" :disabled="disabled" filterable :clearable="clearable" @change="setRoot">
      <el-option v-for="node in roots" :key="node.id" :value="node.id" :label="node.warehouseName" :disabled="!includeInactive && (node.status !== 0 || node.delFlag !== 0)" />
    </el-select>
    <el-select v-if="!rootOnly" :model-value="roomId" :placeholder="tr('房间选填，默认一级仓库直存')" :disabled="disabled || !rootId" filterable clearable @change="setRoom">
      <el-option v-for="node in rooms" :key="node.id" :value="node.id" :label="node.warehouseName" :disabled="!includeInactive && (node.status !== 0 || node.delFlag !== 0)" />
    </el-select>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { historicalLocations } from '@/api/wms/warehouse'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const props = defineProps({ modelValue: [String, Number], disabled: Boolean, clearable: Boolean, rootOnly: Boolean, includeInactive: Boolean })
const emit = defineEmits(['update:modelValue', 'change'])
const nodes = ref([])
const settings = useSettingsStore()
const tr = text => translateByMap(text, settings.language || 'zh-cn')
const same = (a, b) => a != null && b != null && String(a) === String(b)
const selected = computed(() => nodes.value.find(n => same(n.id, props.modelValue)))
const rootId = computed(() => selected.value?.warehouseLevel === 2 ? selected.value.parentId : props.modelValue)
const roomId = computed(() => selected.value?.warehouseLevel === 2 ? selected.value.id : undefined)
const active = n => props.includeInactive || (n.status === 0 && n.delFlag === 0)
const roots = computed(() => nodes.value.filter(n => n.warehouseLevel === 1 && (active(n) || same(n.id, rootId.value))))
const rooms = computed(() => nodes.value.filter(n => n.warehouseLevel === 2 && same(n.parentId, rootId.value) && (active(n) || same(n.id, roomId.value))))
function change(value) { emit('update:modelValue', value || undefined); emit('change', value || undefined) }
function setRoot(value) { change(value) }
function setRoom(value) { change(value || rootId.value) }
onMounted(async () => { nodes.value = (await historicalLocations()).data || [] })
</script>
<style scoped>
.location-select { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; }
.location-select > * { flex: 1; min-width: 180px; }
</style>
