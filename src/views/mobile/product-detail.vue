<template>
  <div v-loading="loading" class="mobile-page mobile-detail-page">
    <template v-if="detail">
      <section class="mobile-card mobile-gallery-card">
        <el-carousel
          v-if="imagePreviewList.length"
          height="240px"
          indicator-position="outside"
          :autoplay="false"
          :loop="imagePreviewList.length > 1"
        >
          <el-carousel-item v-for="(url, index) in imagePreviewList" :key="`${url}-${index}`">
            <el-image
              :src="url"
              fit="cover"
              class="mobile-detail-gallery__image"
              :preview-src-list="imagePreviewList"
              :initial-index="index"
              preview-teleported
            />
          </el-carousel-item>
        </el-carousel>
        <div v-else class="mobile-empty">暂无图片</div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">基本信息</h3>
        <div class="mobile-field-list">
          <div v-for="field in basicFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">入库信息</h3>
        <div class="mobile-field-list">
          <div v-for="field in inboundFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">出库信息</h3>
        <div class="mobile-field-list">
          <div v-for="field in outboundFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">库存信息</h3>
        <div class="mobile-field-list">
          <div v-for="field in inventoryFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">价格信息</h3>
        <div v-if="priceFields.length" class="mobile-field-list">
          <div v-for="field in priceFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
        <div v-else class="mobile-empty mobile-empty--compact">暂无价格查看权限</div>
      </section>

      <section v-if="orderFields.length" class="mobile-card">
        <h3 class="mobile-section-title">订单信息</h3>
        <div class="mobile-field-list">
          <div v-for="field in orderFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>
    </template>

    <section v-else-if="!loading" class="mobile-card">
      <div class="mobile-empty">暂无商品详情</div>
    </section>
  </div>
</template>

<script setup name="MobileProductDetail">
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getItem, getItemImages } from '@/api/wms/item'
import { getItemSku } from '@/api/wms/itemSku'
import {
  getInventoryItemBoardDetail,
  listInventory,
  listInventoryNoPage
} from '@/api/wms/inventory'
import { useWmsStore } from '@/store/modules/wms'
import {
  buildDetailViewModel,
  displayValue,
  enrichDetailMetadata,
  formatMoney,
  formatTime,
  mergeInventoryIntoDetail,
  summarizeInventoryRows
} from '@/utils/mobileProduct'

const route = useRoute()
const { proxy } = getCurrentInstance()
const wmsStore = useWmsStore()

const loading = ref(false)
const detail = ref(null)

const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))

const imagePreviewList = computed(() => {
  const images = detail.value?.images || []
  return images.map(img => img.url || img.thumbUrl || img.imageUrl).filter(Boolean)
})

const basicFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: 'SKU', value: displayValue(item.skuCode) },
    { label: '商品名称', value: displayValue(item.itemName) },
    { label: '商品分类', value: displayValue(item.categoryName) },
    { label: '品牌', value: displayValue(item.brandName) },
    { label: '型号', value: displayValue(item.modelName) },
    { label: '年份', value: displayValue(item.year) },
    { label: '材质', value: displayValue(item.materialName) },
    { label: '成色', value: displayValue(item.itemCondition) },
    { label: '瑕疵', value: displayValue(item.defect) },
    { label: '配件', value: displayValue(item.accessories) },
    { label: '备注', value: displayValue(item.remark) }
  ]
})

const inboundFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: '入库时间', value: formatTime(item.receiptTime) },
    { label: '仓库', value: displayValue(item.warehouseName) }
  ]
})

const outboundFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: '出库时间', value: formatTime(item.shipmentTime) },
    { label: '出库平台', value: displayValue(item.outboundPlatform) }
  ]
})

const inventoryFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: '库存数量', value: displayValue(item.quantity) },
    { label: '周转天数', value: displayValue(item.turnoverDays) }
  ]
})

