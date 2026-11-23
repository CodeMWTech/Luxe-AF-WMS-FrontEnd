<template>
  <div class="mobile-page">
    <section class="mobile-card mobile-search-card">
      <div class="mobile-search-bar">
        <el-input
          v-model="skuCode"
          clearable
          :placeholder="t('mobile.searchPlaceholder')"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" :loading="loading" @click="handleSearch">{{ t('mobile.search') }}</el-button>
      </div>
      <el-checkbox v-model="hideZeroStock" class="mobile-zero-filter" @change="saveFilter">{{ t('mobile.hideZeroStock') }}</el-checkbox>
      <p class="mobile-tip">{{ t('mobile.searchTip') }}</p>
    </section>

    <section v-if="searched && !loading && visibleResults.length === 0" class="mobile-card">
      <div class="mobile-empty">{{ emptyMessage }}</div>
    </section>

    <section
      v-for="item in visibleResults"
      :key="`${item.source}-${item.skuId || item.skuCode}`"
      class="mobile-card mobile-result-card"
    >
      <div class="mobile-result-card__image">
        <el-image
          v-if="item.itemImage"
          :src="item.itemImage"
          fit="cover"
          style="width: 88px; height: 88px;"
        >
          <template #error>
            <div class="mobile-image-placeholder">{{ t('mobile.noImage') }}</div>
          </template>
        </el-image>
        <div v-else class="mobile-image-placeholder">{{ t('mobile.noImage') }}</div>
      </div>
      <div class="mobile-result-card__content">
        <div class="mobile-field-list">
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelSku') }}</div>
            <div class="mobile-field-row__value">{{ displayValue(item.skuCode) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelItemName') }}</div>
            <div class="mobile-field-row__value">{{ displayValue(item.itemName) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelBrand') }}</div>
            <div class="mobile-field-row__value">{{ displayValue(item.brandName) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelModel') }}</div>
            <div class="mobile-field-row__value">{{ displayValue(item.modelName) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelCurrentStatus') }}</div>
            <div class="mobile-field-row__value">{{ displayValue(item.currentStatus) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelInventoryStatus') }}</div>
            <div class="mobile-field-row__value">{{ displayInventoryStatus(item) }}</div>
          </div>
          <div v-if="canViewCostPrice" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelCostPrice') }}</div>
            <div class="mobile-field-row__value">{{ formatMoney(item.costPrice) }}</div>
          </div>
          <div v-if="canViewSellingPrice" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ t('mobile.labelSellingPrice') }}</div>
            <div class="mobile-field-row__value">{{ formatMoney(item.sellingPrice) }}</div>
          </div>
        </div>
        <el-button
          type="primary"
          plain
          native-type="button"
          class="mobile-detail-btn"
          :disabled="!resolveSkuId(item)"
          @click.stop="openDetail(item)"
        >
          {{ t('mobile.viewDetail') }}
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup name="MobileSkuSearch">
import { computed, getCurrentInstance, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { listItemSkuPage } from '@/api/wms/itemSku'
import { listInventory } from '@/api/wms/inventory'
import { getItemImages } from '@/api/wms/item'
import { useWmsStore } from '@/store/modules/wms'
import { useMobileSkuSearchStore } from '@/store/modules/mobileSkuSearch'
import {
  displayValue,
  formatMoney,
  getInventoryStatusText,
  normalizeInventorySearchRow,
  normalizeSkuSearchRow
} from '@/utils/mobileProduct'

const router = useRouter()
const wmsStore = useWmsStore()
const searchStore = useMobileSkuSearchStore()
const { skuCode, searched, results, hideZeroStock } = storeToRefs(searchStore)
const visibleResults = computed(() => hideZeroStock.value
  ? results.value.filter(item => Number(item.quantity) > 0)
  : results.value)
const emptyMessage = computed(() => (
  hideZeroStock.value && results.value.length > 0
    ? t('mobile.zeroStockHidden')
    : t('mobile.noSkuFound')
))
const { t } = useI18n()
const { proxy } = getCurrentInstance()

const loading = ref(false)

const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))

function resolveSkuId(item) {
  return item?.skuId
    ?? item?.raw?.skuId
    ?? item?.raw?.id
    ?? item?.raw?.itemSkuId
    ?? item?.raw?.itemSku?.id
}

function displayInventoryStatus(item) {
  const qty = Number(item.quantity)
  if (Number.isFinite(qty) && qty > 0) {
    const place = (item.stockLocations || []).filter(Boolean).join('、')
    const status = t('mobile.statusInStock', { qty })
    return place ? `${status}（${place}）` : status
  }
  if (Number.isFinite(qty) && qty <= 0) return t('mobile.statusNoStock')
  if (item.inventoryStatus === '商品已建档') return t('mobile.statusArchived')
  return item.inventoryStatus || t('mobile.statusNoStock')
}

function rememberStockLocation(item, row) {
  if (Number(row.quantity) <= 0 || !row.warehouseName) return
  if (!item.stockLocations) item.stockLocations = []
  if (!item.stockLocations.includes(row.warehouseName)) item.stockLocations.push(row.warehouseName)
}

function groupInventoryRows(rows) {
  const grouped = new Map()
  rows.forEach(row => {
    const item = normalizeInventorySearchRow(row)
    const key = String(item.skuId || item.skuCode || '')
    const current = grouped.get(key)
    if (!current) {
      item.stockLocations = []
      rememberStockLocation(item, item)
      grouped.set(key, item)
      return
    }
    current.quantity = Number(current.quantity || 0) + Number(item.quantity || 0)
    current.inventoryStatus = getInventoryStatusText(current.quantity)
    rememberStockLocation(current, item)
  })
  return [...grouped.values()]
}

function mergeInventory(catalogRows, inventoryRows) {
  const inventoryBySku = new Map(inventoryRows.map(item => [String(item.skuId), item]))
  const merged = catalogRows.map(item => {
    const stock = inventoryBySku.get(String(item.skuId))
    if (!stock) return item
    inventoryBySku.delete(String(item.skuId))
    return {
      ...item,
      quantity: stock.quantity,
      inventoryStatus: getInventoryStatusText(stock.quantity),
      warehouseName: stock.warehouseName,
      stockLocations: stock.stockLocations || []
    }
  })
  inventoryBySku.forEach(item => merged.push(item))
  return merged
}

function getImageListFromResponse(res) {
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res)) return res
  return []
}

function enrichSearchRow(item) {
  const itemData = item.raw?.item || {}
  const itemSku = item.raw?.itemSku || {}
  if (!item.brandName && itemData.itemBrand) {
    item.brandName = wmsStore.itemBrandMap.get(itemData.itemBrand)?.brandName
  }
  if (!item.modelName && itemData.modelName) {
    item.modelName = itemData.modelName
  }
  if (!item.modelName && itemData.modelId) {
    item.modelName = wmsStore.itemModelMap.get(itemData.modelId)?.modelName
  }
  if (!item.categoryName && itemData.itemCategory) {
    item.categoryName = wmsStore.itemCategoryMap.get(itemData.itemCategory)?.categoryName
  }
  if (item.costPrice === null || item.costPrice === undefined) {
    item.costPrice = itemSku.costPrice
  }
  if (item.sellingPrice === null || item.sellingPrice === undefined) {
    item.sellingPrice = itemSku.sellingPrice
  }
  return item
}

async function loadMainImage(item) {
  if (!item?.itemId || item.itemImage) return
  try {
    const res = await getItemImages(item.itemId)
    const imageList = getImageListFromResponse(res)
    if (!imageList.length) return
    const mainImage = imageList.find(img => Number(img?.isMain) === 1) || imageList[0]
    item.itemImage = mainImage?.thumbUrl || mainImage?.url || mainImage?.imageUrl || ''
  } catch (_) {
    // 图片加载失败时静默处理
  }
}

async function preloadResultImages(rows) {
  await Promise.all(rows.map(row => loadMainImage(row)))
}

async function handleSearch() {
  const keyword = skuCode.value.trim()
  if (!keyword) {
    ElMessage.warning(t('mobile.enterSku'))
    return
  }
  loading.value = true
  searched.value = true
  results.value = []
  try {
    const [skuRes, inventoryRes] = await Promise.all([
      listItemSkuPage({ skuCode: keyword, skuCodeExact: true, pageNum: 1, pageSize: 20 }),
      listInventory({ skuCode: keyword, skuCodeExact: true, pageNum: 1, pageSize: 100 }, { silentError: true }).catch(() => ({ rows: [] }))
    ])
    const skuRows = Array.isArray(skuRes?.rows) ? skuRes.rows : []
    const inventoryRows = Array.isArray(inventoryRes?.rows) ? inventoryRes.rows : []
    results.value = mergeInventory(
      skuRows.map(row => enrichSearchRow(normalizeSkuSearchRow(row))),
      groupInventoryRows(inventoryRows)
    )
    await preloadResultImages(visibleResults.value.length ? visibleResults.value : results.value)

    if (!visibleResults.value.length) {
      ElMessage.warning(emptyMessage.value)
      searchStore.saveSearchState({ skuCode: keyword, searched: true, results: results.value, hideZeroStock: hideZeroStock.value })
      return
    }

    searchStore.saveSearchState({
      skuCode: keyword,
      searched: true,
      results: results.value,
      hideZeroStock: hideZeroStock.value
    })
  } catch (error) {
    ElMessage.error(error?.message || t('mobile.searchFailed'))
  } finally {
    loading.value = false
  }
}

function openDetail(item) {
  const skuId = resolveSkuId(item)
  if (!skuId) {
    ElMessage.warning(t('mobile.missingSkuId'))
    return
  }
  searchStore.saveSearchState({
    skuCode: skuCode.value,
    searched: searched.value,
    results: results.value,
    hideZeroStock: hideZeroStock.value
  })
  router.push({
    name: 'MobileProductDetail',
    params: { skuId: String(skuId) }
  }).catch((error) => {
    if (error?.name !== 'NavigationDuplicated') {
      ElMessage.error(error?.message || t('mobile.loadDetailFailed'))
    }
  })
}

function saveFilter() {
  searchStore.saveSearchState({ hideZeroStock: hideZeroStock.value })
}

onMounted(() => {
  searchStore.restoreFromStorage()
  if (!wmsStore.itemBrandList.length) {
    wmsStore.getItemBrandList()
  }
  if (!wmsStore.itemModelList.length) {
    wmsStore.getItemModelList()
  }
  if (!wmsStore.itemCategoryList.length) {
    wmsStore.getItemCategoryList()
  }
})

onActivated(() => {
  searchStore.restoreFromStorage()
})
</script>

<style scoped lang="scss">
.mobile-zero-filter { margin-top: 10px; }
.mobile-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.mobile-image-placeholder {
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f3f5;
  border-radius: 8px;
  color: #909399;
  font-size: 12px;
  text-align: center;
  padding: 8px;
  box-sizing: border-box;
}

.mobile-detail-btn {
  margin-top: 12px;
  width: 100%;
}
</style>
