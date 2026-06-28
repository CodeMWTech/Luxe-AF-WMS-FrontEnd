<template>
  <el-drawer :model-value="show" :title="tr('商品选择')" @close="handleCancelClick" :size="size" :close-on-click-modal="false" append-to-body class="sku-select-drawer">
        <el-form :inline="true" label-width="68px" @submit.prevent :model="query" ref="queryRef">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item :label="tr('商品名称')">
                <el-input v-model="query.itemName" clearable :placeholder="tr('商品名称')" @keyup.enter.prevent="loadAll"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="SKU">
                <el-input class="w200" v-model="query.skuCode" clearable :placeholder="tr('SKU查询')" @keyup.enter.prevent="handleSkuEnter"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-button type="primary" icon="Search" @click="loadAll">{{ tr('查询') }}</el-button>
              <el-button icon="Refresh" @click="resetQuery">{{ tr('重置') }}</el-button>
            </el-col>
          </el-row>
        </el-form>
            <el-table :data="list" @selection-change="handleSelectionChange" border :row-key="getRowKey" :empty-text="tr('暂无商品')" v-loading="loading" ref="skuSelectFormRef" cell-class-name="my-cell sku-select-cell">
              <el-table-column type="selection" width="55" :reserve-selection="true" v-if="!singleSelect" :selectable="judgeSelectable"/>
              <el-table-column :label="tr('商品信息')" prop="itemId" min-width="150" show-overflow-tooltip>
                <template #default="{ row }">
                  <div>{{ row.item?.itemName || '-' }}</div>
                  <div v-if="row.item?.itemBrand && getBrandName(row.item.itemBrand)">{{ tr('品牌：') }}{{ getBrandName(row.item.itemBrand) }}</div>
                </template>
              </el-table-column>
              <el-table-column :label="tr('SKU编号')" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <div v-if="row.itemSku.skuCode">{{ row.itemSku.skuCode }}</div>
                </template>
              </el-table-column>
              <el-table-column :label="tr('备注')" min-width="120" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.item?.remark || '-' }}
                </template>
              </el-table-column>
              <el-table-column :label="tr('价格(元)')" min-width="100" align="left" class-name="price-col">
                <template #default="{ row }">
                  <div v-if="row.itemSku.costPrice || row.itemSku.costPrice === 0" class="flex-space-between price-line">
                    <span>{{ tr('成本价：') }}</span>
                    <div>{{ (row.itemSku.costPrice || row.itemSku.costPrice === 0) ? row.itemSku.costPrice : '' }}</div>
                  </div>
                  <div v-if="row.itemSku.sellingPrice || row.itemSku.sellingPrice === 0" class="flex-space-between price-line">
                    <span>{{ tr('销售价：') }}</span>
                    <div>{{ (row.itemSku.sellingPrice || row.itemSku.sellingPrice === 0) ? row.itemSku.sellingPrice : '' }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="tr('操作')" width="100" v-if="singleSelect" align="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="handleChooseSku(row)">{{ tr('选择') }}</el-button>
                </template>
              </el-table-column>
            </el-table>
    <el-row>
      <pagination v-show="total > 0" :total="total" :page-sizes="[5, 10, 20, 50]" v-model:limit="pageReq.size" v-model:page="pageReq.page"
                  @pagination="getList" class="mr10"/>
    </el-row>
    <template v-slot:footer>
      <div style="width: 100%;display: flex;justify-content: space-between">
        <span>
          <el-button @click="goCreateItem" icon="Plus">{{ tr('创建商品') }}</el-button>
          <el-button @click="loadAll" icon="Refresh">{{ tr('刷新') }}</el-button>
        </span>
        <span>
          <el-button @click="handleCancelClick">{{ tr('取消') }}</el-button>
          <el-button type="primary" @click="handleOkClick" v-if="!singleSelect">{{ tr('确认') }}</el-button>
      </span>
      </div>
    </template>
  </el-drawer>
</template>
<script setup lang="ts" name="SkuSelect">
/* eslint-disable */
// @ts-nocheck
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, watch} from 'vue';
import { ElMessage } from "element-plus";
import {listItemSkuPage} from "@/api/wms/itemSku";
import {useRouter} from "vue-router";
import {useWmsStore} from '@/store/modules/wms'
import { translateByMap } from '@/locales/runtime-map'
import useSettingsStore from '@/store/modules/settings'

