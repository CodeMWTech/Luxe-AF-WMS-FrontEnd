<template>
  <div class="vendor-workflow-steps">
    <el-steps :active="active" finish-status="success" align-center>
      <el-step v-for="step in steps" :key="step.path" :title="tr(step.title)" />
    </el-steps>
    <div class="vendor-step-nav">
      <el-button
        v-for="(step, index) in steps"
        :key="step.path"
        :type="index === active ? 'primary' : 'default'"
        plain
        @click="go(step.path)"
      >
        {{ tr(step.title) }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { translateByMap } from '@/locales/runtime-map'
import useSettingsStore from '@/store/modules/settings'

defineProps({
  active: {
    type: Number,
    required: true
  }
})

const router = useRouter()
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const steps = [
  { title: '选购', path: '/basic/item' },
  { title: '审批', path: '/vendor-management/approval' },
  { title: '已选购', path: '/vendor-management/shipping' },
  { title: '未收货', path: '/vendor-management/receiving' },
  { title: '未结款', path: '/vendor-management/settlement' },
  { title: '已结款', path: '/vendor-management/settled' }
]

function go(path) {
  router.push(path)
}
</script>

<style scoped>
.vendor-workflow-steps {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 18px 16px 14px;
  margin-bottom: 16px;
  background: #fff;
}

.vendor-step-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
</style>
