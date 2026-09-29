<template>
  <el-dialog data-runtime-i18n-ignore="true" v-model="open" class="sms-dialog" :title="tr('发送排班短信')" width="min(1100px, 95vw)" append-to-body :close-on-click-modal="false" :close-on-press-escape="!sending" :show-close="!sending">
    <div class="sms-period">{{ displayDate(week) }} - {{ displayDate(preview.weekEnd) }} · America/Los_Angeles</div>
    <el-alert :title="tr('仅发送已确认排班，包含所选主播全部直播间；待确认、已取消和无排班日期不进入短信。')" type="info" :closable="false" show-icon />
    <el-alert v-if="preview.unavailableReason" :title="issueText(preview.unavailableReason, tr)" type="warning" :closable="false" show-icon />
    <el-alert v-else-if="!preview.production" :title="tr('测试转发模式：所有主播短信均发往指定测试号码，不发送给主播本人。')" type="warning" :closable="false" />
    <div class="sms-grid" v-loading="loading">
      <el-table ref="table" :data="preview.rows || []" row-key="employeeId" highlight-current-row max-height="440" @selection-change="selection = $event" @current-change="current = $event">
        <el-table-column type="selection" width="45" :selectable="selectable" />
        <el-table-column prop="employeeName" :label="tr('主播')" min-width="100" show-overflow-tooltip />
        <el-table-column prop="maskedPhone" :label="tr('实际接收号码')" width="95" />
        <el-table-column prop="shifts" :label="tr('场次数')" width="75" />
        <el-table-column prop="hours" :label="tr('计划时长')" width="85" />
        <el-table-column prop="segments" :label="tr('预计段数')" width="80" />
        <el-table-column :label="tr('检查结果')" min-width="150"><template #default="{ row }">
          <span :class="{ 'sms-issue': row.issue }">{{ issueText(row.issue, tr) }}</span>
          <small v-if="row.pendingCount" class="pending-note">{{ tr('另有 {0} 场待确认，未计入', [row.pendingCount]) }}</small>
        </template></el-table-column>
      </el-table>
      <section class="sms-preview">
        <strong>{{ tr('短信正文预览') }}</strong>
        <div v-if="current" class="sms-encoding">{{ current.employeeName }} · {{ current.encoding }} · {{ tr('预计 {0} 段', [current.segments]) }}</div>
        <pre v-if="current?.body">{{ current.body }}</pre>
        <el-empty v-else :description="tr('请选择有排班的主播查看正文')" :image-size="70" />
      </section>
    </div>
    <template #footer>
      <div class="sms-footer">
        <span>{{ tr('已选 {0} 人，预计共 {1} 个短信计费段', [selection.length, selectedSegments]) }}</span>
        <div><el-button :disabled="sending || loading" @click="load">{{ tr('重新预览') }}</el-button><el-button :disabled="sending" @click="open = false">{{ tr('取消') }}</el-button><el-button type="primary" :loading="sending" :disabled="!preview.ready || !selection.length || loading" @click="send">{{ tr('确认发送') }}</el-button></div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { previewScheduleSms, sendScheduleSms } from '@/api/wms/livePayroll'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate } from '../shared'
import { issueText, newRequestId } from './smsDisplay'
const emit = defineEmits(['sent'])
const { tr, messageNode } = useLiveI18n()
const { proxy } = getCurrentInstance()
const open = ref(false), loading = ref(false), sending = ref(false), table = ref()
const week = ref(''), employeeIds = ref(null), preview = ref({ rows: [], ready: false })
const current = ref(null), selection = ref([])
const selectedSegments = computed(() => selection.value.reduce((sum, row) => sum + row.segments, 0))
let sequence = 0, pendingRequest = null
const selectable = row => preview.value.ready && !row.issue && !sending.value
async function show(weekStart, employeeId) {
  week.value = weekStart; employeeIds.value = employeeId ? [employeeId] : null
  open.value = true
  await load()
}
async function load() {
  const requestSequence = ++sequence
  loading.value = true; current.value = null; selection.value = []; pendingRequest = null
  preview.value = { rows: [], ready: false }
  try {
    const response = await previewScheduleSms({ weekStart: week.value, employeeIds: employeeIds.value })
    if (requestSequence !== sequence) return
    preview.value = response.data
    current.value = preview.value.rows.find(row => row.body) || preview.value.rows[0] || null
  } finally { if (requestSequence === sequence) loading.value = false }
}
async function send() {
  if (sending.value || !preview.value.ready || !selection.value.length) return
  try {
    const confirmation = preview.value.production
      ? tr('将向 {0} 位主播发送排班短信，预计 {1} 个计费段。确认发送？', [selection.value.length, selectedSegments.value])
      : tr('将把 {0} 位主播的排班短信分别转发到测试号码 {1}，预计 {2} 个计费段，不发送给主播本人。确认发送？', [selection.value.length, selection.value[0].maskedPhone, selectedSegments.value])
    await proxy.$modal.confirm(messageNode(confirmation))
  } catch { return }
  sending.value = true
  const selections = selection.value.map(row => ({ employeeId: row.employeeId, fingerprint: row.fingerprint })).sort((a, b) => String(a.employeeId).localeCompare(String(b.employeeId)))
  const payload = { weekStart: week.value, selections }
  // Preserve requestId on uncertain HTTP outcomes; the server returns the original committed batch on retry.
  if (!pendingRequest || JSON.stringify(pendingRequest.payload) !== JSON.stringify(payload)) pendingRequest = { payload, requestId: newRequestId() }
  try {
    const response = await sendScheduleSms({ ...pendingRequest.payload, requestId: pendingRequest.requestId })
    proxy.$modal.msgSuccess(tr('已创建 {0} 条短信发送任务，请在短信记录中查看送达结果。', [response.data.count]))
    open.value = false
    emit('sent', week.value)
  } catch { /* request interceptor shows errors; retain the idempotency key for retry */ }
  finally { sending.value = false }
}
defineExpose({ show })
</script>

<style scoped>
.sms-dialog { max-width: 95vw; }
.sms-period { margin-bottom: 12px; font-weight: 600; }
.el-alert + .el-alert { margin-top: 8px; }
.sms-grid { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr); gap: 18px; margin-top: 18px; }
.sms-preview { border: 1px solid var(--el-border-color); border-radius: 8px; padding: 16px; min-width: 0; }
.sms-preview pre { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.65; max-height: 360px; overflow: auto; margin-bottom: 0; }
.sms-encoding, .pending-note { color: var(--el-text-color-secondary); font-size: 12px; margin-top: 6px; }
.pending-note { display: block; }
.sms-issue { color: var(--el-color-warning-dark-2); }
.sms-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
@media (max-width: 850px) { .sms-grid { grid-template-columns: 1fr; } }
</style>