const { proxy } = getCurrentInstance()

const router = useRouter()
const loading = ref(false)
const settingsStore = useSettingsStore()
const tr = (text: string) => translateByMap(text, settingsStore.language || 'zh-cn')
const deptOptions = ref([]);
const query = reactive({
  itemName: '',
  skuCode: ''
});
const queryRef = ref(null)
const selectItemSkuVoCheck = ref([])
const skuSelectFormRef = ref(null)
const total = ref(0);
const pageReq = reactive({
  page: 1,
  size: 10,
});
const list = ref([]);
const rightList = ref([]);
const wmsStore = useWmsStore()
const getBrandName = (brandId: any) => {
  if (brandId === null || brandId === undefined) return ''
  return wmsStore.itemBrandMap.get(brandId)?.brandName || ''
}
const normalizeSkuRow = (raw: any) => {
  const skuId = raw?.skuId ?? raw?.id ?? raw?.itemSkuId
  const itemSku = raw?.itemSku || {
    skuCode: raw?.skuCode,
    barcode: raw?.barcode,
    costPrice: raw?.costPrice,
    sellingPrice: raw?.sellingPrice
  }
  const item = raw?.item || {
    id: raw?.itemId,
    itemName: raw?.itemName,
    itemBrand: raw?.itemBrand,
    remark: raw?.remark
  }
  return {
    ...raw,
    skuId,
    id: skuId,
    itemSku,
    item
  }
}
const rightListKeySet = computed(() => {
  const set = new Set();
  rightList.value.forEach((it) => set.add(it.id));
  return set
});

const loadAll = () => {
  pageReq.page = 1
  return getList()
};

const buildSkuQueryParams = (extra = {}) => {
  const data = {
    ...query,
    ...extra,
    pageNum: pageReq.page,
    pageSize: pageReq.size
  }
  if (props.onlyShipped) {
    data.onlyShipped = true
  }
  return data
}

const resetQuery = () => {
  proxy?.resetForm('queryRef')
  query.itemName = ''
  query.skuCode = ''
  loadAll()
}

/** SKU 输入框回车 */
async function handleSkuEnter() {
  if (!props.scanMode) {
    loadAll()
    return
  }
  const skuCode = query.skuCode?.trim()
  if (!skuCode) return
  loading.value = true
  try {
    const res = await listItemSkuPage({
      ...buildSkuQueryParams({
        itemName: undefined,
        skuCode,
        skuCodeExact: true
      }),
      pageNum: 1,
      pageSize: 10
    })
    const rows = Array.isArray(res?.rows) ? res.rows : []
    if (!rows.length) {
      ElMessage.warning(tr('未找到该SKU'))
      return
    }

    const normalizedRows = rows.map((it) => normalizeSkuRow(it))
    const pickedRow = normalizedRows[0]
    const normalized = { ...pickedRow, checked: false }

    if (!props.selectedSku.find(selected => selected.id === normalized.id)) {
      // 与当前表格选择方式保持一致，先自动勾选再走确认逻辑
      skuSelectFormRef.value?.toggleRowSelection(normalized, true)
    }
    selectItemSkuVoCheck.value = [normalized]
    // 顺序保证：先确认，再刷新
    await Promise.resolve(handleOkClick())
    query.skuCode = ''
    // 等待父组件同步 selectedSku 后再刷新，避免“已加载/禁用”状态丢失
    await nextTick()
    await Promise.resolve(loadAll())

  } finally {
    loading.value = false
  }
}
const getRowKey = (row: any) => {
  return row.id;
}
const normalizeSkuKey = (id: any) => {
  if (id === null || id === undefined) return ''
  return String(id)
}
const getLoadedSkuIdSet = () => {
  return new Set((props.selectedSku || []).map((it) => normalizeSkuKey(it.id)))
}

