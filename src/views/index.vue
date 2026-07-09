<template>
  <div ref="overviewPageRef" class="overview-page" :class="{ 'is-ready': pageReady }" data-runtime-i18n-ignore="true">
    <div class="overview-shell">
      <!-- Hero -->
      <section class="hero-section section-panel">
        <div class="hero-content anim-block">
          <div class="hero-glow hero-glow--left" />
          <div class="hero-glow hero-glow--right" />
          <span class="version-badge anim-item anim-item--1">{{ t('overviewDashboard.versionLabel') }} · v{{ appVersion }}</span>
          <h1 class="hero-title anim-item anim-item--2">
            <span class="hero-title__prefix">{{ t('overviewDashboard.heroTitlePrefix') }}</span><span class="hero-title__highlight">{{ t('overviewDashboard.heroTitleHighlight') }}</span>
          </h1>
          <p class="hero-subtitle anim-item anim-item--3">{{ t('overviewDashboard.heroSubtitle') }}</p>
          <div class="hero-actions anim-item anim-item--4">
            <el-button
              type="primary"
              class="hero-btn hero-btn-primary"
              :class="{ 'is-active': activeHeroAction === 'workspace' }"
              @click="scrollTo('quick-start')"
            >
              {{ t('overviewDashboard.enterWorkspace') }}
              <el-icon class="btn-arrow"><ArrowRight /></el-icon>
            </el-button>
            <el-button
              class="hero-btn hero-btn-secondary"
              :class="{ 'is-active': activeHeroAction === 'browse' }"
              @click="scrollTo('all-modules')"
            >
              {{ t('overviewDashboard.browseFeatures') }}
            </el-button>
            <el-button
              class="hero-btn hero-btn-secondary"
              :class="{ 'is-active': activeHeroAction === 'guidelines' }"
              @click="scrollTo('guidelines')"
            >
              {{ t('overviewDashboard.viewGuidelines') }}
            </el-button>
          </div>
          <div class="hero-tags anim-item anim-item--5">
            <span
              v-for="(tag, index) in featureTags"
              :key="tag.key"
              class="hero-tag anim-tag-pop"
              :class="`hero-tag--${tag.tone}`"
              :style="{ animationDelay: `${0.55 + index * 0.08}s` }"
            >
              <span class="hero-tag__icon">
                <el-icon><component :is="tag.icon" /></el-icon>
              </span>
              <span class="hero-tag__text">{{ tag.label }}</span>
            </span>
          </div>
        </div>

        <div class="lifecycle-card anim-block anim-block--delay">
          <div class="lifecycle-toolbar">
            <div class="lifecycle-header">
              <span class="lifecycle-icon-wrap">
                <span class="lifecycle-icon">◎</span>
              </span>
              <span>{{ t('overviewDashboard.lifecycleTitle') }}</span>
            </div>
            <div class="lifecycle-controls">
              <span class="live-badge">
                <el-icon><Promotion /></el-icon>
                {{ t('overviewDashboard.timelineLive') }}
              </span>
              <button type="button" class="timeline-toggle" @click="toggleTimelineDemo">
                {{ timelinePaused ? t('overviewDashboard.timelineResume') : t('overviewDashboard.timelinePause') }}
              </button>
            </div>
          </div>

          <div class="lifecycle-timeline">
            <div class="timeline-track">
              <div class="timeline-progress" :style="{ width: `${timelineProgressPercent}%` }" />
            </div>
            <div class="timeline-nodes">
              <button
                v-for="(step, index) in lifecycleTimeline"
                :key="step.key"
                type="button"
                class="timeline-node"
                :class="{
                  active: activeTimelineIndex === index,
                  passed: index < activeTimelineIndex
                }"
                @click="setTimelineIndex(index)"
              >
                <span class="timeline-node__ring">
                  <span class="timeline-node__icon">
                    <el-icon><component :is="step.icon" /></el-icon>
                  </span>
                </span>
                <span class="timeline-node__label">{{ step.label }}</span>
              </button>
            </div>
          </div>

          <div class="lifecycle-stats">
            <div
              v-for="(stat, index) in heroStats"
              :key="stat.label"
              class="stat-item anim-stat-pop"
              :class="`stat-item--tone-${index}`"
              :style="{ animationDelay: `${0.95 + index * 0.1}s` }"
            >
              <div class="stat-value">{{ animatedStatDisplays[index] }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <span class="mock-hint">{{ t('overviewDashboard.mockDataHint') }}</span>
        </div>
      </section>

      <!-- Search -->
      <section class="search-section section-panel reveal-section" data-reveal-section>
        <el-input
          v-model="searchKeyword"
          :placeholder="t('overviewDashboard.searchPlaceholder')"
          clearable
          size="large"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div class="tag-cloud">
          <button
            v-for="tag in hashTags"
            :key="tag.key"
            type="button"
            class="hash-tag"
            @click="applyTagSearch(tag.keyword)"
          >
            {{ tag.label }}
          </button>
        </div>
      </section>

      <!-- Quick start -->
      <section id="quick-start" class="quick-start-section section-panel reveal-section" data-reveal-section>
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="section-accent" />
            <h2>{{ t('overviewDashboard.quickStartTitle') }}</h2>
          </div>
          <div class="progress-area">
            <el-progress
              :percentage="onboardingPercent"
              :stroke-width="10"
              :show-text="false"
              class="progress-bar"
              color="var(--overview-primary)"
            />
            <span class="progress-text">{{ completedSteps }}/{{ onboardingSteps.length }}</span>
            <el-button link type="primary" @click="resetOnboarding">{{ t('overviewDashboard.resetProgress') }}</el-button>
          </div>
        </div>
        <div class="onboarding-steps">
          <button
            v-for="(step, index) in onboardingSteps"
            :key="step.id"
            type="button"
            class="onboarding-step"
            :class="{ done: step.done, active: !step.done && completedSteps === index, 'step-pop': step.done }"
            @click="handleStepClick(step)"
          >
            <span class="step-index">{{ index + 1 }}</span>
            <div class="step-body">
              <strong>{{ step.title }}</strong>
              <span>{{ step.desc }}</span>
            </div>
            <el-icon v-if="step.done" class="step-check"><CircleCheck /></el-icon>
          </button>
        </div>
        <div class="quick-cards">
          <button
            v-for="(card, index) in quickCards"
            :key="card.id"
            type="button"
            class="quick-card"
            :class="`quick-card--${index + 1}`"
            @click="navigateToQuickCard(card.id)"
          >
            <span class="card-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <h3>{{ card.title }}</h3>
            <p>{{ card.desc }}</p>
            <span class="card-link-hint">
              <el-icon><ArrowRight /></el-icon>
            </span>
          </button>
        </div>
      </section>

      <!-- All modules -->
      <section id="all-modules" class="modules-section section-panel reveal-section" data-reveal-section>
        <div class="section-header section-header--stack">
          <div>
            <div class="section-title-wrap">
              <span class="section-accent" />
              <h2>{{ t('overviewDashboard.allModulesTitle') }}</h2>
            </div>
            <p class="section-subtitle">{{ t('overviewDashboard.allModulesSubtitle') }}</p>
          </div>
          <span class="module-count">{{ t('overviewDashboard.moduleCount', { count: filteredModules.length }) }}</span>
        </div>

        <div class="category-tabs">
          <button
            v-for="cat in categoryOptions"
            :key="cat.key"
            type="button"
            class="category-tab"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            {{ cat.label }}
          </button>
        </div>

        <div v-if="groupedModules.length" class="module-groups">
          <div v-for="group in groupedModules" :key="group.key" class="module-group">
            <h3 class="group-title-rich">
              <span class="section-accent" />
              <span class="group-title-rich__zh">{{ group.title }}</span>
              <span class="group-title-rich__en">{{ getSectionEnLabel(group.key) }}</span>
              <span class="group-count">{{ group.items.length }}</span>
            </h3>
            <div class="module-grid-rich">
              <button
                v-for="item in group.items"
                :key="item.path"
                type="button"
                class="module-card-rich"
                :class="`module-card-rich--${item.category}`"
                @click="navigateTo(item.path)"
              >
                <div class="module-card-rich__head">
                  <span class="module-card-rich__icon">
                    <svg-icon v-if="item.icon" :icon-class="item.icon" class="module-icon" />
                    <span v-else class="module-icon-fallback">◆</span>
                  </span>
                  <div class="module-card-rich__meta">
                    <strong class="module-card-rich__title">
                      {{ item.title }}
                      <el-icon v-if="item.category === 'overview' || item.category === 'platform'" class="sparkle-icon"><Star /></el-icon>
                    </strong>
                    <p class="module-card-rich__desc">{{ getModuleSummary(item) }}</p>
                  </div>
                  <el-icon class="module-card-rich__arrow"><ArrowRight /></el-icon>
                </div>
                <ul class="module-card-rich__steps">
                  <li v-for="(guide, guideIndex) in getModuleGuideSteps(item)" :key="guideIndex">
                    <span class="step-no">{{ guideIndex + 1 }}</span>
                    <span>{{ guide }}</span>
                  </li>
                </ul>
              </button>
            </div>
          </div>
        </div>
        <el-empty v-else :description="t('overviewDashboard.noSearchResult')" :image-size="80" />
      </section>

      <!-- Guidelines -->
      <section id="guidelines" class="guidelines-section section-panel section-panel--flat reveal-section" data-reveal-section>
        <el-collapse v-model="guidelinesOpen">
          <el-collapse-item :title="t('overviewDashboard.guidelinesTitle')" name="guidelines">
            <div class="notice-page">
              <section v-for="section in guidelineSections" :key="section.title" class="notice-section">
                <h4>{{ section.title }}</h4>
                <template v-for="item in section.content" :key="item.key">
                  <p v-if="item.type === 'text'" :class="{ warning: item.warning }">{{ item.text }}</p>
                  <ul v-else>
                    <li v-for="entry in item.items" :key="entry">{{ entry }}</li>
                  </ul>
                </template>
              </section>
              <p class="final-reminder">{{ t('projectIntro.finalReminder') }}</p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </section>
    </div>
  </div>
</template>

<script setup name="Index">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Box,
  CircleCheck,
  Connection,
  DataLine,
  Goods,
  Iphone,
  Promotion,
  Search,
  ShoppingCart,
  SoldOut,
  Star,
  Timer,
  TrendCharts,
  Wallet
} from '@element-plus/icons-vue'
import usePermissionStore, { hasAccessibleRoutePath } from '@/store/modules/permission'
import useSettingsStore from '@/store/modules/settings'
import { getTitleByText } from '@/utils/routeTitle'
import packageInfo from '../../package.json'

