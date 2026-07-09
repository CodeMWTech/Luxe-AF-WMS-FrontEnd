<template>
  <div class="login-page">
    <div class="login-bg" aria-hidden="true">
      <div class="login-bg__radial" />
      <div class="login-bg__mesh" />
      <span class="login-bg__orb login-bg__orb--1" />
      <span class="login-bg__orb login-bg__orb--2" />
      <span class="login-bg__orb login-bg__orb--3" />
      <span class="login-bg__orb login-bg__orb--4" />
      <span class="login-bg__orb login-bg__orb--5" />
    </div>

    <header class="login-topbar">
      <div class="login-logo">
        <img src="@/assets/logo/logo.png" alt="LUXE AF" class="login-logo__img">
        <span class="login-logo__text">{{ $t('login.logoText') }}</span>
      </div>
      <button
        type="button"
        class="login-lang"
        data-runtime-i18n-ignore="true"
        @click="toggleLanguage"
      >
        {{ languageButtonText }}
      </button>
    </header>

    <div class="login-stage">
      <header class="login-hero">
        <h1 class="hero-title">
          <span class="hero-title__backdrop" aria-hidden="true">{{ $t('login.heroBackdrop') }}</span>
          <span class="hero-title__row">
            <span class="hero-title__brand">{{ $t('login.heroBrand') }}</span>
            <span class="hero-title__inc">{{ $t('login.heroInc') }}</span>
          </span>
        </h1>
        <p class="hero-subtitle">
          <span class="hero-subtitle__ornament" aria-hidden="true" />
          <span class="hero-subtitle__text">{{ $t('login.subtitle') }}</span>
          <span class="hero-subtitle__ornament" aria-hidden="true" />
        </p>
      </header>

      <section class="login-panel">
        <h2 class="login-panel__title">{{ $t('login.panelTitle') }}</h2>
        <el-form
          ref="loginRef"
          :model="loginForm"
          :rules="loginRules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username" class="login-field">
            <label class="login-field__label">{{ $t('login.usernamePlaceholder') }}</label>
            <div class="login-line-input">
              <el-input
                v-model="loginForm.username"
                type="text"
                size="large"
                auto-complete="off"
                :placeholder="$t('login.usernameHint')"
              />
              <el-icon class="login-line-input__icon" aria-hidden="true"><User /></el-icon>
            </div>
          </el-form-item>

          <el-form-item prop="password" class="login-field">
            <label class="login-field__label">{{ $t('login.passwordPlaceholder') }}</label>
            <div class="login-line-input login-line-input--password">
              <el-input
                v-model="loginForm.password"
                type="password"
                size="large"
                auto-complete="off"
                show-password
                :placeholder="$t('login.passwordHint')"
                @keyup.enter="handleLogin"
              />
            </div>
          </el-form-item>

          <el-form-item v-if="captchaEnabled" prop="code" class="login-field login-field--captcha">
            <label class="login-field__label">{{ $t('login.codePlaceholder') }}</label>
            <div class="login-captcha">
              <div class="login-line-input login-line-input--captcha">
                <el-input
                  v-model="loginForm.code"
                  size="large"
                  auto-complete="off"
                  :placeholder="$t('login.codeInputPlaceholder')"
                  @keyup.enter="handleLogin"
                />
                <el-icon class="login-line-input__icon" aria-hidden="true"><Key /></el-icon>
              </div>
              <button
                type="button"
                class="login-captcha__img-wrap"
                :title="$t('login.codeRefreshHint')"
                @click="getCode"
              >
                <img v-if="codeUrl" :src="codeUrl" class="login-captcha__img" alt="captcha">
                <span v-else class="login-captcha__loading">{{ $t('login.codeLoading') }}</span>
              </button>
            </div>
          </el-form-item>

          <div class="login-options">
            <el-checkbox v-model="loginForm.rememberMe">{{ $t('login.rememberMe') }}</el-checkbox>
          </div>

          <el-form-item class="login-submit">
            <button
              type="submit"
              class="login-button"
              :disabled="loading"
              @click.prevent="handleLogin"
            >
              <span v-if="!loading">{{ $t('login.login') }}</span>
              <span v-else>{{ $t('login.loggingIn') }}</span>
            </button>
          </el-form-item>
        </el-form>

        <p class="login-panel__hint">{{ $t('login.footerHint') }}</p>
      </section>

      <footer class="login-footer">
        <span>{{ $t('login.versionLabel') }} · v{{ appVersion }}</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCodeImg } from '@/api/login'
