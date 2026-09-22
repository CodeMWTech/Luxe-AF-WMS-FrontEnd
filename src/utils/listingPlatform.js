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

// Whatnot ignores fractional amounts. Reject them so WMS never silently changes the price.
export function isWhatnotPriceValid(value) {
  if (value == null || String(value).trim() === '') return false
  const price = Number(value)
  return Number.isSafeInteger(price) && price > 0
}

export function isWhatnotPreviewValid(row) {
  const title = String(row?.overrideTitle || '').trim()
  return !row?.previewError && title.length > 0 && title.length <= 255
    && isWhatnotPriceValid(row?.overridePrice) && Array.isArray(row?.images) && row.images.length > 0
}
