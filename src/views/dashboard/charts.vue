<template>
  <div class="dashboard-page" v-loading="loading">
    <div class="kpi-grid">
      <el-card v-for="card in kpiCards" :key="card.title" shadow="never" class="kpi-card">
        <div class="kpi-content">
          <div class="kpi-icon" :class="card.iconClass">
            <component :is="card.icon" />
          </div>
          <div class="kpi-main">
            <div class="kpi-title">
              <span>{{ card.title }}</span>
              <el-tooltip v-if="card.tip" :content="card.tip" placement="top">
                <el-icon class="kpi-tip-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="kpi-value-row">
              <span class="kpi-value">{{ card.value }}</span>
              <span class="kpi-unit" v-if="card.unit">{{ card.unit }}</span>
              <el-tag v-if="card.tag" size="small" type="danger" effect="light">{{ card.tag }}</el-tag>
            </div>
            <div v-if="card.subText" class="kpi-sub">{{ card.subText }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <div class="panel-grid">
      <el-card shadow="never" class="panel-card brand-analysis-card">
        <div class="brand-card-head">
          <div>
            <div class="brand-title">
              <span>{{ tr('Brand 库存占比分析') }}</span>
            </div>
            <div class="brand-subtitle">{{ tr('全部仓库内不同 Brand 的库存价值占比及具体数量') }}</div>
          </div>
        </div>
        <div class="brand-analysis-body">
          <div ref="brandPieRef" class="brand-chart"></div>
          <div class="brand-summary-side">
            <div class="brand-table-head">
              <span>{{ tr('品牌') }}</span>
              <span>{{ tr('数量') }}</span>
            </div>
            <div class="brand-legend-grid">
              <div v-for="row in brandChartRows" :key="row.name" class="brand-legend-item">
                <span class="legend-left">
                  <i class="dot" :style="{ backgroundColor: row.color }"></i>
                  <span class="legend-name">{{ row.name }}</span>
                </span>
                <span>{{ formatNumber(row.value) }}{{ tr('件') }}</span>
              </div>
            </div>
            <button type="button" class="view-all-brand" @click="openAllBrandDialog">
              <span>{{ tr('查看全部品牌') }}</span>
              <b>{{ brandRows.length }}</b>
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card brand-analysis-card">
        <div class="brand-card-head">
          <div>
            <div class="brand-title">
              <span>{{ tr('库存周转天数分布') }}</span>
            </div>
            <div class="brand-subtitle">{{ tr('按周转周期分组，突出高周转与滞销库存') }}</div>
          </div>
        </div>
        <div ref="turnoverBarRef" class="chart-box turnover-chart"></div>
        <div
          v-if="slowMovingInsight.text"
          class="panel-warning"
          :class="`panel-warning--${slowMovingInsight.type}`"
        >
          {{ slowMovingInsight.text }}
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card brand-analysis-card">
        <div class="brand-card-head">
          <div>
            <div class="brand-title">
              <span>{{ tr('商品入库价区间分布') }}</span>
            </div>
            <div class="brand-subtitle">{{ tr('固定按 SKU 入库价展示当前有效库存的数量与入库价值') }}</div>
          </div>
        </div>
        <div class="value-analysis-body">
          <div ref="valueBarRef" class="chart-box medium value-chart"></div>
          <div class="value-insight-side">
            <div class="brand-table-head">
              <span>{{ tr('入库价结构') }}</span>
              <span>{{ tr('表现') }}</span>
            </div>
            <div class="value-insight-row">
              <span>{{ tr('主力入库价带') }}</span>
              <b>{{ valueRangeInsight.dominantLabel }}</b>
            </div>
            <div class="value-insight-row">
              <span>{{ tr('覆盖库存') }}</span>
              <b>{{ formatNumber(valueRangeInsight.totalQty) }}{{ tr('件') }}</b>
            </div>
            <div class="value-insight-row">
              <span>{{ tr('入库价5000以上库存占比') }}</span>
              <b>{{ valueRangeInsight.highRate }}%</b>
            </div>
            <div v-if="valueRangeInsight.advice" class="value-advice">{{ valueRangeInsight.advice }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card brand-analysis-card profit-analysis-card">
        <div class="brand-card-head">
          <div>
            <div class="brand-title">
              <span>{{ tr('毛利润趋势分析') }}</span>
            </div>
            <div class="brand-subtitle">{{ tr('追踪毛利润金额变化，支持预设周期与时间段对比') }}</div>
          </div>
        </div>
        <div class="profit-filter-panel">
          <el-form :inline="true" class="analytics-filter" @submit.prevent>
            <el-form-item :label="tr('毛利润模式')">
              <el-radio-group v-model="filters.profitMode" size="default">
                <el-radio-button label="preset">{{ tr('预设周期') }}</el-radio-button>
                <el-radio-button label="compare">{{ tr('时间段对比') }}</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="filters.profitMode === 'preset'" :label="tr('周期')">
              <el-select v-model="filters.rangeType" style="width: 140px">
                <el-option :label="tr('过去7天')" value="week" />
                <el-option :label="tr('过去15天')" value="halfMonth" />
                <el-option :label="tr('过去4周')" value="month" />
                <el-option :label="tr('过去3个月')" value="quarter" />
              </el-select>
            </el-form-item>
            <div v-if="filters.profitMode === 'compare'" class="profit-filter-break"></div>
            <el-form-item v-if="filters.profitMode === 'compare'" class="profit-date-item" :label="tr('时间段A')">
              <el-date-picker
                v-model="periodADateRangeModel"
                type="daterange"
                :range-separator="tr('至')"
                :start-placeholder="tr('开始日期')"
                :end-placeholder="tr('结束日期')"
                format="MM/DD/YYYY"
                value-format="YYYY-MM-DD"
                clearable
                style="width: 390px"
              />
            </el-form-item>
            <el-form-item v-if="filters.profitMode === 'compare'" class="profit-date-item" :label="tr('时间段B')">
              <el-date-picker
                v-model="periodBDateRangeModel"
                type="daterange"
                :range-separator="tr('至')"
                :start-placeholder="tr('开始日期')"
                :end-placeholder="tr('结束日期')"
                format="MM/DD/YYYY"
                value-format="YYYY-MM-DD"
                clearable
                style="width: 390px"
              />
            </el-form-item>
          </el-form>
          <div class="compare-toolbar">
            <div class="toolbar-item">
            {{ tr('预设周期展示单条利润金额趋势；时间段对比按第 N 天对齐展示两条线。') }}
          </div>
          </div>
        </div>
        <div class="compare-kpis">
          <div class="mini-kpi">
            <div>{{ tr('毛利润合计') }}</div>
            <b class="positive">{{ formatMoneyStr(profitSummary.total) }}</b>
          </div>
          <div class="mini-kpi">
            <div>{{ tr(filters.profitMode === 'compare' ? '时间段A利润' : '最高利润金额') }}</div>
            <b>{{ formatMoneyStr(profitSummary.primary) }}</b>
          </div>
          <div class="mini-kpi">
            <div>{{ tr(filters.profitMode === 'compare' ? '时间段B利润' : '最低利润金额') }}</div>
            <b>{{ formatMoneyStr(profitSummary.secondary) }}</b>
          </div>
          <div class="mini-kpi">
            <div>{{ tr('数据点') }}</div>
            <b>{{ profitSummary.count }}</b>
          </div>
        </div>
        <div ref="profitLineRef" class="chart-box medium profit-chart"></div>
      </el-card>
    </div>

    <el-dialog
      v-model="allBrandDialogVisible"
      class="all-brand-dialog"
      width="860px"
      :show-close="false"
      append-to-body
    >
      <template #header>
        <div class="all-brand-header">
          <span>{{ tr('全部品牌') }}</span>
          <button type="button" @click="allBrandDialogVisible = false">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </template>
      <div class="all-brand-toolbar">
        <el-input v-model="brandSearchKeyword" clearable :placeholder="tr('搜索 Brand')" class="brand-search">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="allBrandSort" class="brand-sort">
          <template #prefix>
            <el-icon><Sort /></el-icon>
          </template>
          <el-option :label="tr('按数量降序')" value="quantityDesc" />
          <el-option :label="tr('按数量升序')" value="quantityAsc" />
          <el-option :label="tr('按库存价值降序')" value="valueDesc" />
          <el-option :label="tr('按库存价值升序')" value="valueAsc" />
          <el-option :label="tr('按 Brand 排序')" value="nameAsc" />
        </el-select>
      </div>
      <div class="all-brand-table brand-value-table">
        <div class="all-brand-table-head">
          <span>{{ tr('品牌') }}</span>
          <span>{{ tr('数量') }}</span>
          <span>{{ tr('库存价值') }}</span>
          <span>{{ tr('价值占比') }}</span>
        </div>
        <div v-for="row in pagedAllBrandRows" :key="row.name" class="all-brand-table-row">
          <span class="brand-rank-name">
            <i class="dot" :style="{ backgroundColor: row.color }"></i>
            {{ row.name }}
          </span>
          <span>{{ formatNumber(row.value) }}{{ tr('件') }}</span>
          <span>{{ formatDollarStr(row.inventoryValue) }}</span>
          <span>{{ row.valueRate.toFixed(1) }}%</span>
        </div>
        <el-empty v-if="!pagedAllBrandRows.length" :description="tr('暂无匹配品牌')" :image-size="72" />
      </div>
      <div class="all-brand-footer">
        <span>{{ tr('共') }} {{ filteredAllBrandRows.length }} {{ tr('个品牌') }}</span>
        <span>{{ allBrandPageStart }}-{{ allBrandPageEnd }} / {{ filteredAllBrandRows.length }}</span>
        <el-pagination
          v-model:current-page="allBrandPage"
          small
          layout="prev, pager, next"
          :page-size="ALL_BRAND_PAGE_SIZE"
          :total="filteredAllBrandRows.length"
          :pager-count="5"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { ArrowRight, Box, Close, Coin, InfoFilled, Search, Sort, TrendCharts, WarningFilled } from '@element-plus/icons-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { translateByMap } from '@/locales/runtime-map'
import useSettingsStore from '@/store/modules/settings'
import { formatDateForQuery } from '@/utils/laTime'
import {
  getAnalyticsOverview,
  getBrandInventoryRatio,
  getGrossProfitTrend,
  getTurnoverDaysDistribution,
  getValueRangeDistribution
} from '@/api/wms/analytics'

const loading = ref(false)
const settingsStore = useSettingsStore()
const brandPieRef = ref(null)
const turnoverBarRef = ref(null)
const valueBarRef = ref(null)
const profitLineRef = ref(null)
let brandPieChart = null
let turnoverBarChart = null
let valueBarChart = null
let profitLineChart = null

const BRAND_COLORS = ['#2478ff', '#22c4cf', '#44c77d', '#ffbd2e', '#7256ed', '#8492a6', '#ef4f4f', '#24b989', '#745df0', '#2f80ed']
const OTHER_BRAND_COLOR = '#dce3ec'
const ALL_BRAND_PAGE_SIZE = 12

const allBrandDialogVisible = ref(false)
const brandSearchKeyword = ref('')
const allBrandSort = ref('quantityDesc')
const allBrandPage = ref(1)

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')

const filters = reactive({
  profitMode: 'preset',
  rangeType: 'week',
  periodAStartDate: undefined,
  periodAEndDate: undefined,
  periodBStartDate: undefined,
  periodBEndDate: undefined
})

const periodADateRangeModel = computed({
  get() {
    if (filters.periodAStartDate && filters.periodAEndDate) {
      return [filters.periodAStartDate, filters.periodAEndDate]
    }
    return []
  },
  set(val) {
    if (val && val.length === 2) {
      filters.periodAStartDate = val[0]
      filters.periodAEndDate = val[1]
    } else {
      filters.periodAStartDate = undefined
      filters.periodAEndDate = undefined
    }
  }
})

const periodBDateRangeModel = computed({
  get() {
    if (filters.periodBStartDate && filters.periodBEndDate) {
      return [filters.periodBStartDate, filters.periodBEndDate]
    }
    return []
  },
  set(val) {
    if (val && val.length === 2) {
      filters.periodBStartDate = val[0]
      filters.periodBEndDate = val[1]
    } else {
      filters.periodBStartDate = undefined
      filters.periodBEndDate = undefined
    }
  }
})

function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-US')
}

function formatMoneyStr(v) {
  const n = parseNum(v)
  return `$${formatNumber(n)}`
}

function formatDollarStr(v) {
  const n = parseNum(v)
  return `$${formatNumber(n)}`
}

const overviewVo = ref(null)
const brandRatioList = ref([])
const turnoverDistList = ref([])
const valueDistList = ref([])
const profitTrendList = ref([])

function buildProfitTrendQuery() {
  if (hasCompleteCompareRange()) {
    const q = {}
    if (filters.periodAStartDate) q.periodAStartDate = formatDateForQuery(filters.periodAStartDate)
    if (filters.periodAEndDate) q.periodAEndDate = formatDateForQuery(filters.periodAEndDate)
    if (filters.periodBStartDate) q.periodBStartDate = formatDateForQuery(filters.periodBStartDate)
    if (filters.periodBEndDate) q.periodBEndDate = formatDateForQuery(filters.periodBEndDate)
    return q
  }
  return { rangeType: filters.rangeType }
}

function hasCompleteCompareRange() {
  return (
    filters.profitMode === 'compare' &&
    filters.periodAStartDate &&
    filters.periodAEndDate &&
    filters.periodBStartDate &&
    filters.periodBEndDate
  )
}

const kpiCards = computed(() => {
  const o = overviewVo.value
  if (!o) {
    return [
      { title: tr('当前库存总量'), value: '-', unit: tr('件'), icon: Box, iconClass: 'blue' },
      { title: tr('库存总价值'), value: '-', icon: Coin, iconClass: 'purple', tip: tr('当前计算是入库时的入库价值') },
      { title: tr('当月售罄率'), value: '-', icon: TrendCharts, iconClass: 'green', tip: tr('当前计算方式为：本月出库 / (月初库存 + 当月入库)') },
      { title: tr('平均库龄'), value: '-', unit: tr('天'), icon: WarningFilled, iconClass: 'red' }
    ]
  }
  const sellPct = (parseNum(o.sellThroughRate) * 100).toFixed(2)
  return [
    {
      title: tr('当前库存总量'),
      value: formatNumber(parseNum(o.totalInventoryQuantity)),
      unit: tr('件'),
      icon: Box,
      iconClass: 'blue'
    },
    {
      title: tr('库存总价值'),
      value: formatDollarStr(o.totalInventoryValue),
      icon: Coin,
      iconClass: 'purple',
      tip: tr('当前计算是入库时的入库价值')
    },
    {
      title: tr('当月售罄率'),
      value: sellPct,
      unit: '%',
      icon: TrendCharts,
      iconClass: 'green',
      tip: tr('当前计算方式为：本月出库 / (月初库存 + 当月入库)')
    },
    {
      title: tr('平均库龄'),
      value: parseNum(o.averageAge).toFixed(1),
      unit: tr('天'),
      icon: WarningFilled,
      iconClass: 'red'
    }
  ]
})

const brandRows = computed(() => {
  const list = brandRatioList.value || []
  const rows = list
    .map((row) => ({
      name: row.brandName || 'Unknown',
      value: parseNum(row.quantity),
      inventoryValue: parseNum(row.inventoryValue)
    }))
    .sort((a, b) => b.value - a.value)
  const totalInventoryValue = rows.reduce((sum, row) => sum + row.inventoryValue, 0)
  return rows
    .map((row, i) => ({
      ...row,
      rank: i + 1,
      valueRate: totalInventoryValue ? (row.inventoryValue / totalInventoryValue) * 100 : 0,
      color: BRAND_COLORS[i % BRAND_COLORS.length]
    }))
})

const brandChartRows = computed(() => {
  const rows = brandRows.value
  const topRows = rows.slice(0, 10)
  const otherRows = rows.slice(10)
  if (!otherRows.length) return topRows
  const otherQty = otherRows.reduce((sum, row) => sum + row.value, 0)
  const otherValue = otherRows.reduce((sum, row) => sum + row.inventoryValue, 0)
  const otherValueRate = otherRows.reduce((sum, row) => sum + row.valueRate, 0)
  return [
    ...topRows,
    {
      name: tr('其他品牌'),
      value: otherQty,
      valueRate: otherValueRate,
      inventoryValue: otherValue,
      color: OTHER_BRAND_COLOR
    }
  ]
})

const filteredAllBrandRows = computed(() => {
  const keyword = brandSearchKeyword.value.trim().toLowerCase()
  const rows = keyword
    ? brandRows.value.filter((row) => row.name.toLowerCase().includes(keyword))
    : [...brandRows.value]
  const sortMap = {
    quantityDesc: (a, b) => b.value - a.value,
    quantityAsc: (a, b) => a.value - b.value,
    valueDesc: (a, b) => b.inventoryValue - a.inventoryValue,
    valueAsc: (a, b) => a.inventoryValue - b.inventoryValue,
    nameAsc: (a, b) => a.name.localeCompare(b.name)
  }
  return rows.sort(sortMap[allBrandSort.value] || sortMap.quantityDesc)
})

const pagedAllBrandRows = computed(() => {
  const start = (allBrandPage.value - 1) * ALL_BRAND_PAGE_SIZE
  return filteredAllBrandRows.value.slice(start, start + ALL_BRAND_PAGE_SIZE)
})

const allBrandPageStart = computed(() => {
  if (!filteredAllBrandRows.value.length) return 0
  return (allBrandPage.value - 1) * ALL_BRAND_PAGE_SIZE + 1
})

const allBrandPageEnd = computed(() => Math.min(allBrandPage.value * ALL_BRAND_PAGE_SIZE, filteredAllBrandRows.value.length))

function openAllBrandDialog() {
  allBrandDialogVisible.value = true
}

const TURNOVER_LABELS = ['1-7', '8-15', '15+']
const TURNOVER_ORDER = { '1-7': 0, '8-15': 1, '15+': 2 }

function turnoverLabel(apiLabel) {
  if (apiLabel === '15+') return tr('15天以上')
  if (apiLabel === '1-7') return tr('1-7天')
  if (apiLabel === '8-15') return tr('8-15天')
  return apiLabel
}

function turnoverMeta(apiLabel) {
  if (apiLabel === '15+') return { tag: tr('预警'), tagType: 'danger', color: '#ef5454' }
  if (apiLabel === '8-15') return { tag: tr('提醒'), tagType: 'warning', color: '#f5ac2e' }
  return { tag: tr('健康'), tagType: 'success', color: '#24c08a' }
}

const turnoverRows = computed(() => {
  const rawMap = new Map((turnoverDistList.value || []).map((r) => [r.rangeLabel, r]))
  const raw = TURNOVER_LABELS.map((label) => rawMap.get(label) || { rangeLabel: label, quantity: 0 }).sort(
    (a, b) => (TURNOVER_ORDER[a.rangeLabel] ?? 99) - (TURNOVER_ORDER[b.rangeLabel] ?? 99)
  )
  const totalQty = raw.reduce((s, r) => s + parseNum(r.quantity), 0)
  const maxQty = raw.reduce((m, r) => Math.max(m, parseNum(r.quantity)), 0) || 1
  return raw.map((r) => {
    const qty = parseNum(r.quantity)
    const rate = totalQty ? (qty / totalQty) * 100 : 0
    const meta = turnoverMeta(r.rangeLabel)
    return {
      label: turnoverLabel(r.rangeLabel),
      value: qty,
      rate: rate.toFixed(0),
      width: (qty / maxQty) * 100,
      color: meta.color,
      tag: meta.tag,
      tagType: meta.tagType
    }
  })
})

const VALUE_RANGE_ORDER = {
  '0-500': 0,
  '501-1000': 1,
  '1001-2000': 2,
  '2001-5000': 3,
  '5001-10000': 4,
  '10000+': 5
}
const VALUE_RANGE_LABELS = ['0-500', '501-1000', '1001-2000', '2001-5000', '5001-10000', '10000+']
const VALUE_BAR_COLORS = ['#4b9cff', '#5aa6ff', '#66afff', '#8d71ee', '#41cc84', '#f3c347']

const valueRangeInsight = computed(() => {
  const rawMap = new Map((valueDistList.value || []).map((r) => [r.rangeLabel, r]))
  const rows = VALUE_RANGE_LABELS.map((label) => rawMap.get(label) || { rangeLabel: label, quantity: 0, totalValue: 0 })
  const totalQty = rows.reduce((sum, row) => sum + parseNum(row.quantity), 0)
  const dominant = rows.reduce((best, row) => (parseNum(row.quantity) > parseNum(best.quantity) ? row : best), rows[0])
  const highQty = rows
    .filter((row) => ['5001-10000', '10000+'].includes(row.rangeLabel))
    .reduce((sum, row) => sum + parseNum(row.quantity), 0)
  const highRate = totalQty ? ((highQty / totalQty) * 100).toFixed(1) : '0.0'
  const dominantRate = totalQty ? ((parseNum(dominant.quantity) / totalQty) * 100).toFixed(1) : '0.0'
  const advice = totalQty
    ? Number(highRate) >= 25
      ? isEn.value
        ? `High inbound-price inventory has reached ${highRate}%. Prioritize high inbound-price SKU sell-through and turnover to reduce slow-moving high-cost stock.`
        : `建议：高入库价库存占比已达到${highRate}%，优先核查高入库价SKU动销和周转，减少低动销高成本库存积压。`
      : isEn.value
        ? `Optimize replenishment and display around the ${dominant.rangeLabel} main inbound-price band; it currently covers ${dominantRate}% of inventory.`
        : `建议：围绕${dominant.rangeLabel}主力入库价带优化补货和展示；目前该区间覆盖${dominantRate}%库存。`
    : ''
  return {
    dominantLabel: dominant?.rangeLabel || '-',
    totalQty,
    highRate,
    advice
  }
})

const profitSummary = computed(() => {
  const rows = profitTrendList.value || []
  if (filters.profitMode === 'compare') {
    const periodA = rows.reduce((s, r) => s + parseNum(r.periodAProfit), 0)
    const periodB = rows.reduce((s, r) => s + parseNum(r.periodBProfit), 0)
    return { total: periodA + periodB, primary: periodA, secondary: periodB, count: rows.length }
  }
  const values = rows.map((r) => parseNum(r.profit))
  const total = values.reduce((s, n) => s + n, 0)
  const max = values.length ? Math.max(...values) : 0
  const min = values.length ? Math.min(...values) : 0
  return { total, primary: max, secondary: min, count: rows.length }
})

const slowMovingInsight = computed(() => {
  const rows = turnoverRows.value
  const slow = rows.find((r) => r.label === tr('15天以上'))
  if (!slow) return { type: 'success', text: '' }
  const rate = Number(slow.rate)
  if (rate < 25) {
    return {
      type: 'success',
      text: isEn.value
        ? `Inventory turnover is healthy overall. 15+ day inventory is ${formatNumber(slow.value)} pcs, ${slow.rate}% of total inventory. Keep the current replenishment pace and monitor slow-moving SKUs.`
        : `目前库存周转整体健康，15天以上库存为${formatNumber(slow.value)}件，占总库存${slow.rate}%，建议保持当前补货节奏并持续关注低动销SKU。`
    }
  }
  if (rate < 50) {
    return {
      type: 'warning',
      text: isEn.value
        ? `Warning: 15+ day inventory has reached ${slow.rate}%. Review slow-moving SKUs and reduce buildup with promotions, transfers, or paused replenishment.`
        : `提醒：15天以上库存占比达到${slow.rate}%，建议复核滞销SKU，结合促销、调拨或补货暂停策略降低积压。`
    }
  }
  return {
    type: 'danger',
    text: isEn.value
      ? `Alert: 15+ day inventory has reached ${slow.rate}%. Prioritize slow-moving SKUs to reduce low-turnover stock; current 15+ day inventory is ${formatNumber(slow.value)} pcs.`
      : `预警：15天以上库存占比已达到${slow.rate}%，建议优先处理滞销SKU，减少低动销库存积压；当前15天以上库存为${formatNumber(slow.value)}件。`
  }
})

const handleResize = () => {
  brandPieChart?.resize()
  turnoverBarChart?.resize()
  valueBarChart?.resize()
  profitLineChart?.resize()
}

function ensureBrandPie() {
  if (!brandPieRef.value) return
  if (!brandPieChart) brandPieChart = echarts.init(brandPieRef.value)
}

function ensureTurnoverBar() {
  if (!turnoverBarRef.value) return
  if (!turnoverBarChart) turnoverBarChart = echarts.init(turnoverBarRef.value)
}

function ensureValueBar() {
  if (!valueBarRef.value) return
  if (!valueBarChart) valueBarChart = echarts.init(valueBarRef.value)
}

function ensureProfitLine() {
  if (!profitLineRef.value) return
  if (!profitLineChart) profitLineChart = echarts.init(profitLineRef.value)
}

function refreshBrandPie() {
  ensureBrandPie()
  if (!brandPieChart) return
  const rows = brandChartRows.value
  const totalQty = overviewVo.value
    ? parseNum(overviewVo.value.totalInventoryQuantity)
    : rows.reduce((s, r) => s + r.value, 0)
  const centerText = formatNumber(totalQty)
  brandPieChart.setOption(
    {
      tooltip: {
        trigger: 'item',
        formatter: ({ data }) =>
          `${data.name}<br/>${tr('数量')}：${formatNumber(data.quantity)}${tr('件')}<br/>${tr('库存价值')}：${formatDollarStr(data.inventoryValue)}<br/>${tr('价值占比')}：${data.valuePercentage}%`
      },
      graphic: [
        { type: 'text', left: 'center', top: '38%', style: { text: tr('总库存'), fill: '#667085', fontSize: 15 } },
        {
          type: 'text',
          left: 'center',
          top: '47%',
          style: { text: centerText, fill: '#101828', fontSize: 28, fontWeight: 700 }
        },
        { type: 'text', left: 'center', top: '61%', style: { text: tr('件'), fill: '#667085', fontSize: 15 } }
      ],
      series: [
        {
          type: 'pie',
          radius: ['50%', '78%'],
          center: ['50%', '51%'],
          avoidLabelOverlap: true,
          label: {
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 600,
            formatter: ({ data }) => `${data.valuePercentage}%`
          },
          labelLine: { show: false },
          data: rows.map((item) => ({
            value: item.inventoryValue,
            quantity: item.value,
            name: item.name,
            valuePercentage: item.valueRate.toFixed(1),
            inventoryValue: item.inventoryValue,
            itemStyle: { color: item.color }
          }))
        }
      ]
    },
    true
  )
}

function refreshTurnoverBar() {
  ensureTurnoverBar()
  if (!turnoverBarChart) return
  const rows = turnoverRows.value
  turnoverBarChart.setOption(
    {
      color: rows.map((row) => row.color),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params?.[0]
          if (!item) return ''
          const data = item.data || {}
          return [
            `${tr('周转天数')}：${item.name}`,
            `${tr('库存数量')}：${formatNumber(data.quantity)}${tr('件')}`,
            `${tr('占比')}：${data.rate}%`,
            `${tr('状态')}：${data.tag}`
          ].join('<br/>')
        }
      },
      grid: { top: 16, left: 58, right: 82, bottom: 44, containLabel: true },
      xAxis: {
        type: 'value',
        name: tr('数量（件）'),
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#667085', padding: [0, 0, 0, 8] },
        splitLine: { lineStyle: { color: '#eef2f7' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#98a2b3' }
      },
      yAxis: {
        type: 'category',
        data: rows.map((row) => row.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#344054', fontWeight: 600 }
      },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          data: rows.map((row) => ({
            value: row.value,
            quantity: row.value,
            rate: row.rate,
            tag: row.tag,
            itemStyle: { color: row.color, borderRadius: [0, 10, 10, 0] }
          })),
          label: {
            show: true,
            position: 'right',
            color: '#344054',
            fontWeight: 600,
            formatter: ({ data }) => `${formatNumber(data.quantity)}${tr('件')} · ${data.rate}%`
          }
        }
      ]
    },
    true
  )
}

