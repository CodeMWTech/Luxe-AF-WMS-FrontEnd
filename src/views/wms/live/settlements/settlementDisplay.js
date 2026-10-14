export function flattenSettlement(data, tr = defaultText) {
  return [
    ...(data.streams || []).map(row => ({ key: 'STREAM:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'STREAM', typeLabel: tr('开播'), businessDate: row.streamDate, postingDate: row.streamDate, accountId: row.accountId, platform: row.platform, accountLabel: row.accountLabel, description: tr('{0} 小时 × {1}；特殊金额 {2}', [row.durationHours, row.hourlyRate, row.specialAmount]), status: row.settlementStatus, amount: row.totalAmount })),
    ...(data.commissions || []).map(row => ({ key: 'COMMISSION:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'COMMISSION', typeLabel: tr('佣金'), businessDate: row.orderDate, postingDate: row.orderDate, accountId: row.accountId, platform: row.platform, accountLabel: row.accountLabel, description: (row.status === 'REFUNDED' ? tr('已退款 · ') : '') + row.orderNo, status: row.settlementStatus, amount: row.status === 'NORMAL' ? row.commissionAmount : 0 })),
    ...(data.adjustments || []).map(row => ({ key: 'ADJUSTMENT:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'ADJUSTMENT', typeLabel: tr('调整'), businessDate: row.streamDate, postingDate: row.postingDate, accountId: row.accountId, platform: row.platform, accountLabel: row.accountLabel, description: row.reason, status: row.status, amount: row.amount })),
    ...(data.manualAdjustments || []).map(row => ({ key: 'MANUAL:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'MANUAL', typeLabel: tr('薪酬调整'), businessDate: row.businessDate, postingDate: row.postingDate || row.businessDate, accountId: row.accountId, platform: row.platform, accountLabel: row.accountLabel, description: manualDescription(row, tr), status: row.settlementStatus, amount: row.amount, manualAdjustment: row }))
  ]
}
export function selectedSettlementIds(rows) {
  return {
    streamIds: rows.filter(row => row.type === 'STREAM').map(row => row.id),
    commissionIds: rows.filter(row => row.type === 'COMMISSION').map(row => row.id),
    adjustmentIds: rows.filter(row => row.type === 'ADJUSTMENT').map(row => row.id),
    manualAdjustmentIds: rows.filter(row => row.type === 'MANUAL').map(row => row.id)
  }
}

export function selectedSettlementScope(rows, dateRange) {
  const employeeId = rows[0]?.employeeId
  if (employeeId == null || rows.some(row => String(row.employeeId) !== String(employeeId))) {
    throw new Error('每次结算请选择同一主播的明细')
  }
  const dates = rows.map(row => row.postingDate || row.businessDate)
  if (dates.some(date => !date)) throw new Error('所选明细缺少日期，请重新查询')
  dates.sort()
  return { employeeId, startDate: dateRange?.[0] || dates[0], endDate: dateRange?.[1] || dates[dates.length - 1] }
}

function manualDescription(row, tr) {
  let details = []
  try { details = JSON.parse(row.specialDetails || '[]') } catch (_) { /* 旧快照仍可显示总额和备注。 */ }
  return [...details.map(item => `${item.typeName || tr('特殊金额')} ${Number(item.amount).toFixed(2)}${item.remark ? '（' + item.remark + '）' : ''}`), row.remark].filter(Boolean).join('；')
}

function defaultText(text, values = []) { return text.replace(/\{(\d+)\}/g, (match, index) => values[index] == null ? match : String(values[index])) }

// IDs remain strings to preserve bigint employee/source identity.
export function selectedSettlementGroups(rows, dateRange) {
  const groups = new Map()
  for (const row of rows) {
    if (row.employeeId == null) throw new Error('所选明细缺少主播，请重新查询')
    const key = String(row.employeeId)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return [...groups.values()].map(items => ({ ...selectedSettlementScope(items, dateRange), ...selectedSettlementIds(items) }))
}

const hostCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: false })
export function sortSettlementCandidates(rows, { prop, order } = {}) {
  if (!order || !['employeeName', 'businessDate', 'postingDate'].includes(prop)) return rows
  const direction = order === 'descending' ? -1 : 1
  return [...rows].sort((a, b) => {
    const left = String(a[prop] || ''), right = String(b[prop] || '')
    if (!left || !right) return left ? -1 : right ? 1 : 0
    const comparison = prop === 'employeeName' ? hostCollator.compare(left, right) : left.localeCompare(right)
    return direction * comparison
  })
}
