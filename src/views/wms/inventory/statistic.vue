<template>
  <div class="app-container inventory-statistic-page">
    <el-card>
      <el-form
        :model="queryParams"
        ref="queryRef"
        label-width="90px"
        class="statistic-query-form mt12"
        @submit.prevent="handleQuery"
      >
        <!-- 维度切换单独占一行 -->
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item :label="tr('维度')" prop="itemId">
              <el-radio-group v-model="queryType" size="default" @change="handleSortTypeChange">
                <el-radio-button label="item">{{ tr('商品') }}</el-radio-button>
                <el-radio-button label="warehouse">{{ tr('仓库') }}</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('仓库')" prop="warehouseId">
              <el-select style="width: 100%" v-model="queryParams.warehouseId" :placeholder="tr('请选择仓库')"
                         filterable clearable>
                <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName"
                           :value="item.id"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品名称')" prop="itemName">
              <el-input v-model="queryParams.itemName" clearable :placeholder="tr('商品名称')" @keyup.enter="handleQuery"></el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('SKU编号')" prop="skuCode">
              <el-input v-model="queryParams.skuCode" clearable :placeholder="tr('SKU编号')" @keyup.enter="handleQuery"></el-input>
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
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品品牌')" prop="itemBrand">
              <el-select v-model="queryParams.itemBrand" clearable filterable style="width: 100%">
                <el-option
                  v-for="item in useWmsStore().itemBrandList"
                  :key="item.id"
                  :label="item.brandName"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('成色')" prop="itemCondition">
              <el-select v-model="queryParams.itemCondition" clearable style="width: 100%" :placeholder="tr('请选择')">
                <el-option v-for="opt in ITEM_CONDITION_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('年份')" prop="year">
              <el-input-number v-model="queryParams.year" :min="0" :max="9999" :controls="false" style="width: 100%" @keyup.enter="handleQuery" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('鉴定机构')" prop="authAgency">
              <el-select v-model="queryParams.authAgency" clearable style="width: 100%" :placeholder="tr('请选择')">
                <el-option v-for="opt in AUTH_AGENCY_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('数量')" prop="defaultQty">
              <el-input-number v-model="queryParams.defaultQty" :min="0" :controls="false" style="width: 100%" @keyup.enter="handleQuery" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('已护理')" prop="cared">
              <el-switch v-model="queryParams.cared" active-text="Yes" inactive-text="No" :active-value="true" :inactive-value="false" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item :label="tr('寄售信息')" prop="consignInfo">
              <el-input v-model="queryParams.consignInfo" clearable :placeholder="tr('请输入')" @keyup.enter="handleQuery" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item :label="tr('创建时间')" prop="createTimeRange">
              <el-date-picker
                v-model="queryParams.createTimeRange"
                type="datetimerange"
                :range-separator="tr('至')"
                format="MM/DD/YYYY HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                :default-time="defaultTime"
                :start-placeholder="tr('开始时间')"
                :end-placeholder="tr('结束时间')"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" v-if="canViewSellingPrice">
            <el-form-item :label="tr('销售价')">
              <div class="query-price-range">
                <el-form-item prop="sellingPriceMin" class="query-price-range-item">
                  <el-input-number v-model="queryParams.sellingPriceMin" :min="0" :precision="2" :controls="false" :placeholder="tr('最低')" style="width: 100%" @keyup.enter="handleQuery" />
                </el-form-item>
                <span class="query-price-range-separator">{{ tr('至') }}</span>
                <el-form-item prop="sellingPriceMax" class="query-price-range-item">
                  <el-input-number v-model="queryParams.sellingPriceMax" :min="0" :precision="2" :controls="false" :placeholder="tr('最高')" style="width: 100%" @keyup.enter="handleQuery" />
                </el-form-item>
              </div>
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
      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="12">
          <span class="page-title">{{ tr('库存统计') }}</span>
        </el-col>
        <el-col :span="12" class="toolbar-right">
          <el-checkbox v-model="filterable" :label="tr('过滤掉库存为0的商品')" size="large" @change="handleChangeFilterZero"/>
          <el-button
            type="primary"
            :loading="exportLoading"
            :disabled="loading"
            @click="handleExportExcel"
          >
            {{ tr('导出Excel') }}
          </el-button>
        </el-col>
      </el-row>

      <el-table
        ref="tableRef"
        :data="inventoryList"
        border
        :span-method="spanMethod"
        cell-class-name="vertical-top-cell"
        v-loading="loading"
        :empty-text="tr('暂无库存')"
        class="statistic-table"
        @sort-change="handleColumnSortChange"
      >
        <el-table-column :label="tr('操作')" width="110" align="center" fixed="left">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              icon="View"
              :disabled="!row.skuId"
              @click="openDetailDrawer(row)"
            >
              {{ tr('详细信息') }}
            </el-button>
          </template>
        </el-table-column>

        <!-- ========== 仓库维度列 ========== -->
        <template v-if="queryType === 'warehouse'">
          <el-table-column :label="tr('仓库')" prop="warehouseGroupKey" min-width="240" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <div>{{ getWarehouseName(row) }}</div>
              <div>{{ tr('仓库商品总数') }}：{{ getWarehouseSummaryQuantity(row) }}</div>
              <div>{{ tr('仓库商品总价') }}：{{ formatMoney(getWarehouseSummaryAmount(row)) }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="tr('商品名称')" prop="warehouseItemGroupKey" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getItemName(row) }}</span>
                <el-button
                  v-if="canCopyText(getItemName(row))"
                  v-copyText="getItemName(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="tr('商品图片')" width="110" align="center">
            <template #default="{ row }">
              <el-image
                v-if="getItemImage(row)"
                :src="getItemImage(row)"
                fit="cover"
                class="item-main-image"
                :preview-src-list="[getItemImage(row)]"
                preview-teleported
              >
                <template #error>
                  <div class="image-empty">{{ tr('暂无图片') }}</div>
                </template>
              </el-image>
              <div v-else class="image-empty">{{ tr('暂无图片') }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="tr('SKU编号')" prop="skuCode" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getSkuCode(row) }}</span>
                <el-button
                  v-if="canCopyText(getSkuCode(row))"
                  v-copyText="getSkuCode(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
        </template>

        <!-- ========== 商品维度列 ========== -->
        <template v-else>
          <el-table-column :label="tr('商品名称')" prop="itemGroupKey" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getItemName(row) }}</span>
                <el-button
                  v-if="canCopyText(getItemName(row))"
                  v-copyText="getItemName(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="tr('商品图片')" width="110" align="center">
            <template #default="{ row }">
              <el-image
                v-if="getItemImage(row)"
                :src="getItemImage(row)"
                fit="cover"
                class="item-main-image"
                :preview-src-list="[getItemImage(row)]"
                preview-teleported
              >
                <template #error>
                  <div class="image-empty">{{ tr('暂无图片') }}</div>
                </template>
              </el-image>
              <div v-else class="image-empty">{{ tr('暂无图片') }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="tr('SKU编号')" prop="skuGroupKey" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getSkuCode(row) }}</span>
                <el-button
                  v-if="canCopyText(getSkuCode(row))"
                  v-copyText="getSkuCode(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="tr('仓库')" prop="skuWarehouseGroupKey" min-width="80" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              {{ getWarehouseName(row) }}
            </template>
          </el-table-column>
        </template>

        <!-- ========== 库存数量 ========== -->
        <el-table-column :label="tr('库存数量')" prop="quantity" width="90" align="center">
          <template #default="{ row }">
            {{ Number(row.quantity) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：入库时间 ========== -->
        <el-table-column :label="tr('入库时间')" prop="receiptTime" width="168" align="center" sortable="custom">
          <template #default="{ row }">
            {{ formatTime(row.receiptTime) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：出库时间 ========== -->
        <el-table-column :label="tr('出库时间')" prop="shipmentTime" width="168" align="center" sortable="custom">
          <template #default="{ row }">
            <!-- 有出库历史但库存未清零时 shipmentTime 为 null，属于业务规则，显示 -- -->
            {{ formatTime(row.shipmentTime) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：周转天数 ========== -->
        <el-table-column :label="tr('周转天数')" prop="turnoverDays" width="125" align="center" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.turnoverDays != null">{{ row.turnoverDays }}</span>
            <span v-else>--</span>
          </template>
        </el-table-column>

        <!-- ========== 新增列：平均成本价 ========== -->
        <el-table-column :label="tr('平均成本价')" prop="avgReceiptCost" width="135" align="center" sortable="custom">
          <template #default="{ row }">
            {{ formatMoney(row.avgReceiptCost) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：平均销售价 ========== -->
        <el-table-column :label="tr('平均销售价')" prop="avgShipmentPrice" width="135" align="center" sortable="custom">
          <template #default="{ row }">
            <!-- 有出库历史但库存未清零时 avgShipmentPrice 正常显示；无出库时为 null，显示 -- -->
            {{ formatMoney(row.avgShipmentPrice) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：利润 ========== -->
        <el-table-column :label="tr('利润')" prop="totalProfit" width="110" align="center" sortable="custom">
          <template #default="{ row }">
            <!--
              totalProfit 语义：
              - 无出库时后端返回 0，显示 0.00
              - 有出库时显示历史累计利润
              - null 显示 --（兜底）
            -->
            {{ formatProfit(row.totalProfit) }}
          </template>
        </el-table-column>
      </el-table>

      <el-row>
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
                    v-model:limit="queryParams.pageSize" @pagination="getList"/>
      </el-row>
    </el-card>

    <el-drawer
      v-model="detailDrawer.visible"
      size="60%"
      append-to-body
      class="inventory-detail-drawer"
    >
      <template #header>
        <div class="detail-drawer-header">
          <span>{{ tr('商品详细信息') }}</span>
          <el-button
            type="primary"
            plain
            icon="Download"
            :disabled="!detailItem && !detailSku"
            @click="exportDetailPdf"
          >
            {{ tr('导出为PDF') }}
          </el-button>
        </div>
      </template>
      <div v-loading="detailDrawer.loading" class="detail-drawer-body">
        <template v-if="detailItem || detailSku">
          <div class="detail-header">
            <div>
              <h2 class="detail-title">{{ displayValue(detailItem?.itemName) }}</h2>
              <div class="detail-subtitle">
                <span>SKU {{ displayValue(detailSku?.skuCode) }}</span>
                <span v-if="getBrandName(detailItem)">·</span>
                <span v-if="getBrandName(detailItem)">{{ getBrandName(detailItem) }}</span>
              </div>
            </div>
            <div class="condition-mark">
              <span>{{ tr('成色') }}</span>
              <strong>{{ displayValue(detailItem?.itemCondition) }}</strong>
            </div>
          </div>

          <div class="detail-field-grid">
            <div
              v-for="field in detailFieldList"
              :key="field.label"
              class="detail-field"
              :class="{ 'is-wide': field.wide }"
            >
              <div class="detail-field-label">{{ field.label }}</div>
              <div class="detail-field-value">
                <div v-if="field.type === 'accessories' && accessoryList.length" class="accessory-list">
                  <el-tag v-for="tag in accessoryList" :key="tag" type="info" effect="plain">{{ tag }}</el-tag>
                </div>
                <span v-else>{{ field.value }}</span>
              </div>
            </div>
          </div>

          <div class="detail-image-section">
            <div class="detail-section-title">{{ tr('商品图片') }} ({{ detailImages.length }})</div>
            <div v-if="detailImages.length" class="detail-image-list">
              <div v-for="(img, idx) in detailImages" :key="img.id || idx" class="detail-image-card">
                <el-image
                  :src="img.thumbUrl || img.url"
                  :preview-src-list="detailImagePreviewList"
                  :initial-index="idx"
                  preview-teleported
                  fit="cover"
                  class="detail-image"
                />
                <el-button
                  class="detail-image-download"
                  type="primary"
                  icon="Download"
                  circle
                  :title="tr('下载')"
                  @click.stop="downloadDetailImage(img, idx)"
                />
              </div>
            </div>
            <div v-else class="detail-empty">{{ tr('暂无图片') }}</div>
          </div>
        </template>
        <el-empty v-else :description="tr('暂无数据')" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="Inventory">
import {
  exportInventoryBoardItem,
  listInventoryBoard,
  listInventoryBoardWarehouseSummary
} from '@/api/wms/inventory'
import { downloadItemImage, getItemImages } from '@/api/wms/item'
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { getRowspanMethod } from '@/utils/getRowSpanMethod'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { blobValidate } from '@/utils/ruoyi'
import { formatDateTimeForQuery } from '@/utils/laTime'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const spanMethod = computed(() => getRowspanMethod(inventoryList.value, rowSpanArray.value))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))
const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const itemCategoryTreeSelectList = computed(() => useWmsStore().itemCategoryTreeList)
const AUTH_AGENCY_OPTIONS = ['Entrupy', 'Real Authentication', 'Legitmark', 'CheckCheck', 'N/A']
const ITEM_CONDITION_OPTIONS = ['S', 'A', 'B', 'C', 'D']
const defaultTime = [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]

const inventoryList = ref([])
const loading = ref(true)
const exportLoading = ref(false)
const total = ref(0)
const tableRef = ref(null)
const rowSpanArray = ref(['itemGroupKey', 'skuGroupKey', 'skuWarehouseGroupKey'])
const warehouseSummaryMap = ref(new Map())
const detailDrawer = ref({
  visible: false,
  loading: false,
  data: null
})
const detailItem = computed(() => detailDrawer.value.data?.item || null)
const detailSku = computed(() => detailDrawer.value.data?.itemSku || null)
const detailImages = computed(() => detailItem.value?.images || detailItem.value?.imageList || [])
const detailImagePreviewList = computed(() => detailImages.value.map(img => img.url || img.thumbUrl).filter(Boolean))
const accessoryList = computed(() => splitTextList(detailItem.value?.accessories))
const detailFieldList = computed(() => {
  const item = detailItem.value || {}
  const sku = detailSku.value || {}
  const fields = [
    { label: tr('商品分类'), value: displayValue(getCategoryName(item)) },
    { label: tr('商品品牌'), value: displayValue(getBrandName(item)) },
    { label: tr('年份'), value: displayValue(item.year) },
    { label: tr('成色'), value: displayValue(item.itemCondition) },
    { label: tr('包型'), value: displayValue(item.modelName) },
    { label: tr('材质'), value: displayValue(item.materialName || item.material) }
  ]
  if (canViewCostPrice.value) {
    fields.push({ label: tr('成本价'), value: formatMoney(sku.costPrice) })
  }
  if (canViewSellingPrice.value) {
    fields.push({ label: tr('销售价'), value: formatMoney(sku.sellingPrice) })
  }
  fields.push(
    { label: tr('数量'), value: displayValue(item.defaultQty) },
    { label: tr('是否已护理'), value: formatCared(item.cared) },
    { label: tr('鉴定机构'), value: displayValue(item.authAgency) },
    { label: tr('寄售信息'), value: displayValue(item.consignInfo) },
    { label: tr('瑕疵'), value: displayValue(item.defect), wide: true },
    { label: tr('配件'), value: accessoryList.value.length ? '' : '--', type: 'accessories', wide: true },
    { label: tr('备注'), value: displayValue(item.remark), wide: true }
  )
  return fields
})

const filterable = ref(false)
const queryType = ref('item')
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  skuId: undefined,
  warehouseId: undefined,
  itemName: undefined,
  skuCode: undefined,
  itemCategory: undefined,
  itemBrand: undefined,
  itemCondition: undefined,
  year: undefined,
  cared: undefined,
  defaultQty: undefined,
  authAgency: undefined,
  consignInfo: undefined,
  createTimeRange: [],
  sellingPriceMin: undefined,
  sellingPriceMax: undefined,
  minQuantity: undefined,
  orderByColumn: undefined,
  isAsc: undefined
})

// ───────────── 格式化工具函数 ─────────────

/**
 * 金额格式化：null/undefined → '--'，否则保留两位小数
 */
function formatMoney(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return n.toFixed(2)
}

function displayValue(value) {
  return value === null || value === undefined || value === '' ? '--' : value
}

function splitTextList(value) {
  if (!value) return []
  return String(value)
    .split(/[,，、\n]/)
    .map(it => it.trim())
    .filter(Boolean)
}

function formatCared(value) {
  if (value === null || value === undefined) return '--'
  return value ? 'Cared' : 'Not Cared'
}

function safeFileName(value, fallback = 'file') {
  const name = String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return name || fallback
}

function getImageUrl(img) {
  return img?.url || img?.thumbUrl || ''
}

async function downloadDetailImage(img, index) {
  const baseName = safeFileName(`${detailSku.value?.skuCode || detailItem.value?.itemName || 'item'}-${index + 1}`, 'item-image')
  const imageId = img?.imageId || img?.id
  if (imageId) {
    try {
      const blobData = await downloadItemImage(imageId)
      const isBlob = blobValidate(blobData)
      if (!isBlob) {
        const resText = await blobData.text()
        const rspObj = JSON.parse(resText)
        throw new Error(rspObj?.msg || tr('下载失败'))
      }
      const blob = new Blob([blobData], { type: blobData.type || 'application/octet-stream' })
      const headerName = blobData?.headers?.['download-filename']
      triggerDownload(window.URL.createObjectURL(blob), headerName ? decodeURIComponent(headerName) : `${baseName}.jpg`)
      return
    } catch (e) {
      proxy.$modal.msgError(e?.message || tr('下载失败'))
      return
    }
  }
  const url = getImageUrl(img)
  if (!url) return
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('download failed')
    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const suffix = blob.type?.includes('png') ? 'png' : blob.type?.includes('webp') ? 'webp' : 'jpg'
    triggerDownload(objectUrl, `${baseName}.${suffix}`)
    window.URL.revokeObjectURL(objectUrl)
  } catch (e) {
    triggerDownload(url, `${baseName}.jpg`)
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function exportDetailPdf() {
  const item = detailItem.value || {}
  const sku = detailSku.value || {}
  const title = displayValue(item.itemName)
  const rows = detailFieldList.value.map(field => {
    const value = field.type === 'accessories' && accessoryList.value.length
      ? accessoryList.value.join(', ')
      : field.value
    return `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(value)}</td></tr>`
  }).join('')
  const images = detailImages.value
    .map((img, idx) => {
      const url = getImageUrl(img)
      if (!url) return ''
      return `<figure><img src="${escapeHtml(url)}" alt="image-${idx + 1}" /><figcaption>${escapeHtml(tr('商品图片'))} ${idx + 1}</figcaption></figure>`
    })
    .join('')
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    proxy.$modal.msgError(tr('导出失败'))
    return
  }
  printWindow.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeFileName(`${sku.skuCode || ''}-${item.itemName || '商品详情'}`, '商品详情'))}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; font-family: Arial, "Microsoft YaHei", sans-serif; color: #1f2329; }
    h1 { margin: 0 0 8px; font-size: 26px; line-height: 1.3; }
    .subtitle { margin-bottom: 22px; color: #667085; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0 24px; }
    th, td { border: 1px solid #dfe3eb; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { width: 170px; background: #f5f7fa; color: #4b5563; }
    .images { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    figure { margin: 0; break-inside: avoid; }
    img { width: 100%; max-height: 360px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 6px; }
    figcaption { margin-top: 6px; color: #667085; font-size: 12px; }
    @media print { body { padding: 18mm; } .images { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">SKU ${escapeHtml(displayValue(sku.skuCode))}${getBrandName(item) ? ' · ' + escapeHtml(getBrandName(item)) : ''}</div>
  <table>${rows}</table>
  <h2>${escapeHtml(tr('商品图片'))} (${detailImages.value.length})</h2>
  <div class="images">${images || escapeHtml(tr('暂无图片'))}</div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 300);
    };
  <\/script>
</body>
</html>
  `)
  printWindow.document.close()
}

function getBrandName(item) {
  if (item?.brandName) return item.brandName
  if (!item?.itemBrand) return ''
  return useWmsStore().itemBrandMap.get(item.itemBrand)?.brandName || ''
}

function getCategoryName(item) {
  if (item?.categoryName) return item.categoryName
  if (item?.itemCategoryInfo?.categoryName) return item.itemCategoryInfo.categoryName
  if (!item?.itemCategory) return ''
  const key = Number(item.itemCategory)
  return useWmsStore().itemCategoryMap.get(key)?.categoryName || ''
}

/**
 * 利润格式化：null → '--'，0 → '0.00'，其余保留两位小数
 * totalProfit 无出库时后端返回 0，不应显示 '--'
 */
function formatProfit(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return n.toFixed(2)
}

/**
 * 从汇总接口结果构建 Map：优先按 warehouseId 索引，并辅以 warehouseName 便于兜底对齐
 */
function buildWarehouseSummaryMap(items = []) {
  const map = new Map()
  for (const it of items) {
    const quantity = Number(it.totalQuantity) || 0
    const amt = Number(it.totalAmount)
    const amount = Number.isFinite(amt) ? amt : 0
    const entry = { quantity, amount }
    if (it.warehouseId != null && it.warehouseId !== '') {
      map.set(String(it.warehouseId), entry)
    }
    if (it.warehouseName) {
      map.set(String(it.warehouseName), entry)
    }
  }
  return map
}

function getWarehouseSummaryEntry(row) {
  if (row?.warehouseId != null && row.warehouseId !== '') {
    const byId = warehouseSummaryMap.value.get(String(row.warehouseId))
    if (byId) return byId
  }
  const name = String(row?.warehouseName ?? '')
  if (name) {
    return warehouseSummaryMap.value.get(name)
  }
  return undefined
}

/**
 * 获取仓库聚合后的总数量（后端汇总接口）
 */
function getWarehouseSummaryQuantity(row) {
  return getWarehouseSummaryEntry(row)?.quantity ?? 0
}

/**
 * 获取仓库聚合后的总价（后端汇总接口）
 */
function getWarehouseSummaryAmount(row) {
  return getWarehouseSummaryEntry(row)?.amount ?? 0
}

function getWarehouseGroupKey(row) {
  if (row?.warehouseId != null && row.warehouseId !== '') {
    return String(row.warehouseId)
  }
  return String(row?.warehouseName ?? '')
}

function getWarehouseName(row) {
  return row?.warehouseName || '-'
}

function getItemName(row) {
  return row?.itemName || '-'
}

function getItemImage(row) {
  return row?.itemImage || ''
}

function getSkuCode(row) {
  return row?.skuCode || '-'
}

function canCopyText(value) {
  return value !== undefined && value !== null && value !== ''
}

function copyTextSuccess() {
  proxy.$modal.msgSuccess(tr('复制成功'))
}

/**
 * 时间格式化：null/undefined → '--'，否则格式化为 yyyy-MM-dd HH:mm:ss
 * shipmentTime 为 null 可能是"有出库历史但库存未清零"的业务规则，统一显示 '--'
 */
function formatTime(t) {
  if (t === null || t === undefined) return '--'
  const result = proxy.parseTime(t)
  return result || '--'
}

// ───────────── 数据获取 ─────────────

const getCurrentQuery = () => {
  const query = { ...queryParams.value }
  if (!canViewSellingPrice.value) {
    delete query.sellingPriceMin
    delete query.sellingPriceMax
  }
  if (query.createTimeRange && query.createTimeRange.length === 2) {
    query.startTime = formatDateTimeForQuery(query.createTimeRange[0])
    query.endTime = formatDateTimeForQuery(query.createTimeRange[1])
  }
  delete query.createTimeRange
  if (filterable.value) {
    query.minQuantity = 1
  } else {
    query.minQuantity = undefined
  }
  return query
}

/** 与列表筛选项一致，不传分页、排序（汇总无分页） */
const getWarehouseSummaryQuery = () => {
  const full = getCurrentQuery()
  const { pageNum, pageSize, orderByColumn, isAsc, ...rest } = full
  return rest
}

const buildDetailDataFromRow = (row, images) => ({
  item: {
    id: row.itemId,
    itemName: row.itemName,
    itemCategory: row.itemCategory,
    categoryName: row.categoryName,
    itemBrand: row.itemBrand,
    brandName: row.brandName,
    itemCondition: row.itemCondition,
    year: row.year,
    material: row.material,
    modelName: row.modelName,
    defect: row.defect,
    accessories: row.accessories,
    cared: row.cared,
    authAgency: row.authAgency,
    consignInfo: row.consignInfo,
    defaultQty: row.defaultQty,
    remark: row.itemRemark,
    mainThumbUrl: row.itemImage,
    images: images || (row.itemImage ? [{ url: row.itemImage, thumbUrl: row.itemImage, isMain: true }] : [])
  },
  itemSku: {
    id: row.skuId,
    skuCode: row.skuCode,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice
  }
})

const queryDetailBySku = async (row) => {
  let images
  if (row.itemId) {
    try {
      const imageRes = await getItemImages(row.itemId)
      images = imageRes.data || []
    } catch (e) {
      images = undefined
    }
  }
  return buildDetailDataFromRow(row, images)
}

const openDetailDrawer = async (row) => {
  if (!row?.skuId) return
  detailDrawer.value.visible = true
  detailDrawer.value.loading = true
  detailDrawer.value.data = buildDetailDataFromRow(row)
  try {
    detailDrawer.value.data = await queryDetailBySku(row)
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('获取详情失败'))
  } finally {
    detailDrawer.value.loading = false
  }
}

const getList = async () => {
  const query = getCurrentQuery()
  loading.value = true
  try {
    let res
    if (queryType.value === 'warehouse') {
      const summaryQuery = getWarehouseSummaryQuery()
      const [summaryRsp, listRsp] = await Promise.all([
        listInventoryBoardWarehouseSummary(summaryQuery),
        listInventoryBoard(query, queryType.value)
      ])
      res = listRsp
      const raw = summaryRsp?.data
      const summaryItems = Array.isArray(raw) ? raw : []
      warehouseSummaryMap.value = buildWarehouseSummaryMap(summaryItems)
    } else {
      warehouseSummaryMap.value = new Map()
      res = await listInventoryBoard(query, queryType.value)
    }
    let rows = res.rows || []
    if (filterable.value) {
      rows = rows.filter(it => Number(it.quantity) !== 0)
    }

    rows.forEach(it => {
      const warehouseKey = getWarehouseGroupKey(it)
      const itemKey = String(it.itemName ?? '')
      const skuKey = String(it.skuCode ?? '')

      it.warehouseGroupKey = warehouseKey
      it.itemGroupKey = itemKey
      it.skuGroupKey = skuKey
      it.warehouseItemGroupKey = `${warehouseKey}-${itemKey}`
      it.skuWarehouseGroupKey = `${skuKey}-${warehouseKey}`
    })

    inventoryList.value = rows
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

const handleExportExcel = async () => {
  try {
    exportLoading.value = true
    const blobData = await exportInventoryBoardItem(getCurrentQuery())
    const isBlob = blobValidate(blobData)
    if (!isBlob) {
      const resText = await blobData.text()
      const rspObj = JSON.parse(resText)
      const errMsg = rspObj?.msg || tr('导出失败')
      throw new Error(errMsg)
    }
    const blob = new Blob([blobData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'MichaelStudioWMS-库存统计.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
    proxy.$modal.msgSuccess(tr('导出成功'))
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('导出失败'))
  } finally {
    exportLoading.value = false
  }
}

const handleQuery = () => {
  queryParams.value.pageNum = 1
  getList()
}

const resetQuery = () => {
  queryParams.value.orderByColumn = undefined
  queryParams.value.isAsc = undefined
  proxy.resetForm('queryRef')
  tableRef.value?.clearSort?.()
  handleQuery()
}

const handleColumnSortChange = ({ prop, order }) => {
  queryParams.value.orderByColumn = prop || undefined
  queryParams.value.isAsc = order === 'ascending' ? 'ascending' : order === 'descending' ? 'descending' : undefined
  queryParams.value.pageNum = 1
  getList()
}

const handleSortTypeChange = (e) => {
  if (e === 'warehouse') {
    rowSpanArray.value = ['warehouseGroupKey', 'warehouseItemGroupKey']
  } else if (e === 'item') {
    rowSpanArray.value = ['itemGroupKey', 'skuGroupKey', 'skuWarehouseGroupKey']
  }
  queryParams.value.pageNum = 1
  getList()
}

const handleChangeFilterZero = () => {
  queryParams.value.pageNum = 1
  getList()
}

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

onMounted(() => {
  useWmsStore().getWarehouseList()
  useWmsStore().getItemBrandList()
  useWmsStore().getItemCategoryList()
  useWmsStore().getItemCategoryTreeList()
  getList()
})
</script>

<style scoped lang="scss">
.page-title {
  font-size: large;
}

.mt12 {
  margin-top: 12px;
}

.statistic-query-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.inventory-statistic-page .action-btn {
  min-width: 88px;
}

.query-price-range {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.query-price-range-item {
  flex: 1;
  margin-bottom: 0 !important;
}

.query-price-range-separator {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary, #909399);
}

.toolbar-right {
  text-align: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.statistic-table {
  width: 100%;
}

:deep(.vertical-top-cell) {
  vertical-align: top;
}

.copyable-cell {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.copyable-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copy-btn {
  flex: 0 0 auto;
  padding: 0;
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

.detail-drawer-body {
  min-height: 320px;
}

.detail-drawer-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 36px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.detail-title {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--el-text-color-primary, #303133);
}

.detail-subtitle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--el-text-color-secondary, #909399);
}

.condition-mark {
  min-width: 88px;
  text-align: right;
  color: var(--el-text-color-secondary, #909399);
}

.condition-mark strong {
  display: block;
  margin-top: 4px;
  font-size: 36px;
  line-height: 1;
  color: var(--el-text-color-primary, #303133);
}

.detail-field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-left: 1px solid var(--el-border-color-lighter, #ebeef5);
  margin-bottom: 24px;
}

.detail-field {
  min-width: 0;
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  border-right: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.detail-field.is-wide {
  grid-column: 1 / -1;
}

.detail-field-label {
  padding: 12px 14px;
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular, #606266);
  font-weight: 600;
}

.detail-field-value {
  min-width: 0;
  padding: 12px 14px;
  color: var(--el-text-color-primary, #303133);
  word-break: break-word;
}

.accessory-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-image-section {
  margin-top: 8px;
}

.detail-section-title {
  margin-bottom: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.detail-image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

.detail-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: var(--el-fill-color-light, #f5f7fa);
}

.detail-image-card {
  position: relative;
  min-width: 0;
}

.detail-image-download {
  position: absolute;
  top: 8px;
  right: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.detail-empty {
  min-height: 96px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #909399);
}

</style>
