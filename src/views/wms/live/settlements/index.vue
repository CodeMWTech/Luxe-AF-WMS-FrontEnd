<template>
  <div data-runtime-i18n-ignore="true" class="live-page">
    <div class="live-hero"><div><h2>{{ tr('薪酬结算') }}</h2><p>{{ tr('按明确选择的开播、佣金及已确认调整结算，原单和快照永久保留；支持仅特殊金额的薪酬调整') }}</p></div></div>
    <el-card class="live-filter" shadow="never">
      <el-form inline>
        <el-form-item :label="tr('主播')"><LiveEmployeeSelect v-model="query.employeeId" :employees="options.employees" :placeholder="tr('全部主播')" @change="resetCandidates" /></el-form-item>
        <el-form-item :label="tr('业务/调整入账日期')"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" @change="resetCandidates" /></el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" @click="loadCandidates">{{ tr('查询待结算明细') }}</el-button><el-button @click="resetQuery">{{ tr('重置') }}</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="live-card">
      <div class="live-actions">
        <el-button v-hasPermi="['wms:live:settlement:confirm']" :disabled="!selection.length" @click="prepare">{{ tr('结算所选明细') }}</el-button>
        <el-button v-hasPermi="['wms:live:settlement:confirm']" @click="manualDialog.open({}, query.employeeId)">{{ tr('薪酬调整（仅特殊金额）') }}</el-button>
        <span>{{ tr('已选') }} {{ selection.length }} {{ tr('条 ·') }} {{ money(selectedAmount) }}</span>
      </div>
      <el-table :data="candidates" v-loading="loading" row-key="key" @selection-change="selection = $event">
        <el-table-column type="selection" width="46" />
        <el-table-column prop="employeeName" :label="tr('主播')" min-width="120" />
        <el-table-column prop="typeLabel" :label="tr('来源')" :min-width="isEn ? 145 : 90" />
        <el-table-column :label="tr('业务日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.businessDate) }}</template></el-table-column>
        <el-table-column :label="tr('入账日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.postingDate) }}</template></el-table-column>
        <el-table-column prop="accountLabel" :label="tr('平台/订单')" min-width="180"><template #default="s"><LivePlatformTag :account="s.row" :accounts="options.accounts" /></template></el-table-column>
        <el-table-column prop="description" :label="tr('说明')" min-width="200" />
        <el-table-column :label="tr('状态')" :min-width="isEn ? 145 : 110"><template #default="s">{{ s.row.type === 'ADJUSTMENT' ? tr(adjustmentStatusLabel(s.row.status)) : tr(settlementStatusLabel(s.row.status)) }}</template></el-table-column>
        <el-table-column :label="tr('金额')" :min-width="isEn ? 155 : 130"><template #default="s">{{ money(s.row.amount) }}</template></el-table-column>
        <el-table-column :label="tr('操作')" :min-width="isEn ? 155 : 130"><template #default="s"><template v-if="s.row.type === 'MANUAL' && s.row.status === 'OPEN'"><el-button v-hasPermi="['wms:live:settlement:confirm']" link type="primary" @click="manualDialog.open(s.row.manualAdjustment)">{{ tr('编辑') }}</el-button><el-button v-hasPermi="['wms:live:settlement:confirm']" link type="danger" @click="removeManual(s.row)">{{ tr('删除') }}</el-button></template></template></el-table-column>
      </el-table>
    </el-card>
    <el-card class="live-card" shadow="never" style="margin-top:20px">
      <div class="live-actions"><h3>{{ tr('已确认结算批次') }}</h3><el-button @click="loadBatches">{{ tr('刷新') }}</el-button></div>
      <el-table :data="batches" v-loading="batchLoading">
        <el-table-column prop="employeeName" :label="tr('主播')" min-width="120" />
        <el-table-column :label="tr('结算日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.settlementDate) }}</template></el-table-column>
        <el-table-column :label="tr('金额')" :min-width="isEn ? 145 : 120"><template #default="s">{{ money(s.row.totalAmount) }}</template></el-table-column>
        <el-table-column prop="paymentReference" :label="tr('支付登记')" min-width="220" show-overflow-tooltip><template #default="s">{{ s.row.paymentReference || tr('未登记') }}</template></el-table-column>
        <el-table-column prop="confirmedBy" :label="tr('确认人')" :min-width="isEn ? 145 : 110" />
        <el-table-column :label="tr('操作')" min-width="180"><template #default="s"><el-button link type="primary" @click="showBatch(s.row.id)">{{ tr('明细/导出') }}</el-button><el-button v-hasPermi="['wms:live:settlement:confirm']" link :disabled="s.row.paid" @click="registerPayment(s.row)">{{ tr('登记支付') }}</el-button></template></el-table-column>
      </el-table>
      <pagination v-show="batchTotal > 0" :total="batchTotal" v-model:page="batchQuery.pageNum" v-model:limit="batchQuery.pageSize" @pagination="loadBatches" />
    </el-card>
    <ManualAdjustmentDialog ref="manualDialog" @saved="loadCandidates" />
    <el-dialog data-runtime-i18n-ignore="true" v-model="review.open" :title="tr('确认结算')" width="1050px" :close-on-click-modal="false" :close-on-press-escape="!review.saving" :show-close="!review.saving">
      <el-form :label-width="isEn ? '160px' : '100px'" :disabled="review.saving">
        <el-form-item :label="tr('结算日期')"><el-date-picker v-model="review.date" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" :clearable="false" @change="refreshPreview" /></el-form-item>
        <el-form-item :label="tr('结算说明')" required><el-input v-model="review.remark" type="textarea" maxlength="1000" /></el-form-item>
      </el-form>
      <el-skeleton v-if="review.loading" :rows="3" animated />
      <template v-if="review.preview">
        <el-table :data="flatten(review.preview)" max-height="340">
          <el-table-column prop="typeLabel" :label="tr('来源')" :min-width="isEn ? 145 : 90" /><el-table-column :label="tr('业务日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.businessDate) }}</template></el-table-column><el-table-column :label="tr('入账日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.postingDate) }}</template></el-table-column><el-table-column prop="accountLabel" :label="tr('平台')"><template #default="s"><LivePlatformTag :account="s.row" :accounts="options.accounts" /></template></el-table-column><el-table-column prop="description" :label="tr('说明')" /><el-table-column :label="tr('金额')"><template #default="s">{{ money(s.row.amount) }}</template></el-table-column>
        </el-table>
        <p>{{ tr('开播') }} {{ money(review.preview.streamAmount) }} {{ tr('＋ 佣金') }} {{ money(review.preview.commissionAmount) }} {{ tr('＋ 调整') }} {{ money(review.preview.adjustmentAmount) }} ＝ <strong>{{ money(review.preview.totalAmount) }}</strong></p>
      </template>
      <template #footer><el-button :disabled="review.saving" @click="review.open=false">{{ tr('取消') }}</el-button><el-button type="primary" :disabled="review.loading || !review.preview || !review.remark.trim()" :loading="review.saving" @click="submit">{{ tr('确认结算') }}</el-button></template>
    </el-dialog>
    <el-dialog data-runtime-i18n-ignore="true" v-model="detail.open" :title="tr('结算快照')" width="1100px">
      <template v-if="detail.batch">
        <p>{{ detail.batch.settlementNo }} · {{ detail.batch.employeeName }} · {{ displayDate(detail.batch.settlementDate) }} · {{ money(detail.batch.totalAmount) }}</p>
        <p>{{ tr('确认人：') }}{{ detail.batch.confirmedBy }}{{ tr('；说明：') }}{{ detail.batch.remark }}{{ tr('；支付凭据：') }}{{ detail.batch.paymentReference || tr('未登记') }}</p>
        <el-table :data="detailRows" max-height="480"><el-table-column prop="typeLabel" :label="tr('来源')" :min-width="isEn ? 145 : 90" /><el-table-column prop="id" :label="tr('原记录编号')" min-width="180" /><el-table-column :label="tr('业务日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.businessDate) }}</template></el-table-column><el-table-column :label="tr('入账日期')" :min-width="isEn ? 150 : 125"><template #default="s">{{ displayDate(s.row.postingDate) }}</template></el-table-column><el-table-column prop="accountLabel" :label="tr('平台')"><template #default="s"><LivePlatformTag :account="s.row" :accounts="options.accounts" /></template></el-table-column><el-table-column prop="description" :label="tr('说明')" /><el-table-column :label="tr('金额')"><template #default="s">{{ money(s.row.amount) }}</template></el-table-column></el-table>
      </template>
      <template #footer><el-button @click="exportBatch">{{ tr('导出本批次') }}</el-button><el-button @click="detail.open=false">{{ tr('关闭') }}</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import LivePlatformTag from '../components/LivePlatformTag.vue'
import { useLiveI18n } from '../useLiveI18n'
import { computed, getCurrentInstance, onMounted, onActivated, reactive, ref } from 'vue'
import { getLiveOptions, listSettlementCandidates, previewSettlement, confirmSettlement, listSettlements, getSettlement, markSettlementPaid, deleteManualAdjustment } from '@/api/wms/livePayroll'
import ManualAdjustmentDialog from './ManualAdjustmentDialog.vue'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import { money, displayDate, isoDate, LIVE_DATE_FORMAT, settlementStatusLabel, adjustmentStatusLabel, downloadCsv } from '../shared'
import { flattenSettlement, selectedSettlementIds, selectedSettlementScope } from './settlementDisplay'
const { tr, isEn, messageNode } = useLiveI18n()
const { proxy } = getCurrentInstance()
const query = reactive({ employeeId: null }), options = reactive({ employees: [] }), dateRange = ref(null)
const loading = ref(false), batchLoading = ref(false), candidateData = ref({}), selection = ref([]), batches = ref([]), batchTotal = ref(0)
const batchQuery = reactive({ pageNum: 1, pageSize: 20 })
const review = reactive({ open: false, date: isoDate(), remark: '', loading: false, saving: false, preview: null, command: null })
const manualDialog = ref()
const detail = reactive({ open: false, batch: null })
const selectedAmount = computed(() => selection.value.reduce((total, row) => total + Number(row.amount), 0))
const flatten = data => flattenSettlement(data, tr)
const candidates = computed(() => flatten(candidateData.value))
const detailRows = computed(() => detail.batch ? flatten(JSON.parse(detail.batch.snapshotJson)) : [])
function scope() { return { employeeId: query.employeeId, startDate: dateRange.value?.[0], endDate: dateRange.value?.[1] } }
function resetCandidates() { candidateData.value={}; selection.value=[]; batchQuery.pageNum=1; return Promise.all([loadCandidates(), loadBatches()]) }
function resetQuery() { query.employeeId=null; dateRange.value=null; return resetCandidates() }
async function loadOptions() { Object.assign(options, await getLiveOptions(true)) }
async function loadCandidates() {
  loading.value=true
  selection.value=[]
  try { const { data } = await listSettlementCandidates(scope()); candidateData.value=data } finally { loading.value=false }
}
async function loadBatches() { batchLoading.value=true; try { const res=await listSettlements({ ...batchQuery, employeeId:query.employeeId }); batches.value=res.rows || []; batchTotal.value=res.total || 0 } finally { batchLoading.value=false } }
async function prepare() {
  if (!selection.value.length || selection.value.some(row => row.status !== (row.type === 'ADJUSTMENT' ? 'CONFIRMED' : 'OPEN'))) { proxy.$modal.msgWarning(tr('请选择未结算记录或待结算调整')); return }
  let selectedScope
  try { selectedScope=selectedSettlementScope(selection.value, dateRange.value) } catch (error) { proxy.$modal.msgWarning(tr(error.message)); return }
  Object.assign(review, { open:true, date:isoDate(), remark:'', loading:false, saving:false, preview:null,
    command:{ ...selectedScope, ...selectedSettlementIds(selection.value), requestKey:crypto.randomUUID() } })
  await refreshPreview()
}
let previewRequestId = 0
async function refreshPreview() {
  const requestId = ++previewRequestId
  review.preview=null; review.loading=false
  if (!review.date || !review.command) return
  const command = { ...review.command, settlementDate:review.date }
  review.command=command; review.loading=true
  try {
    const { data } = await previewSettlement(command)
    if (requestId === previewRequestId) review.preview=data
  } finally { if (requestId === previewRequestId) review.loading=false }
}
async function submit() {
  if (review.saving || review.loading || !review.preview || !review.remark.trim()) return
  review.saving=true
  try {
    const command={ ...review.command, token:review.preview.token, remark:review.remark }
    await confirmSettlement(command)
    review.open=false
    proxy.$modal.msgSuccess(tr('结算批次已保存，原记录已锁定'))
    await Promise.all([loadCandidates(), loadBatches()])
  } finally { review.saving=false }
}
async function removeManual(row) {
  await proxy.$modal.confirm(messageNode(tr('确认删除 {0} {1} 的薪酬调整？', [row.employeeName, displayDate(row.businessDate)])))
  await deleteManualAdjustment(row.id)
  proxy.$modal.msgSuccess(tr('删除成功'))
  await loadCandidates()
}
async function showBatch(id) { const { data }=await getSettlement(id); detail.batch=data; detail.open=true }
async function registerPayment(row) {
  const { value } = await proxy.$prompt(tr('填写付款、补发或扣减凭据；此操作仅登记支付结果。'), tr('登记支付'), { inputValidator:value => !!String(value || '').trim() || tr('凭据不能为空') })
  await markSettlementPaid(row.id,value); await loadBatches()
}
function exportBatch() {
  if (!detail.batch) return
  downloadCsv(detail.batch.settlementNo + '.csv', [
    {key:'settlementNo',label:tr('结算批次')},{key:'employeeName',label:tr('主播')},{key:'typeLabel',label:tr('来源')},{key:'id',label:tr('原记录编号')},{key:'businessDate',label:tr('业务日期')},{key:'postingDate',label:tr('入账日期')},{key:'accountLabel',label:tr('平台')},{key:'description',label:tr('说明')},{key:'amount',label:tr('结算金额')}
  ], detailRows.value.map(row => ({...row,settlementNo:detail.batch.settlementNo,employeeName:detail.batch.employeeName})))
}
onMounted(()=>Promise.all([loadOptions(), loadCandidates(), loadBatches()]))
onActivated(loadOptions)
</script>
<style scoped lang="scss">
@import '../live.scss';
.live-actions { margin-bottom: 14px; flex-wrap: wrap; }
</style>
