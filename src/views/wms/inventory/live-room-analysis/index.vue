<template>
  <div class="app-container live-rooms" v-loading="loading">
    <el-card>
    <header class="live-rooms__head">
      <div class="live-rooms__title">
        <span class="live-rooms__logo"><el-icon :size="22"><DataAnalysis /></el-icon></span>
        <div>
          <h2>{{ t('直播间数据分析') }}</h2>
          <p>{{ t('按库存统计中的 8 个直播间汇总。默认看全部，可以只选一间，也可以同时选几间。') }}</p>
        </div>
      </div>
      <div class="live-rooms__actions">
        <span class="live-rooms__sync" :title="t('每 5 分钟自动拉取一次最新数据，时间为美西时间')">
          <i class="live-rooms__dot" />
          {{ t('每 5 分钟自动更新') }}<em v-if="lastSyncAt"> · {{ t('上次同步') }} {{ lastSyncAt }} {{ t('（美西时间）') }}</em>
        </span>
        <el-button @click="resetAll">{{ t('重置') }}</el-button>
        <el-button :loading="loading" @click="load">{{ t('刷新') }}</el-button>
        <el-button :loading="loading" type="primary" plain @click="refreshNow">{{ t('同步数据') }}</el-button>
      </div>
    </header>

    <section class="live-rooms__filters">
      <label>
        <span class="filter-head">
          <el-tooltip :content="t('可以只选一间，也可以同时选几间。留空就是 8 间一起看。')" placement="top" :show-after="200">
            <span class="filter-name">{{ t('直播间') }}<i class="filter-tip">?</i></span>
          </el-tooltip>
        </span>
        <el-select v-model="roomIds" multiple clearable collapse-tags :max-collapse-tags="1" :placeholder="t('全部直播间')">
          <el-option v-for="room in rooms" :key="room.id" :label="room.name" :value="room.id" />
        </el-select>
      </label>
      <label>
        <span class="filter-name-row">
          <el-tooltip :content="t('按商品分类筛选。选中上一级分类时，它下面的子分类也一起算。可以只选分类。')" placement="top" :show-after="200">
            <span class="filter-name">{{ t('分类') }}<i class="filter-tip">?</i></span>
          </el-tooltip>
          <button
            type="button"
            class="filter-switch"
            :class="{ 'is-on': hideEmptyCategories }"
            :title="t('打开后，未入库、已入库、已售出都是 0 的分类不显示在下拉里。')"
            @click="toggleHideEmptyCategories"
          >
            <el-icon :size="12"><Filter /></el-icon>{{ t('只显示有数据') }}
          </button>
        </span>
        <el-tree-select
          v-model="categoryId"
          :data="categoryTreeVisible"
          :props="{ value: 'id', label: 'label', children: 'children' }"
          value-key="id"
          check-strictly
          clearable
          filterable
          default-expand-all
          :placeholder="t('全部分类')"
          @change="onCategoryChange"
        />
      </label>
      <label>
        <span class="filter-name-row">
          <el-tooltip :content="t('按品牌名字筛选，同一个名字只出现一次。选了分类之后，和商品管理里这个分类能选的品牌一致。有的分类是开放品牌，品牌并没有单独建在这个分类下面。')" placement="top" :show-after="200">
            <span class="filter-name">{{ t('品牌') }}<i class="filter-tip">?</i></span>
          </el-tooltip>
          <button
            type="button"
            class="filter-switch"
            :class="{ 'is-on': hideEmptyBrands }"
            :title="t('打开后，未入库、已入库、已售出都是 0 的品牌不显示在下拉里。')"
            @click="toggleHideEmptyBrands"
          >
            <el-icon :size="12"><Filter /></el-icon>{{ t('只显示有数据') }}
          </button>
        </span>
        <el-select v-model="brandIds" multiple clearable filterable reserve-keyword default-first-option collapse-tags :max-collapse-tags="1" :placeholder="brandPlaceholder" :title="brandPlaceholder" @change="load">
          <el-option v-for="brand in visibleBrandOptions" :key="brand.key" :label="brand.name" :value="brand.key">
            <span class="brand-option">
              <span class="brand-option__name">{{ brand.name }}</span>
              <span v-if="brandCountOf(brand.key)" class="brand-option__count">{{ brandCountOf(brand.key) }}</span>
            </span>
          </el-option>
        </el-select>
      </label>
      <label class="is-range">
        <span class="filter-head">
          <el-tooltip :content="t('只看这段时间内卖掉的货。选了区间之后，已售出、已售出利润按区间统计，售罄率改成区间口径。未入库和已入库仍然是现在的库存。')" placement="top" :show-after="200">
            <span class="filter-name">{{ t('统计区间') }}<i class="filter-tip">?</i></span>
          </el-tooltip>
        </span>
        <div class="filter-range">
          <el-date-picker
            v-model="soldRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            unlink-panels
            clearable
            :start-placeholder="t('开始日期')"
            :end-placeholder="t('结束日期')"
            :shortcuts="soldRangeShortcuts"
            @change="load"
          />
        </div>
      </label>
      <label class="is-sku">
        <span class="filter-head">
          <el-tooltip :content="t('输入或粘贴 SKU 编号后按回车。下面的商品明细会滚到这一行并标黄。只影响明细列表，不改变上面的统计。')" placement="top" :show-after="200">
            <span class="filter-name">{{ t('SKU 定位') }}<i class="filter-tip">?</i></span>
          </el-tooltip>
        </span>
        <el-input
          v-model="skuFind"
          clearable
          :placeholder="t('输入 SKU 后回车')"
          @keyup.enter="findSku"
          @clear="clearSkuFind"
        />
      </label>
    </section>

    <el-alert v-if="missingNames.length" :title="t('没有找到这些直播间') + '：' + missingNames.join('、')" type="warning" :closable="false" />
    </el-card>

    <section class="metric-board">
      <div class="metric-grid">
        <button
          v-for="card in metricCards"
          :key="card.key"
          type="button"
          class="metric"
          :class="['is-' + card.key, { 'is-on': explainKey === card.key }]"
          @click="explainKey = explainKey === card.key ? '' : card.key"
        >
          <span v-if="explainKey === card.key" class="metric__watching">{{ t('正在查看') }}</span>
          <span class="metric__top">
            <span class="metric__icon"><el-icon :size="18"><component :is="card.icon" /></el-icon></span>
            <span class="metric__mark">{{ t(card.title) }}</span>
          </span>
          <strong>{{ card.value }}</strong>
          <em>{{ t(card.brief) }}</em>
          <small :class="explainKey === card.key ? 'is-close' : 'is-open'">{{ explainKey === card.key ? t('收起说明') : t('查看怎么统计') }}</small>
        </button>
      </div>
      <div v-if="activeMetric" class="metric-note" :class="'is-' + activeMetric.key">
        <h3>{{ t(activeMetric.title) }}</h3>
        <p v-for="(line, index) in activeMetric.lines" :key="index">
          <b>{{ t(line.label) }}</b>
          <template v-for="(part, partIndex) in line.parts" :key="partIndex">
            <router-link v-if="part.to" class="menu-tag" :to="part.to">{{ t(part.name) }}</router-link>
            <span v-else-if="part.name" class="menu-tag is-spot">{{ t(part.name) }}</span>
            <span v-else>{{ t(part.text) }}</span>
          </template>
        </p>
        <p v-if="activeMetric.note" class="metric-note__warn"><b>{{ t('特别说明') }}</b>{{ t(activeMetric.note) }}</p>
      </div>
    </section>

    <el-card>
    <section class="live-rooms__stage" :class="{ 'is-focus': focusId }">
      <article class="chart" :class="chartClass('mix')">
        <header class="chart__head">
          <span class="chart__name" :title="chartTitle('库存状态占比')">{{ t('库存状态占比') }}</span>
          <span class="chart__tools"><button type="button" class="chart__focus" @click.stop="focusChart('mix')">{{ focusLabel('mix') }}</button></span>
        </header>
        <div class="chart__scope" :class="{ 'is-empty': !scopeChips.length && !hasRange }" @click.stop>
          <template v-if="scopeChips.length || hasRange">
            <el-tooltip v-for="chip in [...scopeChips, ...chartScopeMixin]" :key="chip.key" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ chip.label }}</b>
                  <span>{{ chip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item" :class="'is-' + chip.key">
                <i>{{ chip.label }}</i>{{ chip.value }}
              </span>
            </el-tooltip>
          </template>
          <span v-else class="chart__scope-empty">{{ t('全部直播间 · 全部分类 · 全部品牌 · 全部时间') }}</span>
        </div>
        <p v-if="focusId === 'mix'" class="chart__note" @click.stop>{{ t(chartNote.mix) }}</p>
        <div class="chart__plot" :class="{ 'has-side': focusId === 'mix' && mixSideRows.length }">
          <div ref="mixEl" class="chart__canvas" />
          <div v-if="focusId === 'mix' && mixSideRows.length" class="chart__side is-mix" @click.stop>
            <header><span>{{ t('各直播间占每种状态的比例') }}</span></header>
            <div class="chart__side-head">
              <span />
              <em>{{ t('未入库') }}</em>
              <em>{{ t('已入库') }}</em>
              <em>{{ t('已售出') }}</em>
            </div>
            <ol>
              <li v-for="row in mixSideRows" :key="row.id">
                <span class="chart__side-name">{{ row.name }}</span>
                <em>{{ row.unstocked }}</em>
                <em>{{ row.stocked }}</em>
                <em>{{ row.sold }}</em>
              </li>
            </ol>
          </div>
        </div>
      </article>

      <article class="chart" :class="chartClass('compare')">
        <header class="chart__head">
          <span class="chart__name" :title="chartTitle('直播间对比')">{{ t('直播间对比') }}</span>
          <span class="chart__tools"><button type="button" class="chart__focus" @click.stop="focusChart('compare')">{{ focusLabel('compare') }}</button></span>
        </header>
        <div class="chart__scope" :class="{ 'is-empty': !scopeChips.length && !hasRange }" @click.stop>
          <template v-if="scopeChips.length || hasRange">
            <el-tooltip v-for="chip in [...scopeChips, ...chartScopeMixin]" :key="chip.key" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ chip.label }}</b>
                  <span>{{ chip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item" :class="'is-' + chip.key">
                <i>{{ chip.label }}</i>{{ chip.value }}
              </span>
            </el-tooltip>
          </template>
          <span v-else class="chart__scope-empty">{{ t('全部直播间 · 全部分类 · 全部品牌 · 全部时间') }}</span>
        </div>
        <div v-if="focusId === 'compare'" class="chart__panel" @click.stop>
          <div class="chart__dims">
            <div class="chart__dim is-inline">
              <span class="chart__label">{{ t('排序') }}</span>
              <span class="chart__group">
                <button v-for="option in compareSortOptions" :key="option.id" type="button" class="chart__pill" :class="{ 'is-on': compareSort === option.id }" @click="compareSort = option.id">{{ t(option.label) }}</button>
              </span>
              <span class="chart__inline-hint">{{ t(compareSortHint) }}</span>
            </div>
          </div>
        </div>
        <p v-if="focusId === 'compare'" class="chart__note" @click.stop>{{ t(chartNote.compare) }}</p>
        <div class="chart__plot" :class="{ 'has-side': compareTable.length }">
          <div ref="compareEl" class="chart__canvas" />
          <div v-if="compareTable.length" class="chart__side" @click.stop>
            <header><span>{{ t(compareTableTitle) }}</span></header>
            <ol>
              <li v-for="room in compareTable" :key="room.id">
                <span class="chart__side-name">{{ room.name }}</span>
                <strong>{{ formatQty(room.value) }}</strong>
              </li>
            </ol>
          </div>
        </div>
      </article>

      <article class="chart" :class="chartClass('rank')">
        <header class="chart__head">
          <span class="chart__name" :title="chartTitle('已售出排名')">{{ t('已售出排名') }}</span>
          <span class="chart__tools"><span class="chart__orient" @click.stop><button type="button" :class="{ 'is-on': orient.rank === 'h' }" @click="setOrient('rank', 'h')">{{ t('横向') }}</button><button type="button" :class="{ 'is-on': orient.rank === 'v' }" @click="setOrient('rank', 'v')">{{ t('竖向') }}</button></span><button type="button" class="chart__focus" @click.stop="focusChart('rank')">{{ focusLabel('rank') }}</button></span>
        </header>
        <div class="chart__scope" :class="{ 'is-empty': !scopeChips.length && !hasRange }" @click.stop>
          <template v-if="scopeChips.length || hasRange">
            <el-tooltip v-for="chip in [...scopeChips, ...chartScopeMixin]" :key="chip.key" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ chip.label }}</b>
                  <span>{{ chip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item" :class="'is-' + chip.key">
                <i>{{ chip.label }}</i>{{ chip.value }}
              </span>
            </el-tooltip>
          </template>
          <span v-else class="chart__scope-empty">{{ t('全部直播间 · 全部分类 · 全部品牌 · 全部时间') }}</span>
        </div>
        <p v-if="focusId === 'rank'" class="chart__note" @click.stop>{{ t(chartNote.rank) }}</p>
        <div class="chart__plot"><div ref="rankEl" class="chart__canvas" /></div>
      </article>

      <article class="chart" :class="chartClass('rateRank')">
        <header class="chart__head">
          <span class="chart__name" :title="chartTitle('售罄率排名')">{{ t('售罄率排名') }}</span>
          <span class="chart__tools"><span class="chart__orient" @click.stop><button type="button" :class="{ 'is-on': orient.rateRank === 'h' }" @click="setOrient('rateRank', 'h')">{{ t('横向') }}</button><button type="button" :class="{ 'is-on': orient.rateRank === 'v' }" @click="setOrient('rateRank', 'v')">{{ t('竖向') }}</button></span><button type="button" class="chart__focus" @click.stop="focusChart('rateRank')">{{ focusLabel('rateRank') }}</button></span>
        </header>
        <div class="chart__scope" :class="{ 'is-empty': !scopeChips.length && !hasRange }" @click.stop>
          <template v-if="scopeChips.length || hasRange">
            <el-tooltip v-for="chip in [...scopeChips, ...chartScopeMixin]" :key="chip.key" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ chip.label }}</b>
                  <span>{{ chip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item" :class="'is-' + chip.key">
                <i>{{ chip.label }}</i>{{ chip.value }}
              </span>
            </el-tooltip>
          </template>
          <span v-else class="chart__scope-empty">{{ t('全部直播间 · 全部分类 · 全部品牌 · 全部时间') }}</span>
        </div>
        <p v-if="focusId === 'rateRank'" class="chart__note" @click.stop>{{ t(chartNote.rateRank) }}</p>
        <div class="chart__plot"><div ref="rateRankEl" class="chart__canvas" /></div>
      </article>

      <article class="chart" :class="chartClass('profit')">
        <header class="chart__head">
          <span class="chart__name" :title="chartTitle('实际利润')">{{ t('实际利润') }}</span>
          <span class="chart__tools"><span class="chart__orient" @click.stop><button type="button" :class="{ 'is-on': orient.profit === 'h' }" @click="setOrient('profit', 'h')">{{ t('横向') }}</button><button type="button" :class="{ 'is-on': orient.profit === 'v' }" @click="setOrient('profit', 'v')">{{ t('竖向') }}</button></span><button type="button" class="chart__focus" @click.stop="focusChart('profit')">{{ focusLabel('profit') }}</button></span>
        </header>
        <div class="chart__scope" :class="{ 'is-empty': !scopeChips.length && !hasRange }" @click.stop>
          <template v-if="scopeChips.length || hasRange">
            <el-tooltip v-for="chip in [...scopeChips, ...chartScopeMixin]" :key="chip.key" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ chip.label }}</b>
                  <span>{{ chip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item" :class="'is-' + chip.key">
                <i>{{ chip.label }}</i>{{ chip.value }}
              </span>
            </el-tooltip>
          </template>
          <span v-else class="chart__scope-empty">{{ t('全部直播间 · 全部分类 · 全部品牌 · 全部时间') }}</span>
        </div>
        <div v-if="focusId === 'profit'" class="chart__panel" @click.stop>
          <div class="chart__dims">
            <div class="chart__dim">
              <span class="chart__label">{{ t('算哪些') }}</span>
              <span class="chart__group">
                <button v-for="mode in profitModes" :key="mode.id" type="button" class="chart__pill" :class="{ 'is-on': profitMode === mode.id }" @click="profitMode = mode.id">{{ t(mode.label) }}</button>
              </span>
            </div>
            <div class="chart__dim">
              <span class="chart__label">{{ t('怎么看') }}</span>
              <span class="chart__group">
                <button v-for="view in profitViews" :key="view.id" type="button" class="chart__pill" :class="{ 'is-on': profitView === view.id }" :disabled="view.id === 'percent' && profitMode === 'sold'" :title="view.id === 'percent' && profitMode === 'sold' ? t('只选已售出时每间都是 100%，看不出差别。先选后面两种再按比例看。') : ''" @click="profitView = view.id">{{ t(view.label) }}</button>
              </span>
            </div>
            <div v-if="profitView === 'percent' && profitMode !== 'sold'" class="chart__dim">
              <span class="chart__label">{{ t('排序') }}</span>
              <span class="chart__group">
                <button v-for="option in profitSortOptions" :key="option.id" type="button" class="chart__pill" :class="{ 'is-on': profitSortBy === option.id }" @click="profitSortBy = option.id">{{ t(option.label) }}</button>
              </span>
            </div>
          </div>
          <div class="chart__foot">
            <p class="chart__hint">{{ profitHint }}</p>
            <button type="button" class="chart__more" @click="profitRulesOpen = !profitRulesOpen">{{ t(profitRulesOpen ? '收起计算规则' : '计算规则') }}</button>
          </div>
          <ul v-if="profitRulesOpen" class="chart__rules">
            <li v-for="formula in profitFormulas" :key="formula">{{ t(formula) }}</li>
          </ul>
        </div>
        <div class="chart__plot" :class="{ 'has-side': focusId === 'profit' && profitPieRows.length }">
          <div ref="profitEl" class="chart__canvas" />
          <div v-if="focusId === 'profit' && profitPieRows.length" class="chart__pie" @click.stop>
            <header>{{ t('已售出利润 · 各直播间占比') }}</header>
            <div ref="profitPieEl" class="chart__pie-canvas" />
          </div>
        </div>
      </article>

      <article class="chart" :class="chartClass('cost')">
        <header class="chart__head">
          <span class="chart__name" :title="chartTitle('在库成本')">{{ t('在库成本') }}</span>
          <span class="chart__tools"><span class="chart__orient" @click.stop><button type="button" :class="{ 'is-on': orient.cost === 'h' }" @click="setOrient('cost', 'h')">{{ t('横向') }}</button><button type="button" :class="{ 'is-on': orient.cost === 'v' }" @click="setOrient('cost', 'v')">{{ t('竖向') }}</button></span><button type="button" class="chart__focus" @click.stop="focusChart('cost')">{{ focusLabel('cost') }}</button></span>
        </header>
        <div class="chart__scope" :class="{ 'is-empty': !scopeChips.length && !hasRange }" @click.stop>
          <template v-if="scopeChips.length || hasRange">
            <el-tooltip v-for="chip in scopeChips" :key="chip.key" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ chip.label }}</b>
                  <span>{{ chip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item" :class="'is-' + chip.key">
                <i>{{ chip.label }}</i>{{ chip.value }}
              </span>
            </el-tooltip>
            <el-tooltip v-if="hasRange" placement="top" :show-after="150" popper-class="chart-scope-tip">
              <template #content>
                <div class="chart-scope-tip__inner">
                  <b>{{ liveChip.label }}</b>
                  <span>{{ liveChip.full }}</span>
                </div>
              </template>
              <span class="chart__scope-item is-live">
                <i>{{ liveChip.label }}</i>{{ liveChip.value }}
              </span>
            </el-tooltip>
          </template>
          <span v-else class="chart__scope-empty">{{ t('全部直播间 · 全部分类 · 全部品牌 · 全部时间') }}</span>
        </div>
        <p v-if="focusId === 'cost'" class="chart__note" @click.stop>{{ t(chartNote.cost) }}</p>
        <div class="chart__plot"><div ref="costEl" class="chart__canvas" /></div>
      </article>
    </section>
    <section v-if="focusId && categoryId" class="split-board" v-loading="splitLoading">
      <article>
        <header>{{ t('未入库') }} · {{ t('各品牌占比') }}</header>
        <div ref="splitUnstockedEl" class="split-board__canvas" />
      </article>
      <article>
        <header>{{ t('已入库') }} · {{ t('各品牌占比') }}</header>
        <div ref="splitStockedEl" class="split-board__canvas" />
      </article>
      <article>
        <header>{{ t('已售出') }} · {{ t('各品牌占比') }}</header>
        <div ref="splitSoldEl" class="split-board__canvas" />
      </article>
    </section>
    <section v-if="brandMixNote.length" class="chart-mix">
      <h3>{{ t('这些品牌实际算进了哪些分类') }}</h3>
      <p>{{ t('你没有选分类，所以按品牌名字合并。同一个名字如果在多个分类里都建过，这些分类都会算进上面这张图。') }}</p>
      <ul>
        <li v-for="brand in brandMixNote" :key="brand.key">
          <strong>{{ brand.name }}</strong>
          <span>{{ brand.categories.length ? brand.categories.join('、') : t('未挂分类') }}</span>
        </li>
      </ul>
    </section>

    <section v-if="focusId === 'mix'" class="live-rooms__cards">
      <button
        v-for="room in shownRooms"
        :key="room.id"
        type="button"
        class="room"
        :class="{ 'is-on': roomIds.includes(room.id) }"
        @click="pickRoom(room.id)"
      >
        <header>
          <strong>{{ room.name }}</strong>
          <span>{{ rateText(room.stocked, room.sold) }}</span>
        </header>
        <div :ref="el => setPieEl(room.id, el)" class="room__pie" />
        <ul>
          <li><i class="is-unstocked" />{{ t('未入库') }} {{ formatQty(room.unstocked) }}</li>
          <li><i class="is-stocked" />{{ t('已入库') }} {{ formatQty(room.stocked) }}</li>
          <li><i class="is-sold" />{{ t('已售出') }} {{ formatQty(room.sold) }}</li>
        </ul>
      </button>
    </section>
    </el-card>

    <el-card>
      <section ref="detailBlockRef" class="detail-block">
        <header class="detail-block__head">
          <div>
            <h3>{{ t('全部状态 · 商品明细') }}</h3>
            <p>{{ t('未入库只统计已映射到直播间的商品，已入库是当前在库数量，已售出按出库完成时间统计。三个数量口径独立，不能相加当作总数。') }}</p>
          </div>
          <span class="detail-block__count">{{ t('共') }} {{ formatQty(detailTotal) }} {{ t('条') }}</span>
        </header>
        <div v-if="detailScope.length" class="chart__scope" @click.stop>
          <span v-for="chip in detailScope" :key="chip.key" class="chart__scope-item" :class="'is-' + chip.key">
            <i>{{ chip.label }}</i>{{ chip.value }}
          </span>
        </div>
        <el-table
          ref="detailTableRef"
          :data="detailRows"
          v-loading="detailLoading"
          size="small"
          class="detail-block__table"
          row-key="skuId"
          :row-class-name="detailRowClass"
        >
          <el-table-column :label="t('直播间')" width="110">
            <template #default="{ row }">{{ row.roomName || '--' }}</template>
          </el-table-column>
          <el-table-column :label="t('商品')" min-width="220">
            <template #default="{ row }">
              <el-tooltip :content="row.itemName || '--'" placement="top" :show-after="300" :disabled="!row.itemName">
                <span class="detail-block__item">{{ row.itemName || '--' }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column :label="t('SKU')" min-width="150">
            <template #default="{ row }">
              <el-tooltip :content="row.skuCode || '--'" placement="top" :show-after="300" :disabled="!row.skuCode">
                <span class="detail-block__sku">{{ row.skuCode || '--' }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column :label="t('品牌')" prop="brandName" min-width="120" />
          <el-table-column :label="t('分类')" prop="categoryName" min-width="120" />
          <el-table-column :label="t('采购人')" prop="consignInfo" min-width="110" />
          <el-table-column :label="t('未入库')" width="90" align="right">
            <template #default="{ row }">{{ formatQty(row.unstocked) }}</template>
          </el-table-column>
          <el-table-column :label="t('已入库')" width="90" align="right">
            <template #default="{ row }">{{ formatQty(row.stocked) }}</template>
          </el-table-column>
          <el-table-column :label="t('已售出')" width="90" align="right">
            <template #default="{ row }">{{ formatQty(row.sold) }}</template>
          </el-table-column>
          <el-table-column v-if="detailShowsCost" :label="t('成本价')" width="110" align="right">
            <template #default="{ row }">{{ moneyText(row.costPrice) }}</template>
          </el-table-column>
          <el-table-column v-if="detailShowsPrice" :label="t('销售价')" width="110" align="right">
            <template #default="{ row }">{{ moneyText(row.sellingPrice) }}</template>
          </el-table-column>
        </el-table>
        <div class="detail-block__foot">
          <el-pagination
            :current-page="detailPage"
            :page-size="detailPageSize"
            :total="detailTotal"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            background
            @current-change="onDetailPageChange"
            @size-change="onDetailSizeChange"
          />
        </div>
      </section>
    </el-card>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Box, DataAnalysis, Filter, Money, ShoppingBag, Van } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { listItemBrand } from '@/api/wms/itemBrand'
import { warehouseOptions } from '@/api/wms/warehouse'
import { warehouseProductBrandSplit, warehouseProductDetails, warehouseProductFilterCounts, warehouseProductRoomSnapshots } from '@/api/wms/warehouseProducts'
import { useWmsStore } from '@/store/modules/wms'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const ROOM_NAMES = ['Ebay1', 'Ebay2', 'Ebay3', 'Ebay4', 'TK1', 'TK2', 'TK3', 'WN']
const TONES = {
  unstocked: ['#3ED6E6', '#1298B0'],
  stocked: ['#5C9BFF', '#2F6FE0'],
  sold: ['#E989C8', '#F6B4D8']
}
function paint(key, horizontal = false) {
  const [from, to] = TONES[key]
  return new echarts.graphic.LinearGradient(0, 0, horizontal ? 1 : 0, horizontal ? 0 : 1, [
    { offset: 0, color: from },
    { offset: 1, color: to }
  ])
}
const EN = {
  直播间数据分析: 'Live Room Analysis',
  '按库存统计中的 8 个直播间汇总。默认看全部，可以只选一间，也可以同时选几间。': 'Summarizes the eight live rooms from Inventory Statistics. All rooms are shown until you pick one or several.',
  '每 5 分钟自动更新': 'Auto-updates every 5 minutes',
  同步数据: 'Sync data',
  上次同步: 'Last synced',
  '（美西时间）': '(Pacific time)',
  '每 5 分钟自动拉取一次最新数据，时间为美西时间': 'Pulls the latest data automatically every 5 minutes. Times are Pacific time.',
  上次: 'last',
  已拉取最新数据: 'Latest data loaded',
  刷新: 'Refresh',
  重置: 'Reset',
  '可以只选一间，也可以同时选几间。留空就是 8 间一起看。': 'Pick one room or several. Leave it empty to include all eight.',
  直播间: 'Live Room',
  全部直播间: 'All live rooms',
  品牌: 'Brand',
  全部品牌: 'All brands',
  分类: 'Category',
  全部分类: 'All categories',
  输入分类名: 'Type a category',
  输入品牌名: 'Type a brand',
  '选中某一间后，整页只统计这一间。留空就是 8 间一起看。': 'Choose one room to limit the whole page to it. Leave it empty to include all eight rooms.',
  '按商品分类筛选。选中上一级分类时，它下面的子分类也一起算。可以只选分类。': 'Filters by product category. A parent category also includes its subcategories. Category can be used on its own.',
  '按品牌名字筛选，同一个名字只出现一次。选了分类之后，和商品管理里这个分类能选的品牌一致。有的分类是开放品牌，品牌并没有单独建在这个分类下面。': 'Filters by brand name, with each name shown once. After a category is chosen, the list matches Item Management. Some categories share a brand pool, so those brands are not stored under the category.',
  没有找到这些直播间: 'These live rooms were not found',
  未入库: 'Not inbound',
  已入库: 'In stock',
  已售出: 'Sold',
  售罄率: 'Sell-through',
  查看怎么统计: 'How this is counted',
  收起说明: 'Hide explanation',
  正在查看: 'Viewing',
  库存操作: 'Inventory Operations',
  统计口径: 'Scope',
  怎么计数: 'How it is counted',
  数据来源: 'Where it links',
  特别说明: 'Please note',
  '已归属本直播间、但系统中尚无库存记录的待入库商品数量': 'Items mapped to this room with no inventory record anywhere yet',
  '本直播间当前在库、库存数量大于零的商品数量合计': 'Total quantity currently in stock in this room, counting only items above zero',
  '由本直播间出库、且销售出库单已完成的商品数量合计': 'Total quantity shipped from this room on finished sales outbound orders',
  '已售出数量 ÷（已入库数量 + 已售出数量）': 'Sold quantity ÷ (in-stock quantity + sold quantity)',
  '统计对象：已通过采购人仓库映射归属到本直播间、且在系统任意仓库均无库存记录的商品。计量单位：件。数量取': 'Included: items mapped to this room through the purchaser warehouse mapping that have no inventory record in any warehouse. Unit: piece. Quantity comes from the expected quantity in ',
  '中登记的预计数量，不按收发货差额推算。': '. It is not derived from shipped minus received.',
  '采购人及预计数量取自': 'Purchaser and expected quantity come from ',
  '；仓库归属取自': '. Room assignment comes from ',
  '中的': ' inside ',
  '。未完成归属映射的商品不计入任何直播间。': '. Items without a mapping are not counted in any live room.',
  '「无库存记录」按系统全部仓库判定，不限于本页汇总的 8 个直播间。其他仓库只要产生过库存记录，即使当前数量为零，该商品也不再计为未入库。': '"No inventory record" is checked against every warehouse in the system, not only the eight rooms on this page. Any inventory record in another warehouse, even with quantity 0, means the item no longer counts as not inbound.',
  '统计范围为当前直播间内库存数量大于零的商品，计量单位为件，按数量求和，库存数量为零的不计入。仅存放在上级仓库、未分配至直播间的库存不计入本直播间。': 'Included: items in this room with quantity above zero. Unit: piece, summed by quantity. Zero quantity is excluded. Stock kept only in the parent warehouse and not allocated to a room is excluded.',
  '取自': 'Taken from ',
  '中该直播间当前的库存数量。': ', the current stock quantity for this room.',
  '统计对象：出库类型为销售出库、单据状态为已完成、且出库仓库为本直播间的出库单商品，计量单位为件，按明细数量求和。未完成的出库单不计入。': 'Included: outbound orders of type sales outbound with status finished, whose warehouse is this room. Unit: piece, summed from the detail lines. Unfinished orders are excluded.',
  '取自左侧菜单': 'Taken from the left menu ',
  '下的': ', under ',
  '。不取自平台订单，也不取自开播时手工填写的销售额。当前版本未接入毛利数据，右侧排名按已售出数量排序。': '. It is not taken from platform orders or from sales amounts typed in when a session starts. Gross profit is not connected yet, so the ranking uses sold quantity.',
  '计算方式：已售出数量 ÷（已入库数量 + 已售出数量）。分母为零时显示 --。三项指标的统计口径相互独立、存在交叉，不可相加作为商品总量。': 'Calculated as sold quantity ÷ (in-stock quantity + sold quantity). It shows -- when the denominator is 0. The three measures are independent and overlap, so they must not be added into a total.',
  '基于本页已入库与已售出两项计算得出，不引用其他页面数据。该指标为数量比例，不代表金额，也不代表收货完成率。': 'Calculated from the in-stock and sold figures on this page; no other page is read. It is a quantity ratio, not an amount, and not a receiving completion rate.',
  加载失败: 'Failed to load',
  库存状态占比: 'Status mix',
  直播间对比: 'Room comparison',
  已售出排名: 'Sold ranking',
  已售出利润: 'Sold profit',
  '已售出商品按 售价 − 成本价 计算出的利润合计': 'Profit on sold items, selling price minus cost price',
  '统计对象：与「已售出」口径一致的销售出库商品明细。单件利润 = 售价 − 成本价，再乘以出库数量后求和。售价或成本价缺失的商品不计入利润。': 'Included: the same sales outbound lines as the sold figure. Profit per piece = selling price − cost price, multiplied by quantity and summed. Items missing either price are excluded.',
  '成本价与售价取自': 'Cost and selling prices come from ',
  '中对应商品的成本价与销售价；销售出库数量取自左侧菜单': '; sold quantities come from the left menu ',
  '。该数字随当前库存价格变动，不是出库当时锁定的成交价。': '. The figure follows current inventory prices, not the price locked when the order shipped.',
  '当前账号没有查看价格的权限时，此卡不显示金额。利润按当前商品资料中的售价与成本价计算，商品改价后重新进入本页即会变化。': 'If this account cannot view prices, no amount is shown. Profit uses the current selling and cost prices in the item record, so it changes after prices are updated.',
  各直播间占每种状态的比例: 'Each room share of every status',
  '已售出利润 · 各直播间占比': 'Sold profit · share by room',
  '（已选品牌如下）': ' (selected brands below)',
  '内，由本直播间出库且销售出库单已完成的商品数量合计': '— total quantity shipped from this room on finished sales outbound orders',
  '内，已售出商品按 售价 − 成本价 计算出的利润合计': '— profit on sold items, selling price minus cost price',
  已选择统计区间: 'Date range applied:',
  统计区间: 'Date range',
  '，只统计该区间内完成的出库，按出库单完成时间判断，起止日期都包含当天。': '. Only outbound completed inside this range counts, judged by the outbound completion time, with both dates included.',
  '，只统计该区间内完成的出库所产生的利润。': '. Only profit from outbound completed inside this range counts.',
  '内：售罄率 = 区间已售出 ÷（区间已售出 + 当前已入库）。区间只作用于已售出，已入库仍是现在的库存，所以这个比例是区间口径，和整页其他数字不能直接比。': '— sell-through = sold in range ÷ (sold in range + current in stock). The range filters sold only and in-stock is still the stock right now, so this is a range figure and must not be compared directly with the rest of the page.',
  '全部状态 · 商品明细': 'All statuses · item details',
  '全部直播间 · 全部分类 · 全部品牌 · 全部时间': 'All live rooms · all categories · all brands · all time',
  'SKU 定位': 'Find SKU',
  '输入 SKU 后回车': 'Enter SKU and press Enter',
  '输入或粘贴 SKU 编号后按回车。下面的商品明细会滚到这一行并标黄。只影响明细列表，不改变上面的统计。': 'Type or paste a SKU and press Enter. The item list below scrolls to that row and highlights it. Only the list changes; the totals above stay the same.',
  '未入库只统计已映射到直播间的商品，已入库是当前在库数量，已售出按出库完成时间统计。三个数量口径独立，不能相加当作总数。': 'Not inbound counts only items mapped to live rooms. In stock is the current quantity on hand. Sold uses the outbound completion time. The three measures are independent and must not be added into a total.',
  '商品 / SKU': 'Item / SKU',
  共: 'Total ',
  条: 'rows',
  '只筛已售出，按出库完成时间算，含起止当天': 'filters sold only, by outbound completion time, both dates included',
  '只作用于「已售出」和由它算出来的数字，按销售出库的完成时间判断，起止两天都算在内。未入库、已入库仍是此刻的库存，不随区间变化。': 'Applies only to sold and the numbers derived from it. It uses the sales outbound completion time, with both start and end dates included. Not-inbound and in-stock stay as the stock at this moment.',
  '按此刻库存算，区间只筛已售出': 'uses stock right now; the range only filters sold',
  '这张图看的是现在这一刻还压在库里的成本，所以不按区间筛选。区间只作用于已售出和由已售出算出来的数字。': 'This chart shows the cost still tied up in stock right now, so the range does not filter it. The range only applies to sold and the numbers derived from it.',
  不受统计区间影响: 'Not affected by the range',
  开始日期: 'Start date',
  结束日期: 'End date',
  本月: 'This month',
  上月: 'Last month',
  近: 'Last ',
  '（按出库完成时间，含起止当天）': ' (by outbound completion time, both dates included)',
  '只看这段时间内卖掉的货。选了区间之后，已售出、已售出利润按区间统计，售罄率改成区间口径。未入库和已入库仍然是现在的库存。': 'Counts only goods sold within this range. Sold quantity, sold profit, and the sell-through ranking use the range. Not-inbound and in-stock stay as they are today.',
  '本月': 'This month',
  只显示有数据: 'With data only',
  '打开后，未入库、已入库、已售出都是 0 的品牌不显示在下拉里。': 'When on, brands with zero not inbound, in stock, and sold are hidden.',
  '打开后，未入库、已入库、已售出都是 0 的分类不显示在下拉里。': 'When on, categories with zero not inbound, in stock, and sold are hidden.',
  '当前范围件数：在库': 'Pieces in the current scope — stocked ',
  '，已售': ', sold ',
  '，待入库': ', not inbound ',
  '未选分类，按品牌名字统计': 'No category selected; grouped by brand name',
  在库: 'Stocked',
  已售: 'Sold',
  待入库: 'Not inbound',
  该分类全部品牌: 'All brands in this category',
  明细: ' detail',
  仅品牌: 'Brand only',
  仅按品牌: 'Brand only',
  未选分类: 'no category selected',
  '按这一项从多到少，相同再看整根柱子总高度': 'Sorted by this item; ties use the total bar height',
  默认顺序: 'Default order',
  按未入库: 'By not inbound',
  按已入库: 'By in stock',
  按已售出: 'By sold',
  '按直播间原来的先后顺序排：Ebay1 到 Ebay4，再 TK1 到 TK3，最后 WN。': 'Rooms keep their original order: Ebay1 to Ebay4, then TK1 to TK3, then WN.',
  '按未入库从多到少排，最多的几间排在最左边。': 'Sorted by not-inbound quantity, highest on the left.',
  '按已入库从多到少排，最多的几间排在最左边。': 'Sorted by in-stock quantity, highest on the left.',
  '按已售出从多到少排，最多的几间排在最左边。': 'Sorted by sold quantity, highest on the left.',
  横向: 'Bars',
  竖向: 'Columns',
  售罄率排名: 'Sell-through ranking',
  实际利润: 'Actual profit',
  在库成本: 'Cost still in the room',
  '只算已经卖掉的货。一件的利润 = 售价 − 成本价，再按件数相加。售价或成本价没填的不计。': 'Counts sold goods only. Profit for one piece is selling price minus cost, then multiplied by quantity. Pieces missing either price are left out.',
  '已售出是已经拿到的利润。已入库是这些货如果按现在的售价全部卖掉，还能再拿到的利润。': 'Sold is the profit already made. In stock is the profit if those pieces all sold at the current selling price.',
  '在上面的基础上，再把未入库也按同样的售价算进去。这是货到了并且卖掉之后的利润。': 'Also includes goods not inbound yet, using the same selling price. This is the profit if those pieces arrive and then sell.',
  '已售出 + 已入库': 'Sold + in stock',
  '未入库 + 已入库 + 已售出': 'Not inbound + in stock + sold',
  合计: 'Total',
  显示方式: 'View',
  算哪些: 'Include',
  怎么看: 'Show',
  排序: 'Sort',
  已售出占比: 'Sold share',
  已入库占比: 'In-stock share',
  未入库占比: 'Not-inbound share',
  计算规则: 'Rules',
  收起计算规则: 'Hide rules',
  '（排序依据）': ' (sort key)',
  '画满 100% 对比比例，按': 'Bars fill 100% and are sorted by ',
  '从高到低排。': ', high to low.',
  '只选已售出时每间都是 100%，看不出差别。先选后面两种再按比例看。': 'With only sold selected, every bar would be 100%, so nothing can be compared. Include in-stock first.',
  按金额: 'By amount',
  按比例: 'By share',
  '默认按这次选中的几块加起来的总金额排序，钱最多的一间排在最前。看哪一间实际和潜在的利润最高。': 'Sorted by the combined total of the pieces you chose. The room with the highest total profit comes first. Use this to see which room has the most realized and potential profit.',
  '每间都画满 100%，只比较已售出、已入库、未入库各占多少。排序不再看总金额，改成按已售出利润占这间的比例，从高到低。': 'Every bar fills 100% and only the share of each part is compared. Sorting no longer uses the total amount; it uses the sold-profit share of each room, from high to low.',
  没有价格权限: 'Price is hidden for this account',
  '每件利润 = 售价 − 成本价': 'Profit per piece = selling price − cost price',
  '已售出：实际已经拿到的利润': 'Sold: profit already realized',
  '已入库：按现在的售价，假设这些货全部卖掉后还能拿到的利润': 'In stock: profit if those pieces all sold at the current selling price',
  '未入库：按现在的售价，假设货到了并且卖掉后还能拿到的利润': 'Not inbound: profit if those pieces arrive and then sell at the current selling price',
  '售价或成本价没填的货不计入利润': 'Pieces missing either price are left out of profit',
  '未入库、已入库、已售出，各占三种状态合计的比例。三件货可能重叠：比如一件已经卖掉的货，也可能同时被算进「已入库」，所以三个比例加起来一定等于 100%，但三张卡片的数字不能互相加总。下方的小饼图按同样的算法拆到每一间。': 'Not inbound, in stock, and sold as shares of the combined total. The three groups can overlap: a piece that was sold may also count as in stock, so the percentages add up to 100% even though the card numbers must not be added together. The small pies below apply the same calculation room by room.',
  '每一间一条柱子，未入库、已入库、已售出分别堆叠。三种口径互相独立，柱子的高度只是这三种口径摆在一起对比，不代表这间一共有多少件货。': 'One bar per room, with not inbound, in stock, and sold stacked separately. The three measures are independent, so the bar height is only a side-by-side comparison and is not the total piece count for that room.',
  '按已售出件数从多到少排序。已售出指已完成销售的出库，和上面「已售出排名」的口径一致。': 'Ranked by sold quantity from high to low. Sold means completed sales outbound, the same measure as the Sold ranking above.',
  '售罄率 = 已售出 ÷（已入库 + 已售出）。按这个比例从高到低排序。已入库或已售出都为 0 的直播间，比例按 0 排在最后。': 'Sell-through = sold ÷ (in stock + sold), ranked from high to low. Rooms with both in stock and sold at 0 are shown as 0 and placed last.',
  '成本 = 成本价 × 件数，只统计「已入库」这一项。成本价没填的货不计入。它表示这间里还压着多少钱的货，不是利润。': 'Cost = cost price × quantity, counting only the in-stock pieces. Pieces without a cost price are left out. It shows how much money is still tied up in the room, not profit.',
  各品牌占比: 'Share by brand',
  这些品牌实际算进了哪些分类: 'Categories included for these brands',
  '你没有选分类，所以按品牌名字合并。同一个名字如果在多个分类里都建过，这些分类都会算进上面这张图。': 'No category is selected, so brands are grouped by name. If one name exists in several categories, all of those categories are included in the chart above.',
  未挂分类: 'No category',
  点击放大: 'Click to enlarge',
  点击收回: 'Click to collapse',
  暂无数量: 'No quantity'
}
const settings = useSettingsStore()
const isEn = computed(() => (settings.language || 'zh-cn') === 'en')
const t = text => isEn.value ? (EN[text] || translateByMap(text, 'en')) : text
/** 切换语言后图表里的图例和坐标文字要跟着重绘。 */
watch(isEn, async () => { await nextTick(); render() })
const { proxy } = getCurrentInstance()
const wmsStore = useWmsStore()

const loading = ref(false)
const detailRows = ref([])
const detailTotal = ref(0)
const detailPage = ref(1)
const detailPageSize = ref(20)
const detailLoading = ref(false)
const detailShowsCost = ref(false)
const detailShowsPrice = ref(false)
const detailTableRef = ref(null)
const skuFind = ref('')
const activeSku = ref('')
function detailRowClass({ row }) {
  return activeSku.value && String(row.skuCode || '').trim().toLowerCase() === activeSku.value
    ? 'sku-highlight-row'
    : ''
}
async function findSku() {
  const code = String(skuFind.value || '').trim()
  if (!code) {
    activeSku.value = ''
    return
  }
  activeSku.value = code.toLowerCase()
  // 先按 SKU 重新拉一遍明细，保证目标不在当前页也能出现
  detailPage.value = 1
  await loadDetails()
  await nextTick()
  window.setTimeout(() => {
    const host = detailTableRef.value?.$el
    const row = host?.querySelector('.sku-highlight-row')
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 120)
}
function clearSkuFind() {
  skuFind.value = ''
  activeSku.value = ''
}
const detailScope = computed(() => [
  ...scopeChips.value,
  ...(hasRange.value ? [rangeChip.value] : [])
])
const detailVisible = ref(false)
const detailPending = ref(false)
const detailBlockRef = ref(null)
let detailObserver = null
function observeDetailBlock() {
  if (detailObserver || !detailBlockRef.value) return
  detailObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    detailVisible.value = true
    if (detailPending.value) {
      detailPending.value = false
      loadDetails()
    }
  }, { rootMargin: '200px' })
  detailObserver.observe(detailBlockRef.value)
}
async function loadDetails() {
  const targets = shownRooms.value
  if (!targets.length) {
    detailRows.value = []
    detailTotal.value = 0
    return
  }
  detailLoading.value = true
  try {
    const result = await warehouseProductDetails({
      warehouseIds: targets.map(room => room.id).join(','),
      itemCategory: categoryId.value || undefined,
      itemBrand: selectedBrandIds.value,
      skuCode: activeSku.value ? skuFind.value.trim() : undefined,
      pageNum: detailPage.value,
      pageSize: detailPageSize.value,
      ...soldRangeParams()
    }).catch(() => ({ rows: [], total: 0 }))
    const rows = result.rows || []
    for (const row of rows) {
      if (row.costPrice !== null && row.costPrice !== undefined) detailShowsCost.value = true
      if (row.sellingPrice !== null && row.sellingPrice !== undefined) detailShowsPrice.value = true
    }
    detailRows.value = rows
    detailTotal.value = Number(result.total) || 0
  } catch (_) {
    detailRows.value = []
    detailTotal.value = 0
  } finally {
    detailLoading.value = false
  }
}
function onDetailPageChange(page) {
  detailPage.value = page
  loadDetails()
}
function onDetailSizeChange(size) {
  detailPageSize.value = size
  detailPage.value = 1
  loadDetails()
}
const explainKey = ref('')
const focusId = ref('')
const roomIds = ref([])
const soldRange = ref([])
const soldRangeShortcuts = computed(() => {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  return [
    { text: t('本月'), value: () => [new Date(today.getFullYear(), today.getMonth(), 1), today] },
    { text: t('上月'), value: () => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)] },
    { text: t('近 30 天'), value: () => [new Date(today.getTime() - 29 * 86400000), today] },
    { text: t('今年'), value: () => [startOfYear, today] }
  ]
})
function soldRangeParams() {
  const [start, end] = soldRange.value || []
  return {
    soldStartDate: start || undefined,
    soldEndDate: end || undefined
  }
}
const hasRange = computed(() => Boolean((soldRange.value || []).filter(Boolean).length))
const rangeLabel = computed(() => {
  const [start, end] = soldRange.value || []
  if (!start && !end) return ''
  if (start && end) return `${start} ~ ${end}`
  return start || end
})
const categoryId = ref(null)
const brandIds = ref([])
const categoryBrandRows = ref(null)
let categoryBrandToken = 0
function groupBrands(rows) {
  const groups = new Map()
  for (const brand of rows || []) {
    const name = String(brand.brandName || '').trim()
    if (!name || brand.id == null) continue
    const key = name.toLowerCase()
    const group = groups.get(key) || { key, name, ids: [], categories: [] }
    group.ids.push(brand.id)
    const categoryName = brand.itemCategory != null ? findCategoryLabel(brand.itemCategory) : ''
    if (categoryName && !group.categories.includes(categoryName)) group.categories.push(categoryName)
    groups.set(key, group)
  }
  return [...groups.values()]
}
const brandOptions = computed(() => groupBrands(categoryId.value ? categoryBrandRows.value : wmsStore.itemBrandList))
const brandCounts = ref({})
const categoryCounts = ref({})
const hideEmptyCategories = ref(false)
const categoryChildrenMap = computed(() => {
  const map = {}
  const walk = nodes => {
    for (const node of nodes || []) {
      map[String(node.id)] = (node.children || []).map(child => String(child.id))
      walk(node.children)
    }
  }
  walk(wmsStore.itemCategoryTreeList)
  return map
})
/** 只显示有数据的分类：本身有数、或下级有数就保留。父分类把子分类一起加，不会重复计算。 */
const categoryTreeVisible = computed(() => {
  if (!hideEmptyCategories.value) return wmsStore.itemCategoryTreeList
  const map = categoryChildrenMap.value
  const own = categoryCounts.value
  const totalOf = id => {
    const row = own[String(id)]
    const self = row ? (Number(row.unstocked) || 0) + (Number(row.stocked) || 0) + (Number(row.sold) || 0) : 0
    const kids = (map[String(id)] || []).reduce((sum, child) => sum + totalOf(child), 0)
    return self + kids
  }
  const walk = nodes => (nodes || [])
    .map(node => {
      const children = walk(node.children)
      const keep = totalOf(node.id) > 0 || children.length > 0
      return keep ? { ...node, children } : null
    })
    .filter(Boolean)
  return walk(wmsStore.itemCategoryTreeList)
})
function toggleHideEmptyCategories() {
  hideEmptyCategories.value = !hideEmptyCategories.value
  if (!hideEmptyCategories.value) return
  const allowed = new Set()
  const walk = nodes => {
    for (const node of nodes || []) {
      allowed.add(String(node.id))
      walk(node.children)
    }
  }
  walk(categoryTreeVisible.value)
  if (categoryId.value && !allowed.has(String(categoryId.value))) {
    categoryId.value = null
    onCategoryChange()
  }
}
const hideEmptyBrands = ref(false)
const visibleBrandOptions = computed(() => {
  if (!hideEmptyBrands.value) return brandOptions.value
  return brandOptions.value.filter(brand => {
    const row = brandCounts.value[brand.key]
    if (!row) return false
    return (Number(row.unstocked) || 0) + (Number(row.stocked) || 0) + (Number(row.sold) || 0) > 0
  })
})
function toggleHideEmptyBrands() {
  hideEmptyBrands.value = !hideEmptyBrands.value
  const keys = new Set(visibleBrandOptions.value.map(brand => brand.key))
  const next = brandIds.value.filter(key => keys.has(key))
  if (next.length !== brandIds.value.length) {
    brandIds.value = next
    load()
  }
}
function brandCountOf(key) {
  const row = brandCounts.value[key]
  if (!row) return ''
  const stocked = Number(row.stocked) || 0
  const sold = Number(row.sold) || 0
  const unstocked = Number(row.unstocked) || 0
  return `${t('在库')} ${formatQty(stocked)} · ${t('已售')} ${formatQty(sold)} · ${t('待入库')} ${formatQty(unstocked)}`
}
async function loadBrandCounts(targets) {
  try {
    const response = await warehouseProductFilterCounts({
      warehouseIds: targets.map(room => room.id).join(','),
      itemCategory: categoryId.value || undefined,
      ...soldRangeParams()
    })
    const merged = {}
    for (const row of response.data?.brands || []) {
      const key = row.brandKey
      if (!key) continue
      merged[key] = {
        unstocked: Number(row.unstocked) || 0,
        stocked: Number(row.stocked) || 0,
        sold: Number(row.sold) || 0
      }
    }
    brandCounts.value = merged
    const catMerged = {}
    for (const row of response.data?.categories || []) {
      const key = String(row.categoryId)
      if (!key || key === 'null') continue
      catMerged[key] = {
        unstocked: Number(row.unstocked) || 0,
        stocked: Number(row.stocked) || 0,
        sold: Number(row.sold) || 0
      }
    }
    categoryCounts.value = catMerged
  } catch (_) {
    brandCounts.value = {}
    categoryCounts.value = {}
  }
}
async function loadCategoryCounts() {
  // 分类件数已随 loadBrandCounts 一起取回，这里不再单独请求。
}

