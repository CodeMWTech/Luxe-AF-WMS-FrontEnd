<template>
  <div class="app-container crm-page">
    <section class="crm-main">
      <el-tabs v-model="activeTab" class="crm-tabs">
        <el-tab-pane :label="tr('数据分析')" name="analysis">
          <div v-loading="insightLoading" class="crm-analysis">
      <div class="crm-toolbar">
        <el-select
          v-model="shopKey"
          clearable
          filterable
          class="crm-shop"
          :placeholder="tr('全部店铺')"
          @change="loadInsights"
        >
          <el-option-group v-for="group in shopGroups" :key="group.label" :label="group.label">
            <el-option
              v-for="shop in group.shops"
              :key="shop.platform + shop.shopName"
              :label="shop.shopName"
              :value="shop.platform + '\u0001' + shop.shopName"
            />
          </el-option-group>
        </el-select>
        <p class="crm-range">{{ rangeText }}</p>
      </div>
      <div class="crm-stats">
        <div class="crm-stat">
          <span>{{ tr('客户数') }}</span>
          <strong>{{ formatCount(insight?.customerCount) }}</strong>
        </div>
        <div class="crm-stat">
          <span>{{ tr('回头客户') }}</span>
          <strong>{{ repeatPercent }}<small>%</small></strong>
          <em>{{ formatCount(insight?.repeatCustomerCount) }} · {{ te('订单 {0}% · 金额 {1}%', [repeatOrderPercent, repeatAmountPercent]) }}</em>
        </div>
        <div class="crm-stat">
          <span>{{ tr('订单数') }}</span>
          <strong>{{ formatCount(insight?.orderCount) }}</strong>
        </div>
        <div class="crm-stat">
          <span>{{ tr('订单金额') }}</span>
          <strong class="is-money">{{ insightMoney }}</strong>
        </div>
        <div class="crm-stat">
          <span>{{ tr('已对上库存') }}</span>
          <strong>{{ matchPercent }}<small>%</small></strong>
          <em>{{ formatCount(insight?.matchedLineCount) }} / {{ formatCount(insight?.skuLineCount) }}</em>
        </div>
      </div>
      <div class="crm-stage" :class="{ 'is-focus': !!focusId }">
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'hour', 'is-mini': focusId && focusId !== 'hour' }"
          @click="focusChart('hour')"
        >
          <header>
            <span>{{ tr('各小时订单数') }}</span>
            <button v-if="focusId === 'hour'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <div ref="hourEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'weekday', 'is-mini': focusId && focusId !== 'weekday' }"
          @click="focusChart('weekday')"
        >
          <header>
            <span>{{ tr('各星期订单数') }}</span>
            <button v-if="focusId === 'weekday'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <div ref="weekdayEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'gap', 'is-mini': focusId && focusId !== 'gap' }"
          @click="focusChart('gap')"
        >
          <header>
            <span>{{ tr('第一单到第二单') }}</span>
            <button v-if="focusId === 'gap'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ te('中位数 {0} 天', [insight?.medianGapDays ?? '—']) }}</em>
          </header>
          <div ref="gapEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'band', 'is-mini': focusId && focusId !== 'band' }"
          @click="focusChart('band')"
        >
          <header>
            <span>{{ tr('购买次数') }}</span>
            <button v-if="focusId === 'band'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <div ref="bandEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'brand', 'is-mini': focusId && focusId !== 'brand' }"
          @click="focusChart('brand')"
        >
          <header>
            <span>{{ tr('已入库品牌') }}</span>
            <button v-if="focusId === 'brand'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else-if="sameBrandPercent != null">{{ te('可识别回头客里 {0}% 又买了同一品牌', [sameBrandPercent]) }}</em>
          </header>
          <div ref="brandEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'category', 'is-mini': focusId && focusId !== 'category' }"
          @click="focusChart('category')"
        >
          <header>
            <span>{{ tr('已入库品类') }}</span>
            <button v-if="focusId === 'category'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('只统计已对上库存的订单') }}</em>
          </header>
          <div ref="categoryEl" class="crm-chart__canvas" />
        </article>
      </div>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="tr('客户详情')" name="detail">
          <div v-loading="detailLoading" class="crm-pane crm-detail">
            <el-empty v-if="!detail" class="crm-empty" :description="tr('在左侧选择一位客户，这里展示联系方式和每一笔订单。')" />
            <template v-else>
              <header class="crm-profile">
                <div class="crm-profile__title">
                  <h2>{{ detail.displayName }}</h2>
                  <span class="crm-platform" :class="detail.platform === 'EBAY' ? 'is-ebay' : 'is-whatnot'">{{ detail.platformLabel }}</span>
                  <span v-if="detail.repeatCustomer" class="crm-repeat">{{ tr('回头客') }}</span>
                </div>
                <div class="crm-facts">
                  <div v-if="detail.buyerUsername"><span>{{ tr('账号') }}</span><b>{{ detail.buyerUsername }}</b></div>
                  <div v-if="detail.email"><span>{{ tr('邮箱') }}</span><b>{{ detail.email }}</b></div>
                  <div v-if="detail.phone"><span>{{ tr('电话') }}</span><b>{{ detail.phone }}</b></div>
                  <div v-if="detail.recipientName"><span>{{ tr('收件人') }}</span><b>{{ detail.recipientName }}</b></div>
                  <div v-if="placeLine"><span>{{ tr('地址') }}</span><b>{{ placeLine }}</b></div>
                  <div v-if="detail.shopNames"><span>{{ tr('店铺') }}</span><b>{{ detail.shopNames }}</b></div>
                  <div><span>{{ tr('首单') }}</span><b>{{ detail.firstOrderTime || '—' }}</b></div>
                  <div><span>{{ tr('最近一单') }}</span><b>{{ detail.lastOrderTime || '—' }}</b></div>
                  <div><span>{{ tr('累计金额') }}</span><b>{{ moneyList(detail.amounts) }}</b></div>
                </div>
              </header>
              <p v-if="detailStory" class="crm-story">{{ detailStory }}</p>
                <div class="crm-detail-charts">
                  <article class="crm-chart">
                    <header><span>{{ tr('每一笔的金额') }}</span></header>
                    <div ref="detailAmountEl" class="crm-chart__canvas" />
                  </article>
                  <article class="crm-chart">
                    <header><span>{{ tr('买过的品牌') }}</span></header>
                    <div ref="detailBrandEl" class="crm-chart__canvas" />
                  </article>
                  <article class="crm-chart">
                    <header><span>{{ tr('相邻两单间隔') }}</span></header>
                    <div v-if="detailGaps.length" ref="detailGapEl" class="crm-chart__canvas" />
                    <p v-else class="crm-chart__note">{{ tr('只有一笔订单，还没有间隔。') }}</p>
                  </article>
                </div>
                <div v-if="hasExtra" class="crm-extra">
                  <p v-if="detail.otherEmails?.length"><span>{{ tr('其他邮箱') }}</span>{{ detail.otherEmails.join('、') }}</p>
                  <p v-if="detail.otherPhones?.length"><span>{{ tr('其他电话') }}</span>{{ detail.otherPhones.join('、') }}</p>
                  <p v-if="detail.otherRecipients?.length"><span>{{ tr('其他收件人') }}</span>{{ detail.otherRecipients.join('、') }}</p>
                  <p v-if="detail.otherAddresses?.length"><span>{{ tr('其他地址') }}</span>{{ detail.otherAddresses.join('；') }}</p>
                  <p v-if="detail.buyerMessages?.length"><span>{{ tr('买家留言') }}</span>{{ detail.buyerMessages.join('；') }}</p>
                </div>
              <div class="crm-orders">
                <h3>{{ tr('订单记录') }}</h3>
                <article v-for="order in detail.orders" :key="order.sequence + order.platformOrderId" class="crm-order">
                  <div class="crm-order__head">
                    <div>
                      <strong>{{ sequenceLabel(order.sequence) }}</strong>
                      <span>{{ order.orderTime }}</span>
                      <span v-if="order.orderStatus" class="crm-status">{{ order.orderStatus }}</span>
                      <span v-if="order.shopName" class="muted">{{ order.shopName }}</span>
                    </div>
                    <b>{{ moneyText(order.currency, order.orderAmount) }}</b>
                  </div>
                  <div class="crm-order__id">
                    <span>{{ tr('订单号') }}</span>
                    <el-link type="primary" @click="openOrder(order)">{{ order.platformOrderId }}</el-link>
                  </div>
                  <div class="crm-products">
                    <div v-for="(product, index) in order.products" :key="index" class="crm-product">
                      <el-image class="crm-thumb" :src="product.thumbnailUrl" fit="cover">
                        <template #error><div class="crm-thumb__empty">{{ tr('无图') }}</div></template>
                      </el-image>
                      <div class="crm-product__body">
                        <el-link v-if="product.linked" type="primary" @click="openItem(product)">{{ product.productName }}</el-link>
                        <strong v-else>{{ product.productName }}</strong>
                        <div class="crm-product__tags">
                          <span>{{ tr('分类') }} {{ product.categoryName || tr('未入库') }}</span>
                          <span>{{ tr('品牌') }} {{ product.brandName || tr('未入库') }}</span>
                        </div>
                        <el-button link type="primary" @click="product.open = !product.open">
                          {{ product.open ? tr('收起金额') : tr('展开金额') }}
                        </el-button>
                        <div v-if="product.open" class="crm-product__money">
                          <span>{{ tr('数量') }} {{ formatQty(product.quantity) }}</span>
                          <span>{{ tr('单价') }} {{ moneyText(order.currency, product.salePrice) }}</span>
                          <span>{{ tr('行金额') }} {{ moneyText(order.currency, product.lineAmount) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </template>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="tr('自定义分析')" name="custom">
          <div v-loading="customLoading" class="crm-custom">
            <section class="crm-guide">
              <h3>{{ tr('怎么看这张图') }}</h3>
              <ol>
                <li>{{ tr('横坐标决定每一根柱子代表谁，例如星期、店铺或购买次数。') }}</li>
                <li>{{ tr('纵坐标决定柱子的高度，可以是订单数、客户数、回头率或金额。') }}</li>
                <li>{{ tr('对比项把同一组再拆开。留空就是不拆分。默认把新客和回头客放在一起比较。') }}</li>
              </ol>
              <p>{{ tr('品牌和品类只统计已对上库存的订单。这里的店铺筛选与数据分析共用。') }}</p>
            </section>
            <div class="crm-custom__bar">
              <label>
                <span>{{ tr('横坐标') }}</span>
                <el-select v-model="customX" @change="loadCustom">
                  <el-option v-for="item in axisOptions" :key="item.value" :label="tr(item.label)" :value="item.value" />
                </el-select>
              </label>
              <label>
                <span>{{ tr('对比') }}</span>
                <el-select v-model="customSeries" clearable :placeholder="tr('不拆分')" @change="loadCustom">
                  <el-option v-for="item in seriesOptions" :key="item.value" :label="tr(item.label)" :value="item.value" />
                </el-select>
              </label>
              <label>
                <span>{{ tr('纵坐标') }}</span>
                <el-select v-model="customMetric" @change="loadCustom">
                  <el-option v-for="item in metricOptions" :key="item.value" :label="tr(item.label)" :value="item.value" />
                </el-select>
              </label>
              <label>
                <span>{{ tr('店铺') }}</span>
                <el-select v-model="shopKey" clearable filterable :placeholder="tr('全部店铺')" @change="loadInsights">
                  <el-option-group v-for="group in shopGroups" :key="'custom-' + group.label" :label="group.label">
                    <el-option
                      v-for="shop in group.shops"
                      :key="'custom-' + shop.platform + shop.shopName"
                      :label="shop.shopName"
                      :value="shop.platform + '\u0001' + shop.shopName"
                    />
                  </el-option-group>
                </el-select>
              </label>
            </div>
            <div class="crm-custom__chart">
              <div ref="customEl" class="crm-chart__canvas" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <aside class="crm-side">
      <div class="crm-pane">
        <div class="crm-pane__head">
          <h2>{{ tr('客户') }}</h2>
          <p class="crm-side__hint">{{ tr('点选客户后，到右侧客户详情查看联系方式和订单。') }}</p>
          <el-input
            v-model="query.keyword"
            clearable
            :placeholder="tr('搜索姓名、账号、邮箱、电话、订单号、商品')"
            @keyup.enter="search"
          />
          <div class="crm-pane__filters">
            <el-select v-model="query.platform" clearable :placeholder="tr('平台')">
              <el-option label="eBay" value="EBAY" />
              <el-option label="Whatnot" value="SHOPIFY" />
            </el-select>
            <el-checkbox v-model="query.repeatOnly">{{ tr('只看回头客') }}</el-checkbox>
            <el-button type="primary" @click="search">{{ tr('查询') }}</el-button>
            <el-button @click="reset">{{ tr('重置') }}</el-button>
          </div>
        </div>
        <div v-loading="loading" class="crm-cards">
          <el-empty v-if="!loading && customers.length === 0" :description="tr('暂无客户')" />
          <button
            v-for="item in customers"
            :key="item.platform + ':' + item.buyerKey"
            type="button"
            class="crm-card"
            :class="{ 'is-active': isActive(item) }"
            @click="openCustomer(item)"
          >
            <div class="crm-card__top">
              <strong>{{ item.displayName }}</strong>
              <span class="crm-platform" :class="item.platform === 'EBAY' ? 'is-ebay' : 'is-whatnot'">{{ item.platformLabel }}</span>
            </div>
            <div class="crm-card__meta">{{ contactLine(item) }}</div>
            <div class="crm-card__foot">
              <span>{{ item.orderCount }} {{ tr('笔订单') }}</span>
              <span v-if="item.repeatCustomer" class="crm-repeat">{{ tr('回头客') }}</span>
              <span class="crm-card__time">{{ item.lastOrderTime }}</span>
            </div>
          </button>
        </div>
        <div class="crm-pager">
          <el-pagination
            v-model:current-page="query.pageNum"
            v-model:page-size="query.pageSize"
            small
            :total="total"
            :pager-count="5"
            layout="total, prev, pager, next"
            @current-change="loadList"
            @size-change="search"
          />
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup name="CrmCustomer">
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap, translateExact } from '@/locales/runtime-map'
import { getCrmCustom, getCrmCustomer, getCrmInsights, getCrmShops, listCrmCustomers } from '@/api/wms/crmCustomer'

const settingsStore = useSettingsStore()
const router = useRouter()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const te = (text, values) => translateExact(text, settingsStore.language || 'zh-cn', values)

const WEEKDAYS = { mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日' }
const GAPS = { once: '仅一单', d0: '0–7 天', d7: '8–30 天', d30: '31–90 天', d90: '91–180 天', d180: '180 天以上' }
const BANDS = { n1: '1 单', n2: '2 单', n3: '3 单', n4: '4 单', n5: '5 单', n6: '6 单及以上' }
const POINT_LABELS = {
  ...WEEKDAYS,
  ...GAPS,
  ...BANDS,
  new: '新客',
  repeat: '回头客',
  other: '其他',
  orders: '订单数',
  customers: '客户数',
  repeatCustomers: '回头客数',
  repeatRate: '回头率',
  amount: '订单金额',
  avgAmount: '笔均金额'
}
const AXES = [
  { value: 'hour', label: '小时' },
  { value: 'weekday', label: '星期' },
  { value: 'month', label: '月份' },
  { value: 'platform', label: '平台' },
  { value: 'shop', label: '店铺' },
  { value: 'repeat', label: '新客或回头客' },
  { value: 'band', label: '购买次数' },
  { value: 'gap', label: '首单到第二单' },
  { value: 'brand', label: '已入库品牌' },
  { value: 'category', label: '已入库品类' }
]
const METRICS = [
  { value: 'orders', label: '订单数' },
  { value: 'customers', label: '客户数' },
  { value: 'repeatCustomers', label: '回头客数' },
  { value: 'repeatRate', label: '回头率' },
  { value: 'amount', label: '订单金额' },
  { value: 'avgAmount', label: '笔均金额' }
]

const loading = ref(false)
const detailLoading = ref(false)
const insightLoading = ref(false)
const customers = ref([])
const total = ref(0)
const detail = ref(null)
const insight = ref(null)
const shops = ref([])
const shopKey = ref('')
const activeKey = ref('')
const activeTab = ref('analysis')
const focusId = ref('')
const customX = ref('weekday')
const customSeries = ref('repeat')
const customMetric = ref('orders')
const customData = ref(null)
const customLoading = ref(false)
const customEl = ref(null)
const detailAmountEl = ref(null)
const detailBrandEl = ref(null)
const detailGapEl = ref(null)
const axisOptions = AXES
const metricOptions = METRICS
const query = reactive({
  keyword: '',
  platform: '',
  repeatOnly: false,
  pageNum: 1,
  pageSize: 20
})

const hourEl = ref(null)
const weekdayEl = ref(null)
const gapEl = ref(null)
const bandEl = ref(null)
const brandEl = ref(null)
const categoryEl = ref(null)
const charts = {}

const placeLine = computed(() => {
  if (!detail.value) return ''
  return [detail.value.fullAddress, detail.value.city, detail.value.stateName, detail.value.postalCode, detail.value.countryCode]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' · ')
})

const hasExtra = computed(() => {
  const current = detail.value
  if (!current) return false
  return [current.otherEmails, current.otherPhones, current.otherRecipients, current.otherAddresses, current.buyerMessages]
    .some(list => list?.length)
})

const repeatPercent = computed(() => percent(insight.value?.repeatCustomerCount, insight.value?.customerCount))
const repeatOrderPercent = computed(() => percent(insight.value?.repeatOrderCount, insight.value?.orderCount))
const repeatAmountPercent = computed(() => {
  const total = insight.value?.amounts?.[0]
  const part = (insight.value?.repeatAmounts || []).find(item => item.currency === total?.currency) || insight.value?.repeatAmounts?.[0]
  return percent(part?.amount, total?.amount)
})
const matchPercent = computed(() => percent(insight.value?.matchedLineCount, insight.value?.skuLineCount))
const seriesOptions = computed(() => AXES.filter(item => item.value !== customX.value))
const detailGaps = computed(() => gapsBetween(detail.value?.orders || []))
const detailStory = computed(() => {
  const orders = detail.value?.orders || []
  if (!orders.length) return ''
  const gaps = detailGaps.value.map(item => item.days).sort((left, right) => left - right)
  const median = gaps.length ? gaps[Math.floor((gaps.length - 1) / 2)] : null
  const topBrand = topLabel(orders, 'brandName')
  const parts = [te('共 {0} 笔', [orders.length])]
  if (median != null) parts.push(te('相邻两单间隔中位数 {0} 天', [median]))
  parts.push(topBrand ? te('已入库商品里 {0} 出现最多', [topBrand]) : tr('商品还没有对上库存品牌'))
  return parts.join(' · ')
})
const shopGroups = computed(() => {
  const ebay = shops.value.filter(shop => shop.platform === 'EBAY')
  const whatnot = shops.value.filter(shop => shop.platform !== 'EBAY')
  return [
    ebay.length ? { label: 'eBay', shops: ebay } : null,
    whatnot.length ? { label: 'Whatnot', shops: whatnot } : null
  ].filter(Boolean)
})
const sameBrandPercent = computed(() => {
  const totalBuyers = insight.value?.brandedRepeatBuyers
  if (!totalBuyers) return null
  return percent(insight.value?.sameBrandBuyers, totalBuyers)
})
const insightMoney = computed(() => compactMoney(insight.value?.amounts))
const rangeText = computed(() => {
  const current = insight.value
  if (!current) return tr('从 eBay 和 Whatnot 订单汇总买家。刷单不计入，两个平台的同一人不会自动合并。')
  return `eBay ${current.ebayFrom || '—'} – ${current.ebayTo || '—'} · Whatnot ${current.whatnotFrom || '—'} – ${current.whatnotTo || '—'}`
})

function percent(part, whole) {
  const totalCount = Number(whole || 0)
  if (!totalCount) return 0
  return Math.round(Number(part || 0) * 100 / totalCount)
}

function formatCount(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString() : '0'
}

function contactLine(item) {
  return [item.buyerUsername, item.email, item.phone, item.recipientName].filter(Boolean).join(' · ') || item.shopNames || '—'
}

function isActive(item) {
  return activeKey.value === `${item.platform}:${item.buyerKey}`
}

function sequenceLabel(sequence) {
  return te('第{0}笔', [sequence])
}

function moneyText(currency, amount) {
  if (amount == null || amount === '') return '—'
  const number = Number(amount)
  const text = Number.isFinite(number)
    ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(amount)
  return currency ? `${currency} ${text}` : text
}

function compactMoney(amounts) {
  if (!amounts?.length) return '—'
  return amounts.map(item => {
    const number = Number(item.amount)
    const text = Number.isFinite(number) && Math.abs(number) >= 1000000
      ? `${(number / 1000000).toFixed(1)}M`
      : (Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(item.amount))
    return item.currency ? `${item.currency} ${text}` : text
  }).join(' + ')
}

function moneyList(amounts) {
  if (!amounts?.length) return '—'
  return amounts.map(item => moneyText(item.currency, item.amount)).join(' + ')
}

function formatQty(quantity) {
  if (quantity == null) return '—'
  const number = Number(quantity)
  return Number.isFinite(number) ? String(number) : String(quantity)
}

function labelsOf(points, dictionary) {
  return (points || []).map(point => tr(dictionary ? dictionary[point.name] || point.name : point.name))
}

function valuesOf(points) {
  return (points || []).map(point => Number(point.count || 0))
}

function axisStyle() {
  return { color: '#98a2b3', fontSize: 11 }
}

function fill(from, to, horizontal) {
  return new echarts.graphic.LinearGradient(0, horizontal ? 0 : 1, horizontal ? 1 : 0, horizontal ? 0 : 0, [
    { offset: 0, color: from },
    { offset: 1, color: to }
  ])
}

function verticalOption(categories, values, color, seriesName) {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 8, top: 16, bottom: categories.length > 12 ? 22 : 28 },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e7eaf0' } },
      axisLabel: { ...axisStyle(), interval: categories.length > 12 ? 2 : 0, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f4f7' } },
      axisLabel: axisStyle()
    },
    series: [{
      name: seriesName || tr('订单数'),
      type: 'bar',
      barMaxWidth: 18,
      data: values,
      itemStyle: { color, borderRadius: [4, 4, 0, 0] }
    }]
  }
}