function refreshValueBar() {
  ensureValueBar()
  if (!valueBarChart) return
  const rawMap = new Map((valueDistList.value || []).map((r) => [r.rangeLabel, r]))
  const list = VALUE_RANGE_LABELS.map((label) => rawMap.get(label) || { rangeLabel: label, quantity: 0, totalValue: 0 }).sort(
    (a, b) => (VALUE_RANGE_ORDER[a.rangeLabel] ?? 99) - (VALUE_RANGE_ORDER[b.rangeLabel] ?? 99)
  )
  const categories = list.map((r) => r.rangeLabel)
  const barData = list.map((r, i) => ({
    value: parseNum(r.quantity),
    totalValue: parseNum(r.totalValue),
    itemStyle: { color: VALUE_BAR_COLORS[i % VALUE_BAR_COLORS.length] }
  }))
  valueBarChart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const item = params?.[0]
          if (!item) return ''
          const data = item.data || {}
          return [
            `${tr('入库价区间')}：${item.axisValue}`,
            `${tr('库存数量')}：${formatNumber(parseNum(data.value))}${tr('件')}`,
            `${tr('入库价值')}：${formatMoneyStr(data.totalValue)}`
          ].join('<br/>')
        }
      },
      grid: { top: 34, left: 58, right: 24, bottom: 34, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: '#667085',
          interval: 0,
          rotate: 0,
          margin: 12,
          fontSize: 12,
          hideOverlap: false
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#eef2f7' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#98a2b3', margin: 10 }
      },
      series: [
        {
          type: 'bar',
          barWidth: 22,
          barGap: '36%',
          data: barData,
          label: {
            show: true,
            position: 'top',
            color: '#344054',
            fontWeight: 600,
            formatter: ({ data }) => `${formatNumber(parseNum(data.value))}${tr('件')}`
          }
        }
      ]
    },
    true
  )
}

