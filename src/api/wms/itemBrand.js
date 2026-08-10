import request from '@/utils/request'

// 查询商品品牌列表
export function listItemBrandPage(query) {
  return request({
    url: '/wms/itemBrand/list',
    method: 'get',
    params: query
  })
}

// 查询商品品牌列表
export function listItemBrand(query) {
  return request({
    url: '/wms/itemBrand/listNoPage',
    method: 'get',
    params: query
  })
}

// 查询商品品牌详细
export function getItemBrand(id) {
  return request({
    url: '/wms/itemBrand/' + id,
    method: 'get'
  })
}

// 新增商品品牌
export function addItemBrand(data) {
  return request({
    url: '/wms/itemBrand',
    method: 'post',
    data: data
  })
}

// 修改商品品牌
export function updateItemBrand(data) {
  return request({
    url: '/wms/itemBrand',
    method: 'put',
    data: data
  })
}

// 删除商品品牌；传入 itemCategory 时：开放池分类=从本分类解绑，绑定分类=删实体
export function delItemBrand(id, itemCategory) {
  return request({
    url: '/wms/itemBrand/' + id,
    method: 'delete',
    params: itemCategory != null && itemCategory !== '' ? { itemCategory } : undefined
  })
}

export function uploadItemBrandImage(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: `/wms/itemBrand/${id}/image/upload`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
    timeout: 0
  })
}

export function deleteItemBrandImage(id) {
  return request({
    url: `/wms/itemBrand/${id}/image`,
    method: 'delete'
  })
}
