<template>
  <div class="app-container inventory-unstocked-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form
        :model="queryParams"
        ref="queryRef"
        :label-width="formLabelWidth"
        class="unstocked-query-form mt12"
        @submit.prevent="handleQuery"
      >
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item prop="itemName">
              <template #label>
                <span class="label-with-tip">
                  {{ tr('商品名称') }}
                  <el-tooltip :content="tr('商品名称模糊匹配')" placement="top">
                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model="queryParams.itemName" clearable :placeholder="tr('请输入商品名称')" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item prop="skuCode">
              <template #label>
                <span class="label-with-tip">
                  {{ tr('SKU编号') }}
                  <el-tooltip :content="tr('SKU编号精确匹配')" placement="top">
                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model="queryParams.skuCode" clearable :placeholder="tr('SKU编码精确匹配')" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品分类')" prop="itemCategory">
              <el-tree-select
                v-model="queryParams.itemCategory"
                :data="itemCategoryTreeSelectList"
                :props="{ value: 'id', label: 'label', children: 'children' }"
                value-key="id"
                :placeholder="tr('请选择')"
                check-strictly
                clearable
                filterable
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品品牌')" prop="itemBrand">
              <el-select v-model="queryParams.itemBrand" clearable filterable style="width: 100%">
                <el-option
                  v-for="item in wmsStore.itemBrandList"
                  :key="item.id"
                  :label="item.brandName"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('成色')" prop="itemCondition">
              <el-select
                v-model="queryParams.itemCondition"
                clearable
                style="width: 100%"
                :placeholder="tr('请选择')"
              >
                <el-option v-for="opt in ITEM_CONDITION_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item prop="itemYear">
              <template #label>
                <span class="label-with-tip">
                  {{ tr('年份') }}
                  <el-tooltip :content="tr('年份精准匹配')" placement="top">
                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="queryParams.itemYear"
                :min="0"
                :max="9999"
                :controls="false"
                style="width: 100%"
                :placeholder="tr('年份')"
                @keyup.enter="handleQuery"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item prop="skuCreateBy">
              <template #label>
                <span class="label-with-tip">
                  {{ tr('创建人') }}
                  <el-tooltip :content="tr('创建人精准匹配')" placement="top">
                    <el-icon class="label-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input v-model="queryParams.skuCreateBy" clearable :placeholder="tr('请输入')" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('鉴定机构')" prop="authAgency">
              <el-select
                v-model="queryParams.authAgency"
                clearable
                filterable
                style="width: 100%"
                :placeholder="tr('请选择')"
              >
                <el-option v-for="opt in AUTH_AGENCY_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="canViewCostPrice || canViewSellingPrice" :gutter="16">
          <el-col v-if="canViewCostPrice" :xs="24" :md="canViewSellingPrice ? 12 : 24">
            <el-form-item :label="tr('成本价')">
              <div class="query-price-range">
                <el-form-item prop="costPriceMin" class="query-price-range-item">
                  <el-input-number
                    v-model="queryParams.costPriceMin"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    :placeholder="tr('最低')"
                    style="width: 100%"
                    @keyup.enter="handleQuery"
                  />
                </el-form-item>
                <span class="query-price-range-separator">{{ tr('至') }}</span>
                <el-form-item prop="costPriceMax" class="query-price-range-item">
                  <el-input-number
                    v-model="queryParams.costPriceMax"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    :placeholder="tr('最高')"
                    style="width: 100%"
                    @keyup.enter="handleQuery"
                  />
                </el-form-item>
              </div>
            </el-form-item>
          </el-col>
          <el-col v-if="canViewSellingPrice" :xs="24" :md="canViewCostPrice ? 12 : 24">
            <el-form-item :label="tr('销售价')">
              <div class="query-price-range">
                <el-form-item prop="sellingPriceMin" class="query-price-range-item">
                  <el-input-number
                    v-model="queryParams.sellingPriceMin"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    :placeholder="tr('最低')"
                    style="width: 100%"
                    @keyup.enter="handleQuery"
                  />
                </el-form-item>
                <span class="query-price-range-separator">{{ tr('至') }}</span>
                <el-form-item prop="sellingPriceMax" class="query-price-range-item">
                  <el-input-number
                    v-model="queryParams.sellingPriceMax"
                    :min="0"
                    :precision="2"
                    :controls="false"
                    :placeholder="tr('最高')"
                    style="width: 100%"
                    @keyup.enter="handleQuery"
                  />
                </el-form-item>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('已护理')" prop="cared">
              <el-switch
                v-model="queryParams.cared"
                active-text="Yes"
                inactive-text="No"
                :active-value="true"
                :inactive-value="false"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label=" ">
              <el-button type="primary" icon="Search" class="action-btn" native-type="submit">{{ tr('搜索') }}</el-button>
              <el-button icon="Refresh" class="action-btn" native-type="button" @click="resetQuery">{{ tr('重置') }}</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" type="flex" justify="space-between" align="middle">
        <el-col :span="12">
          <span class="page-title">{{ tr('未入库商品') }}</span>
        </el-col>
        <el-col :span="12" class="stats-col">
          <span class="stats-label">{{ tr('未入库总金额') }}：</span>
          <span class="stats-value">
            {{ totalAmountDisplay }}
          </span>
          <span class="stats-separator">|</span>
          <span class="stats-label">{{ tr('未入库总件数') }}：</span>
          <span class="stats-value">
            {{ totalCountDisplay }}{{ tr('件') }}
          </span>
        </el-col>
      </el-row>
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="list"
        border
        class="mt20 unstocked-table"
        :empty-text="tr('暂无未入库商品')"
        cell-class-name="vertical-top-cell"
        :row-key="rowKey"
        @sort-change="handleSortChange"
      >
        <el-table-column :label="tr('商品名称')" prop="itemName" min-width="160" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.itemName) }}</template>
        </el-table-column>
        <el-table-column :label="tr('商品图片')" width="110" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.thumbUrl"
              :src="row.thumbUrl"
              fit="cover"
              class="item-main-image"
              :preview-src-list="[row.thumbUrl]"
              preview-teleported
            >
              <template #error>
                <div class="image-empty">{{ tr('暂无图片') }}</div>
              </template>
            </el-image>
            <div v-else class="image-empty">{{ tr('暂无图片') }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('SKU编号')" prop="skuCode" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.skuCode) }}</template>
        </el-table-column>
        <el-table-column :label="tr('分类')" prop="categoryName" min-width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.categoryName) }}</template>
        </el-table-column>
        <el-table-column :label="tr('品牌')" min-width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.brandName) }}</template>
        </el-table-column>
        <el-table-column :label="tr('成色')" prop="itemCondition" width="88" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.itemCondition" type="info" size="small">{{ row.itemCondition }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="tr('年份')" prop="year" width="80" align="center" sortable="custom">
          <template #default="{ row }">{{ cellNumberOrDash(row.year, 0) }}</template>
        </el-table-column>
        <el-table-column
          v-if="canViewCostPrice"
          :label="tr('成本价')"
          prop="costPrice"
          width="110"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">
            <span v-if="row.costPrice != null && row.costPrice !== ''">{{ formatMoney(row.costPrice) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="canViewSellingPrice"
          :label="tr('销售价')"
          prop="sellingPrice"
          width="110"
          align="center"
          sortable="custom"
        >
          <template #default="{ row }">
            <span v-if="row.sellingPrice != null && row.sellingPrice !== ''">{{ formatMoney(row.sellingPrice) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="tr('材质')" prop="material" min-width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.material) }}</template>
        </el-table-column>
        <el-table-column :label="tr('缺陷')" prop="defect" min-width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.defect) }}</template>
        </el-table-column>
        <el-table-column :label="tr('配件')" prop="accessories" min-width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.accessories) }}</template>
        </el-table-column>
        <el-table-column :label="tr('护理')" prop="cared" width="88" align="center">
          <template #default="{ row }">{{ formatCared(row.cared) }}</template>
        </el-table-column>
        <el-table-column :label="tr('鉴定机构')" prop="authAgency" min-width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.authAgency) }}</template>
        </el-table-column>
        <el-table-column :label="tr('寄售信息')" prop="consignInfo" min-width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.consignInfo) }}</template>
        </el-table-column>
        <el-table-column :label="tr('默认数量')" prop="defaultQty" width="100" align="center">
          <template #default="{ row }">{{ cellNumberOrDash(row.defaultQty, 0) }}</template>
        </el-table-column>
        <el-table-column :label="tr('备注')" prop="remark" min-width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.remark) }}</template>
        </el-table-column>
        <el-table-column :label="tr('创建人')" prop="createBy" width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ cellText(row.createBy) }}</template>
        </el-table-column>
        <el-table-column :label="tr('创建时间')" prop="createTime" width="168" align="center" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.createTime">{{ formatTime(row.createTime) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="tr('状态')" width="108" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.neverInbound" type="warning" size="small">{{ tr('未入库') }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="tr('操作')" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goReceipt">{{ tr('去入库') }}</el-button>
            <el-button link type="primary" @click="goItem(row)">{{ tr('商品管理') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-row>
        <pagination
          v-show="total > 0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />
      </el-row>
    </el-card>
  </div>
</template>

<script setup name="UnstockedSkus">
import { QuestionFilled } from '@element-plus/icons-vue'
import { getUnstockedSkusTotalAmount, getUnstockedSkusTotalCount, listUnstockedSkus } from '@/api/wms/inventory'
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const ITEM_CONDITION_OPTIONS = ['S', 'A', 'B', 'C', 'D']
const AUTH_AGENCY_OPTIONS = ['Entrupy', 'Real Authentication', 'Legitmark', 'CheckCheck', 'N/A']

const { proxy } = getCurrentInstance()
const router = useRouter()
const wmsStore = useWmsStore()
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => (isEn.value ? '128px' : '96px'))

const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))