function refreshProfitLine() {
  ensureProfitLine()
  if (!profitLineChart) return
  const rows = profitTrendList.value || []
  const xData = rows.map((r) => r.label || r.period)
  const isCompare = filters.profitMode === 'compare'
  const series = isCompare
    ? [
        {
          name: tr('时间段A毛利润'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#2f75ff' },
          data: rows.map((r) => parseNum(r.periodAProfit))
        },
        {
          name: tr('时间段B毛利润'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#17c2d1' },
          data: rows.map((r) => parseNum(r.periodBProfit))
        }
      ]
    : [
        {
          name: tr('毛利润'),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#2f75ff' },
          data: rows.map((r) => parseNum(r.profit))
        }
      ]
  profitLineChart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!params?.length) return ''
          const idx = params[0].dataIndex
          const row = rows[idx]
          if (!row) return ''
          if (isCompare) {
            return [
              `${tr('期间')}：${row.label}`,
              `${tr('时间段A毛利润')}：${formatMoneyStr(row.periodAProfit)}`,
              `${tr('时间段B毛利润')}：${formatMoneyStr(row.periodBProfit)}`
            ].join('<br/>')
          }
          return [
            `${tr('期间')}：${row.label}`,
            row.period ? `${tr('周期')}：${row.period}` : '',
            `${tr('毛利润')}：${formatMoneyStr(row.profit)}`
          ]
            .filter(Boolean)
            .join('<br/>')
        }
      },
      legend: {
        bottom: 4,
        itemWidth: 16,
        itemHeight: 8,
        textStyle: { color: '#344054' },
        data: series.map((item) => item.name)
      },
      grid: { top: 22, left: 58, right: 34, bottom: 58, containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#667085', margin: 14 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#eef2f7' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#98a2b3', margin: 10 }
      },
      series
    },
    true
  )
}

