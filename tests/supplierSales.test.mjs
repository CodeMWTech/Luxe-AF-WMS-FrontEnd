import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = async path => readFile(new URL('../src/' + path, import.meta.url), 'utf8')
const platform = await source('views/wms/platform/orders/index.vue')
const shipment = await source('views/wms/order/shipment/index.vue')
const vendor = await source('views/wms/vendor/index.vue')

function routeHarness(text, functionName, endMarker, initial = {}) {
  const body = text.slice(text.indexOf('function ' + functionName + '()'), text.indexOf(endMarker, text.indexOf('function ' + functionName + '()')))
  const route = { query: {} }, queryParams = { value: { ...initial } }
  const appliedRouteFilterKey = { value: '' }, pendingSkuMissHint = { value: false }
  const apply = new Function('route', 'queryParams', 'appliedRouteFilterKey', 'pendingSkuMissHint', body + ';return ' + functionName)(route, queryParams, appliedRouteFilterKey, pendingSkuMissHint)
  return { route, queryParams, apply }
}

test('supplier links request completed sales rather than platform delivery status', () => {
  const targets = new Function(vendor.slice(vendor.indexOf('const skuPageTargets ='), vendor.indexOf('function canOpenSkuPage')) + ';return skuPageTargets')()
  assert.deepEqual(targets.platformSold.query, { supplierSalesOnly: 'true', shipmentStatus: 'FINISH' })
  assert.deepEqual(targets.offPlatformSold.query, { orderStatus: '1', optType: '2', salesSource: 'OFF_PLATFORM' })
})

test('platform sales route removes stale shop/date/status filters and resets for an order link', () => {
  const h = routeHarness(platform, 'applyRouteFilter', 'const syncForm', {
    platform: 'TIKTOK', shopAuthId: 123, orderStatus: 'DELIVERED',
    orderCreateTimeRange: ['old', 'date'], skuMatched: 'UNMATCHED', shipmentOrderNo: 'old'
  })
  h.route.query = { skuCode: 'G118', supplierSalesOnly: 'true' }
  assert.equal(h.apply(), true)
  assert.equal(h.queryParams.value.supplierSalesOnly, true)
  assert.equal(h.queryParams.value.shipmentStatus, 'FINISH')
  assert.equal(h.queryParams.value.sellerSku, 'G118')
  assert.equal(h.queryParams.value.orderStatus, undefined)
  assert.equal(h.queryParams.value.shopAuthId, undefined)
  assert.equal(h.queryParams.value.shipmentOrderNo, undefined)
  assert.equal(h.queryParams.value.platform, '')
  assert.equal(h.queryParams.value.skuMatched, '')
  assert.deepEqual(h.queryParams.value.orderCreateTimeRange, [])
  assert.equal(h.apply(), false)
  h.route.query = { platformOrderId: '17-15108-45628' }
  assert.equal(h.apply(), true)
  assert.equal(h.queryParams.value.supplierSalesOnly, undefined)
  assert.equal(h.queryParams.value.sellerSku, undefined)
})

test('platform sales scope is not retained by unrelated SKU or unfiltered navigation', () => {
  const h = routeHarness(platform, 'applyRouteFilter', 'const syncForm')
  h.route.query = { skuCode: 'G118', supplierSalesOnly: 'true' }; h.apply()
  h.route.query = { skuCode: 'G116' }; h.apply()
  assert.equal(h.queryParams.value.supplierSalesOnly, undefined)
  h.route.query = { skuCode: 'G118', supplierSalesOnly: 'true' }; h.apply()
  h.route.query = {}; assert.equal(h.apply(), true)
  assert.equal(h.queryParams.value.supplierSalesOnly, undefined)
})

test('off-platform drill-down enforces completed sales and clears stale filters', () => {
  const h = routeHarness(shipment, 'applyRouteSkuFilter', 'const tr =', { optType: 3, orderStatus: 0, merchantId: 9 })
  h.route.query = { skuCode: 'G118', salesSource: 'OFF_PLATFORM', orderStatus: '1', optType: '2' }
  assert.equal(h.apply(), true)
  assert.equal(h.queryParams.value.optType, 2)
  assert.equal(h.queryParams.value.orderStatus, 1)
  assert.equal(h.queryParams.value.salesSource, 'OFF_PLATFORM')
  assert.equal(h.queryParams.value.merchantId, undefined)
  h.route.query = { orderNo: 'another' }; h.apply()
  assert.equal(h.queryParams.value.salesSource, undefined)
  assert.equal(h.queryParams.value.optType, -1)
})

test('shipment type rename covers cached and fetched dictionaries without changing receipt labels', async () => {
  const dict = await source('utils/dict.js')
  const payroll = 'data:text/javascript;base64,' + Buffer.from(await source('locales/live-payroll.js')).toString('base64')
  const runtime = (await source('locales/runtime-map.js')).replace("'./live-payroll'", JSON.stringify(payroll))
  const { translateByMap } = await import('data:text/javascript;base64,' + Buffer.from(runtime).toString('base64'))
  const settings = { language: 'zh-cn' }, cache = new Map(), watchers = []
  const old = [{ label: '生产出库', value: '3' }, { label: '销售出库', value: '2' }]
  cache.set('wms_shipment_type', old)
  cache.set('wms_receipt_type', [{ label: '生产入库', value: '1' }])
  const body = dict.replace(/^import .*$/gm, '').replace('export function useDict', 'function useDict')
  const useDict = new Function('useDictStore', 'getDicts', 'useSettingsStore', 'translateByMap', 'ref', 'toRefs', 'watch', body + ';return useDict')(
    () => ({ getDict: k => cache.get(k), setDict: (k,v) => cache.set(k,v) }),
    async () => ({ data: [{ dictLabel: '生产出库', dictValue: '3' }] }),
    () => settings, translateByMap, value => ({value}), value => value, (get, fn) => watchers.push(fn)
  )
  const result = useDict('wms_shipment_type', 'wms_receipt_type')
  assert.equal(result.wms_shipment_type[0].label, '调整价格出库')
  assert.equal(result.wms_shipment_type[0].value, '3')
  assert.equal(result.wms_receipt_type[0].label, '生产入库')
  assert.equal(old[0].label, '生产出库')
  settings.language = 'en'; watchers.forEach(fn => fn())
  assert.equal(result.wms_shipment_type[0].label, 'Price Adjustment Outbound')
  settings.language = 'zh-cn'; cache.delete('wms_shipment_type')
  const fresh = useDict('wms_shipment_type'); await Promise.resolve()
  assert.equal(fresh.wms_shipment_type[0].label, '调整价格出库')
})


test('reopening the same supplier link after changing filters restores its sales scope', () => {
  const p = routeHarness(platform, 'applyRouteFilter', 'const syncForm')
  p.route.query = { skuCode: 'G118', supplierSalesOnly: 'true' }; p.apply()
  p.queryParams.value.shopAuthId = 42
  p.queryParams.value.orderStatus = 'DELIVERED'
  assert.equal(p.apply(), true)
  assert.equal(p.queryParams.value.shopAuthId, undefined)
  assert.equal(p.queryParams.value.orderStatus, undefined)
  const s = routeHarness(shipment, 'applyRouteSkuFilter', 'const tr =')
  s.route.query = { skuCode: 'G118', salesSource: 'OFF_PLATFORM' }; s.apply()
  s.queryParams.value.salesSource = undefined
  s.queryParams.value.optType = -1
  assert.equal(s.apply(), true)
  assert.equal(s.queryParams.value.salesSource, 'OFF_PLATFORM')
  assert.equal(s.queryParams.value.optType, 2)
})
