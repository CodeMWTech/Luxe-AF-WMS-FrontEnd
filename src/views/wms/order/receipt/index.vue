<template>
  <div class="app-container receipt-order-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :label-width="formLabelWidth" class="filter-form" @submit.prevent>
        <el-form-item class="filter-item filter-item-full" :label="tr('入库状态')" prop="orderStatus" :label-width="isEn ? '170px' : undefined">
          <el-radio-group v-model="queryParams.orderStatus" @change="handleQuery" class="filter-radio-group">
            <el-radio-button
              :key="-2"
              :label="-2"
            >
              {{ tr('全部') }}
            </el-radio-button>
            <el-radio-button
              v-for="item in translatedReceiptStatusOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item class="filter-item filter-item-full" :label="tr('入库类型')" prop="optType" :label-width="isEn ? '170px' : undefined">
          <el-radio-group v-model="queryParams.optType" @change="handleQuery" class="filter-radio-group">
            <el-radio-button
              :key="-1"
              :label="-1"
            >
              {{ tr('全部') }}
            </el-radio-button>
            <el-radio-button
              v-for="item in translatedReceiptTypeOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item class="filter-item" :label="tr('入库单号')" prop="orderNo" :label-width="isEn ? '170px' : undefined">
          <el-input
            v-model="queryParams.orderNo"
            :placeholder="tr('请输入入库单号')"
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

      <el-row :gutter="10" class="mb8 receipt-toolbar" type="flex" justify="space-between" align="middle">
        <el-col :span="6"><span style="font-size: large">{{ tr('入库单') }}</span></el-col>
        <el-col :span="18" class="receipt-toolbar-actions">
          <el-button
            v-if="isUnreceivedStatusFilter"
            :type="batchMode ? 'warning' : 'default'"
            icon="Operation"
            @click="toggleBatchMode"
            v-hasPermi="['wms:receipt:all']"
          >{{ batchMode ? tr('取消批量操作') : tr('批量操作') }}</el-button>
          <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['wms:receipt:edit']"
          >{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <div v-if="batchMode && isUnreceivedStatusFilter" class="batch-action-bar">
        <div class="batch-action-left">
          <el-icon class="batch-action-icon"><Select /></el-icon>
          <span class="batch-action-info">
            {{
              isAllFilteredSelected
                ? tr('已选择全部 {count} 个入库单').replace('{count}', selectedOrders.length)
                : tr('已选择 {count} 个入库单').replace('{count}', selectedOrders.length)
            }}
            <template v-if="getActiveSkuFilter()">
              {{ tr('（SKU筛选：') }}{{ getActiveSkuFilter() }}）
            </template>
          </span>
          <el-button
            v-if="!isAllFilteredSelected && total > 0"
            type="primary"
            icon="CircleCheck"
            class="batch-select-action-btn"
            :loading="selectAllLoading"
            @click="handleSelectAllFiltered"
          >
            {{ tr('全部勾选') }}
          </el-button>
          <el-button
            v-if="selectedOrders.length > 0"
            type="warning"
            plain
            icon="Close"
            class="batch-select-action-btn"
            :disabled="selectAllLoading"
            @click="clearReceiptSelection"
          >
            {{ tr('取消全选') }}
          </el-button>
        </div>
        <div class="batch-action-right">
          <el-button
            type="primary"
            icon="Printer"
            :loading="exportPdfLoading"
            :disabled="selectedOrders.length === 0"
            @click="handleExportUnreceivedPdf"
            v-hasPermi="['wms:receipt:all']"
          >
            {{ tr('批量导出为PDF') }}
          </el-button>
        </div>
      </div>

      <el-table ref="tableRef" v-loading="loading" :data="receiptOrderList" border class="mt20"
                @expand-change="handleExpandExchange"
                @selection-change="handleReceiptSelectionChange"
                :row-key="getRowKey"
                :expand-row-keys="expandedRowKeys"
                :empty-text="tr('暂无入库单')"
                cell-class-name="vertical-top-cell"
      >
        <el-table-column v-if="batchMode && isUnreceivedStatusFilter" type="selection" width="50" align="center" fixed="left" reserve-selection />
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
        <el-table-column :label="tr('单号/业务单号')" align="left" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ tr('单号：') }}{{ row.orderNo }}</div>
            <div v-if="row.bizOrderNo">{{ tr('业务单号：') }}{{ row.bizOrderNo }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('仓库')" align="left" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().warehouseMap.get(row.warehouseId)?.warehouseName }}</div>
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
        <el-table-column :label="tr('入库状态')" align="center" prop="orderStatus" min-width="90">
          <template #default="{ row }">
            <dict-tag :options="translatedReceiptStatusOptions" :value="row.orderStatus" />
          </template>
        </el-table-column>
        <el-table-column :label="tr('入库类型')" align="center" prop="optType" min-width="90">
          <template #default="{ row }">
            <dict-tag :options="translatedReceiptTypeOptions" :value="row.optType" />
          </template>
        </el-table-column>
        <el-table-column :label="tr('供应商')" align="left" prop="merchantId" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().merchantMap.get(row.merchantId)?.merchantName }}</div>
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
                  <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['wms:receipt:edit']" :disabled="[-1, 1].includes(scope.row.orderStatus)">{{ tr('修改') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handleGoDetail(scope.row)" v-hasPermi="['wms:receipt:all']">{{ expandedRowKeys.includes(scope.row.id) ? tr('收起') : tr('查看') }}</el-button>
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
                  <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['wms:receipt:edit']" :disabled="scope.row.orderStatus === 1">{{ tr('删除') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handlePrint(scope.row)" v-hasPermi="['wms:receipt:all']">{{ tr('打印') }}</el-button>
            </div>
            <div class="mt10">
              <el-button link type="primary" @click="handleExport(scope.row)" v-hasPermi="['wms:receipt:all']">{{ tr('导出') }}</el-button>
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