function horizontalOption(categories, values, color, seriesName) {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f4f7' } },
      axisLabel: axisStyle()
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { ...axisStyle(), width: 88, overflow: 'truncate' }
    },
    series: [{
      name: seriesName || tr('订单数'),
      type: 'bar',
      barMaxWidth: 12,
      data: values,
      itemStyle: { color, borderRadius: [0, 4, 4, 0] }
    }]
  }
}

function draw(key, el, option) {
  if (!el) return
  const chart = charts[key] || echarts.init(el)
  charts[key] = chart
  chart.setOption(option, true)
}

function pointLabel(name) {
  return tr(POINT_LABELS[name] || name)
}

function renderCustom() {
  const payload = customData.value
  if (!customEl.value || !payload?.series?.length) return
  const categories = (payload.series[0].points || []).map(point => pointLabel(point.name))
  const palette = ['#409EFF', '#13c2c2', '#67C23A', '#1677ff', '#98a2b3']
  const percentMetric = customMetric.value === 'repeatRate'
  const series = payload.series.map((item, index) => ({
    name: pointLabel(item.name),
    type: 'bar',
    barMaxWidth: 18,
    data: (item.points || []).map(point => Number(point.value || 0)),
    itemStyle: { color: palette[index % palette.length], borderRadius: [4, 4, 0, 0] }
  }))
  draw('custom', customEl.value, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: series.length > 1 ? { top: 0, right: 8, itemWidth: 10, itemHeight: 8, textStyle: { color: '#667085', fontSize: 11 } } : undefined,
    grid: { left: 48, right: 12, top: series.length > 1 ? 28 : 16, bottom: categories.length > 10 ? 42 : 28 },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e7eaf0' } },
      axisLabel: { ...axisStyle(), interval: categories.length > 12 ? 2 : 0, rotate: categories.length > 8 ? 28 : 0, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f4f7' } },
      axisLabel: { ...axisStyle(), formatter: percentMetric ? '{value}%' : undefined }
    },
    series
  })
}

