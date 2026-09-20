<template>
  <div class="app-container movement-order-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :label-width="formLabelWidth" class="filter-form" @submit.prevent>
        <el-form-item class="filter-item filter-item-full" :label="tr('移库状态')" prop="orderStatus" :label-width="isEn ? '170px' : undefined">
          <el-radio-group v-model="queryParams.orderStatus" @change="handleQuery" class="filter-radio-group">
            <el-radio-button
              :key="-2"
              :label="-2"
            >
              {{ tr('全部') }}
            </el-radio-button>
            <el-radio-button
              v-for="item in translatedMovementStatusOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item class="filter-item" :label="tr('移库单号')" prop="orderNo" :label-width="isEn ? '170px' : undefined">
          <el-input
            v-model="queryParams.orderNo"
            :placeholder="tr('请输入移库单号')"
            clearable
            @keyup.enter.prevent="handleQuery"
          />
        </el-form-item>
        <el-form-item class="filter-item" label="SKU" prop="skuCode" :label-width="isEn ? '170px' : undefined">
          <el-input
            v-model="queryParams.skuCode"
            :placeholder="isEn ? 'Please enter SKU' : '请输入SKU编号'"
            clearable
            @keyup.enter.prevent="handleQuery"
          >
          </el-input>
        </el-form-item>
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="activeSkuCode" class="sku-find-floating" :style="skuFindDragStyle" @pointerdown="startSkuFindDrag">
          <span class="sku-find-count">{{ skuFindCountText }}</span>
          <el-button-group>
            <el-button size="small" icon="ArrowUp" :disabled="matchedSkuRowCount <= 1" @click="scrollToPrevMatchedSku" />
            <el-button size="small" icon="ArrowDown" :disabled="matchedSkuRowCount <= 1" @click="scrollToNextMatchedSku" />
          </el-button-group>
    </div>

    <el-card class="mt20">

      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="6"><span style="font-size: large">{{ tr('移库单') }}</span></el-col>
        <el-col :span="1.5">
          <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['wms:movement:edit']"
          >{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="movementOrderList" border class="mt20"
                @expand-change="handleExpandExchange"
                :row-key="getRowKey"
                :expand-row-keys="expandedRowKeys"
                :empty-text="tr('暂无移库单')"
                cell-class-name="vertical-top-cell"
      >
        <el-table-column type="expand">
          <template #default="props">
            <div style="padding: 0 50px 20px 50px">
              <h3>{{ tr('商品明细') }}</h3>
              <el-table :data="props.row.details" v-loading="detailLoading[props.$index]" :empty-text="tr('暂无商品明细')" :row-class-name="getDetailRowClassName">
                <el-table-column :label="tr('商品名称')">
                  <template #default="{ row }">
                    <div>{{ row?.item?.itemName }}</div>
                  </template>
                </el-table-column>
                <el-table-column :label="tr('SKU编号')">
                  <template #default="{ row }">
                    <div :class="{ 'sku-highlight-text': isMatchedSku(row) }">{{ row?.itemSku?.skuCode }}</div>
                  </template>
                </el-table-column>
                <el-table-column :label="tr('数量')" prop="quantity" align="right">
                  <template #default="{ row }">
                    <el-statistic :value="Number(row.quantity)" :precision="0"/>
                  </template>
                </el-table-column>
                <el-table-column :label="tr('金额($USD)')" align="right">
                  <template #default="{ row }">
                    <el-statistic v-if="row.amount || row.amount === 0" :precision="2" :value="Number(row.amount)"/>
                    <div v-else>-</div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('单号')" align="left" prop="orderNo" min-width="180" show-overflow-tooltip/>
        <el-table-column :label="tr('源仓库')" align="left" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().warehouseMap.get(row.sourceWarehouseId)?.warehouseName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('目标仓库')" align="left" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().warehouseMap.get(row.targetWarehouseId)?.warehouseName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('移库状态')" align="center" prop="orderStatus" min-width="90">
          <template #default="{ row }">
            <dict-tag :options="translatedMovementStatusOptions" :value="row.orderStatus" />
          </template>
        </el-table-column>
        <el-table-column :label="tr('总数量/总金额($USD)')" align="left" min-width="170">
          <template #default="{ row }">
            <div class="flex-space-between">
              <span>{{ tr('数量：') }}</span>
              <el-statistic :value="Number(row.totalQuantity)" :precision="0"/>
            </div>
            <div class="flex-space-between" v-if="row.totalAmount || row.totalAmount === 0">
              <span>{{ tr('金额：') }}</span>
              <el-statistic :value="Number(row.totalAmount)" :precision="2"/>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('操作时间')" align="left" width="170">
          <template #default="{ row }">
            <div>{{ tr('创建：') }}{{ parseTime(row.createTime, '{mm}-{dd} {hh}:{ii}') }}</div>
            <div>{{ tr('更新：') }}{{ parseTime(row.updateTime, '{mm}-{dd} {hh}:{ii}') }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('操作人')" align="left">
          <template #default="{ row }">
            <div>{{ row.createBy }}</div>
            <div v-if="row.updateBy">{{ row.updateBy }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('备注')" prop="remark" />
        <el-table-column :label="tr('操作')" align="right" class-name="small-padding fixed-width" width="140">
          <template #default="scope">
            <div>
              <el-popover
                placement="left"
                :title="tr('提示')"
                :width="300"
                trigger="hover"
                :disabled="scope.row.orderStatus === 0"
                :content="getEditDisabledTip(scope.row)"
              >
                <template #reference>
                  <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['wms:movement:edit']" :disabled="[-1, 1].includes(scope.row.orderStatus)">{{ tr('修改') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handleGoDetail(scope.row)" v-hasPermi="['wms:movement:all']">{{ expandedRowKeys.includes(scope.row.id) ? tr('收起') : tr('查看') }}</el-button>
            </div>
            <div class="mt10">
              <el-popover
                placement="left"
                :title="tr('提示')"
                :width="300"
                trigger="hover"
                :disabled="[-1, 0].includes(scope.row.orderStatus)"
                :content="getDeleteDisabledTip(scope.row)"
              >
                <template #reference>
                  <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['wms:movement:edit']" :disabled="scope.row.orderStatus === 1">{{ tr('删除') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handlePrint(scope.row)" v-hasPermi="['wms:movement:all']">{{ tr('打印') }}</el-button>
            </div>
            <div class="mt10">
              <el-button link type="primary" @click="handleExport(scope.row)" v-hasPermi="['wms:movement:all']">{{ tr('导出') }}</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-row>
        <pagination
          v-show="total>0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />
      </el-row>
    </el-card>
  </div>
</template>

<script setup name="MovementOrder">
import {listMovementOrder, delMovementOrder, exportMovementOrder, getMovementOrder} from "@/api/wms/movementOrder";
import {listByMovementOrderId} from "@/api/wms/movementOrderDetail";
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, toRefs} from "vue";
import {useWmsStore} from "../../../../store/modules/wms";
import {ElMessageBox} from "element-plus";
import movementPanel from "@/components/PrintTemplate/movement-panel";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { createProgressLoading } from '@/utils/progressLoading'
import { blobValidate } from '@/utils/ruoyi'
import { downloadXlsx, getExportLanguageHeaders, prepareLanguageXlsx } from '@/utils/xlsxTranslate'
import { useFixedDrag } from '@/utils/useFixedDrag'

const { proxy } = getCurrentInstance();
const { wms_movement_status } = proxy.useDict("wms_movement_status");
const settingsStore = useSettingsStore()
const movementOrderList = ref([]);
const open = ref(false);
const buttonLoading = ref(false);
const loading = ref(true);
const ids = ref([]);
const total = ref(0);
const title = ref("");
// 当前展开集合
const expandedRowKeys = ref([])
// 商品明细table的loading状态集合
const detailLoading = ref([])
const matchedSkuRowCount = ref(0)
const matchedSkuRowIndex = ref(0)
const activeSkuCode = ref('')
const skuFindLoading = ref(false)
const { dragStyle: skuFindDragStyle, startDrag: startSkuFindDrag } = useFixedDrag()
const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: undefined,
    skuCode: undefined,
    orderStatus: -2,
  },
});

