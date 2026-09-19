<template>
  <div class="legal-page">
    <header class="legal-header">
      <div class="legal-header__inner">
        <router-link class="legal-brand" to="/login">
          <span>LUXE AF</span>
          <strong>WMS</strong>
        </router-link>
        <div class="legal-header__actions">
          <button class="legal-lang" type="button" @click="toggleLanguage">
            {{ isEn ? '中文' : 'English' }}
          </button>
          <router-link class="legal-login-link" to="/login">{{ copy.backToLogin }}</router-link>
        </div>
      </div>
    </header>

    <main class="legal-main">
      <p class="legal-kicker">Luxe AF Operations</p>
      <h1>{{ copy.title }}</h1>
      <p class="legal-updated">{{ copy.updated }}</p>
      <p class="legal-official">{{ copy.intro }}</p>
      <nav class="legal-switch">
        <router-link to="/sms-opt-in">{{ copy.optInLink }}</router-link>
        <span aria-hidden="true">·</span>
        <router-link to="/terms">{{ copy.termsLink }}</router-link>
        <span aria-hidden="true">·</span>
        <router-link to="/privacy">{{ copy.privacyLink }}</router-link>
      </nav>

      <section v-if="submitted" class="opt-in-success" role="status">
        <h2>{{ copy.successTitle }}</h2>
        <p>{{ copy.successBody }}</p>
        <p class="opt-in-success__phone">{{ submittedPhone }}</p>
        <el-button type="primary" @click="resetForm">{{ copy.submitAnother }}</el-button>
      </section>

      <el-form
        v-else
        ref="formRef"
        class="opt-in-form"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item :label="copy.nameLabel" prop="name">
          <el-input
            v-model="form.name"
            :placeholder="copy.namePlaceholder"
            maxlength="80"
            autocomplete="name"
          />
        </el-form-item>
        <el-form-item :label="copy.phoneLabel" prop="phone" required>
          <el-input
            v-model="form.phone"
            type="tel"
            :placeholder="copy.phonePlaceholder"
            maxlength="24"
            autocomplete="tel"
          />
        </el-form-item>
        <el-form-item prop="consent" class="opt-in-form__consent">
          <el-checkbox v-model="form.consent">
            <span class="opt-in-form__consent-text">
              {{ copy.consentBefore }}
              <router-link to="/terms" target="_blank" rel="noopener noreferrer" @click.stop>{{ copy.termsLink }}</router-link>
              {{ copy.consentAnd }}
              <router-link to="/privacy" target="_blank" rel="noopener noreferrer" @click.stop>{{ copy.privacyLink }}</router-link>
              {{ copy.consentAfter }}
            </span>
          </el-checkbox>
        </el-form-item>
        <p class="opt-in-form__disclosure">{{ copy.disclosure }}</p>
        <el-form-item>
          <el-button type="primary" native-type="submit" class="opt-in-form__submit">
            {{ copy.submit }}
          </el-button>
        </el-form-item>
      </el-form>
    </main>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'

const pageLanguage = ref('en')
const formRef = ref(null)
const submitted = ref(false)
const submittedPhone = ref('')

const form = reactive({
  name: '',
  phone: '',
  consent: false
})

const isEn = computed(() => pageLanguage.value === 'en')

const copy = computed(() => isEn.value
  ? {
      backToLogin: 'Back to login',
      title: 'SMS Opt-In',
      updated: 'Last updated: September 19, 2026',
      intro: 'Livestream hosts and staff use this public form to opt in to Luxe AF work-schedule text messages. Completing this form is optional and is separate from logging into Luxe AF WMS.',
      optInLink: 'SMS Opt-In',
      termsLink: 'Terms of Service',
      privacyLink: 'Privacy Policy',
      nameLabel: 'Name',
      namePlaceholder: 'First and last name',
      phoneLabel: 'Mobile phone number',
      phonePlaceholder: '+1 213 555 0100',
      consentBefore: 'I agree to receive recurring work-schedule text messages from Luxe AF about livestream assignments, dates, start times, and schedule changes. See the ',
      consentAnd: ' and ',
      consentAfter: '.',
      disclosure: 'Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to log in or to keep your job. The checkbox above starts unchecked.',
      submit: 'Subscribe',
      successTitle: 'You are opted in',
      successBody: 'Luxe AF will send a confirmation text to this number. Reply STOP to opt out or HELP for help. Msg & data rates may apply.',
      submitAnother: 'Submit another number'
    }
  : {
      backToLogin: '返回登录',
      title: '短信报名',
      updated: '最近更新：2026年9月19日',
      intro: '直播主播和员工通过这张公开表单，自愿报名接收 Luxe AF 排班短信。填写本表不是登录系统或继续工作的前提。',
      optInLink: '短信报名',
      termsLink: '用户协议',
      privacyLink: '隐私政策',
      nameLabel: '姓名',
      namePlaceholder: '姓名',
      phoneLabel: '手机号码',
      phonePlaceholder: '+1 213 555 0100',
      consentBefore: '我同意接收 Luxe AF 发送的循环排班短信，内容包括直播安排、日期、开播时间和班次变更。详见',
      consentAnd: '与',
      consentAfter: '。',
      disclosure: '发送频率视排班情况而定。短信和流量费用可能由运营商收取。回复 STOP 退订，回复 HELP 获取帮助。登录或继续工作不必勾选此项。上方勾选框默认不勾选。',
      submit: '提交报名',
      successTitle: '已报名成功',
      successBody: 'Luxe AF 将向该号码发送一条确认短信。回复 STOP 退订，回复 HELP 获取帮助。短信和流量费用可能由运营商收取。',
      submitAnother: '再填一个号码'
    }
)

