<template>
  <span class="live-account-label">
    <LivePlatformTag :platform="details.platform" :label="details.code || account.accountLabel || '-'" />
    <span v-if="details.name" class="live-account-name">{{ details.name }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import LivePlatformTag from './LivePlatformTag.vue'
import { accountLabel } from '../shared'

const props = defineProps({
  account: { type: Object, default: () => ({}) },
  accounts: { type: Array, default: () => [] }
})
const details = computed(() => {
  const matched = props.accounts.find(item => props.account.accountId != null
    ? String(item.id) === String(props.account.accountId)
    : props.account.accountLabel && accountLabel(item) === props.account.accountLabel)
  const savedLabel = String(props.account.accountLabel || '').match(/^\[([^\]]*)\]\s*(.*)$/)
  return {
    platform: props.account.platform || matched?.platform || '',
    code: props.account.accountCode || savedLabel?.[1] || matched?.accountCode || '',
    name: props.account.displayName || savedLabel?.[2] || matched?.displayName || ''
  }
})
</script>

<style scoped>
.live-account-label {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 6px;
  row-gap: 3px;
  max-width: 100%;
  vertical-align: middle;
  line-height: 22px;
}
.live-account-name { color: var(--el-text-color-regular); overflow-wrap: anywhere; }
</style>
