import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { baseParse, compile } from '@vue/compiler-dom'
import * as vue from 'vue'
import { renderToString } from '@vue/server-renderer'

const asModule = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const messages = {}
for (const locale of ['zh-cn', 'en']) {
  messages[locale] = (await asModule(await readFile(new URL('../src/locales/' + locale + '.js', import.meta.url), 'utf8'))).default
}
const source = await readFile(new URL('../src/views/wms/platform/listings/components/PublishDialog.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const nodes = []
function visit(node) {
  nodes.push(node)
  for (const child of node.children || []) visit(child)
}
visit(baseParse(descriptor.template.content))
const previewCard = nodes.find(node => node.props?.some(prop => prop.name === 'class' && prop.value?.content === 'channel-preview'))
const auctionNotice = nodes.find(node => node.tag === 'el-alert' && node.props?.some(prop => prop.exp?.content.includes('tiktokAuctionSalesHint')))
const labelSource = source.slice(source.indexOf('const isEbayPublish ='), source.indexOf('const ebayTitleTooLongRows ='))
const rowSource = source.slice(source.indexOf('function isAuctionRow('), source.indexOf('function isTiktokPriceInvalid('))

function fixture(platform = 'TIKTOK', listingType = 'AUCTION', locale = 'zh-cn') {
  const language = vue.ref(locale)
  const chosenPlatform = vue.ref(platform)
  const chosenTemplate = vue.ref({ listingType })
  const previewList = vue.ref([{
    listingType, skuCode: 'LS479', overrideTitle: 'Hermes bag', overridePrice: 13500,
    startingBidPrice: 1, buyItNowPrice: 18000, currency: 'USD', quantity: 1, images: []
  }])
  const t = key => key.split('.').reduce((value, part) => value?.[part], messages[language.value]) ?? key
  const state = new Function('computed', 'chosenPlatform', 'chosenTemplate', 'previewList', 't',
    labelSource + rowSource + '; return { isTiktokPublish, isWhatnotPublish, isAuctionPublish, previewPrimaryPriceLabel, previewSecondaryPriceLabel, isAuctionRow, getListingTypeLabel, getSecondaryPreviewPrice }'
  )(vue.computed, chosenPlatform, chosenTemplate, previewList, t)
  return {
    ...state, language, chosenPlatform, chosenTemplate, previewList, t,
    getPreviewTitle: row => row.overrideTitle,
    getPreviewDescription: () => '',
    formatPreviewCondition: () => '',
    formatMoney: (amount, currency) => currency + ' ' + Number(amount).toFixed(2)
  }
}

async function renderPreview(state) {
  assert.ok(previewCard, 'The actual product preview must be present')
  assert.ok(auctionNotice, 'TikTok dual selling format must be explained before publishing')
  const render = new Function('Vue', compile(auctionNotice.loc.source + previewCard.loc.source, { mode: 'function', prefixIdentifiers: true }).code)(vue)
  const app = vue.createSSRApp({ setup: () => state, render })
  app.component('ElImage', { render: () => vue.h('img') })
  app.component('ElTag', { setup: (_, { slots }) => () => vue.h('span', slots.default?.()) })
  app.component('ElAlert', {
    props: ['title', 'description'],
    setup: props => () => vue.h('aside', [vue.h('strong', props.title), vue.h('p', props.description)])
  })
  return renderToString(app)
}

test('TikTok template and preview compile with the complete selling-format translations', async () => {
  for (const file of ['template.vue', 'components/PublishDialog.vue']) {
    const filename = '../src/views/wms/platform/listings/' + file
    const { descriptor, errors } = parse(await readFile(new URL(filename, import.meta.url), 'utf8'))
    assert.deepEqual(errors, [])
    compileScript(descriptor, { id: 'tiktok-selling-format' })
    assert.deepEqual(compileTemplate({
      source: descriptor.template.content, filename, id: 'tiktok-selling-format'
    }).errors, [])
  }
  for (const [locale, expected] of [['zh-cn', '固定价格 + 直播拍卖'], ['en', 'Fixed price + LIVE auction']]) {
    const text = messages[locale].platformListings
    assert.equal(text.tiktokAuction, expected)
    assert.doesNotMatch(text.tiktokAuctionEligibilityHint, /仅用于 LIVE|不会在店铺搜索|LIVE-only|not searchable/)
    assert.ok(text.tiktokAuctionSalesHint)
    assert.ok(text.tiktokAuctionStartPriceHint)
  }
})

test('the Chinese TikTok auction preview renders dual sales and independent fixed and starting prices', async () => {
  const state = fixture()
  const html = await renderPreview(state)
  assert.ok(html.includes('固定价格 + 直播拍卖'))
  assert.ok(html.includes('固定购买价'))
  assert.ok(html.includes('USD 13500.00'))
  assert.ok(html.includes('USD 1.00'))
  assert.ok(html.includes(state.t('platformListings.tiktokAuctionSalesHint')))
  assert.equal(state.getSecondaryPreviewPrice(state.previewList.value[0]), 1)
  assert.equal(state.previewList.value[0].overridePrice, 13500)
})

test('switching to English updates the actual preview labels and explanation', async () => {
  const state = fixture()
  state.language.value = 'en'
  const html = await renderPreview(state)
  assert.ok(html.includes('Fixed price + LIVE auction'))
  assert.ok(html.includes('Fixed purchase price'))
  assert.ok(html.includes('LIVE starting bid price'))
  assert.ok(html.includes(state.t('platformListings.tiktokAuctionSalesHint')))
  assert.ok(html.includes('USD 13500.00'))
  assert.ok(html.includes('USD 1.00'))
  assert.ok(!html.includes('固定价格'))
})

test('fixed-price TikTok previews keep one price and do not show the auction notice', async () => {
  const state = fixture('TIKTOK', 'FIXED_PRICE', 'en')
  const html = await renderPreview(state)
  assert.ok(html.includes('Fixed price'))
  assert.ok(html.includes('Retail price'))
  assert.ok(!html.includes('LIVE auction'))
  assert.ok(!html.includes('USD 1.00'))
  assert.equal(state.getSecondaryPreviewPrice(state.previewList.value[0]), null)
})

test('eBay and Whatnot labels and prices do not inherit TikTok dual selling format', async () => {
  for (const locale of ['zh-cn', 'en']) {
    const ebay = fixture('EBAY', 'AUCTION', locale)
    assert.equal(ebay.getListingTypeLabel(ebay.previewList.value[0]), locale === 'en' ? 'Auction' : '拍卖')
    assert.equal(ebay.getSecondaryPreviewPrice(ebay.previewList.value[0]), 18000)
    const html = await renderPreview(ebay)
    assert.ok(!html.includes('Fixed price + LIVE auction'))
    assert.ok(!html.includes('固定价格 + 直播拍卖'))
    assert.ok(html.includes('USD 18000.00'))
    const fixedEbay = fixture('EBAY', 'FIXED_PRICE', locale)
    assert.equal(fixedEbay.getListingTypeLabel(fixedEbay.previewList.value[0]), fixedEbay.t('platformListings.ebayFixedPrice'))
    const whatnot = fixture('SHOPIFY', 'AUCTION', locale)
    assert.equal(whatnot.getListingTypeLabel(whatnot.previewList.value[0]), whatnot.t('platformListings.whatnotAuction'))
  }
})