import request from '@/utils/request'

export function listItemMaterialPage(query) {
  return request({
    url: '/wms/itemMaterial/list',
    method: 'get',
    params: query
  })
}

export function listItemMaterial(query) {
  return request({
    url: '/wms/itemMaterial/listNoPage',
    method: 'get',
    params: query
  })
}

export function getItemMaterial(id) {
  return request({
    url: '/wms/itemMaterial/' + id,
    method: 'get'
  })
}

export function addItemMaterial(data) {
  return request({
    url: '/wms/itemMaterial',
    method: 'post',
    data
  })
}

export function updateItemMaterial(data) {
  return request({
    url: '/wms/itemMaterial',
    method: 'put',
    data
  })
}

export function delItemMaterial(id) {
  return request({
    url: '/wms/itemMaterial/' + id,
    method: 'delete'
  })
}

export function uploadItemMaterialImage(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: `/wms/itemMaterial/${id}/image/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
    timeout: 0
  })
}

export function deleteItemMaterialImage(id) {
  return request({
    url: `/wms/itemMaterial/${id}/image`,
    method: 'delete'
  })
}
