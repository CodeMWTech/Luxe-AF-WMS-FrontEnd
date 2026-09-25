// Stored dimensions are inches (bagWidth = 长 / Bag Width, bagDepth = 宽 / Bag Depth).
// Labels match the item-management form in both locales. Do not route 长/宽/高
// through runtime-map: those single characters substring-replace unrelated text.
export const ITEM_DIMENSION_FIELDS = [
  { key: 'size', label: '尺寸', labelEn: 'Size' },
  { key: 'bagWidth', label: '长', labelEn: 'Bag Width' },
  { key: 'bagDepth', label: '宽', labelEn: 'Bag Depth' },
  { key: 'bagHeight', label: '高', labelEn: 'Bag Height' }
]

export function itemDimensionLabel(field, isEn = false) {
  return isEn ? field.labelEn : field.label
}

export function formatItemDimensionValue(key, value, isEn = false) {
  if (value === null || value === undefined || value === '') return '--'
  if (key === 'size') return value
  return isEn ? `${value} inch` : `${value} 英寸`
}

export function itemDimensionFields(item = {}, options = {}) {
  const isEn = typeof options === 'function' ? false : !!options.isEn
  return ITEM_DIMENSION_FIELDS.map((field) => ({
    key: field.key,
    label: itemDimensionLabel(field, isEn),
    value: formatItemDimensionValue(field.key, item[field.key], isEn)
  }))
}

// JSON.stringify drops undefined, but null explicitly requests clearing an optional association.
export function itemRelationPayload(item) {
  const modelId = item.modelId === '' || item.modelId == null ? null : item.modelId
  const materialId = modelId == null || item.materialId === '' || item.materialId == null ? null : item.materialId
  return { modelId, materialId, material: materialId == null ? null : (item.material ?? null) }
}
