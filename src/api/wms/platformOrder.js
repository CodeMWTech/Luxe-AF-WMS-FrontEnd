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

// 从 CSV 导入 Note 到平台订单
export function importNotes(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/wms/platform/orders/import-notes',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 导出平台订单 Excel
export function exportPlatformOrders(query) {
  return request({
    url: '/wms/platform/orders/export',
    method: 'post',
    params: query,
    responseType: 'blob'
  })
}

// 获取自动创建出库单开关配置
export function getAutoCreateConfig() {
  return request({
    url: '/system/config/configKey/wms.shipment.auto-create-enabled',
    method: 'get'
  })
}

// 更新自动创建出库单开关配置
export function updateAutoCreateConfig(enabled) {
  return request({
    url: '/system/config/updateByKey',
    method: 'put',
    data: {
      configName: '自动创建出库暂存单开关',
      configKey: 'wms.shipment.auto-create-enabled',
      configValue: enabled ? 'true' : 'false'
    }
  })
}
