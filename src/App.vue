<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
  </template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/lib/locale/lang/zh-cn'
import en from 'element-plus/lib/locale/lang/en'
import useSettingsStore from '@/store/modules/settings'
import { handleThemeStyle } from '@/utils/theme'
import { setupRuntimeI18nWatcher } from '@/utils/runtimeI18n'

const settingsStore = useSettingsStore()
const route = useRoute()

watch(
  () => route.path,
  (path) => {
    document.documentElement.classList.toggle('mobile-app', path.startsWith('/m'))
  },
  { immediate: true }
)

const elementLocale = computed(() =>
  settingsStore.language === 'en' ? en : zhCn
)

const runtimeI18n = setupRuntimeI18nWatcher(() => settingsStore.language || 'zh-cn')

onMounted(() => {
  nextTick(() => {
    // 初始化主题样式
    handleThemeStyle(settingsStore.theme)
    runtimeI18n.start()
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
  runtimeI18n.stop()
})
</script>

<style>
.anchorBL {
  display: none !important;
}
</style>