function dayGap(previous, next) {
  const start = Date.parse(String(previous || '').replace(/-/g, '/'))
  const end = Date.parse(String(next || '').replace(/-/g, '/'))
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.max(0, Math.round((end - start) / 86400000))
}

function gapsBetween(orders) {
  const gaps = []
  for (let index = 1; index < orders.length; index += 1) {
    const days = dayGap(orders[index - 1].orderTime, orders[index].orderTime)
    if (days == null) continue
    gaps.push({
      label: `${sequenceLabel(orders[index - 1].sequence)}→${sequenceLabel(orders[index].sequence)}`,
      days
    })
  }
  return gaps
}

function topLabel(orders, field) {
  const ranked = countNamed(orders, field).filter(item => item.name && item.name !== '未入库')
  return ranked[0]?.name || ''
}

function countNamed(orders, field) {
  const counts = new Map()
  for (const order of orders) {
    for (const product of order.products || []) {
      const name = product[field] || '未入库'
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6)
}

function renderDetailCharts() {
  const orders = detail.value?.orders || []
  if (!orders.length) return
  draw('detailAmount', detailAmountEl.value, verticalOption(
    orders.map(order => sequenceLabel(order.sequence)),
    orders.map(order => Number(order.orderAmount || 0)),
    fill('#79bbff', '#409EFF', false),
    tr('订单金额')
  ))
  const brands = countNamed(orders, 'brandName')
  draw('detailBrand', detailBrandEl.value, horizontalOption(
    brands.map(item => item.name),
    brands.map(item => item.count),
    fill('#409EFF', '#79bbff', true),
    tr('商品数')
  ))
  const gaps = detailGaps.value
  if (gaps.length) {
    draw('detailGap', detailGapEl.value, verticalOption(
      gaps.map(item => item.label),
      gaps.map(item => item.days),
      fill('#5cdbd3', '#13c2c2', false),
      tr('天数')
    ))
  }
}

function focusChart(id) {
  if (focusId.value === id) return
  focusId.value = id
  nextTick(() => resizeCharts())
}

function clearFocus() {
  focusId.value = ''
  nextTick(() => resizeCharts())
}

function renderCharts() {
  const current = insight.value
  if (!current) return
  draw('hour', hourEl.value, verticalOption(labelsOf(current.hours), valuesOf(current.hours), fill('#79bbff', '#409EFF', false)))
  draw('weekday', weekdayEl.value, verticalOption(labelsOf(current.weekdays, WEEKDAYS), valuesOf(current.weekdays), fill('#5cdbd3', '#13c2c2', false)))
  draw('gap', gapEl.value, verticalOption(labelsOf(current.repeatGaps, GAPS), valuesOf(current.repeatGaps), fill('#91caff', '#1677ff', false)))
  draw('band', bandEl.value, verticalOption(labelsOf(current.orderBands, BANDS), valuesOf(current.orderBands), fill('#b3e19d', '#67C23A', false)))
  draw('brand', brandEl.value, horizontalOption((current.brands || []).map(item => item.name), valuesOf(current.brands), fill('#409EFF', '#79bbff', true)))
  draw('category', categoryEl.value, horizontalOption((current.categories || []).map(item => item.name), valuesOf(current.categories), fill('#13c2c2', '#5cdbd3', true)))
}

function resizeCharts() {
  Object.values(charts).forEach(chart => chart?.resize())
}

function search() {
  query.pageNum = 1
  loadList()
}

function reset() {
  query.keyword = ''
  query.platform = ''
  query.repeatOnly = false
  search()
}

async function loadList() {
  loading.value = true
  try {
    const data = await listCrmCustomers({
      keyword: query.keyword?.trim() || undefined,
      platform: query.platform || undefined,
      repeatOnly: query.repeatOnly || undefined,
      pageNum: query.pageNum,
      pageSize: query.pageSize
    })
    customers.value = data.rows || []
    total.value = data.total || 0
  } catch (error) {
    customers.value = []
    total.value = 0
    ElMessage.error(tr('加载客户失败'))
  } finally {
    loading.value = false
  }
}

function insightParams() {
  const value = shopKey.value
  const split = value ? value.indexOf('\u0001') : -1
  if (split < 1) return {}
  return {
    platform: value.slice(0, split),
    shop: value.slice(split + 1)
  }
}

async function loadShops() {
  try {
    const res = await getCrmShops()
    shops.value = res.data || []
  } catch (error) {
    shops.value = []
  }
}

async function loadInsights() {
  insightLoading.value = true
  try {
    const res = await getCrmInsights(insightParams())
    insight.value = res.data || null
    await nextTick()
    renderCharts()
    resizeCharts()
    loadCustom()
  } catch (error) {
    ElMessage.error(tr('加载洞察失败'))
  } finally {
    insightLoading.value = false
  }
}

async function loadCustom() {
  if (customSeries.value === customX.value) customSeries.value = ''
  customLoading.value = true
  try {
    const res = await getCrmCustom({
      ...insightParams(),
      x: customX.value,
      series: customSeries.value || undefined,
      metric: customMetric.value
    })
    customData.value = res.data || null
    await nextTick()
    renderCustom()
    resizeCharts()
  } catch (error) {
    ElMessage.error(tr('加载自定义分析失败'))
  } finally {
    customLoading.value = false
  }
}

async function openCustomer(item) {
  activeKey.value = `${item.platform}:${item.buyerKey}`
  detailLoading.value = true
  try {
    const res = await getCrmCustomer(item.platform, item.buyerKey)
    const next = res.data || {}
    next.orders = (next.orders || []).map(order => ({
      ...order,
      products: (order.products || []).map(product => ({ ...product, open: false }))
    }))
    detail.value = next
    activeTab.value = 'detail'
    await nextTick()
    renderDetailCharts()
    resizeCharts()
  } catch (error) {
    detail.value = null
    ElMessage.error(tr('加载客户详情失败'))
  } finally {
    detailLoading.value = false
  }
}

function openOrder(order) {
  router.push({
    path: '/wms/platform/tiktok/orders',
    query: { platformOrderId: order.platformOrderId }
  }).catch(() => {})
}

function openItem(product) {
  if (!product.linked || !product.skuCode) return
  router.push({ name: 'Item', query: { skuCode: product.skuCode } }).catch(() => {})
}

watch(() => settingsStore.language, () => nextTick(() => {
  renderCharts()
  renderCustom()
  renderDetailCharts()
}))
watch(activeTab, () => nextTick(() => {
  renderCharts()
  renderCustom()
  renderDetailCharts()
  resizeCharts()
}))
onMounted(() => {
  loadList()
  loadShops()
  loadInsights()
  window.addEventListener('resize', resizeCharts)
})
onActivated(() => nextTick(() => {
  renderCharts()
  resizeCharts()
}))
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  Object.values(charts).forEach(chart => chart?.dispose())
})
</script>

