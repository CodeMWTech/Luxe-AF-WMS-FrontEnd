import request from '@/utils/request'

const CHECK_ORDER_LONG_TIMEOUT = 300000

// 查询库存盘点单据列表
export function listCheckOrder(query) {
  return request({
    url: '/wms/checkOrder/list',
    method: 'get',
    params: query
  })
}

// 查询库存盘点单据详细
export function getCheckOrder(id) {
  return request({
    url: '/wms/checkOrder/' + id,
    method: 'get',
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}

// 新增库存盘点单据
export function addCheckOrder(data) {
  return request({
    url: '/wms/checkOrder',
    method: 'post',
    data: data,
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}

// 修改库存盘点单据
export function updateCheckOrder(data) {
  return request({
    url: '/wms/checkOrder',
    method: 'put',
    data: data,
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}

// 删除库存盘点单据
export function delCheckOrder(id) {
  return request({
    url: '/wms/checkOrder/' + id,
    method: 'delete'
  })
}

export function exportCheckOrder(id) {
  return request({
    url: '/wms/checkOrder/export/' + id,
    method: 'post',
    responseType: 'blob',
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}

// 固化盘点结果
export function check(data) {
  return request({
    url: '/wms/checkOrder/check',
    method: 'post',
    data: data,
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}

// 库存智能核查预览
export function smartCheckPreview(data) {
  return request({
    url: '/wms/checkOrder/smart-check/preview',
    method: 'post',
    data: data,
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}

// 确认库存智能核查并生成核查盘库单
export function smartCheckConfirm(data) {
  return request({
    url: '/wms/checkOrder/smart-check/confirm',
    method: 'post',
    data: data,
    timeout: CHECK_ORDER_LONG_TIMEOUT
  })
}
