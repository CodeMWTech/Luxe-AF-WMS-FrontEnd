import request from '@/utils/request'

// 查询 TikTok 授权店铺
export function listTiktokShops() {
  return request({
    url: '/wms/platform/tiktok/shops',
    method: 'get'
  })
}

// 手动同步 TikTok 订单商品数据
export function syncTiktokOrders(shopAuthId, data) {
  return request({
    url: `/wms/platform/tiktok/shops/${shopAuthId}/orders/sync`,
    method: 'post',
    data
  })
}

// 查询本地 TikTok 订单商品数据
export function listTiktokOrders(query) {
  return request({
    url: '/wms/platform/tiktok/orders',
    method: 'get',
    params: query
  })
}

// 查询 TikTok 订单详情
export function getTiktokOrder(platformOrderId, shopAuthId) {
  return request({
    url: `/wms/platform/tiktok/orders/${platformOrderId}`,
    method: 'get',
    params: { shopAuthId }
  })
}
