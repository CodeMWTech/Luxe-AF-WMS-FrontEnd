<template>
  <div class="login">
    <video
      class="login-video"
      :src="loginVideoUrl"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      aria-hidden="true"
    />
    <div class="login-fallback" aria-hidden="true" />
    <div class="login-shade" aria-hidden="true" />

    <main class="login-shell">
      <section class="brand-panel" aria-hidden="true">
        <p class="brand-kicker">LUXE AF OPERATIONS</p>
        <h1>Luxe AF WMS</h1>
        <span class="brand-line" />
        <p class="brand-meta">Los Angeles / Inventory / Fulfillment</p>
      </section>

      <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form">
        <div class="form-heading">
          <span class="system-mark">LUXE AF</span>
          <h2 class="title">{{ $t('login.title') }}</h2>
        </div>

        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            type="text"
            size="large"
            auto-complete="off"
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
            auto-complete="off"
            show-password
            :placeholder="$t('login.passwordPlaceholder')"
            @keyup.enter="handleLogin"
          >
            <template #prefix><svg-icon icon-class="password" class="el-input__icon input-icon" /></template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="captchaEnabled" prop="code">
          <div class="code-row">
            <el-input
              v-model="loginForm.code"
              class="code-input"
              size="large"
              auto-complete="off"
              :placeholder="$t('login.codePlaceholder')"
              @keyup.enter="handleLogin"
            >
              <template #prefix><svg-icon icon-class="validCode" class="el-input__icon input-icon" /></template>
            </el-input>
            <button class="login-code" type="button" @click="getCode">
              <img :src="codeUrl" class="login-code-img" :alt="$t('login.codePlaceholder')">
            </button>
          </div>
        </el-form-item>
        <div class="form-options">
          <el-checkbox v-model="loginForm.rememberMe">{{ $t('login.rememberMe') }}</el-checkbox>
        </div>
        <el-form-item class="login-action">
          <el-button
            :loading="loading"
            size="large"
            type="primary"
            class="login-button"
            @click.prevent="handleLogin"
          >
            <span v-if="!loading">{{ $t('login.login') }}</span>
            <span v-else>{{ $t('login.loggingIn') }}</span>
          </el-button>
        </el-form-item>
      </el-form>
    </main>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCodeImg } from '@/api/login'
import Cookies from 'js-cookie'
import { encrypt, decrypt } from '@/utils/jsencrypt'
import useUserStore from '@/store/modules/user'
import { useI18n } from 'vue-i18n'
import { resolvePostLoginRedirect } from '@/utils/mobileDevice'

const loginVideoUrl = new URL('../../../videos/A_high-end,_minimalist_luxury_secondary_202607092241.mp4', import.meta.url).href
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const { proxy } = getCurrentInstance()
const { t } = useI18n()

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

const codeUrl = ref('')
const loading = ref(false)
const captchaEnabled = ref(true)

function handleLogin() {
  proxy.$refs.loginRef.validate(valid => {
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
</script>

<style lang="scss" scoped>
$login-primary: #409eff;
$login-primary-hover: #337ecc;
$login-primary-soft: #ecf5ff;
$login-shell-bg: #f8f9fd;
$login-border: #dcdfe6;
$login-text: #001529;
$login-muted: #606266;

.login {
  position: relative;
  min-height: 100vh;
  height: 100%;
  overflow: hidden;
  background: #304156;
}

.login-video,
.login-fallback,
.login-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.login-video {
  z-index: 0;
  object-fit: cover;
  object-position: center center;
}

.login-fallback {
  z-index: -1;
  background-image: url('../../assets/images/login-background.jpg');
  background-size: cover;
  background-position: center;
}

.login-shade {
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(48, 65, 86, 0.2) 0%, rgba(48, 65, 86, 0.08) 42%, rgba(48, 65, 86, 0.5) 100%),
    linear-gradient(180deg, rgba(0, 21, 41, 0.22) 0%, rgba(0, 21, 41, 0.08) 46%, rgba(0, 21, 41, 0.32) 100%);
}

.login-shell {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
  align-items: center;
  gap: 56px;
  width: min(1180px, calc(100% - 64px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 48px 0;
  box-sizing: border-box;
}

.brand-panel {
  align-self: end;
  padding-bottom: 11vh;
  color: #ffffff;
  text-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
}

.brand-kicker {
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

.brand-panel h1 {
  max-width: 440px;
  margin: 0;
  font-size: 54px;
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: 0;
}

.brand-line {
  display: block;
  width: 72px;
  height: 2px;
  margin: 22px 0 18px;
  background: linear-gradient(90deg, $login-primary, #304156);
}

.brand-meta {
  margin: 0;
  color: rgba(255, 255, 255, 0.74);
  font-size: 14px;
}

.title {
  margin: 8px 0 0;
  color: $login-text;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
}

.login-form {
  width: 100%;
  padding: 34px 32px 26px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 8px;
  background: rgba(248, 249, 253, 0.94);
  box-shadow: 0 28px 90px rgba(0, 21, 41, 0.28);
  backdrop-filter: blur(16px);
  box-sizing: border-box;
}

.form-heading {
  margin-bottom: 28px;
}

.system-mark {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(64, 158, 255, 0.28);
  border-radius: 6px;
  color: $login-primary;
  background: $login-primary-soft;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.input-icon {
  width: 15px;
  height: 44px;
  margin-left: 0;
  color: #909399;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-input) {
  height: 46px;
}

:deep(.el-input__wrapper) {
  height: 46px;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 0 0 1px $login-border inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px $login-primary inset, 0 0 0 3px rgba(64, 158, 255, 0.14);
}

:deep(.el-input__inner) {
  height: 46px;
  color: $login-text;
}

:deep(.el-input__inner::placeholder) {
  color: #a8abb2;
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 116px;
  gap: 10px;
  width: 100%;
}

.login-code {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  padding: 0;
  overflow: hidden;
  border: 1px solid $login-border;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
}

.login-code-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-options {
  display: flex;
  align-items: center;
  min-height: 28px;
  margin: 2px 0 18px;
}

.login-action {
  margin-bottom: 0;
}

.login-button {
  width: 100%;
  height: 46px;
  border: 0;
  border-radius: 6px;
  background: $login-primary;
  font-weight: 700;
  letter-spacing: 0;
}

.login-button:hover,
.login-button:focus {
  background: $login-primary-hover;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  border-color: $login-primary;
  background-color: $login-primary;
}

:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: $login-primary;
}

:deep(.el-checkbox__label) {
  color: $login-muted;
}

@media (max-width: 920px) {
  .login-shell {
    grid-template-columns: minmax(0, 420px);
    justify-content: center;
    width: min(100% - 32px, 420px);
  }

  .brand-panel {
    display: none;
  }

  .login-shade {
    background: rgba(8, 10, 13, 0.38);
  }
}

@media (max-width: 520px) {
  .login-shell {
    width: calc(100% - 24px);
    padding: 24px 0;
  }

  .login-form {
    padding: 28px 22px 22px;
  }

  .code-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .login-code {
    width: 140px;
  }
}
</style>
