import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/wms/platform/listings/components/WhatnotShopFields.vue', import.meta.url), 'utf8')
const script = source.split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm, '')
const utilsSource = await readFile(new URL('../src/utils/listingPlatform.js', import.meta.url), 'utf8')
const utils = await import('data:text/javascript;base64,' + Buffer.from(utilsSource).toString('base64'))
const available = () => ({ auctionPrice: { available: true }, buyItNowPrice: { available: true }, category: { available: true, fixed: true, value: 'gid://shopify/Metaobject/9', name: 'Luxury Bags & Accessories' }, warnings: [] })

function harness(overrides = {}, apis = {}) {
  const form = { platform: 'SHOPIFY', shopId: 1, listingType: 'AUCTION', whatnotAuctionPrice: 1, whatnotBuyItNowPrice: null, whatnotAuctionConfirmed: true, whatnotCategoryId: 'gid://shopify/TaxonomyCategory/bags', ...overrides }
  const categoryRequests = []
  const dependencies = {
    ...utils,
    computed: getter => ({ get value() { return getter() } }),
    ref: value => ({ value }),
    getCurrentInstance: () => ({ proxy: { $t: (key, values) => values ? key + ':' + JSON.stringify(values) : key, $modal: { msgWarning: () => {} } } }),
    defineProps: () => ({ form }), defineExpose: () => {}, watch: () => {}, onBeforeUnmount: () => {},
    getWhatnotConfig: async shopId => ({ data: { currency: 'USD', locations: [{ id: 'loc-' + shopId, name: 'Warehouse' }], publications: [{ id: 'pub-' + shopId, name: 'Whatnot' }] } }),
    getWhatnotMetafields: async () => ({ data: available() }),
    searchWhatnotCategories: async () => ({ data: [] }),
    searchWhatnotTargetCategories: async (shopId, query) => { categoryRequests.push({ shopId, query }); return { data: [] } },
    ...apis
  }
  const factory = new Function(...Object.keys(dependencies), script + '; return { loadConfig, validate, configReady, metafieldsReady, metafields, metafieldError }')
  return { form, categoryRequests, ...factory(...Object.values(dependencies)) }
}

test('fixed category and USD replace legacy editable configuration without confirmations', async () => {
  const h = harness({ whatnotBuyItNowPrice: 100, whatnotCurrency: 'CAD', whatnotAuctionConfirmed: false })
  await h.loadConfig()
  assert.equal(h.form.whatnotTargetCategoryName, 'Luxury Bags & Accessories')
  assert.equal(h.form.whatnotTargetCategoryValue, 'gid://shopify/Metaobject/9')
  assert.equal(h.form.whatnotCurrency, 'USD')
  assert.equal(h.form.whatnotCategoryId, null)
  assert.equal(h.form.whatnotBuyItNowPrice, null)
  assert.equal(h.form.listingType, 'CHANNEL_MANAGED')
  assert.deepEqual(h.categoryRequests, [])
  assert.deepEqual(h.validate(), [])
})

test('a non-USD store cannot silently use the fixed USD template', async () => {
  const h = harness({}, { getWhatnotConfig: async () => ({ data: { currency: 'CAD', locations: [{id:'loc'}], publications: [{id:'pub'}] } }) })
  await h.loadConfig()
  assert.equal(h.configReady.value, false)
  assert.ok(h.validate().includes('platformListings.whatnotUsdRequired'))
})

test('auction templates block missing or unwritable Auction Price fields', async () => {
  const h = harness({}, { getWhatnotMetafields: async () => ({ data: { ...available(), auctionPrice: { available: false, reason: 'No app write permission' } } }) })
  await h.loadConfig()
  assert.ok(h.validate().some(message => message.includes('whatnotMetafieldUnavailable')))
})

test('unreadable metafields block saving even for an old fixed-price template', async () => {
  const h = harness({ listingType: 'FIXED_PRICE' }, { getWhatnotMetafields: async () => { throw new Error('Read permission denied') } })
  await h.loadConfig()
  assert.equal(h.configReady.value, true)
  assert.ok(h.metafieldError.value.includes('Read permission denied'))
  assert.ok(h.validate().some(message => message.includes('whatnotMetafieldUnavailable')))
})

