<template>
  <el-drawer :model-value="show" :title="'盘库单【' + orderNo + '】的盘点结果明细'" @close="handleCancelClick" :size="size" :close-on-click-modal="false"
             append-to-body>
    <div class="flex-space-between">
      <div></div>
      <el-checkbox v-model="queryParams.haveProfitAndLoss" label="只查看有差额的" @change="handleQuery"/>
    </div>
    <el-table :data="list" border empty-text="暂无商品明细" v-loading="loading" ref="inventorySelectFormRef"
              cell-class-name="my-cell" class="mt20">
      <el-table-column label="商品名称">
        <template #default="{ row }">
          <div>{{ getItemName(row) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="SKU编号">
        <template #default="{ row }">
          <div>{{ getSkuCode(row) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="盘点到的库存" prop="countedQuantity" align="right">
        <template #default="{ row }">
          <el-statistic :value="Number(getCountedQuantity(row))" :precision="0"/>
        </template>
      </el-table-column>
      <el-table-column label="实际库存" prop="actualQuantity" align="right">
        <template #default="{ row }">
          <el-statistic :value="Number(getActualQuantity(row))" :precision="0"/>
        </template>
      </el-table-column>
      <el-table-column label="差额" prop="differenceDisplay" align="right">
        <template #default="{ row }">
          <span :class="getDifferenceClass(row)">{{ getDifferenceDisplay(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="memo" prop="memo" min-width="220">
        <template #default="{ row }">
          <span>{{ row.memo }}</span>
        </template>
      </el-table-column>
    </el-table>
    <el-row>
      <pagination
        v-show="total>0"
        :total="total"
        v-model:limit="queryParams.pageSize"
        v-model:page="queryParams.pageNum"
        @pagination="getList"
        class="mr10"
      />
    </el-row>
  </el-drawer>

</template>

<script setup>
import {computed, ref} from "vue";
import {listByCheckOrderId} from "@/api/wms/checkOrderDetail";

const list = ref([]);
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: '80%'
  },
  orderNo: {
    type: String,
    default: ''
  }
})
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  orderId: null,
  haveProfitAndLoss: false,
});
const total = ref(0)
const loading = ref(false)
const show = computed(() => {
  return props.modelValue;
})
const emit = defineEmits(["handleCancelClick"]);

function setCheckOrderId(orderId) {
  queryParams.value.orderId = orderId
}

defineExpose({
  handleQuery,
  setCheckOrderId
})
function handleCancelClick() {
  emit('handleCancelClick');
}



function getList() {
  if (!queryParams.value.orderId) {
    list.value = []
    total.value = 0
    return
  }
  loading.value = true;
  const {orderId, ...query} = queryParams.value
  listByCheckOrderId(orderId, query).then(response => {
    const serverRows = getResponseRows(response)
    const hasServerTotal = response?.total !== undefined || response?.data?.total !== undefined
    const rows = hasServerTotal ? serverRows : getClientPageRows(serverRows)
    list.value = rows;
    total.value = hasServerTotal ? Number(response?.total ?? response?.data?.total ?? 0) : getClientFilteredRows(serverRows).length;
  }).finally(() => loading.value = false);
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function getItemName(row) {
  return row?.itemName || row?.item?.itemName || '-'
}

function getSkuCode(row) {
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

function getDifferenceClass(row) {
  const difference = Number(row?.difference ?? (getCountedQuantity(row) - getActualQuantity(row)))
  if (difference > 0) return 'difference-profit'
  if (difference < 0) return 'difference-loss'
  return 'difference-normal'
}

function getResponseRows(response) {
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.data?.rows)) return response.data.rows
  if (Array.isArray(response?.data)) return response.data
  return []
}

function getClientFilteredRows(rows) {
  if (!queryParams.value.haveProfitAndLoss) return rows
  return rows.filter((row) => Number(row.difference ?? (getCountedQuantity(row) - getActualQuantity(row))) !== 0)
}

function getClientPageRows(rows) {
  const filteredRows = getClientFilteredRows(rows)
  const start = (queryParams.value.pageNum - 1) * queryParams.value.pageSize
  return filteredRows.slice(start, start + queryParams.value.pageSize)
}
</script>

<style lang="scss">
.el-table .my-cell {
  vertical-align: top
}

.el-statistic__content {
  font-size: 14px;
}

.difference-profit {
  color: #67c23a;
}

.difference-loss {
  color: #f56c6c;
}

.difference-normal {
  color: #606266;
}
</style>
