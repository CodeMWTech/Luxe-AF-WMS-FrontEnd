<template>
  <div class="app-container item-material-page">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="88px">
        <el-form-item label="材质名称" prop="materialName">
          <el-input v-model="queryParams.materialName" placeholder="请输入材质名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" justify="space-between">
        <el-col :span="6"><span class="table-title">材质列表</span></el-col>
        <el-col :span="1.5">
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wms:itemMaterial:edit']">新增</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="itemMaterialList" border class="mt20">
        <el-table-column label="图片" width="90">
          <template #default="{ row }">
            <el-image v-if="row.imageUrl" class="thumb" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported />
            <div v-else class="thumb empty-thumb">无</div>
          </template>
        </el-table-column>
        <el-table-column label="分类" prop="itemCategory" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getCategoryName(row.itemCategory) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="品牌" prop="itemBrand" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getBrandName(row.itemBrand) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="包型" prop="modelName" min-width="180" show-overflow-tooltip />
        <el-table-column label="材质名称" prop="materialName" min-width="180" show-overflow-tooltip />
        <el-table-column label="特殊材质" prop="specialFlag" width="100">
          <template #default="{ row }">
            <el-tag :type="row.specialFlag ? 'warning' : 'info'">{{ row.specialFlag ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column v-hasPermi="['wms:itemMaterial:edit']" label="操作" align="right" width="180">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <el-drawer :title="title" v-model="open" size="50%" append-to-body>
      <el-form ref="itemMaterialRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="分类" prop="itemCategory">
          <el-tree-select
            v-model="form.itemCategory"
            :data="wmsStore.itemCategoryTreeList"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            value-key="id"
            placeholder="请选择分类"
            clearable
            filterable
            style="width: 100%"
            @change="handleCategoryChange"
          />
        </el-form-item>
        <el-form-item label="品牌" prop="itemBrand">
          <el-select
            v-model="form.itemBrand"
            placeholder="请选择品牌"
            clearable
            filterable
            :disabled="!form.itemCategory"
            style="width: 100%"
            @change="handleBrandChange"
          >
            <el-option
              v-for="item in filteredItemBrandOptions"
              :key="item.id"
              :label="item.brandName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="包型" prop="modelId">
          <el-select
            v-model="form.modelId"
            placeholder="请选择包型"
            clearable
            filterable
            :disabled="!form.itemCategory || !form.itemBrand"
            class="model-select"
            popper-class="material-model-select-popper"
            style="width: 100%"
          >
            <el-option
              v-for="item in filteredItemModelOptions"
              :key="item.id"
              :label="item.modelName"
              :value="item.id"
            >
              <div class="model-option">
                <span class="model-option-thumb">
                  <img v-if="item.imageUrl" :src="item.imageUrl" alt="" />
                  <span v-else class="model-option-empty"></span>
                </span>
                <span class="model-option-name">{{ item.modelName }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="材质名称" prop="materialName">
          <el-input v-model="form.materialName" placeholder="请输入材质名称" />
        </el-form-item>
        <el-form-item label="材质图片" prop="imageOssId">
          <ImageUpload v-model="form.imageOssId" :limit="1" :file-size="5" />
        </el-form-item>
        <el-form-item label="特殊材质" prop="specialFlag">
          <el-switch v-model="form.specialFlag" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">确认</el-button>
          <el-button @click="cancel">取消</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="ItemMaterial">
import { listItemMaterialPage, getItemMaterial, delItemMaterial, addItemMaterial, updateItemMaterial } from '@/api/wms/itemMaterial'
import { useWmsStore } from '@/store/modules/wms'

const { proxy } = getCurrentInstance()
const wmsStore = useWmsStore()
const itemMaterialList = ref([])
const total = ref(0)
const open = ref(false)
const buttonLoading = ref(false)
const loading = ref(true)
const title = ref('')

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    materialName: undefined
  },
  rules: {
    itemCategory: [{ required: true, message: '分类不能为空', trigger: 'change' }],
    itemBrand: [{ required: true, message: '品牌不能为空', trigger: 'change' }],
    modelId: [{ required: true, message: '包型不能为空', trigger: 'change' }],
    materialName: [{ required: true, message: '材质名称不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)
const filteredItemBrandOptions = computed(() => {
  const category = form.value.itemCategory
  if (!category) return []
  const brandIdSet = new Set(
    (wmsStore.itemModelList || [])
      .filter(item => String(item.itemCategory) === String(category))
      .map(item => String(item.itemBrand))
      .filter(Boolean)
  )
  return (wmsStore.itemBrandList || []).filter(item => brandIdSet.has(String(item.id)))
})
const filteredItemModelOptions = computed(() => {
  const category = form.value.itemCategory
  const brand = form.value.itemBrand
  if (!category || !brand) return []
  return (wmsStore.itemModelList || []).filter(item =>
    String(item.itemCategory) === String(category) && String(item.itemBrand) === String(brand)
  )
})

function getCategoryName(id) {
  if (!id) return '-'
  return wmsStore.itemCategoryMap.get(id)?.categoryName || '-'
}

function getBrandName(id) {
  if (!id) return '-'
  return wmsStore.itemBrandMap.get(id)?.brandName || '-'
}

function findModelById(id) {
  if (!id) return null
  return wmsStore.itemModelMap.get(id) || null
}

function handleCategoryChange() {
  form.value.itemBrand = null
  form.value.modelId = null
}

function handleBrandChange() {
  form.value.modelId = null
}

function normalizeImageOssId(value) {
  if (Array.isArray(value)) return value[0]?.ossId || value[0] || undefined
  if (typeof value === 'string') return value.split(',').filter(Boolean)[0]
  return value || undefined
}

async function getList() {
  loading.value = true
  try {
    const res = await listItemMaterialPage(queryParams.value)
    itemMaterialList.value = res.rows || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

function reset() {
  form.value = {
    id: null,
    itemCategory: null,
    itemBrand: null,
    modelId: null,
    materialName: null,
    materialCode: null,
    imageOssId: null,
    specialFlag: false,
    orderNum: null,
    status: '1',
    remark: null
  }
  proxy.resetForm('itemMaterialRef')
}

function cancel() {
  open.value = false
  reset()
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '新增材质'
}

async function handleUpdate(row) {
  reset()
  const res = await getItemMaterial(row.id)
  const model = findModelById(res.data?.modelId)
  form.value = {
    ...res.data,
    itemCategory: res.data?.itemCategory || model?.itemCategory || null,
    itemBrand: res.data?.itemBrand || model?.itemBrand || null,
    modelId: res.data?.modelId || null,
    imageOssId: res.data?.imageOssId ? String(res.data.imageOssId) : null
  }
  open.value = true
  title.value = '修改材质'
}

function submitForm() {
  proxy.$refs.itemMaterialRef.validate(async valid => {
    if (!valid) return
    buttonLoading.value = true
    const payload = { ...form.value, imageOssId: normalizeImageOssId(form.value.imageOssId) }
    try {
      if (payload.id) await updateItemMaterial(payload)
      else await addItemMaterial(payload)
      proxy.$modal.msgSuccess(payload.id ? '修改成功' : '新增成功')
      open.value = false
      await wmsStore.getItemMaterialList()
      await getList()
    } finally {
      buttonLoading.value = false
    }
  })
}

async function handleDelete(row) {
  await proxy.$modal.confirm(`确认删除材质【${row.materialName}】吗？`)
  await delItemMaterial(row.id)
  proxy.$modal.msgSuccess('删除成功')
  await wmsStore.getItemMaterialList()
  await getList()
}

async function ensureModelOptions() {
  if (!Array.isArray(wmsStore.itemModelList) || wmsStore.itemModelList.length === 0) {
    await wmsStore.getItemModelList()
  }
}

async function ensureBrandOptions() {
  if (!Array.isArray(wmsStore.itemBrandList) || wmsStore.itemBrandList.length === 0) {
    await wmsStore.getItemBrandList()
  }
}

async function ensureCategoryOptions() {
  if (!Array.isArray(wmsStore.itemCategoryList) || wmsStore.itemCategoryList.length === 0) {
    await wmsStore.getItemCategoryList()
  }
  if (!Array.isArray(wmsStore.itemCategoryTreeList) || wmsStore.itemCategoryTreeList.length === 0) {
    await wmsStore.getItemCategoryTreeList()
  }
}

async function initPage() {
  await Promise.all([ensureCategoryOptions(), ensureBrandOptions(), ensureModelOptions(), getList()])
}

initPage()
</script>

<style scoped>
.table-title {
  font-size: 18px;
}
.thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.empty-thumb {
  display: grid;
  place-items: center;
  color: #909399;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
}
.model-select :deep(.el-input__wrapper) {
  min-height: 38px;
}
:global(.material-model-select-popper .el-select-dropdown__item) {
  height: auto;
  min-height: 0;
  padding: 0;
  line-height: normal;
}
:global(.material-model-select-popper .el-select-dropdown__item.hover),
:global(.material-model-select-popper .el-select-dropdown__item:hover) {
  background: transparent;
}
:global(.material-model-select-popper .model-option) {
  min-height: 58px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
:global(.material-model-select-popper .el-select-dropdown__item.hover .model-option),
:global(.material-model-select-popper .model-option:hover) {
  background: #f3f6fb;
}
:global(.material-model-select-popper .model-option-thumb) {
  width: 40px;
  height: 40px;
  border-radius: 7px;
  overflow: hidden;
  background: #f2f5f8;
  flex: 0 0 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
:global(.material-model-select-popper .model-option-thumb img),
:global(.material-model-select-popper .model-option-empty) {
  width: 100%;
  height: 100%;
  display: block;
}
:global(.material-model-select-popper .model-option-thumb img) {
  object-fit: cover;
}
:global(.material-model-select-popper .model-option-empty) {
  border: 1px dashed #dcdfe6;
  background: linear-gradient(135deg, #f8fafc, #eef2f7);
}
:global(.material-model-select-popper .model-option-name) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: #1f2937;
}
</style>
