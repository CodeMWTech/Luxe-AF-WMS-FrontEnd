<template>
  <div class="app-container warehouse-products">
    <el-card>
      <div class="toolbar"><h2>{{ t('仓库商品总览') }}</h2>
        <div><el-button @click="openOriginalPage">{{ t(status === 'unstocked' ? '打开未入库页面' : '打开库存统计页面') }}</el-button>
          <el-button v-if="canMap" @click="openMappings">{{ t('采购人仓库映射') }}</el-button></div></div>
      <el-form :model="query" label-width="90px" @submit.prevent="search">
        <el-row :gutter="16">
          <el-col :xs="24" :md="12"><el-form-item :label="t('仓库')" required>
            <WarehouseLocationSelect v-model="query.warehouseId" clearable include-inactive filter-mode @change="search" />
          </el-form-item></el-col>
          <el-col :xs="24" :md="6"><el-form-item :label="t('商品名称')"><el-input v-model="query.itemName" clearable @keyup.enter="search" /></el-form-item></el-col>
          <el-col :xs="24" :md="6"><el-form-item :label="t('SKU编号')"><el-input v-model="query.skuCode" clearable @keyup.enter="search" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :md="6"><el-form-item :label="t('商品分类')">
            <el-tree-select v-model="query.itemCategory" :data="wmsStore.itemCategoryTreeList"
              :props="{ value: 'id', label: 'label', children: 'children' }" value-key="id"
              check-strictly clearable filterable style="width:100%" />
          </el-form-item></el-col>
          <el-col :xs="24" :md="6"><el-form-item :label="t('商品品牌')">
            <el-select v-model="query.itemBrand" multiple clearable filterable style="width:100%">
              <el-option v-for="brand in wmsStore.itemBrandList" :key="brand.id" :label="brand.brandName" :value="brand.id" />
            </el-select>
          </el-form-item></el-col>
          <el-col :xs="24" :md="6"><el-form-item :label="t('采购人')"><el-input v-model="query.consignInfo" clearable @keyup.enter="search" /></el-form-item></el-col>
          <el-col :xs="24" :md="6" class="actions"><el-button type="primary" @click="search">{{ t('查询') }}</el-button><el-button @click="reset">{{ t('重置') }}</el-button></el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="results">
      <el-alert v-if="!query.warehouseId" :title="t('请先选择具体仓库')" type="info" :closable="false" />
      <template v-else>
        <el-alert :title="t('三类结果可能重叠，条数不能相加；零库存但已有库存记录的商品也可能不在三类中。主仓仅统计直存。')" type="info" :closable="false" />
        <div class="toolbar summary-row">
          <el-radio-group v-model="status" @change="changeStatus">
            <el-radio-button v-for="tab in tabs" :key="tab.status" :label="tab.status">
              {{ t(tab.title) }} {{ summary[tab.status]?.total ?? 0 }} {{ t('条') }}
            </el-radio-button>
          </el-radio-group>
          <div class="summary-actions"><span>{{ t(activeTab.quantityLabel) }}：{{ formatQty(summary[status]?.quantity) }}</span>
            <el-button type="primary" :loading="exporting" @click="exportCurrent">{{ t('导出Excel') }}</el-button></div>
        </div>
        <el-table :data="rows" v-loading="loading" border>
          <el-table-column prop="itemName" :label="t('商品名称')" min-width="180" show-overflow-tooltip />
          <el-table-column prop="skuCode" :label="t('SKU编号')" min-width="155" show-overflow-tooltip />
          <el-table-column prop="categoryName" :label="t('商品分类')" min-width="120" show-overflow-tooltip />
          <el-table-column prop="brandName" :label="t('商品品牌')" min-width="120" show-overflow-tooltip />
          <el-table-column prop="consignInfo" :label="t('采购人')" min-width="130" show-overflow-tooltip />
          <el-table-column prop="itemCondition" :label="t('成色')" width="90" />
          <el-table-column prop="quantity" :label="t(activeTab.quantityLabel)" width="110">
            <template #default="{ row }">{{ formatQty(row.quantity) }}</template>
          </el-table-column>
          <el-table-column v-if="status === 'sold'" prop="lastSaleTime" :label="t('最近售出时间')" min-width="180" />
          <el-table-column v-if="canCost" prop="costPrice" :label="t('商品管理成本价')" width="130">
            <template #default="{ row }">{{ formatMoney(row.costPrice) }}</template>
          </el-table-column>
          <el-table-column v-if="canSelling" prop="sellingPrice" :label="t('商品管理销售价')" width="130">
            <template #default="{ row }">{{ formatMoney(row.sellingPrice) }}</template>
          </el-table-column>
          <el-table-column :label="t('操作')" width="100" fixed="right">
            <template #default="{ row }"><el-button link type="primary" @click="openItem(row)">{{ t('商品管理') }}</el-button></template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum"
          v-model:limit="query.pageSize" @pagination="loadPage" />
      </template>
    </el-card>

    <el-dialog v-model="mappingVisible" :title="t('采购人仓库映射')" width="780px">
      <el-alert :title="`${t('未映射或未填写采购人的 SKU 不会进入具体仓库；补录采购人或保存映射后才会归属。')} ${t('当前选择下未归属的未入库 SKU（全系统）')}：${unassignedCount}（${t('未映射')} ${unmappedCount}，${t('采购人未填写')} ${missingPurchaserCount}）`"
        type="warning" :closable="false" class="mapping-hint" />
      <div v-if="unmappedBreakdown.length" class="mapping-breakdown">
        {{ t('未映射主要来源（前五项）') }}：{{ unmappedBreakdown.map(row => `${row.purchaserValue} ${row.itemCount}`).join('；') }}
      </div>
      <el-table :data="mappingRows" v-loading="mappingLoading" border max-height="55vh">
        <el-table-column prop="purchaserValue" :label="t('采购人')" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.purchaserValue || t('采购人未填写，请先在商品管理补录') }}</template>
        </el-table-column>
        <el-table-column prop="itemCount" :label="t('未入库 SKU 条数')" width="140" />
        <el-table-column :label="t('目标仓库')" min-width="260">
          <template #default="{ row }"><el-select v-model="row.warehouseId" clearable filterable :disabled="!row.purchaserValue?.trim()" :placeholder="t('未映射')" style="width:100%">
            <el-option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id"
              :label="mappingWarehouseLabel(warehouse)"
              :disabled="warehouse.mappingUnavailable || warehouse.status !== 0 || warehouse.delFlag !== 0" />
          </el-select></template>
        </el-table-column>
      </el-table>
      <template #footer><el-button @click="mappingVisible = false">{{ t('取消') }}</el-button>
        <el-button type="primary" :loading="mappingSaving" @click="saveMappings">{{ t('保存') }}</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="WarehouseProducts">
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import WarehouseLocationSelect from '@/components/WarehouseLocationSelect/index.vue'
import { historicalLocations, warehouseOptions } from '@/api/wms/warehouse'
import { warehouseProductSummary, warehouseProductPage, exportWarehouseProducts,
  purchaserWarehouseMappings, savePurchaserWarehouseMappings } from '@/api/wms/warehouseProducts'
