<template>
  <div class="whatnot-shop-fields">
    <el-alert :title="t('platformListings.whatnotViaShopifyHint')" type="info" show-icon :closable="false" />
    <el-alert v-if="configError" :title="configError" type="error" show-icon :closable="false" />
    <el-alert v-if="metafieldError" :title="metafieldError" type="error" show-icon :closable="false" />
    <el-alert v-for="warning in metafieldWarnings" :key="warning" :title="warning" type="warning" show-icon :closable="false" />
    <el-button :disabled="!form.shopId" :loading="configLoading" icon="Refresh" @click="loadConfig">{{ t('platformListings.whatnotRefreshConfig') }}</el-button>
    <el-row :gutter="16">
      <el-col :xs="24" :sm="12">
        <el-form-item :label="t('platformListings.whatnotLocation')" required>
          <el-select v-model="form.whatnotLocationId" filterable :disabled="!configReady" :loading="configLoading" style="width:100%" :placeholder="t('platformListings.whatnotSelectLocation')">
            <el-option v-for="location in locations" :key="location.id" :value="location.id" :label="location.name" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item :label="t('platformListings.whatnotPublication')" required>
          <el-select v-model="form.whatnotPublicationId" filterable :disabled="!configReady" :loading="configLoading" style="width:100%" :placeholder="t('platformListings.whatnotSelectPublication')">
            <el-option v-for="publication in publications" :key="publication.id" :value="publication.id" :label="publication.name" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item :label="t('platformListings.whatnotTargetCategory')">
          <el-input model-value="Luxury Bags &amp; Accessories" disabled />
          <div class="whatnot-field-hint">{{ t('platformListings.whatnotFixedCategoryHint') }}</div>
          <div v-if="metafieldsReady && !metafields.category?.available" class="whatnot-field-error">{{ metafields.category?.reason || t('platformListings.whatnotTargetCategoryUnavailable') }}</div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-form-item :label="t('platformListings.whatnotAuctionPrice')" required>
          <el-input-number v-model="form.whatnotAuctionPrice" :min="1" :step="1" style="width:100%" />
          <div class="whatnot-field-hint">{{ form.whatnotCurrency }} · {{ t('platformListings.whatnotAuctionPriceHint') }}</div>
          <div v-if="metafieldsReady && !metafields.auctionPrice?.available" class="whatnot-field-error">{{ t('platformListings.whatnotAuctionFieldUnavailable') }} {{ metafields.auctionPrice?.reason || '' }}</div>
        </el-form-item>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
import { getWhatnotConfig, getWhatnotMetafields } from '@/api/wms/platformListing'
import { isWhatnotPriceValid } from '@/utils/listingPlatform'

const props = defineProps({ form: { type: Object, required: true } })
const { proxy } = getCurrentInstance()
const t = (key, values) => proxy?.$t?.(key, values) || key
const locations = ref([])
const publications = ref([])
const configLoading = ref(false)
const configError = ref('')
const metafieldError = ref('')
const configReady = ref(false)
const metafieldsReady = ref(false)
const metafields = ref({})
const metafieldWarnings = ref([])
let configSequence = 0
const normalizeOptions = items => (Array.isArray(items) ? items : []).map(item => ({ ...item, id: String(item.id) }))
const errorMessage = (error, fallback) => error?.response?.data?.msg || error?.message || t(fallback)

