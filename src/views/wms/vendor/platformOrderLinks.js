import { getPlatformOrderExternalUrl } from '@/utils/platformOrderLink'

export function orderLinkKey(skuCode, orderNo) {
  return JSON.stringify([String(skuCode || '').trim(), String(orderNo || '').trim()])
}

// Shared by preloading and retries; cache only resolved URLs, never rejected requests.
export function createOrderLinkLoader({ listOrders, listShops, states = new Map(), concurrency = 4 }) {
  const pending = new Map(), queue = []
  let active = 0, shopsRequest
  function shops() {
    if (!shopsRequest) {
      shopsRequest = Promise.resolve().then(listShops).then(response => response.data || [])
        .catch(error => { shopsRequest = undefined; throw error })
    }
    return shopsRequest
  }
  async function resolve(skuCode, orderNo) {
    if (!skuCode || !orderNo) throw new Error('MISSING')
    const unique = new Map()
    let pageNum = 1
    while (true) {
      const response = await listOrders({ platformOrderId: orderNo, sellerSku: skuCode,
        supplierSalesOnly: true, shipmentStatus: 'FINISH', pageNum, pageSize: 50 })
      const rows = response.rows || []
      for (const row of rows) {
        if (String(row.orderId || row.platformOrderId || '').trim() !== orderNo) continue
        const identity = JSON.stringify([String(row.platform || '').toUpperCase(), String(row.shopAuthId || ''), orderNo])
        const previous = unique.get(identity)
        if (previous && String(previous.shopifyOrderId || '') !== String(row.shopifyOrderId || '')) throw new Error('AMBIGUOUS')
        unique.set(identity, row)
      }
      if (unique.size > 1) throw new Error('AMBIGUOUS')
      if (pageNum * 50 >= Number(response.total || rows.length)) break
      if (!rows.length) throw new Error('QUERY_FAILED')
      pageNum++
    }
    if (!unique.size) throw new Error('NOT_FOUND')
    const order = [...unique.values()][0]
    const url = getPlatformOrderExternalUrl(order, await shops())
    if (!url) throw new Error('MISSING')
    return url
  }
  function drain() {
    while (active < concurrency && queue.length) {
      const { key, skuCode, orderNo, done } = queue.shift()
      active++
      resolve(skuCode, orderNo).then(url => states.set(key, { status: 'ready', url }), error => {
        const reason = ['MISSING', 'AMBIGUOUS', 'NOT_FOUND', 'QUERY_FAILED'].includes(error?.message) ? error.message : 'QUERY_FAILED'
        states.set(key, { status: 'error', reason })
      }).finally(() => {
        active--
        pending.delete(key)
        done(states.get(key))
        drain()
      })
    }
  }
  function load(skuCode, orderNo) {
    skuCode = String(skuCode || '').trim()
    orderNo = String(orderNo || '').trim()
    const key = orderLinkKey(skuCode, orderNo)
    if (pending.has(key)) return pending.get(key)
    if (states.get(key)?.status === 'ready') return Promise.resolve(states.get(key))
    states.set(key, { status: 'loading' })
    let done
    const result = new Promise(resolve => { done = resolve })
    pending.set(key, result)
    queue.push({ key, skuCode, orderNo, done })
    drain()
    return result
  }
  return { load, states }
}