async function loadDashboard() {
  loading.value = true
  const trendQ = buildProfitTrendQuery()
  const shouldLoadTrend = filters.profitMode === 'preset' || hasCompleteCompareRange()
  try {
    const [overview, brands, turnover, valueDist, trend] = await Promise.all([
      getAnalyticsOverview(),
      getBrandInventoryRatio(),
      getTurnoverDaysDistribution(),
      getValueRangeDistribution(),
      shouldLoadTrend ? getGrossProfitTrend(trendQ) : Promise.resolve([])
    ])
    overviewVo.value = overview
    brandRatioList.value = Array.isArray(brands) ? brands : []
    turnoverDistList.value = Array.isArray(turnover) ? turnover : []
    valueDistList.value = Array.isArray(valueDist) ? valueDist : []
    profitTrendList.value = Array.isArray(trend) ? trend : []
    await nextTick()
    refreshBrandPie()
    refreshTurnoverBar()
    refreshValueBar()
    refreshProfitLine()
  } catch {
    /* 错误提示由 request 拦截器统一处理 */
  } finally {
    loading.value = false
  }
}

let filterWatchTimer = null
watch(
  () => ({ ...filters }),
  () => {
    clearTimeout(filterWatchTimer)
    filterWatchTimer = setTimeout(() => {
      loadDashboard()
    }, 200)
  },
  { deep: true }
)

