<template>
  <div v-loading="loading" class="mobile-page mobile-detail-page">
    <template v-if="detail">
      <section class="mobile-card mobile-gallery-card">
        <div
          v-if="imagePreviewList.length"
          ref="galleryRef"
          class="mobile-gallery-scroll"
          @scroll.passive="onGalleryScroll"
        >
          <div
            v-for="(url, index) in gallerySlides"
            :key="`${url}-${index}`"
            class="mobile-gallery-slide"
          >
            <img
              :src="url"
              class="mobile-detail-gallery__image"
              alt=""
              draggable="false"
              @click="openImagePreview()"
            >
          </div>
        </div>
        <div v-if="imagePreviewList.length > 1" class="mobile-gallery-dots">
          <span
            v-for="(_, index) in imagePreviewList"
            :key="index"
            class="mobile-gallery-dot"
            :class="{ 'is-active': index === currentImageIndex }"
          />
        </div>
        <el-image-viewer
          v-if="previewVisible"
          ref="previewViewerRef"
          :url-list="imagePreviewList"
          :initial-index="previewIndex"
          :hide-on-click-modal="true"
          :infinite="true"
          teleported
          @close="previewVisible = false"
          @switch="onPreviewSwitch"
        />
        <div v-if="!imagePreviewList.length" class="mobile-empty">{{ t('mobile.noImage') }}</div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">{{ t('mobile.sectionBasic') }}</h3>
        <div class="mobile-field-list">
          <div v-for="field in basicFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">{{ t('mobile.sectionInbound') }}</h3>
        <div class="mobile-field-list">
          <div v-for="field in inboundFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">{{ t('mobile.sectionOutbound') }}</h3>
        <div class="mobile-field-list">
          <div v-for="field in outboundFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">{{ t('mobile.sectionInventory') }}</h3>
        <div class="mobile-field-list">
          <div v-for="field in inventoryFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>

      <section class="mobile-card">
        <h3 class="mobile-section-title">{{ t('mobile.sectionPrice') }}</h3>
        <div v-if="priceFields.length" class="mobile-field-list">
          <div v-for="field in priceFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
        <div v-else class="mobile-empty mobile-empty--compact">{{ t('mobile.noPricePermission') }}</div>
      </section>

      <section v-if="orderFields.length" class="mobile-card">
        <h3 class="mobile-section-title">{{ t('mobile.sectionOrder') }}</h3>
        <div class="mobile-field-list">
          <div v-for="field in orderFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
      </section>
    </template>

    <section v-else-if="!loading" class="mobile-card">
      <div class="mobile-empty">{{ t('mobile.noProductDetail') }}</div>
    </section>
  </div>
</template>

<script setup name="MobileProductDetail">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { getItem, getItemImages } from '@/api/wms/item'
import { getItemSku } from '@/api/wms/itemSku'
import {
  getInventoryItemBoardDetail,
  listInventory,
  listInventoryNoPage
} from '@/api/wms/inventory'
import { listInventoryHistory } from '@/api/wms/inventoryHistory'
import { useWmsStore } from '@/store/modules/wms'
import {
  buildDetailViewModel,
  displayValue,
  enrichDetailMetadata,
  enrichOutboundPlatform,
  formatMoney,
  formatTime,
  mergeInventoryIntoDetail,
  summarizeInventoryHistoryRows,
  summarizeInventoryRows
} from '@/utils/mobileProduct'

const route = useRoute()
const { proxy } = getCurrentInstance()
const { t } = useI18n()
const wmsStore = useWmsStore()

const loading = ref(false)
const detail = ref(null)
const previewVisible = ref(false)
const previewIndex = ref(0)
const previewViewerRef = ref(null)
const galleryRef = ref(null)
const currentImageIndex = ref(0)
const galleryLooping = ref(false)
let galleryScrollEndTimer = null
let previewInteractionCleanup = null
let previewSwipeMoved = false

const PREVIEW_SWIPE_THRESHOLD = 50

const imagePreviewList = computed(() => {
  const images = detail.value?.images || []
  return images.map(img => img.url || img.thumbUrl || img.imageUrl).filter(Boolean)
})

/** 首尾各克隆一张，实现循环滑动：[末, 1..n, 首] */
const gallerySlides = computed(() => {
  const list = imagePreviewList.value
  if (list.length <= 1) return list
  return [list[list.length - 1], ...list, list[0]]
})

function openImagePreview() {
  previewIndex.value = currentImageIndex.value
  previewVisible.value = true
}

function onPreviewSwitch(index) {
  previewIndex.value = index
}

