<template>
  <div class="app-container item-model-page" :class="{ 'is-en': isEn }">
    <el-card>
      <CatalogHierarchySteps
        current="model"
        :category-label="hierarchyCategoryLabel"
        :brand-label="hierarchyBrandLabel"
        @select="handleHierarchySelect"
      />
      <el-form
        ref="queryRef"
        :model="queryParams"
        :inline="true"
        :label-width="isEn ? '112px' : '88px'"
        class="model-query-form"
      >
        <el-form-item :label="tr('分类')" prop="itemCategory">
          <el-tree-select
            v-model="queryParams.itemCategory"
            :data="categoryTreeWithPath"
            :props="{ value: 'id', label: 'pathLabel', children: 'children' }"
            value-key="id"
            :placeholder="tr('请选择分类')"
            clearable
            filterable
            style="width: 280px"
            @change="handleQueryCategoryChange"
          >
            <template #default="{ data }">
              <span>{{ data.shortLabel }}</span>
            </template>
          </el-tree-select>
        </el-form-item>
        <el-form-item :label="tr('品牌')" prop="itemBrand">
          <el-select
            v-model="queryParams.itemBrand"
            :placeholder="queryParams.itemCategory ? tr('请选择品牌') : tr('请先选择分类')"
            clearable
            filterable
            :disabled="!queryParams.itemCategory"
            style="width: 220px"
            @change="handleQueryBrandChange"
          >
            <el-option v-for="item in queryBrandOptions" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('包型名称')" prop="id">
          <el-select
            v-model="queryParams.id"
            :placeholder="queryParams.itemBrand ? tr('请选择包型') : tr('请先选择品牌')"
            clearable
            filterable
            :disabled="!queryParams.itemBrand"
            style="width: 240px"
          >
            <el-option v-for="item in queryModelOptions" :key="item.id" :label="item.modelName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" justify="space-between" align="middle">
        <el-col :span="14"><span class="table-title" :title="listTitle">{{ listTitle }}</span></el-col>
        <el-col :span="10" class="toolbar-right">
          <el-radio-group v-model="viewMode" size="small" class="view-toggle">
            <el-radio-button label="list">{{ tr('列表') }}</el-radio-button>
            <el-radio-button label="gallery">{{ tr('图集') }}</el-radio-button>
          </el-radio-group>
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wms:itemModel:edit']">{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-if="viewMode === 'list'" v-loading="loading" :data="itemModelList" border class="mt20" :empty-text="tr('暂无数据')">
        <el-table-column :label="tr('图片')" width="90" align="center" header-align="left">
          <template #default="{ row }">
            <el-image v-if="row.imageUrl" class="thumb" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported />
            <div v-else class="thumb empty-thumb">{{ tr('无') }}</div>
          </template>
        </el-table-column>
        <el-table-column
          class-name="catalog-focus-col"
          label-class-name="catalog-focus-col"
          :label="tr('包型名称')"
          prop="modelName"
          min-width="180"
          show-overflow-tooltip
        />
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
        <el-table-column v-hasPermi="['wms:itemModel:edit']" :label="tr('操作')" align="right" header-align="left" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="goMaterials(row)">{{ tr('材质') }}</el-button>
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-else ref="galleryGridRef" v-loading="loading" class="gallery-grid mt20">
        <div v-if="!itemModelList.length" class="gallery-empty">{{ tr('暂无数据') }}</div>
        <article
          v-for="row in itemModelList"
          :key="row.id"
          class="gallery-card"
          @click="handleUpdate(row)"
        >
          <div class="gallery-cover">
            <el-image v-if="row.imageUrl" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported @click.stop />
            <div v-else class="gallery-cover-empty">{{ tr('暂无图片') }}</div>
          </div>
          <div class="gallery-body">
            <h3 class="gallery-title" :title="row.modelName">{{ row.modelName }}</h3>
            <p class="gallery-meta">{{ brandName(row.itemBrand) }}</p>
            <p class="gallery-meta muted">{{ categoryName(row.itemCategory) }}</p>
            <div class="gallery-actions" @click.stop>
              <el-button link type="primary" @click="goMaterials(row)">{{ tr('查看材质') }}</el-button>
              <el-button link type="primary" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
              <el-button link type="danger" v-hasPermi="['wms:itemModel:edit']" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
            </div>
          </div>
        </article>
      </div>

      <pagination
        v-show="total > 0"
        class="catalog-pagination"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handlePagination"
      />
    </el-card>

    <el-drawer :title="title" v-model="open" size="50%" append-to-body>
      <el-form
        ref="itemModelRef"
        :model="form"
        :rules="rules"
        :label-width="isEn ? '136px' : '96px'"
        class="model-drawer-form"
      >
        <el-form-item :label="tr('分类')" prop="itemCategory">
          <el-tree-select
            v-model="form.itemCategory"
            :data="categoryTreeWithPath"
            :props="{ value: 'id', label: 'pathLabel', children: 'children' }"
            value-key="id"
            :placeholder="tr('请选择分类')"
            clearable
            filterable
            style="width: 100%"
            @change="handleFormCategoryChange"
          >
            <template #default="{ data }">
              <span>{{ data.shortLabel }}</span>
            </template>
          </el-tree-select>
        </el-form-item>
        <el-form-item :label="tr('品牌')" prop="itemBrand">
          <el-select
            v-model="form.itemBrand"
            :placeholder="form.itemCategory ? tr('请选择品牌') : tr('请先选择分类')"
            clearable
            filterable
            :disabled="!form.itemCategory"
            style="width: 100%"
          >
            <el-option v-for="item in formBrandOptions" :key="item.id" :label="item.brandName" :value="item.id" />
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
import { listItemModelPage, listItemModel, getItemModel, delItemModel, addItemModel, updateItemModel, uploadItemModelImage, deleteItemModelImage, listItemModelBrandOptions } from '@/api/wms/itemModel'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { joinCatalogPath, sortByCatalogName, withCategoryPathLabels } from '@/utils/wmsUtil'
import { useGalleryFillPage } from '@/composables/useGalleryFillPage'
import CatalogHierarchySteps from '@/components/CatalogHierarchySteps/index.vue'
import { Plus } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'