<script setup name="ReceiptOrder">
import {delReceiptOrder, exportReceiptOrder, getReceiptOrder, listReceiptOrder} from "@/api/wms/receiptOrder";
import {computed, getCurrentInstance, nextTick, onActivated, onMounted, reactive, ref, toRefs, watch} from "vue";
import {useRoute} from "vue-router";
import {useWmsStore} from "../../../../store/modules/wms";
import {listByReceiptOrderId} from "@/api/wms/receiptOrderDetail";
import {ElMessageBox} from "element-plus";
import receiptPanel from "@/components/PrintTemplate/receipt-panel";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { createProgressLoading } from '@/utils/progressLoading'
import { blobValidate } from '@/utils/ruoyi'
import { downloadXlsx, getExportLanguageHeaders, prepareLanguageXlsx } from '@/utils/xlsxTranslate'
import { useFixedDrag } from '@/utils/useFixedDrag'
import { escapeHtml, formatMoney, openCatalogPdfExport } from '@/utils/catalogPdfExport'
import { getItemImages } from '@/api/wms/item'
const route = useRoute();

const { proxy } = getCurrentInstance();
const { wms_receipt_status, wms_receipt_type } = proxy.useDict("wms_receipt_status", "wms_receipt_type");
const settingsStore = useSettingsStore()
const receiptOrderList = ref([]);
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
const exportPdfLoading = ref(false)
const selectAllLoading = ref(false)
const batchMode = ref(false)
const tableRef = ref()
const selectedOrders = ref([])
const selectedOrderMap = ref(new Map())
let suppressReceiptSelectionChange = false
const { dragStyle: skuFindDragStyle, startDrag: startSkuFindDrag } = useFixedDrag()
const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))
const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: undefined,
    skuCode: undefined,
    optType: -1,
    merchantId: undefined,
    totalAmount: undefined,
    orderStatus: -2,
  },
});

const { queryParams } = toRefs(data);

const appliedRouteFilterKey = ref('')

function applyRouteSkuFilter() {
  const skuCode = String(route.query.skuCode || '').trim()
  const orderNo = String(route.query.orderNo || '').trim()
  const receiptType = String(route.query.receiptType || '').trim().toUpperCase()
  const returnTypeOption = receiptType === 'RETURN'
    ? (wms_receipt_type.value || []).find(option => {
        const label = String(option?.label || '')
        return label.includes('退货') || /return/i.test(label)
      })
    : undefined
  const routeOptType = receiptType === 'RETURN' ? returnTypeOption?.value : -1
  const filterKey = `${skuCode}|${orderNo}|${receiptType}|${routeOptType ?? 'PENDING'}`
  const typeMatches = receiptType !== 'RETURN'
    ? queryParams.value.optType === -1
    : routeOptType === undefined
      ? queryParams.value.optType === -1
      : String(queryParams.value.optType) === String(routeOptType)
  if ((!skuCode && !orderNo) || (filterKey === appliedRouteFilterKey.value && String(queryParams.value.skuCode || '') === skuCode && String(queryParams.value.orderNo || '') === orderNo && typeMatches)) return false
  queryParams.value.skuCode = skuCode || undefined
  queryParams.value.orderNo = orderNo || undefined
  queryParams.value.optType = routeOptType ?? -1
  queryParams.value.pageNum = 1
  appliedRouteFilterKey.value = filterKey
  return true
}