function setupPreviewInteractions(wrapper) {
  let touchStartX = 0
  let touchStartY = 0
  let touchTracking = false

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return
    touchStartX = event.touches[0].clientX
    touchStartY = event.touches[0].clientY
    touchTracking = true
    previewSwipeMoved = false
  }

  const onTouchMove = (event) => {
    if (!touchTracking || event.touches.length !== 1) return
    const deltaX = Math.abs(event.touches[0].clientX - touchStartX)
    const deltaY = Math.abs(event.touches[0].clientY - touchStartY)
    if (deltaX > 10 || deltaY > 10) {
      previewSwipeMoved = true
    }
  }

  const onTouchEnd = (event) => {
    if (!touchTracking) return
    touchTracking = false
    const touch = event.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - touchStartX
    const deltaY = touch.clientY - touchStartY
    const count = imagePreviewList.value.length
    if (count <= 1) return
    if (Math.abs(deltaX) < PREVIEW_SWIPE_THRESHOLD) return
    if (Math.abs(deltaX) < Math.abs(deltaY)) return

    previewSwipeMoved = true
    const nextIndex = deltaX < 0
      ? (previewIndex.value + 1) % count
      : (previewIndex.value - 1 + count) % count
    previewViewerRef.value?.setActiveItem?.(nextIndex)
  }

  const onWrapperClick = (event) => {
    if (previewSwipeMoved) {
      previewSwipeMoved = false
      return
    }
    const target = event.target
    if (target.closest('.el-image-viewer__actions')) return
    if (target.closest('.el-image-viewer__close')) return
    if (target.closest('.el-image-viewer__btn')) return
    if (target.tagName === 'IMG') return
    previewVisible.value = false
  }

  wrapper.addEventListener('touchstart', onTouchStart, { passive: true })
  wrapper.addEventListener('touchmove', onTouchMove, { passive: true })
  wrapper.addEventListener('touchend', onTouchEnd, { passive: true })
  wrapper.addEventListener('click', onWrapperClick)

  return () => {
    wrapper.removeEventListener('touchstart', onTouchStart)
    wrapper.removeEventListener('touchmove', onTouchMove)
    wrapper.removeEventListener('touchend', onTouchEnd)
    wrapper.removeEventListener('click', onWrapperClick)
  }
}

function jumpToGallerySlide(slideIndex) {
  const el = galleryRef.value
  if (!el || !el.clientWidth) return
  galleryLooping.value = true
  const prevBehavior = el.style.scrollBehavior
  el.style.scrollBehavior = 'auto'
  el.scrollLeft = slideIndex * el.clientWidth
  requestAnimationFrame(() => {
    el.style.scrollBehavior = prevBehavior || ''
    galleryLooping.value = false
  })
}

function syncGalleryIndex() {
  const el = galleryRef.value
  if (!el || !el.clientWidth) return
  const count = imagePreviewList.value.length
  if (count <= 1) {
    currentImageIndex.value = 0
    return
  }
  const rawIndex = Math.round(el.scrollLeft / el.clientWidth)
  if (rawIndex <= 0) {
    currentImageIndex.value = count - 1
  } else if (rawIndex >= count + 1) {
    currentImageIndex.value = 0
  } else {
    currentImageIndex.value = rawIndex - 1
  }
}

function handleGalleryScrollEnd() {
  if (galleryLooping.value) return
  const el = galleryRef.value
  const count = imagePreviewList.value.length
  if (!el || !el.clientWidth || count <= 1) return

  const rawIndex = Math.round(el.scrollLeft / el.clientWidth)
  if (rawIndex === 0) {
    jumpToGallerySlide(count)
    currentImageIndex.value = count - 1
  } else if (rawIndex >= count + 1) {
    jumpToGallerySlide(1)
    currentImageIndex.value = 0
  }
}

function onGalleryScroll() {
  syncGalleryIndex()
  if (galleryScrollEndTimer) clearTimeout(galleryScrollEndTimer)
  galleryScrollEndTimer = setTimeout(handleGalleryScrollEnd, 120)
}

watch(imagePreviewList, async () => {
  currentImageIndex.value = 0
  await nextTick()
  if (!galleryRef.value) return
  if (imagePreviewList.value.length > 1) {
    jumpToGallerySlide(1)
  } else {
    galleryRef.value.scrollLeft = 0
  }
})

watch(previewVisible, async (visible) => {
  if (previewInteractionCleanup) {
    previewInteractionCleanup()
    previewInteractionCleanup = null
  }
  previewSwipeMoved = false
  if (!visible) return
  await nextTick()
  const wrapper = document.querySelector('.el-image-viewer__wrapper')
  if (!wrapper) return
  previewInteractionCleanup = setupPreviewInteractions(wrapper)
})

onBeforeUnmount(() => {
  if (galleryScrollEndTimer) clearTimeout(galleryScrollEndTimer)
  if (previewInteractionCleanup) previewInteractionCleanup()
})

