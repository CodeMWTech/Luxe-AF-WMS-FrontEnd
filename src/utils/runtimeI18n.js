import { translateByMap } from '@/locales/runtime-map'

const textNodeOrigin = new WeakMap()
const elementAttrOrigin = new WeakMap()

const ATTR_KEYS = ['placeholder', 'title', 'aria-label']

function isSkippableNode(node) {
  const parentTag = node?.parentElement?.tagName
  return parentTag === 'SCRIPT' || parentTag === 'STYLE'
}

function isInDataArea(node) {
  const el = node?.parentElement
  if (!el || !el.closest) return false
  if (el.closest('[data-runtime-i18n-ignore="true"]')) return true
  // Avoid mutating user-entered/business data and dynamic Element Plus poppers.
  // Date-picker cells reuse DOM nodes; rewriting their text nodes makes the
  // visible calendar drift away from the real selected date.
  return Boolean(
    el.closest('.el-table__body') ||
    el.closest('.el-table__row') ||
    el.closest('.el-menu') ||
    el.closest('.el-tree') ||
    el.closest('.el-dropdown-menu') ||
    el.closest('.el-select-dropdown') ||
    el.closest('.el-picker-panel') ||
    el.closest('.el-date-picker') ||
    el.closest('.el-date-range-picker') ||
    el.closest('.el-popper')
  )
}

function translateTextNode(node, language) {
  if (!node || isSkippableNode(node) || isInDataArea(node)) return

  const current = node.nodeValue || ''
  let state = textNodeOrigin.get(node)
  if (!state || current !== state.translated) {
    state = { original: current, translated: current }
    textNodeOrigin.set(node, state)
  }

  const nextValue = language === 'en' ? translateByMap(state.original, language) : state.original
  state.translated = nextValue
  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue
  }
}

function translateElementAttrs(el, language) {
  if (!el || !el.getAttribute) return
  if (el.closest('[data-runtime-i18n-ignore="true"]')) return
  if (
    el.closest('.el-picker-panel') ||
    el.closest('.el-date-picker') ||
    el.closest('.el-date-range-picker') ||
    el.closest('.el-popper')
  ) return
  let originMap = elementAttrOrigin.get(el)
  if (!originMap) {
    originMap = {}
    elementAttrOrigin.set(el, originMap)
  }

  ATTR_KEYS.forEach((attr) => {
    const current = el.getAttribute(attr)
    if (current == null) return
    const state = originMap[attr]
    if (!state || current !== state.translated) {
      originMap[attr] = { original: current, translated: current }
    }
    const nextValue = language === 'en' ? translateByMap(originMap[attr].original, language) : originMap[attr].original
    originMap[attr].translated = nextValue
    if (current !== nextValue) {
      el.setAttribute(attr, nextValue)
    }
  })
}

function walkAndTranslate(root, language) {
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    translateTextNode(walker.currentNode, language)
  }
  if (root.querySelectorAll) {
    root.querySelectorAll('*').forEach((el) => translateElementAttrs(el, language))
  }
}

export function setupRuntimeI18nWatcher(languageGetter) {
  let observer
  let isApplying = false
  let scheduled = false

  const apply = () => {
    if (isApplying) return
    isApplying = true
    walkAndTranslate(document.body, languageGetter())
    isApplying = false
  }

  const scheduleApply = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      apply()
    })
  }

  const start = () => {
    apply()
    observer = new MutationObserver(() => {
      if (isApplying) return
      scheduleApply()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTR_KEYS,
    })
  }

  const stop = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  return { apply, start, stop }
}

