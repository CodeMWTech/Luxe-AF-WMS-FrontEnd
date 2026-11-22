<template>
  <div data-runtime-i18n-ignore="true" class="live-page operation-page">
    <div class="live-hero">
      <div>
        <h2>{{ tr('运营记录') }}</h2>
        <p>{{ tr('直播场次来自开播录入。非直播工时由运营另行填写，不改变主播薪酬。') }}</p>
      </div>
    </div>
    <div class="summary-strip">
      <div class="summary-item"><span>{{ tr('直播场次') }}</span><strong>{{ total }}</strong></div>
      <div class="summary-item"><span>{{ tr('直播工时合计') }}</span><strong>{{ summary.liveHours }}h</strong></div>
      <div class="summary-item"><span>{{ tr('非直播记录') }}</span><strong>{{ nonliveTotal }}</strong></div>
      <div class="summary-item"><span>{{ tr('非直播工时合计') }}</span><strong>{{ summary.nonliveHours }}h</strong></div>
      <em>{{ tr('当前筛选的全部场次') }}</em>
    </div>
    <el-card class="live-filter" shadow="never">
      <el-form class="filter-line" inline @submit.prevent="handleQuery">
        <el-form-item :label="tr('显示')">
          <el-radio-group v-model="query.scope" size="small" @change="handleQuery">
            <el-radio-button label="20">{{ tr('最近20条') }}</el-radio-button>
            <el-radio-button label="50">{{ tr('最近50条') }}</el-radio-button>
            <el-radio-button label="all">{{ tr('全部') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="tr('排序')">
          <el-select v-model="query.sortOrder" class="filter-sort" @change="handleQuery">
            <el-option value="desc" :label="tr('倒序')" />
            <el-option value="asc" :label="tr('正序')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('运营')">
          <el-select v-model="query.operatorEmployeeId" class="filter-operator" filterable clearable :placeholder="tr('全部运营')" :loading="optionsLoading">
            <el-option v-for="operator in options.operators" :key="operator.value" :value="operator.value" :label="operatorLabel(operator, tr)" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('业务日期')"><el-date-picker v-model="dateRange" class="filter-date" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
        <el-form-item :label="tr('平台')"><LiveAccountSelect v-model="query.accountId" class="filter-platform" :accounts="options.accounts" :placeholder="tr('全部平台')" clearable /></el-form-item>
        <el-form-item class="filter-actions"><el-button type="primary" :loading="loading || nonliveLoading" @click="handleQuery">{{ tr('查询') }}</el-button><el-button @click="resetQuery">{{ tr('重置') }}</el-button></el-form-item>
      </el-form>
    </el-card>

    <div class="record-split">
    <el-card class="live-card session-card" shadow="never">
      <div class="section-head">
        <div class="section-copy">
          <h3>{{ tr('直播场次') }}</h3>
          <p>{{ tr('来自开播录入，只读') }}</p>
        </div>
        <el-button v-hasPermi="['wms:live:operation:export']" :loading="liveExportLoading" :disabled="loading || total === 0" @click="exportLiveRows">{{ tr('导出直播场次') }}</el-button>
      </div>
      <div class="table-wrap">
      <el-table v-loading="loading" class="session-table" :data="rows" row-key="id" stripe height="100%">
        <el-table-column :label="tr('运营')" min-width="170"><template #default="{ row }">{{ operatorLabel(row, tr) }}</template></el-table-column>
        <el-table-column :label="tr('主播')" min-width="170"><template #default="{ row }">{{ operatorLabel({ operatorEmployeeId: row.hostEmployeeId, operatorName: row.hostName, operatorNickName: row.hostNickName }, tr, '未指定主播') }}</template></el-table-column>
        <el-table-column prop="businessDate" :label="tr('业务日期')" :min-width="isEn ? 155 : 130"><template #default="{ row }">{{ displayDate(row.businessDate) }}</template></el-table-column>
        <el-table-column :label="tr('平台')" min-width="220"><template #default="{ row }"><LivePlatformTag :account="row" /></template></el-table-column>
        <el-table-column :label="tr('本场实际直播时间')" min-width="150" align="right"><template #default="{ row }"><span class="hours-cell">{{ actualDurationLabel(row.actualDurationMinutes) }}</span></template></el-table-column>
        <el-table-column :label="tr('本场 GMV')" min-width="140" align="right"><template #default="{ row }">{{ row.gmv == null ? '—' : money(row.gmv) }}</template></el-table-column>
      </el-table>
      </div>
      <pagination v-show="query.scope === 'all' && total > 0" :total="total" v-model:page="pagination.pageNum" v-model:limit="pagination.pageSize" :page-sizes="[20, 50, 100]" @pagination="load" />
    </el-card>

    <el-card class="live-card nonlive-card" shadow="never">
      <div class="section-head">
        <div class="section-copy">
          <h3>{{ tr('非直播工时') }}</h3>
          <p>{{ tr('运营另外填写，不改变主播薪酬') }}</p>
        </div>
        <div class="section-actions">
          <el-button v-hasPermi="['wms:live:operation:export']" :loading="nonliveExportLoading" :disabled="nonliveLoading || nonliveTotal === 0" @click="exportNonliveRows">{{ tr('导出非直播工时') }}</el-button>
          <el-button v-hasPermi="['wms:live:operation:add']" type="primary" @click="openCreate">{{ tr('新增非直播工时') }}</el-button>
        </div>
      </div>
      <div class="table-wrap">
      <el-table v-loading="nonliveLoading" class="nonlive-table" :data="nonliveRows" row-key="id" stripe height="100%">
        <el-table-column :label="tr('运营')" min-width="170"><template #default="{ row }">{{ operatorLabel(row, tr) }}</template></el-table-column>
        <el-table-column :label="tr('搭配的主播')" min-width="170"><template #default="{ row }">{{ row.hostEmployeeId == null ? tr('无') : operatorLabel({ operatorEmployeeId: row.hostEmployeeId, operatorName: row.hostName, operatorNickName: row.hostNickName }, tr) }}</template></el-table-column>
        <el-table-column prop="businessDate" :label="tr('业务日期')" :min-width="isEn ? 155 : 130"><template #default="{ row }">{{ displayDate(row.businessDate) }}</template></el-table-column>
        <el-table-column :label="tr('直播间')" min-width="220"><template #default="{ row }"><span v-if="row.accountId == null">{{ tr('无') }}</span><LivePlatformTag v-else :account="row" /></template></el-table-column>
        <el-table-column :label="tr('非直播小时数')" min-width="130" align="right"><template #default="{ row }"><span class="hours-cell">{{ hoursText(row.hours) }}</span></template></el-table-column>
        <el-table-column prop="memo" :label="tr('备注')" min-width="220" show-overflow-tooltip />
        <el-table-column :label="tr('操作')" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-hasPermi="['wms:live:operation:edit']" link type="primary" @click="openEdit(row)">{{ tr('编辑') }}</el-button>
            <el-button v-hasPermi="['wms:live:operation:remove']" link type="danger" @click="removeRow(row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      </div>
      <pagination v-show="query.scope === 'all' && nonliveTotal > 0" :total="nonliveTotal" v-model:page="nonlivePagination.pageNum" v-model:limit="nonlivePagination.pageSize" :page-sizes="[20, 50, 100]" @pagination="loadNonlive" />
    </el-card>
    </div>

    <el-dialog v-model="dialog.visible" :title="dialog.form.id ? tr('修改非直播工时') : tr('新增非直播工时')" width="520px" append-to-body>
      <el-form label-width="110px">
        <el-form-item :label="tr('运营')" required>
          <el-select v-model="dialog.form.operatorEmployeeId" filterable :placeholder="tr('请选择运营')">
            <el-option v-for="operator in options.operators" :key="operator.value" :value="operator.value" :label="operatorLabel(operator, tr)" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('搭配的主播')">
          <el-select v-model="dialog.form.hostEmployeeId" filterable clearable :placeholder="tr('无')">
            <el-option v-for="host in options.hosts" :key="host.value" :value="host.value" :label="operatorLabel(host, tr)" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('业务日期')" required><el-date-picker v-model="dialog.form.businessDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
        <el-form-item :label="tr('直播间')"><LiveAccountSelect v-model="dialog.form.accountId" :accounts="options.accounts" :placeholder="tr('无')" clearable /></el-form-item>
        <el-form-item :label="tr('非直播小时数')" required><el-input-number v-model="dialog.form.hours" :min="0.01" :max="24" :step="0.5" :precision="2" /></el-form-item>
        <el-form-item :label="tr('备注')" required><el-input v-model="dialog.form.memo" type="textarea" :rows="3" maxlength="500" show-word-limit :placeholder="tr('请填写备注')" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ tr('取消') }}</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="saveTime">{{ tr('保存') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createOperationTime, deleteOperationTime, exportOperationRecords, exportOperationTimes, getOperationRecordOptions, getOperationRecordSummary, listOperationRecords, listOperationTimes, updateOperationTime } from '@/api/wms/livePayroll'
import LiveAccountSelect from '../components/LiveAccountSelect.vue'
import LivePlatformTag from '../components/LivePlatformTag.vue'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate, isoDate, LIVE_DATE_FORMAT, money } from '../shared'
import { actualDurationLabel, hoursText, operationRecordFilters, operatorLabel } from './recordDisplay'

