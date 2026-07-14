import request from '@/utils/request'

export function listEmployee(query) {
  return request({
    url: '/wms/employee/list',
    method: 'get',
    params: query
  })
}

export function getEmployeeStats() {
  return request({
    url: '/wms/employee/stats',
    method: 'get'
  })
}

export function getAttachmentTypes() {
  return request({
    url: '/wms/employee/attachmentTypes',
    method: 'get'
  })
}

export function getEmployee(id) {
  return request({
    url: '/wms/employee/' + id,
    method: 'get'
  })
}

export function getEmployeeByUserId(userId) {
  return request({
    url: '/wms/employee/byUser/' + userId,
    method: 'get'
  })
}

export function saveEmployeeWithUser(data) {
  return request({
    url: '/wms/employee/saveWithUser',
    method: 'post',
    data
  })
}

export function syncEmployeeUsers() {
  return request({
    url: '/wms/employee/syncUsers',
    method: 'post'
  })
}

export function deleteUsersWithEmployee(userId) {
  return request({
    url: '/wms/employee/syncUsers/' + userId,
    method: 'delete'
  })
}

export function addEmployee(data) {
  return request({
    url: '/wms/employee',
    method: 'post',
    data
  })
}

export function updateEmployee(data) {
  return request({
    url: '/wms/employee',
    method: 'put',
    data
  })
}

export function archiveEmployee(id) {
  return request({
    url: '/wms/employee/' + id + '/archive',
    method: 'put'
  })
}

export function delEmployee(id) {
  return request({
    url: '/wms/employee/' + id,
    method: 'delete'
  })
}

export function listEmployeeAttachments(employeeId) {
  return request({
    url: '/wms/employee/' + employeeId + '/attachments',
    method: 'get'
  })
}

export function saveEmployeeAttachment(data) {
  return request({
    url: '/wms/employee/attachments',
    method: 'post',
    data
  })
}

export function delEmployeeAttachment(id) {
  return request({
    url: '/wms/employee/attachments/' + id,
    method: 'delete'
  })
}

export function batchDownloadAttachments(data) {
  return request({
    url: '/wms/employee/attachments/batchDownload',
    method: 'post',
    data,
    responseType: 'blob',
    timeout: 120000
  })
}
