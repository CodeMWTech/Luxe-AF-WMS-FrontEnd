import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/wms/platform/orders/index.vue', import.meta.url), 'utf8')
const itemFunctions = source.slice(source.indexOf('function getLineItems('), source.indexOf('function getCurrency('))
const detailFunction = source.slice(source.indexOf('async function ensureDetail('), source.indexOf('function handleQuery('))

function createHarness(detail) {
  const detailCache = {}
  const orderKey = order => String(order.id)
  const getOrderId = order => order.orderId || order.platformOrderId
  const getDisplayOrder = order => detailCache[orderKey(order)] || order
  const getPlatformOrder = async () => ({ data: detail })
  const factory = new Function(
    'detailCache', 'orderKey', 'getOrderId', 'getDisplayOrder', 'getPlatformOrder', 't',
    itemFunctions + detailFunction + '; return { ensureDetail, getSummaryItem, hasSkuIssue, hasNoStock, getSkuStatusText }')
  return { ...factory(detailCache, orderKey, getOrderId, getDisplayOrder, getPlatformOrder, key => key), detailCache }
}

const coa = { lineItemId: 'coa-line', sellerSku: 'COA', skuStatus: 'UNMATCHED' }
const bag = { lineItemId: 'bag-line', sellerSku: 'LV3025', skuStatus: 'IN_STOCK' }
const bagOrder = { id: 'bag-row', orderId: '1424502628', platform: 'SHOPIFY', shopAuthId: 'shop', lineItems: [bag] }
const detail = { ...bagOrder, id: 'coa-row', lineItems: [coa, bag] }

test('expanding LV3025 does not borrow the missing-SKU status of COA', async () => {
  const h = createHarness(detail)
  assert.equal(h.hasSkuIssue(bagOrder, 0), false)
  await h.ensureDetail(bagOrder, 0)
  assert.equal(h.getSummaryItem(bagOrder, 0).sellerSku, 'LV3025')
  assert.equal(h.getSkuStatusText(h.getSummaryItem(bagOrder, 0)), 'platformOrders.skuInStock')
  assert.equal(h.hasSkuIssue(bagOrder, 0), false)
  assert.equal(h.hasNoStock(bagOrder, 0), false)
  assert.equal(h.detailCache['bag-row'].id, 'bag-row', 'SKU editing must retain the selected database row')
  assert.equal(h.detailCache['bag-row'].lineItems.length, 2, 'order details must still include all items')
})

test('each card of the same order keeps its own SKU status after expansion', async () => {
  const h = createHarness(detail)
  const coaOrder = { ...bagOrder, id: 'coa-row', lineItems: [coa] }
  await h.ensureDetail(coaOrder, 0)
  await h.ensureDetail(bagOrder, 1)
  assert.equal(h.hasSkuIssue(coaOrder, 0), true)
  assert.equal(h.hasSkuIssue(bagOrder, 1), false)
  assert.equal(h.getSummaryItem(coaOrder, 0).sellerSku, 'COA')
})

test('the matching line can report no stock even when the first line has stock', async () => {
  const h = createHarness({ ...detail, lineItems: [{ ...coa, skuStatus: 'IN_STOCK' }, { ...bag, skuStatus: 'NO_STOCK' }] })
  await h.ensureDetail(bagOrder, 0)
  assert.equal(h.hasNoStock(bagOrder, 0), true)
  assert.equal(h.hasSkuIssue(bagOrder, 0), false)
})

test('duplicate SKU codes are matched by line ID, not by SKU or position', async () => {
  const h = createHarness({ ...detail, lineItems: [{ ...coa, sellerSku: 'LV3025' }, bag] })
  await h.ensureDetail(bagOrder, 0)
  assert.equal(h.hasSkuIssue(bagOrder, 0), false)
})

test('missing matching detail line retains the list item status', async () => {
  const h = createHarness({ ...detail, lineItems: [coa] })
  await h.ensureDetail(bagOrder, 0)
  assert.deepEqual(h.getSummaryItem(bagOrder, 0), bag)
  assert.equal(h.hasSkuIssue(bagOrder, 0), false)
})

test('missing list line ID never uses another item as a fallback', async () => {
  const withoutId = { ...bagOrder, lineItems: [{ ...bag, lineItemId: undefined }] }
  const h = createHarness(detail)
  await h.ensureDetail(withoutId, 0)
  assert.equal(h.hasSkuIssue(withoutId, 0), false)
  assert.equal(h.getSummaryItem(withoutId, 0).sellerSku, 'LV3025')
})

test('single-line eBay and TikTok cards accept matching detail status', async () => {
  for (const platform of ['EBAY', 'TIKTOK']) {
    const order = { ...bagOrder, platform, lineItems: [{ ...bag, lineItemId: 123 }] }
    const h = createHarness({ ...order, lineItems: [{ ...bag, lineItemId: '123', skuStatus: 'NO_STOCK' }] })
    await h.ensureDetail(order, 0)
    assert.equal(h.hasNoStock(order, 0), true)
    assert.equal(h.hasSkuIssue(order, 0), false)
  }
})

test('completed shipment still suppresses SKU warning badges', async () => {
  const order = { ...bagOrder, shipmentOrderId: 'shipment', shipmentOrderStatus: 1 }
  const h = createHarness({ ...order, lineItems: [{ ...bag, skuStatus: 'UNMATCHED' }] })
  await h.ensureDetail(order, 0)
  assert.equal(h.hasSkuIssue(order, 0), false)
  assert.equal(h.hasNoStock(order, 0), false)
})
