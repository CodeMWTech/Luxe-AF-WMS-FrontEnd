<template>
        <div class="item-list-panel">
          <div class="item-list-panel__header">
            <div class="item-list-title-wrap">
              <el-tooltip v-if="collapsed" :content="tr('展开商品分类')" placement="top">
                <el-button class="item-list-expand-btn" circle plain @click="emit('toggle-category')">
                  <el-icon><Expand /></el-icon>
                </el-button>
              </el-tooltip>
              <span class="item-list-title">{{ tr('商品列表') }}</span>
            </div>
            <div class="item-toolbar-actions">
              <el-button type="primary" plain icon="Download" @click="emit('export')" class="mb10" v-hasPermi="['wms:item:list']">{{ tr('导出Excel') }}</el-button>
              <el-button type="primary" plain icon="Upload" @click="emit('import')" class="mb10" v-hasPermi="['wms:item:import']">{{ tr('导入Excel') }}</el-button>
              <el-button plain icon="Tickets" @click="emit('import-log')" class="mb10" v-hasPermi="['wms:item:import']">{{ tr('上传日志') }}</el-button>
              <el-button type="primary" plain icon="Plus" @click="emit('add')" class="mb10" v-hasPermi="['wms:item:edit']">{{ tr('新增商品') }}</el-button>
            </div>
          </div>
          <el-table ref="itemTableRef" :data="itemList" :row-key="getItemRowKey" :span-method="spanMethod" border :empty-text="tr('暂无商品')" v-loading="loading" cell-class-name="my-cell">
            <el-table-column :label="tr('商品信息')" prop="itemId">
              <template #default="{ row }">
                <div>{{ row.item.itemName }}</div>
                <div v-if="row.item.itemBrand">
                  {{ row.item.itemBrand ? (fieldLabel('品牌') + useWmsStore().itemBrandMap.get(row.item.itemBrand)?.brandName) : '' }}
                </div>
                <div v-if="row.item.itemCategory">
                  {{ row.item.itemCategory ? (fieldLabel('分类') + useWmsStore().itemCategoryMap.get(row.item.itemCategory)?.categoryName) : '' }}
                </div>
                <div v-if="row.item.itemCondition">
                  {{ fieldLabel('成色') }}{{ row.item.itemCondition }}
                </div>
                <div v-if="row.item.year || row.item.year === 0">
                  {{ fieldLabel('年份') }}{{ row.item.year }}
                </div>
                <div v-if="row.item.materialName || row.item.material">
                  {{ fieldLabel('材质') }}{{ row.item.materialName || row.item.material }}
                </div>
                <div v-if="row.item.modelName">
                  {{ fieldLabel('包型') }}{{ row.item.modelName }}
                </div>
                <div v-if="row.item.cared !== null && row.item.cared !== undefined">
                  {{ fieldLabel('护理') }}{{ row.item.cared ? tr('已护理') : tr('未护理') }}
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="tr('供应商')" prop="item.supplierName" align="center" width="140">
              <template #default="{ row }">
                <span>{{ row.item.supplierName || tr('Luxeaf 自有') }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="tr('SKU编码')" prop="skuName" align="left">
              <template #default="{ row }">
                <div v-if="row.itemSku.skuCode">{{ fieldLabel('SKU编码') }}{{ row.itemSku.skuCode }}</div>
              </template>
            </el-table-column>
            <el-table-column :label="tr('商品图片')" width="110" align="center">
              <template #default="{ row }">
                <el-image
                  v-if="getMainImageUrl(row)"
                  :src="getMainImageUrl(row)"
                  fit="cover"
                  class="item-main-image"
                  :preview-src-list="[getMainImageUrl(row)]"
                  preview-teleported
                />
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column v-if="canViewCostPrice || canViewSellingPrice" :label="amountColumnLabel" width="160" align="left">
              <template #default="{ row }">
                <div v-if="canViewCostPrice && (row.itemSku.costPrice || row.itemSku.costPrice === 0)" class="flex-space-between">
                  <span>{{ tr('成本价：') }}</span>
                  <div>{{ (row.itemSku.costPrice || row.itemSku.costPrice === 0) ? row.itemSku.costPrice : '' }}</div>
                </div>
                <div v-if="canViewSellingPrice && (row.itemSku.sellingPrice || row.itemSku.sellingPrice === 0)" class="flex-space-between">
                  <span>{{ tr('销售价：') }}</span>
                  <div>{{ (row.itemSku.sellingPrice || row.itemSku.sellingPrice === 0) ? row.itemSku.sellingPrice : '' }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-hasPermi="['wms:item:edit']" :label="tr('操作')" align="right" prop="itemId" width="200">
              <template #default="scope">
                <el-button link type="primary" @click="emit('delete', scope.row)" icon="Delete" v-hasPermi="['wms:item:edit']">{{ tr('删除') }}</el-button>
                <el-button link type="primary" @click="emit('update', scope.row)" icon="Edit" v-hasPermi="['wms:item:edit']">{{ tr('修改') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum"
                      v-model:limit="queryParams.pageSize" @pagination="emit('pagination')"/>
        </div>
</template>

<script setup>
import { ref } from 'vue'
import { Expand } from '@element-plus/icons-vue'
import { useWmsStore } from '@/store/modules/wms'

defineProps({
  collapsed: { type: Boolean, default: false },
  itemList: { type: Array, default: () => [] },
  queryParams: { type: Object, required: true },
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  canViewCostPrice: { type: Boolean, default: false },
  canViewSellingPrice: { type: Boolean, default: false },
  amountColumnLabel: { type: String, default: '' },
  spanMethod: { type: Function, required: true },
  getItemRowKey: { type: Function, required: true },
  fieldLabel: { type: Function, required: true },
  getMainImageUrl: { type: Function, required: true },
  tr: { type: Function, required: true }
})

const emit = defineEmits([
  'toggle-category',
  'export',
  'import',
  'import-log',
  'add',
  'delete',
  'update',
  'pagination'
])
const itemTableRef = ref(null)

defineExpose({
  doLayout: () => itemTableRef.value?.doLayout?.(),
  clearSelection: () => itemTableRef.value?.clearSelection?.(),
  toggleRowSelection: (row, selected) => itemTableRef.value?.toggleRowSelection?.(row, selected)
})
</script>
