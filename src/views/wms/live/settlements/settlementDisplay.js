export function flattenSettlement(data) {
  return [
    ...(data.streams || []).map(row => ({ key: 'STREAM:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'STREAM', typeLabel: '开播', businessDate: row.streamDate, postingDate: row.streamDate, accountLabel: row.accountLabel, description: `${row.durationHours} 小时 × ${row.hourlyRate}；特殊金额 ${row.specialAmount}`, status: row.settlementStatus, amount: row.totalAmount })),
    ...(data.commissions || []).map(row => ({ key: 'COMMISSION:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'COMMISSION', typeLabel: '佣金', businessDate: row.orderDate, postingDate: row.orderDate, accountLabel: row.accountLabel, description: (row.status === 'REFUNDED' ? '已退款 · ' : '') + row.orderNo, status: row.settlementStatus, amount: row.status === 'NORMAL' ? row.commissionAmount : 0 })),
    ...(data.adjustments || []).map(row => ({ key: 'ADJUSTMENT:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'ADJUSTMENT', typeLabel: '调整', businessDate: row.streamDate, postingDate: row.postingDate, accountLabel: row.accountLabel, description: row.reason, status: row.status, amount: row.amount })),
    ...(data.manualAdjustments || []).map(row => ({ key: 'MANUAL:' + row.id, id: row.id, employeeId: row.employeeId, employeeName: row.employeeName, type: 'MANUAL', typeLabel: '薪酬调整', businessDate: row.businessDate, postingDate: row.postingDate || row.businessDate, accountLabel: row.accountLabel, description: manualDescription(row), status: row.settlementStatus, amount: row.amount, manualAdjustment: row }))
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

function manualDescription(row) {
  let details = []
  try { details = JSON.parse(row.specialDetails || '[]') } catch (_) { /* 旧快照仍可显示总额和备注。 */ }
  return [...details.map(item => `${item.typeName || '特殊金额'} ${Number(item.amount).toFixed(2)}${item.remark ? '（' + item.remark + '）' : ''}`), row.remark].filter(Boolean).join('；')
}