const itemCategoryTreeSelectList = computed(() => wmsStore.itemCategoryTreeList)

const list = ref([])
const loading = ref(true)
const total = ref(0)
const totalAmount = ref(null)
const totalCount = ref(0)
const tableRef = ref(null)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  itemName: undefined,
  skuCode: undefined,
  itemCategory: undefined,
  itemBrand: undefined,
  itemCondition: undefined,
  itemYear: undefined,
  costPriceMin: undefined,
  costPriceMax: undefined,
  sellingPriceMin: undefined,
  sellingPriceMax: undefined,
  skuCreateBy: undefined,
  authAgency: undefined,
  cared: undefined,
  orderByColumn: undefined,
  isAsc: undefined
})

function rowKey(row) {
  const code = row.skuCode != null ? String(row.skuCode) : ''
  const t = row.createTime != null ? String(row.createTime) : ''
  const n = row.itemName != null ? String(row.itemName) : ''
  return `${code}\0${t}\0${n}`
}

function cellText(v) {
  if (v === null || v === undefined || v === '') return '-'
  return v
}

function cellNumberOrDash(v, precision = 0) {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return precision > 0 ? n.toFixed(precision) : String(n)
}

function formatMoney(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

function formatCared(v) {
  if (v === true) return tr('已护理')
  if (v === false) return tr('未护理')
  return '-'
}

function formatTime(t) {
  return proxy.parseTime(t)
}

function numParam(v) {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function buildRequestQuery() {
  const p = queryParams.value
  const q = {
    pageNum: p.pageNum,
    pageSize: p.pageSize
  }
  if (p.orderByColumn) q.orderByColumn = p.orderByColumn
  if (p.isAsc === 'ascending') q.isAsc = 'asc'
  else if (p.isAsc === 'descending') q.isAsc = 'desc'
  else if (p.isAsc) q.isAsc = p.isAsc

  if (p.itemName != null && String(p.itemName).trim() !== '') q.itemName = String(p.itemName).trim()
  if (p.skuCode != null && String(p.skuCode).trim() !== '') q.skuCode = String(p.skuCode).trim()
  if (p.itemCategory != null && p.itemCategory !== '') q.itemCategory = String(p.itemCategory)
  if (p.itemBrand != null && p.itemBrand !== '') q.itemBrand = p.itemBrand
  if (p.itemCondition) q.itemCondition = p.itemCondition

  const y = numParam(p.itemYear)
  if (y !== undefined) q.itemYear = y

  if (canViewCostPrice.value) {
    const cmin = numParam(p.costPriceMin)
    const cmax = numParam(p.costPriceMax)
    if (cmin !== undefined) q.costPriceMin = cmin
    if (cmax !== undefined) q.costPriceMax = cmax
  }
  if (canViewSellingPrice.value) {
    const smin = numParam(p.sellingPriceMin)
    const smax = numParam(p.sellingPriceMax)
    if (smin !== undefined) q.sellingPriceMin = smin
    if (smax !== undefined) q.sellingPriceMax = smax
  }

  if (p.skuCreateBy != null && String(p.skuCreateBy).trim() !== '') {
    q.skuCreateBy = String(p.skuCreateBy).trim()
  }
  if (p.authAgency) q.authAgency = p.authAgency
  if (typeof p.cared === 'boolean') q.cared = p.cared

  return q
}

function buildAmountRequestQuery() {
  const q = buildRequestQuery()
  delete q.pageNum
  delete q.pageSize
  return q
}

const totalAmountDisplay = computed(() => {
  if (totalAmount.value === null || totalAmount.value === undefined || totalAmount.value === '') return '--'
  return formatMoney(totalAmount.value)
})

const totalCountDisplay = computed(() => {
  const n = Number(totalCount.value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.trunc(n))
})

function getList() {
  loading.value = true
  listUnstockedSkus(buildRequestQuery())
    .then((response) => {
      list.value = response.rows || []
      total.value = response.total ?? 0
      loading.value = false
    })
    .catch(() => {
      loading.value = false
    })
}

function getTotalAmount(showError = true) {
  getUnstockedSkusTotalAmount(buildAmountRequestQuery())
    .then((res) => {
      totalAmount.value = res?.data
    })
    .catch(() => {
      totalAmount.value = null
      if (showError) {
        proxy?.$modal?.msgWarning(tr('未入库总金额获取失败'))
      }
    })
}

function getTotalCount() {
  getUnstockedSkusTotalCount(buildAmountRequestQuery())
    .then((res) => {
      const n = Number(res?.data)
      totalCount.value = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
    })
    .catch(() => {
      totalCount.value = 0
    })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
  getTotalAmount()
  getTotalCount()
}

function resetQuery() {
  queryParams.value.orderByColumn = undefined
  queryParams.value.isAsc = undefined
  proxy.resetForm('queryRef')
  tableRef.value?.clearSort?.()
  handleQuery()
}

function handleSortChange({ prop, order }) {
  queryParams.value.orderByColumn = prop
  queryParams.value.isAsc = order || undefined
  queryParams.value.pageNum = 1
  getList()
}

function goReceipt() {
  router.push({ name: 'ReceiptOrder' }).catch(() => {})
}

function goItem(row) {
  const q = row?.skuCode ? { skuCode: row.skuCode } : {}
  router.push({ name: 'Item', query: q }).catch(() => {})
}

function initLookupOptions() {
  const tasks = []
  if (!wmsStore.itemBrandList.length) {
    tasks.push(wmsStore.getItemBrandList())
  }
  if (!wmsStore.itemCategoryList.length) {
    tasks.push(wmsStore.getItemCategoryList())
  }
  if (!wmsStore.itemCategoryTreeList.length) {
    tasks.push(wmsStore.getItemCategoryTreeList())
  }
  if (tasks.length) {
    Promise.allSettled(tasks)
  }
}

onMounted(() => {
  initLookupOptions()
  getList()
  getTotalAmount(false)
  getTotalCount()
})
</script>

<style scoped lang="scss">
.page-title {
  font-size: large;
}

.mt12 {
  margin-top: 12px;
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.label-tip-icon {
  font-size: 14px;
  color: var(--el-color-info);
  cursor: help;
  vertical-align: middle;
}

.unstocked-query-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.query-price-range {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.query-price-range :deep(.el-input-number) {
  width: 100%;
}

.query-price-range-item {
  flex: 1;
}

.query-price-range :deep(.query-price-range-item.el-form-item) {
  margin-bottom: 0;
}

.query-price-range :deep(.query-price-range-item .el-form-item__content) {
  display: flex;
  align-items: center;
  width: 100%;
}

.query-price-range-separator {
  display: inline-flex;
  align-items: center;
  color: var(--el-text-color-regular, #606266);
  flex-shrink: 0;
  line-height: 1;
}

.inventory-unstocked-page .action-btn {
  min-width: 96px;
}

.inventory-unstocked-page.is-en .action-btn {
  min-width: 110px;
}

.inventory-unstocked-page .el-table .vertical-top-cell {
  vertical-align: top;
}

.unstocked-table {
  width: 100%;
}

.stats-col {
  text-align: right;
}

.stats-label {
  color: var(--el-text-color-regular, #606266);
}

.stats-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.stats-separator {
  margin: 0 12px;
  color: var(--el-border-color-darker, #d4d7de);
}

.item-main-image {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  display: inline-block;
}

.image-empty {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}
</style>
