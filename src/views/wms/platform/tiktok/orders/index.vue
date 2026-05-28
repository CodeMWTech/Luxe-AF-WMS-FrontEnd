<template>
  <div class="app-container tiktok-orders-page">
    <el-card class="filter-card">
      <el-form
        ref="queryRef"
        :model="queryParams"
        label-width="110px"
        class="filter-form"
        @submit.prevent="handleQuery"
      >
        <el-form-item class="filter-item" label="店铺" prop="shopAuthId">
          <el-select
            v-model="queryParams.shopAuthId"
            placeholder="请选择店铺"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="shop in shopList"
              :key="shop.id"
              :label="formatShopLabel(shop)"
              :value="shop.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item" label="TikTok订单号" prop="platformOrderId">
          <el-input
            v-model="queryParams.platformOrderId"
            placeholder="请输入TikTok订单号"
            clearable
            @keyup.enter.prevent="handleQuery"
          />
        </el-form-item>
        <el-form-item class="filter-item" label="SKU" prop="sellerSku">
          <el-input
            v-model="queryParams.sellerSku"
            placeholder="请输入SKU"
            clearable
            @keyup.enter.prevent="handleQuery"
          />
        </el-form-item>
        <el-form-item class="filter-item" label="订单状态" prop="orderStatus">
          <el-select
            v-model="queryParams.orderStatus"
            placeholder="全部"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in orderStatusOptions"
              :key="item"
              :label="formatStatusText(item)"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item filter-item-time" label="更新时间" prop="orderUpdateTimeRange">
          <el-date-picker
            v-model="queryParams.orderUpdateTimeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" native-type="submit" v-hasPermi="['wms:platform:tiktok:list']">查询</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">重置</el-button>
          <el-button type="success" icon="RefreshRight" class="action-btn" @click="openSyncDialog" v-hasPermi="['wms:platform:tiktok:test']">同步</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <section class="orders-shell">
      <div class="orders-header">
        <div>
          <h2>TikTok Orders</h2>
          <span>纵向订单卡片列表</span>
        </div>
        <el-tag class="platform-soft-tag" effect="plain">TikTok Shop</el-tag>
      </div>

      <div v-loading="loading" class="orders-list">
        <el-empty v-if="!loading && !orderList.length" :description="emptyText" />

        <article
          v-for="(order, index) in orderList"
          :key="orderKey(order, index)"
          class="order-card"
          :class="{ 'is-open': isExpanded(order, index) }"
        >
          <button class="summary-row" type="button" @click="toggleOrder(order, index)">
            <div class="summary-cell order-id-cell">
              <span class="cell-label">订单号</span>
              <span class="primary-value with-copy" @click.stop>
                {{ displayValue(getOrderId(order)) }}
                <el-button
                  v-if="getOrderId(order)"
                  link
                  class="copy-btn"
                  :icon="CopyDocument"
                  v-copyText="getOrderId(order)"
                  v-copyText:callback="copyTextSuccess"
                />
              </span>
            </div>

            <div class="summary-cell meta-cell">
              <span class="cell-label">{{ displayValue(getCreateTime(order)) }}</span>
              <span class="secondary-value">{{ displayValue(getShopName(order)) }} · TikTok</span>
            </div>

            <div class="summary-cell platform-cell">
              <el-tag class="platform-soft-tag" effect="plain">TikTok Shop</el-tag>
            </div>

            <div class="summary-cell customer-cell">
              <span class="cell-label">客户</span>
              <span class="primary-value ellipsis">{{ displayValue(getRecipient(order).name) }}</span>
              <span class="secondary-value ellipsis">{{ displayValue(getAddressRegion(order)) }}</span>
            </div>

            <div class="summary-cell product-cell">
              <span class="cell-label">商品</span>
              <span class="primary-value ellipsis">{{ displayValue(getFirstItem(order).productName) }}</span>
            </div>

            <div class="summary-cell sku-cell">
              <span class="cell-label">品牌/SKU</span>
              <span class="secondary-value ellipsis">{{ displayValue(getSkuText(getFirstItem(order))) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">售价</span>
              <span class="primary-value">{{ formatMoney(getSaleAmount(order), getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">成本</span>
              <span class="secondary-value">{{ formatOptionalMoney(order.cost, getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">毛利</span>
              <span class="secondary-value">{{ formatOptionalMoney(order.grossProfit, getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell status-cell">
              <el-tag :class="['status-tag', `status-${getStatusClass(getStatus(order))}`]" effect="plain">
                {{ formatStatusText(getStatus(order)) }}
              </el-tag>
            </div>

            <span class="expand-btn">
              <el-icon><ArrowDown v-if="isExpanded(order, index)" /><ArrowRight v-else /></el-icon>
            </span>
          </button>

          <transition name="order-expand">
            <div v-show="isExpanded(order, index)" class="detail-area" v-loading="isDetailLoading(order, index)">
              <div class="detail-grid">
                <section class="detail-panel">
                  <h3><el-icon><Goods /></el-icon>商品</h3>
                  <div v-for="(item, itemIndex) in getLineItems(getDisplayOrder(order, index))" :key="item.lineItemId || item.skuId || itemIndex" class="item-block">
                    <InfoLine label="商品名" :value="item.productName" strong />
                    <InfoLine label="SKU" :value="getSkuText(item) || item.skuId" />
                    <InfoLine label="数量" :value="formatQuantity(item.quantity)" />
                    <InfoLine label="状态" :value="item.displayStatus || item.packageStatus" />
                    <InfoLine label="税费" :value="formatTaxes(item.itemTaxes, getCurrency(getDisplayOrder(order, index)))" />
                  </div>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><User /></el-icon>客户</h3>
                  <InfoLine label="姓名" :value="getRecipient(getDisplayOrder(order, index)).name" strong />
                  <InfoLine label="电话">
                    <span class="inline-copy">
                      {{ displayValue(getRecipient(getDisplayOrder(order, index)).phoneNumber) }}
                      <el-button
                        v-if="getRecipient(getDisplayOrder(order, index)).phoneNumber"
                        link
                        class="copy-btn"
                        :icon="CopyDocument"
                        v-copyText="getRecipient(getDisplayOrder(order, index)).phoneNumber"
                        v-copyText:callback="copyTextSuccess"
                      />
                    </span>
                  </InfoLine>
                  <InfoLine label="地址" :value="getRecipient(getDisplayOrder(order, index)).fullAddress" />
                  <InfoLine label="邮编" :value="getRecipient(getDisplayOrder(order, index)).postalCode" />
                  <InfoLine label="地区" :value="getRecipient(getDisplayOrder(order, index)).regionCode" />
                </section>

                <section class="detail-panel">
                  <h3><el-icon><Van /></el-icon>物流</h3>
                  <InfoLine label="收货地址" :value="getRecipient(getDisplayOrder(order, index)).addressDetail || getRecipient(getDisplayOrder(order, index)).fullAddress" />
                  <InfoLine label="物流商" :value="getDisplayOrder(order, index).shippingProvider" />
                  <InfoLine label="配送方式" :value="formatJoin([getDisplayOrder(order, index).shippingType, getDisplayOrder(order, index).fulfillmentType])" />
                  <InfoLine label="追踪号">
                    <span class="inline-copy">
                      {{ displayValue(getDisplayOrder(order, index).trackingNumber) }}
                      <el-button
                        v-if="getDisplayOrder(order, index).trackingNumber"
                        link
                        class="copy-btn"
                        :icon="CopyDocument"
                        v-copyText="getDisplayOrder(order, index).trackingNumber"
                        v-copyText:callback="copyTextSuccess"
                      />
                    </span>
                  </InfoLine>
                  <InfoLine label="仓库" :value="getDisplayOrder(order, index).warehouseId" />
                  <InfoLine label="节点" :value="formatJoin([getDisplayOrder(order, index).rtsTime, getDisplayOrder(order, index).shippingDueTime, getDisplayOrder(order, index).deliveryTime])" />
                </section>

                <section class="detail-panel">
                  <h3><el-icon><Money /></el-icon>支付与费用</h3>
                  <InfoLine label="币种" :value="getCurrency(getDisplayOrder(order, index))" />
                  <InfoLine label="小计" :value="formatMoney(getPayment(getDisplayOrder(order, index)).subTotal, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine label="税费" :value="formatMoney(getPayment(getDisplayOrder(order, index)).tax, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="运费" :value="formatMoney(getPayment(getDisplayOrder(order, index)).shippingFee, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="总额" :value="formatMoney(getPayment(getDisplayOrder(order, index)).totalAmount, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine label="平台折扣" :value="formatMoney(getPayment(getDisplayOrder(order, index)).platformDiscount, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="卖家折扣" :value="formatMoney(getPayment(getDisplayOrder(order, index)).sellerDiscount, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="商品税" :value="formatMoney(getDisplayOrder(order, index).productTax, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="毛利" :value="formatGrossProfit(getDisplayOrder(order, index))" />
                </section>
              </div>

              <section class="notes-panel">
                <h3><el-icon><Memo /></el-icon>备注</h3>
                <div class="notes-grid">
                  <div>
                    <span class="note-label">买家备注</span>
                    <p>{{ displayValue(getDisplayOrder(order, index).buyerMessage || getDisplayOrder(order, index).buyer_message) }}</p>
                  </div>
                  <div>
                    <span class="note-label">内部备注</span>
                    <el-input
                      :model-value="getDisplayOrder(order, index).internalRemark || ''"
                      type="textarea"
                      :rows="2"
                      placeholder="内部备注预留，后续接入接口"
                      disabled
                    />
                  </div>
                </div>
              </section>
            </div>
          </transition>
        </article>
      </div>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </section>

    <el-dialog v-model="syncOpen" title="同步TikTok订单" width="560px" append-to-body>
      <el-alert
        title="不选择开始时间时，后端会自动按店铺 lastSyncTime 增量同步；首次同步默认最近 7 天。"
        type="info"
        show-icon
        :closable="false"
        class="mb20"
      />
      <el-form ref="syncRef" :model="syncForm" :rules="syncRules" label-width="100px">
        <el-form-item label="店铺">
          <el-input :model-value="selectedShopName" disabled />
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-model="syncForm.startTime"
            type="datetime"
            placeholder="请选择开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-date-picker
            v-model="syncForm.endTime"
            type="datetime"
            placeholder="请选择结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="pageSize" prop="pageSize">
          <el-input-number v-model="syncForm.pageSize" :min="1" :max="500" :step="10" controls-position="right" style="width: 180px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="syncOpen = false">取消</el-button>
        <el-button type="primary" :loading="syncLoading" @click="submitSync">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="TiktokOrders">
import { computed, defineComponent, getCurrentInstance, h, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowRight, CopyDocument } from '@element-plus/icons-vue'
import { getTiktokOrder, listTiktokOrders, listTiktokShops, syncTiktokOrders } from '@/api/wms/tiktokOrder'

const InfoLine = defineComponent({
  name: 'InfoLine',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: undefined },
    strong: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () => h('div', { class: ['info-line', props.strong ? 'is-strong' : ''] }, [
      h('span', { class: 'info-label' }, props.label),
      h('span', { class: 'info-value' }, slots.default ? slots.default() : displayValue(props.value))
    ])
  }
})

const { proxy } = getCurrentInstance()

const orderStatusOptions = [
  'AWAITING_SHIPMENT',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'ON_HOLD',
  'UNPAID'
]

const defaultTime = reactive([new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)])
const loading = ref(false)
const syncLoading = ref(false)
const shopLoading = ref(false)
const total = ref(0)
const orderList = ref([])
const shopList = ref([])
const expandedKeys = ref([])
const detailCache = reactive({})
const detailLoading = reactive({})
const syncOpen = ref(false)
const queryRef = ref(null)
const syncRef = ref(null)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  shopAuthId: undefined,
  platformOrderId: undefined,
  orderStatus: undefined,
  sellerSku: undefined,
  orderUpdateTimeRange: []
})

const syncForm = ref({
  startTime: undefined,
  endTime: undefined,
  pageSize: 100
})

const syncRules = {
  pageSize: [{ required: true, message: '请输入 pageSize', trigger: 'blur' }],
  endTime: [{ validator: validateEndTime, trigger: 'change' }]
}

const selectedShop = computed(() => shopList.value.find(item => item.id === queryParams.value.shopAuthId))
const selectedShopName = computed(() => selectedShop.value ? formatShopLabel(selectedShop.value) : '')
const emptyText = computed(() => shopLoading.value ? '店铺加载中' : '暂无TikTok订单数据')

function normalizeQuery() {
  const query = { ...queryParams.value }
  query.platformOrderId = query.platformOrderId?.trim() || undefined
  query.sellerSku = query.sellerSku?.trim() || undefined

  if (query.orderUpdateTimeRange?.length === 2) {
    query.beginOrderUpdateTime = query.orderUpdateTimeRange[0]
    query.endOrderUpdateTime = query.orderUpdateTimeRange[1]
  }
  delete query.orderUpdateTimeRange

  query.orderByColumn = 'updateTime'
  query.isAsc = 'desc'
  return query
}

function getList() {
  loading.value = true
  listTiktokOrders(normalizeQuery()).then(response => {
    const data = response.data || {}
    orderList.value = response.rows || data.rows || data.records || (Array.isArray(data) ? data : [])
    total.value = response.total || data.total || orderList.value.length
    expandedKeys.value = orderList.value.length ? [orderKey(orderList.value[0], 0)] : []
    if (orderList.value.length) {
      ensureDetail(orderList.value[0], 0)
    }
  }).catch(handleApiError).finally(() => {
    loading.value = false
  })
}

function loadShops() {
  shopLoading.value = true
  return listTiktokShops().then(response => {
    const data = response.data || {}
    shopList.value = response.rows || data.rows || data.records || (Array.isArray(data) ? data : [])
  }).catch(handleApiError).finally(() => {
    shopLoading.value = false
  })
}

function toggleOrder(order, index) {
  const key = orderKey(order, index)
  if (expandedKeys.value.includes(key)) {
    expandedKeys.value = expandedKeys.value.filter(item => item !== key)
    return
  }
  expandedKeys.value = [...expandedKeys.value, key]
  ensureDetail(order, index)
}

function ensureDetail(order, index) {
  const key = orderKey(order, index)
  const id = getOrderId(order)
  const shopAuthId = order.shopAuthId || queryParams.value.shopAuthId
  if (!id || !shopAuthId || detailCache[key] || detailLoading[key]) return

  detailLoading[key] = true
  getTiktokOrder(id, shopAuthId).then(response => {
    detailCache[key] = response.data || response
  }).catch(handleApiError).finally(() => {
    detailLoading[key] = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  queryParams.value.orderUpdateTimeRange = []
  handleQuery()
}

function openSyncDialog() {
  if (!queryParams.value.shopAuthId) {
    proxy.$modal.msgWarning('请先选择店铺')
    return
  }
  syncForm.value = { startTime: undefined, endTime: undefined, pageSize: 100 }
  syncOpen.value = true
}

function submitSync() {
  syncRef.value.validate(valid => {
    if (!valid) return
    syncLoading.value = true
    const data = {
      startTime: syncForm.value.startTime || undefined,
      endTime: syncForm.value.endTime || undefined,
      pageSize: syncForm.value.pageSize
    }
    syncTiktokOrders(queryParams.value.shopAuthId, data).then(response => {
      const result = response.data || {}
      proxy.$modal.msgSuccess(`同步完成：订单 ${result.orderCount || 0} 笔，SKU 行 ${result.skuRowCount || 0} 条，最大更新时间 ${result.maxOrderUpdateTime || '-'}`)
      syncOpen.value = false
      getList()
      loadShops()
    }).catch(handleApiError).finally(() => {
      syncLoading.value = false
    })
  })
}

function validateEndTime(rule, value, callback) {
  if (syncForm.value.startTime && value && value < syncForm.value.startTime) {
    callback(new Error('结束时间不能早于开始时间'))
    return
  }
  callback()
}

function orderKey(order, index) {
  return `${getOrderId(order) || order.id || 'order'}-${order.shopAuthId || queryParams.value.shopAuthId || 'shop'}-${index}`
}

function isExpanded(order, index) {
  return expandedKeys.value.includes(orderKey(order, index))
}

function isDetailLoading(order, index) {
  return Boolean(detailLoading[orderKey(order, index)])
}

function getDisplayOrder(order, index) {
  return detailCache[orderKey(order, index)] || order || {}
}

function getOrderId(order) {
  return order?.orderId || order?.platformOrderId
}

function getStatus(order) {
  return order?.status || order?.orderStatus
}

function getCreateTime(order) {
  return order?.createTime || order?.orderCreateTime
}

function getShopName(order) {
  return order?.shopName || order?.platformShopId
}

function getPayment(order) {
  return order?.payment || {}
}

function getRecipient(order) {
  return order?.recipientAddress || {}
}

function getLineItems(order) {
  const items = order?.lineItems
  if (Array.isArray(items) && items.length) return items
  return [{
    productName: order?.productName,
    sellerSku: order?.sellerSku,
    skuName: order?.skuName,
    skuId: order?.platformSkuId,
    quantity: order?.quantity,
    salePrice: order?.salePrice,
    displayStatus: order?.displayStatus,
    packageStatus: order?.packageStatus,
    itemTaxes: order?.itemTaxes
  }]
}

function getFirstItem(order) {
  return getLineItems(order)[0] || {}
}

function getSkuText(item) {
  return item?.sellerSku || item?.skuName
}

function getCurrency(order) {
  return order?.currency || getPayment(order).currency || 'USD'
}

function getSaleAmount(order) {
  const item = getFirstItem(order)
  return firstPresent(item.salePrice, item.skuTotalAmount, getPayment(order).subTotal, order?.salePrice, order?.orderTotalAmount)
}

function getAddressRegion(order) {
  const address = getRecipient(order)
  return address.fullAddress || address.regionCode
}

function firstPresent(...values) {
  return values.find(value => value !== null && value !== undefined && value !== '')
}

function displayValue(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

function formatJoin(values) {
  const result = values.filter(value => value !== null && value !== undefined && value !== '').join(' / ')
  return result || '-'
}

function formatQuantity(value) {
  if (value === null || value === undefined || value === '') return '1'
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, '')
}

function formatMoney(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: number % 1 === 0 ? 0 : 2
    }).format(number)
  } catch {
    return `${currency || ''} ${number.toLocaleString('en-US')}`.trim()
  }
}

function formatOptionalMoney(value, currency) {
  return value === null || value === undefined || value === '' ? '-' : formatMoney(value, currency)
}

function formatGrossProfit(order) {
  return order.grossProfit === null || order.grossProfit === undefined || order.grossProfit === ''
    ? '待计算'
    : formatMoney(order.grossProfit, getCurrency(order))
}

function formatTaxes(taxes, currency) {
  if (!taxes) return '-'
  if (Array.isArray(taxes)) {
    return taxes.map(item => {
      const name = item.taxType || item.name || 'Tax'
      const amount = firstPresent(item.amount, item.taxAmount, item.value)
      return `${name}: ${formatMoney(amount, currency)}`
    }).join('，') || '-'
  }
  if (typeof taxes === 'object') {
    return Object.entries(taxes).map(([key, value]) => `${key}: ${formatMoney(value, currency)}`).join('，') || '-'
  }
  return taxes
}

function formatStatusText(status) {
  const map = {
    DELIVERED: '已送达',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REFUNDED: '已退款',
    ON_HOLD: '冻结',
    AWAITING_SHIPMENT: '待发货',
    IN_TRANSIT: '运输中',
    UNPAID: '待支付'
  }
  return map[status] || status || '-'
}

function getStatusClass(status) {
  if (['DELIVERED', 'COMPLETED'].includes(status)) return 'success'
  if (['CANCELLED', 'REFUNDED'].includes(status)) return 'muted'
  if (status === 'ON_HOLD') return 'warning'
  if (status === 'AWAITING_SHIPMENT') return 'primary'
  return 'info'
}

function formatShopLabel(shop) {
  const suffix = shop.region ? ` (${shop.region})` : ''
  return `${shop.shopName || shop.shopId || shop.id}${suffix}`
}

function copyTextSuccess() {
  proxy.$modal.msgSuccess('已复制')
}

function handleApiError(error) {
  const status = error?.response?.status
  const code = error?.response?.data?.code
  if (status === 401 || code === 401) {
    proxy.$modal.msgError('登录已过期，请重新登录')
    return
  }
  if ([401, 403].includes(status) || [401, 403].includes(code)) {
    proxy.$modal.msgError('当前账号缺少 TikTok 平台权限')
  }
}

onMounted(() => {
  loadShops()
  getList()
})
</script>

<style lang="scss">
.tiktok-orders-page {
  background: #f6f7fb;
}

.tiktok-orders-page .filter-card {
  border-radius: 8px;
  border: 1px solid #e7eaf0;
}

.tiktok-orders-page .filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
}

.tiktok-orders-page .filter-item {
  width: calc(25% - 12px);
  margin-right: 0;
}

.tiktok-orders-page .filter-item-time {
  width: calc(50% - 8px);
}

.tiktok-orders-page .filter-item-actions {
  width: 100%;
}

.tiktok-orders-page .action-btn {
  min-width: 96px;
}

.orders-shell {
  margin-top: 20px;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.orders-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1f2d3d;
}

.orders-header span {
  color: #8a94a6;
  font-size: 13px;
}

.orders-list {
  min-height: 160px;
}

.order-card {
  overflow: hidden;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #e5e9f0;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(31, 45, 61, 0.05);
}

.summary-row {
  display: grid;
  grid-template-columns: minmax(150px, 1.15fr) minmax(150px, 1.1fr) 116px minmax(130px, 1fr) minmax(180px, 1.5fr) minmax(120px, 1fr) 92px 82px 82px 104px 36px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 76px;
  padding: 12px 14px;
  border: 0;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.summary-row:hover {
  background: #fbfcff;
}

.summary-cell {
  min-width: 0;
}

.cell-label,
.info-label,
.note-label {
  display: block;
  margin-bottom: 4px;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.2;
}

.primary-value {
  color: #1f2d3d;
  font-weight: 600;
  font-size: 14px;
}

.secondary-value {
  color: #667085;
  font-size: 13px;
}

.ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.with-copy,
.inline-copy {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 4px;
}

.copy-btn {
  min-height: 22px;
  padding: 0;
  color: #98a2b3;
}

.platform-soft-tag {
  color: #d12975;
  background: #fff0f7;
  border-color: #ffd1e4;
}

.status-tag {
  border: 0;
  font-weight: 600;
}

.status-success {
  color: #067647;
  background: #ecfdf3;
}

.status-muted {
  color: #667085;
  background: #f2f4f7;
}

.status-warning {
  color: #b54708;
  background: #fffaeb;
}

.status-primary {
  color: #175cd3;
  background: #eff8ff;
}

.status-info {
  color: #475467;
  background: #f8fafc;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #667085;
  border-radius: 50%;
  background: #f2f4f7;
}

.detail-area {
  padding: 16px;
  background: #f7f8fa;
  border-top: 1px solid #edf0f5;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.detail-panel,
.notes-panel {
  background: transparent;
}

.detail-panel h3,
.notes-panel h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  color: #344054;
  font-size: 15px;
}

.item-block + .item-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #d9dee8;
}

.info-line {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 9px;
  color: #667085;
  font-size: 13px;
  line-height: 1.45;
}

.info-line .info-label {
  margin: 0;
}

.info-value {
  min-width: 0;
  word-break: break-word;
}

.info-line.is-strong .info-value {
  color: #1f2d3d;
  font-weight: 600;
}

.notes-panel {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e5e9f0;
}

.notes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.notes-grid p {
  min-height: 36px;
  margin: 0;
  color: #475467;
}

.order-expand-enter-active,
.order-expand-leave-active {
  transition: all 0.18s ease;
}

.order-expand-enter-from,
.order-expand-leave-to {
  opacity: 0;
}

@media (max-width: 1600px) {
  .tiktok-orders-page .filter-item {
    width: calc(33.33% - 11px);
  }

  .tiktok-orders-page .filter-item-time {
    width: calc(66.66% - 6px);
  }

  .summary-row {
    grid-template-columns: minmax(150px, 1.1fr) minmax(150px, 1fr) minmax(130px, 1fr) minmax(170px, 1.4fr) minmax(120px, 1fr) 92px 82px 82px 104px 36px;
  }

  .platform-cell {
    display: none;
  }
}

@media (max-width: 1200px) {
  .tiktok-orders-page .filter-item,
  .tiktok-orders-page .filter-item-time {
    width: calc(50% - 8px);
  }

  .summary-row {
    grid-template-columns: repeat(3, minmax(0, 1fr)) 36px;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .tiktok-orders-page .filter-item,
  .tiktok-orders-page .filter-item-time,
  .tiktok-orders-page .filter-item-actions {
    width: 100%;
  }

  .orders-header {
    align-items: flex-start;
    gap: 8px;
    flex-direction: column;
  }

  .summary-row,
  .detail-grid,
  .notes-grid {
    grid-template-columns: 1fr;
  }

  .summary-row {
    gap: 10px;
    padding-right: 52px;
    position: relative;
  }

  .expand-btn {
    position: absolute;
    right: 12px;
    top: 14px;
  }

  .detail-area {
    padding: 14px;
  }
}
</style>
