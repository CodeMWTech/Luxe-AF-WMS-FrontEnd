<template>
  <div class="app-container item-material-page" :class="{ 'is-en': isEn }">
    <el-card>
      <CatalogHierarchySteps
        current="material"
        :category-label="hierarchyCategoryLabel"
        :brand-label="hierarchyBrandLabel"
        :model-label="hierarchyModelLabel"
        @select="handleHierarchySelect"
      />
      <el-form
        ref="queryRef"
        :model="queryParams"
        :inline="true"
        :label-width="isEn ? '112px' : '88px'"
        class="material-query-form"
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
            style="width: 200px"
            @change="handleQueryBrandChange"
          >
            <el-option v-for="item in queryBrandOptions" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('包型')" prop="modelId">
          <el-select
            v-model="queryParams.modelId"
            :placeholder="queryParams.itemBrand ? tr('请选择包型') : tr('请先选择品牌')"
            clearable
            filterable
            :disabled="!queryParams.itemBrand"
            style="width: 220px"
            @change="handleQueryModelChange"
          >
            <el-option v-for="item in queryModelOptions" :key="item.id" :label="item.modelName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('材质名称')" prop="id">
          <el-select
            v-model="queryParams.id"
            :placeholder="queryParams.modelId ? tr('请选择材质') : tr('请先选择包型')"
            clearable
            filterable
            :disabled="!queryParams.modelId"
            style="width: 240px"
          >
            <el-option v-for="item in queryMaterialOptions" :key="item.id" :label="item.materialName" :value="item.id" />
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
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wms:itemMaterial:edit']">{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-if="viewMode === 'list'" v-loading="loading" :data="itemMaterialList" border class="mt20" :empty-text="tr('暂无数据')">
        <el-table-column :label="tr('图片')" width="90" align="center" header-align="left">
          <template #default="{ row }">
            <el-image v-if="row.imageUrl" class="thumb" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported />
            <div v-else class="thumb empty-thumb">{{ tr('无') }}</div>
          </template>
        </el-table-column>
        <el-table-column :label="tr('分类')" prop="itemCategory" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getCategoryName(row.itemCategory) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="tr('品牌')" prop="itemBrand" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getBrandName(row.itemBrand) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="tr('包型')" prop="modelName" min-width="180" show-overflow-tooltip />
        <el-table-column :label="tr('材质名称')" prop="materialName" min-width="180" show-overflow-tooltip />
        <el-table-column :label="tr('特殊材质')" prop="specialFlag" width="100">
          <template #default="{ row }">
            <el-tag :type="row.specialFlag ? 'warning' : 'info'">{{ row.specialFlag ? tr('是') : tr('否') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="tr('状态')" prop="status" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? tr('启用') : tr('停用') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="tr('创建时间')" prop="createTime" width="180" />
        <el-table-column v-hasPermi="['wms:itemMaterial:edit']" :label="tr('操作')" align="right" header-align="left" width="180">
          <template #default="{ row }">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-else ref="galleryGridRef" v-loading="loading" class="gallery-grid mt20">
        <div v-if="!itemMaterialList.length" class="gallery-empty">{{ tr('暂无数据') }}</div>
        <article
          v-for="row in itemMaterialList"
          :key="row.id"
          class="gallery-card"
          @click="handleUpdate(row)"
        >
          <div class="gallery-cover">
            <el-image v-if="row.imageUrl" :src="row.imageUrl" fit="cover" :preview-src-list="[row.imageUrl]" preview-teleported @click.stop />
            <div v-else class="gallery-cover-empty">{{ tr('暂无图片') }}</div>
          </div>
          <div class="gallery-body">
            <h3 class="gallery-title" :title="row.materialName">{{ row.materialName }}</h3>
            <p class="gallery-meta">{{ row.modelName || '-' }}</p>
            <p class="gallery-meta muted">{{ getBrandName(row.itemBrand) }} · {{ getCategoryName(row.itemCategory) }}</p>
            <div class="gallery-actions" @click.stop>
              <el-button link type="primary" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
              <el-button link type="danger" v-hasPermi="['wms:itemMaterial:edit']" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
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
        ref="itemMaterialRef"
        :model="form"
        :rules="rules"
        :label-width="isEn ? '136px' : '96px'"
        class="material-drawer-form"
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
            @change="handleCategoryChange"
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
        <el-form-item :label="tr('包型')" prop="modelId">
          <el-select
            v-model="form.modelId"
            :placeholder="tr('请选择包型')"
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
        <el-form-item :label="tr('材质名称')" prop="materialName">
          <el-input v-model="form.materialName" :placeholder="tr('请输入材质名称')" />
        </el-form-item>
        <el-form-item :label="tr('材质图片')" prop="imageOssId">
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
        <el-form-item :label="tr('特殊材质')" prop="specialFlag">
          <el-switch v-model="form.specialFlag" />
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

<script setup name="ItemMaterial">
import { listItemMaterialPage, listItemMaterial, getItemMaterial, delItemMaterial, addItemMaterial, updateItemMaterial, uploadItemMaterialImage, deleteItemMaterialImage } from '@/api/wms/itemMaterial'
import { listItemModel, listItemModelBrandOptions } from '@/api/wms/itemModel'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { joinCatalogPath, withCategoryPathLabels } from '@/utils/wmsUtil'
import { useGalleryFillPage } from '@/composables/useGalleryFillPage'
import CatalogHierarchySteps from '@/components/CatalogHierarchySteps/index.vue'
import { Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const wmsStore = useWmsStore()
const itemMaterialList = ref([])
const total = ref(0)
const open = ref(false)
const buttonLoading = ref(false)
const loading = ref(true)
const title = ref('')
const viewMode = ref(localStorage.getItem('wms.itemMaterial.viewMode') || 'list')
const galleryGridRef = ref(null)
const imageUploadRef = ref(null)
const pendingImageFile = ref(null)
const pendingImageUrl = ref('')
const imageMarkedForRemoval = ref(false)
const queryBrandIds = ref([])
const queryModelOptions = ref([])
const queryMaterialOptions = ref([])
const formBrandIds = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: (localStorage.getItem('wms.itemMaterial.viewMode') || 'list') === 'gallery' ? 24 : 12,
    id: undefined,
    itemCategory: undefined,
    itemBrand: undefined,
    modelId: undefined
  },
})

