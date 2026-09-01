<template>
  <div class="live-page">
    <div class="live-hero">
      <div><h2>汇总看板</h2><p>查看核心运营指标与主播产出</p></div>
      <div class="live-actions">
        <el-upload
          ref="attendanceUploadRef"
          :auto-upload="false"
          :show-file-list="false"
          accept=".xls,.xlsx"
          :on-change="handleAttendanceFile"
        >
          <el-button v-hasPermi="['wms:live:dashboard:import']" :loading="attendanceImporting">导入打卡 Excel</el-button>
        </el-upload>
        <el-button type="primary" @click="exportSummary">导出 CSV</el-button>
      </div>
    </div>
    <el-card class="live-filter" shadow="never">
      <el-form :inline="true">
        <el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" /></el-form-item>
        <el-form-item label="直播平台"><el-select v-model="filters.accountId" clearable filterable placeholder="全部直播平台"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
        <el-form-item label="主播"><el-select v-model="filters.employeeId" clearable filterable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
        <el-form-item label="费率类型"><el-select v-model="filters.rateTypeId" clearable placeholder="全部类型"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="selectMonth(0)">本月</el-button><el-button @click="selectMonth(-1)">上个月</el-button></el-form-item>
      </el-form>
    </el-card>

    <div class="metric-grid" v-loading="loading">
      <el-card v-for="item in metrics" :key="item.label" class="metric-card" shadow="never">
        <div class="metric-label">{{ item.label }}</div><div class="metric-value">{{ item.value }}</div><div class="metric-hint">{{ item.hint }}</div>
      </el-card>
    </div>
    <el-card class="live-card" shadow="never" style="margin-bottom:16px">
      <template #header><span>特殊金额分类</span></template>
      <el-space :size="28"><span class="positive">补贴类 {{ money(overview.subsidyAmount) }}</span><span class="negative">扣款类 {{ money(overview.deductionAmount) }}</span><strong>净 {{ money(overview.specialNet) }}</strong></el-space>
    </el-card>
    <div class="live-grid-2">
      <el-card class="live-card" shadow="never"><template #header>工时趋势</template><div ref="trendEl" class="chart" /></el-card>
      <el-card class="live-card" shadow="never"><template #header>平台对比</template><div ref="platformEl" class="chart" /></el-card>
    </div>
    <div class="live-grid-2">
      <el-card class="live-card" shadow="never">
        <template #header>按费率类型统计</template>
        <el-table :data="data.rateStats" stripe><el-table-column prop="name" label="费率类型" /><el-table-column prop="sessions" label="场次" /><el-table-column prop="hours" label="工时"><template #default="s">{{ Number(s.row.hours || 0).toFixed(2) }}h</template></el-table-column><el-table-column prop="compensation" label="薪酬"><template #default="s">{{ money(s.row.compensation) }}</template></el-table-column></el-table>
      </el-card>
      <el-card class="live-card" shadow="never">
        <template #header>排班 vs 实际</template>
        <el-table :data="data.attendance" stripe><el-table-column prop="employeeName" label="主播" /><el-table-column prop="planned" label="计划场次" /><el-table-column prop="actual" label="实际场次" /><el-table-column prop="difference" label="差异"><template #default="s"><span :class="s.row.difference >= 0 ? 'positive' : 'negative'">{{ s.row.difference > 0 ? '+' : '' }}{{ s.row.difference }}</span></template></el-table-column><el-table-column label="状态"><template #default="s">{{ tr(s.row.status) }}</template></el-table-column></el-table>
      </el-card>
    </div>
    <el-card class="live-card checklist-card" shadow="never">
      <template #header>
        <div class="checklist-header">
          <div>
            <strong>每日核对清单</strong>
            <div class="muted checklist-subtitle">按天核对排班和开播记录；异常包含时间不符、未录、多录，以及已录但未打卡</div>
          </div>
          <div class="checklist-actions">
            <el-date-picker v-model="checklistDate" type="date" value-format="YYYY-MM-DD" clearable placeholder="筛选日期" style="width:145px" />
            <el-switch v-model="checklistOnlyAbnormal" active-text="仅看异常" />
            <el-select v-model="checklistStatus" clearable placeholder="全部状态" style="width:130px">
              <el-option v-for="status in checklistStatuses" :key="status" :label="status" :value="status" />
            </el-select>
            <el-button @click="exportChecklist">导出清单</el-button>
          </div>
        </div>
      </template>
      <div class="checklist-summary">
        <el-tag type="success" effect="plain">已录 {{ checklistStats['已录'] }}</el-tag>
        <el-tag type="warning" effect="plain">时间不符 {{ checklistStats['时间不符'] }}</el-tag>
        <el-tag type="danger" effect="plain">未录 {{ checklistStats['未录'] }}</el-tag>
        <el-tag type="info" effect="plain">多录 {{ checklistStats['多录'] }}</el-tag>
        <el-tag type="success" effect="plain">已打卡 {{ checklistStats.clocked }}</el-tag>
        <el-tag type="danger" effect="plain">未打卡 {{ checklistStats.notClocked }}</el-tag>
      </div>
      <el-table :data="filteredChecklist" stripe empty-text="当前筛选范围内没有核对记录">
        <el-table-column prop="date" label="日期" width="120" sortable />
        <el-table-column prop="employeeName" label="主播" min-width="110" />
        <el-table-column label="直播平台" min-width="220">
          <template #default="s">{{ s.row.accountLabel }}<span v-if="s.row.platform" class="muted"> ({{ s.row.platform }})</span></template>
        </el-table-column>
        <el-table-column label="计划时间" width="130"><template #default="s">{{ timeRange(s.row.plannedStartTime, s.row.plannedEndTime) }}</template></el-table-column>
        <el-table-column label="实际时间" width="130"><template #default="s">{{ timeRange(s.row.actualStartTime, s.row.actualEndTime) }}</template></el-table-column>
        <el-table-column label="是否打卡" width="100" align="center">
          <template #default="s"><el-tag :type="s.row.clocked ? 'success' : 'danger'" effect="light">{{ s.row.clocked ? '是' : '否' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="s"><el-tag :type="statusTagType(s.row.status)" effect="plain">{{ s.row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="s"><el-button link type="primary" @click="goToRecord(s.row)">查看</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-card class="live-card" shadow="never">
      <template #header>主播汇总 · 总薪酬 = 开播薪酬 + 佣金收入</template>
      <el-table :data="data.employeeSummary" stripe>
        <el-table-column type="index" label="排名" width="70" /><el-table-column prop="employeeName" label="主播" /><el-table-column prop="sessions" label="总场次" /><el-table-column prop="hours" label="总工时"><template #default="s">{{ Number(s.row.hours || 0).toFixed(2) }}h</template></el-table-column><el-table-column prop="megaSessions" label="MEGA场次" /><el-table-column label="开播薪酬"><template #default="s">{{ money(s.row.streamCompensation) }}</template></el-table-column><el-table-column label="佣金收入"><template #default="s">{{ money(s.row.commissionIncome) }}</template></el-table-column><el-table-column label="总薪酬"><template #default="s"><strong>{{ money(s.row.totalCompensation) }}</strong></template></el-table-column><el-table-column label="占比"><template #default="s">{{ s.row.share }}%</template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getDashboard, getLiveOptions, importAttendance } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, money, monthRange } from '../shared'