import { PURCHASER_OPTIONS } from '@/utils/itemPurchaser'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { blobValidate } from '@/utils/ruoyi'
import { downloadXlsx, prepareLanguageXlsx } from '@/utils/xlsxTranslate'

const EN = {
  仓库商品总览: 'Warehouse Products', 采购人仓库映射: 'Purchaser to Warehouse Mapping',
  请先选择具体仓库: 'Select a warehouse or room first',
  '三类结果可能重叠，条数不能相加；零库存但已有库存记录的商品也可能不在三类中。主仓仅统计直存。':
    'Categories may overlap or omit zero-stock records. The main warehouse includes direct stock only.',
  未入库: 'Not Inbound', 当前有库存: 'In Stock', 历史已售出: 'Sold Historically',
  预计件数: 'Expected Qty', 库存件数: 'Stock Qty', 已售件数: 'Sold Qty',
  最近售出时间: 'Latest Sale', 目标仓库: 'Target Warehouse', 未映射: 'Unmapped',
  采购人未填写: 'Purchaser missing',
  '采购人未填写，请先在商品管理补录': 'Purchaser missing; fill it in Item Management first',
  商品管理成本价: 'Item Cost Price', 商品管理销售价: 'Item Selling Price',
  已删除: 'Deleted', 不可用: 'Unavailable',
  '未入库 SKU 条数': 'Unstocked SKU rows',
  '当前选择下未归属的未入库 SKU（全系统）': 'Unassigned unstocked SKUs with current selections (all warehouses)',
  '未映射主要来源（前五项）': 'Largest unmapped purchasers (top five)',
  打开未入库页面: 'Open Unstocked Items', 打开库存统计页面: 'Open Inventory Statistics',
  原页面不可用: 'Original page is unavailable',
  '未映射或未填写采购人的 SKU 不会进入具体仓库；补录采购人或保存映射后才会归属。':
    'Unmapped or missing purchasers have no warehouse; fill in the purchaser or save a mapping to assign them.'
}
const settings = useSettingsStore()
const isEn = computed(() => (settings.language || 'zh-cn') === 'en')
const t = text => isEn.value ? (EN[text] || translateByMap(text, 'en')) : text
const { proxy } = getCurrentInstance()
const router = useRouter()
const wmsStore = useWmsStore()
const canMap = computed(() => proxy?.$auth?.hasPermi('wms:inventory:purchaserMap'))
const canCost = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const canSelling = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))
const tabs = [
  { status: 'unstocked', title: '未入库', quantityLabel: '预计件数' },
  { status: 'stocked', title: '当前有库存', quantityLabel: '库存件数' },
  { status: 'sold', title: '历史已售出', quantityLabel: '已售件数' }
]
const blankQuery = () => ({ warehouseId: undefined, itemName: '', skuCode: '', itemCategory: undefined,
  itemBrand: [], consignInfo: '', pageNum: 1, pageSize: 10 })
