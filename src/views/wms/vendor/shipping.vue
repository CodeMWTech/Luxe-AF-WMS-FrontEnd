<template>
  <VendorItems
    title="已选购"
    description="展示已选购的商品明细，供应商发货后进入未收货。"
    action="ship"
    action-label="确认已发货"
    status="selected"
    :active="2"
    show-workflow
  />
</template>

<script setup name="VendorShipping">
import VendorItems from './components/VendorItems.vue'
</script>
