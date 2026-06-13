<template>
  <div class="app-container item-model-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="88px">
        <el-form-item :label="tr('包型名称')" prop="modelName">
          <el-input v-model="queryParams.modelName" :placeholder="tr('请输入包型名称')" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item :label="tr('品牌')" prop="itemBrand">
          <el-select v-model="queryParams.itemBrand" :placeholder="tr('请选择品牌')" clearable filterable style="width: 220px">
            <el-option v-for="item in useWmsStore().itemBrandList" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" justify="space-between">
        <el-col :span="6"><span class="table-title">{{ tr('包型列表') }}</span></el-col>
        <el-col :span="1.5">
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wms:itemModel:edit']">{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="itemModelList" border class="mt20" :empty-text="tr('暂无数据')">
        <el-table-column :label="tr('图片')" width="90">
          <template #default="{ row }">
            <el-image v-if="row.imageUrl" class="thumb" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported />
            <div v-else class="thumb empty-thumb">{{ tr('无') }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('包型名称')" prop="modelName" min-width="180" show-overflow-tooltip />
        <el-table-column :label="tr('品牌')" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ brandName(row.itemBrand) }}</template>
        </el-table-column>
        <el-table-column :label="tr('分类')" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ categoryName(row.itemCategory) }}</template>
        </el-table-column>
        <el-table-column :label="tr('状态')" prop="status" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? tr('启用') : tr('停用') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="tr('创建时间')" prop="createTime" width="180" />
        <el-table-column v-hasPermi="['wms:itemModel:edit']" :label="tr('操作')" align="right" width="180">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <el-drawer :title="title" v-model="open" size="50%" append-to-body>
      <el-form ref="itemModelRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item :label="tr('分类')" prop="itemCategory">
          <el-tree-select
            v-model="form.itemCategory"
            :data="useWmsStore().itemCategoryTreeList"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            value-key="id"
            :placeholder="tr('请选择分类')"
            clearable
            filterable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="tr('品牌')" prop="itemBrand">
          <el-select v-model="form.itemBrand" :placeholder="tr('请选择品牌')" clearable filterable style="width: 100%">
            <el-option v-for="item in useWmsStore().itemBrandList" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('包型名称')" prop="modelName">
          <el-input v-model="form.modelName" :placeholder="tr('请输入包型名称')" />
        </el-form-item>
        <el-form-item :label="tr('包型图片')" prop="imageOssId">
          <div class="business-image-upload">
            <div v-if="currentImageUrl" class="business-image-preview">
              <el-image :src="currentImageUrl" :preview-src-list="[currentImageUrl]" preview-teleported fit="cover" class="business-image-thumb" />
              <el-button type="danger" link icon="Delete" class="business-image-remove" @click="removeBusinessImage" />
            </div>
            <el-upload
              ref="imageUploadRef"
              class="business-image-picker"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleImageChange"
              accept="image/png,image/jpg,image/jpeg"
            >
              <div class="business-image-trigger">
                <el-icon><Plus /></el-icon>
                <span>{{ currentImageUrl ? tr('重新上传') : tr('点击上传') }}</span>
              </div>
            </el-upload>
            <div class="business-image-tip">{{ tr('请上传大小不超过 5MB 格式为 png/jpg/jpeg 的文件') }}</div>
          </div>
        </el-form-item>
        <el-form-item :label="tr('状态')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="1">{{ tr('启用') }}</el-radio>
            <el-radio label="0">{{ tr('停用') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="tr('备注')" prop="remark">
          <el-input v-model="form.remark" type="textarea" :placeholder="tr('请输入备注')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" @click="submitForm">{{ tr('确认') }}</el-button>
          <el-button @click="cancel">{{ tr('取消') }}</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="ItemModel">
import { listItemModelPage, getItemModel, delItemModel, addItemModel, updateItemModel, uploadItemModelImage, deleteItemModelImage } from '@/api/wms/itemModel'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { Plus } from '@element-plus/icons-vue'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const itemModelList = ref([])
const total = ref(0)
const open = ref(false)
const buttonLoading = ref(false)
const loading = ref(true)
const title = ref('')
const imageUploadRef = ref(null)
const pendingImageFile = ref(null)
const pendingImageUrl = ref('')
const imageMarkedForRemoval = ref(false)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    modelName: undefined,
    itemBrand: undefined
  },
})

const { queryParams, form } = toRefs(data)
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const currentImageUrl = computed(() => pendingImageUrl.value || (!imageMarkedForRemoval.value ? form.value.imageUrl : ''))
const rules = computed(() => ({
  itemCategory: [{ required: true, message: tr('分类不能为空'), trigger: 'change' }],
  itemBrand: [{ required: true, message: tr('品牌不能为空'), trigger: 'change' }],
  modelName: [{ required: true, message: tr('包型名称不能为空'), trigger: 'blur' }]
}))

