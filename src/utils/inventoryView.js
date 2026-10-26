import { reactive } from 'vue'
import { getCurrentRoleInventoryView } from '@/api/wms/roleInventoryView'

const state = reactive({
  loaded: false,
  restricted: false,
  costFactor: 1,
  hidden: {}
})

let loading = null

export function useInventoryView() {
  async function load() {
    if (state.loaded) return state
    if (!loading) {
      loading = getCurrentRoleInventoryView()
        .then((res) => {
          const data = res.data || {}
          state.restricted = Boolean(data.restricted)
          state.costFactor = Number(data.costFactor || 1)
          state.hidden = {}
          ;(data.hiddenFields || []).forEach((key) => {
            state.hidden[key] = true
          })
        })
        .catch(() => {
          state.restricted = false
          state.hidden = {}
        })
        .finally(() => {
          state.loaded = true
          loading = null
        })
    }
    await loading
    return state
  }

  function shows(key) {
    if (!state.restricted) return true
    return !state.hidden[key]
  }

  return { state, load, shows }
}
