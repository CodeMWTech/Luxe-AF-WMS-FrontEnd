<template>
  <div class="app-container crm-page" :class="section === 'detail' ? 'is-detail' : 'is-analysis'">
    <section class="crm-main">
      <div class="crm-period">
        <label>
          <span>{{ tr('时间范围') }}</span>
          <el-date-picker
            v-model="pickerRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            :start-placeholder="tr('开始日期')"
            :end-placeholder="tr('结束日期')"
            range-separator="—"
            :clearable="section !== 'detail'"
            :disabled="section === 'detail' && !detailSource"
            :disabled-date="disabledPeriodDate"
            @change="applyPeriod"
          />
        </label>
        <p class="crm-range">{{ rangeText }}</p>
      </div>
      <el-tabs v-model="activeTab" class="crm-tabs">
        <el-tab-pane v-if="section !== 'detail'" :label="tr('数据分析')" name="analysis">
          <div v-loading="insightLoading" class="crm-analysis" :class="{ 'is-method-open': methodOpen }">
      <div class="crm-toolbar">
        <el-select
          v-model="shopKeys"
          multiple
          clearable
          filterable
          collapse-tags
          class="crm-shop"
          :placeholder="tr('全部店铺')"
          @change="onShopChange"
        >
          <el-option-group v-for="group in shopGroups" :key="group.platform" :label="group.label">
            <el-option
              v-if="group.shops.length > 1"
              :label="group.platform === 'EBAY' ? tr('全部 eBay') : tr('全部 Whatnot')"
              :value="platformValue(group.platform)"
            />
            <el-option
              v-for="shop in group.shops"
              :key="shop.platform + shop.shopName"
              :label="shop.shopName"
              :value="shopValue(shop)"
            />
          </el-option-group>
        </el-select>
      </div>
      <div class="crm-stats">
        <div class="crm-stat">
          <span>{{ tr('客户数') }}</span>
          <strong>{{ formatCount(insight?.customerCount) }}</strong>
        </div>
        <div class="crm-stat">
          <span>{{ tr('回头客户') }}</span>
          <strong>{{ repeatPercent }}<small>%</small></strong>
          <em>{{ formatCount(insight?.repeatCustomerCount) }} · {{ te('订单 {0}% · 金额 {1}%', [repeatOrderPercent, repeatAmountPercent]) }}</em>
        </div>
        <div class="crm-stat">
          <span>{{ tr('订单数') }}</span>
          <strong>{{ formatCount(insight?.orderCount) }}</strong>
        </div>
        <div class="crm-stat">
          <span>{{ tr('订单金额') }}</span>
          <strong class="is-money">{{ insightMoney }}</strong>
        </div>
        <div class="crm-stat">
          <span>{{ tr('已对上库存') }}</span>
          <strong>{{ matchPercent }}<small>%</small></strong>
          <em>{{ formatCount(insight?.matchedLineCount) }} / {{ formatCount(insight?.skuLineCount) }}</em>
        </div>
      </div>
      <div class="crm-method">
        <button type="button" class="crm-method__toggle" @click="toggleMethod">
          <span>{{ tr('统计口径') }}</span>
          <em>{{ methodOpen ? tr('收起') : tr('展开') }}</em>
        </button>
        <div v-show="methodOpen" class="crm-method__card">
          <div class="crm-method__tabs" @click.stop>
            <button
              v-for="item in methodTabs"
              :key="item.id"
              type="button"
              :class="{ 'is-on': methodTab === item.id }"
              @click="methodTab = item.id"
            >{{ tr(item.label) }}</button>
          </div>
          <div v-show="methodTab === 'rule'" class="crm-method__body">
            <p>{{ tr('回头客是同一个客户在当前时间和店铺范围内有 2 笔及以上订单。改时间或改店铺后按新范围重算。刷单不计入。') }}</p>
          </div>
          <div v-show="methodTab === 'ebay'" class="crm-method__body">
            <p>{{ tr('eBay 认的是订单里的买家用户名，不是注册姓名。大小写算同一个账号。注册姓名、收件人、电话只显示在卡片上，不参与合并。两个客户的注册姓名一样、用户名不同，仍然是两个客户。') }}</p>
          </div>
          <div v-show="methodTab === 'whatnot'" class="crm-method__body">
            <p>{{ tr('Whatnot 买家在平台上有自己的用户名，但订单是从 Shopify 同步来的，原文里没有这个用户名。每笔订单带着 Whatnot 给这个买家单独生成的邮箱，目前都是 @whatnot.com，所以用邮箱认人。收货姓名只用于显示。') }}</p>
            <p>{{ tr('没有邮箱时，才改用姓名加电话，两项都要相同才算同一个客户。姓名一样但电话不同，仍是两个客户。姓名一样而且电话都空着，空电话也相同，才会并成一个。当前这批订单都有邮箱，电话都是空的，没有走到这一步。') }}</p>
          </div>
          <div v-show="methodTab === 'bars'" class="crm-method__body">
            <p>{{ tr('上面的百分比是人数。下面柱子里的新客、回头客是订单数。回头客名下的每一笔都算回头客订单，所以柱子比例对的是回头客户下面那一行的订单占比，不是上面的人数百分比。') }}</p>
          </div>
        </div>
      </div>
      <div class="crm-stage" :class="{ 'is-focus': !!focusId }">
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'hour', 'is-mini': focusId && focusId !== 'hour' }"
          @click="focusChart('hour')"
        >
          <header>
            <span>{{ tr('各小时订单数') }}</span>
            <button v-if="focusId === 'hour'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <p v-if="focusId === 'hour'" class="crm-chart__explain">{{ tr('按订单创建时间统计一天 24 小时。默认把新客和回头客叠在同一根柱子里，鼠标停上去可以看各自的订单数和占比。也可以只看其中一类，比较他们集中在哪些小时。') }}</p>
          <div v-if="focusId === 'hour'" class="crm-split" @click.stop>
            <button v-for="item in splitModes" :key="'hour-' + item.value" type="button" :class="{ 'is-on': chartSplit.hour === item.value }" @click="setSplit('hour', item.value)">{{ tr(item.label) }}</button>
          </div>
          <div ref="hourEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'weekday', 'is-mini': focusId && focusId !== 'weekday' }"
          @click="focusChart('weekday')"
        >
          <header>
            <span>{{ tr('各星期订单数') }}</span>
            <button v-if="focusId === 'weekday'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <p v-if="focusId === 'weekday'" class="crm-chart__explain">{{ tr('按订单是星期几来计数。默认新客和回头客叠在一起，也可以只看其中一类，比较一周里谁在哪一天更集中。') }}</p>
          <div v-if="focusId === 'weekday'" class="crm-split" @click.stop>
            <button v-for="item in splitModes" :key="'weekday-' + item.value" type="button" :class="{ 'is-on': chartSplit.weekday === item.value }" @click="setSplit('weekday', item.value)">{{ tr(item.label) }}</button>
          </div>
          <div ref="weekdayEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'gap', 'is-mini': focusId && focusId !== 'gap' }"
          @click="focusChart('gap')"
        >
          <header>
            <span>{{ gapTitle }}</span>
            <button v-if="focusId === 'gap'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <div v-if="focusId === 'gap'" class="crm-gap-range" @click.stop>
            <span>{{ tr('从第') }}</span>
            <el-input-number v-model="gapFrom" :min="1" :max="Math.max(1, gapTo - 1)" :precision="0" :step="1" size="small" controls-position="right" @change="clampGapRange" />
            <span>{{ tr('笔到第') }}</span>
            <el-input-number v-model="gapTo" :min="Math.max(2, gapFrom + 1)" :max="gapMax" :precision="0" :step="1" size="small" controls-position="right" @change="clampGapRange" />
            <span>{{ tr('笔的间隔') }}</span>
          </div>
          <p v-if="focusId === 'gap'" class="crm-chart__explain">{{ gapExplain }}</p>
          <div ref="gapEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'band', 'is-mini': focusId && focusId !== 'band' }"
          @click="focusChart('band')"
        >
          <header>
            <span>{{ tr('购买次数') }}</span>
            <button v-if="focusId === 'band'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <p v-if="focusId === 'band'" class="crm-chart__explain">{{ tr('每个客户在当前筛选里一共下了几单。1 单是只买过一次的人，2 单及以上是回头客。柱子是客户数，不是订单数。') }}</p>
          <div ref="bandEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'brand', 'is-mini': focusId && focusId !== 'brand' }"
          @click="focusChart('brand')"
        >
          <header>
            <span>{{ tr('已入库品牌') }}</span>
            <button v-if="focusId === 'brand'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <p v-if="focusId === 'brand'" class="crm-chart__explain">
            {{ tr('统计全部已对上库存的订单，新客和回头客都在里面。柱子默认按两类订单堆叠，可以看出每个品牌里回头客占多少。没对上库存的订单不在这里。') }}
            <template v-if="sameBrandPercent != null">{{ te('另外，至少两笔对上了品牌的回头客里，有 {0}% 后来又买到同一品牌。', [sameBrandPercent]) }}</template>
          </p>
          <div v-if="focusId === 'brand'" class="crm-split" @click.stop>
            <button v-for="item in splitModes" :key="'brand-' + item.value" type="button" :class="{ 'is-on': chartSplit.brand === item.value }" @click="setSplit('brand', item.value)">{{ tr(item.label) }}</button>
          </div>
          <div ref="brandEl" class="crm-chart__canvas" />
        </article>
        <article
          class="crm-chart"
          :class="{ 'is-focus': focusId === 'category', 'is-mini': focusId && focusId !== 'category' }"
          @click="focusChart('category')"
        >
          <header>
            <span>{{ tr('已入库品类') }}</span>
            <button v-if="focusId === 'category'" type="button" class="crm-focus" @click.stop="clearFocus">{{ tr('点击收回') }}</button>
            <em v-else>{{ tr('点击放大') }}</em>
          </header>
          <p v-if="focusId === 'category'" class="crm-chart__explain">{{ tr('和已入库品牌是同一批已对上库存的订单，按品类比较哪一类更多。新客和回头客都计入，堆叠后可以看出该品类订单里回头客占多少。品类名按库存原文显示。') }}</p>
          <div v-if="focusId === 'category'" class="crm-split" @click.stop>
            <button v-for="item in splitModes" :key="'category-' + item.value" type="button" :class="{ 'is-on': chartSplit.category === item.value }" @click="setSplit('category', item.value)">{{ tr(item.label) }}</button>
          </div>
          <div ref="categoryEl" class="crm-chart__canvas" />
        </article>
      </div>
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="section === 'detail'" :label="tr('客户详情')" name="detail">
          <div v-loading="detailLoading" class="crm-pane crm-detail">
            <el-empty v-if="!detail" class="crm-empty" :description="tr('在左侧选择一位客户，这里展示联系方式和每一笔订单。')" />
            <template v-else>
              <header class="crm-profile">
                <div class="crm-profile__body">
                <div class="crm-profile__title">
                  <h2>{{ detail.displayName }}</h2>
                  <span class="crm-platform" :class="detail.platform === 'EBAY' ? 'is-ebay' : 'is-whatnot'">{{ detail.platformLabel }}</span>
                  <span v-if="detail.repeatCustomer" class="crm-repeat">{{ tr('回头客') }}</span>
                </div>
                <div class="crm-facts">
                  <div v-if="detail.buyerUsername && detail.buyerUsername !== detail.displayName"><span>{{ tr('eBay用户名') }}</span><b>{{ detail.buyerUsername }}</b></div>
                  <div v-if="detail.email"><span>{{ tr('邮箱') }}</span><b>{{ detail.email }}</b></div>
                  <div v-if="detail.phone"><span>{{ tr('电话') }}</span><b>{{ detail.phone }}</b></div>
                  <div v-if="detail.recipientName"><span>{{ tr('收件人') }}</span><b>{{ detail.recipientName }}</b></div>
                  <div v-if="placeLine"><span>{{ tr('地址') }}</span><b>{{ placeLine }}</b></div>
                  <div v-if="detail.shopNames"><span>{{ tr('店铺') }}</span><b>{{ detail.shopNames }}</b></div>
                  <div><span>{{ tr('首单') }}</span><b>{{ detail.firstOrderTime || '—' }}</b></div>
                  <div><span>{{ tr('最近一单') }}</span><b>{{ detail.lastOrderTime || '—' }}</b></div>
                  <div><span>{{ tr('累计金额') }}</span><b>{{ moneyList(detail.amounts) }}</b></div>
                </div>
                </div>
                <div v-if="showShopPie" class="crm-profile__pie">
                  <span>{{ tr('店铺占比') }}</span>
                  <div ref="shopPieEl" class="crm-profile__canvas" />
                </div>
              </header>
              <p v-if="detailStory" class="crm-story">{{ detailStory }}</p>
                <div v-if="detail.repeatCustomer" class="crm-detail-charts">
                  <article class="crm-chart" @click="openDetailZoom('amount')">
                    <header>
                      <span>{{ tr('每一笔的金额') }}</span>
                      <em>{{ tr('点击放大') }}</em>
                    </header>
                    <div ref="detailAmountEl" class="crm-chart__canvas" />
                  </article>
                  <article class="crm-chart" @click="openDetailZoom('brand')">
                    <header>
                      <span>{{ tr('买过的品牌') }}</span>
                      <em>{{ tr('点击放大') }}</em>
                    </header>
                    <div ref="detailBrandEl" class="crm-chart__canvas" />
                  </article>
                  <article class="crm-chart" @click="openDetailZoom('gap')">
                    <header>
                      <span>{{ tr('相邻两单间隔') }}</span>
                      <em>{{ tr('点击放大') }}</em>
                    </header>
                    <div v-if="detailGaps.length" ref="detailGapEl" class="crm-chart__canvas" />
                    <p v-else class="crm-chart__note">{{ tr('只有一笔订单，还没有间隔。') }}</p>
                  </article>
                </div>
                <section v-if="detail.repeatCustomer" class="crm-taste">
                  <button type="button" class="crm-taste__toggle" :class="{ 'is-open': tasteOpen }" :title="tr('查看这位回头客的消费水平、品牌和品类偏好')" @click="toggleTaste">
                    <span class="crm-taste__lead">
                      <i class="crm-taste__mark" />
                      <span>{{ tr('品位偏好') }}</span>
                      <span class="crm-taste__hint">{{ tr('看平均消费、品牌和品类') }}</span>
                    </span>
                    <em>{{ tasteOpen ? tr('收起') : tr('点击查看') }}</em>
                  </button>
                  <div v-show="tasteOpen" class="crm-taste__panel">
                    <div class="crm-taste__stats">
                      <div><span>{{ tr('平均每笔') }}</span><strong>{{ moneyText(tasteView.currency, tasteView.stats?.avg) }}</strong></div>
                      <div><span>{{ tr('中位数') }}</span><strong>{{ moneyText(tasteView.currency, tasteView.stats?.p50) }}</strong></div>
                      <div><span>{{ tr('最高一笔') }}</span><strong>{{ moneyText(tasteView.currency, tasteView.stats?.max) }}</strong></div>
                      <div><span>{{ tr('最常买') }}</span><strong>{{ [tasteView.topBrand, tasteView.topCategory].filter(Boolean).join(' · ') || tr('还没对上库存') }}</strong></div>
                    </div>
                    <div class="crm-taste__notes">
                      <p><em>{{ tr('口味') }}</em><span>{{ tasteLines.taste }}</span></p>
                      <p><em>{{ tr('金额分布') }}</em><span>{{ tasteLines.money }}</span></p>
                    </div>
                    <p class="crm-taste__tip">{{ tr('点击图例可暂时隐藏这一项，剩下各项的占比会重新加总为 100%。再点一次即可恢复。') }}</p>
                    <div class="crm-taste__charts">
                      <article>
                        <header>{{ tr('品牌偏好') }}</header>
                        <div v-if="tasteView.brands.length" ref="tasteBrandEl" class="crm-chart__canvas" />
                        <p v-else class="crm-chart__note">{{ tr('商品还没有对上库存品牌') }}</p>
                      </article>
                      <article>
                        <header>{{ tr('品类偏好') }}</header>
                        <div v-if="tasteView.categories.length" ref="tasteCategoryEl" class="crm-chart__canvas" />
                        <p v-else class="crm-chart__note">{{ tr('商品还没有对上库存品类') }}</p>
                      </article>
                    </div>
                    <article class="crm-taste__band">
                      <div ref="tasteBandEl" class="crm-chart__canvas" />
                    </article>
                  </div>
                </section>
                <div v-if="extraGroups.length" class="crm-extra">
                  <section v-for="group in extraGroups" :key="group.key">
                    <span>{{ group.label }}</span>
                    <div class="crm-chips">
                      <em v-for="item in visibleExtra(group)" :key="item">{{ item }}</em>
                      <button v-if="group.items.length > extraLimit && !extraOpen" type="button" @click="extraOpen = true">
                        {{ te('还有 {0} 条', [group.items.length - extraLimit]) }}
                      </button>
                    </div>
                  </section>
                </div>
              <div class="crm-orders">
                <div class="crm-orders__bar">
                  <h3>{{ tr('订单记录') }}</h3>
                  <div class="crm-orders__tools">
                    <div v-if="detail.orders.length" class="crm-split">
                      <button type="button" :class="{ 'is-on': skuMatch === 'all' }" @click="skuMatch = 'all'">{{ tr('全部') }}</button>
                      <button type="button" :class="{ 'is-on': skuMatch === 'matched' }" @click="skuMatch = 'matched'">{{ tr('已匹配SKU') }}</button>
                      <button type="button" :class="{ 'is-on': skuMatch === 'unmatched' }" @click="skuMatch = 'unmatched'">{{ tr('未匹配SKU') }}</button>
                    </div>
                    <div v-if="detail.orders.length > 1" class="crm-split">
                      <button type="button" :class="{ 'is-on': orderSort === 'asc' }" @click="setOrderSort('asc')">{{ tr('顺序') }}</button>
                      <button type="button" :class="{ 'is-on': orderSort === 'desc' }" @click="setOrderSort('desc')">{{ tr('倒序') }}</button>
                    </div>
                  </div>
                </div>
                <p v-if="!detail.orders.length" class="muted">{{ tr('这段时间没有订单。') }}</p>
                <p v-else-if="!listedOrders.length" class="muted">{{ skuEmptyText }}</p>
                <article v-for="order in listedOrders" :key="order.sequence + order.platformOrderId" class="crm-order">
                  <div class="crm-order__head">
                    <div>
                      <strong>{{ sequenceLabel(order.sequence) }}</strong>
                      <span>{{ order.orderTime }}</span>
                      <span v-if="order.orderStatus" class="crm-status">{{ order.orderStatus }}</span>
                      <span v-if="order.shopName" class="muted">{{ order.shopName }}</span>
                    </div>
                    <b>{{ moneyText(order.currency, order.orderAmount) }}</b>
                  </div>
                  <div class="crm-order__id">
                    <span>{{ tr('订单号') }}</span>
                    <el-link type="primary" @click="openOrder(order)">{{ order.platformOrderId }}</el-link>
                  </div>
                  <div class="crm-products">
                    <div v-for="(product, index) in order.products" :key="index" class="crm-product">
                      <el-image class="crm-thumb" :src="product.thumbnailUrl" fit="cover">
                        <template #error><div class="crm-thumb__empty">{{ tr('无图') }}</div></template>
                      </el-image>
                      <div class="crm-product__body">
                        <el-link v-if="product.linked" type="primary" @click="openItem(product)">{{ productCode(product) }}</el-link>
                        <strong v-else>{{ productCode(product) }}</strong>
                        <div class="crm-product__tags">
                          <span>{{ tr('分类') }} {{ product.categoryName || tr('未入库') }}</span>
                          <span>{{ tr('品牌') }} {{ product.brandName || tr('未入库') }}</span>
                        </div>
                        <el-button link type="primary" @click="product.open = !product.open">
                          {{ product.open ? tr('收起金额') : tr('展开金额') }}
                        </el-button>
                        <div v-if="product.open" class="crm-product__money">
                          <span>{{ tr('数量') }} {{ formatQty(product.quantity) }}</span>
                          <span>{{ tr('单价') }} {{ moneyText(order.currency, product.salePrice) }}</span>
                          <span>{{ tr('行金额') }} {{ moneyText(order.currency, product.lineAmount) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </template>
          </div>
        </el-tab-pane>
        <el-tab-pane v-if="section !== 'detail'" :label="tr('自定义分析')" name="custom">
          <div v-loading="customLoading" class="crm-custom">
            <section class="crm-guide">
              <h3>{{ tr('怎么看这张图') }}</h3>
              <ol>
                <li>{{ tr('横坐标决定每一根柱子代表谁，例如星期、店铺或购买次数。') }}</li>
                <li>{{ tr('纵坐标决定柱子的高度，可以是订单数、客户数、回头率或金额。') }}</li>
                <li>{{ tr('对比项把同一组再拆开。留空就是不拆分。默认把新客和回头客放在一起比较。') }}</li>
              </ol>
              <p>{{ tr('品牌和品类只统计已对上库存的订单。店铺筛选与数据分析共用。新客回头客、购买次数、首单间隔已经决定了是不是回头客；和回头率叠在一起时，图会改成客户占比。') }}</p>
            </section>
            <div class="crm-custom__bar">
              <label>
                <span>{{ tr('横坐标') }}</span>
                <el-select v-model="customX" @change="loadCustom">
                  <el-option v-for="item in axisOptions" :key="item.value" :label="tr(item.label)" :value="item.value" />
                </el-select>
              </label>
              <label>
                <span>{{ tr('对比') }}</span>
                <el-select v-model="customSeries" clearable :placeholder="tr('不拆分')" @change="loadCustom">
                  <el-option v-for="item in seriesOptions" :key="item.value" :label="tr(item.label)" :value="item.value" />
                </el-select>
              </label>
              <label>
                <span>{{ tr('纵坐标') }}</span>
                <el-select v-model="customMetric" @change="loadCustom">
                  <el-option v-for="item in metricOptions" :key="item.value" :label="tr(item.label)" :value="item.value" />
                </el-select>
              </label>
              <label>
                <span>{{ tr('店铺') }}</span>
                <el-select
                  v-model="shopKeys"
                  multiple
                  clearable
                  filterable
                  collapse-tags
                  class="crm-shop"
                  :placeholder="tr('全部店铺')"
                  @change="onShopChange"
                >
                  <el-option-group v-for="group in shopGroups" :key="'custom-' + group.platform" :label="group.label">
                    <el-option
                      v-if="group.shops.length > 1"
                      :label="group.platform === 'EBAY' ? tr('全部 eBay') : tr('全部 Whatnot')"
                      :value="platformValue(group.platform)"
                    />
                    <el-option
                      v-for="shop in group.shops"
                      :key="'custom-' + shop.platform + shop.shopName"
                      :label="shop.shopName"
                      :value="shopValue(shop)"
                    />
                  </el-option-group>
                </el-select>
              </label>
            </div>
            <p v-if="customX === 'hour'" class="crm-adjust">{{ tr('横坐标是订单创建时间落在一天的哪一个小时。0 时是凌晨 0 点到 1 点，12 时是中午 12 点到 1 点，23 时是夜里 11 点到 12 点。') }}</p>
            <p v-if="customNote" class="crm-adjust">{{ customNote }}</p>
            <div class="crm-custom__chart">
              <div ref="customEl" class="crm-chart__canvas" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <aside v-if="section === 'detail'" class="crm-side">
      <div class="crm-pane">
        <div class="crm-pane__head">
          <h2>{{ tr('客户') }}</h2>
          <p class="crm-side__hint">{{ tr('先点选一位客户，右侧才会显示联系方式、订单和这位客户的购买情况。') }}</p>
          <el-input
            v-model="query.keyword"
            clearable
            :placeholder="tr('搜索姓名、账号、邮箱、电话、订单号、商品')"
            @keyup.enter="search"
          />
          <div class="crm-pane__filters">
            <el-select v-model="query.platform" clearable :placeholder="tr('平台')">
              <el-option label="eBay" value="EBAY" />
              <el-option label="Whatnot" value="SHOPIFY" />
            </el-select>
            <el-select v-model="query.sort" @change="search">
              <el-option :label="tr('最近下单')" value="time" />
              <el-option :label="tr('订单数量')" value="orders" />
            </el-select>
            <el-checkbox v-model="query.repeatOnly">{{ tr('只看回头客') }}</el-checkbox>
            <el-button type="primary" @click="search">{{ tr('查询') }}</el-button>
            <el-button @click="reset">{{ tr('重置') }}</el-button>
          </div>
        </div>
        <div v-loading="loading" class="crm-cards">
          <el-empty v-if="!loading && customers.length === 0" :description="tr('暂无客户')" />
          <button
            v-for="item in customers"
            :key="item.platform + ':' + item.buyerKey"
            type="button"
            class="crm-card"
            :class="{ 'is-active': isActive(item) }"
            @click="openCustomer(item)"
          >
            <div class="crm-card__top">
              <strong>{{ item.displayName }}</strong>
              <span class="crm-platform" :class="item.platform === 'EBAY' ? 'is-ebay' : 'is-whatnot'">{{ item.platformLabel }}</span>
            </div>
            <div class="crm-card__meta">{{ contactLine(item) }}</div>
            <div class="crm-card__foot">
              <span>{{ item.orderCount }} {{ tr('笔订单') }}</span>
              <span v-if="item.repeatCustomer" class="crm-repeat">{{ tr('回头客') }}</span>
              <span class="crm-card__time">{{ item.lastOrderTime }}</span>
            </div>
          </button>
        </div>
        <div class="crm-pager">
          <el-pagination
            v-model:current-page="query.pageNum"
            v-model:page-size="query.pageSize"
            small
            :total="total"
            :page-sizes="[10, 20, 30, 50]"
            :pager-count="5"
            layout="total, sizes, prev, pager, next"
            @current-change="loadList"
            @size-change="search"
          />
        </div>
      </div>
    </aside>
    <el-dialog
      v-model="detailZoomOpen"
      :title="detailZoomTitle"
      width="880px"
      append-to-body
      @opened="renderDetailZoom"
      @closed="disposeDetailZoom"
    >
      <div class="crm-zoom-stats">
        <div v-for="stat in detailZoomStats" :key="stat.label">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </div>
      </div>
      <div v-if="detailZoomKind === 'amount'" class="crm-orders__bar">
        <span>{{ orderSort === 'asc' ? tr('从第1笔到最后一笔') : tr('从最后一笔到第1笔') }}</span>
        <div class="crm-split">
          <button type="button" :class="{ 'is-on': orderSort === 'asc' }" @click="setOrderSort('asc')">{{ tr('顺序') }}</button>
          <button type="button" :class="{ 'is-on': orderSort === 'desc' }" @click="setOrderSort('desc')">{{ tr('倒序') }}</button>
        </div>
      </div>
      <div ref="detailZoomEl" class="crm-zoom-chart" />
    </el-dialog>
  </div>
</template>

<script setup name="CrmCustomer">
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap, translateExact } from '@/locales/runtime-map'
import { getCrmCustom, getCrmCustomer, getCrmInsights, getCrmShops, listCrmCustomers } from '@/api/wms/crmCustomer'

const props = defineProps({
  section: { type: String, default: 'detail' }
})
const settingsStore = useSettingsStore()
const router = useRouter()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const te = (text, values) => translateExact(text, settingsStore.language || 'zh-cn', values)

const WEEKDAYS = { mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日' }
const GAPS = { once: '仅一单', d0: '0–7 天', d7: '8–30 天', d30: '31–90 天', d90: '91–180 天', d180: '180 天以上' }
const BANDS = { n1: '1 单', n2: '2 单', n3: '3 单', n4: '4 单', n5: '5 单', n6: '6 单及以上' }
const POINT_LABELS = {
  ...WEEKDAYS,
  ...GAPS,
  ...BANDS,
  new: '新客',
  repeat: '回头客',
  other: '其他',
  orders: '订单数',
  customers: '客户数',
  repeatCustomers: '回头客数',
  repeatRate: '回头率',
  amount: '订单金额',
  avgAmount: '笔均金额',
  mix: '客户占比',
  shareOfX: '客户占比',
  shareOfAll: '客户占比'
}
const AXES = [
  { value: 'hour', label: '下单小时' },
  { value: 'weekday', label: '星期' },
  { value: 'month', label: '月份' },
  { value: 'platform', label: '平台' },
  { value: 'shop', label: '店铺' },
  { value: 'repeat', label: '新客或回头客' },
  { value: 'band', label: '购买次数' },
  { value: 'gap', label: '首单到第二单' },
  { value: 'brand', label: '已入库品牌' },
  { value: 'category', label: '已入库品类' }
]
const METRICS = [
  { value: 'orders', label: '订单数' },
  { value: 'customers', label: '客户数' },
  { value: 'repeatCustomers', label: '回头客数' },
  { value: 'repeatRate', label: '回头率' },
  { value: 'amount', label: '订单金额' },
  { value: 'avgAmount', label: '笔均金额' }
]

const loading = ref(false)
const detailLoading = ref(false)
const insightLoading = ref(false)
const customers = ref([])
const total = ref(0)
const detail = ref(null)
const insight = ref(null)
const shops = ref([])
const shopKeys = ref([])
let appliedShopKeys = []
const SHOP_COLORS = ['#409EFF', '#67C23A', '#E6A23C', '#13c2c2', '#F56C6C', '#909399']
const dateRange = ref([])
const detailRange = ref([])
const detailBounds = ref([])
const detailSource = ref(null)
const activeKey = ref('')
const analysisTab = ref('analysis')
const activeTab = computed({
  get() {
    return props.section === 'detail' ? 'detail' : analysisTab.value
  },
  set(value) {
    if (props.section !== 'detail') analysisTab.value = value || 'analysis'
  }
})
const focusId = ref('')
const methodOpen = ref(false)
const methodTab = ref('rule')
const methodTabs = [
  { id: 'rule', label: '怎么算回头客' },
  { id: 'ebay', label: 'eBay' },
  { id: 'whatnot', label: 'Whatnot' },
  { id: 'bars', label: '人数和订单' }
]
const splitModes = [
  { value: 'all', label: '全部' },
  { value: 'new', label: '仅新客' },
  { value: 'repeat', label: '仅回头客' }
]
const chartSplit = reactive({
  hour: 'all',
  weekday: 'all',
  brand: 'all',
  category: 'all'
})
const customX = ref('weekday')
const customSeries = ref('repeat')
const customMetric = ref('orders')
const customData = ref(null)
const customLoading = ref(false)
const customEl = ref(null)
const detailAmountEl = ref(null)
const detailBrandEl = ref(null)
const detailGapEl = ref(null)
const detailZoomEl = ref(null)
const detailZoomOpen = ref(false)
const detailZoomKind = ref('')
const orderSort = ref('asc')
const skuMatch = ref('all')
const tasteOpen = ref(false)
const tasteBrandEl = ref(null)
const tasteCategoryEl = ref(null)
const tasteBandEl = ref(null)
const shopPieEl = ref(null)
const gapFrom = ref(1)
const gapTo = ref(2)
const extraOpen = ref(false)
const extraLimit = 4
const axisOptions = AXES
const metricOptions = METRICS
const query = reactive({
  keyword: '',
  platform: '',
  repeatOnly: false,
  sort: 'time',
  pageNum: 1,
  pageSize: 20
})

const hourEl = ref(null)
const weekdayEl = ref(null)
const gapEl = ref(null)
const bandEl = ref(null)
const brandEl = ref(null)
const categoryEl = ref(null)
const charts = {}

const placeLine = computed(() => {
  if (!detail.value) return ''
  return [detail.value.fullAddress, detail.value.city, detail.value.stateName, detail.value.postalCode, detail.value.countryCode]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' · ')
})

const extraGroups = computed(() => {
  const current = detail.value
  if (!current) return []
  return [
    { key: 'email', label: tr('其他邮箱'), items: current.otherEmails || [] },
    { key: 'phone', label: tr('其他电话'), items: current.otherPhones || [] },
    { key: 'recipient', label: tr('其他收件人'), items: current.otherRecipients || [] },
    { key: 'address', label: tr('其他地址'), items: current.otherAddresses || [] },
    { key: 'message', label: tr('买家留言'), items: current.buyerMessages || [] }
  ].filter(group => group.items.length)
})

const repeatPercent = computed(() => percent(insight.value?.repeatCustomerCount, insight.value?.customerCount))
const repeatOrderPercent = computed(() => percent(insight.value?.repeatOrderCount, insight.value?.orderCount))
const repeatAmountPercent = computed(() => {
  const total = insight.value?.amounts?.[0]
  const part = (insight.value?.repeatAmounts || []).find(item => item.currency === total?.currency) || insight.value?.repeatAmounts?.[0]
  return percent(part?.amount, total?.amount)
})
const matchPercent = computed(() => percent(insight.value?.matchedLineCount, insight.value?.skuLineCount))
const seriesOptions = computed(() => AXES.filter(item => item.value !== customX.value))
const customNote = computed(() => {
  const measure = customData.value?.measure
  if (!measure || measure === customMetric.value) return ''
  if (measure === 'mix') {
    return tr('按新客回头客、购买次数或首单间隔拆开时，回头率会被算成 0% 或 100%，每家店都会一样高。下面改成客户占比。要看真正的回头率，把对比留空，或改成星期、品牌、品类。')
  }
  if (customMetric.value === 'repeatRate' && measure === 'customers') {
    return tr('横轴和对比都在区分是不是回头客，回头率只会是 0% 或 100%。下面改为客户数。')
  }
  return ''
})
const detailGaps = computed(() => gapsBetween(detail.value?.orders || []))
const gapMax = computed(() => {
  const lines = insight.value?.repeatTimelines || []
  let max = 2
  for (const line of lines) max = Math.max(max, line?.length || 0)
  return max
})
const gapTitle = computed(() => {
  if (focusId.value === 'gap' && (Number(gapFrom.value) !== 1 || Number(gapTo.value) !== 2)) {
    return te('回头客订单间隔 · 第{0}笔到第{1}笔', [gapFrom.value, gapTo.value])
  }
  return tr('回头客订单间隔')
})
const gapSelection = computed(() => gapBetweenOrders(gapFrom.value, gapTo.value, insight.value))
const gapExplain = computed(() => {
  const view = gapSelection.value
  return te('只统计至少有第 {1} 笔订单的回头客，看的是第 {0} 笔到第 {1} 笔隔了多少天。这样的人有 {2} 位。柱子是人数。中位数 {3} 天，平均 {4} 天。', [
    view.from,
    view.to,
    formatCount(view.count),
    view.median == null ? '—' : view.median,
    view.average == null ? '—' : view.average
  ])
})
const shownOrders = computed(() => {
  const orders = detail.value?.orders || []
  return orderSort.value === 'desc' ? [...orders].reverse() : orders
})
const listedOrders = computed(() => {
  return shownOrders.value.flatMap(order => {
    const products = order.products || []
    const visible = skuMatch.value === 'matched'
      ? products.filter(item => item.linked)
      : skuMatch.value === 'unmatched'
        ? products.filter(item => !item.linked)
        : products
    if (skuMatch.value !== 'all' && !visible.length) return []
    return [{ ...order, products: visible }]
  })
})
const skuEmptyText = computed(() => {
  return skuMatch.value === 'matched'
    ? tr('没有已匹配 SKU 的订单。')
    : tr('没有未匹配 SKU 的订单。')
})
const tasteView = computed(() => {
  const orders = detail.value?.orders || []
  const currency = orders.find(order => order.currency)?.currency || ''
  const stats = numberStats(orders.map(order => Number(order.orderAmount || 0)))
  const brands = tasteNamed(orders, 'brandName')
  const categories = tasteNamed(orders, 'categoryName')
  let products = 0
  let matched = 0
  for (const order of orders) {
    for (const product of order.products || []) {
      products += 1
      if (product.brandName || product.categoryName) matched += 1
    }
  }
  const bands = [
    { name: '500 以下', max: 500 },
    { name: '500–1,500', max: 1500 },
    { name: '1,500–3,000', max: 3000 },
    { name: '3,000–6,000', max: 6000 },
    { name: '6,000 以上', max: Infinity }
  ].map(item => ({ name: item.name, max: item.max, count: 0 }))
  for (const order of orders) {
    const amount = Number(order.orderAmount || 0)
    const band = bands.find(item => amount < item.max) || bands[bands.length - 1]
    band.count += 1
  }
  const busiest = [...bands].sort((left, right) => right.count - left.count)[0]
  return {
    currency,
    stats,
    brands,
    categories,
    bands,
    products,
    matched,
    topBrand: brands.find(item => item.name !== '未知' && item.name !== '其他')?.name || '',
    topCategory: categories.find(item => item.name !== '未知' && item.name !== '其他')?.name || '',
    bandName: busiest?.count ? busiest.name : ''
  }
})
const tasteLines = computed(() => {
  const view = tasteView.value
  const unmatched = Math.max(view.products - view.matched, 0)
  let taste = tr('这些商品还没有对上库存，品牌和品类在图里记为未知。')
  if (view.matched && unmatched) {
    taste = te('已对上库存 {0} 件，共 {1} 件。买得最多的品牌是 {2}，品类是 {3}。没对上的记为未知。', [
      formatCount(view.matched),
      formatCount(view.products),
      view.topBrand || '—',
      view.topCategory || '—'
    ])
  } else if (view.matched) {
    taste = te('这 {0} 件都对上了库存。买得最多的品牌是 {1}，品类是 {2}。', [
      formatCount(view.matched),
      view.topBrand || '—',
      view.topCategory || '—'
    ])
  }
  return {
    taste,
    money: te('更多订单落在 {0}。', [view.bandName || '—'])
  }
})
const shopPreference = computed(() => {
  const orders = detail.value?.orders || []
  const buckets = new Map()
  for (const order of orders) {
    const name = String(order.shopName || '').trim() || '未填店铺'
    let bucket = buckets.get(name)
    if (!bucket) {
      bucket = { name, count: 0 }
      buckets.set(name, bucket)
    }
    bucket.count += 1
  }
  const rows = [...buckets.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const max = rows[0]?.count || 0
  const parts = rows.map(row => {
    const exact = total ? (row.count * 100) / total : 0
    const base = Math.floor(exact)
    return { ...row, base, frac: exact - base }
  })
  let left = total ? 100 - parts.reduce((sum, part) => sum + part.base, 0) : 0
  ;[...parts].sort((leftPart, rightPart) => rightPart.frac - leftPart.frac).forEach(part => {
    if (left <= 0) return
    part.base += 1
    left -= 1
  })
  return parts.map(row => ({
    name: row.name,
    count: row.count,
    percent: row.base,
    width: max ? Math.max(8, Math.round((row.count * 100) / max)) : 0
  }))
})
const detailStory = computed(() => {
  const orders = detail.value?.orders || []
  if (!orders.length) return ''
  const gaps = detailGaps.value.map(item => item.days).sort((left, right) => left - right)
  const median = gaps.length ? gaps[Math.floor((gaps.length - 1) / 2)] : null
  const topBrand = topLabel(orders, 'brandName')
  const parts = [te('共 {0} 笔', [orders.length])]
  if (median != null) parts.push(te('相邻两单间隔中位数 {0} 天', [median]))
  parts.push(topBrand ? te('已入库商品里 {0} 出现最多', [topBrand]) : tr('商品还没有对上库存品牌'))
  return parts.join(' · ')
})
const shopGroups = computed(() => {
  const ebay = shops.value.filter(shop => shop.platform === 'EBAY')
  const whatnot = shops.value.filter(shop => shop.platform !== 'EBAY')
  return [
    ebay.length ? { label: 'eBay', platform: 'EBAY', shops: ebay } : null,
    whatnot.length ? { label: 'Whatnot', platform: 'SHOPIFY', shops: whatnot } : null
  ].filter(Boolean)
})
const showShopPie = computed(() => detail.value?.platform === 'EBAY' && shopPreference.value.length > 0)
const sameBrandPercent = computed(() => {
  const totalBuyers = insight.value?.brandedRepeatBuyers
  if (!totalBuyers) return null
  return percent(insight.value?.sameBrandBuyers, totalBuyers)
})
const insightMoney = computed(() => compactMoney(insight.value?.amounts))
const rangeText = computed(() => {
  if (activeTab.value === 'detail') {
    const [begin, end] = detailBounds.value
    if (!begin || !end) return tr('选择客户后，时间范围限定在该客户第一笔到最后一笔订单之间。')
    return te('该客户订单从 {0} 到 {1}，只能在这段里筛选。', [begin, end])
  }
  const current = insight.value
  if (!current) return tr('从 eBay 和 Whatnot 订单汇总买家。刷单不计入，两个平台的同一人不会自动合并。')
  return `eBay ${current.ebayFrom || '—'} – ${current.ebayTo || '—'} · Whatnot ${current.whatnotFrom || '—'} – ${current.whatnotTo || '—'}`
})
const pickerRange = computed({
  get() {
    return activeTab.value === 'detail' ? detailRange.value : dateRange.value
  },
  set(value) {
    const next = Array.isArray(value) ? value : []
    if (activeTab.value === 'detail') detailRange.value = next
    else dateRange.value = next
  }
})

function percent(part, whole) {
  const totalCount = Number(whole || 0)
  if (!totalCount) return 0
  return Math.round(Number(part || 0) * 100 / totalCount)
}

function formatCount(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString() : '0'
}

function contactLine(item) {
  return [item.buyerUsername, item.email, item.phone, item.recipientName].filter(Boolean).join(' · ') || item.shopNames || '—'
}

function isActive(item) {
  return activeKey.value === `${item.platform}:${item.buyerKey}`
}

function sequenceLabel(sequence) {
  return te('第{0}笔', [sequence])
}

function sourceText(order) {
  const platform = order?.platform === 'EBAY' ? 'eBay' : (order?.platform === 'SHOPIFY' ? 'Whatnot' : (order?.platform || ''))
  return [platform, order?.shopName].filter(Boolean).join(' · ') || '—'
}

function escapeTip(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]))
}