const { proxy } = getCurrentInstance()
const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const itemModelList = ref([])
const total = ref(0)
const open = ref(false)
const buttonLoading = ref(false)
const loading = ref(true)
const title = ref('')
const viewMode = ref(localStorage.getItem('wms.itemModel.viewMode') || 'list')
const galleryGridRef = ref(null)
const imageUploadRef = ref(null)
const pendingImageFile = ref(null)
const pendingImageUrl = ref('')
const imageMarkedForRemoval = ref(false)
const queryBrandIds = ref([])
const formBrandIds = ref([])
const queryModelOptions = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: (localStorage.getItem('wms.itemModel.viewMode') || 'list') === 'gallery' ? 24 : 12,
    id: undefined,
    itemBrand: undefined,
    itemCategory: undefined
  },
})

const { queryParams, form } = toRefs(data)
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const categoryTreeWithPath = computed(() => withCategoryPathLabels(useWmsStore().itemCategoryTreeList || []))
const currentImageUrl = computed(() => pendingImageUrl.value || (!imageMarkedForRemoval.value ? form.value.imageUrl : ''))
const rules = computed(() => ({
  itemCategory: [{ required: true, message: tr('分类不能为空'), trigger: 'change' }],
  itemBrand: [{ required: true, message: tr('品牌不能为空'), trigger: 'change' }],
  modelName: [{ required: true, message: tr('包型名称不能为空'), trigger: 'blur' }]
}))

const queryBrandOptions = computed(() => {
  const all = useWmsStore().itemBrandList || []
  if (!queryParams.value.itemCategory) return []
  const idSet = new Set(queryBrandIds.value.map(String))
  return all.filter(item => idSet.has(String(item.id)))
})

const formBrandOptions = computed(() => {
  const all = useWmsStore().itemBrandList || []
  if (!form.value.itemCategory) return []
  const idSet = new Set(formBrandIds.value.map(String))
  return all.filter(item => idSet.has(String(item.id)))
})

async function refreshQueryModelOptions() {
  queryModelOptions.value = []
  if (!queryParams.value.itemBrand) return
  try {
    const res = await listItemModel({
      itemCategory: queryParams.value.itemCategory,
      itemBrand: queryParams.value.itemBrand
    })
    queryModelOptions.value = sortByCatalogName(res.data || [], 'modelName')
  } catch (e) {
    queryModelOptions.value = []
  }
}

async function handleQueryCategoryChange() {
  queryParams.value.itemBrand = undefined
  queryParams.value.id = undefined
  queryBrandIds.value = []
  queryModelOptions.value = []
  if (!queryParams.value.itemCategory) return
  try {
    const res = await listItemModelBrandOptions(queryParams.value.itemCategory)
    queryBrandIds.value = res.data || []
  } catch (e) {
    queryBrandIds.value = []
  }
}

async function handleQueryBrandChange() {
  queryParams.value.id = undefined
  await refreshQueryModelOptions()
}

watch(viewMode, (mode) => {
  localStorage.setItem('wms.itemModel.viewMode', mode)
})

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

const hierarchyCategoryLabel = computed(() => {
  const id = queryParams.value.itemCategory
  if (!id) return ''
  const findPath = (nodes) => {
    for (const node of nodes || []) {
      if (String(node.id) === String(id)) return node.pathLabel || node.shortLabel || ''
      const child = findPath(node.children)
      if (child) return child
    }
    return ''
  }
  return findPath(categoryTreeWithPath.value) || categoryName(id)
})

const hierarchyBrandLabel = computed(() => {
  const id = queryParams.value.itemBrand
  if (!id) return ''
  const name = useWmsStore().itemBrandMap.get(id)?.brandName || ''
  return name
})

const listTitle = computed(() =>
  joinCatalogPath(hierarchyCategoryLabel.value, hierarchyBrandLabel.value, tr('包型列表'))
)

