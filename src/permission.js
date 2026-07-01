import router from './router'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isHttp } from '@/utils/validate'
import { isRelogin } from '@/utils/request'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'
import {
  getLoginRedirectForPath,
  getSkuLoginRedirect,
  getViewportMismatchRedirect,
  isSkuLookupPath,
  resolvePostLoginRedirect
} from '@/utils/mobileDevice'
import { getRouteTitle } from '@/utils/routeTitle'

NProgress.configure({ showSpinner: false });

const whiteList = ['/login', '/register'];

router.beforeEach((to, from, next) => {
  NProgress.start()

  const hasToken = !!getToken()

  if (hasToken) {
    if (to.meta && to.meta.title) {
      const settingsStore = useSettingsStore()
      settingsStore.setTitle(getRouteTitle(to.meta, settingsStore.language || 'zh-cn'))
    }

    if (to.path === '/login') {
      next({ path: resolvePostLoginRedirect(to.query.redirect) })
      NProgress.done()
      return
    }

    const viewportRedirect = getViewportMismatchRedirect(to.path, from.path)
    if (viewportRedirect) {
      next({ path: viewportRedirect, replace: true })
      NProgress.done()
      return
    }

    if (useUserStore().roles.length === 0) {
      isRelogin.show = true
      useUserStore().getInfo().then(() => {
        isRelogin.show = false
        usePermissionStore().generateRoutes().then(accessRoutes => {
          accessRoutes.forEach(route => {
            if (!isHttp(route.path)) {
              router.addRoute(route)
            }
          })
          next({ ...to, replace: true })
        })
      }).catch(err => {
        useUserStore().logOut().then(() => {
          ElMessage.error(err)
          next({ path: '/login' })
        })
      })
    } else {
      next()
    }
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else if (isSkuLookupPath(to.path)) {
      next(getSkuLoginRedirect(to.fullPath))
      NProgress.done()
    } else {
      next(getLoginRedirectForPath(to.fullPath))
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})