const priceFields = computed(() => {
  const item = detail.value || {}
  const fields = []
  if (canViewCostPrice.value) {
    fields.push({ label: '成本价', value: formatMoney(item.costPrice) })
  }
  if (canViewSellingPrice.value) {
    fields.push({ label: '销售价', value: formatMoney(item.sellingPrice) })
  }
  if (canViewCostPrice.value && canViewSellingPrice.value && item.totalProfit !== null && item.totalProfit !== undefined) {
    fields.push({ label: '利润', value: formatMoney(item.totalProfit) })
  }
  return fields
})

const orderFields = computed(() => {
  const item = detail.value || {}
  const fields = []
  if (item.trackingNumber) {
    fields.push({ label: 'Tracking Number', value: displayValue(item.trackingNumber) })
  }
  if (item.platformOrderNo) {
    fields.push({ label: '订单号', value: displayValue(item.platformOrderNo) })
  }
  if (item.orderInfo) {
    fields.push({ label: '订单信息', value: displayValue(item.orderInfo) })
  }
  return fields
})

function getImageListFromResponse(res) {
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res)) return res
  return []
}

async function ensureStoreReady() {
  const tasks = []
  if (!wmsStore.itemBrandList.length) tasks.push(wmsStore.getItemBrandList())
  if (!wmsStore.itemCategoryList.length) tasks.push(wmsStore.getItemCategoryList())
  if (!wmsStore.itemModelList.length) tasks.push(wmsStore.getItemModelList())
  await Promise.all(tasks)
}

async function loadImages(itemId) {
  if (!itemId) return []
  try {
    const res = await getItemImages(itemId)
    return getImageListFromResponse(res)
  } catch (_) {
    return []
  }
}

async function loadInventoryExtra(skuId, skuCode) {
  try {
    const boardRes = await getInventoryItemBoardDetail(skuId)
    const boardData = boardRes?.data || boardRes
    if (boardData && (boardData.skuCode || boardData.itemName || boardData.quantity != null)) {
      return boardData
    }
  } catch (_) {
    // 本地库缺 platform 表时会失败，继续尝试其它接口
  }

  const query = { skuId, skuCode, skuCodeExact: !!skuCode }

  try {
    const noPageRes = await listInventoryNoPage(query, { silentError: true })
    const rows = noPageRes?.data || noPageRes?.rows || []
    const summary = summarizeInventoryRows(Array.isArray(rows) ? rows : [])
    if (summary) return summary
  } catch (_) {
    // ignore
  }

  try {
    const listRes = await listInventory({
      ...query,
      pageNum: 1,
      pageSize: 20
    }, { silentError: true })
    return summarizeInventoryRows(listRes?.rows || [])
  } catch (_) {
    return null
  }
}

async function loadDetailBySkuId(skuId, summary) {
  await ensureStoreReady()

  const skuRes = await getItemSku(skuId)
  const skuData = skuRes.data || skuRes || {}
  const itemId = skuData.itemId || skuData.item?.id || summary?.itemId

  let payload
  if (itemId) {
    const itemRes = await getItem(itemId)
    payload = {
      item: itemRes.data || itemRes,
      itemSku: skuData
    }
  } else {
    payload = { itemSku: skuData, ...(summary || {}) }
  }

  const images = await loadImages(itemId)
  let viewModel = buildDetailViewModel(payload, images)
  viewModel = enrichDetailMetadata(viewModel, wmsStore)

  const inventoryExtra = await loadInventoryExtra(skuId, viewModel.skuCode)
  if (inventoryExtra) {
    viewModel = mergeInventoryIntoDetail(viewModel, inventoryExtra)
  }

  detail.value = viewModel
}

onMounted(async () => {
  const skuId = route.params.skuId
  if (!skuId) {
    ElMessage.error('缺少 SKU 参数')
    return
  }
  loading.value = true
  try {
    await loadDetailBySkuId(skuId, history.state?.summary)
  } catch (error) {
    ElMessage.error(error?.message || '获取商品详情失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.mobile-gallery-card {
  padding-bottom: 8px;
}

.mobile-gallery-card :deep(.el-carousel__container) {
  border-radius: 8px;
  overflow: hidden;
}

.mobile-gallery-card :deep(.el-carousel__indicators--outside) {
  margin-top: 8px;
}

.mobile-empty--compact {
  padding: 8px 0;
}
</style>
