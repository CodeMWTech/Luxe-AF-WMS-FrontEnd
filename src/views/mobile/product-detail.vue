<template>
  <div v-loading="loading" class="mobile-page">
    <template v-if="detail">
      <section class="mobile-card">
        <div v-if="imagePreviewList.length" class="mobile-detail-gallery">
          <el-image
            :src="imagePreviewList[activeImageIndex]"
            fit="cover"
            class="mobile-detail-gallery__image"
            :preview-src-list="imagePreviewList"
            preview-teleported
          />
          <div v-if="imagePreviewList.length > 1" class="mobile-gallery-dots">
            <span
              v-for="(_, index) in imagePreviewList"
              :key="index"
              :class="['mobile-gallery-dot', { active: index === activeImageIndex }]"
              @click="activeImageIndex = index"
            />
          </div>
        </div>
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

      <section v-if="priceFields.length" class="mobile-card">
        <h3 class="mobile-section-title">价格信息</h3>
        <div class="mobile-field-list">
          <div v-for="field in priceFields" :key="field.label" class="mobile-field-row">
            <div class="mobile-field-row__label">{{ field.label }}</div>
            <div class="mobile-field-row__value">{{ field.value }}</div>
          </div>
        </div>
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
import { getInventoryItemBoardDetail } from '@/api/wms/inventory'
import { getItem, getItemImages } from '@/api/wms/item'
import { getItemSku } from '@/api/wms/itemSku'
import {
  buildDetailViewModel,
  displayValue,
  formatMoney,
  formatTime
} from '@/utils/mobileProduct'

const route = useRoute()
const { proxy } = getCurrentInstance()

const loading = ref(false)
const detail = ref(null)
const activeImageIndex = ref(0)

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
    { label: '品牌', value: displayValue(item.brandName) },
    { label: '型号', value: displayValue(item.modelName) },
    { label: '成色', value: displayValue(item.itemCondition) },
    { label: '瑕疵', value: displayValue(item.defect) },
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
  if (canViewCostPrice.value && canViewSellingPrice.value) {
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

async function loadImages(itemId) {
  if (!itemId) return []
  try {
    const res = await getItemImages(itemId)
    return res.data || []
  } catch (_) {
    return []
  }
}

async function loadDetailBySkuId(skuId, summary) {
  let payload = summary || null
  let images = []

  try {
    const res = await getInventoryItemBoardDetail(skuId)
    payload = res.data || res || payload
  } catch (_) {
    // fallback below
  }

  if (!payload || (!payload.itemName && !payload.skuCode)) {
    try {
      const skuRes = await getItemSku(skuId)
      const skuData = skuRes.data || skuRes || {}
      const itemId = skuData.itemId || skuData.item?.id
      if (itemId) {
        const itemRes = await getItem(itemId)
        payload = {
          item: itemRes.data || itemRes,
          itemSku: skuData
        }
      } else {
        payload = { itemSku: skuData }
      }
    } catch (error) {
      throw error
    }
  }

  const itemId = payload?.itemId || payload?.item?.id
  images = await loadImages(itemId)
  detail.value = buildDetailViewModel(payload, images)
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
.mobile-gallery-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.mobile-gallery-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdfe6;
}

.mobile-gallery-dot.active {
  background: #409eff;
}
</style>
