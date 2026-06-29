export function displayValue(value) {
  if (value === null || value === undefined || value === '') return '--'
  return value
}

export function formatMoney(value) {
  if (value === null || value === undefined) return '--'
  const n = Number(value)
  if (!Number.isFinite(n)) return '--'
  return n.toFixed(2)
}

export function formatTime(value) {
  if (!value) return '--'
  const text = String(value)
  return text.length >= 16 ? text.slice(0, 16) : text
}

export function pickField(source, ...keys) {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (value !== null && value !== undefined && value !== '') {
      return value
    }
  }
  return undefined
}

export function getInventoryStatusText(quantity) {
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty <= 0) return '无库存'
  return `在库 ${qty}`
}

export function normalizeInventorySearchRow(row = {}) {
  const quantity = Number(row.quantity)
  return {
    skuId: row.skuId,
    itemId: row.itemId,
    skuCode: pickField(row, 'skuCode'),
    itemName: pickField(row, 'itemName'),
    brandName: pickField(row, 'brandName'),
    modelName: pickField(row, 'modelName'),
    itemCondition: pickField(row, 'itemCondition'),
    quantity: Number.isFinite(quantity) ? quantity : 0,
    itemImage: pickField(row, 'itemImage', 'mainThumbUrl'),
    warehouseName: pickField(row, 'warehouseName'),
    inventoryStatus: getInventoryStatusText(row.quantity),
    currentStatus: displayValue(pickField(row, 'itemCondition', 'statusText')),
    source: 'inventory',
    raw: row
  }
}

export function normalizeSkuSearchRow(raw = {}) {
  const item = raw.item || {}
  const itemSku = raw.itemSku || {}
  const skuId = raw.skuId ?? raw.id ?? itemSku.id
  return {
    skuId,
    itemId: item.id ?? raw.itemId,
    skuCode: pickField(itemSku, 'skuCode') || pickField(raw, 'skuCode'),
    itemName: pickField(item, 'itemName') || pickField(raw, 'itemName'),
    brandName: pickField(item, 'brandName') || pickField(raw, 'brandName'),
    modelName: pickField(item, 'modelName') || pickField(raw, 'modelName'),
    itemCondition: pickField(item, 'itemCondition') || pickField(raw, 'itemCondition'),
    quantity: 0,
    itemImage: pickField(item, 'mainThumbUrl', 'itemImage'),
    warehouseName: undefined,
    inventoryStatus: '未入库',
    currentStatus: displayValue(pickField(item, 'itemCondition')),
    source: 'sku',
    raw
  }
}

export function buildDetailViewModel(payload = {}, images = []) {
  const item = payload.item || payload
  const sku = payload.itemSku || payload
  const merged = { ...payload, ...item, ...sku }
  const imageList = images.length
    ? images
    : (item.images || item.imageList || []).length
      ? (item.images || item.imageList)
      : pickField(merged, 'itemImage')
        ? [{ url: merged.itemImage, thumbUrl: merged.itemImage, isMain: 1 }]
        : []

  return {
    skuId: pickField(sku, 'id', 'skuId') || pickField(merged, 'skuId'),
    itemId: pickField(item, 'id', 'itemId') || pickField(merged, 'itemId'),
    skuCode: pickField(sku, 'skuCode') || pickField(merged, 'skuCode'),
    itemName: pickField(item, 'itemName') || pickField(merged, 'itemName'),
    brandName: pickField(item, 'brandName') || pickField(merged, 'brandName'),
    modelName: pickField(item, 'modelName') || pickField(merged, 'modelName'),
    itemCondition: pickField(item, 'itemCondition') || pickField(merged, 'itemCondition'),
    defect: pickField(item, 'defect') || pickField(merged, 'defect'),
    remark: pickField(item, 'remark', 'itemRemark') || pickField(merged, 'remark', 'itemRemark'),
    quantity: pickField(merged, 'quantity'),
    warehouseName: pickField(merged, 'warehouseName'),
    receiptTime: pickField(merged, 'receiptTime'),
    shipmentTime: pickField(merged, 'shipmentTime'),
    outboundPlatform: pickField(merged, 'outboundPlatform'),
    turnoverDays: pickField(merged, 'turnoverDays'),
    costPrice: pickField(sku, 'costPrice') ?? pickField(merged, 'costPrice', 'avgReceiptCost'),
    sellingPrice: pickField(sku, 'sellingPrice') ?? pickField(merged, 'sellingPrice', 'avgShipmentPrice'),
    totalProfit: pickField(merged, 'totalProfit'),
    trackingNumber: pickField(merged, 'trackingNumber', 'itemTrackingNumber'),
    platformOrderNo: pickField(merged, 'platformOrderNo', 'orderNo', 'outboundOrderNo'),
    orderInfo: pickField(merged, 'orderInfo', 'platformOrderInfo'),
    images: imageList,
    raw: payload
  }
}