const rules = computed(() => ({
  phone: [{
    validator: (_rule, value, callback) => {
      if (!normalizePhone(value)) {
        callback(new Error(isEn.value
          ? 'Enter a valid U.S. mobile number, such as +1 213 555 0100'
          : '请输入有效的美国手机号，例如 +1 213 555 0100'))
        return
      }
      callback()
    },
    trigger: 'blur'
  }],
  consent: [{
    validator: (_rule, value, callback) => {
      if (!value) {
        callback(new Error(isEn.value
          ? 'Check the box to agree to receive work-schedule texts. You may leave it unchecked and not enroll.'
          : '请勾选同意接收排班短信。不勾选也可以离开本页，不会被加入。'))
        return
      }
      callback()
    },
    trigger: 'change'
  }]
}))

function toggleLanguage() {
  pageLanguage.value = isEn.value ? 'zh' : 'en'
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return `+1${digits.slice(1)}`
  if (digits.length === 10) return `+1${digits}`
  return ''
}

function handleSubmit() {
  formRef.value?.validate((valid) => {
    if (!valid) return
    submittedPhone.value = normalizePhone(form.phone)
    submitted.value = true
  })
}

function resetForm() {
  submitted.value = false
  submittedPhone.value = ''
  form.name = ''
  form.phone = ''
  form.consent = false
}

watch(
  copy,
  (next) => {
    document.title = `${next.title} - Luxe AF WMS`
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.legal-page {
  min-height: 100vh;
  background: #f6f7fb;
  color: #1f2a37;
}

.legal-header {
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.legal-header__inner,
.legal-main {
  width: min(760px, calc(100% - 40px));
  margin: 0 auto;
}

.legal-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.legal-brand {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: inherit;
  text-decoration: none;
  letter-spacing: 0.08em;
}

.legal-brand span {
  color: #409eff;
  font-size: 12px;
  font-weight: 700;
}

.legal-brand strong {
  font-size: 18px;
  letter-spacing: 0;
}

.legal-header__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legal-lang,
.legal-login-link {
  color: #409eff;
  background: none;
  border: 0;
  padding: 0;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
}

.legal-main {
  padding: 40px 0 72px;
}

.legal-kicker,
.legal-updated,
.legal-official {
  color: #667085;
  line-height: 1.6;
}

.legal-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.legal-main h1 {
  margin: 0 0 8px;
  font-size: 32px;
  line-height: 1.2;
}

.legal-updated {
  margin: 0 0 12px;
  font-size: 13px;
}

.legal-official {
  margin: 0 0 20px;
  font-size: 14px;
}

.legal-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 32px;
  color: #98a2b3;
  font-size: 14px;
}

.legal-switch a {
  color: #409eff;
  text-decoration: none;
}

.opt-in-form,
.opt-in-success {
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}

.opt-in-form__consent :deep(.el-checkbox) {
  align-items: flex-start;
  height: auto;
  white-space: normal;
}

.opt-in-form__consent :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.55;
}

.opt-in-form__consent-text {
  color: #344054;
  font-size: 14px;
}

.opt-in-form__consent-text a {
  color: #409eff;
  text-decoration: none;
}

.opt-in-form__disclosure {
  margin: 0 0 20px;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.opt-in-form__submit {
  width: 100%;
  height: 44px;
  font-weight: 700;
}

.opt-in-success h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.opt-in-success p {
  margin: 0 0 12px;
  color: #344054;
  line-height: 1.6;
}

.opt-in-success__phone {
  font-weight: 700;
  letter-spacing: 0.02em;
}

@media (max-width: 640px) {
  .legal-header__inner,
  .legal-main {
    width: calc(100% - 32px);
  }

  .legal-main {
    padding-top: 28px;
  }

  .legal-main h1 {
    font-size: 26px;
  }
}
</style>