function normalizeImageOssId(value) {
  if (Array.isArray(value)) return value[0]?.ossId || value[0] || undefined
  if (typeof value === 'string') return value.split(',').filter(Boolean)[0]
  return value || undefined
}

function clearPendingImage() {
  if (pendingImageUrl.value) URL.revokeObjectURL(pendingImageUrl.value)
  pendingImageFile.value = null
  pendingImageUrl.value = ''
  nextTick(() => imageUploadRef.value?.clearFiles?.())
}

function resetImageState() {
  clearPendingImage()
  imageMarkedForRemoval.value = false
}

function beforeBusinessImageUpload(file) {
  const isImage = /^image\/(png|jpe?g)$/i.test(file.type)
  if (!isImage) {
    proxy?.$modal.msgError(tr('只能上传 png/jpg/jpeg 格式的图片'))
    return false
  }
  if (file.size / 1024 / 1024 > 5) {
    proxy?.$modal.msgError(tr('图片大小不能超过 5MB'))
    return false
  }
  return true
}

function handleImageChange(uploadFile) {
  const file = uploadFile?.raw
  if (!file || !beforeBusinessImageUpload(file)) return
  clearPendingImage()
  pendingImageFile.value = file
  pendingImageUrl.value = URL.createObjectURL(file)
  imageMarkedForRemoval.value = false
}

function removeBusinessImage() {
  if (pendingImageFile.value) {
    clearPendingImage()
    return
  }
  if (form.value.imageOssId || form.value.imageUrl) {
    imageMarkedForRemoval.value = true
    form.value.imageOssId = null
    form.value.imageUrl = ''
  }
}

async function syncModelImage(modelId) {
  if (!modelId) return
  if (pendingImageFile.value) {
    await uploadItemModelImage(modelId, pendingImageFile.value)
    return
  }
  if (imageMarkedForRemoval.value) {
    await deleteItemModelImage(modelId)
  }
}

function brandName(id) {
  return id ? (useWmsStore().itemBrandMap.get(id)?.brandName || '') : tr('通用')
}

function categoryName(id) {
  return id ? (useWmsStore().itemCategoryMap.get(id)?.categoryName || '') : tr('通用')
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

function reset() {
  resetImageState()
  form.value = {
    id: null,
    modelName: null,
    modelCode: null,
    itemBrand: null,
    itemCategory: null,
    imageOssId: null,
    imageUrl: '',
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
  title.value = tr('新增包型')
}

async function handleUpdate(row) {
  reset()
  const res = await getItemModel(row.id)
  form.value = { ...res.data, imageOssId: res.data?.imageOssId ? String(res.data.imageOssId) : null, imageUrl: res.data?.imageUrl || '' }
  open.value = true
  title.value = tr('修改包型')
}

function submitForm() {
  proxy.$refs.itemModelRef.validate(async valid => {
    if (!valid) return
    buttonLoading.value = true
    const payload = { ...form.value, imageOssId: normalizeImageOssId(form.value.imageOssId) }
    try {
      let modelId = payload.id
      if (payload.id) {
        await updateItemModel(payload)
      } else {
        const res = await addItemModel(payload)
        modelId = res?.data?.id ?? res?.data
      }
      try {
        await syncModelImage(modelId)
      } catch (error) {
        proxy.$modal.msgWarning(tr('图片上传失败，请稍后重试'))
      }
      proxy.$modal.msgSuccess(payload.id ? tr('修改成功') : tr('新增成功'))
      open.value = false
      resetImageState()
      await useWmsStore().getItemModelList()
      await getList()
    } finally {
      buttonLoading.value = false
    }
  })
}

async function handleDelete(row) {
  await proxy.$modal.confirm(isEn.value ? `Confirm delete model [${row.modelName}]?` : `确认删除包型【${row.modelName}】吗？`)
  await delItemModel(row.id)
  proxy.$modal.msgSuccess(tr('删除成功'))
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
.business-image-upload {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.business-image-preview {
  position: relative;
  width: 112px;
  height: 112px;
}
.business-image-thumb {
  width: 112px;
  height: 112px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
}
.business-image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
}
.business-image-picker {
  width: 112px;
}
.business-image-trigger {
  width: 112px;
  height: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #606266;
  border: 1px dashed #c0c4cc;
  border-radius: 6px;
  background: #fafafa;
  cursor: pointer;
}
.business-image-trigger:hover {
  color: #409eff;
  border-color: #409eff;
}
.business-image-tip {
  flex-basis: 100%;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}
</style>