async function loadCategoryBrands() {
  const token = ++categoryBrandToken
  const id = categoryId.value
  if (!id) {
    categoryBrandRows.value = null
    return
  }
  try {
    const res = await listItemBrand({ itemCategory: id })
    if (token !== categoryBrandToken) return
    categoryBrandRows.value = res.data || []
  } catch (_) {
    if (token !== categoryBrandToken) return
    categoryBrandRows.value = []
  }
}
function findCategoryLabel(id, nodes = wmsStore.itemCategoryTreeList) {
  const wanted = String(id)
  for (const node of nodes || []) {
    if (String(node.id) === wanted) return node.label || ''
    const nested = findCategoryLabel(id, node.children)
    if (nested) return nested
  }
  return ''
}
const brandPlaceholder = computed(() => categoryId.value ? (findCategoryLabel(categoryId.value) || t('输入品牌名')) : t('输入品牌名'))
const filterScopeParts = computed(() => {
  const picked = new Set(brandIds.value)
  const brands = brandOptions.value.filter(brand => picked.has(brand.key)).map(brand => brand.name)
  const category = categoryId.value ? findCategoryLabel(categoryId.value) : ''
  return {
    category,
    brands,
    mode: category ? (brands.length ? 'both' : 'category') : (brands.length ? 'brandOnly' : 'none')
  }
})
const filterScope = computed(() => {
  const { category, brands, mode } = filterScopeParts.value
  if (mode === 'both') return `${category} · ${brands.join('、')}`
  if (mode === 'category') return `${category} · ${t('该分类全部品牌')}`
  if (mode === 'brandOnly') return `${t('仅品牌')} ${brands.join('、')}`
  return ''
})
const scopeChips = computed(() => {
  const { category, brands, mode } = filterScopeParts.value
  const allBrands = brands.join('、')
  const countsSummary = (() => {
    if (!brands.length) return ''
    const picked = new Set(brandIds.value)
    let stocked = 0
    let sold = 0
    let unstocked = 0
    for (const brand of brandOptions.value) {
      if (!picked.has(brand.key)) continue
      const row = brandCounts.value[brand.key]
      if (!row) continue
      stocked += Number(row.stocked) || 0
      sold += Number(row.sold) || 0
      unstocked += Number(row.unstocked) || 0
    }
    return `${t('当前范围件数：在库')} ${formatQty(stocked)}${t('，已售')} ${formatQty(sold)}${t('，待入库')} ${formatQty(unstocked)}`
  })()
  if (mode === 'both') return [
    { key: 'category', label: t('分类'), value: category, full: category },
    { key: 'brand', label: t('品牌'), value: allBrands, full: `${allBrands}${countsSummary ? `\n${countsSummary}` : ''}` }
  ]
  if (mode === 'category') return [
    { key: 'category', label: t('分类'), value: category, full: category },
    { key: 'brand', label: t('品牌'), value: t('该分类全部品牌'), full: t('该分类全部品牌') }
  ]
  if (mode === 'brandOnly') return [
    {
      key: 'brandOnly',
      label: t('仅按品牌'),
      value: `${t('未选分类')} · ${allBrands}`,
      full: `${t('未选分类，按品牌名字统计')}：${allBrands}${countsSummary ? `\n${countsSummary}` : ''}`
    }
  ]
  return []
})
/** 与「已售出」相关的图加上区间标记；在库成本不随区间变，单独写一句。 */
const rangeChip = computed(() => ({
  key: 'range',
  label: t('统计区间'),
  value: `${rangeLabel.value} · ${t('只筛已售出，按出库完成时间算，含起止当天')}`,
  full: `${rangeLabel.value}\n${t('只作用于「已售出」和由它算出来的数字，按销售出库的完成时间判断，起止两天都算在内。未入库、已入库仍是此刻的库存，不随区间变化。')}`
}))
const liveChip = computed(() => ({
  key: 'live',
  label: t('不受统计区间影响'),
  value: t('按此刻库存算，区间只筛已售出'),
  full: t('这张图看的是现在这一刻还压在库里的成本，所以不按区间筛选。区间只作用于已售出和由已售出算出来的数字。')
}))
const chartScopeMixin = computed(() => (hasRange.value ? [rangeChip.value] : []))
const brandMixNote = computed(() => {
  if (categoryId.value || !focusId.value || !brandIds.value.length) return []
  const picked = new Set(brandIds.value)
  return brandOptions.value.filter(brand => picked.has(brand.key))
})
function chartTitle(name) {
  if (!filterScope.value) return t(name)
  const { category, brands, mode } = filterScopeParts.value
  if (mode === 'both') return `${t(name)} | ${t('分类')}：${category} | ${t('品牌')}：${brands.join('、')}`
  if (mode === 'category') return `${t(name)} | ${t('分类')}：${category} | ${t('品牌')}：${t('该分类全部品牌')}`
  return `${t(name)} | ${t('仅按品牌')}（${t('未选分类')}）：${brands.join('、')}`
}
const selectedBrandIds = computed(() => {
  const picked = new Set(brandIds.value)
  return brandOptions.value.filter(brand => picked.has(brand.key)).flatMap(brand => brand.ids)
})
const rooms = ref([])
const missingNames = ref([])
const mixEl = ref(null)
const compareEl = ref(null)
const compareSort = ref('default')
const compareSortOptions = [
  { id: 'default', label: '默认顺序', hint: '按直播间原来的先后顺序排：Ebay1 到 Ebay4，再 TK1 到 TK3，最后 WN。' },
  { id: 'unstocked', label: '按未入库', hint: '按未入库从多到少排，最多的几间排在最左边。' },
  { id: 'stocked', label: '按已入库', hint: '按已入库从多到少排，最多的几间排在最左边。' },
  { id: 'sold', label: '按已售出', hint: '按已售出从多到少排，最多的几间排在最左边。' }
]
const compareSortHint = computed(() => compareSortOptions.find(option => option.id === compareSort.value).hint)
const compareTable = computed(() => {
  if (focusId.value !== 'compare' || compareSort.value === 'default') return []
  const key = compareSort.value
  const height = room => Number(room.unstocked || 0) + Number(room.stocked || 0) + Number(room.sold || 0)
  return rooms.value
    .map((room, index) => ({ id: room.id, name: room.name, index, value: Number(room[key]) || 0, height: height(room) }))
    .sort((a, b) => b.value - a.value || b.height - a.height || a.index - b.index)
    .map(room => ({ id: room.id, name: room.name, value: room.value }))
})
const compareTableTitle = computed(() => {
  const option = compareSortOptions.find(item => item.id === compareSort.value)
  return option ? `${t(option.label)}${t('明细')}` : ''
})
const mixSideRows = computed(() => {
  const rooms = shownRooms.value
  if (!rooms.length) return []
  const sum = key => rooms.reduce((total, room) => total + (Number(room[key]) || 0), 0)
  const totalsOf = { unstocked: sum('unstocked'), stocked: sum('stocked'), sold: sum('sold') }
  const pct = (value, base) => base > 0 ? `${(value / base * 100).toFixed(1)}%` : '--'
  return rooms
    .map((room, index) => ({ room, index }))
    .sort((a, b) => (Number(b.room.stocked) || 0) - (Number(a.room.stocked) || 0) || a.index - b.index)
    .map(({ room }) => ({
      id: room.id,
      name: room.name,
      unstocked: pct(Number(room.unstocked) || 0, totalsOf.unstocked),
      stocked: pct(Number(room.stocked) || 0, totalsOf.stocked),
      sold: pct(Number(room.sold) || 0, totalsOf.sold)
    }))
})
const profitPieRows = computed(() => {
  if (focusId.value === 'profit' && profitMode.value !== 'sold') return []
  if (!shownRooms.value.some(room => room.pricesVisible)) return []
  return shownRooms.value
    .map(room => ({ id: room.id, name: room.name, value: Number(room.soldProfit) || 0 }))
    .filter(row => row.value > 0)
})
const profitPieEl = ref(null)
const rankEl = ref(null)
const rateRankEl = ref(null)
const profitEl = ref(null)
const costEl = ref(null)
const profitMode = ref('sold')
const orient = ref({ rank: 'h', rateRank: 'h', profit: 'h', cost: 'h' })
function setOrient(id, value) {
  if (orient.value[id] === value) return
  orient.value = { ...orient.value, [id]: value }
}
const profitModes = [
  { id: 'sold', label: '已售出', hint: '只算已经卖掉的货。一件的利润 = 售价 − 成本价，再按件数相加。售价或成本价没填的不计。' },
  { id: 'stockedSold', label: '已售出 + 已入库', hint: '已售出是已经拿到的利润。已入库是这些货如果按现在的售价全部卖掉，还能再拿到的利润。' },
  { id: 'all', label: '未入库 + 已入库 + 已售出', hint: '在上面的基础上，再把未入库也按同样的售价算进去。这是货到了并且卖掉之后的利润。' }
]
const profitFormulas = [
  '每件利润 = 售价 − 成本价',
  '已售出：实际已经拿到的利润',
  '已入库：按现在的售价，假设这些货全部卖掉后还能拿到的利润',
  '未入库：按现在的售价，假设货到了并且卖掉后还能拿到的利润',
  '售价或成本价没填的货不计入利润'
]
const profitView = ref('value')
const profitViews = [
  { id: 'value', label: '按金额', hint: '按总金额排序，钱最多的一间排在最前。看哪一间实际和潜在的利润最高。' },
  { id: 'percent', label: '按比例', hint: '每间都画满 100%，只比较各部分占多少，再按你选的排序项从高到低排。' }
]
const profitSortBy = ref('soldProfit')
const profitSortOptions = computed(() => {
  const keys = profitParts(profitMode.value)
  return [
    { id: 'soldProfit', label: '已售出占比' },
    { id: 'stockedProfit', label: '已入库占比' },
    { id: 'unstockedProfit', label: '未入库占比' }
  ].filter(option => keys.includes(option.id))
})
watch(profitMode, mode => {
  if (mode === 'sold' && profitView.value === 'percent') profitView.value = 'value'
  const keys = profitParts(mode)
  if (!keys.includes(profitSortBy.value)) profitSortBy.value = keys[0]
})
const profitHint = computed(() => {
  const mode = profitModes.find(item => item.id === profitMode.value)
  if (!mode) return ''
  if (profitView.value === 'percent') {
    const sort = profitSortOptions.value.find(item => item.id === profitSortBy.value)
    if (!sort) return t(mode.hint)
    return `${t(mode.hint)} ${t('画满 100% 对比比例，按')}${t(sort.label)}${t('从高到低排。')}`
  }
  return t(mode.hint)
})
const profitRulesOpen = ref(false)

