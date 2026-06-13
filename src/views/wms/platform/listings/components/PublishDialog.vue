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
        <el-form-item label="SKU">
          <el-input v-model="invQuery.skuCode" clearable placeholder="搜索SKU编码" @keyup.enter="loadInventory" />
        </el-form-item>
        <el-form-item label="商品名">
          <el-input v-model="invQuery.itemName" clearable placeholder="搜索商品名" @keyup.enter="loadInventory" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="loadInventory">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table ref="invTableRef" :data="invList" v-loading="invLoading" border stripe max-height="400" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column label="SKU" prop="skuCode" min-width="120" />
        <el-table-column label="商品名称" prop="itemName" min-width="150" show-overflow-tooltip />
        <el-table-column label="仓库" prop="warehouseName" width="100" />
        <el-table-column label="库存量" prop="quantity" width="80" align="center" />
        <el-table-column label="销售价" width="100" align="right">
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
            <el-descriptions-item label="平台">{{ chosenPlatform === 'EBAY' ? 'eBay' : 'TikTok Shop' }}</el-descriptions-item>
            <el-descriptions-item label="价格来源">{{ chosenTemplate.priceSource === 'CUSTOM' ? '自定义' : 'SKU销售价' }}</el-descriptions-item>
            <el-descriptions-item label="加价">{{ (chosenTemplate.priceMarkupValue || 0) + (chosenTemplate.priceMarkupType === 'PERCENT' ? '%' : '') }}</el-descriptions-item>
            <el-descriptions-item label="标题格式" :span="2">{{ chosenTemplate.titleFormat || '{brand} {material} {year} {itemName}' }}</el-descriptions-item>
          </el-descriptions>
        </el-form-item>
      </el-form>
    </div>

    <!-- Step 3: 预览确认 -->
    <div v-if="step === 2">
      <el-alert :title="`已选择 ${selectedSkus.length} 个SKU，模板：${chosenTemplate?.templateName || '-'}`" type="info" :closable="false" style="margin-bottom:12px" />
      <el-table :data="previewList" v-loading="previewLoading" border stripe max-height="400">
        <el-table-column label="SKU" prop="skuCode" width="120" />
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
        <el-table-column label="图片" width="70" align="center">
          <template #default="{ row }">
            <span v-if="!row.images || !row.images.length">{{ t('platformListings.noImage') }}</span>
            <el-image v-else :src="row.images[0]" style="width:40px;height:40px" fit="cover" :preview-src-list="row.images" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button v-if="step > 0" @click="step--">上一步</el-button>
      <el-button v-if="step === 0" type="primary" @click="goStep2" :disabled="selectedSkus.length === 0">
        下一步 ({{ selectedSkus.length }})
      </el-button>
      <el-button v-if="step === 1" type="primary" @click="goStep3" :disabled="!chosenTemplateId">下一步</el-button>
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
const t = (key) => proxy?.$t?.(key) || key

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
    proxy.$modal.msgWarning('请至少选择一个SKU')
    return
  }
  chosenShopId.value = null
  chosenTemplateId.value = null
  templateList.value = []
  step.value = 1
}

async function goStep3() {
  if (!chosenTemplateId.value) {
    proxy.$modal.msgWarning('请选择模板')
    return
  }
  step.value = 2
  await loadPreviews()
}

async function doPublish() {
  const skuIds = previewList.value.map(p => p.skuId)
  publishing.value = true
  try {
    await batchPublish({ templateId: chosenTemplateId.value, shopId: chosenShopId.value, skuIds })
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
