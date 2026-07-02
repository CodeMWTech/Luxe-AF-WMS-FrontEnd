<template>
  <VendorItems
    status="unreceived"
    title="未收货"
    description="展示供应商已发货、未收货的商品明细，平台确认收到后进入未结款。"
    action="receive"
    action-label="确认收货"
    :active="3"
    show-workflow
  />
</template>

<script setup name="VendorReceiving">
import VendorItems from './components/VendorItems.vue'
</script>
