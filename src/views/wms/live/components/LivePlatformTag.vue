<template>
  <el-tag v-if="text && text !== '-'" :type="tagType" :class="['live-platform-tag', platformClass]" effect="plain" size="small">{{ text }}</el-tag>
  <span v-else>-</span>
</template>

<script setup>
import { computed } from 'vue'
import { accountLabel } from '../shared'

const props = defineProps({
  platform: { type: String, default: '' },
  account: { type: Object, default: () => ({}) },
  accounts: { type: Array, default: () => [] },
  label: { type: String, default: undefined }
})
const platform = computed(() => {
  if (props.platform || props.account.platform) return props.platform || props.account.platform
  const account = props.accounts.find(item => props.account.accountId != null
    ? String(item.id) === String(props.account.accountId)
    : props.account.accountLabel && accountLabel(item) === props.account.accountLabel)
  return account?.platform || ''
})
const platformClass = computed(() => {
  const normalized = String(platform.value).trim().toUpperCase().replace(/[\s_-]/g, '')
  if (normalized === 'EBAY') return 'ebay'
  if (normalized === 'TIKTOK' || normalized === 'TIKTOKSHOP') return 'tiktok'
  // 平台订单将 Shopify 接入的店铺展示为 Whatnot。
  if (normalized === 'WHATNOT' || normalized === 'SHOPIFY') return 'whatnot'
  return 'other'
})
const tagType = computed(() => ({ ebay: '', tiktok: 'danger', whatnot: 'success', other: 'info' })[platformClass.value])
const text = computed(() => props.label ?? (props.account.accountLabel
  || (props.account.accountCode ? accountLabel(props.account) : '')
  || ({ ebay: 'eBay', tiktok: 'TikTok', whatnot: 'Whatnot' })[platformClass.value]
  || platform.value))
</script>

<style scoped>
.live-platform-tag {
  max-width: 100%;
  height: auto;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  white-space: normal;
  overflow-wrap: anywhere;
}
.live-platform-tag.ebay {
  color: #175cd3;
  background: #eff8ff;
  border-color: #d1e4ff;
}
.live-platform-tag.tiktok {
  color: #d92d20;
  background: #fef3f2;
  border-color: #fecdca;
}
.live-platform-tag.whatnot {
  color: #067647;
  background: #ecfdf3;
  border-color: #abefc6;
}
</style>