const settingsStore = useSettingsStore()
const router = useRouter()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const loading = ref(false)
const dateRange = ref(monthRange())
const filters = reactive({ employeeId: null, accountId: null, rateTypeId: null })
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
  { label: '总开播场次', value: overview.value.totalSessions || 0, hint: `${dateRange.value[0]} ~ ${dateRange.value[1]}` },
  { label: '总工时', value: `${Number(overview.value.totalHours || 0).toFixed(2)}h`, hint: '按实际开播汇总' },
  { label: '开播薪酬', value: money(overview.value.streamCompensation), hint: '含特殊金额' },
  { label: '佣金收入', value: money(overview.value.commissionIncome), hint: '仅正常销售' },
  { label: '总薪酬', value: money(overview.value.totalCompensation), hint: '开播薪酬 + 佣金' },
  { label: 'MEGA场次', value: overview.value.megaSessions || 0, hint: '大促/高流量场次' },
  { label: '平均时薪', value: money(overview.value.averageHourlyRate), hint: '基础薪酬 / 总工时' }
])

async function load() {
  loading.value = true
  try {
    const res = await getDashboard({ ...filters, startDate: dateRange.value[0], endDate: dateRange.value[1] })
    Object.assign(data, res.data || {})
    await nextTick(); renderCharts()
  } finally { loading.value = false }
}
function selectMonth(offset) { dateRange.value = monthRange(offset); checklistDate.value = ''; load() }
function renderCharts() {
  trendChart ||= echarts.init(trendEl.value); platformChart ||= echarts.init(platformEl.value)
  trendChart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 36 }, xAxis: { type: 'category', data: data.dailyTrend.map(v => v.name) }, yAxis: { type: 'value' }, series: [{ type: 'line', smooth: true, areaStyle: { opacity: .12 }, itemStyle: { color: '#3563e9' }, data: data.dailyTrend.map(v => Number(v.hours || 0)) }] })
  platformChart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 56, right: 18, top: 24, bottom: 36 }, xAxis: { type: 'category', data: data.platformStats.map(v => v.name) }, yAxis: { type: 'value' }, series: [{ type: 'bar', barWidth: 36, itemStyle: { color: '#6c8df4', borderRadius: [7, 7, 0, 0] }, data: data.platformStats.map(v => Number(v.compensation || 0)) }] })
}
async function handleAttendanceFile(uploadFile) {
  if (!uploadFile.raw) return
  attendanceImporting.value = true
  try {
    const form = new FormData()
    form.append('file', uploadFile.raw)
    const res = await importAttendance(form)
    const result = res.data || {}
    ElMessage.success(`打卡导入完成：${result.imported || 0} 条（新增 ${result.created || 0}，更新 ${result.updated || 0}）`)
    if (result.unmatchedEmployees?.length) {
      ElMessage.warning(`未匹配员工：${result.unmatchedEmployees.join('、')}`)
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
function exportSummary() { downloadCsv(`主播薪酬汇总-${dateRange.value[0]}-${dateRange.value[1]}.csv`, [{ key: 'employeeName', label: '主播' }, { key: 'sessions', label: '场次' }, { key: 'hours', label: '工时' }, { key: 'streamCompensation', label: '开播薪酬' }, { key: 'commissionIncome', label: '佣金' }, { key: 'totalCompensation', label: '总薪酬' }], data.employeeSummary) }
function exportChecklist() {
  const rows = filteredChecklist.value.map(row => ({
    ...row,
    plannedTime: timeRange(row.plannedStartTime, row.plannedEndTime),
    actualTime: timeRange(row.actualStartTime, row.actualEndTime),
    clockedLabel: row.clocked ? '是' : '否'
  }))
  const filenameRange = checklistDate.value || `${dateRange.value[0]}-${dateRange.value[1]}`
  downloadCsv(`每日核对清单-${filenameRange}.csv`, [
    { key: 'date', label: '日期' }, { key: 'employeeName', label: '主播' }, { key: 'accountLabel', label: '直播平台' },
    { key: 'plannedTime', label: '计划时间' }, { key: 'actualTime', label: '实际时间' },
    { key: 'clockedLabel', label: '是否打卡' }, { key: 'status', label: '状态' }
  ], rows)
}
function resize() { trendChart?.resize(); platformChart?.resize() }
onMounted(async () => { Object.assign(options, await getLiveOptions()); await load(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); trendChart?.dispose(); platformChart?.dispose() })
</script>

<style scoped lang="scss">
@import '../live.scss';

.checklist-card { margin-bottom: 16px; }
.checklist-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.checklist-subtitle { margin-top: 5px; font-size: 12px; font-weight: 400; }
.checklist-actions, .checklist-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.checklist-summary { margin-bottom: 14px; }

@media (max-width: 780px) {
  .checklist-header { align-items: flex-start; flex-direction: column; }
}
</style>