const ONBOARDING_KEY = 'michael-wms-onboarding-v1'

const MODULE_SECTIONS = [
  { key: 'insight', categories: ['overview', 'inventory'] },
  { key: 'order', categories: ['order'] },
  { key: 'platform', categories: ['platform'] },
  { key: 'vendor', categories: ['vendor'] },
  { key: 'basic', categories: ['basic'] },
  { key: 'system', categories: ['system'] },
]

const QUICK_CARD_RULES = {
  product: [
    (_, text) => /\/basic\/item/.test(text),
    (_, text) => (text.includes('/item') || text.includes('商品')) && !/listing|上架|platform/.test(text),
  ],
  inbound: [
    (_, text) => /receipt/.test(text),
    (_, text) => text.includes('入库'),
  ],
  outbound: [
    (_, text) => /platform\/.*order|tiktok\/.*order/.test(text),
    (_, text) => /shipment/.test(text),
    (_, text) => text.includes('出库') || text.includes('平台订单'),
  ],
  analysis: [
    (_, text) => /chart|dashboard|statistic/.test(text),
    (_, text) => text.includes('数据分析') || text.includes('统计'),
  ],
}

const STEP_CARD_MAP = {
  product: 'product',
  inbound: 'inbound',
  analysis: 'analysis',
}

const router = useRouter()
const { t, tm, locale } = useI18n()
const permissionStore = usePermissionStore()
const settingsStore = useSettingsStore()

const appVersion = packageInfo.version
const overviewPageRef = ref(null)
const searchKeyword = ref('')
const activeCategory = ref('all')
const guidelinesOpen = ref([])
const onboardingState = ref([false, false, false, false])
const activeHeroAction = ref('workspace')
const pageReady = ref(false)
const animatedStatDisplays = ref(['0', '0', '$0'])
const activeTimelineIndex = ref(0)
const timelinePaused = ref(false)

const STAT_TARGETS = [
  { value: 128, format: (v) => String(Math.round(v)) },
  { value: 3420, format: (v) => Math.round(v).toLocaleString() },
  { value: 28640, format: (v) => `$${Math.round(v).toLocaleString()}` },
]

const HERO_SECTION_MAP = {
  'quick-start': 'workspace',
  'all-modules': 'browse',
  guidelines: 'guidelines',
}

const language = computed(() => settingsStore.language || 'zh-cn')

const featureTags = computed(() => {
  locale.value
  return [
    { key: 'fast', label: t('overviewDashboard.featureTagFast'), icon: Timer, tone: 'rose' },
    { key: 'sync', label: t('overviewDashboard.featureTagSync'), icon: Connection, tone: 'violet' },
    { key: 'mobile', label: t('overviewDashboard.featureTagMobile'), icon: Iphone, tone: 'sky' },
    { key: 'analysis', label: t('overviewDashboard.featureTagAnalysis'), icon: DataLine, tone: 'amber' },
  ]
})

