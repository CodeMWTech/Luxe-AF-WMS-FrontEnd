<template>
  <el-drawer :model-value="show" title="选择库存" @close="handleCancelClick" :size="size" :close-on-click-modal="false"
             append-to-body class="inventory-select-drawer">
    <el-form :inline="true" label-width="68px" @submit.prevent :model="query" ref="queryRef">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="商品名称">
            <el-input v-model="query.itemName" clearable placeholder="商品名称" @keyup.enter.prevent="loadAll"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="SKU">
            <el-input
              class="w200"
              v-model="query.skuCode"
              clearable
              placeholder="SKU查询"
              @keyup.enter.prevent="handleSkuEnter"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-button type="primary" icon="Search" @click="loadAll">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-col>
      </el-row>
    </el-form>
    <el-table :data="list" @selection-change="handleSelectionChange" border :row-key="getRowKey" empty-text="暂无库存"
              v-loading="loading" ref="inventorySelectFormRef" cell-class-name="my-cell inventory-select-cell" class="mt20">
      <el-table-column type="selection" width="55" :reserve-selection="true" :selectable="judgeSelectable"/>
      <el-table-column label="商品信息" prop="itemId">
        <template #default="{ row }">
          <div>{{
            (getRowItemName(row) || '-')
          }}</div>
        </template>
      </el-table-column>
      <el-table-column label="SKU编号">
        <template #default="{ row }">
          <div>{{ getRowSkuCode(row) || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="剩余库存" prop="quantity" align="right">
        <template #default="{ row }">
          <el-statistic :value="Number(row.quantity)" :precision="0"/>
        </template>
      </el-table-column>
    </el-table>
    <el-row>
      <pagination
        v-show="total>0"
        :total="total"
        v-model:limit="pageReq.size"
        v-model:page="pageReq.page"
        @pagination="getList"
        class="mr10"
      />
    </el-row>

    <template v-slot:footer>
      <div style="width: 100%;display: flex;justify-content: space-between">
        <span>
          <el-button @click="loadAll" icon="Refresh">刷新</el-button>
        </span>
        <span>
          <el-button @click="handleCancelClick">取消</el-button>
          <el-button type="primary" @click="handleOkClick">确认</el-button>
      </span>
      </div>
    </template>
  </el-drawer>
</template>
<script setup name="InventorySelect">
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, watch} from 'vue';
import {useWmsStore} from '@/store/modules/wms'
import {listInventory} from "@/api/wms/inventory";
import {getWarehouseAndSkuKey} from "@/utils/wmsUtil";
import { ElMessage } from "element-plus";

const {proxy} = getCurrentInstance()

const loading = ref(false)
const wmsStore = useWmsStore()
const getBrandName = (brandId) => {
  if (brandId === null || brandId === undefined) return ''
  return wmsStore.itemBrandMap.get(brandId)?.brandName || ''
}

/** boardList/warehouse 多在根字段返回 itemName、skuCode；部分接口嵌套 item/itemSku，两处都兼容 */
function getRowItemName(row) {
  return row?.itemName
}
function getRowSkuCode(row) {
  return row?.skuCode
}
const deptOptions = ref([]);
const query = reactive({
  itemName: '',
  skuCode: '',
  minQuantity: 1,
  areaId: null,
  warehouseId: null
});
const queryRef = ref(null)
const selectInventoryVoCheck = ref([])
const inventorySelectFormRef = ref(null)
const total = ref(0);
const pageReq = reactive({
  page: 1,
  size: 10,
});
const list = ref([]);
const rightList = ref([]);
const rightListKeySet = computed(() => {
  const set = new Set();
  rightList.value.forEach((it) => set.add(it.id));
  return set
});

const editableList = computed(() => {
  return list.value.filter((it) => !rightListKeySet.value.has(it.id));
});

const loadAll = () => {
  pageReq.page = 1
  return getList()
};
const resetQuery = () => {
  proxy?.resetForm('queryRef')
  query.itemName = ''
  query.skuCode = ''
  loadAll()
}
const getRowKey = (row) => {
  return row.id;
}
const getLoadedInventoryKeySet = () => {
  return new Set((props.selectedInventory || []).map((it) => getWarehouseAndSkuKey(it)))
}

const markLoadedItems = (rows = []) => {
  const loadedKeySet = getLoadedInventoryKeySet()
  return rows.map((item) => {
    const key = getWarehouseAndSkuKey(item)
    const isLoaded = loadedKeySet.has(key)
    return {
      ...item,
      warehouseName: useWmsStore().warehouseMap.get(item.warehouseId)?.warehouseName,
      isLoaded,
      checked: isLoaded
    }
  })
}

const getList = () => {
  const data = {
    ...query,
    pageNum: pageReq.page,
    pageSize: pageReq.size
  }
  loading.value = true
  return listInventory(data).then((res) => {
    const content = [...res.rows];
    list.value = markLoadedItems(content);
    total.value = res.total;
  }).then(() => toggleSelection()).finally(() => loading.value = false);
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 扫码枪模式：true 时，SKU 回车只添加商品不关闭抽屉
  scanMode: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: '30%'
  },
  selectedInventory: {
    type: Array,
    default: []
  }
})

