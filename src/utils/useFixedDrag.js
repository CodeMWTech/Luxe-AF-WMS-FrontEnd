import { computed, onBeforeUnmount, ref } from 'vue'

export function useFixedDrag(options = {}) {
  const position = ref(null)
  const dragging = ref(false)
  let dragState = null
  let lastSize = null

  const margin = options.margin ?? 8

  const dragStyle = computed(() => {
    if (!position.value) return {}
    return {
      left: `${position.value.left}px`,
      top: `${position.value.top}px`,
      right: 'auto',
      bottom: 'auto'
    }
  })

  function clampPosition(left, top, width, height) {
    const maxLeft = Math.max(margin, window.innerWidth - width - margin)
    const maxTop = Math.max(margin, window.innerHeight - height - margin)
    return {
      left: Math.min(Math.max(left, margin), maxLeft),
      top: Math.min(Math.max(top, margin), maxTop)
    }
  }

  function cleanupDrag() {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDrag)
    window.removeEventListener('pointercancel', stopDrag)
    document.body.style.userSelect = ''
    dragState = null
    dragging.value = false
  }

  function handlePointerMove(event) {
    if (!dragState) return
    event.preventDefault()
    const next = clampPosition(
      event.clientX - dragState.offsetX,
      event.clientY - dragState.offsetY,
      dragState.width,
      dragState.height
    )
    position.value = next
  }

  function stopDrag() {
    cleanupDrag()
  }

  function startDrag(event) {
    if (event.button !== undefined && event.button !== 0) return
    if (event.target?.closest?.('.el-button, button, input, textarea, select, a')) return

    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    lastSize = {
      width: rect.width,
      height: rect.height
    }
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: lastSize.width,
      height: lastSize.height
    }
    position.value = clampPosition(rect.left, rect.top, rect.width, rect.height)
    dragging.value = true
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
  }

  function keepInViewport() {
    if (!position.value || !lastSize) return
    position.value = clampPosition(position.value.left, position.value.top, lastSize.width, lastSize.height)
  }

  window.addEventListener('resize', keepInViewport)

  onBeforeUnmount(() => {
    cleanupDrag()
    window.removeEventListener('resize', keepInViewport)
  })

  return {
    dragStyle,
    dragging,
    startDrag
  }
}
