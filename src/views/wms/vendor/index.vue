<template>
  <div class="app-container supplier-settlement-page">
    <el-alert
      :title="text('智能结算只按弹窗中选择的供货商生成明细。确认后保存结算单和明细，并更新 SKU 累计已结算金额；当前不调用外部付款。', 'Smart settlement uses only the supplier selected in its dialog. Confirmation saves the order and details and updates each SKU settled total; no external payment is made.')"
      type="info"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <el-form
      v-if="identityResolved"
      ref="queryRef"
      :model="queryParams"
      :inline="true"
      label-width="92px"
      class="query-form"
    >
      <el-form-item :label="text('商品名称', 'Item')" prop="itemName">
        <el-input v-model="queryParams.itemName" :placeholder="text('请输入商品名称', 'Enter item name')" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="SKU" prop="skuCode">
        <el-input v-model="queryParams.skuCode" placeholder="SKU" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item v-if="identityResolved && !isSupplierUser" :label="text('供货商', 'Supplier')" prop="supplierId">
        <el-select v-model="queryParams.supplierId" :placeholder="text('全部供货商', 'All suppliers')" clearable filterable>
          <el-option v-for="supplier in supplierOptions" :key="supplier.id" :label="supplier.supplierName" :value="supplier.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('统计状态', 'Status')" prop="quantityStatus">
        <el-select v-model="queryParams.quantityStatus" :placeholder="text('全部状态', 'All statuses')" clearable>
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('商品上架时间', 'Item listed at')" label-width="118px" class="listed-time-filter">
        <el-date-picker
          class="listed-time-picker"
          v-model="createdTimeRange"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          :range-separator="text('至', 'to')"
          :start-placeholder="text('开始时间', 'Start time')"
          :end-placeholder="text('结束时间', 'End time')"
          clearable
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">{{ text('查询', 'Search') }}</el-button>
        <el-button icon="Refresh" @click="resetQuery">{{ text('重置', 'Reset') }}</el-button>
        <el-button
          type="info"
          icon="Download"
          :loading="exportLoading"
          :disabled="loading || total === 0"
          @click="handleExport"
          v-hasPermi="['wms:vendor:list']"
        >{{ text('\u5bfc\u51fa\u5168\u90e8', 'Export all') }}</el-button>
        <el-button
          v-if="canPreviewSettlement"
          type="success"
          icon="Money"
          :loading="previewLoading"
          @click="openSettlementPreview"
        >{{ text('智能结算', 'Smart settlement') }}</el-button>
      </el-form-item>
    </el-form>

    <div
      v-loading="loading"
      element-loading-custom-class="purchased-loading-mask"
      class="purchased-data-section"
    >
      <div class="summary-grid">
        <div v-for="card in summaryCards" :key="card.key" class="summary-card" :class="card.className">
          <span>{{ card.label }}</span>
          <strong>{{ card.money ? money(card.value) : quantity(card.value) }}</strong>
        </div>
      </div>

      <el-table :data="rows" border stripe class="overview-table">
      <el-table-column :label="text('商品', 'Item')" min-width="260" fixed="left">
        <template #default="{ row }">
          <div class="item-cell">
            <el-image
              class="item-image"
              :src="row.mainThumbUrl || row.mainImageUrl"
              :preview-src-list="row.mainImageUrl ? [row.mainImageUrl] : []"
              preview-teleported
              fit="cover"
            >
              <template #error><div class="image-empty">-</div></template>
            </el-image>
            <div class="item-meta">
              <strong>{{ row.itemName || '-' }}</strong>
              <span>{{ row.brandName || '-' }}<template v-if="row.categoryName"> · {{ row.categoryName }}</template></span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="text('供货商', 'Supplier')" prop="supplierName" min-width="150" show-overflow-tooltip />
      <el-table-column label="SKU" prop="skuCode" min-width="145" show-overflow-tooltip />
      <el-table-column :label="text('商品个数', 'Added')" align="right" min-width="105">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('product', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('product', row)">
            {{ quantity(row.productQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.productQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('未入库', 'Not inbound')" align="right" min-width="105">
        <template #default="{ row }"><span class="warning-text">{{ quantity(row.unreceivedQuantity) }}</span></template>
      </el-table-column>
      <el-table-column :label="text('已入库', 'Inbound')" align="right" min-width="100">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('received', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('received', row)">
            {{ quantity(row.receivedQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.receivedQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('商品上架时间', 'Item listed at')" align="center" min-width="170">
        <template #default="{ row }">{{ displayTime(row.createdTime) }}</template>
      </el-table-column>
      <el-table-column :label="text('入库时间', 'Inbound time')" align="center" min-width="170">
        <template #default="{ row }">{{ displayTime(row.firstReceiptTime) }}</template>
      </el-table-column>
      <el-table-column :label="text('在仓', 'In stock')" align="right" min-width="90">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('inventory', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('inventory', row)">
            {{ quantity(row.inventoryQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.inventoryQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="identityResolved && !isSupplierUser" :label="text('平台已售', 'Platform sold')" align="right" min-width="115">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('platformSold', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('platformSold', row)">
            {{ quantity(row.platformSoldQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.platformSoldQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="identityResolved && !isSupplierUser" :label="text('平台外已售', 'Off-platform sold')" align="right" min-width="135">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('offPlatformSold', row)" type="primary" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('offPlatformSold', row)">
            {{ quantity(row.offPlatformSoldQuantity) }}
          </el-link>
          <span v-else>{{ quantity(row.offPlatformSoldQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="isSupplierUser ? text('已售', 'Sold') : text('已售合计', 'Total sold')" align="right" min-width="105">
        <template #default="{ row }">
          <span>{{ quantity(row.soldQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('退货', 'Returned')" align="right" min-width="90">
        <template #default="{ row }">
          <el-link v-if="canOpenSkuPage('returned', row)" type="danger" :underline="false" class="sku-metric-link" @click.stop="openSkuPage('returned', row)">
            {{ quantity(row.returnedQuantity) }}
          </el-link>
          <span v-else :class="{ 'danger-text': Number(row.returnedQuantity) > 0 }">{{ quantity(row.returnedQuantity) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="text('结算单价', 'Unit cost')" align="right" min-width="110">
        <template #default="{ row }">{{ money(row.unitCost) }}</template>
      </el-table-column>
      <el-table-column :label="text('已结算价格', 'Settled')" align="right" min-width="125">
        <template #default="{ row }">{{ money(row.settledAmount) }}</template>
      </el-table-column>
      <el-table-column :label="text('总结算价格', 'Total payable')" align="right" min-width="135">
        <template #default="{ row }">{{ money(row.totalSettlementAmount) }}</template>
      </el-table-column>
      <el-table-column :label="text('待结算/抵扣', 'Pending / deduction')" align="right" min-width="145" fixed="right">
        <template #default="{ row }">
          <el-tag :type="settlementTagType(row.pendingSettlementAmount)" effect="plain">
            {{ money(row.pendingSettlementAmount) }}
          </el-tag>
        </template>
      </el-table-column>
      </el-table>

      <div v-show="total > 0" class="supplier-pagination">
        <pagination
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="loadData"
        />
      </div>
    </div>

    <el-dialog
      v-model="supplierSelectVisible"
      :title="text('选择结算供货商', 'Select settlement supplier')"
      width="480px"
      append-to-body
      destroy-on-close
    >
      <el-alert
        :title="text('智能结算不会使用当前列表的商品、SKU、状态或时间筛选，只结算这里选择的供货商。', 'Smart settlement ignores the current item, SKU, status and date filters, and uses only the supplier selected here.')"
        type="info"
        show-icon
        :closable="false"
        class="preview-alert"
      />
      <el-form ref="supplierSelectRef" :model="settlementSelection" :rules="settlementSelectionRules" label-width="90px">
        <el-form-item :label="text('供货商', 'Supplier')" prop="supplierId">
          <el-select
            v-model="settlementSelection.supplierId"
            :placeholder="text('请选择供货商', 'Select a supplier')"
            filterable
            style="width: 100%"
          >
            <el-option v-for="supplier in supplierOptions" :key="supplier.id" :label="supplier.supplierName" :value="supplier.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplierSelectVisible = false">{{ text('取消', 'Cancel') }}</el-button>
        <el-button type="primary" :loading="previewLoading" @click="loadSettlementPreview">
          {{ text('生成结算明细', 'Generate details') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      :title="text('智能结算金额预览', 'Smart settlement preview')"
      width="92%"
      top="4vh"
      append-to-body
      destroy-on-close
    >
      <el-alert
        :title="text('可取消勾选、同步或手工添加 SKU，并编辑本次待结算金额和备注。发起结算只保存为待结算草稿；确认结算后才更新对应 SKU 累计已结算金额。', 'You can select or add SKUs and edit the current amount and remark. Initiating saves a draft; confirming updates SKU settled totals.')"
        type="warning"
        show-icon
        :closable="false"
        class="preview-alert"
      />
      <el-descriptions :column="4" border class="preview-summary">
        <el-descriptions-item :label="text('供货商', 'Supplier')">{{ settlementPreview.supplierName || text('多个供货商', 'Multiple suppliers') }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ settlementPreview.skuCount || 0 }}</el-descriptions-item>
        <el-descriptions-item :label="text('全部商品数量', 'All product qty')">{{ quantity(settlementPreview.productQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('平台外已售数量', 'Off-platform sold qty')">{{ quantity(settlementPreview.offPlatformSoldQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('平台已售数量', 'Platform sold qty')">{{ quantity(settlementPreview.platformSoldQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('已售总数量', 'Total sold qty')">{{ quantity(settlementPreview.soldQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('退货数量', 'Returned qty')">{{ quantity(settlementPreview.returnedQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('销售成本总额', 'Gross cost')">{{ money(settlementPreview.grossAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('退货抵扣', 'Return deduction')">{{ money(settlementPreview.returnDeductionAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('总结算价格', 'Total settlement value')">{{ money(settlementPreview.totalSettlementAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('累计已结算', 'Settled')">{{ money(settlementPreview.settledAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('本次待结算', 'Pending')">
          <strong :class="Number(settlementPreview.pendingSettlementAmount) < 0 ? 'danger-text' : 'success-text'">{{ money(settlementPreview.pendingSettlementAmount) }}</strong>
        </el-descriptions-item>
      </el-descriptions>

      <div class="settlement-target">
        <span class="settlement-target__label">{{ text('本次结算金额', 'Current settlement amount') }}</span>
        <el-input-number
          v-model="settlementTargetAmount"
          :min="0.01"
          :max="settlementTargetMaxAmount"
          :precision="2"
          :controls="false"
          class="settlement-target__input"
          :placeholder="text('输入本次结算总额', 'Enter total amount')"
          @keyup.enter="applySettlementTarget"
        />
        <el-button
          type="primary"
          plain
          :disabled="!hasValidSettlementTarget"
          @click="applySettlementTarget()"
        >{{ text('按上架时间分配', 'Allocate by listing time') }}</el-button>
        <span class="settlement-target__tip">
          {{ text('从上架时间最早的商品开始分配，最后一个 SKU 可部分结算。', 'Allocates from the earliest listed item; the last SKU can be partially settled.') }}
        </span>
      </div>

      <div class="preview-toolbar">
        <el-button type="warning" plain icon="Plus" @click="openForceSkuDialog">
          {{ text('手工添加 SKU 强制结算', 'Add SKU for forced settlement') }}
        </el-button>
        <span class="preview-toolbar__tip">
          {{ text('强制结算金额会计入累计已结算；以后满足正常结算条件时自动扣除。', 'Forced amounts are added to settled totals and deducted from future normal settlements.') }}
        </span>
      </div>

      <el-table
        ref="previewTableRef"
        :data="previewPageLines"
        row-key="skuId"
        border
        stripe
        max-height="520"
        @select="handlePreviewSelect"
        @select-all="handlePreviewSelectAll"
      >
        <el-table-column type="selection" width="52" fixed="left" />
        <el-table-column :label="text('结算类型', 'Type')" width="105" fixed="left">
          <template #default="{ row }">
            <el-tag :type="row.settlementType === 'FORCED' ? 'warning' : 'success'" effect="plain">
              {{ row.settlementType === 'FORCED' ? text('强制结算', 'Forced') : text('正常结算', 'Normal') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="text('供货商', 'Supplier')" prop="supplierName" min-width="105" show-overflow-tooltip />
        <el-table-column label="SKU" prop="skuCode" min-width="135" />
        <el-table-column :label="text('商品', 'Item')" prop="itemName" min-width="180" show-overflow-tooltip />
        <el-table-column :label="text('商品上架时间', 'Item listing time')" prop="createdTime" width="175">
          <template #default="{ row }">{{ displayTime(row.createdTime) }}</template>
        </el-table-column>
        <el-table-column :label="text('全部商品数量', 'All product qty')" align="right" width="125">
          <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('平台外已售数量', 'Off-platform sold qty')" align="right" width="145">
          <template #default="{ row }">{{ quantity(row.offPlatformSoldQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('平台已售数量', 'Platform sold qty')" align="right" width="135">
          <template #default="{ row }">{{ quantity(row.platformSoldQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('已售总数量', 'Total sold qty')" align="right" width="125">
          <template #default="{ row }">{{ quantity(row.soldQuantity) }}</template>
        </el-table-column>
        <el-table-column v-if="!isSupplierUser" :label="text('平台已售中订单编号', 'Platform sold order numbers')" prop="platformSoldOrderNumbers" min-width="230">
          <template #default="{ row }">
            <template v-if="orderNumberLinks(row).length">
              <el-link
                v-for="orderNo in orderNumberLinks(row)"
                :key="orderNo"
                type="primary"
                class="order-number-link"
                @click="openPlatformOrder(orderNo)"
              >{{ orderNo }}</el-link>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column :label="text('退货数量', 'Returned')" align="right" width="100">
          <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('净结算数量', 'Net qty')" align="right" width="115">
          <template #default="{ row }">{{ quantity(row.settleableQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('单价（商品管理 Cost）', 'Unit price (Item Cost)')" align="right" width="185" class-name="amount-column">
          <template #default="{ row }">{{ money(row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column :label="text('总结算价格', 'Total settlement')" align="right" width="165" class-name="amount-column">
          <template #default="{ row }">{{ money(row.totalSettlementAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('已结算', 'Settled')" align="right" width="140" class-name="amount-column">
          <template #default="{ row }">{{ money(row.settledAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('本次待结算', 'Pending')" align="right" width="165" class-name="amount-column">
          <template #default="{ row }">
            <el-input-number
              v-model="row.pendingSettlementAmount"
              :min="settlementAmountMin(row)"
              :max="settlementAmountMax(row)"
              :precision="2"
              :controls="false"
              size="small"
              class="force-amount-input"
              :placeholder="text('输入金额', 'Amount')"
            />
          </template>
        </el-table-column>
        <el-table-column :label="text('备注', 'Remark')" min-width="220">
          <template #default="{ row }">
            <el-input
              v-model="row.remark"
              maxlength="500"
              show-word-limit
              clearable
              :placeholder="text('可填写本条结算备注', 'Optional line remark')"
            />
          </template>
        </el-table-column>
        <el-table-column :label="text('操作', 'Actions')" width="90" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.settlementType === 'FORCED'" link type="danger" @click="removeForcedLine(row)">
              {{ text('移除', 'Remove') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-show="(preview.lines || []).length > 0" class="preview-pagination">
        <pagination
          :total="(preview.lines || []).length"
          v-model:page="previewPagination.pageNum"
          v-model:limit="previewPagination.pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :auto-scroll="false"
          @pagination="handlePreviewPagination"
        />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">{{ text('关闭', 'Close') }}</el-button>
        <el-button
          type="warning"
          plain
          :loading="confirmLoading"
          :disabled="!selectedPreviewLines.length"
          @click="confirmSettlement('DRAFT')"
        >{{ text(`发起结算（${selectedPreviewLines.length}项）`, `Initiate (${selectedPreviewLines.length})`) }}</el-button>
        <el-button
          type="primary"
          :loading="confirmLoading"
          :disabled="!selectedPreviewLines.length"
          @click="confirmSettlement('CONFIRMED')"
        >{{ text(`确认结算（${selectedPreviewLines.length}项）`, `Confirm (${selectedPreviewLines.length})`) }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="forceSkuVisible"
      :title="text('选择强制结算 SKU', 'Select forced-settlement SKUs')"
      width="78%"
      top="7vh"
      append-to-body
      destroy-on-close
    >
      <el-alert
        :title="text('可勾选当前供货商的已采购 SKU；翻页或查询时会保留全部已选项。已在结算明细中的 SKU 会同步原行勾选状态，不会重复新增结算明细。', 'Select purchased SKUs for this supplier. Selections are retained across pages and searches. Existing preview SKUs sync their selection instead of creating duplicates.')"
        type="warning"
        show-icon
        :closable="false"
        class="preview-alert"
      />
      <el-form :inline="true" class="force-sku-query">
        <el-form-item label="SKU">
          <el-input v-model="forceSkuQuery.skuCode" clearable @keyup.enter="searchForceSkuCandidates" />
        </el-form-item>
        <el-form-item :label="text('商品', 'Item')">
          <el-input v-model="forceSkuQuery.itemName" clearable @keyup.enter="searchForceSkuCandidates" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="searchForceSkuCandidates">{{ text('查询', 'Search') }}</el-button>
          <el-button icon="Refresh" @click="resetForceSkuQuery">{{ text('重置', 'Reset') }}</el-button>
        </el-form-item>
      </el-form>
      <el-table
        ref="forceSkuTableRef"
        v-loading="forceSkuLoading"
        :data="forceSkuRows"
        row-key="skuId"
        border
        stripe
        max-height="460"
        @select="handleForceSkuSelect"
        @select-all="handleForceSkuSelectAll"
      >
        <el-table-column type="selection" width="52" :selectable="canSelectForceSku" />
        <el-table-column label="SKU" prop="skuCode" min-width="140" />
        <el-table-column :label="text('商品', 'Item')" prop="itemName" min-width="190" show-overflow-tooltip />
        <el-table-column :label="text('商品数量', 'Product qty')" width="110" align="right">
          <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('单价', 'Unit price')" width="120" align="right">
          <template #default="{ row }">{{ money(row.unitCost) }}</template>
        </el-table-column>
        <el-table-column :label="text('总结算价格', 'Total settlement')" width="145" align="right">
          <template #default="{ row }">{{ money(row.totalSettlementAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('累计已结算', 'Settled')" width="135" align="right">
          <template #default="{ row }">{{ money(row.settledAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('剩余可强制结算', 'Available to force')" width="165" align="right">
          <template #default="{ row }">{{ money(forceCandidateRemainingAmount(row)) }}</template>
        </el-table-column>
      </el-table>
      <div v-show="forceSkuTotal > 0" class="force-sku-pagination">
        <pagination
          :total="forceSkuTotal"
          v-model:page="forceSkuQuery.pageNum"
          v-model:limit="forceSkuQuery.pageSize"
          @pagination="loadForceSkuCandidates"
        />
      </div>
      <template #footer>
        <el-button @click="forceSkuVisible = false">{{ text('取消', 'Cancel') }}</el-button>
        <el-button type="warning" :disabled="!forceSkuSelected.length" @click="addForcedSkuLines">
          {{ text(`同步/添加（${forceSkuSelected.length}项）`, `Sync/Add (${forceSkuSelected.length})`) }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup name="SupplierSettlement">
import { computed, getCurrentInstance, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentSupplier, listSupplierNoPage } from '@/api/wms/supplier'
import {
  confirmSupplierSettlement,
  getSupplierSettlementRecord,
  getSupplierSkuSummary,
  listSupplierSkuOverview,
  previewSupplierSettlement
} from '@/api/wms/supplierSettlement'

const { proxy } = getCurrentInstance()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const exportLoading = ref(false)
const previewLoading = ref(false)
const confirmLoading = ref(false)
const supplierSelectVisible = ref(false)
const previewVisible = ref(false)
const supplierSelectRef = ref()
const rows = ref([])
const total = ref(0)
const supplierOptions = ref([])
const identityResolved = ref(false)
const isSupplierUser = ref(false)
const currentSupplierId = ref(null)
const createdTimeRange = ref([])
const preview = ref({ lines: [] })
const previewTableRef = ref()
const previewSelectionCache = ref(new Map())
const previewPagination = reactive({ pageNum: 1, pageSize: 50 })
const settlementTargetAmount = ref()
const previewPageLines = computed(() => {
  const start = (previewPagination.pageNum - 1) * previewPagination.pageSize
  return (preview.value.lines || []).slice(start, start + previewPagination.pageSize)
})
const selectedPreviewLines = computed(() => (preview.value.lines || [])
  .filter(line => previewSelectionCache.value.has(String(line.skuId))))
const settlementTargetMaxAmount = computed(() => (preview.value.lines || []).reduce((total, line) => {
  const available = settlementAvailableAmount(line)
  return available > 0 ? total + available : total
}, 0))
const hasValidSettlementTarget = computed(() => {
  const amount = Number(settlementTargetAmount.value)
  return Number.isFinite(amount) && amount > 0 && amount <= settlementTargetMaxAmount.value + 0.000001
})
const forceSkuVisible = ref(false)
const forceSkuLoading = ref(false)
const forceSkuRows = ref([])
const forceSkuTotal = ref(0)
const forceSkuSelectionCache = ref(new Map())
const forceSkuSelected = computed(() => Array.from(forceSkuSelectionCache.value.values()))
const forceSkuTableRef = ref()
let forceSkuRequestSequence = 0
const forceSkuQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  skuCode: undefined,
  itemName: undefined
})
const settlementSelection = reactive({
  supplierId: undefined
})
const settlementSelectionRules = computed(() => ({
  supplierId: [{ required: true, message: text('请选择供货商', 'Select a supplier'), trigger: 'change' }]
}))

const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
  supplierId: undefined,
  itemName: undefined,
  skuCode: undefined,
  quantityStatus: undefined
})

const summary = reactive({
  skuCount: 0,
  supplierCount: 0,
  productQuantity: 0,
  unreceivedQuantity: 0,
  receivedQuantity: 0,
  inventoryQuantity: 0,
  soldQuantity: 0,
  returnedQuantity: 0,
  platformSoldQuantity: 0,
  offPlatformSoldQuantity: 0,
  settledAmount: 0,
  totalSettlementAmount: 0,
  pendingSettlementAmount: 0
})

const isEnglish = computed(() => String(proxy?.$i18n?.locale || 'zh-cn').toLowerCase().startsWith('en'))
const text = (zh, en) => isEnglish.value ? en : zh

const statusOptions = computed(() => [
  { value: 'UNRECEIVED', label: text('有未入库商品', 'Not inbound') },
  { value: 'RECEIVED', label: text('有入库商品', 'Inbound') },
  { value: 'IN_STOCK', label: text('当前在仓', 'In stock') },
  { value: 'SOLD', label: text('已有销售', 'Delivered') },
  { value: 'RETURNED', label: text('存在退货', 'Returned') },
  { value: 'UNSETTLED', label: text('待结算', 'Unsettled') },
  { value: 'SETTLED', label: text('已结清', 'Settled') },
  { value: 'DEDUCTION', label: text('需要退货抵扣', 'Return deduction') }
])

const summaryCards = computed(() => [
  { key: 'sku', label: text('SKU 种类', 'SKUs'), value: summary.skuCount },
  { key: 'product', label: text('商品个数', 'Added'), value: summary.productQuantity },
  { key: 'unreceived', label: text('未入库', 'Not inbound'), value: summary.unreceivedQuantity, className: 'warning' },
  { key: 'received', label: text('已入库', 'Inbound'), value: summary.receivedQuantity },
  { key: 'inventory', label: text('在仓', 'In stock'), value: summary.inventoryQuantity },
  ...(!isSupplierUser.value ? [{ key: 'platformSold', label: text('平台已售', 'Platform sold'), value: summary.platformSoldQuantity },
    { key: 'offPlatformSold', label: text('平台外已售', 'Off-platform sold'), value: summary.offPlatformSoldQuantity }] : []),
  { key: 'sold', label: isSupplierUser.value ? text('已售', 'Sold') : text('已售合计', 'Total sold'), value: summary.soldQuantity, className: 'success' },
  { key: 'returned', label: text('退货', 'Returned'), value: summary.returnedQuantity, className: 'danger' },
  { key: 'settled', label: text('已结算价格', 'Settled'), value: summary.settledAmount, money: true },
  { key: 'total', label: text('总结算价格', 'Total payable'), value: summary.totalSettlementAmount, money: true },
  { key: 'pending', label: text('待结算/抵扣', 'Pending / deduction'), value: summary.pendingSettlementAmount, money: true, className: Number(summary.pendingSettlementAmount) < 0 ? 'danger' : 'success' }
])

const canPreviewSettlement = computed(() => identityResolved.value && !isSupplierUser.value && !!proxy?.$auth?.hasPermi('wms:vendor:settlement:preview'))

const settlementPreview = computed(() => {
  const lines = selectedPreviewLines.value
  const result = { ...preview.value, lines, skuCount: lines.length }
  const aggregateFields = [
    'productQuantity', 'platformSoldQuantity', 'offPlatformSoldQuantity', 'soldQuantity', 'returnedQuantity', 'grossAmount',
    'returnDeductionAmount', 'totalSettlementAmount', 'settledAmount', 'pendingSettlementAmount'
  ]
  const totals = Object.fromEntries(aggregateFields.map(field => [field, 0]))
  for (const line of lines) {
    for (const field of aggregateFields) totals[field] += Number(line?.[field] || 0)
  }
  aggregateFields.forEach(field => { result[field] = totals[field].toFixed(2) })
  return result
})

function updatePreviewSelectionCache(candidates, lines) {
  const selectedSkuIds = new Set((lines || []).map(line => String(line.skuId)))
  const nextCache = new Map(previewSelectionCache.value)
  for (const candidate of candidates) {
    const skuId = String(candidate.skuId)
    if (selectedSkuIds.has(skuId)) nextCache.set(skuId, candidate)
    else nextCache.delete(skuId)
  }
  previewSelectionCache.value = nextCache
}

function handlePreviewSelect(lines, row) {
  updatePreviewSelectionCache([row], lines)
}

function handlePreviewSelectAll(lines) {
  updatePreviewSelectionCache(previewPageLines.value, lines)
}

async function restorePreviewPageSelection() {
  await nextTick()
  previewTableRef.value?.clearSelection()
  for (const line of previewPageLines.value) {
    previewTableRef.value?.toggleRowSelection(
      line,
      previewSelectionCache.value.has(String(line.skuId))
    )
  }
}

async function handlePreviewPagination() {
  await restorePreviewPageSelection()
}

async function selectAllPreviewLines() {
  previewSelectionCache.value = new Map(
    (preview.value.lines || []).map(line => [String(line.skuId), line])
  )
  previewPagination.pageNum = 1
  await restorePreviewPageSelection()
}

function amountInCents(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

async function applySettlementTarget(showSuccess = true) {
  const targetCents = amountInCents(settlementTargetAmount.value)
  const maxCents = amountInCents(settlementTargetMaxAmount.value)
  if (targetCents <= 0 || targetCents > maxCents) {
    proxy.$modal.msgWarning(text(
      `本次结算金额需大于 0，且不能超过可结算金额 ${money(settlementTargetMaxAmount.value)}`,
      `The current amount must be greater than 0 and no more than ${money(settlementTargetMaxAmount.value)}`
    ))
    return false
  }

  let remainingCents = targetCents
  const allocatedLines = new Map()
  const orderedLines = (preview.value.lines || [])
    .map((line, index) => ({ line, index }))
    .sort((left, right) => {
      const leftTime = left.line?.createdTime ? String(left.line.createdTime) : ''
      const rightTime = right.line?.createdTime ? String(right.line.createdTime) : ''
      if (leftTime && rightTime && leftTime !== rightTime) return leftTime.localeCompare(rightTime)
      if (leftTime && !rightTime) return -1
      if (!leftTime && rightTime) return 1
      if (leftTime && rightTime) {
        const itemDifference = Number(left.line?.itemId || 0) - Number(right.line?.itemId || 0)
        if (itemDifference !== 0) return itemDifference
        const skuDifference = Number(left.line?.skuId || 0) - Number(right.line?.skuId || 0)
        if (skuDifference !== 0) return skuDifference
      }
      return left.index - right.index
    })
  for (const { line } of orderedLines) {
    const availableCents = Math.max(amountInCents(settlementAvailableAmount(line)), 0)
    if (availableCents <= 0) continue
    const allocatedCents = Math.min(availableCents, remainingCents)
    line.pendingSettlementAmount = allocatedCents / 100
    if (allocatedCents > 0) allocatedLines.set(String(line.skuId), line)
    remainingCents -= allocatedCents
  }

  if (remainingCents !== 0) {
    proxy.$modal.msgWarning(text('本次结算金额分配失败，请刷新后重试', 'Unable to allocate the amount; refresh and try again'))
    return false
  }
  previewSelectionCache.value = allocatedLines
  await restorePreviewPageSelection()
  if (showSuccess) {
    proxy.$modal.msgSuccess(text(
      `已按商品上架时间从旧到新分配 ${money(targetCents / 100)}`,
      `${money(targetCents / 100)} allocated from oldest to newest listing`
    ))
  }
  return true
}

function forceRemainingAmount(row) {
  return Math.max(Number(row?.totalSettlementAmount || 0) - Number(row?.settledAmount || 0), 0)
}

function settlementAvailableAmount(row) {
  const calculated = row?.settlementType === 'FORCED'
    ? forceRemainingAmount(row)
    : (Number(row?.soldQuantity || 0) - Number(row?.returnedQuantity || 0)) * Number(row?.unitPrice || 0)
      - Number(row?.settledAmount || 0)
  const value = Number(row?.availableSettlementAmount ?? calculated)
  if (!Number.isFinite(value) || value <= 0) return Number.isFinite(value) ? value : 0
  const totalRemaining = Math.max(
    Number(row?.totalSettlementAmount || 0) - Number(row?.settledAmount || 0),
    0
  )
  return Math.min(value, totalRemaining)
}

function settlementAmountMin(row) {
  const available = settlementAvailableAmount(row)
  return available < 0 ? available : 0
}

function settlementAmountMax(row) {
  const available = settlementAvailableAmount(row)
  return available < 0 ? 0 : available
}

function validSettlementAmount(row) {
  const amount = Number(row?.pendingSettlementAmount)
  const available = settlementAvailableAmount(row)
  return Number.isFinite(amount) && amount !== 0 && available !== 0
    && Math.sign(amount) === Math.sign(available)
    && Math.abs(amount) <= Math.abs(available) + 0.000001
}

function forceCandidateRemainingAmount(row) {
  return forceRemainingAmount(row)
}

function canSelectForceSku(row) {
  const alreadyAdded = (preview.value.lines || []).some(line => String(line.skuId) === String(row.skuId))
  return alreadyAdded || forceCandidateRemainingAmount(row) > 0
}

function updateForceSkuSelectionCache(candidates, lines) {
  const selectedSkuIds = new Set((lines || []).map(row => String(row.skuId)))
  const nextCache = new Map(forceSkuSelectionCache.value)
  const nextPreviewCache = new Map(previewSelectionCache.value)
  for (const candidate of candidates) {
    const skuId = String(candidate.skuId)
    if (selectedSkuIds.has(skuId)) nextCache.set(skuId, candidate)
    else nextCache.delete(skuId)
    const existingLine = (preview.value.lines || []).find(line => String(line.skuId) === String(candidate.skuId))
    if (existingLine) {
      if (selectedSkuIds.has(skuId)) nextPreviewCache.set(skuId, existingLine)
      else nextPreviewCache.delete(skuId)
    }
  }
  forceSkuSelectionCache.value = nextCache
  previewSelectionCache.value = nextPreviewCache
}

function handleForceSkuSelect(lines, row) {
  updateForceSkuSelectionCache([row], lines)
}

function handleForceSkuSelectAll(lines) {
  updateForceSkuSelectionCache(forceSkuRows.value, lines)
}

async function openForceSkuDialog() {
  forceSkuQuery.pageNum = 1
  forceSkuQuery.skuCode = undefined
  forceSkuQuery.itemName = undefined
  forceSkuSelectionCache.value = new Map(
    selectedPreviewLines.value.map(row => [String(row.skuId), row])
  )
  forceSkuVisible.value = true
  await loadForceSkuCandidates()
}

async function loadForceSkuCandidates() {
  const requestSequence = ++forceSkuRequestSequence
  forceSkuLoading.value = true
  try {
    const response = await listSupplierSkuOverview({
      supplierId: preview.value.supplierId,
      skuCode: forceSkuQuery.skuCode,
      itemName: forceSkuQuery.itemName,
      pageNum: forceSkuQuery.pageNum,
      pageSize: forceSkuQuery.pageSize
    })
    if (requestSequence !== forceSkuRequestSequence) return
    forceSkuRows.value = response.rows || []
    forceSkuTotal.value = Number(response.total || 0)
    await nextTick()
    forceSkuTableRef.value?.clearSelection()
    for (const row of forceSkuRows.value) {
      forceSkuTableRef.value?.toggleRowSelection(
        row,
        forceSkuSelectionCache.value.has(String(row.skuId))
      )
    }
  } finally {
    if (requestSequence === forceSkuRequestSequence) forceSkuLoading.value = false
  }
}

function searchForceSkuCandidates() {
  forceSkuQuery.pageNum = 1
  loadForceSkuCandidates()
}

function resetForceSkuQuery() {
  forceSkuQuery.pageNum = 1
  forceSkuQuery.skuCode = undefined
  forceSkuQuery.itemName = undefined
  loadForceSkuCandidates()
}

function toForcedSettlementLine(row) {
  const soldQuantity = Number(row.soldQuantity || 0)
  const returnedQuantity = Number(row.returnedQuantity || 0)
  const unitPrice = Number(row.unitCost || 0)
  return {
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    itemId: row.itemId,
    skuId: row.skuId,
    skuCode: row.skuCode,
    itemName: row.itemName,
    mainThumbUrl: row.mainThumbUrl,
    createdTime: row.createdTime,
    productQuantity: row.productQuantity,
    platformSoldQuantity: row.platformSoldQuantity,
    offPlatformSoldQuantity: row.offPlatformSoldQuantity,
    soldQuantity: row.soldQuantity,
    platformSoldOrderNumbers: row.platformSoldOrderNumbers,
    returnedQuantity: row.returnedQuantity,
    settleableQuantity: Math.max(soldQuantity - returnedQuantity, 0).toFixed(2),
    unitPrice: row.unitCost,
    grossAmount: (soldQuantity * unitPrice).toFixed(2),
    returnDeductionAmount: (returnedQuantity * unitPrice).toFixed(2),
    totalSettlementAmount: row.totalSettlementAmount,
    settledAmount: row.settledAmount,
    pendingSettlementAmount: forceRemainingAmount(row),
    availableSettlementAmount: forceRemainingAmount(row),
    settlementType: 'FORCED',
    remark: ''
  }
}

async function addForcedSkuLines() {
  const existingBySku = new Map((preview.value.lines || []).map(line => [String(line.skuId), line]))
  const selectedSkuIds = new Set(forceSkuSelected.value.map(row => String(row.skuId)))
  const addedLines = forceSkuSelected.value
    .filter(row => !existingBySku.has(String(row.skuId)) && canSelectForceSku(row))
    .map(toForcedSettlementLine)
  preview.value.lines.push(...addedLines)
  const nextPreviewCache = new Map(previewSelectionCache.value)
  for (const line of addedLines) nextPreviewCache.set(String(line.skuId), line)
  for (const [skuId, existingLine] of existingBySku) {
    if (selectedSkuIds.has(skuId)) nextPreviewCache.set(skuId, existingLine)
    else nextPreviewCache.delete(skuId)
  }
  previewSelectionCache.value = nextPreviewCache
  forceSkuVisible.value = false
  await restorePreviewPageSelection()
}

function orderNumberLinks(row) {
  return String(row?.platformSoldOrderNumbers || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

function openPlatformOrder(orderNo) {
  const platformOrderId = String(orderNo || '').trim()
  if (isSupplierUser.value || !platformOrderId || !proxy?.$auth?.hasPermi('wms:platform:list')) return
  const { href } = router.resolve({
    name: 'PlatformOrders',
    query: { platformOrderId }
  })
  window.open(href, '_blank', 'noopener,noreferrer')
}

function removeForcedLine(row) {
  const nextCache = new Map(previewSelectionCache.value)
  nextCache.delete(String(row.skuId))
  previewSelectionCache.value = nextCache
  preview.value.lines = (preview.value.lines || []).filter(line => String(line.skuId) !== String(row.skuId))
  const maxPage = Math.max(1, Math.ceil(preview.value.lines.length / previewPagination.pageSize))
  previewPagination.pageNum = Math.min(previewPagination.pageNum, maxPage)
  restorePreviewPageSelection()
}
const skuPageTargets = {
  product: {
    route: { name: 'Item' },
    permission: 'wms:item:list',
    quantityField: 'productQuantity'
  },
  received: {
    route: { name: 'ReceiptOrder' },
    permission: 'wms:receipt:all',
    quantityField: 'receivedQuantity'
  },
  inventory: {
    route: { name: 'Inventory' },
    permission: 'wms:inventory:all',
    quantityField: 'inventoryQuantity',
    query: { inStock: '1' }
  },
  platformSold: {
    route: { name: 'PlatformOrders' },
    permission: 'wms:platform:list',
    quantityField: 'platformSoldQuantity',
    query: { orderStatus: 'DELIVERED' }
  },
  offPlatformSold: {
    route: { path: '/wms/order/shipmentOrder' },
    permission: 'wms:shipment:all',
    quantityField: 'offPlatformSoldQuantity',
    query: { orderStatus: '1' }
  },
  returned: {
    route: { name: 'ReceiptOrder' },
    permission: 'wms:receipt:all',
    quantityField: 'returnedQuantity',
    query: { receiptType: 'RETURN' }
  }
}

function canOpenSkuPage(type, row) {
  const target = skuPageTargets[type]
  return !!target && !!row?.skuCode && Number(row?.[target.quantityField] || 0) > 0
    && !!proxy?.$auth?.hasPermi(target.permission)
}

function openSkuPage(type, row) {
  if (!canOpenSkuPage(type, row)) return
  const target = skuPageTargets[type]
  router.push({ ...target.route, query: { skuCode: row.skuCode, ...target.query } }).catch(() => {})
}

function buildQuery(includePage = true) {
  const params = {
    supplierId: isSupplierUser.value ? undefined : queryParams.supplierId,
    itemName: queryParams.itemName,
    skuCode: queryParams.skuCode,
    quantityStatus: queryParams.quantityStatus,
    createdStartTime: createdTimeRange.value?.[0],
    createdEndTime: createdTimeRange.value?.[1]
  }
  if (includePage) {
    params.pageNum = queryParams.pageNum
    params.pageSize = queryParams.pageSize
  }
  return params
}

async function loadData() {
  loading.value = true
  try {
    const [listResult, summaryResult] = await Promise.allSettled([
      listSupplierSkuOverview(buildQuery(true)),
      getSupplierSkuSummary(buildQuery(false))
    ])

    if (listResult.status === 'fulfilled') {
      rows.value = listResult.value.rows || []
      total.value = Number(listResult.value.total || 0)
    }
    if (summaryResult.status === 'fulfilled') {
      Object.assign(summary, summaryResult.value.data || {})
    }

    const failedResult = [listResult, summaryResult].find(result => result.status === 'rejected')
    if (failedResult) throw failedResult.reason
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  loadData()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  createdTimeRange.value = []
  queryParams.supplierId = undefined
  queryParams.itemName = undefined
  queryParams.skuCode = undefined
  queryParams.quantityStatus = undefined
  handleQuery()
}

async function handleExport() {
  exportLoading.value = true
  try {
    await proxy.download(
      'wms/supplier-settlement/items/export',
      buildQuery(false),
      `${text('\u5df2\u91c7\u8d2d\u5546\u54c1', 'Purchased_Items')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  } finally {
    exportLoading.value = false
  }
}

function openSettlementPreview() {
  settlementSelection.supplierId = undefined
  supplierSelectVisible.value = true
}

async function loadSettlementPreview() {
  const valid = await supplierSelectRef.value?.validate().catch(() => false)
  if (!valid) return
  previewLoading.value = true
  try {
    const response = await previewSupplierSettlement({ supplierId: settlementSelection.supplierId })
    const result = response.data || { lines: [] }
    preview.value = {
      ...result,
      lines: (result.lines || []).map(line => ({
        ...line,
        availableSettlementAmount: line.pendingSettlementAmount,
        settlementType: line.settlementType || 'NORMAL',
        remark: line.remark || ''
      }))
    }
    settlementTargetAmount.value = undefined
    previewSelectionCache.value = new Map()
    supplierSelectVisible.value = false
    previewVisible.value = true
    await nextTick()
    await selectAllPreviewLines()
  } finally {
    previewLoading.value = false
  }
}

function settlementRequest(recordStatus) {
  const detail = settlementPreview.value || {}
  return {
    recordStatus,
    previewId: detail.previewId,
    contractVersion: detail.contractVersion,
    supplierId: detail.supplierId,
    previewGeneratedAt: detail.generatedAt,
    productQuantity: detail.productQuantity,
    soldQuantity: detail.soldQuantity,
    returnedQuantity: detail.returnedQuantity,
    totalSettlementAmount: detail.totalSettlementAmount,
    settledAmount: detail.settledAmount,
    pendingSettlementAmount: detail.pendingSettlementAmount,
    lines: (detail.lines || []).map(line => ({
      skuId: line.skuId,
      productQuantity: line.productQuantity,
      soldQuantity: line.soldQuantity,
      returnedQuantity: line.returnedQuantity,
      unitPrice: line.unitPrice,
      totalSettlementAmount: line.totalSettlementAmount,
      settledAmount: line.settledAmount,
      pendingSettlementAmount: line.pendingSettlementAmount,
      settlementType: line.settlementType || 'NORMAL',
      remark: line.remark?.trim() || undefined
    }))
  }
}

async function confirmSettlement(recordStatus = 'CONFIRMED') {
  if (settlementTargetAmount.value !== undefined && settlementTargetAmount.value !== null) {
    const applied = await applySettlementTarget(false)
    if (!applied) return
  }
  const detail = settlementPreview.value || {}
  const invalidLine = (detail.lines || []).find(line => !validSettlementAmount(line))
  if (invalidLine) {
    proxy.$modal.msgWarning(text(
      `请为 SKU ${invalidLine.skuCode || invalidLine.skuId} 填写不超过可结算范围的本次待结算金额`,
      `Enter a current amount within the available range for SKU ${invalidLine.skuCode || invalidLine.skuId}`
    ))
    return
  }
  confirmLoading.value = true
  try {
    await confirmSupplierSettlement(settlementRequest(recordStatus))
    proxy.$modal.msgSuccess(recordStatus === 'DRAFT'
      ? text('结算单已发起并保存为待结算', 'Settlement initiated and saved as pending')
      : text('结算单已确认，SKU 累计已结算金额已更新', 'Settlement confirmed and SKU settled totals updated'))
    previewVisible.value = false
    await loadData()
  } finally {
    confirmLoading.value = false
  }
}

async function openDraftFromRoute() {
  const draftId = route.query.settlementDraftId
  if (!draftId || isSupplierUser.value) return
  previewLoading.value = true
  try {
    const response = await getSupplierSettlementRecord(draftId)
    const record = response.data
    if (!record || record.recordStatus !== 'DRAFT') return
    preview.value = {
      ...record,
      generatedAt: record.previewGeneratedAt,
      lines: (record.lines || []).map(line => ({
        ...line,
        availableSettlementAmount: line.settlementType === 'FORCED'
          ? forceRemainingAmount(line)
          : (Number(line.soldQuantity || 0) - Number(line.returnedQuantity || 0)) * Number(line.unitPrice || 0)
            - Number(line.settledAmount || 0),
        remark: line.remark || ''
      }))
    }
    settlementTargetAmount.value = undefined
    previewSelectionCache.value = new Map()
    previewVisible.value = true
    await nextTick()
    await selectAllPreviewLines()
  } finally {
    previewLoading.value = false
  }
}

function quantity(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function displayTime(value) {
  return value ? String(value).replace('T', ' ') : '-'
}

function money(value) {
  const number = Number(value || 0)
  return new Intl.NumberFormat(isEnglish.value ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(number)
}

function settlementTagType(value) {
  const amount = Number(value || 0)
  if (amount < 0) return 'danger'
  if (amount > 0) return 'warning'
  return 'success'
}

async function resolveIdentity() {
  try {
    const response = await getCurrentSupplier()
    const identity = response.data || {}
    isSupplierUser.value = !!identity.isSupplier
    currentSupplierId.value = identity.supplierId || null
    if (isSupplierUser.value) {
      queryParams.supplierId = currentSupplierId.value
    } else {
      const supplierResponse = await listSupplierNoPage({ status: 0 })
      supplierOptions.value = supplierResponse.data || []
    }
  } finally {
    identityResolved.value = true
  }
}

onMounted(async () => {
  await resolveIdentity()
  await loadData()
  await openDraftFromRoute()
})
</script>

<style scoped>
.supplier-settlement-page {
  --card-border: #e6e9ef;
}

.supplier-settlement-page :deep(.purchased-loading-mask .el-loading-spinner) {
  position: fixed;
  top: 50%;
  left: 50%;
  width: auto;
  margin-top: 0;
  transform: translate(-50%, -50%);
}

.page-alert,
.query-form,
.summary-grid,
.overview-table {
  margin-bottom: 16px;
}

.query-form {
  padding: 16px 16px 0;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.listed-time-filter {
  margin-right: 20px;
}

.listed-time-filter :deep(.el-form-item__content) {
  min-width: 360px;
}

.listed-time-picker {
  width: 360px !important;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
}

.summary-card {
  min-height: 82px;
  padding: 14px 16px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sku-metric-link {
  font-weight: 600;
}

.summary-card span {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.summary-card strong {
  color: var(--el-text-color-primary);
  font-size: 22px;
}

.summary-card.warning { border-left: 4px solid var(--el-color-warning); }
.summary-card.success { border-left: 4px solid var(--el-color-success); }
.summary-card.danger { border-left: 4px solid var(--el-color-danger); }

.item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-image {
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.item-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-meta strong,
.item-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.warning-text { color: var(--el-color-warning); }
.danger-text { color: var(--el-color-danger); }
.success-text { color: var(--el-color-success); }

.supplier-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: 16px;
  overflow-x: auto;
  box-sizing: border-box;
}

.supplier-pagination :deep(.pagination-container) {
  position: static !important;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  min-height: 32px;
  margin: 0;
  padding: 0 !important;
  background: transparent;
}

.supplier-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
  width: auto;
  justify-content: flex-end;
}

.preview-alert,
.preview-summary {
  margin-bottom: 16px;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.settlement-target {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}

.settlement-target__label {
  flex: 0 0 auto;
  color: var(--el-text-color-regular);
  font-weight: 600;
}

.settlement-target__input {
  width: 190px;
}

.settlement-target__tip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.preview-toolbar__tip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.force-sku-query {
  margin-bottom: 4px;
}

.preview-pagination,
.force-sku-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: 12px;
  overflow-x: auto;
  box-sizing: border-box;
}

.preview-pagination :deep(.pagination-container),
.force-sku-pagination :deep(.pagination-container) {
  position: static !important;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  min-height: 32px;
  margin: 0;
  padding: 0 !important;
  background: transparent;
}

.preview-pagination :deep(.el-pagination),
.force-sku-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
  width: auto;
  justify-content: flex-end;
}

.force-amount-input {
  width: 135px;
}

.order-number-link {
  margin-right: 10px;
  text-decoration: underline;
}

.supplier-settlement-page :deep(.amount-column .cell) {
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .summary-grid { grid-template-columns: repeat(3, minmax(140px, 1fr)); }
}

@media (max-width: 768px) {
  .listed-time-filter {
    width: 100%;
    margin-right: 0;
  }

  .listed-time-filter :deep(.el-form-item__content) { min-width: 0; flex: 1; }
  .listed-time-picker { width: 100% !important; }

  .summary-grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
  .supplier-pagination { justify-content: flex-start; }
  .preview-toolbar { align-items: flex-start; flex-direction: column; }
  .settlement-target { align-items: flex-start; flex-direction: column; }
}
</style>
