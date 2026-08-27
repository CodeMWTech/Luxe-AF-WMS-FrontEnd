<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>排班计划</h2><p>灵活安排每日直播排班</p></div><div class="live-actions"><el-button @click="exportRows">导出 CSV</el-button><el-button type="primary" v-hasPermi="['wms:live:schedule:edit']" @click="openDialog()">新增排班</el-button></div></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item label="月份"><el-date-picker v-model="selectedMonth" type="month" value-format="YYYY-MM" :format="isEn ? 'MMMM YYYY' : 'YYYY年MM月'" :clearable="false" @change="load" /></el-form-item><el-form-item label="主播"><el-select v-model="query.employeeId" filterable clearable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item label="账号"><el-select v-model="query.accountId" clearable placeholder="全部账号"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item label="场次"><el-select v-model="query.rateTypeId" clearable placeholder="全部场次"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">查询</el-button><el-radio-group v-model="view"><el-radio-button label="calendar">日历</el-radio-button><el-radio-button label="list">列表</el-radio-button></el-radio-group></el-form-item></el-form></el-card>
    <el-card class="live-card" shadow="never" v-loading="loading">
      <div v-if="view === 'calendar'" class="month-calendar-wrap"><div class="month-calendar"><div v-for="weekday in weekdays" :key="weekday" class="month-weekday">{{ weekday }}</div><div v-for="day in days" :key="day.key" class="calendar-day" :class="{ 'is-empty': day.empty, 'is-today': day.today }"><template v-if="!day.empty"><div class="calendar-day-title"><span>{{ day.day }}</span><el-tag v-if="day.today" size="small" effect="plain">今天</el-tag></div><div v-for="row in byDay[day.date] || []" :key="row.id" class="schedule-chip" @click="openDialog(row)"><strong>{{ row.employeeName }}</strong><div>{{ row.accountLabel }}</div><div>{{ shortTime(row.startTime) }} - {{ shortTime(row.endTime) }} · {{ row.rateTypeName }}</div></div><el-button text type="primary" @click="openDialog({ scheduleDate: day.date })">+ 添加</el-button></template></div></div></div>
      <el-table v-else :data="rows" stripe><el-table-column prop="scheduleDate" label="日期" /><el-table-column prop="employeeName" label="主播" /><el-table-column prop="platform" label="平台" /><el-table-column prop="accountLabel" label="账号" min-width="180" /><el-table-column label="时间"><template #default="s">{{ s.row.startTime }} - {{ s.row.endTime }}</template></el-table-column><el-table-column prop="rateTypeName" label="场次类型" /><el-table-column prop="remark" label="备注" /><el-table-column label="操作" width="140"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table>
    </el-card>
    <el-dialog v-model="dialog.open" class="schedule-dialog" :title="dialog.form.id ? '编辑排班' : '新增排班'" width="760px" append-to-body><el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '124px' : '88px'"><div class="dialog-grid"><el-form-item label="日期" prop="scheduleDate"><el-date-picker v-model="dialog.form.scheduleDate" type="date" value-format="YYYY-MM-DD" /></el-form-item><el-form-item label="主播" prop="employeeId"><el-select v-model="dialog.form.employeeId" filterable><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item label="账号" prop="accountId"><el-select v-model="dialog.form.accountId"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item label="场次类型" prop="rateTypeId"><el-select v-model="dialog.form.rateTypeId"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item><el-form-item label="开始时间" prop="startTime"><el-time-picker v-model="dialog.form.startTime" value-format="HH:mm:ss" format="HH:mm" /></el-form-item><el-form-item label="结束时间" prop="endTime"><el-time-picker v-model="dialog.form.endTime" value-format="HH:mm:ss" format="HH:mm" /></el-form-item><el-form-item class="wide" label="备注"><el-input v-model="dialog.form.remark" /></el-form-item></div></el-form><template #footer><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template></el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addSchedule, deleteSchedule, getLiveOptions, listScheduleCalendar, updateSchedule } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, isoDate } from '../shared'
