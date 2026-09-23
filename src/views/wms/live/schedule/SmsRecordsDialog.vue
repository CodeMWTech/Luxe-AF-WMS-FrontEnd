<template>
  <el-dialog data-runtime-i18n-ignore="true" :model-value="open" :title="tr('短信发送记录')" width="min(1180px, calc(100vw - 32px))" append-to-body @update:model-value="$emit('update:open', $event)">
    <el-alert :title="tr('已送达仅表示收到送达回执，不表示主播已阅读或确认接班。所有时间均为太平洋时间。')" type="info" :closable="false" show-icon />
    <div class="sms-record-filters">
      <el-checkbox v-model="allRecords" @change="pageNum = 1; load()">{{ tr('全部记录（所有主播和日期）') }}</el-checkbox>
      <el-select v-model="status" clearable :placeholder="tr('全部发送状态')" @change="pageNum = 1; load()"><el-option v-for="(label, value) in messageStatusLabels" :key="value" :label="tr(label)" :value="value" /></el-select>
      <el-input v-model="scheduleId" clearable :placeholder="tr('排班编号（可选）')" @keyup.enter="pageNum = 1; load()" />
      <el-button :loading="loading" @click="pageNum = 1; load()">{{ tr('刷新记录') }}</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-table :data="rows" v-loading="loading" row-key="id" max-height="480" :empty-text="tr('暂无短信发送记录')">
      <el-table-column type="expand"><template #default="{ row }"><div class="sms-record-detail"><pre lang="en">{{ row.body }}</pre><p>{{ tr('短信编号') }}: {{ row.messageSid || '—' }}</p><p>{{ tr('批次编号') }}: {{ row.batchId || '—' }}</p><p>{{ tr('尝试次数') }}: {{ row.attempts || 0 }} · {{ tr('预计分段') }}: {{ row.segments || 0 }}</p><p v-if="row.errorCode || row.errorMessage" class="sms-error">{{ row.errorCode }} {{ tr(row.errorMessage || '') }}</p></div></template></el-table-column>
      <el-table-column :label="tr('主播')" min-width="140"><template #default="{ row }"><strong>{{ row.employeeName }}</strong><div>{{ row.maskedPhone }}</div></template></el-table-column>
      <el-table-column :label="tr('通知类型')" width="125"><template #default="{ row }">{{ tr(row.kind === 'REMINDER' ? '开播提醒' : '排班发布') }}</template></el-table-column>
      <el-table-column :label="tr('发送状态')" min-width="135"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ tr(messageStatusLabels[row.status] || row.status) }}</el-tag></template></el-table-column>
      <el-table-column :label="tr('计划发送时间')" min-width="190"><template #default="{ row }">{{ formatTime(row.dueAt) }}</template></el-table-column>
      <el-table-column :label="tr('提交时间')" min-width="190"><template #default="{ row }">{{ formatTime(row.submittedAt) }}</template></el-table-column>
      <el-table-column :label="tr('操作')" width="120" fixed="right"><template #default="{ row }"><el-button v-if="row.status === 'FAILED'" v-hasPermi="['wms:live:sms:retry']" link type="primary" :disabled="!!busyId" @click="retry(row)">{{ tr('补发') }}</el-button><el-button v-if="row.status === 'UNKNOWN'" v-hasPermi="['wms:live:sms:resolve']" link type="warning" :disabled="!!busyId" @click="openResolution(row)">{{ tr('核实结果') }}</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="pageNum" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="load" />
    <template #footer><el-button @click="$emit('update:open', false)">{{ tr('关闭') }}</el-button></template>
  </el-dialog>
  <el-dialog data-runtime-i18n-ignore="true" v-model="resolution.open" :title="tr('核实短信发送结果')" width="min(620px, calc(100vw - 32px))" append-to-body :close-on-click-modal="!busyId" :close-on-press-escape="!busyId" :show-close="!busyId">
    <el-alert :title="tr('请求超时可能已经发送。请先核对 Twilio 日志，再关联短信编号或确认未发送；不能直接重复发送。')" type="warning" :closable="false" show-icon />
    <el-form label-position="top" :disabled="!!busyId">
      <el-form-item :label="tr('核实方式')"><el-radio-group v-model="resolution.action"><el-radio label="ASSOCIATE_SID">{{ tr('关联 Twilio 短信编号') }}</el-radio><el-radio label="CONFIRM_NOT_SENT">{{ tr('已核实未发送') }}</el-radio></el-radio-group></el-form-item>
      <el-form-item v-if="resolution.action === 'ASSOCIATE_SID'" :label="tr('Twilio Message SID')"><el-input v-model="resolution.messageSid" placeholder="SM…" maxlength="34" /></el-form-item>
      <el-form-item :label="tr('核实依据（必填）')"><el-input v-model="resolution.note" type="textarea" :rows="3" maxlength="800" show-word-limit :placeholder="tr('记录查询的时间、号码及 Twilio 日志核实结果')" /></el-form-item>
    </el-form>
    <el-alert v-if="resolution.error" :title="resolution.error" type="error" :closable="false" />
    <template #footer><el-button :disabled="!!busyId" @click="resolution.open = false">{{ tr('取消') }}</el-button><el-button type="primary" :loading="!!busyId" :disabled="!validResolution(resolution)" @click="resolve">{{ tr('保存核实结果') }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import { getCurrentInstance, reactive, ref, watch } from 'vue'
