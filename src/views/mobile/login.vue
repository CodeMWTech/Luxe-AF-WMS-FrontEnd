<template>
  <div class="mobile-login" :class="{ 'is-en': isEn }">
    <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="mobile-login__form" @submit.prevent="handleLogin">
      <div class="mobile-login__form-top">
        <el-button
          link
          type="primary"
          class="mobile-login__lang-btn"
          data-runtime-i18n-ignore="true"
          @click="toggleLanguage"
        >
          {{ languageButtonText }}
        </el-button>
      </div>
      <h3 class="mobile-login__title">{{ $t('login.title') }}</h3>
      <p class="mobile-login__subtitle">{{ loginSubtitle }}</p>
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          type="text"
          auto-complete="off"
          :placeholder="$t('login.usernamePlaceholder')"
        >
          <template #prefix><svg-icon icon-class="user" class="input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          auto-complete="off"
          show-password
          :placeholder="$t('login.passwordPlaceholder')"
          @keyup.enter="handleLogin"
        >
          <template #prefix><svg-icon icon-class="password" class="input-icon" /></template>
        </el-input>
      </el-form-item>
      <el-form-item v-if="captchaEnabled" prop="code" class="mobile-login__captcha-item">
        <div class="mobile-login__captcha-row">
          <el-input
            v-model="loginForm.code"
            auto-complete="off"
            :placeholder="$t('login.codePlaceholder')"
            class="mobile-login__code-input"
            @keyup.enter="handleLogin"
          >
            <template #prefix><svg-icon icon-class="validCode" class="input-icon" /></template>
          </el-input>
          <div class="mobile-login__code-img">
            <img :src="codeUrl" alt="captcha" @click="getCode">
          </div>
        </div>
      </el-form-item>
      <el-checkbox v-model="loginForm.rememberMe" class="mobile-login__remember">
        {{ $t('login.rememberMe') }}
      </el-checkbox>
      <el-form-item class="mobile-login__submit-item">
        <el-button
          type="primary"
          :loading="loading"
          class="mobile-login__submit"
          @click.prevent="handleLogin"
        >
          {{ loading ? $t('login.loggingIn') : $t('login.login') }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cookies from 'js-cookie'
import { useI18n } from 'vue-i18n'
import { getCodeImg } from '@/api/login'
import { decrypt, encrypt } from '@/utils/jsencrypt'
import useUserStore from '@/store/modules/user'
import { useMobileLanguage } from '@/views/mobile/composables/useMobileLanguage'
import { resolvePostLoginRedirect } from '@/utils/mobileDevice'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()
const { isEn, languageButtonText, toggleLanguage, syncLanguageFromStore } = useMobileLanguage()

const loginRef = ref(null)
const loading = ref(false)
const captchaEnabled = ref(true)
const codeUrl = ref('')

const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false,
  code: '',
  uuid: ''
})

const loginRules = computed(() => ({
  username: [{ required: true, trigger: 'blur', message: t('login.ruleUsernameRequired') }],
  password: [{ required: true, trigger: 'blur', message: t('login.rulePasswordRequired') }],
  code: [{ required: true, trigger: 'change', message: t('login.ruleCodeRequired') }]
}))

const loginSubtitle = computed(() => {
  const text = t('mobile.loginSubtitle')
  return text !== 'mobile.loginSubtitle' ? text : (isEn.value ? 'Mobile SKU Lookup' : '手机端 SKU 查询')
})

function handleLogin() {
  loginRef.value?.validate(valid => {
    if (!valid) return
    loading.value = true
    if (loginForm.value.rememberMe) {
      Cookies.set('username', loginForm.value.username, { expires: 30 })
      Cookies.set('password', encrypt(loginForm.value.password), { expires: 30 })
      Cookies.set('rememberMe', loginForm.value.rememberMe, { expires: 30 })
    } else {
      Cookies.remove('username')
      Cookies.remove('password')
      Cookies.remove('rememberMe')
    }
    userStore.login(loginForm.value).then(() => {
      router.push(resolvePostLoginRedirect(route.query.redirect))
    }).catch(() => {
      loading.value = false
      if (captchaEnabled.value) {
        getCode()
      }
    })
  })
}

function getCode() {
  getCodeImg().then(res => {
    captchaEnabled.value = res.data.captchaEnabled === undefined ? true : res.data.captchaEnabled
    if (captchaEnabled.value) {
      codeUrl.value = 'data:image/gif;base64,' + res.data.img
      loginForm.value.uuid = res.data.uuid
    }
  })
}

function getCookie() {
  const username = Cookies.get('username')
  const password = Cookies.get('password')
  const rememberMe = Cookies.get('rememberMe')
  loginForm.value = {
    username: username === undefined ? loginForm.value.username : username,
    password: password === undefined ? loginForm.value.password : decrypt(password),
    rememberMe: rememberMe === undefined ? false : Boolean(rememberMe),
    code: '',
    uuid: ''
  }
}

getCode()
getCookie()

onMounted(() => {
  syncLanguageFromStore()
})
</script>

<style scoped lang="scss">
.input-icon {
  width: 14px;
  height: 39px;
}
</style>
