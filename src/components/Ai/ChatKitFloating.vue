<template>
  <div v-if="enabled" class="chatkit-floating">
    <el-tooltip content="AI Assistant" placement="left">
      <button class="chatkit-fab" type="button" @click="open = !open">
        AI
      </button>
    </el-tooltip>
    <section v-show="open" class="chatkit-panel">
      <header class="chatkit-header">
        <span>AI Assistant</span>
        <el-button text circle size="small" @click="open = false">
          <el-icon><Close /></el-icon>
        </el-button>
      </header>
      <ChatKitWidget mode="floating" />
    </section>
  </div>
</template>

<script setup>
import { Close } from '@element-plus/icons-vue'
import ChatKitWidget from './ChatKitWidget.vue'

const chatKitFloatingFlag = import.meta.env.VITE_APP_CHATKIT_FLOATING
const enabled = computed(() => chatKitFloatingFlag !== 'false')
const open = ref(false)
</script>

<style scoped>
.chatkit-floating {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 2100;
}

.chatkit-fab {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  background: #1f2937;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
}

.chatkit-panel {
  position: absolute;
  right: 0;
  bottom: 64px;
  width: min(390px, calc(100vw - 28px));
  height: min(640px, calc(100vh - 112px));
  overflow: hidden;
  border: 1px solid #d8dee8;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
}

.chatkit-header {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 14px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.chatkit-panel :deep(.chatkit-widget) {
  height: calc(100% - 44px);
}
</style>
