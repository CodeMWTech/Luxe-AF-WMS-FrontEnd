<template>
  <div class="app-container">
    <el-alert
      :title="text('这里展示已确认的供应商结算单。已确认表示结算单已落库且 SKU 累计已结算金额已更新，不代表外部付款完成。', 'This page shows confirmed supplier settlements. Confirmed means records were saved and SKU settled totals updated; it does not mean external payment completed.')"
      type="info"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <el-form v-if="identityResolved && !isSupplierUser" :inline="true" class="query-form">
      <el-form-item :label="text('供应商', 'Supplier')">
        <el-select v-model="queryParams.supplierId" :placeholder="text('全部供应商', 'All suppliers')" clearable filterable>
          <el-option v-for="supplier in supplierOptions" :key="supplier.id" :label="supplier.supplierName" :value="supplier.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">{{ text('查询', 'Search') }}</el-button>
        <el-button icon="Refresh" @click="resetQuery">{{ text('重置', 'Reset') }}</el-button>
      </el-form-item>
    </el-form>

    <div class="table-toolbar">
      <el-button
        type="info"
        icon="Download"
        :loading="exportLoading"
        :disabled="loading || total === 0"
        @click="handleExport"
        v-hasPermi="['wms:vendor:list']"
      >{{ text('\u5bfc\u51fa\u5168\u90e8', 'Export all') }}</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column :label="text('结算单号', 'Settlement no.')" prop="settlementNo" min-width="190" />
      <el-table-column :label="text('供应商', 'Supplier')" prop="supplierName" min-width="160" show-overflow-tooltip />
      <el-table-column :label="text('状态', 'Status')" width="110" align="center">
        <template #default><el-tag type="success">{{ text('已确认', 'Confirmed') }}</el-tag></template>
      </el-table-column>
      <el-table-column label="SKU" prop="skuCount" width="80" align="right" />
      <el-table-column :label="text('商品数量', 'Product qty')" width="105" align="right">
        <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="text('已售数量', 'Delivered')" width="105" align="right">
        <template #default="{ row }">{{ quantity(row.soldQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="text('退货数量', 'Returned')" width="105" align="right">
        <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="text('本次结算金额', 'Settlement amount')" width="145" align="right">
        <template #default="{ row }">{{ money(row.pendingSettlementAmount) }}</template>
      </el-table-column>
      <el-table-column :label="text('确认人', 'Confirmed by')" prop="recordedBy" width="120" />
      <el-table-column :label="text('确认时间', 'Confirmed at')" width="175">
        <template #default="{ row }">{{ displayTime(row.recordedAt) }}</template>
      </el-table-column>
      <el-table-column :label="text('操作', 'Actions')" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewRecord(row.id)">{{ text('明细', 'Details') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-show="total > 0" class="settled-pagination">
      <pagination
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="loadRecords"
      />
    </div>

    <el-dialog
      v-model="detailVisible"
      :title="text('已结算明细', 'Settled details')"
      width="92%"
      top="4vh"
      append-to-body
    >
      <el-descriptions :column="4" border class="detail-summary">
        <el-descriptions-item :label="text('结算单号', 'Settlement no.')">{{ detail.settlementNo || '-' }}</el-descriptions-item>
        <el-descriptions-item :label="text('供应商', 'Supplier')">{{ detail.supplierName || '-' }}</el-descriptions-item>
        <el-descriptions-item :label="text('状态', 'Status')"><el-tag type="success">{{ text('已确认', 'Confirmed') }}</el-tag></el-descriptions-item>
        <el-descriptions-item :label="text('确认时间', 'Confirmed at')">{{ displayTime(detail.recordedAt) }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ detail.skuCount || 0 }}</el-descriptions-item>
        <el-descriptions-item :label="text('商品数量', 'Product qty')">{{ quantity(detail.productQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('已售数量', 'Delivered')">{{ quantity(detail.soldQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('退货数量', 'Returned')">{{ quantity(detail.returnedQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('总结算价格', 'Total settlement')">{{ money(detail.totalSettlementAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('结算前累计', 'Settled before')">{{ money(detail.settledAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('本次结算金额', 'Current settlement')">{{ money(detail.pendingSettlementAmount) }}</el-descriptions-item>
      </el-descriptions>

      <el-table v-loading="detailLoading" :data="detail.lines || []" border stripe max-height="520">
        <el-table-column label="SKU" prop="skuCode" min-width="135" />
        <el-table-column :label="text('商品', 'Item')" prop="itemName" min-width="190" show-overflow-tooltip />
        <el-table-column :label="text('商品数量', 'Product qty')" width="110" align="right">
          <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('已售', 'Delivered')" width="90" align="right">
          <template #default="{ row }">{{ quantity(row.soldQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('退货', 'Returned')" width="90" align="right">
          <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('单价', 'Unit price')" width="110" align="right">
          <template #default="{ row }">{{ money(row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column :label="text('结算前累计', 'Settled before')" width="125" align="right">
          <template #default="{ row }">{{ money(row.settledAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('本次结算金额', 'Current settlement')" width="140" align="right">
          <template #default="{ row }">{{ money(row.pendingSettlementAmount) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="SupplierSettled">
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { getCurrentSupplier, listSupplierNoPage } from '@/api/wms/supplier'
import { getSupplierSettlementRecord, listSupplierSettlementRecords } from '@/api/wms/supplierSettlement'

const { proxy } = getCurrentInstance()
const loading = ref(false)
const exportLoading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const identityResolved = ref(false)
const isSupplierUser = ref(false)
const supplierOptions = ref([])
const rows = ref([])
const total = ref(0)
const detail = ref({ lines: [] })

const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
  supplierId: undefined
})

const isEnglish = computed(() => String(proxy?.$i18n?.locale || 'zh-cn').toLowerCase().startsWith('en'))
const text = (zh, en) => isEnglish.value ? en : zh

async function loadRecords() {
  loading.value = true
  try {
    const response = await listSupplierSettlementRecords(queryParams)
    rows.value = response.rows || []
    total.value = Number(response.total || 0)
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  loadRecords()
}

function resetQuery() {
  queryParams.supplierId = undefined
  handleQuery()
}

async function handleExport() {
  exportLoading.value = true
  try {
    await proxy.download(
      'wms/supplier-settlement/settlement/records/export',
      { supplierId: isSupplierUser.value ? undefined : queryParams.supplierId },
      `${text('\u5df2\u7ed3\u7b97\u8bb0\u5f55', 'Settled_Records')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  } finally {
    exportLoading.value = false
  }
}

async function viewRecord(id) {
  detailLoading.value = true
  detailVisible.value = true
  try {
    const response = await getSupplierSettlementRecord(id)
    detail.value = response.data || { lines: [] }
  } finally {
    detailLoading.value = false
  }
}

function quantity(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function money(value) {
  return new Intl.NumberFormat(isEnglish.value ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value || 0))
}

function displayTime(value) {
  return value ? String(value).replace('T', ' ') : '-'
}

async function resolveIdentity() {
  try {
    const response = await getCurrentSupplier()
    isSupplierUser.value = !!response.data?.isSupplier
    if (!isSupplierUser.value) {
      const supplierResponse = await listSupplierNoPage({ status: 0 })
      supplierOptions.value = supplierResponse.data || []
    }
  } finally {
    identityResolved.value = true
  }
}

onMounted(async () => {
  await resolveIdentity()
  await loadRecords()
})
</script>

<style scoped>
.page-alert,
.query-form,
.detail-summary {
  margin-bottom: 16px;
}

.query-form {
  padding: 16px 16px 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}


.settled-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: 16px;
  overflow-x: auto;
  box-sizing: border-box;
}

.settled-pagination :deep(.pagination-container) {
  position: static !important;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  min-height: 32px;
  margin: 0;
  padding: 0 !important;
  background: transparent;
}

.settled-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
  width: auto;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .settled-pagination {
    justify-content: flex-start;
  }
}
</style>