import Cookies from 'js-cookie'
import { encrypt, decrypt } from '@/utils/jsencrypt'
import useUserStore from '@/store/modules/user'
import { useI18n } from 'vue-i18n'
import { resolvePostLoginRedirect } from '@/utils/mobileDevice'
import { useMobileLanguage } from '@/views/mobile/composables/useMobileLanguage'
import { Key, User } from '@element-plus/icons-vue'
import packageInfo from '../../../package.json'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const { proxy } = getCurrentInstance()
const { t } = useI18n()
const { languageButtonText, toggleLanguage, syncLanguageFromStore } = useMobileLanguage()

const appVersion = packageInfo.version

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

onMounted(() => {
  syncLanguageFromStore()
})

getCode()
getCookie()
</script>

<style lang="scss" scoped>
.login-page {
  --login-ink: #0f172a;
  --login-ink-soft: #475569;
  --login-muted: #64748b;
  --login-line: #cbd5e1;
  --login-line-hover: #94a3b8;
  --login-focus: #409eff;
  --login-focus-ring: rgba(64, 158, 255, 0.14);
  --login-panel-bg: rgba(255, 255, 255, 0.24);
  --login-panel-blur: blur(28px) saturate(165%);
  --login-line-color: rgba(15, 23, 42, 0.28);
  --login-line-focus: rgba(15, 23, 42, 0.62);
  --login-input-icon-size: 22px;
  --login-input-icon-gap: 6px;
  --login-input-icon-color: rgba(51, 65, 85, 0.82);
  --login-input-icon-color-hover: rgba(15, 23, 42, 0.92);
  --login-input-icon-color-focus: #409eff;

  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background: #eef2ff;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--login-ink);
}

.login-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  animation: loginBgReveal 1.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-bg__radial {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 28%, rgba(56, 189, 248, 0.46) 0%, rgba(56, 189, 248, 0) 46%),
    radial-gradient(circle at 14% 16%, rgba(233, 30, 140, 0.2) 0%, rgba(233, 30, 140, 0) 40%),
    radial-gradient(circle at 86% 20%, rgba(167, 139, 250, 0.28) 0%, rgba(167, 139, 250, 0) 38%),
    radial-gradient(circle at 78% 80%, rgba(251, 191, 36, 0.16) 0%, rgba(251, 191, 36, 0) 36%),
    radial-gradient(circle at 12% 78%, rgba(52, 211, 153, 0.18) 0%, rgba(52, 211, 153, 0) 38%),
    radial-gradient(circle at 50% 100%, rgba(64, 158, 255, 0.22) 0%, rgba(64, 158, 255, 0) 42%),
    linear-gradient(158deg, #ffffff 0%, #dbeafe 34%, #ede9fe 58%, #fce7f3 82%, #f0f9ff 100%);
}

.login-bg__mesh {
  position: absolute;
  inset: -18%;
  background:
    linear-gradient(125deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(147, 197, 253, 0.42) 20%,
      rgba(196, 181, 253, 0.34) 40%,
      rgba(244, 114, 182, 0.18) 58%,
      rgba(110, 231, 183, 0.22) 76%,
      rgba(255, 255, 255, 0) 100%);
  background-size: 240% 240%;
  animation: loginMeshShift 22s ease-in-out infinite;
}

.login-bg__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(68px);
  opacity: 0.62;
}

.login-bg__orb--1 {
  top: 6%;
  left: 12%;
  width: min(40vw, 400px);
  height: min(40vw, 400px);
  background: radial-gradient(circle, rgba(56, 189, 248, 0.62) 0%, transparent 70%);
  animation: loginOrbFloat1 24s ease-in-out infinite;
}

.login-bg__orb--2 {
  top: 18%;
  right: 8%;
  width: min(36vw, 360px);
  height: min(36vw, 360px);
  background: radial-gradient(circle, rgba(192, 132, 252, 0.5) 0%, transparent 72%);
  animation: loginOrbFloat2 30s ease-in-out infinite;
}

.login-bg__orb--3 {
  bottom: -6%;
  left: 46%;
  width: min(50vw, 500px);
  height: min(32vw, 320px);
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(64, 158, 255, 0.5) 0%, transparent 70%);
  animation: loginOrbFloat3 26s ease-in-out infinite;
}

.login-bg__orb--4 {
  bottom: 16%;
  left: 4%;
  width: min(30vw, 300px);
  height: min(30vw, 300px);
  background: radial-gradient(circle, rgba(233, 30, 140, 0.32) 0%, transparent 72%);
  animation: loginOrbFloat4 28s ease-in-out infinite;
}

.login-bg__orb--5 {
  top: 48%;
  right: 20%;
  width: min(28vw, 280px);
  height: min(28vw, 280px);
  background: radial-gradient(circle, rgba(52, 211, 153, 0.36) 0%, transparent 72%);
  animation: loginOrbFloat5 32s ease-in-out infinite;
}

