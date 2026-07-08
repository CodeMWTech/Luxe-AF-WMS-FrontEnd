<template>
  <div class="app-container item-page" :class="{ 'is-en': isEn }">
    <ItemSearchPanel
      ref="queryFormRef"
      :query-params="queryParams"
      :supplier-options="supplierOptions"
      :is-supplier-user="isSupplierUser"
      :default-time="defaultTime"
      :can-view-selling-price="canViewSellingPrice"
      :ITEM_CONDITION_OPTIONS="ITEM_CONDITION_OPTIONS"
      :AUTH_AGENCY_OPTIONS="AUTH_AGENCY_OPTIONS"
      :tr="tr"
      @search="handleQuery"
      @reset="resetQuery"
      @open-name-tag-drawer="openNameTagDrawer"
    />
    <el-card class="mt20">
      <div class="item-content-layout" :class="{ 'is-category-collapsed': isCategoryPanelCollapsed }">
        <ItemCategoryPanel
          v-model:collapsed="isCategoryPanelCollapsed"
          :tree-options="itemCategoryTreeOptionsList"
          :tr="tr"
          :allow-drop="collapse"
          @add-category="handleAddType(false)"
          @append="append"
          @remove="remove"
          @edit="edit"
          @query-type="handleQueryType"
          @node-drop="handleNodeDrop"
          @layout-change="layoutItemTable"
        />
        <ItemTablePanel
          ref="itemTableRef"
          :collapsed="isCategoryPanelCollapsed"
          :item-list="itemList"
          :query-params="queryParams"
          :total="total"
          :loading="loading"
          :multiple="multiple"
          :is-supplier-user="isSupplierUser"
          :can-view-cost-price="canViewCostPrice"
          :can-view-selling-price="canViewSellingPrice"
          :amount-column-label="amountColumnLabel"
          :span-method="spanMethod"
          :get-item-row-key="getItemRowKey"
          :is-purchase-selectable="isPurchaseSelectable"
          :field-label="fieldLabel"
          :purchase-status-type="purchaseStatusType"
          :purchase-status-label="purchaseStatusLabel"
          :get-main-image-url="getMainImageUrl"
          :tr="tr"
          @toggle-category="toggleCategoryPanel"
          @export="handleExport"
          @select-purchase="handleSelectPurchase"
          @add="handleAdd"
          @selection-change="handleSelectionChange"
          @delete="handleDelete"
          @update="handleUpdate"
          @pagination="getList"
        />
      </div>
    </el-card>
    <!-- 添加或修改物料对话框 -->
    <ItemFormDrawer
      ref="itemFormRef"
      :dialog="dialog"
      :sku-loading="skuLoading"
      :form="form"
      :rules="rules"
      :item-category-tree-select-list="itemCategoryTreeSelectList"
      :ITEM_CONDITION_OPTIONS="ITEM_CONDITION_OPTIONS"
      :AUTH_AGENCY_OPTIONS="AUTH_AGENCY_OPTIONS"
      :ACCESSORY_TAG_OPTIONS="ACCESSORY_TAG_OPTIONS"
      :supplier-options="supplierOptions"
      :is-supplier-user="isSupplierUser"
      :can-view-cost-price="canViewCostPrice"
      :can-edit-cost-price="canEditCostPrice"
      :can-view-selling-price="canViewSellingPrice"
      :can-edit-selling-price="canEditSellingPrice"
      :has-item-model-context="hasItemModelContext"
      :selected-item-model="selectedItemModel"
      :filtered-item-model-list="filteredItemModelList"
      :has-item-material-context="hasItemMaterialContext"
      :selected-item-material="selectedItemMaterial"
      :filtered-item-material-list="filteredItemMaterialList"
      :pending-image-files="pendingImageFiles"
      :IMAGE_LIMIT="IMAGE_LIMIT"
      :uploaded-image-preview-list="uploadedImagePreviewList"
      :pending-image-preview-list="pendingImagePreviewList"
      :has-uploading-images="hasUploadingImages"
      :uploading-image-count="uploadingImageCount"
      :button-loading="buttonLoading"
      :tr="tr"
      @open-name-tag-drawer="openNameTagDrawer"
      @add-category="handleAddType(true)"
      @cost-price-change="handleCostPriceChange"
      @material-change="handleMaterialChange"
      @append-accessory-tag="appendAccessoryTag"
      @image-drag-start="onImageDragStart"
      @image-drop="onImageDrop"
      @retry-image="retryItemImage"
      @remove-image="removeItemImage"
      @remove-pending-image="removePendingImage"
      @image-exceed="handleImageExceed"
      @pending-image-change="onPendingImageChange"
      @submit="submitForm"
      @cancel="cancel"
    />
    <ItemCategoryDialog
      ref="itemCategoryFormRef"
      :dialog="categoryDialog"
      :form="categoryForm"
      :rules="typeRules"
      :tree-options="itemCategoryTreeSelectList"
      :loading="buttonLoading"
      :tr="tr"
      @submit="submitCategoryForm"
      @cancel="cancelType"
    />
    <ItemNameTagDrawer
      v-model:visible="nameTagDrawerVisible"
      v-model:draft="newNameTag"
      :tags="nameTagList"
      :tr="tr"
      @add="addNameTag"
      @remove="removeNameTag"
      @insert="insertNameTag"
    />
    <div id="outSkuIdBox" style="display: none">
      <img :src="qrcode"/>
      <canvas ref="barcode"></canvas>
    </div>
  </div>
</template>

<script setup name="Item">
import { getItem, delItem, addItem, updateItem, uploadItemImage, deleteItemImage, getItemImages, selectItemsForPurchase } from '@/api/wms/item';
import { listSupplierNoPage, getCurrentSupplier } from '@/api/wms/supplier';
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRefs, watch } from 'vue';
import { ElForm, ElMessage } from 'element-plus';
import {getRowspanMethod} from "@/utils/getRowSpanMethod";
import {listItemSkuPage, delItemSku, listItemSku, exportItemSku} from "@/api/wms/itemSku";
import {useRoute} from "vue-router";
import Qrcode from 'qrcode'
import JSBarcode from 'jsbarcode'
import {useWmsStore} from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { formatDateTimeForQuery } from '@/utils/laTime'
import { listItemModelMaterialOptions } from '@/api/wms/itemModel'
import { blobValidate } from '@/utils/ruoyi'
import { downloadXlsx, getExportLanguageHeaders, getExportLanguagePayload, prepareLanguageXlsx } from '@/utils/xlsxTranslate'
import ItemCategoryPanel from './components/ItemCategoryPanel.vue'
import ItemSearchPanel from './components/ItemSearchPanel.vue'
import ItemTablePanel from './components/ItemTablePanel.vue'
import ItemFormDrawer from './components/ItemFormDrawer.vue'
import ItemCategoryDialog from './components/ItemCategoryDialog.vue'
import ItemNameTagDrawer from './components/ItemNameTagDrawer.vue'
import { useItemNameTags } from './composables/useItemNameTags'
import { useItemCategory } from './composables/useItemCategory'

