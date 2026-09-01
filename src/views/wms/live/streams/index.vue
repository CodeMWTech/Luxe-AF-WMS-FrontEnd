<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>开播录入</h2><p>记录开播数据并自动计算薪酬</p></div><div class="live-actions"><el-button @click="exportRows">导出 Excel</el-button><el-button type="primary" v-hasPermi="['wms:live:stream:edit']" @click="openDialog()">新增开播记录</el-button></div></div>
    <div class="metric-grid"><el-card v-for="item in metrics" :key="item.label" class="metric-card" shadow="never"><div class="metric-label">{{ item.label }}</div><div class="metric-value">{{ item.value }}</div><div class="metric-hint">当前筛选页汇总</div></el-card></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" /></el-form-item><el-form-item><el-input v-model="query.keyword" clearable placeholder="搜索录入人/备注" /></el-form-item><el-form-item><el-select v-model="query.employeeId" filterable clearable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item><el-select v-model="query.accountId" clearable placeholder="全部直播平台"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item><el-select v-model="query.rateTypeId" clearable placeholder="全部费率类型"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button></el-form-item></el-form></el-card>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="streamDate" label="日期" width="110" /><el-table-column prop="accountLabel" label="直播平台" min-width="180" /><el-table-column prop="employeeName" label="主播" /><el-table-column label="时间" width="150"><template #default="s">{{ shortTime(s.row.startTime) }} - {{ shortTime(s.row.endTime) }}</template></el-table-column><el-table-column label="工时"><template #default="s">{{ Number(s.row.durationHours || 0).toFixed(2) }}h</template></el-table-column><el-table-column prop="rateTypeName" label="费率类型"><template #default="s"><el-tag class="type-tag">{{ s.row.rateTypeName }}</el-tag></template></el-table-column><el-table-column label="时薪"><template #default="s">{{ money(s.row.hourlyRate) }}<sup v-if="s.row.manualRate">*</sup></template></el-table-column><el-table-column label="特殊"><template #default="s"><span :class="Number(s.row.specialAmount) >= 0 ? 'positive' : 'negative'">{{ money(s.row.specialAmount) }}</span></template></el-table-column><el-table-column label="总金额"><template #default="s"><strong>{{ money(s.row.totalAmount) }}</strong></template></el-table-column><el-table-column prop="enteredBy" label="录入人" /><el-table-column label="操作" width="130" fixed="right"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>

    <el-dialog v-model="dialog.open" class="stream-entry-dialog" :title="dialog.form.id ? '编辑开播记录' : '新增开播记录'" width="820px" append-to-body>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="92px">
        <div class="dialog-grid">
          <el-form-item label="日期" prop="streamDate"><el-date-picker v-model="dialog.form.streamDate" type="date" value-format="YYYY-MM-DD" @change="handleStreamRateScopeChange" /></el-form-item>
          <el-form-item label="主播" prop="employeeId"><el-select v-model="dialog.form.employeeId" filterable @change="handleStreamRateScopeChange"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
          <el-form-item label="直播平台" prop="accountId"><el-select v-model="dialog.form.accountId" @change="handleStreamRateScopeChange"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
          <el-form-item label="费率类型" prop="rateTypeId">
            <div class="stream-rate-type-field">
              <el-select v-model="dialog.form.rateTypeId" :loading="dialog.loadingRateTypes" :disabled="!hasStreamRateScope" :placeholder="rateTypePlaceholder">
                <el-option v-for="v in dialog.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" />
              </el-select>
              <small v-if="hasStreamRateScope && !dialog.loadingRateTypes && !dialog.rateTypes.length">请先在费率配置中启用该主播、直播平台和日期对应的费率类型</small>
            </div>
          </el-form-item>
          <el-form-item label="开始时间" prop="startTime"><el-time-picker v-model="dialog.form.startTime" value-format="HH:mm:ss" format="HH:mm" @change="formRef?.validateField('endTime')" /></el-form-item>
          <el-form-item label="结束时间" prop="endTime"><el-time-picker v-model="dialog.form.endTime" value-format="HH:mm:ss" format="HH:mm" /></el-form-item>
          <el-form-item label="手工时薪"><el-switch v-model="dialog.form.manualRate" /></el-form-item>
          <el-form-item label="时薪"><el-input-number v-model="dialog.form.hourlyRate" class="hourly-rate-input" :disabled="!dialog.form.manualRate" :min="0" :precision="2" /></el-form-item>
          <el-form-item class="wide special-details-item" label="特殊明细">
            <div class="special-details">
              <div v-for="(item,index) in dialog.specials" :key="index" class="special-detail-row"><el-select v-model="item.typeId" @change="normalizeSpecialInput(item)"><el-option v-for="v in options.specialTypes" :key="v.id" :label="tr(v.typeName)" :value="v.id" /></el-select><el-input-number v-model="item.amount" :min="specialAmountMin(item)" :precision="2" @change="normalizeSpecialInput(item)" /><el-input v-model="item.remark" placeholder="备注" /><el-button type="danger" link @click="dialog.specials.splice(index,1)">{{ tr('删除') }}</el-button></div>
              <div class="special-details-footer"><el-button text type="primary" @click="dialog.specials.push({ typeId:null, amount:0, remark:'' })">+ 新增一条</el-button><span>合计：<strong>{{ money(specialTotal) }}</strong></span></div>
            </div>
          </el-form-item>
          <el-form-item class="wide" label="备注"><el-input v-model="dialog.form.remark" type="textarea" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" :disabled="dialog.loadingRateTypes" @click="submit">提交</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addStream, deleteStream, getLiveOptions, listStreamRateTypes, listStreams, updateStream } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, isoDate, money, monthRange } from '../shared'
