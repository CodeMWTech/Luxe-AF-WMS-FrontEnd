<template>
  <div class="legal-page">
    <header class="legal-header">
      <div class="legal-header__inner">
        <router-link class="legal-brand" to="/login">
          <span>LUXE AF</span>
          <strong>WMS</strong>
        </router-link>
        <div class="legal-header__actions">
          <button class="legal-lang" type="button" @click="toggleLanguage">
            {{ isEn ? '中文' : 'English' }}
          </button>
          <router-link class="legal-login-link" to="/login">{{ chrome.backToLogin }}</router-link>
        </div>
      </div>
    </header>

    <main v-if="doc" class="legal-main">
      <p class="legal-kicker">Luxe AF Operations</p>
      <h1>{{ doc.title }}</h1>
      <p class="legal-updated">{{ doc.updated }}</p>
      <p class="legal-official">{{ doc.official }}</p>
      <nav class="legal-switch">
        <router-link to="/terms">{{ chrome.termsLink }}</router-link>
        <span aria-hidden="true">·</span>
        <router-link to="/privacy">{{ chrome.privacyLink }}</router-link>
      </nav>
      <section v-for="section in doc.sections" :key="section.heading" class="legal-section">
        <h2>{{ section.heading }}</h2>
        <p v-for="(paragraph, index) in section.paragraphs" :key="index">{{ paragraph }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLegalDocument } from './documents'

const route = useRoute()
const pageLanguage = ref('en')

const isEn = computed(() => pageLanguage.value === 'en')
const doc = computed(() => getLegalDocument(route.meta.legalDoc, pageLanguage.value))
const chrome = computed(() => isEn.value
  ? { backToLogin: 'Back to login', termsLink: 'Terms of Service', privacyLink: 'Privacy Policy' }
  : { backToLogin: '返回登录', termsLink: '用户协议', privacyLink: '隐私政策' }
)

function toggleLanguage() {
  pageLanguage.value = isEn.value ? 'zh' : 'en'
}

watch(
  [doc, isEn],
  () => {
    if (!doc.value) return
    document.title = `${doc.value.title} - Luxe AF WMS`
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.legal-page {
  min-height: 100vh;
  background: #f6f7fb;
  color: #1f2a37;
}

.legal-header {
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.legal-header__inner,
.legal-main {
  width: min(760px, calc(100% - 40px));
  margin: 0 auto;
}

.legal-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.legal-brand {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: inherit;
  text-decoration: none;
  letter-spacing: 0.08em;
}

.legal-brand span {
  color: #409eff;
  font-size: 12px;
  font-weight: 700;
}

.legal-brand strong {
  font-size: 18px;
  letter-spacing: 0;
}

.legal-header__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legal-lang,
.legal-login-link {
  color: #409eff;
  background: none;
  border: 0;
  padding: 0;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
}

.legal-main {
  padding: 40px 0 72px;
}

.legal-kicker,
.legal-updated,
.legal-official {
  color: #667085;
  line-height: 1.6;
}

.legal-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.legal-main h1 {
  margin: 0 0 8px;
  font-size: 32px;
  line-height: 1.2;
}

.legal-updated {
  margin: 0 0 12px;
  font-size: 13px;
}

.legal-official {
  margin: 0 0 20px;
  font-size: 14px;
}

.legal-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  color: #98a2b3;
  font-size: 14px;
}

.legal-switch a {
  color: #409eff;
  text-decoration: none;
}

.legal-section + .legal-section {
  margin-top: 28px;
}

.legal-section h2 {
  margin: 0 0 10px;
  font-size: 18px;
}

.legal-section p {
  margin: 0 0 10px;
  color: #344054;
  font-size: 15px;
  line-height: 1.7;
}

@media (max-width: 640px) {
  .legal-header__inner,
  .legal-main {
    width: calc(100% - 32px);
  }

  .legal-main {
    padding-top: 28px;
  }

  .legal-main h1 {
    font-size: 26px;
  }
}
</style>
