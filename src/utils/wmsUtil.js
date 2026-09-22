export function getWarehouseAndSkuKey (row) {
  return row.warehouseId + '_' + row.skuId
}

export function getSourceWarehouseAndSkuKey (row) {
  return row.sourceWarehouseId + '_' + row.skuId
}

/** Keep catalog IDs as strings. Number() truncates snowflake IDs and breaks filters. */
export function toCatalogId(value) {
  if (value == null || value === '') return undefined
  const text = String(value).trim()
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return undefined
  return text
}

/** Keep tree-select values as strings so snowflake IDs match route/form state. */
export function stringifyCatalogTree(nodes) {
  if (!Array.isArray(nodes) || !nodes.length) return []
  return nodes.map((node) => ({
    ...node,
    id: toCatalogId(node.id) ?? node.id,
    parentId: node.parentId == null ? node.parentId : (toCatalogId(node.parentId) ?? node.parentId),
    children: stringifyCatalogTree(node.children || [])
  }))
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
      id: toCatalogId(node.id) ?? node.id,
      shortLabel: name,
      label: name,
      pathLabel: path.length ? path.join('/') : name,
      children: children.length ? children : undefined
    }
  })
}

export function disableNonLeafCatalogNodes(nodes) {
  if (!Array.isArray(nodes) || !nodes.length) return []
  return nodes.map((node) => {
    const children = disableNonLeafCatalogNodes(node.children || [])
    const hasChildren = children.length > 0
    return {
      ...node,
      children: hasChildren ? children : undefined,
      disabled: hasChildren
    }
  })
}

export function findCatalogNode(nodes, id) {
  const target = toCatalogId(id)
  if (!target || !Array.isArray(nodes)) return null
  for (const node of nodes) {
    if (toCatalogId(node.id) === target) return node
    const found = findCatalogNode(node.children, id)
    if (found) return found
  }
  return null
}

export function isCatalogLeafId(nodes, id) {
  const node = findCatalogNode(nodes, id)
  if (!node) return false
  return !Array.isArray(node.children) || node.children.length === 0
}

/** Join selected catalog hierarchy labels for list titles, e.g. Handbag / LV / 包型列表 */
export function joinCatalogPath(...parts) {
  return parts.map((part) => (part == null ? '' : String(part).trim())).filter(Boolean).join(' / ')
}

const catalogNameCollator = new Intl.Collator('en', { sensitivity: 'base' })

/** A–Z by English-ish name; keep dropdown and list/gallery in the same order. */
export function sortByCatalogName(rows = [], nameKey = 'name') {
  return [...rows].sort((a, b) => {
    const nameA = String(a?.[nameKey] || '').trim()
    const nameB = String(b?.[nameKey] || '').trim()
    if (!nameA) return nameB ? 1 : 0
    if (!nameB) return -1
    const byName = catalogNameCollator.compare(nameA, nameB)
    if (byName !== 0) return byName
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  })
}
