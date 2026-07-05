<template>
  <div class="app-container vendor-items-page">
    <VendorWorkflowSteps v-if="showWorkflow && supplierResolved && !isSupplierUser" :active="active" />

    <div class="vendor-summary">
      <div class="summary-item">
        <span>{{ tr('已选购') }}</span>
        <strong>{{ tr('商品种类') }} {{ summary.selectedSkuCount || 0 }}</strong>
        <small>{{ tr('商品数量') }} {{ formatQty(summary.selectedQuantity) }}</small>
      </div>
      <div class="summary-item">
        <span>{{ tr('未收货') }}</span>
        <strong>{{ tr('商品种类') }} {{ summary.unreceivedSkuCount || 0 }}</strong>
        <small>{{ tr('商品数量') }} {{ formatQty(summary.unreceivedQuantity) }}</small>
      </div>
      <div class="summary-item">
        <span>{{ tr('未结款') }}</span>
        <strong>{{ tr('商品种类') }} {{ summary.unsettledSkuCount || 0 }}</strong>
        <small>{{ tr('商品数量') }} {{ formatQty(summary.unsettledQuantity) }}</small>
      </div>
      <div class="summary-item">
        <span>{{ tr('已结款') }}</span>
        <strong>{{ tr('商品种类') }} {{ summary.settledSkuCount || 0 }}</strong>
        <small>{{ tr('商品数量') }} {{ formatQty(summary.settledQuantity) }}</small>
      </div>
    </div>

    <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="88px">
      <el-form-item :label="tr('商品名称')" prop="itemName">
        <el-input v-model="queryParams.itemName" :placeholder="tr('请输入商品名称')" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="SKU" prop="skuCode">
        <el-input v-model="queryParams.skuCode" :placeholder="tr('请输入SKU编号')" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item v-if="supplierResolved && !isSupplierUser" :label="tr('供应商')" prop="supplierId">
        <el-select v-model="queryParams.supplierId" :placeholder="tr('请选择供应商')" clearable filterable>
          <el-option v-for="item in supplierOptions" :key="item.id" :label="item.supplierName" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">{{ tr('搜索') }}</el-button>
        <el-button icon="Refresh" @click="resetQuery">{{ tr('重置') }}</el-button>
      </el-form-item>
    </el-form>

    <div class="vendor-list-header">
      <div>
        <div class="vendor-title">{{ tr(title) }}</div>
        <p v-if="description" class="vendor-description">{{ tr(description) }}</p>
      </div>
      <el-button
        v-if="canShowAction"
        :type="actionButtonType"
        :loading="submitting"
        :disabled="!selectedItemIds.length"
        icon="Switch"
        @click="submitAction"
      >
        {{ tr(actionLabel) }}
      </el-button>
    </div>
    <el-alert v-if="actionTip" :title="actionTip" type="info" show-icon :closable="false" class="vendor-action-tip" />
    <el-table v-loading="loading" :data="rows" border @selection-change="handleSelectionChange">
      <el-table-column v-if="canShowAction" type="selection" width="48" :selectable="isActionSelectable" />
      <el-table-column :label="tr('商品信息')" min-width="260">
        <template #default="{ row }">
          <div class="item-name">{{ row.itemName }}</div>
          <div v-if="row.brandName || row.itemBrand">{{ fieldLabel('品牌') }}{{ row.brandName || row.itemBrand }}</div>
          <div v-if="row.categoryName || row.itemCategory">{{ fieldLabel('分类') }}{{ row.categoryName || row.itemCategory }}</div>
          <div v-if="row.itemCondition">{{ fieldLabel('成色') }}{{ row.itemCondition }}</div>
          <div v-if="row.year || row.year === 0">{{ fieldLabel('年份') }}{{ row.year }}</div>
          <div v-if="row.materialName || row.material">{{ fieldLabel('材质') }}{{ row.materialName || row.material }}</div>
          <div v-if="row.modelName">{{ fieldLabel('包型') }}{{ row.modelName }}</div>
          <div v-if="row.cared !== null && row.cared !== undefined">{{ fieldLabel('护理') }}{{ row.cared ? tr('已护理') : tr('未护理') }}</div>
          <div v-if="row.authAgency">{{ fieldLabel('鉴定机构') }}{{ row.authAgency }}</div>
          <div v-if="row.consignInfo">{{ fieldLabel('寄售信息') }}{{ row.consignInfo }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="tr('供应商')" prop="supplierName" align="center" width="140">
        <template #default="{ row }">
          <span>{{ row.supplierName || tr('Luxeaf 自有') }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="tr('选购状态')" prop="purchaseStatus" align="center" width="110">
        <template #default="{ row }">
          <el-tag :type="purchaseStatusType(row.purchaseStatus)" size="small">
            {{ purchaseStatusLabel(row.purchaseStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="tr('SKU编码')" prop="skuCode" min-width="150">
        <template #default="{ row }">
          <div v-if="row.skuCode">{{ fieldLabel('SKU编码') }}{{ row.skuCode }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="tr('商品图片')" width="110" align="center">
        <template #default="{ row }">
          <el-image
            v-if="getMainImageUrl(row)"
            :src="getMainImageUrl(row)"
            fit="cover"
            class="item-main-image"
            :preview-src-list="[getMainImageUrl(row)]"
            preview-teleported
          />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column v-if="canViewCostPrice || canViewSellingPrice" :label="tr('金额($)')" width="160" align="left">
        <template #default="{ row }">
          <div v-if="canViewCostPrice && (row.costPrice || row.costPrice === 0)" class="flex-space-between">
            <span>{{ tr('成本价：') }}</span>
            <div>{{ formatMoney(row.costPrice) }}</div>
          </div>
          <div v-if="canViewSellingPrice && (row.sellingPrice || row.sellingPrice === 0)" class="flex-space-between">
            <span>{{ tr('销售价：') }}</span>
            <div>{{ formatMoney(row.sellingPrice) }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="tr('业务状态')" prop="vendorStatus" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="vendorStatusType(row.vendorStatus)" size="small">
            {{ vendorStatusLabel(row.vendorStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="tr('选购数量')" prop="selectedQuantity" width="110" align="right">
        <template #default="{ row }">{{ formatQty(row.selectedQuantity ?? row.defaultQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="tr('发出数量')" prop="sentQuantity" width="110" align="right">
        <template #default="{ row }">{{ formatQty(row.sentQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="tr('已收数量')" prop="receivedQuantity" width="110" align="right">
        <template #default="{ row }">{{ formatQty(row.receivedQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="tr('在库数量')" prop="inventoryQuantity" width="110" align="right">
        <template #default="{ row }">{{ formatQty(row.inventoryQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="tr('已售数量')" prop="shippedQuantity" width="110" align="right">
        <template #default="{ row }">{{ formatQty(row.shippedQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="tr('结款状态')" prop="settlementStatus" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="Number(row.settlementStatus || 0) === 1 ? 'success' : 'warning'" size="small">
            {{ Number(row.settlementStatus || 0) === 1 ? tr('已结款') : tr('待结款') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="tr('最近收货')" prop="lastReceiptTime" min-width="170" />
      <el-table-column :label="tr('最近出库')" prop="lastShipmentTime" min-width="170" />
      <el-table-column :label="tr('供应商发货时间')" prop="vendorShippedTime" min-width="170" />
      <el-table-column :label="tr('平台收货时间')" prop="vendorReceivedTime" min-width="170" />
      <el-table-column :label="tr('结款时间')" prop="settlementTime" min-width="170" />
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref, watch } from 'vue'
import VendorWorkflowSteps from './VendorWorkflowSteps.vue'
import { getVendorSummary, listVendorItems, updateVendorItemStatus } from '@/api/wms/vendor'
import { getCurrentSupplier, listSupplierNoPage } from '@/api/wms/supplier'
import { translateByMap } from '@/locales/runtime-map'
import useSettingsStore from '@/store/modules/settings'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const props = defineProps({
  status: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  active: {
    type: Number,
    default: 0
  },
  showWorkflow: {
    type: Boolean,
    default: false
  },
  action: {
    type: String,
    default: ''
  },
  actionLabel: {
    type: String,
    default: ''
  },
  actionButtonType: {
    type: String,
    default: 'primary'
  }
})

const loading = ref(false)
const submitting = ref(false)
const rows = ref([])
const total = ref(0)
const supplierOptions = ref([])
const isSupplierUser = ref(false)
const supplierResolved = ref(false)
const queryRef = ref()
const selectedItemIds = ref([])
const summary = reactive({
  selectedQuantity: 0,
  selectedSkuCount: 0,
  unreceivedQuantity: 0,
  unreceivedSkuCount: 0,
  unsettledQuantity: 0,
  unsettledSkuCount: 0,
  settledQuantity: 0,
  settledSkuCount: 0
})
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  itemName: undefined,
  skuCode: undefined,
  supplierId: undefined
})
const queryWithStatus = computed(() => ({
  ...queryParams,
  status: props.status
}))
const canShowAction = computed(() => {
  if (!supplierResolved.value) return false
  if (!props.action) return false
  if (props.action === 'ship') return isSupplierUser.value
  return !isSupplierUser.value
})
const actionTip = computed(() => {
  if (!supplierResolved.value) return ''
  if (!props.action) return ''
  if (props.action === 'ship' && !isSupplierUser.value) return tr('供应商侧负责商品发货，平台账号仅查看发货进度。')
  if (props.action !== 'ship' && isSupplierUser.value) return tr('平台侧负责确认收货和付款，供应商账号仅查看处理进度。')
  return ''
})

const vendorStatusLabels = {
  0: '未进入',
  1: '已选购',
  2: '未收货',
  3: '未结款',
  4: '已结款'
}
const purchaseStatusLabels = {
  0: '未选购',
  1: '待审批',
  2: '已选购',
  3: '已拒绝'
}

function formatQty(value) {
  const num = Number(value || 0)
  return Number.isInteger(num) ? String(num) : num.toFixed(2)
}

function formatMoney(value) {
  const text = formatQty(value)
  return ['unsettled', 'settled'].includes(props.status) ? `$${text}` : text
}

function fieldLabel(text) {
  return `${tr(text)}${settingsStore.language === 'en' ? ': ' : '：'}`
}

function getMainImageUrl(row) {
  return row?.mainThumbUrl || row?.mainImageUrl || ''
}

function purchaseStatusLabel(status) {
  return tr(purchaseStatusLabels[Number(status || 0)] || '未选购')
}

function purchaseStatusType(status) {
  const value = Number(status || 0)
  if (value === 1) return 'warning'
  if (value === 2) return 'success'
  if (value === 3) return 'danger'
  return 'info'
}

function vendorStatusLabel(status) {
  return tr(vendorStatusLabels[Number(status || 0)] || '未进入')
}

function vendorStatusType(status) {
  const value = Number(status || 0)
  if (value === 1) return 'warning'
  if (value === 2) return 'primary'
  if (value === 3) return 'warning'
  if (value === 4) return 'success'
  return 'info'
}

const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))
const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))

async function loadSummary() {
  const res = await getVendorSummary(queryParams)
  Object.assign(summary, res.data || {})
}

async function getList() {
  loading.value = true
  try {
    const res = await listVendorItems(queryWithStatus.value)
    rows.value = res.rows || []
    total.value = res.total || 0
    selectedItemIds.value = []
    await loadSummary()
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryRef.value?.resetFields()
  handleQuery()
}

function handleSelectionChange(selection) {
  selectedItemIds.value = selection.map(row => row.itemId).filter(Boolean)
}

function isActionSelectable(row) {
  const status = Number(row?.vendorStatus || 0)
  if (props.action === 'ship') return status === 1
  if (props.action === 'receive') return status === 2
  if (props.action === 'settle') return status === 3 && Number(row?.settlementStatus || 0) === 0
  return false
}

async function submitAction() {
  if (!selectedItemIds.value.length) {
    proxy?.$modal.msgWarning(tr('请选择商品'))
    return
  }
  await proxy?.$modal.confirm(`${tr('确认对选中的商品执行')} "${tr(props.actionLabel)}"?`)
  submitting.value = true
  try {
    await updateVendorItemStatus({
      itemIds: selectedItemIds.value,
      action: props.action
    })
    proxy?.$modal.msgSuccess(tr('状态已更新'))
    getList()
  } finally {
    submitting.value = false
  }
}

watch(() => props.status, () => {
  queryParams.pageNum = 1
  getList()
})

onMounted(async () => {
  try {
    const current = await getCurrentSupplier()
    isSupplierUser.value = !!current?.data?.isSupplier
  } catch (_) {
    isSupplierUser.value = false
  } finally {
    supplierResolved.value = true
  }
  if (!isSupplierUser.value) {
    const res = await listSupplierNoPage({ status: 0 })
    supplierOptions.value = res.data || []
  }
  getList()
})
</script>

<style scoped>
.vendor-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 14px 16px;
  background: #fff;
}

.summary-item span {
  display: block;
  color: #606266;
  font-size: 13px;
}

.summary-item strong {
  display: block;
  margin-top: 8px;
  color: #303133;
  font-size: 24px;
}

.summary-item small {
  display: block;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.vendor-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}

.vendor-description {
  margin: 0;
  color: #606266;
  font-size: 13px;
}

.vendor-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0;
}

.vendor-action-tip {
  margin-bottom: 12px;
}

.item-name {
  font-weight: 600;
}

.item-main-image {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  display: inline-block;
}

.flex-space-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 900px) {
  .vendor-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