watch(wms_receipt_type, () => {
  if (String(route.query.receiptType || '').toUpperCase() === 'RETURN' && applyRouteSkuFilter()) getList()
}, { deep: true })

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => '80px')
const translatedReceiptStatusOptions = computed(() => (wms_receipt_status.value || []).map(it => ({ ...it, label: tr(it.label) })))
const translatedReceiptTypeOptions = computed(() => (wms_receipt_type.value || []).map(it => ({ ...it, label: tr(it.label) })))
const skuFindCountText = computed(() => {
  if (skuFindLoading.value) return isEn.value ? 'Searching...' : '查找中...'
  return matchedSkuRowCount.value ? `${matchedSkuRowIndex.value + 1}/${matchedSkuRowCount.value}` : (isEn.value ? 'No match' : '无匹配')
})
const wmsStore = useWmsStore()
const isUnreceivedStatusFilter = computed(() => Number(queryParams.value.orderStatus) === 0)
const isAllFilteredSelected = computed(() => total.value > 0 && selectedOrders.value.length >= total.value)

watch(isUnreceivedStatusFilter, (val) => {
  if (!val) {
    batchMode.value = false
    clearReceiptSelection()
  }
})

function getReceiptOrderStateLabel(row) {
  if (isEn.value) {
    return row.orderStatus === 1 ? 'stocked in' : 'voided'
  }
  return row.orderStatus === 1 ? '入库' : '作废'
}

function getEditDisabledTip(row) {
  if (isEn.value) {
    return `Inbound order [${row.orderNo}] has been ${getReceiptOrderStateLabel(row)} and cannot be edited.`
  }
  return `入库单【${row.orderNo}】已${getReceiptOrderStateLabel(row)}，无法修改！`
}

function getDeleteDisabledTip(row) {
  if (isEn.value) {
    return `Inbound order [${row.orderNo}] has been stocked in and cannot be deleted.`
  }
  return `入库单【${row.orderNo}】已入库，无法删除！`
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
  if (query.optType === -1) {
    query.optType = null
  }
  listReceiptOrder(query).then(async response => {
    receiptOrderList.value = response.rows;
    total.value = response.total;
    detailLoading.value = receiptOrderList.value.map(() => false)
    if (query.skuCode) {
      expandedRowKeys.value = receiptOrderList.value.map(row => row.id)
      Promise.all(receiptOrderList.value.map(loadReceiptOrderDetail)).then(() => scrollToMatchedSku(true))
    } else {
      expandedRowKeys.value = []
      skuFindLoading.value = false
    }
    loading.value = false;
    await restoreReceiptSelection()
  });
}

function clearReceiptSelectionWhenNotBatching() {
  if (!batchMode.value) {
    clearReceiptSelection()
  }
}

