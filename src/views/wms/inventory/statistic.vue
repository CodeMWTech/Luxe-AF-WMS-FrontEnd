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
                <el-radio-button label="warehouse">{{ tr('仓库') }}</el-radio-button>
                <el-radio-button label="item">{{ tr('商品') }}</el-radio-button>
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
              <el-input v-model="queryParams.itemName" clearable :placeholder="tr('商品名称')"></el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('SKU编号')" prop="skuCode">
              <el-input v-model="queryParams.skuCode" clearable :placeholder="tr('SKU编号')"></el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
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
            <template #default="{ row }">{{ getItemName(row) }}</template>
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
              {{ getSkuCode(row) }}
            </template>
          </el-table-column>
        </template>

        <!-- ========== 商品维度列 ========== -->
        <template v-else>
          <el-table-column :label="tr('商品名称')" prop="itemGroupKey" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">{{ getItemName(row) }}</template>
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
              {{ getSkuCode(row) }}
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
  </div>
</template>

<script setup name="Inventory">
import {
  exportInventoryBoardItem,
  listInventoryBoard,
  listInventoryBoardWarehouseSummary
} from '@/api/wms/inventory'
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { getRowspanMethod } from '@/utils/getRowSpanMethod'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { blobValidate } from '@/utils/ruoyi'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const spanMethod = computed(() => getRowspanMethod(inventoryList.value, rowSpanArray.value))

const inventoryList = ref([])
const loading = ref(true)
const exportLoading = ref(false)
const total = ref(0)
const tableRef = ref(null)
const rowSpanArray = ref(['warehouseGroupKey', 'warehouseItemGroupKey'])
const warehouseSummaryMap = ref(new Map())

const filterable = ref(false)
const queryType = ref('warehouse')
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  skuId: undefined,
  warehouseId: undefined,
  itemName: undefined,
  skuCode: undefined,
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
