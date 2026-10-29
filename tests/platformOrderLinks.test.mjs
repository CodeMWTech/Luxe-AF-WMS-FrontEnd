import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import * as vue from 'vue'

const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const source = path => readFile(new URL('../src/' + path, import.meta.url), 'utf8')
const urlsUrl = moduleUrl(await source('utils/platformOrderLink.js'))
const { getPlatformOrderExternalUrl: externalUrl } = await import(urlsUrl)
const { createOrderLinkLoader, orderLinkKey } = await import(moduleUrl((await source('views/wms/vendor/platformOrderLinks.js')).replace("'@/utils/platformOrderLink'", JSON.stringify(urlsUrl))))
const vendor = await source('views/wms/vendor/index.vue')
const order = (orderId = 'order-1', extra = {}) => ({ orderId, platform: 'EBAY', shopAuthId: 'shop-1', ...extra })
const shops = [{ id: 'shop-1', region: 'US', shopId: 'luxe.myshopify.com' }]
const response = rows => ({ rows, total: rows.length })
const tick = async () => { await vue.nextTick(); await new Promise(resolve => setImmediate(resolve)) }

function harness(t, { allowed = true, supplier = false, listOrders = async q => response([order(q.platformOrderId)]), listShops = async () => ({ data: shops }) } = {}) {
  const scope = vue.effectScope()
  t.after(() => scope.stop())
  const identityResolved = vue.ref(true), isSupplierUser = vue.ref(supplier), permission = vue.ref(allowed)
  const previewVisible = vue.ref(false), previewPageLines = vue.ref([]), calls = [], messages = []
  const proxy = { $auth: { hasPermi: () => permission.value }, $modal: { msgWarning: value => messages.push(value), msgSuccess: value => messages.push(value) } }
  const body = vendor.slice(vendor.indexOf('function orderNumberLinks(row)'), vendor.indexOf('function removeForcedLine('))
  const model = scope.run(() => new Function('computed', 'reactive', 'watch', 'identityResolved', 'isSupplierUser', 'proxy', 'previewVisible', 'previewPageLines', 'createOrderLinkLoader', 'orderLinkKey', 'listPlatformOrders', 'listAllPlatformShops', 'text', body + ';return { orderNumberLinks, platformOrderLinkState, platformOrderLinkLoader, handlePlatformOrderLinkClick, platformOrderLinkHint }')(
    vue.computed, vue.reactive, vue.watch, identityResolved, isSupplierUser, proxy, previewVisible, previewPageLines,
    createOrderLinkLoader, orderLinkKey, async q => { calls.push(q); return listOrders(q) }, listShops, (zh, en) => en))
  return { ...model, identityResolved, isSupplierUser, permission, previewVisible, previewPageLines, calls, messages }
}

// The shared utility retains the existing platform page's region and URL rules.
test('eBay uses the authorized shop region and retains its return-to-orders URL', () => {
  const url = new URL(externalUrl(order('17-15108-45628', { regionCode: 'US' }), [{ id: 'shop-1', region: 'GB' }]))
  assert.equal(url.origin + url.pathname, 'https://www.ebay.co.uk/mesh/ord/details')
  assert.equal(url.searchParams.get('orderid'), '17-15108-45628')
  const back = new URL(url.searchParams.get('ru'))
  assert.equal(back.searchParams.get('search'), 'ordernumber:17-15108-45628')
  assert.equal(back.searchParams.get('filter'), 'status:ALL_ORDERS')
})

test('TikTok retains regional seller hosts, shop region and encoded order numbers', () => {
  for (const [region, host, shopRegion] of [
    ['US', 'seller-us.tiktok.com', 'US'], ['UNITED_STATES', 'seller-us.tiktok.com', 'US'],
    ['UK', 'seller-uk.tiktok.com', 'GB'], ['DE', 'seller.eu.tiktokglobalshop.com', 'DE'],
    ['SG', 'seller.tiktokglobalshop.com', 'SG'], ['JP', 'seller.tiktok.com', 'JP']
  ]) {
    const url = new URL(externalUrl(order('one & two', { platform: 'TIKTOK' }), [{ id: 'shop-1', region }]))
    assert.equal(url.hostname, host)
    assert.equal(url.searchParams.get('order_no'), 'one & two')
    assert.equal(url.searchParams.get('shop_region'), shopRegion)
  }
  assert.match(externalUrl(order('123', { platform: 'TIKTOK' })), /seller-us/)
})