function usableSku(sku) {
  const text = String(sku || '').trim()
  if (!text || /^[-—–_.]+$/.test(text)) return ''
  return text
}

function productCode(product) {
  if (!product) return ''
  if (product.linked) return usableSku(product.skuCode) || usableSku(product.sellerSku) || product.productName || ''
  return product.productName || usableSku(product.sellerSku) || ''
}

function shortText(value, limit = 56) {
  const text = String(value || '').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1)}…`
}

function amountOrderTooltip(orders, params) {
  const row = Array.isArray(params) ? params[0] : params
  const order = orders[row?.dataIndex]
  if (!order) return ''
  const products = order.products || []
  const limit = 5
  const itemLines = products.slice(0, limit).map(product => {
    const brand = product.brandName || tr('未入库')
    const category = product.categoryName || tr('未入库')
    const name = shortText(product.productName)
    const code = productCode(product)
    const title = name && name !== code ? `<div style="color:#667085">${escapeTip(code)}</div>` : ''
    return `<div style="margin-top:6px">${escapeTip(tr('品牌'))} ${escapeTip(brand)} · ${escapeTip(tr('分类'))} ${escapeTip(category)}</div>${title}`
  })
  if (!products.length) {
    itemLines.push(`<div style="margin-top:6px">${escapeTip(tr('品牌'))} ${escapeTip(tr('未入库'))} · ${escapeTip(tr('分类'))} ${escapeTip(tr('未入库'))}</div>`)
  } else if (products.length > limit) {
    itemLines.push(`<div style="margin-top:4px;color:#98a2b3">${escapeTip(te('还有 {0} 件', [products.length - limit]))}</div>`)
  }
  return [
    `<div style="font-weight:700;margin-bottom:4px">${escapeTip(sequenceLabel(order.sequence))}${order.orderTime ? ` · ${escapeTip(order.orderTime)}` : ''}</div>`,
    `<div>${escapeTip(tr('订单金额'))} ${escapeTip(moneyText(order.currency, order.orderAmount))}</div>`,
    `<div>${escapeTip(tr('来源'))} ${escapeTip(sourceText(order))}</div>`,
    `<div>${escapeTip(tr('平台订单号'))} ${escapeTip(order.platformOrderId || '—')}</div>`,
    ...itemLines
  ].join('')
}

function applyAmountTooltip(option, orders) {
  option.tooltip = {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    appendToBody: true,
    extraCssText: 'max-width:420px;white-space:normal;line-height:1.55;',
    formatter: params => amountOrderTooltip(orders, params)
  }
  return option
}

function moneyText(currency, amount) {
  if (amount == null || amount === '') return '—'
  const number = Number(amount)
  const text = Number.isFinite(number)
    ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(amount)
  return currency ? `${currency} ${text}` : text
}

function compactMoney(amounts) {
  if (!amounts?.length) return '—'
  return amounts.map(item => {
    const number = Number(item.amount)
    const text = Number.isFinite(number) && Math.abs(number) >= 1000000
      ? `${(number / 1000000).toFixed(1)}M`
      : (Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(item.amount))
    return item.currency ? `${item.currency} ${text}` : text
  }).join(' + ')
}

function moneyList(amounts) {
  if (!amounts?.length) return '—'
  return amounts.map(item => moneyText(item.currency, item.amount)).join(' + ')
}

function formatQty(quantity) {
  if (quantity == null) return '—'
  const number = Number(quantity)
  return Number.isFinite(number) ? String(number) : String(quantity)
}

function labelsOf(points, dictionary) {
  return (points || []).map(point => tr(dictionary ? dictionary[point.name] || point.name : point.name))
}

function valuesOf(points) {
  return (points || []).map(point => Number(point.count || 0))
}

function axisStyle() {
  return { color: '#909399', fontSize: 13 }
}

function fill(from, to, horizontal) {
  return new echarts.graphic.LinearGradient(0, horizontal ? 0 : 1, horizontal ? 1 : 0, horizontal ? 0 : 0, [
    { offset: 0, color: from },
    { offset: 1, color: to }
  ])
}

function verticalOption(categories, values, color, seriesName, compact) {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: compact
      ? { left: 6, right: 6, top: 6, bottom: 6 }
      : { left: 4, right: 10, top: 12, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { show: !compact, lineStyle: { color: '#e7eaf0' } },
      axisLabel: compact
        ? { show: false }
        : { ...axisStyle(), interval: categories.length > 12 ? 2 : 0, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitLine: { show: !compact, lineStyle: { color: '#e4e7ed' } },
      axisLabel: compact ? { show: false } : axisStyle()
    },
    series: [{
      name: seriesName || tr('订单数'),
      type: 'bar',
      barMaxWidth: 18,
      data: values,
      itemStyle: { color, borderRadius: [4, 4, 0, 0] }
    }]
  }
}

function horizontalOption(categories, values, color, seriesName, compact) {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: compact
      ? { left: 6, right: 8, top: 6, bottom: 6 }
      : { left: 8, right: 16, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { show: !compact, lineStyle: { color: '#e4e7ed' } },
      axisLabel: compact ? { show: false } : axisStyle()
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: compact ? { show: false } : { ...axisStyle(), width: 128, overflow: 'truncate' }
    },
    series: [{
      name: seriesName || tr('订单数'),
      type: 'bar',
      barMaxWidth: 12,
      data: values,
      itemStyle: { color, borderRadius: [0, 4, 4, 0] }
    }]
  }
}

function audienceParts(points) {
  const fresh = []
  const repeats = []
  for (const point of points || []) {
    const total = Number(point.count || 0)
    const repeat = Math.min(total, Number(point.repeatCount || 0))
    repeats.push(repeat)
    fresh.push(Math.max(0, total - repeat))
  }
  return { fresh, repeats }
}

function audienceTooltip(params) {
  const rows = Array.isArray(params) ? params : [params]
  if (!rows.length) return ''
  const lines = rows.map(item => `${item.marker}${item.seriesName} ${formatCount(item.value)}`)
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0)
  if (rows.length > 1 && total > 0) {
    rows.forEach((item, index) => {
      lines[index] += `（${Math.round(Number(item.value || 0) * 100 / total)}%）`
    })
    lines.push(`${tr('合计')} ${formatCount(total)}`)
  }
  return [rows[0].axisValueLabel || rows[0].name || '', ...lines].join('<br/>')
}

function stackedOption(categories, fresh, repeats, horizontal, compact, mode, colors, labelInterval) {
  const showNew = mode !== 'repeat'
  const showRepeat = mode !== 'new'
  const stacked = showNew && showRepeat
  const series = []
  if (showNew) {
    series.push({
      name: tr('新客'),
      type: 'bar',
      stack: 'audience',
      barMaxWidth: compact ? 10 : 16,
      data: fresh,
      itemStyle: { color: colors[0] }
    })
  }
  if (showRepeat) {
    series.push({
      name: tr('回头客'),
      type: 'bar',
      stack: 'audience',
      barMaxWidth: compact ? 10 : 16,
      data: repeats,
      itemStyle: { color: colors[1] }
    })
  }
  const categoryAxis = {
    type: 'category',
    data: categories,
    inverse: horizontal,
    axisTick: { show: false },
    axisLine: { show: !compact && !horizontal, lineStyle: { color: '#e7eaf0' } },
    axisLabel: compact ? { show: false } : (horizontal
      ? { ...axisStyle(), width: 128, overflow: 'truncate' }
      : { ...axisStyle(), interval: labelInterval != null ? labelInterval : (categories.length > 12 ? 2 : 0), rotate: 0, hideOverlap: labelInterval == null })
  }
  const valueAxis = {
    type: 'value',
    splitLine: { show: !compact, lineStyle: { color: '#e4e7ed' } },
    axisLabel: compact ? { show: false } : axisStyle()
  }
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: audienceTooltip },
    legend: (!compact && stacked) ? { top: 0, right: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: '#303133', fontSize: 13 } } : undefined,
    grid: compact
      ? { left: 6, right: 6, top: 6, bottom: 6 }
      : horizontal
        ? { left: 8, right: 16, top: stacked ? 22 : 8, bottom: 4, containLabel: true }
        : { left: 4, right: 12, top: stacked ? 28 : 12, bottom: 4, containLabel: true },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series
  }
}

function draw(key, el, option) {
  if (!el) return
  let chart = charts[key]
  if (!chart || chart.isDisposed() || chart.getDom() !== el) {
    chart?.dispose()
    chart = echarts.init(el)
    charts[key] = chart
  }
  chart.setOption(option, true)
  chart.resize()
}

function clearDetailCharts() {
  ['detailAmount', 'detailBrand', 'detailGap', 'tasteBrand', 'tasteCategory', 'tasteBand'].forEach(key => {
    charts[key]?.dispose()
    delete charts[key]
  })
}

function pieRows(items) {
  const label = name => (name === '未知' || name === '其他') ? tr(name) : name
  return items.map(item => ({
    name: label(item.name),
    value: item.count,
    itemStyle: item.name === '未知' ? { color: '#d0d5dd' } : (item.name === '其他' ? { color: '#98a2b3' } : undefined)
  }))
}

function percentMap(rows) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const map = {}
  if (!total) return map
  const parts = rows.map(row => {
    const exact = row.value * 100 / total
    const base = Math.floor(exact)
    return { name: row.name, base, frac: exact - base }
  })
  let left = 100 - parts.reduce((sum, part) => sum + part.base, 0)
  ;[...parts].sort((leftPart, rightPart) => rightPart.frac - leftPart.frac).forEach(part => {
    if (left <= 0) return
    part.base += 1
    left -= 1
  })
  parts.forEach(part => {
    map[part.name] = part.base
  })
  return map
}

function pieOption(rows) {
  const shares = percentMap(rows)
  return {
    tooltip: {
      trigger: 'item',
      formatter: params => `${params.name}<br/>${formatCount(params.value)}（${shares[params.name] ?? 0}%）`
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 8,
      bottom: 8,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      data: rows.map(row => row.name),
      formatter: name => shares[name] == null ? name : `${name}  ${shares[name]}%`,
      textStyle: { fontSize: 13, color: '#303133', width: 140, overflow: 'break' }
    },
    series: [{
      type: 'pie',
      radius: ['32%', '52%'],
      center: ['32%', '50%'],
      data: rows,
      label: { show: false }
    }]
  }
}

function bindTastePie(chart, rows) {
  if (!chart) return
  const selected = Object.fromEntries(rows.map(row => [row.name, true]))
  const paint = () => {
    const visible = rows.filter(row => selected[row.name] !== false)
    const shares = percentMap(visible)
    chart.setOption({
      legend: {
        formatter: name => shares[name] == null ? name : `${name}  ${shares[name]}%`
      },
      tooltip: {
        formatter: params => `${params.name}<br/>${formatCount(params.value)}（${shares[params.name] ?? 0}%）`
      }
    })
  }
  chart.off('legendselectchanged')
  chart.on('legendselectchanged', event => {
    rows.forEach(row => {
      selected[row.name] = event.selected[row.name] !== false
    })
    paint()
  })
}

function pointLabel(name) {
  return tr(POINT_LABELS[name] || name)
}

function hourText(name) {
  const hour = Number(name)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || String(hour) !== String(name)) return pointLabel(name)
  return te('{0}时', [hour])
}

function axisPointLabel(axis, name) {
  return axis === 'hour' ? hourText(name) : pointLabel(name)
}

function renderCustom() {
  const payload = customData.value
  if (!customEl.value || !payload?.series?.length) return
  const categories = (payload.series[0].points || []).map(point => axisPointLabel(customX.value, point.name))
  const hourAxis = customX.value === 'hour'
  const palette = ['#409EFF', '#13c2c2', '#67C23A', '#1677ff', '#98a2b3']
  const measure = payload.measure || customMetric.value
  const percentMetric = measure === 'repeatRate' || measure === 'mix'
  const stacked = measure === 'mix' && payload.series.length > 1
  const series = payload.series.map((item, index) => ({
    name: axisPointLabel(customSeries.value, item.name),
    type: 'bar',
    stack: stacked ? 'mix' : undefined,
    barMaxWidth: stacked ? 36 : 18,
    data: (item.points || []).map(point => Number(point.value || 0)),
    itemStyle: { color: palette[index % palette.length], borderRadius: stacked ? 0 : [4, 4, 0, 0] }
  }))
  draw('custom', customEl.value, {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: percentMetric ? value => `${value}%` : undefined
    },
    legend: series.length > 1 ? { top: 0, right: 8, itemWidth: 10, itemHeight: 8, textStyle: { color: '#303133', fontSize: 13 } } : undefined,
    grid: { left: 8, right: 12, top: series.length > 1 ? 28 : 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false, alignWithLabel: true },
      axisLine: { lineStyle: { color: '#e7eaf0' } },
      axisLabel: hourAxis
        ? { ...axisStyle(), interval: 0, rotate: 0, hideOverlap: false }
        : { ...axisStyle(), interval: categories.length > 12 ? 2 : 0, rotate: categories.length > 8 ? 28 : 0, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#e4e7ed' } },
      max: percentMetric ? 100 : undefined,
      axisLabel: { ...axisStyle(), formatter: percentMetric ? '{value}%' : undefined }
    },
    series
  })
}

function dayGap(previous, next) {
  const start = Date.parse(String(previous || '').replace(/-/g, '/'))
  const end = Date.parse(String(next || '').replace(/-/g, '/'))
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.max(0, Math.round((end - start) / 86400000))
}

function gapsBetween(orders) {
  const gaps = []
  for (let index = 1; index < orders.length; index += 1) {
    const days = dayGap(orders[index - 1].orderTime, orders[index].orderTime)
    if (days == null) continue
    gaps.push({
      label: `${sequenceLabel(orders[index - 1].sequence)}→${sequenceLabel(orders[index].sequence)}`,
      days
    })
  }
  return gaps
}

function topLabel(orders, field) {
  const ranked = countNamed(orders, field).filter(item => item.name && item.name !== '未入库')
  return ranked[0]?.name || ''
}

function tasteNamed(orders, field) {
  const counts = new Map()
  for (const order of orders) {
    for (const product of order.products || []) {
      const raw = String(product[field] || '').trim()
      const name = !raw || raw === '未入库' ? '未知' : raw
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }
  const unknown = counts.get('未知') || 0
  counts.delete('未知')
  const ranked = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
  const shown = ranked.slice(0, 6)
  const rest = ranked.slice(6).reduce((sum, item) => sum + item.count, 0)
  if (rest) shown.push({ name: '其他', count: rest })
  if (unknown) shown.push({ name: '未知', count: unknown })
  return shown
}

function countNamed(orders, field, limit = 6) {
  const counts = new Map()
  for (const order of orders) {
    for (const product of order.products || []) {
      const name = product[field] || '未入库'
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
}

function scheduleDetailCharts() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const paint = () => {
        renderDetailCharts()
        renderShopPie()
        resizeCharts()
      }
      const host = detailAmountEl.value
      if (detail.value?.repeatCustomer && activeTab.value === 'detail' && host && host.clientWidth === 0) {
        requestAnimationFrame(paint)
        return
      }
      paint()
    })
  })
}

function renderShopPie(retry = true) {
  const el = shopPieEl.value
  if (!showShopPie.value || !el) {
    charts.shopPie?.dispose()
    delete charts.shopPie
    return
  }
  if (el.clientWidth === 0 && retry) {
    requestAnimationFrame(() => renderShopPie(false))
    return
  }
  const rows = shopPreference.value.map((row, index) => ({
    name: row.name === '未填店铺' ? tr('未填店铺') : row.name,
    value: row.count,
    itemStyle: row.name === '未填店铺'
      ? { color: '#d0d5dd' }
      : { color: SHOP_COLORS[index % SHOP_COLORS.length] }
  }))
  const shares = percentMap(rows)
  draw('shopPie', el, {
    tooltip: {
      trigger: 'item',
      formatter: params => `${params.name}<br/>${formatCount(params.value)}（${shares[params.name] ?? 0}%）`
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 10,
      formatter: name => `${name}  ${shares[name] ?? 0}%`,
      textStyle: { fontSize: 13, color: '#303133' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '62%'],
      center: ['26%', '52%'],
      data: rows,
      label: { show: false }
    }]
  })
  bindTastePie(charts.shopPie, rows)
}

function visibleExtra(group) {
  return extraOpen.value ? group.items : group.items.slice(0, extraLimit)
}

function percentile(sorted, ratio) {
  if (!sorted.length) return null
  const index = Math.round((sorted.length - 1) * ratio)
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))]
}

function numberStats(values) {
  const sorted = values.map(Number).filter(value => Number.isFinite(value)).sort((left, right) => left - right)
  if (!sorted.length) return null
  const sum = sorted.reduce((total, value) => total + value, 0)
  return {
    count: sorted.length,
    avg: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75)
  }
}

function detailCurrency() {
  return (detail.value?.orders || []).find(order => order.currency)?.currency || ''
}

function dayText(value) {
  if (value == null) return '—'
  const rounded = Math.round(value * 10) / 10
  return te('{0} 天', [Number.isInteger(rounded) ? rounded : rounded.toFixed(1)])
}

const detailZoomTitle = computed(() => {
  if (detailZoomKind.value === 'amount') return tr('每一笔的金额')
  if (detailZoomKind.value === 'brand') return tr('买过的品牌')
  if (detailZoomKind.value === 'gap') return tr('相邻两单间隔')
  return ''
})

const detailZoomStats = computed(() => {
  const orders = detail.value?.orders || []
  if (detailZoomKind.value === 'amount') {
    const stats = numberStats(orders.map(order => Number(order.orderAmount || 0)))
    if (!stats) return []
    const currency = detailCurrency()
    return [
      { label: tr('订单数'), value: formatCount(stats.count) },
      { label: tr('平均'), value: moneyText(currency, stats.avg) },
      { label: tr('中位数'), value: moneyText(currency, stats.p50) },
      { label: tr('25%分位'), value: moneyText(currency, stats.p25) },
      { label: tr('75%分位'), value: moneyText(currency, stats.p75) },
      { label: tr('最低'), value: moneyText(currency, stats.min) },
      { label: tr('最高'), value: moneyText(currency, stats.max) }
    ]
  }
  if (detailZoomKind.value === 'gap') {
    const stats = numberStats(detailGaps.value.map(item => item.days))
    if (!stats) return []
    return [
      { label: tr('间隔数'), value: formatCount(stats.count) },
      { label: tr('平均'), value: dayText(stats.avg) },
      { label: tr('25%分位'), value: dayText(stats.p25) },
      { label: tr('中位数'), value: dayText(stats.p50) },
      { label: tr('75%分位'), value: dayText(stats.p75) }
    ]
  }
  if (detailZoomKind.value === 'brand') {
    const ranked = countNamed(orders, 'brandName', 200)
    const matched = ranked.filter(item => item.name !== '未入库')
    const total = ranked.reduce((sum, item) => sum + item.count, 0)
    return [
      { label: tr('商品数'), value: formatCount(total) },
      { label: tr('已入库'), value: formatCount(matched.reduce((sum, item) => sum + item.count, 0)) },
      { label: tr('出现最多'), value: matched[0] ? `${matched[0].name} · ${matched[0].count}` : tr('商品还没有对上库存品牌') }
    ]
  }
  return []
})

function thinLabels(option, count) {
  if (count > 16 && option.xAxis?.axisLabel) {
    option.xAxis.axisLabel = {
      ...option.xAxis.axisLabel,
      interval: Math.ceil(count / 8) - 1,
      hideOverlap: true
    }
  }
  return option
}

function openDetailZoom(kind) {
  if (kind === 'gap' && !detailGaps.value.length) return
  detailZoomKind.value = kind
  detailZoomOpen.value = true
}

function disposeDetailZoom() {
  charts.detailZoom?.dispose()
  delete charts.detailZoom
}

function renderDetailZoom(retry = true) {
  const el = detailZoomEl.value
  if (!el || !detailZoomKind.value) return
  if (el.clientWidth === 0 && retry) {
    requestAnimationFrame(() => renderDetailZoom(false))
    return
  }
  const sourceOrders = detail.value?.orders || []
  const orders = detailZoomKind.value === 'amount' ? shownOrders.value : sourceOrders
  if (detailZoomKind.value === 'brand') {
    const brands = countNamed(orders, 'brandName', 12)
    draw('detailZoom', el, horizontalOption(
      brands.map(item => item.name),
      brands.map(item => item.count),
      fill('#409EFF', '#79bbff', true),
      tr('商品数')
    ))
    return
  }
  const gaps = detailGaps.value
  const categories = detailZoomKind.value === 'amount'
    ? orders.map(order => sequenceLabel(order.sequence))
    : gaps.map(item => item.label)
  const values = detailZoomKind.value === 'amount'
    ? orders.map(order => Number(order.orderAmount || 0))
    : gaps.map(item => item.days)
  const option = verticalOption(
    categories,
    values,
    detailZoomKind.value === 'amount' ? fill('#79bbff', '#409EFF', false) : fill('#5cdbd3', '#13c2c2', false),
    detailZoomKind.value === 'amount' ? tr('订单金额') : tr('天数')
  )
  const gapChart = detailZoomKind.value === 'gap'
  if (gapChart) {
    const sameDay = values.filter(value => Number(value) === 0).length
    option.grid.top = 36
    option.series[0].barMinHeight = 3
    option.series[0].data = values.map(value => ({
      value,
      itemStyle: Number(value) === 0 ? { color: '#d0d5dd' } : undefined
    }))
    option.tooltip.valueFormatter = value => Number(value) === 0 ? tr('同一天') : te('{0} 天', [value])
    option.graphic = [{
      type: 'text',
      right: 8,
      top: 0,
      style: {
        text: te('灰色是 0 天：相邻两笔在同一天内下单，共 {0} 段', [sameDay]),
        fill: '#606266',
        font: '13px sans-serif',
        textAlign: 'right'
      }
    }]
  }
  if (detailZoomKind.value === 'amount') {
    applyAmountTooltip(option, orders)
  }
  if (categories.length > 24) {
    const tone = gapChart
      ? { line: '#08979c', area: 'rgba(19, 194, 194, 0.16)', fill: 'rgba(19, 194, 194, 0.08)' }
      : { line: '#1677ff', area: 'rgba(64, 158, 255, 0.16)', fill: 'rgba(64, 158, 255, 0.08)' }
    option.grid.bottom = 86
    option.dataZoom = [{
      type: 'slider',
      height: 44,
      bottom: 8,
      start: 0,
      end: Math.min(100, Math.round(24 / categories.length * 100)),
      brushSelect: false,
      backgroundColor: '#fff',
      borderColor: '#e7ebf3',
      fillerColor: tone.fill,
      dataBackground: {
        lineStyle: { color: tone.line, width: 1.5, opacity: 0.45 },
        areaStyle: { color: tone.area, opacity: 1 }
      },
      selectedDataBackground: {
        lineStyle: { color: tone.line, width: 2.5, opacity: 1 },
        areaStyle: { color: tone.area, opacity: 1 }
      },
      handleSize: '70%',
      handleStyle: { color: '#fff', borderColor: tone.line, borderWidth: 1 },
      moveHandleStyle: { color: tone.line, opacity: 0.35 },
      textStyle: { color: '#606266', fontSize: 13 }
    }]
    option.xAxis.axisLabel = { ...option.xAxis.axisLabel, interval: 0, hideOverlap: true, rotate: 28 }
  }
  draw('detailZoom', el, option)
}

function renderDetailCharts() {
  const orders = detail.value?.orders || []
  if (activeTab.value !== 'detail' || !detail.value?.repeatCustomer || orders.length < 2) {
    clearDetailCharts()
    return
  }
  const sequenced = shownOrders.value
  draw('detailAmount', detailAmountEl.value, applyAmountTooltip(thinLabels(verticalOption(
    sequenced.map(order => sequenceLabel(order.sequence)),
    sequenced.map(order => Number(order.orderAmount || 0)),
    fill('#79bbff', '#409EFF', false),
    tr('订单金额')
  ), sequenced.length), sequenced))
  const brands = countNamed(orders, 'brandName')
  draw('detailBrand', detailBrandEl.value, horizontalOption(
    brands.map(item => item.name),
    brands.map(item => item.count),
    fill('#409EFF', '#79bbff', true),
    tr('商品数')
  ))
  const gaps = detailGaps.value
  if (gaps.length) {
    draw('detailGap', detailGapEl.value, thinLabels(verticalOption(
      gaps.map(item => item.label),
      gaps.map(item => item.days),
      fill('#5cdbd3', '#13c2c2', false),
      tr('天数')
    ), gaps.length))
  }
  renderTasteCharts()
}

function renderTasteCharts() {
  if (!tasteOpen.value || !detail.value?.repeatCustomer) return
  const view = tasteView.value
  if (view.brands.length) {
    const rows = pieRows(view.brands)
    draw('tasteBrand', tasteBrandEl.value, pieOption(rows))
    bindTastePie(charts.tasteBrand, rows)
  }
  if (view.categories.length) {
    const rows = pieRows(view.categories)
    draw('tasteCategory', tasteCategoryEl.value, pieOption(rows))
    bindTastePie(charts.tasteCategory, rows)
  }
  const option = verticalOption(
    view.bands.map(item => item.name),
    view.bands.map(item => item.count),
    fill('#ffd591', '#fa8c16', false),
    tr('订单数')
  )
  option.grid = { left: 4, right: 64, top: 28, bottom: 4, containLabel: true }
  option.xAxis.name = tr('金额档')
  option.xAxis.nameLocation = 'end'
  option.xAxis.nameGap = 12
  option.xAxis.nameTextStyle = { color: '#909399', fontSize: 13, fontWeight: 600 }
  option.xAxis.axisLabel = { ...axisStyle(), interval: 0, rotate: 0, hideOverlap: false }
  option.yAxis.name = tr('订单数')
  option.yAxis.nameLocation = 'end'
  option.yAxis.nameGap = 8
  option.yAxis.nameTextStyle = { color: '#909399', fontSize: 13, fontWeight: 600, align: 'left', padding: [0, 0, 0, 4] }
  option.yAxis.axisLabel = { ...axisStyle(), margin: 8 }
  draw('tasteBand', tasteBandEl.value, option)
}

function toggleTaste() {
  tasteOpen.value = !tasteOpen.value
  if (!tasteOpen.value) return
  nextTick(() => requestAnimationFrame(() => {
    renderTasteCharts()
    resizeCharts()
  }))
}

function focusChart(id) {
  if (focusId.value === id) return
  focusId.value = id
  nextTick(() => requestAnimationFrame(() => renderCharts()))
}

function clearFocus() {
  focusId.value = ''
  nextTick(() => requestAnimationFrame(() => renderCharts()))
}

function setSplit(id, mode) {
  chartSplit[id] = mode
  nextTick(() => requestAnimationFrame(() => renderCharts()))
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10
}

function gapBetweenOrders(from, to, current) {
  const start = Math.round(Number(from) || 1)
  const end = Math.round(Number(to) || 2)
  if (!current || start === 1 && end === 2) {
    const points = current?.repeatGaps || []
    const count = points.reduce((sum, item) => sum + Number(item.count || 0), 0)
    return {
      from: 1,
      to: 2,
      count,
      median: current?.medianGapDays ?? null,
      average: current?.averageGapDays ?? null,
      points
    }
  }
  const days = []
  for (const line of current.repeatTimelines || []) {
    if (!line || line.length < end) continue
    const left = line[start - 1]
    const right = line[end - 1]
    if (left == null || right == null) continue
    const gap = (Number(right) - Number(left)) / 1440
    if (gap >= 0) days.push(gap)
  }
  days.sort((left, right) => left - right)
  const buckets = [0, 0, 0, 0, 0]
  for (const day of days) {
    if (day < 7) buckets[0]++
    else if (day < 30) buckets[1]++
    else if (day < 90) buckets[2]++
    else if (day < 180) buckets[3]++
    else buckets[4]++
  }
  const names = ['d0', 'd7', 'd30', 'd90', 'd180']
  const median = days.length ? days[Math.max(0, Math.min(days.length - 1, Math.round((days.length - 1) * 0.5)))] : null
  const average = days.length ? days.reduce((sum, day) => sum + day, 0) / days.length : null
  return {
    from: start,
    to: end,
    count: days.length,
    median: median == null ? null : round1(median),
    average: average == null ? null : round1(average),
    points: names.map((name, index) => ({ name, count: buckets[index] }))
  }
}

function clampGapRange() {
  let from = Math.round(Number(gapFrom.value) || 1)
  let to = Math.round(Number(gapTo.value) || 2)
  const max = gapMax.value
  if (to > max) to = max
  if (to < 2) to = 2
  if (from < 1) from = 1
  if (from >= to) from = to - 1
  gapFrom.value = from
  gapTo.value = to
  nextTick(() => requestAnimationFrame(() => renderCharts()))
}

function setOrderSort(mode) {
  if (orderSort.value === mode) return
  orderSort.value = mode
  nextTick(() => {
    renderDetailCharts()
    if (detailZoomOpen.value && detailZoomKind.value === 'amount') renderDetailZoom()
  })
}

function renderCharts() {
  const current = insight.value
  if (!current) return
  const mini = id => Boolean(focusId.value) && focusId.value !== id
  const hours = audienceParts(current.hours)
  const weekdays = audienceParts(current.weekdays)
  const brands = audienceParts(current.brands)
  const categories = audienceParts(current.categories)
  draw('hour', hourEl.value, stackedOption((current.hours || []).map(item => hourText(item.name)), hours.fresh, hours.repeats, false, mini('hour'), chartSplit.hour, ['#91caff', '#409EFF'], focusId.value === 'hour' ? 0 : 1))
  draw('weekday', weekdayEl.value, stackedOption(labelsOf(current.weekdays, WEEKDAYS), weekdays.fresh, weekdays.repeats, false, mini('weekday'), chartSplit.weekday, ['#87e8de', '#13c2c2']))
  const gapPoints = focusId.value === 'gap' ? gapSelection.value.points : (current.repeatGaps || [])
  draw('gap', gapEl.value, verticalOption(labelsOf(gapPoints, GAPS), valuesOf(gapPoints), fill('#91caff', '#1677ff', false), tr('客户数'), mini('gap')))
  draw('band', bandEl.value, verticalOption(labelsOf(current.orderBands, BANDS), valuesOf(current.orderBands), fill('#b3e19d', '#67C23A', false), undefined, mini('band')))
  draw('brand', brandEl.value, stackedOption((current.brands || []).map(item => item.name), brands.fresh, brands.repeats, true, mini('brand'), chartSplit.brand, ['#91caff', '#1677ff']))
  draw('category', categoryEl.value, stackedOption((current.categories || []).map(item => item.name), categories.fresh, categories.repeats, true, mini('category'), chartSplit.category, ['#87e8de', '#08979c']))
}

function resizeCharts() {
  Object.values(charts).forEach(chart => chart?.resize())
}

function toggleMethod() {
  methodOpen.value = !methodOpen.value
  nextTick(() => requestAnimationFrame(() => resizeCharts()))
}

function search() {
  query.pageNum = 1
  loadList()
}

function reset() {
  query.keyword = ''
  query.platform = ''
  query.repeatOnly = false
  query.sort = 'time'
  search()
}

async function loadList() {
  loading.value = true
  try {
    const data = await listCrmCustomers({
      keyword: query.keyword?.trim() || undefined,
      platform: query.platform || undefined,
      repeatOnly: query.repeatOnly || undefined,
      sort: query.sort === 'orders' ? 'orders' : undefined,
      pageNum: query.pageNum,
      pageSize: query.pageSize
    })
    customers.value = data.rows || []
    total.value = data.total || 0
  } catch (error) {
    customers.value = []
    total.value = 0
    ElMessage.error(tr('加载客户失败'))
  } finally {
    loading.value = false
  }
}

function periodParams() {
  const range = dateRange.value
  if (!Array.isArray(range) || !range[0] || !range[1]) return {}
  return { beginDate: range[0], endDate: range[1] }
}

function platformValue(platform) {
  return `platform:${platform}`
}

function shopValue(shop) {
  return `shop:${shop.platform}::${shop.shopName}`
}

function sameKeys(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function normalizeShopSelection(previous, values) {
  const added = values.filter(item => !previous.includes(item))
  let next = [...values]
  for (const group of shopGroups.value) {
    if (group.shops.length < 2) continue
    const platformKey = platformValue(group.platform)
    const members = group.shops.map(shop => shopValue(shop))
    if (added.includes(platformKey)) {
      next = next.filter(item => !members.includes(item))
    } else if (added.some(item => members.includes(item))) {
      next = next.filter(item => item !== platformKey)
    }
    if (members.length && members.every(item => next.includes(item))) {
      next = [...next.filter(item => !members.includes(item)), platformKey]
    }
  }
  return next
}

function onShopChange(values) {
  const incoming = Array.isArray(values) ? values : []
  const next = normalizeShopSelection(appliedShopKeys, incoming)
  const changed = !sameKeys(next, appliedShopKeys)
  appliedShopKeys = next
  if (!sameKeys(next, shopKeys.value)) shopKeys.value = next
  if (changed) loadInsights()
}

function insightParams() {
  const period = periodParams()
  const scopes = shopKeys.value.map(value => {
    if (value.startsWith('platform:')) return value.slice('platform:'.length)
    if (value.startsWith('shop:')) return value.slice('shop:'.length)
    return ''
  }).filter(Boolean)
  if (!scopes.length) return period
  return { ...period, scopes }
}

async function loadShops() {
  try {
    const res = await getCrmShops(periodParams())
    shops.value = res.data || []
  } catch (error) {
    shops.value = []
  }
}

function dayOf(time) {
  return String(time || '').slice(0, 10)
}

function disabledPeriodDate(date) {
  if (activeTab.value !== 'detail') return false
  const [begin, end] = detailBounds.value
  if (!begin || !end) return false
  const day = dayOf(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
  return day < begin || day > end
}

function sumAmounts(orders) {
  const totals = new Map()
  for (const order of orders) {
    if (order.orderAmount == null || !order.currency) continue
    totals.set(order.currency, (totals.get(order.currency) || 0) + Number(order.orderAmount))
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }))
}

function applyDetailView() {
  const source = detailSource.value
  if (!source) {
    detail.value = null
    return
  }
  const [minDay, maxDay] = detailBounds.value
  let [begin, end] = detailRange.value || []
  if (!begin || !end) {
    begin = minDay
    end = maxDay
  }
  if (begin && end && begin > end) [begin, end] = [end, begin]
  if (minDay && begin < minDay) begin = minDay
  if (maxDay && end > maxDay) end = maxDay
  detailRange.value = begin && end ? [begin, end] : []
  const orders = (source.orders || []).filter(order => {
    const day = dayOf(order.orderTime)
    if (!day || !begin || !end) return true
    return day >= begin && day <= end
  })
  detail.value = {
    ...source,
    orders,
    orderCount: orders.length,
    repeatCustomer: orders.length > 1,
    firstOrderTime: orders[0]?.orderTime || null,
    lastOrderTime: orders[orders.length - 1]?.orderTime || null,
    amounts: sumAmounts(orders)
  }
}

async function applyPeriod() {
  if (activeTab.value === 'detail') {
    applyDetailView()
    scheduleDetailCharts()
    return
  }
  await loadShops()
  const allowed = new Set()
  shopGroups.value.forEach(group => {
    if (group.shops.length > 1) allowed.add(platformValue(group.platform))
    group.shops.forEach(shop => allowed.add(shopValue(shop)))
  })
  const next = shopKeys.value.filter(item => allowed.has(item))
  if (!sameKeys(next, shopKeys.value)) {
    shopKeys.value = next
    appliedShopKeys = next
  }
  loadInsights()
}

async function loadInsights() {
  insightLoading.value = true
  try {
    const res = await getCrmInsights(insightParams())
    insight.value = res.data || null
    await nextTick()
    renderCharts()
    resizeCharts()
    loadCustom()
  } catch (error) {
    ElMessage.error(tr('加载洞察失败'))
  } finally {
    insightLoading.value = false
  }
}

async function loadCustom() {
  if (customSeries.value === customX.value) customSeries.value = ''
  customLoading.value = true
  try {
    const res = await getCrmCustom({
      ...insightParams(),
      x: customX.value,
      series: customSeries.value || undefined,
      metric: customMetric.value
    })
    customData.value = res.data || null
    await nextTick()
    renderCustom()
    resizeCharts()
  } catch (error) {
    ElMessage.error(tr('加载自定义分析失败'))
  } finally {
    customLoading.value = false
  }
}

async function openCustomer(item) {
  activeKey.value = `${item.platform}:${item.buyerKey}`
  detailLoading.value = true
  try {
    const res = await getCrmCustomer(item.platform, item.buyerKey)
    const next = res.data || {}
    next.orders = (next.orders || []).map(order => ({
      ...order,
      products: (order.products || []).map(product => ({ ...product, open: false }))
    }))
    extraOpen.value = false
    tasteOpen.value = false
    skuMatch.value = 'all'
    detailSource.value = next
    const begin = dayOf(next.orders[0]?.orderTime || next.firstOrderTime)
    const end = dayOf(next.orders[next.orders.length - 1]?.orderTime || next.lastOrderTime)
    detailBounds.value = begin && end ? [begin, end] : []
    detailRange.value = detailBounds.value.slice()
    applyDetailView()
  } catch (error) {
    detail.value = null
    detailSource.value = null
    detailBounds.value = []
    detailRange.value = []
    const message = String(error?.message || '')
    if (!message.includes('客户不存在')) ElMessage.error(tr('加载客户详情失败'))
  } finally {
    detailLoading.value = false
    scheduleDetailCharts()
  }
}

function openInPage(to) {
  router.push(to).catch(() => {})
}

function openOrder(order) {
  if (!order?.platformOrderId) return
  openInPage({
    name: 'PlatformOrders',
    query: { platformOrderId: order.platformOrderId }
  })
}

function openItem(product) {
  if (!product.linked || !product.skuCode) return
  openInPage({ name: 'Item', query: { skuCode: product.skuCode } })
}

watch(() => settingsStore.language, () => {
  renderCharts()
  renderCustom()
  scheduleDetailCharts()
})
watch(activeTab, () => nextTick(() => {
  renderCharts()
  renderCustom()
  scheduleDetailCharts()
  resizeCharts()
}))
onMounted(() => {
  if (props.section === 'detail') loadList()
  else {
    loadShops()
    loadInsights()
  }
  window.addEventListener('resize', resizeCharts)
})
onActivated(() => nextTick(() => {
  renderCharts()
  resizeCharts()
}))
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  Object.values(charts).forEach(chart => chart?.dispose())
})
</script>

<style scoped>
.crm-page {
  height: calc(100vh - 84px);
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
  overflow: hidden;
  background: transparent;
  color: #303133;
  font-size: 14px;
}
.crm-page.is-analysis {
  grid-template-columns: minmax(0, 1fr);
}
.crm-page.is-detail .crm-tabs :deep(.el-tabs__header) {
  display: none;
}
.crm-side {
  order: 1;
  align-self: stretch;
  height: 100%;
}
.crm-main {
  order: 2;
  align-self: stretch;
  height: 100%;
}
.crm-main,
.crm-pane {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.crm-side {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.crm-main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 12px 12px;
  overflow: hidden;
}
.crm-period {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 4px 8px;
}
.crm-period label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 13px;
}
.crm-period :deep(.el-date-editor) {
  width: 260px;
}
.crm-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.crm-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
.crm-tabs :deep(.el-tabs__content) {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.crm-tabs :deep(.el-tab-pane) {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.crm-analysis {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.crm-analysis.is-method-open {
  overflow: auto;
}
.crm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.crm-shop {
  width: 320px;
  flex: none;
}
.crm-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}
.crm-method {
  flex: none;
  margin: 6px 0 0;
}
.crm-method__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #303133;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
}
.crm-method__toggle em {
  color: #606266;
  font-style: normal;
  font-weight: 600;
}
.crm-method__card {
  margin-top: 6px;
  padding: 8px 12px 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.crm-method__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.crm-method__tabs button {
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.crm-method__tabs button.is-on {
  border-color: #d9ecff;
  background: #ecf5ff;
  color: #1677ff;
  font-weight: 600;
}
.crm-method__body {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}
.crm-method__body p {
  margin: 0 0 6px;
}
.crm-method__body p:last-child {
  margin-bottom: 0;
}
.crm-analysis.is-method-open .crm-stage {
  flex: none;
  height: 720px;
}
.crm-analysis.is-method-open .crm-stage.is-focus {
  height: 640px;
}
.crm-stat {
  min-width: 0;
  padding: 2px 8px;
}
.crm-stat span,
.crm-range,
.muted {
  color: #606266;
  font-size: 13px;
  font-style: normal;
}
.crm-stat strong {
  display: block;
  margin-top: 2px;
  color: #1d2433;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 650;
}
.crm-stat strong small {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 600;
}
.crm-stat em,
.crm-stat .is-money {
  display: block;
  margin-top: 2px;
  color: #606266;
  font-size: 13px;
  font-style: normal;
  font-weight: 500;
}
.crm-stat .is-money {
  font-size: 20px;
  color: #1d2433;
  font-weight: 650;
}
.crm-range {
  margin: 0;
  text-align: right;
}
.crm-stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(0, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.crm-stage.is-focus {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr) 108px;
}
.crm-stage.is-focus .crm-chart.is-focus {
  grid-column: 1 / -1;
  grid-row: 1;
}
.crm-stage.is-focus .crm-chart.is-mini {
  grid-row: 2;
}
.crm-chart {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 6px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  cursor: pointer;
}
.crm-chart.is-focus {
  background: #fff;
  border-color: #d9ecff;
  cursor: default;
}
.crm-chart.is-mini header em,
.crm-chart.is-mini .crm-custom__controls {
  display: none;
}
.crm-focus {
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #606266;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
}
.crm-split {
  display: flex;
  flex: none;
  gap: 6px;
  margin: 2px 0 6px;
}
.crm-split button {
  padding: 3px 10px;
  border: 1px solid #d0d5dd;
  border-radius: 999px;
  background: #fff;
  color: #606266;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
}
.crm-split button.is-on {
  border-color: #1677ff;
  background: #ecf5ff;
  color: #1677ff;
  font-weight: 600;
}
.crm-gap-range {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 2px 8px;
  color: #606266;
  font-size: 14px;
}
.crm-gap-range :deep(.el-input-number) {
  width: 108px;
}
.crm-custom__controls {
  display: flex;
  flex: none;
  gap: 6px;
}
.crm-custom__controls :deep(.el-select) {
  width: 128px;
}
.crm-chart header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
.crm-chart header span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crm-chart--custom header {
  flex-wrap: wrap;
}
.crm-chart header em {
  flex: none;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #606266;
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
.crm-chart__canvas {
  flex: 1;
  min-height: 0;
}
.crm-pane.crm-detail {
  height: 100%;
  overflow: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.crm-detail .crm-orders {
  flex: none;
  overflow: visible;
}
.crm-story {
  margin: 0 14px 10px;
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}
.crm-profile__body {
  min-width: 0;
}
.crm-profile__pie {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
}
.crm-profile__pie > span {
  flex: none;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
.crm-profile__canvas {
  flex: 1;
  min-height: 0;
}
.crm-detail-charts {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: 10px;
  height: 256px;
  margin: 0 14px 12px;
  flex: none;
}
.crm-detail-charts .crm-chart {
  cursor: pointer;
  height: 100%;
}
.crm-taste {
  margin: 0 14px 12px;
  flex: none;
}
.crm-taste__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  background: #f0f7ff;
  box-shadow: inset 4px 0 0 #1677ff;
  color: #0958d9;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.crm-taste__toggle:hover {
  border-color: #1677ff;
  background: #e6f4ff;
  box-shadow: inset 4px 0 0 #1677ff, 0 6px 16px rgba(22, 119, 255, .14);
}
.crm-taste__toggle.is-open {
  border-bottom-color: transparent;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.crm-taste__lead {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.crm-taste__mark {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1677ff;
  box-shadow: 0 0 0 4px rgba(22, 119, 255, .18);
}
.crm-taste__hint {
  display: none;
  color: #1677ff;
  font-size: 13px;
  font-weight: 600;
}
.crm-taste__toggle:hover .crm-taste__hint {
  display: inline;
}
.crm-taste__toggle em {
  flex: none;
  padding: 3px 10px;
  border: 1px solid #91caff;
  border-radius: 999px;
  background: #fff;
  color: #1677ff;
  font-style: normal;
  font-weight: 700;
}
.crm-taste__toggle:hover em {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}
.crm-taste__panel {
  margin-top: 0;
  padding: 12px;
  border: 1px solid #91caff;
  border-top: 0;
  border-radius: 0 0 4px 4px;
  background: #fff;
  box-shadow: inset 4px 0 0 #1677ff;
}
.crm-taste__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.crm-taste__stats div {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.06);
}
.crm-taste__stats span {
  display: block;
  margin-bottom: 6px;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
}
.crm-taste__stats strong {
  display: block;
  color: #1d2433;
  font-size: 18px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.crm-taste__notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 14px;
}
.crm-taste__notes p {
  display: flex;
  gap: 10px;
  margin: 0;
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}
.crm-taste__notes em {
  flex: none;
  min-width: 64px;
  color: #1677ff;
  font-style: normal;
  font-weight: 700;
  white-space: nowrap;
}
.crm-taste__tip {
  margin: 0 0 10px;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}
.crm-taste__charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 340px;
}
.crm-taste__charts article {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 10px 12px 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.crm-taste__band {
  display: flex;
  flex-direction: column;
  height: 300px;
  margin-top: 14px;
  min-height: 0;
  padding: 10px 12px 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.crm-taste__charts header {
  flex: none;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
.crm-taste__charts .crm-chart__note {
  margin: auto 0;
}
.crm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.crm-chips em,
.crm-chips button {
  margin: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f5f7fa;
  color: #303133;
  font-size: 13px;
  font-style: normal;
  line-height: 1.5;
}
.crm-chips button {
  border: 0;
  color: #409EFF;
  cursor: pointer;
}
.crm-extra section {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}
.crm-zoom-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}
.crm-zoom-stats div {
  min-width: 108px;
}
.crm-zoom-stats span {
  display: block;
  color: #606266;
  font-size: 13px;
}
.crm-zoom-stats strong {
  color: #303133;
  font-size: 16px;
}
.crm-zoom-chart {
  height: 380px;
}
.crm-chart__note,
.crm-chart__explain {
  margin: auto 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}
.crm-chart__explain {
  flex: none;
  margin: 0 2px 6px;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}
.crm-custom {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.crm-guide {
  flex: none;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.crm-guide h3 {
  margin: 0 0 8px;
  color: #303133;
  font-size: 15px;
}
.crm-guide ol {
  margin: 0;
  padding-left: 18px;
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}
.crm-guide p,
.crm-adjust {
  margin: 8px 0 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
.crm-adjust {
  flex: none;
  margin: 0;
  color: #344054;
}
.crm-custom__bar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}
.crm-custom__bar label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
  color: #606266;
  font-size: 13px;
}
.crm-custom__bar :deep(.el-select) {
  width: 180px;
}
.crm-custom__bar :deep(.el-select.crm-shop) {
  width: 320px;
}
.crm-custom__chart {
  flex: 1;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 6px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.crm-custom__chart .crm-chart__canvas {
  flex: 1;
  min-height: 0;
}
.crm-side {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.crm-side .crm-pane,
.crm-main .crm-pane {
  flex: 1;
  height: auto;
  min-height: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}
.crm-main .crm-pane.crm-detail {
  height: 100%;
  overflow: auto;
}
.crm-pane {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.crm-side__hint {
  margin: -4px 0 10px;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}
.crm-pane__head,
.crm-profile {
  flex: none;
  padding: 14px 14px 10px;
}
.crm-pane__head h2,
.crm-profile__title h2 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #1d2433;
}
.crm-pane__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.crm-pane__filters :deep(.el-select) {
  width: 120px;
}
.crm-cards,
.crm-orders {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 12px 8px;
}
.crm-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.crm-pager {
  flex: none;
  padding: 8px 10px 10px;
  border-top: 1px solid #eef1f6;
}
.crm-pager :deep(.el-pagination) {
  justify-content: flex-end;
  flex-wrap: wrap;
  row-gap: 4px;
  margin: 0;
}
.crm-pager :deep(.el-pagination__sizes) {
  margin-left: 8px;
}
.crm-pager :deep(.el-pagination__sizes .el-select) {
  width: 88px;
}
.crm-card {
  width: 100%;
  text-align: left;
  border: 1px solid #ebeef5;
  background: #fff;
  border-radius: 4px;
  padding: 8px 10px;
  cursor: pointer;
}
.crm-card:hover,
.crm-card.is-active {
  border-color: #409EFF;
  background: #ecf5ff;
}
.crm-card__top,
.crm-card__foot,
.crm-profile__title,
.crm-order__head,
.crm-order__id {
  display: flex;
  align-items: center;
  gap: 8px;
}
.crm-card__top strong,
.crm-product__body strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crm-card__meta,
.crm-card__time {
  color: #606266;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.crm-card__foot {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}
.crm-card__time {
  margin-left: auto;
}
.crm-platform,
.crm-repeat,
.crm-status {
  flex: none;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 18px;
}
.crm-platform.is-ebay {
  color: #b54708;
  background: #fff4e8;
}
.crm-platform.is-whatnot {
  color: #027a48;
  background: #ecfdf3;
}
.crm-repeat {
  color: #b42318;
  background: #fef3f2;
}
.crm-status {
  color: #475467;
  background: #f2f4f7;
}
.crm-profile {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(460px, 500px) minmax(16px, 0.16fr);
  align-items: center;
  column-gap: 12px;
  border-bottom: 1px solid #eef1f6;
}
.crm-profile__title h2 {
  margin: 0;
}
.crm-facts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.crm-facts div,
.crm-extra p {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 8px;
  min-width: 0;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.crm-facts span,
.crm-extra span,
.crm-order__id span {
  flex: none;
  color: #606266;
}
.crm-facts b {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.crm-extra {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.crm-orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
}
.crm-orders h3 {
  margin: 0;
  color: #303133;
  font-size: 15px;
}
.crm-orders__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.crm-orders__bar > span {
  color: #606266;
  font-size: 13px;
}
.crm-orders__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.crm-orders__bar .crm-split {
  margin: 0;
}
.crm-back {
  margin-bottom: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #409EFF;
  font-size: 13px;
  cursor: pointer;
}
.crm-order {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  background: #fff;
}
.crm-order__head {
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  color: #303133;
  font-size: 14px;
}
.crm-order__head > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.crm-order__id {
  margin-top: 6px;
  font-size: 14px;
}
.crm-products {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
.crm-product {
  display: flex;
  gap: 12px;
}
.crm-thumb {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  background: #f5f7fa;
  flex: none;
}
.crm-thumb__empty {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  color: #909399;
  font-size: 13px;
}
.crm-product__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.crm-product__tags,
.crm-product__money {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #606266;
  font-size: 13px;
}
.crm-empty {
  margin: auto;
}
@media (max-width: 1280px) {
  .crm-page {
    grid-template-columns: 320px minmax(0, 1fr);
  }
  .crm-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .crm-custom__controls :deep(.el-select) {
    width: 108px;
  }
}
@media (max-width: 960px) {
  .crm-page {
    height: auto;
    overflow: visible;
    grid-template-columns: 1fr;
  }
  .crm-stage,
  .crm-stats {
    grid-template-columns: 1fr;
  }
  .crm-stage.is-focus {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }
  .crm-main,
  .crm-pane {
    min-height: 640px;
  }
  .crm-profile {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
