<template>
  <div data-runtime-i18n-ignore="true" class="live-page">
    <div class="live-hero">
      <div><h2>{{ tr('排班计划') }}</h2><p>{{ tr('查看所选周排班') }}</p></div>
      <div class="live-actions"><el-button @click="exportRows">{{ tr('导出 CSV') }}</el-button><el-button type="primary" v-hasPermi="['wms:live:schedule:edit']" @click="openDialog()">{{ tr('新增排班') }}</el-button></div>
    </div>
    <el-card class="live-filter schedule-filter" shadow="never">
      <div class="schedule-filter-bar">
        <el-form class="schedule-filter-form" :inline="true">
          <el-form-item class="week-filter-item" :label="tr('周次')">
            <div class="week-picker-field">
              <el-date-picker class="week-picker-input" v-model="selectedWeek" type="date" value-format="YYYY-MM-DD" format="MM/DD/YYYY" placeholder="MM/DD/YYYY" popper-class="schedule-week-picker-popper" :cell-class-name="weekCellClassName" :editable="true" :clearable="false" @change="handleWeekChange" />
            </div>
          </el-form-item>
          <el-form-item :label="tr('主播')"><LiveEmployeeSelect v-model="query.employeeId"   :placeholder="tr('全部主播')" :employees="options.employees" /></el-form-item>
          <el-form-item :label="tr('直播平台')"><LiveAccountSelect v-model="query.accountId" clearable :placeholder="tr('全部直播平台')" :accounts="options.accounts" /></el-form-item>
          <el-form-item :label="tr('场次')"><el-select v-model="query.rateTypeId" clearable :placeholder="tr('全部场次')"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item>
          <el-form-item class="query-action"><el-button type="primary" @click="load">{{ tr('查询') }}</el-button></el-form-item>
        <el-form-item :label="tr('主播状态')"><el-select v-model="query.employeeScope" @change="query.pageNum = 1; load()"><el-option :label="tr('全部')" value="ALL" /><el-option :label="tr('在职/试用期')" value="ACTIVE" /><el-option :label="tr('已归档')" value="INACTIVE" /></el-select></el-form-item></el-form>

      </div>
    </el-card>
    <el-card class="operator-color-panel" shadow="never" :aria-label="tr('运营颜色')">
      <div class="operator-color-heading"><strong>{{ tr('运营颜色') }}</strong><span>{{ tr(canEdit ? '团队共享颜色，点击色块修改' : '团队共享运营颜色') }}</span></div>
      <div class="operator-color-list">
        <div v-for="operator in activeOperators" :key="operator.employeeId" class="operator-color-item">
          <button v-if="canEdit" type="button" class="operator-swatch" :style="{ backgroundColor: operator.color || '#9CA3AF' }" :aria-label="tr('修改 {0} 的颜色', [operator.name])" @click="openColorDialog(operator)"></button>
          <span v-else class="operator-swatch" :style="{ backgroundColor: operator.color || '#9CA3AF' }" aria-hidden="true"></span>
          <span>{{ operator.name }}</span>
        </div>
        <span v-if="!activeOperators.length" class="operator-empty">{{ tr('暂无在职运营，请在员工档案中配置岗位') }}</span>
      </div>
    </el-card>
    <el-card class="live-card" shadow="never" v-loading="loading">
      <div class="schedule-board-toolbar">
        <el-radio-group v-model="view" :aria-label="tr('排班查看维度')">
          <el-radio-button label="channel">{{ tr('按频道') }}</el-radio-button>
          <el-radio-button label="operator">{{ tr('按运营') }}</el-radio-button>
          <el-radio-button label="host">{{ tr('按主播') }}</el-radio-button>
        </el-radio-group>
        <span>{{ tr('显示直播时段') }}</span>
      </div>
      <ScheduleBoard :rows="rows" :operators="operators" :accounts="options.accounts" :employees="options.employees" :weeks="calendarWeeks" :view="view" :can-edit="canEdit" @open="openDialog" @add="openDialog" />
    </el-card>
    <el-dialog data-runtime-i18n-ignore="true" v-model="colorDialog.open" :title="tr('修改 {0} 的颜色', [colorDialog.name])" width="360px" append-to-body :close-on-click-modal="!colorDialog.saving" :show-close="!colorDialog.saving" :close-on-press-escape="!colorDialog.saving">
      <el-color-picker v-model="colorDialog.color" color-format="hex" :show-alpha="false" :disabled="colorDialog.saving" />
      <span class="color-value">{{ colorDialog.color }}</span>
      <el-alert v-if="colorDialog.error" :title="tr('颜色保存失败，原颜色已保留，请重试')" type="error" :closable="false" show-icon />
      <template #footer><el-button :disabled="colorDialog.saving" @click="colorDialog.open = false">{{ tr('取消') }}</el-button><el-button type="primary" :loading="colorDialog.saving" :disabled="!validColor" @click="saveColor">{{ tr(colorDialog.error ? '重试' : '保存') }}</el-button></template>
    </el-dialog>
    <el-dialog data-runtime-i18n-ignore="true" v-model="dialog.open" class="schedule-dialog" :title="dialog.form.id ? tr(canEdit ? '编辑排班' : '排班详情') : tr('新增排班')" width="820px" append-to-body>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" :disabled="!canEdit" :label-width="isEn ? '128px' : '92px'">
        <div class="dialog-grid">
          <el-form-item :label="tr('日期')" prop="scheduleDate"><el-date-picker v-model="dialog.form.scheduleDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" @change="handleScheduleScopeChange" /></el-form-item>
          <el-form-item :label="tr('主播')" prop="employeeId"><LiveEmployeeSelect v-model="dialog.form.employeeId"  @change="handleScheduleScopeChange" :employees="hostOptions" /></el-form-item>
          <el-form-item :label="tr('直播平台')" prop="accountId"><LiveAccountSelect v-model="dialog.form.accountId" @change="handleScheduleScopeChange" :accounts="options.accounts" /></el-form-item>
          <el-form-item :label="tr('场次类型')" prop="rateTypeId">
            <div class="rate-type-field">
              <el-select v-model="dialog.form.rateTypeId" :loading="dialog.loadingRateTypes" :disabled="!hasScheduleRateScope" :placeholder="rateTypePlaceholder">
                <el-option v-for="v in dialog.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" />
              </el-select>
              <small v-if="hasScheduleRateScope && !dialog.loadingRateTypes && !dialog.rateTypes.length">{{ tr('请先在费率配置中启用该主播、直播平台和日期对应的场次类型') }}</small>
            </div>
          </el-form-item>
          <el-form-item :label="tr('开始时间')" prop="startTime"><el-time-picker v-model="dialog.form.startTime" value-format="HH:mm:ss" format="HH:mm" @change="formRef?.validateField('endTime')" /></el-form-item>
          <el-form-item :label="tr('结束时间')" prop="endTime"><el-time-picker v-model="dialog.form.endTime" value-format="HH:mm:ss" format="HH:mm" /></el-form-item>
          <el-form-item :label="tr('排班状态')"><el-select v-model="dialog.form.scheduleStatus"><el-option :label="tr('已确认')" value="CONFIRMED" /><el-option :label="tr('待确认')" value="PENDING" /><el-option :label="tr('已取消')" value="CANCELLED" /></el-select></el-form-item>
          <el-form-item :label="tr('运营')" prop="operatorId">
            <el-select v-model="dialog.form.operatorId" filterable clearable :placeholder="tr('请选择运营')">
              <el-option v-for="operator in selectableOperators" :key="operator.employeeId" :value="operator.employeeId" :label="operator.name" :disabled="!isActiveOperator(operator)" />
            </el-select>
          </el-form-item>
          <el-form-item class="wide" :label="tr('备注')"><el-input v-model="dialog.form.remark" type="textarea" :rows="2" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="schedule-dialog-footer">
          <el-button v-if="dialog.form.id && canEdit" type="danger" plain @click="remove(dialog.form)">{{ tr('删除排班') }}</el-button>
          <div class="schedule-dialog-actions"><el-button @click="dialog.open=false">{{ tr('取消') }}</el-button><el-button v-if="canEdit" type="primary" :loading="dialog.saving" :disabled="dialog.loadingRateTypes" @click="submit">{{ tr('保存') }}</el-button></div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import ScheduleBoard from './ScheduleBoard.vue'
