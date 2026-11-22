export function operatorLabel(row, tr = text => text, missingKey = '未指定运营') {
  const id = row.operatorEmployeeId ?? row.value
  if (id == null) return tr(missingKey)
  const name = row.operatorName || row.label || `[ID: ${id}]`
  const nickname = String(row.operatorNickName ?? row.nickName ?? '').trim()
  return nickname ? `${name}（${nickname}）` : name
}

export function hoursText(value) {
  if (value == null || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${number.toFixed(2)}h`
}

export function actualDurationLabel(minutes, english = false) {
  if (minutes == null) return '—'
  return hoursText(minutes / 60, english)
}

export function operationRecordFilters(query, dateRange) {
  return {
    operatorEmployeeId: query.operatorEmployeeId || undefined,
    accountId: query.accountId || undefined,
    startDate: dateRange?.[0] || undefined,
    endDate: dateRange?.[1] || undefined,
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc'
  }
}
