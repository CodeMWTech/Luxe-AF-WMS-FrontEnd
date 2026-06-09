<template>
  <div class="app-container check-order-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :label-width="formLabelWidth" class="filter-form" @submit.prevent>
        <el-form-item class="filter-item filter-item-full" :label="isEn ? 'Stocktake Status' : '盘库状态'" prop="orderStatus" :label-width="isEn ? '170px' : undefined">
          <el-radio-group v-model="queryParams.orderStatus" @change="handleQuery" class="filter-radio-group">
            <el-radio-button
              :key="-2"
              :label="-2"
            >
              {{ isEn ? 'All' : '全部' }}
            </el-radio-button>
            <el-radio-button
              v-for="item in translatedCheckStatusOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item class="filter-item" :label="isEn ? 'Stocktake No.' : '盘库单号'" prop="orderNo" :label-width="isEn ? '170px' : undefined">
          <el-input
            v-model="queryParams.orderNo"
            :placeholder="isEn ? 'Please enter stocktake order number' : '请输入盘库单号'"
            clearable
            @keyup.enter.prevent="handleQuery"
          />
        </el-form-item>
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ isEn ? 'Search' : '搜索' }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ isEn ? 'Reset' : '重置' }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">

      <el-row :gutter="10" class="mb8 check-toolbar" type="flex" justify="space-between">
        <el-col :span="6"><span style="font-size: large">{{ isEn ? 'Stocktake Orders' : '盘库单' }}</span></el-col>
        <el-col :span="18" class="check-toolbar-actions">
          <el-button
            v-if="!smartCheckMode"
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['wms:check:edit']"
          >{{ isEn ? 'Submit Stocktake' : '提交盘库单' }}</el-button>
          <el-button
            v-if="!smartCheckMode"
            type="primary"
            icon="Aim"
            @click="handleEnterSmartCheck"
            v-hasPermi="['wms:check:all']"
          >{{ isEn ? 'Smart Inventory Check' : '库存智能核查' }}</el-button>
          <template v-if="smartCheckMode">
            <span class="smart-selected-count">{{ isEn ? 'Selected' : '已选' }} {{ selectedSmartRows.length }} {{ isEn ? '' : '个' }}</span>
            <el-button
              type="primary"
              icon="Search"
              :loading="smartCheckLoading"
              :disabled="!selectedSmartRows.length"
              @click="handleStartSmartCheck"
              v-hasPermi="['wms:check:all']"
            >{{ isEn ? 'Start Check' : '开始核查' }}</el-button>
            <el-button icon="Close" @click="handleCancelSmartCheck">{{ isEn ? 'Cancel' : '取消' }}</el-button>
          </template>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="checkOrderList" border class="mt20"
                ref="checkOrderTableRef"
                :row-key="getRowKey"
                :row-class-name="getRowClassName"
                :empty-text="isEn ? 'No stocktake orders' : '暂无盘库单'"
                cell-class-name="vertical-top-cell"
                @selection-change="handleSmartSelectionChange"
      >
        <el-table-column
          v-if="smartCheckMode"
          type="selection"
          width="52"
          :reserve-selection="true"
          :selectable="isSmartCheckSelectable"
        />
        <el-table-column :label="isEn ? 'Order No.' : '单号'" align="left" prop="orderNo" min-width="180" show-overflow-tooltip />
        <el-table-column :label="isEn ? 'Warehouse' : '仓库'" align="left" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().warehouseMap.get(row.warehouseId)?.warehouseName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="isEn ? 'Stocktake Status' : '盘库状态'" align="center" prop="orderStatus" min-width="90">
          <template #default="{ row }">
            <dict-tag :options="translatedCheckStatusOptions" :value="row.orderStatus" />
          </template>
        </el-table-column>
        <el-table-column :label="isEn ? 'Difference Total' : '差额合计'" align="right" min-width="120">
          <template #default="{ row }">
            <el-statistic :value="Number(row.totalQuantity)" :precision="0"/>
          </template>
        </el-table-column>
        <el-table-column :label="isEn ? 'Operation Time' : '操作时间'" align="left" width="170">
          <template #default="{ row }">
            <div>{{ isEn ? 'Created: ' : '创建：' }}{{ parseTime(row.createTime, '{mm}-{dd} {hh}:{ii}') }}</div>
            <div>{{ isEn ? 'Updated: ' : '更新：' }}{{ parseTime(row.updateTime, '{mm}-{dd} {hh}:{ii}') }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="isEn ? 'Operator' : '操作人'" align="left">
          <template #default="{ row }">
            <div>{{ row.createBy }}</div>
            <div v-if="row.updateBy">{{ row.updateBy }}</div>
          </template>
        </el-table-column>

        <el-table-column :label="isEn ? 'Remark' : '备注'" prop="remark" />
        <el-table-column :label="isEn ? 'Actions' : '操作'" align="right" class-name="small-padding fixed-width" width="120">
          <template #default="scope">
            <div>
              <el-popover
                placement="left"
                :title="isEn ? 'Tip' : '提示'"
                :width="300"
                trigger="hover"
                :disabled="scope.row.orderStatus === 0"
                :content="getEditDisabledTip(scope.row)"
              >
                <template #reference>
                  <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['wms:check:edit']" :disabled="[-1, 1].includes(scope.row.orderStatus)">{{ isEn ? 'Edit' : '修改' }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handleViewRow(scope.row)" v-hasPermi="['wms:check:all']">{{ isSmartCheckOrder(scope.row) ? (isEn ? 'Report' : '查看报告') : (isEn ? 'View' : '查看') }}</el-button>
            </div>
            <div class="mt10">
              <el-popover
                placement="left"
                :title="isEn ? 'Tip' : '提示'"
                :width="300"
                trigger="hover"
                :disabled="[-1, 0].includes(scope.row.orderStatus)"
                :content="getDeleteDisabledTip(scope.row)"
              >
                <template #reference>
                  <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['wms:check:edit']" :disabled="scope.row.orderStatus === 1">{{ isEn ? 'Delete' : '删除' }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handlePrint(scope.row)" v-hasPermi="['wms:check:all']">{{ isEn ? 'Print' : '打印' }}</el-button>
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
    <check-order-detail
      ref="checkOrderDetailRef"
      :model-value="watchDetailObj.show"
      :order-no="watchDetailObj.orderNo"
      @handle-cancel-click="watchDetailObj.show = false"
    />
    <el-dialog
      v-model="smartReportVisible"
      custom-class="smart-check-dialog"
      :title="isEn ? 'Smart Inventory Check Report' : '库存智能核查报告'"
      width="88%"
      top="4vh"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div v-loading="smartCheckLoading || smartConfirmLoading" class="smart-check-report">
        <div class="smart-report-subtitle">{{ smartReportSubtitle }}</div>
        <div class="smart-summary-grid">
          <div class="smart-summary-card shortage">
            <div class="summary-label">{{ isEn ? 'Shortage' : '缺少（盘亏/未盘到）' }}</div>
            <div class="summary-value">{{ smartCheckReport?.shortageCount || 0 }}</div>
          </div>
          <div class="smart-summary-card surplus">
            <div class="summary-label">{{ isEn ? 'Surplus' : '多了（盘盈/多盘出）' }}</div>
            <div class="summary-value">{{ smartCheckReport?.surplusCount || 0 }}</div>
          </div>
          <div class="smart-summary-card matched">
            <div class="summary-label">{{ isEn ? 'Matched' : '数量一致' }}</div>
            <div class="summary-value">{{ smartCheckReport?.matchedCount || 0 }}</div>
          </div>
        </div>
        <el-table
          :data="smartCheckReport?.details || []"
          class="smart-report-table"
          height="520"
          border
          :row-class-name="getSmartReportRowClass"
        >
          <el-table-column label="SKU" prop="skuCode" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.skuCode || row.skuId || '-' }}</template>
          </el-table-column>
          <el-table-column :label="isEn ? 'Item Name' : '商品名'" prop="itemName" min-width="240" show-overflow-tooltip>
            <template #default="{ row }">{{ row.itemName || '-' }}</template>
          </el-table-column>
          <el-table-column :label="isEn ? 'System Qty' : '系统库存'" align="right" min-width="120">
            <template #default="{ row }">{{ formatQuantity(row.systemQuantity) }}</template>
          </el-table-column>
          <el-table-column :label="isEn ? 'Counted Qty' : '实盘数'" align="right" min-width="120">
            <template #default="{ row }">{{ formatQuantity(row.countedQuantity) }}</template>
          </el-table-column>
          <el-table-column :label="isEn ? 'Difference' : '差值'" align="right" min-width="100">
            <template #default="{ row }">{{ row.differenceDisplay || formatDifference(row.difference) }}</template>
          </el-table-column>
          <el-table-column :label="isEn ? 'Status' : '状态'" min-width="120">
            <template #default="{ row }">{{ row.statusText || row.remark || '-' }}</template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div class="smart-dialog-footer">
          <el-button
            v-if="canConfirmSmartReport"
            type="primary"
            :loading="smartConfirmLoading"
            @click="handleConfirmSmartCheck"
          >{{ isEn ? 'Confirm Stocktake' : '确认盘库' }}</el-button>
          <span></span>
          <el-button @click="smartReportVisible = false">{{ isEn ? 'Close' : '关闭' }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="CheckOrder">
import {listCheckOrder, delCheckOrder, getCheckOrder, smartCheckPreview, smartCheckConfirm} from "@/api/wms/checkOrder";
import {listByCheckOrderId} from "@/api/wms/checkOrderDetail";
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, toRefs} from "vue";
import {useWmsStore} from "../../../../store/modules/wms";
import {ElMessageBox} from "element-plus";
import checkPanel from "@/components/PrintTemplate/check-panel";
import CheckOrderDetail from "@/views/wms/order/check/CheckOrderDetail.vue";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const { proxy } = getCurrentInstance();
const {wms_check_status} = proxy.useDict("wms_check_status");
const settingsStore = useSettingsStore()
const checkOrderList = ref([]);
const open = ref(false);
const buttonLoading = ref(false);
const loading = ref(true);
const ids = ref([]);
const total = ref(0);
const title = ref("");
const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: undefined,
    orderStatus: -2,
  },
});
const watchDetailObj = ref({
  show: false,
  orderNo: null
})
const checkOrderDetailRef = ref(null)
const checkOrderTableRef = ref(null)
const smartCheckMode = ref(false)
const selectedSmartRows = ref([])
const smartCheckLoading = ref(false)
const smartConfirmLoading = ref(false)
const smartReportVisible = ref(false)
const smartCheckReport = ref(null)
const smartReportSource = ref(null)
const { queryParams } = toRefs(data);
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => '80px')
const translatedCheckStatusOptions = computed(() => (wms_check_status.value || []).map(it => ({ ...it, label: tr(it.label) })))
const wmsStore = useWmsStore()

