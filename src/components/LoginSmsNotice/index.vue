<template>
  <p class="login-sms-notice" :class="`is-${variant}`">
    {{ $t('login.smsOptional') }}
    <router-link class="login-sms-notice__link" to="/sms-opt-in" target="_blank" rel="noopener noreferrer">
      {{ $t('login.smsOptInLink') }}
    </router-link>
    {{ $t('login.smsLegalBefore') }}
    <router-link class="login-sms-notice__link" to="/terms" target="_blank" rel="noopener noreferrer">
      {{ $t('login.termsLink') }}
    </router-link>
    {{ $t('login.consentAnd') }}
    <router-link class="login-sms-notice__link" to="/privacy" target="_blank" rel="noopener noreferrer">
      {{ $t('login.privacyLink') }}
    </router-link>
    {{ $t('login.consentAfter') }}
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
.login-sms-notice {
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.login-sms-notice__link {
  color: #409eff;
  text-decoration: none;
}

.login-sms-notice__link:hover {
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