const markLoadedItems = (rows = []) => {
  const selectedIdSet = getLoadedSkuIdSet()
  return rows.map((it) => ({
    ...it,
    id: it.skuId,
    isLoaded: selectedIdSet.has(normalizeSkuKey(it.skuId)),
    checked: selectedIdSet.has(normalizeSkuKey(it.skuId))
  }))
}

const getList = () => {
  const data = buildSkuQueryParams()
  loading.value = true
  return listItemSkuPage(data).then((res) => {
    const content = Array.isArray(res?.rows) ? res.rows.map((it) => normalizeSkuRow(it)) : []
    list.value = markLoadedItems(content);
    total.value = Number(res?.total) || 0;
  }).then(() => toggleSelection()).finally(() => loading.value = false);
}
const goCreateItem = () => {
  // 跳转到商品管理页面，并自动打开“新增商品”抽屉
  const data = router.resolve({ path: '/basic/item', query: { openDrawer: true } })
  window.open(data.href, '_blank')
}
// 定义props
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
  singleSelect:{
    type: Boolean,
    default: false
  },
  selectedSku: {
    type: Array,
    default: []
  },
  warehouseId: {
    type: [String, Number],
    default: undefined
  },
  onlyShipped: {
    type: Boolean,
    default: false
  }
})

const show = computed(() => {
  return props.modelValue;
})

onMounted(() => {
  if (!wmsStore.itemBrandList.length) {
    wmsStore.getItemBrandList()
  }
})

// 每次打开抽屉时清空查询条件并重新拉取，便于看到全部商品
watch(show, (visible) => {
  if (visible) {
    query.itemName = ''
    query.skuCode = ''
    pageReq.page = 1
    getList()
  }
})

watch(() => props.onlyShipped, () => {
  if (show.value) {
    loadAll()
  }
})

watch(() => props.selectedSku, () => {
  // 已存在商品集合变化后，对当前列表执行一次全量状态回填
  list.value = markLoadedItems(list.value || [])
}, { deep: true })

// 定义事件
const emit = defineEmits<{
  (e: 'handleCancelClick')
  (e: 'handleOkClick', value)
  (e: 'handleSingleOkClick', value)
}>()

function handleCancelClick() {
  emit('handleCancelClick');
  clearQuantity()
}

function handleChooseSku(row) {
  emit('handleSingleOkClick', row);
}

function handleOkClick() {
  emit('handleOkClick', selectItemSkuVoCheck.value);
  clearQuantity()
}
/** 多选框选中数据 */
const handleSelectionChange = (selection) => {
  selectItemSkuVoCheck.value = selection
}

const toggleSelection = () => {
  props.selectedSku.forEach(selected => {
    const index = list.value.findIndex(it => normalizeSkuKey(it.skuId) === normalizeSkuKey(selected.id))
    if (index !== -1) {
      skuSelectFormRef.value.toggleRowSelection(list.value[index], true)
    }
  })
}

const judgeSelectable = (row) => {
  if (row.isLoaded || getLoadedSkuIdSet().has(normalizeSkuKey(row.skuId))) {
    return false;
  }
  return true
}


function clearQuantity() {
  skuSelectFormRef.value.clearSelection()
}

defineExpose({
  getList
})
</script>
<style lang="scss">
.sku-select-drawer .el-drawer__header {
  margin-bottom: 8px;
  padding: 12px 14px 0;
}

.sku-select-drawer .el-drawer__body {
  padding: 8px 14px 12px;
}

.sku-select-drawer .el-form-item {
  margin-bottom: 8px;
}

.sku-select-drawer .el-table .el-table__cell {
  padding: 8px 0;
}

.sku-select-drawer .sku-select-cell {
  vertical-align: top
}

.sku-select-drawer .price-col .cell {
  font-size: 13px;
}

.sku-select-drawer .price-line {
  min-height: 22px;
}
</style>
