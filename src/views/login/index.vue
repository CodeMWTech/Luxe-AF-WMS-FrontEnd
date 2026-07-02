<template>
  <MobileLogin v-if="useMobileLogin" />
  <DesktopLogin v-else />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sanitizeLoginRedirectQuery, shouldUseMobileExperience } from '@/utils/mobileDevice'
import DesktopLogin from './desktop.vue'
import MobileLogin from '../mobile/login.vue'

const route = useRoute()
const router = useRouter()
const useMobileLogin = ref(shouldUseMobileExperience())

function syncViewportMode() {
  const nextMobile = shouldUseMobileExperience()
  useMobileLogin.value = nextMobile

  if (!nextMobile && route.path === '/login' && route.query.redirect) {
    const nextQuery = sanitizeLoginRedirectQuery(route.query)
    if (JSON.stringify(nextQuery) !== JSON.stringify(route.query)) {
      router.replace({ path: '/login', query: nextQuery })
    }
  }
}

onMounted(() => {
  syncViewportMode()
  window.addEventListener('resize', syncViewportMode, { passive: true })
  window.visualViewport?.addEventListener('resize', syncViewportMode, { passive: true })

  if (!shouldUseMobileExperience() && route.path === '/login' && route.query.redirect) {
    const nextQuery = sanitizeLoginRedirectQuery(route.query)
    if (JSON.stringify(nextQuery) !== JSON.stringify(route.query)) {
      router.replace({ path: '/login', query: nextQuery })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportMode)
  window.visualViewport?.removeEventListener('resize', syncViewportMode)
})
</script>
