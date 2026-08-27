import request from '@/utils/request'

// 未入库 SKU 分页列表（任意仓库均无 wms_inventory 行；Query 与 UnstockedSkuVo 以后端为准）
export function listUnstockedSkus(query) {
  return request({
    url: '/wms/inventory/unstocked-skus',
    method: 'get',
    params: query
  })
}

// 未入库 SKU 总金额（按当前筛选条件汇总，不受分页影响）
export function getUnstockedSkusTotalAmount(query) {
  return request({
    url: '/wms/inventory/unstocked-skus/total-amount',
    method: 'get',
    params: query
  })
}

// 未入库 SKU 总件数（按当前筛选条件汇总，不受分页影响）
export function getUnstockedSkusTotalCount(query) {
  return request({
    url: '/wms/inventory/unstocked-skus/total-count',
    method: 'get',
    params: query
  })
}

export function exportUnstockedSkus(data, config = {}) {
  return request({
    url: '/wms/inventory/unstocked-skus/export',
    method: 'post',
    data: data,
    responseType: 'blob',
    ...config
  })
}

// 查询库存列表
export function listInventory(query, config = {}) {
  return request({
    url: '/wms/inventory/boardList/warehouse',
    method: 'get',
    params: query,
    ...config
  })
}

export function listInventoryNoPage(query, config = {}) {
  return request({
    url: '/wms/inventory/listNoPage',
    method: 'get',
    params: query,
    ...config
  })
}

// 查询库存看板仓库维度列表（仓库维度和商品维度）
export function listInventoryBoard(query,type) {
  return request({
    url: '/wms/inventory/boardList/'+type,
    method: 'get',
    params: query
  })
}

// 仓库维度看板：按当前筛选条件汇总（不分页）
export function listInventoryBoardWarehouseSummary(query) {
  return request({
    url: '/wms/inventory/boardList/warehouse/summary',
    method: 'get',
    params: query
  })
}

// 导出库存看板商品维度数据
export function exportInventoryBoardItem(data, config = {}) {
  return request({
    url: '/wms/inventory/boardList/item/export',
    method: 'post',
    data: data,
    responseType: 'blob',
    ...config
  })
}

// 提交库存看板商品维度异步导出任务
export function submitInventoryBoardExportTask(data, config = {}) {
  return request({
    url: '/wms/inventory/boardList/item/export/task',
    method: 'post',
    data,
    ...config
  })
}

// 批量导出库存看板 Excel（勾选行导出，含商品图片、成色、瑕疵）
export function batchExportInventoryBoardExcel(data, config = {}) {
  return request({
    url: '/wms/inventory/boardList/item/batch-export/excel',
    method: 'post',
    data: data,
    responseType: 'blob',
    ...config
  })
}

// 提交库存看板批量异步导出任务（含商品图片）
export function submitInventoryBoardBatchExportTask(data, config = {}) {
  return request({
    url: '/wms/inventory/boardList/item/batch-export/excel/task',
    method: 'post',
    data,
    ...config
  })
}

// 查询库存导出任务状态
export function getInventoryExportTask(taskId, config = {}) {
  return request({
    url: `/wms/inventory/export/tasks/${taskId}`,
    method: 'get',
    ...config
  })
}

// 查询当前用户最近的库存导出任务
export function listInventoryExportTasks(query, config = {}) {
  return request({
    url: '/wms/inventory/export/tasks',
    method: 'get',
    params: query,
    ...config
  })
}

// 下载已经生成的库存导出文件；只传输文件，不包含查询和 Excel 生成时间
export function downloadInventoryExportTask(taskId, config = {}) {
  return request({
    url: `/wms/inventory/export/tasks/${taskId}/download`,
    method: 'get',
    responseType: 'blob',
    timeout: 0,
    ...config
  })
}

// 删除当前用户的导出记录及对应对象存储文件
export function deleteInventoryExportTask(taskId, config = {}) {
  return request({
    url: `/wms/inventory/export/tasks/${taskId}`,
    method: 'delete',
    ...config
  })
}

// 查询库存统计商品详情（只读，按 SKU）
export function getInventoryItemBoardDetail(skuId) {
  return request({
    url: '/wms/inventory/boardList/item/' + skuId + '/detail',
    method: 'get',
    silentError: true
  })
}

// 查询库存详细
export function getInventory(id) {
  return request({
    url: '/wms/inventory/' + id,
    method: 'get'
  })
}

// 新增库存
export function addInventory(data) {
  return request({
    url: '/wms/inventory',
    method: 'post',
    data: data
  })
}

// 修改库存
export function updateInventory(data) {
  return request({
    url: '/wms/inventory',
    method: 'put',
    data: data
  })
}

// 删除库存
export function delInventory(id) {
  return request({
    url: '/wms/inventory/' + id,
    method: 'delete'
  })
}
