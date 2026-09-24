export function listingPlatformName(platform) {
  return { EBAY: 'eBay', TIKTOK: 'TikTok', SHOPIFY: 'Whatnot' }[platform] || platform || '-'
}

export function listingPlatformTagType(platform) {
  return { EBAY: '', TIKTOK: 'danger', SHOPIFY: 'success' }[platform] ?? 'info'
}

export function isListingChannelActive(row) {
  return ['LISTED', 'AUDITING', 'SUBMITTED'].includes(row?.listingStatus)
}

export function isListingWithdrawable(row) {
  return isListingChannelActive(row) || (row?.platform === 'SHOPIFY'
    && row.listingStatus === 'FAILED' && Boolean(String(row.platformProductId || '').trim()))
}

export function isListingRetryable(row) {
  return ['FAILED', 'DELISTED', 'WITHDRAWN'].includes(row?.listingStatus)
}

export function isListingDeletable(row) {
  return row?.listingStatus === 'DELISTED'
}

// Auction starts are whole amounts; Shopify product prices are validated separately.
export function isWhatnotPriceValid(value) {
  if (value == null || String(value).trim() === '') return false
  const price = Number(value)
  return Number.isSafeInteger(price) && price > 0
}

export function isWhatnotAuction(template) {
  return template?.listingType === 'AUCTION'
}

export function isWhatnotOptionalPriceValid(value) {
  return value == null || value === '' || isWhatnotPriceValid(value)
}

export function isShopifyProductPriceValid(value) {
  if (value == null || !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) return false
  const price = Number(value)
  return Number.isFinite(price) && price > 0 && price <= Number.MAX_SAFE_INTEGER / 100
}

export function isWhatnotPreviewValid(row) {
  const title = String(row?.overrideTitle || '').trim()
  return !row?.previewError && title.length > 0 && title.length <= 255
    && isShopifyProductPriceValid(row?.overridePrice) && Array.isArray(row?.images) && row.images.length > 0
    && isWhatnotPriceValid(row?.whatnotAuctionPrice)
}

// Only the Shopify product price is reviewed; the auction start is independent.
export function getListingReviewPrice(row, platform) {
  const price = Number(row?.overridePrice)
  return Number.isFinite(price) && price > 0 ? price : null
}
