import { ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

/**
 * 入库/出库/移库/盘库编辑页：离开前提示是否暂存
 */
export function useOrderEditLeaveGuard({ isDirty, saveDraft }) {
  const allowLeave = ref(false)

  function markAllowLeave() {
    allowLeave.value = true
  }

  onBeforeRouteLeave(async (to, from, next) => {
    if (allowLeave.value || !isDirty?.()) {
      next()
      return
    }

    const settingsStore = useSettingsStore()
    const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

    try {
      await ElMessageBox.confirm(tr('是否暂存表单？'), tr('系统提示'), {
        confirmButtonText: tr('确定'),
        cancelButtonText: tr('取消'),
        type: 'warning',
        distinguishCancelAndClose: true
      })
      const saved = await saveDraft()
      if (saved) {
        markAllowLeave()
        next()
      } else {
        next(false)
      }
    } catch (action) {
      if (action === 'cancel') {
        // 取消：不暂存，切换到目标页面
        markAllowLeave()
        next()
        return
      }
      // 点击 × 或按 ESC：留在当前页
      next(false)
    }
  })

  return { markAllowLeave }
}
