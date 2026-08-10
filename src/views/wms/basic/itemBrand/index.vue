<template>
  <div class="app-container item-brand-page" :class="{ 'is-en': isEn }">
    <el-card>
      <CatalogHierarchySteps
        current="brand"
        :category-label="hierarchyCategoryLabel"
        @select="handleHierarchySelect"
      />
      <el-form :model="queryParams" ref="queryRef" :inline="true" :label-width="queryLabelWidth" class="brand-query-form">
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
        <el-form-item :label="tr('品牌名称')" prop="id">
          <el-select
            v-model="queryParams.id"
            :placeholder="queryParams.itemCategory ? tr('请选择品牌') : tr('请先选择分类')"
            clearable
            filterable
            :disabled="!queryParams.itemCategory"
            style="width: 240px"
          >
            <el-option v-for="item in queryBrandOptions" :key="item.id" :label="item.brandName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" justify="space-between" align="middle">
        <el-col :span="14" class="title-with-tip">
          <span class="table-title" :title="listTitle">{{ listTitle }}</span>
          <span class="list-tip">{{ tr('图片为该品牌下第1个包型图，详情请进入包型查看') }}</span>
        </el-col>
        <el-col :span="10" class="toolbar-right">
          <el-radio-group v-model="viewMode" size="small" class="view-toggle">
            <el-radio-button label="list">{{ tr('列表') }}</el-radio-button>
            <el-radio-button label="gallery">{{ tr('图集') }}</el-radio-button>
          </el-radio-group>
          <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wms:itemBrand:edit']">
            {{ tr('新增') }}
          </el-button>
        </el-col>
      </el-row>

      <el-table
        v-if="viewMode === 'list'"
        v-loading="loading"
        :data="itemBrandList"
        border
        class="mt20"
        :empty-text="tr('暂无') + tr('品牌')"
      >
        <el-table-column :label="tr('图片')" width="90" align="center" header-align="left">
          <template #default="{ row }">
            <el-image
              v-if="row.coverImageUrl"
              class="thumb"
              :src="row.coverImageUrl"
              fit="cover"
              :preview-src-list="[row.coverImageUrl]"
              preview-teleported
            />
            <div v-else class="thumb empty-thumb">{{ tr('暂无图片') }}</div>
          </template>
        </el-table-column>
        <el-table-column
          class-name="catalog-focus-col"
          label-class-name="catalog-focus-col"
          :label="tr('品牌名称')"
          prop="brandName"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column :label="tr('关联分类')" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ formatCategories(row.categoryNames) }}</template>
        </el-table-column>
        <el-table-column :label="tr('包型数')" prop="modelCount" width="100" align="right">
          <template #default="{ row }">{{ row.modelCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column :label="tr('创建时间')" prop="createTime" width="180" />
        <el-table-column v-hasPermi="['wms:itemBrand:edit']" :label="tr('操作')" align="right" header-align="left" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="goModels(row)">{{ tr('包型') }}</el-button>
            <el-button link type="primary" icon="Edit" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-else ref="galleryGridRef" v-loading="loading" class="gallery-grid mt20">
        <div v-if="!itemBrandList.length" class="gallery-empty">{{ tr('暂无数据') }}</div>
        <article v-for="row in itemBrandList" :key="row.id" class="gallery-card" @click="handleUpdate(row)">
          <div class="gallery-cover">
            <el-image
              v-if="row.coverImageUrl"
              :src="row.coverImageUrl"
              fit="cover"
              :preview-src-list="[row.coverImageUrl]"
              preview-teleported
              @click.stop
            />
            <div v-else class="gallery-cover-empty">{{ tr('暂无图片') }}</div>
          </div>
          <div class="gallery-body">
            <h3 class="gallery-title" :title="row.brandName">{{ row.brandName }}</h3>
            <p class="gallery-meta muted">{{ formatCategories(row.categoryNames) }}</p>
            <p class="gallery-meta">{{ tr('包型数') }}：{{ row.modelCount ?? 0 }}</p>
            <div class="gallery-actions" @click.stop>
              <el-button link type="primary" @click="goModels(row)">{{ tr('查看包型') }}</el-button>
              <el-button link type="primary" @click="handleUpdate(row)">{{ tr('修改') }}</el-button>
              <el-button link type="danger" v-hasPermi="['wms:itemBrand:edit']" @click="handleDelete(row)">{{ tr('删除') }}</el-button>
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
      <el-form ref="itemBrandRef" :model="form" :rules="rules" :label-width="drawerLabelWidth">
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
          >
            <template #default="{ data }">
              <span>{{ data.shortLabel }}</span>
            </template>
          </el-tree-select>
        </el-form-item>
        <el-form-item :label="tr('品牌名称')" prop="brandName">
          <el-input v-model="form.brandName" :placeholder="tr('请输入') + tr('品牌名称')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" class="action-btn" @click="submitForm">{{ tr('确认') }}</el-button>
          <el-button class="action-btn" @click="cancel">{{ tr('取消') }}</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="ItemBrand">
