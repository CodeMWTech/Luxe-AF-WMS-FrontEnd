<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>开播录入</h2><p>记录开播数据并自动计算薪酬</p></div><div class="live-actions"><el-button @click="exportRows">导出 Excel</el-button><el-button type="primary" v-hasPermi="['wms:live:stream:edit']" @click="openDialog()">新增开播记录</el-button></div></div>
    <div class="metric-grid"><el-card v-for="item in metrics" :key="item.label" class="metric-card" shadow="never"><div class="metric-label">{{ item.label }}</div><div class="metric-value">{{ item.value }}</div><div class="metric-hint">当前筛选页汇总</div></el-card></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item><el-form-item><el-input v-model="query.keyword" clearable :placeholder="tr('搜索录入人/备注')" /></el-form-item><el-form-item><el-select v-model="query.employeeId" filterable clearable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item><el-select v-model="query.accountId" clearable placeholder="全部直播平台"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item><el-select v-model="query.rateTypeId" clearable placeholder="全部费率类型"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">查询</el-button><el-button @click="reset">重置</el-button></el-form-item></el-form></el-card>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="streamDate" label="日期" width="120"><template #default="s">{{ displayDate(s.row.streamDate) }}</template></el-table-column><el-table-column prop="accountLabel" label="直播平台" min-width="180" /><el-table-column prop="employeeName" label="主播" /><el-table-column label="时间" width="150"><template #default="s">{{ shortTime(s.row.startTime) }} - {{ shortTime(s.row.endTime) }}</template></el-table-column><el-table-column label="工时"><template #default="s">{{ Number(s.row.durationHours || 0).toFixed(2) }}h</template></el-table-column><el-table-column prop="rateTypeName" label="费率类型"><template #default="s"><el-tag class="type-tag">{{ s.row.rateTypeName }}</el-tag></template></el-table-column><el-table-column label="时薪"><template #default="s">{{ money(s.row.hourlyRate) }}<sup v-if="s.row.manualRate">*</sup></template></el-table-column><el-table-column label="特殊"><template #default="s"><span :class="Number(s.row.specialAmount) >= 0 ? 'positive' : 'negative'">{{ money(s.row.specialAmount) }}</span></template></el-table-column><el-table-column label="总金额"><template #default="s"><strong>{{ money(s.row.totalAmount) }}</strong></template></el-table-column><el-table-column prop="enteredBy" label="录入人" /><el-table-column label="操作" width="130" fixed="right"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" class="stream-pagination" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>

    <el-dialog v-model="dialog.open" class="stream-entry-dialog" :title="dialog.form.id ? '编辑开播记录' : '新增开播记录'" width="900px" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-position="top">
        <div class="stream-form-section">
          <div class="stream-section-title"><span>1</span><div><strong>直播信息</strong><small>选择日期、主播和直播账号后，将自动匹配排班与费率</small></div></div>
          <div class="dialog-grid stream-info-grid">
            <el-form-item label="日期" prop="streamDate"><el-date-picker v-model="dialog.form.streamDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" @change="handleStreamRateScopeChange" /></el-form-item>
            <el-form-item label="主播" prop="employeeId"><el-select v-model="dialog.form.employeeId" filterable @change="handleStreamRateScopeChange"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
            <el-form-item label="直播平台" prop="accountId"><el-select v-model="dialog.form.accountId" filterable @change="handleStreamRateScopeChange"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
            <el-form-item label="费率类型" prop="rateTypeId">
              <div class="stream-rate-type-field">
                <el-select v-model="dialog.form.rateTypeId" :loading="dialog.loadingRateTypes" :disabled="!hasStreamRateScope" :placeholder="rateTypePlaceholder" @change="handleStreamRateTypeChange">
                  <el-option v-for="v in dialog.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" />
                </el-select>
                <small v-if="hasStreamRateScope && !dialog.loadingRateTypes && !dialog.rateTypes.length">请先在费率配置中启用当前组合对应的费率类型</small>
              </div>
            </el-form-item>
          </div>
        </div>

        <div class="stream-form-section">
          <div class="stream-section-title"><span>2</span><div><strong>直播时段与薪资</strong><small>时间默认来自排班计划，工时由系统自动计算</small></div></div>
          <el-alert v-if="dialog.scheduleMissing" class="stream-schedule-warning" title="当天没有该主播在该直播间的排班计划" type="error" :closable="false" show-icon />
          <div class="dialog-grid stream-time-grid">
            <el-form-item label="开始时间" prop="startTime"><el-time-picker v-model="dialog.form.startTime" value-format="HH:mm:ss" format="HH:mm" @change="formRef?.validateField('endTime')" /></el-form-item>
            <el-form-item label="结束时间" prop="endTime"><el-time-picker v-model="dialog.form.endTime" value-format="HH:mm:ss" format="HH:mm" /></el-form-item>
            <el-form-item label="工时"><el-input :model-value="streamDurationText" disabled title="根据开始时间和结束时间自动计算" /></el-form-item>
          </div>
          <div class="stream-pay-row">
            <div class="manual-rate-control">
              <div><strong>手工时薪</strong><small>开启后可覆盖系统费率，仅影响本条记录</small></div>
              <el-switch v-model="dialog.form.manualRate" />
            </div>
            <el-form-item class="hourly-rate-item" label="时薪">
              <el-input-number v-model="dialog.form.hourlyRate" class="hourly-rate-input" :disabled="!dialog.form.manualRate" :min="0" :precision="2" />
            </el-form-item>
          </div>
        </div>

        <div class="stream-form-section">
          <div class="stream-section-title stream-special-title"><span>3</span><div><strong>特殊明细</strong><small>记录补贴、扣款或其他特殊金额</small></div><div class="special-total">合计 <strong>{{ money(specialTotal) }}</strong></div></div>
          <el-form-item class="special-details-item">
            <div class="special-details">
              <div v-if="dialog.specials.length" class="special-detail-header">
                <span>{{ tr('类型') }}</span>
                <span class="special-required-label">{{ tr('金额') }} <i>*</i></span>
                <span>{{ tr('备注') }}</span>
                <span></span>
              </div>
              <div v-for="(item,index) in dialog.specials" :key="index" class="special-detail-row">
                <el-select v-model="item.typeId" placeholder="请选择类型" @change="normalizeSpecialInput(item)"><el-option v-for="v in options.specialTypes" :key="v.id" :label="tr(v.typeName)" :value="v.id" /></el-select>
                <div class="special-amount-field" :class="{ 'is-error': item.amountError }">
                  <el-input-number v-model="item.amount" :controls="false" :min="specialAmountMin(item)" :precision="2" :placeholder="tr('请输入金额')" @change="handleSpecialAmountChange(item)" />
                  <span v-if="item.amountError" class="special-amount-error">{{ tr('金额为必填项') }}</span>
                </div>
                <el-input v-model="item.remark" placeholder="请输入备注" />
                <el-button type="danger" link @click="dialog.specials.splice(index,1)">{{ tr('删除') }}</el-button>
              </div>
              <div v-if="!dialog.specials.length" class="special-empty">暂无特殊明细</div>
              <el-button class="add-special-button" plain type="primary" @click="addSpecialDetail">+ 新增特殊明细</el-button>
            </div>
          </el-form-item>
        </div>

        <div class="stream-form-section stream-remark-section">
          <el-form-item label="备注"><el-input v-model="dialog.form.remark" type="textarea" :rows="3" placeholder="可填写本次直播的补充说明" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" :loading="dialog.submitting" :disabled="dialog.loadingRateTypes || dialog.loadingSchedule" @click="submit">确认保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addStream, deleteStream, getLiveOptions, listStreamRateTypes, listStreamScheduleOptions, listStreams, updateStream } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import useUserStore from '@/store/modules/user'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, displayDate, isoDate, LIVE_DATE_FORMAT, money } from '../shared'
