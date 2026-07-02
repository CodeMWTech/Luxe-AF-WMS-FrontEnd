<template>
  <div class="app-container item-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryFormRef" label-width="88px" class="query-form">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="24" :md="18" :lg="18">
            <el-form-item label="商品名称" prop="itemName">
              <div class="item-name-with-tag">
                <el-input v-model="queryParams.itemName" placeholder="请输入商品名称" clearable @keyup.enter="handleQuery" class="item-name-input"/>
                <el-button type="primary" link title="预处理标签" @click="openNameTagDrawer('query')" class="name-tag-btn">
                  <el-icon><Ticket /></el-icon><span class="name-tag-btn-text">标签</span>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="6" :lg="6">
            <el-form-item label="SKU" prop="skuCode">
              <el-input v-model="queryParams.skuCode" placeholder="请输入SKU编码" clearable @keyup.enter="handleQuery" style="width: 100%"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="商品品牌" prop="itemBrand">
              <el-select v-model="queryParams.itemBrand" clearable filterable style="width: 100%">
                <el-option v-for="item in useWmsStore().itemBrandList" :key="item.id" :label="item.brandName" :value="item.id"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="成色" prop="itemCondition">
              <el-select v-model="queryParams.itemCondition" placeholder="请选择成色" clearable style="width: 100%">
                <el-option v-for="item in ITEM_CONDITION_OPTIONS" :key="item" :label="item" :value="item"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="年份" prop="year">
              <el-input-number v-model="queryParams.year" :min="0" :max="9999" :controls="false" style="width: 100%" @keyup.enter.native="handleQuery"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="鉴定机构" prop="authAgency">
              <el-select v-model="queryParams.authAgency" placeholder="请选择鉴定机构" clearable style="width: 100%">
                <el-option v-for="item in AUTH_AGENCY_OPTIONS" :key="item" :label="item" :value="item"/>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="数量" prop="defaultQty">
              <el-input-number v-model="queryParams.defaultQty" :min="0" :controls="false" style="width: 100%" @keyup.enter.native="handleQuery"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="已护理" prop="cared">
              <el-switch v-model="queryParams.cared" active-text="Yes" inactive-text="No" :active-value="true" :inactive-value="false"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item label="寄售信息" prop="consignInfo">
              <el-input v-model="queryParams.consignInfo" placeholder="请输入寄售信息关键字" clearable @keyup.enter="handleQuery" style="width: 100%"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" v-if="!isSupplierUser">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="queryParams.supplierId" placeholder="请选择供应商" clearable style="width: 100%">
                <el-option :label="tr('Luxeaf 自有')" :value="-1" />
                <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplierName" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item label="创建时间" prop="createTimeRange">
              <el-date-picker
                v-model="queryParams.createTimeRange"
                type="datetimerange"
                range-separator="至"
                format="MM/DD/YYYY HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                :default-time="defaultTime"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" v-if="canViewSellingPrice">
            <el-form-item label="销售价" prop="sellingPriceMin">
              <div class="query-price-range">
                <el-input-number v-model="queryParams.sellingPriceMin" :min="0" :precision="2" :controls="false" placeholder="最低" style="width: 100%"/>
                <span class="query-price-range-separator">至</span>
                <el-input-number v-model="queryParams.sellingPriceMax" :min="0" :precision="2" :controls="false" placeholder="最高" style="width: 100%"/>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label=" ">
              <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
              <el-button icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
    <el-card class="mt20">
      <div style="display: flex;align-items: start">
        <div>
          <div style="display: flex;align-items: center;justify-content: space-between">
            <span style="font-size: 18px;line-height: 18px">{{ tr('商品分类') }}</span>
            <el-button class="mr10" style="font-size:12px;line-height: 14px" plain
                     @click="handleAddType(false)"
                     v-hasPermi="['wms:item:edit']"
                     type="primary" icon="Plus">{{ tr('新增分类') }}
            </el-button>
          </div>
          <el-tree
            :data="itemCategoryTreeOptionsList"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            value-key="id"
            style="width: 400px;"
            class="mr10 mt10"
            @nodeClick="handleQueryType"
            :default-expand-all="true"
            :highlight-current="true"
            node-key="label"
            current-node-key="全部"
            draggable
            :allow-drop="collapse"
            @node-drop="handleNodeDrop"
            :expand-on-click-node="false"
          >
            <template #default="{ node, data }">
            <span class="custom-tree-node">
              <span>{{ tr(node.label) }}</span>
              <span>
                <el-button type="primary" @click.stop="append(data)" link
                         v-if="data.label !== '全部' && node.level < 2"
                         v-hasPermi="['wms:item:edit']"
                         icon="Plus" style="font-size: 12px">{{ tr('新增子分类') }}</el-button>
                <el-button type="primary" @click.stop="remove(node, data)" link
                         v-if="data.label !== '全部'"
                         v-hasPermi="['wms:item:edit']"
                         icon="Delete" style="font-size: 12px">{{ tr('删除') }}</el-button>
                <el-button type="primary" icon="Edit" @click.stop="edit(node, data)" link
                         v-if="data.label !== '全部'"
                         v-hasPermi="['wms:item:edit']"
                         style="font-size: 12px">{{ tr('修改') }}</el-button>
              </span>
            </span>
            </template>
          </el-tree>
        </div>
        <div style="width: 100%;position: relative">
          <div style="display: flex;align-items: start;justify-content: space-between">
            <span class="mr10" style="font-size: 18px;">{{ tr('商品列表') }}</span>
            <div class="item-toolbar-actions">
              <el-button type="primary" plain icon="Download" @click="handleExport" class="mb10" v-hasPermi="['wms:item:list']">{{ tr('导出Excel') }}</el-button>
              <el-button type="primary" plain icon="Plus" @click="handleAdd" class="mb10" v-hasPermi="['wms:item:edit']">{{ tr('新增商品') }}</el-button>
            </div>
          </div>
          <el-table :data="itemList" @selection-change="handleSelectionChange" :span-method="spanMethod" border :empty-text="tr('暂无商品')" v-loading="loading" cell-class-name="my-cell">
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
                <el-button link type="primary" @click="handleDelete(scope.row)" icon="Delete" v-hasPermi="['wms:item:edit']">{{ tr('删除') }}</el-button>
                <el-button link type="primary" @click="handleUpdate(scope.row)" icon="Edit" v-hasPermi="['wms:item:edit']">{{ tr('修改') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum"
                      v-model:limit="queryParams.pageSize" @pagination="getList"/>
        </div>
      </div>
    </el-card>
    <!-- 添加或修改物料对话框 -->
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
                    <el-button type="primary" link title="预处理标签" @click="openNameTagDrawer" class="name-tag-btn">
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
                           @click="handleAddType(true)">新增分类
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
                  <el-input-number v-model="form.costPrice" :disabled="!canEditCostPrice" :min="0" :precision="2" :controls="false" style="width: 100%" @change="handleCostPriceChange"/>
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
                    @change="handleMaterialChange"
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
                      @click="appendAccessoryTag(tag)"
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
                        @dragstart="onImageDragStart('uploaded', idx)"
                        @dragover.prevent
                        @drop="onImageDrop('uploaded', idx)"
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
                          @click="retryItemImage(img, idx)"
                        >
                          重试
                        </el-button>
                        <el-button type="danger" link class="btn-remove" icon="Delete" @click="removeItemImage(idx)" />
                      </div>
                    </div>
                    <!-- 新增时待上传的图片预览 -->
                    <div class="image-list" v-if="!form.id && pendingImageFiles.length">
                      <div
                        class="image-item"
                        v-for="(item, idx) in pendingImageFiles"
                        :key="idx"
                        draggable="true"
                        @dragstart="onImageDragStart('pending', idx)"
                        @dragover.prevent
                        @drop="onImageDrop('pending', idx)"
                      >
                        <el-image
                          :src="item.url"
                          :preview-src-list="pendingImagePreviewList"
                          :initial-index="idx"
                          preview-teleported
                          fit="cover"
                          class="thumb"
                        />
                        <el-button type="danger" link class="btn-remove" icon="Delete" @click="removePendingImage(idx)" />
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
                      :on-exceed="handleImageExceed"
                      :on-change="onPendingImageChange"
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
          <el-button :loading="buttonLoading" :disabled="hasUploadingImages" type="primary" class="action-btn" @click="submitForm">{{ tr('确认') }}</el-button>
          <el-button class="action-btn" @click="cancel">{{ tr('取消') }}</el-button>
        </div>
      </template>
    </el-drawer>
    <!-- 添加或修改物料类型对话框 -->
    <el-dialog :title="categoryDialog.title" v-model="categoryDialog.visible" width="500px" append-to-body
               :close-on-click-modal="false">
      <el-form ref="itemCategoryFormRef" :model="categoryForm" :rules="typeRules" label-width="128px" @submit.native.prevent>
        <el-form-item label="上级分类" prop="parentId">
          <el-tree-select
            v-model="categoryForm.parentId"
            :data="itemCategoryTreeSelectList"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            value-key="id"
            placeholder="上级分类"
            check-strictly
            style="width: 100%!important;"
            clearable
          />
        </el-form-item>
        <el-form-item label="商品分类名称" prop="categoryName">
          <el-input v-model="categoryForm.categoryName" placeholder="请输入商品分类名称" @keyup.enter="submitCategoryForm"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" class="action-btn" @click="submitCategoryForm">{{ tr('确认') }}</el-button>
          <el-button class="action-btn" @click="cancelType">{{ tr('取消') }}</el-button>
        </div>
      </template>
      <div id="qrcode"></div>
    </el-dialog>
    <!-- 商品名称预处理标签抽屉 -->
    <el-drawer v-model="nameTagDrawerVisible" title="商品名称预处理标签" size="360px" append-to-body>
      <div class="name-tag-drawer">
        <div class="name-tag-add">
          <el-input v-model="newNameTag" placeholder="输入新标签后回车或点击新增" clearable @keyup.enter="addNameTag"/>
          <el-button type="primary" @click="addNameTag">新增</el-button>
        </div>
        <p class="name-tag-tip">点击标签可追加到商品名称末尾</p>
        <div class="name-tag-list">
          <el-tag
            v-for="(tag, idx) in nameTagList"
            :key="idx"
            class="name-tag-item"
            closable
            @close="removeNameTag(idx)"
            @click="insertNameTag(tag)"
          >
            {{ tag }}
          </el-tag>
          <span v-if="!nameTagList.length" class="name-tag-empty">暂无标签，请上方新增</span>
        </div>
      </div>
    </el-drawer>
    <div id="outSkuIdBox" style="display: none">
      <img :src="qrcode"/>
      <canvas ref="barcode"></canvas>
    </div>
  </div>
</template>

<script setup name="Item">
import { getItem, delItem, addItem, updateItem, uploadItemImage, deleteItemImage, getItemImages } from '@/api/wms/item';
import { listSupplierNoPage, getCurrentSupplier } from '@/api/wms/supplier';
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRefs, watch } from 'vue';
import { ElForm, ElTree, ElTreeSelect, ElMessage } from 'element-plus';
import { Plus, Delete, Ticket, Check } from '@element-plus/icons-vue';
import {
  updateItemCategory,
  addItemCategory,
  delItemCategory,
  updateOrderNum
} from "@/api/wms/itemCategory";
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
const append = (data) => {
  // resetType();
  categoryForm.value.categoryName = undefined;
  categoryForm.value.parentId = data.id;
  categoryDialog.visible = true;
}

const remove = async (node, data) => {
  const ids = data.id
  await proxy?.$modal.confirm(tr('确认删除') + tr('分类') + '【' + data.label + '】' + '？');
  await delItemCategory(ids);
  proxy?.$modal.msgSuccess(tr("删除成功"));
  useWmsStore().getItemCategoryList();
  useWmsStore().getItemCategoryTreeList();
}
const edit = (node, data) => {
  if (node.level > 1) {
    categoryForm.value.parentId = node.parent.data.id
  }
  categoryForm.value.id = data.id;
  // resetType();
  categoryForm.value.categoryName = data.label;
  categoryDialog.title = isEn.value ? 'Edit Item Category' : "修改商品分类";
  categoryDialog.visible = true;
}
const dialog = reactive({
  visible: false,
  title: ''
});
const categoryDialog = reactive({
  visible: false,
  title: ''
});
const showParent = ref(false)
/** 商品名称预处理标签：抽屉显隐、标签列表（持久化到 localStorage）、新标签输入 */
const NAME_TAG_STORAGE_KEY = 'wms_item_name_tags'
const nameTagDrawerVisible = ref(false)
const nameTagList = ref(JSON.parse(localStorage.getItem(NAME_TAG_STORAGE_KEY) || '[]'))
const newNameTag = ref('')

/** 'form' = 新增/编辑表单内的商品名称，'query' = 筛选条件中的商品名称 */
const nameTagInsertTarget = ref('form')
const openNameTagDrawer = (context = 'form') => {
  nameTagInsertTarget.value = context
  nameTagDrawerVisible.value = true
}
const saveNameTags = () => { try { localStorage.setItem(NAME_TAG_STORAGE_KEY, JSON.stringify(nameTagList.value)) } catch (_) {} }
const addNameTag = () => {
  const tag = (newNameTag.value || '').trim()
  if (!tag) return
  if (nameTagList.value.includes(tag)) { newNameTag.value = ''; return }
  nameTagList.value.push(tag)
  saveNameTags()
  newNameTag.value = ''
}
const removeNameTag = (index) => {
  nameTagList.value.splice(index, 1)
  saveNameTags()
}
const insertNameTag = (tag) => {
  if (nameTagInsertTarget.value === 'query') {
    const cur = queryParams.value.itemName || ''
    queryParams.value.itemName = cur ? cur + ' ' + tag : tag
  } else {
    const cur = form.value.itemName || ''
    form.value.itemName = cur ? cur + ' ' + tag : tag
  }
}

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
const initCategoryFormData = {
  id: undefined,
  parentId: undefined,
  ancestors: undefined,
  categoryName: undefined,
  orderNum: 0,
  status: undefined,
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
const categoryData = reactive({
  form: {...initCategoryFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 1000,
    parentId: undefined,
    categoryName: undefined,
    orderNum: undefined,
    status: undefined,
  },
  rules: {
    id: [
      {required: true, message: "商品分类id不能为空", trigger: "blur"}
    ],
    // parentId: [
    //   {required: true, message: "父物料类型id不能为空", trigger: "blur"}
    // ],
    categoryName: [
      {required: true, message: "商品分类名称不能为空", trigger: "blur"}
    ],
    status: [
      {required: true, message: "商品分类状态不能为空", trigger: "change"}
    ],
  }
});
const {queryParams, form, rules} = toRefs(data);
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
const {queryParams: typeQueryParams, form: categoryForm, rules: typeRules} = toRefs(categoryData);
const currentType = ref()
/** 查询物料列表 */
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
  loading.value = false;
}
const handleAddType = (show) => {
  categoryDialog.title = isEn.value ? 'Add Item Category' : "新增商品分类";
  showParent.value = show
  categoryDialog.visible = true;
  if (show) {
    categoryForm.value.parentId = undefined
  }
  nextTick(() => {
    categoryForm.value.categoryName = undefined;
  });
}
const skuForm = reactive({
  itemSkuList: []
})
const itemImageUploadRef = ref(null)
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
      nextTick(() => itemImageUploadRef.value?.clearFiles?.())
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
const collapse = (draggingNode, dropNode, type) => {
  //注掉的是同级拖拽
  if (draggingNode.data.label !== '全部' && draggingNode.level === dropNode.level && draggingNode.parent.id == dropNode.parent.id) {
    if (dropNode.data.label === '全部') {
      return type === 'next';
    } else {
      return type === 'prev' || type === 'next'
    }
  } else {
    // 不同级进行处理
    return false
  }
}
const handleNodeDrop = async (draggingNode, dropNode, dropType, ev) => {
  if (dropNode.level === 1) {
    await updateOrderNum(dropNode.parent.data.filter(it => it.id !== -1));
  } else {
    await updateOrderNum(dropNode.parent.data.children);
  }
}
/** 取消按钮 */
const cancel = () => {
  reset();
  dialog.visible = false;
}
const cancelType = () => {
  resetType();
  categoryDialog.visible = false;
}
/** 表单重置 */
const reset = () => {
  pendingImageFiles.value.forEach((item) => {
    if (item?.url) URL.revokeObjectURL(item.url)
  })
  pendingImageFiles.value = []
  ;(form.value.imageList || []).forEach((img) => {
    if (img.url && String(img.url).startsWith('blob:')) URL.revokeObjectURL(img.url)
  })
  stopImagePolling()
  itemImageUploadRef.value?.clearFiles?.()
  form.value = {...initFormData};
  modelMaterialIds.value = [];
  itemFormRef.value?.resetFields();
}

/** 表单重置 */
const resetType = () => {
  categoryForm.value = {...initCategoryFormData};
  itemCategoryFormRef.value.resetFields();
}
/** 搜索按钮操作 */
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
const handleSelectionChange = (selection) => {
  ids.value = selection.map(item => item.id);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
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
const handleQueryType = (node, data) => {
  queryParams.value.pageNum = 1
  if (data.data.label === '全部') {
    queryParams.value.itemCategory = '';
    currentType.value = '';
    getList();
  } else {
    queryParams.value.itemCategory = data.data.id;
    currentType.value = data.data.id;
    getList();
  }
}
/** 提交按钮 */
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

const submitCategoryForm = () => {
  itemCategoryFormRef.value.validate(async (valid) => {
    if (valid) {
      buttonLoading.value = true;
      if (categoryForm.value.id) {
        await updateItemCategory(categoryForm.value).finally(() => buttonLoading.value = false);
      } else {
        await addItemCategory(categoryForm.value).finally(() => buttonLoading.value = false);
      }
      proxy?.$modal.msgSuccess(categoryForm.value.id ? tr('修改成功') : tr('新增成功'));
      categoryDialog.visible = false;
      useWmsStore().getItemCategoryList();
      useWmsStore().getItemCategoryTreeList();
    }
  });
}
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
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.el-tree-node__content {
  display: flex;
  align-items: center;
  height: 35px;
  cursor: pointer;
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

</style>
