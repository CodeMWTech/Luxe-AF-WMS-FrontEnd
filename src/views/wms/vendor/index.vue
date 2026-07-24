<template>
  <div class="app-container supplier-settlement-page">
    <el-alert
      :title="text('智能结算只按弹窗中选择的供货商生成明细。确认后保存结算单和明细，并更新 SKU 累计已结算金额；当前不调用外部付款。', 'Smart settlement uses only the supplier selected in its dialog. Confirmation saves the order and details and updates each SKU settled total; no external payment is made.')"
      type="info"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <el-form ref="queryRef" :model="queryParams" :inline="true" label-width="92px" class="query-form">
      <el-form-item :label="text('商品名称', 'Item')" prop="itemName">
        <el-input v-model="queryParams.itemName" :placeholder="text('请输入商品名称', 'Enter item name')" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="SKU" prop="skuCode">
        <el-input v-model="queryParams.skuCode" placeholder="SKU" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item v-if="identityResolved && !isSupplierUser" :label="text('供货商', 'Supplier')" prop="supplierId">
        <el-select v-model="queryParams.supplierId" :placeholder="text('全部供货商', 'All suppliers')" clearable filterable>
          <el-option v-for="supplier in supplierOptions" :key="supplier.id" :label="supplier.supplierName" :value="supplier.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('统计状态', 'Status')" prop="quantityStatus">
        <el-select v-model="queryParams.quantityStatus" :placeholder="text('全部状态', 'All statuses')" clearable>
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('商品上架时间', 'Item listed at')" label-width="118px" class="listed-time-filter">
        <el-date-picker
          class="listed-time-picker"
          v-model="createdTimeRange"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          :range-separator="text('至', 'to')"
          :start-placeholder="text('开始时间', 'Start time')"
          :end-placeholder="text('结束时间', 'End time')"
          clearable
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">{{ text('查询', 'Search') }}</el-button>
        <el-button icon="Refresh" @click="resetQuery">{{ text('重置', 'Reset') }}</el-button>
        <el-button
          type="info"
          icon="Download"
          :loading="exportLoading"
          :disabled="loading || total === 0"
          @click="handleExport"
          v-hasPermi="['wms:vendor:list']"
        >{{ text('\u5bfc\u51fa\u5168\u90e8', 'Export all') }}</el-button>
        <el-button
          v-if="canPreviewSettlement"
          type="success"
          icon="Money"
          :loading="previewLoading"
          @click="openSettlementPreview"
        >{{ text('智能结算', 'Smart settlement') }}</el-button>
      </el-form-item>
    </el-form>

    <div class="summary-grid" v-loading="summaryLoading">
      <div v-for="card in summaryCards" :key="card.key" class="summary-card" :class="card.className">
        <span>{{ card.label }}</span>
        <strong>{{ card.money ? money(card.value) : quantity(card.value) }}</strong>
      </div>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe class="overview-table">
      <el-table-column :label="text('商品', 'Item')" min-width="260" fixed="left">
        <template #default="{ row }">
          <div class="item-cell">
            <el-image
              class="item-image"
              :src="row.mainThumbUrl || row.mainImageUrl"
              :preview-src-list="row.mainImageUrl ? [row.mainImageUrl] : []"
              preview-teleported
              fit="cover"
            >
              <template #error><div class="image-empty">-</div></template>
            </el-image>
            <div class="item-meta">
              <strong>{{ row.itemName || '-' }}</strong>
              <span>{{ row.brandName || '-' }}<template v-if="row.categoryName"> · {{ row.categoryName }}</template></span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="text('供货商', 'Supplier')" prop="supplierName" min-width="150" show-overflow-tooltip />
      <el-table-column label="SKU" prop="skuCode" min-width="145" show-overflow-tooltip />
      <el-table-column :label="text('商品个数', 'Added')" align="right" min-width="105">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('product', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('product', row)">
            {{ quantity(row.productQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.productQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('未入库', 'Not inbound')" align="right" min-width="105">
        <template #default="{ row }"><span class="warning-text">{{ quantity(row.unreceivedQuantity) }}</span></template>
      </el-table-column>
      <el-table-column :label="text('已入库', 'Inbound')" align="right" min-width="100">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('received', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('received', row)">
            {{ quantity(row.receivedQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.receivedQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('商品上架时间', 'Item listed at')" align="center" min-width="170">
        <template #default="{ row }">{{ displayTime(row.createdTime) }}</template>
      </el-table-column>
      <el-table-column :label="text('入库时间', 'Inbound time')" align="center" min-width="170">
        <template #default="{ row }">{{ displayTime(row.firstReceiptTime) }}</template>
      </el-table-column>
      <el-table-column :label="text('在仓', 'In stock')" align="right" min-width="90">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('inventory', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('inventory', row)">
            {{ quantity(row.inventoryQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.inventoryQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('已售', 'Delivered')" align="right" min-width="90">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('sold', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('sold', row)">
            {{ quantity(row.soldQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.soldQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('退货', 'Returned')" align="right" min-width="90">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('returned', row)" type="danger" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('returned', row)">
            {{ quantity(row.returnedQuantity) }}
          </el-link>
          <span v-else :class="{ 'danger-text': Number(row.returnedQuantity) > 0 }">{{ quantity(row.returnedQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('结算单价', 'Unit cost')" align="right" min-width="110">
        <template #default="{ row }">{{ money(row.unitCost) }}</template>
      </el-table-column>
      <el-table-column :label="text('已结算价格', 'Settled')" align="right" min-width="125">
        <template #default="{ row }">{{ money(row.settledAmount) }}</template>
      </el-table-column>
      <el-table-column :label="text('总结算价格', 'Total payable')" align="right" min-width="135">
        <template #default="{ row }">{{ money(row.totalSettlementAmount) }}</template>
      </el-table-column>
      <el-table-column :label="text('待结算/抵扣', 'Pending / deduction')" align="right" min-width="145" fixed="right">
        <template #default="{ row }">
          <el-tag :type="settlementTagType(row.pendingSettlementAmount)" effect="plain">
            {{ money(row.pendingSettlementAmount) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div v-show="total > 0" class="supplier-pagination">
      <pagination
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="loadData"
      />
    </div>

    <el-dialog
      v-model="supplierSelectVisible"
      :title="text('选择结算供货商', 'Select settlement supplier')"
      width="480px"
      append-to-body
      destroy-on-close
    >
      <el-alert
        :title="text('智能结算不会使用当前列表的商品、SKU、状态或时间筛选，只结算这里选择的供货商。', 'Smart settlement ignores the current item, SKU, status and date filters, and uses only the supplier selected here.')"
        type="info"
        show-icon
        :closable="false"
        class="preview-alert"
      />
      <el-form ref="supplierSelectRef" :model="settlementSelection" :rules="settlementSelectionRules" label-width="90px">
        <el-form-item :label="text('供货商', 'Supplier')" prop="supplierId">
          <el-select
            v-model="settlementSelection.supplierId"
            :placeholder="text('请选择供货商', 'Select a supplier')"
            filterable
            style="width: 100%"
          >
            <el-option v-for="supplier in supplierOptions" :key="supplier.id" :label="supplier.supplierName" :value="supplier.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplierSelectVisible = false">{{ text('取消', 'Cancel') }}</el-button>
        <el-button type="primary" :loading="previewLoading" @click="loadSettlementPreview">
          {{ text('生成结算明细', 'Generate details') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      :title="text('智能结算金额预览', 'Smart settlement preview')"
      width="92%"
      top="4vh"
      append-to-body
      destroy-on-close
    >
      <el-alert
        :title="text('确认后将保存结算单和明细，并更新 SKU 累计已结算金额；不会发起外部付款。负数待结算金额会冲减累计已结算金额。', 'Confirmation saves the order and details and updates SKU settled totals; it does not initiate external payment. Negative pending amounts reduce settled totals.')"
        type="warning"
        show-icon
        :closable="false"
        class="preview-alert"
      />
      <el-descriptions :column="4" border class="preview-summary">
        <el-descriptions-item :label="text('供货商', 'Supplier')">{{ preview.supplierName || text('多个供货商', 'Multiple suppliers') }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ preview.skuCount || 0 }}</el-descriptions-item>
        <el-descriptions-item :label="text('全部商品数量', 'All product qty')">{{ quantity(preview.productQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('已售数量', 'Delivered qty')">{{ quantity(preview.soldQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('退货数量', 'Returned qty')">{{ quantity(preview.returnedQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('销售成本总额', 'Gross cost')">{{ money(preview.grossAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('退货抵扣', 'Return deduction')">{{ money(preview.returnDeductionAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('总结算价格', 'Total settlement value')">{{ money(preview.totalSettlementAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('累计已结算', 'Settled')">{{ money(preview.settledAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('本次待结算', 'Pending')">
          <strong :class="Number(preview.pendingSettlementAmount) < 0 ? 'danger-text' : 'success-text'">{{ money(preview.pendingSettlementAmount) }}</strong>
        </el-descriptions-item>
      </el-descriptions>

      <el-table :data="preview.lines || []" border stripe max-height="520">
        <el-table-column :label="text('供货商', 'Supplier')" prop="supplierName" min-width="140" />
        <el-table-column label="SKU" prop="skuCode" min-width="135" />
        <el-table-column :label="text('商品', 'Item')" prop="itemName" min-width="180" show-overflow-tooltip />
        <el-table-column :label="text('全部商品数量', 'All product qty')" align="right" width="125">
          <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('已售数量', 'Delivered')" align="right" width="100">
          <template #default="{ row }">{{ quantity(row.soldQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('退货数量', 'Returned')" align="right" width="100">
          <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('净结算数量', 'Net qty')" align="right" width="115">
          <template #default="{ row }">{{ quantity(row.settleableQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('单价', 'Unit price')" align="right" width="105">
          <template #default="{ row }">{{ money(row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column :label="text('总结算价格', 'Total settlement')" align="right" width="130">
          <template #default="{ row }">{{ money(row.totalSettlementAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('已结算', 'Settled')" align="right" width="110">
          <template #default="{ row }">{{ money(row.settledAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('本次待结算', 'Pending')" align="right" width="130">
          <template #default="{ row }"><span :class="Number(row.pendingSettlementAmount) < 0 ? 'danger-text' : ''">{{ money(row.pendingSettlementAmount) }}</span></template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="previewVisible = false">{{ text('关闭', 'Close') }}</el-button>
        <el-button
          type="primary"
          :loading="confirmLoading"
          :disabled="!(preview.lines || []).length"
          @click="confirmSettlement"
        >{{ text('确认结算', 'Confirm settlement') }}</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup name="SupplierSettlement">
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentSupplier, listSupplierNoPage } from '@/api/wms/supplier'
import {
  confirmSupplierSettlement,
  getSupplierSkuSummary,
  listSupplierSkuOverview,
  previewSupplierSettlement
} from '@/api/wms/supplierSettlement'

const { proxy } = getCurrentInstance()
const router = useRouter()
const loading = ref(false)
const exportLoading = ref(false)
const summaryLoading = ref(false)
const previewLoading = ref(false)
const confirmLoading = ref(false)
const supplierSelectVisible = ref(false)
const previewVisible = ref(false)
const supplierSelectRef = ref()
const rows = ref([])
const total = ref(0)
const supplierOptions = ref([])
const identityResolved = ref(false)
const isSupplierUser = ref(false)
const currentSupplierId = ref(null)
const createdTimeRange = ref([])
const preview = ref({ lines: [] })
const settlementSelection = reactive({
  supplierId: undefined
})
const settlementSelectionRules = computed(() => ({
  supplierId: [{ required: true, message: text('请选择供货商', 'Select a supplier'), trigger: 'change' }]
}))

const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
  supplierId: undefined,
  itemName: undefined,
  skuCode: undefined,
  quantityStatus: undefined
})

const summary = reactive({
  skuCount: 0,
  supplierCount: 0,
  productQuantity: 0,
  unreceivedQuantity: 0,
  receivedQuantity: 0,
  inventoryQuantity: 0,
  soldQuantity: 0,
  returnedQuantity: 0,
  settledAmount: 0,
  totalSettlementAmount: 0,
  pendingSettlementAmount: 0
})

const isEnglish = computed(() => String(proxy?.$i18n?.locale || 'zh-cn').toLowerCase().startsWith('en'))
const text = (zh, en) => isEnglish.value ? en : zh

const statusOptions = computed(() => [
  { value: 'UNRECEIVED', label: text('有未入库商品', 'Not inbound') },
  { value: 'RECEIVED', label: text('有入库商品', 'Inbound') },
  { value: 'IN_STOCK', label: text('当前在仓', 'In stock') },
  { value: 'SOLD', label: text('已有销售', 'Delivered') },
  { value: 'RETURNED', label: text('存在退货', 'Returned') },
  { value: 'UNSETTLED', label: text('待结算', 'Unsettled') },
  { value: 'SETTLED', label: text('已结清', 'Settled') },
  { value: 'DEDUCTION', label: text('需要退货抵扣', 'Return deduction') }
])

const summaryCards = computed(() => [
  { key: 'sku', label: text('SKU 种类', 'SKUs'), value: summary.skuCount },
  { key: 'product', label: text('商品个数', 'Added'), value: summary.productQuantity },
  { key: 'unreceived', label: text('未入库', 'Not inbound'), value: summary.unreceivedQuantity, className: 'warning' },
  { key: 'received', label: text('已入库', 'Inbound'), value: summary.receivedQuantity },
  { key: 'inventory', label: text('在仓', 'In stock'), value: summary.inventoryQuantity },
  { key: 'sold', label: text('已售', 'Delivered'), value: summary.soldQuantity, className: 'success' },
  { key: 'returned', label: text('退货', 'Returned'), value: summary.returnedQuantity, className: 'danger' },
  { key: 'settled', label: text('已结算价格', 'Settled'), value: summary.settledAmount, money: true },
  { key: 'total', label: text('总结算价格', 'Total payable'), value: summary.totalSettlementAmount, money: true },
  { key: 'pending', label: text('待结算/抵扣', 'Pending / deduction'), value: summary.pendingSettlementAmount, money: true, className: Number(summary.pendingSettlementAmount) < 0 ? 'danger' : 'success' }
])

const canPreviewSettlement = computed(() => identityResolved.value && !isSupplierUser.value && !!proxy?.$auth?.hasPermi('wms:vendor:settlement:preview'))

const skuPageTargets = {
  product: {
    route: { name: 'Item' },
    permission: 'wms:item:list',
    quantityField: 'productQuantity'
  },
  received: {
    route: { name: 'ReceiptOrder' },
    permission: 'wms:receipt:all',
    quantityField: 'receivedQuantity'
  },
  inventory: {
    route: { name: 'Inventory' },
    permission: 'wms:inventory:all',
    quantityField: 'inventoryQuantity',
    query: { inStock: '1' }
  },
  sold: {
    route: { name: 'PlatformOrders' },
    permission: 'wms:platform:list',
    quantityField: 'soldQuantity',
    query: { orderStatus: 'DELIVERED' }
  },
  returned: {
    route: { name: 'ReceiptOrder' },
    permission: 'wms:receipt:all',
    quantityField: 'returnedQuantity',
    query: { receiptType: 'RETURN' }
  }
}

function canOpenSkuPage(type, row) {
  const target = skuPageTargets[type]
  return !!target && !!row?.skuCode && Number(row?.[target.quantityField] || 0) > 0
    && !!proxy?.$auth?.hasPermi(target.permission)
}

function openSkuPage(type, row) {
  if (!canOpenSkuPage(type, row)) return
  const target = skuPageTargets[type]
  router.push({ ...target.route, query: { skuCode: row.skuCode, ...target.query } }).catch(() => {})
}

function buildQuery(includePage = true) {
  const params = {
    supplierId: isSupplierUser.value ? undefined : queryParams.supplierId,
    itemName: queryParams.itemName,
    skuCode: queryParams.skuCode,
    quantityStatus: queryParams.quantityStatus,
    createdStartTime: createdTimeRange.value?.[0],
    createdEndTime: createdTimeRange.value?.[1]
  }
  if (includePage) {
    params.pageNum = queryParams.pageNum
    params.pageSize = queryParams.pageSize
  }
  return params
}

async function loadData() {
  loading.value = true
  summaryLoading.value = true
  try {
    const [listResponse, summaryResponse] = await Promise.all([
      listSupplierSkuOverview(buildQuery(true)),
      getSupplierSkuSummary(buildQuery(false))
    ])
    rows.value = listResponse.rows || []
    total.value = Number(listResponse.total || 0)
    Object.assign(summary, summaryResponse.data || {})
  } finally {
    loading.value = false
    summaryLoading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  loadData()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  createdTimeRange.value = []
  queryParams.supplierId = undefined
  queryParams.itemName = undefined
  queryParams.skuCode = undefined
  queryParams.quantityStatus = undefined
  handleQuery()
}

async function handleExport() {
  exportLoading.value = true
  try {
    await proxy.download(
      'wms/supplier-settlement/items/export',
      buildQuery(false),
      `${text('\u5df2\u91c7\u8d2d\u5546\u54c1', 'Purchased_Items')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  } finally {
    exportLoading.value = false
  }
}

function openSettlementPreview() {
  settlementSelection.supplierId = undefined
  supplierSelectVisible.value = true
}

async function loadSettlementPreview() {
  const valid = await supplierSelectRef.value?.validate().catch(() => false)
  if (!valid) return
  previewLoading.value = true
  try {
    const response = await previewSupplierSettlement({ supplierId: settlementSelection.supplierId })
    preview.value = response.data || { lines: [] }
    supplierSelectVisible.value = false
    previewVisible.value = true
  } finally {
    previewLoading.value = false
  }
}

async function confirmSettlement() {
  const detail = preview.value || {}
  confirmLoading.value = true
  try {
    await confirmSupplierSettlement({
      previewId: detail.previewId,
      contractVersion: detail.contractVersion,
      supplierId: detail.supplierId,
      previewGeneratedAt: detail.generatedAt,
      productQuantity: detail.productQuantity,
      soldQuantity: detail.soldQuantity,
      returnedQuantity: detail.returnedQuantity,
      totalSettlementAmount: detail.totalSettlementAmount,
      settledAmount: detail.settledAmount,
      pendingSettlementAmount: detail.pendingSettlementAmount,
      lines: (detail.lines || []).map(line => ({
        skuId: line.skuId,
        productQuantity: line.productQuantity,
        soldQuantity: line.soldQuantity,
        returnedQuantity: line.returnedQuantity,
        unitPrice: line.unitPrice,
        totalSettlementAmount: line.totalSettlementAmount,
        settledAmount: line.settledAmount,
        pendingSettlementAmount: line.pendingSettlementAmount
      }))
    })
    proxy.$modal.msgSuccess(text('结算单已保存，SKU 累计已结算金额已更新', 'Settlement saved and SKU settled totals updated'))
    previewVisible.value = false
    await loadData()
  } finally {
    confirmLoading.value = false
  }
}

function quantity(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function displayTime(value) {
  return value ? String(value).replace('T', ' ') : '-'
}

function money(value) {
  const number = Number(value || 0)
  return new Intl.NumberFormat(isEnglish.value ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(number)
}

function settlementTagType(value) {
  const amount = Number(value || 0)
  if (amount < 0) return 'danger'
  if (amount > 0) return 'warning'
  return 'success'
}

async function resolveIdentity() {
  try {
    const response = await getCurrentSupplier()
    const identity = response.data || {}
    isSupplierUser.value = !!identity.isSupplier
    currentSupplierId.value = identity.supplierId || null
    if (isSupplierUser.value) {
      queryParams.supplierId = currentSupplierId.value
    } else {
      const supplierResponse = await listSupplierNoPage({ status: 0 })
      supplierOptions.value = supplierResponse.data || []
    }
  } finally {
    identityResolved.value = true
  }
}

onMounted(async () => {
  await resolveIdentity()
  await loadData()
})
</script>

<style scoped>
.supplier-settlement-page {
  --card-border: #e6e9ef;
}

.page-alert,
.query-form,
.summary-grid,
.overview-table {
  margin-bottom: 16px;
}

.query-form {
  padding: 16px 16px 0;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.listed-time-filter {
  margin-right: 20px;
}

.listed-time-filter :deep(.el-form-item__content) {
  min-width: 360px;
}

.listed-time-picker {
  width: 360px !important;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
}

.summary-card {
  min-height: 82px;
  padding: 14px 16px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sku-metric-link {
  font-weight: 600;
}

.summary-card span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-card strong {
  color: var(--el-text-color-primary);
  font-size: 22px;
}

.summary-card.warning { border-left: 4px solid var(--el-color-warning); }
.summary-card.success { border-left: 4px solid var(--el-color-success); }
.summary-card.danger { border-left: 4px solid var(--el-color-danger); }

.item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-image {
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.item-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-meta strong,
.item-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.warning-text { color: var(--el-color-warning); }
.danger-text { color: var(--el-color-danger); }
.success-text { color: var(--el-color-success); }

.supplier-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: 16px;
  overflow-x: auto;
  box-sizing: border-box;
}

.supplier-pagination :deep(.pagination-container) {
  position: static !important;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  min-height: 32px;
  margin: 0;
  padding: 0 !important;
  background: transparent;
}

.supplier-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
  width: auto;
  justify-content: flex-end;
}

.preview-alert,
.preview-summary {
  margin-bottom: 16px;
}

@media (max-width: 1200px) {
  .summary-grid { grid-template-columns: repeat(3, minmax(140px, 1fr)); }
}

@media (max-width: 768px) {
  .listed-time-filter {
    width: 100%;
    margin-right: 0;
  }

  .listed-time-filter :deep(.el-form-item__content) { min-width: 0; flex: 1; }
  .listed-time-picker { width: 100% !important; }

  .summary-grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
  .supplier-pagination { justify-content: flex-start; }
}
</style>
