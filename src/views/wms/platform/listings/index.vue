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
          <el-dropdown
            trigger="click"
            :disabled="batchMode || isBatchOperating"
            @command="enterBatchMode"
            v-hasPermi="['wms:platform:listing']"
          >
            <el-button
              type="primary"
              icon="Operation"
              :loading="isBatchOperating"
              :disabled="batchMode || isBatchOperating"
            >{{ t('platformListings.btnBatchOperation') }}</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="sync" icon="Refresh">{{ t('platformListings.btnBatchSyncStatus') }}</el-dropdown-item>
                <el-dropdown-item command="delist" icon="Close">{{ t('platformListings.btnBatchDelist') }}</el-dropdown-item>
                <el-dropdown-item command="delete" icon="Delete">{{ t('platformListings.btnBatchDelete') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            v-if="batchMode"
            type="primary"
            :icon="currentBatchIcon"
            :loading="isBatchOperating"
            :disabled="!selectedListings.length || isBatchOperating"
            @click="executeCurrentBatchAction"
          >{{ currentBatchExecuteLabel }}</el-button>
          <el-button
            v-if="batchMode"
            icon="Close"
            @click="exitBatchMode"
          >{{ t('platformListings.exitBatchMode') }}</el-button>
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
      <div v-if="batchMode" class="selection-summary">
        <span>
          {{ selectedListings.length ? t('platformListings.selectedListingSummary', { count: selectedListings.length }) : currentBatchHint }}
        </span>
        <el-button v-if="selectedListings.length" link type="primary" @click="clearSelection">{{ t('platformListings.clearSelection') }}</el-button>
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
        <el-table-column v-if="batchMode" type="selection" width="50" align="center" reserve-selection :selectable="isRowSelectable" />
        <el-table-column :label="t('platformListings.listingPlatform')" prop="platform" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.platform === 'EBAY' ? '' : 'danger'" size="small">{{ row.platform === 'EBAY' ? 'eBay' : 'TikTok' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.listingShop')" prop="shopName" min-width="120" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingItemName')" prop="itemName" min-width="150" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingSkuCode')" prop="skuCode" min-width="120" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingTitle')" prop="listingTitle" min-width="180" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.listingPrice')" prop="channelPrice" width="120" align="right">
          <template #default="{ row }">{{ formatChannelPrice(row.channelPrice) }}</template>
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
import { ref, reactive, computed, onMounted, nextTick, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { listListings, delistListing, syncListingStatus, retryListing, deleteListing } from '@/api/wms/platformListing'
import { listAllPlatformShops } from '@/api/wms/platformShop'
import useSettingsStore from '@/store/modules/settings'
import PublishDialog from './components/PublishDialog.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
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
const batchMode = ref(false)
const batchAction = ref('')
const batchSyncing = ref(false)
const batchDelisting = ref(false)
const batchDeleting = ref(false)
const exportLoading = ref(false)
const isBatchOperating = computed(() => batchSyncing.value || batchDelisting.value || batchDeleting.value)
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const batchActionConfig = {
  sync: {
    icon: 'Refresh',
    executeLabelKey: 'platformListings.executeBatchSyncStatus',
    hintKey: 'platformListings.batchSyncModeHint',
    handler: handleBatchSync
  },
  delist: {
    icon: 'Close',
    executeLabelKey: 'platformListings.executeBatchDelist',
    hintKey: 'platformListings.batchDelistModeHint',
    handler: handleBatchDelist
  },
  delete: {
    icon: 'Delete',
    executeLabelKey: 'platformListings.executeBatchDelete',
    hintKey: 'platformListings.batchDeleteModeHint',
    handler: handleBatchDelete
  }
}
const currentBatchConfig = computed(() => batchActionConfig[batchAction.value] || null)
const currentBatchIcon = computed(() => currentBatchConfig.value?.icon || 'Operation')
const currentBatchExecuteLabel = computed(() => t(currentBatchConfig.value?.executeLabelKey || 'platformListings.btnBatchOperation'))
const currentBatchHint = computed(() => t(currentBatchConfig.value?.hintKey || 'platformListings.batchModeHint'))

const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
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

function formatChannelPrice(price) {
  if (price === null || price === undefined || price === '') return '-'
  const amount = Number(price)
  if (!Number.isFinite(amount)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatListingError(error) {
  if (!error) return ''
  const text = String(error).trim()
  try {
    const detail = JSON.parse(text)
    if (detail?.type === 'PLATFORM_LISTING_ERROR') {
      const english = isEn.value
      return t('platformListings.listingErrorDetail', {
        platform: detail.platform === 'EBAY' ? 'eBay' : 'TikTok',
        code: detail.code || 'N/A',
        reason: english ? detail.reasonEn : detail.reasonZh,
        action: english ? detail.actionEn : detail.actionZh
      })
    }
  } catch {
    // Existing non-structured status messages remain readable as-is.
  }
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

function getExportLanguagePayload() {
  const language = isEn.value ? 'en' : 'zh-cn'
  return {
    language,
    lang: language,
    locale: language,
    contentLanguage: isEn.value ? 'en_US' : 'zh_CN'
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
  if (!batchMode.value) {
    return
  }
  const currentPageIds = new Set(listingList.value.map(row => row.id))
  currentPageIds.forEach(id => selectedListingMap.delete(id))
  selection.filter(isRowSelectable).forEach(row => selectedListingMap.set(row.id, row))
  syncSelectedListings()
}

function syncSelectedListings() {
  selectedListings.value = Array.from(selectedListingMap.values())
}

function restoreCurrentPageSelection() {
  if (!listingTableRef.value || !batchMode.value) return
  listingList.value.forEach(row => {
    listingTableRef.value.toggleRowSelection(row, selectedListingMap.has(row.id))
  })
}

function clearSelection() {
  selectedListingMap.clear()
  selectedListings.value = []
  listingTableRef.value?.clearSelection?.()
}

function isRowSelectable(row) {
  if (batchAction.value === 'sync' || batchAction.value === 'delist') {
    return isListingOnline(row)
  }
  if (batchAction.value === 'delete') {
    return isListingDeletable(row)
  }
  return false
}

function confirmOptions(options = {}) {
  return {
    confirmButtonText: t('platformListings.confirmButton'),
    cancelButtonText: t('platformListings.cancelButton'),
    ...options
  }
}

function enterBatchMode(command) {
  batchAction.value = command
  batchMode.value = true
  clearSelection()
  nextTick(() => restoreCurrentPageSelection())
}

function exitBatchMode() {
  batchMode.value = false
  batchAction.value = ''
  clearSelection()
}

function handleDelist(row) {
  proxy.$modal.confirm(t('platformListings.confirmDelist'), t('platformListings.promptTitle'), confirmOptions({ type: 'warning' })).then(() => {
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
  }).catch((err) => {
    const msg = err?.data?.msg || err?.message || t('platformListings.syncFailed')
    proxy.$modal.msgError(msg)
  })
}

function handleRetry(row) {
  proxy.$modal.confirm(t('platformListings.confirmRetry'), t('platformListings.promptTitle'), confirmOptions({ type: 'info' })).then(() => {
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
    confirmOptions({ type: options.confirmType || 'warning' })
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

function executeCurrentBatchAction() {
  currentBatchConfig.value?.handler?.()
}

function handleDelete(row) {
  proxy.$modal.confirm(t('platformListings.confirmDeleteListing'), t('platformListings.warningTitle'), confirmOptions({ type: 'error' })).then(() => {
    deleteListing(row.id).then(() => {
      proxy.$modal.msgSuccess(t('platformListings.listingDeleteSuccess'))
      getList()
    }).catch(() => {
      proxy.$modal.msgError(t('platformListings.listingDeleteFailed'))
    })
  }).catch(() => {})
}

function handleExport() {
  proxy.$modal.confirm(t('platformListings.exportConfirm'), t('platformListings.promptTitle'), confirmOptions({ type: 'info' })).then(() => {
    const exportLanguage = getExportLanguagePayload()
    exportLoading.value = true
    return proxy.download(
      'wms/platform/listings/export',
      {
        ...buildQueryParams(),
        ...exportLanguage
      },
      `${isEn.value ? 'Listing_Records' : '上架记录'}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Language': exportLanguage.contentLanguage,
          'Accept-Language': isEn.value ? 'en-US,en;q=0.9' : 'zh-CN,zh;q=0.9'
        }
      }
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