const { queryParams } = toRefs(data);
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => '98px')
const translatedMovementStatusOptions = computed(() => (wms_movement_status.value || []).map(it => ({ ...it, label: tr(it.label) })))
const skuFindCountText = computed(() => {
  if (skuFindLoading.value) return isEn.value ? 'Searching...' : '查找中...'
  return matchedSkuRowCount.value ? `${matchedSkuRowIndex.value + 1}/${matchedSkuRowCount.value}` : (isEn.value ? 'No match' : '无匹配')
})
const wmsStore = useWmsStore()

function getMovementOrderStateLabel(row) {
  if (isEn.value) {
    return row.orderStatus === 1 ? 'transferred' : 'voided'
  }
  return row.orderStatus === 1 ? '移库' : '作废'
}

function getEditDisabledTip(row) {
  if (isEn.value) {
    return `Transfer order [${row.orderNo}] has been ${getMovementOrderStateLabel(row)} and cannot be edited.`
  }
  return `移库单【${row.orderNo}】已${getMovementOrderStateLabel(row)}，无法修改！`
}

function getDeleteDisabledTip(row) {
  if (isEn.value) {
    return `Transfer order [${row.orderNo}] has been transferred and cannot be deleted.`
  }
  return `移库单【${row.orderNo}】已移库，无法删除！`
}

