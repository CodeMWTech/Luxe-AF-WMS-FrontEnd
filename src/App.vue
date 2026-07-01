<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import zhCn from 'element-plus/lib/locale/lang/zh-cn'
import en from 'element-plus/lib/locale/lang/en'
import useSettingsStore from '@/store/modules/settings'
import { getToken } from '@/utils/auth'
import { handleThemeStyle } from '@/utils/theme'
import { setupRuntimeI18nWatcher } from '@/utils/runtimeI18n'
import {
  getViewportMismatchRedirect,
  isSkuLookupPath,
  shouldUseMobileExperience
} from '@/utils/mobileDevice'

const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()

function updateMobileAppClass() {
  const useMobileStyles = isSkuLookupPath(route.path) || shouldUseMobileExperience()
  document.documentElement.classList.toggle('mobile-app', useMobileStyles)
}

function syncRouteWithViewport() {
  updateMobileAppClass()
  if (!getToken() || route.path === '/login') return
  // 商品详情页不做视口重定向，避免刷新或跳转时被误踢回首页
  if (route.path.startsWith('/product/')) return

  const target = getViewportMismatchRedirect(route.path)
  if (target && target !== route.path) {
    router.replace(target)
  }
}

function handleResize() {
  syncRouteWithViewport()
}

watch(() => route.path, updateMobileAppClass, { immediate: true })

const elementLocale = computed(() =>
  settingsStore.language === 'en' ? en : zhCn
)

const runtimeI18n = setupRuntimeI18nWatcher(() => settingsStore.language || 'zh-cn')

onMounted(() => {
  window.addEventListener('resize', handleResize, { passive: true })
  nextTick(() => {
    handleThemeStyle(settingsStore.theme)
    runtimeI18n.start()
    syncRouteWithViewport()
  })
})

watch(
  () => settingsStore.language,
  () => {
    nextTick(() => {
      runtimeI18n.apply()
    })
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  runtimeI18n.stop()
})
</script>

<style>
.anchorBL {
  display: none !important;
}
</style>