const barcode = ref(null)
const route = useRoute()
const {proxy} = getCurrentInstance();
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const supplierOptions = ref([]);
const isSupplierUser = ref(false);

/** 初始化供应商相关数据 */
async function initSupplierData() {
  // 获取当前用户供应商身份（后端自动识别）
  try {
    const res = await getCurrentSupplier();
    if (res.data && res.data.isSupplier) {
      isSupplierUser.value = true;
    }
  } catch (_) {
    isSupplierUser.value = false;
  }
  // 非供应商用户加载全部供应商列表（用于筛选下拉）
  if (!isSupplierUser.value) {
    try {
      const res = await listSupplierNoPage({ status: 0 });
      supplierOptions.value = res.data || [];
    } catch (_) {
      supplierOptions.value = [];
    }
  }
}
const amountColumnLabel = computed(() => isEn.value ? 'Amount($)' : '金额($)')
const fieldLabel = (text) => `${tr(text)}${isEn.value ? ': ' : '：'}`
const PURCHASE_STATUS_LABELS = {
  0: '未选购',
  1: '待审核',
  2: '已选购',
  3: '已拒绝'
}
const purchaseStatusLabel = (status) => tr(PURCHASE_STATUS_LABELS[Number(status ?? 0)] || '未选购')
const purchaseStatusType = (status) => {
  const value = Number(status ?? 0)
  if (value === 1) return 'warning'
  if (value === 2) return 'success'
  if (value === 3) return 'danger'
  return 'info'
}
const isPurchaseSelectable = (row) => {
  const status = Number(row?.item?.purchaseStatus ?? 0)
  return !!row?.item?.supplierId && status !== 1 && status !== 2
}
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'));
const canEditSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:edit'));
const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'));
const canEditCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:edit'));
/** 成本价变更时，销售价 = 成本价 × 该系数（保留两位小数） */
const SELLING_PRICE_FROM_COST_MULTIPLIER = 1.8
/**
 * 用户修改成本价后同步建议销售价（不监听 v-model，避免打开编辑回填时覆盖已有销售价）
 */
function handleCostPriceChange(val) {
  if (!canEditCostPrice.value) return
  if (!canViewSellingPrice.value && !canEditSellingPrice.value) return
  if (val === null || val === undefined || val === '') {
    form.value.sellingPrice = null
    return
  }
  const n = Number(val)
  if (!Number.isFinite(n) || n < 0) {
    form.value.sellingPrice = null
    return
  }
  form.value.sellingPrice = Math.round(n * SELLING_PRICE_FROM_COST_MULTIPLIER * 100) / 100
}

function handleMaterialChange(id) {
  const material = useWmsStore().itemMaterialMap.get(id)
  form.value.material = material?.materialName || undefined
}
const itemList = ref([]);
const itemTableRef = ref(null);
const selectedItemMap = ref(new Map());
const isCategoryPanelCollapsed = ref(true);
const layoutItemTable = () => itemTableRef.value?.doLayout?.();
const toggleCategoryPanel = () => {
  isCategoryPanelCollapsed.value = !isCategoryPanelCollapsed.value;
}
watch(isCategoryPanelCollapsed, () => nextTick(layoutItemTable));
const itemCategoryTreeSelectList = computed(() => useWmsStore().itemCategoryTreeList);
const itemCategoryTreeOptionsList = computed(() => {
  let data = [...itemCategoryTreeSelectList.value];
  data.unshift({
    id: -1,
    label: '全部',
    children: []
  });
  return data;
});
const buttonLoading = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const skuLoading = ref(false)
/** 创建时间选择器默认时间：当天 00:00:00 - 23:59:59（参考库存记录） */
const defaultTime = reactive([new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)])
const queryFormRef = ref(ElForm);
const itemFormRef = ref(ElForm);
const itemCategoryFormRef = ref(ElForm);
const spanMethod = computed(() => getRowspanMethod(itemList.value, rowSpanArray.value))
const rowSpanArray = ref(['itemId'])
const qrcode = ref(null)
const dialog = reactive({
  visible: false,
  title: ''
});

/** 鉴定机构固定选项（仅可选，不可手输） */
const AUTH_AGENCY_OPTIONS = ['Entrupy', 'Real Authentication', 'Legitmark', 'CheckCheck', 'N/A']
/** 成色固定选项 */
const ITEM_CONDITION_OPTIONS = ['S', 'A', 'B', 'C', 'D']
/** 配件常用选项（可点击快速填入，也可自行输入） */
const ACCESSORY_TAG_OPTIONS = ['Dustbag', 'Box', 'ID card', 'Lock & Key', 'Strap', 'Receipt']

/** 点击配件 tag 时追加到输入框（已包含则不重复添加） */
const appendAccessoryTag = (tag) => {
  const val = form.value.accessories || ''
  const parts = val.split(/[,，、\n]+/).map(s => s.trim()).filter(Boolean)
  if (parts.includes(tag)) return
  form.value.accessories = parts.length ? parts.concat(tag).join(', ') : tag
}
/** 列表主图缓存与加载状态（兜底按 itemId 请求） */
const listMainImageUrlMap = ref(new Map())
const listMainImageLoadingSet = ref(new Set())
const listMainImageNoImageSet = ref(new Set())
const listMainImageErrorAtMap = ref(new Map())
const MAIN_IMAGE_RETRY_DELAY_MS = 30000

const getMainImageUrl = (row) => {
  const itemId = row?.itemId
  if (!itemId) return ''
  return listMainImageUrlMap.value.get(itemId) || ''
}

const ensureMainImageLoaded = (row) => {
  const itemId = row?.itemId
  const cachedUrl = getMainImageUrl(row)
  if (cachedUrl) return cachedUrl
  if (!itemId) return ''
  if (listMainImageNoImageSet.value.has(itemId)) return ''
  if (listMainImageLoadingSet.value.has(itemId)) return ''
  const lastErrorAt = listMainImageErrorAtMap.value.get(itemId) || 0
  if (lastErrorAt && Date.now() - lastErrorAt < MAIN_IMAGE_RETRY_DELAY_MS) return ''
  listMainImageLoadingSet.value.add(itemId)
  ;(async () => {
    try {
      const res = await getItemImages(itemId)
      const imageList = getImageListFromResponse(res) || []
      if (!imageList.length) {
        listMainImageNoImageSet.value.add(itemId)
        return
      }
      const mainImage = imageList.find((img) => Number(img?.isMain) === 1) || imageList[0]
      const nextUrl = mainImage?.thumbUrl || mainImage?.url || mainImage?.imageUrl || ''
      if (nextUrl) {
        listMainImageUrlMap.value.set(itemId, nextUrl)
      } else {
        listMainImageNoImageSet.value.add(itemId)
      }
    } catch (_) {
      // 兜底失败时静默，不影响列表展示；记录错误时间避免短时间内重试风暴
      listMainImageErrorAtMap.value.set(itemId, Date.now())
    } finally {
      listMainImageLoadingSet.value.delete(itemId)
    }
  })()
  return ''
}

