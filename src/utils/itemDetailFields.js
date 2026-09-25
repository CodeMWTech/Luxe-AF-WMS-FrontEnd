// Stored dimensions are inches (bagWidth = 长, bagDepth = 宽).
export const ITEM_DIMENSION_FIELDS = [
  { key: 'size', label: '尺寸' },
  { key: 'bagWidth', label: '长（英寸）' },
  { key: 'bagDepth', label: '宽（英寸）' },
  { key: 'bagHeight', label: '高（英寸）' }
]

export function itemDimensionFields(item = {}, tr = text => text) {
  return ITEM_DIMENSION_FIELDS.map(({ key, label }) => ({
    key, label: tr(label), value: item[key] === null || item[key] === undefined || item[key] === '' ? '--' : item[key]
  }))
}

// JSON.stringify drops undefined, but null explicitly requests clearing an optional association.
export function itemRelationPayload(item) {
  const modelId = item.modelId === '' || item.modelId == null ? null : item.modelId
  const materialId = modelId == null || item.materialId === '' || item.materialId == null ? null : item.materialId
  return { modelId, materialId, material: materialId == null ? null : (item.material ?? null) }
}