const settingsStore=useSettingsStore(),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const { proxy } = getCurrentInstance()
const loading = ref(false), rows = ref([]), total = ref(0), formRef = ref()
const dateRange = ref(monthRange()), options = reactive({ employees: [], accounts: [], rateTypes: [], specialTypes: [] })
const query = reactive({ pageNum: 1, pageSize: 20, keyword: '', employeeId: null, accountId: null, rateTypeId: null })
const dialog = reactive({ open: false, form: {}, specials: [], rateTypes: [], loadingRateTypes: false })
let rateTypeRequestSequence = 0
const hasStreamRateScope = computed(() => Boolean(dialog.form.streamDate && dialog.form.employeeId && dialog.form.accountId))
const rateTypePlaceholder = computed(() => {
  if (!hasStreamRateScope.value) return '请先选择日期、主播和直播平台'
  if (dialog.loadingRateTypes) return '正在加载费率类型'
  return dialog.rateTypes.length ? '请选择费率类型' : '当前组合无已激活费率'
})
const validateEndTime = (_rule, value, callback) => { if (!value) return callback(new Error('请选择结束时间')); if (dialog.form.startTime === value) return callback(new Error('结束时间不能等于开始时间')); callback() }
const rules = { streamDate: [{ required: true, message: '请选择日期' }], employeeId: [{ required: true, message: '请选择主播' }], accountId: [{ required: true, message: '请选择直播平台' }], rateTypeId: [{ required: true, message: '请选择费率类型' }], startTime: [{ required: true, message: '请选择开始时间' }], endTime: [{ validator: validateEndTime, trigger: 'change' }] }
const specialTotal = computed(() => dialog.specials.reduce((sum, item) => sum + signedSpecialAmount(item), 0))
const metrics = computed(() => { const hours = rows.value.reduce((s,v)=>s+Number(v.durationHours||0),0), pay = rows.value.reduce((s,v)=>s+Number(v.totalAmount||0),0), types = new Set(rows.value.map(v=>v.rateTypeId)).size; return [{ label:'总场次', value: total.value }, { label:'当前页工时', value:`${hours.toFixed(2)}h` }, { label:'费率类型数', value:types }, { label:'当前页薪酬', value:money(pay) }] })
async function load() { loading.value = true; try { const res = await listStreams({ ...query, startDate: dateRange.value?.[0], endDate: dateRange.value?.[1] }); rows.value = res.rows || []; total.value = res.total || 0 } finally { loading.value = false } }
function reset() { dateRange.value = monthRange(); Object.assign(query, { pageNum:1, keyword:'', employeeId:null, accountId:null, rateTypeId:null }); load() }
function shortTime(value) { return String(value || '').slice(0,5) }
async function refreshStreamRateTypes() {
  const requestSequence = ++rateTypeRequestSequence
  dialog.rateTypes = []
  if (!hasStreamRateScope.value) { dialog.form.rateTypeId = null; dialog.loadingRateTypes = false; return }
  dialog.loadingRateTypes = true
  try {
    const res = await listStreamRateTypes({ employeeId: dialog.form.employeeId, accountId: dialog.form.accountId, streamDate: dialog.form.streamDate })
    if (requestSequence !== rateTypeRequestSequence) return
    dialog.rateTypes = res.data || []
    if (!dialog.rateTypes.some(type => String(type.id) === String(dialog.form.rateTypeId))) dialog.form.rateTypeId = null
  } finally {
    if (requestSequence === rateTypeRequestSequence) dialog.loadingRateTypes = false
  }
}
async function handleStreamRateScopeChange() { dialog.form.rateTypeId = null; await refreshStreamRateTypes() }
async function openDialog(row = {}) {
  let specials=[]
  try { specials = JSON.parse(row.specialDetails || '[]') } catch (_) {}
  dialog.form = { id:row.id, streamDate:row.streamDate || isoDate(), employeeId:row.employeeId || null, accountId:row.accountId || null, rateTypeId:row.rateTypeId || null, startTime:row.startTime || '09:00:00', endTime:row.endTime || '17:00:00', manualRate:Boolean(row.manualRate), hourlyRate:Number(row.hourlyRate || 0), remark:row.remark || '' }
  dialog.specials=specials.map(item => { const normalized = { ...item }; normalizeSpecialInput(normalized); return normalized })
  dialog.open=true
  await refreshStreamRateTypes()
}
function specialCategory(item) { return options.specialTypes.find(type => String(type.id) === String(item.typeId))?.category }
function specialAmountMin(item) { return ['DEDUCTION', 'SUBSIDY'].includes(specialCategory(item)) ? 0 : undefined }
function normalizeSpecialInput(item) { if (['DEDUCTION', 'SUBSIDY'].includes(specialCategory(item)) && Number(item.amount) < 0) item.amount = Math.abs(Number(item.amount)) }
function signedSpecialAmount(item) { const amount = Number(item.amount || 0), category = specialCategory(item); if (category === 'DEDUCTION') return -Math.abs(amount); if (category === 'SUBSIDY') return Math.abs(amount); return amount }
async function submit() { await formRef.value.validate(); const specials = dialog.specials.map(item => ({ ...item, amount: signedSpecialAmount(item) })); const payload={ ...dialog.form, specialAmount:specialTotal.value, specialDetails:JSON.stringify(specials) }; await (payload.id ? updateStream(payload) : addStream(payload)); proxy.$modal.msgSuccess('保存成功'); dialog.open=false; load() }
async function remove(row) { await proxy.$modal.confirm(`确认删除 ${row.employeeName} ${row.streamDate} 的开播记录？`); await deleteStream(row.id); proxy.$modal.msgSuccess('删除成功'); load() }
function exportRows() { proxy.download('/wms/live/streams/export', { ...query, startDate:dateRange.value?.[0], endDate:dateRange.value?.[1] }, `开播记录-${dateRange.value?.[0]}-${dateRange.value?.[1]}.xlsx`) }
onMounted(async()=>{ Object.assign(options,await getLiveOptions());load() })
</script>
<style scoped lang="scss">
@import '../live.scss';
.stream-rate-type-field { width: 100%; }
.stream-rate-type-field small { display: block; margin-top: 6px; color: #9099aa; font-size: 12px; line-height: 1.45; }
</style>
<style lang="scss">
.stream-entry-dialog {
  width: min(820px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 20px 28px 8px; }
  .dialog-grid { align-items: start; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 28px; }
  .el-form-item { min-width: 0; margin-bottom: 20px; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-select,
  .el-date-editor,
  .el-time-picker,
  .hourly-rate-input { width: 100%; }
  .special-details { width: 100%; }
  .special-detail-row { display: grid; grid-template-columns: 190px 170px minmax(160px, 1fr) auto; align-items: center; gap: 10px; margin-bottom: 10px; }
  .special-details-footer { display: flex; align-items: center; justify-content: space-between; min-height: 40px; }

  @media (max-width: 720px) {
    .el-dialog__body { padding: 16px 18px 6px; }
    .dialog-grid { grid-template-columns: 1fr; }
    .dialog-grid .wide { grid-column: auto; }
    .special-detail-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; }
    .special-detail-row .el-input { grid-column: 1 / -1; grid-row: 2; }
  }
}
</style>
