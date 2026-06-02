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
    materialName: [{ required: true, message: '材质名称不能为空', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

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
  form.value = { ...res.data, imageOssId: res.data?.imageOssId ? String(res.data.imageOssId) : null }
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
      await useWmsStore().getItemMaterialList()
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
  await useWmsStore().getItemMaterialList()
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