function handleHierarchySelect(key) {
  if (key === 'model') return
  const q = {
    itemCategory: queryParams.value.itemCategory || undefined,
    itemBrand: queryParams.value.itemBrand || undefined
  }
  if (key === 'category' || key === 'brand') {
    router.push({ path: '/basic/itemBrand', query: { itemCategory: q.itemCategory } })
    return
  }
  if (key === 'material') {
    router.push({ path: '/basic/itemMaterial', query: { ...q, view: 'gallery' } })
  }
}

function goMaterials(row) {
  router.push({
    path: '/basic/itemMaterial',
    query: {
      itemCategory: row.itemCategory || undefined,
      itemBrand: row.itemBrand || undefined,
      modelId: row.id,
      view: 'gallery'
    }
  })
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

const { snapPageSize } = useGalleryFillPage({
  gridRef: galleryGridRef,
  viewMode,
  queryParams,
  reload: getList,
  minCardWidth: 230,
  gap: 16,
  preferredRows: 3,
  listPageSize: 12
})

function handlePagination() {
  if (viewMode.value === 'gallery') {
    queryParams.value.pageSize = snapPageSize(queryParams.value.pageSize)
  }
  getList()
}

async function handleFormCategoryChange() {
  form.value.itemBrand = null
  formBrandIds.value = []
  if (!form.value.itemCategory) return
  try {
    const res = await listItemModelBrandOptions(form.value.itemCategory)
    formBrandIds.value = res.data || []
  } catch (e) {
    formBrandIds.value = []
  }
}

function reset() {
  resetImageState()
  formBrandIds.value = []
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
  queryParams.value.itemCategory = undefined
  queryParams.value.itemBrand = undefined
  queryParams.value.id = undefined
  queryBrandIds.value = []
  queryModelOptions.value = []
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
  if (form.value.itemCategory) {
    try {
      const brandRes = await listItemModelBrandOptions(form.value.itemCategory)
      formBrandIds.value = brandRes.data || []
      // Keep current brand visible even if options temporarily empty
      if (form.value.itemBrand && !formBrandIds.value.map(String).includes(String(form.value.itemBrand))) {
        formBrandIds.value = [...formBrandIds.value, form.value.itemBrand]
      }
    } catch (e) {
      formBrandIds.value = form.value.itemBrand ? [form.value.itemBrand] : []
    }
  }
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

async function applyRouteQuery() {
  const q = route.query || {}
  if (q.itemCategory) queryParams.value.itemCategory = Number(q.itemCategory) || q.itemCategory
  if (q.itemBrand) queryParams.value.itemBrand = Number(q.itemBrand) || q.itemBrand
  if (q.view === 'gallery' || q.view === 'list') viewMode.value = q.view
  if (queryParams.value.itemCategory) {
    try {
      const res = await listItemModelBrandOptions(queryParams.value.itemCategory)
      queryBrandIds.value = res.data || []
    } catch (e) {
      queryBrandIds.value = []
    }
  }
  if (queryParams.value.itemBrand) {
    await refreshQueryModelOptions()
  }
}

async function initPage() {
  await applyRouteQuery()
  await getList()
}

initPage()
</script>

<style scoped>
.table-title {
  display: inline-block;
  max-width: 100%;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}
:deep(th.catalog-focus-col .cell) {
  font-weight: 700;
  color: var(--el-color-primary);
}
:deep(td.catalog-focus-col .cell) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.toolbar-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
.view-toggle {
  margin-right: 4px;
}
:deep(.pagination-container.catalog-pagination) {
  position: relative !important;
  width: 100%;
  box-sizing: border-box;
  height: auto !important;
  min-height: 48px;
  margin: 16px 0 0 !important;
  padding: 12px 8px 4px !important;
  overflow: visible;
  display: flex;
  justify-content: flex-end;
}
:deep(.pagination-container.catalog-pagination .el-pagination) {
  position: static !important;
  right: auto !important;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: flex-end;
  row-gap: 8px;
}
.model-query-form :deep(.el-form-item__label),
.model-drawer-form :deep(.el-form-item__label) {
  white-space: nowrap;
}
.thumb {
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  border-radius: 6px;
}
.empty-thumb {
  display: grid;
  place-items: center;
  color: #909399;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(var(--gallery-cols, 4), minmax(0, 1fr));
  gap: 16px;
  min-height: 120px;
}
.gallery-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #909399;
  padding: 48px 0;
}
.gallery-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.gallery-card:hover {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}
.gallery-cover {
  aspect-ratio: 1;
  background: #f5f7fa;
}
.gallery-cover :deep(.el-image),
.gallery-cover-empty {
  width: 100%;
  height: 100%;
}
.gallery-cover-empty {
  display: grid;
  place-items: center;
  color: #909399;
  font-size: 13px;
}
.gallery-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--el-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gallery-meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gallery-meta.muted {
  color: #909399;
}
.gallery-body {
  display: flex;
  flex-direction: column;
  padding: 12px 12px 10px;
}
.gallery-actions {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #eef0f4;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 4px;
}
.gallery-actions :deep(.el-button) {
  margin: 0;
  padding: 0 4px;
  height: auto;
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
