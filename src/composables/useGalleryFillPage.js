import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

/**
 * Keep gallery pages fully filled (no ragged last row) when the viewport zooms/resizes.
 * Sets CSS column count on the grid and syncs pageSize = columns * rows.
 */
export function useGalleryFillPage({
  gridRef,
  viewMode,
  queryParams,
  reload,
  minCardWidth = 200,
  gap = 16,
  preferredRows = 3,
  minRows = 2,
  maxRows = 5,
  listPageSize = 12
}) {
  let observer = null
  let roTimer = null

  function measureColumns(width) {
    if (!width || width <= 0) return 1
    return Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)))
  }

  function pageSizeForColumns(cols) {
    let rows = preferredRows
    let size = cols * rows
    while (size < cols * minRows) {
      rows += 1
      size = cols * rows
    }
    while (size > cols * maxRows && rows > minRows) {
      rows -= 1
      size = cols * rows
    }
    // Keep page sizes in a practical band for API calls.
    while (size > 60 && rows > minRows) {
      rows -= 1
      size = cols * rows
    }
    while (size < 12 && rows < maxRows) {
      rows += 1
      size = cols * rows
    }
    return Math.max(cols, size)
  }

  function applyGridColumns(cols) {
    const el = gridRef.value
    if (!el) return
    el.style.setProperty('--gallery-cols', String(cols))
  }

  function syncFromLayout({ resetPage = false, forceReload = false } = {}) {
    if (viewMode.value !== 'gallery') return
    const el = gridRef.value
    if (!el) return
    const cols = measureColumns(el.clientWidth)
    applyGridColumns(cols)
    const nextSize = pageSizeForColumns(cols)
    const sizeChanged = nextSize !== Number(queryParams.value.pageSize)
    if (sizeChanged) {
      queryParams.value.pageSize = nextSize
      if (resetPage) queryParams.value.pageNum = 1
    }
    if ((sizeChanged || forceReload) && typeof reload === 'function') {
      reload()
    }
  }

  /** Snap a user-picked page size to a full-grid multiple of current columns. */
  function snapPageSize(requested) {
    if (viewMode.value !== 'gallery') return requested
    const el = gridRef.value
    const cols = el ? measureColumns(el.clientWidth) : 1
    applyGridColumns(cols)
    const req = Number(requested) || cols * preferredRows
    const rows = Math.max(minRows, Math.round(req / cols) || preferredRows)
    return cols * Math.min(maxRows, Math.max(minRows, rows))
  }

  function bindObserver() {
    unbindObserver()
    const el = gridRef.value
    if (!el || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(() => {
      clearTimeout(roTimer)
      roTimer = setTimeout(() => syncFromLayout({ resetPage: false }), 120)
    })
    observer.observe(el)
  }

  function unbindObserver() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    clearTimeout(roTimer)
    roTimer = null
  }

  async function onGalleryEnter() {
    await nextTick()
    bindObserver()
    syncFromLayout({ resetPage: true, forceReload: true })
  }

  watch(
    viewMode,
    async (mode) => {
      if (mode === 'gallery') {
        await onGalleryEnter()
      } else {
        unbindObserver()
        queryParams.value.pageSize = listPageSize
        queryParams.value.pageNum = 1
        if (typeof reload === 'function') reload()
      }
    },
    { flush: 'post' }
  )

  onMounted(async () => {
    if (viewMode.value === 'gallery') {
      await onGalleryEnter()
    }
  })

  onBeforeUnmount(() => unbindObserver())

  return {
    syncFromLayout,
    snapPageSize,
    onGalleryEnter,
    unbindObserver
  }
}
