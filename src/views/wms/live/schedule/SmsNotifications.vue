<template>
  <div class="sms-notifications">
    <div class="sms-toolbar">
      <el-button v-hasPermi="['wms:live:sms:publish']" type="primary" plain :loading="loading" @click="openPublisher">{{ tr('发布排班通知') }}<span class="sms-count">{{ summary.pendingCount || 0 }}</span></el-button>
      <el-button v-hasPermi="['wms:live:sms:list']" @click="recordsOpen = true">{{ tr('发送记录') }}</el-button>
      <el-button v-hasPermi="['wms:live:sms:recipient']" @click="openRecipient(scope.employeeId)">{{ tr('主播短信设置') }}</el-button>
      <span v-if="loaded && !summary.enabled" class="sms-disabled">{{ tr('短信发送已关闭') }}</span>
      <span v-if="summary.failedCount" class="sms-error">{{ tr('失败 {0}', [summary.failedCount]) }}</span>
      <span v-if="summary.unknownCount" class="sms-warning">{{ tr('待核实 {0}', [summary.unknownCount]) }}</span>
      <span v-if="summary.backlogCount" class="sms-warning">{{ tr('待处理任务 {0}', [summary.backlogCount]) }}</span>
    </div>
    <el-alert v-if="loadError" :title="loadError" type="warning" :closable="false" show-icon><el-button link type="primary" @click="refresh">{{ tr('重新加载短信状态') }}</el-button></el-alert>
    <el-dialog data-runtime-i18n-ignore="true" v-model="publisherOpen" :title="tr('发布排班通知')" width="min(1120px, calc(100vw - 32px))" append-to-body :close-on-click-modal="!publishing" :close-on-press-escape="!publishing" :show-close="!publishing">
      <el-alert v-if="!summary.enabled" :title="tr('短信总开关已关闭。可以预览内容，启用发送后才能发布。')" type="warning" :closable="false" show-icon />
      <el-alert :title="tr(publishUncertain ? '正在核实先前发布请求。请先重试原请求，收到明确结果后再选择其他事项。' : '仅发布当前周和筛选范围内选中的事项，按主播汇总发送。保存排班不会自动发短信。')" type="info" :closable="false" />
      <div class="sms-preview-options">
        <el-checkbox :model-value="allEligibleSelected" :indeterminate="selectedEventIds.length > 0 && !allEligibleSelected" :disabled="publishing || previewing || publishUncertain" @change="selectAll">{{ tr('选择全部可发送事项') }}</el-checkbox>
        <label>{{ tr('开播前提醒') }} <el-select v-model="reminderMinutes" :disabled="publishing || previewing || publishUncertain" @change="invalidatePreview"><el-option v-for="minutes in [30, 60, 120]" :key="minutes" :value="minutes" :label="tr('提前 {0} 分钟', [minutes])" /></el-select></label>
        <el-button :disabled="publishing || previewing || publishUncertain" :loading="loading" @click="refreshForPublisher">{{ tr('刷新待通知事项') }}</el-button>
      </div>
      <el-table :data="publisherItems" row-key="eventId" max-height="300" v-loading="loading" :empty-text="tr('当前范围内没有待发布事项')">
        <el-table-column width="48"><template #default="{ row }"><el-checkbox :model-value="selectedEventIds.includes(String(row.eventId))" :disabled="!row.eligible || publishing || previewing || publishUncertain" :aria-label="tr('选择 {0} 的排班通知', [row.employeeName])" @change="toggleEvent(row, $event)"><span></span></el-checkbox></template></el-table-column>
        <el-table-column :label="tr('主播')" min-width="130"><template #default="{ row }"><strong>{{ row.employeeName }}</strong><div>{{ row.maskedPhone || '—' }}</div><el-button v-if="!row.eligible" v-hasPermi="['wms:live:sms:recipient']" link type="primary" :disabled="publishing" @click="openRecipient(row.employeeId)">{{ tr('短信设置') }}</el-button></template></el-table-column>
        <el-table-column :label="tr('变更事项')" width="120"><template #default="{ row }"><el-tag :type="row.action === 'CANCEL' ? 'danger' : row.action === 'UPDATE' ? 'warning' : ''">{{ tr(eventActionLabels[row.action] || row.action) }}</el-tag></template></el-table-column>
        <el-table-column :label="tr('直播时段（太平洋时间）')" min-width="210"><template #default="{ row }">{{ row.scheduleDate }}<br />{{ row.startTime?.slice(0, 5) }}–{{ row.endTime?.slice(0, 5) }}</template></el-table-column>
        <el-table-column :label="tr('直播平台')" min-width="150"><template #default="{ row }">{{ row.platform }}<br />{{ row.accountLabel }}</template></el-table-column>
        <el-table-column :label="tr('发送资格')" min-width="180"><template #default="{ row }"><span :class="{ 'sms-error': !row.eligible }">{{ row.eligible ? tr('可以发送') : tr(row.reason || '无法发送，请检查接收设置') }}</span></template></el-table-column>
      </el-table>
      <div v-if="preview" class="sms-preview-result">
        <div class="sms-preview-heading"><strong>{{ tr('英语短信预览') }}</strong><span>{{ tr('预览有效至 {0}', [formatTime(preview.expiresAt)]) }}</span></div>
        <el-alert v-if="expired && !publishUncertain" :title="tr('预览已过期，请重新生成预览。')" type="warning" :closable="false" />
        <el-alert v-for="blocked in preview.blocked || []" :key="blocked.eventId" :title="tr(blocked.reason || '无法发送，请检查接收设置')" type="error" :closable="false" />
        <el-card v-for="(message, index) in preview.messages || []" :key="index" shadow="never" class="sms-message">
          <div class="sms-message-heading"><strong>{{ message.employeeName }} · {{ message.maskedPhone }}</strong><el-tag type="info">{{ tr('预计 {0} 个短信分段', [message.segments]) }}</el-tag></div>
          <pre lang="en">{{ message.body }}</pre>
          <div v-for="reminder in message.reminders || []" :key="reminder.scheduleId" class="sms-reminder"><span>{{ tr('开播时间：{0}', [formatTime(reminder.startAt)]) }}</span><span>{{ reminder.skippedReason ? tr(reminder.skippedReason) : tr('提醒时间：{0}', [formatTime(reminder.sendAt)]) }}</span></div>
        </el-card>
        <p class="sms-note">{{ tr('较长短信会分段计费。发布时已进入提醒窗口的场次，只发发布通知，不追加即时提醒。') }}</p>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <el-alert v-if="publishUncertain" :title="tr('重试原发布请求会复用原预览和请求编号。即使预览过期，也可核对已创建的批次；未创建且已过期时，系统会明确提示重新预览。')" type="warning" :closable="false" />
      <template #footer><span class="sms-selection-count">{{ tr('已选 {0} 项', [selectedEventIds.length]) }}</span><el-button :disabled="publishing" @click="publisherOpen = false">{{ tr('关闭') }}</el-button><el-button :loading="previewing" :disabled="publishing || publishUncertain || loading || !!loadError || !selectedEventIds.length" @click="generatePreview">{{ tr('生成预览') }}</el-button><el-button type="primary" :loading="publishing" :disabled="!publishAllowed || previewing" @click="publish">{{ tr(publishUncertain ? '重试原发布请求' : '发布通知') }}</el-button></template>
    </el-dialog>
    <SmsRecipientDialog v-model:open="recipientOpen" :employee-id="recipientEmployeeId" :employees="employees" @saved="recipientSaved" />
    <SmsRecordsDialog v-model:open="recordsOpen" :scope="scope" @changed="refresh" />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { checkPermi } from '@/utils/permission'
