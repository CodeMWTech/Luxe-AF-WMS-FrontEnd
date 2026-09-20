export function specialCategory(item, types) {
  return types.find(type => String(type.id) === String(item.typeId))?.category || item.category
}
export function isSpecialAmountEmpty(item) {
  return item.amount === null || item.amount === undefined || item.amount === ''
}
export function normalizeSpecialInput(item, types) {
  const type = types.find(type => String(type.id) === String(item.typeId))
  if (type) item.typeId = type.id
  if (['DEDUCTION', 'SUBSIDY'].includes(specialCategory(item, types)) && Number(item.amount) < 0) item.amount = Math.abs(Number(item.amount))
}
export function signedSpecialAmount(item, types) {
  if (isSpecialAmountEmpty(item)) return 0
  const amount = Number(item.amount)
  if (!Number.isFinite(amount)) return 0
  const category = specialCategory(item, types)
  if (category === 'DEDUCTION') return -Math.abs(amount)
  if (category === 'SUBSIDY') return Math.abs(amount)
  return amount
}
export function specialTotal(items, types) {
  return items.reduce((sum, item) => sum + Math.round(signedSpecialAmount(item, types) * 100), 0) / 100
}
export function serializeSpecialDetails(items, types) {
  return JSON.stringify(items.map(item => ({ typeId: item.typeId, amount: signedSpecialAmount(item, types), remark: item.remark || '' })))
}