watch(
  () => [brandSearchKeyword.value, allBrandSort.value],
  () => {
    allBrandPage.value = 1
  }
)

watch(
  () => settingsStore.language,
  () => {
    nextTick(() => {
      refreshBrandPie()
      refreshTurnoverBar()
      refreshValueBar()
      refreshProfitLine()
    })
  }
)

watch(
  () => filteredAllBrandRows.value.length,
  (total) => {
    const maxPage = Math.max(1, Math.ceil(total / ALL_BRAND_PAGE_SIZE))
    if (allBrandPage.value > maxPage) allBrandPage.value = maxPage
  }
)

onMounted(() => {
  nextTick(() => {
    ensureBrandPie()
    ensureTurnoverBar()
    ensureValueBar()
    ensureProfitLine()
    window.addEventListener('resize', handleResize)
    loadDashboard()
  })
})

onBeforeUnmount(() => {
  clearTimeout(filterWatchTimer)
  window.removeEventListener('resize', handleResize)
  brandPieChart?.dispose()
  turnoverBarChart?.dispose()
  valueBarChart?.dispose()
  profitLineChart?.dispose()
  brandPieChart = null
  turnoverBarChart = null
  valueBarChart = null
  profitLineChart = null
})
</script>

<style scoped lang="scss">
.dashboard-page {
  padding: 12px;
  background: #f5f7fb;
  min-height: calc(100vh - 84px);
}

