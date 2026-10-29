import request from '@/utils/request'

// 查询供应商列表
export function listSupplier(query) {
  return request({
    url: '/wms/supplier/list',
    method: 'get',
    params: query
  })
}

// 查询供应商列表（无分页，用于下拉选择）
export function listSupplierNoPage(query) {
  return request({
    url: '/wms/supplier/listNoPage',
    method: 'get',
    params: query
  })
}

// 查询供应商详细
export function getSupplier(id) {
  return request({
    url: '/wms/supplier/' + id,
    method: 'get'
  })
}

// 读取所选角色下未删除用户的联系方式（含停用账号，只读）
export function getSupplierRoleContacts(roleIds) {
  const ids = (Array.isArray(roleIds) ? roleIds : [roleIds]).filter(id => id != null && id !== '')
  if (!Array.isArray(roleIds) && ids.length === 1) {
    return request({
      url: '/wms/supplier/role/' + ids[0] + '/contacts',
      method: 'get'
    })
  }
  return request({
    url: '/wms/supplier/roles/contacts',
    method: 'get',
    params: { roleIds: ids.join(',') }
  })
}

// 新增供应商
export function addSupplier(data) {
  return request({
    url: '/wms/supplier',
    method: 'post',
    data: data
  })
}

// 修改供应商
export function updateSupplier(data) {
  return request({
    url: '/wms/supplier',
    method: 'put',
    data: data
  })
}

// 删除供应商
export function delSupplier(id) {
  return request({
    url: '/wms/supplier/' + id,
    method: 'delete'
  })
}

// 获取当前登录用户的供应商信息（后端自动识别）
export function getCurrentSupplier() {
  return request({
    url: '/wms/supplier/current',
    method: 'get'
  })
}
