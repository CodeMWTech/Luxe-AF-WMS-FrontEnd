/** 周转数值与状态分开；禁止用0代替无法计算，也不在前端推断入出库业务类型。 */
export function formatTurnoverDays(row, translate = value => value) {
  if (row?.turnoverDays !== null && row?.turnoverDays !== undefined) return row.turnoverDays
  return row?.turnoverStatus === 'NON_SALES_OUTBOUND'
    ? translate('非销售出库，无法统计') : '--'
}

/** 计算依据只读取后端独立字段，不能用库位展示时间或浏览器本地日期替代。 */
export function turnoverExplanation(row, translate = value => value) {
  const tr = translate
  const reason = { MISSING_RECEIPT: '缺少有效入库记录', MISSING_PURCHASE: '缺少有效入库记录',
    MISSING_SALES: '缺少有效销售清零记录', NON_SALES_OUTBOUND: '非销售出库，无法统计' }[row?.turnoverStatus]
  const endLabels = { CURRENT_DATE: '当前统计日期', SNAPSHOT_DATE: '快照统计日期', SALES_CLEARANCE: '销售出库后全部库存清零' }
  const end = row?.turnoverEndTime
  const endValue = end && row?.turnoverEndType !== 'SALES_CLEARANCE' ? String(end).slice(0, 10) : end
  return [
    `${tr('计算起点')}：${row?.turnoverStartTime || '--'}${row?.turnoverStartTime ? `（${tr('首次实际入库')}）` : ''}`,
    `${tr('计算终点')}：${endValue || '--'}${end && endLabels[row?.turnoverEndType] ? `（${tr(endLabels[row.turnoverEndType])}）` : ''}`,
    ...(reason ? [tr(reason)] : []),
    tr('跨仓库连续计算，内部调货、退货再入库不重置起点。')
  ]
}