.analytics-filter {
  margin-bottom: -8px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.kpi-card {
  border-radius: 10px;
  border: 1px solid #e8edf5;
}

.kpi-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.kpi-icon.blue { background: #eaf3ff; color: #2f75ff; }
.kpi-icon.purple { background: #efe9ff; color: #7f62e4; }
.kpi-icon.green { background: #e8f8ef; color: #2dbf8e; }
.kpi-icon.red { background: #fff1ef; color: #ef5454; }

.kpi-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #667085;
  margin-bottom: 6px;
}

.kpi-tip-icon {
  color: #98a2b3;
  cursor: help;
  font-size: 14px;
  line-height: 1;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.kpi-value {
  font-size: 34px;
  font-weight: 700;
  color: #101828;
  line-height: 1;
}

.kpi-unit {
  color: #667085;
  font-size: 14px;
}

.kpi-sub {
  margin-top: 6px;
  color: #2dbf8e;
  font-size: 14px;
  font-weight: 600;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.panel-card {
  border-radius: 10px;
  border: 1px solid #e8edf5;
}

.brand-analysis-card {
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.08);
}

.brand-analysis-card :deep(.el-card__body) {
  padding: 18px 20px 20px;
}

.brand-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.brand-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #101828;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.brand-subtitle {
  margin-top: 8px;
  color: #667085;
  font-size: 12px;
}

.brand-analysis-body {
  display: grid;
  grid-template-columns: minmax(210px, 0.85fr) minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.brand-chart {
  width: 100%;
  height: 248px;
}

.brand-summary-side {
  min-width: 0;
}

.value-analysis-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.value-chart {
  width: 100%;
  height: 300px;
  min-height: 300px;
}

.value-insight-side {
  min-width: 0;
}

.value-insight-side .brand-table-head {
  margin-bottom: 0;
}

.value-insight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #edf0f5;
  color: #667085;
  font-size: 13px;
}

.value-insight-row b {
  color: #1d2939;
  font-size: 14px;
  text-align: right;
}

.value-advice {
  margin-top: 10px;
  color: #344054;
  font-size: 13px;
  line-height: 1.6;
}

.brand-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #edf0f5;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.brand-legend-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  color: #1d2939;
  font-size: 11px;
}

.brand-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
}

.legend-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.legend-name,
.brand-rank-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.all-brand-table.brand-value-table .all-brand-table-head,
.all-brand-table.brand-value-table .all-brand-table-row {
  grid-template-columns: minmax(0, 1fr) 100px 130px 90px;
}

.all-brand-table.brand-value-table .brand-rank-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-rank-head,
.brand-rank-row,
.all-brand-table-head,
.all-brand-table-row {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) 120px 90px;
  align-items: center;
}

.brand-rank-head,
.all-brand-table-head {
  color: #667085;
  font-size: 15px;
  padding: 0 0 12px;
  border-bottom: 1px solid #e4e7ec;
}

.brand-rank-row,
.all-brand-table-row {
  min-height: 52px;
  color: #101828;
  font-size: 16px;
  border-bottom: 1px solid #edf0f5;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #fff;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.rank-badge.small {
  width: 26px;
  height: 26px;
  font-size: 13px;
}

.view-all-brand {
  width: 100%;
  height: 38px;
  margin-top: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fff;
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 14px;
  cursor: pointer;
}

.view-all-brand .el-icon {
  font-size: 15px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #1d2939;
}

.panel-subtitle {
  color: #98a2b3;
  font-size: 12px;
  margin-bottom: 10px;
}

.panel-content.two-col {
  display: grid;
  grid-template-columns: 42% 58%;
  gap: 8px;
}

.chart-box.small {
  height: 235px;
}

.chart-box.medium {
  height: 236px;
}

.brand-table {
  font-size: 13px;
}

.brand-head,
.brand-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 0.8fr;
  align-items: center;
  padding: 6px 0;
}

