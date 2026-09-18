/**
 * 操作日志「系统模块」下拉：结构和左侧边栏完全一致，日志标题挂到对应分类下。
 */

const HIDDEN_TITLE_ALIASES = new Set(['物料', '物料类型'])
const SKIP_MENUS = new Set(['系统监控', '代码生成', '系统工具', '若依官网'])
const NOT_LOG_TITLES = new Set([
  '系统监控', '代码生成', '系统工具', '若依官网', '其他',
  '在线用户', '定时任务', '缓存监控', '缓存列表', '服务监控',
  '数据监控', '表单构建', '系统接口', '生成配置'
])

const ALIASES = {
  商品管理: ['物料', '商品导入', '商品图片', 'sku信息', '商品分类', '物料类型'],
  品牌: ['商品品牌', '商品品牌图片'],
  商品品牌: ['商品品牌', '商品品牌图片'],
  包型: ['Item Model', 'Item Model Image'],
  材质: ['Item Material', 'Item Material Image'],
  仓库: ['仓库'],
  供应商: ['供应商'],
  往来单位: ['往来单位'],
  入库单: ['入库单详情'],
  出库单: ['出库单详情'],
  移库单: ['库存移动详情'],
  盘库单: ['库存盘点单据', '库存盘点单据详情', '库存智能核查'],
  库存盘点: ['库存盘点单据', '库存盘点单据详情', '库存智能核查'],
  库存盘点单据: ['库存盘点单据详情', '库存智能核查'],
  库存统计: ['库存', '库存统计-提交异步导出', '库存统计-批量导出Excel', '库存统计-提交批量异步导出', '库存统计-删除导出记录'],
  库存记录: ['库存记录'],
  未入库商品: ['未入库商品'],
  未入库商品查询: ['未入库商品'],
  商品上架: ['商品下架', '上架模板', '上架记录', '上架记录删除', '上架重试', '类目同步'],
  上架管理: ['商品上架', '商品下架', '上架模板', '上架记录', '上架记录删除', '上架重试', '类目同步'],
  平台订单: ['平台订单周报'],
  已采购: ['供应商已采购商品', '供应商结算确认', '供应商待结算单', '供应商结算 Invoice'],
  已结算: ['供应商已结算记录'],
  HR员工档案: ['员工档案', '员工档案附件', '员工档案其他文件批次', '用户与员工档案'],
  用户管理: ['个人信息', '用户头像'],
  主播薪酬: ['主播细项', '主播打卡', '主播排班', '开播记录', '主播佣金', '直播平台管理', '直播平台同步店铺', '主播费率变更', '主播费率账号状态', '主播费率批量同步', '主播费率账号组', '主播费率类型', '主播特殊金额类型', '主播离职归档及日期核实', '主播薪酬确认结算', '主播薪酬调整（仅特殊金额）', '主播薪酬登记支付', '主播薪酬调整', '主播薪酬调整审核', '主播结算 Invoice'],
  日志管理: ['操作日志', '登录日志', '账户解锁'],
  系统管理: ['部门管理', '菜单管理', '角色管理', '岗位管理', '参数管理', '字典类型', '字典数据', '通知公告', 'OSS对象存储', '对象存储配置', '对象存储状态修改']
}

const TITLE_TO_PARENT = {
  仓库: '基础资料',
  供应商: '基础资料',
  商品品牌: '基础资料',
  商品品牌图片: '基础资料',
  商品管理: '基础资料',
  商品分类: '基础资料',
  商品图片: '基础资料',
  sku信息: '基础资料',
  商品导入: '基础资料',
  往来单位: '基础资料',
  包型: '基础资料',
  材质: '基础资料',
  物料: '基础资料',
  物料类型: '基础资料'
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
  return {
    id: `menu:${label}`,
    label,
    titles: [label],
    children: convertedChildren
  }
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

function parentLabelFor(title) {
  if (TITLE_TO_PARENT[title]) {
    return TITLE_TO_PARENT[title]
  }
  if (title.startsWith('主播') || title.startsWith('直播') || title.startsWith('开播')) {
    return '主播薪酬'
  }
  if (title.startsWith('上架') || title === '商品上架' || title === '商品下架' || title.startsWith('类目')) {
    return '上架管理'
  }
  if (title.startsWith('入库') || title.startsWith('出库') || title.startsWith('移库') || title.startsWith('盘库')
    || title.startsWith('库存盘') || title.startsWith('库存移动')) {
    return '库存操作'
  }
  if (title.includes('已采购') || title.includes('待结算') || title.includes('已结算') || title.includes('结算确认')
    || (title.includes('供应商') && title.includes('Invoice'))) {
    return '供应商管理'
  }
  if (title.startsWith('用户') || title.startsWith('角色') || title.startsWith('菜单') || title.startsWith('部门')
    || title.startsWith('岗位') || title.startsWith('HR') || title.startsWith('员工') || title.startsWith('个人')) {
    return '系统管理'
  }
  if (title.includes('日志') || title === '账户解锁') {
    return '日志管理'
  }
  if (title.startsWith('库存统计') || title === '库存') {
    return '库存统计'
  }
  if (title.startsWith('商品') || title.startsWith('仓库') || title.startsWith('品牌')
    || title.startsWith('包型') || title.startsWith('材质') || title.startsWith('往来')) {
    return '基础资料'
  }
  return null
}

function addTitle(node, title) {
  if (!node.titles.includes(title)) {
    node.titles.push(title)
  }
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
  }

  for (const title of existing) {
    if (assigned.has(title)) {
      continue
    }
    const hits = byLabel.get(title)
    if (hits?.length) {
      hits.forEach(node => addTitle(node, title))
      assigned.add(title)
    }
  }

  for (const title of existing) {
    if (assigned.has(title)) {
      continue
    }
    let best = null
    let bestLen = -1
    for (const node of nodes) {
      if (title === node.label || title.startsWith(node.label)) {
        if (node.label.length > bestLen) {
          best = node
          bestLen = node.label.length
        }
      }
    }
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

  for (const node of nodes) {
    const childLabels = new Set((node.children || []).map(child => child.label))
    const extras = node.titles.filter(title =>
      existing.includes(title)
      && isDisplayableName(title)
      && !HIDDEN_TITLE_ALIASES.has(title)
      && title !== node.label
      && !childLabels.has(title)
    ).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    for (const title of extras) {
      node.children.push({
        id: `title:${title}`,
        label: title,
        titles: [title],
        children: []
      })
    }
  }

  const unmatched = existing.filter(title => !assigned.has(title) && !HIDDEN_TITLE_ALIASES.has(title))
  unmatched.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  if (unmatched.length) {
    tree.push({
      id: 'other',
      label: '其他',
      titles: [...unmatched],
      children: unmatched.map(title => ({
        id: `title:${title}`,
        label: title,
        titles: [title],
        children: []
      }))
    })
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
      ...(node.titles || []).filter(title => existingSet.has(title) && !HIDDEN_TITLE_ALIASES.has(title)),
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
    .filter(title => title && isDisplayableName(title) && !NOT_LOG_TITLES.has(title) && !HIDDEN_TITLE_ALIASES.has(title)))
  const pruned = pruneEmpty(roots, existingSet)
  rollupTitles(pruned)
  return pruned
}