const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const loading = ref(false), view = ref('calendar'), formRef = ref()
const selectedMonth = ref(isoDate().slice(0, 7)), query = reactive({ employeeId: null, accountId: null, rateTypeId: null })
const options = reactive({ employees: [], accounts: [], rateTypes: [] }), rows = ref([])
const dialog = reactive({ open: false, form: {} })
const rules = { scheduleDate: [{ required: true, message: '请选择日期' }], employeeId: [{ required: true, message: '请选择主播' }], accountId: [{ required: true, message: '请选择账号' }], rateTypeId: [{ required: true, message: '请选择场次类型' }], startTime: [{ required: true, message: '请选择开始时间' }], endTime: [{ required: true, message: '请选择结束时间' }] }
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const monthDateRange = computed(() => { const [year, month] = selectedMonth.value.split('-').map(Number); return [isoDate(new Date(year, month - 1, 1)), isoDate(new Date(year, month, 0))] })
const days = computed(() => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const dayCount = new Date(year, month, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const cells = Array.from({ length: leading }, (_, index) => ({ key: `leading-${index}`, empty: true }))
  for (let day = 1; day <= dayCount; day++) {
    const date = isoDate(new Date(year, month - 1, day))
    cells.push({ key: date, date, day, today: date === isoDate() })
  }
  const trailing = (7 - cells.length % 7) % 7
  return cells.concat(Array.from({ length: trailing }, (_, index) => ({ key: `trailing-${index}`, empty: true })))
})
const byDay = computed(() => rows.value.reduce((map, row) => ((map[row.scheduleDate] ||= []).push(row), map), {}))
async function load() { loading.value = true; try { const res = await listScheduleCalendar({ ...query, startDate: monthDateRange.value[0], endDate: monthDateRange.value[1] }); rows.value = res.data || [] } finally { loading.value = false } }
function defaultScheduleDate() { return isoDate().startsWith(selectedMonth.value) ? isoDate() : monthDateRange.value[0] }
function openDialog(row = {}) { dialog.form = { id: row.id, scheduleDate: row.scheduleDate || defaultScheduleDate(), employeeId: row.employeeId || null, accountId: row.accountId || null, rateTypeId: row.rateTypeId || null, startTime: row.startTime || '09:00:00', endTime: row.endTime || '17:00:00', remark: row.remark || '' }; dialog.open = true }
function shortTime(value) { return String(value || '').slice(0, 5) }
async function submit() { await formRef.value.validate(); await (dialog.form.id ? updateSchedule(dialog.form) : addSchedule(dialog.form)); proxy.$modal.msgSuccess('保存成功'); dialog.open = false; load() }
async function remove(row) { await proxy.$modal.confirm(`确认删除 ${row.employeeName} 的排班？`); await deleteSchedule(row.id); proxy.$modal.msgSuccess('删除成功'); load() }
function exportRows() { downloadCsv(`主播排班-${selectedMonth.value}.csv`, [{ key: 'scheduleDate', label: '日期' }, { key: 'employeeName', label: '主播' }, { key: 'accountLabel', label: '账号' }, { key: 'startTime', label: '开始时间' }, { key: 'endTime', label: '结束时间' }, { key: 'rateTypeName', label: '场次类型' }, { key: 'remark', label: '备注' }], rows.value) }
onMounted(async () => { Object.assign(options, await getLiveOptions()); load() })
</script>
<style scoped lang="scss">
@import '../live.scss';
.month-calendar-wrap { overflow-x: auto; }
.month-calendar { display: grid; grid-template-columns: repeat(7, minmax(132px, 1fr)); gap: 8px; min-width: 980px; }
.month-weekday { padding: 4px 12px 10px; color: #7b8497; font-size: 13px; font-weight: 650; text-align: center; }
.month-calendar .calendar-day { min-height: 142px; padding: 10px; }
.month-calendar .calendar-day.is-empty { min-height: 142px; border-style: dashed; background: #f8f9fc; }
.month-calendar .calendar-day.is-today { border-color: #8fb4ff; box-shadow: inset 0 0 0 1px #8fb4ff; }
.month-calendar .calendar-day-title { display: flex; align-items: center; justify-content: space-between; }
.month-calendar .schedule-chip { padding: 7px; margin-bottom: 6px; }
</style>
<style lang="scss">
.schedule-dialog {
  width: min(760px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 20px 28px 8px; }
  .dialog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; }
  .el-form-item { min-width: 0; margin-bottom: 20px; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-select,
  .el-date-editor,
  .el-time-picker { width: 100%; }

  @media (max-width: 720px) {
    .el-dialog__body { padding: 16px 18px 6px; }
    .dialog-grid { grid-template-columns: 1fr; }
    .dialog-grid .wide { grid-column: auto; }
  }
}
</style>

