import { defineStore } from 'pinia'

const STORAGE_KEY = 'wms-mobile-sku-search'

function serializeResults(results = []) {
  return results.map(item => ({
    skuId: item.skuId,
    itemId: item.itemId,
    skuCode: item.skuCode,
    itemName: item.itemName,
    brandName: item.brandName,
    modelName: item.modelName,
    categoryName: item.categoryName,
    currentStatus: item.currentStatus,
    inventoryStatus: item.inventoryStatus,
    quantity: item.quantity,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    itemImage: item.itemImage,
    source: item.source,
    raw: item.raw
  }))
}

function readStorage() {
  if (typeof sessionStorage === 'undefined') {
    return { skuCode: '', searched: false, results: [] }
  }
  try {
    const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
    return {
      skuCode: cached.skuCode || '',
      searched: Boolean(cached.searched),
      results: Array.isArray(cached.results) ? cached.results : []
    }
  } catch {
    return { skuCode: '', searched: false, results: [] }
  }
}

function writeStorage(state) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      skuCode: state.skuCode,
      searched: state.searched,
      results: serializeResults(state.results)
    }))
  } catch {
    // raw 字段过大或不可序列化时忽略持久化
  }
}

export const useMobileSkuSearchStore = defineStore('mobileSkuSearch', {
  state: () => readStorage(),
  actions: {
    saveSearchState(payload = {}) {
      if (payload.skuCode !== undefined) this.skuCode = payload.skuCode
      if (payload.searched !== undefined) this.searched = payload.searched
      if (payload.results !== undefined) this.results = payload.results
      writeStorage(this)
    },
    restoreFromStorage() {
      const cached = readStorage()
      this.skuCode = cached.skuCode
      this.searched = cached.searched
      this.results = cached.results
    },
    clearSearchState() {
      this.skuCode = ''
      this.searched = false
      this.results = []
      writeStorage(this)
    }
  }
})
