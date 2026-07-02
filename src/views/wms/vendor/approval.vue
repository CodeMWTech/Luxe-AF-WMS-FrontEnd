<template>
  <div class="app-container vendor-approval-page">
    <VendorWorkflowSteps :active="1" />
    <ItemPurchaseReview embedded />
  </div>
</template>

<script setup name="VendorApproval">
import VendorWorkflowSteps from './components/VendorWorkflowSteps.vue'
import ItemPurchaseReview from '@/views/wms/basic/item/review.vue'
</script>