.brand-head {
  color: #667085;
  border-bottom: 1px solid #eef2f7;
}

.brand-row {
  color: #344054;
}

.brand-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.top-brand {
  margin-top: 10px;
  background: #eef4ff;
  color: #2f75ff;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.turnover-chart {
  height: 236px;
}

.panel-warning {
  margin-top: 14px;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.6;
}

.panel-warning--success {
  background: #ecfdf3;
  color: #027a48;
  border: 1px solid #abefc6;
}

.panel-warning--warning {
  background: #fffaeb;
  color: #b54708;
  border: 1px solid #fedf89;
}

.panel-warning--danger {
  background: #fff3f0;
  color: #d94841;
  border: 1px solid #ffd9d3;
}

.panel-footnote {
  margin-top: 10px;
  background: #f1ebff;
  color: #7f62e4;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.compare-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  margin-bottom: 0;
}

.profit-filter-panel {
  margin-bottom: 12px;
  padding: 14px 16px 12px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fbfcff;
}

.profit-filter-panel :deep(.el-form-item) {
  margin: 0;
  margin-right: 26px;
}

.profit-filter-panel :deep(.el-form-item__label) {
  color: #475467;
  font-weight: 700;
  padding-right: 12px;
}

.analytics-filter {
  display: flex;
  margin-bottom: 0;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 12px;
}

