import { ref } from 'vue'

const NAME_TAG_STORAGE_KEY = 'wms_item_name_tags'

function readNameTags() {
  try {
    return JSON.parse(localStorage.getItem(NAME_TAG_STORAGE_KEY) || '[]')
  } catch (_) {
    return []
  }
}

export function useItemNameTags({ queryParams, form }) {
  const nameTagDrawerVisible = ref(false)
  const nameTagList = ref(readNameTags())
  const newNameTag = ref('')
  const nameTagInsertTarget = ref('form')

  const saveNameTags = () => {
    try {
      localStorage.setItem(NAME_TAG_STORAGE_KEY, JSON.stringify(nameTagList.value))
    } catch (_) {}
  }

  const openNameTagDrawer = (context = 'form') => {
    nameTagInsertTarget.value = context
    nameTagDrawerVisible.value = true
  }

  const addNameTag = () => {
    const tag = (newNameTag.value || '').trim()
    if (!tag) return
    if (nameTagList.value.includes(tag)) {
      newNameTag.value = ''
      return
    }
    nameTagList.value.push(tag)
    saveNameTags()
    newNameTag.value = ''
  }

  const removeNameTag = (index) => {
    nameTagList.value.splice(index, 1)
    saveNameTags()
  }

  const insertNameTag = (tag) => {
    if (nameTagInsertTarget.value === 'query') {
      const cur = queryParams.value.itemName || ''
      queryParams.value.itemName = cur ? `${cur} ${tag}` : tag
      return
    }
    const cur = form.value.itemName || ''
    form.value.itemName = cur ? `${cur} ${tag}` : tag
  }

  return {
    nameTagDrawerVisible,
    nameTagList,
    newNameTag,
    openNameTagDrawer,
    addNameTag,
    removeNameTag,
    insertNameTag
  }
}
