/**
 * 操作日志「系统模块」下拉：只展示左侧边栏结构。
 * @Log title 只作为筛选值挂到对应菜单上，不再单独长出重名子节点，也不再落到「其他」。
 */

const SKIP_MENUS = new Set(['系统监控', '代码生成', '系统工具', '若依官网'])
const NOT_LOG_TITLES = new Set([
  '系统监控', '代码生成', '系统工具', '若依官网', '其他',
  '在线用户', '定时任务', '缓存监控', '缓存列表', '服务监控',
  '数据监控', '表单构建', '系统接口', '生成配置', '测试单表', '测试树表'
])

/** 侧栏菜单名 -> 该页实际写入的 @Log title（含历史旧名） */
const ALIASES = {
  商品管理: ['商品管理', '物料', '商品导入', '商品图片', 'sku信息', '商品分类', '物料类型'],
  品牌管理: ['商品品牌', '商品品牌图片'],
  包型管理: ['Item Model', 'Item Model Image'],
  材质管理: ['Item Material', 'Item Material Image'],
  仓库管理: ['仓库'],
  往来单位: ['往来单位'],
  入库: ['入库单', '入库单详情'],
  出库: ['出库单', '出库单详情'],
  移库: ['移库单', '库存移动详情'],
  盘库: ['库存盘点单据', '库存盘点单据详情', '库存智能核查', '盘库单', '库存盘点'],
  库存统计: ['库存统计', '库存', '库存统计-提交异步导出', '库存统计-批量导出Excel', '库存统计-提交批量异步导出', '库存统计-删除导出记录'],
  库存记录: ['库存记录'],
  未入库商品查询: ['未入库商品'],
  上架管理: ['商品上架', '商品下架', '上架模板', '上架记录', '上架记录删除', '上架重试', '类目同步'],
  平台订单: ['平台订单', '平台订单周报'],
  已采购: ['供应商已采购商品', '供应商结算确认', '供应商待结算单', '供应商结算 Invoice'],
  已结算: ['供应商已结算记录'],
  HR员工档案: ['员工档案', '员工档案附件', '员工档案其他文件批次', '用户与员工档案'],
  用户管理: ['用户管理', '个人信息', '用户头像'],
  '角色管理（权限分配）': ['角色管理'],
  字典管理: ['字典类型', '字典数据'],
  参数设置: ['参数管理'],
  文件管理: ['OSS对象存储', '对象存储配置', '对象存储状态修改'],
  汇总看板: ['主播细项', '主播打卡'],
  排班计划: ['主播排班'],
  开播录入: ['开播记录'],
  佣金管理: ['主播佣金'],
  直播平台管理: ['直播平台管理', '直播平台同步店铺'],
  费率配置: ['主播费率变更', '主播费率账号状态', '主播费率批量同步', '主播费率账号组', '主播离职归档及日期核实'],
  系统设置: ['主播费率类型', '主播特殊金额类型'],
  薪酬结算: ['主播薪酬确认结算', '主播薪酬调整（仅特殊金额）', '主播薪酬登记支付', '主播结算 Invoice'],
  薪酬调整: ['主播薪酬调整', '主播薪酬调整审核'],
  操作日志: ['操作日志'],
  登录日志: ['登录日志', '账户解锁']
}

/** 日志 @Log title -> 侧边栏叶子菜单名 */
const LOG_TITLE_TO_MENU_LABEL = {
  ...Object.fromEntries(
    Object.entries(ALIASES).flatMap(([menuLabel, titles]) =>
      titles.map(title => [title, menuLabel])
    )
  ),
  供应商: '供应商管理'
}

/** 侧边栏没有对应叶子菜单时，挂到上级目录 */
const MENU_FALLBACK_PARENT = {
  包型管理: '基础资料',
  材质管理: '基础资料',
  仓库管理: '基础资料',
  品牌管理: '基础资料',
  盘库: '库存操作',
  入库: '库存操作',
  出库: '库存操作',
  移库: '库存操作',
  汇总看板: '主播薪酬',
  排班计划: '主播薪酬',
  开播录入: '主播薪酬',
  佣金管理: '主播薪酬',
  费率配置: '主播薪酬',
  系统设置: '主播薪酬',
  薪酬结算: '主播薪酬',
  薪酬调整: '主播薪酬'
}