const preloadMainImages = (rows) => {
  if (!Array.isArray(rows) || !rows.length) return
  rows.forEach((row) => {
    ensureMainImageLoaded(row)
  })
}
const initFormData = {
  id: undefined,
  itemName: undefined,
  itemCategory: undefined,
  itemBrand: undefined,
  itemCondition: undefined,
  year: undefined,
  cared: false,
  authAgency: undefined,
  consignInfo: undefined,
  defaultQty: 1,
  material: undefined,
  materialId: undefined,
  modelId: undefined,
  defect: undefined,
  accessories: undefined,
  remark: undefined,
  imageList: [], // 商品图片列表（编辑时由接口返回，项为 { id, url, isMain, sort }）
  skuCode: undefined, // SKU编码（与规格表第一行同步，主表校验与提示）
  costPrice: null,   // 成本价（与规格表第一行同步）
  sellingPrice: null, // 销售价（与规格表第一行同步）
}
function hasRequiredItemImage() {
  if (form.value?.id) {
    return Array.isArray(form.value.imageList) && form.value.imageList.some((img) => img?.uploadStatus !== 'failed')
  }
  return pendingImageFiles.value.length > 0
}

function validateItemImages(rule, value, callback) {
  if (hasRequiredItemImage()) {
    callback()
    return
  }
  callback(new Error('商品图片不能为空'))
}

function validateItemImagesOnNextTick() {
  nextTick(() => {
    itemFormRef.value?.validateField?.('imageList')
  })
}

const data = reactive({
  form: {...initFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    itemName: undefined,
    skuCode: undefined,         // SKU编码
    itemBrand: undefined,       // 品牌
    itemCategory: undefined,    // 分类
    itemCondition: undefined,   // 成色
    year: undefined,            // 年份
    cared: undefined,           // 是否已护理
    defaultQty: undefined,      // 默认数量
    authAgency: undefined,      // 鉴定机构
    consignInfo: undefined,     // 寄售信息
    createTimeRange: [],        // 创建时间区间 [开始, 结束]
    sellingPriceMin: undefined, // 销售价下限(元)
    sellingPriceMax: undefined, // 销售价上限(元)
    supplierId: undefined,      // 供应商筛选
  },
  rules: {
    itemName: [
      {required: true, message: "名称不能为空", trigger: "blur"}
    ],
    itemCategory: [
      {required: true, message: "分类不能为空", trigger: "blur"}
    ],
    itemBrand: [
      {required: true, message: "品牌不能为空", trigger: "change"}
    ],
    itemCondition: [
      {required: true, message: "成色不能为空", trigger: "blur"}
    ],
    year: [
      {required: true, message: "年份不能为空", trigger: "blur"}
    ],
    skuCode: [
      {required: true, message: "SKU编码不能为空", trigger: "blur"}
    ],
    imageList: [
      { required: true, validator: validateItemImages, trigger: "change" }
    ],
  }
});
const {queryParams, form, rules} = toRefs(data);
const {
  nameTagDrawerVisible,
  nameTagList,
  newNameTag,
  openNameTagDrawer,
  addNameTag,
  removeNameTag,
  insertNameTag
} = useItemNameTags({ queryParams, form })

const modelMaterialIds = ref([]);


const hasItemModelContext = computed(() => !!form.value.itemBrand && !!form.value.itemCategory)
const hasItemMaterialContext = computed(() => hasItemModelContext.value && !!form.value.modelId)

const filteredItemModelList = computed(() => {
  const brand = form.value.itemBrand
  const category = form.value.itemCategory
  if (!brand || !category) return []
  return useWmsStore().itemModelList.filter(item => {
    return String(item.itemBrand) === String(brand) && String(item.itemCategory) === String(category)
  })
})

const filteredItemMaterialList = computed(() => {
  const brand = form.value.itemBrand
  const category = form.value.itemCategory
  const model = form.value.modelId
  if (!brand || !category || !model) return []
  const materialIdSet = new Set(modelMaterialIds.value.map(id => String(id)))
  return useWmsStore().itemMaterialList.filter(item => {
    const materialModelId = item.modelId
    const brandMatched = String(item.itemBrand) === String(brand)
    const categoryMatched = String(item.itemCategory) === String(category)
    const modelMatched = String(materialModelId) === String(model)
    const relationMatched = modelMaterialIds.value.length === 0 || materialIdSet.has(String(item.id))
    return categoryMatched && brandMatched && modelMatched && relationMatched
  })
})

async function loadModelMaterialOptions(modelId) {
  if (!modelId) {
    modelMaterialIds.value = []
    form.value.materialId = undefined
    form.value.material = undefined
    return
  }
  const res = await listItemModelMaterialOptions(modelId)
  modelMaterialIds.value = res.data || []
  if (form.value.materialId && modelMaterialIds.value.length > 0 && !modelMaterialIds.value.some(id => String(id) === String(form.value.materialId))) {
    form.value.materialId = undefined
    form.value.material = undefined
  }
}
function findSelectOptionById(list, id) {
  if (id === undefined || id === null || id === '') return null
  return list.find(item => String(item.id) === String(id)) || null
}

const selectedItemModel = computed(() => findSelectOptionById(useWmsStore().itemModelList, form.value.modelId))
const selectedItemMaterial = computed(() => findSelectOptionById(useWmsStore().itemMaterialList, form.value.materialId))

watch(
  () => [form.value.itemBrand, form.value.itemCategory],
  () => {
    if (!hasItemModelContext.value) {
      form.value.modelId = undefined
      form.value.materialId = undefined
      form.value.material = undefined
      return
    }
    if (form.value.modelId) {
      const exists = filteredItemModelList.value.some(item => String(item.id) === String(form.value.modelId))
      if (!exists) {
        form.value.modelId = undefined
        form.value.materialId = undefined
        form.value.material = undefined
      }
    }
  }
)


watch(
  () => form.value.modelId,
  async (modelId, oldModelId) => {
    if (modelId === oldModelId) return
    await loadModelMaterialOptions(modelId)
  }
)

