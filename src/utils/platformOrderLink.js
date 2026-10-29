function resolveTikTokSellerHost(region) {
  const key = String(region || '').toUpperCase()
  // 注意：美区域名是 seller-us（连字符），不是 seller.us
  if (!key || key.includes('US') || key.includes('UNITED_STATES')) {
    return 'https://seller-us.tiktok.com'
  }
  if (key.includes('GB') || key.includes('UK')) {
    return 'https://seller-uk.tiktok.com'
  }
  if (key.includes('EU') || key.includes('DE') || key.includes('FR') || key.includes('IT') || key.includes('ES')) {
    return 'https://seller.eu.tiktokglobalshop.com'
  }
  if (key.includes('SEA') || key.includes('SG') || key.includes('MY') || key.includes('TH') || key.includes('VN') || key.includes('PH') || key.includes('ID')) {
    return 'https://seller.tiktokglobalshop.com'
  }
  return 'https://seller.tiktok.com'
}

function resolveTikTokShopRegion(region) {
  const key = String(region || '').trim().toUpperCase()
  const normalizedKey = key.replace(/[\s-]+/g, '_')
  if (!key || ['US', 'USA', 'UNITED_STATES'].includes(normalizedKey)) return 'US'
  if (['UK', 'GB', 'UNITED_KINGDOM'].includes(normalizedKey)) return 'GB'
  return key
}

function resolveEbaySiteHost(region) {
  const key = String(region || '').toUpperCase()
  if (key.includes('GB') || key.includes('UK')) return 'https://www.ebay.co.uk'
  if (key.includes('DE')) return 'https://www.ebay.de'
  if (key.includes('AU')) return 'https://www.ebay.com.au'
  if (key.includes('CA')) return 'https://www.ebay.ca'
  if (key.includes('FR')) return 'https://www.ebay.fr'
  if (key.includes('IT')) return 'https://www.ebay.it'
  if (key.includes('ES')) return 'https://www.ebay.es'
  return 'https://www.ebay.com'
}

/** 根据平台订单构造外部跳转链接，跳转到对应平台的订单详情 */
export function getPlatformOrderExternalUrl(order, shops = []) {
  const orderId = String(order?.orderId || order?.platformOrderId || '').trim()
  if (!orderId) return ''
  const platform = String(order?.platform || '').toUpperCase()
  const shop = shops.find(item => String(item.id) === String(order?.shopAuthId))
  const region = shop?.region || order?.regionCode || ''

  if (platform === 'EBAY') {
    const host = resolveEbaySiteHost(region)
    const returnParams = new URLSearchParams({
      search: `ordernumber:${orderId}`,
      filter: 'status:ALL_ORDERS',
      partialRefresh: 'true'
    })
    const returnUrl = `${host}/sh/ord/?${returnParams.toString()}`
    const params = new URLSearchParams({
      mode: 'SH',
      orderid: orderId,
      source: 'Orders',
      ru: returnUrl
    })
    return `${host}/mesh/ord/details?${params.toString()}`
  }
  if (platform === 'TIKTOK') {
    const host = resolveTikTokSellerHost(region)
    const shopRegion = resolveTikTokShopRegion(region)
    return `${host}/order/detail?order_no=${encodeURIComponent(orderId)}&shop_region=${encodeURIComponent(shopRegion)}`
  }
  if (platform === 'SHOPIFY') {
    const shopifyOrderId = String(order?.shopifyOrderId || '').trim()
    const shopHandle = String(shop?.shopId || order?.platformShopId || '').trim().replace(/\.myshopify\.com$/i, '')
    if (!shopifyOrderId || !shopHandle) return ''
    return `https://admin.shopify.com/store/${encodeURIComponent(shopHandle)}/orders/${encodeURIComponent(shopifyOrderId)}`
  }
  return ''
}