test('Whatnot opens Shopify with the numeric Shopify ID, including saved-shop fallback', () => {
  const whatnot = order('whatnot-123', { platform: 'SHOPIFY', shopifyOrderId: '9007199254740993001' })
  assert.equal(externalUrl(whatnot, shops), 'https://admin.shopify.com/store/luxe/orders/9007199254740993001')
  assert.equal(externalUrl({ ...whatnot, platformShopId: 'saved.myshopify.com' }), 'https://admin.shopify.com/store/saved/orders/9007199254740993001')
  assert.equal(externalUrl({ ...whatnot, shopifyOrderId: null }, shops), '')
  assert.equal(externalUrl(whatnot), '')
  assert.equal(externalUrl(order('', { platform: 'EBAY' })), '')
  assert.equal(externalUrl(order('123', { platform: 'UNKNOWN' })), '')
})

test('loader deduplicates pending work, caches URLs and queries the exact order and SKU', async () => {
  const calls = [], shopCalls = []
  const loader = createOrderLinkLoader({ listOrders: async q => { calls.push(q); return response([order(q.platformOrderId), order(q.platformOrderId)]) }, listShops: async () => { shopCalls.push(1); return { data: shops } } })
  const first = loader.load(' G118 ', ' order-1 ')
  assert.equal(first, loader.load('G118', 'order-1'))
  assert.equal(loader.states.get(orderLinkKey('G118', 'order-1')).status, 'loading')
  assert.equal((await first).status, 'ready')
  await loader.load('G118', 'order-1')
  await loader.load('G119', 'order-1')
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], { platformOrderId: 'order-1', sellerSku: 'G118', supplierSalesOnly: true, shipmentStatus: 'FINISH', pageNum: 1, pageSize: 50 })
  assert.equal(calls[1].sellerSku, 'G119')
  assert.equal(shopCalls.length, 1)
})

test('all pages are checked for different orders; repeated SKU rows alone are safe', async () => {
  const calls = []
  const loader = createOrderLinkLoader({ listOrders: async q => {
    calls.push(q.pageNum)
    return q.pageNum === 1 ? { rows: Array.from({ length: 50 }, () => order()), total: 51 }
      : { rows: [order('order-1', { shopAuthId: 'other-shop' })], total: 51 }
  }, listShops: async () => ({ data: shops }) })
  assert.deepEqual(await loader.load('G118', 'order-1'), { status: 'error', reason: 'AMBIGUOUS' })
  assert.deepEqual(calls, [1, 2])
  for (const second of [order('order-1', { platform: 'TIKTOK' }), order('order-1', { shopifyOrderId: 'different' })]) {
    const ambiguous = createOrderLinkLoader({ listOrders: async () => response([order(), second]), listShops: async () => ({ data: shops }) })
    assert.equal((await ambiguous.load('G118', 'order-1')).reason, 'AMBIGUOUS')
  }
})

test('missing data and request failures never generate a guessed link; retry recovers', async () => {
  for (const [rows, reason] of [[[], 'NOT_FOUND'], [[order('different')], 'NOT_FOUND'], [[order('order-1', { platform: 'SHOPIFY' })], 'MISSING']]) {
    const loader = createOrderLinkLoader({ listOrders: async () => response(rows), listShops: async () => ({ data: shops }) })
    assert.deepEqual(await loader.load('G118', 'order-1'), { status: 'error', reason })
  }
  let fail = true
  const loader = createOrderLinkLoader({ listOrders: async () => { if (fail) throw new Error('network'); return response([order()]) }, listShops: async () => ({ data: shops }) })
  assert.equal((await loader.load('G118', 'order-1')).reason, 'QUERY_FAILED')
  fail = false
  assert.equal((await loader.load('G118', 'order-1')).status, 'ready')
  let shopFail = true
  const shopLoader = createOrderLinkLoader({ listOrders: async () => response([order()]), listShops: async () => { if (shopFail) throw new Error('network'); return { data: shops } } })
  assert.equal((await shopLoader.load('G118', 'order-1')).reason, 'QUERY_FAILED')
  shopFail = false
  assert.equal((await shopLoader.load('G118', 'order-1')).status, 'ready')
  assert.equal((await loader.load('', 'order-1')).reason, 'MISSING')
})