const chartNote = computed(() => ({
  mix: '未入库、已入库、已售出，各占三种状态合计的比例。三件货可能重叠：比如一件已经卖掉的货，也可能同时被算进「已入库」，所以三个比例加起来一定等于 100%，但三张卡片的数字不能互相加总。下方的小饼图按同样的算法拆到每一间。',
  compare: '每一间一条柱子，未入库、已入库、已售出分别堆叠。三种口径互相独立，柱子的高度只是这三种口径摆在一起对比，不代表这间一共有多少件货。',
  rank: '按已售出件数从多到少排序。已售出指已完成销售的出库，和上面「已售出排名」的口径一致。',
  rateRank: hasRange.value
    ? `${t('统计区间')} ${rangeLabel.value} ${t('内：售罄率 = 区间已售出 ÷（区间已售出 + 当前已入库）。区间只作用于已售出，已入库仍是现在的库存，所以这个比例是区间口径，和整页其他数字不能直接比。')}`
    : '售罄率 = 已售出 ÷（已入库 + 已售出）。按这个比例从高到低排序。已入库或已售出都为 0 的直播间，比例按 0 排在最后。',
  cost: '成本 = 成本价 × 件数，只统计「已入库」这一项。成本价没填的货不计入。它表示这间里还压着多少钱的货，不是利润。'
}))
const splitUnstockedEl = ref(null)
const splitStockedEl = ref(null)
const splitSoldEl = ref(null)
const brandSplit = ref([])
const splitLoading = ref(false)
let splitToken = 0
const SPLIT_COLORS = ['#2f6fe0', '#1298b0', '#e989c8', '#7a5bd0', '#f08a24', '#1b9a5a', '#5c86f6', '#d46eae', '#8eaddf', '#3ed6e6', '#f6b4d8', '#6aa4ff']
const pieEls = new Map()
const charts = []

