import { listShipmentOrder } from '@/api/wms/shipmentOrder'

export function displayValue(value) {
  if (value === null || value === undefined || value === '') return '--'
  return value
}

/** 与后端 BusinessTimeUtils 一致：业务日按美西时区 */
const BUSINESS_TIME_ZONE = 'America/Los_Angeles'

function toDateOnlyParts(value) {
  if (!value) return null
  const text = String(value).trim()
  // 优先取日期部分，与 SQL date(receipt_time) 对齐，忽略时分秒
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const year = Number(parts.find(p => p.type === 'year')?.value)
  const month = Number(parts.find(p => p.type === 'month')?.value)
  const day = Number(parts.find(p => p.type === 'day')?.value)
  if (![year, month, day].every(Number.isFinite)) return null
  return { year, month, day }
}

function toUtcDay(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day)
}

function businessTodayParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  return {
    year: Number(parts.find(p => p.type === 'year')?.value),
    month: Number(parts.find(p => p.type === 'month')?.value),
    day: Number(parts.find(p => p.type === 'day')?.value)
  }
}

/**
 * 周转天数口径（对齐库存看板 SQL）：
 * 1) 无入库时间 → 无法计算
 * 2) 库存未清零 → 今天 - 入库日期
 * 3) 库存已清零且有出库 → 出库日期 - 入库日期
 * 4) 库存已清零但无出库 → 无法计算
 */
export function computeTurnoverDays(receiptTime, shipmentTime, quantity) {
  const receipt = toDateOnlyParts(receiptTime)
  if (!receipt) return undefined

  const qty = Number(quantity)
  const cleared = Number.isFinite(qty) && qty === 0

  if (!cleared) {
    const today = businessTodayParts()
    return Math.round((toUtcDay(today) - toUtcDay(receipt)) / 86400000)
  }

  const shipment = toDateOnlyParts(shipmentTime)
  if (!shipment) return undefined
  return Math.round((toUtcDay(shipment) - toUtcDay(receipt)) / 86400000)
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
  const skuId = raw.skuId ?? raw.id ?? raw.itemSkuId ?? itemSku.id
  return {
    skuId,
    itemId: item.id ?? raw.itemId,
    skuCode: pickField(itemSku, 'skuCode') || pickField(raw, 'skuCode'),
    itemName: pickField(item, 'itemName') || pickField(raw, 'itemName'),
    brandName: pickField(item, 'brandName') || pickField(raw, 'brandName'),
    modelName: pickField(item, 'modelName') || pickField(raw, 'modelName'),
    itemCondition: pickField(item, 'itemCondition') || pickField(raw, 'itemCondition'),
    costPrice: pickField(itemSku, 'costPrice') ?? pickField(raw, 'costPrice'),
    sellingPrice: pickField(itemSku, 'sellingPrice') ?? pickField(raw, 'sellingPrice'),
    quantity: 0,
    itemImage: pickField(item, 'mainThumbUrl', 'itemImage'),
    warehouseName: undefined,
    inventoryStatus: '商品已建档',
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
    categoryName: pickField(item, 'categoryName') || pickField(merged, 'categoryName'),
    brandName: pickField(item, 'brandName') || pickField(merged, 'brandName'),
    modelName: pickField(item, 'modelName') || pickField(merged, 'modelName'),
    materialName: pickField(item, 'materialName', 'material') || pickField(merged, 'materialName', 'material'),
    year: pickField(item, 'year') ?? pickField(merged, 'year'),
    accessories: pickField(item, 'accessories') || pickField(merged, 'accessories'),
    itemBrand: pickField(item, 'itemBrand') ?? pickField(merged, 'itemBrand'),
    itemCategory: pickField(item, 'itemCategory') ?? pickField(merged, 'itemCategory'),
    modelId: pickField(item, 'modelId') ?? pickField(merged, 'modelId'),
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

export function enrichDetailMetadata(detail, store) {
  if (!detail || !store) return detail
  const item = detail.raw?.item || {}
  const brandId = detail.itemBrand ?? item.itemBrand
  const categoryId = detail.itemCategory ?? item.itemCategory
  const modelId = detail.modelId ?? item.modelId

  if (!detail.brandName && brandId !== null && brandId !== undefined) {
    detail.brandName = store.itemBrandMap?.get?.(brandId)?.brandName
  }
  if (!detail.categoryName && categoryId !== null && categoryId !== undefined) {
    detail.categoryName = store.itemCategoryMap?.get?.(categoryId)?.categoryName
  }
  if (!detail.modelName && modelId !== null && modelId !== undefined) {
    detail.modelName = store.itemModelMap?.get?.(modelId)?.modelName
  }
  if (!detail.materialName) {
    detail.materialName = item.material || item.materialName
  }
  if (detail.year === null || detail.year === undefined || detail.year === '') {
    detail.year = item.year
  }
  if (!detail.accessories) {
    detail.accessories = item.accessories
  }
  return detail
}

export function mergeInventoryIntoDetail(detail, inventoryRow = {}) {
  if (!detail || !inventoryRow) return detail
  detail.quantity = pickField(inventoryRow, 'quantity') ?? detail.quantity
  detail.warehouseName = pickField(inventoryRow, 'warehouseName') ?? detail.warehouseName
  detail.receiptTime = pickField(inventoryRow, 'receiptTime') ?? detail.receiptTime
  detail.shipmentTime = pickField(inventoryRow, 'shipmentTime') ?? detail.shipmentTime
  detail.outboundPlatform = pickField(inventoryRow, 'outboundPlatform') ?? detail.outboundPlatform
  detail.turnoverDays = pickField(inventoryRow, 'turnoverDays') ?? detail.turnoverDays
  detail.totalProfit = pickField(inventoryRow, 'totalProfit') ?? detail.totalProfit
  detail.trackingNumber = pickField(inventoryRow, 'trackingNumber', 'itemTrackingNumber') ?? detail.trackingNumber
  detail.platformOrderNo = pickField(inventoryRow, 'platformOrderNo', 'orderNo', 'outboundOrderNo') ?? detail.platformOrderNo
  detail.avgReceiptCost = pickField(inventoryRow, 'avgReceiptCost')
  detail.avgShipmentPrice = pickField(inventoryRow, 'avgShipmentPrice')
  if ((detail.costPrice === null || detail.costPrice === undefined) && inventoryRow.costPrice !== undefined) {
    detail.costPrice = inventoryRow.costPrice
  }
  if ((detail.sellingPrice === null || detail.sellingPrice === undefined) && inventoryRow.sellingPrice !== undefined) {
    detail.sellingPrice = inventoryRow.sellingPrice
  }
  // 历史接口/部分库存接口不带周转天数时，按看板口径本地补算
  if (detail.turnoverDays === null || detail.turnoverDays === undefined) {
    detail.turnoverDays = computeTurnoverDays(detail.receiptTime, detail.shipmentTime, detail.quantity)
  }
  return detail
}

export const INVENTORY_HISTORY_ORDER_TYPE = {
  RECEIPT: '1',
  SHIPMENT: '2'
}

function resolveWarehouseName(warehouseId, warehouseMap) {
  if (warehouseId === null || warehouseId === undefined || !warehouseMap) return undefined
  return warehouseMap.get?.(warehouseId)?.warehouseName
}

function sortByCreateTimeDesc(rows = []) {
  return [...rows].sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0))
}

