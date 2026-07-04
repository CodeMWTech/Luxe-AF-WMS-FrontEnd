<template>
  <div class="app-container vendor-purchase-page">
    <VendorWorkflowSteps :active="0" />

    <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="88px">
      <el-form-item :label="tr('商品名称')" prop="itemName">
        <el-input v-model="queryParams.itemName" :placeholder="tr('请输入商品名称')" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="SKU" prop="skuCode">
        <el-input v-model="queryParams.skuCode" :placeholder="tr('请输入SKU编号')" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item :label="tr('供应商')" prop="supplierId">
        <el-select v-model="queryParams.supplierId" :placeholder="tr('请选择供应商')" clearable filterable>
          <el-option v-for="item in supplierOptions" :key="item.id" :label="item.supplierName" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">{{ tr('搜索') }}</el-button>
        <el-button icon="Refresh" @click="resetQuery">{{ tr('重置') }}</el-button>
      </el-form-item>
    </el-form>

    <div class="page-toolbar">
      <div>
        <h3>{{ tr('选购商品') }}</h3>
        <p>{{ tr('选择供应商商品后提交审批，审批通过后供应商可以在后续页面看到对应商品。') }}</p>
      </div>
      <el-button type="success" icon="ShoppingCart" :disabled="!selectedItemIds.length" :loading="submitting" @click="submitPurchase">
        {{ tr('提交选购审批') }}
      </el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="48" :selectable="isSelectable" />
      <el-table-column :label="tr('商品名称')" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.item?.itemName }}
        </template>
      </el-table-column>
      <el-table-column :label="tr('供应商')" width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.item?.supplierName || '-' }}
        </template>
      </el-table-column>
      <el-table-column :label="tr('选购状态')" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="purchaseStatusType(row.item?.purchaseStatus)" size="small">
            {{ purchaseStatusLabel(row.item?.purchaseStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="SKU" width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.itemSku?.skuCode }}</template>
      </el-table-column>
      <el-table-column :label="tr('成色')" width="90">
        <template #default="{ row }">{{ row.item?.itemCondition }}</template>
      </el-table-column>
      <el-table-column :label="tr('年份')" width="90">
        <template #default="{ row }">{{ row.item?.year }}</template>
      </el-table-column>
      <el-table-column :label="tr('成本价')" width="110" align="right">
        <template #default="{ row }">{{ row.itemSku?.costPrice ?? '-' }}</template>
      </el-table-column>
      <el-table-column :label="tr('销售价')" width="110" align="right">
        <template #default="{ row }">{{ row.itemSku?.sellingPrice ?? '-' }}</template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="VendorPurchase">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import VendorWorkflowSteps from './components/VendorWorkflowSteps.vue'
import { listItemSkuPage } from '@/api/wms/itemSku'
import { selectItemsForPurchase } from '@/api/wms/item'
import { listSupplierNoPage } from '@/api/wms/supplier'
import { translateByMap } from '@/locales/runtime-map'
import useSettingsStore from '@/store/modules/settings'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const loading = ref(false)
const submitting = ref(false)
const rows = ref([])
const total = ref(0)
const supplierOptions = ref([])
const queryRef = ref()
const selectedItemIds = ref([])
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  itemName: undefined,
  skuCode: undefined,
  supplierId: undefined
})

const statusLabels = {
  0: '未选购',
  1: '待审批',
  2: '已选购',
  3: '已拒绝'
}

function purchaseStatusLabel(status) {
  return tr(statusLabels[Number(status ?? 0)] || '未选购')
}

function purchaseStatusType(status) {
  const value = Number(status ?? 0)
  if (value === 1) return 'warning'
  if (value === 2) return 'success'
  if (value === 3) return 'danger'
  return 'info'
}

function isSelectable(row) {
  const status = Number(row?.item?.purchaseStatus ?? 0)
  return !!row?.item?.supplierId && status !== 1 && status !== 2
}

async function getList() {
  loading.value = true
  try {
    const res = await listItemSkuPage(queryParams)
    rows.value = res.rows || []
    total.value = res.total || 0
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
  selectedItemIds.value = Array.from(new Set(selection.map(row => row.item?.id).filter(Boolean)))
}

async function submitPurchase() {
  if (!selectedItemIds.value.length) {
    proxy?.$modal.msgWarning(tr('请选择商品'))
    return
  }
  await proxy?.$modal.confirm(tr('确认将选中的商品提交审批？'))
  submitting.value = true
  try {
    await selectItemsForPurchase(selectedItemIds.value)
    proxy?.$modal.msgSuccess(tr('已提交审批'))
    selectedItemIds.value = []
    getList()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const res = await listSupplierNoPage({ status: 0 })
  supplierOptions.value = res.data || []
  getList()
})
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 10px 0 14px;
}

.page-toolbar h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.page-toolbar p {
  margin: 0;
  color: #606266;
  font-size: 13px;
}
</style>