const shownRooms = computed(() => roomIds.value.length ? rooms.value.filter(room => roomIds.value.includes(room.id)) : rooms.value)
const totals = computed(() => shownRooms.value.reduce((sum, room) => ({
  unstocked: sum.unstocked + room.unstocked,
  stocked: sum.stocked + room.stocked,
  sold: sum.sold + room.sold
}), { unstocked: 0, stocked: 0, sold: 0 }))
const totalSoldProfit = computed(() => shownRooms.value.reduce((sum, room) => sum + (Number(room.soldProfit) || 0), 0))
const totalPricesVisible = computed(() => shownRooms.value.some(room => room.pricesVisible))
const soldProfitText = computed(() => totalPricesVisible.value ? moneyText(totalSoldProfit.value) : '--')

const PLACE = {
  item: { name: '商品管理', to: '/basic/item' },
  overview: { name: '仓库商品总览', to: '/warehouse-products' },
  map: { name: '采购人仓库映射' },
  inventory: { name: '库存统计', to: '/inventory' },
  ops: { name: '库存操作' },
  shipment: { name: '出库', to: '/wms/order/shipmentOrder' }
}
const metricCards = computed(() => [
  {
    key: 'unstocked', title: '未入库', icon: Van, value: formatQty(totals.value.unstocked),
    brief: '已归属本直播间、但系统中尚无库存记录的待入库商品数量',
    lines: [
      { label: '统计口径', parts: [
        { text: '统计对象：已通过采购人仓库映射归属到本直播间、且在系统任意仓库均无库存记录的商品。计量单位：件。数量取' }, PLACE.item, { text: '中登记的预计数量，不按收发货差额推算。' }
      ] },
      { label: '数据来源', parts: [
        { text: '采购人及预计数量取自' }, PLACE.item, { text: '；仓库归属取自' }, PLACE.overview, { text: '中的' }, PLACE.map,
        { text: '。未完成归属映射的商品不计入任何直播间。' }
      ] }
    ],
    note: '「无库存记录」按系统全部仓库判定，不限于本页汇总的 8 个直播间。其他仓库只要产生过库存记录，即使当前数量为零，该商品也不再计为未入库。'
  },
  {
    key: 'stocked', title: '已入库', icon: Box, value: formatQty(totals.value.stocked),
    brief: '本直播间当前在库、库存数量大于零的商品数量合计',
    lines: [
      { label: '统计口径', parts: [{ text: '统计范围为当前直播间内库存数量大于零的商品，计量单位为件，按数量求和，库存数量为零的不计入。仅存放在上级仓库、未分配至直播间的库存不计入本直播间。' }] },
      { label: '数据来源', parts: [{ text: '取自' }, PLACE.inventory, { text: '中该直播间当前的库存数量。' }] }
    ]
  },
  {
    key: 'sold', title: '已售出', icon: ShoppingBag, value: formatQty(totals.value.sold),
    brief: hasRange.value
      ? `${t('统计区间')} ${rangeLabel.value} ${t('内，由本直播间出库且销售出库单已完成的商品数量合计')}`
      : '由本直播间出库、且销售出库单已完成的商品数量合计',
    lines: [
      { label: '统计口径', parts: [
        { text: '统计对象：出库类型为销售出库、单据状态为已完成、且出库仓库为本直播间的出库单商品，计量单位为件，按明细数量求和。未完成的出库单不计入。' },
        ...(hasRange.value ? [{ text: ` ${t('已选择统计区间')} ${rangeLabel.value}${t('，只统计该区间内完成的出库，按出库单完成时间判断，起止日期都包含当天。')}` }] : [])
      ] },
      { label: '数据来源', parts: [
        { text: '取自左侧菜单' }, PLACE.ops, { text: '下的' }, PLACE.shipment,
        { text: '。不取自平台订单，也不取自开播时手工填写的销售额。' }
      ] }
    ]
  },
  {
    key: 'soldProfit', title: '已售出利润', icon: Money, value: soldProfitText.value,
    brief: hasRange.value
      ? `${t('统计区间')} ${rangeLabel.value} ${t('内，已售出商品按 售价 − 成本价 计算出的利润合计')}`
      : '已售出商品按 售价 − 成本价 计算出的利润合计',
    lines: [
      { label: '统计口径', parts: [
        { text: '统计对象：与「已售出」口径一致的销售出库商品明细。单件利润 = 售价 − 成本价，再乘以出库数量后求和。售价或成本价缺失的商品不计入利润。' },
        ...(hasRange.value ? [{ text: ` ${t('已选择统计区间')} ${rangeLabel.value}${t('，只统计该区间内完成的出库所产生的利润。')}` }] : [])
      ] },
      { label: '数据来源', parts: [
        { text: '成本价与售价取自' }, PLACE.inventory, { text: '中对应商品的成本价与销售价；销售出库数量取自左侧菜单' }, PLACE.ops,
        { text: '下的' }, PLACE.shipment, { text: '。该数字随当前库存价格变动，不是出库当时锁定的成交价。' }
      ] }
    ],
    note: '当前账号没有查看价格的权限时，此卡不显示金额。利润按当前商品资料中的售价与成本价计算，商品改价后重新进入本页即会变化。'
  }
])
const activeMetric = computed(() => metricCards.value.find(card => card.key === explainKey.value))

