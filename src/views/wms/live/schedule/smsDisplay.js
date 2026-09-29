const issues = {
  DISABLED: '短信发送开关未启用，可预览但不能发送', NOT_CONFIGURED: 'Twilio 配置不完整，可预览但不能发送',
  TEST_RECIPIENT_INVALID: '请配置一个带国家码的有效测试接收号码',
  NO_SCHEDULE: '无已确认排班，跳过发送',
  INVALID_PHONE: '请在员工档案填写带国家码的有效手机号', INVALID_SCHEDULE: '排班时间或直播间异常，请核对',
  TOO_LONG: '短信超过长度或段数上限，请联系管理员', OPTED_OUT: '该号码已退订，禁止发送',
  NOT_IN_TEST_ALLOWLIST: '号码不在测试白名单中', ALREADY_SENT: '相同内容已提交，勿重复发送',
  QUEUE_EXPIRED: '任务已过期，请重新预览', PREVIEW_CHANGED: '排班或联系方式已变化，请重新预览',
  EMPLOYEE_CHANGED: '主播状态已变化，请重新预览', WORKER_INTERRUPTED: '发送中断，结果未知，请核实',
  TRANSPORT_OR_RESPONSE: '请求结果未知，请在 Twilio 控制台核实', INTERRUPTED: '发送中断，结果未知，请核实',
  INVALID_RESPONSE: '请求结果未知，请在 Twilio 控制台核实', '21610': '该号码已退订，禁止发送'
}
const states = { PENDING: '待发送', PROCESSING: '正在提交', ACCEPTED: '已提交', QUEUED: '网关排队中', SENDING: '网关发送中', SENT: '已发出', DELIVERED: '已送达', UNDELIVERED: '未送达', FAILED: '发送失败', CANCELED: '已取消', STALE: '待重新预览', BLOCKED: '已阻止发送', UNKNOWN: '结果未知' }
export const issueText = (code, tr) => !code ? tr('可发送') : issues[code] ? tr(issues[code]) : tr('网关错误代码：{0}', [code])
export const statusText = (code, tr) => tr(states[code] || code)
export const statusType = code => code === 'DELIVERED' ? 'success' : ['FAILED', 'UNDELIVERED', 'BLOCKED'].includes(code) ? 'danger' : ['UNKNOWN', 'STALE'].includes(code) ? 'warning' : 'info'
export function displayTimestamp(value) {
  if (!value) return '-'
  const date = new Date(String(value).replace(' ', 'T') + 'Z')
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}
export function newRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map(n => n.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