/** 查询入库单列表 */
function getList() {
  loading.value = true;
  const query = {...queryParams.value}
  query.orderNo = query.orderNo?.trim() || undefined
  query.skuCode = query.skuCode?.trim() || undefined
  activeSkuCode.value = query.skuCode || ''
  skuFindLoading.value = !!query.skuCode
  matchedSkuRowCount.value = 0
  matchedSkuRowIndex.value = 0
  if (query.orderStatus === -2) {
    query.orderStatus = null
  }
  if (query.sourcePlace?.length) {
    query.sourceWarehouseId = query.sourcePlace[0]
  }
  if (query.targetPlace?.length) {
    query.targetWarehouseId = query.targetPlace[0]
  }
  listMovementOrder(query).then(response => {
    movementOrderList.value = response.rows;
    total.value = response.total;
    detailLoading.value = movementOrderList.value.map(() => false)
    if (query.skuCode) {
      expandedRowKeys.value = movementOrderList.value.map(row => row.id)
      Promise.all(movementOrderList.value.map(loadMovementOrderDetail)).then(() => scrollToMatchedSku(true))
    } else {
      expandedRowKeys.value = []
      skuFindLoading.value = false
    }
    loading.value = false;
  });
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}

/** 新增按钮操作 */
function handleAdd() {
  proxy.$router.push({ path: "/movementOrderEdit" });
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _ids = row.id || ids.value;
  proxy.$modal.confirm('确认删除移库单【' + row.orderNo + '】吗？').then(function() {
    loading.value = true;
    return delMovementOrder(_ids);
  }).then(() => {
    proxy.$modal.msgSuccess("删除成功");
  }).finally(() => {
    loading.value = false;
    getList();
  });
}

function handleUpdate(row) {
  proxy.$router.push({ path: "/movementOrderEdit",  query: { id: row.id } });
}

async function handleExport(row) {
  const progressLoading = createProgressLoading(isEn.value ? 'Exporting file' : '正在导出文件')
  try {
    const blobData = await exportMovementOrder(row.id, { headers: getExportLanguageHeaders(isEn.value) })
    const isBlob = blobValidate(blobData)
    if (!isBlob) {
      const resText = await blobData.text()
      const rspObj = JSON.parse(resText)
      throw new Error(rspObj?.msg || tr('导出失败'))
    }
    const excelData = await prepareLanguageXlsx(blobData, isEn.value)
    await progressLoading.finish()
    downloadXlsx(excelData, `${isEn.value ? 'Transfer Details' : '移库单明细'}-${row.orderNo || row.id}.xlsx`)
  } catch (e) {
    progressLoading.close()
    proxy.$modal.msgError(e?.message || tr('导出失败'))
  }
}

function handleGoDetail(row) {
  const index = expandedRowKeys.value.indexOf(row.id)
  if (index !== -1) {
    // 收起
    expandedRowKeys.value.splice(index, 1)
  } else {
    // 展开
    expandedRowKeys.value.push(row.id)
    loadMovementOrderDetail(row).then(() => scrollToMatchedSku(true))
  }
}

