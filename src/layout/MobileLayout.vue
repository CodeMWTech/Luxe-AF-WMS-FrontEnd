<template>
  <div class="mobile-layout" :class="{ 'is-en': isEn }">
    <header class="mobile-header">
      <div class="mobile-header__side">
        <el-button v-if="showBack" link type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
      </div>
      <div class="mobile-header__title">{{ pageTitle }}</div>
      <div class="mobile-header__side mobile-header__side--right">
        <el-button
          link
          type="primary"
          class="mobile-header__lang-btn"
          data-runtime-i18n-ignore="true"
          @click="toggleLanguage"
        >
          {{ languageButtonText }}
        </el-button>
        <el-button link type="danger" class="mobile-header__logout-btn" @click="handleLogout">
          {{ t('mobile.logout') }}
        </el-button>
      </div>
    </header>
    <main class="mobile-main">
      <router-view v-slot="{ Component, route: childRoute }">
        <keep-alive include="MobileSkuSearch">
          <component :is="Component" :key="childRoute.name" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import { useMobileSkuSearchStore } from '@/store/modules/mobileSkuSearch'
import { getRouteTitle } from '@/utils/routeTitle'
import { useMobileLanguage } from '@/composables/useMobileLanguage'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const searchStore = useMobileSkuSearchStore()
const { t } = useI18n()
const { isEn, languageButtonText, toggleLanguage, syncLanguageFromStore } = useMobileLanguage()

const pageTitle = computed(() => {
  return getRouteTitle(route.meta, settingsStore.language || 'zh-cn') || 'WMS'
})

const showBack = computed(() => route.name === 'MobileProductDetail')

function goBack() {
  router.push('/sku-search')
}

function handleLogout() {
  ElMessageBox.confirm(t('mobile.logoutConfirmMessage'), t('mobile.logoutConfirmTitle'), {
    confirmButtonText: t('mobile.confirm'),
    cancelButtonText: t('mobile.cancel'),
    type: 'warning'
  }).then(() => {
    userStore.logOut().then(() => {
      searchStore.clearSearchState()
      router.push('/login')
    })
  }).catch(() => {})
}

onMounted(() => {
  syncLanguageFromStore()
})
</script>
