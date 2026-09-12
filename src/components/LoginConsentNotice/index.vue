<template>
  <p class="login-consent" :class="`is-${variant}`">
    <span class="login-consent__icon" aria-hidden="true">i</span>
    <span class="login-consent__text">
      {{ $t('login.consentBefore') }}
      <router-link class="login-consent__link" to="/terms" target="_blank" rel="noopener noreferrer">
        {{ $t('login.termsLink') }}
      </router-link>
      {{ $t('login.consentAnd') }}
      <router-link class="login-consent__link" to="/privacy" target="_blank" rel="noopener noreferrer">
        {{ $t('login.privacyLink') }}
      </router-link>
      {{ $t('login.consentAfter') }}
    </span>
  </p>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'desktop'
  }
})
</script>

<style scoped lang="scss">
.login-consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.login-consent__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 1px solid #909399;
  border-radius: 50%;
  color: #909399;
  font-size: 11px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
}

.login-consent__text {
  min-width: 0;
}

.login-consent__link {
  color: #409eff;
  text-decoration: none;
}

.login-consent__link:hover {
  text-decoration: underline;
}

.is-desktop {
  margin: 0 0 16px;
  font-size: 12px;
}

.is-mobile {
  margin: 0 0 14px;
  font-size: 12px;
}
</style>