import { useLiveI18n } from '../useLiveI18n'
import { getPendingNotifications, previewNotifications, publishNotifications } from '@/api/wms/liveScheduleSms'
import { defaultEventSelection, eventActionLabels, formatPacificInstant, canPublishPreview, newPublishKey } from './smsDisplay'
import SmsRecipientDialog from './SmsRecipientDialog.vue'
import SmsRecordsDialog from './SmsRecordsDialog.vue'
const props = defineProps({ scope: { type: Object, required: true }, employees: { type: Array, default: () => [] }, refreshKey: Number })
const emit = defineEmits(['states'])
const { tr, isEn } = useLiveI18n()
const { proxy } = getCurrentInstance()
const summary = reactive({ enabled: false, pendingCount: 0, failedCount: 0, unknownCount: 0, backlogCount: 0, items: [], scheduleStates: {} })
const loading = ref(false), loaded = ref(false), loadError = ref(''), publisherOpen = ref(false), recordsOpen = ref(false), recipientOpen = ref(false), recipientEmployeeId = ref(null)
const selectedEventIds = ref([]), reminderMinutes = ref(120), preview = ref(null), previewing = ref(false), publishing = ref(false), error = ref(''), publishUncertain = ref(false), pendingPublishRequest = ref(null), now = ref(Date.now())
let sequence = 0, previewSequence = 0, publishKey = '', expiryTimer
const formatTime = value => formatPacificInstant(value, isEn.value)
const allEligibleSelected = computed(() => {
  const eligible = defaultEventSelection(summary.items)
  return eligible.length > 0 && eligible.every(id => selectedEventIds.value.includes(id))
})
const expired = computed(() => preview.value && new Date(preview.value.expiresAt).getTime() <= now.value)
const publisherItems = computed(() => (publishing.value || publishUncertain.value) && preview.value?.items ? preview.value.items : summary.items || [])
const publishAllowed = computed(() => Boolean(checkPermi(['wms:live:sms:publish']) && (publishUncertain.value && pendingPublishRequest.value || canPublishPreview(preview.value, now.value))))
watch(() => [props.scope, props.refreshKey], () => { invalidatePreview(); refresh() }, { deep: true, immediate: true })
watch(publisherOpen, open => {
  clearInterval(expiryTimer)
  if (open) { now.value = Date.now(); expiryTimer = setInterval(() => { now.value = Date.now() }, 1000) }
})
onBeforeUnmount(() => { sequence++; previewSequence++; clearInterval(expiryTimer) })
function invalidatePreview() {
  if (publishing.value || publishUncertain.value) return
  previewSequence++; preview.value = null; publishKey = ''; error.value = ''; publishUncertain.value = false
}
async function refresh() {
  const current = ++sequence; loading.value = true; loadError.value = ''
  try {
    const response = await getPendingNotifications(props.scope)
    if (current !== sequence) return
    Object.assign(summary, response.data)
    loaded.value = true; emit('states', summary.scheduleStates || {})
  } catch (e) {
    if (current !== sequence) return
    loaded.value = false; loadError.value = tr(e?.message || '短信状态加载失败，请重试'); emit('states', {})
  } finally { if (current === sequence) loading.value = false }
}
async function refreshForPublisher() {
  if (publishing.value || publishUncertain.value) return
  invalidatePreview(); await refresh(); selectedEventIds.value = loadError.value ? [] : defaultEventSelection(summary.items)
}
async function openPublisher() {
  if (!checkPermi(['wms:live:sms:publish'])) return
  publisherOpen.value = true
  // Keep the exact preview/key after an uncertain publish so a retry cannot create another batch.
  if (!publishUncertain.value) await refreshForPublisher()
}
function selectAll(checked) { if (publishing.value || publishUncertain.value) return; selectedEventIds.value = checked ? defaultEventSelection(summary.items) : []; invalidatePreview() }
function toggleEvent(row, checked) {
  if (!row.eligible || publishing.value || previewing.value || publishUncertain.value) return
  const id = String(row.eventId)
  selectedEventIds.value = checked ? [...new Set([...selectedEventIds.value, id])] : selectedEventIds.value.filter(value => value !== id)
  invalidatePreview()
}
async function generatePreview() {
  if (previewing.value || publishing.value || publishUncertain.value || !selectedEventIds.value.length) return
  invalidatePreview(); const current = previewSequence; previewing.value = true
  try {
    const response = await previewNotifications({ ...props.scope, eventIds: [...selectedEventIds.value], reminderMinutes: reminderMinutes.value })
    if (current !== previewSequence) return
    preview.value = response.data; publishKey = newPublishKey(); now.value = Date.now()
  } catch (e) { if (current === previewSequence) error.value = tr(e?.message || '预览失败，请刷新待通知事项后重试') }
  finally { previewing.value = false }
}
async function publish() {
  if (publishing.value || !publishAllowed.value) return
  if (!pendingPublishRequest.value) pendingPublishRequest.value = { previewId: preview.value.previewId, idempotencyKey: publishKey }
  publishing.value = true; error.value = ''
  try {
    await publishNotifications({ ...pendingPublishRequest.value })
    proxy.$modal.msgSuccess(tr('通知已加入发送队列，请在发送记录中查看结果'))
    publishUncertain.value = false; pendingPublishRequest.value = null; publisherOpen.value = false; publishing.value = false; invalidatePreview(); await refresh()
  } catch (e) {
    error.value = tr(e?.message || '发布失败，请重试或核对发送记录')
    publishUncertain.value = e?.publishRejected !== true
    if (!publishUncertain.value) pendingPublishRequest.value = null
    await refresh()
  }
  finally { publishing.value = false }
}
function openRecipient(employeeId) {
  if (!checkPermi(['wms:live:sms:recipient'])) return
  recipientEmployeeId.value = employeeId || null; recipientOpen.value = true
}
async function recipientSaved() {
  invalidatePreview(); await refresh()
  if (publisherOpen.value && !publishUncertain.value) selectedEventIds.value = defaultEventSelection(summary.items)
}
</script>

<style scoped>
.sms-notifications { max-width: 100%; }
.sms-toolbar, .sms-preview-options, .sms-message-heading, .sms-preview-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.sms-toolbar .el-button + .el-button { margin-left: 0; }
.sms-count { margin-left: 8px; font-weight: 700; }
.sms-disabled, .sms-note, .sms-preview-heading > span { color: var(--el-text-color-secondary); font-size: 12px; }
.sms-error { color: var(--el-color-danger); }
.sms-warning { color: var(--el-color-warning); }
.sms-preview-options { margin: 18px 0; justify-content: space-between; }
.sms-preview-options label { display: flex; gap: 8px; align-items: center; }
.sms-preview-options .el-select { width: 165px; }
.sms-preview-result { margin-top: 22px; }
.sms-preview-heading, .sms-message-heading { justify-content: space-between; }
.sms-message { margin-top: 12px; }
.sms-message pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.65; padding: 14px; border-radius: 6px; background: var(--el-fill-color-light); }
.sms-reminder { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; color: var(--el-text-color-secondary); line-height: 1.6; font-size: 12px; }
.sms-selection-count { margin-right: 16px; color: var(--el-text-color-secondary); }
.el-alert { margin: 12px 0; }
</style>
