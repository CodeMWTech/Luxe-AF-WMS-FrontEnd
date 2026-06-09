import { ElLoading } from 'element-plus'

export function createProgressLoading(label, options = {}) {
  const holdAt = options.holdAt ?? 72
  const interval = options.interval ?? 120
  const finishDelay = options.finishDelay ?? 500
  let progress = 0
  let timer = null
  let closed = false

  const loadingInstance = ElLoading.service({
    text: `${label} 0%`,
    background: options.background || 'rgba(0, 0, 0, 0.7)'
  })

  const updateText = () => {
    const text = `${label} ${progress}%`
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

  const setProgress = (value, complete = false) => {
    const max = complete ? 100 : holdAt
    progress = Math.max(progress, Math.min(max, Math.floor(value)))
    updateText()
  }

  const stop = () => {
    if (timer) {
      window.clearInterval(timer)
      timer = null
    }
  }

  const close = () => {
    if (closed) return
    closed = true
    stop()
    loadingInstance.close()
  }

  setProgress(1)

  timer = window.setInterval(() => {
    if (progress < holdAt) {
      setProgress(progress + 1)
    }
  }, interval)

  const finish = () => new Promise(resolve => {
    stop()
    setProgress(100, true)
    window.setTimeout(() => {
      close()
      resolve()
    }, finishDelay)
  })

  return {
    finish,
    close,
    setProgress,
    hold: () => setProgress(holdAt)
  }
}