const rateText = (stocked, sold) => {
  const base = Number(stocked || 0) + Number(sold || 0)
  if (base <= 0) return '--'
  return `${((Number(sold || 0) / base) * 100).toFixed(1)}%`
}

function formatQty(value) {
  return Number(value || 0).toLocaleString()
}
function chartClass(id) {
  return { 'is-on': focusId.value === id, 'is-mini': focusId.value && focusId.value !== id }
}
function focusLabel(id) {
  return t(focusId.value === id ? '点击收回' : '点击放大')
}
function focusChart(id) {
  focusId.value = focusId.value === id ? '' : id
}
function pickRoom(id) {
  if (roomIds.value.includes(id)) roomIds.value = roomIds.value.filter(item => item !== id)
  else roomIds.value = [...roomIds.value, id]
}
function resetAll() {
  roomIds.value = []
  soldRange.value = []
  categoryId.value = null
  brandIds.value = []
  categoryBrandRows.value = null
  focusId.value = ''
  explainKey.value = ''
  compareSort.value = 'default'
  profitView.value = 'value'
  profitMode.value = 'sold'
  profitSortBy.value = 'soldProfit'
  profitRulesOpen.value = false
  orient.value = { rank: 'h', rateRank: 'h', profit: 'h', cost: 'h' }
  load()
}
function setPieEl(id, el) {
  if (el) pieEls.set(id, el)
  else pieEls.delete(id)
}
function slices(room) {
  return [
    { name: t('未入库'), value: room.unstocked, itemStyle: { color: paint('unstocked') } },
    { name: t('已入库'), value: room.stocked, itemStyle: { color: paint('stocked') } },
    { name: t('已售出'), value: room.sold, itemStyle: { color: paint('sold') } }
  ]
}
function pieOption(room, compact) {
  const empty = room.unstocked + room.stocked + room.sold <= 0
  return {
    tooltip: { trigger: 'item' },
    graphic: empty ? [{ type: 'text', left: 'center', top: 'middle', style: { text: t('暂无数量'), fill: '#98a2b3', fontSize: 12 } }] : [],
    series: [{
      type: 'pie',
      center: compact ? ['50%', '52%'] : ['50%', '58%'],
      radius: compact ? ['46%', '72%'] : ['38%', '60%'],
      itemStyle: { borderColor: '#fff', borderWidth: compact ? 2 : 3 },
      label: { show: !compact && !empty, formatter: '{b}\n{d}%' },
      data: empty ? [] : slices(room)
    }]
  }
}
function keep(chart, el) {
  if (!el) return null
  const existing = echarts.getInstanceByDom(el) || echarts.init(el)
  if (!charts.includes(existing)) charts.push(existing)
  return existing
}
function moneyText(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function sellRate(room) {
  const base = Number(room.stocked || 0) + Number(room.sold || 0)
  if (base <= 0) return null
  return Number(room.sold || 0) / base * 100
}
function profitParts(mode) {
  if (mode === 'all') return ['soldProfit', 'stockedProfit', 'unstockedProfit']
  if (mode === 'stockedSold') return ['soldProfit', 'stockedProfit']
  return ['soldProfit']
}
function profitTotal(room, mode) {
  return profitParts(mode).reduce((sum, key) => sum + (Number(room[key]) || 0), 0)
}
function gradient(from, to, vertical) {
  const stops = Array.isArray(from)
    ? from.map((color, index) => ({ offset: from.length > 1 ? index / (from.length - 1) : 0, color }))
    : [{ offset: 0, color: from }, { offset: 1, color: to }]
  return new echarts.graphic.LinearGradient(0, 0, vertical ? 0 : 1, vertical ? 1 : 0, stops)
}
/** 柱子从 0 开始会压住纵轴，用一条最上层的线把 0 位置重新描出来。 */
function axisLineAtZero(vertical) {
  return {
    silent: true, symbol: 'none', animation: false,
    label: { show: false },
    lineStyle: { color: '#94a3b8', width: 1, type: 'solid' },
    data: [vertical ? { yAxis: 0 } : { xAxis: 0 }]
  }
}
function rankBar(el, rows, colors, format, vertical) {
  const ordered = vertical ? rows : [...rows].reverse()
  keep(null, el)?.setOption({
    tooltip: { trigger: 'axis', valueFormatter: value => format(value) },
    grid: vertical
      ? { left: 56, right: 20, top: 24, bottom: 48 }
      : { left: 72, right: 24, top: 28, bottom: 24 },
    xAxis: vertical
      ? { type: 'category', data: ordered.map(row => row.name), axisLabel: { interval: 0, rotate: ordered.length > 6 ? 30 : 0 } }
      : { type: 'value' },
    yAxis: vertical
      ? { type: 'value' }
      : { type: 'category', data: ordered.map(row => row.name) },
    series: [{
      type: 'bar',
      data: ordered.map(row => row.value),
      barMaxWidth: vertical ? 26 : 22,
      markLine: axisLineAtZero(vertical),
      itemStyle: { color: gradient(colors, null, vertical), borderRadius: 0 }
    }]
  }, true)
}
function emptyChart(el, text) {
  keep(null, el)?.setOption({
    graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text, fill: '#98a2b3', fontSize: 12 } }],
    xAxis: { show: false }, yAxis: { show: false }, series: []
  }, true)
}
function splitPie(rows) {
  const data = rows.filter(row => row.value > 0).map((row, index) => ({
    name: row.name,
    value: row.value,
    itemStyle: { color: SPLIT_COLORS[index % SPLIT_COLORS.length] }
  }))
  return {
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0 },
    graphic: data.length ? [] : [{ type: 'text', left: 'center', top: 'middle', style: { text: t('暂无数量'), fill: '#98a2b3', fontSize: 12 } }],
    series: [{
      type: 'pie', radius: ['36%', '58%'], center: ['50%', '42%'],
      label: { show: data.length > 0, formatter: '{b}\n{d}%' },
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      data
    }]
  }
}
function renderSplits() {
  keep(null, splitUnstockedEl.value)?.setOption(splitPie(brandSplit.value.map(row => ({ name: row.name, value: row.unstocked }))), true)
  keep(null, splitStockedEl.value)?.setOption(splitPie(brandSplit.value.map(row => ({ name: row.name, value: row.stocked }))), true)
  keep(null, splitSoldEl.value)?.setOption(splitPie(brandSplit.value.map(row => ({ name: row.name, value: row.sold }))), true)
}
async function loadBrandSplit() {
  const token = ++splitToken
  const targets = shownRooms.value
  if (!categoryId.value || !targets.length) {
    brandSplit.value = []
    return
  }
  splitLoading.value = true
  try {
    const response = await warehouseProductBrandSplit({
      warehouseIds: targets.map(room => room.id).join(','),
      itemCategory: categoryId.value,
      itemBrand: selectedBrandIds.value.length ? selectedBrandIds.value : undefined,
      ...soldRangeParams()
    })
    if (token !== splitToken) return
    brandSplit.value = (response?.data || []).map(row => ({
      name: row.brandName,
      unstocked: Number(row.unstocked) || 0,
      stocked: Number(row.stocked) || 0,
      sold: Number(row.sold) || 0
    }))
    await nextTick()
    renderSplits()
  } catch (_) {
    if (token === splitToken) brandSplit.value = []
  } finally {
    if (token === splitToken) splitLoading.value = false
  }
}
function render() {
  const current = totals.value
  keep(null, mixEl.value)?.setOption(pieOption(current, false), true)
  const compareOrdered = compareSort.value === 'default'
    ? shownRooms.value
    : [...shownRooms.value]
      .map((room, index) => {
        const height = Number(room.unstocked || 0) + Number(room.stocked || 0) + Number(room.sold || 0)
        return { room, index, height }
      })
      .sort((a, b) => (Number(b.room[compareSort.value]) || 0) - (Number(a.room[compareSort.value]) || 0)
        || b.height - a.height
        || a.index - b.index)
      .map(item => item.room)
  keep(null, compareEl.value)?.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: [t('未入库'), t('已入库'), t('已售出')], top: 12 },
    grid: { left: 48, right: 16, top: 52, bottom: 24 },
    xAxis: { type: 'category', data: compareOrdered.map(room => room.name) },
    yAxis: { type: 'value' },
    series: ['unstocked', 'stocked', 'sold'].map(key => ({
      name: t(key === 'unstocked' ? '未入库' : key === 'stocked' ? '已入库' : '已售出'),
      type: 'bar', stack: 'rooms', data: compareOrdered.map(room => room[key]),
      markLine: key === 'unstocked' ? axisLineAtZero(true) : undefined,
      itemStyle: { color: paint(key), borderRadius: 0 }
    }))
  }, true)
  const ranked = [...shownRooms.value].sort((a, b) => b.sold - a.sold)
  rankBar(rankEl.value, ranked.map(room => ({ name: room.name, value: room.sold })), ['#6AA4FF', '#5C9BFF', '#F3A8D0'], value => formatQty(value), orient.value.rank === 'v')
  const rated = [...shownRooms.value].sort((a, b) => (sellRate(b) || -1) - (sellRate(a) || -1))
  rankBar(rateRankEl.value, rated.map(room => ({ name: room.name, value: sellRate(room) || 0 })), ['#7FE3EE', '#3ED6E6', '#1298B0'], value => `${Number(value || 0).toFixed(1)}%`, orient.value.rateRank === 'v')
  const mode = focusId.value === 'profit' ? profitMode.value : 'sold'
  renderProfit(mode)
  if (!shownRooms.value.some(room => room.costVisible)) emptyChart(costEl.value, t('没有价格权限'))
  else {
    const costed = [...shownRooms.value].sort((a, b) => (b.stockedCost || 0) - (a.stockedCost || 0))
    rankBar(costEl.value, costed.map(room => ({ name: room.name, value: room.stockedCost || 0 })), ['#A9C6FF', '#5C9BFF', '#2459C0'], moneyText, orient.value.cost === 'v')
  }
  if (focusId.value === 'mix') shownRooms.value.forEach(room => keep(null, pieEls.get(room.id))?.setOption(pieOption(room, true), true))
  if (profitPieRows.value.length) {
    keep(null, profitPieEl.value)?.setOption(splitPie(profitPieRows.value), true)
  }
  nextTick(() => charts.forEach(chart => chart.resize()))
}
function renderProfit(mode) {
  const rooms = shownRooms.value
  if (!rooms.some(room => room.pricesVisible)) {
    emptyChart(profitEl.value, t('没有价格权限'))
    return
  }
  const keys = profitParts(mode)
  // 收回后的缩略图只算「已售出」，按比例画每根都是 100%，没有比较意义，
  // 所以只有展开时才按比例，收回一律按金额。
  const percent = focusId.value === 'profit' && profitView.value === 'percent' && keys.length > 1
  const activeSort = keys.includes(profitSortBy.value) ? profitSortBy.value : keys[0]
  const sortValue = room => percent
    ? (profitTotal(room, mode) > 0 ? Number(room[activeSort] || 0) / profitTotal(room, mode) : -1)
    : profitTotal(room, mode)
  const ranked = [...rooms].sort((a, b) => sortValue(b) - sortValue(a)).reverse()
  const names = { soldProfit: t('已售出'), stockedProfit: t('已入库'), unstockedProfit: t('未入库') }
  const keyColors = { soldProfit: ['#F6B4D8', '#E989C8', '#D46EAE'], stockedProfit: ['#A9C6FF', '#5C9BFF', '#2459C0'], unstockedProfit: ['#7FE3EE', '#3ED6E6', '#1298B0'] }
  const vertical = orient.value.profit === 'v'
  const shown = vertical ? [...ranked].reverse() : ranked
  const percentValue = (room, key) => {
    const total = profitTotal(room, mode)
    return total > 0 ? Number(room[key] || 0) / total * 100 : 0
  }
  const valueAxis = percent ? { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } } : { type: 'value' }
  const sortKey = percent ? activeSort : ''
  const labelOf = key => (sortKey && key === sortKey
    ? `<b style="color:#d92d20">${names[key]}</b><b style="color:#d92d20"> ${t('（排序依据）')}</b>`
    : names[key])
  keep(null, profitEl.value)?.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const list = Array.isArray(params) ? params : [params]
        const room = ranked.find(item => item.name === list[0]?.name)
        if (!room) return list[0]?.name || ''
        const total = profitTotal(room, mode)
        const single = keys.length === 1
        const lines = keys.map(key => {
          const value = Number(room[key] || 0)
          if (single) return `${labelOf(key)} ${moneyText(value)}`
          const share = total > 0 ? `${(value / total * 100).toFixed(1)}%` : '--'
          return `${labelOf(key)} ${moneyText(value)}（${share}）`
        })
        if (!single) lines.push(`${t('合计')} ${moneyText(total)}`)
        return [`${list[0]?.name || ''}`, ...lines].join('<br/>')
      }
    },
    legend: keys.length > 1 ? { top: 8, data: keys.map(key => names[key]) } : undefined,
    grid: vertical
      ? { left: 56, right: 20, top: keys.length > 1 ? 48 : 28, bottom: 48 }
      : { left: 72, right: 24, top: keys.length > 1 ? 42 : 28, bottom: 24 },
    xAxis: vertical
      ? { type: 'category', data: shown.map(room => room.name), axisLabel: { interval: 0, rotate: shown.length > 6 ? 30 : 0 } }
      : valueAxis,
    yAxis: vertical
      ? valueAxis
      : { type: 'category', data: shown.map(room => room.name) },
    series: keys.map(key => ({
      name: names[key], type: 'bar', stack: 'profit',
      barMaxWidth: vertical ? 26 : 22,
      itemStyle: { color: gradient(keyColors[key], null, vertical) },
      markLine: keys.indexOf(key) === 0 ? axisLineAtZero(vertical) : undefined,
      data: shown.map(room => percent ? percentValue(room, key) : Number(room[key] || 0))
    }))
  }, true)
}
function matchRoom(nodes, name) {
  const wanted = name.trim().toLowerCase()
  const named = nodes.filter(node => String(node.roomName || node.warehouseName || '').trim().toLowerCase() === wanted)
  return named.find(node => String(node.rootWarehouseName || '').toUpperCase().includes('DTLA') && Number(node.warehouseLevel) === 2)
    || named.find(node => Number(node.warehouseLevel) === 2)
    || named[0]
}
async function load() {
  loading.value = true
  try {
    if (!wmsStore.itemCategoryTreeList.length) await wmsStore.getItemCategoryTreeList()
    if (!wmsStore.itemBrandList.length) await wmsStore.getItemBrandList()
    const response = await warehouseOptions({})
    const nodes = response.data || []
    const found = []
    const missing = []
    ROOM_NAMES.forEach(name => {
      const node = matchRoom(nodes, name)
      if (node) found.push(node)
      else missing.push(name)
    })
    missingNames.value = missing
    const ids = found.map(node => node.id)
    const snapshotResponse = await warehouseProductRoomSnapshots({
      warehouseIds: ids.join(','),
      itemCategory: categoryId.value || undefined,
      itemBrand: selectedBrandIds.value,
      ...soldRangeParams()
    })
    const snapshotMap = new Map()
    for (const item of snapshotResponse.data || []) {
      snapshotMap.set(String(item.warehouseId), item)
    }
    const amount = value => {
      const number = Number(value)
      return Number.isFinite(number) ? number : 0
    }
    const summaries = found.map(node => {
      const snap = snapshotMap.get(String(node.id)) || {}
      return {
        id: node.id,
        name: node.roomName || snap.roomName || node.warehouseName,
        unstocked: amount(snap.unstocked),
        stocked: amount(snap.stocked),
        sold: amount(snap.sold),
        costVisible: snap.costVisible === true,
        pricesVisible: snap.pricesVisible === true,
        unstockedCost: amount(snap.unstockedCost),
        stockedCost: amount(snap.stockedCost),
        soldCost: amount(snap.soldCost),
        unstockedProfit: amount(snap.unstockedProfit),
        stockedProfit: amount(snap.stockedProfit),
        soldProfit: amount(snap.soldProfit)
      }
    })
    rooms.value = summaries
    const available = new Set(summaries.map(room => room.id))
    if (roomIds.value.length) roomIds.value = roomIds.value.filter(id => available.has(id))
    const targets = roomIds.value.length ? summaries.filter(room => roomIds.value.includes(room.id)) : summaries
    await loadBrandCounts(targets)
    // 明细表在页面底部，滚动到附近再加载，首屏不占用查询时间
    if (detailVisible.value) await loadDetails()
    else detailPending.value = true
    detailPage.value = 1
    await loadDetails()
    await nextTick()
    render()
  } catch (error) {
    proxy?.$modal?.msgError(error?.message || t('加载失败'))
  } finally {
    loading.value = false
  }
}
async function onCategoryChange() {
  await loadCategoryBrands()
  const keys = new Set(brandOptions.value.map(brand => brand.key))
  const next = brandIds.value.filter(key => keys.has(key))
  if (next.length !== brandIds.value.length) brandIds.value = next
  load()
}
function onResize() { charts.forEach(chart => chart.resize()) }