const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))

const basicFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: t('mobile.labelSku'), value: displayValue(item.skuCode) },
    { label: t('mobile.labelItemName'), value: displayValue(item.itemName) },
    { label: t('mobile.labelCategory'), value: displayValue(item.categoryName) },
    { label: t('mobile.labelBrand'), value: displayValue(item.brandName) },
    { label: t('mobile.labelModel'), value: displayValue(item.modelName) },
    { label: t('mobile.labelYear'), value: displayValue(item.year) },
    { label: t('mobile.labelMaterial'), value: displayValue(item.materialName) },
    { label: t('mobile.labelCondition'), value: displayValue(item.itemCondition) },
    { label: t('mobile.labelDefect'), value: displayValue(item.defect) },
    { label: t('mobile.labelAccessories'), value: displayValue(item.accessories) },
    { label: t('mobile.labelRemark'), value: displayValue(item.remark) }
  ]
})

const inboundFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: t('mobile.labelReceiptTime'), value: formatTime(item.receiptTime) },
    { label: t('mobile.labelWarehouse'), value: displayValue(item.warehouseName) }
  ]
})

const outboundFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: t('mobile.labelShipmentTime'), value: formatTime(item.shipmentTime) },
    { label: t('mobile.labelOutboundPlatform'), value: displayValue(item.outboundPlatform) }
  ]
})

const inventoryFields = computed(() => {
  const item = detail.value || {}
  return [
    { label: t('mobile.labelQuantity'), value: displayValue(item.quantity) },
    { label: t('mobile.labelTurnoverDays'), value: displayValue(item.turnoverDays) }
  ]
})

const priceFields = computed(() => {
  const item = detail.value || {}
  const fields = []
  if (canViewCostPrice.value) {
    fields.push({ label: t('mobile.labelCostPrice'), value: formatMoney(item.costPrice) })
  }
  if (canViewSellingPrice.value) {
    fields.push({ label: t('mobile.labelSellingPrice'), value: formatMoney(item.sellingPrice) })
  }
  if (canViewCostPrice.value && canViewSellingPrice.value && item.totalProfit !== null && item.totalProfit !== undefined) {
    fields.push({ label: t('mobile.labelProfit'), value: formatMoney(item.totalProfit) })
  }
  return fields
})

const orderFields = computed(() => {
  const item = detail.value || {}
  const fields = []
  if (item.trackingNumber) {
    fields.push({ label: t('mobile.labelTrackingNumber'), value: displayValue(item.trackingNumber) })
  }
  if (item.platformOrderNo) {
    fields.push({ label: t('mobile.labelOrderNo'), value: displayValue(item.platformOrderNo) })
  }
  if (item.orderInfo) {
    fields.push({ label: t('mobile.labelOrderInfo'), value: displayValue(item.orderInfo) })
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
  if (!wmsStore.warehouseList.length) tasks.push(wmsStore.getWarehouseList())
  if (!wmsStore.merchantList.length) tasks.push(wmsStore.getMerchantList())
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

async function loadInventoryFromHistory(skuId, skuCode) {
  try {
    const res = await listInventoryHistory({
      skuId,
      skuCode,
      pageNum: 1,
      pageSize: 100
    })
    const rows = res?.rows || []
    if (!rows.length) return null

    let summary = summarizeInventoryHistoryRows(rows, wmsStore.warehouseMap)
    if (summary) {
      summary = await enrichOutboundPlatform(summary, wmsStore.merchantMap)
    }
    return summary
  } catch (_) {
    return null
  }
}

async function loadInventoryExtra(skuId, skuCode) {
  const fromHistory = await loadInventoryFromHistory(skuId, skuCode)
  if (fromHistory) return fromHistory

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
    ElMessage.error(t('mobile.missingSkuParam'))
    return
  }
  loading.value = true
  try {
    await loadDetailBySkuId(skuId, history.state?.summary)
  } catch (error) {
    ElMessage.error(error?.message || t('mobile.loadDetailFailed'))
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.mobile-gallery-card {
  padding-bottom: 8px;
}

.mobile-gallery-scroll {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  border-radius: 8px;
  scrollbar-width: none;
  touch-action: pan-x pan-y;

  &::-webkit-scrollbar {
    display: none;
  }
}

.mobile-gallery-slide {
  flex: 0 0 100%;
  width: 100%;
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

.mobile-detail-gallery__image {
  display: block;
  width: 100%;
  height: 240px;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: manipulation;
}

.mobile-gallery-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.mobile-gallery-dot {
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: #dcdfe6;
  transition: background-color 0.2s ease;

  &.is-active {
    background: #409eff;
  }
}

.mobile-empty--compact {
  padding: 8px 0;
}
</style>