const heroStats = computed(() => [
  { label: t('overviewDashboard.statTodayInbound'), value: '128' },
  { label: t('overviewDashboard.statActiveSku'), value: '3,420' },
  { label: t('overviewDashboard.statGmv7d'), value: '$28,640' },
])

const lifecycleTimeline = computed(() => {
  locale.value
  const labels = t('overviewDashboard.lifecycleSteps').split(/\s*→\s*/).filter(Boolean)
  const icons = [Box, Goods, ShoppingCart, SoldOut, Wallet, CircleCheck, TrendCharts]
  return labels.map((label, index) => ({
    key: `step-${index}`,
    label,
    icon: icons[index] || DataLine,
  }))
})

const timelineProgressPercent = computed(() => {
  const total = Math.max(lifecycleTimeline.value.length - 1, 1)
  return (activeTimelineIndex.value / total) * 100
})

const hashTags = computed(() => [
  { key: 'tiktok', label: t('overviewDashboard.tags.tiktok'), keyword: 'TikTok' },
  { key: 'ebay', label: t('overviewDashboard.tags.ebay'), keyword: 'eBay' },
  { key: 'listing', label: t('overviewDashboard.tags.listing'), keyword: '上架' },
  { key: 'inventory', label: t('overviewDashboard.tags.inventory'), keyword: '库存' },
  { key: 'vendor', label: t('overviewDashboard.tags.vendor'), keyword: '供应商' },
  { key: 'mobile', label: t('overviewDashboard.tags.mobile'), keyword: 'SKU' },
  { key: 'check', label: t('overviewDashboard.tags.check'), keyword: '盘库' },
  { key: 'platform', label: t('overviewDashboard.tags.platform'), keyword: '平台订单' },
])

const quickCards = computed(() => [
  {
    id: 'product',
    title: t('overviewDashboard.quickCard1Title'),
    desc: t('overviewDashboard.quickCard1Desc'),
  },
  {
    id: 'inbound',
    title: t('overviewDashboard.quickCard2Title'),
    desc: t('overviewDashboard.quickCard2Desc'),
  },
  {
    id: 'outbound',
    title: t('overviewDashboard.quickCard3Title'),
    desc: t('overviewDashboard.quickCard3Desc'),
  },
  {
    id: 'analysis',
    title: t('overviewDashboard.quickCard4Title'),
    desc: t('overviewDashboard.quickCard4Desc'),
  },
])

const onboardingSteps = computed(() => [
  {
    id: 'browse',
    title: t('overviewDashboard.step1Title'),
    desc: t('overviewDashboard.step1Desc'),
    done: onboardingState.value[0],
    paths: [],
    markOnly: true,
  },
  {
    id: 'product',
    title: t('overviewDashboard.step2Title'),
    desc: t('overviewDashboard.step2Desc'),
    done: onboardingState.value[1],
    routeKey: 'product',
  },
  {
    id: 'inbound',
    title: t('overviewDashboard.step3Title'),
    desc: t('overviewDashboard.step3Desc'),
    done: onboardingState.value[2],
    routeKey: 'inbound',
  },
  {
    id: 'analysis',
    title: t('overviewDashboard.step4Title'),
    desc: t('overviewDashboard.step4Desc'),
    done: onboardingState.value[3],
    routeKey: 'analysis',
  },
])

const completedSteps = computed(() => onboardingState.value.filter(Boolean).length)
const onboardingPercent = computed(() => (completedSteps.value / onboardingSteps.value.length) * 100)

const categoryOptions = computed(() => [
  { key: 'all', label: t('overviewDashboard.categories.all') },
  { key: 'overview', label: t('overviewDashboard.categories.overview') },
  { key: 'inventory', label: t('overviewDashboard.categories.inventory') },
  { key: 'order', label: t('overviewDashboard.categories.order') },
  { key: 'platform', label: t('overviewDashboard.categories.platform') },
  { key: 'vendor', label: t('overviewDashboard.categories.vendor') },
  { key: 'basic', label: t('overviewDashboard.categories.basic') },
  { key: 'system', label: t('overviewDashboard.categories.system') },
])

const guidelineSections = computed(() => {
  locale.value
  return [
    {
      title: t('projectIntro.accountSecurity.title'),
      content: [
        { key: 'a1', type: 'text', text: t('projectIntro.accountSecurity.line1') },
        { key: 'a2', type: 'text', text: t('projectIntro.accountSecurity.line2') },
      ],
    },
    {
      title: t('projectIntro.productInfo.title'),
      content: [
        { key: 'p1', type: 'text', text: t('projectIntro.productInfo.line1') },
        { key: 'p2', type: 'text', text: t('projectIntro.productInfo.line2') },
      ],
    },
    {
      title: t('projectIntro.warehouse.title'),
      content: [
        { key: 'w1', type: 'text', text: t('projectIntro.warehouse.line1') },
        { key: 'w2', type: 'text', text: t('projectIntro.warehouse.line2') },
      ],
    },
    {
      title: t('projectIntro.inbound.title'),
      content: [
        { key: 'i1', type: 'text', text: t('projectIntro.inbound.line1') },
        { key: 'i2', type: 'text', text: t('projectIntro.inbound.line2') },
        {
          key: 'i3',
          type: 'list',
          items: [
            t('projectIntro.inbound.checkItemInfo'),
            t('projectIntro.inbound.checkWarehouse'),
            t('projectIntro.inbound.checkQuantity'),
            t('projectIntro.inbound.checkCost'),
          ],
        },
        { key: 'i4', type: 'text', text: t('projectIntro.inbound.warning'), warning: true },
        { key: 'i5', type: 'text', text: t('projectIntro.inbound.line3') },
      ],
    },
    {
      title: t('projectIntro.outbound.title'),
      content: [
        { key: 'o1', type: 'text', text: t('projectIntro.outbound.line1') },
        { key: 'o2', type: 'text', text: t('projectIntro.outbound.line2') },
        {
          key: 'o3',
          type: 'list',
          items: [
            t('projectIntro.outbound.checkItemInfo'),
            t('projectIntro.outbound.checkWarehouse'),
            t('projectIntro.outbound.checkQuantity'),
            t('projectIntro.outbound.checkSalesPrice'),
          ],
        },
        { key: 'o4', type: 'text', text: t('projectIntro.outbound.line3') },
      ],
    },
    {
      title: t('projectIntro.irreversible.title'),
      content: [
        { key: 'r1', type: 'text', text: t('projectIntro.irreversible.line1') },
        { key: 'r2', type: 'text', text: t('projectIntro.irreversible.line2') },
      ],
    },
    {
      title: t('projectIntro.dataResponsibility.title'),
      content: [
        { key: 'd1', type: 'text', text: t('projectIntro.dataResponsibility.line1') },
        { key: 'd2', type: 'text', text: t('projectIntro.dataResponsibility.line2') },
      ],
    },
  ]
})

