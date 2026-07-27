<template>
  <div class="v11-404" data-runtime-i18n-ignore="true">
    <section class="v11-404__stage">
      <img class="v11-404__scene" src="@/assets/404_images/v11-clean-scene.png" alt="">
      <div class="v11-404__brand">
        <img class="v11-404__logo" src="@/assets/404_images/luxe-af-logo.png" alt="LUXE AF">
        <div>
          <strong>LUXE AF</strong>
          <small>{{ brandSubtitle }}</small>
        </div>
      </div>
      <div class="v11-404__copy">
        <h1>{{ title }}</h1>
        <h2>{{ message }}</h2>
        <p>{{ description }}</p>
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

const brandSubtitle = computed(() => text('友好精品仓储系统', 'Friendly Boutique Warehouse System'))
const title = computed(() => text('404 错误!', '404 Error!'))
const message = computed(() => text('找不到包包!', 'Bag not found!'))
const description = computed(() =>
  text(
    '仓库人员正在确认库位。请检查地址，或返回首页继续使用系统。',
    'Our warehouse team is checking the bin location. Please verify the URL, or return home to continue.'
  )
)
const backHome = computed(() => text('返回首页', 'Back to Home'))
</script>

<style lang="scss" scoped>
.v11-404 {
  --blue: #1769ff;
  --ink: #14213d;
  --muted: #64748b;

  box-sizing: border-box;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: #eef3f9;
  color: var(--ink);
  font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
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
  gap: 12px;
  padding: 8px 20px 8px 8px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  animation: v11-enter 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.v11-404__logo {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: block;
  object-fit: contain;
  border-radius: 12px;
}

.v11-404__brand strong {
  display: block;
  font-size: 23px;
  line-height: 1;
}

.v11-404__brand small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
}

.v11-404__copy {
  position: absolute;
  z-index: 2;
  right: 6%;
  top: 50%;
  width: 34%;
  transform: translateY(-50%);
  padding: 24px 26px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
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
  font-size: clamp(36px, 4vw, 66px);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.v11-404__copy h2 {
  margin-top: 11px;
  font-size: clamp(24px, 2.8vw, 42px);
  line-height: 1.2;
  font-weight: 700;
}

.v11-404__copy p {
  margin-top: 22px;
  color: var(--muted);
  font-size: clamp(13px, 1.2vw, 18px);
  line-height: 1.85;
}

.v11-404__cta {
  display: inline-flex;
  align-items: center;
  margin-top: 26px;
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
    width: min(43%, 280px);
  }

  .v11-404__copy h1 {
    font-size: 30px;
  }

  .v11-404__copy h2 {
    font-size: 20px;
  }

  .v11-404__copy p {
    font-size: 11px;
    margin-top: 10px;
  }

  .v11-404__cta {
    padding: 8px 14px;
    margin-top: 12px;
  }

  .v11-404__logo {
    width: 30px;
    height: 30px;
    flex-basis: 30px;
  }

  .v11-404__brand {
    gap: 7px;
  }

  .v11-404__brand strong {
    font-size: 15px;
  }

  .v11-404__brand small {
    font-size: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .v11-404__brand,
  .v11-404__copy {
    animation: none;
  }
}
</style>
