import request from '@/utils/request'

export function listSupplierSkuOverview(query) {
  return request({
    url: '/wms/supplier-settlement/items',
    method: 'get',
    params: query
  })
}

export function getSupplierSkuSummary(query) {
  return request({
    url: '/wms/supplier-settlement/summary',
    method: 'get',
    params: query
  })
}

export function previewSupplierSettlement(query) {
  return request({
    url: '/wms/supplier-settlement/settlement/preview',
    method: 'get',
    params: query
  })
}

export function confirmSupplierSettlement(data) {
  return request({
    url: '/wms/supplier-settlement/settlement/confirm',
    method: 'post',
    data
  })
}

export function listSupplierSettlementRecords(query) {
  return request({
    url: '/wms/supplier-settlement/settlement/records',
    method: 'get',
    params: query
  })
}

export function getSupplierSettlementRecord(id) {
  return request({
    url: '/wms/supplier-settlement/settlement/records/' + id,
    method: 'get'
  })
}