function normalizeRoutePath(basePath, routePath) {
  if (!routePath) return basePath || ''
  if (routePath.startsWith('/')) return routePath
  const base = (basePath || '').replace(/\/$/, '')
  return `${base}/${routePath}`.replace(/\/+/g, '/')
}

function inferCategory(path = '', title = '') {
  const text = `${path} ${title}`.toLowerCase()
  if (/dashboard|description|数据分析|analysis|chart|概述|overview/.test(text)) return 'overview'
  if (/inventory|库存|unstocked|statistic|history/.test(text)) return 'inventory'
  if (/platform|listing|tiktok|ebay|上架|平台订单/.test(text)) return 'platform'
  if (/order|receipt|shipment|movement|check|入库|出库|移库|盘库/.test(text)) return 'order'
  if (/vendor|supplier|供应商|选购|结款/.test(text)) return 'vendor'
  if (/basic|item|warehouse|merchant|brand|商品|仓库/.test(text)) return 'basic'
  if (/system|monitor|log|用户|角色|菜单/.test(text)) return 'system'
  return 'system'
}

function collectLeafRoutes(routes, basePath = '', groupTitle = '') {
  const items = []
  for (const route of routes || []) {
    if (route.hidden) continue
    const fullPath = normalizeRoutePath(basePath, route.path)
    const currentGroup = groupTitle || getTitleByText(route.meta?.title, language.value)

    if (route.children?.length) {
      items.push(...collectLeafRoutes(route.children, fullPath, currentGroup))
      continue
    }

    if (!route.meta?.title || fullPath === '/description') continue

    items.push({
      path: fullPath,
      title: getTitleByText(route.meta.title, language.value),
      icon: route.meta.icon,
      groupTitle: currentGroup,
      category: inferCategory(fullPath, route.meta.title),
    })
  }
  return items
}

const allModules = computed(() => {
  locale.value
  return collectLeafRoutes(permissionStore.sidebarRouters)
})

const filteredModules = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return allModules.value.filter((item) => {
    const matchCategory = activeCategory.value === 'all' || item.category === activeCategory.value
    if (!matchCategory) return false
    if (!keyword) return true
    return (
      item.title.toLowerCase().includes(keyword) ||
      item.path.toLowerCase().includes(keyword) ||
      item.groupTitle.toLowerCase().includes(keyword)
    )
  })
})

const groupedModules = computed(() => {
  locale.value
  return MODULE_SECTIONS.map((section) => ({
    key: section.key,
    title: t(`overviewDashboard.moduleSections.${section.key}`),
    category: section.key,
    items: filteredModules.value
      .filter((item) => section.categories.includes(item.category))
      .sort((a, b) => {
        const categoryOrder = section.categories.indexOf(a.category) - section.categories.indexOf(b.category)
        if (categoryOrder !== 0) return categoryOrder
        return a.title.localeCompare(b.title, language.value.startsWith('zh') ? 'zh-CN' : 'en')
      }),
  })).filter((section) => section.items.length > 0)
})

function getSectionEnLabel(sectionKey) {
  return t(`overviewDashboard.moduleSectionEn.${sectionKey}`) || t('overviewDashboard.moduleSectionEn.system')
}

function getCategoryEnLabel(category) {
  return t(`overviewDashboard.categoryEn.${category}`) || t('overviewDashboard.categoryEn.system')
}

function resolveModuleContentKey(item) {
  const text = `${item.title} ${item.path}`.toLowerCase()

  if (/chart|dashboard|数据分析|statistic|统计/.test(text)) return 'charts'
  if (/库存统计|inventory\/statistic|boardlist/.test(text)) return 'invStatistic'
  if (/库存记录|inventory\/history|inventoryhistory/.test(text)) return 'invHistory'
  if (/未入库|unstocked/.test(text)) return 'invUnstocked'
  if (/receipt|入库/.test(text)) return 'receipt'
  if (/shipment|出库/.test(text) && !/平台/.test(text)) return 'shipment'
  if (/movement|移库/.test(text)) return 'movement'
  if (/check|盘库/.test(text)) return 'check'
  if (/platform\/.*order|tiktok\/.*order|平台订单/.test(text)) return 'platformOrder'
  if (/listing|上架/.test(text)) return 'listing'
  if (/供应商管理|vendor-management\/purchase|vendor\/purchase/.test(text)) return 'vendorManage'
  if (/审批|approval/.test(text)) return 'vendorApproval'
  if (/已结款|settled/.test(text)) return 'vendorSettled'
  if (/未结款|unsettled|settlement/.test(text)) return 'vendorUnsettled'
  if (/未收货|receiving/.test(text)) return 'vendorReceiving'
  if (/已选购|shipping|shipped|selected/.test(text)) return 'vendorPurchased'
  if (/\/basic\/item|商品管理|item\/index/.test(text)) return 'item'
  if (/仓库|warehouse/.test(text)) return 'warehouse'
  if (/品牌|brand/.test(text)) return 'brand'
  if (/部门|\/dept/.test(text)) return 'sysDept'
  if (/菜单|\/menu/.test(text)) return 'sysMenu'
  if (/操作日志|operlog/.test(text)) return 'sysOperLog'
  if (/登录日志|logininfor/.test(text)) return 'sysLoginLog'
  if (/岗位|\/post/.test(text)) return 'sysPost'
  if (/角色|\/role/.test(text)) return 'sysRole'
  if (/\/user|用户管理/.test(text)) return 'sysUser'
  if (/字典|\/dict/.test(text)) return 'sysDict'
  if (/参数|\/config/.test(text)) return 'sysConfig'

  return item.category
}

function resolveModuleGuideKey(item) {
  return resolveModuleContentKey(item)
}

function normalizeGuideList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
  }
  if (typeof value === 'string') {
    if (value.startsWith('overviewDashboard.')) return []
    if (value.includes('|')) {
      return value.split('|').map((item) => item.trim()).filter(Boolean).slice(0, 3)
    }
  }
  return []
}

function getModuleGuideSteps(item) {
  locale.value
  const guideKey = resolveModuleGuideKey(item)
  const keys = [
    `overviewDashboard.moduleGuides.${guideKey}`,
    `overviewDashboard.moduleGuides.${item.category}`,
    'overviewDashboard.moduleGuides.overview',
  ]

  for (const key of keys) {
    const steps = normalizeGuideList(tm(key))
    if (steps.length) return steps
    const textSteps = normalizeGuideList(t(key))
    if (textSteps.length) return textSteps
  }

  return []
}