@keyframes loginMeshShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes loginOrbFloat1 {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(4vw, 3vh, 0); }
}

@keyframes loginOrbFloat2 {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-3vw, 4vh, 0); }
}

@keyframes loginOrbFloat3 {
  0%, 100% { transform: translateX(-50%) translate3d(0, 0, 0); }
  50% { transform: translateX(-50%) translate3d(0, -3vh, 0); }
}

@keyframes loginOrbFloat4 {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(5vw, -4vh, 0); }
}

@keyframes loginOrbFloat5 {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-4vw, 3vh, 0); }
}

.login-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px;
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.login-logo__img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.login-logo__text {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(15, 23, 42, 0.88);
}

.login-lang {
  position: static;
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: loginFadeDown 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both;

  &:hover {
    background: rgba(255, 255, 255, 0.55);
    border-color: rgba(255, 255, 255, 0.85);
    color: #0f172a;
  }
}

.login-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 88px 20px 40px;
}

.login-hero {
  width: 100%;
  margin-bottom: 28px;
  text-align: center;
}

.hero-title {
  position: relative;
  margin: 0;
  padding: 12px 0 14px;
}

.hero-title__backdrop {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -56%);
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'Noto Serif SC', serif;
  font-size: clamp(80px, 17vw, 156px);
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 0.9;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 2px rgba(99, 121, 187, 0.22);
  pointer-events: none;
  user-select: none;
  animation: loginBackdropIn 1.05s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

.hero-title__row {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.2em;
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'Noto Serif SC', serif;
  font-size: clamp(36px, 7vw, 68px);
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.05;
  text-transform: uppercase;
  animation: loginTitleIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both;
}

.hero-title__brand {
  color: #0f172a;
}

.hero-title__inc {
  background: linear-gradient(135deg, #1d4ed8 0%, #38bdf8 45%, #a855f7 82%, #409eff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-subtitle {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 3.2vw, 30px);
  margin: 20px auto 0;
  max-width: 760px;
  animation: loginFadeUp 0.78s cubic-bezier(0.22, 1, 0.36, 1) 0.28s both;
}

.hero-subtitle__ornament {
  flex: 0 0 clamp(40px, 12vw, 88px);
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(71, 85, 105, 0.35) 45%,
    rgba(51, 65, 85, 0.55) 50%,
    rgba(71, 85, 105, 0.35) 55%,
    transparent 100%
  );
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    transform: translate(-50%, -50%) rotate(45deg);
    background: rgba(71, 85, 105, 0.5);
  }
}

.hero-subtitle__text {
  font-family: Georgia, 'Times New Roman', 'Songti SC', 'Noto Serif SC', serif;
  font-size: clamp(13px, 2.35vw, 15px);
  font-weight: 500;
  line-height: 1.55;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(51, 65, 85, 0.88);
  white-space: nowrap;
}

.login-panel {
  position: relative;
  width: 100%;
  max-width: 520px;
  padding: 28px 36px 24px;
  border-radius: 18px;
  background: var(--login-panel-bg);
  border: 1px solid rgba(255, 255, 255, 0.52);
  box-shadow:
    0 8px 32px rgba(99, 121, 187, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  backdrop-filter: var(--login-panel-blur);
  -webkit-backdrop-filter: var(--login-panel-blur);
  animation: loginPanelIn 0.95s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both;
}

.login-panel__title {
  margin: 0 0 22px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  color: rgba(15, 23, 42, 0.92);
}

.login-panel__hint {
  margin: 18px 0 0;
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
  color: rgba(71, 85, 105, 0.82);
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item.login-field) {
    margin-bottom: 24px !important;
  }

  > .login-field,
  > .login-options,
  > .login-submit {
    animation: loginFadeUp 0.58s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  > .login-field:nth-child(1) { animation-delay: 0.5s; }
  > .login-field:nth-child(2) { animation-delay: 0.58s; }
  > .login-field--captcha { animation-delay: 0.66s; }
  > .login-options { animation-delay: 0.74s; }
  > .login-submit { animation-delay: 0.82s; }
}

.login-field {
  :deep(.el-form-item__content) {
    display: block;
  }

  :deep(.el-form-item__error) {
    position: static !important;
    padding-top: 6px;
    margin-top: 0;
    font-size: 12px;
    line-height: 1.4;
    min-height: 17px;
  }
}

.login-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: rgba(15, 23, 42, 0.78);
}

