export function itemThumbnail(row) {
  const images = row?.item?.images || row?.item?.imageList || []
  const main = images.find(image => image.isMain) || images[0]
  return main?.thumbUrl || main?.url || row?.itemImage || ''
}
export function requestShowResolution(id) {
  window.dispatchEvent(new CustomEvent('live-show:process', { detail: String(id) }))
}
export function showResultsPayload(order, choices, responsible, delegationReason = '') {
  const items = (order?.details || []).map(row => ({ detailId: row.id, result: choices[String(row.id)] }))
  if (!items.length || items.some(item => !['SOLD', 'RETURNED'].includes(item.result))) throw new Error('请为全部商品选择处理结果')
  if (items.some(item => item.result === 'RETURNED') && !responsible) throw new Error('请确认对还货结果负责')
  const reason = String(delegationReason || '').trim()
  if (order.showDelegationRequired && (!reason || [...reason].length > 500)) throw new Error('代处理原因必填且不能超过500个字符')
  return { version: order.version, items, returnResponsibilityConfirmed: responsible, delegationReason: order.showDelegationRequired ? reason : undefined }
}
