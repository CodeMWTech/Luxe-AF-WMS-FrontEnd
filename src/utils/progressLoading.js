import { ElLoading } from 'element-plus'

export function createProgressLoading(label, options = {}) {
  const finishDelay = options.finishDelay ?? 500
  const elapsedLabel = options.elapsedLabel || label
  let progress = 0
  let elapsedSeconds = 0
  let hasMeasuredProgress = false
  let elapsedTimer = null
  let closed = false

  const loadingInstance = ElLoading.service({
    text: label,
    background: options.background || 'rgba(0, 0, 0, 0.7)'
  })

  const updateText = () => {
    const text = hasMeasuredProgress
      ? `${label} ${progress}%`
      : `${elapsedLabel} ${elapsedSeconds}s`
    if (loadingInstance?.setText) {
      loadingInstance.setText(text)
    } else if (loadingInstance) {
      loadingInstance.text = text
    }
    const textEl = loadingInstance?.$el?.querySelector?.('.el-loading-text')
    if (textEl) {
      textEl.textContent = text
    }
  }

  const setProgress = (value) => {
    hasMeasuredProgress = true
    const max = 100
    progress = Math.max(progress, Math.min(max, Math.floor(value)))
    updateText()
  }

  const close = () => {
    if (closed) return
    closed = true
    if (elapsedTimer) {
      window.clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    loadingInstance.close()
  }

  updateText()
  elapsedTimer = window.setInterval(() => {
    elapsedSeconds += 1
    if (!hasMeasuredProgress) {
      updateText()
    }
  }, 1000)

  const finish = () => new Promise(resolve => {
    if (hasMeasuredProgress) {
      setProgress(100)
    }
    window.setTimeout(() => {
      close()
      resolve()
    }, finishDelay)
  })

  return {
    finish,
    close,
    setProgress,
    hold: () => undefined
  }
}