function getCheckOrderStateLabel(row) {
  if (isEn.value) {
    return row.orderStatus === 1 ? 'completed' : 'voided'
  }
  return row.orderStatus === 1 ? '完成盘点' : '作废'
}

function getEditDisabledTip(row) {
  if (isEn.value) {
    return `Stocktake order [${row.orderNo}] has been ${getCheckOrderStateLabel(row)} and cannot be edited.`
  }
  return `盘库单【${row.orderNo}】已${getCheckOrderStateLabel(row)}，无法修改！`
}

function getDeleteDisabledTip(row) {
  if (isEn.value) {
    return `Stocktake order [${row.orderNo}] has been completed and cannot be deleted.`
  }
  return `盘库单【${row.orderNo}】已完成盘点，无法删除！`
}

const smartReportSubtitle = computed(() => {
  const report = smartCheckReport.value || {}
  const orderCount = report.sourceOrderCount ?? '-'
  const skuCount = report.systemSkuCount ?? (report.details?.length || 0)
  return isEn.value
    ? `Checked ${orderCount} stocktake orders · System inventory baseline ${skuCount} SKUs`
    : `已核查 ${orderCount} 个盘库单 · 系统库存基准 ${skuCount} 个 SKU`
})
const canConfirmSmartReport = computed(() => smartReportSource.value === 'preview' && smartCheckReport.value && !smartCheckReport.value.orderId)

