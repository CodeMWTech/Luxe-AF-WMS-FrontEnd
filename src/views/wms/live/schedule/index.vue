<template>
  <div class="live-page">
    <div class="live-hero">
      <div><h2>排班计划</h2><p>按周安排每日直播排班</p></div>
      <div class="live-actions"><el-button @click="exportRows">导出 CSV</el-button><el-button type="primary" v-hasPermi="['wms:live:schedule:edit']" @click="openDialog()">新增排班</el-button></div>
    </div>
    <el-card class="live-filter schedule-filter" shadow="never">
      <div class="schedule-filter-bar">
        <el-form class="schedule-filter-form" :inline="true">
          <el-form-item class="week-filter-item" label="周次">
            <div class="week-picker-field">
              <el-date-picker class="week-picker-input" v-model="selectedWeek" type="date" value-format="YYYY-MM-DD" format="MM/DD/YYYY" placeholder="MM/DD/YYYY" popper-class="schedule-week-picker-popper" :cell-class-name="weekCellClassName" :editable="true" :clearable="false" @change="handleWeekChange" />
            </div>
          </el-form-item>
          <el-form-item label="主播"><el-select v-model="query.employeeId" filterable clearable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
          <el-form-item label="直播平台"><el-select v-model="query.accountId" clearable placeholder="全部直播平台"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
          <el-form-item label="场次"><el-select v-model="query.rateTypeId" clearable placeholder="全部场次"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item>
          <el-form-item class="query-action"><el-button type="primary" @click="load">查询</el-button></el-form-item>
        </el-form>
        <el-radio-group v-model="view" class="view-switch">
          <el-radio-button label="calendar">日历</el-radio-button>
          <el-radio-button label="list">列表</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>
    <el-card class="live-card" shadow="never" v-loading="loading">
      <div v-if="view === 'calendar'" class="week-calendar-wrap">
        <div class="week-calendar">
          <div v-for="weekday in weekdays" :key="weekday" class="week-weekday">{{ weekday }}</div>
          <div v-for="day in days" :key="day.key" class="calendar-day" :class="{ 'is-today': day.today }">
            <div class="calendar-day-title"><span>{{ day.month }}/{{ day.day }}</span><el-tag v-if="day.today" size="small" effect="plain">今天</el-tag></div>
            <div v-for="row in byDay[day.date] || []" :key="row.id" class="schedule-chip" @click="openDialog(row)"><strong>{{ row.employeeName }}</strong><div>{{ row.accountLabel }}</div><div>{{ shortTime(row.startTime) }} - {{ shortTime(row.endTime) }} · {{ row.rateTypeName }}</div><div v-if="row.remark" class="schedule-chip-remark">备注：{{ row.remark }}</div></div>
            <el-button text type="primary" @click="openDialog({ scheduleDate: day.date })">+ 添加</el-button>
          </div>
        </div>
      </div>
      <el-table v-else :data="rows" stripe><el-table-column prop="scheduleDate" label="日期" /><el-table-column prop="employeeName" label="主播" /><el-table-column prop="platform" label="平台" /><el-table-column prop="accountLabel" label="直播平台" min-width="180" /><el-table-column label="时间"><template #default="s">{{ s.row.startTime }} - {{ s.row.endTime }}</template></el-table-column><el-table-column prop="rateTypeName" label="场次类型" /><el-table-column prop="remark" label="备注" /><el-table-column label="操作" width="140"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table>
    </el-card>
    <el-dialog v-model="dialog.open" class="schedule-dialog" :title="dialog.form.id ? '编辑排班' : '新增排班'" width="820px" append-to-body>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '128px' : '92px'">
        <div class="dialog-grid">
          <el-form-item label="日期" prop="scheduleDate"><el-date-picker v-model="dialog.form.scheduleDate" type="date" value-format="YYYY-MM-DD" :format="isEn ? 'MM/DD/YYYY' : 'YYYY-MM-DD'" @change="handleScheduleScopeChange" /></el-form-item>
          <el-form-item label="主播" prop="employeeId"><el-select v-model="dialog.form.employeeId" filterable @change="handleScheduleScopeChange"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
          <el-form-item label="直播平台" prop="accountId"><el-select v-model="dialog.form.accountId" @change="handleScheduleScopeChange"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
          <el-form-item label="场次类型" prop="rateTypeId">
            <div class="rate-type-field">
              <el-select v-model="dialog.form.rateTypeId" :loading="dialog.loadingRateTypes" :disabled="!hasScheduleRateScope" :placeholder="rateTypePlaceholder">
                <el-option v-for="v in dialog.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" />
              </el-select>
              <small v-if="hasScheduleRateScope && !dialog.loadingRateTypes && !dialog.rateTypes.length">请先在费率配置中启用该主播、直播平台和日期对应的场次类型</small>
            </div>
          </el-form-item>
          <el-form-item label="开始时间" prop="startTime"><el-time-picker v-model="dialog.form.startTime" value-format="HH:mm:ss" format="HH:mm" @change="formRef?.validateField('endTime')" /></el-form-item>
          <el-form-item label="结束时间" prop="endTime"><el-time-picker v-model="dialog.form.endTime" value-format="HH:mm:ss" format="HH:mm" /></el-form-item>
          <el-form-item class="wide" label="备注"><el-input v-model="dialog.form.remark" type="textarea" :rows="2" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <div class="schedule-dialog-footer">
          <el-button v-if="dialog.form.id" type="danger" plain @click="remove(dialog.form)">{{ tr('删除排班') }}</el-button>
          <div class="schedule-dialog-actions"><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" :disabled="dialog.loadingRateTypes" @click="submit">保存</el-button></div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addSchedule, deleteSchedule, getLiveOptions, listScheduleCalendar, listScheduleRateTypes, updateSchedule } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, isoDate, weekRange } from '../shared'
