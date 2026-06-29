<template>
  <div class="mobile-layout">
    <header class="mobile-header">
      <div class="mobile-header__side">
        <el-button v-if="showBack" link type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
      </div>
      <div class="mobile-header__title">{{ pageTitle }}</div>
      <div class="mobile-header__side mobile-header__side--right">
        <el-button link type="danger" @click="handleLogout">退出</el-button>
      </div>
    </header>
    <main class="mobile-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import { getRouteTitle } from '@/utils/routeTitle'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const pageTitle = computed(() => {
  return getRouteTitle(route.meta, settingsStore.language || 'zh-cn') || 'WMS'
})

const showBack = computed(() => route.name !== 'MobileSkuSearch')

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/m/sku-search')
}

function handleLogout() {
  ElMessageBox.confirm('确定退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logOut().then(() => {
      router.push('/m/login')
    })
  }).catch(() => {})
}
</script>
