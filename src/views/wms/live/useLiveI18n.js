import { computed, h } from 'vue'
import useSettingsStore from '@/store/modules/settings'
import { translateExact } from '@/locales/runtime-map'

export function useLiveI18n() {
  const settings = useSettingsStore()
  const isEn = computed(() => settings.language === 'en')
  const tr = (text, values = []) => translateExact(text, settings.language || 'zh-cn', values)
  // Message boxes are outside the page; preserve interpolated business text there too.
  const messageNode = text => h('span', { 'data-runtime-i18n-ignore': 'true' }, text)
  return { tr, isEn, messageNode }
}