watch(profitMode, async () => { await nextTick(); render() })
watch(profitView, async () => { await nextTick(); render() })
watch(profitSortBy, async () => { await nextTick(); render() })
watch(compareSort, async () => { await nextTick(); render() })
watch(orient, async () => { await nextTick(); render() }, { deep: true })
watch([roomIds, focusId, categoryId, brandIds], async () => {
  await nextTick()
  render()
  if (focusId.value && categoryId.value) await loadBrandSplit()
  else splitToken += 1
}, { deep: true })
const lastSyncAt = ref('')
let autoSyncTimer = null
const AUTO_SYNC_MS = 5 * 60 * 1000
/** 同步时间统一按美西时间显示，带年月日时分；中英切换由模板里的 t() 负责。 */
function pacificNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date())
  const pick = type => parts.find(part => part.type === type)?.value || ''
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`
}
function stampSync() {
  lastSyncAt.value = pacificNow()
}
async function refreshNow() {
  await load()
  stampSync()
  proxy?.$modal?.msgSuccess(t('已拉取最新数据'))
}
onMounted(async () => {
  window.addEventListener('resize', onResize)
  if (categoryId.value) await loadCategoryBrands()
  await load()
  stampSync()
  observeDetailBlock()
  autoSyncTimer = window.setInterval(() => {
    load().then(stampSync)
  }, AUTO_SYNC_MS)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (autoSyncTimer) window.clearInterval(autoSyncTimer)
  if (detailObserver) detailObserver.disconnect()
  charts.forEach(chart => chart.dispose())
})
</script>

<style scoped>
.live-rooms { display: flex; flex-direction: column; gap: 16px; }
.live-rooms :deep(.el-card) { border: 1px solid #ebeef5; border-radius: 4px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); }
.live-rooms__head, .room header, .chart header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.live-rooms__head { padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid #eef2f6; }
.live-rooms__actions { display: inline-flex; align-items: center; gap: 8px; flex: none; }
.live-rooms__sync {
  display: inline-flex; align-items: center; gap: 4px; margin-right: 4px;
  color: #98a2b3; font-size: 12px; white-space: nowrap;
}
.live-rooms__sync em { font-style: normal; color: #b0b8c4; }
.live-rooms__dot {
  width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex: none;
  animation: live-rooms-pulse 2s ease-in-out infinite;
}
@keyframes live-rooms-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.live-rooms__title { display: flex; align-items: center; gap: 12px; min-width: 0; }
.live-rooms__logo {
  width: 44px; height: 44px; border-radius: 12px; flex: none;
  display: inline-flex; align-items: center; justify-content: center; color: #fff;
  background: #2f6fe0;
}
.live-rooms__head h2 { margin: 0; font-size: 22px; line-height: 28px; font-weight: 700; color: #2f6fe0; }
.live-rooms__head p { margin: 2px 0 0; font-size: 13px; line-height: 18px; color: #98a2b3; }
.live-rooms__filters {
  display: flex; flex-wrap: wrap; align-items: end; gap: 12px 16px;
  padding: 14px 16px; background: #f7f9fc; border-radius: 10px;
}
.live-rooms__filters > label { flex: 0 0 260px; max-width: 260px; }
.live-rooms__filters > label.is-range { flex: 0 1 420px; max-width: 420px; }
.live-rooms__filters label {
  display: grid; grid-template-rows: 26px auto; row-gap: 6px;
  min-width: 0; color: #667085; font-size: 13px;
}
.filter-name-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; height: 26px; }
.filter-head { display: flex; align-items: center; gap: 4px; height: 26px; }
.filter-switch {
  display: inline-flex; align-items: center; gap: 4px; flex: none;
  padding: 1px 8px; border-radius: 999px; cursor: pointer;
  border: 1px solid #d7e2f2; background: #fff; color: #667085;
  font-size: 12px; line-height: 18px;
}
.filter-switch.is-on { border-color: #2f6fe0; background: #eef4ff; color: #2f6fe0; font-weight: 600; }
.filter-range :deep(.el-date-editor) { width: 100%; min-width: 0; }
.live-rooms__filters label:nth-child(4) { grid-column: auto; }
.filter-name { display: inline-flex; align-items: center; gap: 4px; width: fit-content; cursor: help; }
.filter-tip {
  width: 14px; height: 14px; border-radius: 50%; border: 1px solid #c5d0e0; color: #7b8798;
  font-size: 10px; font-style: normal; line-height: 12px; text-align: center;
}
.live-rooms__filters :deep(.el-select) { width: 100%; min-width: 0; }
.live-rooms__filters :deep(.el-select__input) { min-width: 72px; flex: 1; }
.brand-option { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand-option__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.brand-option__count { flex: none; color: #98a2b3; font-size: 12px; }
.live-rooms__filters :deep(.el-select__tags) { flex-wrap: nowrap; align-items: center; max-width: 100%; }
.live-rooms__filters :deep(.el-select__tags > span) { min-width: 0; max-width: 100%; display: flex; align-items: center; overflow: hidden; }
.live-rooms__filters :deep(.el-select__tags > span > .el-tag) { min-width: 0; max-width: 100%; }
.live-rooms__filters :deep(.el-select__tags .el-tag) { justify-content: flex-start; overflow: hidden; padding: 0 6px; max-width: 100%; }
.live-rooms__filters :deep(.el-select__tags .el-tag > span) { min-width: 0; display: block; overflow: hidden; }
.live-rooms__filters :deep(.el-select__tags .el-tag__content) { min-width: 0; max-width: 100%; }
.live-rooms__filters :deep(.el-select__tags-text) {
  display: block; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  text-align: left; vertical-align: bottom;
}
.live-rooms__filters :deep(.el-input__inner),
.live-rooms__filters :deep(.el-select__placeholder) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.metric {
  position: relative;
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  min-height: 176px; padding: 16px 16px 14px 18px; text-align: left; cursor: pointer;
  font: inherit; color: inherit;
  border: 1px solid #e7eef8; border-left-width: 4px; border-radius: 16px;
  box-shadow: 0 10px 24px rgba(47, 90, 160, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.metric:hover { transform: translateY(-2px); }
.metric.is-unstocked { border-left-color: #1298b0; background: linear-gradient(160deg, #f2fdfe, #fff 58%, #fbfeff); }
.metric.is-stocked { border-left-color: #2f6fe0; background: linear-gradient(160deg, #f3f7ff, #fff 58%, #fbfdff); }
.metric.is-sold { border-left-color: #e989c8; background: linear-gradient(160deg, #fef6fb, #fff 58%, #fffbfd); }
.metric.is-soldProfit { border-left-color: #8eaddf; background: linear-gradient(160deg, #f7f9ff, #fff 58%, #fff7fb); }
.metric.is-unstocked.is-on { background: #f3fcfd; box-shadow: 0 0 0 2px #1298b0, 0 14px 28px rgba(18, 152, 176, 0.18); }
.metric.is-stocked.is-on { background: #f3f7ff; box-shadow: 0 0 0 2px #2f6fe0, 0 14px 28px rgba(47, 111, 224, 0.18); }
.metric.is-sold.is-on { background: #fff5fa; box-shadow: 0 0 0 2px #e989c8, 0 14px 28px rgba(233, 137, 200, 0.22); }
.metric.is-soldProfit.is-on { background: linear-gradient(160deg, #f7f9ff, #fff 58%, #fff7fb); box-shadow: 0 0 0 2px #7aa0e0, 0 14px 28px rgba(90, 130, 210, 0.18); }
.metric__watching {
  position: absolute; top: 12px; right: 12px;
  padding: 2px 8px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 700;
}
.metric.is-unstocked .metric__watching { background: #1298b0; }
.metric.is-stocked .metric__watching { background: #2f6fe0; }
.metric.is-sold .metric__watching { background: #d46eae; }
.metric.is-soldProfit .metric__watching { background: #5c86f6; }
.metric__top {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px 4px 8px; border-radius: 999px;
}
.metric__icon { display: inline-flex; align-items: center; justify-content: center; }
.metric__mark { font-size: 14px; font-weight: 700; }
.metric.is-unstocked .metric__top { color: #0e7f96; background: #e7f8fb; }
.metric.is-stocked .metric__top { color: #245dcc; background: #eaf1ff; }
.metric.is-sold .metric__top { color: #c45b96; background: #fdeef6; }
.metric.is-soldProfit .metric__top { color: #3d62b5; background: #eef3ff; }
.metric strong { font-size: 32px; line-height: 1.1; }
.metric.is-unstocked strong { color: #1287a3; }
.metric.is-stocked strong { color: #2f6fe0; }
.metric.is-sold strong { color: #d46eae; }
.metric.is-soldProfit strong {
  background: linear-gradient(90deg, #5c86f6, #e989c8);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.metric em { color: #4b4560; font-style: normal; font-size: 16px; line-height: 1.5; }
.metric small { margin-top: auto; border-radius: 999px; padding: 5px 12px; font-size: 15px; font-weight: 700; }
.metric small.is-open { color: #3d62b5; background: #f4f7fb; border: 1px solid #d5e0f0; }
.metric.is-unstocked small.is-close { color: #fff; background: #1298b0; }
.metric.is-stocked small.is-close { color: #fff; background: #2f6fe0; }
.metric.is-sold small.is-close { color: #fff; background: #d46eae; }
.metric.is-soldProfit small.is-close { color: #fff; background: #5c86f6; }
.metric-note { margin-top: 12px; padding: 18px 20px 20px; background: #fff; border: 1px solid #e7eef8; border-top-width: 3px; border-radius: 16px; font-size: 16px; }
.metric-note.is-unstocked { border-top-color: #1298b0; }
.metric-note.is-stocked { border-top-color: #2f6fe0; }
.metric-note.is-sold { border-top-color: #e989c8; }
.metric-note.is-soldProfit { border-top-color: #8eaddf; }
.metric-note h3 { margin: 0; font-size: 18px; }
.metric-note p { margin: 12px 0 0; color: #3f3a4d; line-height: 1.75; }
.metric-note b { margin-right: 8px; color: #2f6fe0; }
.menu-tag {
  display: inline-block; margin: 0 4px; padding: 1px 8px; border-radius: 8px;
  background: #eaf1ff; color: #245dcc; font-weight: 700; line-height: 1.7;
  border: 1px solid #c5d7ff; text-decoration: none; vertical-align: baseline;
}
.menu-tag.is-spot { background: #fff; border-style: dashed; }
.metric-note__warn {
  padding: 10px 12px; border-radius: 10px; background: #f4fbff; color: #245dcc;
}
.chart, .room { background: #fff; border: 1px solid #ece7f4; border-radius: 14px; }
.chart, .room { position: relative; overflow: hidden; }
.chart::before, .room::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
  background: linear-gradient(90deg, #6aa4ff, #5c9bff, #f3a8d0);
}
.live-rooms__stage { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: stretch; grid-auto-rows: 1fr; }
.live-rooms__stage.is-focus .chart.is-on { grid-column: 1 / -1; }
.live-rooms__stage.is-focus .chart.is-mini { display: none; }
.chart {
  display: flex; flex-direction: column; height: 100%;
  padding: 12px 12px 8px; background: #fff; border: 1px solid #e7eef8; border-radius: 12px;
}
.chart__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 26px; margin-bottom: 10px; flex: none; }
.chart__plot { flex: none; height: 240px; display: flex; align-items: stretch; }
.chart__plot.has-side { gap: 16px; }
.chart__plot > .chart__canvas { flex: 1 1 auto; min-width: 0; height: 100%; }
.live-rooms__stage.is-focus .chart.is-on .chart__plot { height: 400px; }
.chart__focus {
  border: 0; background: none; padding: 0; cursor: pointer;
  color: #98a2b3; font-size: 12px; font-style: normal;
}
.chart__focus:hover { color: #2f6fe0; }
.chart__tools { display: inline-flex; align-items: center; gap: 10px; margin-left: auto; flex: none; }
.chart__orient { display: inline-flex; border: 1px solid #d7e2f2; border-radius: 8px; overflow: hidden; }
.chart__orient button {
  border: 0; background: #fff; color: #667085; cursor: pointer;
  padding: 2px 8px; font-size: 12px; line-height: 18px;
}
.chart__orient button + button { border-left: 1px solid #d7e2f2; }
.chart__orient button.is-on { background: #eef4ff; color: #2f6fe0; font-weight: 600; }
.chart__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart__scope {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  margin: 0 0 10px; padding: 6px 8px; min-height: 34px; flex: none;
  background: #f7f9fc; border: 1px solid #eef2f8; border-radius: 8px;
  font-size: 12px; line-height: 18px; color: #667085;
}
/** 没有筛选条件时也保留一条同样高的占位，保证六张图的绘图区起点对齐。 */
.chart__scope.is-empty { background: #fbfcfe; border-style: dashed; }
.chart__scope-empty { color: #b0b8c4; }
.chart__scope-item {
  display: inline-flex; align-items: center; gap: 6px; max-width: 100%;
  padding: 2px 8px; border-radius: 6px; background: #fff;
  border: 1px solid #dbe6f7; color: #344054;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.chart__scope-item i { flex: none; font-style: normal; color: #98a2b3; }
.chart__scope-item.is-category { border-color: #cfe0ff; }
.chart__scope-item.is-brandOnly { border-color: #dcd1ff; background: #f8f5ff; color: #4b3a86; }
.chart__scope-item.is-brandOnly i { color: #7a5bd0; }
.chart__scope-item.is-live { border-color: #d8e3f0; background: #f4f6f9; color: #5b6b7f; }
.chart__scope-item.is-live i { color: #8494a7; }
.chart__scope-item.is-range { border-color: #ffe0b2; background: #fff8ef; color: #8a5a17; }
.chart__scope-item.is-range i { color: #b4762a; }
.chart-scope-tip__inner { display: flex; flex-direction: column; gap: 4px; max-width: 340px; line-height: 1.6; }
.chart-scope-tip__inner b { color: #98c1ff; font-weight: 700; }
.chart-scope-tip__inner span { color: #fff; word-break: break-word; white-space: pre-line; }
.split-board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.split-board article { min-height: 280px; padding: 12px; background: #fff; border: 1px solid #e7eef8; border-radius: 12px; }
.split-board header { font-weight: 700; color: #1d2939; }
.split-board p { margin: 6px 0 0; color: #98a2b3; font-size: 12px; line-height: 1.5; }
.split-board__canvas { height: 240px; }
.chart-mix { margin-top: 12px; padding: 14px 16px; border: 1px solid #e7eef8; border-radius: 12px; background: #f7f9ff; }
.chart-mix h3 { margin: 0; font-size: 15px; color: #2f6fe0; }
.chart-mix p { margin: 8px 0 0; color: #667085; line-height: 1.6; }
.chart-mix ul { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.chart-mix li { display: flex; gap: 12px; align-items: baseline; }
.chart-mix strong { flex: none; color: #1d2939; }
.chart-mix span { color: #475467; line-height: 1.5; }
.chart__panel {
  margin: 0 0 14px; padding: 16px 20px 14px;
  background: #f7f9fc; border: 1px solid #e7eef8; border-radius: 12px;
}
.chart__dims { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px 44px; }
.chart__dim { display: flex; flex-direction: column; gap: 8px; }
.chart__dim.is-inline { flex-direction: row; align-items: center; gap: 14px; flex-wrap: wrap; }
.chart__inline-hint { color: #667085; font-size: 14px; line-height: 1.6; }
.chart__label { color: #667085; font-size: 14px; font-weight: 600; letter-spacing: 1px; }
.chart__group { display: inline-flex; padding: 3px; gap: 3px; background: #e8eef7; border-radius: 999px; }
.chart__group .chart__pill { border: 0; background: none; border-radius: 999px; padding: 7px 18px; }
.chart__group .chart__pill.is-on { background: #fff; color: #2f6fe0; font-weight: 600; box-shadow: 0 1px 4px rgba(47, 111, 224, 0.28); }
.chart__pill {
  border: 1px solid #d7e2f2; background: #fff; color: #475467; border-radius: 999px;
  padding: 7px 18px; font-size: 14px; cursor: pointer;
}
.chart__pill.is-on { background: #2f6fe0; border-color: #2f6fe0; color: #fff; }
.chart__pill:disabled { opacity: 0.45; cursor: not-allowed; }
.chart__hint { margin: 0; color: #475467; font-size: 14px; line-height: 1.8; }
.chart__foot { display: flex; align-items: flex-start; gap: 16px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #dfe7f2; }
.chart__more {
  flex: none; border: 1px solid #cfe0ff; background: #fff; border-radius: 999px;
  padding: 6px 16px; color: #2f6fe0; font-size: 14px; font-weight: 600; cursor: pointer;
}
.chart__rules { margin: 10px 0 0; padding-left: 20px; color: #475467; font-size: 14px; line-height: 2; }
.chart__note {
  margin: 0 0 12px; padding: 12px 16px; border-radius: 10px;
  background: #f7f9fc; border: 1px solid #e7eef8;
  color: #475467; font-size: 14px; line-height: 1.8;
}
.chart__side {
  flex: 0 0 248px; align-self: stretch;
  display: flex; flex-direction: column;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e7eef8; border-radius: 12px;
  overflow: auto;
}
.chart__side header { display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eef2f8; }
.chart__side header span { color: #2f6fe0; font-size: 14px; font-weight: 700; }
.chart__side ol { flex: 1; display: flex; flex-direction: column; justify-content: space-between; margin: 0; padding: 0; list-style: none; }
.chart__side li {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 5px 0; font-size: 13px; color: #475467;
}
.chart__side-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart__side strong { color: #101828; font-weight: 600; font-variant-numeric: tabular-nums; }
.room__pie { height: 140px; min-height: 140px; }
.chart__pie { flex: 0 0 34%; min-width: 200px; display: flex; flex-direction: column; }
.chart__pie header { flex: none; margin-bottom: 4px; color: #2f6fe0; font-size: 13px; font-weight: 700; }
.chart__pie-canvas { flex: 1 1 auto; min-height: 200px; }
.chart__side.is-mix { flex: 0 0 260px; }
.chart__side-head { display: grid; grid-template-columns: 1.2fr repeat(3, 1fr); gap: 6px; padding-bottom: 6px; border-bottom: 1px dashed #e2e9f4; }
.chart__side-head em { color: #98a2b3; font-style: normal; font-size: 11px; text-align: right; }
.chart__side.is-mix ol { flex: 1; }
.chart__side.is-mix li { display: grid; grid-template-columns: 1.2fr repeat(3, 1fr); gap: 6px; }
.chart__side.is-mix li em { color: #475467; font-style: normal; font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.live-rooms__cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.detail-block__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.detail-block__head h3 { margin: 0; font-size: 16px; font-weight: 700; color: #2f6fe0; }
.detail-block__head p { margin: 4px 0 0; max-width: 760px; color: #98a2b3; font-size: 12px; line-height: 1.6; }
.detail-block__count { flex: none; color: #667085; font-size: 13px; }
.detail-block__item {
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #101828; font-weight: 600; line-height: 1.4;
}
.detail-block__sku {
  display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #98a2b3; font-size: 12px; line-height: 1.4;
}
.detail-block__table :deep(.el-table__header th) { background: #f7f9fc; color: #667085; font-weight: 600; }
.detail-block__foot { display: flex; justify-content: flex-end; margin-top: 12px; }
.detail-block__table :deep(.sku-highlight-row > td) { background: #fffbe6 !important; }
.detail-block__table :deep(.sku-highlight-row .detail-block__sku) { color: #b45309; font-weight: 700; }
.live-rooms__filters > label.is-sku { flex: 0 0 220px; max-width: 220px; }
.room { padding: 12px; text-align: left; cursor: pointer; }
.room.is-on { border-color: #b9d0ff; box-shadow: 0 8px 24px rgba(47, 111, 224, 0.16); background: linear-gradient(180deg, #f5f8ff, #fff); }
.room ul { margin: 0; padding: 0; list-style: none; color: #344054; }
.room li { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.room i { width: 8px; height: 8px; border-radius: 50%; }
.room i.is-unstocked { background: linear-gradient(135deg, #3ed6e6, #1298b0); }
.room i.is-stocked { background: linear-gradient(135deg, #5c9bff, #2f6fe0); }
.room i.is-sold { background: linear-gradient(135deg, #e989c8, #f6b4d8); }
@media (max-width: 1100px) {
  .metric-grid, .live-rooms__stage, .live-rooms__cards { grid-template-columns: 1fr 1fr; }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