<style scoped>
.crm-page {
  height: calc(100vh - 84px);
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;
  overflow: hidden;
  background: #f4f6fb;
}
.crm-side {
  order: 1;
}
.crm-main {
  order: 2;
}
.crm-main,
.crm-side,
.crm-pane {
  background: #fff;
  border: 1px solid #e7ebf3;
  border-radius: 16px;
}
.crm-main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 12px 12px;
  overflow: hidden;
}
.crm-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.crm-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.crm-tabs :deep(.el-tabs__content) {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.crm-tabs :deep(.el-tab-pane) {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.crm-analysis {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.crm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.crm-shop {
  width: 280px;
  flex: none;
}
.crm-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}
.crm-stat {
  min-width: 0;
  padding: 2px 8px;
}
.crm-stat span,
.crm-range,
.crm-chart header em,
.muted {
  color: #98a2b3;
  font-size: 12px;
  font-style: normal;
}
.crm-stat strong {
  display: block;
  margin-top: 2px;
  color: #1d2433;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 650;
}
.crm-stat strong small {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 600;
}
.crm-stat em,
.crm-stat .is-money {
  display: block;
  margin-top: 2px;
  color: #667085;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}
.crm-stat .is-money {
  font-size: 20px;
  color: #1d2433;
  font-weight: 650;
}
.crm-range {
  margin: 0;
  text-align: right;
}
.crm-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(0, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.crm-stage.is-focus {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr) 108px;
}
.crm-stage.is-focus .crm-chart.is-focus {
  grid-column: 1 / -1;
  grid-row: 1;
}
.crm-stage.is-focus .crm-chart.is-mini {
  grid-row: 2;
}
.crm-chart {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 10px 4px;
  background: #f8f9fc;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
}
.crm-chart.is-focus {
  background: #fff;
  border-color: #d9ecff;
  cursor: default;
}
.crm-chart.is-mini header em,
.crm-chart.is-mini .crm-custom__controls {
  display: none;
}
.crm-focus {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: #409EFF;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.crm-custom__controls {
  display: flex;
  flex: none;
  gap: 6px;
}
.crm-custom__controls :deep(.el-select) {
  width: 128px;
}
.crm-chart header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #344054;
  font-size: 13px;
  font-weight: 600;
}
.crm-chart header span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crm-chart--custom header {
  flex-wrap: wrap;
}
.crm-chart header em {
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.crm-chart__canvas {
  flex: 1;
  min-height: 0;
}
.crm-pane.crm-detail {
  height: 100%;
  overflow: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.crm-detail .crm-orders {
  flex: none;
  overflow: visible;
}
.crm-story {
  margin: 0 14px 10px;
  color: #344054;
  font-size: 13px;
  line-height: 1.5;
}
.crm-detail-charts {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: 10px;
  height: 220px;
  margin: 0 14px 12px;
  flex: none;
}
.crm-detail-charts .crm-chart {
  cursor: default;
  height: 100%;
}
.crm-chart__note {
  margin: auto 0;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.5;
}
.crm-custom {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.crm-guide {
  flex: none;
  padding: 12px 14px;
  background: #f8f9fc;
  border-radius: 12px;
}
.crm-guide h3 {
  margin: 0 0 8px;
  color: #1d2433;
  font-size: 14px;
}
.crm-guide ol {
  margin: 0;
  padding-left: 18px;
  color: #475467;
  font-size: 13px;
  line-height: 1.6;
}
.crm-guide p {
  margin: 8px 0 0;
  color: #98a2b3;
  font-size: 12px;
}
.crm-custom__bar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}
.crm-custom__bar label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
  color: #667085;
  font-size: 12px;
}
.crm-custom__bar :deep(.el-select) {
  width: 180px;
}
.crm-custom__chart {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  padding: 8px 10px 4px;
  background: #f8f9fc;
  border-radius: 12px;
}
.crm-custom__chart .crm-chart__canvas {
  flex: 1;
  min-height: 0;
}
.crm-side {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.crm-side .crm-pane {
  height: 100%;
  border: 0;
  border-radius: 0;
}
.crm-pane {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.crm-side__hint {
  margin: -4px 0 10px;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.5;
}
.crm-pane__head,
.crm-profile {
  flex: none;
  padding: 14px 14px 10px;
}
.crm-pane__head h2,
.crm-profile__title h2 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #1d2433;
}
.crm-pane__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.crm-pane__filters :deep(.el-select) {
  width: 120px;
}
.crm-cards,
.crm-orders {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 12px 8px;
}
.crm-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.crm-pager {
  flex: none;
  padding: 8px 10px 10px;
  border-top: 1px solid #eef1f6;
}
.crm-pager :deep(.el-pagination) {
  justify-content: flex-end;
  margin: 0;
}
.crm-card {
  width: 100%;
  text-align: left;
  border: 1px solid #eef1f6;
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}
.crm-card:hover,
.crm-card.is-active {
  border-color: #409EFF;
  background: #ecf5ff;
}
.crm-card__top,
.crm-card__foot,
.crm-profile__title,
.crm-order__head,
.crm-order__id {
  display: flex;
  align-items: center;
  gap: 8px;
}
.crm-card__top strong,
.crm-product__body strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crm-card__meta,
.crm-card__time {
  color: #98a2b3;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.crm-card__foot {
  margin-top: 8px;
  font-size: 12px;
  color: #667085;
}
.crm-card__time {
  margin-left: auto;
}
.crm-platform,
.crm-repeat,
.crm-status {
  flex: none;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 18px;
}
.crm-platform.is-ebay {
  color: #b54708;
  background: #fff4e8;
}
.crm-platform.is-whatnot {
  color: #027a48;
  background: #ecfdf3;
}
.crm-repeat {
  color: #b42318;
  background: #fef3f2;
}
.crm-status {
  color: #475467;
  background: #f2f4f7;
}
.crm-profile {
  border-bottom: 1px solid #eef1f6;
}
.crm-profile__title h2 {
  margin: 0;
}
.crm-facts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.crm-facts div,
.crm-extra p {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}
.crm-facts span,
.crm-extra span,
.crm-order__id span {
  flex: none;
  color: #98a2b3;
}
.crm-facts b {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.crm-extra {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.crm-orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
}
.crm-orders h3 {
  margin: 0;
  color: #1d2433;
  font-size: 14px;
}
.crm-back {
  margin-bottom: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #409EFF;
  font-size: 13px;
  cursor: pointer;
}
.crm-order {
  border: 1px solid #eef1f6;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}
.crm-order__head {
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  color: #475467;
  font-size: 13px;
}
.crm-order__head > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.crm-order__id {
  margin-top: 6px;
  font-size: 13px;
}
.crm-products {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
.crm-product {
  display: flex;
  gap: 12px;
}
.crm-thumb {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  background: #f2f4f7;
  flex: none;
}
.crm-thumb__empty {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  color: #98a2b3;
  font-size: 12px;
}
.crm-product__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.crm-product__tags,
.crm-product__money {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #667085;
  font-size: 12px;
}
.crm-empty {
  margin: auto;
}
@media (max-width: 1280px) {
  .crm-page {
    grid-template-columns: 320px minmax(0, 1fr);
  }
  .crm-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .crm-custom__controls :deep(.el-select) {
    width: 108px;
  }
}
@media (max-width: 960px) {
  .crm-page {
    height: auto;
    overflow: visible;
    grid-template-columns: 1fr;
  }
  .crm-stage,
  .crm-stats {
    grid-template-columns: 1fr;
  }
  .crm-stage.is-focus {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }
  .crm-main,
  .crm-pane {
    min-height: 640px;
  }
}
</style>
