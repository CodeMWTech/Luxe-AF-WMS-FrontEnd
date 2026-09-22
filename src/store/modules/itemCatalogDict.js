import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listItemModel, listItemModelBrandOptions, listItemModelMaterialOptions } from '@/api/wms/itemModel'
import { listItemMaterial } from '@/api/wms/itemMaterial'
import { toCatalogId } from '@/utils/wmsUtil'

const TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_STATUS = '1'

function cacheKey(parts) {
  return parts.map(part => String(part ?? '')).join('|')
}

function cloneList(list) {
  if (!Array.isArray(list)) return []
  return list.map(item => (item && typeof item === 'object' ? { ...item } : item))
}

function isFresh(entry) {
  return !!(entry && Date.now() - entry.at < TTL_MS)
}

/**
 * Keyed dropdown cache for item add/edit:
 * brands by category, models by category+brand+status, materials by model+status.
 * In-flight requests are shared; writes bump an epoch so stale responses are not stored.
 */
export const useItemCatalogDictStore = defineStore('itemCatalogDict', () => {
  const brandIds = ref({})
  const models = ref({})
  const materials = ref({})
  const inflight = new Map()
  const epochs = { brand: 0, model: 0, material: 0 }

  function invalidateBucket(kind, bucket, prefix) {
    epochs[kind] += 1
    bucket.value = {}
    for (const key of [...inflight.keys()]) {
      if (key.startsWith(prefix)) inflight.delete(key)
    }
  }

  function readFresh(bucket, key) {
    const entry = bucket.value[key]
    return isFresh(entry) ? entry : null
  }

  async function loadShared(key, fetcher) {
    const pending = inflight.get(key)
    if (pending) return pending
    const promise = (async () => {
      try {
        return await fetcher()
      } finally {
        if (inflight.get(key) === promise) inflight.delete(key)
      }
    })()
    inflight.set(key, promise)
    return promise
  }

  function brandCacheKey(categoryId) {
    return cacheKey(['brand', categoryId])
  }

  function modelCacheKey(categoryId, brandId, status) {
    return cacheKey(['model', categoryId, brandId, status])
  }

  function materialCacheKey(modelId, status) {
    return cacheKey(['material', modelId, status])
  }

  function peekBrandIds(categoryId) {
    const id = toCatalogId(categoryId)
    if (!id) return null
    const entry = readFresh(brandIds, brandCacheKey(id))
    return entry ? cloneList(entry.data) : null
  }

  function peekModels({ itemCategory, itemBrand, status = DEFAULT_STATUS } = {}) {
    const category = toCatalogId(itemCategory)
    const brand = toCatalogId(itemBrand)
    if (!category || !brand) return null
    const entry = readFresh(models, modelCacheKey(category, brand, status))
    return entry ? cloneList(entry.data) : null
  }

  function peekMaterials({ modelId, status = DEFAULT_STATUS } = {}) {
    const id = toCatalogId(modelId)
    if (!id) return null
    const entry = readFresh(materials, materialCacheKey(id, status))
    return entry ? { ids: cloneList(entry.ids), list: cloneList(entry.list) } : null
  }

  async function loadBrandIds(categoryId) {
    const id = toCatalogId(categoryId)
    if (!id) return []
    const key = brandCacheKey(id)
    const cached = peekBrandIds(id)
    if (cached) return cached
    const epoch = epochs.brand
    return loadShared(key, async () => {
      const again = peekBrandIds(id)
      if (again) return again
      const res = await listItemModelBrandOptions(id)
      const data = res.data || []
      if (epoch === epochs.brand) {
        brandIds.value = { ...brandIds.value, [key]: { data, at: Date.now() } }
      }
      return cloneList(data)
    })
  }

  async function loadModels({ itemCategory, itemBrand, status = DEFAULT_STATUS } = {}) {
    const category = toCatalogId(itemCategory)
    const brand = toCatalogId(itemBrand)
    if (!category || !brand) return []
    const key = modelCacheKey(category, brand, status)
    const cached = peekModels({ itemCategory: category, itemBrand: brand, status })
    if (cached) return cached
    const epoch = epochs.model
    return loadShared(key, async () => {
      const again = peekModels({ itemCategory: category, itemBrand: brand, status })
      if (again) return again
      const res = await listItemModel({
        status,
        itemBrand: brand,
        itemCategory: category
      })
      const data = res.data || []
      if (epoch === epochs.model) {
        models.value = { ...models.value, [key]: { data, at: Date.now() } }
      }
      return cloneList(data)
    })
  }

  async function loadMaterials({ modelId, status = DEFAULT_STATUS } = {}) {
    const id = toCatalogId(modelId)
    if (!id) return { ids: [], list: [] }
    const key = materialCacheKey(id, status)
    const cached = peekMaterials({ modelId: id, status })
    if (cached) return cached
    const epoch = epochs.material
    return loadShared(key, async () => {
      const again = peekMaterials({ modelId: id, status })
      if (again) return again
      const [idsRes, listRes] = await Promise.all([
        listItemModelMaterialOptions(id),
        listItemMaterial({ status, modelId: id })
      ])
      const entry = {
        ids: idsRes.data || [],
        list: listRes.data || [],
        at: Date.now()
      }
      if (epoch === epochs.material) {
        materials.value = { ...materials.value, [key]: entry }
      }
      return { ids: cloneList(entry.ids), list: cloneList(entry.list) }
    })
  }

  function invalidateBrands() {
    invalidateBucket('brand', brandIds, 'brand|')
  }

  function invalidateModels() {
    invalidateBucket('model', models, 'model|')
  }

  function invalidateMaterials() {
    invalidateBucket('material', materials, 'material|')
  }

  function invalidateAll() {
    invalidateBrands()
    invalidateModels()
    invalidateMaterials()
  }

  return {
    loadBrandIds,
    loadModels,
    loadMaterials,
    peekBrandIds,
    peekModels,
    peekMaterials,
    invalidateBrands,
    invalidateModels,
    invalidateMaterials,
    invalidateAll
  }
})
