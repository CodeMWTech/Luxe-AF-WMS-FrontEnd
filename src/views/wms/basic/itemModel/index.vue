<template>
  <div class="app-container item-model-page">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="88px">
        <el-form-item label="包型名称" prop="modelName">
          <el-input v-model="queryParams.modelName" placeholder="请输入包型名称" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="品牌" prop="itemBrand">
          <el-select v-model="queryParams.itemBrand" placeholder="请选择品牌" clearable filterable style="width: 220px">
            <el-option v-for="item in useWmsStore().itemBrandList" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" justify="space-between">
        <el-col :span="6"><span class="table-title">包型列表</span></el-col>
        <el-col :span="1.5">
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wms:itemModel:edit']">新增</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="itemModelList" border class="mt20">
        <el-table-column label="图片" width="90">
          <template #default="{ row }">
            <el-image v-if="row.imageUrl" class="thumb" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported />
            <div v-else class="thumb empty-thumb">无</div>
          </template>
        </el-table-column>
        <el-table-column label="包型名称" prop="modelName" min-width="180" show-overflow-tooltip />
        <el-table-column label="品牌" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ brandName(row.itemBrand) }}</template>
        </el-table-column>
        <el-table-column label="分类" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ categoryName(row.itemCategory) }}</template>
        </el-table-column>
        <el-table-column label="状态" prop="status" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column v-hasPermi="['wms:itemModel:edit']" label="操作" align="right" width="180">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <el-drawer :title="title" v-model="open" size="50%" append-to-body>
      <el-form ref="itemModelRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="分类" prop="itemCategory">
          <el-tree-select
            v-model="form.itemCategory"
            :data="useWmsStore().itemCategoryTreeList"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            value-key="id"
            placeholder="请选择分类"
            clearable
            filterable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="品牌" prop="itemBrand">
          <el-select v-model="form.itemBrand" placeholder="请先选择分类" clearable filterable style="width: 100%" :disabled="!form.itemCategory">
            <el-option v-for="item in availableBrandList" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="包型名称" prop="modelName">
          <el-input v-model="form.modelName" placeholder="请输入包型名称" />
        </el-form-item>
        <el-form-item label="包型图片" prop="imageOssId">
          <ImageUpload v-model="form.imageOssId" :limit="1" :file-size="5" />
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

<script setup name="ItemModel">
import { listItemModelPage, getItemModel, delItemModel, addItemModel, updateItemModel, listItemModelBrandOptions } from '@/api/wms/itemModel'
import { useWmsStore } from '@/store/modules/wms'

const { proxy } = getCurrentInstance()
const itemModelList = ref([])
const total = ref(0)
const open = ref(false)
const buttonLoading = ref(false)
const loading = ref(true)
const title = ref('')
const categoryBrandIds = ref([])
const isHydratingForm = ref(false)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    modelName: undefined,
    itemBrand: undefined
  },
  rules: {
    modelName: [{ required: true, message: '包型名称不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const availableBrandList = computed(() => {
  if (!form.value.itemCategory || categoryBrandIds.value.length === 0) return useWmsStore().itemBrandList
  const brandIdSet = new Set(categoryBrandIds.value.map(id => String(id)))
  return useWmsStore().itemBrandList.filter(item => brandIdSet.has(String(item.id)))
})

function normalizeImageOssId(value) {
  if (Array.isArray(value)) return value[0]?.ossId || value[0] || undefined
  if (typeof value === 'string') return value.split(',').filter(Boolean)[0]
  return value || undefined
}

function brandName(id) {
  return id ? (useWmsStore().itemBrandMap.get(id)?.brandName || '') : '通用'
}

function categoryName(id) {
  return id ? (useWmsStore().itemCategoryMap.get(id)?.categoryName || '') : '通用'
}

async function initBaseData() {
  const store = useWmsStore()
  await Promise.all([
    store.itemBrandList.length ? Promise.resolve() : store.getItemBrandList(),
    store.itemCategoryList.length ? Promise.resolve() : store.getItemCategoryList(),
    store.itemCategoryTreeList.length ? Promise.resolve() : store.getItemCategoryTreeList()
  ])
}

async function getList() {
  loading.value = true
  try {
    await initBaseData()
    const res = await listItemModelPage(queryParams.value)
    itemModelList.value = res.rows || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

async function loadCategoryBrandOptions(categoryId) {
  if (!categoryId) {
    categoryBrandIds.value = []
    return
  }
  try {
    const res = await listItemModelBrandOptions(categoryId)
    categoryBrandIds.value = res.data || []
    if (form.value.itemBrand && categoryBrandIds.value.length > 0 && !categoryBrandIds.value.some(id => String(id) === String(form.value.itemBrand))) {
      form.value.itemBrand = null
    }
  } catch (_) {
    categoryBrandIds.value = []
  }
}

watch(() => form.value.itemCategory, async (categoryId, oldCategoryId) => {
  if (isHydratingForm.value || categoryId === oldCategoryId) return
  if (oldCategoryId !== undefined) form.value.itemBrand = null
  await loadCategoryBrandOptions(categoryId)
})

function reset() {
  form.value = {
    id: null,
    modelName: null,
    modelCode: null,
    itemBrand: null,
    itemCategory: null,
    imageOssId: null,
    orderNum: null,
    status: '1',
    remark: null
  }
  proxy.resetForm('itemModelRef')
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
  title.value = '新增包型'
}

async function handleUpdate(row) {
  reset()
  isHydratingForm.value = true
  try {
    const res = await getItemModel(row.id)
    form.value = { ...res.data, imageOssId: res.data?.imageOssId ? String(res.data.imageOssId) : null }
    categoryBrandIds.value = []
    await nextTick()
  } finally {
    isHydratingForm.value = false
  }
  open.value = true
  title.value = '修改包型'
}

function submitForm() {
  proxy.$refs.itemModelRef.validate(async valid => {
    if (!valid) return
    buttonLoading.value = true
    const payload = { ...form.value, imageOssId: normalizeImageOssId(form.value.imageOssId) }
    try {
      if (payload.id) await updateItemModel(payload)
      else await addItemModel(payload)
      proxy.$modal.msgSuccess(payload.id ? '修改成功' : '新增成功')
      open.value = false
      await useWmsStore().getItemModelList()
      await getList()
    } finally {
      buttonLoading.value = false
    }
  })
}

async function handleDelete(row) {
  await proxy.$modal.confirm(`确认删除包型【${row.modelName}】吗？`)
  await delItemModel(row.id)
  proxy.$modal.msgSuccess('删除成功')
  await useWmsStore().getItemModelList()
  await getList()
}

getList()
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
</style>