test('a late shop configuration response cannot replace a newer shop or category source', async () => {
  const pending = new Map()
  const h = harness({}, { getWhatnotMetafields: shopId => new Promise(resolve => pending.set(shopId, resolve)) })
  const oldLoad = h.loadConfig()
  h.form.shopId = 2
  const newLoad = h.loadConfig()
  pending.get(2)({ data: available() })
  await newLoad
  assert.equal(h.form.whatnotLocationId, 'loc-2')
  assert.equal(h.form.whatnotPublicationId, 'pub-2')
  pending.get(1)({ data: { auctionPrice: { available: false } } })
  await oldLoad
  assert.equal(h.form.whatnotLocationId, 'loc-2')
  assert.equal(h.metafields.value.auctionPrice.available, true)
  assert.deepEqual(h.categoryRequests, [])
})

const templateSource = await readFile(new URL('../src/views/wms/platform/listings/template.vue', import.meta.url), 'utf8')
const saveSource = templateSource.slice(templateSource.indexOf('function optionalNumber('), templateSource.indexOf('function handleDelete('))
function templateSave(form) {
  let payload
  const dependencies = {
    form, validateLeafCategory: () => true, submitting: { value: false }, dialog: { isEdit: true },
    updateTemplate: data => { payload = data; return Promise.resolve() }, addTemplate: () => { throw new Error('Unexpected create') },
    buildTiktokProductAttributes: () => [], proxy: { $modal: { msgSuccess: () => {}, msgError: () => {} } }, t: key => key, getList: () => {}
  }
  new Function(...Object.keys(dependencies), saveSource + '; doSubmit(false)')(...Object.values(dependencies))
  return payload
}

test('saving an auction preserves regular product price and the exact category value', () => {
  const value = '{ "id": "bags" }'
  const payload = templateSave({ platform: 'SHOPIFY', listingType: 'AUCTION', defaultPrice: 150, whatnotAuctionPrice: 1, whatnotBuyItNowPrice: 180, whatnotTargetCategoryValue: value, whatnotTargetCategoryName: 'Bags', whatnotAuctionConfirmed: true, whatnotAutoPublishConfirmed: true })
  assert.equal(payload.listingType, 'CHANNEL_MANAGED')
  assert.equal(payload.priceMarkupValue, 150)
  assert.equal(payload.whatnotAuctionPrice, 1)
  assert.equal(payload.whatnotBuyItNowPrice, null)
  assert.equal(payload.whatnotTargetCategoryValue, value)
  assert.equal(payload.whatnotAuctionConfirmed, false)
  assert.equal(payload.whatnotAutoPublishConfirmed, false)
  assert.equal(payload.buyItNowPrice, null)
})

test('saving a legacy template removes its selling mode and retains the displayed auction start', () => {
  const payload = templateSave({ platform: 'SHOPIFY', listingType: 'FIXED_PRICE', defaultPrice: 150, whatnotAuctionPrice: 1, whatnotAutoPublishConfirmed: true })
  assert.equal(payload.listingType, 'CHANNEL_MANAGED')
  assert.equal(payload.priceMarkupValue, 150)
  assert.equal(payload.whatnotAuctionPrice, 1)
  assert.equal(payload.whatnotBuyItNowPrice, null)
  assert.equal(payload.whatnotAutoPublishConfirmed, false)
  assert.equal(payload.whatnotAuctionConfirmed, false)
})

