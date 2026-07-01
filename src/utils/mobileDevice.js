/** 与 mobile.scss 断点一致 */
export const MOBILE_BREAKPOINT = 768

/** 手机/平板 UA（含 F12 开启「设备仿真」时 Chrome 会更改 UA） */
export function isMobileUserAgent() {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const mobileUa = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
  const tabletUa = /iPad|Tablet|PlayBook|Silk|KFAPWI/i.test(ua)
  const ipadDesktopUa = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return mobileUa || tabletUa || ipadDesktopUa
}

/**
 * 是否使用手机端 SKU 界面
 *
 * 不能只用 innerWidth：仅打开 F12（未开设备仿真）时 DevTools 会占宽度，innerWidth 可能 < 768 但仍是桌面环境。
 * 判定顺序：
 * 1. 手机/平板 UA（真机 + F12 设备仿真）
 * 2. 触控屏 + 窄屏（部分平板兜底）
 */
export function shouldUseMobileExperience() {
  if (typeof window === 'undefined') return false

  if (isMobileUserAgent()) return true

  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches
  const narrowScreen = window.innerWidth <= MOBILE_BREAKPOINT
  return Boolean(coarsePointer && narrowScreen)
}

/** @deprecated 请使用 shouldUseMobileExperience */
export function isMobileViewport() {
  return shouldUseMobileExperience()
}

export function isSkuLookupPath(path = '') {
  return path === '/sku-search' || path.startsWith('/product/')
}

/** @deprecated 兼容旧 /m/ 链接 */
export function isLegacyMobilePath(path = '') {
  return path === '/m/login' || path.startsWith('/m/')
}

export function isSkuLookupRoute(to) {
  return isSkuLookupPath(to?.path) || to?.meta?.skuLookup === true
}

function normalizeRedirectPath(redirectQuery) {
  if (typeof redirectQuery !== 'string' || !redirectQuery.trim()) return ''
  try {
    return decodeURIComponent(redirectQuery).split('?')[0]
  } catch {
    return redirectQuery.split('?')[0]
  }
}

function isDesktopEntryPath(path = '') {
  return path === '/' || path === '/index' || path === '/description'
}

/**
 * 登录成功后的跳转路径
 */
export function resolvePostLoginRedirect(redirectQuery) {
  if (shouldUseMobileExperience()) {
    const pathOnly = normalizeRedirectPath(redirectQuery)
    if (pathOnly && isSkuLookupPath(pathOnly) && typeof redirectQuery === 'string' && redirectQuery.trim()) {
      try {
        return decodeURIComponent(redirectQuery)
      } catch {
        return redirectQuery
      }
    }
    return '/sku-search'
  }

  const pathOnly = normalizeRedirectPath(redirectQuery)
  if (!pathOnly || isSkuLookupPath(pathOnly) || isDesktopEntryPath(pathOnly) || pathOnly === '/login') {
    return '/'
  }

  if (typeof redirectQuery === 'string' && redirectQuery.trim()) {
    try {
      return decodeURIComponent(redirectQuery)
    } catch {
      return redirectQuery
    }
  }

  return '/'
}

/** 登录后默认 landing 路径 */
export function getPostLoginPath(hasToken = false) {
  if (!hasToken) return '/login'
  return shouldUseMobileExperience() ? '/sku-search' : '/'
}

/** 已登录用户按视口应去的首页 */
export function getHomePathForViewport() {
  return shouldUseMobileExperience() ? '/sku-search' : '/'
}

/**
 * SKU 查询流程内的页面跳转（搜索页 <-> 详情页）
 */
export function isSkuLookupInternalNavigation(path = '', fromPath = '') {
  if (!isSkuLookupPath(path)) return false
  if (isSkuLookupPath(fromPath)) return true
  // 刷新或直接打开详情页时 from 可能为空或 /
  if (path.startsWith('/product/') && (!fromPath || fromPath === '/')) {
    return true
  }
  return false
}

/**
 * 已登录时：当前路径是否与视口模式不匹配
 * @param path 目标路径
 * @param fromPath 来源路径（用于放行 SKU 搜索 <-> 详情 的内部跳转）
 */
export function getViewportMismatchRedirect(path = '', fromPath = '') {
  const mobile = shouldUseMobileExperience()

  // SKU 流程内部跳转（搜索页 <-> 商品详情）一律放行
  if (isSkuLookupInternalNavigation(path, fromPath)) {
    return null
  }

  // 商品详情页始终允许访问（避免点击「详细信息」后被踢回首页）
  if (path.startsWith('/product/')) {
    return null
  }

  if (mobile && !isSkuLookupPath(path)) {
    return '/sku-search'
  }

  // 桌面端仅拦截 SKU 搜索入口页，不拦截详情页
  if (!mobile && path === '/sku-search') {
    return '/'
  }

  return null
}

/** 未登录访问 SKU 查询页时的登录 redirect */
export function getSkuLoginRedirect(fullPath) {
  return `/login?redirect=${encodeURIComponent(fullPath || '/sku-search')}`
}

/** 未登录时，根据视口生成登录页地址 */
export function getLoginRedirectForPath(fullPath = '/') {
  if (shouldUseMobileExperience() && !isSkuLookupPath(fullPath)) {
    return getSkuLoginRedirect('/sku-search')
  }
  return `/login?redirect=${encodeURIComponent(fullPath)}`
}

/** 登录页在视口从手机切到桌面时，清理不合适的 redirect 参数 */
export function sanitizeLoginRedirectQuery(query = {}) {
  if (shouldUseMobileExperience()) return query

  const redirect = typeof query.redirect === 'string' ? query.redirect : ''
  const pathOnly = normalizeRedirectPath(redirect)
  if (!pathOnly || isSkuLookupPath(pathOnly) || isDesktopEntryPath(pathOnly)) {
    return {}
  }
  return query
}
