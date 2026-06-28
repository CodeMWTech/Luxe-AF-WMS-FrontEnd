<template>
  <div class="app-container platform-orders-page">
    <el-alert
      :title="t('platformOrders.shipmentHint')"
      type="info"
      :closable="false"
      show-icon
      class="page-hint"
    />
    <el-card class="filter-card">
      <el-form
        ref="queryRef"
        :model="queryParams"
        label-width="110px"
        class="filter-form"
        @submit.prevent="handleQuery"
      >
        <el-form-item class="filter-item" :label="t('platformOrders.filterShop')" prop="shopAuthId">
          <el-select
            v-model="queryParams.shopAuthId"
            :placeholder="t('platformOrders.filterShop')"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="shop in shopList"
              :key="shop.id"
              :label="formatShopLabel(shop)"
              :value="shop.id"
            >
              <span class="shop-option">
                <el-tag :type="shop.platform === 'TIKTOK' ? 'danger' : ''" size="small" effect="plain" class="shop-option-tag">{{ shop.platform }}</el-tag>
                <span>{{ formatShopLabel(shop) }}</span>
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item" :label="t('platformOrders.filterPlatform')" prop="platform">
          <el-select
            v-model="queryParams.platform"
            :placeholder="t('platformOrders.allPlatforms')"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in platformOptions"
              :key="item.value"
              :label="typeof item.label === 'function' ? item.label() : item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item" :label="t('platformOrders.filterOrderId')" prop="platformOrderId">
          <el-input
            v-model="queryParams.platformOrderId"
            :placeholder="t('platformOrders.filterOrderIdPlaceholder')"
            clearable
            @keyup.enter.prevent="handleQuery"
          />
        </el-form-item>
        <el-form-item class="filter-item" :label="t('platformOrders.filterSku')" prop="sellerSku">
          <el-input
            v-model="queryParams.sellerSku"
            :placeholder="t('platformOrders.filterSku')"
            clearable
            @keyup.enter.prevent="handleQuery"
          />
        </el-form-item>
        <el-form-item class="filter-item" :label="t('platformOrders.filterSkuMatched')" prop="skuMatched">
          <el-select
            v-model="queryParams.skuMatched"
            :placeholder="t('platformOrders.skuMatchAll')"
            clearable
            style="width: 100%"
          >
            <el-option :label="t('platformOrders.skuMatchAll')" value="" />
            <el-option :label="t('platformOrders.skuMatchMatched')" value="MATCHED" />
            <el-option :label="t('platformOrders.skuMatchUnmatched')" value="UNMATCHED" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item" :label="t('platformOrders.filterStatus')" prop="orderStatus">
          <el-select
            v-model="queryParams.orderStatus"
            :placeholder="t('platformOrders.filterStatus')"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in orderStatusOptions"
              :key="item"
              :label="formatStatusText(item)"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item" :label="t('platformOrders.filterShipmentStatus')" prop="shipmentStatus">
          <el-select
            v-model="queryParams.shipmentStatus"
            :placeholder="t('platformOrders.shipmentStatusAll')"
            clearable
            style="width: 100%"
          >
            <el-option :label="t('platformOrders.shipmentStatusAll')" value="" />
            <el-option :label="t('platformOrders.shipmentStatusNone')" value="NONE" />
            <el-option :label="t('platformOrders.shipmentStatusPending')" value="PENDING" />
            <el-option :label="t('platformOrders.shipmentStatusFinish')" value="FINISH" />
            <el-option :label="t('platformOrders.shipmentStatusInvalid')" value="INVALID" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-item filter-item-time" :label="t('platformOrders.filterTime')" prop="orderCreateTimeRange">
          <el-date-picker
            v-model="queryParams.orderCreateTimeRange"
            type="datetimerange"
            :range-separator="t('platformOrders.to')"
            :start-placeholder="t('platformOrders.startTime')"
            :end-placeholder="t('platformOrders.endTime')"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" native-type="submit" v-hasPermi="['wms:platform:list']">{{ t('platformOrders.btnQuery') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ t('platformOrders.btnReset') }}</el-button>
          <el-button type="success" icon="RefreshRight" class="action-btn" @click="openSyncDialog" v-hasPermi="['wms:platform:sync']">{{ t('platformOrders.btnSync') }}</el-button>
          <el-button type="info" icon="Download" class="action-btn" :loading="exporting" @click="handleExport" v-hasPermi="['wms:platform:list']">{{ t('platformOrders.btnExport') }}</el-button>
          <el-button type="primary" icon="Upload" class="action-btn" @click="openImportNotesDialog" v-hasPermi="['wms:platform:edit']">{{ t('platformOrders.btnImportNotes') }}</el-button>
          <span class="auto-create-toggle">
            <el-switch
              v-model="autoCreateEnabled"
              :loading="configLoading"
              @change="handleAutoCreateToggle"
              size="small"
            />
            <span class="auto-create-label">{{ t('platformOrders.autoCreateLabel') }}</span>
          </span>
          <el-tooltip
            :content="t('platformOrders.shipmentDisabled')"
            :disabled="autoCreateEnabled"
            placement="top"
          >
            <el-button
              type="warning"
              icon="Box"
              class="action-btn"
              :loading="shipmentCreating"
              :disabled="!autoCreateEnabled"
              @click="handleCreateShipments"
              v-hasPermi="['wms:platform:edit']"
            >{{ t('platformOrders.btnCreateShipment') }}</el-button>
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <section class="orders-shell">
      <div class="orders-header">
        <div>
          <h2>{{ t('platformOrders.title') }}</h2>
          <span>{{ t('platformOrders.subtitle') }}</span>
        </div>
        <div class="platform-tags">
          <el-tag class="platform-soft-tag tiktok-tag" effect="plain">TikTok Shop</el-tag>
          <el-tag class="platform-soft-tag ebay-tag" effect="plain">eBay</el-tag>
        </div>
      </div>

      <div v-loading="loading" class="orders-list">
        <el-empty v-if="!loading && !orderList.length" :description="emptyText">
          <template v-if="total > 0" #extra>
            <el-button type="primary" @click="handleQuery">{{ t('platformOrders.goToFirstPage') }}</el-button>
          </template>
        </el-empty>

        <div class="orders-scroll">
          <article
            v-for="(order, index) in orderList"
            :key="orderKey(order, index)"
            class="order-card"
            :class="{ 'is-open': isExpanded(order, index) }"
          >
          <button class="summary-row" type="button" @click="toggleOrder(order, index)">
            <div class="summary-cell order-id-cell">
              <span class="cell-label">{{ t('platformOrders.orderId') }}</span>
              <span class="primary-value with-copy" @click.stop>
                {{ displayValue(getOrderId(order)) }}
                <el-button
                  v-if="getOrderId(order)"
                  link
                  class="copy-btn"
                  :icon="CopyDocument"
                  v-copyText="getOrderId(order)"
                  v-copyText:callback="copyTextSuccess"
                />
              </span>
            </div>

            <div class="summary-cell meta-cell">
              <span class="cell-label">{{ t('platformOrders.labelTime') }}</span>
              <span class="meta-time">{{ displayValue(getCreateTime(order)) }}</span>
              <span class="meta-shop">{{ displayValue(getShopName(order)) }} · {{ getPlatform(order) === 'TIKTOK' ? 'TikTok' : 'eBay' }}</span>
            </div>

            <div class="summary-cell platform-cell">
              <el-tag :class="['platform-soft-tag', getPlatform(order) === 'TIKTOK' ? 'tiktok-tag' : 'ebay-tag']" effect="plain">
                {{ getPlatform(order) === 'TIKTOK' ? 'TikTok Shop' : 'eBay' }}
              </el-tag>
            </div>

            <div class="summary-cell customer-cell">
              <span class="cell-label">{{ t('platformOrders.customer') }}</span>
              <span class="primary-value ellipsis">{{ displayValue(getRecipient(order).name) }}</span>
              <span class="secondary-value ellipsis">{{ displayValue(getAddressRegion(order)) }}</span>
            </div>

            <div class="summary-cell product-cell">
              <span class="cell-label">{{ t('platformOrders.product') }}</span>
              <span class="primary-value ellipsis">{{ displayValue(getFirstItem(order).productName) }}</span>
            </div>

            <div class="summary-cell sku-cell">
              <span class="cell-label">{{ t('platformOrders.sku') }}</span>
              <div class="sku-row">
                <span class="secondary-value ellipsis">{{ displayValue(getSkuText(getFirstItem(order))) }}</span>
                <el-button v-if="canEditSku(order, index)" link size="small" class="sku-edit-btn" :icon="Edit" @click.stop="startSkuEdit(order, index, getFirstItem(order))" v-hasPermi="['wms:platform:edit']">{{ t('platformOrders.labelEditSku') }}</el-button>
              </div>
            </div>

            <div class="summary-cell shipment-cell">
              <span class="cell-label">{{ t('platformOrders.labelShipment') }}</span>
              <template v-if="order.shipmentOrderId">
                <span class="primary-value shipment-order-no">{{ order.shipmentOrderNo || order.shipmentOrderId }}</span>
              </template>
              <template v-else>
                <span v-if="order.skipReason" class="skip-reason-text">{{ formatSkipReason(order.skipReason) }}</span>
                <span v-else class="no-shipment-text">-</span>
              </template>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">{{ t('platformOrders.salePrice') }}</span>
              <span class="primary-value">{{ formatMoney(getSaleAmount(order), getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">{{ t('platformOrders.cost') }}</span>
              <span class="secondary-value">{{ formatOptionalMoney(order.costPrice || order.cost, getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">{{ t('platformOrders.grossProfit') }}</span>
              <span class="secondary-value">{{ formatOptionalMoney(order.grossProfit, getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell status-cell">
              <el-tag :class="['status-tag', `status-${getStatusClass(getStatus(order), getPlatform(order))}`]" effect="plain">
                {{ formatStatusText(getStatus(order), getPlatform(order)) }}
              </el-tag>
            </div>

            <span class="expand-btn">
              <el-icon><ArrowDown v-if="isExpanded(order, index)" /><ArrowRight v-else /></el-icon>
            </span>
          </button>

          <transition name="order-expand">
            <div v-show="isExpanded(order, index)" class="detail-area">
              <div class="order-info-bar">
                <div class="order-info-item">
                  <span class="order-info-label">{{ t('platformOrders.orderInfoId') }}</span>
                  <span class="order-info-value">{{ displayValue(getOrderId(getDisplayOrder(order, index))) }}</span>
                </div>
                <div class="order-info-item">
                  <span class="order-info-label">{{ t('platformOrders.orderInfoCreateTime') }}</span>
                  <span class="order-info-value">{{ displayValue(getCreateTime(getDisplayOrder(order, index))) }}</span>
                </div>
                <div class="order-info-item">
                  <span class="order-info-label">{{ t('platformOrders.orderInfoPaidTime') }}</span>
                  <span class="order-info-value">{{ displayValue(getDisplayOrder(order, index).paidTime || formatUnixTime(rawField(getDisplayOrder(order, index), 'paid_time')) || formatIsoTime(rawField(getDisplayOrder(order, index), null, 'creationDate'))) }}</span>
                </div>
                <div class="order-info-item">
                  <span class="order-info-label">{{ t('platformOrders.orderInfoUpdateTime') }}</span>
                  <span class="order-info-value">{{ displayValue(getDisplayOrder(order, index).updateTime) }}</span>
                </div>
              </div>
              <div class="detail-grid">
                <section class="detail-panel">
                  <h3><el-icon><Goods /></el-icon>{{ t('platformOrders.detailProduct') }}</h3>
                  <div v-for="(item, itemIndex) in getLineItems(getDisplayOrder(order, index))" :key="item.lineItemId || item.skuId || itemIndex" class="item-block">
                    <InfoLine :label="t('platformOrders.itemLineItemId')" :value="item.lineItemId" />
                    <InfoLine :label="t('platformOrders.itemProductId')" :value="item.productId" />
                    <InfoLine :label="t('platformOrders.itemProductName')" :value="item.productName" strong />
                    <InfoLine :label="t('platformOrders.itemSkuId')" :value="item.skuId" />
                    <InfoLine :label="t('platformOrders.itemSkuName')" :value="item.skuName" />
                    <InfoLine :label="t('platformOrders.itemSellerSku')" :value="item.sellerSku" />
                    <InfoLine :label="t('platformOrders.itemQuantity')" :value="formatQuantity(item.quantity)" />
                    <InfoLine :label="t('platformOrders.itemOriginalPrice')" :value="formatMoney(item.originalPrice, item.currency || getCurrency(getDisplayOrder(order, index)))" />
                    <InfoLine :label="t('platformOrders.itemSalePrice')" :value="formatMoney(item.salePrice, item.currency || getCurrency(getDisplayOrder(order, index)))" strong />
                    <InfoLine :label="t('platformOrders.itemCurrency')" :value="item.currency || getCurrency(getDisplayOrder(order, index))" />
                    <InfoLine :label="t('platformOrders.itemTrackingNumber')" :value="item.trackingNumber" />
                    <InfoLine :label="t('platformOrders.itemPackageId')" :value="item.packageId" />
                    <InfoLine :label="t('platformOrders.itemPackageStatus')" :value="item.packageStatus" />
                    <InfoLine :label="t('platformOrders.itemPlatformDiscount')" :value="formatMoney(item.platformDiscount, item.currency || getCurrency(getDisplayOrder(order, index)))" />
                    <InfoLine :label="t('platformOrders.itemSellerDiscount')" :value="formatMoney(item.sellerDiscount, item.currency || getCurrency(getDisplayOrder(order, index)))" />
                    <InfoLine :label="t('platformOrders.itemShippingProviderId')" :value="item.shippingProvider" />
                    <InfoLine :label="t('platformOrders.itemShippingProviderName')" :value="item.shippingProviderName" />
                    <InfoLine :label="t('platformOrders.itemStatus')" :value="item.displayStatus || item.lineItemStatus || item.packageStatus" />
                    <InfoLine :label="t('platformOrders.itemTaxes')" :value="formatTaxes(item.taxes || item.itemTaxes, item.currency || getCurrency(getDisplayOrder(order, index)))" />
                  </div>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><User /></el-icon>{{ t('platformOrders.detailCustomer') }}</h3>
                  <template v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'">
                    <div class="ebay-customer-block">
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.buyerUserId') }}</span>
                        <span class="ebay-customer-value">{{ displayValue(rawField(getDisplayOrder(order, index), null, 'buyer.username')) }}</span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelName') }}</span>
                        <span class="ebay-customer-value ebay-customer-name">{{ displayValue(getRecipient(getDisplayOrder(order, index)).name) }}</span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.buyerFirstName') }}</span>
                        <span class="ebay-customer-value">{{ displayValue(rawField(getDisplayOrder(order, index), null, 'buyer.firstName')) }}</span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.buyerLastName') }}</span>
                        <span class="ebay-customer-value">{{ displayValue(rawField(getDisplayOrder(order, index), null, 'buyer.lastName')) }}</span>
                      </div>
                      <div class="ebay-customer-line" v-if="getRecipient(getDisplayOrder(order, index)).addressLine1">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelAddress') }}</span>
                        <span class="ebay-customer-value">{{ getRecipient(getDisplayOrder(order, index)).addressLine1 }}</span>
                      </div>
                      <div class="ebay-customer-line" v-if="getRecipient(getDisplayOrder(order, index)).addressLine2">
                        <span class="ebay-customer-label"></span>
                        <span class="ebay-customer-value">{{ getRecipient(getDisplayOrder(order, index)).addressLine2 }}</span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelCityStateZip') }}</span>
                        <span class="ebay-customer-value">
                          {{ formatJoin([
                            getRecipient(getDisplayOrder(order, index)).city,
                            getRecipient(getDisplayOrder(order, index)).stateOrProvince,
                            getRecipient(getDisplayOrder(order, index)).postalCode
                          ]) }}
                        </span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelCountry') }}</span>
                        <span class="ebay-customer-value">{{ formatCountry(getRecipient(getDisplayOrder(order, index)).countryCode) || 'United States' }}</span>
                      </div>
                      <div class="ebay-customer-line" v-if="getRecipient(getDisplayOrder(order, index)).phoneNumber">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelPhone') }}</span>
                        <span class="ebay-customer-value">
                          {{ formatPhone(getRecipient(getDisplayOrder(order, index)).phoneNumber, getRecipient(getDisplayOrder(order, index)).countryCode) }}
                          <el-button
                            link
                            class="copy-btn"
                            :icon="CopyDocument"
                            v-copyText="getRecipient(getDisplayOrder(order, index)).phoneNumber"
                            v-copyText:callback="copyTextSuccess"
                          />
                        </span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.buyerMessage') }}</span>
                        <span class="ebay-customer-value">{{ displayValue(rawField(getDisplayOrder(order, index), null, 'buyerCheckoutNotes')) }}</span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <InfoLine :label="t('platformOrders.buyerUserId')" :value="rawField(getDisplayOrder(order, index), 'user_id')" />
                    <InfoLine :label="t('platformOrders.buyerNickname')" :value="rawField(getDisplayOrder(order, index), 'buyer_nickname')" />
                    <InfoLine :label="t('platformOrders.labelName')" :value="getRecipient(getDisplayOrder(order, index)).name" strong />
                    <InfoLine :label="t('platformOrders.buyerFirstName')" :value="rawField(getDisplayOrder(order, index), 'recipient_address.first_name')" />
                    <InfoLine :label="t('platformOrders.buyerLastName')" :value="rawField(getDisplayOrder(order, index), 'recipient_address.last_name')" />
                    <InfoLine :label="t('platformOrders.labelPhone')">
                      <span class="inline-copy">
                        {{ displayValue(getRecipient(getDisplayOrder(order, index)).phoneNumber) }}
                        <el-button
                          v-if="getRecipient(getDisplayOrder(order, index)).phoneNumber"
                          link
                          class="copy-btn"
                          :icon="CopyDocument"
                          v-copyText="getRecipient(getDisplayOrder(order, index)).phoneNumber"
                          v-copyText:callback="copyTextSuccess"
                        />
                      </span>
                    </InfoLine>
                    <InfoLine :label="t('platformOrders.labelAddress')" :value="getRecipient(getDisplayOrder(order, index)).addressLine1 || getRecipient(getDisplayOrder(order, index)).fullAddress" />
                    <InfoLine :label="t('platformOrders.labelPostalCode')" :value="getRecipient(getDisplayOrder(order, index)).postalCode" />
                    <InfoLine :label="t('platformOrders.labelRegion')" :value="getRecipient(getDisplayOrder(order, index)).regionCode" />
                    <InfoLine :label="t('platformOrders.buyerMessage')" :value="rawField(getDisplayOrder(order, index), 'buyer_message')" />
                  </template>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><Van /></el-icon>{{ t('platformOrders.detailLogistics') }}</h3>
                  <template v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'">
                    <div class="ebay-customer-block">
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelCarrier') }}</span>
                        <span class="ebay-customer-value">{{ formatShippingService(getDisplayOrder(order, index)) }}</span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.logisticsServiceName') }}</span>
                        <span class="ebay-customer-value">{{ displayValue(rawField(getDisplayOrder(order, index), null, 'fulfillmentStartInstructions[0].shippingServiceCode')) }}</span>
                      </div>
                      <div class="ebay-customer-line" v-if="getDisplayOrder(order, index).trackingNumber">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelTracking') }}</span>
                        <span class="ebay-customer-value">
                          {{ getDisplayOrder(order, index).trackingNumber }}
                          <el-button link class="copy-btn" :icon="CopyDocument" v-copyText="getDisplayOrder(order, index).trackingNumber" v-copyText:callback="copyTextSuccess" />
                        </span>
                      </div>
                      <div class="ebay-customer-line" v-if="getRecipient(getDisplayOrder(order, index)).addressLine1">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelAddress') }}</span>
                        <span class="ebay-customer-value">{{ getRecipient(getDisplayOrder(order, index)).addressLine1 }}</span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelCityStateZip') }}</span>
                        <span class="ebay-customer-value">
                          {{ formatJoin([getRecipient(getDisplayOrder(order, index)).city, getRecipient(getDisplayOrder(order, index)).stateOrProvince, getRecipient(getDisplayOrder(order, index)).postalCode]) }}
                        </span>
                      </div>
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelCountry') }}</span>
                        <span class="ebay-customer-value">{{ formatCountry(getRecipient(getDisplayOrder(order, index)).countryCode) || 'United States' }}</span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <InfoLine :label="t('platformOrders.logisticsProvider')" :value="getDisplayOrder(order, index).shippingProvider || getDisplayOrder(order, index).shippingProviderName" />
                    <InfoLine :label="t('platformOrders.logisticsProviderId')" :value="rawField(getDisplayOrder(order, index), 'shipping_provider_id')" />
                    <InfoLine :label="t('platformOrders.logisticsServiceName')" :value="rawField(getDisplayOrder(order, index), 'delivery_option_name')" />
                    <InfoLine :label="t('platformOrders.logisticsServiceOptionId')" :value="rawField(getDisplayOrder(order, index), 'delivery_option_id')" />
                    <InfoLine :label="t('platformOrders.logisticsMethod')" :value="formatJoin([getDisplayOrder(order, index).shippingType || getDisplayOrder(order, index).shippingService, getDisplayOrder(order, index).fulfillmentType])" />
                    <InfoLine :label="t('platformOrders.labelTracking')">
                      <span class="inline-copy">
                        {{ displayValue(getDisplayOrder(order, index).trackingNumber) }}
                        <el-button v-if="getDisplayOrder(order, index).trackingNumber" link class="copy-btn" :icon="CopyDocument" v-copyText="getDisplayOrder(order, index).trackingNumber" v-copyText:callback="copyTextSuccess" />
                      </span>
                    </InfoLine>
                    <InfoLine :label="t('platformOrders.logisticsWarehouseId')" :value="getDisplayOrder(order, index).warehouseId" />
                    <InfoLine :label="t('platformOrders.logisticsPackageId')" :value="rawField(getDisplayOrder(order, index), 'packages[0].id')" />
                    <InfoLine :label="t('platformOrders.logisticsDeliverySlaTime')" :value="formatUnixTime(rawField(getDisplayOrder(order, index), 'delivery_sla_time'))" />
                    <InfoLine :label="t('platformOrders.logisticsDeliveryTime')" :value="formatUnixTime(rawField(getDisplayOrder(order, index), 'delivery_time'))" />
                    <InfoLine :label="t('platformOrders.logisticsCollectionTime')" :value="formatUnixTime(rawField(getDisplayOrder(order, index), 'collection_time'))" />
                    <InfoLine :label="t('platformOrders.logisticsShippingDueTime')" :value="formatUnixTime(rawField(getDisplayOrder(order, index), 'shipping_due_time'))" />
                    <InfoLine :label="t('platformOrders.logisticsRtsSlaTime')" :value="formatUnixTime(rawField(getDisplayOrder(order, index), 'rts_sla_time'))" />
                    <InfoLine :label="t('platformOrders.logisticsRtsTime')" :value="formatUnixTime(rawField(getDisplayOrder(order, index), 'rts_time'))" />
                    <InfoLine :label="t('platformOrders.logisticsAddress')" :value="getRecipient(getDisplayOrder(order, index)).addressDetail" />
                  </template>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><Money /></el-icon>{{ t('platformOrders.detailPayment') }}</h3>
                  <InfoLine :label="t('platformOrders.paymentCurrency')" :value="getCurrency(getDisplayOrder(order, index))" />
                  <InfoLine :label="t('platformOrders.paymentSubtotal')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).subTotal, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine :label="t('platformOrders.paymentTax')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).tax, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) !== 'TIKTOK'" :label="t('platformOrders.paymentShippingFee')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).shippingFee, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine :label="t('platformOrders.paymentTotal')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).totalAmount, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine :label="t('platformOrders.paymentPlatformDiscount')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).platformDiscount, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" :label="t('platformOrders.paymentSellerDiscount')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).sellerDiscount, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" :label="t('platformOrders.paymentProductTax')" :value="formatMoney(getPayment(getDisplayOrder(order, index)).productTax, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" :label="t('platformOrders.paymentShippingFee')" :value="formatMoney(rawField(getDisplayOrder(order, index), 'payment.original_shipping_fee'), getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" :label="t('platformOrders.paymentOriginalTotalPrice')" :value="formatMoney(rawField(getDisplayOrder(order, index), 'payment.original_total_product_price'), getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'" :label="t('platformOrders.paymentMarketplaceFee')" :value="formatMoney(getDisplayOrder(order, index).totalMarketplaceFee, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'" :label="t('platformOrders.paymentMarketplaceFeeRate')" :value="formatMarketplaceFeeRate(getDisplayOrder(order, index))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'" :label="t('platformOrders.paymentDueSeller')" :value="formatMoney(getDisplayOrder(order, index).totalDueSeller, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine :label="t('platformOrders.paymentGrossProfit')" :value="formatGrossProfit(getDisplayOrder(order, index))" />
                  <template v-for="(item, itemIndex) in getLineItems(getDisplayOrder(order, index))" :key="'pay-item-' + (item.lineItemId || item.skuId || itemIndex)">
                    <InfoLine :label="t('platformOrders.itemSubtotal')" :value="formatOptionalMoney(item.subtotal, item.currency || getCurrency(getDisplayOrder(order, index)))" />
                  </template>
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'" :label="t('platformOrders.paymentEbayNetProfit')" :value="formatEbayNetProfit(getDisplayOrder(order, index))" strong />
                </section>
              </div>

              <section class="notes-panel">
                <h3><el-icon><Memo /></el-icon>{{ t('platformOrders.detailNotes') }}</h3>
                <div class="notes-grid">
                  <div>
                    <span class="note-label">{{ t('platformOrders.remark') }}</span>
                    <p>{{ displayValue(getDisplayOrder(order, index).internalRemark || rawField(getDisplayOrder(order, index), 'buyer_message', 'buyerCheckoutNotes') || getDisplayOrder(order, index).buyerMessage) }}</p>
                  </div>
                </div>
              </section>
            </div>
          </transition>
        </article>
        </div>
      </div>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </section>

    <el-dialog v-model="syncOpen" :title="t('platformOrders.syncTitle')" width="680px" @opened="onSyncDialogOpened">
      <el-alert
        :title="t('platformOrders.syncHelp')"
        type="info"
        show-icon
        :closable="false"
        class="mb20"
      />
      <el-form ref="syncRef" :model="syncForm" :rules="syncRules" label-width="100px">
        <el-form-item :label="t('platformOrders.selectShops')">
          <div class="shop-check-group">
            <div class="shop-check-header">
              <el-checkbox
                :model-value="allShopsSelected"
                :indeterminate="isIndeterminate"
                @change="toggleAllShops"
              >
                {{ t('platformOrders.selectAll') }}              </el-checkbox>
              <span class="shop-count-text">
                <i18n-t keypath="platformOrders.selectedShopSummary" tag="span">
                  <template #selected><b>{{ syncSelectedCount }}</b></template>
                  <template #eligible><b>{{ syncEligibleCount }}</b></template>
                  <template #total>{{ syncShopList.length }}</template>
                </i18n-t>
              </span>
            </div>
            <div class="shop-check-list">
              <div
                v-for="shop in syncShopList"
                :key="shop.id"
                class="shop-check-item"
              >
                <el-checkbox
                  :model-value="selectedShopIds.includes(shop.id)"
                  @change="(val) => onCheckShop(shop.id, val)"
                >
                  <span class="shop-check-label">
                    <el-tag
                      :type="shop.platform === 'TIKTOK' ? 'danger' : ''"
                      size="small"
                      effect="dark"
                      class="platform-mini-tag"
                    >
                      {{ shop.platform }}
                    </el-tag>
                    <span>{{ shop.shopName || shop.shopId }}</span>
                    <span v-if="shop.region" class="shop-region">({{ shop.region }})</span>
                    <el-tag
                      :type="shop.authStatus === 'AUTHORIZED' ? 'success' : 'warning'"
                      size="small"
                      class="status-mini-tag"
                    >
                      {{ shop.authStatus === 'AUTHORIZED' ? t('platformOrders.authorized') : shop.authStatus }}
                    </el-tag>
                  </span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="t('platformOrders.startTime')" prop="startTime">
          <el-date-picker
            v-model="syncForm.startTime"
            type="datetime"
            :placeholder="t('platformOrders.startTimePlaceholder')"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('platformOrders.endTime')" prop="endTime">
          <el-date-picker
            v-model="syncForm.endTime"
            type="datetime"
            :placeholder="t('platformOrders.endTimePlaceholder')"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="pageSize" prop="pageSize">
          <el-input-number v-model="syncForm.pageSize" :min="1" :max="500" :step="10" controls-position="right" style="width: 180px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="syncOpen = false">{{ t('platformOrders.cancel') }}</el-button>
        <el-button type="primary" :loading="syncLoading" :disabled="!selectedShopIds.length" @click="submitSync">
          {{ t('platformOrders.syncSelectedShops') }}        </el-button>
      </template>
    </el-dialog>

    <!-- SKU 编辑弹窗 -->
    <el-dialog v-model="skuEditOpen" :title="t('platformOrders.editSkuTitle')" width="420px" @close="cancelSkuEdit">
      <el-form :model="skuEditForm" label-width="80px">
        <el-form-item :label="t('platformOrders.oldSku')">
          <el-input :model-value="skuEditForm.oldSku" disabled />
        </el-form-item>
        <el-form-item :label="t('platformOrders.newSku')">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input :model-value="skuEditForm.newSku" :placeholder="t('platformOrders.newSkuPlaceholder')" readonly style="flex: 1" />
            <el-button @click="openSkuSelect" :disabled="!skuEditForm.oldSku">{{ t('platformOrders.select') }}</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelSkuEdit">{{ t('platformOrders.cancel') }}</el-button>
        <el-button type="primary" :loading="skuSaving" :disabled="!skuEditForm.newSku" @click="saveSkuEdit">{{ t('platformOrders.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- SKU 选择抽屉 -->
    <SkuSelect
      ref="skuSelectRef"
      :model-value="skuSelectShow"
      :single-select="true"
      :selected-sku="selectedSkuForEdit"
      @handleSingleOkClick="handleSkuSelected"
      @handleCancelClick="skuSelectShow = false"
      :size="'40%'"
    />

    <!-- 导入 Note 弹窗 -->
    <el-dialog v-model="notesImportOpen" :title="t('platformOrders.importNotesTitle')" width="520px" @close="cancelImportNotes">
      <el-alert
        :title="t('platformOrders.importNotesHelp')"
        type="info"
        show-icon
        :closable="false"
        class="mb20"
      />
      <el-form label-width="130px">
        <el-form-item :label="t('platformOrders.importNotesSelectFile')">
          <el-upload
            ref="importUploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".csv"
            :on-change="handleImportFileChange"
            :on-remove="handleImportFileRemove"
            :file-list="importFileList"
          >
            <el-button type="primary" icon="FolderOpened">{{ t('platformOrders.importNotesSelectFile') }}</el-button>
            <template #tip>
              <div class="el-upload__tip">{{ t('platformOrders.importNotesFileHint') }}</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelImportNotes">{{ t('platformOrders.cancel') }}</el-button>
        <el-button type="primary" :loading="notesImportLoading" :disabled="!notesImportFile" @click="submitImportNotes">
          {{ t('platformOrders.importNotesStart') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="PlatformOrders">
import { computed, defineComponent, getCurrentInstance, h, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowRight, CopyDocument, Edit } from '@element-plus/icons-vue'
import { listPlatformOrders, getOrderStatusMap, updateOrderSku, createShipments, exportPlatformOrders, importNotes, getAutoCreateConfig, updateAutoCreateConfig } from '@/api/wms/platformOrder'
import { listAllPlatformShops, batchSyncOrders } from '@/api/wms/platformShop'
import SkuSelect from '@/views/components/SkuSelect.vue'

const InfoLine = defineComponent({
  name: 'InfoLine',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: undefined },
    strong: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () => h('div', { class: ['info-line', props.strong ? 'is-strong' : ''] }, [
      h('span', { class: 'info-label' }, props.label),
      h('span', { class: 'info-value' }, slots.default ? slots.default() : displayValue(props.value))
    ])
  }
})

const { proxy } = getCurrentInstance()
const t = (key, values) => proxy?.$t?.(key, values) || key

const orderStatusOptions = ref([])
const orderStatusMap = ref({})
const platformOptions = [
  { label: () => t('platformOrders.allPlatforms'), value: '' },
  { label: 'TikTok Shop', value: 'TIKTOK' },
  { label: 'eBay', value: 'EBAY' }
]

const defaultTime = reactive([new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)])
const loading = ref(false)
const syncLoading = ref(false)
const shipmentCreating = ref(false)
const autoCreateEnabled = ref(true)
const configLoading = ref(false)
const exporting = ref(false)
const shopLoading = ref(false)
const total = ref(0)
const orderList = ref([])
const shopList = ref([])
const expandedKeys = ref([])
const detailCache = reactive({})
const rawJsonCache = new Map()

// ==================== Raw JSON 字段提取 ====================
// 直接从 rawOrderJson 中提取文档要求的字段，没有则返回 null → 前端显示 "-"

function parseOrderJson(order) {
  const raw = order?.rawOrderJson
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    const key = (order?.orderId || order?.platformOrderId || '') + '_' + (order?.platform || '')
    if (rawJsonCache.has(key)) return rawJsonCache.get(key)
    const parsed = JSON.parse(raw)
    if (rawJsonCache.size > 200) { const first = rawJsonCache.keys().next().value; rawJsonCache.delete(first) }
    rawJsonCache.set(key, parsed)
    return parsed
  } catch { return null }
}

/** 按点号路径从对象中取值，支持数组索引如 packages[0] */
function getByPath(obj, path) {
  if (!obj || !path) return null
  const keys = path.split('.')
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return null
    const m = k.match(/^(\w+)\[(\d+)\]$/)
    if (m) { cur = cur[m[1]]?.[parseInt(m[2])] } else { cur = cur[k] }
  }
  return cur ?? null
}

/** 从订单 raw JSON 获取字段（TikTok 和 eBay 字段路径不同） */
function rawField(order, tiktokPath, ebayPath) {
  const json = parseOrderJson(order)
  if (!json) return null
  const platform = order?.platform || ''
  if (platform === 'TIKTOK' && tiktokPath) return getByPath(json, tiktokPath)
  if (platform === 'EBAY' && ebayPath) return getByPath(json, ebayPath)
  return null
}

/** 格式化 Unix 时间戳（秒） */
function formatUnixTime(seconds) {
  if (seconds == null) return null
  const ms = Number(seconds) * 1000
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toLocaleString('zh-CN', { hour12: false })
}

/** 格式化 ISO 时间字符串 */
function formatIsoTime(str) {
  if (!str) return null
  try {
    return new Date(str).toLocaleString('zh-CN', { hour12: false })
  } catch { return str }
}

const syncOpen = ref(false)
const syncShopList = ref([])
const notesImportOpen = ref(false)
const notesImportFile = ref(null)
const notesImportLoading = ref(false)
const queryRef = ref(null)
const syncRef = ref(null)

const queryParams = ref({
  pageNum: 1,
  pageSize: 10,
  platform: '',
  shopAuthId: undefined,
  platformOrderId: undefined,
  orderStatus: undefined,
  sellerSku: undefined,
  skuMatched: '',
  shipmentStatus: '',
  orderCreateTimeRange: []
})

const syncForm = ref({
  startTime: undefined,
  endTime: undefined,
  pageSize: 100
})

const selectedShopIds = ref([])

// SKU 编辑状态
const skuEditOpen = ref(false)
const skuEditOrder = ref(null)
const skuEditIndex = ref(-1)
const skuEditForm = ref({ oldSku: '', newSku: '' })
const skuSaving = ref(false)

// SKU 库选择状态
const skuSelectShow = ref(false)
const skuSelectRef = ref(null)
const selectedSkuForEdit = ref([])

const syncRules = {
  pageSize: [{ required: true, message: '请输入 pageSize', trigger: 'blur' }],
  endTime: [{ validator: validateEndTime, trigger: 'change' }]
}

const selectedShop = computed(() => shopList.value.find(item => item.id === queryParams.value.shopAuthId))
const selectedShopName = computed(() => selectedShop.value ? formatShopLabel(selectedShop.value) : '')
const emptyText = computed(() => {
  if (total.value > 0) {
    return t('platformOrders.deepPageHint')
  }
  return shopLoading.value ? t('platformOrders.noData') : t('platformOrders.noData')
})
const syncEligibleShops = computed(() => syncShopList.value.filter(s => s.authStatus === 'AUTHORIZED' && s.enabled === 1).map(s => s.id))
const syncSelectedCount = computed(() => selectedShopIds.value.length)
const syncEligibleCount = computed(() => syncEligibleShops.value.length)
const allShopsSelected = computed(() => syncEligibleCount.value > 0 && syncEligibleShops.value.every(id => selectedShopIds.value.includes(id)))
const isIndeterminate = computed(() => syncSelectedCount.value > 0 && !allShopsSelected.value)

function normalizeQuery() {
  const query = { ...queryParams.value }
  query.platformOrderId = query.platformOrderId?.trim() || undefined
  query.sellerSku = query.sellerSku?.trim() || undefined
  query.skuMatched = query.skuMatched || undefined
  query.shipmentStatus = query.shipmentStatus || undefined
  if (!query.platform) delete query.platform

  if (query.orderCreateTimeRange?.length === 2) {
    query.beginOrderCreateTime = query.orderCreateTimeRange[0]
    query.endOrderCreateTime = query.orderCreateTimeRange[1]
  }
  delete query.orderCreateTimeRange

  query.orderByColumn = 'createTime'
  query.isAsc = 'desc'
  return query
}

async function getList() {
  loading.value = true
  // 清空详情缓存，确保 canEditSku 等判断基于最新数据
  Object.keys(detailCache).forEach(k => delete detailCache[k])
  rawJsonCache.clear()
  try {
    const response = await listPlatformOrders(normalizeQuery())
    const data = response.data || {}
    orderList.value = response.rows || data.rows || data.records || (Array.isArray(data) ? data : [])
    total.value = response.total || data.total || orderList.value.length
    // 深分页保护：返回空结果但 total > 0 说明当前页码超出可展示范围，自动重置到第1页
    if (!orderList.value.length && total.value > 0 && queryParams.value.pageNum > 1) {
      proxy.$modal.msgWarning(t('platformOrders.deepPageHint'))
      queryParams.value.pageNum = 1
      await getList()
      return
    }
  } catch (e) {
    handleApiError(e)
  } finally {
    loading.value = false
  }
}

function loadShops() {
  shopLoading.value = true
  return listAllPlatformShops().then(response => {
    const data = response.data || {}
    shopList.value = response.rows || data.rows || data.records || (Array.isArray(data) ? data : [])
  }).catch(handleApiError).finally(() => {
    shopLoading.value = false
  })
}

function toggleOrder(order, index) {
  const key = orderKey(order, index)
  if (expandedKeys.value.includes(key)) {
    expandedKeys.value = expandedKeys.value.filter(item => item !== key)
    return
  }
  expandedKeys.value = [...expandedKeys.value, key]
  ensureDetail(order, index)
}

function ensureDetail(order, index) {
  // 列表数据已包含展开所需的全部字段，无需额外请求
  const key = orderKey(order, index)
  if (detailCache[key]) return
  detailCache[key] = order
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  queryParams.value.orderCreateTimeRange = []
  handleQuery()
}

function handleCreateShipments() {
  shipmentCreating.value = true
  createShipments().then(() => {
    proxy.$modal.msgSuccess(t('platformOrders.shipmentCreateSubmitted'))
    // 异步后台执行，延迟刷新列表
    setTimeout(() => { getList() }, 3000)
  }).catch(() => {
    proxy.$modal.msgError(t('platformOrders.shipmentCreateFailed'))
  }).finally(() => {
    shipmentCreating.value = false
  })
}

async function fetchAutoCreateConfig() {
  configLoading.value = true
  try {
    const response = await getAutoCreateConfig()
    const value = response?.data
    autoCreateEnabled.value = value !== 'false'
  } catch (e) {
    // 获取失败默认启用
    autoCreateEnabled.value = true
  } finally {
    configLoading.value = false
  }
}

async function handleAutoCreateToggle(value) {
  try {
    await updateAutoCreateConfig(value)
    autoCreateEnabled.value = value
    proxy.$modal.msgSuccess(value
      ? t('platformOrders.autoCreateEnabledMsg')
      : t('platformOrders.autoCreateDisabledMsg'))
  } catch (e) {
    // 失败时回滚开关状态
    autoCreateEnabled.value = !value
    proxy.$modal.msgError(t('platformOrders.autoCreateConfigFailed'))
  }
}

function handleExport() {
  proxy.$modal.confirm(t('platformOrders.exportConfirm')).then(() => {
    exporting.value = true
    const params = normalizeQuery()
    delete params.pageNum
    delete params.pageSize
    exportPlatformOrders(params).then((blob) => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `平台订单_${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)
      proxy.$modal.msgSuccess(t('platformOrders.exportSuccess'))
    }).catch(() => {
      proxy.$modal.msgError(t('platformOrders.exportFailed'))
    }).finally(() => {
      exporting.value = false
    })
  }).catch(() => {})
}

function openSyncDialog() {
  syncForm.value.startTime = undefined
  syncForm.value.endTime = undefined
  syncForm.value.pageSize = 100
  syncShopList.value = shopList.value
  selectedShopIds.value = shopList.value
    .filter(s => s.authStatus === 'AUTHORIZED' && s.enabled === 1)
    .map(s => s.id)
  syncOpen.value = true
}

function onSyncDialogOpened() {}

function onCheckShop(shopId, checked) {
  if (checked) {
    selectedShopIds.value.push(shopId)
  } else {
    const idx = selectedShopIds.value.indexOf(shopId)
    if (idx >= 0) selectedShopIds.value.splice(idx, 1)
  }
}

function toggleAllShops(checked) {
  selectedShopIds.value = checked ? [...syncEligibleShops.value] : []
}

function submitSync() {
  if (!selectedShopIds.value.length) {
    proxy.$modal.msgWarning(t('platformOrders.selectAtLeastOneShop'))
    return
  }
  syncRef.value.validate(valid => {
    if (!valid) return
    syncLoading.value = true
    const shopCount = selectedShopIds.value.length
    const data = {
      shopIds: selectedShopIds.value,
      startTime: syncForm.value.startTime || undefined,
      endTime: syncForm.value.endTime || undefined,
      pageSize: syncForm.value.pageSize
    }
    batchSyncOrders(data).then(() => {
      syncOpen.value = false
      syncLoading.value = false
      proxy.$modal.msgSuccess(t('platformOrders.syncStarted', { count: shopCount }))
      // 延迟刷新列表，给后台同步一些时间      setTimeout(() => { getList(); loadShops() }, 5000)
    }).catch(() => {
      syncLoading.value = false
      proxy.$modal.msgError(t('platformOrders.syncRequestFailed'))
    })
  })
}

function validateEndTime(rule, value, callback) {
  if (syncForm.value.startTime && value && value < syncForm.value.startTime) {
    callback(new Error(t('platformOrders.endBeforeStart')))
    return
  }
  callback()
}

function orderKey(order, index) {
  return `${getOrderId(order) || order.id || 'order'}-${order.shopAuthId || queryParams.value.shopAuthId || 'shop'}-${index}`
}

function isExpanded(order, index) {
  return expandedKeys.value.includes(orderKey(order, index))
}

function getDisplayOrder(order, index) {
  return detailCache[orderKey(order, index)] || order || {}
}

function getOrderId(order) {
  return order?.orderId || order?.platformOrderId
}

function getPlatform(order) {
  return order?.platform || ''
}

function getStatus(order) {
  return order?.status || order?.orderStatus
}

function getCreateTime(order) {
  return order?.createTime || order?.orderCreateTime
}

function getShopName(order) {
  return order?.shopName || order?.platformShopId
}

function getPayment(order) {
  // PlatformOrderVo is flattened — return the order itself as "payment"
  return order?.payment || {
    currency: order?.currency,
    totalAmount: order?.totalAmount,
    subTotal: order?.subtotal,
    shippingFee: order?.deliveryCost,
    tax: order?.tax,
    platformDiscount: order?.platformDiscount,
    sellerDiscount: order?.sellerDiscount,
    productTax: order?.productTax
  }
}

function getRecipient(order) {
  // PlatformOrderVo is flattened — build recipient-like object from flat fields
  return order?.recipientAddress || {
    name: order?.recipientName || order?.buyerName,
    phoneNumber: order?.buyerPhone,
    fullAddress: order?.fullAddress,
    addressLine1: order?.addressLine1,
    addressLine2: order?.addressLine2,
    city: order?.city,
    stateOrProvince: order?.stateOrProvince,
    postalCode: order?.postalCode,
    regionCode: order?.regionCode
  }
}

function getLineItems(order) {
  const items = order?.lineItems
  if (Array.isArray(items) && items.length) return items
  return [{
    productName: order?.productName,
    sellerSku: order?.sellerSku,
    skuId: order?.platformSkuId || order?.sku,
    quantity: order?.quantity,
    salePrice: order?.salePrice,
    displayStatus: order?.lineItemStatus,
    packageStatus: order?.packageStatus,
    itemTaxes: order?.taxes
  }]
}

function getFirstItem(order) {
  return getLineItems(order)[0] || {}
}

function getSkuText(item) {
  return item?.sellerSku || item?.skuName || item?.skuId
}

function getCurrency(order) {
  return order?.currency || getPayment(order).currency || 'USD'
}

function getSaleAmount(order) {
  const item = getFirstItem(order)
  return firstPresent(item.salePrice, order?.salePrice, getPayment(order).subTotal, order?.totalAmount)
}

function getAddressRegion(order) {
  const addr = getRecipient(order)
  return addr?.city || addr?.stateOrProvince || addr?.regionCode || addr?.fullAddress || addr?.countryCode
}

function firstPresent(...values) {
  return values.find(value => value !== null && value !== undefined && value !== '')
}

function displayValue(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

function formatJoin(values) {
  const result = values.filter(value => value !== null && value !== undefined && value !== '').join(' / ')
  return result || '-'
}

function formatQuantity(value) {
  if (value === null || value === undefined || value === '') return '1'
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.?0+$/, '')
}

function formatMoney(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '-'
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: number % 1 === 0 ? 0 : 2
    }).format(number)
  } catch {
    return `${currency || ''} ${number.toLocaleString('en-US')}`.trim()
  }
}

function formatOptionalMoney(value, currency) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return formatMoney(value, currency)
}

function formatGrossProfit(order) {
  if (order.grossProfit === null || order.grossProfit === undefined || order.grossProfit === '') return '-'
  const num = Number(order.grossProfit)
  if (!Number.isFinite(num)) return '-'
  return formatMoney(order.grossProfit, getCurrency(order))
}

/** eBay 净毛利 = 售价(totalAmount) - 平台交易费(totalMarketplaceFee) - 成本(costPrice) */
function formatEbayNetProfit(order) {
  const totalAmount = order.totalAmount
  const fee = order.totalMarketplaceFee
  const cost = order.costPrice
  // 成本未匹配（null 或 0）时显示 -
  if (totalAmount == null || cost == null) return '-'
  const ta = Number(totalAmount)
  const f = Number(fee) || 0
  const c = Number(cost)
  if (!Number.isFinite(ta) || !Number.isFinite(c) || c <= 0) return '-'
  const netProfit = ta - f - c
  return formatMoney(netProfit, getCurrency(order))
}

/** eBay 平台收费率 = 平台交易费(totalMarketplaceFee) / 售价(totalAmount) * 100% */
function formatMarketplaceFeeRate(order) {
  const fee = order.totalMarketplaceFee
  const totalAmount = order.totalAmount
  if (fee == null || totalAmount == null) return '-'
  const f = Number(fee)
  const t = Number(totalAmount)
  if (!Number.isFinite(f) || !Number.isFinite(t) || t === 0) return '-'
  return (f / t * 100).toFixed(2) + '%'
}

const COUNTRY_MAP = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
  IT: 'Italy', ES: 'Spain', CA: 'Canada', AU: 'Australia', JP: 'Japan',
  CN: 'China', KR: 'South Korea', IN: 'India', BR: 'Brazil', MX: 'Mexico'
}

const COUNTRY_PHONE_CODE = {
  US: '1', CA: '1', GB: '44', DE: '49', FR: '33', IT: '39', ES: '34',
  AU: '61', JP: '81', CN: '86', KR: '82', IN: '91', BR: '55', MX: '52',
  NL: '31', BE: '32', AT: '43', CH: '41', SE: '46', NO: '47', DK: '45',
  FI: '358', IE: '353', PT: '351', PL: '48', CZ: '420', NZ: '64',
  SG: '65', HK: '852', TW: '886', TH: '66', MY: '60', PH: '63',
  ID: '62', VN: '84', AE: '971', SA: '966', IL: '972', ZA: '27',
  RU: '7', TR: '90', AR: '54', CL: '56', CO: '57', PE: '51'
}

const SHIPPING_SERVICE_MAP = {
  US_UPSSurePost: 'UPS SurePost',
  US_UPSGround: 'UPS Ground',
  US_UPS2ndDayAir: 'UPS 2nd Day Air',
  US_UPSNextDayAir: 'UPS Next Day Air',
  US_UPS3DaySelect: 'UPS 3 Day Select',
  USPSPriority: 'USPS Priority Mail',
  USPSFirstClass: 'USPS First Class',
  USPSMedia: 'USPS Media Mail',
  FedExHomeDelivery: 'FedEx Home Delivery',
  FedExGround: 'FedEx Ground',
  FedEx2Day: 'FedEx 2Day',
  FedExStandardOvernight: 'FedEx Standard Overnight'
}

function formatCountry(code) {
  if (!code) return null
  return COUNTRY_MAP[code.toUpperCase()] || code.toUpperCase()
}

function formatShippingService(order) {
  const code = order.shippingService || order.shippingType
  const carrier = order.shippingProvider || order.shippingProviderName || order.shippingCarrierCode
  const name = code ? (SHIPPING_SERVICE_MAP[code] || code) : null
  return formatJoin([carrier, name])
}

function getPhoneCode(countryCode) {
  if (!countryCode) return '1'
  return COUNTRY_PHONE_CODE[countryCode.toUpperCase()] || '1'
}

function formatPhone(phone, countryCode) {
  if (!phone) return '-'
  const digits = String(phone).replace(/\D/g, '')
  const code = getPhoneCode(countryCode)
  const codeDigits = String(code).length
  // 去掉号码中可能包含的国家码前缀
  let local = digits
  if (digits.startsWith(code) && digits.length > codeDigits + 6) {
    local = digits.slice(codeDigits)
  }
  // 格式化为 +X XXX-XXX-XXXX (10位本地号)
  if (local.length === 10) {
    return `+${code} ${local.slice(0,3)}-${local.slice(3,6)}-${local.slice(6)}`
  }
  // 其他长度原样显示
  return `+${code} ${local}`
}

function formatTaxes(taxes, currency) {
  if (!taxes) return '-'
  if (Array.isArray(taxes)) {
    return taxes.map(item => {
      const name = item.taxType || item.name || 'Tax'
      const amount = firstPresent(item.amount, item.taxAmount, item.value)
      return `${name}: ${formatMoney(amount, currency)}`
    }).join('，') || '-'
  }
  if (typeof taxes === 'object') {
    return Object.entries(taxes).map(([key, value]) => `${key}: ${formatMoney(value, currency)}`).join('，') || '-'
  }
  return taxes
}

function formatSkipReason(reason) {
  if (!reason) return ''
  // 处理 "Order status not allowed: XXX" 格式：翻译前半部分，保留状态值
  const colonIdx = reason.indexOf(':')
  if (colonIdx > 0) {
    const key = reason.substring(0, colonIdx)
    const value = reason.substring(colonIdx + 1)
    return t(`platformOrders.skipReason['${key}']`, key) + ': ' + value
  }
  return t(`platformOrders.skipReason['${reason}']`, reason)
}

function formatStatusText(status, platform) {
  if (!status) return '-'
  return t(`platformOrders.orderStatus.${status}`, status)
}

function getStatusClass(status, platform) {
  // 成功/完成
  if (['DELIVERED', 'COMPLETED', 'FULFILLED'].includes(status)) return 'success'
  // 取消/退款/配送失败/支付失败
  if (['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY', 'PAYMENT_FAILED'].includes(status)) return 'muted'
  // 冻结/待支付
  if (['ON_HOLD', 'UNPAID'].includes(status)) return 'warning'
  // 进行中：待发货/待取件/部分发货/运输中/处理中/已付款
  if (['AWAITING_SHIPMENT', 'AWAITING_COLLECTION', 'PARTIALLY_SHIPPING', 'IN_TRANSIT', 'IN_PROGRESS', 'PAID'].includes(status)) return 'primary'
  // 未开始/其他
  if (status === 'NOT_STARTED') return 'info'
  return 'info'
}

function formatShopLabel(shop) {
  const suffix = shop.region ? ` (${shop.region})` : ''
  return `${shop.shopName || shop.shopId || shop.id}${suffix}`
}

function copyTextSuccess() {
  proxy.$modal.msgSuccess(t('platformOrders.copied'))
}

// ==================== SKU 编辑 ====================

function canEditSku(order, index) {
  const ord = getDisplayOrder(order, index)
  // 已创建出库单则不可编辑
  if (ord.shipmentOrderId) return false
  // 已取消的订单不可编辑
  const status = getStatus(ord)
  const platform = getPlatform(ord)
  if (status === 'CANCELLED') return false
  if (platform === 'EBAY' && isEbayCancelled(ord)) return false
  return true
}

function isEbayCancelled(order) {
  const raw = parseOrderJson(order)
  if (!raw) return false
  try {
    const cs = raw.cancelStatus
    return cs && cs.cancelState && cs.cancelState !== 'NONE_REQUESTED'
  } catch { return false }
}

function startSkuEdit(order, index, item) {
  skuEditOrder.value = order
  skuEditIndex.value = index
  skuEditForm.value = { oldSku: getSkuText(item) || '-', newSku: '' }
  selectedSkuForEdit.value = []
  skuEditOpen.value = true
}

function saveSkuEdit() {
  if (!skuEditForm.value.newSku.trim()) {
    proxy.$modal.msgWarning(t('platformOrders.skuRequired'))
    return
  }
  const ord = getDisplayOrder(skuEditOrder.value, skuEditIndex.value)
  const orderId = getOrderId(ord)
  const platform = getPlatform(ord)
  skuSaving.value = true
  updateOrderSku(orderId, platform, skuEditForm.value.newSku.trim()).then(() => {
    proxy.$modal.msgSuccess(t('platformOrders.skuUpdateSuccess'))
    cancelSkuEdit()
    getList()
  }).catch(() => {
    proxy.$modal.msgError(t('platformOrders.skuUpdateFailed'))
  }).finally(() => {
    skuSaving.value = false
  })
}

function openSkuSelect() {
  skuSelectShow.value = true
}

function handleSkuSelected(row) {
  skuSelectShow.value = false
  const skuCode = row?.itemSku?.skuCode || row?.skuCode || ''
  skuEditForm.value.newSku = skuCode
  selectedSkuForEdit.value = [row]
}

function cancelSkuEdit() {
  skuEditOpen.value = false
  skuEditOrder.value = null
  skuEditIndex.value = -1
  skuEditForm.value = { oldSku: '', newSku: '' }
  selectedSkuForEdit.value = []
}

// ==================== 导入 Note ====================
const importUploadRef = ref(null)
const importFileList = ref([])

function openImportNotesDialog() {
  notesImportOpen.value = true
  notesImportFile.value = null
  importFileList.value = []
}

function handleImportFileChange(uploadFile) {
  notesImportFile.value = uploadFile.raw
}

function handleImportFileRemove() {
  notesImportFile.value = null
}

function cancelImportNotes() {
  notesImportOpen.value = false
  notesImportFile.value = null
  importFileList.value = []
}

function submitImportNotes() {
  if (!notesImportFile.value) {
    proxy.$modal.msgWarning(t('platformOrders.importNotesSelectFile'))
    return
  }
  notesImportLoading.value = true
  importNotes(notesImportFile.value).then(response => {
    const data = response.data || response
    const matched = data.matched ?? 0
    const noStock = data.noStock ?? 0
    ElMessage({
      message: t('platformOrders.importNoteResult', {
        platform: data.platform || '-',
        total: data.totalRows ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        skuMatched: matched + noStock,
        noStock: noStock,
        expectShip: matched,
        unmatched: data.unmatched ?? 0,
        notFound: data.notFound ?? 0
      }),
      type: 'success',
      duration: 60000,
      showClose: true
    })
    if (data.errors && data.errors.length > 0) {
      setTimeout(() => {
        ElMessage({ message: data.errors.slice(0, 3).join('; '), type: 'warning', duration: 60000, showClose: true })
      }, 500)
    }
    if (data.unmatched > 0) {
      setTimeout(() => {
        ElMessage({
          message: t('platformOrders.importNotesUnmatchedHint', { count: data.unmatched }),
          type: 'warning',
          duration: 60000,
          showClose: true
        })
      }, 800)
    }
    cancelImportNotes()
    getList()
  }).catch(() => {
    proxy.$modal.msgError(t('platformOrders.importNotesFailed'))
  }).finally(() => {
    notesImportLoading.value = false
  })
}

function handleApiError(error) {
  const status = error?.response?.status
  const code = error?.response?.data?.code
  if (status === 401 || code === 401) {
    proxy.$modal.msgError(t('platformOrders.loginExpired'))
    return
  }
  if ([401, 403].includes(status) || [401, 403].includes(code)) {
    proxy.$modal.msgError(t('platformOrders.missingTikTokPermission'))
  }
}

function loadStatusMap() {
  getOrderStatusMap().then(response => {
    const data = response.data || response
    orderStatusMap.value = data || {}
    // 过滤下拉选项：NOT_STARTED 合并到 CANCELLED；PAID/PAYMENT_FAILED 为 eBay 计算值不可直接筛选
    orderStatusOptions.value = Object.keys(orderStatusMap.value).filter(k =>
      k !== 'NOT_STARTED' && k !== 'PAID' && k !== 'PAYMENT_FAILED'
    )
  }).catch(() => {})
}

onMounted(() => {
  loadShops()
  loadStatusMap()
  getList()
  fetchAutoCreateConfig()
})
</script>

<style lang="scss">
.platform-orders-page {
  background: transparent;
}

// ==================== Page Hint ====================
.platform-orders-page .page-hint {
  margin-bottom: 12px;
  border-radius: 8px;
}

// ==================== Filter Card ====================
.platform-orders-page .filter-card {
  border-radius: 12px;
  border: 1px solid #eaecf0;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
  margin-bottom: 12px;

  :deep(.el-card__body) {
    padding: 14px 20px 4px;
  }
}

.platform-orders-page .filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 16px;
}

.platform-orders-page .filter-item {
  width: calc(25% - 12px);
  margin-right: 0;

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #344054;
  }
}

.platform-orders-page .filter-item-time {
  width: calc(50% - 8px);
}

.platform-orders-page .filter-item-actions {
  width: 100%;
  padding-top: 4px;

  :deep(.el-form-item__content) {
    display: flex;
    gap: 8px;
  }
}

.platform-orders-page .action-btn {
  min-width: 88px;
  height: 36px;
  border-radius: 8px;
  font-weight: 500;
}

// ==================== Orders Shell ====================
.orders-shell {
  margin-top: 20px;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  h2 {
    margin: 0 0 1px;
    font-size: 20px;
    font-weight: 700;
    color: #101828;
    letter-spacing: -0.3px;
  }

  span {
    color: #667085;
    font-size: 12px;
  }
}

// ==================== Platform Tags ====================
.platform-tags {
  display: flex;
  gap: 8px;
}

.platform-soft-tag {
  font-weight: 600;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 6px;
}

.platform-soft-tag.tiktok-tag {
  color: #d12975;
  background: #fff0f7;
  border-color: #ffd1e4;
}

.platform-soft-tag.ebay-tag {
  color: #175cd3;
  background: #eff8ff;
  border-color: #d1e4ff;
}

// ==================== Order Card ====================
.orders-list {
  min-height: 160px;
}

// 横向滚动容器：小屏时订单卡片保持完整列宽，通过拖拽滚动查看
.orders-scroll {
  @media (max-width: 1440px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #c0c6d0 transparent;

    &::-webkit-scrollbar {
      height: 6px;
    }
    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: #c0c6d0;
      &:hover {
        background: #98a2b3;
      }
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }

    .order-card {
      min-width: 1400px;
      overflow: visible;
    }

    // 为防止展开详情溢出圆角，给 detail-area 单独裁剪
    .detail-area {
      overflow: hidden;
      border-radius: 0 0 10px 10px;
    }
  }
}

.order-card {
  overflow: hidden;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(16, 24, 40, 0.08);
    border-color: #d0d5dd;
  }

  &.is-open {
    border-color: #b7c0d0;
    box-shadow: 0 4px 20px rgba(16, 24, 40, 0.1);
  }
}

// ==================== Summary Row ====================
.summary-row {
  display: grid;
  grid-template-columns: minmax(150px, 1.15fr) minmax(150px, 1.1fr) 116px minmax(130px, 1fr) minmax(180px, 1.5fr) minmax(120px, 1fr) 120px 92px 82px 82px 104px 36px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 16px;
  border: 0;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f9fafb;
  }
}

.summary-cell {
  min-width: 0;
}

.cell-label {
  display: block;
  margin-bottom: 3px;
  color: #98a2b3;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

.primary-value {
  color: #101828;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.35;
}

.secondary-value {
  color: #667085;
  font-size: 13px;
  line-height: 1.35;
}

.meta-time {
  display: block;
  color: #344054;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
}

.meta-shop {
  display: block;
  color: #667085;
  font-size: 12px;
  line-height: 1.35;
}

.ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.with-copy,
.inline-copy {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 4px;
}

.copy-btn {
  min-height: 22px;
  padding: 0;
  color: #98a2b3;

  &:hover {
    color: #175cd3;
  }
}

// ==================== Shipment Order Cell ====================
.shipment-cell {
  min-width: 0;
}

.shipment-order-no {
  color: #175cd3;
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.skip-reason-text {
  color: #b54708;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.no-shipment-text {
  color: #98a2b3;
  font-size: 13px;
}

// ==================== Status Tags ====================
.status-tag {
  border: 0 !important;
  font-weight: 600;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 6px;
}

.status-success {
  color: #067647;
  background: #ecfdf3;
}

.status-muted {
  color: #667085;
  background: #f2f4f7;
}

.status-warning {
  color: #b54708;
  background: #fffaeb;
}

.status-primary {
  color: #175cd3;
  background: #eff8ff;
}

.status-info {
  color: #475467;
  background: #f8fafc;
}

// ==================== Expand Button ====================
.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: #667085;
  border-radius: 50%;
  background: #f2f4f7;
  transition: all 0.15s ease;

  &:hover {
    background: #e4e7ec;
    color: #344054;
  }
}

// ==================== Order Info Bar ====================
.order-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 8px;
}

.order-info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-info-label {
  color: #98a2b3;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.order-info-value {
  color: #344054;
  font-size: 13px;
  font-weight: 500;
}

// ==================== Detail Area ====================
.detail-area {
  padding: 20px 24px;
  background: #f9fafb;
  border-top: 1px solid #eaecf0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.detail-panel,
.notes-panel {
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 10px;
  padding: 16px;

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f2f4f7;
    color: #101828;
    font-size: 14px;
    font-weight: 600;

    .el-icon {
      color: #667085;
      font-size: 16px;
    }
  }
}

// ==================== Info Lines ====================
.item-block + .item-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #d9dee8;
}

.info-line {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;

  .info-label {
    margin: 0;
  }
}

.info-label,
.note-label {
  display: block;
  margin-bottom: 3px;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.2;
}

.info-value {
  min-width: 0;
  word-break: break-word;
  color: #475467;
}

.info-line.is-strong .info-value {
  color: #101828;
  font-weight: 600;
}

// ==================== eBay Customer Block ====================
.ebay-customer-line {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.ebay-customer-label {
  color: #98a2b3;
  font-size: 12px;
  flex-shrink: 0;
}

.ebay-customer-value {
  color: #475467;
  min-width: 0;
  word-break: break-word;
}

.ebay-customer-name {
  color: #101828 !important;
  font-weight: 600;
}

// ==================== Notes Panel ====================
.notes-panel {
  margin-top: 16px;
}

.notes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.notes-grid p {
  min-height: 36px;
  margin: 0;
  color: #475467;
}

// ==================== Shop Select ====================
.shop-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.shop-option-tag {
  flex-shrink: 0;
}

.shop-check-group {
  width: 100%;
}

.shop-check-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eaecf0;
  margin-bottom: 8px;
}

.shop-count-text {
  color: #98a2b3;
  font-size: 12px;

  b {
    color: #344054;
    font-weight: 600;
  }
}

.shop-check-list {
  max-height: 260px;
  overflow-y: auto;
  margin: 0 -4px;
  padding: 0 4px;
}

.sku-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sku-edit-btn {
  flex-shrink: 0;
  padding: 0;
  min-height: auto;
  color: #175cd3;
  font-size: 13px;
}

.shop-check-item {
  padding: 8px 0;
  border-bottom: 1px solid #f2f4f7;

  &:last-child {
    border-bottom: none;
  }
}

.shop-check-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
}

.platform-mini-tag {
  flex-shrink: 0;
  font-size: 11px;
}

.shop-region {
  color: #98a2b3;
  font-size: 12px;
}

.status-mini-tag {
  flex-shrink: 0;
  font-size: 11px;
}

.shop-check-box {
  width: 16px;
  height: 16px;
  border: 2px solid #d0d5dd;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: transparent;
  flex-shrink: 0;
  transition: all 0.15s;
}

.shop-check-box.checked {
  background: #175cd3;
  border-color: #175cd3;
  color: #fff;
}

// ==================== Transitions ====================
.order-expand-enter-active,
.order-expand-leave-active {
  transition: all 0.2s ease;
}

.order-expand-enter-from,
.order-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ==================== Responsive ====================
@media (max-width: 1600px) {
  .platform-orders-page .filter-item {
    width: calc(33.33% - 11px);
  }

  .platform-orders-page .filter-item-time {
    width: calc(66.66% - 6px);
  }

  .summary-row {
    grid-template-columns: minmax(150px, 1.1fr) minmax(150px, 1fr) minmax(130px, 1fr) minmax(170px, 1.4fr) minmax(120px, 1fr) 120px 92px 82px 82px 104px 36px;
  }

  .platform-cell {
    display: none;
  }
}

@media (max-width: 1200px) {
  .platform-orders-page .filter-item,
  .platform-orders-page .filter-item-time {
    width: calc(50% - 8px);
  }

  // 筛选框标签宽度缩减
  .platform-orders-page .filter-form {
    :deep(.el-form-item__label) {
      width: 84px !important;
    }
  }

  // 筛选按钮行：允许换行
  .platform-orders-page .filter-item-actions {
    :deep(.el-form-item__content) {
      flex-wrap: wrap;
      gap: 6px;
    }
  }
  .platform-orders-page .action-btn {
    min-width: 68px;
    height: 32px;
    font-size: 12px;
    padding: 0 8px;
  }

  // 小屏保留与全屏一致的列宽，通过 .orders-scroll 横向拖拽查看
  .summary-row {
    gap: 10px;
  }

  .cell-label {
    font-size: 10px;
    margin-bottom: 2px;
  }
  .primary-value {
    font-size: 13px;
  }
  .secondary-value {
    font-size: 12px;
  }

  // 隐藏仅大屏展示的平台列
  .platform-cell {
    display: none;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .platform-orders-page .filter-item,
  .platform-orders-page .filter-item-time,
  .platform-orders-page .filter-item-actions {
    width: 100%;
  }

  // 筛选卡片紧凑化
  .platform-orders-page .filter-card {
    border-radius: 8px;
    :deep(.el-card__body) {
      padding: 8px 10px 0;
    }
  }

  .platform-orders-page .filter-form {
    column-gap: 6px;
    :deep(.el-form-item) {
      margin-bottom: 8px;
    }
    :deep(.el-form-item__label) {
      width: 64px !important;
      font-size: 11px;
      line-height: 30px;
    }
  }

  .platform-orders-page .action-btn {
    min-width: 56px;
    height: 28px;
    font-size: 11px;
    padding: 0 6px;
    border-radius: 6px;
  }

  .platform-orders-page .filter-item-actions {
    padding-top: 0;
    :deep(.el-form-item__content) {
      flex-wrap: wrap;
      gap: 4px;
    }
  }

  .orders-header {
    align-items: flex-start;
    gap: 6px;
    flex-direction: column;
    margin-bottom: 6px;

    h2 { font-size: 17px; }
  }

  // 手机端取消横向滚动，切换为单列堆叠布局
  .orders-scroll {
    overflow-x: visible;
    -webkit-overflow-scrolling: auto;

    .order-card {
      min-width: 0;
    }
  }

  .order-card {
    margin-bottom: 8px;
    border-radius: 8px;
  }

  .summary-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 8px 44px 8px 12px;
    min-height: auto;
    position: relative;
  }

  // 单列布局：每列改为水平排列（label 在左，值在右）
  .summary-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cell-label {
    min-width: 56px;
    max-width: 56px;
    margin-bottom: 0;
    font-size: 10px;
    flex-shrink: 0;
  }
  .primary-value { font-size: 13px; }
  .secondary-value { font-size: 12px; }

  // 恢复所有列
  .sku-cell,
  .shipment-cell,
  .platform-cell {
    display: flex;
  }

  // 展开按钮绝对定位
  .expand-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
  }

  .detail-grid,
  .notes-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .detail-area {
    padding: 10px;
  }

  .detail-panel {
    padding: 10px;
  }
}

// ==================== 自动创建出库单开关 ====================
.auto-create-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 0 4px;
}

.auto-create-label {
  font-size: 12px;
  color: #667085;
  white-space: nowrap;
}
</style>
