import request from '@/utils/request'

const base = '/wms/inventory/warehouse-products'

export const warehouseProductSummary = params => request({ url: `${base}/summary`, method: 'get', params })
export const warehouseProductMoney = params => request({ url: `${base}/money`, method: 'get', params })
export const warehouseProductRoomSnapshots = params => request({ url: `${base}/room-snapshots`, method: 'get', params })
export const warehouseProductFilterCounts = params => request({ url: `${base}/filter-counts`, method: 'get', params })
export const warehouseProductBrandCounts = params => request({ url: `${base}/brand-counts`, method: 'get', params })
export const warehouseProductBrandSplit = params => request({ url: `${base}/brand-split`, method: 'get', params })
export const warehouseProductCategoryCounts = params => request({ url: `${base}/category-counts`, method: 'get', params })
export const warehouseProductDetails = params => request({ url: `${base}/details`, method: 'get', params })
export const warehouseProductPage = (status, params) => request({ url: `${base}/${status}`, method: 'get', params })
export const exportWarehouseProducts = (status, data) => request({
  url: `${base}/${status}/export`, method: 'post', data, responseType: 'blob'
})
export const purchaserWarehouseMappings = () => request({ url: `${base}/purchaser-mappings`, method: 'get' })
export const savePurchaserWarehouseMappings = data => request({ url: `${base}/purchaser-mappings`, method: 'put', data })
