<template>
  <VendorItems
    status="unsettled"
    title="未结款"
    description="展示已收货但尚未结款的商品明细，平台可对未结款记录批量确认结款。"
    action="settle"
    action-label="确认结款"
    :active="4"
    show-workflow
  />
</template>

<script setup name="VendorSettlement">
import VendorItems from './components/VendorItems.vue'
</script>
