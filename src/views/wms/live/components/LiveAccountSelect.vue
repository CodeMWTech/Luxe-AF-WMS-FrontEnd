<template>
  <el-select :model-value="modelValue" :filter-method="filterAccounts" @update:model-value="$emit('update:modelValue', $event)" @visible-change="keyword = ''" @clear="keyword = ''">
    <template v-if="selectedAccount" #prefix><LivePlatformTag :platform="selectedAccount.platform" :label="selectedAccount.accountCode" /></template>
    <el-option v-for="account in visibleAccounts" :key="account.id" :label="account.displayName || account.accountCode || '-'" :value="account.id">
      <LiveAccountLabel :account="account" />
    </el-option>
  </el-select>
</template>

<script setup>
import { computed, ref } from 'vue'
import LiveAccountLabel from './LiveAccountLabel.vue'
import LivePlatformTag from './LivePlatformTag.vue'
import { livePlatformLabel } from '../shared'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  accounts: { type: Array, default: () => [] }
})
defineEmits(['update:modelValue'])
const keyword = ref('')
const selectedAccount = computed(() => props.accounts.find(account => String(account.id) === String(props.modelValue)))
const visibleAccounts = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return props.accounts.filter(account => !query || [account.accountCode, account.displayName, livePlatformLabel(account.platform)]
    .some(value => String(value || '').toLowerCase().includes(query)))
})
function filterAccounts(value) { keyword.value = value }
</script>
