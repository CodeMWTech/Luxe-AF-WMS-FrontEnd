<template>
  <div
    v-show="!collapsed"
    class="item-category-panel"
    :class="{ 'is-compact': isCompact, 'is-resizing': isResizing }"
    :style="panelStyle"
  >
    <div class="item-category-panel__header">
      <span class="item-section-title">{{ tr('商品分类') }}</span>
      <div class="item-category-panel__actions">
        <el-button
          class="item-category-add-btn"
          plain
          type="primary"
          icon="Plus"
          v-hasPermi="['wms:item:edit']"
          @click="emit('add-category')"
        >
          <span class="item-category-add-btn__text">{{ tr('新增分类') }}</span>
        </el-button>
        <el-tooltip :content="tr('收起')" placement="top">
          <el-button class="item-category-toggle-btn" circle plain @click="emit('update:collapsed', true)">
            <el-icon><Fold /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    <el-tree
      :data="treeOptions"
      :props="{ value: 'id', label: 'label', children: 'children' }"
      value-key="id"
      class="item-category-tree mt10"
      :default-expand-all="true"
      :highlight-current="true"
      node-key="label"
      current-node-key="全部"
      draggable
      :allow-drop="allowDrop"
      :expand-on-click-node="false"
      @node-click="handleNodeClick"
      @node-drop="handleNodeDrop"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <span class="custom-tree-node__label">{{ tr(node.label) }}</span>
          <span class="custom-tree-node__actions">
            <el-tooltip v-if="data.label !== '全部' && node.level < 2" :content="tr('新增子分类')" placement="top">
              <el-button
                class="custom-tree-node__action"
                type="primary"
                link
                icon="Plus"
                v-hasPermi="['wms:item:edit']"
                @click.stop="emit('append', data)"
              />
            </el-tooltip>
            <el-tooltip v-if="data.label !== '全部'" :content="tr('删除')" placement="top">
              <el-button
                class="custom-tree-node__action"
                type="primary"
                link
                icon="Delete"
                v-hasPermi="['wms:item:edit']"
                @click.stop="emit('remove', node, data)"
              />
            </el-tooltip>
            <el-tooltip v-if="data.label !== '全部'" :content="tr('修改')" placement="top">
              <el-button
                class="custom-tree-node__action"
                type="primary"
                link
                icon="Edit"
                v-hasPermi="['wms:item:edit']"
                @click.stop="emit('edit', node, data)"
              />
            </el-tooltip>
          </span>
        </span>
      </template>
    </el-tree>
  </div>
  <div
    v-show="!collapsed"
    class="item-category-resize-handle"
    :class="{ 'is-resizing': isResizing }"
    :title="tr('拖动调整宽度')"
    @mousedown="startResize"
    @dblclick="resetWidth"
  />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Fold } from '@element-plus/icons-vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  treeOptions: {
    type: Array,
    default: () => []
  },
  tr: {
    type: Function,
    required: true
  },
  allowDrop: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'update:collapsed',
  'add-category',
  'append',
  'remove',
  'edit',
  'query-type',
  'node-drop',
  'layout-change'
])

const defaultWidth = 400
const minWidth = 220
const maxWidth = 640
const compactWidth = 300
const width = ref(defaultWidth)
const isResizing = ref(false)
const isCompact = computed(() => width.value < compactWidth)
const panelStyle = computed(() => ({
  flexBasis: `${width.value}px`,
  width: `${width.value}px`
}))

let resizeStartX = 0
let resizeStartWidth = defaultWidth

function clampWidth(value) {
  return Math.min(maxWidth, Math.max(minWidth, value))
}

function requestLayout() {
  nextTick(() => emit('layout-change'))
}

function resetWidth() {
  width.value = defaultWidth
  requestLayout()
}

function handleNodeClick(data, node) {
  emit('query-type', data, node)
}

function handleNodeDrop(draggingNode, dropNode, dropType, event) {
  emit('node-drop', draggingNode, dropNode, dropType, event)
}

function handleResizeMove(event) {
  if (!isResizing.value) return
  width.value = clampWidth(resizeStartWidth + event.clientX - resizeStartX)
  emit('layout-change')
}

function stopResize() {
  if (!isResizing.value) return
  isResizing.value = false
  document.body.style.removeProperty('cursor')
  document.body.style.removeProperty('user-select')
  window.removeEventListener('mousemove', handleResizeMove)
  window.removeEventListener('mouseup', stopResize)
  requestLayout()
}

function startResize(event) {
  if (props.collapsed) return
  event.preventDefault()
  resizeStartX = event.clientX
  resizeStartWidth = width.value
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', handleResizeMove)
  window.addEventListener('mouseup', stopResize)
}

onBeforeUnmount(() => {
  stopResize()
})
</script>

<style scoped>
.item-category-panel {
  flex: 0 0 400px;
  width: 400px;
  min-width: 0;
  transition: flex-basis 0.2s ease, width 0.2s ease;
}

.item-category-panel.is-resizing {
  transition: none;
}

.item-category-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.item-section-title {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 18px;
  line-height: 18px;
  white-space: nowrap;
}

.item-category-panel__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-category-add-btn {
  font-size: 12px;
  line-height: 14px;
}

.item-category-panel.is-compact .item-category-add-btn {
  width: 36px;
  padding: 0;
}

.item-category-panel.is-compact .item-category-add-btn__text {
  display: none;
}

.item-category-panel.is-compact .item-category-add-btn :deep(.el-icon),
.item-category-panel.is-compact .item-category-add-btn .el-icon {
  margin: 0;
}

.item-category-toggle-btn {
  width: 30px;
  height: 30px;
  color: #606266;
  border-color: #dcdfe6;
}

.item-category-toggle-btn:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.item-category-tree {
  width: 100%;
}

.item-category-resize-handle {
  flex: 0 0 14px;
  align-self: stretch;
  min-height: 120px;
  position: relative;
  cursor: col-resize;
}

.item-category-resize-handle::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 50%;
  width: 1px;
  background: #dcdfe6;
  transform: translateX(-50%);
  transition: width 0.16s ease, background-color 0.16s ease;
}

.item-category-resize-handle:hover::before,
.item-category-resize-handle.is-resizing::before {
  width: 3px;
  background: var(--el-color-primary);
  border-radius: 2px;
}

.custom-tree-node {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  padding-right: 6px;
}

.custom-tree-node__label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-tree-node__actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.16s ease;
}

:deep(.el-tree-node__content:hover) .custom-tree-node__actions,
:deep(.el-tree-node.is-current > .el-tree-node__content) .custom-tree-node__actions {
  opacity: 1;
}

.custom-tree-node__action {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 14px;
}

.custom-tree-node__action + .custom-tree-node__action {
  margin-left: 0;
}

:deep(.el-tree-node__content) {
  display: flex;
  align-items: center;
  height: 38px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .item-category-resize-handle {
    flex-basis: 12px;
  }
}
</style>
