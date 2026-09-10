<template>
  <el-dialog v-model="dialog.open" class="manual-adjustment-dialog" :title="dialog.id ? '编辑薪酬调整（仅特殊金额）' : '薪酬调整（仅特殊金额）'" width="900px" append-to-body destroy-on-close :close-on-click-modal="false" :close-on-press-escape="!dialog.saving" :show-close="!dialog.saving">
    <el-form ref="formRef" :model="dialog.form" :rules="rules" label-position="top" :disabled="dialog.saving">
      <section class="manual-section">
        <div class="manual-section-title"><span>1</span><strong>基本信息</strong></div>
        <div class="manual-info-grid">
          <el-form-item label="业务日期" prop="businessDate"><el-date-picker v-model="dialog.form.businessDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
          <el-form-item label="入账日期" prop="postingDate"><el-date-picker v-model="dialog.form.postingDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
          <el-form-item label="主播" prop="employeeId"><LiveEmployeeSelect placeholder="请选择主播" v-model="dialog.form.employeeId" :employees="options.employees" /></el-form-item>
          <el-form-item label="直播平台" prop="accountId"><el-select v-model="dialog.form.accountId" filterable><el-option v-for="account in options.accounts" :key="account.id" :label="accountLabel(account)" :value="account.id" /></el-select></el-form-item>
        </div>
        <p class="manual-date-hint">业务日期表示金额所属日期；入账日期决定计入哪个结算期间。</p>
      </section>
      <section class="manual-section">
        <div class="manual-section-title"><span>2</span><div><strong>特殊明细</strong><small>记录补贴、扣款或其他特殊金额</small></div><div class="manual-total">合计 <strong>{{ money(total) }}</strong></div></div>
        <SpecialDetailsEditor ref="specialEditor" v-model="dialog.specials" :types="options.specialTypes" required />
      </section>
      <section class="manual-section"><el-form-item label="备注"><el-input v-model="dialog.form.remark" type="textarea" :rows="3" maxlength="1000" placeholder="可填写本次调整的补充说明" /></el-form-item></section>
    </el-form>
    <template #footer><el-button :disabled="dialog.saving" @click="dialog.open = false">取消</el-button><el-button type="primary" :loading="dialog.saving" @click="save">确认保存</el-button></template>
  </el-dialog>
</template>
<script setup>
import { computed, getCurrentInstance, reactive, ref } from 'vue'
import { getLiveOptions, addManualAdjustment, updateManualAdjustment } from '@/api/wms/livePayroll'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import SpecialDetailsEditor from '../components/SpecialDetailsEditor.vue'
import { normalizeSpecialInput, specialTotal, serializeSpecialDetails } from '../components/specialDetails'
import { accountLabel, isoDate, LIVE_DATE_FORMAT, money } from '../shared'
const emit = defineEmits(['saved'])
const { proxy } = getCurrentInstance()
const formRef = ref(), specialEditor = ref()
const options = reactive({ employees: [], accounts: [], specialTypes: [] })
const dialog = reactive({ open: false, saving: false, id: null, form: {}, specials: [] })
const total = computed(() => specialTotal(dialog.specials, options.specialTypes))
const rules = { businessDate: [{ required: true, message: '请选择业务日期' }], postingDate: [{ required: true, message: '请选择入账日期' }], employeeId: [{ required: true, message: '请选择主播' }], accountId: [{ required: true, message: '请选择直播平台' }] }
async function open(row = {}, employeeId = null) {
  Object.assign(options, await getLiveOptions())
  const specials = JSON.parse(row.specialDetails || '[]')
  dialog.id = row.id || null
  dialog.form = { businessDate: row.businessDate || isoDate(), postingDate: row.postingDate || (row.id ? row.businessDate : null) || isoDate(), employeeId: row.employeeId || employeeId, accountId: row.accountId || null, remark: row.remark || '' }
  dialog.specials = specials.map(item => {
    const normalized = { ...item }
    normalizeSpecialInput(normalized, options.specialTypes)
    return normalized
  })
  dialog.saving = false
  dialog.open = true
}
async function save() {
  if (dialog.saving) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!specialEditor.value.validate()) { proxy.$modal.msgWarning('请至少添加一条特殊明细，并填写类型和金额'); return }
  dialog.saving = true
  try {
    const payload = { ...dialog.form, specialDetails: serializeSpecialDetails(dialog.specials, options.specialTypes) }
    await (dialog.id ? updateManualAdjustment(dialog.id, payload) : addManualAdjustment(payload))
    dialog.open = false
    proxy.$modal.msgSuccess('薪酬调整已保存')
    emit('saved')
  } finally { dialog.saving = false }
}
defineExpose({ open })
</script>
<style lang="scss">
.manual-adjustment-dialog {
  width: min(900px, calc(100vw - 32px)) !important; border-radius: 12px;
  .el-dialog__body { max-height: calc(100vh - 190px); overflow-y: auto; background: #f6f8fb; padding: 18px 24px; }
  .manual-section { margin-bottom: 14px; padding: 18px; background: #fff; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; }
  .manual-section:last-child { margin-bottom: 0; }
  .manual-section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .manual-section-title > span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: 700; }
  .manual-section-title small { display: block; color: var(--el-text-color-secondary); font-size: 12px; margin-top: 3px; }
  .manual-total { margin-left: auto; white-space: nowrap; }
  .manual-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .manual-date-hint { margin: 0; color: var(--el-text-color-secondary); font-size: 12px; }
  .el-form-item { min-width: 0; }
  .el-form-item .el-date-editor, .el-form-item .el-select { width: 100%; }
  @media (max-width: 720px) { .manual-info-grid { grid-template-columns: 1fr; gap: 0; } .el-dialog__body { padding: 14px; } }
}
</style>