const query = reactive(blankQuery())
const status = ref('unstocked')
const activeTab = computed(() => tabs.find(tab => tab.status === status.value))
const summary = ref({})
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const exporting = ref(false)
const mappingVisible = ref(false)
const mappingLoading = ref(false)
const mappingSaving = ref(false)
const mappingRows = ref([])
const missingPurchaserCount = computed(() => mappingRows.value
  .filter(item => !item.purchaserValue?.trim())
  .reduce((sum, item) => sum + Number(item.itemCount || 0), 0))
const unmappedCount = computed(() => mappingRows.value.filter(item => item.purchaserValue?.trim() && item.warehouseId == null)
  .reduce((sum, item) => sum + Number(item.itemCount || 0), 0))
const unassignedCount = computed(() => unmappedCount.value + missingPurchaserCount.value)
const unmappedBreakdown = computed(() => mappingRows.value
  .filter(item => item.purchaserValue?.trim() && item.warehouseId == null && Number(item.itemCount) > 0)
  .sort((a, b) => Number(b.itemCount) - Number(a.itemCount))
  .slice(0, 5))
const warehouses = ref([])
let requestSerial = 0
const params = () => ({ ...query, itemBrand: [...query.itemBrand], pageNum: undefined, pageSize: undefined })
const formatQty = value => value == null ? '--' : Number(value).toLocaleString()
const formatMoney = value => value == null ? '--' : Number(value).toFixed(2)
const mappingWarehouseLabel = warehouse => {
  const name = warehouse.locationName || warehouse.warehouseName
  if (warehouse.delFlag !== 0) return `${name} (${t('已删除')})`
  if (warehouse.status !== 0) return `${name} (${t('已停用')})`
  if (warehouse.mappingUnavailable) return `${name} (${t('不可用')})`
  return name
}

