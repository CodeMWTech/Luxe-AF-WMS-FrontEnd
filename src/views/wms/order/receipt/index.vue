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
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">

      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="6"><span style="font-size: large">{{ tr('入库单') }}</span></el-col>
        <el-col :span="1.5">
          <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['wms:receipt:edit']"
          >{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="receiptOrderList" border class="mt20"
                @expand-change="handleExpandExchange"
                :row-key="getRowKey"
                :expand-row-keys="expandedRowKeys"
                :empty-text="tr('暂无入库单')"
                cell-class-name="vertical-top-cell"
      >
        <el-table-column type="expand">
          <template #default="props">
            <div style="padding: 0 50px 20px 50px">
              <h3>{{ tr('商品明细') }}</h3>
              <el-table :data="props.row.details" v-loading="detailLoading[props.$index]" :empty-text="tr('暂无商品明细')">
                <el-table-column :label="tr('商品名称')">
                  <template #default="{ row }">
                    <div>{{ row?.item?.itemName }}</div>
                  </template>
                </el-table-column>
                <el-table-column :label="tr('SKU编号')">
                  <template #default="{ row }">
                    <div>{{ row?.itemSku?.skuCode }}</div>
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
        <el-table-column :label="tr('操作')" align="right" class-name="small-padding fixed-width" width="120">
          <template #default="scope">
            <div>
              <el-popover
                placement="left"
                :title="tr('提示')"
                :width="300"
                trigger="hover"
                :disabled="scope.row.orderStatus === 0"
                :content="'入库单【' + scope.row.orderNo + '】已' + (scope.row.orderStatus === 1 ? '入库' : '作废') + '，无法修改！' "
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
                :content="'入库单【' + scope.row.orderNo + '】已入库，无法删除！' "
              >
                <template #reference>
                  <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['wms:receipt:edit']" :disabled="scope.row.orderStatus === 1">{{ tr('删除') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handlePrint(scope.row)" v-hasPermi="['wms:receipt:all']">{{ tr('打印') }}</el-button>
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
import {delReceiptOrder, getReceiptOrder, listReceiptOrder} from "@/api/wms/receiptOrder";
import {computed, getCurrentInstance, onMounted, reactive, ref, toRefs} from "vue";
import {useWmsStore} from "../../../../store/modules/wms";
import {listByReceiptOrderId} from "@/api/wms/receiptOrderDetail";
import {ElMessageBox} from "element-plus";
import receiptPanel from "@/components/PrintTemplate/receipt-panel";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

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
const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: undefined,
    optType: -1,
    merchantId: undefined,
    totalAmount: undefined,
    orderStatus: -2,
  },
});

const { queryParams } = toRefs(data);

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => '80px')
const translatedReceiptStatusOptions = computed(() => (wms_receipt_status.value || []).map(it => ({ ...it, label: tr(it.label) })))
const translatedReceiptTypeOptions = computed(() => (wms_receipt_type.value || []).map(it => ({ ...it, label: tr(it.label) })))
const wmsStore = useWmsStore()

/** 查询入库单列表 */
function getList() {
  loading.value = true;
  const query = {...queryParams.value}
  query.orderNo = query.orderNo?.trim() || undefined
  if (query.orderStatus === -2) {
    query.orderStatus = null
  }
  if (query.optType === -1) {
    query.optType = null
  }
  listReceiptOrder(query).then(response => {
    receiptOrderList.value = response.rows;
    total.value = response.total;
    for (let i = 0; i < total; i++) {
      detailLoading.value.push(false)
    }
    expandedRowKeys.value = []
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

function handleGoDetail(row) {
  const index = expandedRowKeys.value.indexOf(row.id)
  if (index !== -1) {
    // 收起
    expandedRowKeys.value.splice(index, 1)
  } else {
    // 展开
    expandedRowKeys.value.push(row.id)
    loadReceiptOrderDetail(row)
  }
}

/** 导出按钮操作 */
async function handlePrint(row) {
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
  detailLoading.value[index] = true
  listByReceiptOrderId(row.id).then(res => {
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

onMounted(() => {
  initLookupOptions()
  getList()
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

.receipt-order-page .el-table .vertical-top-cell {
  vertical-align: top
}
</style>