/** 搜索按钮操作 */
function handleQuery() {
  clearReceiptSelectionWhenNotBatching()
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
function resetQuery() {
  clearReceiptSelectionWhenNotBatching()
  proxy.resetForm("queryRef");
  handleQuery();
}

/** 新增按钮操作 */
function handleAdd() {
  proxy.$router.push({ path: "/receiptOrderEdit" });
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _ids = row.id || ids.value;
  proxy.$modal.confirm('确认删除入库单【' + row.orderNo + '】吗？').then(function() {
    loading.value = true;
    delReceiptOrder(_ids).then(() => {
      proxy.$modal.msgSuccess("删除成功");
    }).finally(() => {
      loading.value = false;
      getList();
    });
  })
}

function handleUpdate(row) {
  proxy.$router.push({ path: "/receiptOrderEdit",  query: { id: row.id } });
}

async function handleExport(row) {
  const progressLoading = createProgressLoading(isEn.value ? 'Exporting file' : '正在导出文件')
  try {
    const blobData = await exportReceiptOrder(row.id, { headers: getExportLanguageHeaders(isEn.value) })
    const isBlob = blobValidate(blobData)
    if (!isBlob) {
      const resText = await blobData.text()
      const rspObj = JSON.parse(resText)
      throw new Error(rspObj?.msg || tr('导出失败'))
    }
    const excelData = await prepareLanguageXlsx(blobData, isEn.value)
    await progressLoading.finish()
    downloadXlsx(excelData, `${isEn.value ? 'Inbound Details' : '入库单明细'}-${row.orderNo || row.id}.xlsx`)
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
    loadReceiptOrderDetail(row).then(() => scrollToMatchedSku(true))
  }
}

/** 导出按钮操作 */
async function handlePrint(row) {
  const printLoading = createProgressLoading(isEn.value ? 'Preparing print' : '正在准备打印')
  try {
  const res = await getReceiptOrder(row.id)
  const receiptOrder = res.data
  let table = []
  if (receiptOrder.details?.length) {
    table = receiptOrder.details.map(detail => {
      return {
        itemName: detail.item.itemName,
        skuCode: detail.itemSku.skuCode,
        quantity: Number(detail.quantity).toFixed(0),
        amount: detail.amount
      }
    })
  }
  const printData = {
    orderNo: receiptOrder.orderNo,
    optType: tr(proxy.selectDictLabel(wms_receipt_type.value, receiptOrder.optType)),
    orderStatus: tr(proxy.selectDictLabel(wms_receipt_status.value, receiptOrder.orderStatus)),
    merchantName: useWmsStore().merchantMap.get(receiptOrder.merchantId)?.merchantName,
    bizOrderNo: receiptOrder.bizOrderNo,
    warehouseName: useWmsStore().warehouseMap.get(receiptOrder.warehouseId)?.warehouseName,
    totalQuantity: Number(receiptOrder.totalQuantity).toFixed(0),
    totalAmount: ((receiptOrder.totalAmount || receiptOrder.totalAmount === 0) ? (receiptOrder.totalAmount + ' $USD') : ''),
    createBy: receiptOrder.createBy,
    createTime: proxy.parseTime(receiptOrder.createTime, '{mm}-{dd} {hh}:{ii}'),
    updateBy: receiptOrder.updateBy,
    updateTime: proxy.parseTime(receiptOrder.updateTime, '{mm}-{dd} {hh}:{ii}'),
    remark: receiptOrder.remark,
    table
  }
  let printTemplate = new proxy.$hiprint.PrintTemplate({template: receiptPanel})
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

          /* 仅覆盖打印明细表，防止外部样式把英文挤成竖排 */
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

          /* 商品名称列：允许多行，但禁止逐字竖排 */
          table td:nth-child(1),
          table th:nth-child(1) {
            width: 42% !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }

          /* SKU/数量/金额列尽量单行 */
          table td:nth-child(2),
          table th:nth-child(2) {
            width: 18% !important;
            white-space: nowrap !important;
          }
          table td:nth-child(3),
          table th:nth-child(3) {
            width: 11% !important;
            white-space: nowrap !important;
          }
          table td:nth-child(4),
          table th:nth-child(4) {
            width: 29% !important;
            white-space: nowrap !important;
          }

          /* 页码单行显示兜底，避免 "13-\n13" */
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
  loadReceiptOrderDetail(value)
}

function loadReceiptOrderDetail(row) {
  const index = receiptOrderList.value.findIndex(it => it.id === row.id)
  if (index === -1) return Promise.resolve()
  detailLoading.value[index] = true
  return listByReceiptOrderId(row.id).then(res => {
    if (res.data?.length) {
      const details = res.data.map(it => {
        return {
          ...it,
          warehouseName: useWmsStore().warehouseMap.get(it.warehouseId)?.warehouseName,
        }
      })
      receiptOrderList.value[index].details = details
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
  const page = document.querySelector('.receipt-order-page')
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
  if (!wmsStore.merchantList.length) {
    wmsStore.getMerchantList()
  }
}

function getReceiptSelectionKey(row) {
  return row?.id
}

function getActiveSkuFilter() {
  return String(queryParams.value.skuCode || '').trim()
}

function filterReceiptDetailsBySku(details) {
  const skuCode = getActiveSkuFilter()
  if (!skuCode) return details
  return details.filter(detail => getDetailSkuCode(detail) === skuCode)
}

function syncSelectedOrders() {
  selectedOrders.value = Array.from(selectedOrderMap.value.values())
}

async function restoreReceiptSelection() {
  await nextTick()
  tableRef.value?.clearSelection()
  if (batchMode.value) {
    receiptOrderList.value.forEach(row => {
      const key = getReceiptSelectionKey(row)
      if (key && selectedOrderMap.value.has(key)) {
        tableRef.value?.toggleRowSelection(row, true)
      }
    })
  }
  await nextTick()
  suppressReceiptSelectionChange = false
}

function clearReceiptSelection() {
  selectedOrderMap.value.clear()
  selectedOrders.value = []
  tableRef.value?.clearSelection()
}

function handleReceiptSelectionChange(selection) {
  if (suppressReceiptSelectionChange) return
  const selectedKeySet = new Set(selection.map(getReceiptSelectionKey))
  receiptOrderList.value.forEach(row => {
    const key = getReceiptSelectionKey(row)
    if (!key) return
    if (selectedKeySet.has(key)) {
      selectedOrderMap.value.set(key, row)
    } else {
      selectedOrderMap.value.delete(key)
    }
  })
  syncSelectedOrders()
}

async function handleSelectAllFiltered() {
  if (total.value === 0 || isAllFilteredSelected.value) return
  try {
    selectAllLoading.value = true
    suppressReceiptSelectionChange = true
    const allOrders = await fetchAllUnreceivedOrders()
    selectedOrderMap.value.clear()
    allOrders.forEach(row => {
      const key = getReceiptSelectionKey(row)
      if (key) selectedOrderMap.value.set(key, row)
    })
    syncSelectedOrders()
    await restoreReceiptSelection()
    if (selectedOrders.value.length === 0) {
      proxy.$modal.msgWarning(tr('没有可选择的入库单'))
    }
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('全选失败'))
  } finally {
    selectAllLoading.value = false
  }
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) {
    clearReceiptSelection()
  } else {
    suppressReceiptSelectionChange = true
    restoreReceiptSelection()
  }
}

function buildReceiptExportQuery() {
  const query = { ...queryParams.value }
  query.orderStatus = 0
  query.orderNo = query.orderNo?.trim() || undefined
  query.skuCode = query.skuCode?.trim() || undefined
  if (query.optType === -1) {
    query.optType = null
  }
  return query
}

async function fetchAllUnreceivedOrders() {
  const pageSize = 100
  let pageNum = 1
  let allOrders = []
  let totalCount = 0
  do {
    const response = await listReceiptOrder({ ...buildReceiptExportQuery(), pageNum, pageSize })
    const rows = response.rows || []
    allOrders = allOrders.concat(rows)
    totalCount = response.total || 0
    pageNum += 1
  } while (allOrders.length < totalCount)
  return allOrders
}

function getImageUrlFromList(images) {
  const img = images?.[0]
  return img?.thumbUrl || img?.url || ''
}

function getDetailImage(detail) {
  return getImageUrlFromList(detail?.item?.images)
}

async function fetchItemImageMap(itemIds) {
  const imageMap = new Map()
  const ids = [...new Set(itemIds.filter(Boolean))]
  const batchSize = 10
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    await Promise.all(batch.map(async itemId => {
      try {
        const res = await getItemImages(itemId)
        const url = getImageUrlFromList(res.data)
        if (url) {
          imageMap.set(itemId, url)
        }
      } catch {
        // ignore per-item image fetch failures
      }
    }))
  }
  return imageMap
}

async function enrichReceiptPdfRowImages(rows) {
  const imageMap = await fetchItemImageMap(rows.map(row => row.itemId))
  rows.forEach(row => {
    if (!row.itemImage && row.itemId) {
      row.itemImage = imageMap.get(row.itemId) || ''
    }
  })
  return rows
}

function mapReceiptDetailToPdfRow(detail, order) {
  const warehouseName = detail.warehouseName
    || wmsStore.warehouseMap.get(detail.warehouseId)?.warehouseName
    || wmsStore.warehouseMap.get(order.warehouseId)?.warehouseName
  return {
    itemId: detail?.item?.id || detail?.itemSku?.itemId,
    itemImage: getDetailImage(detail),
    itemName: detail?.item?.itemName,
    skuCode: detail?.itemSku?.skuCode,
    warehouseName,
    quantity: detail.quantity,
    orderNo: order.orderNo,
    bizOrderNo: order.bizOrderNo,
    optTypeLabel: tr(proxy.selectDictLabel(wms_receipt_type.value, order.optType)),
    merchantName: wmsStore.merchantMap.get(order.merchantId)?.merchantName,
    createTime: order.createTime,
    amount: detail.amount,
    costPrice: detail?.itemSku?.costPrice,
    sellingPrice: detail?.itemSku?.sellingPrice,
    itemCondition: detail?.item?.itemCondition,
    defect: detail?.item?.defect,
    remark: detail.remark || order.remark
  }
}

async function fetchUnreceivedPdfRows(orders) {
  const rows = []
  const batchSize = 10
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize)
    const batchRows = await Promise.all(batch.map(async order => {
      const res = await listByReceiptOrderId(order.id)
      const details = (res.data || []).map(detail => ({
        ...detail,
        warehouseName: wmsStore.warehouseMap.get(detail.warehouseId)?.warehouseName,
      }))
      return filterReceiptDetailsBySku(details).map(detail => mapReceiptDetailToPdfRow(detail, order))
    }))
    batchRows.forEach(items => rows.push(...items))
  }
  return rows
}