.login-line-input {
  position: relative;
  border-bottom: 1px solid var(--login-line-color);
  transition: border-color 0.2s ease;

  &:focus-within {
    border-bottom-color: var(--login-line-focus);

    .login-line-input__icon {
      color: var(--login-input-icon-color-focus);
    }

    :deep(.el-input__password) {
      color: var(--login-input-icon-color-focus);
    }
  }

  :deep(.el-input__wrapper) {
    min-height: 38px;
    padding: 0 calc(var(--login-input-icon-size) + var(--login-input-icon-gap)) var(--login-input-icon-gap) 0 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
  }

  :deep(.el-input__inner) {
    font-size: 14px;
    color: var(--login-ink);

    &::placeholder {
      color: rgba(148, 163, 184, 0.85);
      font-size: 13px;
    }
  }

  :deep(.el-input__suffix) {
    position: absolute;
    top: auto;
    right: 0;
    bottom: var(--login-input-icon-gap);
    width: var(--login-input-icon-size);
    height: var(--login-input-icon-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  :deep(.el-input__suffix-inner) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  :deep(.el-input__password) {
    font-size: 17px;
    color: var(--login-input-icon-color);
    transition: color 0.2s ease;

    &:hover {
      color: var(--login-input-icon-color-hover);
    }
  }
}

.login-line-input__icon {
  position: absolute;
  right: 0;
  bottom: var(--login-input-icon-gap);
  width: var(--login-input-icon-size);
  height: var(--login-input-icon-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  color: var(--login-input-icon-color);
  transition: color 0.2s ease;
  pointer-events: none;
}

.login-field--captcha {
  :deep(.el-form-item__content) {
    display: block;
  }
}

.login-captcha {
  display: flex;
  align-items: flex-end;
  gap: 12px;

  .login-line-input {
    flex: 1;
    min-width: 0;
  }
}

.login-captcha__img-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 118px;
  min-height: 38px;
  margin-bottom: 2px;
  padding: 2px 4px;
  border: none;
  border-bottom: 1px solid var(--login-line-color);
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  appearance: none;
  overflow: hidden;
  transition: border-color 0.2s ease;

  &:hover {
    border-bottom-color: var(--login-line-focus);
  }
}

.login-captcha__img {
  display: block;
  width: 100%;
  height: 34px;
  object-fit: contain;
  image-rendering: auto;
}

.login-captcha__loading {
  font-size: 12px;
  color: var(--login-muted);
}

.login-options {
  margin: 0 0 20px;

  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: rgba(51, 65, 85, 0.82);
  }

  :deep(.el-checkbox__inner) {
    width: 16px;
    height: 16px;
    background: rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.75);
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
    background-color: #1e293b;
    border-color: #1e293b;
  }
}

.login-submit {
  margin-bottom: 0;

  :deep(.el-form-item__content) {
    line-height: 1;
  }
}

.login-button {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 10px;
  background: #1e293b;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.22s ease;

  &:hover:not(:disabled) {
    background: #0f172a;
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.login-footer {
  margin-top: 22px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: rgba(51, 65, 85, 0.72);
  animation: loginFadeUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.92s both;
}

@keyframes loginBgReveal {
  from {
    opacity: 0;
    transform: scale(1.04);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes loginFadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes loginFadeDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes loginTitleIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
    filter: blur(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes loginBackdropIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.92);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -56%) scale(1);
  }
}

@keyframes loginPanelIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .login-topbar {
    padding: 14px 16px;
  }

  .login-logo__text {
    font-size: 15px;
  }

  .login-logo__img {
    width: 30px;
    height: 30px;
  }

  .login-stage {
    padding: 76px 16px 32px;
  }

  .login-hero {
    margin-bottom: 20px;
  }

  .hero-title__backdrop {
    font-size: clamp(56px, 22vw, 96px);
    -webkit-text-stroke-width: 1.5px;
  }

  .hero-title__row {
    font-size: clamp(28px, 9vw, 44px);
  }

  .hero-subtitle__text {
    font-size: 12px;
    letter-spacing: 0.24em;
    white-space: normal;
    text-align: center;
  }

  .login-panel {
    max-width: 100%;
    padding: 22px 20px 20px;
  }

  .login-panel__title {
    font-size: 20px;
    margin-bottom: 18px;
  }

  .login-captcha__img-wrap {
    width: 100px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-bg,
  .login-topbar,
  .login-lang,
  .hero-title__backdrop,
  .hero-title__row,
  .hero-subtitle,
  .login-panel,
  .login-form > .login-field,
  .login-form > .login-options,
  .login-form > .login-submit,
  .login-footer {
    animation: none !important;
  }

  .login-bg__mesh,
  .login-bg__orb {
    animation: none !important;
  }
}
</style>