/** 从库存记录汇总入库/出库/当前库存（与桌面端「库存记录」同源） */
export function summarizeInventoryHistoryRows(rows = [], warehouseMap) {
  if (!Array.isArray(rows) || !rows.length) return null

  const receiptRows = sortByCreateTimeDesc(
    rows.filter(row => String(row.orderType) === INVENTORY_HISTORY_ORDER_TYPE.RECEIPT)
  )
  const shipmentRows = sortByCreateTimeDesc(
    rows.filter(row => String(row.orderType) === INVENTORY_HISTORY_ORDER_TYPE.SHIPMENT)
  )
  const latestRow = sortByCreateTimeDesc(rows)[0]
  const quantity = latestRow?.afterQuantity ?? latestRow?.beforeQuantity

  const quantityValue = quantity
  const receiptTime = receiptRows[0]?.createTime
  // 库存未清零时，看板强制不展示出库时间
  const shipmentTime = (Number(quantityValue) === 0) ? shipmentRows[0]?.createTime : undefined
  const shipmentOrderNo = (Number(quantityValue) === 0) ? shipmentRows[0]?.orderNo : undefined

  return {
    quantity: quantityValue,
    warehouseName: resolveWarehouseName(latestRow?.warehouseId, warehouseMap),
    receiptTime,
    shipmentTime,
    shipmentOrderNo,
    outboundPlatform: undefined,
    turnoverDays: computeTurnoverDays(receiptTime, shipmentTime, quantityValue)
  }
}

/** 出库平台：从出库单关联商户解析，不依赖 platform 订单表 */
export async function enrichOutboundPlatform(summary, merchantMap) {
  if (!summary?.shipmentOrderNo || !merchantMap) return summary

  try {
    const res = await listShipmentOrder({
      orderNo: summary.shipmentOrderNo,
      pageNum: 1,
      pageSize: 1
    })
    const order = res?.rows?.[0]
    if (order?.merchantId) {
      summary.outboundPlatform = merchantMap.get(order.merchantId)?.merchantName
    }
  } catch (_) {
    // ignore
  }

  const { shipmentOrderNo, ...rest } = summary
  return rest
}

export function summarizeInventoryRows(rows = []) {
  if (!Array.isArray(rows) || !rows.length) return null
  const totalQty = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
  const primary = rows[0]
  const warehouseNames = [...new Set(rows.map(row => row.warehouseName).filter(Boolean))]
  return {
    quantity: totalQty,
    warehouseName: warehouseNames.join('、') || primary.warehouseName,
    receiptTime: primary.receiptTime,
    shipmentTime: primary.shipmentTime,
    outboundPlatform: primary.outboundPlatform,
    turnoverDays: primary.turnoverDays,
    totalProfit: primary.totalProfit,
    costPrice: primary.costPrice,
    sellingPrice: primary.sellingPrice
  }
}