function formatReceiptPdfTime(value) {
  if (value === null || value === undefined) return '--'
  return proxy.parseTime(value) || '--'
}

function formatReceiptPdfProfit(row) {
  const cost = Number(row.costPrice)
  const selling = Number(row.sellingPrice)
  if (!Number.isFinite(cost) || !Number.isFinite(selling)) return '--'
  return formatMoney(selling - cost)
}

function buildReceiptPdfColumns() {
  const canViewCost = canViewCostPrice.value
  const canViewSelling = canViewSellingPrice.value
  const columns = [
    {
      key: 'image',
      label: tr('商品图片'),
      className: 'image-cell',
      render: row => {
        const imgUrl = row.itemImage || ''
        return imgUrl
          ? `<img src="${escapeHtml(imgUrl)}" alt="" />`
          : escapeHtml(tr('暂无图片'))
      }
    },
    { key: 'itemName', label: tr('商品名称'), render: row => escapeHtml(row.itemName || '--') },
    { key: 'skuCode', label: tr('SKU编号'), render: row => escapeHtml(row.skuCode || '--') },
    { key: 'warehouse', label: tr('仓库'), render: row => escapeHtml(row.warehouseName || '--') },
    { key: 'quantity', label: tr('数量'), className: 'number-cell', render: row => row.quantity != null ? escapeHtml(row.quantity) : '--' },
    { key: 'orderNo', label: tr('入库单号'), render: row => escapeHtml(row.orderNo || '--') },
    { key: 'bizOrderNo', label: tr('业务单号'), render: row => escapeHtml(row.bizOrderNo || '--') },
    { key: 'optType', label: tr('入库类型'), render: row => escapeHtml(row.optTypeLabel || '--') },
    { key: 'merchant', label: tr('供应商'), render: row => escapeHtml(row.merchantName || '--') },
    { key: 'createTime', label: tr('创建时间'), render: row => escapeHtml(formatReceiptPdfTime(row.createTime)) },
    { key: 'amount', label: tr('金额($USD)'), className: 'number-cell', render: row => escapeHtml(formatMoney(row.amount)) }
  ]
  if (canViewCost) {
    columns.push({
      key: 'costPrice',
      label: tr('成本价'),
      className: 'number-cell',
      render: row => {
        const rawCost = Number(row.costPrice)
        const rawValue = row.costPrice !== null && row.costPrice !== undefined && Number.isFinite(rawCost)
          ? String(rawCost)
          : ''
        return `<span data-cost-value="${escapeHtml(rawValue)}">${escapeHtml(formatMoney(row.costPrice))}</span>`
      }
    })
  }
  if (canViewSelling) {
    columns.push({
      key: 'sellingPrice',
      label: tr('销售价'),
      className: 'number-cell',
      render: row => escapeHtml(formatMoney(row.sellingPrice))
    })
  }
  if (canViewCost && canViewSelling) {
    columns.push({
      key: 'profit',
      label: tr('利润'),
      className: 'number-cell',
      render: row => escapeHtml(formatReceiptPdfProfit(row))
    })
  }
  columns.push(
    { key: 'condition', label: tr('成色'), render: row => escapeHtml(row.itemCondition || '--') },
    { key: 'defect', label: tr('瑕疵'), render: row => escapeHtml(row.defect || '--') },
    { key: 'remark', label: tr('备注'), render: row => escapeHtml(row.remark || '--') }
  )
  return columns
}

