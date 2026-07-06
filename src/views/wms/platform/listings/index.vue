<template>
  <div class="app-container platform-listings">
    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :model="queryParams" ref="queryRef" :inline="true" @submit.prevent="handleQuery">
        <el-form-item :label="t('platformListings.filterPlatform')">
          <el-select v-model="queryParams.platform" clearable :placeholder="t('platformListings.filterPlatform')" style="width:140px">
            <el-option label="TikTok Shop" value="TIKTOK" />
            <el-option label="eBay" value="EBAY" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.filterShop')">
          <el-select v-model="queryParams.shopId" clearable filterable :placeholder="t('platformListings.filterShop')" style="width:180px">
            <el-option v-for="s in shopList" :key="s.id" :label="s.shopName" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.filterStatus')">
          <el-select v-model="queryParams.listingStatus" clearable :placeholder="t('platformListings.filterStatus')" style="width:120px">
            <el-option :label="t('platformListings.statusPending')" value="PENDING" />
            <el-option :label="t('platformListings.statusListing')" value="LISTING" />
            <el-option :label="t('platformListings.statusListed')" value="LISTED" />
            <el-option :label="t('platformListings.statusFailed')" value="FAILED" />
            <el-option :label="t('platformListings.statusDelisted')" value="DELISTED" />
            <el-option :label="t('platformListings.statusAuditing')" value="AUDITING" />
          </el-select>
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
        <div>
          <el-button type="primary" icon="Plus" @click="openPublishDialog" v-hasPermi="['wms:platform:listing:edit']">{{ t('platformListings.btnPublish') }}</el-button>
          <el-button icon="Setting" @click="goTemplates" v-hasPermi="['wms:platform:listing:edit']">{{ t('platformListings.btnTemplate') }}</el-button>
        </div>
      </div>

      <el-table :data="listingList" v-loading="loading" border stripe style="width:100%">
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

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  platform: '',
  shopId: null,
  listingStatus: ''
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

function getList() {
  loading.value = true
  listListings(queryParams).then(res => {
    listingList.value = res.rows || []
    total.value = res.total || 0
  }).finally(() => { loading.value = false })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryRef.value?.resetFields()
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

onMounted(() => {
  loadShops()
  nextTick(() => getList())
})
</script>

<style scoped>
.platform-listings .filter-card { margin-bottom: 0; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table-title { font-size: 16px; font-weight: 600; }
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
