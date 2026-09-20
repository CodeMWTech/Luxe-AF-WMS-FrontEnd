<template>
  <div data-runtime-i18n-ignore="true" class="live-page">
    <div class="live-hero">
      <div><h2>{{ tr('汇总看板') }}</h2><p>{{ tr('查看核心运营指标与主播产出') }}</p></div>
      <div class="live-actions">
        <el-upload
          ref="attendanceUploadRef"
          :auto-upload="false"
          :show-file-list="false"
          accept=".xls,.xlsx"
          :on-change="handleAttendanceFile"
        >
          <el-button v-hasPermi="['wms:live:dashboard:import']" :loading="attendanceImporting">{{ tr('导入打卡 Excel') }}</el-button>
        </el-upload>
        <el-button type="primary" @click="exportSummary">{{ tr('导出 CSV') }}</el-button>
      </div>
    </div>
    <el-alert :closable="false" type="info" style="margin-bottom:16px" :title="tr('按入账日期统计：已确认调整 {0}，待确认调整 {1}。下方原业务薪酬保持原口径，结算金额以薪酬结算批次为准。', [money(data.overview?.confirmedAdjustments), money(data.overview?.pendingAdjustments)])" />
    <el-card class="live-filter" shadow="never">
      <el-form :inline="true">
        <el-form-item :label="tr('日期')"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" :range-separator="tr('至')" /></el-form-item>
        <el-form-item :label="tr('直播平台')"><LiveAccountSelect v-model="filters.accountId" clearable filterable :placeholder="tr('全部直播平台')" :accounts="options.accounts" /></el-form-item>
        <el-form-item :label="tr('主播')"><LiveEmployeeSelect v-model="filters.employeeId"   :placeholder="tr('全部主播')" :employees="options.employees" /></el-form-item>
        <el-form-item :label="tr('费率类型')"><el-select v-model="filters.rateTypeId" clearable :placeholder="tr('全部类型')"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="load">{{ tr('查询') }}</el-button><el-button @click="selectMonth(0)">{{ tr('本月') }}</el-button><el-button @click="selectMonth(-1)">{{ tr('上个月') }}</el-button></el-form-item>
      <el-form-item :label="tr('主播状态')"><el-select v-model="filters.employeeScope" @change="load"><el-option :label="tr('全部')" value="ALL" /><el-option :label="tr('在职/试用期')" value="ACTIVE" /><el-option :label="tr('已归档')" value="INACTIVE" /></el-select></el-form-item></el-form>
    </el-card>

    <div class="metric-grid" v-loading="loading">
      <el-card v-for="item in metrics" :key="item.label" class="metric-card" shadow="never">
        <div class="metric-label">{{ item.label }}</div><div class="metric-value">{{ item.value }}</div><div class="metric-hint">{{ item.hint }}</div>
      </el-card>
    </div>
    <el-card class="live-card" shadow="never" style="margin-bottom:20px">
      <template #header><span>{{ tr('特殊金额分类') }}</span></template>
      <el-space :size="28"><span class="positive">{{ tr('补贴类') }} {{ money(overview.subsidyAmount) }}</span><span class="negative">{{ tr('扣款类') }} {{ money(overview.deductionAmount) }}</span><strong>{{ tr('净') }} {{ money(overview.specialNet) }}</strong></el-space>
    </el-card>
    <div class="live-grid-2">
      <el-card class="live-card" shadow="never"><template #header>{{ tr('工时趋势') }}</template><div ref="trendEl" class="chart" /></el-card>
      <el-card class="live-card" shadow="never"><template #header>{{ tr('平台对比') }}</template><div ref="platformEl" class="chart" /></el-card>
    </div>
    <div class="live-grid-2">
      <el-card class="live-card" shadow="never">
        <template #header>{{ tr('按费率类型统计') }}</template>
        <el-table :data="data.rateStats" stripe><el-table-column prop="name" :label="tr('费率类型')" /><el-table-column prop="sessions" :label="tr('场次')" /><el-table-column prop="hours" :label="tr('工时')"><template #default="s">{{ Number(s.row.hours || 0).toFixed(2) }}h</template></el-table-column><el-table-column prop="compensation" :label="tr('薪酬')"><template #default="s">{{ money(s.row.compensation) }}</template></el-table-column></el-table>
      </el-card>
      <el-card class="live-card" shadow="never">
        <template #header>{{ tr('排班 vs 实际') }}</template>
        <el-table :data="data.attendance" stripe><el-table-column prop="employeeName" :label="tr('主播')" ><template #default="s"><LiveEmployeeName :name="s.row.employeeName" :status="s.row.employeeStatus" /></template></el-table-column><el-table-column prop="planned" :label="tr('计划场次')" /><el-table-column prop="actual" :label="tr('实际场次')" /><el-table-column prop="difference" :label="tr('差异')"><template #default="s"><span :class="s.row.difference >= 0 ? 'positive' : 'negative'">{{ s.row.difference > 0 ? '+' : '' }}{{ s.row.difference }}</span></template></el-table-column><el-table-column :label="tr('状态')"><template #default="s">{{ tr(s.row.status) }}</template></el-table-column></el-table>
      </el-card>
    </div>
    <el-card class="live-card checklist-card" shadow="never">
      <template #header>
        <div class="checklist-header">
          <div>
            <strong>{{ tr('每日核对清单') }}</strong>
            <div class="muted checklist-subtitle">{{ tr('按天核对排班和开播记录；异常包含时间不符、未录、多录，以及已录但未打卡') }}</div>
          </div>
          <div class="checklist-actions">
            <el-date-picker v-model="checklistDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" clearable :placeholder="tr('筛选日期')" style="width:145px" />
            <el-switch v-model="checklistOnlyAbnormal" :active-text="tr('仅看异常')" />
            <el-select v-model="checklistStatus" clearable :placeholder="tr('全部状态')" style="width:130px">
              <el-option v-for="status in checklistStatuses" :key="status" :label="tr(status)" :value="status" />
            </el-select>
            <el-button @click="exportChecklist">{{ tr('导出清单') }}</el-button>
          </div>
        </div>
      </template>
      <div class="checklist-summary">
        <el-tag type="success" effect="plain">{{ tr('已录') }} {{ checklistStats['已录'] }}</el-tag>
        <el-tag type="warning" effect="plain">{{ tr('时间不符') }} {{ checklistStats['时间不符'] }}</el-tag>
        <el-tag type="danger" effect="plain">{{ tr('未录') }} {{ checklistStats['未录'] }}</el-tag>
        <el-tag type="info" effect="plain">{{ tr('多录') }} {{ checklistStats['多录'] }}</el-tag>
        <el-tag type="success" effect="plain">{{ tr('已打卡') }} {{ checklistStats.clocked }}</el-tag>
        <el-tag type="danger" effect="plain">{{ tr('未打卡') }} {{ checklistStats.notClocked }}</el-tag>
      </div>
      <el-table :data="filteredChecklist" stripe :empty-text="tr('当前筛选范围内没有核对记录')">
        <el-table-column prop="date" :label="tr('日期')" :min-width="isEn ? 145 : 120" sortable><template #default="s">{{ displayDate(s.row.date) }}</template></el-table-column>
        <el-table-column prop="employeeName" :label="tr('主播')" min-width="110" ><template #default="s"><LiveEmployeeName :name="s.row.employeeName" :status="s.row.employeeStatus" /></template></el-table-column>
        <el-table-column :label="tr('直播平台')" min-width="220">
          <template #default="s"><LivePlatformTag :account="s.row" :accounts="options.accounts" /></template>
        </el-table-column>
        <el-table-column :label="tr('计划时间')" :min-width="isEn ? 155 : 130"><template #default="s">{{ timeRange(s.row.plannedStartTime, s.row.plannedEndTime) }}</template></el-table-column>
        <el-table-column :label="tr('实际时间')" :min-width="isEn ? 155 : 130"><template #default="s">{{ timeRange(s.row.actualStartTime, s.row.actualEndTime) }}</template></el-table-column>
        <el-table-column :label="tr('是否打卡')" :min-width="isEn ? 145 : 100" align="center">
          <template #default="s"><el-tag :type="s.row.clocked ? 'success' : 'danger'" effect="light">{{ s.row.clocked ? tr('是') : tr('否') }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="tr('状态')" :min-width="isEn ? 145 : 110" align="center">
          <template #default="s"><el-tag :type="statusTagType(s.row.status)" effect="plain">{{ tr(s.row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="tr('操作')" :min-width="isEn ? 145 : 80" align="center">
          <template #default="s"><el-button link type="primary" @click="goToRecord(s.row)">{{ tr('查看') }}</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-card class="live-card" shadow="never">
      <template #header>{{ tr('主播汇总 · 总薪酬 = 开播薪酬 + 佣金收入') }}</template>
      <el-table :data="data.employeeSummary" stripe>
        <el-table-column type="index" :label="tr('排名')" :min-width="isEn ? 145 : 70" /><el-table-column prop="employeeName" :label="tr('主播')" ><template #default="s"><LiveEmployeeName :name="s.row.employeeName" :status="s.row.employeeStatus" /></template></el-table-column><el-table-column prop="sessions" :label="tr('总场次')" /><el-table-column prop="hours" :label="tr('总工时')"><template #default="s">{{ Number(s.row.hours || 0).toFixed(2) }}h</template></el-table-column><el-table-column prop="megaSessions" :label="tr('MEGA场次')" /><el-table-column :label="tr('开播薪酬')"><template #default="s">{{ money(s.row.streamCompensation) }}</template></el-table-column><el-table-column :label="tr('佣金收入')"><template #default="s">{{ money(s.row.commissionIncome) }}</template></el-table-column><el-table-column :label="tr('总薪酬')"><template #default="s"><strong>{{ money(s.row.totalCompensation) }}</strong></template></el-table-column><el-table-column :label="tr('占比')"><template #default="s">{{ s.row.share }}%</template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import LiveAccountSelect from '../components/LiveAccountSelect.vue'
