<template>
  <div class="app-container platform-listings">
    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :model="queryParams" ref="queryRef" :inline="true" @submit.prevent="handleQuery">
        <el-form-item :label="t('platformListings.filterPlatform')" prop="platform">
          <el-select v-model="queryParams.platform" clearable :placeholder="t('platformListings.filterPlatform')" style="width:140px">
            <el-option label="TikTok Shop" value="TIKTOK" />
            <el-option label="eBay" value="EBAY" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.filterShop')" prop="shopId">
          <el-select v-model="queryParams.shopId" clearable filterable :placeholder="t('platformListings.filterShop')" style="width:180px">
            <el-option v-for="s in shopList" :key="s.id" :label="s.shopName" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.filterStatus')" prop="listingStatus">
          <el-select v-model="queryParams.listingStatus" clearable :placeholder="t('platformListings.filterStatus')" style="width:120px">
            <el-option :label="t('platformListings.statusPending')" value="PENDING" />
            <el-option :label="t('platformListings.statusListing')" value="LISTING" />
            <el-option :label="t('platformListings.statusListed')" value="LISTED" />
            <el-option :label="t('platformListings.statusFailed')" value="FAILED" />
            <el-option :label="t('platformListings.statusDelisted')" value="DELISTED" />
            <el-option :label="t('platformListings.statusAuditing')" value="AUDITING" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.filterSku')" prop="skuCode">
          <el-input v-model="queryParams.skuCode" clearable :placeholder="t('platformListings.filterSkuPlaceholder')" style="width:160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item :label="t('platformListings.filterCreateBy')" prop="createBy">
          <el-input v-model="queryParams.createBy" clearable :placeholder="t('platformListings.filterCreateByPlaceholder')" style="width:140px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item :label="t('platformListings.filterListingTime')">
          <el-date-picker
            v-model="listingTimeRange"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            :range-separator="t('platformListings.timeTo')"
            :start-placeholder="t('platformListings.startTime')"
            :end-placeholder="t('platformListings.endTime')"
            style="width:330px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">{{ t('platformListings.btnQuery') }}</el-button>
          <el-button icon="Refresh" @click="resetQuery">{{ t('platformListings.btnReset') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 + 数据表 -->
    <el-card class="mt20">
      <div class="table-header">
        <span class="table-title">{{ t('platformListings.subtitle') }}</span>
        <div class="table-actions">
          <el-button type="primary" icon="Plus" @click="openPublishDialog" v-hasPermi="['wms:platform:listing:edit']">{{ t('platformListings.btnPublish') }}</el-button>
          <el-button
            type="primary"
            icon="Refresh"
            :disabled="!selectedListings.length"
            :loading="batchSyncing"
            @click="handleBatchSync"
            v-hasPermi="['wms:platform:listing']"
          >{{ t('platformListings.btnBatchSyncStatus') }}</el-button>
          <el-button
            type="warning"
            icon="Close"
            :disabled="!selectedListings.length"
            :loading="batchDelisting"
            @click="handleBatchDelist"
            v-hasPermi="['wms:platform:listing:edit']"
          >{{ t('platformListings.btnBatchDelist') }}</el-button>
          <el-button
            type="danger"
            icon="Delete"
            :disabled="!selectedListings.length"
            :loading="batchDeleting"
            @click="handleBatchDelete"
            v-hasPermi="['wms:platform:listing:edit']"
          >{{ t('platformListings.btnBatchDelete') }}</el-button>
          <el-button
            type="info"
            icon="Download"
            :loading="exportLoading"
            @click="handleExport"
            v-hasPermi="['wms:platform:listing']"
          >{{ t('platformListings.btnExport') }}</el-button>
          <el-button icon="Setting" @click="goTemplates" v-hasPermi="['wms:platform:listing:edit']">{{ t('platformListings.btnTemplate') }}</el-button>
        </div>
      </div>
      <div v-if="selectedListings.length" class="selection-summary">
        {{ t('platformListings.selectedListingSummary', { count: selectedListings.length }) }}
        <el-button link type="primary" @click="clearSelection">{{ t('platformListings.clearSelection') }}</el-button>
      </div>

      <el-table
        ref="listingTableRef"
        :data="listingList"
        v-loading="loading"
        border
        stripe
        style="width:100%"
        row-key="id"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" reserve-selection />
        <el-table-column :label="t('platformListings.listingPlatform')" prop="platform" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.platform === 'EBAY' ? '' : 'danger'" size="small">{{ row.platform === 'EBAY' ? 'eBay' : 'TikTok' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.listingShop')" prop="shopName" min-width="120" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingItemName')" prop="itemName" min-width="150" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingSkuCode')" prop="skuCode" min-width="120" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingTitle')" prop="listingTitle" min-width="180" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingPrice')" prop="channelPrice" width="100" align="right">
          <template #default="{ row }">{{ row.channelPrice != null ? '$' + Number(row.channelPrice).toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('platformListings.listingStatus')" prop="listingStatus" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.listingStatus)" size="small">{{ statusLabel(row.listingStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.listingError')" prop="listingError" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ formatListingError(row.listingError) }}</template>
        </el-table-column>
        <el-table-column :label="t('platformListings.listingCreateBy')" prop="createBy" width="110" align="center" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingTime')" prop="createTime" width="160" align="center" />
        <el-table-column :label="t('platformListings.operation')" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="Refresh" @click="handleSync(row)" v-if="row.listingStatus === 'LISTED' || row.listingStatus === 'AUDITING'">{{ t('platformListings.btnSyncStatus') }}</el-button>
            <el-button link type="danger" size="small" icon="Close" @click="handleDelist(row)" v-if="row.listingStatus === 'LISTED' || row.listingStatus === 'AUDITING'">{{ t('platformListings.btnDelist') }}</el-button>
            <el-button link type="warning" size="small" icon="Refresh" @click="handleRetry(row)" v-if="row.listingStatus === 'FAILED' || row.listingStatus === 'DELISTED'">{{ row.listingStatus === 'DELISTED' ? t('platformListings.btnRelist') : t('platformListings.btnRetry') }}</el-button>
            <el-button link type="danger" size="small" icon="Delete" @click="handleDelete(row)" v-if="row.listingStatus === 'DELISTED'">{{ t('platformListings.btnDeleteRecord') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="listings-pagination">
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </div>
    </el-card>

    <!-- 上架对话框 -->
    <PublishDialog ref="publishDialogRef" @success="getList" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { listListings, delistListing, syncListingStatus, retryListing, deleteListing } from '@/api/wms/platformListing'
import { listAllPlatformShops } from '@/api/wms/platformShop'
import PublishDialog from './components/PublishDialog.vue'

const router = useRouter()
const { proxy } = getCurrentInstance()
const t = (key, values) => proxy?.$t?.(key, values) || key

const loading = ref(false)
const total = ref(0)
const listingList = ref([])
const shopList = ref([])
const publishDialogRef = ref(null)
const queryRef = ref(null)
const listingTableRef = ref(null)
const selectedListings = ref([])
const selectedListingMap = new Map()
const listingTimeRange = ref([])
const batchSyncing = ref(false)
const batchDelisting = ref(false)
const batchDeleting = ref(false)
const exportLoading = ref(false)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  platform: '',
  shopId: null,
  listingStatus: '',
  skuCode: '',
  createBy: ''
})

function statusTagType(status) {
  const map = { PENDING: 'info', LISTING: 'warning', LISTED: 'success', FAILED: 'danger', DELISTED: '', AUDITING: 'warning' }
  return map[status] || 'info'
}

function statusLabel(status) {
  const map = {
    PENDING: t('platformListings.statusPending'),
    LISTING: t('platformListings.statusListing'),
    LISTED: t('platformListings.statusListed'),
    FAILED: t('platformListings.statusFailed'),
    DELISTED: t('platformListings.statusDelisted'),
    AUDITING: t('platformListings.statusAuditing')
  }
  return map[status] || status
}

function formatListingError(error) {
  if (!error) return ''
  const text = String(error).trim()
  const failedMatch = text.match(/^(eBay|EBAY|TikTok|TIKTOK)\s*上架失败$/i)
  if (failedMatch) {
    const platform = failedMatch[1].toLowerCase() === 'ebay' ? 'eBay' : 'TikTok'
    return t('platformListings.platformPublishFailed', { platform })
  }
  return text
}

function buildQueryParams() {
  const [beginTime, endTime] = listingTimeRange.value || []
  return {
    ...queryParams,
    beginTime: beginTime || '',
    endTime: endTime || ''
  }
}

function getList() {
  loading.value = true
  listListings(buildQueryParams()).then(res => {
    listingList.value = res.rows || []
    total.value = res.total || 0
    nextTick(() => restoreCurrentPageSelection())
  }).finally(() => { loading.value = false })
}

function handleQuery() {
  queryParams.pageNum = 1
  clearSelection()
  getList()
}

function resetQuery() {
  queryRef.value?.resetFields()
  listingTimeRange.value = []
  clearSelection()
  handleQuery()
}

function loadShops() {
  listAllPlatformShops().then(res => {
    shopList.value = res.rows || res.data || []
  }).catch(() => {})
}

function openPublishDialog() {
  publishDialogRef.value?.open()
}

function goTemplates() {
  router.push('/wms/platform/listings/template')
}

function isListingDeletable(row) {
  return row.listingStatus === 'DELISTED'
}

function isListingOnline(row) {
  return row.listingStatus === 'LISTED' || row.listingStatus === 'AUDITING'
}

function handleSelectionChange(selection) {
  const currentPageIds = new Set(listingList.value.map(row => row.id))
  currentPageIds.forEach(id => selectedListingMap.delete(id))
  selection.forEach(row => selectedListingMap.set(row.id, row))
  syncSelectedListings()
}

function syncSelectedListings() {
  selectedListings.value = Array.from(selectedListingMap.values())
}

function restoreCurrentPageSelection() {
  if (!listingTableRef.value) return
  listingList.value.forEach(row => {
    listingTableRef.value.toggleRowSelection(row, selectedListingMap.has(row.id))
  })
}

function clearSelection() {
  selectedListingMap.clear()
  selectedListings.value = []
  listingTableRef.value?.clearSelection?.()
}

function handleDelist(row) {
  proxy.$modal.confirm(t('platformListings.confirmDelist'), t('platformListings.promptTitle'), { type: 'warning' }).then(() => {
    delistListing(row.id).then(() => {
      proxy.$modal.msgSuccess(t('platformListings.delistSuccess'))
      getList()
    }).catch((err) => {
      // 优先展示后端返回的具体错误原因（如"商品正在审核中"）
      const msg = err?.data?.msg || err?.message || t('platformListings.delistFailed')
      proxy.$modal.msgError(msg)
    })
  }).catch(() => {})
}

function handleSync(row) {
  syncListingStatus(row.id).then(() => {
    proxy.$modal.msgSuccess(t('platformListings.syncSuccess'))
    getList()
  }).catch(() => {
    proxy.$modal.msgError(t('platformListings.syncFailed'))
  })
}

function handleRetry(row) {
  proxy.$modal.confirm(t('platformListings.confirmRetry'), t('platformListings.promptTitle'), { type: 'info' }).then(() => {
    retryListing(row.id).then(() => {
      proxy.$modal.msgSuccess(t('platformListings.retrySubmitted'))
      getList()
    }).catch(() => {
      proxy.$modal.msgError(t('platformListings.retryFailed'))
    })
  }).catch(() => {})
}

function runBatchOperation(options) {
  const rows = selectedListings.value.filter(options.filter)
  if (!rows.length) {
    proxy.$modal.msgWarning(t(options.emptyKey))
    return
  }
  proxy.$modal.confirm(
    t(options.confirmKey, { count: rows.length }),
    t('platformListings.promptTitle'),
    { type: options.confirmType || 'warning' }
  ).then(() => {
    options.loadingRef.value = true
    return Promise.allSettled(rows.map(options.action)).then(results => {
      const successCount = results.filter(item => item.status === 'fulfilled').length
      const failedCount = results.length - successCount
      if (failedCount) {
        proxy.$modal.msgError(t(options.partialKey, { success: successCount, failed: failedCount }))
      } else {
        proxy.$modal.msgSuccess(t(options.successKey, { count: successCount }))
      }
      clearSelection()
      getList()
    }).finally(() => {
      options.loadingRef.value = false
    })
  }).catch(() => {})
}

function handleBatchSync() {
  runBatchOperation({
    filter: isListingOnline,
    emptyKey: 'platformListings.selectSyncListings',
    confirmKey: 'platformListings.confirmBatchSyncListing',
    successKey: 'platformListings.batchSyncSuccess',
    partialKey: 'platformListings.batchSyncPartial',
    loadingRef: batchSyncing,
    action: row => syncListingStatus(row.id),
    confirmType: 'info'
  })
}

function handleBatchDelist() {
  runBatchOperation({
    filter: isListingOnline,
    emptyKey: 'platformListings.selectDelistListings',
    confirmKey: 'platformListings.confirmBatchDelistListing',
    successKey: 'platformListings.batchDelistSuccess',
    partialKey: 'platformListings.batchDelistPartial',
    loadingRef: batchDelisting,
    action: row => delistListing(row.id),
    confirmType: 'warning'
  })
}

function handleBatchDelete() {
  runBatchOperation({
    filter: isListingDeletable,
    emptyKey: 'platformListings.selectDeleteListings',
    confirmKey: 'platformListings.confirmBatchDeleteListing',
    successKey: 'platformListings.batchListingDeleteSuccess',
    partialKey: 'platformListings.batchListingDeletePartial',
    loadingRef: batchDeleting,
    action: row => deleteListing(row.id),
    confirmType: 'error'
  })
}

function handleDelete(row) {
  proxy.$modal.confirm(t('platformListings.confirmDeleteListing'), t('platformListings.warningTitle'), { type: 'error' }).then(() => {
    deleteListing(row.id).then(() => {
      proxy.$modal.msgSuccess(t('platformListings.listingDeleteSuccess'))
      getList()
    }).catch(() => {
      proxy.$modal.msgError(t('platformListings.listingDeleteFailed'))
    })
  }).catch(() => {})
}

function handleExport() {
  proxy.$modal.confirm(t('platformListings.exportConfirm'), t('platformListings.promptTitle'), { type: 'info' }).then(() => {
    exportLoading.value = true
    return proxy.download(
      'wms/platform/listings/export',
      buildQueryParams(),
      `上架记录_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }).finally(() => {
    exportLoading.value = false
  }).catch(() => {})
}

onMounted(() => {
  loadShops()
  nextTick(() => getList())
})
</script>

<style scoped>
.platform-listings .filter-card { margin-bottom: 0; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table-title { font-size: 16px; font-weight: 600; }
.table-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.table-actions :deep(.el-button) { margin-left: 0; }
.selection-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  margin: -6px 0 10px;
  color: #606266;
  font-size: 13px;
}
.listings-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  overflow-x: auto;
  padding: 14px 40px 0 0;
  box-sizing: border-box;
}
.listings-pagination :deep(.pagination-container) {
  flex: 0 0 auto;
  height: auto;
  margin: 0;
  padding: 0 !important;
  background: transparent;
  position: static;
}
.listings-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
}

@media (max-width: 768px) {
  .listings-pagination {
    justify-content: flex-start;
    padding-right: 0;
  }
}
</style>