test('preloading limits concurrent order requests', async () => {
  let active = 0, peak = 0
  const loader = createOrderLinkLoader({ listOrders: async q => {
    active++; peak = Math.max(active, peak)
    await new Promise(resolve => setImmediate(resolve))
    active--
    return response([order(q.platformOrderId)])
  }, listShops: async () => ({ data: shops }) })
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => loader.load('G118', 'order-' + i)))
  assert.equal(peak, 4)
  assert.ok(results.every(row => row.status === 'ready'))
})

test('visible settlement pages preload every order and ready clicks use native navigation', async t => {
  const h = harness(t)
  assert.deepEqual(h.orderNumberLinks({ platformSoldOrderNumbers: 'one, two, one, ' }), ['one', 'two'])
  h.previewPageLines.value = [{ skuCode: 'G118', platformSoldOrderNumbers: 'one, two, one' }]
  await tick()
  assert.equal(h.calls.length, 0)
  h.previewVisible.value = true
  await tick()
  assert.equal(h.calls.length, 2)
  assert.equal(h.platformOrderLinkState({ skuCode: 'G118' }, 'one').status, 'ready')
  let prevented = false
  await h.handlePlatformOrderLinkClick({ preventDefault() { prevented = true } }, { skuCode: 'G118' }, 'one')
  assert.equal(prevented, false)
  h.previewPageLines.value = [{ skuCode: 'G119', platformSoldOrderNumbers: 'three' }]
  await tick()
  assert.equal(h.calls.length, 3)
  assert.equal(h.calls[2].sellerSku, 'G119')
  h.previewVisible.value = false
  h.previewPageLines.value = [{ skuCode: 'G120', platformSoldOrderNumbers: 'four' }]
  await tick()
  assert.equal(h.calls.length, 3)
})

test('supplier identity and platform permission guard both preloads and clicks', async t => {
  for (const settings of [{ allowed: false }, { supplier: true }]) {
    const h = harness(t, settings)
    h.previewPageLines.value = [{ skuCode: 'G118', platformSoldOrderNumbers: 'one' }]
    h.previewVisible.value = true
    await tick()
    assert.equal(h.calls.length, 0)
    let prevented = false
    await h.handlePlatformOrderLinkClick({ preventDefault() { prevented = true } }, { skuCode: 'G118' }, 'one')
    assert.equal(prevented, true)
    assert.equal(h.calls.length, 0)
  }
})

test('failed links show a reason and retry without asynchronous window.open', async t => {
  let fail = true
  const h = harness(t, { listOrders: async q => { if (fail) throw new Error('network'); return response([order(q.platformOrderId)]) } })
  h.previewPageLines.value = [{ skuCode: 'G118', platformSoldOrderNumbers: 'one' }]
  h.previewVisible.value = true
  await tick()
  assert.match(h.platformOrderLinkHint({ skuCode: 'G118' }, 'one'), /Could not load.*retry/)
  fail = false
  let prevented = false
  await h.handlePlatformOrderLinkClick({ preventDefault() { prevented = true } }, { skuCode: 'G118' }, 'one')
  assert.equal(prevented, true)
  assert.equal(h.platformOrderLinkState({ skuCode: 'G118' }, 'one').status, 'ready')
  assert.match(h.messages[0], /Link ready/)
})

test('both order page templates compile with native new-tab external links', async () => {
  for (const file of ['views/wms/vendor/index.vue', 'views/wms/platform/orders/index.vue']) {
    const { descriptor, errors } = parse(await source(file))
    assert.deepEqual(errors, [])
    compileScript(descriptor, { id: 'order-link-test' })
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: 'order-link-test' }).errors, [])
  }
})
