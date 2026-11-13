<template>
  <div class="app-container">
    <el-alert
      :title="text('这里展示待结算和已确认的供应商结算单。待结算仅为草稿，不更新 SKU 累计金额；已确认才完成系统内部结算，不代表外部付款完成。', 'This page shows pending and confirmed settlements. Pending records are drafts; only confirmation updates SKU settled totals.')"
      type="info"
      show-icon
      :closable="false"
      class="page-alert"
    />

    <el-form v-if="identityResolved" :inline="true" class="query-form">
      <el-form-item v-if="!isSupplierUser" :label="text('供应商', 'Supplier')">
        <el-select v-model="queryParams.supplierId" :placeholder="text('全部供应商', 'All suppliers')" clearable filterable>
          <el-option v-for="supplier in supplierOptions" :key="supplier.id" :label="supplierDisplayName(supplier)" :title="supplier.supplierName" :value="supplier.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('状态', 'Status')">
        <el-select v-model="queryParams.recordStatus" :placeholder="text('全部状态', 'All statuses')" clearable style="width: 180px">
          <el-option :label="text('待结算', 'Pending')" value="DRAFT" />
          <el-option :label="text('已确认', 'Confirmed')" value="CONFIRMED" />
          <el-option :label="text('已VOID', 'Voided')" value="VOIDED" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('日期类型', 'Date type')">
        <el-select v-model="queryParams.dateType" style="width: 150px">
          <el-option :label="text('执行日期', 'Execution date')" value="EXECUTION" />
          <el-option :label="text('付款日期', 'Payment date')" value="PAYMENT" />
        </el-select>
      </el-form-item>
      <el-form-item :label="text('日期范围', 'Date range')">
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
          :start-placeholder="text('开始日期', 'Start date')" :end-placeholder="text('结束日期', 'End date')"
          range-separator="-" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">{{ text('查询', 'Search') }}</el-button>
        <el-button icon="Refresh" @click="resetQuery">{{ text('重置', 'Reset') }}</el-button>
      </el-form-item>
    </el-form>

    <div class="settlement-summary">
      <span>{{ text('筛选结果', 'Filtered results') }}：<strong>{{ summary.recordCount }}</strong> {{ text('张', 'records') }}</span>
      <span>{{ text('已确认结算金额', 'Confirmed settlement amount') }}：<strong class="summary-amount">{{ money(summary.settlementAmount) }}</strong></span>
      <small>{{ text('待结算和已VOID单据不计入金额。', 'Pending and voided records are excluded from the amount.') }}</small>
    </div>

    <div class="table-toolbar">
      <el-button
        type="info"
        icon="Download"
        :loading="exportLoading"
        :disabled="loading || total === 0"
        @click="handleExport"
        v-hasPermi="['wms:vendor:list']"
      >{{ text('\u5bfc\u51fa\u5168\u90e8', 'Export all') }}</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column :label="text('结算单号', 'Settlement no.')" prop="settlementNo" min-width="190" />
      <el-table-column :label="text('供应商', 'Supplier')" prop="supplierName" :formatter="supplierDisplayName" min-width="160" show-overflow-tooltip />
      <el-table-column :label="text('状态', 'Status')" width="110" align="center">
        <template #default="{ row }"><el-tag :type="statusTagType(row.recordStatus)">{{ statusText(row.recordStatus) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="SKU" prop="skuCount" width="80" align="right" />
      <el-table-column :label="text('商品数量', 'Product qty')" width="105" align="right">
        <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="text('已售数量', 'Delivered')" width="105" align="right">
        <template #default="{ row }">{{ quantity(row.soldQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="text('退货数量', 'Returned')" width="105" align="right">
        <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
      </el-table-column>
      <el-table-column :label="text('本次结算金额', 'Settlement amount')" width="145" align="right">
        <template #default="{ row }">{{ money(row.pendingSettlementAmount) }}</template>
      </el-table-column>
      <el-table-column :label="text('执行日期', 'Execution date')" prop="executionDate" width="120" />
      <el-table-column :label="text('付款日期', 'Payment date')" width="120">
        <template #default="{ row }">{{ row.paymentDate || '-' }}</template>
      </el-table-column>
      <el-table-column :label="text('操作人', 'Operator')" prop="recordedBy" width="120" />
      <el-table-column :label="text('操作时间', 'Operated at')" width="175">
        <template #default="{ row }">{{ displayTime(row.recordedAt) }}</template>
      </el-table-column>
      <el-table-column :label="text('操作', 'Actions')" width="370" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewRecord(row.id)">{{ text('明细', 'Details') }}</el-button>
          <el-button v-if="canVoid" link type="primary" @click="openDateEditor(row)">{{ text('编辑日期', 'Edit dates') }}</el-button>
          <el-button v-if="row.recordStatus === 'CONFIRMED'" v-hasPermi="['wms:vendor:list']" link type="primary" :loading="invoiceLoadingId === String(row.id)" :disabled="invoiceLoadingId !== null" @click="exportInvoice(row)">{{ text('发票打印', 'Export Invoice') }}</el-button>
          <el-button v-if="row.recordStatus === 'CONFIRMED' && canVoid" link type="danger" @click="voidRecord(row)">VOID</el-button>
          <el-button v-if="row.recordStatus === 'VOIDED' && canSettleDraft" link type="warning" :loading="restoreLoadingId === String(row.id)" :disabled="restoreLoadingId !== null" @click="restoreRecord(row)">{{ text('恢复为待结算', 'Restore to pending') }}</el-button>
          <el-button v-if="row.recordStatus === 'DRAFT' && canSettleDraft" link type="warning" @click="goSettle(row)">{{ text('去结算', 'Settle') }}</el-button>
          <el-button v-if="row.recordStatus === 'DRAFT' && !row.voidedAt && canSettleDraft" link type="danger" @click="deleteDraft(row)">{{ text('删除', 'Delete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-show="total > 0" class="settled-pagination">
      <pagination
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="loadRecords"
      />
    </div>

    <el-dialog
      v-model="detailVisible"
      :title="text('已结算明细', 'Settled details')"
      width="92%"
      top="4vh"
      append-to-body
    >
      <el-descriptions :column="4" border class="detail-summary">
        <el-descriptions-item :label="text('结算单号', 'Settlement no.')">{{ detail.settlementNo || '-' }}</el-descriptions-item>
        <el-descriptions-item :label="text('供应商', 'Supplier')">{{ supplierDisplayName(detail) || '-' }}</el-descriptions-item>
        <el-descriptions-item :label="text('状态', 'Status')"><el-tag :type="statusTagType(detail.recordStatus)">{{ statusText(detail.recordStatus) }}</el-tag></el-descriptions-item>
        <el-descriptions-item :label="text('操作时间', 'Operated at')">{{ displayTime(detail.recordedAt) }}</el-descriptions-item>
        <el-descriptions-item :label="text('执行日期', 'Execution date')">{{ detail.executionDate || '-' }}</el-descriptions-item>
        <el-descriptions-item :label="text('付款日期', 'Payment date')">{{ detail.paymentDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="SKU">{{ detail.skuCount || 0 }}</el-descriptions-item>
        <el-descriptions-item :label="text('商品数量', 'Product qty')">{{ quantity(detail.productQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('已售数量', 'Delivered')">{{ quantity(detail.soldQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('退货数量', 'Returned')">{{ quantity(detail.returnedQuantity) }}</el-descriptions-item>
        <el-descriptions-item :label="text('总结算价格', 'Total settlement')">{{ money(detail.totalSettlementAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('结算前累计', 'Settled before')">{{ money(detail.settledAmount) }}</el-descriptions-item>
        <el-descriptions-item :label="text('本次结算金额', 'Current settlement')">{{ money(detail.pendingSettlementAmount) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.recordStatus === 'VOIDED'" :label="text('VOID前原金额', 'Original amount')">{{ money(detail.originalPendingSettlementAmount) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.recordStatus === 'VOIDED'" :label="text('VOID操作', 'Voided by')">{{ detail.voidedBy || '-' }} · {{ displayTime(detail.voidedAt) }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.recordStatus === 'VOIDED'" :label="text('VOID原因', 'Void reason')">{{ detail.voidReason || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="detail.restoreHistory?.length" class="restore-history">
        <h4>{{ text('作废与恢复记录', 'Void and restore history') }}</h4>
        <el-table :data="detail.restoreHistory" border size="small">
          <el-table-column :label="text('VOID时间', 'Voided at')" min-width="165">
            <template #default="{ row }">{{ displayTime(row.voidedAt) }}</template>
          </el-table-column>
          <el-table-column :label="text('VOID操作人', 'Voided by')" prop="voidedBy" min-width="110" />
          <el-table-column :label="text('VOID原因', 'Void reason')" prop="voidReason" min-width="180" show-overflow-tooltip />
          <el-table-column :label="text('原结算金额', 'Original amount')" min-width="130" align="right">
            <template #default="{ row }">{{ money(row.originalAmount) }}</template>
          </el-table-column>
          <el-table-column :label="text('恢复时间', 'Restored at')" min-width="165">
            <template #default="{ row }">{{ displayTime(row.restoredAt) }}</template>
          </el-table-column>
          <el-table-column :label="text('恢复操作人', 'Restored by')" prop="restoredBy" min-width="110" />
        </el-table>
      </div>

      <el-table v-loading="detailLoading" :data="detail.lines || []" border stripe max-height="520">
        <el-table-column :label="text('结算类型', 'Type')" width="105">
          <template #default="{ row }">
            <el-tag :type="row.settlementType === 'FORCED' ? 'warning' : 'success'" effect="plain">
              {{ row.settlementType === 'FORCED' ? text('强制结算', 'Forced') : text('正常结算', 'Normal') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="SKU" prop="skuCode" min-width="135" />
        <el-table-column :label="text('商品', 'Item')" prop="itemName" min-width="190" show-overflow-tooltip />
        <el-table-column :label="text('商品数量', 'Product qty')" width="110" align="right">
          <template #default="{ row }">{{ quantity(row.productQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('已售', 'Delivered')" width="90" align="right">
          <template #default="{ row }">{{ quantity(row.soldQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('退货', 'Returned')" width="90" align="right">
          <template #default="{ row }">{{ quantity(row.returnedQuantity) }}</template>
        </el-table-column>
        <el-table-column :label="text('单价', 'Unit price')" width="110" align="right">
          <template #default="{ row }">{{ money(row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column :label="text('结算前累计', 'Settled before')" width="125" align="right">
          <template #default="{ row }">{{ money(row.settledAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('本次结算金额', 'Current settlement')" width="140" align="right">
          <template #default="{ row }">{{ money(detail.recordStatus === 'VOIDED' ? 0 : row.pendingSettlementAmount) }}</template>
        </el-table-column>
        <el-table-column :label="text('备注', 'Remark')" prop="remark" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="detailVisible = false">{{ text('关闭', 'Close') }}</el-button>
        <el-button v-if="detail.recordStatus === 'VOIDED' && canSettleDraft" type="warning" :loading="restoreLoadingId === String(detail.id)" :disabled="detailLoading || restoreLoadingId !== null" @click="restoreRecord(detail)">{{ text('恢复为待结算', 'Restore to pending') }}</el-button>
        <el-button v-if="detail.recordStatus === 'DRAFT' && canSettleDraft" type="primary" @click="goSettle(detail)">{{ text('去结算', 'Settle') }}</el-button>
        <el-button type="success" plain icon="Download" :disabled="detailLoading || !(detail.lines || []).length" @click="exportRecordExcel">
          {{ text('导出 Excel', 'Export Excel') }}
        </el-button>
        <el-button v-if="detail.recordStatus === 'CONFIRMED'" v-hasPermi="['wms:vendor:list']" type="primary" :loading="invoiceLoadingId === String(detail.id)" :disabled="detailLoading || invoiceLoadingId !== null" @click="exportInvoice(detail)">{{ text('发票打印', 'Export Invoice') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dateEditorVisible" :title="text('编辑结算业务日期', 'Edit settlement dates')" width="480px" append-to-body>
      <el-form label-width="110px">
        <el-form-item :label="text('结算单号', 'Settlement no.')">{{ dateEditor.settlementNo || '-' }}</el-form-item>
        <el-form-item :label="text('执行日期', 'Execution date')" required>
          <el-date-picker v-model="dateEditor.executionDate" type="date" value-format="YYYY-MM-DD" :clearable="false" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="text('付款日期', 'Payment date')">
          <el-date-picker v-model="dateEditor.paymentDate" type="date" value-format="YYYY-MM-DD" clearable style="width: 100%" />
        </el-form-item>
        <el-alert :title="text('业务日期可补录或纠正；操作时间仍保留原始系统审计时间。', 'Business dates can be corrected; the original system operation timestamp is unchanged.')" type="info" :closable="false" show-icon />
      </el-form>
      <template #footer>
        <el-button @click="dateEditorVisible = false">{{ text('取消', 'Cancel') }}</el-button>
        <el-button type="primary" :loading="dateSaving" @click="saveDates">{{ text('保存', 'Save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="SupplierSettled">
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { supplierDisplayName } from '@/utils/supplier'
import { getCurrentSupplier, listSupplierNoPage } from '@/api/wms/supplier'
import { deleteSupplierSettlementDraft, getSupplierSettlementRecord, getSupplierSettlementRecordSummary, listSupplierSettlementRecords, restoreSupplierSettlementRecord, updateSupplierSettlementDates, voidSupplierSettlementRecord } from '@/api/wms/supplierSettlement'

const { proxy } = getCurrentInstance()
const router = useRouter()
const loading = ref(false)
const exportLoading = ref(false)
const invoiceLoadingId = ref(null)
const restoreLoadingId = ref(null)
const detailLoading = ref(false)
const detailVisible = ref(false)
const identityResolved = ref(false)
const isSupplierUser = ref(false)
const supplierOptions = ref([])
const rows = ref([])
const total = ref(0)
const detail = ref({ lines: [] })
const dateRange = ref([])
const summary = reactive({ recordCount: 0, confirmedCount: 0, settlementAmount: 0 })
const dateEditorVisible = ref(false)
const dateSaving = ref(false)
const dateEditor = reactive({ id: undefined, settlementNo: '', executionDate: '', paymentDate: undefined })

const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
  supplierId: undefined,
  recordStatus: undefined,
  dateType: 'EXECUTION',
  dateStart: undefined,
  dateEnd: undefined
})

const isEnglish = computed(() => String(proxy?.$i18n?.locale || 'zh-cn').toLowerCase().startsWith('en'))
const text = (zh, en) => isEnglish.value ? en : zh
const canSettleDraft = computed(() => !isSupplierUser.value && !!proxy?.$auth?.hasPermi('wms:vendor:settlement:preview'))
const canVoid = canSettleDraft

async function loadRecords() {
  loading.value = true
  try {
    syncDateRange()
    const [response, summaryResponse] = await Promise.all([
      listSupplierSettlementRecords(queryParams),
      getSupplierSettlementRecordSummary(queryParams)
    ])
    rows.value = response.rows || []
    total.value = Number(response.total || 0)
    Object.assign(summary, summaryResponse.data || { recordCount: 0, confirmedCount: 0, settlementAmount: 0 })
  } finally {
    loading.value = false
  }
}

function handleQuery() {
  queryParams.pageNum = 1
  loadRecords()
}

function syncDateRange() {
  queryParams.dateStart = dateRange.value?.[0] || undefined
  queryParams.dateEnd = dateRange.value?.[1] || undefined
}

function resetQuery() {
  queryParams.supplierId = undefined
  queryParams.recordStatus = undefined
  queryParams.dateType = 'EXECUTION'
  dateRange.value = []
  queryParams.dateStart = undefined
  queryParams.dateEnd = undefined
  handleQuery()
}

async function handleExport() {
  exportLoading.value = true
  try {
    await proxy.download(
      'wms/supplier-settlement/settlement/records/export',
      {
        supplierId: isSupplierUser.value ? undefined : queryParams.supplierId,
        recordStatus: queryParams.recordStatus,
        dateType: queryParams.dateType,
        dateStart: queryParams.dateStart,
        dateEnd: queryParams.dateEnd
      },
      `${text('\u5df2\u7ed3\u7b97\u8bb0\u5f55', 'Settled_Records')}_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  } finally {
    exportLoading.value = false
  }
}

async function exportInvoice(row) {
  if (!row?.id || row.recordStatus !== 'CONFIRMED' || invoiceLoadingId.value !== null) return
  invoiceLoadingId.value = String(row.id)
  try {
    const number = String(row.settlementNo || row.id).replace(/[^A-Za-z0-9_-]/g, '_')
    await proxy.download(`wms/supplier-settlement/settlement/records/${row.id}/invoice`, {}, `Invoice_${number}.pdf`, {
      timeout: 120000, skipHeaderTranslate: true, progressLabel: text('正在生成 Invoice', 'Generating Invoice')
    })
  } finally { invoiceLoadingId.value = null }
}

function goSettle(row) {
  router.push({ path: '/supplier-management/purchased', query: { settlementDraftId: row.id } }).catch(() => {})
}

function deleteDraft(row) {
  proxy.$modal.confirm(
    text(`确认删除待结算单“${row.settlementNo}”吗？删除后无法恢复。`, `Delete pending settlement "${row.settlementNo}"? This cannot be undone.`)
  ).then(async () => {
    await deleteSupplierSettlementDraft(row.id)
    proxy.$modal.msgSuccess(text('删除成功', 'Deleted successfully'))
    if (detail.value?.id === row.id) {
      detailVisible.value = false
      detail.value = { lines: [] }
    }
    if (rows.value.length === 1 && queryParams.pageNum > 1) queryParams.pageNum -= 1
    await loadRecords()
  }).catch(() => {})
}

async function voidRecord(row) {
  try {
    const result = await ElMessageBox.prompt(
      text(`VOID结算单“${row.settlementNo}”后将释放对应SKU累计已结算金额，原单不会删除。请输入原因：`, `Voiding "${row.settlementNo}" releases its SKU settled totals and keeps the original record. Enter a reason:`),
      text('确认VOID结算单', 'Confirm void'),
      { confirmButtonText: 'VOID', cancelButtonText: text('取消', 'Cancel'), inputValidator: value => !!String(value || '').trim() || text('请输入VOID原因', 'Enter a void reason'), inputType: 'textarea', type: 'warning' }
    )
    await voidSupplierSettlementRecord(row.id, { voidReason: String(result.value || '').trim() })
    proxy.$modal.msgSuccess(text('结算单已VOID，金额已释放', 'Settlement voided and amount released'))
    if (detail.value?.id === row.id) await viewRecord(row.id)
    await loadRecords()
  } catch (action) {
    if (action !== 'cancel' && action !== 'close') throw action
  }
}

async function restoreRecord(row) {
  if (!row?.id || row.recordStatus !== 'VOIDED' || restoreLoadingId.value !== null) return
  try {
    await ElMessageBox.confirm(
      text(`将结算单“${row.settlementNo}”恢复为待结算。系统会重新核查每个SKU及原金额是否仍可结算，并保留作废记录；恢复后请核对明细，再手动确认结算。`,
        `Restore "${row.settlementNo}" to pending? Each SKU and its original amount will be revalidated. Void history is retained. Review the details and confirm settlement separately.`),
      text('恢复为待结算', 'Restore to pending'),
      { confirmButtonText: text('核查并恢复', 'Validate and restore'), cancelButtonText: text('取消', 'Cancel'), type: 'warning' }
    )
  } catch (action) {
    if (action === 'cancel' || action === 'close') return
    throw action
  }
  restoreLoadingId.value = String(row.id)
  try {
    const response = await restoreSupplierSettlementRecord(row.id)
    proxy.$modal.msgSuccess(text('已恢复为待结算，请核对明细后再确认结算', 'Restored to pending. Review the details before confirming.'))
    // 打开恢复后的明细，即使列表正在筛选 VOID，也能立即看到结果及去结算入口。
    detail.value = response.data
    detailVisible.value = true
    await loadRecords()
  } finally {
    restoreLoadingId.value = null
  }
}

function openDateEditor(row) {
  Object.assign(dateEditor, {
    id: row.id,
    settlementNo: row.settlementNo,
    executionDate: row.executionDate || businessToday(),
    paymentDate: row.paymentDate || undefined
  })
  dateEditorVisible.value = true
}

async function saveDates() {
  if (!dateEditor.executionDate) {
    proxy.$modal.msgWarning(text('请选择执行日期', 'Select an execution date'))
    return
  }
  dateSaving.value = true
  try {
    await updateSupplierSettlementDates(dateEditor.id, {
      executionDate: dateEditor.executionDate,
      paymentDate: dateEditor.paymentDate || undefined
    })
    proxy.$modal.msgSuccess(text('业务日期已保存', 'Business dates saved'))
    dateEditorVisible.value = false
    if (detail.value?.id === dateEditor.id) await viewRecord(dateEditor.id)
    await loadRecords()
  } finally {
    dateSaving.value = false
  }
}

function statusText(status) {
  if (status === 'DRAFT') return text('待结算', 'Pending')
  if (status === 'VOIDED') return text('已VOID', 'Voided')
  return text('已确认', 'Confirmed')
}

function statusTagType(status) {
  if (status === 'DRAFT') return 'warning'
  if (status === 'VOIDED') return 'info'
  return 'success'
}

async function viewRecord(id) {
  detailLoading.value = true
  detailVisible.value = true
  try {
    const response = await getSupplierSettlementRecord(id)
    detail.value = response.data || { lines: [] }
  } finally {
    detailLoading.value = false
  }
}

async function exportRecordExcel() {
  if (!detail.value.id) return
  const settlementNo = String(detail.value.settlementNo || detail.value.id || 'settlement').replace(/[\\/:*?"<>|]/g, '_')
  const withImages = await chooseExportWithImages()
  if (withImages === null) return
  await proxy.download(
    `wms/supplier-settlement/settlement/records/${detail.value.id}/export?includeImages=${withImages}`,
    {},
    `${text('已结算明细', 'Settled_Details')}_${settlementNo}.xlsx`,
    {
      skipHeaderTranslate: true,
      timeout: 0,
      progressLabel: withImages
        ? text('正在生成含图片的 Excel，请勿关闭窗口', 'Generating Excel with images. Please keep this window open')
        : text('正在生成 Excel，请勿关闭窗口', 'Generating Excel. Please keep this window open'),
      elapsedLabel: withImages
        ? text('正在生成含图片的 Excel，请勿关闭窗口 · 已用时', 'Generating Excel with images · Elapsed')
        : text('正在生成 Excel，请勿关闭窗口 · 已用时', 'Generating Excel · Elapsed')
    }
  )
}

async function chooseExportWithImages() {
  try {
    await ElMessageBox.confirm(
      text(
        '快速导出不包含商品图片，速度更快；包含商品图片会下载并嵌入图片，导出时间会增加。',
        'Fast export excludes product images and finishes sooner. Including images downloads and embeds them, which takes longer.'
      ),
      text('选择导出方式', 'Choose export type'),
      {
        confirmButtonText: text('包含商品图片（较慢）', 'Include images (slower)'),
        cancelButtonText: text('快速导出（不含图片）', 'Fast export (no images)'),
        distinguishCancelAndClose: true,
        closeOnClickModal: false,
        type: 'info'
      }
    )
    return true
  } catch (action) {
    return action === 'cancel' ? false : null
  }
}

function quantity(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function money(value) {
  return new Intl.NumberFormat(isEnglish.value ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(value || 0))
}

function displayTime(value) {
  return value ? String(value).replace('T', ' ') : '-'
}

function businessToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

async function resolveIdentity() {
  try {
    const response = await getCurrentSupplier()
    isSupplierUser.value = !!response.data?.isSupplier
    if (!isSupplierUser.value) {
      const supplierResponse = await listSupplierNoPage({ status: 0 })
      supplierOptions.value = supplierResponse.data || []
    }
  } finally {
    identityResolved.value = true
  }
}

onMounted(async () => {
  await resolveIdentity()
  await loadRecords()
})
</script>

<style scoped>
.page-alert,
.query-form,
.detail-summary {
  margin-bottom: 16px;
}

.restore-history { margin-bottom: 20px; }
.restore-history h4 { margin: 0 0 10px; }

.settlement-summary {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-left: 4px solid var(--el-color-primary);
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
}

.settlement-summary small { color: var(--el-text-color-secondary); }
.summary-amount { color: var(--el-color-success); font-size: 18px; }

.query-form {
  padding: 16px 16px 0;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}


.settled-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding-top: 16px;
  overflow-x: auto;
  box-sizing: border-box;
}

.settled-pagination :deep(.pagination-container) {
  position: static !important;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  min-height: 32px;
  margin: 0;
  padding: 0 !important;
  background: transparent;
}

.settled-pagination :deep(.el-pagination) {
  position: static !important;
  right: auto !important;
  width: auto;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .settlement-summary { align-items: flex-start; flex-direction: column; gap: 6px; }
  .settled-pagination {
    justify-content: flex-start;
  }
}
</style>
