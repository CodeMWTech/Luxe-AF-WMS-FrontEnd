<template>
  <div class="v11-404" data-runtime-i18n-ignore="true">
    <section class="v11-404__stage">
      <img class="v11-404__scene" src="@/assets/404_images/v11-clean-scene.png" alt="">
      <div class="v11-404__brand">
        <img class="v11-404__logo" src="@/assets/404_images/luxe-af-logo.png" alt="LUXE AF">
        <div class="v11-404__brand-text">
          <strong>LUXE AF</strong>
          <small class="v11-404__subtitle">{{ brandSubtitle }}</small>
        </div>
      </div>
      <div class="v11-404__copy">
        <h1>{{ title }}</h1>
        <h2>{{ message }}</h2>
        <p class="v11-404__desc">{{ description }}</p>
        <router-link to="/description" class="v11-404__cta">⌂&nbsp;{{ backHome }}</router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import useSettingsStore from '@/store/modules/settings'

const settingsStore = useSettingsStore()
const isEnglish = computed(() => String(settingsStore.language || 'zh-cn').toLowerCase().startsWith('en'))
const text = (zh, en) => (isEnglish.value ? en : zh)

const brandSubtitle = computed(() => 'Warehouse Management System')
const title = computed(() => text('404 错误!', '404 Error!'))
const message = computed(() => text('找不到界面!', 'Page not found!'))
const description = computed(() =>
  text(
    '您访问的页面不存在。请检查地址，或返回首页继续使用系统。',
    'The page you are looking for does not exist. Please check the URL, or return home to continue.'
  )
)
const backHome = computed(() => text('返回首页', 'Back to Home'))
</script>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Outfit:wght@500;600;700&display=swap');

.v11-404 {
  --blue: #1769ff;
  --ink: #14213d;
  --muted: #5b6b84;
  --soft: #7a879c;

  box-sizing: border-box;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: #eef3f9;
  color: var(--ink);
  font-family: "Manrope", "PingFang SC", "Microsoft YaHei", sans-serif;
  z-index: 2000;
}

.v11-404__stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #eef3f9;
}

.v11-404__scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.v11-404__brand {
  position: absolute;
  z-index: 2;
  left: 3%;
  top: 4%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 22px 10px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 28px rgba(20, 33, 61, 0.08);
  animation: v11-enter 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.v11-404__logo {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: block;
  object-fit: contain;
  border-radius: 12px;
}

.v11-404__brand-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.v11-404__brand strong {
  display: block;
  font-family: "Outfit", "Manrope", sans-serif;
  font-size: 24px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.v11-404__subtitle {
  display: block;
  max-width: 19em;
  color: var(--soft);
  font-family: "Outfit", "Segoe UI", sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.045em;
  text-transform: none;
  white-space: normal;
}

.v11-404__copy {
  position: absolute;
  z-index: 2;
  right: 6%;
  top: 50%;
  width: min(38%, 420px);
  transform: translateY(-50%);
  padding: 32px 34px 30px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 40px rgba(20, 33, 61, 0.12);
  animation: v11-copy-enter 0.72s ease 0.08s both;
}

.v11-404__copy h1,
.v11-404__copy h2,
.v11-404__copy p {
  margin: 0;
}

.v11-404__copy h1 {
  color: var(--blue);
  font-family: "Outfit", "Manrope", sans-serif;
  font-size: clamp(40px, 4.2vw, 64px);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.v11-404__copy h2 {
  margin-top: 10px;
  font-size: clamp(26px, 2.6vw, 38px);
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.v11-404__desc {
  margin-top: 18px;
  max-width: 28em;
  padding-top: 16px;
  border-top: 1px solid rgba(20, 33, 61, 0.08);
  color: var(--muted);
  font-size: clamp(15px, 1.25vw, 17px);
  font-weight: 500;
  line-height: 1.7;
  letter-spacing: 0.01em;
}

.v11-404__cta {
  display: inline-flex;
  align-items: center;
  margin-top: 22px;
  padding: 14px 28px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1472ff, #4295ff);
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  box-shadow: 0 12px 25px rgba(23, 105, 255, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.v11-404__cta:hover,
.v11-404__cta:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(23, 105, 255, 0.32);
}

@keyframes v11-enter {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes v11-copy-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 760px) {
  .v11-404__copy {
    width: min(72%, 300px);
    right: 4%;
    padding: 22px 20px 20px;
  }

  .v11-404__copy h1 {
    font-size: 32px;
  }

  .v11-404__copy h2 {
    font-size: 22px;
  }

  .v11-404__desc {
    font-size: 13.5px;
    margin-top: 12px;
    padding-top: 12px;
    line-height: 1.65;
  }

  .v11-404__cta {
    padding: 10px 18px;
    margin-top: 16px;
  }

  .v11-404__logo {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
  }

  .v11-404__brand {
    gap: 10px;
    padding: 8px 14px 8px 8px;
  }

  .v11-404__brand strong {
    font-size: 16px;
  }

  .v11-404__subtitle {
    font-size: 9.5px;
    max-width: 16em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .v11-404__brand,
  .v11-404__copy {
    animation: none;
  }
}
</style>