function getModuleSummary(item) {
  locale.value
  const contentKey = resolveModuleContentKey(item)
  const specific = t(`overviewDashboard.moduleSummaries.${contentKey}`)
  if (specific && !specific.startsWith('overviewDashboard.moduleSummaries.')) {
    return specific
  }
  return t(`overviewDashboard.moduleSummaries.${item.category}`) || t('overviewDashboard.moduleSummaries.system')
}

function setTimelineIndex(index) {
  activeTimelineIndex.value = index
}

function toggleTimelineDemo() {
  timelinePaused.value = !timelinePaused.value
}

function loadOnboarding() {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length === 4) {
        onboardingState.value = parsed
        return
      }
    }
  } catch (e) {
    // ignore
  }
  onboardingState.value = [true, false, false, false]
  saveOnboarding()
}

function saveOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingState.value))
}

function markStepDone(index) {
  if (!onboardingState.value[index]) {
    const next = [...onboardingState.value]
    next[index] = true
    onboardingState.value = next
    saveOnboarding()
  }
}

function resetOnboarding() {
  onboardingState.value = [false, false, false, false]
  saveOnboarding()
  markStepDone(0)
}

function scrollTo(id) {
  const action = HERO_SECTION_MAP[id]
  if (action) {
    activeHeroAction.value = action
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let heroSectionObserver = null
let revealSectionObserver = null
let statAnimationFrame = 0
let timelineTimer = null

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3)
}

function startStatCountUp(delay = 700) {
  window.setTimeout(() => {
    const duration = 1400
    const startAt = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - startAt) / duration, 1)
      const eased = easeOutCubic(progress)
      animatedStatDisplays.value = STAT_TARGETS.map(({ value, format }) => format(value * eased))
      if (progress < 1) {
        statAnimationFrame = requestAnimationFrame(tick)
      }
    }

    statAnimationFrame = requestAnimationFrame(tick)
  }, delay)
}

function setupTimelineDemo() {
  timelineTimer = window.setInterval(() => {
    if (timelinePaused.value || lifecycleTimeline.value.length < 2) return
    activeTimelineIndex.value = (activeTimelineIndex.value + 1) % lifecycleTimeline.value.length
  }, 2400)
}

function matchModulePath(...predicates) {
  const routes = permissionStore.routes
  for (const predicate of predicates) {
    const found = allModules.value.find((item) => {
      const text = `${item.title} ${item.path}`.toLowerCase()
      return predicate(item, text) && hasAccessibleRoutePath(routes, item.path)
    })
    if (found) return found.path
  }
  return null
}

function resolveQuickCardPath(cardId) {
  const rules = QUICK_CARD_RULES[cardId] || []
  return matchModulePath(...rules)
}

function setupRevealSectionObserver() {
  const scrollRoot = overviewPageRef.value
  const sections = scrollRoot?.querySelectorAll('[data-reveal-section]')
    || document.querySelectorAll('[data-reveal-section]')

  const revealAll = () => {
    sections.forEach((el) => el.classList.add('is-revealed'))
  }

  if (!sections.length) return

  if (typeof IntersectionObserver === 'undefined') {
    revealAll()
    return
  }

  revealSectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          revealSectionObserver?.unobserve(entry.target)
        }
      })
    },
    {
      root: scrollRoot || null,
      threshold: 0.01,
      rootMargin: '0px',
    }
  )

  sections.forEach((el) => revealSectionObserver.observe(el))
  window.setTimeout(revealAll, 1000)
}

function setupHeroSectionObserver() {
  if (typeof IntersectionObserver === 'undefined') return

  heroSectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

      const topEntry = visible[0]
      if (!topEntry) return

      const action = HERO_SECTION_MAP[topEntry.target.id]
      if (action) {
        activeHeroAction.value = action
      }
    },
    {
      root: null,
      threshold: [0.2, 0.35, 0.5],
      rootMargin: '-120px 0px -55% 0px',
    }
  )

  Object.keys(HERO_SECTION_MAP).forEach((sectionId) => {
    const el = document.getElementById(sectionId)
    if (el) heroSectionObserver.observe(el)
  })
}

function applyTagSearch(keyword) {
  searchKeyword.value = keyword
  scrollTo('all-modules')
}

function resolveAccessiblePath(paths = []) {
  const routes = permissionStore.routes
  for (const path of paths) {
    if (path && hasAccessibleRoutePath(routes, path)) return path
  }
  return null
}

function navigateTo(path) {
  if (!path) {
    ElMessage.warning(t('overviewDashboard.routeNotFound'))
    return
  }
  const routes = permissionStore.routes
  if (!hasAccessibleRoutePath(routes, path)) {
    ElMessage.warning(t('overviewDashboard.routeNotFound'))
    return
  }
  router.push(path).catch(() => {})
}

function navigateToPaths(paths = []) {
  navigateTo(resolveAccessiblePath(paths))
}

function navigateToQuickCard(cardId) {
  navigateTo(resolveQuickCardPath(cardId))
}

function handleStepClick(step) {
  const index = onboardingSteps.value.findIndex((item) => item.id === step.id)
  if (index < 0) return

  if (step.markOnly) {
    markStepDone(index)
    return
  }

  markStepDone(index)
  const cardId = STEP_CARD_MAP[step.routeKey || step.id]
  navigateToQuickCard(cardId)
}

watch(onboardingState, saveOnboarding, { deep: true })

onMounted(() => {
  loadOnboarding()
  requestAnimationFrame(() => {
    pageReady.value = true
    startStatCountUp()
  })
  nextTick(() => {
    setupHeroSectionObserver()
    setupRevealSectionObserver()
    setupTimelineDemo()
  })
})

onBeforeUnmount(() => {
  heroSectionObserver?.disconnect()
  heroSectionObserver = null
  revealSectionObserver?.disconnect()
  revealSectionObserver = null
  if (statAnimationFrame) cancelAnimationFrame(statAnimationFrame)
  if (timelineTimer) clearInterval(timelineTimer)
})
</script>

