<template>
  <el-dialog data-runtime-i18n-ignore="true"
    :model-value="modelValue"
    class="usage-conflict-dialog"
    :title="tr('无法{0}{1}', [tr(action).toLowerCase(), tr(target)])"
    width="980px"
    append-to-body
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="usage-conflict-notice">
      <el-icon><WarningFilled /></el-icon>
      <div>
        <strong>{{ tr('{0} 条记录正在使用{1}', [rows.length, tr(target)]) }}</strong>
        <p>{{ tr('请先删除下列排班计划或开播录入，再进行{0}。', [tr(action).toLowerCase()]) }}</p>
      </div>
    </div>
    <el-table :data="rows" max-height="440" stripe border>
      <el-table-column :label="tr('记录')" :min-width="isEn ? 153 : 128">
        <template #default="scope">
          <el-tag :type="scope.row.recordType === '排班计划' ? 'warning' : 'primary'">{{ tr(scope.row.recordType) }}</el-tag>
          <small class="record-id">#{{ scope.row.recordId }}</small>
        </template>
      </el-table-column>
      <el-table-column prop="businessDate" :label="tr('日期')" :min-width="isEn ? 145 : 120"><template #default="scope">{{ displayDate(scope.row.businessDate) }}</template></el-table-column>
      <el-table-column prop="employeeName" :label="tr('主播')" min-width="130" show-overflow-tooltip />
      <el-table-column prop="accountLabel" :label="tr('直播平台')" min-width="190" show-overflow-tooltip><template #default="s"><LivePlatformTag :account="s.row" :accounts="accounts" /></template></el-table-column>
      <el-table-column prop="rateTypeName" :label="tr('费率类型')" min-width="120" show-overflow-tooltip />
      <el-table-column :label="tr('时段')" :min-width="isEn ? 150 : 125">
        <template #default="scope">{{ timeRange(scope.row) }}</template>
      </el-table-column>
    </el-table>
    <template #footer><el-button type="primary" @click="$emit('update:modelValue', false)">{{ tr('我知道了') }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import LivePlatformTag from './LivePlatformTag.vue'
import { useLiveI18n } from '../useLiveI18n'
import { WarningFilled } from '@element-plus/icons-vue'
import { displayDate } from '../shared'
const { tr, isEn } = useLiveI18n()
defineProps({
  accounts: { type: Array, default: () => [] },
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