async function handleExportUnreceivedPdf() {
  if (!isUnreceivedStatusFilter.value || !batchMode.value) return
  if (selectedOrders.value.length === 0) {
    proxy.$modal.msgWarning(tr('请至少选择一条入库单'))
    return
  }
  const progressLoading = createProgressLoading(tr('正在加载未入库商品数据'))
  try {
    exportPdfLoading.value = true
    const rows = await enrichReceiptPdfRowImages(await fetchUnreceivedPdfRows(selectedOrders.value))
    if (!rows.length) {
      progressLoading.close()
      proxy.$modal.msgWarning(tr('暂无未入库商品可导出'))
      return
    }
    await progressLoading.finish()
    const opened = openCatalogPdfExport({
      title: tr('未入库商品报表'),
      rows,
      columns: buildReceiptPdfColumns(),
      canViewCost: canViewCostPrice.value,
      isEn: isEn.value
    })
    if (!opened) {
      proxy.$modal.msgError(tr('批量导出失败'))
      return
    }
    proxy.$modal.msgSuccess(tr('批量导出成功'))
  } catch (e) {
    progressLoading.close()
    proxy.$modal.msgError(e?.message || tr('批量导出失败'))
  } finally {
    exportPdfLoading.value = false
  }
}

onMounted(() => {
  initLookupOptions()
  applyRouteSkuFilter()
  getList()
})