/** 导出按钮操作 */
async function handlePrint(row) {
  const printLoading = createProgressLoading(isEn.value ? 'Preparing print' : '正在准备打印')
  try {
  const res = await getMovementOrder(row.id)
  const movementOrder = res.data
  let table = []
  if (movementOrder.details?.length) {
    table = movementOrder.details.map(detail => {
      return {
        itemName: detail.item.itemName,
        skuCode: detail.itemSku.skuCode,
        quantity: Number(detail.quantity).toFixed(0)
      }
    })
  }
  const printData = {
    orderNo: movementOrder.orderNo,
    orderStatus: tr(proxy.selectDictLabel(wms_movement_status.value, movementOrder.orderStatus)),
    sourceWarehouseName: useWmsStore().warehouseMap.get(movementOrder.sourceWarehouseId)?.warehouseName,
    targetWarehouseName: useWmsStore().warehouseMap.get(movementOrder.targetWarehouseId)?.warehouseName,
    totalQuantity: Number(movementOrder.totalQuantity).toFixed(0),
    createBy: movementOrder.createBy,
    createTime: proxy.parseTime(movementOrder.createTime, '{mm}-{dd} {hh}:{ii}'),
    updateBy: movementOrder.updateBy,
    updateTime: proxy.parseTime(movementOrder.updateTime, '{mm}-{dd} {hh}:{ii}'),
    remark: movementOrder.remark,
    table
  }
  let printTemplate = new proxy.$hiprint.PrintTemplate({template: movementPanel})
  await printLoading.finish()
  printTemplate.print(printData, {}, {
    styleHandler: () => {
      return `
        <link href="https://cyl-press.oss-cn-shenzhen.aliyuncs.com/print-lock.css" media="print" rel="stylesheet">
        <style>
          @media print {
            @page {
              size: A4;
              margin: 10mm 8mm 12mm 8mm;
            }
          }

          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }

          table tr {
            height: auto !important;
          }

          table td,
          table th {
            box-sizing: border-box !important;
            padding: 2px 4px !important;
            line-height: 1.25 !important;
            font-size: 9.5px !important;
            text-align: center !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            overflow: visible !important;
            text-overflow: clip !important;
            vertical-align: middle !important;
          }

          table td:nth-child(1),
          table th:nth-child(1) {
            width: 55% !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }
          table td:nth-child(2),
          table th:nth-child(2) {
            width: 27% !important;
            white-space: nowrap !important;
          }
          table td:nth-child(3),
          table th:nth-child(3) {
            width: 18% !important;
            white-space: nowrap !important;
          }

          .hiprint-paper-number,
          .hiprint-paperNumber,
          [class*="paper-number"],
          [class*="paperNumber"] {
            white-space: nowrap !important;
            word-break: keep-all !important;
            overflow-wrap: normal !important;
            line-height: 1 !important;
          }
        </style>
      `
    }
  })
  } catch (error) {
    printLoading.close()
    throw error
  }
}


function handleExpandExchange(value, expandedRows) {
  if (!ifExpand(expandedRows)) {
    return
  }
  expandedRowKeys.value = expandedRows.map(it => it.id)
  loadMovementOrderDetail(value)
}

function loadMovementOrderDetail(row) {
  const index = movementOrderList.value.findIndex(it => it.id === row.id)
  if (index === -1) return Promise.resolve()
  detailLoading.value[index] = true
  return listByMovementOrderId(row.id).then(res => {
    if (res.data?.length) {
      const details = res.data.map(it => {
        return {
          ...it,
          sourceWarehouseName: useWmsStore().warehouseMap.get(it.sourceWarehouseId)?.warehouseName,
          targetWarehouseName: useWmsStore().warehouseMap.get(it.targetWarehouseId)?.warehouseName,
        }
      })
      movementOrderList.value[index].details = details
    }
  }).finally(() => {
    detailLoading.value[index] = false
  })
}

function ifExpand(expandedRows) {
  if (expandedRows.length < expandedRowKeys.value.length) {
    expandedRowKeys.value = expandedRows.map(it => it.id)
    return false;
  }
  return true
}

function getActiveSkuCode() {
  return activeSkuCode.value
}

function getDetailSkuCode(row) {
  return row?.itemSku?.skuCode || row?.skuCode || ''
}

