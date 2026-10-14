import { translateByMap } from '@/locales/runtime-map'

const DISPLAY_TITLES = {
  CRM: {
    'zh-cn': '客户管理',
    en: 'Customer Management'
  }
}

function displayTitle(title, language) {
  const mapped = DISPLAY_TITLES[String(title || '').trim()]
  if (!mapped) return ''
  return language === 'en' ? mapped.en : mapped['zh-cn']
}

export function getRouteTitle(meta = {}, language = 'zh-cn') {
  if (!meta || !meta.title) return ''
  const renamed = displayTitle(meta.title, language)
  if (renamed) return renamed
  if (language === 'en') {
    if (meta.titleEn) return meta.titleEn
    return translateByMap(meta.title, language)
  }
  return meta.title
}

export function getTitleByText(title = '', language = 'zh-cn') {
  if (!title) return ''
  const renamed = displayTitle(title, language)
  if (renamed) return renamed
  return language === 'en' ? translateByMap(title, language) : title
}