/** 鏌ヨ鐩樺簱鍗曞垪琛?*/
function getList() {
  loading.value = true;
  const query = {...queryParams.value}
  query.orderNo = query.orderNo?.trim() || undefined
  if (query.orderStatus === -2) {
    query.orderStatus = null
  }
  listCheckOrder(query).then(response => {
    checkOrderList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
}

/** 鎼滅储鎸夐挳鎿嶄綔 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

/** 閲嶇疆鎸夐挳鎿嶄綔 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}

/** 鏂板鎸夐挳鎿嶄綔 */
function handleAdd() {
  proxy.$router.push({ path: "/checkOrderEdit" });
}

/** 鍒犻櫎鎸夐挳鎿嶄綔 */
function handleDelete(row) {
  const _ids = row.id || ids.value;
  proxy.$modal.confirm(`确认删除盘库单【${row.orderNo}】吗？`).then(function() {
    loading.value = true;
    return delCheckOrder(_ids);
  }).then(() => {
    proxy.$modal.msgSuccess(isEn.value ? 'Deleted' : '删除成功');
  }).finally(() => {
    loading.value = false;
    getList();
  });
}

function handleUpdate(row) {
  proxy.$router.push({ path: "/checkOrderEdit",  query: { id: row.id } });
}

function handleGoDetail(row) {
  watchDetailObj.value.orderNo = row.orderNo
  checkOrderDetailRef.value.setCheckOrderId(row.id)
  watchDetailObj.value.show = true
  checkOrderDetailRef.value.handleQuery()
}

function handleViewRow(row) {
  if (isSmartCheckOrder(row)) {
    handleViewSmartReport(row)
    return
  }
  handleGoDetail(row)
}

function handleEnterSmartCheck() {
  smartCheckMode.value = true
  selectedSmartRows.value = []
  nextTick(() => checkOrderTableRef.value?.clearSelection?.())
}

function handleCancelSmartCheck() {
  smartCheckMode.value = false
  selectedSmartRows.value = []
  nextTick(() => checkOrderTableRef.value?.clearSelection?.())
}

function handleSmartSelectionChange(selection) {
  selectedSmartRows.value = selection.filter(row => isSmartCheckSelectable(row))
}

function isSmartCheckSelectable(row) {
  return !isSmartCheckOrder(row)
}

function isSmartCheckOrder(row) {
  return row?.orderNo?.startsWith('AUDIT-')
}

function getRowClassName({ row }) {
  return isSmartCheckOrder(row) ? 'smart-audit-row' : ''
}

async function handleStartSmartCheck() {
  if (!selectedSmartRows.value.length) {
    proxy.$modal.msgWarning(isEn.value ? 'Please select stocktake orders' : '请选择需要核查的盘库单')
    return
  }
  smartCheckLoading.value = true
  try {
    const res = await smartCheckPreview({ sourceOrderIds: selectedSmartRows.value.map(row => row.id) })
    smartCheckReport.value = res.data
    smartReportSource.value = 'preview'
    smartReportVisible.value = true
  } finally {
    smartCheckLoading.value = false
  }
}

async function handleConfirmSmartCheck() {
  if (!selectedSmartRows.value.length) {
    return
  }
  await proxy.$modal.confirm(isEn.value ? 'Confirm stocktake and create an AUDIT order?' : '确认盘库并生成核查单吗？')
  smartConfirmLoading.value = true
  try {
    const res = await smartCheckConfirm({ sourceOrderIds: selectedSmartRows.value.map(row => row.id) })
    smartCheckReport.value = res.data
    smartReportSource.value = 'audit'
    proxy.$modal.msgSuccess(isEn.value ? 'AUDIT order created' : '核查盘库单已生成')
    smartReportVisible.value = false
    handleCancelSmartCheck()
    getList()
  } finally {
    smartConfirmLoading.value = false
  }
}

async function handleViewSmartReport(row) {
  smartCheckLoading.value = true
  try {
    const [orderRes, detailRes] = await Promise.all([
      getCheckOrder(row.id),
      listByCheckOrderId(row.id, {
        pageNum: 1,
        pageSize: 10000,
        haveProfitAndLoss: false
      })
    ])
    smartCheckReport.value = buildSmartReportFromOrder(orderRes.data || row, getResponseRows(detailRes))
    smartReportSource.value = 'audit'
    smartReportVisible.value = true
  } finally {
    smartCheckLoading.value = false
  }
}

function buildSmartReportFromOrder(order, details) {
  const rows = (details || []).map(detail => {
    const systemQuantity = Number(getActualQuantity(detail))
    const countedQuantity = Number(getCountedQuantity(detail))
    const difference = countedQuantity - systemQuantity
    const status = difference < 0 ? 'SHORTAGE' : difference > 0 ? 'SURPLUS' : 'MATCHED'
    return {
      skuId: detail.skuId,
      warehouseId: detail.warehouseId,
      inventoryId: detail.inventoryId,
      skuCode: getDetailSkuCode(detail),
      itemName: getDetailItemName(detail),
      systemQuantity,
      countedQuantity,
      difference,
      differenceDisplay: getDifferenceDisplay({ difference }),
      status,
      statusText: status === 'SHORTAGE' ? '盘亏' : status === 'SURPLUS' ? '盘盈' : '数量一致',
      remark: detail.memo || detail.remark
    }
  })
  const sourceOrderCount = parseSourceOrderCount(order?.remark)
  const shortageCount = rows.filter(row => row.status === 'SHORTAGE').length
  const surplusCount = rows.filter(row => row.status === 'SURPLUS').length
  const matchedCount = rows.filter(row => row.status === 'MATCHED').length
  return {
    orderId: order?.id,
    orderNo: order?.orderNo,
    sourceOrderCount,
    systemSkuCount: rows.length,
    shortageCount,
    surplusCount,
    matchedCount,
    totalDifference: rows.reduce((sum, row) => sum + Number(row.difference || 0), 0),
    remark: order?.remark,
    details: rows
  }
}

function parseSourceOrderCount(remark) {
  const match = String(remark || '').match(/含\s*(\d+)\s*单/)
  return match ? Number(match[1]) : '-'
}

/** 鎵撳嵃鎸夐挳鎿嶄綔 */
async function handlePrint(row) {
  const res = await getCheckOrder(row.id)
  const checkOrder = res.data
  const detailRes = await listByCheckOrderId(row.id, {
    pageNum: 1,
    pageSize: 10000,
    haveProfitAndLoss: false
  })
  let table = []
  const detailRows = getResponseRows(detailRes)
  if (detailRows.length) {
    table = detailRows.map(detail => {
      return {
        itemName: getDetailItemName(detail),
        skuCode: getDetailSkuCode(detail),
        quantity: Number(getActualQuantity(detail)).toFixed(0),
        profitAndLoss: getDifferenceDisplay(detail),
        checkQuantity: Number(getCountedQuantity(detail)).toFixed(0)
      }
    })
  }
  const printData = {
    orderNo: checkOrder.orderNo,
    orderStatus: tr(proxy.selectDictLabel(wms_check_status.value, checkOrder.orderStatus)),
    warehouseName: useWmsStore().warehouseMap.get(checkOrder.warehouseId)?.warehouseName,
    totalQuantity: Number(checkOrder.totalQuantity).toFixed(0),
    createBy: checkOrder.createBy,
    createTime: proxy.parseTime(checkOrder.createTime, '{mm}-{dd} {hh}:{ii}'),
    updateBy: checkOrder.updateBy,
    updateTime: proxy.parseTime(checkOrder.updateTime, '{mm}-{dd} {hh}:{ii}'),
    remark: checkOrder.remark,
    table
  }
  let printTemplate = new proxy.$hiprint.PrintTemplate({template: checkPanel})
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
            width: 40% !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
          }
          table td:nth-child(2),
          table th:nth-child(2) {
            width: 18% !important;
            white-space: nowrap !important;
          }
          table td:nth-child(3),
          table th:nth-child(3),
          table td:nth-child(4),
          table th:nth-child(4),
          table td:nth-child(5),
          table th:nth-child(5) {
            width: 14% !important;
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
}

function getRowKey(row) {
  return row.id
}

function getResponseRows(response) {
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.data?.rows)) return response.data.rows
  if (Array.isArray(response?.data)) return response.data
  return []
}

