<template>
  <el-dialog v-model="visible" :title="t('platformListings.publishTitle')" width="900px" :close-on-click-modal="false" destroy-on-close @open="onOpen">
    <el-steps :active="step" align-center finish-status="success" style="margin-bottom:24px">
      <el-step :title="t('platformListings.stepSelectProducts')" />
      <el-step :title="t('platformListings.stepSelectShop')" />
      <el-step :title="t('platformListings.stepPreviewConfirm')" />
    </el-steps>

    <!-- Step 1: 选择库存商品 -->
    <div v-if="step === 0">
      <el-form :inline="true">
        <el-form-item :label="t('platformListings.sku')">
          <el-input v-model="invQuery.skuCode" clearable :placeholder="t('platformListings.searchSkuPlaceholder')" @keyup.enter="loadInventory" />
        </el-form-item>
        <el-form-item :label="t('platformListings.productName')">
          <el-input v-model="invQuery.itemName" clearable :placeholder="t('platformListings.searchProductPlaceholder')" @keyup.enter="loadInventory" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="loadInventory">{{ t('platformListings.btnQuery') }}</el-button>
        </el-form-item>
      </el-form>
      <el-table ref="invTableRef" :data="invList" v-loading="invLoading" border stripe max-height="400" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column :label="t('platformListings.sku')" prop="skuCode" min-width="120" />
        <el-table-column :label="t('platformListings.productName')" prop="itemName" min-width="150" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.warehouse')" prop="warehouseName" width="100" />
        <el-table-column :label="t('platformListings.inventoryQuantity')" prop="quantity" width="80" align="center" />
        <el-table-column :label="t('platformListings.sellingPrice')" width="100" align="right">
          <template #default="{ row }">${{ row.sellingPrice ? Number(row.sellingPrice).toFixed(2) : '-' }}</template>
        </el-table-column>
      </el-table>
      <pagination v-show="invTotal > 0" :total="invTotal" v-model:page="invParams.pageNum" v-model:limit="invParams.pageSize" small @pagination="loadInventory" />
    </div>

    <!-- Step 2: 选择店铺和模板 -->
    <div v-if="step === 1">
      <el-form label-width="100px">
        <el-form-item :label="t('platformListings.filterShop')" required>
          <el-select v-model="chosenShopId" filterable style="width:300px" @change="onShopChange">
            <el-option v-for="s in shopList" :key="s.id" :label="s.shopName + ' (' + s.platform + ')'" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.selectTemplate')" required>
          <el-select v-model="chosenTemplateId" filterable style="width:300px" :disabled="!chosenPlatform">
            <el-option v-for="tpl in templateList" :key="tpl.id" :label="tpl.templateName" :value="tpl.id">
              <span>{{ tpl.templateName }}</span>
              <el-tag size="small" style="margin-left:8px" :type="tpl.platform === 'EBAY' ? '' : 'danger'">{{ tpl.platform === 'EBAY' ? 'eBay' : 'TikTok' }}</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="chosenTemplate">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item :label="t('platformListings.templatePlatformLabel')">{{ chosenPlatform === 'EBAY' ? 'eBay' : 'TikTok Shop' }}</el-descriptions-item>
            <el-descriptions-item :label="t('platformListings.templatePriceSourceLabel')">{{ chosenTemplate.priceSource === 'CUSTOM' ? t('platformListings.priceSourceCustom') : t('platformListings.priceSourceSelling') }}</el-descriptions-item>
            <el-descriptions-item :label="t('platformListings.templateMarkupLabel')">{{ (chosenTemplate.priceMarkupValue || 0) + (chosenTemplate.priceMarkupType === 'PERCENT' ? '%' : '') }}</el-descriptions-item>
            <el-descriptions-item :label="t('platformListings.templateTitleFormatLabel')" :span="2">{{ chosenTemplate.titleFormat || '{brand} {material} {year} {itemName}' }}</el-descriptions-item>
          </el-descriptions>
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 3: 预览确认 -->
    <div v-if="step === 2">
      <el-alert :title="t('platformListings.previewSelectedSummary', { count: selectedSkus.length, template: chosenTemplate?.templateName || '-' })" type="info" :closable="false" style="margin-bottom:12px" />
      <div v-if="previewList.length" class="channel-preview" :class="chosenPlatform === 'EBAY' ? 'ebay-preview' : 'tiktok-preview'">
        <div class="preview-media">
          <el-image v-if="previewList[0].images && previewList[0].images.length" :src="previewList[0].images[0]" fit="cover" />
          <div v-else class="empty-media">{{ t('platformListings.noImage') }}</div>
        </div>
        <div class="preview-content">
          <div class="preview-platform">{{ chosenPlatform === 'EBAY' ? t('platformListings.ebayPreviewLabel') : t('platformListings.tiktokPreviewLabel') }}</div>
          <div class="preview-title">{{ previewList[0].overrideTitle || '-' }}</div>
          <div class="preview-price">{{ previewList[0].currency || 'USD' }} {{ Number(previewList[0].overridePrice || 0).toFixed(2) }}</div>
          <div class="preview-meta">
            <span>{{ t('platformListings.sku') }} {{ previewList[0].skuCode }}</span>
            <span>{{ t('platformListings.quantityShort') }} {{ previewList[0].quantity || 1 }}</span>
            <span>{{ previewList[0].condition || '-' }}</span>
            <span>{{ previewList[0].packageSummary || '-' }}</span>
          </div>
          <div class="preview-desc" v-html="previewList[0].description"></div>
        </div>
      </div>
      <el-table :data="previewList" v-loading="previewLoading" border stripe max-height="320">
        <el-table-column :label="t('platformListings.sku')" prop="skuCode" width="120" />
        <el-table-column :label="t('platformListings.resolvedTitle')" min-width="200">
          <template #default="{ row, $index }">
            <el-input v-model="row.overrideTitle" size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.resolvedPrice')" width="110" align="right">
          <template #default="{ row, $index }">
            <el-input-number v-model="row.overridePrice" :precision="2" :min="0.01" size="small" controls-position="right" style="width:100%" />
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.image')" width="70" align="center">
          <template #default="{ row }">
            <span v-if="!row.images || !row.images.length">{{ t('platformListings.noImage') }}</span>
            <el-image v-else :src="row.images[0]" style="width:40px;height:40px" fit="cover" :preview-src-list="row.images" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('platformListings.cancel') }}</el-button>
      <el-button v-if="step > 0" @click="step--">{{ t('platformListings.previousStep') }}</el-button>
      <el-button v-if="step === 0" type="primary" @click="goStep2" :disabled="selectedSkus.length === 0">
        {{ t('platformListings.nextStep') }} ({{ selectedSkus.length }})
      </el-button>
      <el-button v-if="step === 1" type="primary" @click="goStep3" :disabled="!chosenTemplateId">{{ t('platformListings.nextStep') }}</el-button>
      <el-button v-if="step === 2" type="primary" @click="doPublish" :loading="publishing">
        {{ t('platformListings.startPublish') }} ({{ previewList.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, getCurrentInstance } from 'vue'
import { listInventoryBoard } from '@/api/wms/inventory'
import { listAllTemplates, previewTemplate, batchPublish } from '@/api/wms/platformListing'
import { listAllPlatformShops } from '@/api/wms/platformShop'

const { proxy } = getCurrentInstance()
const t = (key, values) => proxy?.$t?.(key, values) || key

const emit = defineEmits(['success'])

// ==================== Dialog state ====================
const visible = ref(false)
const step = ref(0)
const publishing = ref(false)

// ==================== Step 1: Inventory ====================
const invLoading = ref(false)
const invList = ref([])
const invTotal = ref(0)
const invTableRef = ref(null)
const invQuery = reactive({ skuCode: '', itemName: '' })
const invParams = reactive({ pageNum: 1, pageSize: 10 })
const selectedSkus = ref([])

function loadInventory() {
  invLoading.value = true
  listInventoryBoard({ ...invParams, ...invQuery, minQuantity: 0 }, 'item').then(res => {
    invList.value = (res.rows || []).filter(r => r.quantity > 0)
    invTotal.value = res.total || 0
  }).finally(() => { invLoading.value = false })
}

function onSelectionChange(rows) {
  selectedSkus.value = rows
}

// ==================== Step 2: Shop & Template ====================
const shopList = ref([])
const templateList = ref([])
const chosenShopId = ref(null)
const chosenTemplateId = ref(null)

const chosenPlatform = computed(() => {
  if (chosenShopId.value) {
    const shop = shopList.value.find(s => s.id === chosenShopId.value)
    return shop?.platform || null
  }
  return null
})

const chosenTemplate = computed(() => {
  return templateList.value.find(t => t.id === chosenTemplateId.value) || null
})

function onShopChange() {
  chosenTemplateId.value = null
  templateList.value = []
  if (chosenPlatform.value) {
    listAllTemplates(chosenPlatform.value).then(res => {
      templateList.value = res.data || res.rows || []
    })
  }
}

// ==================== Step 3: Preview ====================
const previewLoading = ref(false)
const previewList = ref([])

async function loadPreviews() {
  previewLoading.value = true
  previewList.value = []
  try {
    for (const sku of selectedSkus.value) {
      try {
        const res = await previewTemplate(chosenTemplateId.value, sku.skuId || sku.id)
        const data = res.data || {}
        previewList.value.push({
          ...data,
          skuId: sku.skuId || sku.id,
          skuCode: data.skuCode || sku.skuCode,
          overrideTitle: data.title || '',
          overridePrice: data.price || 0,
          images: data.images || []
        })
      } catch (e) {
        previewList.value.push({
          skuId: sku.skuId || sku.id,
          skuCode: sku.skuCode,
          overrideTitle: '',
          overridePrice: 0,
          images: []
        })
      }
    }
  } finally {
    previewLoading.value = false
  }
}

// ==================== Navigation ====================
function onOpen() {
  step.value = 0
  loadInventory()
  listAllPlatformShops().then(res => {
    shopList.value = res.rows || res.data || []
  })
}

function goStep2() {
  if (selectedSkus.value.length === 0) {
    proxy.$modal.msgWarning(t('platformListings.selectSkuRequired'))
    return
  }
  chosenShopId.value = null
  chosenTemplateId.value = null
  templateList.value = []
  step.value = 1
}

async function goStep3() {
  if (!chosenTemplateId.value) {
    proxy.$modal.msgWarning(t('platformListings.selectTemplateRequired'))
    return
  }
  step.value = 2
  await loadPreviews()
}

async function doPublish() {
  const skuIds = previewList.value.map(p => p.skuId)
  const customTitles = {}
  const customPrices = {}
  previewList.value.forEach(p => {
    if (p.overrideTitle) customTitles[p.skuId] = p.overrideTitle
    if (p.overridePrice != null) customPrices[p.skuId] = p.overridePrice
  })
  publishing.value = true
  try {
    await batchPublish({ templateId: chosenTemplateId.value, publishShopId: chosenShopId.value, skuIds, customTitles, customPrices })
    proxy.$modal.msgSuccess(t('platformListings.publishSuccess'))
    visible.value = false
    emit('success')
  } catch {
    proxy.$modal.msgError(t('platformListings.publishFailed'))
  } finally {
    publishing.value = false
  }
}

function open() { visible.value = true }
defineExpose({ open })
</script>
<style scoped>
.channel-preview {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 14px;
  background: #fff;
}
.channel-preview .preview-media { width: 180px; height: 180px; background: #f5f7fa; }
.channel-preview .preview-media :deep(.el-image) { width: 100%; height: 100%; }
.empty-media { height: 100%; display: flex; align-items: center; justify-content: center; color: #909399; }
.preview-platform { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #606266; margin-bottom: 6px; }
.preview-title { font-size: 18px; font-weight: 700; line-height: 1.35; color: #111827; }
.preview-price { margin-top: 8px; font-size: 20px; font-weight: 700; color: #111827; }
.preview-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.preview-meta span { border: 1px solid #e5e7eb; border-radius: 4px; padding: 3px 8px; font-size: 12px; color: #606266; }
.preview-desc { max-height: 110px; overflow: auto; font-size: 12px; color: #606266; border-top: 1px solid #ebeef5; padding-top: 8px; }
.ebay-preview { border-top: 4px solid #3665f3; }
.tiktok-preview { border-top: 4px solid #111827; }
</style>