const COMPONENT_ALIASES = {
  'wms/basic/item/index': ALIASES['商品管理'],
  'wms/basic/itemBrand/index': ALIASES['品牌管理'],
  'wms/basic/itemModel/index': ALIASES['包型管理'],
  'wms/basic/itemMaterial/index': ALIASES['材质管理'],
  'wms/basic/warehouse/index': ALIASES['仓库管理'],
  'wms/basic/supplier/index': ['供应商'],
  'wms/basic/merchant/index': ALIASES['往来单位'],
  'wms/hr/employee/index': ALIASES['HR员工档案'],
  'wms/vendor/index': ALIASES['已采购'],
  'wms/vendor/settled': ALIASES['已结算'],
  'wms/platform/listings/index': ALIASES['上架管理'],
  'wms/order/receipt/index': ALIASES['入库'],
  'wms/order/shipment/index': ALIASES['出库'],
  'wms/order/movement/index': ALIASES['移库'],
  'wms/order/check/index': ALIASES['盘库'],
  'wms/inventory/statistic': ALIASES['库存统计'],
  'wms/inventory/history': ALIASES['库存记录'],
  'wms/inventory/unstocked': ALIASES['未入库商品查询'],
  'wms/live/dashboard/index': ALIASES['汇总看板'],
  'wms/live/schedule/index': ALIASES['排班计划'],
  'wms/live/streams/index': ALIASES['开播录入'],
  'wms/live/commissions/index': ALIASES['佣金管理'],
  'wms/live/accounts/index': ALIASES['直播平台管理'],
  'wms/live/rates/index': ALIASES['费率配置'],
  'wms/live/settings/index': ALIASES['系统设置'],
  'wms/live/settlements/index': ALIASES['薪酬结算'],
  'wms/live/adjustments/index': ALIASES['薪酬调整'],
  'monitor/operlog/index': ALIASES['操作日志'],
  'monitor/logininfor/index': ALIASES['登录日志'],
  'system/user/index': ALIASES['用户管理'],
  'system/role/index': ALIASES['角色管理（权限分配）'],
  'system/dict/index': ALIASES['字典管理'],
  'system/config/index': ALIASES['参数设置'],
  'system/oss/index': ALIASES['文件管理']
}

function showingChildren(route) {
  return (route?.children || []).filter(child => child && !child.hidden)
}

function routeTitle(route) {
  const title = route?.meta?.title
  return title ? String(title).trim() : ''
}

function isDisplayableName(name) {
  if (!name || !String(name).trim()) {
    return false
  }
  const trimmed = String(name).trim()
  if (trimmed.includes('\uFFFD')) {
    return false
  }
  let questionMarks = 0
  let letters = 0
  for (const ch of trimmed) {
    if (ch === '?') {
      questionMarks++
    } else if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch.charCodeAt(0) > 127) {
      letters++
    }
  }
  return letters > 0 && questionMarks < letters
}

function flattenOneChild(route) {
  const children = showingChildren(route)
  if (children.length !== 1 || route.alwaysShow) {
    return null
  }
  const only = children[0]
  const nested = showingChildren(only)
  if (nested.length > 0) {
    return null
  }
  return only
}

function convertRoute(route, depth = 0) {
  if (!route || route.hidden || depth > 8) {
    return null
  }
  const flat = flattenOneChild(route)
  if (flat) {
    return convertRoute({
      ...flat,
      hidden: false,
      alwaysShow: false,
      children: flat.children
    }, depth + 1)
  }
  const children = showingChildren(route)
  const label = routeTitle(route)
  const convertedChildren = children.flatMap(child => {
    const converted = convertRoute(child, depth + 1)
    if (!converted) {
      return []
    }
    return Array.isArray(converted) ? converted : [converted]
  })
  if (!label) {
    return convertedChildren
  }
  if (!isDisplayableName(label) || SKIP_MENUS.has(label)) {
    return convertedChildren.length ? convertedChildren : null
  }
  const component = normalizeComponent(route.component)
  return {
    id: `menu:${label}`,
    label,
    component,
    titles: [label],
    children: convertedChildren
  }
}

