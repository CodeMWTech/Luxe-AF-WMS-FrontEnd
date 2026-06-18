import request from '@/utils/request'

export function listItemModelPage(query) {
  return request({
    url: '/wms/itemModel/list',
    method: 'get',
    params: query
  })
}

export function listItemModel(query) {
  return request({
    url: '/wms/itemModel/listNoPage',
    method: 'get',
    params: query
  })
}

export function getItemModel(id) {
  return request({
    url: '/wms/itemModel/' + id,
    method: 'get'
  })
}

export function addItemModel(data) {
  return request({
    url: '/wms/itemModel',
    method: 'post',
    data
  })
}

export function updateItemModel(data) {
  return request({
    url: '/wms/itemModel',
    method: 'put',
    data
  })
}

export function delItemModel(id) {
  return request({
    url: '/wms/itemModel/' + id,
    method: 'delete'
  })
}

export function uploadItemModelImage(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: `/wms/itemModel/${id}/image/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
    timeout: 0
  })
}

export function deleteItemModelImage(id) {
  return request({
    url: `/wms/itemModel/${id}/image`,
    method: 'delete'
  })
}

export function listItemModelBrandOptions(categoryId) {
  return request({
    url: '/wms/itemModel/brandOptions/' + categoryId,
    method: 'get'
  })
}

export function listItemModelMaterialOptions(modelId) {
  return request({
    url: '/wms/itemModel/materialOptions/' + modelId,
    method: 'get'
  })
}
