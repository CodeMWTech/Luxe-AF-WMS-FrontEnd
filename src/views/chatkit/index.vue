<template>
  <main class="chatkit-page">
    <ChatKitWidget mode="page" />
  </main>
</template>

<script setup>
import ChatKitWidget from '@/components/Ai/ChatKitWidget.vue'
</script>

<style scoped>
.chatkit-page {
  height: calc(100vh - 84px);
  min-height: 560px;
  background: #f7f8fa;
}
</style>