function getDetailItemName(row) {
  return row?.itemName || row?.item?.itemName || '-'
}

function getDetailSkuCode(row) {
  return row?.skuCode || row?.itemSku?.skuCode || '-'
}

function getCountedQuantity(row) {
  return row?.countedQuantity ?? row?.checkQuantity ?? 0
}

function getActualQuantity(row) {
  return row?.actualQuantity ?? row?.quantity ?? 0
}

function getDifferenceDisplay(row) {
  if (row?.differenceDisplay !== undefined && row?.differenceDisplay !== null) {
    return row.differenceDisplay
  }
  const difference = Number(row?.difference ?? (getCountedQuantity(row) - getActualQuantity(row)))
  return difference > 0 ? `+${difference}` : String(difference)
}

function formatQuantity(value) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number.toFixed(0) : '0'
}

function formatDifference(value) {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) {
    return '0'
  }
  return number > 0 ? `+${number.toFixed(0)}` : number.toFixed(0)
}

function getSmartReportRowClass({ row }) {
  if (row.status === 'SHORTAGE') {
    return 'smart-report-shortage'
  }
  if (row.status === 'SURPLUS') {
    return 'smart-report-surplus'
  }
  return 'smart-report-matched'
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
.check-order-page .filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
}

.check-order-page .filter-item {
  width: calc(25% - 12px);
  margin-right: 0;
}

