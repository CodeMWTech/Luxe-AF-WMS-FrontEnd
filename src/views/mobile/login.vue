<template>
  <div class="mobile-login">
    <div class="mobile-login__panel">
      <h1 class="mobile-login__title">{{ $t('login.title') }}</h1>
      <p class="mobile-login__subtitle">手机端 SKU 查询</p>
      <el-form ref="loginRef" :model="loginForm" :rules="loginRules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            size="large"
            clearable
            :placeholder="$t('login.usernamePlaceholder')"
          >
            <template #prefix><svg-icon icon-class="user" class="el-input__icon input-icon" /></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            size="large"
            show-password
            :placeholder="$t('login.passwordPlaceholder')"
            @keyup.enter="handleLogin"
          >
            <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="captchaEnabled" prop="code">
          <div class="mobile-login__captcha">
            <el-input
              v-model="loginForm.code"
              size="large"
              clearable
              :placeholder="$t('login.codePlaceholder')"
              @keyup.enter="handleLogin"
            >
              <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
            </el-input>
            <img :src="codeUrl" alt="captcha" @click="getCode">
          </div>
        </el-form-item>
        <el-checkbox v-model="loginForm.rememberMe" style="margin-bottom: 18px;">
          {{ $t('login.rememberMe') }}
        </el-checkbox>
        <el-button
          type="primary"
          size="large"
          style="width: 100%;"
          :loading="loading"
          @click.prevent="handleLogin"
        >
          {{ loading ? $t('login.loggingIn') : $t('login.login') }}
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Cookies from 'js-cookie'
import { useI18n } from 'vue-i18n'
import { getCodeImg } from '@/api/login'
import { decrypt, encrypt } from '@/utils/jsencrypt'
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { t } = useI18n()

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
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/m/sku-search'
      router.push(redirect)
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
</script>

<style scoped lang="scss">
.input-icon {
  width: 14px;
}
</style>
