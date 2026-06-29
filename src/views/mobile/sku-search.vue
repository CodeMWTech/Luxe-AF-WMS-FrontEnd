<template>
  <div class="mobile-page">
    <section class="mobile-card mobile-search-card">
      <div class="mobile-search-bar">
        <el-input
          v-model="skuCode"
          clearable
          placeholder="请输入 SKU"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
      </div>
      <p class="mobile-tip">与「商品管理」列表相同数据源，按 SKU 精确搜索。</p>
    </section>

    <section v-if="searched && !loading && results.length === 0" class="mobile-card">
      <div class="mobile-empty">未找到该 SKU，请检查输入是否正确。</div>
    </section>

    <section
      v-for="item in results"
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
            <div class="mobile-image-placeholder">暂无图片</div>
          </template>
        </el-image>
        <div v-else class="mobile-image-placeholder">暂无图片</div>
      </div>
      <div class="mobile-result-card__content">
        <div class="mobile-field-list">
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">SKU</div>
            <div class="mobile-field-row__value">{{ displayValue(item.skuCode) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">商品名称</div>
            <div class="mobile-field-row__value">{{ displayValue(item.itemName) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">品牌</div>
            <div class="mobile-field-row__value">{{ displayValue(item.brandName) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">型号</div>
            <div class="mobile-field-row__value">{{ displayValue(item.modelName) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">当前状态</div>
            <div class="mobile-field-row__value">{{ displayValue(item.currentStatus) }}</div>
          </div>
          <div class="mobile-field-row">
            <div class="mobile-field-row__label">库存状态</div>
            <div class="mobile-field-row__value">{{ displayValue(item.inventoryStatus) }}</div>
          </div>
        </div>
        <el-button
          type="primary"
          plain
          class="mobile-detail-btn"
          :disabled="!item.skuId"
          @click="openDetail(item)"
        >
          详细信息
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup name="MobileSkuSearch">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listItemSkuPage } from '@/api/wms/itemSku'
import { getItemImages } from '@/api/wms/item'
import { useWmsStore } from '@/store/modules/wms'
import {
  displayValue,
  normalizeSkuSearchRow
} from '@/utils/mobileProduct'

const router = useRouter()
const wmsStore = useWmsStore()
const skuCode = ref('')
const loading = ref(false)
const searched = ref(false)
const results = ref([])

function getImageListFromResponse(res) {
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res)) return res
  return []
}

function enrichSearchRow(item) {
  const itemData = item.raw?.item || {}
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
    ElMessage.warning('请输入 SKU')
    return
  }
  loading.value = true
  searched.value = true
  results.value = []
  try {
    const skuRes = await listItemSkuPage({
      skuCode: keyword,
      skuCodeExact: true,
      pageNum: 1,
      pageSize: 20
    })
    const skuRows = Array.isArray(skuRes?.rows) ? skuRes.rows : []
    results.value = skuRows.map(row => enrichSearchRow(normalizeSkuSearchRow(row)))

    if (!results.value.length) {
      ElMessage.warning('未找到该 SKU')
      return
    }

    await preloadResultImages(results.value)
  } catch (error) {
    ElMessage.error(error?.message || '搜索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function openDetail(item) {
  if (!item?.skuId) {
    ElMessage.warning('该商品缺少 SKU 标识，无法查看详情')
    return
  }
  router.push({
    name: 'MobileProductDetail',
    params: { skuId: String(item.skuId) },
    state: { summary: item.raw || item }
  })
}

onMounted(() => {
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
</script>

<style scoped lang="scss">
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