onActivated(() => {
  if (applyRouteSkuFilter()) getList()
})
</script>
<style lang="scss">
.receipt-order-page .filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
}

.receipt-order-page .filter-item {
  width: calc(25% - 12px);
  margin-right: 0;
}

.receipt-order-page .filter-item-full {
  width: 100%;
}

.receipt-order-page .filter-item-actions {
  width: 100%;
}

.receipt-order-page .filter-radio-group {
  display: flex;
  flex-wrap: wrap;
  row-gap: 8px;
}

.receipt-order-page .action-btn {
  min-width: 96px;
}

.receipt-order-page.is-en .action-btn {
  min-width: 110px;
}

.receipt-order-page.is-en .el-form-item__label {
  white-space: nowrap;
}

.receipt-order-page.is-en .filter-item-actions .el-form-item__content {
  margin-left: 170px !important;
}

@media (max-width: 1600px) {
  .receipt-order-page .filter-item {
    width: calc(33.33% - 11px);
  }
}

@media (max-width: 1200px) {
  .receipt-order-page .filter-item {
    width: calc(50% - 8px);
  }
}

@media (max-width: 768px) {
  .receipt-order-page .filter-item,
  .receipt-order-page .filter-item-actions {
    width: 100%;
  }
}

.receipt-order-page .el-statistic__content {
  font-size: 14px;
  white-space: nowrap;
}
.receipt-order-page .flex-space-between {
  gap: 8px;
  flex-wrap: nowrap;
}

.receipt-order-page .receipt-toolbar-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.receipt-order-page .batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  border: 1px solid var(--el-color-primary-light-5, #c6e2ff);
  border-radius: 6px;
}

.receipt-order-page .batch-action-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.receipt-order-page .batch-action-icon {
  font-size: 18px;
  color: var(--el-color-primary, #409eff);
}

.receipt-order-page .batch-action-info {
  color: var(--el-text-color-primary, #303133);
  font-size: 14px;
  font-weight: 500;
}

.receipt-order-page .batch-select-action-btn {
  font-weight: 600;
}

.receipt-order-page .batch-action-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.receipt-order-page .el-table .vertical-top-cell {
  vertical-align: top
}
.receipt-order-page .el-table .sku-highlight-row > td {
  background: #fff4b8 !important;
}

.receipt-order-page .sku-find-floating {
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

.receipt-order-page .sku-find-floating .el-button {
  width: 34px;
}

@media (max-width: 768px) {
  .receipt-order-page .sku-find-floating {
    top: auto;
    right: 16px;
    bottom: 18px;
  }
}
.receipt-order-page .sku-find-count {
  width: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  font-size: 13px;
}
.receipt-order-page .sku-highlight-text {
  color: #8a5a00;
  font-weight: 600;
}

</style>