import { getItemBrand, delItemBrand, addItemBrand, updateItemBrand, listItemBrandPage } from '@/api/wms/itemBrand'
import { listItemModelBrandOptions } from '@/api/wms/itemModel'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { joinCatalogPath, withCategoryPathLabels } from '@/utils/wmsUtil'
import { useGalleryFillPage } from '@/composables/useGalleryFillPage'
import CatalogHierarchySteps from '@/components/CatalogHierarchySteps/index.vue'
import { useRouter, useRoute } from 'vue-router'

const { proxy } = getCurrentInstance()
const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const wmsStore = useWmsStore()

const itemBrandList = ref([])
const open = ref(false)
const buttonLoading = ref(false)
const loading = ref(true)
const total = ref(0)
const title = ref('')
const viewMode = ref(localStorage.getItem('wms.itemBrand.viewMode') || 'list')
const galleryGridRef = ref(null)
const queryBrandIds = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: (localStorage.getItem('wms.itemBrand.viewMode') || 'list') === 'gallery' ? 24 : 12,
    id: undefined,
    itemCategory: undefined
  }
})

const { queryParams, form } = toRefs(data)
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const queryLabelWidth = computed(() => (isEn.value ? '90px' : '68px'))
const drawerLabelWidth = computed(() => (isEn.value ? '110px' : '80px'))
const categoryTreeWithPath = computed(() => withCategoryPathLabels(wmsStore.itemCategoryTreeList || []))
const queryBrandOptions = computed(() => {
  const all = wmsStore.itemBrandList || []
  if (!queryParams.value.itemCategory) return []
  const idSet = new Set(queryBrandIds.value.map(String))
  return all.filter((item) => idSet.has(String(item.id)))
})
const rules = computed(() => ({
  itemCategory: [{ required: true, message: tr('分类不能为空'), trigger: 'change' }],
  brandName: [{ required: true, message: tr('品牌名称不能为空'), trigger: 'blur' }]
}))

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
  return findPath(categoryTreeWithPath.value) || wmsStore.itemCategoryMap.get(id)?.categoryName || ''
})

const listTitle = computed(() => joinCatalogPath(hierarchyCategoryLabel.value, tr('品牌列表')))

watch(viewMode, (mode) => {
  localStorage.setItem('wms.itemBrand.viewMode', mode)
})

function formatCategories(names) {
  if (!Array.isArray(names) || !names.length) return '-'
  return names.join(' / ')
}

function handleHierarchySelect(key) {
  if (key === 'category' || key === 'brand') return
  const q = {
    itemCategory: queryParams.value.itemCategory || undefined
  }
  if (key === 'model') {
    router.push({ path: '/basic/itemModel', query: { ...q, view: 'gallery' } })
    return
  }
  if (key === 'material') {
    router.push({ path: '/basic/itemMaterial', query: { ...q, view: 'gallery' } })
  }
}