async function loadPage() {
  const serial = ++requestSerial
  if (!query.warehouseId) { rows.value = []; total.value = 0; loading.value = false; return }
  loading.value = true
  try {
    const response = await warehouseProductPage(status.value, { ...params(), pageNum: query.pageNum, pageSize: query.pageSize })
    if (serial !== requestSerial) return
    rows.value = response.rows || []
    total.value = response.total || 0
  } finally { if (serial === requestSerial) loading.value = false }
}
async function search() {
  query.pageNum = 1
  const serial = ++requestSerial
  if (!query.warehouseId) { summary.value = {}; rows.value = []; total.value = 0; loading.value = false; return }
  loading.value = true
  try {
    const [totals, page] = await Promise.all([
      warehouseProductSummary(params()),
      warehouseProductPage(status.value, { ...params(), pageNum: 1, pageSize: query.pageSize })
    ])
    if (serial !== requestSerial) return
    summary.value = Object.fromEntries((totals.data || []).map(item => [item.status, item]))
    rows.value = page.rows || []
    total.value = page.total || 0
  } finally { if (serial === requestSerial) loading.value = false }
}
function changeStatus() { query.pageNum = 1; loadPage() }
function reset() { ++requestSerial; Object.assign(query, blankQuery()); summary.value = {}; rows.value = []; total.value = 0; loading.value = false }
function openItem(row) { router.push({ name: 'Item', query: { skuCode: row.skuCode } }).catch(() => {}) }
function openOriginalPage() {
  const needle = status.value === 'unstocked' ? 'unstocked' : 'statistic'
  const target = router.getRoutes().find(route => route.path.toLowerCase().includes(needle))
  if (target) router.push(target.path).catch(() => {})
  else proxy.$modal.msgWarning(t('原页面不可用'))
}
async function exportCurrent() {
  exporting.value = true
  try {
    const blob = await exportWarehouseProducts(status.value, params())
    if (!blobValidate(blob)) throw new Error(t('导出失败'))
    downloadXlsx(await prepareLanguageXlsx(blob, isEn.value), `${t('仓库商品总览')}-${t(activeTab.value.title)}.xlsx`)
    proxy.$modal.msgSuccess(t('导出成功'))
  } catch (error) { proxy.$modal.msgError(error?.message || t('导出失败')) }
  finally { exporting.value = false }
}
async function openMappings() {
  mappingVisible.value = true
  mappingLoading.value = true
  try {
    const [mappingResponse, optionResponse, historicalResponse] = await Promise.all([
      purchaserWarehouseMappings(), warehouseOptions(), historicalLocations()
    ])
    const active = optionResponse.data || []
    const activeIds = new Set(active.map(warehouse => String(warehouse.id)))
    const mappedIds = new Set((mappingResponse.data || [])
      .filter(row => row.warehouseId != null).map(row => String(row.warehouseId)))
    const mappedHistorical = (historicalResponse.data || []).filter(warehouse =>
      mappedIds.has(String(warehouse.id)) && !activeIds.has(String(warehouse.id)))
      .map(warehouse => ({ ...warehouse, mappingUnavailable: true }))
    warehouses.value = [...active, ...mappedHistorical]
    const found = new Map()
    for (const item of mappingResponse.data || []) found.set(item.purchaserValue.trim().toLowerCase(), { ...item })
    for (const value of PURCHASER_OPTIONS) {
      const key = value.trim().toLowerCase()
      if (!found.has(key)) found.set(key, { purchaserValue: value, warehouseId: null, itemCount: 0 })
    }
    mappingRows.value = [...found.values()]
  } finally { mappingLoading.value = false }
}
async function saveMappings() {
  mappingSaving.value = true
  try {
    await savePurchaserWarehouseMappings(mappingRows.value.filter(item => item.purchaserValue?.trim() && item.warehouseId != null)
      .map(({ purchaserValue, warehouseId }) => ({ purchaserValue, warehouseId })))
    mappingVisible.value = false
    proxy.$modal.msgSuccess(t('保存成功'))
    if (query.warehouseId) await search()
  } catch (error) { proxy.$modal.msgError(error?.message || t('保存失败')) }
  finally { mappingSaving.value = false }
}
onMounted(() => {
  if (!wmsStore.itemBrandList.length) wmsStore.getItemBrandList()
  if (!wmsStore.itemCategoryTreeList.length) wmsStore.getItemCategoryTreeList()
})
</script>

<style scoped>
.toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.toolbar h2 { margin:0 0 16px; font-size:20px; }
.actions { display:flex; align-items:flex-start; justify-content:flex-end; gap:8px; padding:2px 8px 0; }
.results { margin-top:16px; }
.summary-row { margin:16px 0; }
.summary-actions { display:flex; align-items:center; gap:16px; }
.mapping-hint { margin-bottom:12px; }
.mapping-breakdown { margin-bottom:12px; color:var(--el-text-color-regular); line-height:1.5; }
</style>