const { tr, isEn } = useLiveI18n()
const query = reactive({ scope: '20', sortOrder: 'desc', operatorEmployeeId: null, accountId: null })
const pagination = reactive({ pageNum: 1, pageSize: 20 })
const nonlivePagination = reactive({ pageNum: 1, pageSize: 20 })
const dateRange = ref(null)
const appliedFilters = ref({})
const options = reactive({ operators: [], hosts: [], accounts: [] })
const summary = reactive({ liveHours: '0.00', nonliveHours: '0.00' })
const optionsLoading = ref(false), loading = ref(false), nonliveLoading = ref(false), liveExportLoading = ref(false), nonliveExportLoading = ref(false)
const rows = ref([]), total = ref(0), nonliveRows = ref([]), nonliveTotal = ref(0)
const dialog = reactive({ visible: false, saving: false, form: emptyForm() })
let requestVersion = 0, nonliveVersion = 0, initialized = false

function emptyForm() {
  return { id: null, businessDate: null, operatorEmployeeId: null, hostEmployeeId: null, accountId: null, hours: null, memo: '' }
}
async function loadOptions() {
  optionsLoading.value = true
  try { Object.assign(options, (await getOperationRecordOptions()).data || {}) }
  finally { optionsLoading.value = false }
}
async function loadSummary() {
  const result = await getOperationRecordSummary({ ...appliedFilters.value })
  const data = result.data || {}
  summary.liveHours = Number(data.liveHours || 0).toFixed(2)
  summary.nonliveHours = Number(data.nonliveHours || 0).toFixed(2)
}
async function load() {
  const version = ++requestVersion
  loading.value = true
  try {
    const result = await listOperationRecords({ ...appliedFilters.value, ...pagination })
    if (version !== requestVersion) return
    rows.value = result.rows || []
    total.value = result.total || 0
  } catch (error) {
    if (version === requestVersion) { rows.value = []; total.value = 0 }
  } finally { if (version === requestVersion) loading.value = false }
}
async function loadNonlive() {
  const version = ++nonliveVersion
  nonliveLoading.value = true
  try {
    const result = await listOperationTimes({ ...appliedFilters.value, ...nonlivePagination })
    if (version !== nonliveVersion) return
    nonliveRows.value = result.rows || []
    nonliveTotal.value = result.total || 0
  } catch (error) {
    if (version === nonliveVersion) { nonliveRows.value = []; nonliveTotal.value = 0 }
  } finally { if (version === nonliveVersion) nonliveLoading.value = false }
}
function handleQuery() {
  pagination.pageNum = 1
  nonlivePagination.pageNum = 1
  if (query.scope === 'all') {
    if (![20, 50, 100].includes(pagination.pageSize)) pagination.pageSize = 20
    if (![20, 50, 100].includes(nonlivePagination.pageSize)) nonlivePagination.pageSize = 20
  } else {
    pagination.pageSize = Number(query.scope)
    nonlivePagination.pageSize = Number(query.scope)
  }
  appliedFilters.value = operationRecordFilters(query, dateRange.value)
  return Promise.all([load(), loadNonlive(), loadSummary().catch(() => {})])
}
function resetQuery() {
  Object.assign(query, { scope: '20', sortOrder: 'desc', operatorEmployeeId: null, accountId: null })
  dateRange.value = null
  return handleQuery()
}
function openCreate() {
  dialog.form = emptyForm()
  dialog.visible = true
}
function openEdit(row) {
  dialog.form = { id: row.id, businessDate: row.businessDate, operatorEmployeeId: row.operatorEmployeeId, hostEmployeeId: row.hostEmployeeId, accountId: row.accountId, hours: Number(row.hours), memo: row.memo || '' }
  dialog.visible = true
}
async function saveTime() {
  const form = dialog.form
  if (!form.businessDate || !form.operatorEmployeeId || form.hours == null || !String(form.memo || '').trim()) {
    ElMessage.warning(tr('请把日期、运营、小时数和备注填完整'))
    return
  }
  dialog.saving = true
  try {
    const payload = { ...form, hostEmployeeId: form.hostEmployeeId || null, accountId: form.accountId || null, memo: String(form.memo).trim() }
    if (form.id) await updateOperationTime(payload)
    else await createOperationTime(payload)
    dialog.visible = false
    ElMessage.success(tr('已保存'))
    await handleQuery()
  } finally { dialog.saving = false }
}
async function removeRow(row) {
  await ElMessageBox.confirm(tr('确认删除这条非直播工时吗？'), tr('删除'), { type: 'warning' })
  await deleteOperationTime(row.id)
  ElMessage.success(tr('已删除'))
  await handleQuery()
}
async function exportLiveRows() {
  if (liveExportLoading.value || loading.value || total.value === 0) return
  liveExportLoading.value = true
  try { await exportOperationRecords({ ...appliedFilters.value }, `${tr('运营记录直播场次')}_${isoDate()}.xlsx`) }
  finally { liveExportLoading.value = false }
}
async function exportNonliveRows() {
  if (nonliveExportLoading.value || nonliveLoading.value || nonliveTotal.value === 0) return
  nonliveExportLoading.value = true
  try { await exportOperationTimes({ ...appliedFilters.value }, `${tr('运营记录非直播工时')}_${isoDate()}.xlsx`) }
  finally { nonliveExportLoading.value = false }
}
onMounted(async () => { await Promise.allSettled([loadOptions(), handleQuery()]); initialized = true })
onActivated(() => { if (initialized) return Promise.allSettled([loadOptions(), handleQuery()]) })
</script>

