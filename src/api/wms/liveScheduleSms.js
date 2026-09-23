import request from '@/utils/request'

const base = '/wms/live/schedules/notifications'

export const getPendingNotifications = params => request({ url: `${base}/pending`, method: 'get', params, silentError: true })
export const previewNotifications = data => request({ url: `${base}/preview`, method: 'post', data, silentError: true })
// The server owns publish idempotency; retry the same preview with the same key.
export const publishNotifications = data => request({ url: `${base}/publish`, method: 'post', data, headers: { repeatSubmit: false }, silentError: true }).catch(error => {
  // request.js turns an explicit application rejection into a plain Error; transport and
  // proxy failures retain AxiosError. Only an explicit rejection releases the pending key.
  if (!error?.isAxiosError) {
    const rejection = error instanceof Error ? error : new Error(String(error || 'Publish rejected'))
    rejection.publishRejected = true
    throw rejection
  }
  throw error
})
export const listNotifications = params => request({ url: `${base}/list`, method: 'get', params, silentError: true })
export const retryNotification = id => request({ url: `${base}/${id}/retry`, method: 'post', data: {}, silentError: true })
export const resolveNotification = (id, data) => request({ url: `${base}/${id}/resolve`, method: 'post', data, silentError: true })
export const getSmsRecipient = employeeId => request({ url: `${base}/recipients/${employeeId}`, method: 'get', silentError: true })
export const updateSmsRecipient = (employeeId, data) => request({ url: `${base}/recipients/${employeeId}`, method: 'put', data, silentError: true })
