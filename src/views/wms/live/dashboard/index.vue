<template>
  <div class="live-page">
    <div class="live-hero">
      <div><h2>汇总看板</h2><p>查看核心运营指标与主播产出</p></div>
      <el-button type="primary" @click="exportSummary">导出 CSV</el-button>
    </div>
    <el-card class="live-filter" shadow="never">
      <el-form :inline="true">
        <el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" /></el-form-item>
        <el-form-item label="账号"><el-select v-model="filters.accountId" clearable filterable placeholder="全部账号"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
        <el-form-item label="主播"><el-select v-model="filters.employeeId" clearable filterable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
        <el-form-item label="费率类型"><el-select v-model="filters.rateTypeId" clearable placeholder="全部类型"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">本月</el-button></el-form-item>
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
import * as echarts from 'echarts'
import { getDashboard, getLiveOptions } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, money, monthRange } from '../shared'

const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const loading = ref(false)
const dateRange = ref(monthRange())
const filters = reactive({ employeeId: null, accountId: null, rateTypeId: null })
const options = reactive({ employees: [], accounts: [], rateTypes: [] })
const data = reactive({ overview: {}, rateStats: [], dailyTrend: [], platformStats: [], employeeSummary: [], attendance: [] })
const overview = computed(() => data.overview || {})
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
function reset() { dateRange.value = monthRange(); Object.assign(filters, { employeeId: null, accountId: null, rateTypeId: null }); load() }
function renderCharts() {
  trendChart ||= echarts.init(trendEl.value); platformChart ||= echarts.init(platformEl.value)
  trendChart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 36 }, xAxis: { type: 'category', data: data.dailyTrend.map(v => v.name) }, yAxis: { type: 'value' }, series: [{ type: 'line', smooth: true, areaStyle: { opacity: .12 }, itemStyle: { color: '#3563e9' }, data: data.dailyTrend.map(v => Number(v.hours || 0)) }] })
  platformChart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 56, right: 18, top: 24, bottom: 36 }, xAxis: { type: 'category', data: data.platformStats.map(v => v.name) }, yAxis: { type: 'value' }, series: [{ type: 'bar', barWidth: 36, itemStyle: { color: '#6c8df4', borderRadius: [7, 7, 0, 0] }, data: data.platformStats.map(v => Number(v.compensation || 0)) }] })
}
function exportSummary() { downloadCsv(`主播薪酬汇总-${dateRange.value[0]}-${dateRange.value[1]}.csv`, [{ key: 'employeeName', label: '主播' }, { key: 'sessions', label: '场次' }, { key: 'hours', label: '工时' }, { key: 'streamCompensation', label: '开播薪酬' }, { key: 'commissionIncome', label: '佣金' }, { key: 'totalCompensation', label: '总薪酬' }], data.employeeSummary) }
function resize() { trendChart?.resize(); platformChart?.resize() }
onMounted(async () => { Object.assign(options, await getLiveOptions()); await load(); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { window.removeEventListener('resize', resize); trendChart?.dispose(); platformChart?.dispose() })
</script>

<style scoped lang="scss">@import '../live.scss';</style>
