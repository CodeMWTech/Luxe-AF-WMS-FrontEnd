/** 周转数值与状态分开；禁止用0代替无法计算，也不在前端推断入出库业务类型。 */
export function formatTurnoverDays(row, translate = value => value) {
  if (row?.turnoverDays !== null && row?.turnoverDays !== undefined) return row.turnoverDays
  return row?.turnoverStatus === 'NON_SALES_OUTBOUND'
    ? translate('非销售出库，无法统计') : '--'
}
