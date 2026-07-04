<template>
  <VendorItems
    status="settled"
    title="已结款"
    description="展示已经给供应商完成结款的商品明细。"
    :active="5"
    show-workflow
  />
</template>

<script setup name="VendorSettled">
import VendorItems from './components/VendorItems.vue'
</script>