.check-order-page .filter-item-full {
  width: 100%;
}

.check-order-page .filter-item-actions {
  width: 100%;
}

.check-order-page .filter-radio-group {
  display: flex;
  flex-wrap: wrap;
  row-gap: 8px;
}

.check-order-page .action-btn {
  min-width: 96px;
}

.check-order-page .check-toolbar {
  align-items: center;
}

.check-order-page .check-toolbar-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.check-order-page .smart-selected-count {
  color: #48658b;
  font-size: 14px;
}

.check-order-page.is-en .action-btn {
  min-width: 110px;
}

.check-order-page.is-en .el-form-item__label {
  white-space: nowrap;
}

.check-order-page.is-en .filter-item-actions .el-form-item__content {
  margin-left: 170px !important;
}

@media (max-width: 1600px) {
  .check-order-page .filter-item {
    width: calc(33.33% - 11px);
  }
}

@media (max-width: 1200px) {
  .check-order-page .filter-item {
    width: calc(50% - 8px);
  }
}

@media (max-width: 768px) {
  .check-order-page .filter-item,
  .check-order-page .filter-item-actions {
    width: 100%;
  }
}

.check-order-page .el-statistic__content {
  font-size: 14px;
  white-space: nowrap;
}

.check-order-page .el-table .vertical-top-cell {
  vertical-align: top
}

.check-order-page .el-table .smart-audit-row {
  color: #f5222d;
  background: #fff7f7;
}

.smart-check-dialog .el-dialog__body {
  padding-top: 8px;
}

.smart-check-report {
  min-height: 560px;
}

.smart-report-subtitle {
  margin-bottom: 22px;
  color: #48658b;
  font-size: 16px;
}

.smart-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

.smart-summary-card {
  border: 1px solid #dce5ef;
  border-radius: 8px;
  padding: 18px 24px;
  background: #f8fbff;
}

.smart-summary-card.shortage {
  border-color: #ffd8d8;
  background: #fff3f3;
  color: #f5222d;
}

.smart-summary-card.surplus {
  border-color: #d7f2df;
  background: #f0fff5;
  color: #00a64f;
}

.smart-summary-card.matched {
  color: #111827;
}

.smart-summary-card .summary-label {
  margin-bottom: 8px;
  font-size: 15px;
}

.smart-summary-card .summary-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
}

.smart-report-table .smart-report-shortage {
  color: #f5222d;
}

.smart-report-table .smart-report-surplus {
  color: #00a64f;
}

.smart-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 900px) {
  .smart-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