function goModels(row) {
  router.push({
    path: '/basic/itemModel',
    query: {
      itemBrand: row.id,
      itemCategory: queryParams.value.itemCategory || row.itemCategory || undefined,
      view: 'gallery'
    }
  })
}

async function ensureCategoryOptions() {
  if (!Array.isArray(wmsStore.itemCategoryTreeList) || wmsStore.itemCategoryTreeList.length === 0) {
    await wmsStore.getItemCategoryTreeList()
  }
  if (!Array.isArray(wmsStore.itemCategoryList) || wmsStore.itemCategoryList.length === 0) {
    await wmsStore.getItemCategoryList()
  }
  if (!Array.isArray(wmsStore.itemBrandList) || wmsStore.itemBrandList.length === 0) {
    await wmsStore.getItemBrandList()
  }
}

async function refreshQueryBrandOptions() {
  queryBrandIds.value = []
  if (!queryParams.value.itemCategory) return
  try {
    const res = await listItemModelBrandOptions(queryParams.value.itemCategory)
    queryBrandIds.value = res.data || []
  } catch (e) {
    queryBrandIds.value = []
  }
}

async function handleQueryCategoryChange() {
  queryParams.value.id = undefined
  await refreshQueryBrandOptions()
}

async function getList() {
  loading.value = true
  try {
    await ensureCategoryOptions()
    const res = await listItemBrandPage(queryParams.value)
    itemBrandList.value = res.rows || []
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

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    id: null,
    itemCategory: null,
    brandName: null
  }
  proxy.resetForm('itemBrandRef')
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  queryParams.value.id = undefined
  queryParams.value.itemCategory = undefined
  queryBrandIds.value = []
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = tr('新增') + tr('品牌')
}

async function handleUpdate(row) {
  reset()
  const response = await getItemBrand(row.id)
  form.value = {
    id: response.data?.id,
    itemCategory: response.data?.itemCategory || null,
    brandName: response.data?.brandName || null
  }
  open.value = true
  title.value = tr('修改') + tr('品牌')
}

function submitForm() {
  proxy.$refs.itemBrandRef.validate(async valid => {
    if (!valid) return
    buttonLoading.value = true
    const payload = {
      id: form.value.id,
      itemCategory: form.value.itemCategory,
      brandName: form.value.brandName
    }
    try {
      if (payload.id) {
        await updateItemBrand(payload)
      } else {
        await addItemBrand(payload)
      }
      proxy.$modal.msgSuccess(payload.id ? tr('修改成功') : tr('新增成功'))
      open.value = false
      await wmsStore.getItemBrandList()
      await getList()
    } finally {
      buttonLoading.value = false
    }
  })
}

async function handleDelete(row) {
  const categoryId = queryParams.value.itemCategory
  const tip = categoryId
    ? (isEn.value
      ? `Remove brand [${row.brandName}] from this category? (Other categories are unaffected.)`
      : `确认从当前分类移除品牌【${row.brandName}】吗？（不影响其他分类）`)
    : (isEn.value ? `Confirm delete brand [${row.brandName}]?` : `确认删除品牌【${row.brandName}】吗？`)
  await proxy.$modal.confirm(tip)
  await delItemBrand(row.id, categoryId)
  proxy.$modal.msgSuccess(tr('删除成功'))
  await wmsStore.getItemBrandList()
  await getList()
}

function applyRouteQuery() {
  const q = route.query || {}
  if (q.itemCategory) {
    queryParams.value.itemCategory = Number(q.itemCategory) || q.itemCategory
  }
  if (q.view === 'gallery' || q.view === 'list') {
    viewMode.value = q.view
  }
}

applyRouteQuery()
refreshQueryBrandOptions().finally(() => getList())
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
.title-with-tip {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
}
.list-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
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
.brand-query-form :deep(.el-form-item__label) {
  white-space: nowrap;
}
.action-btn {
  min-width: 96px;
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
  font-size: 11px;
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
  background: #f5f7fa;
}
.gallery-body {
  display: flex;
  flex-direction: column;
  padding: 12px 12px 10px;
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
</style>
