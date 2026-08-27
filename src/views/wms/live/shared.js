export function isoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function monthRange() {
  const now = new Date()
  return [isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), isoDate(now)]
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

export function parseCsv(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = event => {
      const lines = String(event.target.result || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
      if (!lines.length) return resolve([])
      const split = line => {
        const result = []
        let value = '', quoted = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++ }
          else if (char === '"') quoted = !quoted
          else if (char === ',' && !quoted) { result.push(value.trim()); value = '' }
          else value += char
        }
        result.push(value.trim())
        return result
      }
      const keys = split(lines[0])
      resolve(lines.slice(1).map(line => Object.fromEntries(split(line).map((value, index) => [keys[index], value]))))
    }
    reader.readAsText(file, 'utf-8')
  })
}
