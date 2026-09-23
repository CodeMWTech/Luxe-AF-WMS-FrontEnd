<template>
  <div class="whatnot-shop-fields">
    <el-alert :title="t('platformListings.whatnotViaShopifyHint')" type="info" show-icon :closable="false" />
    <el-alert v-if="configError" :title="configError" type="error" show-icon :closable="false" />
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
      <el-col :xs="24" :sm="16">
        <el-form-item :label="t('platformListings.whatnotCategory')">
          <el-select v-model="form.whatnotCategoryId" clearable filterable remote :remote-method="searchCategories" :loading="categoryLoading" :disabled="!form.shopId" :placeholder="t('platformListings.whatnotCategoryPlaceholder')" style="width:100%">
            <el-option v-for="category in categoryOptions" :key="category.id" :value="category.id" :label="category.name" />
          </el-select>
          <div class="whatnot-field-hint">{{ t('platformListings.whatnotCategoryHint') }}</div>
        </el-form-item>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-form-item :label="t('platformListings.currency')" required>
          <el-input :model-value="form.whatnotCurrency" readonly :placeholder="t('platformListings.whatnotCurrencyHint')" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-form-item required>
      <el-checkbox v-model="form.whatnotAutoPublishConfirmed">{{ t('platformListings.whatnotAutoPublishConfirm') }}</el-checkbox>
      <div class="whatnot-field-hint">{{ t('platformListings.whatnotAutoPublishHint') }}</div>
    </el-form-item>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
import { getWhatnotConfig, searchWhatnotCategories } from '@/api/wms/platformListing'

const props = defineProps({ form: { type: Object, required: true } })
const { proxy } = getCurrentInstance()
const t = (key, values) => proxy?.$t?.(key, values) || key
const locations = ref([])
const publications = ref([])
const categories = ref([])
const configLoading = ref(false)
const categoryLoading = ref(false)
const configError = ref('')
const configReady = ref(false)
let configSequence = 0
let categorySequence = 0
const normalizeOptions = (items) => (Array.isArray(items) ? items : []).map(item => ({ ...item, id: String(item.id) }))
const categoryOptions = computed(() => {
  const selected = props.form.whatnotCategoryId
  return selected && !categories.value.some(item => item.id === selected)
    ? [{ id: selected, name: selected }, ...categories.value]
    : categories.value
})

async function loadConfig() {
  const sequence = ++configSequence
  const shopId = props.form.shopId
  configReady.value = false
  configError.value = ''
  locations.value = []
  publications.value = []
  if (!shopId || props.form.platform !== 'SHOPIFY') {
    configLoading.value = false
    return
  }
  configLoading.value = true
  try {
    const response = await getWhatnotConfig(shopId)
    if (sequence !== configSequence) return
    const data = response.data || {}
    locations.value = normalizeOptions(data.locations)
    publications.value = normalizeOptions(data.publications)
    props.form.whatnotCurrency = String(data.currency || '').toUpperCase()
    for (const [field, options] of [['whatnotLocationId', locations.value], ['whatnotPublicationId', publications.value]]) {
      if (!options.some(item => item.id === String(props.form[field] || ''))) props.form[field] = ''
      if (!props.form[field] && options.length === 1) props.form[field] = options[0].id
    }
    configReady.value = Boolean(props.form.whatnotCurrency && locations.value.length && publications.value.length)
    if (!configReady.value) configError.value = t('platformListings.whatnotConfigIncomplete')
  } catch (error) {
    if (sequence === configSequence) configError.value = error?.response?.data?.msg || error?.message || t('platformListings.whatnotConfigFailed')
  } finally {
    if (sequence === configSequence) configLoading.value = false
  }
}

async function searchCategories(query) {
  const sequence = ++categorySequence
  if (!props.form.shopId || !String(query || '').trim()) {
    categories.value = []
    categoryLoading.value = false
    return
  }
  categoryLoading.value = true
  try {
    const response = await searchWhatnotCategories(props.form.shopId, query.trim())
    if (sequence === categorySequence) categories.value = normalizeOptions(response.data)
  } catch {
    if (sequence === categorySequence) {
      categories.value = []
      proxy.$modal.msgWarning(t('platformListings.whatnotCategoryFailed'))
    }
  } finally {
    if (sequence === categorySequence) categoryLoading.value = false
  }
}

function validate() {
  const missing = []
  if (configLoading.value || !configReady.value) missing.push(t('platformListings.whatnotConfigRequired'))
  if (!locations.value.some(item => item.id === props.form.whatnotLocationId)) missing.push(t('platformListings.whatnotLocation'))
  if (!publications.value.some(item => item.id === props.form.whatnotPublicationId)) missing.push(t('platformListings.whatnotPublication'))
  if (props.form.whatnotAutoPublishConfirmed !== true) missing.push(t('platformListings.whatnotAutoPublishConfirm'))
  return missing
}

watch(() => [props.form.shopId, props.form.platform], () => {
  ++categorySequence
  categories.value = []
  categoryLoading.value = false
  loadConfig()
}, { immediate: true })
onBeforeUnmount(() => { ++configSequence; ++categorySequence })
defineExpose({ validate })
</script>

<style scoped>
.whatnot-shop-fields { display: grid; gap: 16px; }
.whatnot-shop-fields > .el-button { justify-self: start; }
.whatnot-field-hint { width: 100%; color: #606266; font-size: 13px; line-height: 1.6; margin-top: 6px; }
.whatnot-shop-fields :deep(.el-checkbox) { height: auto; white-space: normal; align-items: flex-start; }
.whatnot-shop-fields :deep(.el-checkbox__input) { margin-top: 4px; }
.whatnot-shop-fields :deep(.el-checkbox__label) { white-space: normal; line-height: 1.6; }
</style>
