export const notificationStateLabels = {
  UNPUBLISHED: '短信未发布', CHANGED: '变更待通知', QUEUED: '短信待发送', PUBLISHED: '短信已提交', UNKNOWN: '结果待核实'
}
export const messageStatusLabels = {
  PENDING: '待发送', SENDING: '发送处理中', SUBMITTED: '已提交', DELIVERED: '已送达',
  FAILED: '发送失败', UNKNOWN: '结果待核实', CANCELED: '已撤销', EXPIRED: '已过期'
}
export const eventActionLabels = { NEW: '新增排班', UPDATE: '修改排班', CANCEL: '取消排班' }
export const statusType = status => ({ DELIVERED: 'success', FAILED: 'danger', UNKNOWN: 'warning', CANCELED: 'info', EXPIRED: 'info' }[status] || '')

export function defaultEventSelection(items) {
  return items.filter(item => item.eligible).map(item => String(item.eventId))
}

export function formatPacificInstant(value, english = false) {
  if (!value) return '—'
  // Backend instants must include an offset. Never reinterpret one in the browser's zone.
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(value))) return String(value)
  return new Intl.DateTimeFormat(english ? 'en-US' : 'zh-CN', {
    timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(date)
}

export function canPublishPreview(preview, now = Date.now()) {
  return Boolean(preview?.enabled && preview.previewId && preview.messages?.length &&
    !preview.blocked?.length && new Date(preview.expiresAt).getTime() > now)
}

export function newPublishKey() {
  return globalThis.crypto?.randomUUID?.() || `sms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export function canSaveRecipient(form, optedOut = false) {
  if (!form.phone?.trim()) return false
  if (!form.enabled) return true
  return !optedOut && form.consentConfirmed === true && Boolean(form.consentSource?.trim())
}

export function validResolution(form) {
  return Boolean(form.note?.trim() && form.note.trim().length <= 800 && (form.action === 'CONFIRM_NOT_SENT' ||
    (form.action === 'ASSOCIATE_SID' && /^SM[0-9a-f]{32}$/i.test(form.messageSid?.trim() || ''))))
}
