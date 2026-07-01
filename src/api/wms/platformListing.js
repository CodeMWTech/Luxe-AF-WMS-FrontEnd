import request from '@/utils/request'

// ==================== 上架模板 API ====================

/** 分页查询模板 */
export function listTemplates(query) {
  return request({ url: '/wms/platform/listings/templates', method: 'get', params: query })
}

/** 模板下拉列表（仅启用，支持按店铺过滤） */
export function listAllTemplates(platform, shopId) {
  return request({ url: '/wms/platform/listings/templates/listAll', method: 'get', params: { platform, shopId } })
}

/** 模板详情 */
export function getTemplate(id) {
  return request({ url: '/wms/platform/listings/templates/' + id, method: 'get' })
}

/** 新建模板 */
export function addTemplate(data) {
  return request({ url: '/wms/platform/listings/templates', method: 'post', data })
}

/** 编辑模板 */
export function updateTemplate(data) {
  return request({ url: '/wms/platform/listings/templates', method: 'put', data })
}

/** 删除模板 */
export function delTemplate(id) {
  return request({ url: '/wms/platform/listings/templates/' + id, method: 'delete' })
}

// ==================== 上架记录 API ====================

/** 分页查询上架记录 */
export function listListings(query) {
  return request({ url: '/wms/platform/listings', method: 'get', params: query })
}

/** 上架详情 */
export function getListing(id) {
  return request({ url: '/wms/platform/listings/' + id, method: 'get' })
}

/** 批量上架（异步） */
export function batchPublish(data) {
  return request({ url: '/wms/platform/listings', method: 'post', data })
}

/** 下架 */
export function delistListing(id) {
  return request({ url: '/wms/platform/listings/' + id, method: 'delete' })
}

/** 同步上架状态 */
export function syncListingStatus(id) {
  return request({ url: '/wms/platform/listings/' + id + '/status', method: 'get' })
}

/** 重试失败的上架 */
export function retryListing(id) {
  return request({ url: '/wms/platform/listings/' + id + '/retry', method: 'put' })
}

/** 删除已下架的上架记录 */
export function deleteListing(id) {
  return request({ url: '/wms/platform/listings/' + id + '/delete', method: 'delete' })
}

/** 预览模板应用到SKU的效果 */
export function previewTemplate(templateId, skuId) {
  return request({ url: '/wms/platform/listings/preview', method: 'get', params: { templateId, skuId } })
}

/** 获取平台类目（懒加载，parentId 为空时返回顶级）。lang=en 时返回英文名 */
export function getCategories(platform, parentId, lang) {
  const params = { platform, lang: lang || 'zh' }
  if (parentId != null) params.parentId = parentId
  return request({ url: '/wms/platform/listings/categories', method: 'get', params })
}

/** 按类目ID查询名称（编辑回显用） */
export function getCategoryById(platform, categoryId) {
  return request({ url: '/wms/platform/listings/categories/' + encodeURIComponent(categoryId), method: 'get', params: { platform, lang: 'en' } })
}

/** 从平台 API 同步类目到数据库 */
export function syncCategories(platform, shopId) {
  return request({ url: '/wms/platform/listings/categories/sync', method: 'post', params: { platform, shopId } })
}

/** 获取 eBay Business Policies（物流/支付/退货政策列表）。refresh=true 强制从 eBay 重新拉取 */
export function getEbayPolicies(shopId, refresh) {
  return request({ url: '/wms/platform/ebay/policies', method: 'get', params: { shopId, refresh: refresh || false } })
}

/** 获取 TikTok 店铺仓库列表 */
export function getTiktokWarehouses(shopId) {
  return request({ url: '/wms/platform/listings/tiktok/warehouses', method: 'get', params: { shopId } })
}
