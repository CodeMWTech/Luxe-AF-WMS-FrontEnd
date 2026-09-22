<template>
  <div class="login-consent" :class="`is-${variant}`">
    <details class="login-consent__details">
      <summary class="login-consent__summary">
        <span class="login-consent__icon" aria-hidden="true">i</span>
        <span class="login-consent__text">
          {{ $t('login.consentSummary') }}
          <router-link class="login-consent__link" to="/terms" target="_blank" rel="noopener noreferrer" @click.stop>
            {{ $t('login.termsLink') }}
          </router-link>
          {{ $t('login.consentAnd') }}
          <router-link class="login-consent__link" to="/privacy" target="_blank" rel="noopener noreferrer" @click.stop>
            {{ $t('login.privacyLink') }}
          </router-link>
          {{ $t('login.consentAfter') }}
          <span class="login-consent__more">{{ $t('login.consentMore') }}</span>
        </span>
      </summary>
      <p class="login-consent__detail">{{ $t('login.consentDetail') }}</p>
    </details>
  </div>
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
  color: #606266;
  line-height: 1.5;
}

.login-consent__details {
  margin-top: 0;
}

.login-consent__summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  list-style: none;
  cursor: pointer;
}

.login-consent__summary::-webkit-details-marker {
  display: none;
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

.login-consent__more {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  color: #409eff;
  white-space: nowrap;
}

.login-consent__more::after {
  content: '';
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 4px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #409eff;
  transition: transform 0.16s ease;
}

.login-consent__details[open] .login-consent__more::after {
  transform: rotate(180deg);
}

.login-consent__detail {
  margin: 8px 0 0 24px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f4f6fb;
  color: #606266;
  line-height: 1.6;
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