const show = computed(() => {
  return props.modelValue;
})

const emit = defineEmits(["handleCancelClick", 'handleOkClick']);

// SKU 输入框回车：扫码枪模式执行“选中 -> 确认 -> 刷新”
async function handleSkuEnter() {
  if (!props.scanMode) {
    loadAll()
    return
  }
  const skuCode = query.skuCode?.trim()
  if (!skuCode) return
  loading.value = true
  try {
    const res = await listInventory({
      itemName: undefined,
      skuCode,
      skuCodeExact: true,
      minQuantity: query.minQuantity,
      areaId: query.areaId,
      warehouseId: query.warehouseId,
      pageNum: 1,
      pageSize: 10
    })
    const rows = res.rows || []
    if (!rows.length) {
      ElMessage.warning('未找到该SKU')
      return
    }
    const pickedRow = rows[0]
    if (!props.selectedInventory.find(selected => getWarehouseAndSkuKey(selected) === getWarehouseAndSkuKey(pickedRow))) {
      inventorySelectFormRef.value?.toggleRowSelection(pickedRow, true)
    }
    selectInventoryVoCheck.value = [pickedRow]
    await Promise.resolve(handleOkClick())
    query.skuCode = ''
    await nextTick()
    await Promise.resolve(loadAll())
  } finally {
    loading.value = false
  }
}

function handleCancelClick() {
  emit('handleCancelClick');
  clearSelected()
}

function handleOkClick() {
  emit('handleOkClick', selectInventoryVoCheck.value);
  clearSelected()
}

/** 多选框选中数据 */
const handleSelectionChange = (selection) => {
  selectInventoryVoCheck.value = selection
}

const toggleSelection = () => {
  props.selectedInventory.forEach(selected => {
    const index = list.value.findIndex(it => getWarehouseAndSkuKey(selected) === getWarehouseAndSkuKey(it))
    if (index !== -1) {
      inventorySelectFormRef.value.toggleRowSelection(list.value[index], true)
    }
  })
}

function clearSelected() {
  inventorySelectFormRef.value.clearSelection()
}

const judgeSelectable = (row) => {
  if (row.isLoaded || props.selectedInventory.find(selected => getWarehouseAndSkuKey(selected) === getWarehouseAndSkuKey(row))) {
    return false;
  }
  return true
}

const setWarehouseId = (warehouseId = null) => {
  query.warehouseId = warehouseId
}

defineExpose({
  setWarehouseId,
  getList
})
onMounted(() => {
  if (!wmsStore.itemBrandList.length) {
    wmsStore.getItemBrandList()
  }
  loadAll();
})

watch(() => props.selectedInventory, () => {
  list.value = markLoadedItems(list.value || [])
}, {deep: true})
</script>
<style lang="scss">
.inventory-select-drawer .el-drawer__header {
  margin-bottom: 8px;
  padding: 12px 14px 0;
}

.inventory-select-drawer .el-drawer__body {
  padding: 8px 14px 12px;
}

.inventory-select-drawer .el-form-item {
  margin-bottom: 8px;
}

.inventory-select-drawer .el-table .el-table__cell {
  padding: 8px 0;
}

.inventory-select-drawer .inventory-select-cell {
  vertical-align: top
}

.inventory-select-drawer .el-statistic__content {
  font-size: 14px;
}
</style>
