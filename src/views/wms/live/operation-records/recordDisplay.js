export function operatorLabel(row, tr = text => text) {
  const id = row.operatorEmployeeId ?? row.value
  if (id == null) return tr('未指定运营')
  const name = row.operatorName || row.label || `[ID: ${id}]`
  const nickname = String(row.operatorNickName ?? row.nickName ?? '').trim()
  return nickname ? `${name}（${nickname}）` : name
}

export function actualDurationLabel(minutes, english = false) {
  if (minutes == null) return '—'
  return english ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${Math.floor(minutes / 60)}时 ${minutes % 60}分`
}

export function operationRecordFilters(query, dateRange) {
  return {
    operatorEmployeeId: query.operatorEmployeeId || undefined,
    accountId: query.accountId || undefined,
    startDate: dateRange?.[0] || undefined,
    endDate: dateRange?.[1] || undefined
  }
}