<style scoped lang="scss">
.overview-page {
  --overview-primary: #e91e8c;
  --overview-primary-deep: #c2187a;
  --overview-primary-soft: #fce4f0;
  --overview-primary-glow: rgba(233, 30, 140, 0.18);
  --overview-accent-violet: #8b5cf6;
  --overview-accent-violet-soft: #f3efff;
  --overview-accent-sky: #0ea5e9;
  --overview-accent-sky-soft: #e8f7fd;
  --overview-accent-amber: #f59e0b;
  --overview-accent-amber-soft: #fff7e8;
  --overview-hero-start: #fff5fa;
  --overview-hero-end: #eef4ff;
  --overview-text: #1f2d3d;
  --overview-muted: #6b7280;
  --overview-border: #eceff4;
  --overview-panel: #ffffff;
  min-height: calc(100vh - 84px);
  overflow-y: auto;
  padding: 16px 16px 32px;
  color: var(--overview-text);
  background:
    radial-gradient(circle at top left, rgba(233, 30, 140, 0.06), transparent 28%),
    radial-gradient(circle at top right, rgba(64, 158, 255, 0.08), transparent 24%),
    linear-gradient(180deg, #f7f8fc 0%, #f3f5fa 100%);
}

.overview-shell {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-panel {
  padding: 22px 24px;
  border-radius: 20px;
  background: var(--overview-panel);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.05),
    0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.section-panel--flat {
  padding: 18px 20px 8px;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr);
  gap: 22px;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: none;
}

.hero-content,
.lifecycle-card {
  border-radius: 22px;
  border: 1px solid var(--overview-border);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.hero-content {
  position: relative;
  overflow: hidden;
  padding: 34px 36px 30px;
  background: linear-gradient(135deg, var(--overview-hero-start) 0%, #fff 42%, var(--overview-hero-end) 100%);
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(12px);
}

.hero-glow--left {
  top: -40px;
  left: -30px;
  width: 180px;
  height: 180px;
  background: rgba(233, 30, 140, 0.16);
}

.hero-glow--right {
  right: -20px;
  bottom: -30px;
  width: 160px;
  height: 160px;
  background: rgba(64, 158, 255, 0.12);
}

.is-ready {
  .anim-item {
    opacity: 0;
    transform: translateY(18px);
    animation: fadeInUp 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .anim-item--1 { animation-delay: 0.05s; }
  .anim-item--2 { animation-delay: 0.12s; }
  .anim-item--3 { animation-delay: 0.2s; }
  .anim-item--4 { animation-delay: 0.28s; }
  .anim-item--5 { animation-delay: 0.36s; }

  .anim-block--delay {
    opacity: 0;
    transform: translateY(22px) scale(0.985);
    animation: cardRiseIn 0.82s cubic-bezier(0.22, 1, 0.36, 1) 0.18s forwards;
  }

  .anim-tag-pop,
  .anim-chip-pop,
  .anim-stat-pop {
    opacity: 0;
    animation: popIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
}

.reveal-section {
  transform: translateY(20px);
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);

  &.is-revealed {
    transform: translateY(0);
  }
}

.quick-start-section.is-revealed .quick-card {
  animation: cardSlideUp 0.62s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.quick-start-section.is-revealed .quick-card:nth-child(1) { animation-delay: 0.08s; }
.quick-start-section.is-revealed .quick-card:nth-child(2) { animation-delay: 0.16s; }
.quick-start-section.is-revealed .quick-card:nth-child(3) { animation-delay: 0.24s; }
.quick-start-section.is-revealed .quick-card:nth-child(4) { animation-delay: 0.32s; }

.quick-start-section.is-revealed .onboarding-step {
  animation: cardSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.quick-start-section.is-revealed .onboarding-step:nth-child(1) { animation-delay: 0.04s; }
.quick-start-section.is-revealed .onboarding-step:nth-child(2) { animation-delay: 0.1s; }
.quick-start-section.is-revealed .onboarding-step:nth-child(3) { animation-delay: 0.16s; }
.quick-start-section.is-revealed .onboarding-step:nth-child(4) { animation-delay: 0.22s; }

.modules-section.is-revealed .module-card-rich {
  animation: cardSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.modules-section.is-revealed .module-card-rich:nth-child(1) { animation-delay: 0.03s; }
.modules-section.is-revealed .module-card-rich:nth-child(2) { animation-delay: 0.06s; }
.modules-section.is-revealed .module-card-rich:nth-child(3) { animation-delay: 0.09s; }
.modules-section.is-revealed .module-card-rich:nth-child(4) { animation-delay: 0.12s; }
.modules-section.is-revealed .module-card-rich:nth-child(5) { animation-delay: 0.15s; }
.modules-section.is-revealed .module-card-rich:nth-child(6) { animation-delay: 0.18s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardRiseIn {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.92);
  }
  70% {
    transform: translateY(-2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cardSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes stepCelebrate {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes timelinePulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(233, 30, 140, 0.28);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(233, 30, 140, 0);
  }
}

.version-badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #f7c8df;
  color: var(--overview-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.hero-title {
  position: relative;
  z-index: 1;
  margin: 18px 0 14px;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.22;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.hero-title__prefix {
  display: inline;
  color: #111827;
}

.hero-title__highlight {
  display: inline;
  margin-left: 0.3em;
  background: linear-gradient(90deg, #e91e8c 0%, #ff5cae 45%, #c084fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-subtitle {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: 700px;
  font-size: 15px;
  line-height: 1.85;
  color: var(--overview-muted);
}

.hero-actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero-btn {
  position: relative;
  overflow: hidden;
  height: 42px;
  border-radius: 12px;
  font-weight: 600;
  transition:
    transform 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.22s ease,
    background 0.22s ease,
    color 0.22s ease;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.28), transparent 55%);
    transition: opacity 0.22s ease;
    pointer-events: none;
  }

  &:hover::after {
    opacity: 1;
  }

  &:active {
    transform: translateY(1px) scale(0.985);
  }
}

.hero-btn-primary {
  --el-button-bg-color: transparent;
  --el-button-border-color: transparent;
  --el-button-hover-bg-color: transparent;
  --el-button-hover-border-color: transparent;
  --el-button-text-color: #fff;
  padding: 0 22px;
  border: none;
  background: linear-gradient(135deg, var(--overview-primary) 0%, #f062ae 52%, #ff8ecf 100%);
  box-shadow: 0 12px 28px var(--overview-primary-glow);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(233, 30, 140, 0.28);
  }

  &.is-active {
    transform: translateY(-1px);
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.95),
      0 0 0 6px rgba(233, 30, 140, 0.18),
      0 16px 34px rgba(233, 30, 140, 0.3);
  }
}

.hero-btn-secondary {
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e7ebf3;
  color: #475569;

  &:hover {
    transform: translateY(-2px);
    border-color: #f0c4dc;
    color: var(--overview-primary-deep);
    background: linear-gradient(180deg, #fff9fd 0%, #fff 100%);
    box-shadow: 0 10px 24px rgba(233, 30, 140, 0.1);
  }

  &.is-active {
    transform: translateY(-1px);
    border-color: #f0a8cc;
    color: var(--overview-primary-deep);
    background: linear-gradient(180deg, #fff6fb 0%, #fff 100%);
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.95),
      0 0 0 6px rgba(233, 30, 140, 0.12),
      0 12px 26px rgba(233, 30, 140, 0.12);
  }
}

.btn-arrow {
  margin-left: 4px;
  transition: transform 0.22s ease;
}

.hero-btn-primary:hover .btn-arrow,
.hero-btn-primary.is-active .btn-arrow {
  transform: translateX(3px);
}

.hero-tags {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  backdrop-filter: blur(8px);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.hero-tag__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 14px;

  .el-icon {
    font-size: 14px;
  }
}

.hero-tag__text {
  padding-right: 2px;
  white-space: nowrap;
}

.hero-tag--rose {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, #fff5fa 100%);
  border-color: #f7c8df;
  color: #9d3d72;

  .hero-tag__icon {
    background: linear-gradient(180deg, #ffe3f1 0%, #ffd1e8 100%);
    color: var(--overview-primary);
  }
}

.hero-tag--violet {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, var(--overview-accent-violet-soft) 100%);
  border-color: #ddd0ff;
  color: #6d4fa6;

  .hero-tag__icon {
    background: linear-gradient(180deg, #efe7ff 0%, #e3d6ff 100%);
    color: var(--overview-accent-violet);
  }
}

.hero-tag--sky {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, var(--overview-accent-sky-soft) 100%);
  border-color: #bfe7f8;
  color: #0c6f96;

  .hero-tag__icon {
    background: linear-gradient(180deg, #e4f6fd 0%, #d2effb 100%);
    color: var(--overview-accent-sky);
  }
}

.hero-tag--amber {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, var(--overview-accent-amber-soft) 100%);
  border-color: #f8ddb0;
  color: #9a640f;

  .hero-tag__icon {
    background: linear-gradient(180deg, #fff1d9 0%, #ffe6bf 100%);
    color: var(--overview-accent-amber);
  }
}

.lifecycle-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 24px 40px;
  background: linear-gradient(180deg, #fff 0%, #fcfdff 100%);
}

.lifecycle-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lifecycle-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
}

.lifecycle-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  color: #16a34a;
  font-size: 12px;
  font-weight: 700;
}

.timeline-toggle {
  border: 1px solid #e8edf5;
  background: #fff;
  color: #64748b;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #f0c4dc;
    color: var(--overview-primary);
  }
}

.lifecycle-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: var(--overview-primary-soft);
}

.lifecycle-icon {
  color: var(--overview-primary);
  font-size: 16px;
}

.lifecycle-timeline {
  position: relative;
  padding: 18px 8px 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: #e2e8f0;
  }
}

.timeline-track {
  position: absolute;
  top: 38px;
  left: 28px;
  right: 28px;
  min-width: 464px;
  height: 6px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
}

.timeline-progress {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #e91e8c 0%, #a855f7 45%, #38bdf8 100%);
  transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-nodes {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(72px, 1fr));
  gap: 8px;
  min-width: 520px;
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.timeline-node__ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #e8edf5;
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-node__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 18px;
  transition: all 0.35s ease;
}

.timeline-node__label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-align: center;
  transition: color 0.25s ease;
}

.timeline-node.passed {
  .timeline-node__ring {
    border-color: #d8b4fe;
  }

  .timeline-node__icon {
    background: #fae8ff;
    color: #a855f7;
  }

  .timeline-node__label {
    color: #7c3aed;
  }
}

.timeline-node.active {
  .timeline-node__ring {
    border-color: #e91e8c;
    animation: timelinePulse 1.8s ease-out infinite;
  }

  .timeline-node__icon {
    background: linear-gradient(180deg, #ffe4f3 0%, #fff0f7 100%);
    color: #e91e8c;
    transform: scale(1.05);
  }

  .timeline-node__label {
    color: #111827;
    font-weight: 700;
  }
}

.lifecycle-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 4px;
}

.stat-item {
  padding: 16px 12px;
  border-radius: 16px;
  text-align: center;
  background: #fff;
  border: 1px solid #edf2f7;
}

.stat-item--tone-0 .stat-value {
  color: #2563eb;
}

.stat-item--tone-1 .stat-value {
  color: #e91e8c;
}

.stat-item--tone-2 .stat-value {
  color: #16a34a;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.stat-label {
  margin-top: 8px;
  font-size: 12px;
  color: var(--overview-muted);
}

.mock-hint {
  position: absolute;
  right: 18px;
  bottom: 14px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f8fafc;
  font-size: 11px;
  color: #94a3b8;
}

.search-section {
  padding-top: 22px;
  padding-bottom: 22px;
}

.search-input {
  :deep(.el-input__wrapper) {
    min-height: 52px;
    padding-left: 8px;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
    border: 1px solid #e8edf5;
  }

  :deep(.el-input__prefix) {
    color: var(--overview-primary);
  }
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.hash-tag {
  border: 1px solid #edf2f7;
  background: #fafbfd;
  color: #64748b;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--overview-primary-soft);
    border-color: #f4c4de;
    color: var(--overview-primary);
    transform: translateY(-1px);
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
}

.section-accent {
  width: 4px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--overview-primary) 0%, #ff8ecf 100%);
}

.progress-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.progress-bar {
  width: 180px;
}

.progress-text {
  min-width: 36px;
  font-size: 13px;
  font-weight: 700;
  color: var(--overview-primary);
}

.onboarding-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.onboarding-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 108px;
  padding: 16px;
  border: 1px solid var(--overview-border);
  border-radius: 18px;
  background: linear-gradient(180deg, #fff 0%, #fbfcfe 100%);
  text-align: left;
  cursor: pointer;
  transition: all 0.22s ease;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    transition: opacity 0.22s ease;
    pointer-events: none;
  }

  &:hover::after {
    opacity: 1;
  }

  &.done {
    border-color: #f4c4de;
    background: linear-gradient(180deg, #fff9fc 0%, #fff 100%);
  }

  &.active {
    border-color: var(--overview-primary);
    box-shadow: 0 0 0 1px rgba(233, 30, 140, 0.1);
    animation: stepCelebrate 0.45s ease;
  }

  &.step-pop {
    animation: stepCelebrate 0.55s ease;
  }

  strong {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
  }

  span {
    font-size: 12px;
    color: var(--overview-muted);
    line-height: 1.55;
  }
}

.step-index {
  flex: 0 0 32px;
  height: 32px;
  border-radius: 12px;
  background: linear-gradient(180deg, #fff0f7 0%, #fce4f0 100%);
  color: var(--overview-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
}

.step-body {
  flex: 1;
  min-width: 0;
}

.step-check {
  color: #22c55e;
  font-size: 18px;
}

.quick-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.quick-card {
  position: relative;
  overflow: hidden;
  min-height: 156px;
  padding: 24px 20px 20px;
  border: 1px solid var(--overview-border);
  border-radius: 20px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--overview-primary) 0%, #ff9ed0 100%);
    opacity: 0.85;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: #f4c4de;
    box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);

    .card-link-hint {
      opacity: 1;
      transform: translateX(0);
    }
  }

  h3 {
    margin: 0 0 10px;
    font-size: 18px;
    font-weight: 800;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.65;
    color: var(--overview-muted);
  }
}

.quick-card--1::before { background: linear-gradient(90deg, #e91e8c 0%, #ff8ecf 100%); }
.quick-card--2::before { background: linear-gradient(90deg, #7c3aed 0%, #c4b5fd 100%); }
.quick-card--3::before { background: linear-gradient(90deg, #2563eb 0%, #93c5fd 100%); }
.quick-card--4::before { background: linear-gradient(90deg, #059669 0%, #6ee7b7 100%); }

.card-number {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  color: rgba(15, 23, 42, 0.05);
}

.card-link-hint {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--overview-primary-soft);
  color: var(--overview-primary);
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.22s ease;
}

.section-header--stack {
  align-items: flex-start;
}

.section-subtitle {
  margin: 8px 0 0 34px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--overview-muted);
}

.module-count {
  padding: 6px 12px;
  border-radius: 999px;
  background: #f8fafc;
  font-size: 13px;
  color: var(--overview-muted);
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 4px;
}

.category-tab {
  border: 1px solid #e8edf5;
  background: #fafbfd;
  color: var(--overview-muted);
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #f4c4de;
    color: var(--overview-primary);
  }

  &.active {
    background: linear-gradient(135deg, var(--overview-primary) 0%, #ff5cae 100%);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 10px 20px var(--overview-primary-glow);
  }
}

.module-groups {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.module-group {
  padding: 18px 18px 6px;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfcfe 0%, #fff 100%);
  border: 1px solid #eef2f7;
}

.group-title-rich {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;

  .section-accent {
    width: 3px;
    height: 18px;
  }

  &__zh {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
  }

  &__en {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: #94a3b8;
    text-transform: uppercase;
  }
}

.group-count {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e8edf5;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.module-grid-rich {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.module-card-rich {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 1px solid #e8edf5;
  border-radius: 18px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;

  &:hover {
    border-color: #f4c4de;
    transform: translateY(-3px);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);

    .module-card-rich__arrow {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.module-card-rich__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 16px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.module-card-rich__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
}

.module-card-rich__meta {
  flex: 1;
  min-width: 0;
}

.module-card-rich__title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  line-height: 1.35;
}

.sparkle-icon {
  color: #e91e8c;
  font-size: 12px;
}

.module-card-rich__desc {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
}

.module-card-rich__arrow {
  color: var(--overview-primary);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 4px;
}

.module-card-rich__steps {
  margin: 0;
  padding: 12px 16px 14px;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: #475569;

    span:last-child {
      flex: 1;
      min-width: 0;
      word-break: normal;
      white-space: normal;
    }

    &:not(:last-child) {
      margin-bottom: 6px;
    }
  }
}

.step-no {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.module-icon {
  width: 18px;
  height: 18px;
}

.module-icon-fallback {
  color: var(--overview-primary);
  font-size: 12px;
}

.module-card-rich--overview .module-card-rich__icon {
  background: linear-gradient(180deg, #fff5fa 0%, #fce8f3 100%);

  .module-icon,
  .module-icon-fallback {
    color: #e91e8c;
  }
}

.module-card-rich--inventory .module-card-rich__icon {
  background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);

  .module-icon,
  .module-icon-fallback {
    color: #16a34a;
  }
}

.module-card-rich--order .module-card-rich__icon {
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);

  .module-icon,
  .module-icon-fallback {
    color: #2563eb;
  }
}

.module-card-rich--platform .module-card-rich__icon {
  background: linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%);

  .module-icon,
  .module-icon-fallback {
    color: #7c3aed;
  }
}

.module-card-rich--vendor .module-card-rich__icon {
  background: linear-gradient(180deg, #ecfeff 0%, #cffafe 100%);

  .module-icon,
  .module-icon-fallback {
    color: #0891b2;
  }
}

.module-card-rich--basic .module-card-rich__icon {
  background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);

  .module-icon,
  .module-icon-fallback {
    color: #d97706;
  }
}

.module-card-rich--system .module-card-rich__icon {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .module-icon,
  .module-icon-fallback {
    color: #64748b;
  }
}

.guidelines-section {
  :deep(.el-collapse) {
    border: none;
  }

  :deep(.el-collapse-item__header) {
    min-height: 52px;
    border-radius: 16px;
    padding: 0 18px;
    background: #fafbfd;
    border: 1px solid var(--overview-border);
    font-weight: 700;
    font-size: 15px;
  }

  :deep(.el-collapse-item__wrap) {
    border: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 0;
  }
}

.notice-page {
  margin-top: 14px;
  padding: 20px 22px 24px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--overview-border);
  font-size: 14px;
  line-height: 1.8;
}

.notice-section {
  padding: 12px 0 16px;
  border-bottom: 1px solid #f1f5f9;

  h4 {
    margin: 0 0 10px;
    font-size: 15px;
    font-weight: 700;
    color: #334155;
  }

  p {
    margin: 6px 0;
  }

  ul {
    margin: 8px 0 8px 20px;
    padding: 0;
  }
}

.warning {
  color: #c45656;
  font-weight: 700;
}

.final-reminder {
  margin: 18px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff7fb;
  border: 1px solid #f7d7e7;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .overview-page *,
  .overview-page *::before,
  .overview-page *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }

  .reveal-section {
    transform: none;
  }

  .is-ready .anim-item,
  .is-ready .anim-block--delay,
  .is-ready .anim-tag-pop,
  .is-ready .anim-chip-pop,
  .is-ready .anim-stat-pop {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 1200px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .module-grid-rich {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .onboarding-steps,
  .quick-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .overview-page {
    padding: 12px 12px 24px;
  }

  .section-panel {
    padding: 18px 16px;
    border-radius: 18px;
  }

  .hero-content {
    padding: 24px 20px;
  }

  .hero-title {
    font-size: 26px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .progress-area {
    width: 100%;
    flex-wrap: wrap;
  }

  .onboarding-steps,
  .quick-cards,
  .lifecycle-stats {
    grid-template-columns: 1fr;
  }

  .lifecycle-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .lifecycle-timeline {
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .timeline-nodes {
    min-width: 560px;
  }

  .timeline-node__ring {
    width: 48px;
    height: 48px;
  }

  .timeline-node__icon {
    width: 34px;
    height: 34px;
    font-size: 16px;
  }

  .module-grid-rich {
    grid-template-columns: 1fr;
  }
}
</style>
