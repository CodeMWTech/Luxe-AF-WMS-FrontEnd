<template>
  <div class="app-container check-order-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :label-width="formLabelWidth" class="filter-form" @submit.prevent>
        <el-form-item class="filter-item filter-item-full" :label="tr('盘库状态')" prop="orderStatus" :label-width="isEn ? '170px' : undefined">
          <el-radio-group v-model="queryParams.orderStatus" @change="handleQuery" class="filter-radio-group">
            <el-radio-button
              :key="-2"
              :label="-2"
            >
              {{ tr('全部') }}
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
        <el-form-item class="filter-item" :label="tr('盘库单号')" prop="orderNo" :label-width="isEn ? '170px' : undefined">
          <el-input
            v-model="queryParams.orderNo"
            :placeholder="tr('请输入盘库单号')"
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
        <el-col :span="6"><span style="font-size: large">{{ tr('盘库单') }}</span></el-col>
        <el-col :span="1.5">
          <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['wms:check:edit']"
          >{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="checkOrderList" border class="mt20"
                :row-key="getRowKey"
                :empty-text="tr('暂无盘库单')"
                cell-class-name="vertical-top-cell"
      >
        <el-table-column :label="tr('单号')" align="left" prop="orderNo" min-width="180" show-overflow-tooltip />
        <el-table-column :label="tr('仓库')" align="left" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().warehouseMap.get(row.warehouseId)?.warehouseName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('盘库状态')" align="center" prop="orderStatus" min-width="90">
          <template #default="{ row }">
            <dict-tag :options="translatedCheckStatusOptions" :value="row.orderStatus" />
          </template>
        </el-table-column>
        <el-table-column :label="tr('盈亏数')" align="right" min-width="120">
          <template #default="{ row }">
            <el-statistic :value="Number(row.totalQuantity)" :precision="0"/>
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
                :content="'盘库单【' + scope.row.orderNo + '】已' + (scope.row.orderStatus === 1 ? '盘库完成' : '作废') + '，无法修改！' "
              >
                <template #reference>
                  <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['wms:check:edit']" :disabled="[-1, 1].includes(scope.row.orderStatus)">{{ tr('修改') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handleGoDetail(scope.row)" v-hasPermi="['wms:check:all']">{{ tr('查看') }}</el-button>
            </div>
            <div class="mt10">
              <el-popover
                placement="left"
                :title="tr('提示')"
                :width="300"
                trigger="hover"
                :disabled="[-1, 0].includes(scope.row.orderStatus)"
                :content="'盘库单【' + scope.row.orderNo + '】已盘库完成，无法删除！' "
              >
                <template #reference>
                  <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['wms:check:edit']" :disabled="scope.row.orderStatus === 1">{{ tr('删除') }}</el-button>
                </template>
              </el-popover>
              <el-button link type="primary" @click="handlePrint(scope.row)" v-hasPermi="['wms:check:all']">{{ tr('打印') }}</el-button>
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
  </div>
</template>

<script setup name="CheckOrder">
import {listCheckOrder, delCheckOrder, getCheckOrder} from "@/api/wms/checkOrder";
import {listByCheckOrderId} from "@/api/wms/checkOrderDetail";
import {computed, getCurrentInstance, onMounted, reactive, ref, toRefs} from "vue";
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
const { queryParams } = toRefs(data);
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => '80px')
const translatedCheckStatusOptions = computed(() => (wms_check_status.value || []).map(it => ({ ...it, label: tr(it.label) })))
const wmsStore = useWmsStore()

/** 查询入库单列表 */
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
  proxy.$router.push({ path: "/checkOrderEdit" });
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _ids = row.id || ids.value;
  proxy.$modal.confirm('确认删除【盘库单【' + row.orderNo + '】吗？').then(function() {
    loading.value = true;
    return delCheckOrder(_ids);
  }).then(() => {
    proxy.$modal.msgSuccess("删除成功");
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

/** 导出按钮操作 */
async function handlePrint(row) {
  const res = await getCheckOrder(row.id)
  const checkOrder = res.data
  let table = []
  if (checkOrder.details?.length) {
    table = checkOrder.details.map(detail => {
      return {
        itemName: detail.item.itemName,
        skuCode: detail.itemSku.skuCode,
        quantity: Number(detail.quantity).toFixed(0),
        profitAndLoss: Number(detail.checkQuantity - detail.quantity).toFixed(0),
        checkQuantity: Number(detail.checkQuantity).toFixed(0)
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
</style>
