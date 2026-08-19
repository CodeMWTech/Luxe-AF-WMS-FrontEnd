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
        :title="text('可取消勾选、手工添加强制结算 SKU，并为每条填写备注。确认后仅保存已勾选明细并更新对应 SKU 累计已结算金额；不会发起外部付款。', 'You can uncheck lines, add forced-settlement SKUs, and enter a remark for each line. Confirmation saves only selected lines and updates those SKU totals; no external payment is made.')"
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

      <div class="preview-toolbar">
        <el-button type="warning" plain icon="Plus" @click="openForceSkuDialog">
          {{ text('手工添加 SKU 强制结算', 'Add SKU for forced settlement') }}
        </el-button>
        <span class="preview-toolbar__tip">
          {{ text('强制结算金额会计入累计已结算；以后满足正常结算条件时自动扣除。', 'Forced amounts are added to settled totals and deducted from future normal settlements.') }}
        </span>
      </div>

      <el-table ref="previewTableRef" :data="preview.lines || []" row-key="skuId" border stripe max-height="520" @selection-change="handlePreviewSelectionChange">
        <el-table-column type="selection" width="52" reserve-selection fixed="left" />
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
        <el-table-column :label="text('平台已售中订单编号', 'Platform sold order numbers')" prop="platformSoldOrderNumbers" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">{{ row.platformSoldOrderNumbers || '-' }}</template>
        </el-table-column>
        <el-table-column :label="text('退货数量', 'Returned')" align="right" width="100">
          <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('净结算数量', 'Net qty')" align="right" width="115">
          <template #default="{ row }">{{ quantity(row.settleableQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('单价', 'Unit price')" align="right" width="130" class-name="amount-column">
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
              v-if="row.settlementType === 'FORCED'"
              v-model="row.pendingSettlementAmount"
              :min="0.01"
              :max="forceRemainingAmount(row)"
              :precision="2"
              :controls="false"
              size="small"
              class="force-amount-input"
              :placeholder="text('输入金额', 'Amount')"
            />
            <span v-else :class="Number(row.pendingSettlementAmount) < 0 ? 'danger-text' : ''">{{ money(row.pendingSettlementAmount) }}</span>
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
      <template #footer>
        <el-button @click="previewVisible = false">{{ text('关闭', 'Close') }}</el-button>
        <el-button
          type="primary"
          :loading="confirmLoading"
          :disabled="!selectedPreviewLines.length"
          @click="confirmSettlement"
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
        :title="text('仅可选择当前供货商的已采购 SKU；已在结算明细中的 SKU 不可重复添加。', 'Only purchased SKUs from the current supplier can be selected. Existing detail SKUs cannot be added twice.')"
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
        v-loading="forceSkuLoading"
        :data="forceSkuRows"
        row-key="skuId"
        border
        stripe
        max-height="460"
        @selection-change="handleForceSkuSelectionChange"
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
          {{ text(`添加（${forceSkuSelected.length}项）`, `Add (${forceSkuSelected.length})`) }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup name="SupplierSettlement">
import { computed, getCurrentInstance, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentSupplier, listSupplierNoPage } from '@/api/wms/supplier'
import {
  confirmSupplierSettlement,
  getSupplierSkuSummary,
  listSupplierSkuOverview,
  previewSupplierSettlement
} from '@/api/wms/supplierSettlement'

const { proxy } = getCurrentInstance()
const router = useRouter()
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
const selectedPreviewLines = ref([])
const forceSkuVisible = ref(false)
const forceSkuLoading = ref(false)
const forceSkuRows = ref([])
const forceSkuTotal = ref(0)
const forceSkuSelected = ref([])
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
  aggregateFields.forEach(field => {
    result[field] = lines.reduce((sum, line) => sum + Number(line?.[field] || 0), 0).toFixed(2)
  })
  return result
})

function handlePreviewSelectionChange(lines) {
  selectedPreviewLines.value = lines || []
}

function selectAllPreviewLines() {
  previewTableRef.value?.clearSelection()
  for (const line of preview.value.lines || []) {
    previewTableRef.value?.toggleRowSelection(line, true)
  }
}

