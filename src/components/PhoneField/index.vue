<template>
  <el-form-item ref="itemRef" :label="label" :prop="field" :rules="rules" :error="serverError" class="phone-field">
    <template #label>
      <span class="phone-field__label">
        {{ label }}
        <el-tooltip placement="top">
          <template #content><div class="phone-field__tooltip">{{ helpText }}</div></template>
          <el-icon class="phone-field__help" tabindex="0" :aria-label="helpText"><QuestionFilled /></el-icon>
        </el-tooltip>
      </span>
    </template>
    <div class="phone-field__body">
      <div class="phone-field__controls">
        <el-select v-model="country" filterable :disabled="disabled" :placeholder="tx('国家/地区', 'Country/region')"
          :aria-label="tx('号码所属国家或地区', 'Phone country or region')" class="phone-field__country" @change="countryChanged">
          <el-option v-for="item in countries" :key="item.code" :value="item.code" :label="item.label" />
        </el-select>
        <el-input ref="numberRef" v-model="draft" type="tel" :disabled="disabled" :validate-event="false" :autocomplete="autocomplete"
          :label="label" :placeholder="country === 'US' ? '202 555 0123' : tx('电话号码', 'Phone number')"
          class="phone-field__number" clearable @input="inputChanged" @blur="validate" />
      </div>
      <el-input v-if="allowExtension" v-model="extension" :disabled="disabled" :validate-event="false"
        :label="tx('分机（选填）', 'Extension (optional)')" :placeholder="tx('分机（选填，最多8位）', 'Extension (optional, up to 8 digits)')"
        class="phone-field__extension" @input="inputChanged" @blur="validate" />
    </div>
  </el-form-item>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { getCountries, getCountryCallingCode, inspectPhone } from '@/utils/phoneNumber'
import useSettingsStore from '@/store/modules/settings'

const props = defineProps({
  modelValue: { type: String, default: '' }, label: String, field: String,
  disabled: Boolean, allowExtension: Boolean, sms: Boolean, autocomplete: { type: String, default: 'off' }
})
const emit = defineEmits(['update:modelValue'])
const settings = useSettingsStore()
const en = computed(() => (settings.language || 'zh-cn') === 'en')
const tx = (zh, english) => en.value ? english : zh
const legacyHint = computed(() => tx('历史号码尚未确认格式。未修改时保留原值；修改时请确认国家/地区。', 'Legacy number: unchanged values are preserved. Confirm the country/region when editing.'))
const country = ref('US'), draft = ref(''), extension = ref(''), baseline = ref(''), touched = ref(false)
const itemRef = ref()
const serverError = ref('')
const numberRef = ref()
let lastEmitted
const countries = computed(() => {
  const names = new Intl.DisplayNames([en.value ? 'en' : 'zh-CN'], { type: 'region' })
  const preferred = ['US', 'CA', 'CN', 'GB', 'MX']
  return getCountries().map(code => ({ code, label: `${names.of(code)} +${getCountryCallingCode(code)}` }))
    .sort((a, b) => {
      const ai = preferred.indexOf(a.code), bi = preferred.indexOf(b.code)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.label.localeCompare(b.label)
    })
})
watch(() => props.modelValue, value => {
  const text = value || ''
  if (text === lastEmitted) return
  baseline.value = text
  serverError.value = ''
  touched.value = false
  const parsed = inspectPhone(text, '', '', props.allowExtension)
  country.value = text ? (parsed.phone?.country || '') : 'US'
  draft.value = parsed.phone?.country ? parsed.phone.formatNational().replace(/\s*(?:ext\.?|x)\s*\d+$/i, '') : text
  extension.value = parsed.extension || ''
  lastEmitted = undefined
  nextTick(() => itemRef.value?.clearValidate())
}, { immediate: true })
const result = computed(() => inspectPhone(draft.value, country.value, extension.value, props.allowExtension))
const legacy = computed(() => !touched.value && !!baseline.value && !!inspectPhone(baseline.value, '', '', props.allowExtension).error)
const helpText = computed(() => {
  const lines = [tx('可粘贴完整国际号码，支持空格、括号和横线。', 'Paste an international number; spaces, brackets and hyphens are accepted.')]
  if (legacy.value) lines.push(legacyHint.value)
  else if (result.value.value && !result.value.error) {
    lines.push(tx('保存号码：', 'Saved as: ') + result.value.value)
    lines.push(tx('格式正确', 'Format valid'))
  }
  return lines.join('\n')
})
const errors = computed(() => ({
  tooLong: tx('输入过长，请检查电话号码。', 'Input is too long. Check the phone number.'),
  country: tx('请选择国家/地区，或输入以 + 开头的完整号码。', 'Choose a country/region or enter a full number starting with +.'),
  length: tx('号码位数不正确，请检查国家码及区号。', 'Incorrect number length. Check the country and area codes.'),
  invalid: tx('号码格式不正确，请检查国家码和号码。', 'Invalid phone format. Check the country code and number.'),
  extension: tx('手机号码不支持分机，请使用联系电话分机栏。', 'Mobile numbers cannot include an extension.'),
  extensionLength: tx('分机只能填写1至8位数字。', 'Extension must contain 1 to 8 digits.'),
  missingNumber: tx('请先填写电话号码，再填写分机。', 'Enter a phone number before adding an extension.')
}))
const rules = computed(() => [{ validator: (_rule, _value, callback) => {
  if (props.disabled || legacy.value) return callback()
  callback(result.value.error ? new Error(errors.value[result.value.error]) : undefined)
}, trigger: 'blur' }])
function inputChanged() {
  serverError.value = ''
  touched.value = true
  if (draft.value.trim().startsWith('+')) {
    const parsed = inspectPhone(draft.value, '', extension.value, props.allowExtension)
    if (parsed.phone?.country) country.value = parsed.phone.country
  }
  const parsed = result.value
  lastEmitted = parsed.error ? (draft.value + (extension.value ? ` ext. ${extension.value}` : '')) : parsed.value
  emit('update:modelValue', lastEmitted)
}
function countryChanged() {
  inputChanged()
  validate()
}
function validate() { nextTick(() => itemRef.value?.validate('blur').catch(() => {})) }
function setServerError(error) {
  const message = error?.message || ''
  const relevant = props.field === 'tel' ? /座机/.test(message) : props.field === 'mobile' ? /手机/.test(message) : /手机|电话|号码/.test(message)
  if (!relevant) return
  serverError.value = message
  nextTick(() => numberRef.value?.focus())
}
defineExpose({ setServerError })
</script>

<style scoped>
.phone-field__tooltip { max-width: 320px; white-space: pre-line; overflow-wrap: anywhere; line-height: 1.6; }
.phone-field__body { width: 100%; min-width: 0; }
.phone-field__controls { display: flex; gap: 8px; align-items: flex-start; }
.phone-field__country { flex: 0 0 145px; width: 145px; }
.phone-field__number { flex: 1; min-width: 100px; }
.phone-field__label { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.phone-field__help { color: #606266; font-size: 12px; cursor: help; }
.phone-field__help:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; border-radius: 50%; }
.phone-field__extension { max-width: 230px; margin-top: 6px; }
@media (max-width: 600px) { .phone-field__country { flex-basis: 120px; width: 120px; } }
</style>
