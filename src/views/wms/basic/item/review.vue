<template>
  <div :class="embedded ? 'purchase-review-page' : 'app-container purchase-review-page'">
    <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="88px">
      <el-form-item :label="tr('商品名称')" prop="itemName">
        <el-input v-model="queryParams.itemName" :placeholder="tr('请输入商品名称')" clearable @keyup.enter="handleQuery" />
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

    <div class="review-toolbar">
      <span class="review-title">{{ tr('商品选购审核') }}</span>
      <div>
        <el-button type="success" plain icon="Check" :disabled="!selectedIds.length" @click="openReview(true)">{{ tr('通过') }}</el-button>
        <el-button type="danger" plain icon="Close" :disabled="!selectedIds.length" @click="openReview(false)">{{ tr('拒绝') }}</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="itemList" border @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="48" />
      <el-table-column :label="tr('商品名称')" prop="itemName" min-width="180" show-overflow-tooltip />
      <el-table-column :label="tr('供应商')" prop="supplierName" min-width="140" show-overflow-tooltip />
      <el-table-column :label="tr('品牌')" min-width="120">
        <template #default="{ row }">
          {{ brandName(row.itemBrand) }}
        </template>
      </el-table-column>
      <el-table-column :label="tr('成色')" prop="itemCondition" width="100" />
      <el-table-column :label="tr('年份')" prop="year" width="90" />
      <el-table-column :label="tr('提交人')" prop="purchaseSelectedBy" width="120" />
      <el-table-column :label="tr('提交时间')" prop="purchaseSelectedTime" min-width="170" />
      <el-table-column :label="tr('备注')" prop="remark" min-width="160" show-overflow-tooltip />
      <el-table-column :label="tr('操作')" width="160" fixed="right" align="right">
        <template #default="{ row }">
          <el-button link type="success" icon="Check" @click="openReview(true, row)">{{ tr('通过') }}</el-button>
          <el-button link type="danger" icon="Close" @click="openReview(false, row)">{{ tr('拒绝') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog v-model="reviewDialog.visible" :title="reviewDialog.approved ? tr('通过选购审核') : tr('拒绝选购审核')" width="460px" append-to-body>
      <el-form label-width="80px">
        <el-form-item :label="tr('审核备注')">
          <el-input v-model="reviewRemark" type="textarea" :rows="4" maxlength="500" show-word-limit :placeholder="tr('请输入审核备注')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialog.visible = false">{{ tr('取消') }}</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitReview">{{ tr('确认') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ItemPurchaseReview">
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { listItemPurchaseReview, reviewItemPurchase } from '@/api/wms/item'
import { listSupplierNoPage } from '@/api/wms/supplier'
import { useWmsStore } from '@/store/modules/wms'
import { translateByMap } from '@/locales/runtime-map'
import useSettingsStore from '@/store/modules/settings'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})
const wmsStore = useWmsStore()
const loading = ref(false)
const submitLoading = ref(false)
const itemList = ref([])
const supplierOptions = ref([])
const selectedIds = ref([])
const total = ref(0)
const queryRef = ref()
const reviewRemark = ref('')
const reviewDialog = reactive({
  visible: false,
  approved: true,
  ids: []
})
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  itemName: undefined,
  supplierId: undefined
})

function brandName(id) {
  return id ? (wmsStore.itemBrandMap.get(id)?.brandName || id) : ''
}

async function getList() {
  loading.value = true
  try {
    const res = await listItemPurchaseReview(queryParams)
    itemList.value = res.rows || []
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
  selectedIds.value = selection.map(item => item.id)
}

function openReview(approved, row) {
  const ids = row ? [row.id] : selectedIds.value
  if (!ids.length) {
    proxy?.$modal.msgWarning(tr('请选择商品'))
    return
  }
  reviewDialog.approved = approved
  reviewDialog.ids = ids
  reviewRemark.value = ''
  reviewDialog.visible = true
}

async function submitReview() {
  submitLoading.value = true
  try {
    await reviewItemPurchase({
      ids: reviewDialog.ids,
      approved: reviewDialog.approved,
      remark: reviewRemark.value
    })
    proxy?.$modal.msgSuccess(tr('审核完成'))
    reviewDialog.visible = false
    selectedIds.value = []
    getList()
  } finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  if (!wmsStore.itemBrandList.length) {
    wmsStore.getItemBrandList()
  }
  const res = await listSupplierNoPage({ status: 0 })
  supplierOptions.value = res.data || []
  getList()
})
</script>

<style scoped>
.review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}

.review-title {
  font-size: 18px;
  font-weight: 600;
}
</style>