function normalizeComponent(component) {
  if (!component || typeof component !== 'string') {
    return ''
  }
  let value = component.trim()
  if (value.startsWith('/')) {
    value = value.slice(1)
  }
  return value
}

function uniquifyIds(node, seen = new Map()) {
  const key = node.id
  const count = seen.get(key) || 0
  if (count > 0) {
    node.id = `${key}#${count}`
  }
  seen.set(key, count + 1)
  for (const child of node.children || []) {
    uniquifyIds(child, seen)
  }
}

function collectNodes(nodes, bucket = []) {
  for (const node of nodes || []) {
    bucket.push(node)
    collectNodes(node.children, bucket)
  }
  return bucket
}

export function collectTreeTitles(nodes, bucket = []) {
  for (const node of nodes || []) {
    if (Array.isArray(node.titles)) {
      bucket.push(...node.titles)
    }
    collectTreeTitles(node.children, bucket)
  }
  return [...new Set(bucket.map(item => String(item).trim()).filter(Boolean))]
}

function isLeaf(node) {
  return !node?.children?.length
}

function pickNodes(byLabel, label) {
  const hits = byLabel.get(label) || []
  const leaves = hits.filter(isLeaf)
  return leaves.length ? leaves : hits
}

function parentLabelFor(title) {
  const menuLabel = LOG_TITLE_TO_MENU_LABEL[title]
  if (menuLabel && MENU_FALLBACK_PARENT[menuLabel]) {
    return MENU_FALLBACK_PARENT[menuLabel]
  }
  if (title === '库存智能核查' || title.startsWith('库存盘') || title.startsWith('入库')
    || title.startsWith('出库') || title.startsWith('移库') || title.startsWith('盘库')
    || title.startsWith('库存移动')) {
    return '库存操作'
  }
  if (title.startsWith('Item Model') || title.startsWith('Item Material')
    || title.startsWith('商品') || title.startsWith('仓库') || title.startsWith('品牌')
    || title.startsWith('包型') || title.startsWith('材质') || title.startsWith('往来')) {
    return '基础资料'
  }
  if (title.startsWith('主播') || title.startsWith('直播') || title.startsWith('开播')) {
    return '主播薪酬'
  }
  if (title.startsWith('上架') || title === '商品上架' || title === '商品下架' || title.startsWith('类目')) {
    return '上架管理'
  }
  if (title.includes('已采购') || title.includes('待结算') || title.includes('已结算') || title.includes('结算确认')
    || (title.includes('供应商') && title.includes('Invoice'))) {
    return '供应商管理'
  }
  if (title.startsWith('用户') || title.startsWith('角色') || title.startsWith('菜单') || title.startsWith('部门')
    || title.startsWith('岗位') || title.startsWith('HR') || title.startsWith('员工') || title.startsWith('个人')
    || title.startsWith('字典') || title.startsWith('参数') || title.startsWith('通知') || title.includes('OSS')
    || title.startsWith('对象存储')) {
    return '系统管理'
  }
  if (title.includes('日志') || title === '账户解锁') {
    return '日志管理'
  }
  if (title.startsWith('库存统计') || title === '库存') {
    return '库存统计'
  }
  return null
}

function addTitle(node, title) {
  if (!node.titles.includes(title)) {
    node.titles.push(title)
  }
}

function findBestLeaf(nodes, title) {
  let best = null
  let bestLen = -1
  for (const node of nodes) {
    if (!isLeaf(node) || !node.label || !isDisplayableName(node.label)) {
      continue
    }
    const label = node.label
    const hit = title === label
      || title.startsWith(label)
      || (title.length >= 2 && label.startsWith(title))
    if (hit && label.length > bestLen) {
      best = node
      bestLen = label.length
    }
  }
  return best
}

