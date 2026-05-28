/**
 * 前端统一隐藏的菜单/路由（侧栏、动态路由、菜单管理列表等均基于此配置）
 */

export const HIDDEN_FRONTEND_ROUTE_PATHS = [
  '/monitor',
  'monitor',
  // 系统管理：字典、参数、公告、文件（OSS）
  'dict',
  '/system/dict',
  'config',
  '/system/config',
  'notice',
  '/system/notice',
  'oss',
  '/system/oss',
  // 系统工具：代码生成
  'gen',
  '/tool/gen',
  'tool/gen'
]

/** 前端 router 里需拦截注册的动态路由 path */
export const HIDDEN_DYNAMIC_ROUTE_PATHS = [
  '/system/dict-data',
  '/system/oss-config',
  '/tool/gen-edit'
]

/** 组件路径：精确匹配目录名或以其为前缀的子路径，避免误伤如 system/dictionary */
const HIDDEN_MENU_COMPONENT_MATCHERS = [
  { prefix: 'monitor/' },
  { exact: 'system/dict' },
  { prefix: 'system/dict/' },
  { exact: 'system/config' },
  { prefix: 'system/config/' },
  { exact: 'system/notice' },
  { prefix: 'system/notice/' },
  { exact: 'system/oss' },
  { prefix: 'system/oss/' },
  { exact: 'tool/gen' },
  { prefix: 'tool/gen/' }
]

const HIDDEN_PERMS_PREFIXES = [
  'monitor:',
  'system:dict:',
  'system:config:',
  'system:notice:',
  'system:oss:',
  'tool:gen:'
]

function pathVariants(p) {
  const s = String(p).trim()
  if (!s) return new Set()
  const set = new Set([s])
  if (s.startsWith('/')) set.add(s.slice(1))
  else set.add(`/${s}`)
  return set
}

/** 与动态路由侧栏过滤一致：按路由 path 判断 */
export function isHiddenMenuPath(path) {
  if (path === undefined || path === null || path === '') return false
  const vPath = pathVariants(path)
  for (const h of HIDDEN_FRONTEND_ROUTE_PATHS) {
    const vH = pathVariants(h)
    for (const a of vPath) {
      if (vH.has(a)) return true
    }
  }
  return false
}

function isHiddenMenuComponent(component) {
  if (!component || typeof component !== 'string') return false
  const c = component.trim()
  return HIDDEN_MENU_COMPONENT_MATCHERS.some(({ exact, prefix }) => {
    if (exact !== undefined) {
      if (c === exact) return true
    }
    if (prefix !== undefined) {
      return c.startsWith(prefix)
    }
    return false
  })
}

function isHiddenMenuPerms(perms) {
  if (!perms || typeof perms !== 'string') return false
  return HIDDEN_PERMS_PREFIXES.some(prefix => perms.startsWith(prefix))
}

/**
 * 菜单管理、上级菜单树等：按 path、组件路径、权限前缀识别（与侧栏隐藏范围一致）
 */
export function isHiddenMenuRecord(row) {
  if (!row) return false
  return (
    isHiddenMenuPath(row.path) ||
    isHiddenMenuComponent(row.component) ||
    isHiddenMenuPerms(row.perms)
  )
}

/**
 * 过滤菜单树；目录类型在子节点全部被隐藏后一并移除
 */
export function filterHiddenMenusFromTree(nodes) {
  if (!nodes?.length) return []
  return nodes
    .filter(node => !isHiddenMenuRecord(node))
    .map(node => ({
      ...node,
      children: filterHiddenMenusFromTree(node.children || [])
    }))
    .filter(node => {
      if (node.menuType === 'M' && (!node.children || node.children.length === 0)) {
        return false
      }
      return true
    })
}

function isUnderHiddenAncestor(row, byId) {
  if (isHiddenMenuRecord(row)) return true
  let p = row.parentId
  const guard = new Set()
  while (p && p !== 0 && !guard.has(p)) {
    guard.add(p)
    const parent = byId.get(p)
    if (!parent) break
    if (isHiddenMenuRecord(parent)) return true
    p = parent.parentId
  }
  return false
}

/**
 * 由菜单扁平列表得到「应在前端隐藏的 menuId」集合（含位于隐藏菜单下的子节点），供角色权限树等仅有 id/label 的树过滤
 */
export function buildHiddenMenuIdSet(flatMenus) {
  const menuTypeById = new Map()
  if (!flatMenus?.length) {
    return { hiddenIds: new Set(), menuTypeById }
  }
  const byId = new Map(flatMenus.map(m => [m.menuId, m]))
  for (const m of flatMenus) {
    menuTypeById.set(m.menuId, m.menuType)
  }
  const hiddenIds = new Set()
  for (const m of flatMenus) {
    if (isUnderHiddenAncestor(m, byId)) hiddenIds.add(m.menuId)
  }
  return { hiddenIds, menuTypeById }
}

/**
 * 过滤 /system/menu/treeselect、roleMenuTreeselect 返回的树（节点字段 id / label / children）
 */
export function filterTreeselectMenuTree(nodes, hiddenIds, menuTypeById) {
  if (!nodes?.length) return []
  const out = []
  for (const node of nodes) {
    if (hiddenIds.has(node.id)) continue
    const rawCh = node.children
    const children =
      rawCh && rawCh.length ? filterTreeselectMenuTree(rawCh, hiddenIds, menuTypeById) : []
    const mt = menuTypeById.get(node.id)
    if (children.length === 0 && mt === 'M') continue
    const next = { ...node }
    if (children.length > 0) next.children = children
    else delete next.children
    out.push(next)
  }
  return out
}