const { queryParams, form } = toRefs(data)
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const categoryTreeWithPath = computed(() => withCategoryPathLabels(wmsStore.itemCategoryTreeList || []))
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const currentImageUrl = computed(() => pendingImageUrl.value || (!imageMarkedForRemoval.value ? form.value.imageUrl : ''))
const rules = computed(() => ({
  itemCategory: [{ required: true, message: tr('分类不能为空'), trigger: 'change' }],
  itemBrand: [{ required: true, message: tr('品牌不能为空'), trigger: 'change' }],
  modelId: [{ required: true, message: tr('包型不能为空'), trigger: 'change' }],
  materialName: [{ required: true, message: tr('材质名称不能为空'), trigger: 'blur' }]
}))

const queryBrandOptions = computed(() => {
  const all = wmsStore.itemBrandList || []
  if (!queryParams.value.itemCategory) return []
  const idSet = new Set(queryBrandIds.value.map(String))
  return all.filter(item => idSet.has(String(item.id)))
})

const filteredItemBrandOptions = computed(() => {
  const all = wmsStore.itemBrandList || []
  if (!form.value.itemCategory) return []
  const idSet = new Set(formBrandIds.value.map(String))
  return all.filter(item => idSet.has(String(item.id)))
})

const filteredItemModelOptions = computed(() => {
  const category = form.value.itemCategory
  const brand = form.value.itemBrand
  if (!category || !brand) return []
  return (wmsStore.itemModelList || []).filter(item =>
    String(item.itemCategory) === String(category) && String(item.itemBrand) === String(brand)
  )
})

watch(viewMode, (mode) => {
  localStorage.setItem('wms.itemMaterial.viewMode', mode)
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
  const path = findPath(categoryTreeWithPath.value)
  if (path) return path
  const name = getCategoryName(id)
  return name === '-' ? '' : name
})

const hierarchyBrandLabel = computed(() => {
  const id = queryParams.value.itemBrand
  if (!id) return ''
  const name = getBrandName(id)
  return name === '-' ? '' : name
})

const hierarchyModelLabel = computed(() => {
  const id = queryParams.value.modelId
  if (!id) return ''
  const fromOptions = (queryModelOptions.value || []).find((item) => String(item.id) === String(id))
  if (fromOptions?.modelName) return fromOptions.modelName
  return findModelById(id)?.modelName || ''
})

const listTitle = computed(() =>
  joinCatalogPath(
    hierarchyCategoryLabel.value,
    hierarchyBrandLabel.value,
    hierarchyModelLabel.value,
    tr('材质列表')
  )
)

function handleHierarchySelect(key) {
  if (key === 'material') return
  const q = {
    itemCategory: queryParams.value.itemCategory || undefined,
    itemBrand: queryParams.value.itemBrand || undefined,
    modelId: queryParams.value.modelId || undefined
  }
  if (key === 'category' || key === 'brand') {
    router.push({ path: '/basic/itemBrand', query: { itemCategory: q.itemCategory } })
    return
  }
  if (key === 'model') {
    router.push({
      path: '/basic/itemModel',
      query: {
        itemCategory: q.itemCategory,
        itemBrand: q.itemBrand,
        view: 'gallery'
      }
    })
  }
}

async function refreshQueryBrandOptions() {
  if (!queryParams.value.itemCategory) {
    queryBrandIds.value = []
    return
  }
  try {
    const res = await listItemModelBrandOptions(queryParams.value.itemCategory)
    queryBrandIds.value = res.data || []
  } catch (e) {
    queryBrandIds.value = []
  }
}

async function refreshFormBrandOptions() {
  if (!form.value.itemCategory) {
    formBrandIds.value = []
    return
  }
  try {
    const res = await listItemModelBrandOptions(form.value.itemCategory)
    formBrandIds.value = res.data || []
  } catch (e) {
    formBrandIds.value = []
  }
}

