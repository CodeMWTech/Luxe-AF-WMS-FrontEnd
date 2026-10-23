import request from '@/utils/request'
const root = '/wms/roomTransfer'
export const resolveRoom = token => request({ url: `${root}/resolve`, params: { token } })
export const listTransfers = params => request({ url: `${root}/list`, params })
export const getTransfer = id => request({ url: `${root}/${id}` })
export const createTransfer = data => request({ url: root, method: 'post', data })
export const saveTransfer = (id, data) => request({ url: `${root}/${id}`, method: 'put', data })
export const scanTransfer = (id, data) => request({ url: `${root}/${id}/scan`, method: 'post', data })
export const completeTransfer = (id, data) => request({ url: `${root}/${id}/complete`, method: 'post', data })
export const cancelTransfer = (id, data) => request({ url: `${root}/${id}/cancel`, method: 'post', data })
export const reverseTransfer = id => request({ url: `${root}/${id}/reverse`, method: 'post' })

export const copyFailedTransfer = id => request({ url: `${root}/${id}/copyFailed`, method: 'post' })
