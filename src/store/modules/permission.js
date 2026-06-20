import auth from '@/plugins/auth'
import router, { constantRoutes, dynamicRoutes } from '@/router'
import { getRouters } from '@/api/menu'
import Layout from '@/layout/index'
import ParentView from '@/components/ParentView'
import InnerLink from '@/layout/components/InnerLink'
import { HIDDEN_DYNAMIC_ROUTE_PATHS, isHiddenMenuPath } from '@/utils/hiddenMenus'

// 递归过滤 sidebar 路由
function filterSidebarRoutes(routes) {
  return routes
    .filter(route => !isHiddenMenuPath(route.path))
    .map(route => {
      if (route.children && route.children.length) {
        route.children = filterSidebarRoutes(route.children)
      }
      return route
    })
}

// 匹配views里面所有的.vue文件
const modules = import.meta.glob('./../../views/**/*.vue')

const usePermissionStore = defineStore(
  'permission',
  {
    state: () => ({
      routes: [],
      addRoutes: [],
      defaultRoutes: [],
      topbarRouters: [],
      sidebarRouters: []
    }),
    actions: {
      setRoutes(routes) {
        this.addRoutes = routes
        this.routes = constantRoutes.concat(routes)
      },
      setDefaultRoutes(routes) {
        this.defaultRoutes = constantRoutes.concat(routes)
      },
      setTopbarRoutes(routes) {
        this.topbarRouters = routes
      },
      setSidebarRouters(routes) {
        this.sidebarRouters = routes
      },
      generateRoutes(roles) {
        return new Promise(resolve => {
          // 向后端请求路由数据
          getRouters().then(res => {
            const sdata = JSON.parse(JSON.stringify(res.data))
            const rdata = JSON.parse(JSON.stringify(res.data))
            const defaultData = JSON.parse(JSON.stringify(res.data))
            const sidebarRoutes = filterAsyncRouter(sdata)
            const rewriteRoutes = filterAsyncRouter(rdata, false, true)
            const defaultRoutes = filterAsyncRouter(defaultData)
            const asyncRoutes = filterDynamicRoutes(dynamicRoutes).filter(
              route => !HIDDEN_DYNAMIC_ROUTE_PATHS.includes(route.path)
            )
            asyncRoutes.forEach(route => { router.addRoute(route) })
            const filteredSidebarRoutes = filterSidebarRoutes(sidebarRoutes)
            const filteredRewriteRoutes = filterSidebarRoutes(rewriteRoutes)
            const filteredTopbarRoutes = filterSidebarRoutes(defaultRoutes)
            this.setRoutes(filteredRewriteRoutes)
            // this.setSidebarRouters(constantRoutes.concat(sidebarRoutes))
            this.setSidebarRouters(constantRoutes.concat(filteredSidebarRoutes))
            // this.setDefaultRoutes(sidebarRoutes)
            this.setDefaultRoutes(filteredSidebarRoutes)
            this.setTopbarRoutes(filteredTopbarRoutes)
            resolve(filteredRewriteRoutes)
          })
        })
      }
    }
  })

// 遍历后台传来的路由字符串，转换为组件对象
function filterAsyncRouter(asyncRouterMap, lastRouter = false, type = false) {
  return asyncRouterMap.filter(route => {
    if (type && route.children) {
      route.children = filterChildren(route.children)
    }
    if (route.component) {
      // Layout ParentView 组件特殊处理
      if (route.component === 'Layout') {
        route.component = Layout
      } else if (route.component === 'ParentView') {
        route.component = ParentView
      } else if (route.component === 'InnerLink') {
        route.component = InnerLink
      } else {
        route.component = loadView(route.component)
      }
    }
    if (route.children != null && route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, route, type)
    } else {
      delete route['children']
      delete route['redirect']
    }
    return true
  })
}

function filterChildren(childrenMap, lastRouter = false) {
  var children = []
  childrenMap.forEach((el, index) => {
    if (el.children && el.children.length) {
      if (el.component === 'ParentView' && !lastRouter) {
        el.children.forEach(c => {
          c.path = resolveRoutePath(el.path, c.path)
          if (c.children && c.children.length) {
            children = children.concat(filterChildren(c.children, c))
            return
          }
          children.push(c)
        })
        return
      }
    }
    if (lastRouter) {
      el.path = resolveRoutePath(lastRouter.path, el.path)
      if (el.children && el.children.length) {
        children = children.concat(filterChildren(el.children, el))
        return
      }
    }
    children = children.concat(el)
  })
  return children
}

// 动态路由遍历，验证是否具备权限
export function filterDynamicRoutes(routes) {
  const res = []
  routes.forEach(route => {
    if (route.permissions) {
      if (auth.hasPermiOr(route.permissions)) {
        res.push(route)
      }
    } else if (route.roles) {
      if (auth.hasRoleOr(route.roles)) {
        res.push(route)
      }
    }
  })
  return res
}

function normalizePath(path) {
  if (!path) return ''
  const normalized = String(path).replace(/\/+/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function resolveRoutePath(basePath, routePath) {
  if (!routePath) return normalizePath(basePath)
  if (routePath.startsWith('/')) return normalizePath(routePath)
  return normalizePath(`${basePath}/${routePath}`)
}

export function hasAccessibleRoutePath(routes, targetPath) {
  const target = normalizePath(targetPath)
  if (!target) return false
  const stack = (routes || []).map(route => ({ route, basePath: '' }))
  while (stack.length) {
    const { route, basePath } = stack.shift()
    if (!route || route.hidden) continue
    const routePath = resolveRoutePath(basePath, route.path)
    if (routePath === target) return true
    if (route.children?.length) {
      stack.push(...route.children.map(child => ({ route: child, basePath: routePath })))
    }
  }
  return false
}

export const loadView = (view) => {
  let res;
  for (const path in modules) {
    const dir = path.split('views/')[1].split('.vue')[0];
    if (dir === view) {
      res = () => modules[path]();
    }
  }
  return res;
}

export default usePermissionStore
