<template>
  <el-dialog
    :model-value="modelValue"
    class="usage-conflict-dialog"
    :title="`无法${action}${target}`"
    width="980px"
    append-to-body
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="usage-conflict-notice">
      <el-icon><WarningFilled /></el-icon>
      <div>
        <strong>以下 {{ rows.length }} 条记录正在使用{{ target }}</strong>
        <p>请先删除下列排班计划或开播录入，再进行{{ action }}。</p>
      </div>
    </div>
    <el-table :data="rows" max-height="440" stripe border>
      <el-table-column label="记录" width="128">
        <template #default="scope">
          <el-tag :type="scope.row.recordType === '排班计划' ? 'warning' : 'primary'">{{ scope.row.recordType }}</el-tag>
          <small class="record-id">#{{ scope.row.recordId }}</small>
        </template>
      </el-table-column>
      <el-table-column prop="businessDate" label="日期" width="112" />
      <el-table-column prop="employeeName" label="主播" min-width="130" show-overflow-tooltip />
      <el-table-column prop="accountLabel" label="直播平台" min-width="190" show-overflow-tooltip />
      <el-table-column prop="rateTypeName" label="费率类型" min-width="120" show-overflow-tooltip />
      <el-table-column label="时段" width="125">
        <template #default="scope">{{ timeRange(scope.row) }}</template>
      </el-table-column>
    </el-table>
    <template #footer><el-button type="primary" @click="$emit('update:modelValue', false)">我知道了</el-button></template>
  </el-dialog>
</template>

<script setup>
import { WarningFilled } from '@element-plus/icons-vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  action: { type: String, default: '操作' },
  target: { type: String, default: '该数据' }
})
defineEmits(['update:modelValue'])

function timeRange(row) {
  return `${String(row.startTime || '').slice(0, 5)}–${String(row.endTime || '').slice(0, 5)}`
}
</script>

<style lang="scss">
.usage-conflict-dialog {
  width: min(980px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 18px 24px 8px; }
  .usage-conflict-notice { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; padding: 14px 16px; border: 1px solid #f5d7a1; border-radius: 8px; background: #fff8eb; }
  .usage-conflict-notice > .el-icon { flex: 0 0 auto; margin-top: 2px; color: #e6a23c; font-size: 22px; }
  .usage-conflict-notice strong { color: #303133; font-size: 15px; }
  .usage-conflict-notice p { margin: 5px 0 0; color: #737985; line-height: 1.6; }
  .record-id { display: inline-block; margin-left: 6px; color: #909399; }
}
</style>
