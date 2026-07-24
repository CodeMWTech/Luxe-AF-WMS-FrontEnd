/**
 * 品牌 ID 一律按字符串处理，避免雪花 ID 超过 JS 安全整数后精度丢失。
 */

export function parseBrandIdList(value, fallbackBrandId) {
  if (Array.isArray(value)) {
    return value.map((id) => String(id).trim()).filter(Boolean)
  }
  if (value != null && value !== '') {
    return String(value)
      .split(/[,，]/)
      .map((id) => id.trim())
      .filter(Boolean)
  }
  if (fallbackBrandId != null && fallbackBrandId !== '') {
    return [String(fallbackBrandId).trim()].filter(Boolean)
  }
  return []
}

/** 将选中值规范为品牌列表里的 canonical 字符串 ID（仅保留能匹配到的） */
export function normalizeBrandIdsAgainstList(ids, brandList = []) {
  const list = Array.isArray(brandList) ? brandList : []
  const result = []
  for (const raw of parseBrandIdList(ids)) {
    const found = list.find((b) => String(b?.id) === String(raw))
    if (found) {
      result.push(String(found.id))
    }
  }
  return result
}

export function resolveBrandName(id, brandMap, brandList = []) {
  if (id == null || id === '') return ''
  const key = String(id)
  const fromMap = brandMap?.get?.(key) || brandMap?.get?.(id)
  if (fromMap?.brandName) return fromMap.brandName
  const fromList = (brandList || []).find((b) => String(b?.id) === key)
  return fromList?.brandName || ''
}

export function formatBrandNames(item, brandMap, brandList = []) {
  if (!item) return ''
  if (item.brandNames) return item.brandNames
  if (item.brandName && !item.itemBrandIds) return item.brandName
  const ids = parseBrandIdList(item.itemBrandIds, item.itemBrand)
  if (!ids.length) return item.brandName || ''
  return ids
    .map((id) => resolveBrandName(id, brandMap, brandList))
    .filter(Boolean)
    .join(', ')
}
