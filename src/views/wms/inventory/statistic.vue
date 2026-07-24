<template>
  <div class="app-container inventory-statistic-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form
        :model="queryParams"
        ref="queryRef"
        :label-width="isEn ? '142px' : '90px'"
        class="statistic-query-form mt12"
        @submit.prevent="handleQuery"
      >
        <!-- 维度切换单独占一行 -->
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item :label="tr('维度')" prop="itemId">
              <el-radio-group v-model="queryType" size="default" @change="handleSortTypeChange">
                <el-radio-button label="item">{{ tr('商品') }}</el-radio-button>
                <el-radio-button label="warehouse">{{ tr('仓库') }}</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('仓库')" prop="warehouseId">
              <el-select style="width: 100%" v-model="queryParams.warehouseId" :placeholder="tr('请选择仓库')"
                         filterable clearable>
                <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName"
                           :value="item.id"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品名称')" prop="itemName">
              <el-input v-model="queryParams.itemName" clearable :placeholder="tr('商品名称')" @keyup.enter="handleQuery"></el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('SKU编号')" prop="skuCode">
              <el-input v-model="queryParams.skuCode" clearable :placeholder="tr('SKU编号')" @keyup.enter="handleQuery"></el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品分类')" prop="itemCategory">
              <el-tree-select
                v-model="queryParams.itemCategory"
                :data="itemCategoryTreeSelectList"
                :props="{ value: 'id', label: 'label', children: 'children' }"
                value-key="id"
                :placeholder="tr('请选择')"
                check-strictly
                clearable
                filterable
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('商品品牌')" prop="itemBrand">
              <el-select
                v-model="queryParams.itemBrand"
                multiple
                clearable
                filterable
                :placeholder="tr('可多选')"
                style="width: 100%"
              >
                <el-option
                  v-for="item in useWmsStore().itemBrandList"
                  :key="String(item.id)"
                  :label="item.brandName"
                  :value="String(item.id)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('成色')" prop="itemCondition">
              <el-select v-model="queryParams.itemCondition" clearable style="width: 100%" :placeholder="tr('请选择')">
                <el-option v-for="opt in ITEM_CONDITION_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('年份')" prop="year">
              <el-input-number v-model="queryParams.year" :min="0" :max="9999" :controls="false" style="width: 100%" @keyup.enter="handleQuery" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('鉴定机构')" prop="authAgency">
              <el-select
                v-model="queryParams.authAgency"
                multiple
                clearable
                style="width: 100%"
                :placeholder="tr('可多选')"
              >
                <el-option v-for="opt in AUTH_AGENCY_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('数量')" prop="defaultQty">
              <el-input-number v-model="queryParams.defaultQty" :min="0" :controls="false" style="width: 100%" @keyup.enter="handleQuery" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item :label="tr('已护理')" prop="cared">
              <el-switch v-model="queryParams.cared" active-text="Yes" inactive-text="No" :active-value="true" :inactive-value="false" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item :label="tr('寄售信息')" prop="consignInfo">
              <el-input v-model="queryParams.consignInfo" clearable :placeholder="tr('请输入')" @keyup.enter="handleQuery" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="24" :md="priceFilterColSpan" :lg="priceFilterColSpan">
            <el-form-item :label="tr('\u521b\u5efa\u65f6\u95f4')" prop="createTimeRange">
              <el-date-picker
                v-model="queryParams.createTimeRange"
                type="datetimerange"
                :range-separator="tr('至')"
                format="MM/DD/YYYY HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                :default-time="defaultTime"
                :start-placeholder="tr('开始时间')"
                :end-placeholder="tr('结束时间')"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="priceFilterColSpan" :lg="priceFilterColSpan">
            <el-form-item :label="tr('\u5165\u5e93\u65f6\u95f4')" prop="receiptTimeRange">
              <el-date-picker
                v-model="queryParams.receiptTimeRange"
                type="datetimerange"
                :range-separator="tr('\u81f3')"
                format="MM/DD/YYYY HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                :default-time="defaultTime"
                :start-placeholder="tr('\u5f00\u59cb\u65f6\u95f4')"
                :end-placeholder="tr('\u7ed3\u675f\u65f6\u95f4')"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="priceFilterColSpan" :lg="priceFilterColSpan" v-if="canViewCostPrice">
            <el-form-item :label="tr('成本价')">
              <div class="query-price-range">
                <el-form-item prop="costPriceMin" class="query-price-range-item">
                  <el-input-number v-model="queryParams.costPriceMin" :min="0" :precision="2" :controls="false" :placeholder="tr('最低')" style="width: 100%" @keyup.enter="handleQuery" />
                </el-form-item>
                <span class="query-price-range-separator">{{ tr('至') }}</span>
                <el-form-item prop="costPriceMax" class="query-price-range-item">
                  <el-input-number v-model="queryParams.costPriceMax" :min="0" :precision="2" :controls="false" :placeholder="tr('最高')" style="width: 100%" @keyup.enter="handleQuery" />
                </el-form-item>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="priceFilterColSpan" :lg="priceFilterColSpan" v-if="canViewSellingPrice">
            <el-form-item :label="tr('\u9500\u552e\u4ef7')">
              <div class="query-price-range">
                <el-form-item prop="sellingPriceMin" class="query-price-range-item">
                  <el-input-number v-model="queryParams.sellingPriceMin" :min="0" :precision="2" :controls="false" :placeholder="tr('最低')" style="width: 100%" @keyup.enter="handleQuery" />
                </el-form-item>
                <span class="query-price-range-separator">{{ tr('至') }}</span>
                <el-form-item prop="sellingPriceMax" class="query-price-range-item">
                  <el-input-number v-model="queryParams.sellingPriceMax" :min="0" :precision="2" :controls="false" :placeholder="tr('最高')" style="width: 100%" @keyup.enter="handleQuery" />
                </el-form-item>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label=" ">
              <el-button type="primary" icon="Search" class="action-btn" native-type="submit">{{ tr('搜索') }}</el-button>
              <el-button icon="Refresh" class="action-btn" native-type="button" @click="resetQuery">{{ tr('重置') }}</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="12">
          <span class="page-title">{{ tr('库存统计') }}</span>
        </el-col>
        <el-col :span="12" class="toolbar-right">
          <el-checkbox v-model="filterable" :label="tr('过滤掉库存为0的商品')" size="large" @change="handleChangeFilterZero"/>
          <el-button
            :type="batchMode ? 'warning' : 'default'"
            @click="toggleBatchMode"
          >
            {{ batchMode ? tr('取消批量操作') : tr('批量操作') }}
          </el-button>
          <el-button
            type="primary"
            :loading="exportLoading"
            :disabled="loading"
            @click="handleExportExcel"
          >
            {{ tr('导出Excel') }}
          </el-button>
        </el-col>
      </el-row>

      <!-- 批量操作栏 -->
      <div v-if="batchMode" class="batch-action-bar">
        <div class="batch-action-left">
          <el-icon class="batch-action-icon"><Select /></el-icon>
          <span class="batch-action-info">{{ tr('已选择 {count} 个商品').replace('{count}', selectedRows.length) }}</span>
        </div>
        <div class="batch-action-right">
          <el-button
            type="primary"
            icon="Download"
            :loading="batchExportExcelLoading"
            :disabled="selectedRows.length === 0"
            @click="handleBatchExportExcel"
          >
            {{ tr('批量导出为Excel') }}
          </el-button>
          <el-button
            type="primary"
            icon="Printer"
            :loading="batchExportPdfLoading"
            :disabled="selectedRows.length === 0"
            @click="handleBatchExportPdf"
          >
            {{ tr('批量导出为PDF') }}
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            type="success"
            icon="Upload"
            :disabled="selectedRows.length === 0"
            @click="handleBatchPublish"
          >
            {{ tr('批量上架') }}
          </el-button>
        </div>
      </div>

      <el-table
        ref="tableRef"
        :data="inventoryList"
        :row-key="getInventorySelectionKey"
        border
        :span-method="spanMethod"
        cell-class-name="vertical-top-cell"
        v-loading="loading"
        :empty-text="tr('暂无库存')"
        class="statistic-table"
        :default-sort="{ prop: 'receiptTime', order: 'descending' }"
        @sort-change="handleColumnSortChange"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="batchMode" type="selection" width="50" align="center" fixed="left" reserve-selection />
        <el-table-column :label="tr('操作')" :width="isEn ? 132 : 110" align="center" fixed="left">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              icon="View"
              :disabled="!row.skuId"
              @click="openDetailDrawer(row)"
            >
              {{ tr('详细信息') }}
            </el-button>
          </template>
        </el-table-column>

        <!-- ========== 仓库维度列 ========== -->
        <template v-if="queryType === 'warehouse'">
          <el-table-column :label="tr('仓库')" prop="warehouseGroupKey" min-width="240" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <div>{{ getWarehouseName(row) }}</div>
              <div>{{ tr('仓库商品总数') }}：{{ getWarehouseSummaryQuantity(row) }}</div>
              <div v-if="canViewCostPrice">{{ tr('仓库商品总价') }}：{{ formatMoney(getWarehouseSummaryAmount(row)) }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="tr('商品名称')" prop="warehouseItemGroupKey" min-width="480" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getItemName(row) }}</span>
                <el-button
                  v-if="canCopyText(getItemName(row))"
                  v-copyText="getItemName(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="tr('商品图片')" width="110" align="center">
            <template #default="{ row }">
              <el-image
                v-if="getItemImage(row)"
                :src="getItemImage(row)"
                fit="cover"
                class="item-main-image"
                :preview-src-list="[getItemImage(row)]"
                preview-teleported
                @show="setPreviewImageContext([{ url: getItemImage(row) }], 0, getPreviewImageTitle(row))"
                @switch="setPreviewImageIndex"
              >
                <template #viewer>
                  <div class="inventory-preview-actions">
                    <button class="inventory-preview-action" type="button" :title="tr('下载')" @click.stop="downloadCurrentPreviewImage">
                      <el-icon><Download /></el-icon>
                    </button>
                    <button class="inventory-preview-action" type="button" :title="tr('打印')" @click.stop="printCurrentPreviewImage">
                      <el-icon><Printer /></el-icon>
                    </button>
                  </div>
                </template>
                <template #error>
                  <div class="image-empty">{{ tr('暂无图片') }}</div>
                </template>
              </el-image>
              <div v-else class="image-empty">{{ tr('暂无图片') }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="tr('SKU编号')" prop="skuCode" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getSkuCode(row) }}</span>
                <el-button
                  v-if="canCopyText(getSkuCode(row))"
                  v-copyText="getSkuCode(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
        </template>

        <!-- ========== 商品维度列 ========== -->
        <template v-else>
          <el-table-column :label="tr('商品名称')" prop="itemGroupKey" min-width="480" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getItemName(row) }}</span>
                <el-button
                  v-if="canCopyText(getItemName(row))"
                  v-copyText="getItemName(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="tr('商品图片')" width="110" align="center">
            <template #default="{ row }">
              <el-image
                v-if="getItemImage(row)"
                :src="getItemImage(row)"
                fit="cover"
                class="item-main-image"
                :preview-src-list="[getItemImage(row)]"
                preview-teleported
                @show="setPreviewImageContext([{ url: getItemImage(row) }], 0, getPreviewImageTitle(row))"
                @switch="setPreviewImageIndex"
              >
                <template #viewer>
                  <div class="inventory-preview-actions">
                    <button class="inventory-preview-action" type="button" :title="tr('下载')" @click.stop="downloadCurrentPreviewImage">
                      <el-icon><Download /></el-icon>
                    </button>
                    <button class="inventory-preview-action" type="button" :title="tr('打印')" @click.stop="printCurrentPreviewImage">
                      <el-icon><Printer /></el-icon>
                    </button>
                  </div>
                </template>
                <template #error>
                  <div class="image-empty">{{ tr('暂无图片') }}</div>
                </template>
              </el-image>
              <div v-else class="image-empty">{{ tr('暂无图片') }}</div>
            </template>
          </el-table-column>
          <el-table-column :label="tr('SKU编号')" prop="skuGroupKey" min-width="120" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="copyable-cell">
                <span class="copyable-text">{{ getSkuCode(row) }}</span>
                <el-button
                  v-if="canCopyText(getSkuCode(row))"
                  v-copyText="getSkuCode(row)"
                  v-copyText:callback="copyTextSuccess"
                  class="copy-btn"
                  link
                  type="primary"
                  icon="DocumentCopy"
                  :title="tr('复制')"
                />
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="tr('仓库')" prop="skuWarehouseGroupKey" :min-width="isEn ? 112 : 80" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              {{ getWarehouseName(row) }}
            </template>
          </el-table-column>
        </template>

        <!-- ========== 库存数量 ========== -->
        <el-table-column :label="tr('库存数量')" prop="quantity" width="90" align="center">
          <template #default="{ row }">
            {{ Number(row.quantity) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：入库时间 ========== -->
        <el-table-column :label="tr('入库时间')" prop="receiptTime" width="168" align="center" sortable="custom">
          <template #default="{ row }">
            {{ formatTime(row.receiptTime) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：出库时间 ========== -->
        <el-table-column :label="tr('出库时间')" prop="shipmentTime" width="168" align="center" sortable="custom">
          <template #default="{ row }">
            <!-- 有出库历史但库存未清零时 shipmentTime 为 null，属于业务规则，显示 -- -->
            {{ formatTime(row.shipmentTime) }}
          </template>
        </el-table-column>

        <el-table-column :label="tr('出库平台')" prop="outboundPlatform" :width="isEn ? 165 : 120" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.outboundPlatform || '--' }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：周转天数 ========== -->
        <el-table-column :label="tr('周转天数')" prop="turnoverDays" :width="isEn ? 150 : 125" align="center" sortable="custom">
          <template #default="{ row }">
            <span v-if="row.turnoverDays != null">{{ row.turnoverDays }}</span>
            <span v-else>--</span>
          </template>
        </el-table-column>

        <!-- ========== 新增列：平均成本价 ========== -->
        <el-table-column v-if="canViewCostPrice" :label="tr('平均成本价')" prop="avgReceiptCost" :width="isEn ? 165 : 135" align="center" sortable="custom">
          <template #default="{ row }">
            {{ formatMoney(row.avgReceiptCost) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：平均销售价 ========== -->
        <el-table-column v-if="canViewSellingPrice" :label="tr('平均销售价')" prop="avgShipmentPrice" :width="isEn ? 178 : 135" align="center" sortable="custom">
          <template #default="{ row }">
            <!-- 有出库历史但库存未清零时 avgShipmentPrice 正常显示；无出库时为 null，显示 -- -->
            {{ formatMoney(row.avgShipmentPrice) }}
          </template>
        </el-table-column>

        <!-- ========== 新增列：利润 ========== -->
        <el-table-column v-if="canViewCostPrice && canViewSellingPrice" :label="tr('利润')" prop="totalProfit" width="110" align="center" sortable="custom">
          <template #default="{ row }">
            <!--
              totalProfit 语义：
              - 无出库时后端返回 0，显示 0.00
              - 有出库时显示历史累计利润
              - null 显示 --（兜底）
            -->
            {{ formatProfit(row.totalProfit) }}
          </template>
        </el-table-column>
      </el-table>

      <el-row>
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
                    v-model:limit="queryParams.pageSize" @pagination="getList"/>
      </el-row>
    </el-card>

    <el-drawer
      v-model="detailDrawer.visible"
      size="60%"
      append-to-body
      class="inventory-detail-drawer"
    >
      <template #header>
        <div class="detail-drawer-header">
          <span>{{ tr('商品详细信息') }}</span>
          <el-button
            type="primary"
            plain
            icon="Download"
            :disabled="!detailItem && !detailSku"
            @click="exportDetailPdf"
          >
            {{ tr('导出为PDF') }}
          </el-button>
        </div>
      </template>
      <div v-loading="detailDrawer.loading" class="detail-drawer-body">
        <template v-if="detailItem || detailSku">
          <div class="detail-header">
            <div>
              <h2 class="detail-title">{{ displayValue(detailItem?.itemName) }}</h2>
              <div class="detail-subtitle">
                <span>SKU {{ displayValue(detailSku?.skuCode) }}</span>
                <span v-if="getBrandName(detailItem)">·</span>
                <span v-if="getBrandName(detailItem)">{{ getBrandName(detailItem) }}</span>
              </div>
            </div>
            <div class="condition-mark">
              <span>{{ tr('成色') }}</span>
              <strong>{{ displayValue(detailItem?.itemCondition) }}</strong>
            </div>
          </div>

          <div class="detail-field-grid">
            <div
              v-for="field in detailFieldList"
              :key="field.label"
              class="detail-field"
              :class="{ 'is-wide': field.wide }"
            >
              <div class="detail-field-label">{{ field.label }}</div>
              <div class="detail-field-value">
                <div v-if="field.type === 'accessories' && accessoryList.length" class="accessory-list">
                  <el-tag v-for="tag in accessoryList" :key="tag" type="info" effect="plain">{{ tag }}</el-tag>
                </div>
                <span v-else>{{ field.value }}</span>
              </div>
            </div>
          </div>

          <div class="detail-image-section">
            <div class="detail-section-title">{{ tr('商品图片') }} ({{ detailImages.length }})</div>
            <div v-if="detailImages.length" class="detail-image-list">
              <div v-for="(img, idx) in detailImages" :key="img.id || idx" class="detail-image-card">
                <el-image
                  :src="img.thumbUrl || img.url"
                  :preview-src-list="detailImagePreviewList"
                  :initial-index="idx"
                  preview-teleported
                  fit="cover"
                  class="detail-image"
                  @show="setPreviewImageContext(detailImages, idx, getDetailPreviewImageTitle())"
                  @switch="setPreviewImageIndex"
                >
                  <template #viewer>
                    <div class="inventory-preview-actions">
                      <button class="inventory-preview-action" type="button" :title="tr('下载')" @click.stop="downloadCurrentPreviewImage">
                        <el-icon><Download /></el-icon>
                      </button>
                      <button class="inventory-preview-action" type="button" :title="tr('打印')" @click.stop="printCurrentPreviewImage">
                        <el-icon><Printer /></el-icon>
                      </button>
                    </div>
                  </template>
                </el-image>
              </div>
            </div>
            <div v-else class="detail-empty">{{ tr('暂无图片') }}</div>
          </div>
        </template>
        <el-empty v-else :description="tr('暂无数据')" />
      </div>
    </el-drawer>

    <!-- 批量上架对话框 -->
    <PublishDialog ref="publishDialogRef" @success="getList" />
  </div>
</template>

<script setup name="Inventory">
import {
  batchExportInventoryBoardExcel,
  exportInventoryBoardItem,
  listInventoryBoard,
  listInventoryBoardWarehouseSummary
} from '@/api/wms/inventory'
import { downloadItemImage, getItemImages } from '@/api/wms/item'
import { computed, getCurrentInstance, nextTick, onMounted, ref } from 'vue'
import { getRowspanMethod } from '@/utils/getRowSpanMethod'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { blobValidate } from '@/utils/ruoyi'
import { formatDateTimeForQuery } from '@/utils/laTime'
import { formatBrandNames } from '@/utils/itemBrand'
import PublishDialog from '@/views/wms/platform/listings/components/PublishDialog.vue'

const { proxy } = getCurrentInstance()
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const spanMethod = computed(() => getRowspanMethod(inventoryList.value, rowSpanArray.value))
const canViewSellingPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemSellingPrice:view'))
const canViewCostPrice = computed(() => proxy?.$auth?.hasPermi('wms:itemCostPrice:view'))
const visiblePriceFilterCount = computed(() => Number(canViewCostPrice.value) + Number(canViewSellingPrice.value))
const priceFilterColSpan = computed(() => visiblePriceFilterCount.value === 0 ? 12 : visiblePriceFilterCount.value === 1 ? 8 : 6)
const itemCategoryTreeSelectList = computed(() => useWmsStore().itemCategoryTreeList)
const AUTH_AGENCY_OPTIONS = ['Entrupy', 'Real Authentication', 'Legitmark', 'CheckCheck', 'N/A']
const ITEM_CONDITION_OPTIONS = ['S', 'A', 'B', 'C', 'D']
const defaultTime = [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]

const inventoryList = ref([])
const loading = ref(true)
const exportLoading = ref(false)
const batchExportExcelLoading = ref(false)
const batchExportPdfLoading = ref(false)
const selectedRows = ref([])
const selectedRowMap = ref(new Map())
const total = ref(0)
const tableRef = ref(null)
let suppressInventorySelectionChange = false
const rowSpanArray = ref(['itemGroupKey', 'skuGroupKey', 'skuWarehouseGroupKey'])
const warehouseSummaryMap = ref(new Map())
const detailDrawer = ref({
  visible: false,
  loading: false,
  data: null
})
const detailItem = computed(() => detailDrawer.value.data?.item || null)
const detailSku = computed(() => detailDrawer.value.data?.itemSku || null)
const detailImages = computed(() => detailItem.value?.images || detailItem.value?.imageList || [])
const detailImagePreviewList = computed(() => detailImages.value.map(img => img.url || img.thumbUrl).filter(Boolean))
const previewImageContext = ref({
  images: [],
  index: 0,
  title: ''
})
const accessoryList = computed(() => splitTextList(detailItem.value?.accessories))
const detailFieldList = computed(() => {
  const item = detailItem.value || {}
  const sku = detailSku.value || {}
  const fields = [
    { label: tr('商品分类'), value: displayValue(getCategoryName(item)) },
    { label: tr('商品品牌'), value: displayValue(getBrandName(item)) },
    { label: tr('年份'), value: displayValue(item.year) },
    { label: tr('成色'), value: displayValue(item.itemCondition) },
    { label: tr('包型'), value: displayValue(item.modelName) },
    { label: tr('材质'), value: displayValue(item.materialName || item.material) }
  ]
  if (canViewCostPrice.value) {
    fields.push({ label: tr('成本价'), value: formatMoney(sku.costPrice) })
  }
  if (canViewSellingPrice.value) {
    fields.push({ label: tr('销售价'), value: formatMoney(sku.sellingPrice) })
  }
  fields.push(
    { label: tr('数量'), value: displayValue(item.defaultQty) },
    { label: tr('是否已护理'), value: formatCared(item.cared) },
    { label: tr('鉴定机构'), value: displayValue(item.authAgency) },
    { label: tr('寄售信息'), value: displayValue(item.consignInfo) },
    { label: tr('瑕疵'), value: displayValue(item.defect), wide: true },
    { label: tr('配件'), value: accessoryList.value.length ? '' : '--', type: 'accessories', wide: true },
    { label: tr('备注'), value: displayValue(item.remark), wide: true }
  )
  return fields
})

function getDetailExportLabels() {
  const labels = ['\u5546\u54c1\u5206\u7c7b', '\u5546\u54c1\u54c1\u724c', '\u5e74\u4efd', '\u6210\u8272', '\u5305\u578b', '\u6750\u8d28']
  if (canViewCostPrice.value) labels.push('\u6210\u672c\u4ef7')
  if (canViewSellingPrice.value) labels.push('\u9500\u552e\u4ef7')
  labels.push('\u6570\u91cf', '\u662f\u5426\u5df2\u62a4\u7406', '\u9274\u5b9a\u673a\u6784', '\u5bc4\u552e\u4fe1\u606f', '\u7455\u75b5', '\u914d\u4ef6', '\u5907\u6ce8')
  return labels
}

const DEFAULT_INVENTORY_SORT = {
  prop: 'receiptTime',
  order: 'descending'
}

const filterable = ref(true)
const batchMode = ref(false)
const publishDialogRef = ref(null)
const queryType = ref('item')
const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  skuId: undefined,
  warehouseId: undefined,
  itemName: undefined,
  skuCode: undefined,
  itemCategory: undefined,
  itemBrand: [],
  itemCondition: undefined,
  year: undefined,
  cared: undefined,
  defaultQty: undefined,
  authAgency: [],
  consignInfo: undefined,
  createTimeRange: [],
  receiptTimeRange: [],
  costPriceMin: undefined,
  costPriceMax: undefined,
  sellingPriceMin: undefined,
  sellingPriceMax: undefined,
  minQuantity: undefined,
  orderByColumn: DEFAULT_INVENTORY_SORT.prop,
  isAsc: DEFAULT_INVENTORY_SORT.order
})

// ───────────── 格式化工具函数 ─────────────

/**
 * 金额格式化：null/undefined → '--'，否则显示 $ + 千分位 + 两位小数
 */
function formatMoney(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function displayValue(value) {
  return value === null || value === undefined || value === '' ? '--' : value
}

function splitTextList(value) {
  if (!value) return []
  return String(value)
    .split(/[,，、\n]/)
    .map(it => it.trim())
    .filter(Boolean)
}

function formatCared(value) {
  if (value === null || value === undefined) return '--'
  return value ? 'Cared' : 'Not Cared'
}

function safeFileName(value, fallback = 'file') {
  const name = String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return name || fallback
}

function getImageUrl(img) {
  return img?.url || img?.thumbUrl || ''
}

function normalizePreviewImage(img) {
  return typeof img === 'string' ? { url: img } : (img || {})
}

function setPreviewImageContext(images = [], index = 0, title = '') {
  const normalizedImages = Array.from(images || []).map(normalizePreviewImage)
  previewImageContext.value = {
    images: normalizedImages,
    index,
    title
  }
}

function setPreviewImageIndex(index) {
  previewImageContext.value.index = index
}

function getCurrentPreviewImage() {
  return previewImageContext.value.images[previewImageContext.value.index] || null
}

function getPreviewImageBaseName() {
  const title = previewImageContext.value.title || detailSku.value?.skuCode || detailItem.value?.itemName || 'item-image'
  return safeFileName(`${title}-${previewImageContext.value.index + 1}`, 'item-image')
}

function getPreviewImageTitle(row) {
  return [getSkuCode(row), getItemName(row)].filter(Boolean).join('-') || 'item-image'
}

function getDetailPreviewImageTitle() {
  return [detailSku.value?.skuCode, detailItem.value?.itemName].filter(Boolean).join('-') || 'item-image'
}

async function downloadCurrentPreviewImage() {
  const img = getCurrentPreviewImage()
  if (!img) {
    proxy.$modal.msgError(tr('下载失败'))
    return
  }
  await downloadDetailImage(img, previewImageContext.value.index)
}

function printCurrentPreviewImage() {
  const img = getCurrentPreviewImage()
  const url = getImageUrl(img)
  if (!url) {
    proxy.$modal.msgError(tr('打印失败'))
    return
  }
  const title = getPreviewImageBaseName()
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    proxy.$modal.msgError(tr('打印失败'))
    return
  }
  printWindow.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body { display: flex; align-items: center; justify-content: center; padding: 18mm; font-family: Arial, "Microsoft YaHei", sans-serif; }
    img { max-width: 100%; max-height: calc(100vh - 36mm); object-fit: contain; }
    @media print {
      body { min-height: 100vh; padding: 12mm; }
      img { max-height: calc(100vh - 24mm); }
    }
  </style>
</head>
<body>
  <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" />
  <script>
    var image = document.querySelector('img');
    function startPrint() {
      setTimeout(function () {
        window.print();
      }, 150);
    }
    if (image.complete) {
      startPrint();
    } else {
      image.onload = startPrint;
      image.onerror = startPrint;
    }
  <\/script>
</body>
</html>
  `)
  printWindow.document.close()
}

async function downloadDetailImage(img, index) {
  const baseName = previewImageContext.value.title
    ? getPreviewImageBaseName()
    : safeFileName(`${detailSku.value?.skuCode || detailItem.value?.itemName || 'item'}-${index + 1}`, 'item-image')
  const imageId = img?.imageId || img?.id
  if (imageId) {
    try {
      const blobData = await downloadItemImage(imageId)
      const isBlob = blobValidate(blobData)
      if (!isBlob) {
        const resText = await blobData.text()
        const rspObj = JSON.parse(resText)
        throw new Error(rspObj?.msg || tr('下载失败'))
      }
      const blob = new Blob([blobData], { type: blobData.type || 'application/octet-stream' })
      const headerName = blobData?.headers?.['download-filename']
      triggerDownload(window.URL.createObjectURL(blob), headerName ? decodeURIComponent(headerName) : `${baseName}.jpg`)
      return
    } catch (e) {
      proxy.$modal.msgError(e?.message || tr('下载失败'))
      return
    }
  }
  const url = getImageUrl(img)
  if (!url) return
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('download failed')
    const blob = await response.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const suffix = blob.type?.includes('png') ? 'png' : blob.type?.includes('webp') ? 'webp' : 'jpg'
    triggerDownload(objectUrl, `${baseName}.${suffix}`)
    window.URL.revokeObjectURL(objectUrl)
  } catch (e) {
    triggerDownload(url, `${baseName}.jpg`)
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function exportDetailPdf() {
  const item = detailItem.value || {}
  const sku = detailSku.value || {}
  const title = displayValue(item.itemName)
  const exportLabels = getDetailExportLabels()
  const rows = detailFieldList.value.map((field, index) => {
    const label = exportLabels[index] || field.label
    const value = field.type === 'accessories' && accessoryList.value.length
      ? accessoryList.value.join(', ')
      : label === '\u662f\u5426\u5df2\u62a4\u7406' && detailItem.value?.cared !== null && detailItem.value?.cared !== undefined
        ? (detailItem.value.cared ? '\u5df2\u62a4\u7406' : '\u672a\u62a4\u7406')
        : field.value
    return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  }).join('')
  const images = detailImages.value
    .map((img, idx) => {
      const url = getImageUrl(img)
      if (!url) return ''
      return `<figure><img src="${escapeHtml(url)}" alt="image-${idx + 1}" /><figcaption>${escapeHtml('\u5546\u54c1\u56fe\u7247')} ${idx + 1}</figcaption></figure>`
    })
    .join('')
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    proxy.$modal.msgError(tr('导出失败'))
    return
  }
  printWindow.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeFileName(`${sku.skuCode || ''}-${item.itemName || '商品详情'}`, '商品详情'))}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; font-family: Arial, "Microsoft YaHei", sans-serif; color: #1f2329; }
    h1 { margin: 0 0 8px; font-size: 26px; line-height: 1.3; }
    .subtitle { margin-bottom: 22px; color: #667085; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0 24px; }
    th, td { border: 1px solid #dfe3eb; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { width: 170px; background: #f5f7fa; color: #4b5563; }
    .images { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    figure { margin: 0; break-inside: avoid; }
    img { width: 100%; max-height: 360px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 6px; }
    figcaption { margin-top: 6px; color: #667085; font-size: 12px; }
    @media print { body { padding: 18mm; } .images { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">SKU ${escapeHtml(displayValue(sku.skuCode))}${getBrandName(item) ? ' · ' + escapeHtml(getBrandName(item)) : ''}</div>
  <table>${rows}</table>
  <h2>${escapeHtml('\u5546\u54c1\u56fe\u7247')} (${detailImages.value.length})</h2>
  <div class="images">${images || escapeHtml('\u6682\u65e0\u56fe\u7247')}</div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 300);
    };
  <\/script>
</body>
</html>
  `)
  printWindow.document.close()
}

function getBrandName(item) {
  if (item?.brandNames) return item.brandNames
  if (item?.brandName) return item.brandName
  const store = useWmsStore()
  return formatBrandNames(item, store.itemBrandMap, store.itemBrandList)
}

function getCategoryName(item) {
  if (item?.categoryName) return item.categoryName
  if (item?.itemCategoryInfo?.categoryName) return item.itemCategoryInfo.categoryName
  if (!item?.itemCategory) return ''
  const key = Number(item.itemCategory)
  return useWmsStore().itemCategoryMap.get(key)?.categoryName || ''
}

/**
 * 利润格式化：null → '--'，0 → '$0.00'，其余显示 $ + 千分位 + 两位小数
 * totalProfit 无出库时后端返回 0，不应显示 '--'
 */
function formatProfit(v) {
  if (v === null || v === undefined) return '--'
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * 从汇总接口结果构建 Map：优先按 warehouseId 索引，并辅以 warehouseName 便于兜底对齐
 */
function buildWarehouseSummaryMap(items = []) {
  const map = new Map()
  for (const it of items) {
    const quantity = Number(it.totalQuantity) || 0
    const amt = Number(it.totalAmount)
    const amount = Number.isFinite(amt) ? amt : null
    const entry = { quantity, amount }
    if (it.warehouseId != null && it.warehouseId !== '') {
      map.set(String(it.warehouseId), entry)
    }
    if (it.warehouseName) {
      map.set(String(it.warehouseName), entry)
    }
  }
  return map
}

function getWarehouseSummaryEntry(row) {
  if (row?.warehouseId != null && row.warehouseId !== '') {
    const byId = warehouseSummaryMap.value.get(String(row.warehouseId))
    if (byId) return byId
  }
  const name = String(row?.warehouseName ?? '')
  if (name) {
    return warehouseSummaryMap.value.get(name)
  }
  return undefined
}

/**
 * 获取仓库聚合后的总数量（后端汇总接口）
 */
function getWarehouseSummaryQuantity(row) {
  return getWarehouseSummaryEntry(row)?.quantity ?? 0
}

/**
 * 获取仓库聚合后的总价（后端汇总接口）
 */
function getWarehouseSummaryAmount(row) {
  return getWarehouseSummaryEntry(row)?.amount ?? null
}

function getWarehouseGroupKey(row) {
  if (row?.warehouseId != null && row.warehouseId !== '') {
    return String(row.warehouseId)
  }
  return String(row?.warehouseName ?? '')
}

function getWarehouseName(row) {
  return row?.warehouseName || '-'
}

function getItemName(row) {
  return row?.itemName || '-'
}

function getItemImage(row) {
  return row?.itemImage || ''
}

function getSkuCode(row) {
  return row?.skuCode || '-'
}

function canCopyText(value) {
  return value !== undefined && value !== null && value !== ''
}

function copyTextSuccess() {
  proxy.$modal.msgSuccess(tr('复制成功'))
}

/**
 * 时间格式化：null/undefined → '--'，否则格式化为 yyyy-MM-dd HH:mm:ss
 * shipmentTime 为 null 可能是"有出库历史但库存未清零"的业务规则，统一显示 '--'
 */
function formatTime(t) {
  if (t === null || t === undefined) return '--'
  const result = proxy.parseTime(t)
  return result || '--'
}

// ───────────── 数据获取 ─────────────

const getCurrentQuery = () => {
  const query = { ...queryParams.value }
  if (!canViewCostPrice.value) {
    delete query.costPriceMin
    delete query.costPriceMax
  }
  if (!canViewSellingPrice.value) {
    delete query.sellingPriceMin
    delete query.sellingPriceMax
  }
  if (query.createTimeRange && query.createTimeRange.length === 2) {
    query.startTime = formatDateTimeForQuery(query.createTimeRange[0])
    query.endTime = formatDateTimeForQuery(query.createTimeRange[1])
  }
  delete query.createTimeRange
  if (query.receiptTimeRange && query.receiptTimeRange.length === 2) {
    query.receiptStartTime = formatDateTimeForQuery(query.receiptTimeRange[0])
    query.receiptEndTime = formatDateTimeForQuery(query.receiptTimeRange[1])
  }
  delete query.receiptTimeRange
  if (filterable.value) {
    query.minQuantity = 1
  } else {
    query.minQuantity = undefined
  }
  return query
}

const getExportLanguagePayload = () => {
  const language = isEn.value ? 'en' : 'zh-cn'
  const contentLanguage = isEn.value ? 'en_US' : 'zh_CN'
  return {
    language,
    lang: language,
    locale: language,
    contentLanguage
  }
}

const INVENTORY_EXPORT_HEADER_MAP = {
  商品名称: 'Item Name',
  SKU编号: 'SKU Code',
  仓库: 'Warehouse',
  库存数量: 'Stock Qty',
  入库时间: 'Inbound Time',
  出库时间: 'Outbound Time',
  出库平台: 'Outbound Platform',
  周转天数: 'Turnover Days',
  平均成本价: 'Avg Cost Price',
  平均销售价: 'Avg Selling Price',
  利润: 'Profit',
  商品图片: 'Item Image'
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function readUInt16(data, offset) {
  return data[offset] | (data[offset + 1] << 8)
}

function readUInt32(data, offset) {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0
}

function writeUInt16(target, offset, value) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUInt32(target, offset, value) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function findEndOfCentralDirectory(data) {
  const minOffset = Math.max(0, data.length - 0xffff - 22)
  for (let offset = data.length - 22; offset >= minOffset; offset--) {
    if (readUInt32(data, offset) === 0x06054b50) return offset
  }
  return -1
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(tr('导出失败'))
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function getZipEntryContent(zipData, entry) {
  const compressed = zipData.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
  if (entry.method === 0) return compressed
  if (entry.method === 8) return inflateRaw(compressed)
  throw new Error(tr('导出失败'))
}

function replaceInventoryHeaderText(xmlText) {
  let next = xmlText
  Object.entries(INVENTORY_EXPORT_HEADER_MAP).forEach(([zh, en]) => {
    next = next.split(zh).join(en)
  })
  return next
}

function parseZipEntries(zipData) {
  const decoder = new TextDecoder()
  const endOffset = findEndOfCentralDirectory(zipData)
  if (endOffset < 0) throw new Error(tr('导出失败'))

  const entryCount = readUInt16(zipData, endOffset + 10)
  let centralOffset = readUInt32(zipData, endOffset + 16)
  const entries = []

  for (let i = 0; i < entryCount; i++) {
    if (readUInt32(zipData, centralOffset) !== 0x02014b50) throw new Error(tr('导出失败'))

    const flags = readUInt16(zipData, centralOffset + 8)
    const method = readUInt16(zipData, centralOffset + 10)
    const crc = readUInt32(zipData, centralOffset + 16)
    const compressedSize = readUInt32(zipData, centralOffset + 20)
    const uncompressedSize = readUInt32(zipData, centralOffset + 24)
    const nameLength = readUInt16(zipData, centralOffset + 28)
    const extraLength = readUInt16(zipData, centralOffset + 30)
    const commentLength = readUInt16(zipData, centralOffset + 32)
    const localHeaderOffset = readUInt32(zipData, centralOffset + 42)
    const nameBytes = zipData.slice(centralOffset + 46, centralOffset + 46 + nameLength)
    const name = decoder.decode(nameBytes)

    if (readUInt32(zipData, localHeaderOffset) !== 0x04034b50) throw new Error(tr('导出失败'))
    const localNameLength = readUInt16(zipData, localHeaderOffset + 26)
    const localExtraLength = readUInt16(zipData, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength

    entries.push({
      name,
      nameBytes,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      dataOffset
    })

    centralOffset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function concatUint8Arrays(parts, totalLength) {
  const result = new Uint8Array(totalLength)
  let offset = 0
  parts.forEach(part => {
    result.set(part, offset)
    offset += part.length
  })
  return result
}

function buildZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0

  entries.forEach(entry => {
    const localHeader = new Uint8Array(30 + entry.nameBytes.length)
    writeUInt32(localHeader, 0, 0x04034b50)
    writeUInt16(localHeader, 4, 20)
    writeUInt16(localHeader, 6, entry.flags & ~0x08)
    writeUInt16(localHeader, 8, entry.method)
    writeUInt32(localHeader, 14, entry.crc)
    writeUInt32(localHeader, 18, entry.compressedSize)
    writeUInt32(localHeader, 22, entry.uncompressedSize)
    writeUInt16(localHeader, 26, entry.nameBytes.length)
    localHeader.set(entry.nameBytes, 30)
    localParts.push(localHeader, entry.compressedData)

    const centralHeader = new Uint8Array(46 + entry.nameBytes.length)
    writeUInt32(centralHeader, 0, 0x02014b50)
    writeUInt16(centralHeader, 4, 20)
    writeUInt16(centralHeader, 6, 20)
    writeUInt16(centralHeader, 8, entry.flags & ~0x08)
    writeUInt16(centralHeader, 10, entry.method)
    writeUInt32(centralHeader, 16, entry.crc)
    writeUInt32(centralHeader, 20, entry.compressedSize)
    writeUInt32(centralHeader, 24, entry.uncompressedSize)
    writeUInt16(centralHeader, 28, entry.nameBytes.length)
    writeUInt32(centralHeader, 42, offset)
    centralHeader.set(entry.nameBytes, 46)
    centralParts.push(centralHeader)

    offset += localHeader.length + entry.compressedData.length
  })

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const endHeader = new Uint8Array(22)
  writeUInt32(endHeader, 0, 0x06054b50)
  writeUInt16(endHeader, 8, entries.length)
  writeUInt16(endHeader, 10, entries.length)
  writeUInt32(endHeader, 12, centralSize)
  writeUInt32(endHeader, 16, centralOffset)

  const totalLength = offset + centralSize + endHeader.length
  return concatUint8Arrays([...localParts, ...centralParts, endHeader], totalLength)
}

async function translateInventoryExportXlsx(blobData) {
  const zipData = new Uint8Array(await blobData.arrayBuffer())
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const entries = parseZipEntries(zipData)

  const translatedEntries = await Promise.all(entries.map(async entry => {
    const shouldTranslate = /^xl\/(sharedStrings|worksheets\/.*)\.xml$/i.test(entry.name)
    if (!shouldTranslate) {
      return {
        ...entry,
        compressedData: zipData.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
      }
    }

    const content = await getZipEntryContent(zipData, entry)
    const xmlText = decoder.decode(content)
    const translatedText = replaceInventoryHeaderText(xmlText)
    if (translatedText === xmlText) {
      return {
        ...entry,
        compressedData: zipData.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize)
      }
    }

    const translatedData = encoder.encode(translatedText)
    return {
      ...entry,
      method: 0,
      crc: crc32(translatedData),
      compressedSize: translatedData.length,
      uncompressedSize: translatedData.length,
      compressedData: translatedData
    }
  }))

  return buildZip(translatedEntries)
}

/** 与列表筛选项一致，不传分页、排序（汇总无分页） */
const getWarehouseSummaryQuery = () => {
  const full = getCurrentQuery()
  const { pageNum, pageSize, orderByColumn, isAsc, ...rest } = full
  return rest
}

const buildDetailDataFromRow = (row, images) => ({
  item: {
    id: row.itemId,
    itemName: row.itemName,
    itemCategory: row.itemCategory,
    categoryName: row.categoryName,
    itemBrand: row.itemBrand,
    brandName: row.brandName,
    itemCondition: row.itemCondition,
    year: row.year,
    material: row.material,
    modelName: row.modelName,
    defect: row.defect,
    accessories: row.accessories,
    cared: row.cared,
    authAgency: row.authAgency,
    consignInfo: row.consignInfo,
    defaultQty: row.defaultQty,
    remark: row.itemRemark,
    mainThumbUrl: row.itemImage,
    images: images || (row.itemImage ? [{ url: row.itemImage, thumbUrl: row.itemImage, isMain: true }] : [])
  },
  itemSku: {
    id: row.skuId,
    skuCode: row.skuCode,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice
  }
})

const queryDetailBySku = async (row) => {
  let images
  if (row.itemId) {
    try {
      const imageRes = await getItemImages(row.itemId)
      images = imageRes.data || []
    } catch (e) {
      images = undefined
    }
  }
  return buildDetailDataFromRow(row, images)
}

const openDetailDrawer = async (row) => {
  if (!row?.skuId) return
  detailDrawer.value.visible = true
  detailDrawer.value.loading = true
  detailDrawer.value.data = buildDetailDataFromRow(row)
  try {
    detailDrawer.value.data = await queryDetailBySku(row)
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('获取详情失败'))
  } finally {
    detailDrawer.value.loading = false
  }
}

const getList = async () => {
  const query = getCurrentQuery()
  loading.value = true
  try {
    let res
    if (queryType.value === 'warehouse') {
      const summaryQuery = getWarehouseSummaryQuery()
      const [summaryRsp, listRsp] = await Promise.all([
        listInventoryBoardWarehouseSummary(summaryQuery),
        listInventoryBoard(query, queryType.value)
      ])
      res = listRsp
      const raw = summaryRsp?.data
      const summaryItems = Array.isArray(raw) ? raw : []
      warehouseSummaryMap.value = buildWarehouseSummaryMap(summaryItems)
    } else {
      warehouseSummaryMap.value = new Map()
      res = await listInventoryBoard(query, queryType.value)
    }
    let rows = res.rows || []
    if (filterable.value) {
      rows = rows.filter(it => Number(it.quantity) !== 0)
    }

    rows.forEach(it => {
      const warehouseKey = getWarehouseGroupKey(it)
      const itemKey = String(it.itemName ?? '')
      const skuKey = String(it.skuCode ?? '')

      it.warehouseGroupKey = warehouseKey
      it.itemGroupKey = itemKey
      it.skuGroupKey = skuKey
      it.warehouseItemGroupKey = `${warehouseKey}-${itemKey}`
      it.skuWarehouseGroupKey = `${skuKey}-${warehouseKey}`
    })

    suppressInventorySelectionChange = true
    inventoryList.value = rows
    total.value = res.total ?? 0
    await restoreInventorySelection()
  } finally {
    loading.value = false
  }
}

const handleExportExcel = async () => {
  try {
    exportLoading.value = true
    const exportLanguage = getExportLanguagePayload()
    const blobData = await exportInventoryBoardItem(
      {
        ...getCurrentQuery(),
        ...exportLanguage
      },
      {
        headers: {
          'Content-Language': exportLanguage.contentLanguage,
          'Accept-Language': isEn.value ? 'en-US,en;q=0.9' : 'zh-CN,zh;q=0.9'
        }
      }
    )
    const isBlob = blobValidate(blobData)
    if (!isBlob) {
      const resText = await blobData.text()
      const rspObj = JSON.parse(resText)
      const errMsg = rspObj?.msg || tr('导出失败')
      throw new Error(errMsg)
    }
    const excelData = isEn.value ? await translateInventoryExportXlsx(blobData) : blobData
    const blob = new Blob([excelData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = isEn.value ? 'LuxeAFWMS-Inventory Statistics.xlsx' : 'LuxeAFWMS-库存统计.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
    proxy.$modal.msgSuccess(tr('导出成功'))
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('导出失败'))
  } finally {
    exportLoading.value = false
  }
}

const getInventorySelectionKey = (row) => row?.skuId && row?.warehouseId ? `${row.skuId}_${row.warehouseId}` : ''

function syncSelectedRows() {
  selectedRows.value = Array.from(selectedRowMap.value.values())
}

async function restoreInventorySelection() {
  await nextTick()
  tableRef.value?.clearSelection()
  if (batchMode.value) {
    inventoryList.value.forEach(row => {
      const key = getInventorySelectionKey(row)
      if (key && selectedRowMap.value.has(key)) {
        tableRef.value?.toggleRowSelection(row, true)
      }
    })
  }
  await nextTick()
  suppressInventorySelectionChange = false
}

function clearInventorySelection() {
  selectedRowMap.value.clear()
  selectedRows.value = []
  tableRef.value?.clearSelection()
}

function clearInventorySelectionWhenNotBatching() {
  if (!batchMode.value) {
    clearInventorySelection()
  }
}

function handleSelectionChange(selection) {
  if (suppressInventorySelectionChange) return
  const selectedKeySet = new Set(selection.map(getInventorySelectionKey))
  inventoryList.value.forEach(row => {
    const key = getInventorySelectionKey(row)
    if (!key) return
    if (selectedKeySet.has(key)) {
      selectedRowMap.value.set(key, row)
    } else {
      selectedRowMap.value.delete(key)
    }
  })
  syncSelectedRows()
}

async function handleBatchExportExcel() {
  if (selectedRows.value.length === 0) {
    proxy.$modal.msgWarning(tr('请至少选择一条库存记录'))
    return
  }
  try {
    batchExportExcelLoading.value = true
    const rows = selectedRows.value.map(row => ({
      skuId: row.skuId,
      warehouseId: row.warehouseId
    }))
    const exportLanguage = getExportLanguagePayload()
    const blobData = await batchExportInventoryBoardExcel(
      { rows },
      {
        headers: {
          'Content-Language': exportLanguage.contentLanguage,
          'Accept-Language': isEn.value ? 'en-US,en;q=0.9' : 'zh-CN,zh;q=0.9'
        }
      }
    )
    const isBlob = blobValidate(blobData)
    if (!isBlob) {
      const resText = await blobData.text()
      const rspObj = JSON.parse(resText)
      throw new Error(rspObj?.msg || tr('批量导出失败'))
    }
    const excelData = isEn.value ? await translateInventoryExportXlsx(blobData) : blobData
    const blob = new Blob([excelData], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = isEn.value ? 'LuxeAFWMS-Inventory Batch Export.xlsx' : 'LuxeAFWMS-库存统计批量导出.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
    proxy.$modal.msgSuccess(tr('批量导出成功'))
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('批量导出失败'))
  } finally {
    batchExportExcelLoading.value = false
  }
}

/**
 * 批量导出 PDF（参考详细信息页面的 exportDetailPdf 实现方式：
 * 前端构建 HTML，新窗口打开后自动触发浏览器打印为 PDF）。
 */
function handleBatchExportPdf() {
  if (selectedRows.value.length === 0) {
    proxy.$modal.msgWarning(tr('请至少选择一条库存记录'))
    return
  }
  try {
    batchExportPdfLoading.value = true
    const canViewCost = canViewCostPrice.value
    const canViewSelling = canViewSellingPrice.value

    // ── 表头 ──
    const headers = [
      tr('商品图片'), tr('商品名称'), tr('SKU编号'), tr('仓库'), tr('库存数量'),
      tr('入库时间'), tr('出库时间'), tr('出库平台'), tr('周转天数')
    ]
    if (canViewCost) headers.push(tr('平均成本价'))
    if (canViewSelling) headers.push(tr('平均销售价'))
    if (canViewCost && canViewSelling) headers.push(tr('利润'))
    headers.push(tr('成色'), tr('瑕疵'))
    const headerHtml = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')

    // ── 数据行 ──
    const rowsHtml = selectedRows.value.map(row => {
      const cells = []
      // 图片列（参考前端 72×72 展示尺寸）
      const imgUrl = row.itemImage || ''
      cells.push(imgUrl
        ? `<img src="${escapeHtml(imgUrl)}" style="width:72px;height:72px;object-fit:cover;border-radius:4px;display:block;margin:0 auto;" />`
        : escapeHtml(tr('暂无图片')))
      cells.push(escapeHtml(row.itemName || '--'))
      cells.push(escapeHtml(row.skuCode || '--'))
      cells.push(escapeHtml(row.warehouseName || '--'))
      cells.push(row.quantity != null ? row.quantity : '--')
      cells.push(formatTime(row.receiptTime))
      cells.push(formatTime(row.shipmentTime))
      cells.push(escapeHtml(row.outboundPlatform || '--'))
      cells.push(row.turnoverDays != null ? row.turnoverDays : '--')
      if (canViewCost) cells.push(formatMoney(row.avgReceiptCost))
      if (canViewSelling) cells.push(formatMoney(row.avgShipmentPrice))
      if (canViewCost && canViewSelling) cells.push(formatProfit(row.totalProfit))
      cells.push(escapeHtml(row.itemCondition || '--'))
      cells.push(escapeHtml(row.defect || '--'))
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`
    }).join('')

    // ── 报表标题与导出时间 ──
    const title = tr('库存统计报表')
    const now = new Date()
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const count = selectedRows.value.length
    const metaText = isEn.value
      ? `${nowStr} | ${count} records`
      : `${nowStr} | 共 ${count} 条记录`
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      proxy.$modal.msgError(tr('批量导出失败'))
      batchExportPdfLoading.value = false
      return
    }
    printWindow.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(safeFileName(title, title))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, "Microsoft YaHei", sans-serif; padding: 20px; color: #1f2329; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #667085; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
    th, td { border: 1px solid #dfe3eb; padding: 4px 6px; text-align: left; vertical-align: middle; overflow-wrap: break-word; }
    th { background: #f5f7fa; color: #4b5563; font-weight: 600; white-space: nowrap; }
    tr:nth-child(even) td { background: #fafbfc; }
    td:first-child { width: 80px; text-align: center; }
    .cell-num { text-align: right; white-space: nowrap; }
    @page { size: landscape; margin: 6mm; }
    @media print {
      body { padding: 0; }
      table { font-size: 8px; }
      th, td { padding: 2px 3px; }
      th { white-space: normal; }
      td:first-child { width: 56px; }
      td:first-child img { width: 48px; height: 48px; }
      h1 { font-size: 14px; }
      .meta { font-size: 8px; margin-bottom: 8px; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(metaText)}</div>
  <table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
</body>
</html>
    `)
    printWindow.document.close()
    // 等新窗口渲染完成后自动呼出浏览器打印对话框
    setTimeout(function () {
      try { printWindow.print(); } catch (e) { /* 用户可能已关闭窗口 */ }
    }, 800)
    proxy.$modal.msgSuccess(tr('批量导出成功'))
  } catch (e) {
    proxy.$modal.msgError(e?.message || tr('批量导出失败'))
  } finally {
    batchExportPdfLoading.value = false
  }
}

const handleQuery = () => {
  clearInventorySelectionWhenNotBatching()
  queryParams.value.pageNum = 1
  getList()
}

let suppressSortChangeQuery = false

const applyDefaultInventorySort = () => {
  queryParams.value.orderByColumn = DEFAULT_INVENTORY_SORT.prop
  queryParams.value.isAsc = DEFAULT_INVENTORY_SORT.order
}

const resetQuery = () => {
  clearInventorySelectionWhenNotBatching()
  filterable.value = true
  proxy.resetForm('queryRef')
  applyDefaultInventorySort()
  queryParams.value.pageNum = 1
  nextTick(() => {
    suppressSortChangeQuery = true
    tableRef.value?.sort?.(DEFAULT_INVENTORY_SORT.prop, DEFAULT_INVENTORY_SORT.order)
    suppressSortChangeQuery = false
    getList()
  })
}

const handleColumnSortChange = ({ prop, order }) => {
  queryParams.value.orderByColumn = prop || undefined
  queryParams.value.isAsc = order === 'ascending' ? 'ascending' : order === 'descending' ? 'descending' : undefined
  if (suppressSortChangeQuery) return
  clearInventorySelectionWhenNotBatching()
  queryParams.value.pageNum = 1
  getList()
}

const handleSortTypeChange = (e) => {
  if (e === 'warehouse') {
    rowSpanArray.value = ['warehouseGroupKey', 'warehouseItemGroupKey']
  } else if (e === 'item') {
    rowSpanArray.value = ['itemGroupKey', 'skuGroupKey', 'skuWarehouseGroupKey']
  }
  clearInventorySelectionWhenNotBatching()
  queryParams.value.pageNum = 1
  getList()
}

const handleChangeFilterZero = () => {
  clearInventorySelectionWhenNotBatching()
  queryParams.value.pageNum = 1
  getList()
}

const toggleBatchMode = () => {
  batchMode.value = !batchMode.value
  if (!batchMode.value) {
    clearInventorySelection()
  } else {
    suppressInventorySelectionChange = true
    restoreInventorySelection()
  }
}

const handleBatchPublish = () => {
  if (selectedRows.value.length === 0) {
    proxy.$modal.msgWarning(tr('请先勾选商品'))
    return
  }
  const publishableRows = selectedRows.value.filter(row => getItemImage(row))
  const noImageCount = selectedRows.value.length - publishableRows.length
  if (noImageCount > 0) {
    proxy.$modal.msgWarning(tr('{count} 个商品没有图片，无法上架').replace('{count}', noImageCount))
  }
  const skuIds = [...new Set(publishableRows.map(r => r.skuId).filter(Boolean))]
  if (skuIds.length === 0) {
    proxy.$modal.msgWarning(tr('勾选的商品都没有图片，无法上架'))
    return
  }
  publishDialogRef.value?.openWithSkus(skuIds)
}

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

onMounted(() => {
  useWmsStore().getWarehouseList()
  useWmsStore().getItemBrandList()
  useWmsStore().getItemCategoryList()
  useWmsStore().getItemCategoryTreeList()
  getList()
})
</script>

<style scoped lang="scss">
.page-title {
  font-size: large;
}

.mt12 {
  margin-top: 12px;
}

.statistic-query-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.inventory-statistic-page.is-en .statistic-query-form :deep(.el-form-item__label) {
  white-space: nowrap;
  line-height: 18px;
  justify-content: flex-end;
  word-break: normal;
}

.inventory-statistic-page.is-en .statistic-query-form :deep(.el-form-item__content) {
  min-width: 0;
}

.inventory-statistic-page .action-btn {
  min-width: 88px;
}

.inventory-statistic-page.is-en .action-btn {
  min-width: 108px;
}

.query-price-range {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.query-price-range-item {
  flex: 1;
  margin-bottom: 0 !important;
}

.query-price-range-separator {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary, #909399);
}

.toolbar-right {
  text-align: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  border: 1px solid var(--el-color-primary-light-5, #c6e2ff);
  border-radius: 6px;
}

.batch-action-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.batch-action-icon {
  font-size: 18px;
  color: var(--el-color-primary, #409eff);
}

.batch-action-info {
  color: var(--el-text-color-primary, #303133);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.batch-action-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.statistic-table {
  width: 100%;
}

.inventory-statistic-page.is-en .statistic-table :deep(.cell) {
  word-break: normal;
}

:deep(.vertical-top-cell) {
  vertical-align: top;
}

.copyable-cell {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.copyable-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copy-btn {
  flex: 0 0 auto;
  padding: 0;
}

.item-main-image {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  display: inline-block;
}

.image-empty {
  width: 72px;
  height: 72px;
  border-radius: 6px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}

.detail-drawer-body {
  min-height: 320px;
}

.detail-drawer-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 36px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.detail-title {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--el-text-color-primary, #303133);
}

.detail-subtitle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--el-text-color-secondary, #909399);
}

.condition-mark {
  min-width: 88px;
  text-align: right;
  color: var(--el-text-color-secondary, #909399);
}

.condition-mark strong {
  display: block;
  margin-top: 4px;
  font-size: 36px;
  line-height: 1;
  color: var(--el-text-color-primary, #303133);
}

.detail-field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-left: 1px solid var(--el-border-color-lighter, #ebeef5);
  margin-bottom: 24px;
}

.detail-field {
  min-width: 0;
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  border-right: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.detail-field.is-wide {
  grid-column: 1 / -1;
}

.detail-field-label {
  padding: 12px 14px;
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-regular, #606266);
  font-weight: 600;
}

.detail-field-value {
  min-width: 0;
  padding: 12px 14px;
  color: var(--el-text-color-primary, #303133);
  word-break: break-word;
}

.accessory-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-image-section {
  margin-top: 8px;
}

.detail-section-title {
  margin-bottom: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.detail-image-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
}

:global(.el-image-viewer__actions) {
  width: 374px;
  padding-right: 112px;
}

.inventory-preview-actions {
  position: absolute;
  z-index: 2;
  left: calc(50% + 92px);
  bottom: 30px;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0;
}

.inventory-preview-action {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  color: #fff;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.inventory-preview-action:hover {
  opacity: 0.72;
}

.detail-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background: var(--el-fill-color-light, #f5f7fa);
}

.detail-image-card {
  position: relative;
  min-width: 0;
}

.detail-empty {
  min-height: 96px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary, #909399);
}

</style>