const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const loading = ref(false), view = ref('calendar'), formRef = ref()
const selectedWeek = ref(weekRange()[0]), query = reactive({ employeeId: null, accountId: null, rateTypeId: null })
const options = reactive({ employees: [], accounts: [], rateTypes: [] }), rows = ref([])
const dialog = reactive({ open: false, form: {}, rateTypes: [], loadingRateTypes: false })
let rateTypeRequestSequence = 0
const hasScheduleRateScope = computed(() => Boolean(dialog.form.scheduleDate && dialog.form.employeeId && dialog.form.accountId))
const rateTypePlaceholder = computed(() => {
  if (!hasScheduleRateScope.value) return '请先选择日期、主播和直播平台'
  if (dialog.loadingRateTypes) return '正在加载场次类型'
  return dialog.rateTypes.length ? '请选择场次类型' : '当前组合无已激活场次'
})
const validateEndTime = (_rule, value, callback) => {
  if (!value) return callback(new Error('请选择结束时间'))
  if (dialog.form.startTime && value <= dialog.form.startTime) return callback(new Error('结束时间必须晚于开始时间'))
  callback()
}
const rules = { scheduleDate: [{ required: true, message: '请选择日期' }], employeeId: [{ required: true, message: '请选择主播' }], accountId: [{ required: true, message: '请选择直播平台' }], rateTypeId: [{ required: true, message: '请选择场次类型' }], startTime: [{ required: true, message: '请选择开始时间' }], endTime: [{ validator: validateEndTime, trigger: 'change' }] }
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const weekDateRange = computed(() => {
  const selectedDate = parseLocalDate(selectedWeek.value)
  const sunday = new Date(selectedDate)
  sunday.setDate(selectedDate.getDate() - selectedDate.getDay())
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return [isoDate(sunday), isoDate(saturday)]
})
const days = computed(() => {
  const sunday = parseLocalDate(weekDateRange.value[0])
  return weekdays.map((_, index) => {
    const current = new Date(sunday)
    current.setDate(sunday.getDate() + index)
    const date = isoDate(current)
    return { key: date, date, month: current.getMonth() + 1, day: current.getDate(), today: date === isoDate() }
  })
})
const byDay = computed(() => rows.value.reduce((map, row) => ((map[row.scheduleDate] ||= []).push(row), map), {}))
function parseLocalDate(value) { const [year, month, day] = String(value).split('-').map(Number); return new Date(year, month - 1, day) }
function weekCellClassName(date) {
  const value = isoDate(date)
  if (value < weekDateRange.value[0] || value > weekDateRange.value[1]) return ''
  if (value === weekDateRange.value[0]) return 'schedule-week-cell schedule-week-start'
  if (value === weekDateRange.value[1]) return 'schedule-week-cell schedule-week-end'
  return 'schedule-week-cell'
}
async function handleWeekChange() { selectedWeek.value = weekDateRange.value[0]; await load() }
async function load() { loading.value = true; try { const res = await listScheduleCalendar({ ...query, startDate: weekDateRange.value[0], endDate: weekDateRange.value[1] }); rows.value = res.data || [] } finally { loading.value = false } }
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
  dialog.form = { id: row.id, employeeName: row.employeeName || '', scheduleDate: row.scheduleDate || defaultScheduleDate(), employeeId: row.employeeId || null, accountId: row.accountId || null, rateTypeId: row.rateTypeId || null, startTime: row.startTime || '09:00:00', endTime: row.endTime || '17:00:00', remark: row.remark || '' }
  dialog.open = true
  await refreshScheduleRateTypes()
}
function shortTime(value) { return String(value || '').slice(0, 5) }
async function submit() { await formRef.value.validate(); await (dialog.form.id ? updateSchedule(dialog.form) : addSchedule(dialog.form)); proxy.$modal.msgSuccess('保存成功'); dialog.open = false; load() }
async function remove(row) { await proxy.$modal.confirm(`确认删除 ${row.employeeName} 的排班？`); await deleteSchedule(row.id); proxy.$modal.msgSuccess('删除成功'); dialog.open = false; load() }
function exportRows() { downloadCsv(`主播排班-${weekDateRange.value[0]}-${weekDateRange.value[1]}.csv`, [{ key: 'scheduleDate', label: '日期' }, { key: 'employeeName', label: '主播' }, { key: 'accountLabel', label: '直播平台' }, { key: 'startTime', label: '开始时间' }, { key: 'endTime', label: '结束时间' }, { key: 'rateTypeName', label: '场次类型' }, { key: 'remark', label: '备注' }], rows.value) }
onMounted(async () => { Object.assign(options, await getLiveOptions()); load() })
</script>
<style scoped lang="scss">
@import '../live.scss';
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
.week-calendar .calendar-day { min-height: 300px; padding: 12px; }
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
