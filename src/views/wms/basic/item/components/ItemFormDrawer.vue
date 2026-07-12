<template>
    <el-drawer :title="dialog.title" v-model="dialog.visible" size="80%" append-to-body :close-on-click-modal="false">
      <div v-loading="skuLoading">
        <el-card>
          <el-form ref="itemFormRef" :model="form" :rules="rules" label-width="108px">
            <!-- 1.商品名称 2.商品分类 -->
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="商品名称" prop="itemName">
                  <div class="item-name-with-tag">
                    <el-input v-model="form.itemName" placeholder="请输入名称" class="item-name-input"/>
                    <el-button type="primary" link title="预处理标签" @click="emit('open-name-tag-drawer')" class="name-tag-btn">
                      <el-icon><Ticket /></el-icon><span class="name-tag-btn-text">标签</span>
                    </el-button>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="10">
                <el-form-item label="商品分类" prop="itemCategory">
                  <el-tree-select
                    ref="treeRef"
                    v-model="form.itemCategory"
                    :data="itemCategoryTreeSelectList"
                    :props="{ value: 'id', label: 'label', children: 'children' }"
                    value-key="id"
                    placeholder="请选择分类"
                    check-strictly
                    style="width: 100%!important;"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="2">
                <el-button link icon="Plus" type="primary" style="height: 32px!important;line-height: 32px!important;"
                           v-hasPermi="['wms:item:edit']"
                           @click="emit('add-category')">新增分类
                </el-button>
              </el-col>
            </el-row>
            <!-- 3.SKU编码 4.商品品牌 -->
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="SKU编码" prop="skuCode">
                  <el-input v-model="form.skuCode" placeholder="请输入SKU编码"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="商品品牌" prop="itemBrand">
                  <el-select v-model="form.itemBrand" clearable filterable style="width: 100%!important;">
                    <el-option
                      v-for="item in useWmsStore().itemBrandList"
                      :key="item.id"
                      :label="item.brandName"
                      :value="item.id"
                    ></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 5.成色 6.年份 -->
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="成色" prop="itemCondition">
                  <el-select v-model="form.itemCondition" placeholder="请选择成色" clearable style="width: 100%">
                    <el-option v-for="item in ITEM_CONDITION_OPTIONS" :key="item" :label="item" :value="item"/>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="年份" prop="year">
                  <el-input-number v-model="form.year" :min="0" :max="9999" :controls="false" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 7.成本价 8.销售价 -->
            <el-row :gutter="24">
              <el-col :span="12" v-if="canViewCostPrice">
                <el-form-item label="成本价">
                  <el-input-number v-model="form.costPrice" :disabled="!canEditCostPrice" :min="0" :precision="2" :controls="false" style="width: 100%" @change="emit('cost-price-change', $event)"/>
                </el-form-item>
              </el-col>
              <el-col :span="12" v-if="canViewSellingPrice">
                <el-form-item label="销售价">
                  <el-input-number v-model="form.sellingPrice" :disabled="!canEditSellingPrice" :min="0" :precision="2" :controls="false" style="width: 100%"/>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 9.鉴定机构 10.数量 -->
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="鉴定机构" prop="authAgency">
                  <el-select v-model="form.authAgency" placeholder="请选择鉴定机构" clearable style="width: 100%">
                    <el-option v-for="item in AUTH_AGENCY_OPTIONS" :key="item" :label="item" :value="item"/>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="数量">
                  <el-input-number v-model="form.defaultQty" :min="0" :controls="false" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 11.包型 12.材质 -->
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="包型" prop="modelId">
                  <el-select
                    v-model="form.modelId"
                    placeholder="请选择包型"
                    clearable
                    filterable
                    class="image-select"
                    popper-class="image-select-popper"
                    :disabled="!hasItemModelContext"
                    style="width: 100%"
                  >
                    <template v-if="selectedItemModel" #prefix>
                      <span class="image-select-prefix">
                        <img v-if="selectedItemModel.imageUrl" :src="selectedItemModel.imageUrl" alt="" />
                        <span v-else class="image-select-empty"></span>
                      </span>
                    </template>
                    <el-option
                      v-for="item in filteredItemModelList"
                      :key="item.id"
                      :label="item.modelName"
                      :value="item.id"
                    >
                      <div class="image-option" :class="{ 'is-selected': String(form.modelId) === String(item.id) }">
                        <span class="image-option-thumb">
                          <img v-if="item.imageUrl" :src="item.imageUrl" alt="" />
                          <span v-else class="image-option-empty"></span>
                        </span>
                        <span class="image-option-name">{{ item.modelName }}</span>
                        <el-icon v-if="String(form.modelId) === String(item.id)" class="image-option-check"><Check /></el-icon>
                      </div>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="材质" prop="materialId">
                  <el-select
                    v-model="form.materialId"
                    placeholder="请选择材质"
                    clearable
                    filterable
                    class="image-select"
                    popper-class="image-select-popper"
                    :disabled="!hasItemMaterialContext"
                    style="width: 100%"
                    @change="emit('material-change', $event)"
                  >
                    <template v-if="selectedItemMaterial" #prefix>
                      <span class="image-select-prefix">
                        <img v-if="selectedItemMaterial.imageUrl" :src="selectedItemMaterial.imageUrl" alt="" />
                        <span v-else class="image-select-empty"></span>
                      </span>
                    </template>
                    <el-option
                      v-for="item in filteredItemMaterialList"
                      :key="item.id"
                      :label="item.materialName"
                      :value="item.id"
                    >
                      <div class="image-option" :class="{ 'is-selected': String(form.materialId) === String(item.id) }">
                        <span class="image-option-thumb">
                          <img v-if="item.imageUrl" :src="item.imageUrl" alt="" />
                          <span v-else class="image-option-empty"></span>
                        </span>
                        <span class="image-option-name">{{ item.materialName }}</span>
                        <el-icon v-if="String(form.materialId) === String(item.id)" class="image-option-check"><Check /></el-icon>
                      </div>
                    </el-option>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 13.瑕疵 -->
            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="瑕疵" prop="defect">
                  <el-input v-model="form.defect" placeholder="请输入瑕疵描述" />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 是否已护理 -->
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="是否已护理">
                  <el-switch
                    v-model="form.cared"
                    active-text="Cared"
                    inactive-text="Not Cared"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 配件（多行，下方可点 tag 快速填入） -->
            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="配件" prop="accessories">
                  <el-input
                    v-model="form.accessories"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入配件信息，或点击下方标签快速填入"
                  />
                  <div class="accessory-tags mt8">
                    <el-tag
                      v-for="tag in ACCESSORY_TAG_OPTIONS"
                      :key="tag"
                      class="accessory-tag"
                      type="info"
                      effect="plain"
                      @click="emit('append-accessory-tag', tag)"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 寄售信息 -->
            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="寄售信息">
                  <el-input
                    v-model="form.consignInfo"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入寄售信息（如寄售渠道、周期、分成等）"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 12.备注 -->
            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="备注" prop="remark">
                  <el-input
                    v-model="form.remark"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入备注信息"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 供应商归属（仅 Luxeaf 后台可见） -->
            <el-row :gutter="24" v-if="!isSupplierUser">
              <el-col :span="12">
                <el-form-item label="供应商">
                  <el-select v-model="form.supplierId" placeholder="请选择供应商（不选归 Luxeaf）" clearable style="width: 100%">
                    <el-option :label="tr('Luxeaf 自有')" :value="null" />
                    <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplierName" :value="s.id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- 13.商品图片 -->
            <el-row :gutter="24">
              <el-col :span="24">
                <el-form-item label="商品图片" prop="imageList">
                  <div class="item-image-upload">
                    <!-- 图片列表（仅展示已关联到商品的图片状态） -->
                    <div class="image-list" v-if="form.id && form.imageList && form.imageList.length">
                      <div
                        class="image-item"
                        v-for="(img, idx) in form.imageList"
                        :key="img.tempId || img.imageId || img.id || idx"
                        draggable="true"
                        @dragstart="emit('image-drag-start', 'uploaded', idx)"
                        @dragover.prevent
                        @drop="emit('image-drop', 'uploaded', idx)"
                      >
                        <el-image
                          :src="img.thumbUrl || img.url"
                          :preview-src-list="uploadedImagePreviewList"
                          :initial-index="idx"
                          preview-teleported
                          fit="cover"
                          class="thumb"
                        />
                        <span v-if="idx === 0" class="main-tag">主图</span>
                        <span v-if="img.uploadStatus === 'uploading'" class="status-tag status-uploading">上传中</span>
                        <span v-else-if="img.uploadStatus === 'failed'" class="status-tag status-failed">上传失败</span>
                        <el-button
                          v-if="img.uploadStatus === 'failed'"
                          type="warning"
                          link
                          class="btn-retry"
                          @click="emit('retry-image', img, idx)"
                        >
                          重试
                        </el-button>
                        <el-button type="danger" link class="btn-remove" icon="Delete" @click="emit('remove-image', idx)" />
                      </div>
                    </div>
                    <!-- 新增时待上传的图片预览 -->
                    <div class="image-list" v-if="!form.id && pendingImageFiles.length">
                      <div
                        class="image-item"
                        v-for="(item, idx) in pendingImageFiles"
                        :key="idx"
                        draggable="true"
                        @dragstart="emit('image-drag-start', 'pending', idx)"
                        @dragover.prevent
                        @drop="emit('image-drop', 'pending', idx)"
                      >
                        <el-image
                          :src="item.url"
                          :preview-src-list="pendingImagePreviewList"
                          :initial-index="idx"
                          preview-teleported
                          fit="cover"
                          class="thumb"
                        />
                        <el-button type="danger" link class="btn-remove" icon="Delete" @click="emit('remove-pending-image', idx)" />
                      </div>
                    </div>
                    <!-- 统一上传区域：支持拖拽 + 点击选择 -->
                    <el-upload
                      ref="itemImageUploadRef"
                      v-show="(form.id ? (form.imageList?.length || 0) : pendingImageFiles.length) < IMAGE_LIMIT"
                      class="upload-unified"
                      drag
                      multiple
                      :auto-upload="false"
                      :limit="IMAGE_LIMIT"
                      :on-exceed="(...args) => emit('image-exceed', ...args)"
                      :on-change="(...args) => emit('pending-image-change', ...args)"
                      :show-file-list="false"
                      accept="image/*"
                    >
                      <el-icon class="avatar-uploader-icon"><Plus /></el-icon>
                      <div class="upload-main-text">将图片拖拽到此处，或点击上传</div>
                      <div class="upload-tip-text">
                        请上传大小不超过 20MB 的图片，格式 png/jpg/jpeg，最多上传{{ IMAGE_LIMIT }}张图片。
                        <br />
                        支持拖拽调整顺序，点击图片预览原图
                      </div>
                    </el-upload>
                    <div class="image-rule-tip">
                      图片上传规则：主图必须清晰展示商品正面，不得包含水印、拼图、无关背景或遮挡；如商品包含 COA 证书，必须上传清晰完整的 COA 图片且把 COA 图片放置为最后一张。
                    </div>
                    <div v-if="form.id && hasUploadingImages" class="upload-state-tip">
                      当前有 {{ uploadingImageCount }} 张图片上传中，上传完成后才可保存。
                    </div>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" :disabled="hasUploadingImages" type="primary" class="action-btn" @click="emit('submit')">{{ tr('\u786e\u8ba4') }}</el-button>
          <el-button class="action-btn" @click="emit('cancel')">{{ tr('\u53d6\u6d88') }}</el-button>
        </div>
      </template>
    </el-drawer>
