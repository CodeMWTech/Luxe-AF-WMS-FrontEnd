import request from '@/utils/request'

export function getVendorSummary(query) {
  return request({
    url: '/wms/vendor/summary',
    method: 'get',
    params: query
  })
}

export function listVendorItems(query) {
  return request({
    url: '/wms/vendor/items',
    method: 'get',
    params: query
  })
}

export function updateVendorItemStatus(data) {
  return request({
    url: '/wms/vendor/items/status',
    method: 'put',
    data
  })
}