const settingsStore=useSettingsStore(),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const userStore = useUserStore()
const { proxy } = getCurrentInstance()
const loading = ref(false), rows = ref([]), total = ref(0), formRef = ref()
const dateRange = ref(null), options = reactive({ employees: [], accounts: [], rateTypes: [], specialTypes: [] })
const query = reactive({ pageNum: 1, pageSize: 20, keyword: '', employeeId: null, accountId: null, rateTypeId: null })
const dialog = reactive({ open: false, form: {}, specials: [], rateTypes: [], schedules: [], loadingRateTypes: false, loadingSchedule: false, scheduleMissing: false, submitting: false })
const STREAM_PREFERENCE_KEY = 'live-payroll:stream:last-selection'
let rateTypeRequestSequence = 0
let scheduleRequestSequence = 0
const hasStreamRateScope = computed(() => Boolean(dialog.form.streamDate && dialog.form.employeeId && dialog.form.accountId))
const rateTypePlaceholder = computed(() => {
  if (!hasStreamRateScope.value) return tr('请先选择日期、主播和直播平台')
  if (dialog.loadingRateTypes) return tr('正在加载费率类型')
  return tr(dialog.rateTypes.length ? '请选择费率类型' : '当前组合无已激活费率')
})
const validateEndTime = (_rule, value, callback) => { if (!value) return callback(new Error('请选择结束时间')); if (dialog.form.startTime === value) return callback(new Error('结束时间不能等于开始时间')); callback() }
const rules = { streamDate: [{ required: true, message: '请选择日期' }], employeeId: [{ required: true, message: '请选择主播' }], accountId: [{ required: true, message: '请选择直播平台' }], rateTypeId: [{ required: true, message: '请选择费率类型' }], startTime: [{ required: true, message: '请选择开始时间' }], endTime: [{ required: true, message: '请选择结束时间' }, { validator: validateEndTime, trigger: 'change' }] }
const specialTotal = computed(() => dialog.specials.reduce((sum, item) => sum + signedSpecialAmount(item), 0))
const streamDurationText = computed(() => {
  const startMinutes = timeInMinutes(dialog.form.startTime)
  const endMinutes = timeInMinutes(dialog.form.endTime)
  if (startMinutes == null || endMinutes == null || startMinutes === endMinutes) return '—'
  const durationMinutes = endMinutes > startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes
  return `${(durationMinutes / 60).toFixed(2)}h`
})
const metrics = computed(() => { const hours = rows.value.reduce((s,v)=>s+Number(v.durationHours||0),0), pay = rows.value.reduce((s,v)=>s+Number(v.totalAmount||0),0), types = new Set(rows.value.map(v=>v.rateTypeId)).size; return [{ label:'总场次', value: total.value }, { label:'当前页工时', value:`${hours.toFixed(2)}h` }, { label:'费率类型数', value:types }, { label:'当前页薪酬', value:money(pay) }] })
function listQueryParams() {
  const params = { ...query }
  if (dateRange.value?.length === 2) [params.startDate, params.endDate] = dateRange.value
  return params
}
async function load() { loading.value = true; try { const res = await listStreams(listQueryParams()); rows.value = res.rows || []; total.value = res.total || 0 } finally { loading.value = false } }
function reset() { dateRange.value = null; Object.assign(query, { pageNum:1, keyword:'', employeeId:null, accountId:null, rateTypeId:null }); load() }
function shortTime(value) { return String(value || '').slice(0,5) }
function timeInMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}
function preferenceStorageKey() { return `${STREAM_PREFERENCE_KEY}:${userStore.id || userStore.name || 'anonymous'}` }
function loadStreamPreference() {
  try { return JSON.parse(localStorage.getItem(preferenceStorageKey()) || '{}') }
  catch (_) { return {} }
}
function saveStreamPreference(form) {
  try {
    localStorage.setItem(preferenceStorageKey(), JSON.stringify({
      employeeId: String(form.employeeId),
      accountId: String(form.accountId),
      rateTypeId: String(form.rateTypeId)
    }))
  } catch (_) {}
}
async function refreshStreamRateTypes() {
  const requestSequence = ++rateTypeRequestSequence
  dialog.rateTypes = []
  if (!hasStreamRateScope.value) { dialog.form.rateTypeId = null; dialog.loadingRateTypes = false; return }
  dialog.loadingRateTypes = true
  try {
    const res = await listStreamRateTypes({ employeeId: dialog.form.employeeId, accountId: dialog.form.accountId, streamDate: dialog.form.streamDate })
    if (requestSequence !== rateTypeRequestSequence) return
    dialog.rateTypes = res.data || []
    dialog.form.rateTypeId = dialog.rateTypes.find(type => String(type.id) === String(dialog.form.rateTypeId))?.id || null
  } finally {
    if (requestSequence === rateTypeRequestSequence) dialog.loadingRateTypes = false
  }
}
function applyScheduledDefaults() {
  const schedule = dialog.schedules[0]
  if (!schedule) return
  dialog.form.rateTypeId = dialog.rateTypes.find(item => String(item.id) === String(schedule.rateTypeId))?.id || null
  dialog.form.startTime = schedule.startTime
  dialog.form.endTime = schedule.endTime
}
function applyScheduledTimesForRateType() {
  const schedule = dialog.schedules.find(item => String(item.rateTypeId) === String(dialog.form.rateTypeId)) || dialog.schedules[0]
  if (!schedule) return
  dialog.form.startTime = schedule.startTime
  dialog.form.endTime = schedule.endTime
}
async function refreshStreamSchedule() {
  const requestSequence = ++scheduleRequestSequence
  dialog.schedules = []
  dialog.scheduleMissing = false
  if (!hasStreamRateScope.value) { dialog.loadingSchedule = false; return }
  dialog.loadingSchedule = true
  try {
    const res = await listStreamScheduleOptions({ employeeId: dialog.form.employeeId, accountId: dialog.form.accountId, streamDate: dialog.form.streamDate })
    if (requestSequence !== scheduleRequestSequence) return
    dialog.schedules = res.data || []
    dialog.scheduleMissing = dialog.schedules.length === 0
  } finally {
    if (requestSequence === scheduleRequestSequence) dialog.loadingSchedule = false
  }
}
async function handleStreamRateScopeChange() {
  dialog.form.rateTypeId = null
  dialog.form.startTime = null
  dialog.form.endTime = null
  await Promise.all([refreshStreamRateTypes(), refreshStreamSchedule()])
  applyScheduledDefaults()
}
function handleStreamRateTypeChange() { if (!dialog.form.id) applyScheduledTimesForRateType() }
async function openDialog(row = {}) {
  let specials=[]
  try { specials = JSON.parse(row.specialDetails || '[]') } catch (_) {}
  const preference = row.id ? {} : loadStreamPreference()
  const rememberedEmployee = options.employees.find(item => String(item.value) === String(preference.employeeId))?.value
  const rememberedAccount = options.accounts.find(item => String(item.id) === String(preference.accountId))?.id
  dialog.form = { id:row.id, streamDate:row.streamDate || isoDate(), employeeId:row.employeeId || rememberedEmployee || null, accountId:row.accountId || rememberedAccount || null, rateTypeId:row.rateTypeId || preference.rateTypeId || null, startTime:row.startTime || null, endTime:row.endTime || null, manualRate:Boolean(row.manualRate), hourlyRate:Number(row.hourlyRate || 0), remark:row.remark || '' }
  dialog.specials=specials.map(item => { const normalized = { ...item }; normalizeSpecialInput(normalized); return normalized })
  dialog.submitting = false
  dialog.open=true
  await Promise.all([refreshStreamRateTypes(), refreshStreamSchedule()])
  if (!row.id) applyScheduledDefaults()
}
function specialCategory(item) { return options.specialTypes.find(type => String(type.id) === String(item.typeId))?.category }
function specialAmountMin(item) { return ['DEDUCTION', 'SUBSIDY'].includes(specialCategory(item)) ? 0 : undefined }
function normalizeSpecialInput(item) { if (['DEDUCTION', 'SUBSIDY'].includes(specialCategory(item)) && Number(item.amount) < 0) item.amount = Math.abs(Number(item.amount)) }
function addSpecialDetail() { dialog.specials.push({ typeId:null, amount:null, remark:'', amountError:false }) }
function isSpecialAmountEmpty(item) { return item.amount === null || item.amount === undefined || item.amount === '' }
function handleSpecialAmountChange(item) { normalizeSpecialInput(item); if (!isSpecialAmountEmpty(item)) item.amountError = false }
function validateSpecialAmounts() {
  let valid = true
  dialog.specials.forEach(item => { item.amountError = isSpecialAmountEmpty(item); if (item.amountError) valid = false })
  if (!valid) proxy.$modal.msgWarning(tr('请输入特殊明细金额，或删除该特殊明细'))
  return valid
}
function signedSpecialAmount(item) { if (isSpecialAmountEmpty(item)) return 0; const amount = Number(item.amount); if (!Number.isFinite(amount)) return 0; const category = specialCategory(item); if (category === 'DEDUCTION') return -Math.abs(amount); if (category === 'SUBSIDY') return Math.abs(amount); return amount }
async function submit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || !validateSpecialAmounts()) return
  const specials = dialog.specials.map(({ amountError, ...item }) => ({ ...item, amount: signedSpecialAmount(item) }))
  const payload = { ...dialog.form, specialAmount: specialTotal.value, specialDetails: JSON.stringify(specials) }
  dialog.submitting = true
  try {
    await (payload.id ? updateStream(payload) : addStream(payload))
    saveStreamPreference(payload)
    proxy.$modal.msgSuccess('保存成功')
    dialog.open = false
    load()
  } catch (error) {
    const message = error?.message || '保存失败，请稍后重试'
    if (message.includes('已存在开播记录')) proxy.$modal.alertWarning(message)
    else proxy.$modal.msgError(message)
  } finally {
    dialog.submitting = false
  }
}
async function remove(row) { await proxy.$modal.confirm(`确认删除 ${row.employeeName} ${displayDate(row.streamDate)} 的开播记录？`); await deleteStream(row.id); proxy.$modal.msgSuccess('删除成功'); load() }
function exportRows() {
  const rangeLabel = dateRange.value?.length === 2 ? dateRange.value.join('-') : '全部'
  proxy.download('/wms/live/streams/export', listQueryParams(), `开播记录-${rangeLabel}.xlsx`)
}
onMounted(async()=>{ Object.assign(options,await getLiveOptions());load() })
</script>
<style scoped lang="scss">
@import '../live.scss';
.stream-rate-type-field { width: 100%; }
.stream-rate-type-field small { display: block; margin-top: 6px; color: #9099aa; font-size: 12px; line-height: 1.45; }
.stream-schedule-warning { margin: 0 0 16px; }
:deep(.stream-pagination.pagination-container) { position: relative !important; width: 100%; height: auto; min-height: 48px; margin: 16px 0 0; padding: 12px 0 4px !important; overflow-x: auto; box-sizing: border-box; }
:deep(.stream-pagination.pagination-container .el-pagination) { position: static !important; right: auto !important; width: 100%; min-width: max-content; justify-content: flex-end; box-sizing: border-box; }
</style>
<style lang="scss">
.stream-entry-dialog {
  width: min(900px, calc(100vw - 32px)) !important;
  overflow: hidden;
  border-radius: 12px;

  .el-dialog__header { margin-right: 0; padding: 20px 24px 16px; border-bottom: 1px solid var(--el-border-color-lighter); }
  .el-dialog__title { font-size: 18px; font-weight: 650; }
  .el-dialog__headerbtn { top: 4px; }
  .el-dialog__body { max-height: calc(100vh - 190px); padding: 18px 24px; overflow-y: auto; background: #f6f8fb; }
  .el-dialog__footer { padding: 14px 24px; border-top: 1px solid var(--el-border-color-lighter); background: #fff; }
  .stream-form-section { margin-bottom: 14px; padding: 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; background: #fff; }
  .stream-form-section:last-child { margin-bottom: 0; }
  .stream-section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .stream-section-title > span { display: inline-flex; flex: 0 0 26px; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; color: var(--el-color-primary); background: var(--el-color-primary-light-9); font-size: 13px; font-weight: 700; }
  .stream-section-title > div:not(.special-total) { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
  .stream-section-title strong { color: var(--el-text-color-primary); font-size: 14px; line-height: 20px; }
  .stream-section-title small { color: var(--el-text-color-secondary); font-size: 12px; line-height: 18px; }
  .dialog-grid { display: grid; align-items: start; gap: 0 16px; }
  .stream-info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 2px; }
  .stream-time-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .el-form-item { min-width: 0; margin-bottom: 16px; }
  .el-form-item__label { height: auto; padding: 0 0 7px; color: var(--el-text-color-regular); font-size: 13px; font-weight: 600; line-height: 20px; white-space: nowrap; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-select,
  .el-date-editor,
  .el-time-picker,
  .hourly-rate-input { width: 100%; }
  .stream-pay-row { display: grid; grid-template-columns: minmax(0, 1fr) 240px; align-items: end; gap: 16px; }
  .manual-rate-control { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 14px; border: 1px solid var(--el-border-color); border-radius: 6px; background: var(--el-fill-color-lighter); box-sizing: border-box; }
  .manual-rate-control > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
  .manual-rate-control strong { color: var(--el-text-color-primary); font-size: 13px; }
  .manual-rate-control small { color: var(--el-text-color-secondary); font-size: 12px; line-height: 17px; }
  .hourly-rate-item { margin-bottom: 0; }
  .special-details { width: 100%; }
  .stream-special-title { margin-bottom: 14px; }
  .special-total { margin-left: auto; color: var(--el-text-color-secondary); font-size: 13px; white-space: nowrap; }
  .special-total strong { margin-left: 6px; color: var(--el-text-color-primary); font-size: 15px; }
  .special-details-item { margin-bottom: 0; }
  .special-detail-header { display: grid; grid-template-columns: 180px 160px minmax(180px, 1fr) 44px; gap: 10px; margin-bottom: 6px; padding: 0 2px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 18px; }
  .special-required-label i { color: var(--el-color-danger); font-style: normal; }
  .special-detail-row { display: grid; grid-template-columns: 180px 160px minmax(180px, 1fr) 44px; align-items: start; gap: 10px; margin-bottom: 10px; }
  .special-amount-field { position: relative; }
  .special-amount-field.is-error { padding-bottom: 18px; }
  .special-amount-field .el-input-number { width: 100%; }
  .special-amount-field .el-input__inner { text-align: left; }
  .special-amount-field.is-error .el-input__wrapper { box-shadow: 0 0 0 1px var(--el-color-danger) inset; }
  .special-amount-error { position: absolute; left: 0; bottom: 0; color: var(--el-color-danger); font-size: 12px; line-height: 16px; white-space: nowrap; }
  .special-empty { display: flex; min-height: 54px; align-items: center; justify-content: center; margin-bottom: 10px; border: 1px dashed var(--el-border-color); border-radius: 6px; color: var(--el-text-color-placeholder); background: var(--el-fill-color-lighter); font-size: 13px; }
  .add-special-button { width: 100%; border-style: dashed; }
  .stream-remark-section { padding-bottom: 2px; }
  .stream-remark-section .el-form-item { margin-bottom: 16px; }

  @media (max-width: 720px) {
    .el-dialog__header { padding: 18px 18px 14px; }
    .el-dialog__body { padding: 14px; }
    .el-dialog__footer { padding: 12px 18px; }
    .stream-form-section { padding: 15px; }
    .stream-info-grid,
    .stream-time-grid,
    .stream-pay-row { grid-template-columns: 1fr; }
    .special-detail-header { display: none; }
    .special-detail-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; }
    .special-detail-row .el-input { grid-column: 1 / -1; grid-row: 2; }
    .special-total { margin-left: 0; }
  }
}
</style>
