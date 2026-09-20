import request from '@/utils/request'

// 查询所有平台（TikTok + eBay + Whatnot）的已授权店铺列表
export function listAllPlatformShops() {
  return request({
    url: '/wms/platform/shops',
    method: 'get'
  })
}

// 批量同步多个店铺的订单（支持 TikTok + eBay + Whatnot 混合）
export function batchSyncOrders(data) {
  return request({
    url: '/wms/platform/shops/orders/sync',
    method: 'post',
    data
  })
}
