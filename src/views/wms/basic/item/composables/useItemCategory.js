import { nextTick, reactive, toRefs } from 'vue'
import { addItemCategory, delItemCategory, updateItemCategory, updateOrderNum } from '@/api/wms/itemCategory'
import { useWmsStore } from '@/store/modules/wms'

const initCategoryFormData = {
  id: undefined,
  parentId: undefined,
  ancestors: undefined,
  categoryName: undefined,
  orderNum: 0,
  status: undefined
}

function createCategoryData() {
  return reactive({
    form: { ...initCategoryFormData },
    rules: {
      id: [
        { required: true, message: '商品分类id不能为空', trigger: 'blur' }
      ],
      categoryName: [
        { required: true, message: '商品分类名称不能为空', trigger: 'blur' }
      ],
      status: [
        { required: true, message: '商品分类状态不能为空', trigger: 'change' }
      ]
    }
  })
}

export function useItemCategory({
  itemCategoryFormRef,
  queryParams,
  buttonLoading,
  proxy,
  tr,
  isEn,
  getList
}) {
  const wmsStore = useWmsStore()
  const categoryDialog = reactive({
    visible: false,
    title: ''
  })
  const categoryData = createCategoryData()
  const { form: categoryForm, rules: typeRules } = toRefs(categoryData)

  const refreshCategoryData = () => {
    wmsStore.getItemCategoryList()
    wmsStore.getItemCategoryTreeList()
  }

  const resetType = () => {
    categoryForm.value = { ...initCategoryFormData }
    itemCategoryFormRef.value?.resetFields?.()
  }

  const handleAddType = (show) => {
    categoryDialog.title = isEn.value ? 'Add Item Category' : '新增商品分类'
    categoryDialog.visible = true
    if (show) {
      categoryForm.value.parentId = undefined
    }
    nextTick(() => {
      categoryForm.value.categoryName = undefined
    })
  }

  const append = (data) => {
    categoryForm.value.categoryName = undefined
    categoryForm.value.parentId = data.id
    categoryDialog.visible = true
  }

  const remove = async (node, data) => {
    await proxy?.$modal.confirm(`${tr('确认删除')}${tr('分类')}「${data.label}」?`)
    await delItemCategory(data.id)
    proxy?.$modal.msgSuccess(tr('删除成功'))
    refreshCategoryData()
  }

  const edit = (node, data) => {
    if (node.level > 1) {
      categoryForm.value.parentId = node.parent.data.id
    }
    categoryForm.value.id = data.id
    categoryForm.value.categoryName = data.label
    categoryDialog.title = isEn.value ? 'Edit Item Category' : '修改商品分类'
    categoryDialog.visible = true
  }

  const collapse = (draggingNode, dropNode, type) => {
    if (draggingNode.data.label !== '全部' && draggingNode.level === dropNode.level && draggingNode.parent.id === dropNode.parent.id) {
      if (dropNode.data.label === '全部') {
        return type === 'next'
      }
      return type === 'prev' || type === 'next'
    }
    return false
  }

  const handleNodeDrop = async (draggingNode, dropNode) => {
    if (dropNode.level === 1) {
      await updateOrderNum(dropNode.parent.data.filter(it => it.id !== -1))
      return
    }
    await updateOrderNum(dropNode.parent.data.children)
  }

  const cancelType = () => {
    resetType()
    categoryDialog.visible = false
  }

  const handleQueryType = (node, data) => {
    queryParams.value.pageNum = 1
    if (data.data.label === '全部') {
      queryParams.value.itemCategory = ''
    } else {
      queryParams.value.itemCategory = data.data.id
    }
    getList()
  }

  const submitCategoryForm = () => {
    itemCategoryFormRef.value.validate(async (valid) => {
      if (!valid) return
      buttonLoading.value = true
      if (categoryForm.value.id) {
        await updateItemCategory(categoryForm.value).finally(() => { buttonLoading.value = false })
      } else {
        await addItemCategory(categoryForm.value).finally(() => { buttonLoading.value = false })
      }
      proxy?.$modal.msgSuccess(categoryForm.value.id ? tr('修改成功') : tr('新增成功'))
      categoryDialog.visible = false
      refreshCategoryData()
    })
  }

  return {
    categoryDialog,
    categoryForm,
    typeRules,
    handleAddType,
    append,
    remove,
    edit,
    collapse,
    handleNodeDrop,
    cancelType,
    handleQueryType,
    submitCategoryForm
  }
}
