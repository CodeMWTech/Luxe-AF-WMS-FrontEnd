export function isoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function monthRange(offset = 0) {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const lastDay = offset === 0
    ? now
    : new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0)
  return [isoDate(firstDay), isoDate(lastDay)]
}

export function weekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1 + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [isoDate(monday), isoDate(sunday)]
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
