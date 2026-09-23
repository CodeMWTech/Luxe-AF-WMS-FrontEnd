<template>
  <el-dialog data-runtime-i18n-ignore="true" :model-value="open" :title="tr('主播短信设置')" width="min(600px, calc(100vw - 32px))" append-to-body :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving" @update:model-value="$emit('update:open', $event)">
    <div v-loading="loading">
      <el-form label-position="top" :disabled="saving">
        <el-form-item :label="tr('主播')"><LiveEmployeeSelect v-model="selectedEmployeeId" :employees="employees" :placeholder="tr('请选择主播')" /></el-form-item>
        <template v-if="recipient && !loading">
          <el-alert v-if="recipient.optedOut" :title="tr('此号码已退订，请主播回复 START 恢复接收；恢复后不会补发历史短信。')" type="warning" :closable="false" show-icon />
          <p class="sms-recipient-note">{{ tr('档案中的手机号：{0}', [recipient.employeePhone || '—']) }}</p>
          <el-form-item :label="tr('美国手机号')"><el-input v-model="form.phone" type="tel" autocomplete="off" placeholder="+1 213 555 0100" maxlength="32" /></el-form-item>
          <el-form-item :label="tr('接收排班短信')"><el-switch v-model="form.enabled" :disabled="recipient.optedOut" /></el-form-item>
          <p v-if="recipient.consentAt" class="sms-recipient-note">{{ tr('上次同意时间：{0}', [formatTime(recipient.consentAt)]) }}<br />{{ tr('同意来源：{0}', [recipient.consentSource || '—']) }}</p>
          <template v-if="form.enabled">
            <el-form-item><el-checkbox v-model="form.consentConfirmed">{{ tr('已确认主播同意此号码接收排班及开播提醒短信') }}</el-checkbox></el-form-item>
            <el-form-item :label="tr('同意来源')"><el-input v-model="form.consentSource" type="textarea" :rows="2" maxlength="500" show-word-limit :placeholder="tr('例如：入职短信授权表，签署日期和记录编号')" /></el-form-item>
          </template>
          <el-alert :title="tr('更新号码或接收资格会使旧预览失效，并撤销不再符合条件的待发短信。')" type="info" :closable="false" />
        </template>
      </el-form>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    </div>
    <template #footer><el-button :disabled="saving" @click="$emit('update:open', false)">{{ tr('关闭') }}</el-button><el-button type="primary" :loading="saving" :disabled="loading || !recipient || !saveAllowed" @click="save">{{ tr('保存') }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import { useLiveI18n } from '../useLiveI18n'
import { getSmsRecipient, updateSmsRecipient } from '@/api/wms/liveScheduleSms'
import { canSaveRecipient, formatPacificInstant } from './smsDisplay'
const props = defineProps({ open: Boolean, employeeId: [String, Number], employees: { type: Array, default: () => [] } })
const emit = defineEmits(['update:open', 'saved'])
const { tr, isEn } = useLiveI18n()
const selectedEmployeeId = ref(null), recipient = ref(null), loading = ref(false), saving = ref(false), error = ref('')
const form = reactive({ phone: '', enabled: false, consentConfirmed: false, consentSource: '' })
const saveAllowed = computed(() => canSaveRecipient(form, recipient.value?.optedOut))
const formatTime = value => formatPacificInstant(value, isEn.value)
let sequence = 0
watch(() => props.open, open => { if (open) { selectedEmployeeId.value = props.employeeId || null; loadRecipient() } else { sequence++; recipient.value = null } })
watch(selectedEmployeeId, () => { if (props.open) loadRecipient() })
async function loadRecipient() {
  const current = ++sequence
  error.value = ''; recipient.value = null
  if (!selectedEmployeeId.value) { loading.value = false; return }
  loading.value = true
  try {
    const response = await getSmsRecipient(selectedEmployeeId.value)
    if (current !== sequence) return
    recipient.value = response.data
    Object.assign(form, { phone: response.data.phone || response.data.employeePhone || '', enabled: Boolean(response.data.enabled) && !response.data.optedOut, consentConfirmed: false, consentSource: response.data.consentSource || '' })
  } catch (e) { if (current === sequence) error.value = tr(e?.message || '短信设置加载失败，请重试') }
  finally { if (current === sequence) loading.value = false }
}
async function save() {
  if (saving.value || !saveAllowed.value || !recipient.value) return
  saving.value = true; error.value = ''
  try {
    await updateSmsRecipient(selectedEmployeeId.value, { ...form, phone: form.phone.trim(), consentSource: form.consentSource.trim() })
    emit('saved'); emit('update:open', false)
  } catch (e) { error.value = tr(e?.message || '短信设置保存失败，请重试') }
  finally { saving.value = false }
}
</script>

<style scoped>
.sms-recipient-note { color: var(--el-text-color-secondary); line-height: 1.6; overflow-wrap: anywhere; }
.el-alert { margin-bottom: 16px; }
.el-checkbox { height: auto; white-space: normal; }
.el-checkbox :deep(.el-checkbox__label) { white-space: normal; line-height: 1.5; }
</style>
