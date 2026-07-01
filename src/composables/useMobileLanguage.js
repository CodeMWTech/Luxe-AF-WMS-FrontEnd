import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import useSettingsStore from '@/store/modules/settings'
import { getRouteTitle } from '@/utils/routeTitle'

function normalizeLanguage(lang) {
  const value = String(lang || '').toLowerCase().replace('_', '-')
  if (value.startsWith('en')) return 'en'
  if (value.startsWith('zh')) return 'zh-cn'
  return 'zh-cn'
}

export function useMobileLanguage() {
  const { locale } = useI18n()
  const settingsStore = useSettingsStore()
  const route = useRoute()

  const currentLanguage = computed(() => normalizeLanguage(settingsStore.language || locale.value))
  const isEn = computed(() => currentLanguage.value === 'en')
  const languageButtonText = computed(() => (isEn.value ? 'English' : '中文'))

  function applyLanguage(nextRaw) {
    const next = normalizeLanguage(nextRaw)
    if (locale.value !== next) {
      locale.value = next
    }
    if (settingsStore.language !== next) {
      settingsStore.setLanguage(next)
    }
    if (route.meta?.title) {
      settingsStore.setTitle(getRouteTitle(route.meta, next))
    }
  }

  function toggleLanguage() {
    applyLanguage(isEn.value ? 'zh-cn' : 'en')
  }

  function syncLanguageFromStore() {
    applyLanguage(settingsStore.language || locale.value)
  }

  return {
    isEn,
    currentLanguage,
    languageButtonText,
    toggleLanguage,
    syncLanguageFromStore
  }
}