import { idKey, isActiveOperator, assignmentSummary } from './scheduleDisplay'
import { checkPermi } from '@/utils/permission'
import LiveAccountSelect from '../components/LiveAccountSelect.vue'
import { useLiveI18n } from '../useLiveI18n'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import { onActivated, computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addSchedule, deleteSchedule, getLiveOptions, listScheduleCalendar, listScheduleRateTypes, updateSchedule, listScheduleOperators, updateScheduleOperatorColor, listScheduleHosts } from '@/api/wms/livePayroll'
import { displayDate, downloadCsv, isoDate, LIVE_DATE_FORMAT, weekRange, selectedWeekRange } from '../shared'
const { tr, isEn, messageNode } = useLiveI18n()
const { proxy } = getCurrentInstance()

const loading = ref(false), view = ref('channel'), formRef = ref()
const canEdit = computed(() => checkPermi(['wms:live:schedule:edit']))
const operators = ref([])
let colorSaveSequence = 0
const savedColors = new Map()
const activeOperators = computed(() => operators.value.filter(isActiveOperator))
const colorDialog = reactive({ open: false, employeeId: null, name: '', color: null, saving: false, error: false })
const validColor = computed(() => /^#[0-9a-f]{6}$/i.test(colorDialog.color || ''))
function openColorDialog(operator) {
  if (!canEdit.value) return
  Object.assign(colorDialog, { open: true, employeeId: operator.employeeId, name: operator.name, color: operator.color, saving: false, error: false })
}
async function saveColor() {
  if (!canEdit.value || !validColor.value || colorDialog.saving) return
  colorDialog.saving = true; colorDialog.error = false
  try {
    const response = await updateScheduleOperatorColor(colorDialog.employeeId, colorDialog.color)
    savedColors.set(idKey(response.data.employeeId), { color: response.data.color, sequence: ++colorSaveSequence })
    operators.value = operators.value.map(operator => idKey(operator.employeeId) === idKey(response.data.employeeId) ? { ...operator, color: response.data.color } : operator)
    colorDialog.open = false
  } catch { colorDialog.error = true } finally { colorDialog.saving = false }
}
const hostOptions = ref([])
const selectableOperators = computed(() => {
  const selectedId = dialog.form.operatorId
  const result = operators.value.filter(operator => isActiveOperator(operator) || idKey(operator.employeeId) === idKey(selectedId))
  if (selectedId != null && !result.some(operator => idKey(operator.employeeId) === idKey(selectedId))) {
    result.push({ employeeId: selectedId, name: dialog.form.operatorName || tr('原运营已不可用'), employeeStatus: 3, positions: [] })
  }
  return result
})
const selectedWeek = ref(weekRange()[0]), query = reactive({ employeeScope: 'ALL', employeeId: null, accountId: null, rateTypeId: null })
const options = reactive({ employees: [], accounts: [], rateTypes: [] }), rows = ref([])
const dialog = reactive({ open: false, form: {}, rateTypes: [], loadingRateTypes: false, saving: false })
let rateTypeRequestSequence = 0
const hasScheduleRateScope = computed(() => Boolean(dialog.form.scheduleDate && dialog.form.employeeId && dialog.form.accountId))
const rateTypePlaceholder = computed(() => {
  if (!hasScheduleRateScope.value) return tr('请先选择日期、主播和直播平台')
  if (dialog.loadingRateTypes) return tr('正在加载场次类型')
  return dialog.rateTypes.length ? tr('请选择场次类型') : tr('当前组合无已激活场次')
})
const validateEndTime = (_rule, value, callback) => {
  if (!value) return callback(new Error(tr('请选择结束时间')))
  if (dialog.form.startTime && value <= dialog.form.startTime) return callback(new Error(tr('结束时间必须晚于开始时间')))
  callback()
}
const rules = computed(() => ({ scheduleDate: [{ required: true, message: tr('请选择日期') }], employeeId: [{ required: true, message: tr('请选择主播') }], accountId: [{ required: true, message: tr('请选择直播平台') }], rateTypeId: [{ required: true, message: tr('请选择场次类型') }], startTime: [{ required: true, message: tr('请选择开始时间') }], endTime: [{ validator: validateEndTime, trigger: 'change' }] }))
const weekDateRange = computed(() => selectedWeekRange(selectedWeek.value))
const days = computed(() => {
  const sunday = parseLocalDate(weekDateRange.value[0])
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(sunday)
    current.setDate(sunday.getDate() + index)
    const date = isoDate(current)
    return { key: date, date, month: current.getMonth() + 1, day: current.getDate(), today: date === isoDate() }
  })
})
const calendarWeeks = computed(() => [days.value])
function parseLocalDate(value) { const [year, month, day] = String(value).split('-').map(Number); return new Date(year, month - 1, day) }
function weekCellClassName(date) {
  const value = isoDate(date)
  if (value < weekDateRange.value[0] || value > weekDateRange.value[1]) return ''
  if (value === weekDateRange.value[0]) return 'schedule-week-cell schedule-week-start'
  if (value === weekDateRange.value[1]) return 'schedule-week-cell schedule-week-end'
  return 'schedule-week-cell'
}
async function handleWeekChange() { selectedWeek.value = weekDateRange.value[0]; await load() }
let loadSequence = 0
async function load() {
  const sequence = ++loadSequence
  const colorSequence = colorSaveSequence
  loading.value = true
  try {
    const [references, people, hosts, res] = await Promise.all([getLiveOptions(), listScheduleOperators(), listScheduleHosts(), listScheduleCalendar({ ...query, startDate: weekDateRange.value[0], endDate: weekDateRange.value[1] })])
    if (sequence !== loadSequence) return
    Object.assign(options, references)
    hostOptions.value = hosts.data || []
    operators.value = (people.data || []).map(operator => {
      const saved = savedColors.get(idKey(operator.employeeId))
      return saved && saved.sequence > colorSequence ? { ...operator, color: saved.color } : operator
    })
    rows.value = res.data || []
  } finally { if (sequence === loadSequence) loading.value = false }
}
function defaultScheduleDate() { const today = isoDate(); return today >= weekDateRange.value[0] && today <= weekDateRange.value[1] ? today : weekDateRange.value[0] }
async function refreshScheduleRateTypes() {
  const requestSequence = ++rateTypeRequestSequence
  dialog.rateTypes = []
  if (!hasScheduleRateScope.value) { dialog.form.rateTypeId = null; dialog.loadingRateTypes = false; return }
  dialog.loadingRateTypes = true
  try {
    const res = await listScheduleRateTypes({ employeeId: dialog.form.employeeId, accountId: dialog.form.accountId, scheduleDate: dialog.form.scheduleDate })
    if (requestSequence !== rateTypeRequestSequence) return
    dialog.rateTypes = res.data || []
    if (!dialog.rateTypes.some(type => String(type.id) === String(dialog.form.rateTypeId))) dialog.form.rateTypeId = null
  } finally {
    if (requestSequence === rateTypeRequestSequence) dialog.loadingRateTypes = false
  }
}
async function handleScheduleScopeChange() { dialog.form.rateTypeId = null; await refreshScheduleRateTypes() }
async function openDialog(row = {}) {
  if (!row.id && !canEdit.value) return
  dialog.form = { id: row.id, employeeName: row.employeeName || '', scheduleDate: row.scheduleDate || defaultScheduleDate(), employeeId: row.employeeId || null, accountId: row.accountId || null, rateTypeId: row.rateTypeId || null, startTime: row.startTime || '09:00:00', endTime: row.endTime || '17:00:00', remark: row.remark || '', scheduleStatus: row.scheduleStatus || 'CONFIRMED', operatorId: row.operatorId || row.operatorAssignments?.[0]?.employeeId || null, operatorName: row.operatorAssignments?.[0]?.employeeName || '' }
  if (dialog.form.operatorId != null) dialog.form.operatorId = operators.value.find(o => idKey(o.employeeId) === idKey(dialog.form.operatorId))?.employeeId || dialog.form.operatorId
  dialog.open = true
  await refreshScheduleRateTypes()
}
async function submit() {
  if (!canEdit.value || dialog.saving) return
  await formRef.value.validate()
  const form = dialog.form
  if (!hostOptions.value.some(host => idKey(host.value) === idKey(form.employeeId))) return proxy.$modal.msgWarning(tr('请选择岗位为主播的人员'))
  // 表单只选择一位运营，沿用已有存储格式，负责时间自动跟随本场直播。
  const { operatorId, operatorName, ...payload } = form
  payload.operatorAssignments = operatorId ? [{ employeeId: operatorId, startTime: form.startTime, endTime: form.endTime }] : []
  dialog.saving = true
  try { await (form.id ? updateSchedule(payload) : addSchedule(payload)); proxy.$modal.msgSuccess(tr('保存成功')); dialog.open = false; await load() }
  finally { dialog.saving = false }
}
async function remove(row) { if (!canEdit.value) return; await proxy.$modal.confirm(messageNode(tr('确认删除 {0} 的排班？', [row.employeeName]))); await deleteSchedule(row.id); proxy.$modal.msgSuccess(tr('删除成功')); dialog.open = false; load() }
function exportRows() { downloadCsv(tr('主播排班-{0}-{1}.csv', [weekDateRange.value[0], weekDateRange.value[1]]), [{ key: 'scheduleDate', label: tr('日期') }, { key: 'employeeName', label: tr('主播') }, { key: 'accountLabel', label: tr('直播平台') }, { key: 'startTime', label: tr('开始时间') }, { key: 'endTime', label: tr('结束时间') }, { key: 'rateTypeName', label: tr('场次类型') }, { key: 'operators', label: tr('运营') }, { key: 'scheduleStatus', label: tr('排班状态') }, { key: 'remark', label: tr('备注') }], rows.value.map(row => ({ ...row, operators: assignmentSummary(row), scheduleDate: displayDate(row.scheduleDate) }))) }
let mounted = false
onMounted(() => { load(); mounted = true })
onActivated(() => { if (mounted && !loading.value) load() })
</script>
<style scoped lang="scss">
@import '../live.scss';
.operator-color-panel { margin-bottom: 18px; }
.operator-color-heading, .operator-color-list, .operator-color-item, .schedule-board-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.operator-color-heading { margin-bottom: 14px; }
.operator-color-heading span, .operator-empty, .schedule-board-toolbar > span { color: var(--el-text-color-secondary); font-size: 12px; }
.operator-color-list { gap: 14px 24px; }
.operator-color-item { gap: 7px; }
.operator-swatch { display: inline-block; width: 26px; height: 26px; border: 1px solid var(--el-border-color); border-radius: 5px; flex-shrink: 0; }
button.operator-swatch { cursor: pointer; }
.schedule-board-toolbar { justify-content: space-between; }
.color-value { margin-left: 16px; }
.schedule-filter :deep(.el-card__body) { padding: 16px; }
.schedule-filter-bar { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.schedule-filter-form { display: flex; flex: 1; align-items: flex-end; flex-wrap: wrap; gap: 12px; min-width: 0; }
.schedule-filter-form :deep(.el-form-item) { margin-right: 0; margin-bottom: 0; }
.week-filter-item { flex: 0 0 auto; }
.week-filter-item :deep(.el-form-item__content) { flex: 0 0 170px; width: 170px; min-width: 170px; }
.week-picker-field { flex: 0 0 170px; width: 170px; max-width: 170px; }
.schedule-filter-form :deep(.week-picker-input.el-date-editor) { width: 170px !important; max-width: 170px; }
.query-action { flex: 0 0 auto; }
.view-switch { flex: 0 0 auto; }
.week-calendar-wrap { overflow-x: auto; }
.week-calendar { display: grid; grid-template-columns: repeat(7, minmax(142px, 1fr)); gap: 10px; min-width: 1054px; }
.week-weekday { padding: 4px 12px 10px; color: #7b8497; font-size: 13px; font-weight: 650; text-align: center; }
.calendar-week-title { margin: 18px 0 12px; font-size: 15px; }
.week-calendar .calendar-day { min-height: 210px; padding: 12px; }
.week-calendar .calendar-day.is-today { border-color: #8fb4ff; box-shadow: inset 0 0 0 1px #8fb4ff; }
.week-calendar .calendar-day-title { display: flex; align-items: center; justify-content: space-between; }
.schedule-chip-remark { margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(53, 99, 233, .12); color: #7b8497; line-height: 1.45; overflow-wrap: anywhere; }

@media (max-width: 1280px) {
  .schedule-filter-bar { align-items: stretch; flex-direction: column; gap: 14px; }
  .view-switch { align-self: flex-start; }
}

@media (max-width: 760px) {
  .schedule-filter-form { align-items: stretch; flex-direction: column; }
  .schedule-filter-form :deep(.el-form-item) { width: 100%; }
  .schedule-filter-form :deep(.el-form-item__content),
  .schedule-filter-form :deep(.el-select),
  .schedule-filter-form :deep(.el-date-editor) { width: 100%; }
  .week-filter-item :deep(.el-form-item__content),
  .week-picker-field,
  .schedule-filter-form :deep(.week-picker-input.el-date-editor) { flex-basis: auto; width: 100% !important; max-width: none; min-width: 0; }
}
</style>
<style lang="scss">
.schedule-week-picker-popper {
  .el-date-table__row:hover .el-date-table-cell,
  td.schedule-week-cell .el-date-table-cell { background-color: var(--el-datepicker-inrange-bg-color); }
  .el-date-table__row:hover td.available:hover { color: var(--el-datepicker-text-color); }
  .el-date-table__row:hover td:first-child .el-date-table-cell,
  td.schedule-week-start .el-date-table-cell { margin-left: 5px; border-radius: 15px 0 0 15px; }
  .el-date-table__row:hover td:last-child .el-date-table-cell,
  td.schedule-week-end .el-date-table-cell { margin-right: 5px; border-radius: 0 15px 15px 0; }
  td.schedule-week-end .el-date-table-cell__text { color: #fff; background-color: var(--el-datepicker-active-color); }
}

.schedule-dialog {
  width: min(820px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 20px 28px 8px; }
  .dialog-grid { align-items: start; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 28px; }
  .el-form-item { min-width: 0; margin-bottom: 20px; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-select,
  .el-date-editor,
  .el-time-picker { width: 100%; }
  .rate-type-field { width: 100%; }
  .rate-type-field small { display: block; margin-top: 6px; color: #9099aa; font-size: 12px; line-height: 1.45; }
  .schedule-dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; }
  .schedule-dialog-footer > .el-button { margin-right: auto; }
  .schedule-dialog-actions { display: flex; align-items: center; gap: 12px; }
  .schedule-dialog-actions .el-button + .el-button { margin-left: 0; }

  @media (max-width: 720px) {
    .el-dialog__body { padding: 16px 18px 6px; }
    .dialog-grid { grid-template-columns: 1fr; }
    .dialog-grid .wide { grid-column: auto; }
    .schedule-dialog-footer { align-items: stretch; flex-direction: column-reverse; }
    .schedule-dialog-footer > .el-button { margin-right: 0; }
    .schedule-dialog-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .schedule-dialog-actions .el-button { width: 100%; }
  }
}
</style>
