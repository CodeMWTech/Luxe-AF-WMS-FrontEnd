import { MOBILE_BREAKPOINT } from '@/utils/mobileDevice'

const VIEWER_WRAPPER_SELECTOR = '.el-image-viewer__wrapper'
const VIEWER_PREV_SELECTOR = '.el-image-viewer__prev:not(.is-disabled)'
const VIEWER_NEXT_SELECTOR = '.el-image-viewer__next:not(.is-disabled)'

function isDesktopViewport() {
  if (typeof window === 'undefined') return false
  return window.innerWidth > MOBILE_BREAKPOINT
}

function isEditableElement(element) {
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
}

function getViewerWrapper() {
  return document.querySelector(VIEWER_WRAPPER_SELECTOR)
}

function focusViewerWrapper() {
  const wrapper = getViewerWrapper()
  if (wrapper && typeof wrapper.focus === 'function') {
    wrapper.focus({ preventScroll: true })
  }
}

function clickViewerNav(direction) {
  const wrapper = getViewerWrapper()
  if (!wrapper) return false
  const selector = direction === 'prev' ? VIEWER_PREV_SELECTOR : VIEWER_NEXT_SELECTOR
  const button = wrapper.querySelector(selector)
  if (!button) return false
  button.click()
  return true
}

function handleViewerKeydown(event) {
  if (!isDesktopViewport()) return
  const wrapper = getViewerWrapper()
  if (!wrapper) return

  const active = document.activeElement
  if (active && active !== wrapper && isEditableElement(active) && !wrapper.contains(active)) {
    return
  }

  if (event.key === 'ArrowLeft') {
    if (clickViewerNav('prev')) {
      event.preventDefault()
      event.stopPropagation()
    }
    return
  }

  if (event.key === 'ArrowRight') {
    if (clickViewerNav('next')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

let started = false
let observer = null

export function setupImageViewerDesktopEnhance() {
  if (started || typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }
  started = true

  document.addEventListener('keydown', handleViewerKeydown, true)

  observer = new MutationObserver(() => {
    if (!isDesktopViewport()) return
    if (getViewerWrapper()) {
      requestAnimationFrame(focusViewerWrapper)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    document.removeEventListener('keydown', handleViewerKeydown, true)
    observer?.disconnect()
    observer = null
    started = false
  }
}
