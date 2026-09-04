export const LIVE_DATE_FORMAT = 'MM/DD/YYYY'
export const LIVE_MONTH_FORMAT = 'MM/YYYY'
export const LIVE_TIME_ZONE = 'America/Los_Angeles'

function losAngelesDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LIVE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function isoDate(date) {
  if (!date) return losAngelesDate()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function displayDate(value) {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[2]}/${match[3]}/${match[1]}` : String(value)
}

export function displayMonth(value) {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})/)
  return match ? `${match[2]}/${match[1]}` : String(value)
}

export function monthRange(offset = 0) {
  const [year, month, day] = isoDate().split('-').map(Number)
  const now = new Date(year, month - 1, day)
  const firstDay = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const lastDay = offset === 0
    ? now
    : new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0)
  return [isoDate(firstDay), isoDate(lastDay)]
}

export function weekRange(offset = 0) {
  const [year, month, day] = isoDate().split('-').map(Number)
  const now = new Date(year, month - 1, day)
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay() + offset * 7)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return [isoDate(sunday), isoDate(saturday)]
}

export function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value || 0))
}

export function accountLabel(account) {
  return `[${account.accountCode}] ${account.displayName}`
}

export function downloadCsv(filename, headers, rows) {
  const escape = value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`
  const csv = [headers.map(v => escape(v.label)).join(',')]
  rows.forEach(row => csv.push(headers.map(v => escape(row[v.key])).join(',')))
  const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
