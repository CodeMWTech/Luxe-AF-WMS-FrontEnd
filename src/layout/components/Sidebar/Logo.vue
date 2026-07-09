<template>
  <div class="sidebar-logo-container" :class="{ 'collapse': collapse }" :style="{ backgroundColor: sideTheme === 'theme-dark' ? variables.menuBackground : variables.menuLightBackground }">
    <transition name="sidebarLogoFade">
      <router-link v-if="collapse" key="collapse" class="sidebar-logo-link" to="/description">
        <img v-if="logoMark" :src="logoMark" class="sidebar-logo sidebar-logo--mark" />
        <h1 v-else class="sidebar-title" :style="{ color: sideTheme === 'theme-dark' ? variables.logoTitleColor : variables.logoLightTitleColor }">{{ title }}</h1>
      </router-link>
      <router-link v-else key="expand" class="sidebar-logo-link" to="/description">
        <img v-if="logoMark" :src="logoMark" class="sidebar-logo sidebar-logo--mark" />
        <h1 class="sidebar-title" :style="{ color: sideTheme === 'theme-dark' ? variables.logoTitleColor : variables.logoLightTitleColor }">{{ title }}</h1>
      </router-link>
    </transition>
  </div>
</template>

<script setup>
import variables from '@/assets/styles/variables.module.scss'
import logoMark from '@/assets/logo/luxe-af-mark.svg'
import useSettingsStore from '@/store/modules/settings'

defineProps({
  collapse: {
    type: Boolean,
    required: true
  }
})

const title = ref('Luxe AF WMS');
const settingsStore = useSettingsStore();
const sideTheme = computed(() => settingsStore.sideTheme);
</script>

<style lang="scss" scoped>
.sidebarLogoFade-enter-active {
  transition: opacity 1.5s;
}

.sidebarLogoFade-enter,
.sidebarLogoFade-leave-to {
  opacity: 0;
}

.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 50px;
  line-height: 50px;
  background: #2b2f3a;
  text-align: center;
  overflow: hidden;

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0;
    padding: 0 20px;

    & .sidebar-logo {
      width: 32px;
      height: 32px;
      vertical-align: middle;
      object-fit: contain;
    }

    & .sidebar-logo--mark {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      margin-right: 24px;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
    }

    & .sidebar-title {
      display: inline-block;
      margin: 0;
      color: #fff;
      font-weight: 700;
      line-height: 50px;
      font-size: 17px;
      font-family: Avenir, Helvetica Neue, Arial, Helvetica, sans-serif;
      vertical-align: middle;
    }
  }

  &.collapse .sidebar-logo-link {
    justify-content: center;
    gap: 0;
    padding: 0;
  }

  &.collapse .sidebar-logo {
    width: 32px;
    height: 32px;
    margin-right: 0;
  }
}
</style>
