<template>
  <el-dialog data-runtime-i18n-ignore="true" v-model="open" class="sms-record-dialog" :title="tr('排班短信记录')" width="min(1220px, 95vw)" append-to-body @closed="stopPolling">
    <div class="record-toolbar"><strong>{{ displayDate(week) }} · {{ tr('发送记录') }}</strong><el-button :loading="loading" @click="load">{{ tr('刷新记录') }}</el-button></div>
    <el-alert :title="tr('已提交、已发出不代表已送达；结果未知时请先核实，不要重复发送。')" type="info" :closable="false" />
    <el-table :data="rows" v-loading="loading" max-height="350">
      <el-table-column prop="employeeName" :label="tr('主播')" min-width="105" show-overflow-tooltip />
      <el-table-column :label="tr('实际接收号码')" width="115"><template #default="{ row }">{{ row.maskedPhone }}<div v-if="row.testRedirect"><el-tag size="small" type="warning">{{ tr('测试转发') }}</el-tag></div></template></el-table-column>
      <el-table-column :label="tr('发送状态')" min-width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status, tr) }}</el-tag></template></el-table-column>
      <el-table-column :label="tr('预计 / 实际段数')" width="135"><template #default="{ row }">{{ row.segments }} / {{ row.actualSegments || '-' }}</template></el-table-column>
      <el-table-column :label="tr('结果说明')" min-width="165"><template #default="{ row }">{{ row.errorCode ? issueText(row.errorCode, tr) : '-' }}</template></el-table-column>
      <el-table-column prop="createBy" :label="tr('操作人')" width="95" />
      <el-table-column :label="tr('提交时间')" width="190"><template #default="{ row }">{{ displayTimestamp(row.createTime) }}</template></el-table-column>
      <el-table-column :label="tr('操作')" width="240" align="center" fixed="right"><template #default="{ row }"><div class="record-actions"><el-button link type="primary" size="small" icon="View" @click.stop="showBody(row)">{{ tr('查看正文') }}</el-button><el-button v-if="canSend && row.messageSid" link type="primary" size="small" icon="Refresh" :disabled="refreshing === row.id" @click.stop="refreshStatus(row)">{{ tr('同步状态') }}</el-button></div></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="pageNum" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @current-change="load" />
    <template #footer><el-button @click="open = false">{{ tr('关闭') }}</el-button></template>
  </el-dialog>
  <el-dialog data-runtime-i18n-ignore="true" v-model="bodyOpen" :title="tr('查看正文')" width="min(720px, 95vw)" append-to-body>
    <section v-if="current" class="record-detail">
      <div><strong>{{ current.employeeName }} · {{ tr('实际发送正文快照') }}</strong><small>Twilio SID: {{ current.messageSid || '-' }}</small><small>{{ tr('发送批次') }}: {{ current.batchId }}</small></div>
      <pre>{{ current.body }}</pre>
    </section>
    <template #footer><el-button @click="bodyOpen = false">{{ tr('关闭') }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { listScheduleSmsRecords, refreshScheduleSmsStatus } from '@/api/wms/livePayroll'
import { checkPermi } from '@/utils/permission'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate } from '../shared'
import { issueText, statusText, statusType, displayTimestamp } from './smsDisplay'
const { tr } = useLiveI18n()
const canSend = computed(() => checkPermi(['wms:live:schedule:sms:send']))
const bodyOpen = ref(false)
const open = ref(false), loading = ref(false), refreshing = ref(null), week = ref('')
const rows = ref([]), total = ref(0), current = ref(null), pageNum = ref(1), pageSize = 20
let timer = null, sequence = 0
async function show(weekStart) {
  stopPolling(); week.value = weekStart; pageNum.value = 1; rows.value = []; current.value = null; bodyOpen.value = false; open.value = true
  await load()
  if (open.value) timer = setInterval(() => { if (!loading.value && open.value) load(false).catch(() => stopPolling()) }, 5000)
}
async function load(showLoading = true) {
  const token = ++sequence
  if (showLoading !== false) loading.value = true
  try {
    const response = await listScheduleSmsRecords({ weekStart: week.value, pageNum: pageNum.value, pageSize })
    if (token !== sequence || !open.value) return
    rows.value = response.rows || []; total.value = response.total
  } finally { if (token === sequence) loading.value = false }
}
// Keep the selected snapshot stable while the background list refreshes or changes page.
function showBody(row) { current.value = { ...row }; bodyOpen.value = true }
async function refreshStatus(row) {
  if (refreshing.value) return
  refreshing.value = row.id
  try { await refreshScheduleSmsStatus(row.id); await load() } finally { refreshing.value = null }
}
function stopPolling() { if (timer) clearInterval(timer); timer = null }
watch(open, value => { if (!value) { ++sequence; loading.value = false; bodyOpen.value = false; stopPolling() } })
onBeforeUnmount(() => { ++sequence; stopPolling() })
defineExpose({ show })
</script>

<style scoped>
.sms-record-dialog { max-width: 95vw; }
.record-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.el-pagination { margin-top: 14px; justify-content: flex-end; }
.record-actions { display: flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: 12px; white-space: nowrap; }
.record-actions .el-button + .el-button { margin-left: 0; }
.record-detail { padding: 16px; background: var(--el-fill-color-light); border-radius: 8px; }
.record-detail small { display: block; color: var(--el-text-color-secondary); margin-top: 6px; overflow-wrap: anywhere; }
.record-detail pre { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; max-height: 50vh; overflow: auto; }
</style>
