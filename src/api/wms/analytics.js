import request from '@/utils/request'

export function getAnalyticsOverview(params = {}) {
  return request({
    url: '/wms/analytics/overview',
    method: 'get',
    params
  }).then((res) => res.data)
}

export function getBrandInventoryRatio(params = {}) {
  return request({
    url: '/wms/analytics/brand-inventory-ratio',
    method: 'get',
    params
  }).then((res) => res.data)
}

export function getTurnoverDaysDistribution(params = {}) {
  return request({
    url: '/wms/analytics/turnover-days-distribution',
    method: 'get',
    params
  }).then((res) => res.data)
}

export function getValueRangeDistribution(params = {}) {
  return request({
    url: '/wms/analytics/value-range-distribution',
    method: 'get',
    params
  }).then((res) => res.data)
}

/** rangeType, or periodAStartDate/periodAEndDate/periodBStartDate/periodBEndDate */
export function getGrossProfitTrend(params = {}) {
  return request({
    url: '/wms/analytics/gross-profit-trend',
    method: 'get',
    params
  }).then((res) => res.data)
}

/** 已连接平台店铺最近 52 个自然周的 Gross Sales，支持 startDate/endDate */
export function getShopSalesTrend(params = {}) {
  return request({
    url: '/wms/analytics/shop-sales-trend',
    method: 'get',
    params
  }).then((res) => res.data)
}
