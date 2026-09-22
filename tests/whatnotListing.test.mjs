import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/utils/listingPlatform.js', import.meta.url), 'utf8')
const { isListingChannelActive, isListingWithdrawable, isListingRetryable, isListingDeletable, isWhatnotPriceValid, isWhatnotPreviewValid } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('submitted Whatnot records can be withdrawn or synced without duplicating or deleting publication records', () => {
  const row = { platform: 'SHOPIFY', listingStatus: 'SUBMITTED' }
  assert.equal(isListingChannelActive(row), true)
  assert.equal(isListingRetryable(row), false)
  assert.equal(isListingDeletable(row), false)
})

test('withdrawn Whatnot records can be resubmitted but remain protected from deletion', () => {
  const row = { platform: 'SHOPIFY', listingStatus: 'WITHDRAWN' }
  assert.equal(isListingChannelActive(row), false)
  assert.equal(isListingRetryable(row), true)
  assert.equal(isListingDeletable(row), false)
})

test('existing eBay and TikTok lifecycle actions remain available', () => {
  for (const platform of ['EBAY', 'TIKTOK']) {
    assert.equal(isListingChannelActive({ platform, listingStatus: 'LISTED' }), true)
    assert.equal(isListingChannelActive({ platform, listingStatus: 'AUDITING' }), true)
    assert.equal(isListingRetryable({ platform, listingStatus: 'FAILED' }), true)
    assert.equal(isListingRetryable({ platform, listingStatus: 'DELISTED' }), true)
    assert.equal(isListingDeletable({ platform, listingStatus: 'DELISTED' }), true)
  }
})

test('Whatnot rejects fractional prices instead of silently rounding or truncating', () => {
  for (const value of [1, 100, '100.00', 99999]) assert.equal(isWhatnotPriceValid(value), true)
  for (const value of [100.5, '100.50', 0.99, 0, -1, null, '', ' ', undefined, NaN, Infinity, 'not a price']) {
    assert.equal(isWhatnotPriceValid(value), false, String(value))
  }
})

test('Whatnot submission requires a successful preview with a usable title, price and images', () => {
  const row = { overrideTitle: 'Gucci bag', overridePrice: 100, images: ['https://example.com/item.jpg'] }
  assert.equal(isWhatnotPreviewValid(row), true)
  for (const patch of [{ previewError: true }, { overrideTitle: '' }, { overrideTitle: '  ' }, { overrideTitle: 'A'.repeat(256) }, { overridePrice: 100.5 }, { images: [] }, { images: undefined }]) {
    assert.equal(isWhatnotPreviewValid({ ...row, ...patch }), false)
  }
})

test('partially published failed Whatnot records can be withdrawn without enabling status sync', () => {
  const row = { platform: 'SHOPIFY', listingStatus: 'FAILED', platformProductId: 'gid://shopify/Product/123' }
  assert.equal(isListingWithdrawable(row), true)
  assert.equal(isListingChannelActive(row), false)
  assert.equal(isListingDeletable(row), false)
})

test('failed records without a Shopify product and failures on other platforms cannot be withdrawn', () => {
  for (const platformProductId of [undefined, null, '', '   ']) {
    assert.equal(isListingWithdrawable({ platform: 'SHOPIFY', listingStatus: 'FAILED', platformProductId }), false)
  }
  for (const platform of ['EBAY', 'TIKTOK']) {
    assert.equal(isListingWithdrawable({ platform, listingStatus: 'FAILED', platformProductId: '123' }), false)
    assert.equal(isListingWithdrawable({ platform, listingStatus: 'LISTED' }), true)
  }
})
