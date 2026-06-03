<template>
  <div class="app-container platform-orders-page">
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
        <el-form-item class="filter-item filter-item-time" :label="t('platformOrders.filterTime')" prop="orderUpdateTimeRange">
          <el-date-picker
            v-model="queryParams.orderUpdateTimeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item class="filter-item filter-item-actions">
          <el-button type="primary" icon="Search" class="action-btn" native-type="submit" v-hasPermi="['wms:platform:list']">{{ t('platformOrders.btnQuery') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ t('platformOrders.btnReset') }}</el-button>
          <el-button type="success" icon="RefreshRight" class="action-btn" @click="openSyncDialog" v-hasPermi="['wms:platform:tiktok:test']">{{ t('platformOrders.btnSync') }}</el-button>
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
        <el-empty v-if="!loading && !orderList.length" :description="emptyText" />

        <article
          v-for="(order, index) in orderList"
          :key="orderKey(order, index)"
          class="order-card"
          :class="{ 'is-open': isExpanded(order, index) }"
        >
          <button class="summary-row" type="button" @click="toggleOrder(order, index)">
            <div class="summary-cell order-id-cell">
              <span class="cell-label">订单号</span>
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
              <span class="cell-label">客户</span>
              <span class="primary-value ellipsis">{{ displayValue(getRecipient(order).name) }}</span>
              <span class="secondary-value ellipsis">{{ displayValue(getAddressRegion(order)) }}</span>
            </div>

            <div class="summary-cell product-cell">
              <span class="cell-label">商品</span>
              <span class="primary-value ellipsis">{{ displayValue(getFirstItem(order).productName) }}</span>
            </div>

            <div class="summary-cell sku-cell">
              <span class="cell-label">品牌/SKU</span>
              <div class="sku-row">
                <span class="secondary-value ellipsis">{{ displayValue(getSkuText(getFirstItem(order))) }}</span>
                <el-button v-if="canEditSku(order, index)" link size="small" class="sku-edit-btn" :icon="Edit" @click.stop="startSkuEdit(order, index, getFirstItem(order))" v-hasPermi="['wms:platform:edit']">编辑</el-button>
              </div>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">售价</span>
              <span class="primary-value">{{ formatMoney(getSaleAmount(order), getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">成本</span>
              <span class="secondary-value">{{ formatOptionalMoney(order.costPrice || order.cost, getCurrency(order)) }}</span>
            </div>

            <div class="summary-cell money-cell">
              <span class="cell-label">毛利</span>
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
            <div v-show="isExpanded(order, index)" class="detail-area" v-loading="isDetailLoading(order, index)">
              <div class="detail-grid">
                <section class="detail-panel">
                  <h3><el-icon><Goods /></el-icon>商品</h3>
                  <div v-for="(item, itemIndex) in getLineItems(getDisplayOrder(order, index))" :key="item.lineItemId || item.skuId || itemIndex" class="item-block">
                    <InfoLine label="商品名" :value="item.productName" strong />
                    <InfoLine label="SKU" :value="getSkuText(item) || item.skuId" />
                    <InfoLine label="数量" :value="formatQuantity(item.quantity)" />
                    <InfoLine label="状态" :value="item.displayStatus || item.lineItemStatus || item.packageStatus" />
                    <InfoLine label="税费" :value="formatTaxes(item.taxes || item.itemTaxes, getCurrency(getDisplayOrder(order, index)))" />
                  </div>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><User /></el-icon>客户</h3>
                  <template v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'">
                    <div class="ebay-customer-block">
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelName') }}</span>
                        <span class="ebay-customer-value ebay-customer-name">{{ displayValue(getRecipient(getDisplayOrder(order, index)).name) }}</span>
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
                    </div>
                  </template>
                  <template v-else>
                    <InfoLine label="姓名" :value="getRecipient(getDisplayOrder(order, index)).name" strong />
                    <InfoLine label="电话">
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
                    <InfoLine label="地址" :value="getRecipient(getDisplayOrder(order, index)).addressLine1 || getRecipient(getDisplayOrder(order, index)).fullAddress" />
                    <InfoLine label="邮编" :value="getRecipient(getDisplayOrder(order, index)).postalCode" />
                    <InfoLine label="地区" :value="getRecipient(getDisplayOrder(order, index)).regionCode" />
                  </template>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><Van /></el-icon>物流</h3>
                  <template v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'">
                    <div class="ebay-customer-block">
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
                      <div class="ebay-customer-line">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelCarrier') }}</span>
                        <span class="ebay-customer-value">{{ formatShippingService(getDisplayOrder(order, index)) }}</span>
                      </div>
                      <div class="ebay-customer-line" v-if="getDisplayOrder(order, index).trackingNumber">
                        <span class="ebay-customer-label">{{ t('platformOrders.labelTracking') }}</span>
                        <span class="ebay-customer-value">
                          {{ getDisplayOrder(order, index).trackingNumber }}
                          <el-button link class="copy-btn" :icon="CopyDocument" v-copyText="getDisplayOrder(order, index).trackingNumber" v-copyText:callback="copyTextSuccess" />
                        </span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <InfoLine label="收货地址" :value="getRecipient(getDisplayOrder(order, index)).addressDetail" />
                    <InfoLine label="物流商" :value="getDisplayOrder(order, index).shippingProvider || getDisplayOrder(order, index).shippingProviderName" />
                    <InfoLine label="配送方式" :value="formatJoin([getDisplayOrder(order, index).shippingType || getDisplayOrder(order, index).shippingService, getDisplayOrder(order, index).fulfillmentType])" />
                    <InfoLine label="追踪号">
                      <span class="inline-copy">
                        {{ displayValue(getDisplayOrder(order, index).trackingNumber) }}
                        <el-button v-if="getDisplayOrder(order, index).trackingNumber" link class="copy-btn" :icon="CopyDocument" v-copyText="getDisplayOrder(order, index).trackingNumber" v-copyText:callback="copyTextSuccess" />
                      </span>
                    </InfoLine>
                    <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" label="仓库" :value="getDisplayOrder(order, index).warehouseId" />
                    <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" label="节点" :value="formatJoin([getDisplayOrder(order, index).rtsTime, getDisplayOrder(order, index).shippingDueTime, getDisplayOrder(order, index).deliveryTime])" />
                  </template>
                </section>

                <section class="detail-panel">
                  <h3><el-icon><Money /></el-icon>支付与费用</h3>
                  <InfoLine label="币种" :value="getCurrency(getDisplayOrder(order, index))" />
                  <InfoLine label="小计" :value="formatMoney(getPayment(getDisplayOrder(order, index)).subTotal, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine label="税费" :value="formatMoney(getPayment(getDisplayOrder(order, index)).tax, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="运费" :value="formatMoney(getPayment(getDisplayOrder(order, index)).shippingFee, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine label="总额" :value="formatMoney(getPayment(getDisplayOrder(order, index)).totalAmount, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine label="平台折扣" :value="formatMoney(getPayment(getDisplayOrder(order, index)).platformDiscount, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" label="卖家折扣" :value="formatMoney(getPayment(getDisplayOrder(order, index)).sellerDiscount, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'TIKTOK'" label="商品税" :value="formatMoney(getPayment(getDisplayOrder(order, index)).productTax, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'" label="平台交易费" :value="formatMoney(getDisplayOrder(order, index).totalMarketplaceFee, getCurrency(getDisplayOrder(order, index)))" />
                  <InfoLine v-if="getPlatform(getDisplayOrder(order, index)) === 'EBAY'" label="卖家实收" :value="formatMoney(getDisplayOrder(order, index).totalDueSeller, getCurrency(getDisplayOrder(order, index)))" strong />
                  <InfoLine label="毛利" :value="formatGrossProfit(getDisplayOrder(order, index))" />
                </section>
              </div>

              <section class="notes-panel">
                <h3><el-icon><Memo /></el-icon>备注</h3>
                <div class="notes-grid">
                  <div>
                    <span class="note-label">买家备注</span>
                    <p>{{ displayValue(getDisplayOrder(order, index).buyerMessage || getDisplayOrder(order, index).buyer_message) }}</p>
                  </div>
                  <div>
                    <span class="note-label">内部备注</span>
                    <el-input
                      :model-value="getDisplayOrder(order, index).internalRemark || ''"
                      type="textarea"
                      :rows="2"
                      placeholder="内部备注预留，后续接入接口"
                      disabled
                    />
                  </div>
                </div>
              </section>
            </div>
          </transition>
        </article>
      </div>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </section>

    <el-dialog v-model="syncOpen" title="同步平台订单" width="680px" @opened="onSyncDialogOpened">
      <el-alert
        title="默认全选所有已授权店铺。不选择开始时间时，后端自动按各店铺 lastSyncTime 增量同步，首次同步默认最近 7 天。"
        type="info"
        show-icon
        :closable="false"
        class="mb20"
      />
      <el-form ref="syncRef" :model="syncForm" :rules="syncRules" label-width="100px">
        <el-form-item label="选择店铺">
          <div class="shop-check-group">
            <div class="shop-check-header">
              <el-checkbox
                :model-value="allShopsSelected"
                :indeterminate="isIndeterminate"
                @change="toggleAllShops"
              >
                全选
              </el-checkbox>
              <span class="shop-count-text">
                已选 <b>{{ syncSelectedCount }}</b> 个，共 <b>{{ syncEligibleCount }}</b> 个可同步（总计 {{ syncShopList.length }}）
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
                      {{ shop.authStatus === 'AUTHORIZED' ? '已授权' : shop.authStatus }}
                    </el-tag>
                  </span>
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-model="syncForm.startTime"
            type="datetime"
            placeholder="请选择开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-date-picker
            v-model="syncForm.endTime"
            type="datetime"
            placeholder="请选择结束时间"
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
        <el-button @click="syncOpen = false">取消</el-button>
        <el-button type="primary" :loading="syncLoading" :disabled="!selectedShopIds.length" @click="submitSync">
          同步所选店铺
        </el-button>
      </template>
    </el-dialog>

    <!-- SKU 编辑弹窗 -->
    <el-dialog v-model="skuEditOpen" title="编辑SKU" width="420px" @close="cancelSkuEdit">
      <el-form :model="skuEditForm" label-width="80px">
        <el-form-item label="原SKU">
          <el-input :model-value="skuEditForm.oldSku" disabled />
        </el-form-item>
        <el-form-item label="新SKU">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input :model-value="skuEditForm.newSku" placeholder="请从库中选择新SKU" readonly style="flex: 1" />
            <el-button @click="openSkuSelect" :disabled="!skuEditForm.oldSku">选择</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelSkuEdit">取消</el-button>
        <el-button type="primary" :loading="skuSaving" :disabled="!skuEditForm.newSku" @click="saveSkuEdit">保存</el-button>
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
  </div>
</template>

<script setup name="PlatformOrders">
import { computed, defineComponent, getCurrentInstance, h, onMounted, ref } from 'vue'
import { ArrowDown, ArrowRight, CopyDocument, Edit } from '@element-plus/icons-vue'
import { getPlatformOrder, listPlatformOrders, getOrderStatusMap, updateOrderSku } from '@/api/wms/platformOrder'
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
const t = (key) => proxy?.$t?.(key) || key

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
const shopLoading = ref(false)
const total = ref(0)
const orderList = ref([])
const shopList = ref([])
const expandedKeys = ref([])
const detailCache = reactive({})
const detailLoading = reactive({})
const syncOpen = ref(false)
const syncShopList = ref([])
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
  orderUpdateTimeRange: []
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
const emptyText = computed(() => shopLoading.value ? t('platformOrders.noData') : t('platformOrders.noData'))
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
  if (!query.platform) delete query.platform

  if (query.orderUpdateTimeRange?.length === 2) {
    query.beginOrderUpdateTime = query.orderUpdateTimeRange[0]
    query.endOrderUpdateTime = query.orderUpdateTimeRange[1]
  }
  delete query.orderUpdateTimeRange

  query.orderByColumn = 'createTime'
  query.isAsc = 'desc'
  return query
}

function getList() {
  loading.value = true
  listPlatformOrders(normalizeQuery()).then(response => {
    const data = response.data || {}
    orderList.value = response.rows || data.rows || data.records || (Array.isArray(data) ? data : [])
    total.value = response.total || data.total || orderList.value.length
  }).catch(handleApiError).finally(() => {
    loading.value = false
  })
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
  const key = orderKey(order, index)
  const id = getOrderId(order)
  const platform = order.platform || queryParams.value.platform
  const shopAuthId = order.shopAuthId || queryParams.value.shopAuthId
  if (!id || !platform || detailCache[key] || detailLoading[key]) return

  detailLoading[key] = true
  getPlatformOrder(id, platform, shopAuthId).then(response => {
    detailCache[key] = response.data || response
  }).catch(handleApiError).finally(() => {
    detailLoading[key] = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  queryParams.value.orderUpdateTimeRange = []
  handleQuery()
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
    proxy.$modal.msgWarning('请至少选择一个店铺')
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
      proxy.$modal.msgSuccess(`后台同步已启动（${shopCount} 个店铺），数据将在几秒后刷新`)
      // 延迟刷新列表，给后台同步一些时间
      setTimeout(() => { getList(); loadShops() }, 5000)
    }).catch(() => {
      syncLoading.value = false
      proxy.$modal.msgError('同步请求失败')
    })
  })
}

function validateEndTime(rule, value, callback) {
  if (syncForm.value.startTime && value && value < syncForm.value.startTime) {
    callback(new Error('结束时间不能早于开始时间'))
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

function isDetailLoading(order, index) {
  return Boolean(detailLoading[orderKey(order, index)])
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
  if (!Number.isFinite(num) || num === 0) return '-'
  return formatMoney(value, currency)
}

function formatGrossProfit(order) {
  if (order.grossProfit === null || order.grossProfit === undefined || order.grossProfit === '') return '-'
  const num = Number(order.grossProfit)
  if (!Number.isFinite(num) || num === 0) return '-'
  return formatMoney(order.grossProfit, getCurrency(order))
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

function formatStatusText(status, platform) {
  if (!status) return '-'
  // eBay 取消订单的 fulfillmentStatus 为 NOT_STARTED，卡片上映射为"已取消"
  if (status === 'NOT_STARTED' && platform === 'EBAY') {
    return orderStatusMap.value['CANCELLED'] || 'Cancelled'
  }
  return orderStatusMap.value[status] || status
}

function getStatusClass(status, platform) {
  // eBay: NOT_STARTED = 已取消，使用 muted 样式
  if (platform === 'EBAY' && status === 'NOT_STARTED') return 'muted'
  if (['DELIVERED', 'COMPLETED', 'FULFILLED'].includes(status)) return 'success'
  if (['CANCELLED', 'REFUNDED'].includes(status)) return 'muted'
  if (status === 'ON_HOLD') return 'warning'
  if (['AWAITING_SHIPMENT', 'IN_PROGRESS'].includes(status)) return 'primary'
  if (status === 'NOT_STARTED') return 'info'
  return 'info'
}

function formatShopLabel(shop) {
  const suffix = shop.region ? ` (${shop.region})` : ''
  return `${shop.shopName || shop.shopId || shop.id}${suffix}`
}

function copyTextSuccess() {
  proxy.$modal.msgSuccess('已复制')
}

// ==================== SKU 编辑 ====================

function canEditSku(order, index) {
  const ord = getDisplayOrder(order, index)
  // 有成本数据（已关联库存 SKU）则不可编辑
  const cost = ord.costPrice || ord.cost
  if (cost !== null && cost !== undefined && Number(cost) > 0) return false
  return true
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
    proxy.$modal.msgWarning('SKU不能为空')
    return
  }
  const ord = getDisplayOrder(skuEditOrder.value, skuEditIndex.value)
  const orderId = getOrderId(ord)
  const platform = getPlatform(ord)
  skuSaving.value = true
  updateOrderSku(orderId, platform, skuEditForm.value.newSku.trim()).then(() => {
    proxy.$modal.msgSuccess('SKU已更新')
    cancelSkuEdit()
    getList()
  }).catch(() => {
    proxy.$modal.msgError('SKU更新失败')
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

function handleApiError(error) {
  const status = error?.response?.status
  const code = error?.response?.data?.code
  if (status === 401 || code === 401) {
    proxy.$modal.msgError('登录已过期，请重新登录')
    return
  }
  if ([401, 403].includes(status) || [401, 403].includes(code)) {
    proxy.$modal.msgError('当前账号缺少 TikTok 平台权限')
  }
}

function loadStatusMap() {
  getOrderStatusMap().then(response => {
    const data = response.data || response
    orderStatusMap.value = data || {}
    // NOT_STARTED 合并到 CANCELLED，下拉框只保留 CANCELLED 代表"已取消"
    orderStatusOptions.value = Object.keys(orderStatusMap.value).filter(k => k !== 'NOT_STARTED')
  }).catch(() => {})
}

onMounted(() => {
  loadShops()
  loadStatusMap()
  getList()
})
</script>

<style lang="scss">
.platform-orders-page {
  background: transparent;
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
  grid-template-columns: minmax(150px, 1.15fr) minmax(150px, 1.1fr) 116px minmax(130px, 1fr) minmax(180px, 1.5fr) minmax(120px, 1fr) 92px 82px 82px 104px 36px;
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
    grid-template-columns: minmax(150px, 1.1fr) minmax(150px, 1fr) minmax(130px, 1fr) minmax(170px, 1.4fr) minmax(120px, 1fr) 92px 82px 82px 104px 36px;
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

  .summary-row {
    grid-template-columns: repeat(3, minmax(0, 1fr)) 36px;
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

  .orders-header {
    align-items: flex-start;
    gap: 8px;
    flex-direction: column;
  }

  .summary-row,
  .detail-grid,
  .notes-grid {
    grid-template-columns: 1fr;
  }

  .summary-row {
    gap: 10px;
    padding-right: 52px;
    position: relative;
  }

  .expand-btn {
    position: absolute;
    right: 12px;
    top: 14px;
  }

  .detail-area {
    padding: 14px;
  }

  .detail-panel {
    padding: 14px;
  }
}
</style>