import { checkPermi } from '@/utils/permission'
import { useLiveI18n } from '../useLiveI18n'
import { listNotifications, retryNotification, resolveNotification } from '@/api/wms/liveScheduleSms'
import { messageStatusLabels, statusType, formatPacificInstant, validResolution } from './smsDisplay'
const props = defineProps({ open: Boolean, scope: { type: Object, default: () => ({}) } })
const emit = defineEmits(['update:open', 'changed'])
const { tr, isEn, messageNode } = useLiveI18n()
const { proxy } = getCurrentInstance()
const rows = ref([]), total = ref(0), loading = ref(false), error = ref(''), status = ref(''), scheduleId = ref(''), busyId = ref(null), pageNum = ref(1), allRecords = ref(false)
const pageSize = 20, formatTime = value => formatPacificInstant(value, isEn.value)
const resolution = reactive({ open: false, id: null, action: 'ASSOCIATE_SID', messageSid: '', note: '', error: '' })
let sequence = 0
watch(() => props.open, open => { if (open) { pageNum.value = 1; status.value = ''; scheduleId.value = ''; allRecords.value = false; load() } else sequence++ })
async function load() {
  const current = ++sequence; loading.value = true; error.value = ''
  try {
    const response = await listNotifications({ startDate: allRecords.value ? undefined : props.scope.startDate, endDate: allRecords.value ? undefined : props.scope.endDate, employeeId: allRecords.value ? undefined : props.scope.employeeId, pageNum: pageNum.value, pageSize, status: status.value || undefined, scheduleId: scheduleId.value.trim() || undefined })
    if (current !== sequence) return
    rows.value = response.rows || []; total.value = response.total || 0
  } catch (e) { if (current === sequence) { rows.value = []; total.value = 0; error.value = tr(e?.message || '发送记录加载失败，请重试') } }
  finally { if (current === sequence) loading.value = false }
}
async function retry(row) {
  if (busyId.value || row.status !== 'FAILED' || !checkPermi(['wms:live:sms:retry'])) return
  try { await proxy.$modal.confirm(messageNode(tr('确认重新发送给 {0} 的失败短信？系统会再次检查排班及接收资格。', [row.employeeName]))) } catch { return }
  busyId.value = row.id; error.value = ''
  try { await retryNotification(row.id); emit('changed'); await load() }
  catch (e) { error.value = tr(e?.message || '补发失败，请刷新记录后重试') }
  finally { busyId.value = null }
}
function openResolution(row) {
  if (row.status !== 'UNKNOWN' || !checkPermi(['wms:live:sms:resolve'])) return
  Object.assign(resolution, { open: true, id: row.id, action: 'ASSOCIATE_SID', messageSid: '', note: '', error: '' })
}
async function resolve() {
  if (busyId.value || !validResolution(resolution) || !checkPermi(['wms:live:sms:resolve'])) return
  busyId.value = resolution.id; resolution.error = ''
  try {
    await resolveNotification(resolution.id, { action: resolution.action, messageSid: resolution.action === 'ASSOCIATE_SID' ? resolution.messageSid.trim() : undefined, note: resolution.note.trim() })
    resolution.open = false; emit('changed'); await load()
  } catch (e) { resolution.error = tr(e?.message || '核实结果保存失败，请重试') }
  finally { busyId.value = null }
}
</script>

<style scoped>
.sms-record-filters { display: flex; flex-wrap: wrap; gap: 12px; margin: 18px 0; }
.sms-record-filters .el-input { width: 210px; }
.sms-record-detail { padding: 12px 24px; }
.sms-record-detail pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.6; }
.sms-error { color: var(--el-color-danger); }
.el-pagination { margin-top: 18px; }
.el-alert { margin-bottom: 16px; }
.el-radio-group { display: flex; flex-wrap: wrap; }
</style>
