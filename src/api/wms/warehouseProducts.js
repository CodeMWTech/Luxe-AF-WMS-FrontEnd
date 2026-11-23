import request from '@/utils/request'

const base = '/wms/inventory/warehouse-products'

export const warehouseProductSummary = params => request({ url: `${base}/summary`, method: 'get', params })
export const warehouseProductPage = (status, params) => request({ url: `${base}/${status}`, method: 'get', params })
export const exportWarehouseProducts = (status, data) => request({
  url: `${base}/${status}/export`, method: 'post', data, responseType: 'blob'
})
export const purchaserWarehouseMappings = () => request({ url: `${base}/purchaser-mappings`, method: 'get' })
export const savePurchaserWarehouseMappings = data => request({ url: `${base}/purchaser-mappings`, method: 'put', data })