.profit-filter-break {
  flex: 0 0 100%;
  height: 0;
}

.toolbar-item {
  padding: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #667085;
  background: transparent;
}

.compare-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}

.chart-mode-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.chart-tip {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.chart-tip.warning {
  color: #b54708;
  background: #fffaeb;
  border: 1px solid #fedf89;
}

.chart-tip.info {
  color: #175cd3;
  background: #eff8ff;
  border: 1px solid #b2ddff;
}

.mini-kpi {
  border: 1px solid #eaecf0;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px 12px;
  font-size: 12px;
  color: #667085;
}

.mini-kpi b {
  display: block;
  font-size: 22px;
  color: #344054;
  margin-top: 4px;
}

.mini-kpi b.positive { color: #12b76a; }
.mini-kpi b.warning { color: #f79009; }

.profit-chart {
  height: 310px;
}

:deep(.all-brand-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(16, 24, 40, 0.18);
}

:deep(.all-brand-dialog .el-dialog__header) {
  margin: 0;
  padding: 20px 24px 14px;
  border-bottom: 1px solid #e4e7ec;
}

:deep(.all-brand-dialog .el-dialog__body) {
  padding: 20px 24px 18px;
}

.all-brand-header,
.all-brand-toolbar,
.all-brand-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.all-brand-header {
  color: #101828;
  font-size: 21px;
  font-weight: 800;
}

.all-brand-header button {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: #475467;
  cursor: pointer;
  font-size: 20px;
}

.brand-search {
  width: 300px;
}

.brand-sort {
  width: 192px;
}

.all-brand-table {
  margin-top: 18px;
  min-height: 540px;
}

.all-brand-table-row {
  min-height: 45px;
  font-size: 15px;
}

.all-brand-footer {
  margin-top: 14px;
  color: #667085;
  font-size: 14px;
}

.all-brand-footer :deep(.el-pagination) {
  margin-left: auto;
}

@media (max-width: 1400px) {
  .kpi-grid,
  .panel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .kpi-grid,
  .panel-grid,
  .compare-kpis,
  .panel-content.two-col,
  .brand-analysis-body,
  .value-analysis-body,
  .brand-legend-grid {
    grid-template-columns: 1fr;
  }

  .brand-analysis-card :deep(.el-card__body) {
    padding: 20px;
  }

  .brand-card-head,
  .all-brand-toolbar,
  .all-brand-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .brand-search,
  .brand-sort {
    width: 100%;
  }

  .brand-chart {
    height: 320px;
  }

  .brand-rank-head,
  .brand-rank-row,
  .all-brand-table-head,
  .all-brand-table-row {
    grid-template-columns: 52px minmax(0, 1fr) 86px 62px;
    font-size: 13px;
  }

  .all-brand-table.brand-value-table .all-brand-table-head,
  .all-brand-table.brand-value-table .all-brand-table-row {
    grid-template-columns: minmax(0, 1fr) 64px 92px 64px;
  }
}
</style>
