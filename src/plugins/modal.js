import { ElMessage, ElMessageBox, ElNotification, ElLoading } from 'element-plus'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

let loadingInstance;

function getLanguage() {
  try {
    return useSettingsStore().language || localStorage.getItem('language') || 'zh-cn'
  } catch (e) {
    return localStorage.getItem('language') || 'zh-cn'
  }
}

function tr(text) {
  return translateByMap(text, getLanguage())
}

export default {
  // 消息提示
  msg(content) {
    ElMessage.info(content)
  },
  // 错误消息
  msgError(content) {
    ElMessage.error(content)
  },
  // 成功消息
  msgSuccess(content) {
    ElMessage.success(content)
  },
  // 警告消息
  msgWarning(content) {
    ElMessage.warning(content)
  },
  // 弹出提示
  alert(content) {
    ElMessageBox.alert(tr(content), tr("系统提示"))
  },
  // 错误提示
  alertError(content) {
    ElMessageBox.alert(tr(content), tr("系统提示"), { type: 'error' })
  },
  // 成功提示
  alertSuccess(content) {
    ElMessageBox.alert(tr(content), tr("系统提示"), { type: 'success' })
  },
  // 警告提示
  alertWarning(content) {
    ElMessageBox.alert(tr(content), tr("系统提示"), { type: 'warning' })
  },
  // 通知提示
  notify(content) {
    ElNotification.info(content)
  },
  // 错误通知
  notifyError(content) {
    ElNotification.error(content);
  },
  // 成功通知
  notifySuccess(content) {
    ElNotification.success(content)
  },
  // 警告通知
  notifyWarning(content) {
    ElNotification.warning(content)
  },
  // 确认窗体
  confirm(content, titleOrOptions = {}, options = {}) {
    const hasCustomTitle = typeof titleOrOptions === 'string'
    const title = hasCustomTitle ? titleOrOptions : "系统提示"
    const mergedOptions = hasCustomTitle ? options : titleOrOptions
    return ElMessageBox.confirm(tr(content), tr(title), {
      confirmButtonText: tr('确定'),
      cancelButtonText: tr('取消'),
      type: "warning",
      ...mergedOptions,
    })
  },
  // 提交内容
  prompt(content) {
    return ElMessageBox.prompt(tr(content), tr("系统提示"), {
      confirmButtonText: tr('确定'),
      cancelButtonText: tr('取消'),
      type: "warning",
    })
  },
  // 打开遮罩层
  loading(content) {
    loadingInstance = ElLoading.service({
      lock: true,
      text: content,
      background: "rgba(0, 0, 0, 0.7)",
    })
  },
  // 关闭遮罩层
  closeLoading() {
    loadingInstance.close();
  }
}