async function refreshQueryModelOptions() {
  if (!queryParams.value.itemCategory && !queryParams.value.itemBrand) {
    queryModelOptions.value = []
    return
  }
  const res = await listItemModel({
    itemCategory: queryParams.value.itemCategory,
    itemBrand: queryParams.value.itemBrand
  })
  queryModelOptions.value = res.data || []
}

async function refreshQueryMaterialOptions() {
  queryMaterialOptions.value = []
  if (!queryParams.value.modelId) return
  try {
    const res = await listItemMaterial({ modelId: queryParams.value.modelId })
    queryMaterialOptions.value = res.data || []
  } catch (e) {
    queryMaterialOptions.value = []
  }
}

async function handleQueryCategoryChange() {
  queryParams.value.itemBrand = undefined
  queryParams.value.modelId = undefined
  queryParams.value.id = undefined
  queryMaterialOptions.value = []
  await refreshQueryBrandOptions()
  await refreshQueryModelOptions()
}

async function handleQueryBrandChange() {
  queryParams.value.modelId = undefined
  queryParams.value.id = undefined
  queryMaterialOptions.value = []
  await refreshQueryModelOptions()
}

async function handleQueryModelChange() {
  queryParams.value.id = undefined
  await refreshQueryMaterialOptions()
}

async function handleCategoryChange() {
  form.value.itemBrand = null
  form.value.modelId = null
  await refreshFormBrandOptions()
}

function handleBrandChange() {
  form.value.modelId = null
}

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

async function syncMaterialImage(materialId) {
  if (!materialId) return
  if (pendingImageFile.value) {
    await uploadItemMaterialImage(materialId, pendingImageFile.value)
    return
  }
  if (imageMarkedForRemoval.value) {
    await deleteItemMaterialImage(materialId)
  }
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

const { snapPageSize } = useGalleryFillPage({
  gridRef: galleryGridRef,
  viewMode,
  queryParams,
  reload: getList,
  minCardWidth: 220,
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

function reset() {
  resetImageState()
  form.value = {
    id: null,
    itemCategory: null,
    itemBrand: null,
    modelId: null,
    materialName: null,
    materialCode: null,
    imageOssId: null,
    imageUrl: '',
    specialFlag: false,
    orderNum: null,
    status: '1',
    remark: null
  }
  formBrandIds.value = []
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
  queryParams.value.id = undefined
  queryParams.value.itemCategory = undefined
  queryParams.value.itemBrand = undefined
  queryParams.value.modelId = undefined
  queryBrandIds.value = []
  queryModelOptions.value = []
  queryMaterialOptions.value = []
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = tr('新增材质')
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
    imageOssId: res.data?.imageOssId ? String(res.data.imageOssId) : null,
    imageUrl: res.data?.imageUrl || ''
  }
  await refreshFormBrandOptions()
  open.value = true
  title.value = tr('修改材质')
}

function submitForm() {
  proxy.$refs.itemMaterialRef.validate(async valid => {
    if (!valid) return
    buttonLoading.value = true
    const payload = { ...form.value, imageOssId: normalizeImageOssId(form.value.imageOssId) }
    try {
      let materialId = payload.id
      if (payload.id) {
        await updateItemMaterial(payload)
      } else {
        const res = await addItemMaterial(payload)
        materialId = res?.data?.id ?? res?.data
      }
      try {
        await syncMaterialImage(materialId)
      } catch (error) {
        proxy.$modal.msgWarning(tr('图片上传失败，请稍后重试'))
      }
      proxy.$modal.msgSuccess(payload.id ? tr('修改成功') : tr('新增成功'))
      open.value = false
      resetImageState()
      await wmsStore.getItemMaterialList()
      await getList()
    } finally {
      buttonLoading.value = false
    }
  })
}

async function handleDelete(row) {
  await proxy.$modal.confirm(isEn.value ? `Confirm delete material [${row.materialName}]?` : `确认删除材质【${row.materialName}】吗？`)
  await delItemMaterial(row.id)
  proxy.$modal.msgSuccess(tr('删除成功'))
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

async function applyRouteQuery() {
  const q = route.query || {}
  if (q.itemCategory) queryParams.value.itemCategory = Number(q.itemCategory) || q.itemCategory
  if (q.itemBrand) queryParams.value.itemBrand = Number(q.itemBrand) || q.itemBrand
  if (q.modelId) queryParams.value.modelId = Number(q.modelId) || q.modelId
  if (q.view === 'gallery' || q.view === 'list') viewMode.value = q.view
  if (queryParams.value.itemCategory) await refreshQueryBrandOptions()
  await refreshQueryModelOptions()
  if (queryParams.value.modelId) await refreshQueryMaterialOptions()
}

async function initPage() {
  await Promise.all([ensureCategoryOptions(), ensureBrandOptions(), ensureModelOptions()])
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
.material-query-form :deep(.el-form-item__label) {
  white-space: nowrap;
}
.material-drawer-form :deep(.el-form-item__label) {
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
.gallery-body {
  display: flex;
  flex-direction: column;
  padding: 12px 12px 10px;
}
.gallery-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
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