function isMatchedSku(row) {
  const activeSkuCode = getActiveSkuCode()
  return !!activeSkuCode && getDetailSkuCode(row) === activeSkuCode
}

function getDetailRowClassName({ row }) {
  return isMatchedSku(row) ? 'sku-highlight-row' : ''
}

function getMatchedSkuRows() {
  const page = document.querySelector('.movement-order-page')
  return Array.from(page?.querySelectorAll('.sku-highlight-row') || [])
}

function scrollToMatchedSku(resetIndex = false) {
  if (!getActiveSkuCode()) return
  nextTick(() => {
    window.setTimeout(() => {
      const rows = getMatchedSkuRows()
      matchedSkuRowCount.value = rows.length
      skuFindLoading.value = false
      if (!rows.length) return
      if (resetIndex || matchedSkuRowIndex.value >= rows.length) {
        matchedSkuRowIndex.value = 0
      }
      rows[matchedSkuRowIndex.value]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  })
}

function scrollToPrevMatchedSku() {
  if (!getActiveSkuCode()) return
  nextTick(() => {
    window.setTimeout(() => {
      const rows = getMatchedSkuRows()
      matchedSkuRowCount.value = rows.length
      if (!rows.length) return
      matchedSkuRowIndex.value = (matchedSkuRowIndex.value - 1 + rows.length) % rows.length
      rows[matchedSkuRowIndex.value]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  })
}

function scrollToNextMatchedSku() {
  if (!getActiveSkuCode()) return
  nextTick(() => {
    window.setTimeout(() => {
      const rows = getMatchedSkuRows()
      matchedSkuRowCount.value = rows.length
      if (!rows.length) return
      matchedSkuRowIndex.value = (matchedSkuRowIndex.value + 1) % rows.length
      rows[matchedSkuRowIndex.value]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  })
}

function getRowKey(row) {
  return row.id
}

function initLookupOptions() {
  if (!wmsStore.warehouseList.length) {
    wmsStore.getWarehouseList()
  }
}

onMounted(() => {
  initLookupOptions()
  getList()
})
</script>
<style lang="scss">
.movement-order-page .filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
}

.movement-order-page .filter-item {
  width: calc(25% - 12px);
  margin-right: 0;
}

.movement-order-page .filter-item-full {
  width: 100%;
}

.movement-order-page .filter-item-actions {
  width: 100%;
}

.movement-order-page .filter-radio-group {
  display: flex;
  flex-wrap: wrap;
  row-gap: 8px;
}

.movement-order-page .action-btn {
  min-width: 96px;
}

.movement-order-page.is-en .action-btn {
  min-width: 110px;
}

.movement-order-page.is-en .el-form-item__label {
  white-space: nowrap;
}

.movement-order-page.is-en .filter-item-actions .el-form-item__content {
  margin-left: 170px !important;
}

@media (max-width: 1600px) {
  .movement-order-page .filter-item {
    width: calc(33.33% - 11px);
  }
}

@media (max-width: 1200px) {
  .movement-order-page .filter-item {
    width: calc(50% - 8px);
  }
}

@media (max-width: 768px) {
  .movement-order-page .filter-item,
  .movement-order-page .filter-item-actions {
    width: 100%;
  }
}

.movement-order-page .el-statistic__content {
  font-size: 14px;
  white-space: nowrap;
}

.movement-order-page .flex-space-between {
  gap: 8px;
  flex-wrap: nowrap;
}

.movement-order-page .el-table .vertical-top-cell {
  vertical-align: top
}
.movement-order-page .el-table .sku-highlight-row > td {
  background: #fff4b8 !important;
}

.movement-order-page .sku-find-floating {
  position: fixed;
  top: 84px;
  right: 32px;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  cursor: move;
  touch-action: none;
  user-select: none;
}

.movement-order-page .sku-find-floating .el-button {
  width: 34px;
}

@media (max-width: 768px) {
  .movement-order-page .sku-find-floating {
    top: auto;
    right: 16px;
    bottom: 18px;
  }
}
.movement-order-page .sku-find-count {
  width: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  font-size: 13px;
}
.movement-order-page .sku-highlight-text {
  color: #8a5a00;
  font-weight: 600;
}

</style>
