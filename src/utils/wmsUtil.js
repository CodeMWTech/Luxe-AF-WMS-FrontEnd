export function getWarehouseAndSkuKey (row) {
  return row.warehouseId + '_' + row.skuId
}

export function getSourceWarehouseAndSkuKey (row) {
  return row.sourceWarehouseId + '_' + row.skuId
}

/**
 * Clone category tree for tree-select:
 * - pathLabel: full path for the closed input (e.g. Accessory/Belts)
 * - shortLabel / label: leaf name only for dropdown tree nodes
 */
export function withCategoryPathLabels(nodes, parentPath = []) {
  if (!Array.isArray(nodes) || !nodes.length) return []
  return nodes.map((node) => {
    const name = node.label || node.categoryName || ''
    const path = name ? [...parentPath, name] : [...parentPath]
    const children = withCategoryPathLabels(node.children || [], path)
    return {
      ...node,
      shortLabel: name,
      label: name,
      pathLabel: path.length ? path.join('/') : name,
      children: children.length ? children : undefined
    }
  })
}

/** Join selected catalog hierarchy labels for list titles, e.g. Handbag / LV / 包型列表 */
export function joinCatalogPath(...parts) {
  return parts.map((part) => (part == null ? '' : String(part).trim())).filter(Boolean).join(' / ')
}