function forceRemainingAmount(row) {
  return Math.max(Number(row?.totalSettlementAmount || 0) - Number(row?.settledAmount || 0), 0)
}

function forceCandidateRemainingAmount(row) {
  return forceRemainingAmount(row)
}

function canSelectForceSku(row) {
  const alreadyAdded = (preview.value.lines || []).some(line => String(line.skuId) === String(row.skuId))
  return !alreadyAdded && forceCandidateRemainingAmount(row) > 0
}

function handleForceSkuSelectionChange(lines) {
  forceSkuSelected.value = lines || []
}

async function openForceSkuDialog() {
  forceSkuQuery.pageNum = 1
  forceSkuQuery.skuCode = undefined
  forceSkuQuery.itemName = undefined
  forceSkuSelected.value = []
  forceSkuVisible.value = true
  await loadForceSkuCandidates()
}

async function loadForceSkuCandidates() {
  forceSkuLoading.value = true
  try {
    const response = await listSupplierSkuOverview({
      supplierId: preview.value.supplierId,
      skuCode: forceSkuQuery.skuCode,
      itemName: forceSkuQuery.itemName,
      pageNum: forceSkuQuery.pageNum,
      pageSize: forceSkuQuery.pageSize
    })
    forceSkuRows.value = response.rows || []
    forceSkuTotal.value = Number(response.total || 0)
    forceSkuSelected.value = []
  } finally {
    forceSkuLoading.value = false
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
    pendingSettlementAmount: undefined,
    settlementType: 'FORCED',
    remark: ''
  }
}

async function addForcedSkuLines() {
  const addedLines = forceSkuSelected.value
    .filter(canSelectForceSku)
    .map(toForcedSettlementLine)
  if (!addedLines.length) return
  preview.value.lines.push(...addedLines)
  forceSkuVisible.value = false
  await nextTick()
  addedLines.forEach(line => previewTableRef.value?.toggleRowSelection(line, true))
}

function removeForcedLine(row) {
  previewTableRef.value?.toggleRowSelection(row, false)
  preview.value.lines = (preview.value.lines || []).filter(line => String(line.skuId) !== String(row.skuId))
  selectedPreviewLines.value = selectedPreviewLines.value.filter(line => String(line.skuId) !== String(row.skuId))
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
        settlementType: line.settlementType || 'NORMAL',
        remark: line.remark || ''
      }))
    }
    selectedPreviewLines.value = []
    supplierSelectVisible.value = false
    previewVisible.value = true
    await nextTick()
    selectAllPreviewLines()
  } finally {
    previewLoading.value = false
  }
}

async function confirmSettlement() {
  const detail = settlementPreview.value || {}
  const invalidForcedLine = (detail.lines || []).find(line => line.settlementType === 'FORCED'
    && (Number(line.pendingSettlementAmount || 0) <= 0
      || Number(line.pendingSettlementAmount || 0) > forceRemainingAmount(line)))
  if (invalidForcedLine) {
    proxy.$modal.msgWarning(text(
      `请为 SKU ${invalidForcedLine.skuCode || invalidForcedLine.skuId} 填写有效的强制结算金额`,
      `Enter a valid forced settlement amount for SKU ${invalidForcedLine.skuCode || invalidForcedLine.skuId}`
    ))
    return
  }
  confirmLoading.value = true
  try {
    await confirmSupplierSettlement({
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
    })
    proxy.$modal.msgSuccess(text('结算单已保存，SKU 累计已结算金额已更新', 'Settlement saved and SKU settled totals updated'))
    previewVisible.value = false
    await loadData()
  } finally {
    confirmLoading.value = false
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

.preview-toolbar__tip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.force-sku-query {
  margin-bottom: 4px;
}

.force-sku-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: 12px;
  overflow-x: auto;
  box-sizing: border-box;
}

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

.force-sku-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
  width: auto;
  justify-content: flex-end;
}

.force-amount-input {
  width: 135px;
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
}
</style>
