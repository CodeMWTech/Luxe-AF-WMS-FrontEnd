<template>
  <div class="login">
    <video
      ref="videoRef"
      class="login-video"
      :src="loginVideoUrl"
      autoplay
      muted
      playsinline
      preload="auto"
      loop
      aria-hidden="true"
      @loadedmetadata="onVideoMeta"
      @timeupdate="onVideoTimeUpdate"
      @ended="onVideoEnded"
      @error="revealNow"
    />
    <div class="login-shade" aria-hidden="true" />

    <main class="login-shell">
      <!-- 品牌区：视频后段画面自带的「Happy Thanksgiving」文字会占据这一块，
           所以品牌区在片头结束后淡出，避免两段文字叠在一起 -->
      <section class="brand-panel" :class="{ 'is-hidden': introRevealed }" aria-hidden="true">
        <p class="brand-kicker">LUXE AF OPERATIONS</p>
        <h1>Luxe AF WMS</h1>
        <span class="brand-line" />
        <p class="brand-meta">Los Angeles / Inventory / Fulfillment</p>
      </section>

      <el-form
        ref="loginRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        :class="{ 'is-revealed': introRevealed }"
      >
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
            maxlength="50"
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
        <div class="login-consent-item">
          <LoginConsentNotice variant="desktop" />
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

    <div class="login-controls">
      <button
        v-if="!introRevealed"
        type="button"
        class="login-control"
        @click="skipIntro"
      >
        {{ $t('login.skipAnimation') }}
      </button>
      <button
        v-else
        type="button"
        class="login-control"
        @click="replayIntro"
      >
        Replay
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCodeImg } from '@/api/login'
import Cookies from 'js-cookie'
import { encrypt, decrypt } from '@/utils/jsencrypt'
import useUserStore from '@/store/modules/user'
import { useI18n } from 'vue-i18n'
import { resolvePostLoginRedirect } from '@/utils/mobileDevice'
import LoginConsentNotice from '@/components/LoginConsentNotice/index.vue'

/**
 * 登录页背景视频。感恩节期间使用节日版本，节后把这里改回下面那行默认视频即可。
 * const loginVideoUrl = new URL('../../../videos/A_high-end,_minimalist_luxury_secondary_202607092241-remove-mark.mp4', import.meta.url).href
 */
const loginVideoUrl = new URL('../../../videos/thanksgiving-luxe-af.mp4', import.meta.url).href
/**
 * 片头逻辑：视频循环播放（已裁到约 11.5 秒，去掉末尾退回城市的部分）。
 * 第一次播到剩余 REVEAL_BEFORE_END 秒时登录卡淡入、品牌区淡出，之后保持常显，
 * 视频继续循环播放。
 */
const REVEAL_BEFORE_END = 3.5
/** 登录卡是否已浮现（片头后段开始，之后常显）。 */
const introRevealed = ref(false)
const videoRef = ref(null)
/** 兜底：若视频加载失败或无法读取时长，最多等这么久也要显示出登录卡。 */
const REVEAL_FALLBACK_MS = 12000
let revealTimer = null
function clearRevealTimer() {
  if (revealTimer) {
    window.clearTimeout(revealTimer)
    revealTimer = null
  }
}
function revealNow() {
  if (introRevealed.value) return
  introRevealed.value = true
  clearRevealTimer()
}
function onVideoMeta() {
  const video = videoRef.value
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
    revealTimer = window.setTimeout(revealNow, REVEAL_FALLBACK_MS)
    return
  }
  // 视频比 REVEAL_BEFORE_END 还短时，一开场就显示登录卡
  if (video.duration <= REVEAL_BEFORE_END) revealNow()
}
function onVideoTimeUpdate() {
  if (introRevealed.value) return
  const video = videoRef.value
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
  if (video.duration - video.currentTime <= REVEAL_BEFORE_END) revealNow()
}
/** 视频循环播放，一轮结束只是重新开始；登录卡此时已显示，无需额外处理。 */
function onVideoEnded() {
  revealNow()
}
/** 跳过片头：立即显示登录卡，视频继续循环播放。 */
function skipIntro() {
  revealNow()
}
/** 重播片头：登录卡先隐去，视频回到开头重新播放。 */
function replayIntro() {
  const video = videoRef.value
  introRevealed.value = false
  if (!video) {
    revealNow()
    return
  }
  try {
    video.currentTime = 0
    const started = video.play()
    if (started && typeof started.catch === 'function') started.catch(() => revealNow())
  } catch (_) {
    revealNow()
  }
}
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
  username: [
    { required: true, trigger: 'blur', message: t('login.ruleUsernameRequired') },
    { min: 2, max: 50, trigger: 'blur', message: t('login.ruleUsernameLength') }
  ],
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

onBeforeUnmount(() => {
  if (revealTimer) {
    window.clearTimeout(revealTimer)
    revealTimer = null
  }
})
</script>

<style lang="scss" scoped>
$login-primary: #c2410c;
$login-primary-hover: #9a3412;
$login-primary-soft: #fff4ec;
$login-shell-bg: #fdf8f3;
$login-border: #e6d5c3;
$login-text: #3d2817;
$login-muted: #7a6653;

.login {
  position: relative;
  min-height: 100vh;
  height: 100%;
  overflow: hidden;
  background: #304156;
}

.login-video,
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
  /* 视频后段会浮现自己的节日文字，品牌区在片头结束后淡出，避免文字重叠 */
  align-self: end;
  padding-bottom: 4vh;
  color: #ffffff;
  text-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
  transition: opacity 2.2s ease, transform 2.2s ease;
}

