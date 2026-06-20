<template>
  <div class="app-container listing-templates">
    <el-card class="filter-card">
      <el-form :model="queryParams" ref="queryRef" :inline="true" @submit.prevent="handleQuery">
        <el-form-item :label="t('platformListings.filterPlatform')">
          <el-select v-model="queryParams.platform" clearable style="width:140px">
            <el-option label="TikTok Shop" value="TIKTOK" />
            <el-option label="eBay" value="EBAY" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.searchByShop')">
          <el-select v-model="queryParams.shopId" clearable filterable style="width:160px" :placeholder="t('platformListings.searchByShop')">
            <el-option v-for="s in shopList" :key="s.id" :label="s.shopName" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('platformListings.templateName')">
          <el-input v-model="queryParams.templateName" clearable :placeholder="t('platformListings.searchTemplateName')" style="width:200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">{{ t('platformListings.btnQuery') }}</el-button>
          <el-button icon="Refresh" @click="resetQuery">{{ t('platformListings.btnReset') }}</el-button>
          <el-button type="success" icon="Plus" @click="handleAdd" v-hasPermi="['wms:platform:listing:edit']">{{ t('platformListings.btnCreateTemplate') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-table :data="templateList" v-loading="loading" border stripe>
        <el-table-column :label="t('platformListings.templateName')" prop="templateName" min-width="150" />
        <el-table-column :label="t('platformListings.templatePlatform')" prop="platform" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.platform === 'EBAY' ? '' : 'danger'" size="small">{{ row.platform === 'EBAY' ? 'eBay' : 'TikTok' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.filterShop')" prop="shopName" width="160" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.defaultPrice')" width="110" align="right">
          <template #default="{ row }">{{ row.priceMarkupValue != null ? '$' + Number(row.priceMarkupValue).toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column :label="t('platformListings.titleFormat')" prop="titleFormat" min-width="200" show-overflow-tooltip />
        <el-table-column :label="t('platformListings.templateStatus')" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">{{ row.status === 'ENABLED' ? t('platformListings.templateEnabled') : t('platformListings.templateDisabled') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('platformListings.createTime')" prop="createTime" width="160" />
        <el-table-column :label="t('platformListings.operation')" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="Edit" @click="handleEdit(row)">{{ t('platformListings.btnEditTemplate') }}</el-button>
            <el-button link type="danger" size="small" icon="Delete" @click="handleDelete(row)">{{ t('platformListings.btnDeleteTemplate') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="1180px" :close-on-click-modal="false" destroy-on-close top="20px">
      <div class="template-dialog-body">

        <!-- ============ 公共头部 ============ -->
        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="8">
            <div class="field-label required">{{ t('platformListings.templateName') }}</div>
            <el-input v-model="form.templateName" maxlength="100" :placeholder="t('platformListings.templateNamePlaceholder')" />
          </el-col>
          <el-col :span="6">
            <div class="field-label required">{{ t('platformListings.templatePlatform') }}</div>
            <el-select v-model="form.platform" :disabled="dialog.isEdit" style="width:100%" @change="onPlatformChange">
              <el-option label="eBay" value="EBAY" />
              <el-option label="TikTok Shop" value="TIKTOK" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <div class="field-label required">{{ t('platformListings.filterShop') }}</div>
            <el-select v-model="form.shopId" filterable style="width:100%" :placeholder="t('platformListings.templateSelectShop')" @change="loadWarehouses">
              <el-option v-for="s in filteredShopList" :key="s.id" :label="s.shopName + ' (' + s.platform + ')'" :value="s.id" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <div class="field-label">&nbsp;</div>
            <el-switch v-model="form.enabled" :active-text="t('platformListings.templateEnabled')" :inactive-text="t('platformListings.templateDisabled')" style="margin-top:8px" />
          </el-col>
        </el-row>

        <!-- ============================================================ -->
        <!--                      eBay 原生表单                           -->
        <!-- ============================================================ -->
        <template v-if="form.platform === 'EBAY'">
          <div class="ebay-listing-builder">
            <div class="ebay-topbar">
              <div class="ebay-logo" aria-label="eBay">
                <span class="logo-e">e</span><span class="logo-b">b</span><span class="logo-a">a</span><span class="logo-y">y</span>
              </div>
            </div>

            <h2 class="ebay-page-title">{{ t('platformListings.ebayCompleteListing') }}</h2>

            <section class="ebay-section">
              <div class="ebay-section-title-row">
                <h3>{{ t('platformListings.ebaySectionTitle') }}</h3>
              </div>
              <label class="ebay-field-label">{{ t('platformListings.ebayItemTitle') }}</label>
              <el-input v-model="form.defaultTitle" maxlength="80" show-word-limit placeholder="{brandEn} {itemName} {material} {year} {skuCode}" />
              <div class="ebay-field-row two-col compact-row">
                <div>
                  <label class="ebay-field-label">{{ t('platformListings.ebaySubtitle') }}</label>
                  <el-input v-model="form.ebaySubtitle" maxlength="55" show-word-limit :placeholder="t('platformListings.ebaySubtitlePlaceholder')" />
                </div>
              </div>
            </section>

            <section class="ebay-section">
              <div class="ebay-section-title-row">
                <h3>{{ t('platformListings.ebayItemCategory') }}</h3>
                <el-button size="small" text icon="Edit" @click="handleSyncCategories('EBAY')" :loading="syncingEbay">{{ t('platformListings.sync') }}</el-button>
              </div>
              <div class="category-summary">
                <div>
                  <div class="summary-label">{{ t('platformListings.primaryCategoryLabel') }}</div>
                  <el-tree-select
                    v-model="form.ebayCategoryId"
                    :data="ebayCategoryTree"
                    :props="{ label: 'label', value: 'id', isLeaf: 'isLeaf' }"
                    :placeholder="t('platformListings.primaryCategoryPlaceholder')"
                    filterable
                    lazy
                    :load="loadEbayChildren"
                    style="width:100%"
                  />
                </div>
              </div>
            </section>

            <section class="ebay-section specifics-section">
              <h3>{{ t('platformListings.ebayItemSpecifics') }}</h3>
              <div class="specifics-subtitle">{{ t('platformListings.required') }}</div>
              <div class="specific-grid">
                <div class="specific-field"><label>{{ t('platformListings.exteriorColor') }}</label><el-select v-model="form.ebayExteriorColor" filterable allow-create default-first-option style="width:100%"><el-option label="N/A" value="N/A" /><el-option label="Black" value="Black" /><el-option label="Brown" value="Brown" /><el-option label="Beige" value="Beige" /><el-option label="Multicolor" value="Multicolor" /></el-select></div>
                <div class="specific-field"><label>{{ t('platformListings.department') }}</label><el-select v-model="form.ebayDepartment" filterable allow-create default-first-option style="width:100%"><el-option label="Women" value="Women" /><el-option label="Men" value="Men" /><el-option label="Unisex Adults" value="Unisex Adults" /></el-select></div>
              </div>
              <div class="specifics-subtitle">{{ t('platformListings.optionalAdditional') }}</div>
              <div class="specific-grid">
                <div class="specific-field"><label>{{ t('platformListings.productLine') }}</label><el-select v-model="form.ebayProductLine" filterable allow-create default-first-option style="width:100%"><el-option label="N/A" value="N/A" /><el-option label="Neverfull" value="Neverfull" /><el-option label="Speedy" value="Speedy" /><el-option label="Monogram" value="Monogram" /></el-select></div>
                <div class="specific-field"><label>{{ t('platformListings.size') }}</label><el-select v-model="form.ebaySize" filterable allow-create default-first-option style="width:100%"><el-option label="N/A" value="N/A" /><el-option label="Small" value="Small" /><el-option label="Medium" value="Medium" /><el-option label="Large" value="Large" /></el-select></div>
                <div class="specific-field"><label>{{ t('platformListings.countryRegion') }}</label><el-select v-model="form.ebayCountry" filterable allow-create default-first-option style="width:100%"><el-option label="US" value="US" /><el-option label="FR" value="FR" /><el-option label="IT" value="IT" /><el-option label="ES" value="ES" /></el-select></div>
              </div>
            </section>

            <section class="ebay-section condition-section">
              <h3>{{ t('platformListings.condition') }}</h3>
              <div class="ebay-field-row two-col compact-row">
                <div><label class="ebay-field-label">{{ t('platformListings.condition') }}</label><el-select v-model="form.ebayConditionId" style="width:100%"><el-option label="1000 - New with tags" value="1000" /><el-option label="1500 - New without tags" value="1500" /><el-option label="1750 - New with defects" value="1750" /><el-option label="3000 - Pre-owned" value="3000" /></el-select></div>
                <div><label class="ebay-field-label">{{ t('platformListings.conditionDescription') }}</label><el-input v-model="form.ebayConditionDescription" placeholder="{condition} - {defect} | Included: {accessories}" /></div>
              </div>
            </section>

            <section class="ebay-section description-section">
              <div class="ebay-section-title-row"><h3>{{ t('platformListings.ebayDescription') }}</h3></div>
              <div class="description-toolbar-label">{{ t('platformListings.ebayDescriptionToolbar') }}</div>
              <div class="ebay-rich-editor"><Editor v-model="form.descriptionFormat" :height="260" :min-height="220" /></div>
              <div class="ebay-note">{{ t('platformListings.ebayDescriptionNote') }}</div>
            </section>

            <section class="ebay-section pricing-section">
              <div class="ebay-section-title-row"><h3>{{ t('platformListings.pricing') }}</h3></div>
              <div class="ebay-field-row three-col compact-row">
                <div><label class="ebay-field-label">{{ t('platformListings.format') }}</label><el-select v-model="form.listingType" style="width:100%"><el-option label="Buy It Now" value="FIXED_PRICE" /><el-option label="Auction" value="AUCTION" /></el-select></div>
                <div><label class="ebay-field-label">{{ form.listingType === 'AUCTION' ? t('platformListings.startPrice') : t('platformListings.buyItNowPrice') }}</label><el-input-number v-model="form.defaultPrice" :min="0" :precision="2" :step="10" style="width:100%" /></div>
                <div><label class="ebay-field-label">{{ t('platformListings.quantity') }}</label><el-input-number v-model="form.ebayQuantity" :min="1" :max="100" style="width:100%" /></div>
              </div>
              <div class="ebay-field-row three-col compact-row" v-if="form.listingType === 'AUCTION'">
                <div><label class="ebay-field-label">{{ t('platformListings.duration') }}</label><el-select v-model="form.listingDuration" style="width:100%"><el-option label="3 Days" value="Days_3" /><el-option label="5 Days" value="Days_5" /><el-option label="7 Days" value="Days_7" /><el-option label="10 Days" value="Days_10" /></el-select></div>
                <div><label class="ebay-field-label">{{ t('platformListings.buyItNowPrice') }}</label><el-input-number v-model="form.buyItNowPrice" :min="0" :precision="2" style="width:100%" /></div>
                <div><label class="ebay-field-label">{{ t('platformListings.currency') }}</label><el-select v-model="form.ebayCurrency" style="width:100%"><el-option label="USD" value="USD" /><el-option label="GBP" value="GBP" /><el-option label="EUR" value="EUR" /><el-option label="AUD" value="AUD" /></el-select></div>
              </div>
              <el-switch v-model="form.ebayBestOfferEnabled" :active-text="t('platformListings.bestOffer')" :inactive-text="t('platformListings.bestOfferOff')" />
            </section>

            <section class="ebay-section shipping-section">
              <h3>{{ t('platformListings.shipping') }}</h3>
              <div class="policy-card-list">
                <div class="policy-card"><div class="policy-title">{{ t('platformListings.domesticShipping') }}</div><el-select v-model="form.ebayFulfillmentPolicyId" :placeholder="t('platformListings.selectShippingPolicy')" clearable filterable style="width:100%"><el-option v-for="p in fulfillmentPolicies" :key="p.id" :label="p.name" :value="p.id" /></el-select></div>
                <div class="policy-card"><div class="policy-title">{{ t('platformListings.returnPolicy') }}</div><el-select v-model="form.ebayReturnPolicyId" :placeholder="t('platformListings.selectReturnPolicy')" clearable filterable style="width:100%"><el-option v-for="p in returnPolicies" :key="p.id" :label="p.name" :value="p.id" /></el-select></div>
                <div class="policy-card"><div class="policy-title">{{ t('platformListings.paymentPolicy') }}</div><el-select v-model="form.ebayPaymentPolicyId" :placeholder="t('platformListings.selectPaymentPolicy')" clearable filterable style="width:100%"><el-option v-for="p in paymentPolicies" :key="p.id" :label="p.name" :value="p.id" /></el-select></div>
              </div>
              <el-button size="small" type="primary" plain icon="Download" @click="loadEbayPolicies" :loading="loadingPolicies">{{ t('platformListings.loadEbayPolicies') }}</el-button>
              <div class="ebay-field-row four-col compact-row shipping-metrics">
                <div><label class="ebay-field-label">{{ t('platformListings.length') }} ({{ dimensionUnitShort }})</label><el-input-number v-model="form.packageLength" :min="0" :precision="1" style="width:100%" /></div>
                <div><label class="ebay-field-label">{{ t('platformListings.width') }} ({{ dimensionUnitShort }})</label><el-input-number v-model="form.packageWidth" :min="0" :precision="1" style="width:100%" /></div>
                <div><label class="ebay-field-label">{{ t('platformListings.height') }} ({{ dimensionUnitShort }})</label><el-input-number v-model="form.packageHeight" :min="0" :precision="1" style="width:100%" /></div>
                <div><label class="ebay-field-label">{{ t('platformListings.weight') }} ({{ weightUnitShort }})</label><el-input-number v-model="form.packageWeightValue" :min="0" :precision="weightPrecision" :step="weightStep" style="width:100%" /></div>
              </div>
              <div class="unit-row">
                <el-select v-model="form.packageWeightUnit" style="width:190px"><el-option v-for="u in weightUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
                <el-select v-model="form.packageDimensionUnit" style="width:190px"><el-option v-for="u in dimensionUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
              </div>
            </section>

            <section class="ebay-section preferences-section">
              <div class="ebay-section-title-row"><h3>{{ t('platformListings.preferences') }}</h3></div>
              <div class="toggle-row"><span>{{ t('platformListings.returnsAccepted') }}</span><el-switch v-model="form.ebayReturnsAccepted" /></div>
              <div class="toggle-row"><span>{{ t('platformListings.privateListing') }}</span><el-switch v-model="form.ebayPrivateListing" /></div>
            </section>
          </div>
        </template>

        <!-- ============================================================ -->
        <!--                    TikTok 原生表单                           -->
        <!-- ============================================================ -->
        <template v-if="form.platform === 'TIKTOK'">
          <div class="tiktok-listing-builder editable-only">
            <div class="tiktok-page-head">
              <div class="tiktok-back">‹</div>
              <div>
                <div class="tiktok-page-title">{{ form.templateName || t('platformListings.tiktokTemplateFallback') }}</div>
              </div>
              <el-button class="tiktok-update-btn" type="primary" size="small" @click="submitForm" :loading="submitting">{{ t('platformListings.update') }}</el-button>
            </div>

            <div class="tiktok-layout">
              <main class="tiktok-main-form">
                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.basicInformation') }}</h3>
                  <div class="tiktok-field-block">
                    <label class="tiktok-required-label">{{ t('platformListings.productNameLabel') }}</label>
                    <el-input v-model="form.defaultTitle" maxlength="255" show-word-limit :placeholder="t('platformListings.productNamePlaceholder')" />
                  </div>

                  <div class="tiktok-field-block">
                    <label class="tiktok-required-label">{{ t('platformListings.category') }}</label>
                    <el-tree-select
                      v-model="form.tiktokCategoryId"
                      :data="tiktokCategoryTree"
                      :props="{ label: 'label', value: 'id', isLeaf: 'isLeaf' }"
                      :placeholder="t('platformListings.primaryCategoryPlaceholder')"
                      filterable
                      lazy
                      :load="loadTiktokChildren"
                      style="width:100%"
                    />
                    <el-button link type="primary" size="small" @click="handleSyncCategories('TIKTOK')" :loading="syncingTiktok">{{ t('platformListings.syncLatestCategories') }}</el-button>
                  </div>

                  <div class="tiktok-field-block">
                    <label class="tiktok-required-label">{{ t('platformListings.brand') }}</label>
                    <el-input v-model="form.tiktokBrandId" :placeholder="t('platformListings.tiktokBrandPlaceholder')" />
                  </div>

                  <div class="tiktok-field-block">
                    <label class="tiktok-required-label">{{ t('platformListings.condition') }}</label>
                    <el-select v-model="form.tiktokConditionValue" style="width:100%">
                      <el-option label="N/A" value="N/A" />
                      <el-option label="Pre-owned" value="Pre-owned" />
                      <el-option label="New with tag" value="New with tag" />
                      <el-option label="New without tag" value="New without tag" />
                    </el-select>
                  </div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.productDetails') }}</h3>
                  <label class="tiktok-required-label">{{ t('platformListings.ebayDescription') }}</label>
                  <div class="tiktok-rich-editor seller-editor"><Editor v-model="form.descriptionFormat" :height="280" :min-height="240" /></div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.salesInformation') }}</h3>
                  <div class="stock-toolbar editable-stock-toolbar">
                    <el-select v-model="form.tiktokWarehouseId" :placeholder="t('platformListings.warehousePlaceholder')" clearable filterable allow-create :disabled="!form.shopId" :loading="warehouseLoading" style="width:100%">
                      <el-option v-for="w in warehouseList" :key="w.id" :label="w.name + ' (' + w.id + ')'" :value="w.id" />
                    </el-select>
                  </div>
                  <div class="tiktok-stock-grid editable-stock-grid">
                    <div><label>{{ t('platformListings.stock') }}</label><el-input-number v-model="form.tiktokQuantity" :min="1" :max="999" style="width:100%" /></div>
                    <div><label>{{ t('platformListings.retailPrice') }}</label><el-input-number v-model="form.defaultPrice" :min="0" :precision="2" :step="10" style="width:100%" /></div>
                    <div><label>{{ t('platformListings.currency') }}</label><el-select v-model="form.tiktokCurrency" style="width:100%"><el-option label="USD" value="USD" /><el-option label="GBP" value="GBP" /></el-select></div>
                  </div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.shipping') }}</h3>
                  <label class="tiktok-required-label">{{ t('platformListings.packageWeight') }}</label>
                  <div class="unit-input-row">
                    <el-select v-model="form.packageWeightUnit" class="unit-select"><el-option v-for="u in weightUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
                    <el-input-number v-model="form.packageWeightValue" :min="0" :precision="weightPrecision" :step="weightStep" controls-position="right" style="width:100%" />
                  </div>
                  <label class="tiktok-required-label">{{ t('platformListings.packageDimensionsLabel') }}</label>
                  <div class="dimension-label-row">
                    <span>{{ t('platformListings.length') }}</span>
                    <span>{{ t('platformListings.width') }}</span>
                    <span>{{ t('platformListings.height') }}</span>
                  </div>
                  <div class="dimension-row three with-unit-suffix">
                    <el-input-number v-model="form.packageLength" :min="0" :precision="1" style="width:100%" />
                    <el-input-number v-model="form.packageWidth" :min="0" :precision="1" style="width:100%" />
                    <el-input-number v-model="form.packageHeight" :min="0" :precision="1" style="width:100%" />
                  </div>
                  <div class="unit-row compact">
                    <span class="unit-hint">{{ t('platformListings.dimensionUnit') }}</span>
                    <el-select v-model="form.packageDimensionUnit" style="width:180px"><el-option v-for="u in dimensionUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
                  </div>
                  <div class="tiktok-toggle-line"><div><strong>{{ t('platformListings.codAllowed') }}</strong></div><el-switch v-model="form.tiktokCodAllowed" /></div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.others') }}</h3>
                  <div class="tiktok-save-mode">
                    <label>{{ t('platformListings.saveMode') }}</label>
                    <el-select v-model="form.tiktokSaveMode" style="width:220px">
                      <el-option :label="t('platformListings.listingUpdateOnline')" value="LISTING" />
                      <el-option :label="t('platformListings.draftSaveDraft')" value="DRAFT" />
                    </el-select>
                  </div>
                </section>
              </main>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('platformListings.cancel') }}</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">{{ t('platformListings.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, getCurrentInstance, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { listTemplates, addTemplate, updateTemplate, delTemplate, getTemplate, getCategories, syncCategories, getEbayPolicies, getTiktokWarehouses } from '@/api/wms/platformListing'
import { listAllPlatformShops } from '@/api/wms/platformShop'

const { proxy } = getCurrentInstance()
const { locale } = useI18n()
const t = (key, values) => proxy?.$t?.(key, values) || key
const lang = () => locale.value === 'en' ? 'en' : 'zh'

const loading = ref(false), total = ref(0), templateList = ref([]), submitting = ref(false)
const queryRef = ref(null), formRef = ref(null)
const ebayCategoryTree = ref([])
const tiktokCategoryTree = ref([])
const syncingEbay = ref(false)
const loadingPolicies = ref(false)
const fulfillmentPolicies = ref([])
const paymentPolicies = ref([])
const returnPolicies = ref([])
const syncingTiktok = ref(false)
const shopList = ref([])
const filteredShopList = ref([])

function loadShops() {
  listAllPlatformShops().then(res => {
    shopList.value = res.rows || res.data || []
    shopList.value.forEach(s => { shopNameMap.value[s.id] = s.shopName })
    filterShops()
  }).catch(() => {})
}
function filterShops() {
  filteredShopList.value = form.platform
    ? shopList.value.filter(s => s.platform === form.platform)
    : shopList.value
}
function onPlatformChange() {
  applyPlatformUnitDefaults()
  filterShops()
  form.shopId = null
  warehouseList.value = []
  form.tiktokWarehouseId = ''
  fulfillmentPolicies.value = []
  paymentPolicies.value = []
  returnPolicies.value = []
}

// 懒加载：根据层级获取对应类目
function loadEbayChildren(node, resolve) {
  const parentId = node.level === 0 ? null : node.data?.dbId
  getCategories('EBAY', parentId, lang()).then(res => {
    const data = res.data || []
    // 同时写入 :data 确保顶级节点渲染（level===0 时 node.data 为空）
    if (node.level === 0) ebayCategoryTree.value = data
    resolve(data)
  }).catch(() => resolve([]))
}

function loadTiktokChildren(node, resolve) {
  const parentId = node.level === 0 ? null : node.data?.dbId
  getCategories('TIKTOK', parentId, lang()).then(res => {
    const data = res.data || []
    if (node.level === 0) tiktokCategoryTree.value = data
    resolve(data)
  }).catch(() => resolve([]))
}

const queryParams = reactive({ pageNum: 1, pageSize: 10, platform: '', templateName: '', shopId: null })

const initForm = {
  id: null, templateName: '', platform: 'EBAY', shopId: null, listingType: 'FIXED_PRICE', listingDuration: 'Days_7',
  enabled: true, defaultTitle: '', defaultPrice: null, buyItNowPrice: null,
  descriptionFormat: '',
  ebayCategoryId: '', ebayCondition: 'USED_GOOD', ebayConditionId: '3000', ebayConditionDescription: '{condition} - {defect} | Included: {accessories}',
  ebaySubtitle: '', ebayQuantity: 1, ebayMarketplaceId: 'EBAY_US', ebayCurrency: 'USD',
  ebayDepartment: 'Women', ebayExteriorColor: 'N/A', ebaySize: 'N/A', ebayProductLine: 'N/A', ebayCountry: 'US',
  ebayLocation: 'Los Angeles, California', ebayPostalCode: '90048', ebayDispatchTimeMax: 3,
  ebayShippingService: 'USPSParcel', ebayShippingCost: 0, ebayReturnsAccepted: false, ebayBestOfferEnabled: false, ebayPrivateListing: false,
  ebayFulfillmentPolicyId: '', ebayPaymentPolicyId: '', ebayReturnPolicyId: '',
  tiktokCategoryId: '', tiktokCategoryVersion: 'v2', tiktokSaveMode: 'LISTING', tiktokBrandId: '', tiktokConditionValue: 'Pre-owned',
  tiktokWarehouseId: '', tiktokQuantity: 1, tiktokCurrency: 'USD', tiktokCodAllowed: false,
  packageWeightValue: null, packageWeightUnit: 'POUND', packageLength: null, packageWidth: null, packageHeight: null, packageDimensionUnit: 'INCH'
}
const form = reactive({ ...initForm })
const weightUnitOptions = computed(() => {
  locale.value
  return form.platform === 'TIKTOK'
    ? [
        { label: t('platformListings.unitGram'), value: 'GRAM', short: 'g' },
        { label: t('platformListings.unitKilogram'), value: 'KILOGRAM', short: 'kg' },
        { label: t('platformListings.unitPound'), value: 'POUND', short: 'lb' },
        { label: t('platformListings.unitOunce'), value: 'OUNCE', short: 'oz' }
      ]
    : [
        { label: t('platformListings.unitPound'), value: 'POUND', short: 'lb' },
        { label: t('platformListings.unitOunce'), value: 'OUNCE', short: 'oz' },
        { label: t('platformListings.unitKilogram'), value: 'KILOGRAM', short: 'kg' },
        { label: t('platformListings.unitGram'), value: 'GRAM', short: 'g' }
      ]
})
const dimensionUnitOptions = computed(() => {
  locale.value
  return form.platform === 'TIKTOK'
    ? [
        { label: t('platformListings.unitCentimeter'), value: 'CENTIMETER', short: 'cm' },
        { label: t('platformListings.unitInch'), value: 'INCH', short: 'in' }
      ]
    : [
        { label: t('platformListings.unitInch'), value: 'INCH', short: 'in' },
        { label: t('platformListings.unitCentimeter'), value: 'CENTIMETER', short: 'cm' }
      ]
})
const weightUnitShort = computed(() => weightUnitOptions.value.find(u => u.value === form.packageWeightUnit)?.short || '')
const dimensionUnitShort = computed(() => dimensionUnitOptions.value.find(u => u.value === form.packageDimensionUnit)?.short || '')
const weightPrecision = computed(() => ['GRAM', 'OUNCE'].includes(form.packageWeightUnit) ? 0 : 2)
const weightStep = computed(() => form.packageWeightUnit === 'GRAM' ? 100 : (form.packageWeightUnit === 'OUNCE' ? 1 : 0.5))
function applyPlatformUnitDefaults() {
  if (form.platform === 'TIKTOK') {
    form.packageWeightUnit = 'GRAM'
    form.packageDimensionUnit = 'CENTIMETER'
  } else {
    form.packageWeightUnit = 'POUND'
    form.packageDimensionUnit = 'INCH'
  }
}
watch(() => form.packageWeightUnit, (unit) => {
  if (['GRAM', 'OUNCE'].includes(unit) && form.packageWeightValue != null) {
    form.packageWeightValue = Math.round(Number(form.packageWeightValue))
  }
})
const ebayPaymentPolicyName = computed(() => {
  const selected = paymentPolicies.value.find(p => p.id === form.ebayPaymentPolicyId)
  return selected?.name || 'Immediate Payment'
})
const rules = {
  templateName: [{ required: true, message: t('platformListings.templateNameRequired'), trigger: 'blur' }],
  platform: [{ required: true, message: t('platformListings.platformRequired'), trigger: 'change' }],
  shopId: [{ required: true, message: t('platformListings.shopRequired'), trigger: 'change' }]
}
const dialog = reactive({ visible: false, title: '', isEdit: false })

const shopNameMap = ref({})
const warehouseList = ref([])
const warehouseLoading = ref(false)

// 选择 TikTok 店铺后自动加载仓库列表
function toggleTiktokDraft(enabled) {
  form.tiktokSaveMode = enabled ? 'DRAFT' : 'LISTING'
}

function loadWarehouses() {
  if (form.platform !== 'TIKTOK' || !form.shopId) { warehouseList.value = []; return }
  warehouseLoading.value = true
  getTiktokWarehouses(form.shopId).then(res => {
    warehouseList.value = res.data || []
    if (form.tiktokWarehouseId && !warehouseList.value.some(w => w.id === form.tiktokWarehouseId)) {
      form.tiktokWarehouseId = ''
    }
  }).catch(() => { warehouseList.value = [] })
    .finally(() => { warehouseLoading.value = false })
}

function getList() {
  loading.value = true
  listTemplates(queryParams).then(res => {
    const rows = res.rows || []
    // 附加店铺名
    rows.forEach(r => { r.shopName = shopNameMap.value[r.shopId] || '' })
    templateList.value = rows
    total.value = res.total || 0
  }).finally(() => { loading.value = false })
}

function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery() { queryRef.value?.resetFields(); handleQuery() }
function resetForm() { Object.assign(form, initForm); form.enabled = true }

function handleAdd() { resetForm(); filterShops(); dialog.title = t('platformListings.templateCreateTitle'); dialog.isEdit = false; dialog.visible = true }
function handleEdit(row) {
  resetForm(); dialog.title = t('platformListings.templateEditTitle'); dialog.isEdit = true
  getTemplate(row.id).then(res => {
    const d = res.data || {}
    Object.assign(form, {
      id: d.id, templateName: d.templateName, platform: d.platform, shopId: d.shopId,
      listingType: d.listingType || 'FIXED_PRICE', listingDuration: d.listingDuration || 'Days_7',
      enabled: d.status === 'ENABLED', buyItNowPrice: d.buyItNowPrice || null,
      defaultTitle: d.titleFormat || '', defaultPrice: d.priceMarkupValue || null,
      descriptionFormat: d.descriptionFormat || '',
      ebayCategoryId: d.ebayCategoryId || '', ebayCondition: d.ebayCondition || 'USED_GOOD',
      ebayConditionId: d.ebayConditionId || '3000', ebayConditionDescription: d.ebayConditionDescription || '{condition} - {defect} | Included: {accessories}',
      ebaySubtitle: d.ebaySubtitle || '', ebayQuantity: d.ebayQuantity || 1, ebayMarketplaceId: d.ebayMarketplaceId || 'EBAY_US',
      ebayCurrency: d.ebayCurrency || 'USD', ebayDepartment: d.ebayDepartment || 'Women', ebayExteriorColor: d.ebayExteriorColor || 'N/A',
      ebaySize: d.ebaySize || 'N/A', ebayProductLine: d.ebayProductLine || 'N/A', ebayCountry: d.ebayCountry || 'US',
      ebayLocation: d.ebayLocation || 'Los Angeles, California', ebayPostalCode: d.ebayPostalCode || '90048', ebayDispatchTimeMax: d.ebayDispatchTimeMax || 3,
      ebayShippingService: d.ebayShippingService || 'USPSParcel', ebayShippingCost: d.ebayShippingCost ?? 0,
      ebayReturnsAccepted: !!d.ebayReturnsAccepted, ebayBestOfferEnabled: !!d.ebayBestOfferEnabled, ebayPrivateListing: !!d.ebayPrivateListing,
      ebayFulfillmentPolicyId: d.ebayFulfillmentPolicyId || '',
      ebayPaymentPolicyId: d.ebayPaymentPolicyId || '',
      ebayReturnPolicyId: d.ebayReturnPolicyId || '',
      tiktokCategoryId: d.tiktokCategoryId || '', tiktokCategoryVersion: d.tiktokCategoryVersion || 'v2', tiktokSaveMode: d.tiktokSaveMode || 'LISTING',
      tiktokBrandId: d.tiktokBrandId || '', tiktokConditionValue: d.tiktokConditionValue || 'Pre-owned',
      tiktokWarehouseId: d.tiktokWarehouseId || '', tiktokQuantity: d.tiktokQuantity || 1, tiktokCurrency: d.tiktokCurrency || 'USD', tiktokCodAllowed: !!d.tiktokCodAllowed,
      packageWeightValue: d.packageWeightValue, packageWeightUnit: d.packageWeightUnit || (d.platform === 'TIKTOK' ? 'GRAM' : 'POUND'), packageLength: d.packageLength,
      packageWidth: d.packageWidth, packageHeight: d.packageHeight, packageDimensionUnit: d.packageDimensionUnit || (d.platform === 'TIKTOK' ? 'CENTIMETER' : 'INCH')
    })
    filterShops()
    // 预加载根类目 + 已选类目节点（显示名称而非ID）
    if (d.platform === 'EBAY') {
      getCategories('EBAY', null).then(r => {
        const items = (r.data || []).map(c => ({ ...c }))
        if (d.ebayCategoryId && d.ebayCategoryName) {
          const exists = items.find(c => c.id === d.ebayCategoryId)
          if (!exists) {
            items.unshift({ id: d.ebayCategoryId, label: d.ebayCategoryNameZh || d.ebayCategoryName, labelEn: d.ebayCategoryName || d.ebayCategoryNameZh, isLeaf: false })
          }
        }
        ebayCategoryTree.value = items
      }).catch(() => {})
    }
  })
  dialog.visible = true
}

function submitForm() {
  if (!form.templateName) { proxy.$modal.msgWarning(t('platformListings.templateNameRequired')); return }
  if (!form.platform) { proxy.$modal.msgWarning(t('platformListings.platformRequired')); return }
  if (!form.shopId) { proxy.$modal.msgWarning(t('platformListings.shopRequired')); return }
  submitting.value = true
  const isEbay = form.platform === 'EBAY'
  const data = {
    id: form.id, templateName: form.templateName, platform: form.platform,
    shopId: form.shopId, listingType: form.listingType, listingDuration: form.listingDuration,
    status: form.enabled ? 'ENABLED' : 'DISABLED', buyItNowPrice: form.buyItNowPrice || null,
    titleFormat: form.defaultTitle,          // 复用此字段存标题
    priceSource: 'CUSTOM',                   // 始终自定义价格
    priceMarkupValue: form.defaultPrice,     // FIXED_PRICE=立即购买价，AUCTION=起拍价
    priceMarkupType: 'FIXED',
    descriptionFormat: form.descriptionFormat || null,
    ebayCategoryId: form.ebayCategoryId || null, ebayCondition: form.ebayCondition || null,
    ebayConditionId: form.ebayConditionId || null, ebayConditionDescription: form.ebayConditionDescription || null, ebaySubtitle: form.ebaySubtitle || null,
    ebayQuantity: form.ebayQuantity, ebayMarketplaceId: form.ebayMarketplaceId || null, ebayCurrency: form.ebayCurrency || null,
    ebayDepartment: form.ebayDepartment || null, ebayExteriorColor: form.ebayExteriorColor || null, ebaySize: form.ebaySize || null,
    ebayProductLine: form.ebayProductLine || null, ebayCountry: form.ebayCountry || null, ebayLocation: form.ebayLocation || null,
    ebayPostalCode: form.ebayPostalCode || null, ebayDispatchTimeMax: form.ebayDispatchTimeMax,
    ebayShippingService: form.ebayShippingService || null, ebayShippingCost: form.ebayShippingCost,
    ebayReturnsAccepted: form.ebayReturnsAccepted, ebayBestOfferEnabled: form.ebayBestOfferEnabled, ebayPrivateListing: form.ebayPrivateListing,
    ebayFulfillmentPolicyId: form.ebayFulfillmentPolicyId || null,
    ebayPaymentPolicyId: form.ebayPaymentPolicyId || null,
    ebayReturnPolicyId: form.ebayReturnPolicyId || null,
    tiktokCategoryId: form.tiktokCategoryId || null, tiktokCategoryVersion: form.tiktokCategoryVersion || null, tiktokSaveMode: form.tiktokSaveMode || null,
    tiktokBrandId: form.tiktokBrandId || null, tiktokConditionValue: form.tiktokConditionValue || null,
    tiktokWarehouseId: form.tiktokWarehouseId || null, tiktokQuantity: form.tiktokQuantity, tiktokCurrency: form.tiktokCurrency || null, tiktokCodAllowed: form.tiktokCodAllowed,
    packageWeightValue: form.packageWeightValue,
    packageWeightUnit: form.packageWeightUnit,
    packageLength: form.packageLength, packageWidth: form.packageWidth, packageHeight: form.packageHeight,
    packageDimensionUnit: form.packageDimensionUnit
  }
  const req = dialog.isEdit ? updateTemplate(data) : addTemplate(data)
  req.then(() => {
    proxy.$modal.msgSuccess(dialog.isEdit ? t('platformListings.templateEditSuccess') : t('platformListings.templateAddSuccess'))
    dialog.visible = false; getList()
  }).catch(() => {
    proxy.$modal.msgError(t('platformListings.saveFailed'))
  }).finally(() => { submitting.value = false })
}

function handleDelete(row) {
  proxy.$modal.confirm(t('platformListings.confirmDeleteTemplateNamed', { name: row.templateName }), t('platformListings.templateTitle'), { type: 'warning' }).then(() => {
    delTemplate(row.id).then(() => { proxy.$modal.msgSuccess(t('platformListings.templateDeleteSuccess')); getList() })
  }).catch(() => {})
}

function loadEbayPolicies() {
  loadingPolicies.value = true
  getEbayPolicies(form.shopId).then(res => {
    const data = res.data || {}
    fulfillmentPolicies.value = data.fulfillmentPolicies || []
    paymentPolicies.value = data.paymentPolicies || []
    returnPolicies.value = data.returnPolicies || []
    const total = fulfillmentPolicies.value.length + paymentPolicies.value.length + returnPolicies.value.length
    proxy.$modal.msgSuccess(t('platformListings.policiesLoaded', { count: total }))
  }).catch(() => {
    proxy.$modal.msgError(t('platformListings.policiesLoadFailed'))
  }).finally(() => {
    loadingPolicies.value = false
  })
}

function handleSyncCategories(platform) {
  const isEbay = platform === 'EBAY'
  if (isEbay) syncingEbay.value = true; else syncingTiktok.value = true
  syncCategories(platform).then(res => {
    const count = res.data?.count || 0
    proxy.$modal.msgSuccess(t('platformListings.categoriesSyncDone', { platform, count }))
  }).catch(() => {
    proxy.$modal.msgError(t('platformListings.categoriesSyncFailed', { platform }))
  }).finally(() => {
    if (isEbay) syncingEbay.value = false; else syncingTiktok.value = false
  })
}

onMounted(() => { loadShops(); getList() })
</script>

<style scoped>
.listing-templates .filter-card { margin-bottom: 0; }
.template-dialog-body {
  max-height: 72vh;
  overflow-y: auto;
  padding: 0 6px 4px 0;
  background: #fff;
}

.field-label { font-size: 13px; font-weight: 500; color: #303133; margin-bottom: 4px; margin-top: 4px; }
.field-label.required::after { content: ' *'; color: #F56C6C; }
.field-hint { font-size: 12px; color: #909399; margin-top: 2px; }
.token-row { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; align-items: center; }

.ebay-listing-builder {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 4px 30px;
  color: #191919;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
}
.ebay-topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #e5e5e5;
}
.ebay-logo { font-size: 24px; line-height: 1; font-weight: 700; letter-spacing: 0; }
.logo-e { color: #e53238; }
.logo-b { color: #0064d2; }
.logo-a { color: #f5af02; }
.logo-y { color: #86b817; }
.ebay-page-title {
  margin: 20px 0 24px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
}
.ebay-section {
  padding: 22px 0 24px;
  border-bottom: 1px solid #e5e5e5;
}
.ebay-section h3,
.ebay-section-title-row h3 {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  color: #202124;
  letter-spacing: 0;
  text-transform: uppercase;
}
.ebay-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ebay-note,
.description-toolbar-label {
  color: #555;
  font-size: 12px;
  line-height: 1.5;
  margin: 4px 0 12px;
}
.ebay-field-label,
.summary-label,
.specific-field label {
  display: block;
  margin: 0 0 5px;
  color: #2f2f2f;
  font-size: 12px;
  font-weight: 600;
}
.compact-row { margin-top: 14px; }
.ebay-field-row,
.category-summary {
  display: grid;
  gap: 14px;
}
.two-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.three-col { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.four-col { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.five-col { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.category-summary { grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr); }

.photo-panel {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 14px;
  align-items: start;
  margin-top: 10px;
}
.photo-preview-card {
  position: relative;
  height: 230px;
  border: 1px solid #d8d8d8;
  background: #fafafa;
  padding: 22px 20px;
}
.photo-doc-title {
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 28px;
}
.photo-bag-thumb {
  width: 76px;
  height: 56px;
  margin: 0 0 22px 8px;
  border-radius: 3px;
  background: linear-gradient(135deg, #c54b3c, #7d2722);
  box-shadow: 0 9px 18px rgba(0, 0, 0, 0.18);
}
.photo-doc-lines { position: absolute; left: 122px; top: 84px; width: 110px; }
.photo-doc-lines span { display: block; height: 7px; margin-bottom: 9px; background: #ddd; }
.photo-doc-code {
  position: absolute;
  right: 20px;
  bottom: 18px;
  width: 42px;
  height: 42px;
  background: repeating-linear-gradient(90deg, #333 0 2px, transparent 2px 5px), repeating-linear-gradient(0deg, #333 0 2px, transparent 2px 5px);
  opacity: 0.55;
}
.photo-slots {
  display: grid;
  grid-template-columns: repeat(4, minmax(72px, 1fr));
  gap: 10px;
}
.photo-slot {
  aspect-ratio: 1 / 1;
  border: 1px solid #ededed;
  border-radius: 7px;
  background: #f6f6f6;
  color: #767676;
  cursor: default;
}
.slot-plus { font-size: 24px; line-height: 1; }
.info-strip,
.condition-tip,
.promo-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 8px 12px;
  border-radius: 3px;
  background: #f6f8fa;
  color: #4f5965;
  font-size: 12px;
  line-height: 1.4;
}
.info-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3665f3;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.specifics-subtitle {
  margin: 12px 0 10px;
  color: #555;
  font-size: 12px;
  font-weight: 700;
}
.specific-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 28px;
  row-gap: 12px;
}
.pill-row { display: flex; gap: 8px; min-height: 32px; align-items: center; }
.pill {
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #222;
  border-radius: 16px;
  padding: 5px 12px;
  font-size: 12px;
}
.pill.active { border-color: #191919; box-shadow: inset 0 0 0 1px #191919; }
.ebay-rich-editor,
.tiktok-rich-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.ebay-rich-editor :deep(.ql-toolbar),
.tiktok-rich-editor :deep(.ql-toolbar) { border: 0; border-bottom: 1px solid #dcdfe6; }
.ebay-rich-editor :deep(.ql-container),
.tiktok-rich-editor :deep(.ql-container) { border: 0; font-size: 13px; }
.payment-policy-card,
.preference-card,
.policy-card,
.disclosure-row {
  border: 1px solid #ededed;
  border-radius: 4px;
  background: #fff;
}
.payment-policy-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 14px 0;
  padding: 12px 14px;
}
.payment-policy-card p,
.preference-card p,
.disclosure-row p { margin: 4px 0 0; color: #666; font-size: 12px; line-height: 1.4; }
.policy-card-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}
.policy-card { padding: 12px; }
.policy-title { margin-bottom: 8px; font-size: 12px; font-weight: 700; }
.shipping-metrics { margin-top: 14px; }
.preference-card { padding: 12px 14px; margin-bottom: 12px; }
.toggle-row,
.disclosure-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  margin-top: 8px;
  font-size: 13px;
}
.promo-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.promo-card {
  min-height: 82px;
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  padding: 14px;
  background: #fff;
}
.promo-card.selected { border-color: #3665f3; box-shadow: inset 0 0 0 1px #3665f3; }
.promo-card strong,
.promo-card span { display: block; }
.promo-card span { color: #666; font-size: 12px; margin-top: 8px; }
.ebay-bottom-actions {
  display: grid;
  gap: 9px;
  max-width: 260px;
  margin: 34px auto 0;
}
.ebay-bottom-actions .el-button { width: 100%; margin-left: 0; }

.tiktok-listing-builder {
  margin: -6px -2px 24px;
  padding: 0 0 28px;
  color: #1f2329;
  background: #f2f3f5;
  font-family: Arial, Helvetica, sans-serif;
}
.tiktok-page-head {
  position: sticky;
  top: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 18px;
  background: #f2f3f5;
  border-bottom: 1px solid #eceff3;
}
.tiktok-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #2f3337;
  font-size: 28px;
  line-height: 1;
}
.tiktok-page-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0;
}
.tiktok-page-title span {
  color: #666;
  font-size: 12px;
  font-weight: 600;
}
.tiktok-update-btn {
  background: #6ee7d7;
  border-color: #6ee7d7;
  color: #fff;
  font-weight: 700;
}
.tiktok-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding: 14px 18px 0;
}
.tiktok-sidebar {
  display: grid;
  align-content: start;
  gap: 12px;
}
.tiktok-side-card,
.tiktok-form-section {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
}
.tiktok-side-card { padding: 16px; }
.attention-card { border-left: 3px solid #f2b13f; }
.attention-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b36b00;
  font-size: 16px;
  font-weight: 700;
}
.attention-title em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: auto;
  border-radius: 50%;
  background: #fff2cf;
  font-size: 11px;
  font-style: normal;
}
.attention-card ul {
  margin: 12px 0 0;
  padding-left: 16px;
  color: #4f5965;
  font-size: 12px;
  line-height: 1.5;
}
.attention-card li { margin-bottom: 10px; }
.preview-card h3,
.tiktok-form-section h3 {
  margin: 0 0 16px;
  color: #202124;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0;
}
.preview-card h3 span { color: #8a8f99; font-size: 12px; }
.preview-tabs {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #6b7280;
  font-size: 12px;
}
.preview-tabs strong { color: #30343b; margin-right: auto; }
.phone-preview-list {
  max-height: 760px;
  overflow: hidden;
  padding-right: 2px;
}
.phone-preview-item {
  padding-bottom: 18px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eef0f2;
}
.mini-certificate {
  position: relative;
  height: 155px;
  padding-top: 24px;
  background: #fff;
  border: 1px solid #eef0f2;
  color: #111;
  font-size: 7px;
  text-align: center;
}
.mini-bag {
  width: 46px;
  height: 32px;
  margin: 30px auto 0;
  border-radius: 2px;
  background: linear-gradient(135deg, #c54b3c, #7d2722);
}
.mini-code {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 18px;
  height: 18px;
  background: repeating-linear-gradient(90deg, #333 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, #333 0 1px, transparent 1px 3px);
  opacity: 0.5;
}
.phone-preview-item p {
  margin: 8px 0 4px;
  color: #202124;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
}
.phone-preview-item small { color: #6b7280; font-size: 10px; }
.preview-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid #eef0f2;
}
.tiktok-main-form { min-width: 0; }
.tiktok-form-section {
  margin-bottom: 14px;
  padding: 22px 24px;
}
.tiktok-required-label,
.tiktok-field-title,
.tiktok-label-row label {
  display: block;
  margin: 12px 0 6px;
  color: #30343b;
  font-size: 12px;
  font-weight: 700;
}
.tiktok-required-label::before { content: '* '; color: #ff3b30; }
.tiktok-tip,
.tiktok-warning {
  color: #9a6a00;
  font-size: 12px;
  line-height: 1.45;
}
.tiktok-tip { color: #6b7280; margin-bottom: 8px; }
.tiktok-warning { margin-top: 6px; }
.tiktok-image-grid {
  display: grid;
  grid-template-columns: 210px repeat(4, minmax(96px, 1fr));
  gap: 12px;
  align-items: stretch;
  margin-top: 8px;
}
.tiktok-main-image { position: relative; }
.tiktok-cert-card {
  width: 100%;
  height: 180px;
  padding: 18px 14px;
}
.tiktok-cert-card .photo-bag-thumb { width: 62px; height: 44px; }
.tiktok-cert-card .photo-doc-lines { left: 92px; top: 72px; width: 76px; }
.main-image-ribbon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 22px;
  color: #fff;
  background: rgba(0, 0, 0, 0.58);
  font-size: 11px;
  line-height: 22px;
  text-align: center;
}
.tiktok-upload-box,
.tiktok-image-slot,
.video-upload-box {
  border: 1px dashed #d9dde5;
  border-radius: 4px;
  background: #fafafa;
  color: #444;
  font-size: 12px;
}
.tiktok-upload-box { min-height: 180px; }
.tiktok-upload-box span {
  display: block;
  margin-bottom: 8px;
  font-size: 24px;
}
.tiktok-image-slot { min-height: 86px; background: #f7f7f7; }
.tiktok-image-slot span {
  display: block;
  width: 42px;
  height: 34px;
  margin: auto;
  border: 2px solid #d8dbe2;
  transform: skewY(-8deg);
  opacity: 0.55;
}
.tiktok-field-block { margin-top: 14px; }
.tiktok-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tiktok-attributes-panel {
  margin-top: 8px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
}
.attribute-group-title {
  margin-bottom: 12px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}
.optional-title { margin-top: 18px; }
.tiktok-attribute-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.tiktok-attribute-grid label,
.tiktok-stock-grid label {
  display: block;
  margin-bottom: 5px;
  color: #5f6570;
  font-size: 11px;
  font-weight: 600;
}
.hide-optional {
  margin-top: 16px;
  color: #6b7280;
  font-size: 12px;
  text-align: center;
}
.seller-editor { margin-bottom: 14px; }
.video-upload-box {
  width: 96px;
  height: 82px;
  margin-top: 6px;
}
.tiktok-toggle-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0;
}
.tiktok-toggle-line strong,
.stock-table-head strong,
.compliance-row strong,
.coa-note strong,
.shipping-fee {
  color: #30343b;
  font-size: 12px;
  font-weight: 700;
}
.tiktok-toggle-line p,
.coa-note p {
  margin: 4px 0 0;
  color: #7a808a;
  font-size: 12px;
  line-height: 1.4;
}
.stock-table-head {
  display: flex;
  gap: 8px;
  margin-top: 18px;
  color: #7a808a;
  font-size: 12px;
}
.stock-toolbar {
  display: grid;
  grid-template-columns: 260px;
  gap: 8px;
  margin: 8px 0 10px;
}
.tiktok-stock-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  background: #f6f7f9;
  border: 1px solid #eef0f2;
}
.compliance-row {
  display: grid;
  grid-template-columns: 260px 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.coa-note {
  margin-top: 14px;
  color: #30343b;
}
.dimension-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 8px;
  margin-bottom: 14px;
}
.dimension-row.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.dimension-label-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 2px 0 6px;
  color: #606266;
  font-size: 12px;
  font-weight: 600;
}
.shipping-fee { margin: 6px 0 12px; }
.tiktok-save-mode {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}
.tiktok-save-mode label { color: #30343b; font-size: 12px; font-weight: 700; }
/* TikTok keeps the existing internal card style. */
.platform-section {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 14px;
  overflow: hidden;
}
.platform-section.tiktok { border-left: 4px solid #F56C6C; }
.section-header {
  font-size: 14px;
  font-weight: 600;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tiktok .section-header { background: #fef0f0; color: #F56C6C; }
.section-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.tiktok .section-num { background: #F56C6C; color: #fff; }
.section-body { padding: 12px 16px 16px; }

@media (max-width: 900px) {
  .ebay-listing-builder { max-width: 100%; }
  .photo-panel,
  .category-summary,
  .two-col,
  .three-col,
  .four-col,
  .five-col,
  .specific-grid,
  .policy-card-list,
  .promo-options { grid-template-columns: 1fr; }
  .photo-slots { grid-template-columns: repeat(3, minmax(70px, 1fr)); }
}

.unit-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.unit-row.compact {
  justify-content: flex-end;
  margin: 8px 0 12px;
}
.unit-hint {
  color: #6b7280;
  font-size: 12px;
}
.unit-input-row {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
}
.unit-select {
  width: 100%;
}
.with-unit-suffix :deep(.el-input-number) .el-input__wrapper::after {
  content: v-bind(dimensionUnitShort);
  color: #606266;
  font-size: 12px;
  padding-left: 6px;
}
</style>