function assignLogTitles(tree, logTitles) {
  const nodes = collectNodes(tree)
  const byLabel = new Map()
  for (const node of nodes) {
    const list = byLabel.get(node.label) || []
    list.push(node)
    byLabel.set(node.label, list)
  }
  const existing = [...new Set((logTitles || [])
    .map(title => String(title || '').trim())
    .filter(title => title && isDisplayableName(title) && !NOT_LOG_TITLES.has(title)))]
  const assigned = new Set()

  for (const node of nodes) {
    for (const alias of ALIASES[node.label] || []) {
      addTitle(node, alias)
      if (existing.includes(alias)) {
        assigned.add(alias)
      }
    }
    for (const alias of COMPONENT_ALIASES[node.component] || []) {
      addTitle(node, alias)
      if (existing.includes(alias)) {
        assigned.add(alias)
      }
    }
  }

  for (const title of existing) {
    if (assigned.has(title)) {
      continue
    }
    const menuLabel = LOG_TITLE_TO_MENU_LABEL[title]
    if (!menuLabel) {
      continue
    }
    const hits = pickNodes(byLabel, menuLabel)
    if (hits.length) {
      hits.forEach(node => addTitle(node, title))
      assigned.add(title)
      continue
    }
    const fallbackParent = MENU_FALLBACK_PARENT[menuLabel]
    if (fallbackParent) {
      const parents = byLabel.get(fallbackParent)
      if (parents?.length) {
        addTitle(parents[0], title)
        assigned.add(title)
      }
    }
  }

  for (const title of existing) {
    if (assigned.has(title)) {
      continue
    }
    const hits = pickNodes(byLabel, title)
    if (hits.length) {
      hits.forEach(node => addTitle(node, title))
      assigned.add(title)
    }
  }

  for (const title of existing) {
    if (assigned.has(title)) {
      continue
    }
    const best = findBestLeaf(nodes, title)
    if (best) {
      addTitle(best, title)
      assigned.add(title)
    }
  }

  for (const title of existing) {
    if (assigned.has(title)) {
      continue
    }
    const parentLabel = parentLabelFor(title)
    const parents = parentLabel ? byLabel.get(parentLabel) : null
    if (parents?.length) {
      addTitle(parents[0], title)
      assigned.add(title)
    }
  }
}

function rollupTitles(nodes) {
  for (const node of nodes || []) {
    rollupTitles(node.children)
    const merged = []
    const seen = new Set()
    for (const title of [...(node.titles || []), ...((node.children || []).flatMap(child => child.titles || []))]) {
      if (!seen.has(title)) {
        seen.add(title)
        merged.push(title)
      }
    }
    node.titles = merged
  }
}

function pruneEmpty(nodes, existingSet) {
  const out = []
  for (const node of nodes || []) {
    node.children = pruneEmpty(node.children, existingSet)
    const kept = [...new Set([
      ...(node.titles || []).filter(title => existingSet.has(title)),
      ...((node.children || []).flatMap(child => child.titles || []))
    ])]
    if (!kept.length && !(node.children || []).length) {
      continue
    }
    node.titles = kept
    out.push(node)
  }
  return out
}

/** 将后端 @Log title 显示为侧边栏对应菜单名 */
export function resolveOperLogModuleLabel(title) {
  const trimmed = String(title || '').trim()
  if (!trimmed) {
    return trimmed
  }
  if (trimmed === '物料' || trimmed === '物料类型') {
    return '商品管理'
  }
  return LOG_TITLE_TO_MENU_LABEL[trimmed] || trimmed
}

export function buildOperLogModuleTree(sidebarRouters, logTitles) {
  const roots = []
  for (const route of sidebarRouters || []) {
    const converted = convertRoute(route)
    if (!converted) {
      continue
    }
    if (Array.isArray(converted)) {
      roots.push(...converted)
    } else {
      roots.push(converted)
    }
  }
  const seen = new Map()
  for (const root of roots) {
    uniquifyIds(root, seen)
  }
  assignLogTitles(roots, logTitles)
  const existingSet = new Set((logTitles || [])
    .map(title => String(title || '').trim())
    .filter(title => title && isDisplayableName(title) && !NOT_LOG_TITLES.has(title)))
  const pruned = pruneEmpty(roots, existingSet)
  rollupTitles(pruned)
  return pruned
}
