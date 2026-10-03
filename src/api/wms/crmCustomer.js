import request from '@/utils/request'

export function listCrmCustomers(query) {
  return request({
    url: '/wms/crm/customers',
    method: 'get',
    params: query
  })
}

export function getCrmShops() {
  return request({
    url: '/wms/crm/customers/shops',
    method: 'get'
  })
}

export function getCrmInsights(params) {
  return request({
    url: '/wms/crm/customers/insights',
    method: 'get',
    params,
    timeout: 60000
  })
}

export function getCrmCustom(params) {
  return request({
    url: '/wms/crm/customers/insights/custom',
    method: 'get',
    params,
    timeout: 60000
  })
}

export function getCrmCustomer(platform, buyerKey) {
  return request({
    url: '/wms/crm/customers/detail',
    method: 'get',
    params: { platform, buyerKey }
  })
}