import LivePlatformTag from '../components/LivePlatformTag.vue'
import { useLiveI18n } from '../useLiveI18n'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import LiveEmployeeName from '../components/LiveEmployeeName.vue'
import { watch, onActivated, computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getDashboard, getLiveOptions, importAttendance } from '@/api/wms/livePayroll'
import { accountLabel, displayDate, downloadCsv, LIVE_DATE_FORMAT, money, monthRange } from '../shared'
const { tr, isEn, messageNode } = useLiveI18n()
const router = useRouter()

const loading = ref(false)
const dateRange = ref(monthRange())
const filters = reactive({ employeeScope:'ALL', employeeId: null, accountId: null, rateTypeId: null })
const options = reactive({ employees: [], accounts: [], rateTypes: [] })
const data = reactive({ overview: {}, rateStats: [], dailyTrend: [], platformStats: [], employeeSummary: [], attendance: [], dailyChecklist: [] })
const overview = computed(() => data.overview || {})
const attendanceUploadRef = ref()
const attendanceImporting = ref(false)
const checklistDate = ref('')
const checklistOnlyAbnormal = ref(false)
const checklistStatus = ref('')
const checklistStatuses = ['已录', '时间不符', '未录', '多录']
const checklistDateRows = computed(() => (data.dailyChecklist || []).filter(row => !checklistDate.value || row.date === checklistDate.value))
const checklistStats = computed(() => {
  const stats = { '已录': 0, '时间不符': 0, '未录': 0, '多录': 0, clocked: 0, notClocked: 0 }
  checklistDateRows.value.forEach(row => {
    if (stats[row.status] !== undefined) stats[row.status]++
    row.clocked ? stats.clocked++ : stats.notClocked++
  })
  return stats
})
const filteredChecklist = computed(() => checklistDateRows.value.filter(row => {
  if (checklistOnlyAbnormal.value && row.status === '已录' && row.clocked) return false
  return !checklistStatus.value || row.status === checklistStatus.value
}))
const trendEl = ref(), platformEl = ref()
let trendChart, platformChart
const metrics = computed(() => [
  { label: tr('总开播场次'), value: overview.value.totalSessions || 0, hint: `${displayDate(dateRange.value[0])} ~ ${displayDate(dateRange.value[1])}` },
  { label: tr('总工时'), value: `${Number(overview.value.totalHours || 0).toFixed(2)}h`, hint: tr('按实际开播汇总') },
  { label: tr('开播薪酬'), value: money(overview.value.streamCompensation), hint: tr('含特殊金额') },
  { label: tr('佣金收入'), value: money(overview.value.commissionIncome), hint: tr('仅正常销售') },
  { label: tr('总薪酬'), value: money(overview.value.totalCompensation), hint: tr('开播薪酬 + 佣金') },
  { label: tr('MEGA场次'), value: overview.value.megaSessions || 0, hint: tr('大促/高流量场次') },
  { label: tr('平均时薪'), value: money(overview.value.averageHourlyRate), hint: tr('基础薪酬 / 总工时') }
])

