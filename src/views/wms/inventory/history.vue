<template>
  <div class="app-container inventory-history-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form
        :model="queryParams"
        ref="queryRef"
        :label-width="formLabelWidth"
        class="filter-form"
        @submit.prevent="handleQuery"
      >
        <el-form-item class="filter-item filter-item-full" :label="tr('订单类型')" prop="orderType">
          <el-radio-group v-model="queryParams.orderType" @change="handleQuery" class="order-type-group">
            <el-radio-button
              :key="-1"
              :label="-1"
            >
              {{ tr('全部') }}
            </el-radio-button>
            <el-radio-button
              v-for="item in translatedHistoryTypeOptions"
              :key="item.value"
              :label="item.value"
            >
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item class="filter-item" :label="tr('仓库')" prop="warehouseId">
          <el-select style="width: 100%" v-model="queryParams.warehouseId" :placeholder="tr('请选择仓库')"
                     filterable clearable>
            <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName"
                       :value="item.id"/>
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item" :label="tr('操作单号')" prop="orderNo">
          <el-input v-model="queryParams.orderNo" clearable :placeholder="tr('请输入操作单号')"></el-input>
        </el-form-item>

        <el-form-item class="filter-item" :label="tr('商品名称')" prop="itemName">
          <el-input v-model="queryParams.itemName" clearable :placeholder="tr('请输入商品名称')"></el-input>
        </el-form-item>
        <el-form-item class="filter-item" :label="tr('SKU编号')" prop="skuCode">
          <el-input v-model="queryParams.skuCode" clearable :placeholder="tr('请输入SKU编号')"></el-input>
        </el-form-item>
        <el-form-item class="filter-item filter-item-time" :label="tr('操作时间')" prop="createTimeRange">
          <el-date-picker
            v-model="queryParams.createTimeRange"
            type="datetimerange"
            :range-separator="tr('至')"
            format="MM/DD/YYYY HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            :start-placeholder="tr('开始时间')"
            :end-placeholder="tr('结束时间')"
          />
        </el-form-item>
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" native-type="submit">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" class="action-btn" native-type="button" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="6"><span style="font-size: large">{{ tr('库存记录') }}</span></el-col>
      </el-row>
      <el-table v-loading="loading" :data="inventoryHistoryList" border class="mt20" :empty-text="tr('暂无库存记录')" cell-class-name="vertical-top-cell">
        <el-table-column :label="tr('操作单号')" prop="orderNo" width="220" show-overflow-tooltip header-class-name="nowrap-header" class-name="nowrap-cell"/>
        <el-table-column :label="tr('商品名称')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.item.itemName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('SKU编号')" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.itemSku?.skuCode">{{ row.itemSku.skuCode }}</div>
            <div v-else>-</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('订单类型')" align="center" min-width="120">
          <template #default="{ row }">
            <dict-tag :options="translatedHistoryTypeOptions" :value="row.orderType"/>
          </template>
        </el-table-column>
        <el-table-column :label="tr('仓库')" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ useWmsStore().warehouseMap.get(row.warehouseId)?.warehouseName }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('操作前')" align="right" min-width="110">
          <template #default="{ row }">
            <div >
              <el-statistic :value="Number(row.beforeQuantity)" :precision="0" v-if="row.beforeQuantity"/>
              <span v-else>-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('操作后')" align="right" min-width="110">
          <template #default="{ row }">
            <div>
              <el-statistic :value="Number(row.afterQuantity)" :precision="0" v-if="row.afterQuantity"/>
              <span v-else>-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('数量/金额($USD)')" min-width="180">
          <template #default="{ row }">
            <div class="flex-space-between">
              <div>{{ tr('数量：') }}</div>
              <el-statistic :value="Number(row.quantity)" :precision="0"/>
            </div>
            <div class="flex-space-between" v-if="row.amount || row.amount === 0">
              <div>{{ tr('金额：') }}</div>
              <el-statistic :value="Number(row.amount)" :precision="2"/>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('操作时间')" prop="createTime" min-width="180">
          <template #default="{ row }">{{ formatLosAngelesTime(row.createTime) }}</template>
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

<script setup name="InventoryHistory">
import {listInventoryHistory} from "@/api/wms/inventoryHistory";
import {computed, getCurrentInstance, onMounted, reactive, ref} from "vue";
import {useWmsStore} from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { formatDateTimeForQuery, formatLosAngelesTime } from '@/utils/laTime'
const defaultTime = reactive([new Date(2000,0,1,0,0,0), new Date(2000,0,1,23,59,59)])
const {proxy} = getCurrentInstance();
const {wms_inventory_history_type} = proxy.useDict('wms_inventory_history_type');
const settingsStore = useSettingsStore()

const inventoryHistoryList = ref([]);
const loading = ref(true);
const total = ref(0);
const queryRef = ref(null)
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  orderType: -1,
  orderNo: undefined,
  itemName: undefined,
  skuCode: undefined,
  createTimeRange: [],
  warehouseId: undefined,
})

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const formLabelWidth = computed(() => (isEn.value ? '120px' : '80px'))

const translatedHistoryTypeOptions = computed(() => {
  return (wms_inventory_history_type.value || []).map(item => ({
    ...item,
    label: tr(item.label)
  }))
})

/** 查询往来单位列表 */
function getList() {
  const query = {...queryParams.value}
  if (query.orderType === -1) {
    query.orderType = null
  }
  if (query.createTimeRange && query.createTimeRange.length === 2) {
    query.startTime = formatDateTimeForQuery(query.createTimeRange[0])
    query.endTime = formatDateTimeForQuery(query.createTimeRange[1])
  }
  loading.value = true;
  listInventoryHistory(query).then(response => {
    inventoryHistoryList.value = response.rows;
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

onMounted(() => {
  useWmsStore().getWarehouseList()
  getList()
})
</script>
<style lang="scss">
.inventory-history-page .filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
}

.inventory-history-page .filter-item {
  width: calc(25% - 12px);
  margin-right: 0;
}

.inventory-history-page .filter-item-full {
  width: 100%;
}

.inventory-history-page .filter-item-time {
  width: calc(50% - 8px);
}

.inventory-history-page .filter-item-actions {
  width: 100%;
}

.inventory-history-page .order-type-group {
  display: flex;
  flex-wrap: wrap;
  row-gap: 8px;
}

.inventory-history-page .action-btn {
  min-width: 96px;
}

.inventory-history-page.is-en .action-btn {
  min-width: 110px;
}

@media (max-width: 1600px) {
  .inventory-history-page .filter-item {
    width: calc(33.33% - 11px);
  }

  .inventory-history-page .filter-item-time {
    width: calc(66.66% - 6px);
  }
}

@media (max-width: 1200px) {
  .inventory-history-page .filter-item,
  .inventory-history-page .filter-item-time {
    width: calc(50% - 8px);
  }
}

@media (max-width: 768px) {
  .inventory-history-page .filter-item,
  .inventory-history-page .filter-item-time,
  .inventory-history-page .filter-item-actions {
    width: 100%;
  }
}

.inventory-history-page .el-statistic__content {
  font-size: 14px;
  white-space: nowrap;
}

.inventory-history-page .flex-space-between {
  gap: 8px;
  flex-wrap: nowrap;
}

.inventory-history-page .el-table .vertical-top-cell {
  vertical-align: top
}

.inventory-history-page .el-table .nowrap-header .cell,
.inventory-history-page .el-table .nowrap-cell .cell {
  white-space: nowrap;
}
</style>
