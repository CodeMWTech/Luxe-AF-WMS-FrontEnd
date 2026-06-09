import request from '@/utils/request'

// 统一分页查询平台订单（TikTok + eBay）
export function listPlatformOrders(query) {
  return request({
    url: '/wms/platform/orders',
    method: 'get',
    params: query
  })
}

// 统一查询平台订单详情
export function getPlatformOrder(orderId, platform, shopAuthId) {
  return request({
    url: `/wms/platform/orders/${orderId}`,
    method: 'get',
    params: { platform, shopAuthId }
  })
}

// 获取订单状态翻译映射
export function getOrderStatusMap() {
  return request({
    url: '/wms/platform/orders/status-map',
    method: 'get'
  })
}

// 更新订单 SKU
export function updateOrderSku(orderId, platform, newSku) {
  return request({
    url: `/wms/platform/orders/${orderId}/sku`,
    method: 'put',
    params: { platform },
    data: { newSku }
  })
}

// 手动触发自动创建出库暂存单
export function createShipments() {
  return request({
    url: '/wms/platform/orders/create-shipments',
    method: 'post'
  })
}