</template>

<script setup>
import { ref } from 'vue'
import { Check, Plus, Ticket } from '@element-plus/icons-vue'
import { useWmsStore } from '@/store/modules/wms'

defineProps({
  dialog: { type: Object, required: true },
  skuLoading: { type: Boolean, default: false },
  form: { type: Object, required: true },
  rules: { type: Object, required: true },
  itemCategoryTreeSelectList: { type: Array, default: () => [] },
  ITEM_CONDITION_OPTIONS: { type: Array, default: () => [] },
  AUTH_AGENCY_OPTIONS: { type: Array, default: () => [] },
  ACCESSORY_TAG_OPTIONS: { type: Array, default: () => [] },
  supplierOptions: { type: Array, default: () => [] },
  isSupplierUser: { type: Boolean, default: false },
  canViewCostPrice: { type: Boolean, default: false },
  canEditCostPrice: { type: Boolean, default: false },
  canViewSellingPrice: { type: Boolean, default: false },
  canEditSellingPrice: { type: Boolean, default: false },
  hasItemModelContext: { type: Boolean, default: false },
  selectedItemModel: { type: Object, default: null },
  filteredItemModelList: { type: Array, default: () => [] },
  hasItemMaterialContext: { type: Boolean, default: false },
  selectedItemMaterial: { type: Object, default: null },
  filteredItemMaterialList: { type: Array, default: () => [] },
  pendingImageFiles: { type: Array, default: () => [] },
  IMAGE_LIMIT: { type: Number, required: true },
  uploadedImagePreviewList: { type: Array, default: () => [] },
  pendingImagePreviewList: { type: Array, default: () => [] },
  hasUploadingImages: { type: Boolean, default: false },
  uploadingImageCount: { type: Number, default: 0 },
  buttonLoading: { type: Boolean, default: false },
  tr: { type: Function, required: true }
})

const emit = defineEmits([
  'open-name-tag-drawer',
  'add-category',
  'cost-price-change',
  'material-change',
  'append-accessory-tag',
  'image-drag-start',
  'image-drop',
  'retry-image',
  'remove-image',
  'remove-pending-image',
  'image-exceed',
  'pending-image-change',
  'submit',
  'cancel'
])

const itemFormRef = ref(null)
const itemImageUploadRef = ref(null)

defineExpose({
  validate: () => itemFormRef.value?.validate?.(),
  resetFields: () => itemFormRef.value?.resetFields?.(),
  validateField: (field) => itemFormRef.value?.validateField?.(field),
  clearFiles: () => itemImageUploadRef.value?.clearFiles?.()
})
</script>