watch(
  () => filteredItemMaterialList.value,
  () => {
    if (!form.value.materialId) return
    const exists = filteredItemMaterialList.value.some(item => String(item.id) === String(form.value.materialId))
    if (!exists) {
      form.value.materialId = undefined
      form.value.material = undefined
    }
  }
)
const getList = async () => {
  const query = { ...queryParams.value };
  if (!canViewSellingPrice.value) {
    delete query.sellingPriceMin;
    delete query.sellingPriceMax;
  }
  if (query.createTimeRange && query.createTimeRange.length === 2) {
    query.startTime = formatDateTimeForQuery(query.createTimeRange[0]);
    query.endTime = formatDateTimeForQuery(query.createTimeRange[1]);
  }
  loading.value = true;
  const res = await listItemSkuPage(query);
  const content = [...res.rows];
  itemList.value = content.map((it) => ({...it, id: it.skuId,itemId: it?.item?.id}));
  listMainImageLoadingSet.value.clear()
  listMainImageNoImageSet.value.clear()
  listMainImageErrorAtMap.value.clear()
  preloadMainImages(itemList.value)
  total.value = res.total;
  await restoreItemSelection()
  loading.value = false;
}
const {
  categoryDialog,
  categoryForm,
  typeRules,
  handleAddType,
  append,
  remove,
  edit,
  collapse,
  handleNodeDrop,
  cancelType,
  handleQueryType,
  submitCategoryForm
} = useItemCategory({
  itemCategoryFormRef,
  queryParams,
  buttonLoading,
  proxy,
  tr,
  isEn,
  getList
})
const skuForm = reactive({
  itemSkuList: []
})
let imagePollTimer = null
const IMAGE_POLL_INTERVAL_MS = 5000
const IMAGE_POLL_TIMEOUT_MS = 120000

// 商品图片（方案B）：新增时暂存的待上传文件 { file, url }
const pendingImageFiles = ref([])
const IMAGE_LIMIT = 20
const IMAGE_SIZE_MB = 20
const imageDragState = reactive({ type: '', fromIndex: -1 })
const uploadedImagePreviewList = computed(() => (form.value.imageList || []).map(it => it.url || it.thumbUrl).filter(Boolean))
const pendingImagePreviewList = computed(() => pendingImageFiles.value.map(it => it.url).filter(Boolean))
const hasUploadingImages = computed(() => Array.isArray(form.value.imageList) && form.value.imageList.some(it => it.uploadStatus === 'uploading'))
const uploadingImageCount = computed(() => Array.isArray(form.value.imageList) ? form.value.imageList.filter(it => it.uploadStatus === 'uploading').length : 0)

