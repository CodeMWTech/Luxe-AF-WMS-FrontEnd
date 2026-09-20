<template>
  <el-dialog
    :title="dialog.title"
    v-model="dialog.visible"
    width="500px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="128px" @submit.native.prevent>
      <el-form-item :label="tr('上级分类')" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="treeOptions"
          :props="{ value: 'id', label: 'label', children: 'children' }"
          value-key="id"
          :placeholder="tr('可不选；清空后为顶级分类')"
          check-strictly
          clearable
          style="width: 100%!important;"
        />
        <div class="form-tip">{{ tr('清空「上级分类」后，该分类将恢复为顶级分类') }}</div>
      </el-form-item>
      <el-form-item :label="tr('商品分类名称')" prop="categoryName">
        <el-input
          v-model="form.categoryName"
          :placeholder="tr('请输入商品分类名称')"
          @keyup.enter="emit('submit')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button :loading="loading" type="primary" class="action-btn" @click="emit('submit')">
          {{ tr('确认') }}
        </el-button>
        <el-button class="action-btn" @click="emit('cancel')">{{ tr('取消') }}</el-button>
      </div>
    </template>
    <div id="qrcode"></div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  dialog: { type: Object, required: true },
  form: { type: Object, required: true },
  rules: { type: Object, required: true },
  treeOptions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  tr: { type: Function, required: true }
})

const emit = defineEmits(['submit', 'cancel'])
const formRef = ref(null)

defineExpose({
  validate: (...args) => formRef.value?.validate?.(...args),
  resetFields: () => formRef.value?.resetFields?.()
})
</script>

<style scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #909399;
}
</style>