const publishSource = await readFile(new URL('../src/views/wms/platform/listings/components/PublishDialog.vue', import.meta.url), 'utf8')
const priceFunctions = publishSource.slice(publishSource.indexOf('function validPositiveNumber('), publishSource.indexOf('function normalizePreviewPrice('))
const publishFunction = publishSource.slice(publishSource.indexOf('async function doPublish('), publishSource.indexOf('const preSelectedSkuIds ='))
function publishHarness(row, confirm = true) {
  const requests = []
  const confirmations = []
  const dependencies = {
    ...utils,
    previewLoading: { value: false }, previewList: { value: [row] }, isWhatnotPublish: { value: true }, isTiktokPublish: { value: false },
    hasWhatnotPreviewErrors: { get value() { return !utils.isWhatnotPreviewValid(row) } }, whatnotTemplateConfirmed: { value: true },
    hasEbayTitleTooLong: { value: false }, hasTiktokPriceInvalid: { value: false }, hasMissingTiktokBrand: { value: false },
    chosenPlatform: { value: 'SHOPIFY' }, chosenTemplateId: { value: 10 }, chosenShopId: { value: 20 }, publishing: { value: false }, visible: { value: true },
    isAuctionRow: item => item.listingType === 'AUCTION',
    t: (key, params) => key + (params ? JSON.stringify(params) : ''),
    proxy: { $modal: { msgWarning: () => {}, msgSuccess: () => {}, msgError: () => {}, confirm: async message => { confirmations.push(message); if (!confirm) throw new Error('Cancelled') } } },
    batchPublish: async data => requests.push(data), emit: () => {}
  }
  const factory = new Function(...Object.keys(dependencies), priceFunctions + '; const belowSellingPriceRows = { get value() { return previewList.value.filter(isBelowSellingPrice) } }; const hasBelowSellingPrice = { get value() { return belowSellingPriceRows.value.length > 0 } }; ' + publishFunction + '; return doPublish')
  return { requests, confirmations, doPublish: factory(...Object.values(dependencies)) }
}

test('publishing an auction keeps the normal product price in customPrices and does not confirm the one-dollar start as a low BIN', async () => {
  const h = publishHarness({ skuId: 1, skuCode: 'SKU-1', overrideTitle: 'Bag', listingType: 'AUCTION', overridePrice: 150, sellingPrice: 150, whatnotAuctionPrice: 1, images: ['item.jpg'] })
  await h.doPublish()
  assert.deepEqual(h.requests[0].customPrices, { 1: 150 })
  assert.equal(h.requests[0].confirmBelowSellingPrice, false)
  assert.deepEqual(h.confirmations, [])
})

test('publishing a discounted product price still requires explicit confirmation', async () => {
  const h = publishHarness({ skuId: 1, skuCode: 'SKU-1', overrideTitle: 'Bag', listingType: 'CHANNEL_MANAGED', overridePrice: 100, sellingPrice: 150, whatnotAuctionPrice: 1, images: ['item.jpg'] })
  await h.doPublish()
  assert.equal(h.confirmations.length, 1)
  assert.ok(h.confirmations[0].includes('USD 100.00'))
  assert.equal(h.requests[0].confirmBelowSellingPrice, true)
  assert.deepEqual(h.requests[0].customPrices, { 1: 100 })
})

test('declining the discounted product price prevents publishing', async () => {
  const h = publishHarness({ skuId: 1, overrideTitle: 'Bag', listingType: 'CHANNEL_MANAGED', overridePrice: 100, sellingPrice: 150, whatnotAuctionPrice: 1, images: ['item.jpg'] }, false)
  await h.doPublish()
  assert.equal(h.confirmations.length, 1)
  assert.deepEqual(h.requests, [])
})


test('fixed shop category replaces a saved selection without fetching the inaccessible option list', async () => {
  const category = { available: true, fixed: true, value: 'gid://shopify/Metaobject/9', name: 'Luxury Bags & Accessories' }
  const h = harness({ whatnotTargetCategoryValue: 'old', whatnotTargetCategoryName: 'Old category' }, {
    getWhatnotMetafields: async () => ({ data: { ...available(), category } })
  })
  await h.loadConfig()
  assert.equal(h.form.whatnotTargetCategoryValue, category.value)
  assert.equal(h.form.whatnotTargetCategoryName, category.name)
  assert.deepEqual(h.categoryRequests, [])
  assert.deepEqual(h.validate(), [])
})

test('switching shops clears a fixed reference and a broken fixed source blocks saving', async () => {
  const category = { available: false, fixed: true, value: 'gid://shopify/Metaobject/9', name: 'Luxury Bags & Accessories', reason: 'Source changed' }
  const h = harness({}, {
    getWhatnotMetafields: async shopId => ({ data: shopId === 1 ? { ...available(), category } : { ...available(), category: { available: true } } })
  })
  await h.loadConfig()
  assert.ok(h.validate().some(message => message.includes('whatnotMetafieldUnavailable')))
  h.form.shopId = 2
  await h.loadConfig()
  assert.equal(h.form.whatnotTargetCategoryValue, '')
  assert.equal(h.form.whatnotTargetCategoryName, '')
  assert.deepEqual(h.categoryRequests, [])
})
