import request from '@/utils/request'

export function getCurrentRoleInventoryView() {
  return request({
    url: '/wms/roleInventoryView/current',
    method: 'get'
  })
}

export function getRoleInventoryView(roleId) {
  return request({
    url: '/wms/roleInventoryView/' + roleId,
    method: 'get'
  })
}

export function saveRoleInventoryView(data) {
  return request({
    url: '/wms/roleInventoryView',
    method: 'put',
    data
  })
}

export function deleteRoleInventoryView(roleId) {
  return request({
    url: '/wms/roleInventoryView/' + roleId,
    method: 'delete'
  })
}