function genTempId() {
  return `img_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizeUploadedImageMeta() {
  if (!Array.isArray(form.value.imageList)) return
  form.value.imageList.forEach((img, idx) => {
    img.sort = idx
    img.isMain = idx === 0 ? 1 : 0
    if (!img.tempId) img.tempId = genTempId()
    if (img.imageId == null && img.id != null) img.imageId = img.id
    if (!img.uploadStatus) img.uploadStatus = img.imageId != null ? 'done' : 'uploading'
  })
}

function normalizeServerImage(img, idx) {
  const displayUrl = img?.url || img?.thumbUrl || img?.imageUrl || ''
  const imageId = img?.imageId ?? img?.id ?? null
  return {
    ...img,
    tempId: img?.tempId || genTempId(),
    imageId,
    id: imageId,
    url: displayUrl,
    thumbUrl: img?.thumbUrl || displayUrl,
    uploadStatus: imageId != null ? 'done' : 'uploading',
    sort: img?.sort ?? idx,
    isMain: idx === 0 ? 1 : 0,
    queuedAt: Date.now(),
    file: img?.file
  }
}

/** 构造提交给后端的图片排序数据（按当前前端顺序） */
function buildImageListPayload() {
  const list = Array.isArray(form.value.imageList) ? form.value.imageList : []
  const doneList = list.filter((img) => img.uploadStatus === 'done' && img.imageId != null)
  return doneList.map((img, idx) => ({
    id: img.imageId,
    itemId: img.itemId ?? form.value.id,
    ossId: img.ossId,
    thumbOssId: img.thumbOssId,
    isMain: idx === 0 ? 1 : 0,
    sort: idx,
    status: img.status ?? 1
  }))
}

function onImageDragStart(type, fromIndex) {
  imageDragState.type = type
  imageDragState.fromIndex = fromIndex
}

function onImageDrop(type, toIndex) {
  if (imageDragState.type !== type) return
  const fromIndex = imageDragState.fromIndex
  if (fromIndex < 0 || fromIndex === toIndex) return
  if (type === 'uploaded') {
    const list = form.value.imageList || []
    if (!list.length) return
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    normalizeUploadedImageMeta()
  } else {
    const list = pendingImageFiles.value
    if (!list.length) return
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
  }
  imageDragState.type = ''
  imageDragState.fromIndex = -1
}

function beforeImageUpload(file) {
  const isImage = /^image\/(jpeg|jpg|png|gif|webp)/i.test(file.type)
  if (!isImage) {
    proxy?.$modal.msgError('只能上传 jpg/jpeg/png/gif/webp 格式图片')
    return false
  }
  const isLt = file.size / 1024 / 1024 < IMAGE_SIZE_MB
  if (!isLt) {
    proxy?.$modal.msgError(`图片大小不能超过 ${IMAGE_SIZE_MB}MB`)
    return false
  }
  return true
}

function handleImageExceed() {
  proxy?.$modal.msgError(`商品图片最多上传${IMAGE_LIMIT}张`)
}

/** 编辑时：自定义上传，走 /item/{itemId}/image/upload，不阻塞界面 */
async function customUpload(options) {
  const { file, existingImage } = options
  if (!beforeImageUpload(file)) return
  if (!form.value.id) return
  if (!Array.isArray(form.value.imageList)) form.value.imageList = []
  let localImage = existingImage
  if (!localImage) {
    const previewUrl = URL.createObjectURL(file)
    localImage = {
      tempId: genTempId(),
      imageId: null,
      itemId: form.value.id,
      url: previewUrl,
      thumbUrl: previewUrl,
      uploadStatus: 'uploading',
      file,
      sort: form.value.imageList.length,
      isMain: form.value.imageList.length === 0 ? 1 : 0,
      queuedAt: Date.now()
    }
    form.value.imageList.push(localImage)
  } else {
    localImage.file = file
    localImage.uploadStatus = 'uploading'
    localImage.queuedAt = Date.now()
    if (localImage.errorMessage) delete localImage.errorMessage
  }
  normalizeUploadedImageMeta()
  validateItemImagesOnNextTick()
  startImagePolling()
  ElMessage({ type: 'success', message: '图片已加入上传队列，正在后台处理', duration: 3000 })
  try {
    const res = await uploadItemImage(form.value.id, file, localImage.sort === 0, localImage.sort)
    if (res.code === 200) {
      const data = res.data || {}
      if (data.id != null && (data.url || data.thumbUrl || data.imageUrl)) {
        const merged = normalizeServerImage({ ...localImage, ...data }, localImage.sort)
        merged.uploadStatus = 'done'
        Object.assign(localImage, merged)
      } else if (data.id != null) {
        localImage.imageId = data.id
        localImage.id = data.id
      }
      localImage.itemId = form.value.id
      localImage.uploadStatus = localImage.imageId != null && (localImage.url || localImage.thumbUrl) ? 'done' : 'uploading'
      validateItemImagesOnNextTick()
      startImagePolling()
      nextTick(() => itemFormRef.value?.clearFiles?.())
    } else {
      localImage.uploadStatus = 'failed'
      validateItemImagesOnNextTick()
      localImage.errorMessage = res.msg || '上传失败'
      proxy?.$modal.msgError(localImage.errorMessage)
    }
  } catch (e) {
    localImage.uploadStatus = 'failed'
    validateItemImagesOnNextTick()
    localImage.errorMessage = '上传失败'
    proxy?.$modal.msgError('上传失败')
  }
}

/** 统一处理图片文件入口：新增/编辑、拖拽/点击都走这里 */
function handleSelectedImageFiles(files) {
  if (!files || !files.length) return
  const imageFiles = files.filter(file => /^image\/(jpeg|jpg|png|gif|webp)/i.test(file.type))
  if (!imageFiles.length) {
    proxy?.$modal.msgError('只能上传 jpg/jpeg/png/gif/webp 格式图片')
    return
  }

  // 编辑场景：直接上传到后端（复用 customUpload 逻辑），支持多张
  if (form.value.id) {
    const currentCount = (form.value.imageList?.length) || 0
    const remaining = IMAGE_LIMIT - currentCount
    if (remaining <= 0) {
      handleImageExceed()
      return
    }
    const validFiles = imageFiles.filter(file => beforeImageUpload(file))
    if (!validFiles.length) return
    const toUpload = validFiles.slice(0, remaining)
    if (imageFiles.length > toUpload.length || imageFiles.length > remaining) {
      proxy?.$modal.msgWarning(`最多还能上传 ${remaining} 张符合要求的图片，已自动忽略多余或不合规文件`)
    }
    toUpload.forEach(file => {
      customUpload({ file })
    })
    return
  }

  // 新增场景：仅加入待上传列表，不立刻请求后端
  const currentCount = pendingImageFiles.value.length
  const remaining = IMAGE_LIMIT - currentCount
  if (remaining <= 0) {
    handleImageExceed()
    return
  }
  const validFiles = imageFiles.filter(file => beforeImageUpload(file))
  if (!validFiles.length) return
  const toAdd = validFiles.slice(0, remaining)
  if (imageFiles.length > toAdd.length || imageFiles.length > remaining) {
    proxy?.$modal.msgWarning(`最多还能选择 ${remaining} 张符合要求的图片，已自动忽略多余或不合规文件`)
  }
  toAdd.forEach(file => {
    const url = URL.createObjectURL(file)
    pendingImageFiles.value.push({ file, url })
  })
  validateItemImagesOnNextTick()
}

/** el-upload 变更事件：点击选择文件也走统一入口 */
function onPendingImageChange(uploadFile) {
  const file = uploadFile?.raw
  if (!file) return
  handleSelectedImageFiles([file])
}

function removePendingImage(index) {
  const item = pendingImageFiles.value[index]
  if (item?.url) URL.revokeObjectURL(item.url)
  pendingImageFiles.value.splice(index, 1)
  validateItemImagesOnNextTick()
}

/** 删除已上传的商品图片：调用后端删除接口并从列表中移除 */
async function removeItemImage(index) {
  const list = form.value.imageList
  if (!list || !list[index]) return
  const img = list[index]
  const imageId = img.imageId ?? img.id
  if (imageId == null) {
    if (img.url && String(img.url).startsWith('blob:')) URL.revokeObjectURL(img.url)
    list.splice(index, 1)
    normalizeUploadedImageMeta()
    validateItemImagesOnNextTick()
    return
  }
  await proxy?.$modal.confirm('确认删除该图片吗？')
  try {
    await deleteItemImage(imageId)
    if (img.url && String(img.url).startsWith('blob:')) URL.revokeObjectURL(img.url)
    list.splice(index, 1)
    normalizeUploadedImageMeta()
    validateItemImagesOnNextTick()
    proxy?.$modal.msgSuccess('删除成功')
  } catch (e) {
    proxy?.$modal.msgError(e?.message || '删除失败')
  }
}
// sku 管理
const resetItemSkuList = () => {
  skuForm.itemSkuList = []
  skuForm.itemSkuList.push({
    id: '',
    itemId: '',
    skuCode: '',
    costPrice: null,
    sellingPrice: null,
  })
}

const onAppendBtnClick = () => {
  skuForm.itemSkuList.push({
    id: '',
    itemId: '',
    skuCode: '',
    costPrice: null,
    sellingPrice: null,
  })
}
const handleDeleteItemSku = async (row, index) => {
  if (!row.id) {
    skuForm.itemSkuList.splice(index, 1);
    return
  }
  if (skuForm.itemSkuList.length === 1) {
    return proxy?.$modal.msgError("至少包含一个商品规格");
  }
  await proxy?.$modal.confirm('确认删除规格【' + (row.skuCode || row.id) + '】吗？');
  loading.value = true;
  await delItemSku(row.id).finally(()=> loading.value = false);
  proxy?.$modal.msgSuccess("删除成功");
  const res = await getItem(row.itemId);
  skuForm.itemSkuList = res.data.sku
  form.value = res.data
}
const cancel = () => {
  reset();
  dialog.visible = false;
}
const reset = () => {
  pendingImageFiles.value.forEach((item) => {
    if (item?.url) URL.revokeObjectURL(item.url)
  })
  pendingImageFiles.value = []
  ;(form.value.imageList || []).forEach((img) => {
    if (img.url && String(img.url).startsWith('blob:')) URL.revokeObjectURL(img.url)
  })
  stopImagePolling()
  itemFormRef.value?.clearFiles?.()
  form.value = {...initFormData};
  modelMaterialIds.value = [];
  itemFormRef.value?.resetFields();
}

/** 表单重置 */
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields();
  handleQuery();
}

/** 多选框选中数据 */
let suppressItemSelectionChange = false

const getItemSelectionKey = (row) => {
  const key = row?.itemId || row?.item?.id
  return key ? String(key) : ''
}

const getItemRowKey = (row) => row?.skuId ? String(row.skuId) : getItemSelectionKey(row)

function syncSelectedItemIds() {
  ids.value = Array.from(selectedItemMap.value.keys())
  single.value = ids.value.length !== 1
  multiple.value = ids.value.length === 0
}

async function restoreItemSelection() {
  await nextTick()
  suppressItemSelectionChange = true
  itemTableRef.value?.clearSelection()
  const restoredKeySet = new Set()
  itemList.value.forEach(row => {
    const key = getItemSelectionKey(row)
    if (key && selectedItemMap.value.has(key) && !restoredKeySet.has(key) && isPurchaseSelectable(row)) {
      itemTableRef.value?.toggleRowSelection(row, true)
      restoredKeySet.add(key)
    }
  })
  await nextTick()
  suppressItemSelectionChange = false
  syncSelectedItemIds()
}

function clearItemSelection() {
  selectedItemMap.value.clear()
  syncSelectedItemIds()
  itemTableRef.value?.clearSelection()
}

const handleSelectionChange = (selection) => {
  if (suppressItemSelectionChange) return
  const selectedKeySet = new Set(selection.map(getItemSelectionKey).filter(Boolean))
  const selectedRowMap = new Map()
  selection.forEach(row => {
    const key = getItemSelectionKey(row)
    if (key && !selectedRowMap.has(key)) {
      selectedRowMap.set(key, row)
    }
  })
  const currentKeySet = new Set(itemList.value.map(getItemSelectionKey).filter(Boolean))
  currentKeySet.forEach(key => {
    if (selectedKeySet.has(key)) {
      selectedItemMap.value.set(key, selectedRowMap.get(key))
    } else {
      selectedItemMap.value.delete(key)
    }
  })
  syncSelectedItemIds()
}

const handleSelectPurchase = async () => {
  if (!ids.value.length) {
    proxy?.$modal.msgWarning(tr('请选择商品'))
    return
  }
  await proxy?.$modal.confirm(tr('确认将选中的商品提交选购审核？'))
  loading.value = true
  try {
    await selectItemsForPurchase(ids.value)
    proxy?.$modal.msgSuccess(tr('提交成功'))
    clearItemSelection()
    getList()
  } finally {
    loading.value = false
  }
}

/** 新增按钮操作 */
const handleAdd = () => {
  resetItemSkuList()
  dialog.visible = true;
  dialog.title = isEn.value ? 'Add Item' : "新增商品";
  nextTick(async () => {
    reset();
  });
}
/** 修改按钮操作 */
const handleUpdate = (row) => {
  resetItemSkuList()
  skuLoading.value = true
  dialog.visible = true;
  dialog.title = isEn.value ? 'Edit Item' : "修改商品";
  nextTick(async () => {
    try {
      reset();
      const _id = row?.itemId || ids.value[0]
      const [skuRes, itemRes] = await Promise.all([
        listItemSku({ itemId: _id }),
        getItem(_id)
      ])
      Object.assign(skuForm.itemSkuList, skuRes.data)
      const itemData = itemRes.data || {}
      const imageList = (itemData.imageList || itemData.images || []).map((img, idx) => normalizeServerImage(img, idx))
      form.value = { ...form.value, ...row.item, ...itemData, imageList }
      normalizeUploadedImageMeta()
      form.value.skuCode = skuForm.itemSkuList[0]?.skuCode ?? ''
      form.value.costPrice = canViewCostPrice.value ? (skuForm.itemSkuList[0]?.costPrice ?? null) : null
      form.value.sellingPrice = canViewSellingPrice.value ? (skuForm.itemSkuList[0]?.sellingPrice ?? null) : null
    } catch (error) {
      dialog.visible = false
      proxy?.$modal.msgError(error?.msg || error?.message || '加载商品详情失败')
    } finally {
      skuLoading.value = false
    }
  });
}
const submitForm = async () => {
  if (!hasRequiredItemImage()) {
    proxy?.$modal.msgError('商品图片不能为空')
    validateItemImagesOnNextTick()
    return
  }
  // 先校验商品主表（含商品名称、分类、品牌、成色、年份、SKU编码等）
  try {
    await itemFormRef.value.validate();
  } catch {
    return;
  }

  // 将主表填的 SKU 编码同步到规格行，再提交
  if (skuForm.itemSkuList && skuForm.itemSkuList.length) {
    skuForm.itemSkuList[0].skuCode = form.value.skuCode;
    if (canEditCostPrice.value) {
      skuForm.itemSkuList[0].costPrice = form.value.costPrice;
    }
    if (canEditSellingPrice.value) {
      skuForm.itemSkuList[0].sellingPrice = form.value.sellingPrice;
    }
  }
  const submitSkuList = (skuForm.itemSkuList || []).map((sku) => {
    const nextSku = { ...sku };
    if (!canEditCostPrice.value) {
      delete nextSku.costPrice;
    }
    if (!canEditSellingPrice.value) {
      delete nextSku.sellingPrice;
    }
    return nextSku;
  });
  form.value.sku = submitSkuList;

  if (!skuForm.itemSkuList || skuForm.itemSkuList.length === 0) {
    proxy?.$modal.msgError("至少包含一个商品规格");
    return;
  }
  if (hasUploadingImages.value) {
    proxy?.$modal.msgWarning('图片上传中，请稍后再保存')
    return
  }

  buttonLoading.value = true;
  try {
    // 先保存商品，拿到 itemId（新增时后端返回 Long 类型 itemId）
    let itemId = form.value.id;
    if (itemId) {
      normalizeUploadedImageMeta()
      const payload = {
        ...form.value,
        ...(canEditCostPrice.value ? {} : { costPrice: undefined }),
        ...(canEditSellingPrice.value ? {} : { sellingPrice: undefined }),
        imageList: buildImageListPayload()
      }
      await updateItem(payload);
    } else {
      const payload = { ...form.value };
      payload.pendingImageCount = pendingImageFiles.value.length;
      if (!canEditCostPrice.value) {
        delete payload.costPrice;
      }
      if (!canEditSellingPrice.value) {
        delete payload.sellingPrice;
      }
      delete payload.imageList;
      const res = await addItem(payload);
      itemId = res?.data?.id ?? res?.data?.itemId ?? res?.data;
      if (!itemId) {
        throw new Error('新增商品返回的ID为空');
      }
    }

    // 如果有待上传图片，后台入队上传，不阻塞界面
    if (itemId && pendingImageFiles.value.length) {
      ElMessage({ type: 'success', message: '图片在上传队列中（后台异步上传请勿重复提交）', duration: 5000 })
      const files = [...pendingImageFiles.value];
      files.forEach((item, index) => {
        uploadItemImage(itemId, item.file, index === 0, index).catch(() => {
          proxy?.$modal.msgWarning('商品已保存，但部分图片未能加入上传队列，可在修改中重新上传');
        });
      });
    }

      proxy?.$modal.msgSuccess(tr('修改成功'));
    dialog.visible = false;
    pendingImageFiles.value = [];
    await getList();
  } catch (err) {
    proxy?.$modal.msgError(err?.message || err?.msg || tr('失败'));
  } finally {
    buttonLoading.value = false;
  }
}

/** 从 getItemImages 响应里取出图片数组（兼容 data 直接为数组或 data.list / data.images） */
function getImageListFromResponse(res) {
  if (!res || res.code !== 200) return null
  const d = res.data
  if (Array.isArray(d)) return d
  if (d && Array.isArray(d.list)) return d.list
  if (d && Array.isArray(d.images)) return d.images
  return null
}

/** 轮询商品图片列表，发现 _local 的图片在后端已有 url 时替换并提示上传成功 */
async function pollItemImagesIfNeeded() {
  if (!form.value.id) return
  if (!Array.isArray(form.value.imageList) || !form.value.imageList.length) return
  const now = Date.now()
  const uploadingList = form.value.imageList.filter((img) => img.uploadStatus === 'uploading')
  if (!uploadingList.length) {
    stopImagePolling()
    return
  }
  try {
    const res = await getItemImages(form.value.id)
    const serverList = getImageListFromResponse(res)
    if (!serverList || !serverList.length) {
      form.value.imageList.forEach((img) => {
        if (img.uploadStatus === 'uploading' && img.queuedAt && now - img.queuedAt > IMAGE_POLL_TIMEOUT_MS) {
          img.uploadStatus = 'failed'
          img.errorMessage = '上传超时，请重试'
        }
      })
      return
    }
    let updated = false
    form.value.imageList = (form.value.imageList || []).map((localImg, index) => {
      if (localImg.uploadStatus !== 'uploading') return localImg
      const matchById = localImg.imageId != null && serverList.find(s => s.id != null && s.id === localImg.imageId)
      const matchBySort = localImg.sort != null && serverList.find(s => s.sort != null && s.sort === localImg.sort)
      const matchByIndex = serverList[index]
      const matched = matchById || matchBySort || matchByIndex
      const hasUrl = matched && matched.id != null && (matched.url || matched.thumbUrl || matched.imageUrl)
      if (hasUrl) {
        updated = true
        if (localImg.url && String(localImg.url).startsWith('blob:')) URL.revokeObjectURL(localImg.url)
        return normalizeServerImage({ ...localImg, ...matched, uploadStatus: 'done' }, localImg.sort ?? index)
      }
      if (localImg.queuedAt && now - localImg.queuedAt > IMAGE_POLL_TIMEOUT_MS) {
        return { ...localImg, uploadStatus: 'failed', errorMessage: '上传超时，请重试' }
      }
      return localImg
    })
    if (updated) {
      ElMessage({ type: 'success', message: '商品图片上传成功' })
    }
    if (!form.value.imageList.some((img) => img.uploadStatus === 'uploading')) {
      stopImagePolling()
    }
  } catch (e) {
    // 轮询失败静默
  }
}

function startImagePolling() {
  if (!form.value.id || !dialog.visible || !hasUploadingImages.value) return
  if (imagePollTimer) return
  imagePollTimer = setInterval(() => pollItemImagesIfNeeded(), IMAGE_POLL_INTERVAL_MS)
  pollItemImagesIfNeeded()
}

function stopImagePolling() {
  if (imagePollTimer) {
    clearInterval(imagePollTimer)
    imagePollTimer = null
  }
}

function retryItemImage(img, index) {
  if (!img || !form.value.id) return
  const file = img.file
  if (!file) {
    proxy?.$modal.msgWarning('该图片缺少本地文件，请重新选择上传')
    return
  }
  const list = form.value.imageList || []
  const current = list[index]
  if (!current) return
  customUpload({ file, existingImage: current })
}

watch(
  () => dialog.visible,
  (visible) => {
    if (visible) {
      startImagePolling()
    } else {
      stopImagePolling()
    }
  }
)

watch(
  () => hasUploadingImages.value,
  (uploading) => {
    if (uploading) startImagePolling()
    else stopImagePolling()
  }
)

onBeforeUnmount(() => {
  stopImagePolling()
})

const initItemCategoryDataIfNeeded = async () => {
  const wmsStore = useWmsStore()
  const tasks = []
  if (!Array.isArray(wmsStore.itemCategoryList) || wmsStore.itemCategoryList.length === 0) {
    tasks.push(wmsStore.getItemCategoryList())
  }
  if (!Array.isArray(wmsStore.itemCategoryTreeList) || wmsStore.itemCategoryTreeList.length === 0) {
    tasks.push(wmsStore.getItemCategoryTreeList())
  }
  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}
const initItemBrandDataIfNeeded = async () => {
  const wmsStore = useWmsStore()
  if (!Array.isArray(wmsStore.itemBrandList) || wmsStore.itemBrandList.length === 0) {
    await wmsStore.getItemBrandList()
  }
}
const initMaterialModelDataIfNeeded = async () => {
  const wmsStore = useWmsStore()
  const tasks = []
  if (!Array.isArray(wmsStore.itemMaterialList) || wmsStore.itemMaterialList.length === 0) {
    tasks.push(wmsStore.getItemMaterialList())
  }
  if (!Array.isArray(wmsStore.itemModelList) || wmsStore.itemModelList.length === 0) {
    tasks.push(wmsStore.getItemModelList())
  }
  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}
/** 删除按钮操作 */
const handleDelete = async (row) => {
  const _ids = row?.itemId || ids.value;
  await proxy?.$modal.confirm(tr('确认删除') + tr('商品') + '【' + row?.item.itemName + '】' + '？');
  loading.value = true;
  await delItem(_ids).finally(()=> loading.value = false);
  proxy?.$modal.msgSuccess(tr("删除成功"));
  await getList();
}
const treeRef = ref(null)
/** 导出按钮操作 */
const handleExport = async () => {
  const query = { ...queryParams.value }
  if (!canViewSellingPrice.value) {
    delete query.sellingPriceMin
    delete query.sellingPriceMax
  }
  if (query.createTimeRange && query.createTimeRange.length === 2) {
    query.startTime = formatDateTimeForQuery(query.createTimeRange[0])
    query.endTime = formatDateTimeForQuery(query.createTimeRange[1])
  }
  delete query.createTimeRange
  const exportLanguage = getExportLanguagePayload(isEn.value)
  const blobData = await exportItemSku(
    {
      ...query,
      ...exportLanguage
    },
    {
      timeout: 0,
      headers: getExportLanguageHeaders(isEn.value)
    }
  )
  const isBlob = blobValidate(blobData)
  if (!isBlob) {
    const resText = await blobData.text()
    const rspObj = JSON.parse(resText)
    proxy?.$modal.msgError(rspObj?.msg || tr('导出失败'))
    return
  }
  const excelData = await prepareLanguageXlsx(blobData, isEn.value)
  downloadXlsx(excelData, isEn.value ? 'MichaelStudioWMS-Item Management.xlsx' : 'MichaelStudioWMS-商品管理.xlsx')
}
/** 下载条形码 */
const downloadBarcode = (row) => {
  JSBarcode(barcode.value, row.barcode, {
    format: "CODE128",
    displayValue: true
  })
  const canvas = barcode.value
  //创建a标签
  let a = document.createElement('a')
  //设置下载文件的名字
  a.download = row.barcode
  a.href = canvas.toDataURL("image/png")
  a.click()
}
/** 下载二维码 */
const downloadQrcode = async (row) => {
  qrcode.value = await Qrcode.toDataURL(row.barcode)
  //创建a标签
  let a = document.createElement('a')
  //获取二维码的url并赋值为a.href
  a.href = qrcode.value
  //设置下载文件的名字
  a.download = row.barcode
  //点击事件，相当于下载
  a.click()
  //提示信息
  // this.$message.warn('下载中，请稍后...')
}
onMounted(async () => {
  try {
    await Promise.all([
      initItemCategoryDataIfNeeded(),
      initItemBrandDataIfNeeded(),
      initMaterialModelDataIfNeeded()
    ])
  } catch (_) {
    // 分类数据加载失败不阻断列表渲染
  }
  initSupplierData();
  nextTick(() => {
    getList();
    if (route.query.openDrawer) {
      handleAdd()
    }
  })
});
</script>
<style>
.item-content-layout {
  display: flex;
  align-items: flex-start;
  gap: 0;
  width: 100%;
}

.item-list-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.item-list-panel {
  flex: 1 1 auto;
  min-width: 0;
  position: relative;
  padding-left: 0;
}

.item-list-title-wrap {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.item-list-title {
  font-size: 18px;
  line-height: 32px;
  white-space: nowrap;
}

.item-list-expand-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  color: #606266;
  border-color: #dcdfe6;
}

.item-list-expand-btn:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.item-list-expand-btn :deep(.el-icon),
.item-list-expand-btn .el-icon {
  margin: 0;
  font-size: 16px;
}

.el-table .my-cell {
  vertical-align: top
}

.el-table__empty-text {
  width: 100%;
}
.item-main-image {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  display: inline-block;
}

.item-image-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
}
.item-image-upload .image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.item-image-upload .image-item {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
}
.item-image-upload .image-item .thumb {
  width: 100%;
  height: 100%;
  display: block;
}
.item-image-upload .image-item .main-tag {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(64, 158, 255, 0.9);
  color: #fff;
  font-size: 12px;
  text-align: center;
  padding: 2px 0;
}
.item-image-upload .image-item .btn-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 2px;
  min-height: 0;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 4px;
}
.item-image-upload .image-item .btn-retry {
  position: absolute;
  left: 2px;
  top: 2px;
  padding: 2px 4px;
  min-height: 0;
  background: rgba(230, 162, 60, 0.95);
  color: #fff;
  border-radius: 4px;
}
.item-image-upload .image-item .status-tag {
  position: absolute;
  left: 0;
  top: 0;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 16px;
  color: #fff;
  border-bottom-right-radius: 6px;
}
.item-image-upload .image-item .status-uploading {
  background: rgba(64, 158, 255, 0.95);
}
.item-image-upload .image-item .status-failed {
  background: rgba(245, 108, 108, 0.95);
}
.item-image-upload .upload-unified {
  width: 280px;
}
.item-image-upload .upload-unified :deep(.el-upload-dragger) {
  width: 280px;
  height: 126px;
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.item-image-upload .upload-unified .avatar-uploader-icon {
  margin-bottom: 4px;
}
.item-image-upload .upload-unified .upload-main-text {
  font-size: 13px;
  line-height: 18px;
  color: #606266;
}
.item-image-upload .upload-unified .upload-tip-text {
  margin-top: 6px;
  font-size: 12px;
  line-height: 17px;
  color: #909399;
}
.item-image-upload .upload-state-tip {
  width: 100%;
  margin-top: 6px;
  color: #e6a23c;
  font-size: 12px;
}
.item-image-upload .image-rule-tip {
  width: 100%;
  margin-top: 8px;
  color: #f56c6c;
  font-size: 13px;
  line-height: 20px;
}

.mt8 { margin-top: 8px; }
.accessory-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.accessory-tag {
  cursor: pointer;
}
.accessory-tag:hover {
  opacity: 0.85;
}

.item-name-with-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.item-name-with-tag .item-name-input { flex: 1; }
.item-name-with-tag .name-tag-btn {
  flex-shrink: 0;
  padding: 0 8px;
}
.item-name-with-tag .name-tag-btn-text { margin-left: 4px; }

.query-price-range {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.query-price-range :deep(.el-input-number) {
  flex: 1;
}
.query-price-range-separator {
  color: #606266;
  flex-shrink: 0;
}

.image-select :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 8px;
}
.image-select :deep(.el-input__inner) {
  height: 42px;
  line-height: 42px;
  font-weight: 600;
  color: #1f2937;
}
.image-select :deep(.el-input__prefix) {
  display: flex;
  align-items: center;
  left: 8px;
}
.image-select-prefix {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  overflow: hidden;
  background: #f2f5f8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.image-select-prefix img,
.image-select-empty {
  width: 100%;
  height: 100%;
  display: block;
}
.image-select-prefix img {
  object-fit: cover;
}
.image-select-empty {
  border: 1px dashed #dcdfe6;
  background: linear-gradient(135deg, #f8fafc, #eef2f7);
}
.image-select-popper.el-popper {
  border-radius: 10px;
  overflow: hidden;
}
.image-select-popper .el-select-dropdown {
  border-radius: 10px;
}
.image-select-popper .el-select-dropdown__wrap {
  max-height: 360px;
}
.image-select-popper .el-select-dropdown__item {
  height: auto;
  min-height: 0;
  padding: 0;
  line-height: normal;
  color: #1f2937;
}
.image-select-popper .el-select-dropdown__item.hover,
.image-select-popper .el-select-dropdown__item:hover {
  background: transparent;
}
.image-select-popper .el-select-dropdown__item.selected {
  color: #1f2937;
  font-weight: 400;
}
.image-option {
  min-height: 68px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: background-color 0.16s ease;
}
.image-select-popper .el-select-dropdown__item.hover .image-option,
.image-option:hover {
  background: #f3f6fb;
}
.image-option.is-selected {
  background: #f6f8fb;
}
.image-option-thumb {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  overflow: hidden;
  background: #f2f5f8;
  flex: 0 0 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.image-option-thumb img,
.image-option-empty {
  width: 100%;
  height: 100%;
  display: block;
}
.image-option-thumb img {
  object-fit: cover;
}
.image-option-empty {
  border: 1px dashed #dcdfe6;
  background: linear-gradient(135deg, #f8fafc, #eef2f7);
}
.image-option-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
.image-option-check {
  flex: 0 0 auto;
  margin-left: 8px;
  font-size: 18px;
  color: #111827;
}

.name-tag-drawer .name-tag-add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.name-tag-drawer .name-tag-add .el-input { flex: 1; }
.name-tag-drawer .name-tag-tip {
  font-size: 12px; color: #909399; margin-bottom: 12px;
}
.name-tag-drawer .name-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.name-tag-drawer .name-tag-item {
  cursor: pointer;
}
.name-tag-drawer .name-tag-item:hover { opacity: 0.85; }
.name-tag-drawer .name-tag-empty {
  font-size: 13px; color: #909399;
}

.item-page.is-en .el-form-item__label {
  white-space: nowrap;
}

.item-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-page .action-btn {
  min-width: 96px;
}

.item-page.is-en .action-btn {
  min-width: 110px;
}

@media (max-width: 768px) {
  .item-list-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .item-toolbar-actions {
    flex-wrap: wrap;
  }
}

</style>