<style scoped lang="scss">
@import '../live.scss';
:global(.main-container.hasTagsView) .operation-page { height: calc(100vh - 84px); }
:global(.main-container.hasTagsView) .operation-page .session-card { height: calc(100vh - 84px - 270px); }
.operation-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: calc(100vh - 50px);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 16px;
  padding-bottom: 24px;
  .live-hero { flex-shrink: 0; margin-bottom: 8px; }
  .live-filter { flex-shrink: 0; margin-bottom: 8px; }
  .live-filter :deep(.el-card__body) { padding: 10px 16px 8px; }
}
.summary-strip {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 10px;
  border: 1px solid var(--el-border-color-light, #ebeef5);
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .06);
}
.summary-item { display: flex; align-items: baseline; gap: 6px; min-width: 0; padding-right: 10px; }
.summary-item span { color: var(--el-text-color-secondary, #909399); font-size: 12px; white-space: nowrap; }
.summary-item strong { color: var(--el-text-color-primary, #303133); font-size: 16px; line-height: 22px; }
.summary-strip em { margin-left: auto; color: var(--el-text-color-placeholder, #a8abb2); font-size: 12px; font-style: normal; white-space: nowrap; }
.filter-line {
  flex-wrap: nowrap;
  align-items: center;
  :deep(.el-form-item) { margin-right: 12px; margin-bottom: 0; }
}
.filter-operator { width: 140px; }
.filter-sort { width: 92px; }
.filter-date { width: 220px; }
.filter-platform { width: 156px; }
.filter-actions { margin-right: 0 !important; white-space: nowrap; }
.record-split { flex: none; }
.session-card,
.nonlive-card {
  min-height: 0;
  margin: 0;
  overflow: hidden;
  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
}
.session-card { height: calc(100vh - 50px - 270px); min-height: 280px; margin-bottom: 12px; }
.nonlive-card { height: 420px; margin-bottom: 8px; }
.table-wrap { flex: 1 1 auto; height: 0; min-height: 0; overflow: hidden; }
.session-table,
.nonlive-table {
  height: 100%;
  :deep(.el-table__body-wrapper),
  :deep(.el-scrollbar__wrap) { overscroll-behavior: contain; }
  :deep(.el-table__body td) { padding: 6px 0; }
}
.section-head { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; gap: 12px; margin-bottom: 8px; }
.section-head h3 { margin: 0; font-size: 16px; }
.section-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.section-copy p { margin: 2px 0 0; color: var(--el-text-color-secondary, #909399); font-size: 12px; line-height: 16px; }
.hours-cell { display: inline-block; min-width: 6.5ch; font-variant-numeric: tabular-nums; text-align: right; }
.operation-page :deep(.pagination-container) { flex-shrink: 0; min-height: 40px; margin-top: 8px; padding-top: 8px !important; }
</style>