async function load() {
  loading.value = true
  try {
    Object.assign(options, await getLiveOptions())
    const res = await getDashboard({ ...filters, startDate: dateRange.value[0], endDate: dateRange.value[1] })
    Object.assign(data, res.data || {})
    await nextTick(); renderCharts()
  } finally { loading.value = false }
}
function selectMonth(offset) { dateRange.value = monthRange(offset); checklistDate.value = ''; load() }
function renderCharts() {
  trendChart ||= echarts.init(trendEl.value); platformChart ||= echarts.init(platformEl.value)
  trendChart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 36 }, xAxis: { type: 'category', data: data.dailyTrend.map(v => displayDate(v.name)) }, yAxis: { type: 'value' }, series: [{ name: tr('工时'), type: 'line', smooth: true, areaStyle: { opacity: .12 }, itemStyle: { color: '#3563e9' }, data: data.dailyTrend.map(v => Number(v.hours || 0)) }] })
  platformChart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 56, right: 18, top: 24, bottom: 36 }, xAxis: { type: 'category', data: data.platformStats.map(v => v.name) }, yAxis: { type: 'value' }, series: [{ name: tr('薪酬'), type: 'bar', barWidth: 36, itemStyle: { color: '#6c8df4', borderRadius: [7, 7, 0, 0] }, data: data.platformStats.map(v => Number(v.compensation || 0)) }] })
}
async function handleAttendanceFile(uploadFile) {
  if (!uploadFile.raw) return
  attendanceImporting.value = true
  try {
    const form = new FormData()
    form.append('file', uploadFile.raw)
    const res = await importAttendance(form)
    const result = res.data || {}
    ElMessage.success(messageNode(tr('打卡导入完成：{0} 条（新增 {1}，更新 {2}）', [result.imported || 0, result.created || 0, result.updated || 0])))
    if (result.unmatchedEmployees?.length) {
      ElMessage.warning(messageNode(tr('未匹配员工：{0}', [result.unmatchedEmployees.join('、')])))
    }
    await load()
  } finally {
    attendanceImporting.value = false
    attendanceUploadRef.value?.clearFiles()
  }
}
function timeRange(start, end) {
  if (!start && !end) return '—'
  const display = value => value ? String(value).slice(0, 5) : '—'
  return `${display(start)}-${display(end)}`
}
function statusTagType(status) {
  return status === '已录' ? 'success' : status === '时间不符' ? 'warning' : status === '未录' ? 'danger' : 'info'
}
function goToRecord(row) {
  const path = row.status === '多录' ? '/live-payroll/streams' : '/live-payroll/schedule'
  router.push({ path, query: { date: row.date, employeeId: row.employeeId, accountId: row.accountId } })
}
function exportSummary() { downloadCsv(tr('主播薪酬汇总-{0}-{1}.csv', [dateRange.value[0], dateRange.value[1]]), [{ key: 'employeeName', label: tr('主播') }, { key: 'sessions', label: tr('场次') }, { key: 'hours', label: tr('工时') }, { key: 'streamCompensation', label: tr('开播薪酬') }, { key: 'commissionIncome', label: tr('佣金') }, { key: 'totalCompensation', label: tr('总薪酬') }], data.employeeSummary) }
function exportChecklist() {
  const rows = filteredChecklist.value.map(row => ({
    ...row,
    date: displayDate(row.date),
    plannedTime: timeRange(row.plannedStartTime, row.plannedEndTime),
    actualTime: timeRange(row.actualStartTime, row.actualEndTime),
    status: tr(row.status), clockedLabel: tr(row.clocked ? '是' : '否')
  }))
  const filenameRange = checklistDate.value || `${dateRange.value[0]}-${dateRange.value[1]}`
  downloadCsv(tr('每日核对清单-{0}.csv', [filenameRange]), [
    { key: 'date', label: tr('日期') }, { key: 'employeeName', label: tr('主播') }, { key: 'accountLabel', label: tr('直播平台') },
    { key: 'plannedTime', label: tr('计划时间') }, { key: 'actualTime', label: tr('实际时间') },
    { key: 'clockedLabel', label: tr('是否打卡') }, { key: 'status', label: tr('状态') }
  ], rows)
}
watch(isEn, () => { if (trendChart && platformChart) renderCharts() })
function resize() { trendChart?.resize(); platformChart?.resize() }
onMounted(async () => { Object.assign(options, await getLiveOptions()); await load(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); trendChart?.dispose(); platformChart?.dispose() })
onActivated(async () => { Object.assign(options, await getLiveOptions()) })
</script>

<style scoped lang="scss">
@import '../live.scss';

.checklist-card { margin-bottom: 20px; }
.checklist-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.checklist-subtitle { margin-top: 5px; font-size: 12px; font-weight: 400; }
.checklist-actions, .checklist-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.checklist-summary { margin-bottom: 14px; }

@media (max-width: 780px) {
  .checklist-header { align-items: flex-start; flex-direction: column; }
}
</style>
