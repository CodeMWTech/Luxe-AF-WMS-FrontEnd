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
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="min(1180px, 94vw)" :close-on-click-modal="false" destroy-on-close top="20px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="template-dialog-body">

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
            <el-select v-model="form.shopId" filterable style="width:100%" :placeholder="t('platformListings.templateSelectShop')" :disabled="dialog.isEdit" @change="onShopChange">
              <el-option v-for="s in filteredShopList" :key="s.id" :label="s.shopName + ' (' + s.platform + ')'" :value="s.id" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <div class="field-label">&nbsp;</div>
            <el-switch v-model="form.enabled" :active-text="t('platformListings.templateEnabled')" :inactive-text="t('platformListings.templateDisabled')" style="margin-top:8px" />
          </el-col>
        </el-row>

        <!-- 模板参数替换面板 -->
        <div class="template-params-panel">
          <span class="template-params-label">{{ t('platformListings.availableParams') }}:</span>
          <el-tag
            v-for="param in templateParams"
            :key="param.placeholder"
            type="info"
            effect="plain"
            class="template-param-tag"
            @mousedown.prevent="preserveActiveSelection"
            @click="insertParam(param.placeholder)"
          >
            {{ param.label }}
          </el-tag>
        </div>

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
              <el-input ref="titleInputRef" v-model="form.defaultTitle" maxlength="80" show-word-limit placeholder="{brandEn} {itemName} {material} {year} {skuCode}" @focus="handleTextFocus('title', $event)" @click="rememberTextSelection('title', $event)" @keyup="rememberTextSelection('title', $event)" @select="rememberTextSelection('title', $event)" @blur="rememberTextSelection('title', $event)" />
              <div class="ebay-field-row two-col compact-row">
                <div>
                  <label class="ebay-field-label">{{ t('platformListings.ebaySubtitle') }}</label>
                  <el-input ref="subtitleInputRef" v-model="form.ebaySubtitle" maxlength="55" show-word-limit :placeholder="t('platformListings.ebaySubtitlePlaceholder')" @focus="handleTextFocus('subtitle', $event)" @click="rememberTextSelection('subtitle', $event)" @keyup="rememberTextSelection('subtitle', $event)" @select="rememberTextSelection('subtitle', $event)" @blur="rememberTextSelection('subtitle', $event)" />
                </div>
              </div>
            </section>

            <section class="ebay-section">
              <div class="ebay-section-title-row">
                <h3>{{ t('platformListings.ebayItemCategory') }}</h3>
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
                    @change="onEbayCategoryChange"
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
                <div><label class="ebay-field-label">{{ t('platformListings.conditionDescription') }}</label><el-input v-model="form.ebayConditionDescription" /></div>
              </div>
            </section>

            <section class="ebay-section description-section">
              <div class="ebay-section-title-row"><h3>{{ t('platformListings.ebayDescription') }}</h3></div>
              <div class="description-toolbar-label">{{ t('platformListings.ebayDescriptionToolbar') }}</div>
              <div class="ebay-rich-editor" @focusin="lastFocusedField = 'description'"><Editor ref="descriptionEditorRef" v-model="form.descriptionFormat" :height="260" :min-height="220" /></div>
              <div class="ebay-note">{{ t('platformListings.ebayDescriptionNote') }}</div>
            </section>

            <section class="ebay-section pricing-section">
              <div class="ebay-section-title-row"><h3>{{ t('platformListings.pricing') }}</h3></div>
              <el-alert v-if="form.listingType === 'AUCTION'" class="auction-rule-alert" :title="t('platformListings.auctionPricingRules')" type="warning" show-icon :closable="false" />
              <div class="ebay-field-row three-col compact-row">
                <div><label class="ebay-field-label">{{ t('platformListings.format') }}</label><el-select v-model="form.listingType" style="width:100%"><el-option label="Buy It Now" value="FIXED_PRICE" /><el-option label="Auction" value="AUCTION" /></el-select></div>
                <div><label class="ebay-field-label">{{ form.listingType === 'AUCTION' ? t('platformListings.startPrice') : t('platformListings.buyItNowPrice') }}</label><div style="display:flex;align-items:center;gap:6px"><el-input-number v-model="form.defaultPrice" :precision="2" :step="10" :placeholder="t('platformListings.priceDefaultHint')" style="flex:1" /><el-button v-if="form.defaultPrice != null" link type="warning" size="small" @click="form.defaultPrice = null">{{ t('platformListings.priceResetDefault') }}</el-button></div><div class="field-hint">{{ t('platformListings.priceDefaultHint') }}</div></div>
                <div><label class="ebay-field-label">{{ t('platformListings.quantity') }}</label><el-input-number v-model="form.ebayQuantity" :min="1" :max="1" disabled style="width:100%" /></div>
              </div>
              <div class="ebay-field-row three-col compact-row" v-if="form.listingType === 'AUCTION'">
                <div><label class="ebay-field-label">{{ t('platformListings.duration') }}</label><el-select v-model="form.listingDuration" style="width:100%"><el-option label="3 Days" value="Days_3" /><el-option label="5 Days" value="Days_5" /><el-option label="7 Days" value="Days_7" /><el-option label="10 Days" value="Days_10" /></el-select></div>
                <div>
                  <label class="ebay-field-label" :class="{ required: isAuctionImmediatePayment }">{{ t('platformListings.buyItNowPrice') }}</label>
                  <el-input-number v-model="form.buyItNowPrice" :min="0" :precision="2" style="width:100%" />
                  <div v-if="isAuctionBuyItNowPriceTooLow" class="field-hint required-hint">{{ t('platformListings.auctionBuyItNowTooLow', { price: formattedAuctionMinimumPrice, startPrice: formattedAuctionStartPrice }) }}</div>
                  <div v-else-if="auctionMinimumBuyItNowPrice != null" class="field-hint">{{ t('platformListings.auctionBuyItNowMinimumHint', { price: formattedAuctionMinimumPrice, startPrice: formattedAuctionStartPrice }) }}</div>
                  <div v-if="isAuctionImmediatePayment" class="field-hint required-hint">{{ t('platformListings.auctionImmediatePaymentBuyItNowRequired') }}</div>
                </div>
                <div><label class="ebay-field-label">{{ t('platformListings.currency') }}</label><el-select v-model="form.ebayCurrency" style="width:100%"><el-option label="USD" value="USD" /><el-option label="GBP" value="GBP" /><el-option label="EUR" value="EUR" /><el-option label="AUD" value="AUD" /></el-select></div>
              </div>
              <el-switch v-model="form.ebayBestOfferEnabled" :active-text="t('platformListings.bestOffer')" :inactive-text="t('platformListings.bestOfferOff')" />
            </section>

            <section class="ebay-section shipping-section">
              <h3>{{ t('platformListings.shipping') }}</h3>
              <div class="policy-card-list">
                <div class="policy-card"><div class="policy-title">{{ t('platformListings.domesticShipping') }}</div><el-form-item prop="ebayFulfillmentPolicyId" class="template-required-form-item"><el-select v-model="form.ebayFulfillmentPolicyId" :placeholder="t('platformListings.selectShippingPolicy')" clearable filterable style="width:100%"><el-option v-for="p in fulfillmentPolicies" :key="p.id" :label="p.name" :value="p.id" /></el-select></el-form-item></div>
                <div class="policy-card"><div class="policy-title">{{ t('platformListings.returnPolicy') }}</div><el-form-item prop="ebayReturnPolicyId" class="template-required-form-item"><el-select v-model="form.ebayReturnPolicyId" :placeholder="t('platformListings.selectReturnPolicy')" clearable filterable style="width:100%"><el-option v-for="p in returnPolicies" :key="p.id" :label="p.name" :value="p.id" /></el-select></el-form-item></div>
                <div class="policy-card"><div class="policy-title">{{ t('platformListings.paymentPolicy') }}</div><el-form-item prop="ebayPaymentPolicyId" class="template-required-form-item"><el-select v-model="form.ebayPaymentPolicyId" :placeholder="t('platformListings.selectPaymentPolicy')" clearable filterable style="width:100%"><el-option v-for="p in paymentPolicies" :key="p.id" :label="p.name" :value="p.id" /></el-select></el-form-item></div>
              </div>
              <el-button size="small" type="primary" plain icon="Download" @click="loadEbayPolicies" :loading="loadingPolicies">{{ t('platformListings.loadEbayPolicies') }}</el-button>
              <div class="ebay-field-row four-col compact-row shipping-metrics">
                <div><el-form-item prop="packageLength" class="template-required-form-item" :label="t('platformListings.length') + ' (' + dimensionUnitShort + ')'"><el-input-number v-model="form.packageLength" :min="0" :precision="1" style="width:100%" /></el-form-item></div>
                <div><el-form-item prop="packageWidth" class="template-required-form-item" :label="t('platformListings.width') + ' (' + dimensionUnitShort + ')'"><el-input-number v-model="form.packageWidth" :min="0" :precision="1" style="width:100%" /></el-form-item></div>
                <div><el-form-item prop="packageHeight" class="template-required-form-item" :label="t('platformListings.height') + ' (' + dimensionUnitShort + ')'"><el-input-number v-model="form.packageHeight" :min="0" :precision="1" style="width:100%" /></el-form-item></div>
                <div><el-form-item prop="packageWeightValue" class="template-required-form-item" :label="t('platformListings.weight') + ' (' + weightUnitShort + ')'"><el-input-number v-model="form.packageWeightValue" :min="0" :precision="weightPrecision" :step="weightStep" style="width:100%" /></el-form-item></div>
              </div>
              <div class="unit-row">
                <el-select v-model="form.packageWeightUnit" style="width:190px"><el-option v-for="u in weightUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
                <el-select v-model="form.packageDimensionUnit" style="width:190px"><el-option v-for="u in dimensionUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
              </div>
              <div class="ebay-note shipping-hint">{{ t('platformListings.packageSizeHint') }} &nbsp;|&nbsp; {{ t('platformListings.packageWeightHint') }}</div>
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
                    <el-input ref="titleInputRef" v-model="form.defaultTitle" maxlength="255" show-word-limit :placeholder="t('platformListings.productNamePlaceholder')" @focus="handleTextFocus('title', $event)" @click="rememberTextSelection('title', $event)" @keyup="rememberTextSelection('title', $event)" @select="rememberTextSelection('title', $event)" @blur="rememberTextSelection('title', $event)" />
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
                      @change="onTiktokCategoryChange"
                    />
                  </div>

                  <div v-if="showTiktokBrandField" class="tiktok-field-block">
                    <label class="tiktok-required-label">{{ t('platformListings.brand') }}</label>
                    <el-input v-model="form.tiktokBrandId" :placeholder="t('platformListings.tiktokBrandPlaceholder')" disabled />
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

                  <div class="tiktok-field-block">
                    <label>{{ t('platformListings.fabrication') }}</label>
                    <el-input v-model="form.tiktokFabrication" maxlength="100" />
                    <div class="tiktok-tip">{{ t('platformListings.tiktokCategoryAttributeHint') }}</div>
                  </div>

                  <div class="tiktok-field-block">
                    <label>{{ t('platformListings.conditionDescription') }}</label>
                    <el-input v-model="form.tiktokConditionDescription" maxlength="500" />
                    <div class="tiktok-tip">{{ t('platformListings.tiktokCategoryAttributeHint') }}</div>
                  </div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.productDetails') }}</h3>
                  <label class="tiktok-required-label">{{ t('platformListings.ebayDescription') }}</label>
                  <div class="tiktok-rich-editor seller-editor" @focusin="lastFocusedField = 'description'"><Editor ref="descriptionEditorRef" v-model="form.descriptionFormat" :height="280" :min-height="240" /></div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.salesInformation') }}</h3>
                  <div class="tiktok-field-block">
                    <label class="tiktok-required-label">{{ t('platformListings.format') }}</label>
                    <el-radio-group v-model="form.listingType">
                      <el-radio-button label="FIXED_PRICE">{{ t('platformListings.tiktokFixedPrice') }}</el-radio-button>
                      <el-radio-button label="AUCTION">{{ t('platformListings.tiktokAuction') }}</el-radio-button>
                    </el-radio-group>
                    <div v-if="form.listingType === 'AUCTION'" class="tiktok-tip auction-mode-tip">
                      {{ t('platformListings.tiktokAuctionEligibilityHint') }}
                    </div>
                  </div>
                  <div class="stock-toolbar editable-stock-toolbar">
                    <el-form-item prop="tiktokWarehouseId" class="template-required-form-item">
                      <el-select v-model="form.tiktokWarehouseId" :placeholder="t('platformListings.warehousePlaceholder')" clearable filterable :disabled="!form.shopId" :loading="warehouseLoading" style="width:100%">
                        <el-option v-for="w in warehouseList" :key="w.id" :label="warehouseOptionLabel(w)" :value="w.id" :disabled="isReturnWarehouse(w)" />
                      </el-select>
                    </el-form-item>
                  </div>
                  <div class="tiktok-tip warehouse-warning-tip">{{ t('platformListings.returnWarehouseUnsupported') }}</div>
                  <div class="tiktok-stock-grid editable-stock-grid" :class="{ 'auction-stock-grid': form.listingType === 'AUCTION' }">
                    <div class="tiktok-stock-field"><label>{{ t('platformListings.stock') }}</label><el-input-number v-model="form.tiktokQuantity" :min="1" :max="1" disabled style="width:100%" /></div>
                    <div class="tiktok-price-field">
                      <label>{{ t('platformListings.retailPrice') }}</label>
                      <div class="tiktok-price-input-row">
                        <el-input-number v-model="form.defaultPrice" :min="TIKTOK_PRICE_MIN" :max="TIKTOK_PRICE_MAX" :precision="2" :step="10" :placeholder="t('platformListings.priceDefaultHint')" style="flex:1" />
                        <el-button v-if="form.defaultPrice != null" link type="warning" size="small" @click="form.defaultPrice = null">{{ t('platformListings.priceResetDefault') }}</el-button>
                      </div>
                      <div class="tiktok-tip">{{ t('platformListings.tiktokPriceRangeHint') + '；' + t('platformListings.priceDefaultHint') }}</div>
                    </div>
                    <div v-if="form.listingType === 'AUCTION'" class="tiktok-price-field">
                      <label class="tiktok-required-label">{{ t('platformListings.startPrice') }}</label>
                      <el-input-number v-model="form.buyItNowPrice" :min="TIKTOK_AUCTION_MIN_PRICE" :max="TIKTOK_PRICE_MAX" :precision="2" :step="10" :placeholder="t('platformListings.tiktokAuctionStartPricePlaceholder')" style="width:100%" />
                      <div class="tiktok-tip">{{ t('platformListings.tiktokAuctionStartPriceHint') }}</div>
                    </div>
                    <div class="tiktok-currency-field"><label>{{ t('platformListings.currency') }}</label><el-select v-model="form.tiktokCurrency" style="width:100%"><el-option label="USD" value="USD" /><el-option label="GBP" value="GBP" /></el-select></div>
                  </div>
                </section>

                <section class="tiktok-form-section">
                  <h3>{{ t('platformListings.shipping') }}</h3>
                  <label class="tiktok-required-label">{{ t('platformListings.packageWeight') }}</label>
                  <div class="unit-input-row">
                    <el-select v-model="form.packageWeightUnit" class="unit-select"><el-option v-for="u in weightUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
                    <el-form-item prop="packageWeightValue" class="template-required-form-item"><el-input-number v-model="form.packageWeightValue" :min="0" :precision="weightPrecision" :step="weightStep" controls-position="right" style="width:100%" /></el-form-item>
                  </div>
                  <div class="tiktok-tip">{{ t('platformListings.packageWeightHint') }}</div>
                  <label class="tiktok-required-label">{{ t('platformListings.packageDimensionsLabel') }}</label>
                  <div class="dimension-label-row">
                    <span>{{ t('platformListings.length') }}</span>
                    <span>{{ t('platformListings.width') }}</span>
                    <span>{{ t('platformListings.height') }}</span>
                  </div>
                  <div class="dimension-row three with-unit-suffix">
                    <el-form-item prop="packageLength" class="template-required-form-item"><el-input-number v-model="form.packageLength" :min="0" :precision="1" style="width:100%" /></el-form-item>
                    <el-form-item prop="packageWidth" class="template-required-form-item"><el-input-number v-model="form.packageWidth" :min="0" :precision="1" style="width:100%" /></el-form-item>
                    <el-form-item prop="packageHeight" class="template-required-form-item"><el-input-number v-model="form.packageHeight" :min="0" :precision="1" style="width:100%" /></el-form-item>
                  </div>
                  <div class="unit-row compact">
                    <span class="unit-hint">{{ t('platformListings.dimensionUnit') }}</span>
                    <el-select v-model="form.packageDimensionUnit" style="width:180px"><el-option v-for="u in dimensionUnitOptions" :key="u.value" :label="u.label" :value="u.value" /></el-select>
                  </div>
                  <div class="tiktok-tip">{{ t('platformListings.packageSizeHint') }}</div>
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
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">{{ t('platformListings.cancel') }}</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">{{ t('platformListings.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, getCurrentInstance, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { listTemplates, addTemplate, updateTemplate, delTemplate, getTemplate, getCategories, getCategoryById, getEbayPolicies, getTiktokWarehouses } from '@/api/wms/platformListing'
import { listAllPlatformShops } from '@/api/wms/platformShop'
import { insertTextAtSelection } from '@/utils/textSelection'

const { proxy } = getCurrentInstance()
const { locale } = useI18n()
const t = (key, values) => proxy?.$t?.(key, values) || key
const TIKTOK_PRICE_MIN = 0.01
const TIKTOK_AUCTION_MIN_PRICE = 1
const TIKTOK_PRICE_MAX = 50000

const loading = ref(false), total = ref(0), templateList = ref([]), submitting = ref(false)
const queryRef = ref(null), formRef = ref(null)
const ebayCategoryTree = ref([])
const tiktokCategoryTree = ref([])
const loadingPolicies = ref(false)
const fulfillmentPolicies = ref([])
const paymentPolicies = ref([])
const returnPolicies = ref([])
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
  lastFocusedField.value = 'title'
  applyPlatformUnitDefaults()
  if (form.platform === 'TIKTOK') form.listingType = 'FIXED_PRICE'
  filterShops()
  form.shopId = null
  warehouseList.value = []
  form.tiktokWarehouseId = ''
  clearEbayPolicies()
}

function clearEbayPolicies() {
  fulfillmentPolicies.value = []
  paymentPolicies.value = []
  returnPolicies.value = []
  form.ebayFulfillmentPolicyId = ''
  form.ebayPaymentPolicyId = ''
  form.ebayReturnPolicyId = ''
}

// 懒加载：根据层级获取对应类目，始终使用英文名
const ebayLeafIds = ref(new Set())
const tiktokLeafIds = ref(new Set())

function loadEbayChildren(node, resolve) {
  const parentId = node.level === 0 ? null : node.data?.dbId
  getCategories('EBAY', parentId, 'en').then(res => {
    const data = (res.data || []).map(item => {
      if (item.isLeaf) ebayLeafIds.value.add(item.id)
      return item
    })
    // 根级别只设置初始数据，编辑时的预加载数据不覆盖
    if (node.level === 0 && ebayCategoryTree.value.length === 0) {
      ebayCategoryTree.value = data
    }
    resolve(data)
  }).catch(() => resolve([]))
}

function loadTiktokChildren(node, resolve) {
  const parentId = node.level === 0 ? null : node.data?.dbId
  getCategories('TIKTOK', parentId, 'en').then(res => {
    const data = (res.data || []).map(item => {
      if (item.isLeaf) tiktokLeafIds.value.add(item.id)
      return item
    })
    // 根级别只设置初始数据，编辑时的预加载数据不覆盖
    if (node.level === 0 && tiktokCategoryTree.value.length === 0) {
      tiktokCategoryTree.value = data
    }
    resolve(data)
  }).catch(() => resolve([]))
}

const queryParams = reactive({ pageNum: 1, pageSize: 10, platform: '', templateName: '', shopId: null })

const initForm = {
  id: null, templateName: '', platform: 'EBAY', shopId: null, listingType: 'FIXED_PRICE', listingDuration: 'Days_7',
  enabled: true, defaultTitle: '', defaultPrice: null, buyItNowPrice: null,
  descriptionFormat: '',
  ebayCategoryId: '', ebayCondition: 'USED_GOOD', ebayConditionId: '3000', ebayConditionDescription: '',
  ebaySubtitle: '', ebayQuantity: 1, ebayMarketplaceId: 'EBAY_US', ebayCurrency: 'USD',
  ebayDepartment: 'Women', ebayExteriorColor: 'N/A', ebaySize: 'N/A', ebayProductLine: 'N/A', ebayCountry: 'US',
  ebayLocation: 'Los Angeles, California', ebayPostalCode: '90048', ebayDispatchTimeMax: 3,
  ebayShippingService: 'USPSParcel', ebayShippingCost: 0, ebayReturnsAccepted: false, ebayBestOfferEnabled: false, ebayPrivateListing: false,
  ebayFulfillmentPolicyId: '', ebayPaymentPolicyId: '', ebayReturnPolicyId: '',
  tiktokCategoryId: '', tiktokCategoryVersion: 'v2', tiktokSaveMode: 'LISTING', tiktokBrandId: '', tiktokConditionValue: 'Pre-owned',
  tiktokFabrication: 'leather', tiktokConditionDescription: 'great',
  tiktokWarehouseId: '', tiktokQuantity: 1, tiktokCurrency: 'USD', tiktokCodAllowed: false,
  packageWeightValue: null, packageWeightUnit: 'POUND', packageLength: null, packageWidth: null, packageHeight: null, packageDimensionUnit: 'INCH'
}
const form = reactive({ ...initForm })
const weightUnitOptions = computed(() => {
  locale.value
  return form.platform === 'TIKTOK'
    ? [
        { label: t('platformListings.unitPound'), value: 'POUND', short: 'lb' },
        { label: t('platformListings.unitOunce'), value: 'OUNCE', short: 'oz' },
        { label: t('platformListings.unitKilogram'), value: 'KILOGRAM', short: 'kg' },
        { label: t('platformListings.unitGram'), value: 'GRAM', short: 'g' }
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
        { label: t('platformListings.unitInch'), value: 'INCH', short: 'in' },
        { label: t('platformListings.unitCentimeter'), value: 'CENTIMETER', short: 'cm' }
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
    convertWeightUnit('POUND')
    form.packageDimensionUnit = 'INCH'
  } else {
    convertWeightUnit('POUND')
    form.packageDimensionUnit = 'INCH'
  }
}
// 重量单位转换系数（统一转为克作为中间单位）
const WEIGHT_TO_GRAM = { GRAM: 1, KILOGRAM: 1000, POUND: 453.59237, OUNCE: 28.349523125 }
function convertWeightUnit(targetUnit) {
  const oldUnit = form.packageWeightUnit
  if (form.packageWeightValue == null || form.packageWeightValue === '' || !oldUnit || oldUnit === targetUnit) {
    form.packageWeightUnit = targetUnit
    return
  }
  const gramValue = Number(form.packageWeightValue) * (WEIGHT_TO_GRAM[oldUnit] || 1)
  const converted = gramValue / (WEIGHT_TO_GRAM[targetUnit] || 1)
  form.packageWeightValue = ['GRAM', 'OUNCE'].includes(targetUnit) ? Math.round(converted) : Math.round(converted * 100) / 100
  form.packageWeightUnit = targetUnit
}
watch(() => form.packageWeightUnit, (newUnit, oldUnit) => {
  if (!oldUnit || oldUnit === newUnit) return
  if (form.packageWeightValue == null || form.packageWeightValue === '') return
  const gramValue = Number(form.packageWeightValue) * (WEIGHT_TO_GRAM[oldUnit] || 1)
  const converted = gramValue / (WEIGHT_TO_GRAM[newUnit] || 1)
  form.packageWeightValue = ['GRAM', 'OUNCE'].includes(newUnit) ? Math.round(converted) : Math.round(converted * 100) / 100
})
const ebayPaymentPolicyName = computed(() => {
  const selected = paymentPolicies.value.find(p => p.id === form.ebayPaymentPolicyId)
  return selected?.name || 'Immediate Payment'
})
const isAuctionImmediatePayment = computed(() => {
  if (form.platform !== 'EBAY' || form.listingType !== 'AUCTION') return false
  const selected = paymentPolicies.value.find(p => p.id === form.ebayPaymentPolicyId)
  if (!selected) return false
  if (typeof selected.immediatePay === 'boolean') return selected.immediatePay
  const policyText = [
    selected?.name,
    selected?.description,
    form.ebayPaymentPolicyId
  ].filter(Boolean).join(' ').toLowerCase()
  return !/\bno\b/.test(policyText)
})
const auctionStartPrice = computed(() => {
  const value = Number(form.defaultPrice)
  return Number.isFinite(value) && value > 0 ? value : null
})
const auctionMinimumBuyItNowPrice = computed(() => {
  if (form.platform !== 'EBAY' || form.listingType !== 'AUCTION' || auctionStartPrice.value == null) return null
  return Math.ceil(auctionStartPrice.value * 130) / 100
})
const isAuctionBuyItNowPriceTooLow = computed(() => {
  if (auctionMinimumBuyItNowPrice.value == null || !hasPositivePrice(form.buyItNowPrice)) return false
  return Number(form.buyItNowPrice) < auctionMinimumBuyItNowPrice.value
})
const formattedAuctionStartPrice = computed(() => (
  auctionStartPrice.value == null ? '' : auctionStartPrice.value.toFixed(2)
))
const formattedAuctionMinimumPrice = computed(() => (
  auctionMinimumBuyItNowPrice.value == null ? '' : auctionMinimumBuyItNowPrice.value.toFixed(2)
))

function isEmptyValue(value) {
  return value === null || value === undefined || value === ''
}
function validateRequiredWhen(platform, messageKey) {
  return (_rule, value, callback) => {
    if (form.platform !== platform || !isEmptyValue(value)) {
      callback()
      return
    }
    callback(new Error(t(messageKey)))
  }
}
function validatePositiveNumber(_rule, value, callback) {
  if (!isEmptyValue(value) && Number(value) > 0) {
    callback()
    return
  }
  callback(new Error(t('platformListings.requiredPositiveNumber')))
}
const rules = {
  templateName: [{ required: true, message: t('platformListings.templateNameRequired'), trigger: 'blur' }],
  platform: [{ required: true, message: t('platformListings.platformRequired'), trigger: 'change' }],
  shopId: [{ required: true, message: t('platformListings.shopRequired'), trigger: 'change' }],
  ebayFulfillmentPolicyId: [{ validator: validateRequiredWhen('EBAY', 'platformListings.selectShippingPolicy'), trigger: 'change' }],
  ebayPaymentPolicyId: [{ validator: validateRequiredWhen('EBAY', 'platformListings.selectPaymentPolicy'), trigger: 'change' }],
  ebayReturnPolicyId: [{ validator: validateRequiredWhen('EBAY', 'platformListings.selectReturnPolicy'), trigger: 'change' }],
  tiktokWarehouseId: [{ validator: validateRequiredWhen('TIKTOK', 'platformListings.warehouseRequired'), trigger: 'change' }],
  packageWeightValue: [{ validator: validatePositiveNumber, trigger: 'change' }],
  packageLength: [{ validator: validatePositiveNumber, trigger: 'change' }],
  packageWidth: [{ validator: validatePositiveNumber, trigger: 'change' }],
  packageHeight: [{ validator: validatePositiveNumber, trigger: 'change' }]
}
const dialog = reactive({ visible: false, title: '', isEdit: false })

const showTiktokBrandField = false
const shopNameMap = ref({})
const warehouseList = ref([])
const warehouseLoading = ref(false)

// 模板参数替换
const titleInputRef = ref(null)
const subtitleInputRef = ref(null)
const descriptionEditorRef = ref(null)
const lastFocusedField = ref('title')
const textSelections = reactive({
  title: { start: null, end: null },
  subtitle: { start: null, end: null }
})
const plainTextFields = {
  title: { inputRef: titleInputRef, formKey: 'defaultTitle' },
  subtitle: { inputRef: subtitleInputRef, formKey: 'ebaySubtitle' }
}
const templateParams = [
  { label: t('platformListings.paramItemName'), placeholder: '{itemName}' },
  { label: t('platformListings.paramBrand'), placeholder: '{brand}' },
  { label: t('platformListings.paramBrandEn'), placeholder: '{brandEn}' },
  { label: t('platformListings.paramMaterial'), placeholder: '{material}' },
  { label: t('platformListings.paramCategory'), placeholder: '{category}' },
  { label: t('platformListings.paramCondition'), placeholder: '{condition}' },
  { label: t('platformListings.paramYear'), placeholder: '{year}' },
  { label: t('platformListings.paramSkuCode'), placeholder: '{skuCode}' },
  { label: t('platformListings.paramSellingPrice'), placeholder: '{sellingPrice}' },
  { label: t('platformListings.paramDefect'), placeholder: '{defect}' },
  { label: t('platformListings.paramAccessories'), placeholder: '{accessories}' },
]

function getInputElement(field) {
  const inputRef = plainTextFields[field]?.inputRef
  const inputComponent = Array.isArray(inputRef?.value)
    ? inputRef.value[0]
    : inputRef?.value
  return inputComponent?.input
    || inputComponent?.$el?.querySelector?.('input, textarea')
    || null
}

function rememberTextSelection(field, event) {
  const selection = textSelections[field]
  if (!selection) return
  const inputEl = event?.target?.matches?.('input, textarea')
    ? event.target
    : getInputElement(field)
  if (!inputEl) return

  selection.start = inputEl.selectionStart
  selection.end = inputEl.selectionEnd
}

function handleTextFocus(field, event) {
  lastFocusedField.value = field
  rememberTextSelection(field, event)
}

function preserveActiveSelection() {
  if (plainTextFields[lastFocusedField.value]) {
    rememberTextSelection(lastFocusedField.value)
  }
}

function insertParam(placeholder) {
  if (lastFocusedField.value === 'description') {
    const inserted = descriptionEditorRef.value?.insertTextAtSelection?.(placeholder)
    if (!inserted) {
      form.descriptionFormat = `${form.descriptionFormat || ''}${placeholder}`
    }
    return
  }

  const fieldName = plainTextFields[lastFocusedField.value]
    ? lastFocusedField.value
    : 'title'
  const field = plainTextFields[fieldName]
  const inputEl = getInputElement(fieldName)
  const selection = textSelections[fieldName]
  const current = form[field.formKey] || ''
  const selectionStart = inputEl === document.activeElement
    ? inputEl.selectionStart
    : selection.start
  const selectionEnd = inputEl === document.activeElement
    ? inputEl.selectionEnd
    : selection.end
  const result = insertTextAtSelection(current, placeholder, selectionStart, selectionEnd)

  form[field.formKey] = result.value
  selection.start = result.cursor
  selection.end = result.cursor
  nextTick(() => {
    if (!inputEl) return
    inputEl.focus()
    inputEl.setSelectionRange(result.cursor, result.cursor)
  })
}

function onShopChange() {
  warehouseList.value = []
  form.tiktokWarehouseId = ''
  clearEbayPolicies()
  if (form.platform === 'TIKTOK') {
    loadWarehouses()
  } else if (form.platform === 'EBAY' && form.shopId) {
    loadEbayPolicies({ silent: true, refresh: true })
  }
}

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

function warehouseOptionLabel(warehouse) {
  const meta = [warehouse.type, warehouse.status].filter(Boolean).join(' / ')
  const warning = isReturnWarehouse(warehouse) ? ` - ${t('platformListings.returnWarehouseOptionDisabled')}` : ''
  return `${warehouse.name || warehouse.id} (${warehouse.id})${meta ? ' - ' + meta : ''}${warning}`
}

function isReturnWarehouse(warehouse) {
  return [warehouse?.type, warehouse?.subType].some(v => String(v || '').toUpperCase() === 'RETURN_WAREHOUSE')
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

function clearFormValidate() {
  nextTick(() => formRef.value?.clearValidate?.())
}

function handleAdd() { resetForm(); filterShops(); dialog.title = t('platformListings.templateCreateTitle'); dialog.isEdit = false; dialog.visible = true; clearFormValidate() }
function handleEdit(row) {
  resetForm(); dialog.title = t('platformListings.templateEditTitle'); dialog.isEdit = true
  getTemplate(row.id).then(res => {
    const d = res.data || {}
    Object.assign(form, {
      id: d.id, templateName: d.templateName, platform: d.platform, shopId: d.shopId,
      listingType: d.listingType || 'FIXED_PRICE', listingDuration: d.listingDuration || 'Days_7',
      enabled: d.status === 'ENABLED',
      buyItNowPrice: d.buyItNowPrice ?? (d.platform === 'TIKTOK' && d.listingType === 'AUCTION' ? d.priceMarkupValue : null),
      defaultTitle: d.titleFormat || '', defaultPrice: d.priceMarkupValue ?? null,
      descriptionFormat: d.descriptionFormat || '',
      ebayCategoryId: d.ebayCategoryId || '', ebayCondition: d.ebayCondition || 'USED_GOOD',
      ebayConditionId: d.ebayConditionId || '3000', ebayConditionDescription: d.ebayConditionDescription || '',
      ebaySubtitle: d.ebaySubtitle || '', ebayQuantity: 1, ebayMarketplaceId: d.ebayMarketplaceId || 'EBAY_US',
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
      tiktokFabrication: d.tiktokFabrication || 'leather', tiktokConditionDescription: d.tiktokConditionDescription || 'great',
      tiktokWarehouseId: d.tiktokWarehouseId || '', tiktokQuantity: 1, tiktokCurrency: d.tiktokCurrency || 'USD', tiktokCodAllowed: !!d.tiktokCodAllowed,
      packageWeightValue: d.packageWeightValue, packageWeightUnit: d.packageWeightUnit || 'POUND', packageLength: d.packageLength,
      packageWidth: d.packageWidth, packageHeight: d.packageHeight, packageDimensionUnit: d.packageDimensionUnit || 'INCH'
    })
    filterShops()
    // 预加载类目/仓库/策略列表，翻译 ID 为英文名称
    const platform = d.platform
    const catId = platform === 'EBAY' ? d.ebayCategoryId : d.tiktokCategoryId
    if (catId && platform) {
      getCategories(platform, null, 'en').then(r => {
        const items = (r.data || []).map(c => ({ ...c }))
        getCategoryById(platform, catId).then(catRes => {
          const cat = catRes.data || {}
          const label = cat.label || catId
          if (!items.find(c => c.id === catId)) {
            items.unshift({ id: catId, label, isLeaf: !!cat.isLeaf })
          }
          if (platform === 'EBAY') ebayCategoryTree.value = items
          else tiktokCategoryTree.value = items
        }).catch(() => {
          if (platform === 'EBAY') ebayCategoryTree.value = items
          else tiktokCategoryTree.value = items
        })
      }).catch(() => {})
    } else if (platform === 'EBAY') {
      getCategories('EBAY', null, 'en').then(r => {
        ebayCategoryTree.value = r.data || []
      }).catch(() => {})
    }
    // TikTok：加载仓库列表让 select 显示仓库名而非 ID
    if (platform === 'TIKTOK' && d.shopId) {
      getTiktokWarehouses(d.shopId).then(res => {
        warehouseList.value = res.data || []
      }).catch(() => {})
    }
    // eBay：加载策略列表让 select 显示策略名而非 ID
    if (platform === 'EBAY' && d.shopId) {
      getEbayPolicies(d.shopId).then(res => {
        const data = res.data || {}
        fulfillmentPolicies.value = data.fulfillmentPolicies || []
        paymentPolicies.value = data.paymentPolicies || []
        returnPolicies.value = data.returnPolicies || []
      }).catch(() => {})
    }
  })
  dialog.visible = true
  clearFormValidate()
}

function submitForm() {
  if (!formRef.value) {
    submitValidatedForm()
    return
  }
  formRef.value.validate((valid) => {
    if (!valid) return
    submitValidatedForm()
  })
}

function submitValidatedForm() {
  if (!form.templateName) { proxy.$modal.msgWarning(t('platformListings.templateNameRequired')); return }
  if (!form.platform) { proxy.$modal.msgWarning(t('platformListings.platformRequired')); return }
  if (!form.shopId) { proxy.$modal.msgWarning(t('platformListings.shopRequired')); return }

  // 收集缺失的关键信息
  const isEbay = form.platform === 'EBAY'
  if (!isEbay && isTiktokRetailPriceInvalid()) {
    proxy.$modal.msgWarning(t('platformListings.tiktokPriceRangeHint'))
    return
  }
  if (!isEbay && isTiktokAuctionStartPriceInvalid()) {
    proxy.$modal.msgWarning(t('platformListings.tiktokAuctionStartPriceInvalid'))
    return
  }
  if (isAuctionImmediatePayment.value && !hasPositivePrice(form.buyItNowPrice)) {
    proxy.$modal.msgWarning(t('platformListings.auctionImmediatePaymentBuyItNowRequired'))
    return
  }
  if (isAuctionBuyItNowPriceTooLow.value) {
    proxy.$modal.msgWarning(t('platformListings.auctionBuyItNowTooLow', { price: formattedAuctionMinimumPrice.value, startPrice: formattedAuctionStartPrice.value }))
    return
  }
  const missing = []
  if (!form.packageLength || !form.packageWidth || !form.packageHeight) {
    missing.push(t('platformListings.packageDimensionsLabel'))
  }
  if (form.packageWeightValue == null) {
    missing.push(t('platformListings.packageWeight'))
  }
  if (isEbay && !form.ebayCategoryId) {
    missing.push(t('platformListings.ebayItemCategory'))
  }
  if (!isEbay && !form.tiktokCategoryId) {
    missing.push(t('platformListings.category'))
  }
  if (!form.descriptionFormat) {
    missing.push(t('platformListings.ebayDescription'))
  }

  if (missing.length > 0) {
    proxy.$modal.confirm(
      t('platformListings.missingFieldsHint', { fields: missing.join('、') }),
      t('platformListings.warningTitle'),
      { type: 'warning', confirmButtonText: t('platformListings.continueAnyway'), cancelButtonText: t('platformListings.goBackToFill') }
    ).then(() => {
      doSubmit(isEbay)
    }).catch(() => {})
    return
  }

  doSubmit(isEbay)
}

function isTiktokRetailPriceInvalid() {
  if (form.defaultPrice == null || form.defaultPrice === '') return false
  const price = Number(form.defaultPrice)
  return !Number.isFinite(price) || price < TIKTOK_PRICE_MIN || price > TIKTOK_PRICE_MAX
}

function isTiktokAuctionStartPriceInvalid() {
  if (form.listingType !== 'AUCTION') return false
  if (form.buyItNowPrice == null || form.buyItNowPrice === '') return true
  const price = Number(form.buyItNowPrice)
  return !Number.isFinite(price) || price < TIKTOK_AUCTION_MIN_PRICE || price > TIKTOK_PRICE_MAX
}

function hasPositivePrice(value) {
  const price = Number(value)
  return Number.isFinite(price) && price > 0
}

function optionalNumber(value) {
  return value === '' || value == null ? null : value
}

function doSubmit(isEbay) {
  if (!validateLeafCategory()) return
  submitting.value = true
  const data = {
    id: form.id, templateName: form.templateName, platform: form.platform,
    shopId: form.shopId, listingType: form.listingType, listingDuration: form.listingDuration,
    // buyItNowPrice：eBay=一口价，TikTok 拍卖=起拍价
    status: form.enabled ? 'ENABLED' : 'DISABLED', buyItNowPrice: optionalNumber(form.buyItNowPrice),
    titleFormat: form.defaultTitle,          // 复用此字段存标题
    priceSource: 'CUSTOM',                   // 始终自定义价格
    priceMarkupValue: optionalNumber(form.defaultPrice),     // TikTok 始终为 Retail price
    priceMarkupType: 'FIXED',
    descriptionFormat: form.descriptionFormat || null,
    ebayCategoryId: form.ebayCategoryId || null, ebayCondition: form.ebayCondition || null,
    ebayConditionId: form.ebayConditionId || null, ebayConditionDescription: form.ebayConditionDescription || null, ebaySubtitle: form.ebaySubtitle || null,
    ebayQuantity: 1, ebayMarketplaceId: form.ebayMarketplaceId || null, ebayCurrency: form.ebayCurrency || null,
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
    tiktokFabrication: form.tiktokFabrication || 'leather', tiktokConditionDescription: form.tiktokConditionDescription || 'great',
    tiktokWarehouseId: form.tiktokWarehouseId || null, tiktokQuantity: 1, tiktokCurrency: form.tiktokCurrency || null, tiktokCodAllowed: form.tiktokCodAllowed,
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

function loadEbayPolicies(options = {}) {
  const silent = !!options.silent
  const refresh = !!options.refresh
  if (!form.shopId) {
    fulfillmentPolicies.value = []
    paymentPolicies.value = []
    returnPolicies.value = []
    return
  }
  loadingPolicies.value = true
  getEbayPolicies(form.shopId, refresh).then(res => {
    const data = res.data || {}
    fulfillmentPolicies.value = data.fulfillmentPolicies || []
    paymentPolicies.value = data.paymentPolicies || []
    returnPolicies.value = data.returnPolicies || []
    const total = fulfillmentPolicies.value.length + paymentPolicies.value.length + returnPolicies.value.length
    if (!silent) {
      proxy.$modal.msgSuccess(t('platformListings.policiesLoaded', { count: total }))
    }
  }).catch(() => {
    if (!silent) {
      proxy.$modal.msgError(t('platformListings.policiesLoadFailed'))
    }
  }).finally(() => {
    loadingPolicies.value = false
  })
}

function onEbayCategoryChange(val) {
  if (val && ebayLeafIds.value.size > 0 && !ebayLeafIds.value.has(val)) {
    proxy.$modal.msgWarning(t('platformListings.mustSelectLeafCategory'))
    form.ebayCategoryId = ''
  }
}
function onTiktokCategoryChange(val) {
  if (val && tiktokLeafIds.value.size > 0 && !tiktokLeafIds.value.has(val)) {
    proxy.$modal.msgWarning(t('platformListings.mustSelectLeafCategory'))
    form.tiktokCategoryId = ''
  }
}

function validateLeafCategory() {
  const isEbay = form.platform === 'EBAY'
  const leafIds = isEbay ? ebayLeafIds.value : tiktokLeafIds.value
  const catId = isEbay ? form.ebayCategoryId : form.tiktokCategoryId
  if (catId && leafIds.size > 0 && !leafIds.has(catId)) {
    proxy.$modal.msgWarning(t('platformListings.mustSelectLeafCategory'))
    return false
  }
  return true
}

onMounted(() => { loadShops(); getList() })
</script>

<style scoped>
.listing-templates .filter-card { margin-bottom: 0; }
.template-dialog-body {
  max-height: 72vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 6px 4px 0;
  background: #fff;
}

.template-params-panel {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  margin: 0 -6px 14px 0;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.template-params-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary, #909399);
  margin-right: 4px;
  white-space: nowrap;
}

.template-param-tag {
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
}

.template-param-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.field-label { font-size: 13px; font-weight: 500; color: #303133; margin-bottom: 4px; margin-top: 4px; }
.field-label.required::after { content: ' *'; color: #F56C6C; }
.field-hint { font-size: 12px; color: #909399; margin-top: 2px; }
.ebay-field-label.required::after { content: ' *'; color: #F56C6C; }
.required-hint { color: #F56C6C; }
.token-row { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; align-items: center; }
.template-required-form-item {
  width: 100%;
  margin-bottom: 0;
}
.template-required-form-item :deep(.el-form-item__content) {
  width: 100%;
}

.auction-rule-alert { margin-bottom: 14px; }
.auction-rule-alert :deep(.el-alert__title) { line-height: 1.5; }
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
.warehouse-warning-tip { color: #b45309; margin-top: -2px; }
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
.tiktok-stock-grid > div > label {
  min-height: 18px;
  margin: 0 0 5px;
  line-height: 18px;
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
  align-items: start;
  gap: 8px;
  padding: 10px;
  background: #f6f7f9;
  border: 1px solid #eef0f2;
}
.tiktok-stock-grid.auction-stock-grid {
  grid-template-columns:
    minmax(120px, 0.7fr)
    minmax(220px, 1.25fr)
    minmax(220px, 1.25fr)
    minmax(120px, 0.7fr);
  gap: 12px;
}
.tiktok-stock-grid > div { min-width: 0; }
.tiktok-price-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
:deep(.tiktok-price-input-row .el-input-number) {
  width: 100%;
  min-width: 0;
}
.tiktok-stock-grid .tiktok-tip {
  margin-top: 6px;
  margin-bottom: 0;
}
@media (max-width: 1100px) {
  .tiktok-stock-grid.auction-stock-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .tiktok-stock-grid,
  .tiktok-stock-grid.auction-stock-grid {
    grid-template-columns: minmax(0, 1fr);
  }
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
