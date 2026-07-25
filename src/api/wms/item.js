import request from '@/utils/request';

/**
 * 查询物料列表
 * @param query
 * @returns {*}
 */

export function listItemPage(query) {
  return request({
    url: '/wms/item/list',
    method: 'get',
    params: query
  });
};

export function listItem(query) {
  return request({
    url: '/wms/item/listNoPage',
    method: 'get',
    params: query
  });
};

/**
 * 查询物料列表 以sku为维度
 * @param query
 * @returns {*}
 */

export function listItemGroupBySku(query) {
  return request({
    url: '/wms/itemSku/selectList',
    method: 'get',
    params: query
  });
};

/**
 * 查询物料详细
 * @param id
 */
export function getItem(id) {
  return request({
    url: '/wms/item/' + id,
    method: 'get'
  });
};

/**
 * 新增物料
 * @param data
 */
export function addItem(data) {
  return request({
    url: '/wms/item',
    method: 'post',
    data: data
  });
};

/**
 * 修改物料
 * @param data
 */
export function updateItem(data) {
  return request({
    url: '/wms/item',
    method: 'put',
    data: data
  });
};

/**
 * 删除物料
 * @param id
 */
export function delItem(id) {
  return request({
    url: '/wms/item/' + id,
    method: 'delete'
  });
};

/**
 * 上传商品图片（方案B：按商品维度上传）
 * @param itemId 商品ID
 * @param file 图片文件
 * @param isMain 是否主图
 * @param sort 排序
 */
export function uploadItemImage(itemId, file, isMain, sort) {
  const formData = new FormData();
  formData.append('file', file);
  const params = {};
  if (isMain != null) params.isMain = isMain;
  if (sort != null) params.sort = sort;
  return request({
    url: `/wms/item/${itemId}/image/upload`,
    method: 'post',
    data: formData,
    params,
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
    timeout: 0  // 不限制超时，允许上传任意时长
  });
}

/**
 * 查询商品图片列表（异步上传完成后会带 url）
 * @param itemId 商品ID
 */
export function getItemImages(itemId) {
  return request({
    url: `/wms/item/${itemId}/images`,
    method: 'get'
  });
}

/**
 * 下载商品原图
 * @param imageId 商品图片记录ID
 */
export function downloadItemImage(imageId) {
  return request({
    url: `/wms/item/image/${imageId}/download`,
    method: 'get',
    responseType: 'blob'
  });
}

/**
 * 删除商品图片
 * @param imageId 图片ID
 */
export function deleteItemImage(imageId) {
  return request({
    url: `/wms/item/image/${imageId}`,
    method: 'delete'
  });
}

// 下载商品导入模板
export function downloadItemImportTemplate(config = {}) {
  return request({
    url: '/wms/item/import/template',
    method: 'get',
    responseType: 'blob',
    timeout: 0,
    ...config,
    headers: {
      ...(config.headers || {})
    }
  })
}

// 提交商品 Excel 异步导入
export function importItemsByExcel(excel, images, config = {}) {
  const formData = new FormData()
  formData.append('excel', excel)
  formData.append('images', images)
  const { onUploadProgress, ...restConfig } = config
  return request({
    url: '/wms/item/import',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
    timeout: 0,
    onUploadProgress,
    ...restConfig
  })
}

// 查询商品导入任务
export function listItemImportTasks(query) {
  return request({
    url: '/wms/item/import/tasks',
    method: 'get',
    params: query
  })
}

// 查询商品导入明细
export function listItemImportDetails(taskId, query) {
  return request({
    url: `/wms/item/import/tasks/${taskId}/details`,
    method: 'get',
    params: query
  })
}