async function loadConfig() {
  const sequence = ++configSequence
  const shopId = props.form.shopId
  configReady.value = false
  metafieldsReady.value = false
  configError.value = ''
  metafieldError.value = ''
  metafields.value = {}
  metafieldWarnings.value = []
  locations.value = []
  publications.value = []
  props.form.whatnotTargetCategoryValue = ''
  props.form.whatnotTargetCategoryName = ''
  if (!shopId || props.form.platform !== 'SHOPIFY') {
    configLoading.value = false
    return
  }
  props.form.listingType = 'CHANNEL_MANAGED'
  props.form.whatnotCurrency = 'USD'
  props.form.whatnotCategoryId = null
  props.form.whatnotBuyItNowPrice = null
  props.form.whatnotAuctionConfirmed = false
  props.form.whatnotAutoPublishConfirmed = false
  props.form.whatnotAuctionPrice ??= 1
  configLoading.value = true
  const [config, definitions] = await Promise.allSettled([getWhatnotConfig(shopId), getWhatnotMetafields(shopId)])
  if (sequence !== configSequence) return
  if (config.status === 'fulfilled') {
    const data = config.value.data || {}
    locations.value = normalizeOptions(data.locations)
    publications.value = normalizeOptions(data.publications)
    for (const [field, options] of [['whatnotLocationId', locations.value], ['whatnotPublicationId', publications.value]]) {
      if (!options.some(item => item.id === String(props.form[field] || ''))) props.form[field] = ''
      if (!props.form[field] && options.length === 1) props.form[field] = options[0].id
    }
    configReady.value = data.currency === 'USD' && Boolean(locations.value.length && publications.value.length)
    if (!configReady.value) configError.value = t(data.currency !== 'USD' ? 'platformListings.whatnotUsdRequired' : 'platformListings.whatnotConfigIncomplete')
  } else {
    configError.value = errorMessage(config.reason, 'platformListings.whatnotConfigFailed')
  }
  if (definitions.status === 'fulfilled') {
    metafields.value = definitions.value.data || {}
    const category = metafields.value.category
    if (category?.fixed && category.name === 'Luxury Bags & Accessories') {
      props.form.whatnotTargetCategoryValue = category.value || ''
      props.form.whatnotTargetCategoryName = category.name
    }
    metafieldWarnings.value = Array.isArray(metafields.value.warnings) ? metafields.value.warnings : []
    metafieldsReady.value = true
  } else {
    metafieldError.value = t('platformListings.whatnotMetafieldsFailed') + ' ' + errorMessage(definitions.reason, 'platformListings.whatnotMetafieldsFailed')
  }
  configLoading.value = false
}

function validate() {
  const missing = []
  if (configLoading.value || !configReady.value) missing.push(configError.value || t('platformListings.whatnotConfigRequired'))
  if (!locations.value.some(item => item.id === props.form.whatnotLocationId)) missing.push(t('platformListings.whatnotLocation'))
  if (!publications.value.some(item => item.id === props.form.whatnotPublicationId)) missing.push(t('platformListings.whatnotPublication'))
  for (const [field, label] of [['auctionPrice', 'whatnotAuctionPrice'], ['category', 'whatnotTargetCategory']]) {
    if (!metafieldsReady.value || !metafields.value[field]?.available) {
      missing.push(t('platformListings.whatnotMetafieldUnavailable', { field: t('platformListings.' + label) }))
    }
  }
  if (!metafields.value.category?.fixed || !props.form.whatnotTargetCategoryValue) missing.push(t('platformListings.whatnotFixedCategoryRequired'))
  if (!isWhatnotPriceValid(props.form.whatnotAuctionPrice)) missing.push(t('platformListings.whatnotAuctionPriceInvalid'))
  return missing
}

watch(() => [props.form.shopId, props.form.platform], loadConfig, { immediate: true })
onBeforeUnmount(() => { ++configSequence })
defineExpose({ validate })
</script>

<style scoped>
.whatnot-shop-fields { display: grid; gap: 16px; }
.whatnot-shop-fields > .el-button { justify-self: start; }
.whatnot-field-hint { width: 100%; color: #606266; font-size: 13px; line-height: 1.6; margin-top: 6px; }
.whatnot-field-error { width: 100%; color: #f56c6c; font-size: 13px; line-height: 1.6; margin-top: 6px; }
.whatnot-shop-fields :deep(.el-checkbox) { height: auto; white-space: normal; align-items: flex-start; }
.whatnot-shop-fields :deep(.el-checkbox__input) { margin-top: 4px; }
.whatnot-shop-fields :deep(.el-checkbox__label) { white-space: normal; line-height: 1.6; }
</style>