.brand-panel.is-hidden {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
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
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 36px 34px 28px;
  overflow: hidden;
  border-radius: 20px;
  /* 玻璃拟态：极薄金色描边 + 顶部高光，让卡片像一片有厚度的玻璃浮在画面上 */
  border: 1px solid rgba(255, 224, 178, 0.34);
  box-shadow:
    0 32px 90px rgba(58, 24, 4, 0.5),
    0 2px 0 rgba(255, 255, 255, 0.28) inset,
    0 -90px 120px -60px rgba(249, 168, 92, 0.28) inset,
    0 0 0 1px rgba(255, 245, 230, 0.1) inset;
  /* 半透明暖白玻璃：透出背后的金色画面，同时保证文字对比 */
  background:
    linear-gradient(165deg,
      rgba(255, 250, 242, 0.62) 0%,
      rgba(255, 246, 234, 0.54) 22%,
      rgba(255, 250, 242, 0.68) 52%,
      rgba(255, 252, 246, 0.76) 100%);
  backdrop-filter: blur(34px) saturate(1.55) brightness(1.04);
  -webkit-backdrop-filter: blur(34px) saturate(1.55) brightness(1.04);
  box-sizing: border-box;
  /* 片头期间轻微下沉、略微缩小并模糊，浮现时缓慢展开到位 */
  opacity: 0;
  transform: translateY(26px) scale(0.975);
  filter: blur(6px);
  transition:
    opacity 2.6s cubic-bezier(0.19, 1, 0.22, 1),
    transform 2.8s cubic-bezier(0.19, 1, 0.22, 1),
    filter 2.4s ease;
  will-change: opacity, transform, filter;
  pointer-events: none;
}

.login-form.is-revealed {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
  pointer-events: auto;
}

/* 顶部细金线 + 自上而下的暖光晕，呼应背景的金属质感 */
.login-form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    rgba(255, 200, 140, 0) 0%,
    rgba(255, 214, 160, 0.9) 22%,
    rgba(255, 236, 200, 1) 50%,
    rgba(255, 214, 160, 0.9) 78%,
    rgba(255, 200, 140, 0) 100%);
}

/* 左上的柔和光斑，制造玻璃反光感 */
.login-form::after {
  content: '';
  position: absolute;
  top: -30%;
  left: -18%;
  width: 62%;
  height: 72%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 244, 226, 0.5) 0%, rgba(255, 244, 226, 0) 68%);
  pointer-events: none;
}

/* 卡片内容始终在光斑之上 */
.login-form > * {
  position: relative;
  z-index: 1;
}

/* 卡片内文字：深棕在暖白玻璃上保持清晰 */
.login-form .title {
  color: #3a2617;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
}

.login-form .system-mark {
  border-color: rgba(234, 88, 12, 0.3);
  color: #b45309;
  background: rgba(255, 237, 213, 0.72);
  backdrop-filter: blur(4px);
}

/* 输入框：更轻薄的玻璃质感，与卡片融为一体 */
.login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.62);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.7) inset,
    0 1px 2px rgba(80, 40, 10, 0.06);
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  background: rgba(255, 255, 255, 0.76);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 0 0 1px rgba(234, 88, 12, 0.72) inset,
    0 0 0 3px rgba(234, 88, 12, 0.14);
}

.login-form :deep(.el-checkbox__label),
.login-form :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #7a6653;
}

.login-form .login-code {
  border-color: rgba(230, 213, 195, 0.9);
}

/* 右下角控制栏：跳过 / 重播 */
.login-controls {
  position: absolute;
  right: 28px;
  bottom: 26px;
  z-index: 3;
  display: flex;
  gap: 10px;
}

.login-control {
  padding: 8px 18px;
  border: 1px solid rgba(255, 228, 196, 0.5);
  border-radius: 999px;
  color: #fff5e8;
  background: rgba(61, 30, 6, 0.42);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.4px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.login-control:hover,
.login-control:focus-visible {
  border-color: rgba(255, 228, 196, 0.9);
  background: rgba(120, 53, 15, 0.72);
  color: #ffffff;
}

/* 尊重系统「减少动态效果」设置：不做位移动画，直接显示 */
@media (prefers-reduced-motion: reduce) {
  .login-form {
    transition: none;
    transform: none;
  }
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

.login-consent-item {
  margin-bottom: 10px;
}

.login-action {
  margin-bottom: 0;
}

.login-button {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 10px;
  /* 金橙渐变：呼应背景的金色 logo，保持暖色主题 */
  background: linear-gradient(96deg,
    #b45309 0%,
    #d97706 22%,
    #ea580c 52%,
    #f97316 78%,
    #fb923c 100%);
  box-shadow:
    0 10px 26px rgba(180, 83, 9, 0.4),
    0 1px 0 rgba(255, 232, 200, 0.45) inset;
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(120, 53, 15, 0.4);
  transition: box-shadow 0.24s ease, filter 0.24s ease, transform 0.24s ease;
}

.login-button:hover,
.login-button:focus {
  background: linear-gradient(96deg,
    #9a3412 0%,
    #c2410c 22%,
    #dc4a0a 52%,
    #ea6a0d 78%,
    #f08a30 100%);
  box-shadow:
    0 14px 34px rgba(180, 83, 9, 0.5),
    0 1px 0 rgba(255, 232, 200, 0.55) inset;
  filter: brightness(1.05);
  transform: translateY(-1px);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  border-color: #ea580c;
  background-color: #ea580c;
}

:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #c2410c;
}

:deep(.el-checkbox__label) {
  color: #7a6653;
}

.login-form .login-consent-item :deep(.is-desktop) {
  color: #8a7561;
  font-size: 12px;
  line-height: 1.6;
}

.login-form .login-consent-item :deep(a) {
  color: #c2410c;
  text-decoration: underline;
}

.login-form .login-consent-item :deep(a:hover) {
  color: #9a3412;
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
