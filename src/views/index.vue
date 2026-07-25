<template>
  <div ref="overviewPageRef" class="overview-page" data-runtime-i18n-ignore="true">
    <div class="overview-shell">
      <!-- Hero -->
      <section class="hero-section section-panel">
        <div class="hero-content">
          <span class="version-badge">{{ t('overviewDashboard.versionLabel') }} · v{{ appVersion }}</span>
          <h1 class="hero-title">
            <span class="hero-title__prefix">{{ t('overviewDashboard.heroTitlePrefix') }}</span><span class="hero-title__highlight">{{ t('overviewDashboard.heroTitleHighlight') }}</span>
          </h1>
          <p class="hero-subtitle">{{ t('overviewDashboard.heroSubtitle') }}</p>
          <div class="hero-actions">
            <el-button
              type="primary"
              class="hero-btn hero-btn-primary"
              @click="scrollTo('all-modules')"
            >
              {{ t('overviewDashboard.browseFeatures') }}
              <el-icon class="btn-arrow"><ArrowRight /></el-icon>
            </el-button>
            <el-button
              class="hero-btn hero-btn-secondary"
              @click="scrollTo('guidelines')"
            >
              {{ t('overviewDashboard.viewGuidelines') }}
            </el-button>
            <el-button
              class="hero-btn hero-btn-secondary"
              @click="openLuxeAf"
            >
              {{ t('overviewDashboard.aboutStudio') }}
              <el-icon class="btn-arrow"><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="hero-tags-title">{{ t('overviewDashboard.advantageTitle') }}</div>
          <div class="hero-tags">
            <span
              v-for="tag in featureTags"
              :key="tag.key"
              class="hero-tag"
              :class="`hero-tag--${tag.tone}`"
            >
              <span class="hero-tag__icon">
                <el-icon><component :is="tag.icon" /></el-icon>
              </span>
              <span class="hero-tag__text">{{ tag.label }}</span>
            </span>
          </div>
        </div>

        <div class="lifecycle-card">
          <div class="lifecycle-toolbar">
            <div class="lifecycle-header">
              <span class="lifecycle-icon-wrap">
                <el-icon class="lifecycle-icon"><Connection /></el-icon>
              </span>
              <span>{{ t('overviewDashboard.workflowTitle') }}</span>
            </div>
            <div class="lifecycle-controls">
              <span class="module-count">{{ t('overviewDashboard.workflowBadge') }}</span>
            </div>
          </div>

          <div class="workflow-map" :aria-label="t('overviewDashboard.workflowTitle')">
            <div class="workflow-steps">
              <div
                v-for="(step, index) in workflowSteps"
                :key="step.key"
                class="workflow-step"
                :class="`workflow-step--${step.tone}`"
              >
                <span class="workflow-step__index">{{ index + 1 }}</span>
                <span class="workflow-step__icon">
                  <el-icon><component :is="step.icon" /></el-icon>
                </span>
                <span class="workflow-step__body">
                  <strong>{{ step.title }}</strong>
                  <small>{{ step.desc }}</small>
                </span>
              </div>
            </div>
          </div>

          <div class="workflow-comparison-title">{{ t('overviewDashboard.workflowComparisonTitle') }}</div>
          <div class="workflow-comparison">
            <div
              v-for="metric in workflowMetrics"
              :key="metric.key"
              class="workflow-metric"
              :class="`workflow-metric--${metric.tone}`"
            >
              <div class="workflow-metric__label">{{ metric.label }}</div>
              <div class="workflow-metric__values">
                <span class="workflow-metric__old">{{ metric.oldValue }}</span>
                <el-icon><ArrowRight /></el-icon>
                <strong>{{ metric.newValue }}</strong>
              </div>
              <div class="workflow-metric__saving">{{ metric.saving }}</div>
            </div>
          </div>
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
                    <el-icon v-else class="module-icon-fallback"><Box /></el-icon>
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
import { computed, nextTick, ref } from 'vue'
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

const MODULE_SECTIONS = [
  { key: 'insight', categories: ['overview', 'inventory'] },
  { key: 'order', categories: ['order'] },
  { key: 'platform', categories: ['platform'] },
  { key: 'vendor', categories: ['vendor'] },
  { key: 'basic', categories: ['basic'] },
  { key: 'system', categories: ['system'] },
]

const router = useRouter()
const { t, tm, locale } = useI18n()
const permissionStore = usePermissionStore()
const settingsStore = useSettingsStore()

const appVersion = packageInfo.version
const overviewPageRef = ref(null)
const activeCategory = ref('all')
const guidelinesOpen = ref(['guidelines'])
const activeTimelineIndex = ref(0)

const language = computed(() => settingsStore.language || 'zh-cn')

const featureTags = computed(() => {
  locale.value
  return [
    { key: 'automation', label: t('overviewDashboard.featureTagAutomation'), icon: Connection, tone: 'violet' },
    { key: 'efficiency', label: t('overviewDashboard.featureTagEfficiency'), icon: Timer, tone: 'rose' },
    { key: 'labor', label: t('overviewDashboard.featureTagLabor'), icon: Wallet, tone: 'amber' },
    { key: 'platform', label: t('overviewDashboard.featureTagPlatform'), icon: Iphone, tone: 'sky' },
    { key: 'inventory', label: t('overviewDashboard.featureTagInventory'), icon: Goods, tone: 'green' },
    { key: 'analysis', label: t('overviewDashboard.featureTagAnalysis'), icon: DataLine, tone: 'cyan' },
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

const workflowSteps = computed(() => {
  locale.value
  const icons = [Goods, ShoppingCart, Iphone, DataLine, Box, Wallet]
  const tones = ['supplier', 'purchase', 'listing', 'order', 'inventory', 'settlement']

  return [
    'supplierUpload',
    'luxePurchase',
    'platformListing',
    'orderCapture',
    'stockAutomation',
    'supplierSettlement',
  ].map((key, index) => ({
    key,
    title: t(`overviewDashboard.workflowSteps.${key}.title`),
    desc: t(`overviewDashboard.workflowSteps.${key}.desc`),
    icon: icons[index],
    tone: tones[index],
  }))
})

const workflowMetrics = computed(() => [
  {
    key: 'supplier',
    label: t('overviewDashboard.workflowMetrics.supplier.label'),
    oldValue: t('overviewDashboard.workflowMetrics.supplier.old'),
    newValue: t('overviewDashboard.workflowMetrics.supplier.new'),
    saving: t('overviewDashboard.workflowMetrics.supplier.saving'),
    tone: 'blue',
  },
  {
    key: 'inbound',
    label: t('overviewDashboard.workflowMetrics.inbound.label'),
    oldValue: t('overviewDashboard.workflowMetrics.inbound.old'),
    newValue: t('overviewDashboard.workflowMetrics.inbound.new'),
    saving: t('overviewDashboard.workflowMetrics.inbound.saving'),
    tone: 'violet',
  },
  {
    key: 'listing',
    label: t('overviewDashboard.workflowMetrics.listing.label'),
    oldValue: t('overviewDashboard.workflowMetrics.listing.old'),
    newValue: t('overviewDashboard.workflowMetrics.listing.new'),
    saving: t('overviewDashboard.workflowMetrics.listing.saving'),
    tone: 'amber',
  },
  {
    key: 'orders',
    label: t('overviewDashboard.workflowMetrics.orders.label'),
    oldValue: t('overviewDashboard.workflowMetrics.orders.old'),
    newValue: t('overviewDashboard.workflowMetrics.orders.new'),
    saving: t('overviewDashboard.workflowMetrics.orders.saving'),
    tone: 'green',
  },
  {
    key: 'labor',
    label: t('overviewDashboard.workflowMetrics.labor.label'),
    oldValue: t('overviewDashboard.workflowMetrics.labor.old'),
    newValue: t('overviewDashboard.workflowMetrics.labor.new'),
    saving: t('overviewDashboard.workflowMetrics.labor.saving'),
    tone: 'red',
  },
  {
    key: 'finance',
    label: t('overviewDashboard.workflowMetrics.finance.label'),
    oldValue: t('overviewDashboard.workflowMetrics.finance.old'),
    newValue: t('overviewDashboard.workflowMetrics.finance.new'),
    saving: t('overviewDashboard.workflowMetrics.finance.saving'),
    tone: 'cyan',
  },
])

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
  return allModules.value.filter((item) => {
    return activeCategory.value === 'all' || item.category === activeCategory.value
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
  if (/供货商商品结算|供应商商品结算|supplier-settlement|wms\/vendor\/index/.test(text)) return 'vendorManage'
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

function openLuxeAf() {
  window.open('https://www.codemw.com/', '_blank', 'noopener,noreferrer')
}

async function scrollTo(id) {
  if (id === 'guidelines') {
    guidelinesOpen.value = ['guidelines']
  }
  await nextTick()
  const target = document.getElementById(id)
  let scrollRoot = target?.parentElement || null
  while (scrollRoot) {
    const style = window.getComputedStyle(scrollRoot)
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY)
      && scrollRoot.scrollHeight > scrollRoot.clientHeight + 1
    if (canScroll) break
    scrollRoot = scrollRoot.parentElement
  }
  const scrollToTarget = (behavior = 'smooth') => {
    if (!target || !scrollRoot?.contains(target)) return false
    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    scrollRoot.scrollTo({
      top: scrollRoot.scrollTop + targetRect.top - rootRect.top - 12,
      behavior,
    })
    return true
  }
  if (scrollToTarget()) {
    if (id === 'guidelines') {
      window.setTimeout(() => scrollToTarget(), 360)
    }
    return
  }
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

</script>

<style scoped lang="scss">
.overview-page {
  --overview-primary: #409eff;
  --overview-primary-deep: #1677ff;
  --overview-primary-soft: #eaf3ff;
  --overview-primary-glow: rgba(64, 158, 255, 0.16);
  --overview-accent-violet: #7f62e4;
  --overview-accent-violet-soft: #efe9ff;
  --overview-accent-sky: #2f75ff;
  --overview-accent-sky-soft: #eaf3ff;
  --overview-accent-amber: #e6a23c;
  --overview-accent-amber-soft: #fff7e8;
  --overview-hero-start: #f7fbff;
  --overview-hero-end: #f3f7fc;
  --overview-text: #101828;
  --overview-muted: #667085;
  --overview-border: #e8edf5;
  --overview-panel: #ffffff;
  --overview-font-xs: 12px;
  --overview-font-sm: 13px;
  --overview-font-base: 14px;
  --overview-font-md: 15px;
  --overview-font-lg: 17px;
  --overview-font-title: 28px;
  min-height: calc(100vh - 84px);
  overflow-y: auto;
  padding: 12px;
  font-size: var(--overview-font-base);
  color: var(--overview-text);
  background: transparent;
}

.overview-shell {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-panel {
  padding: 18px 20px;
  border-radius: 10px;
  background: var(--overview-panel);
  border: 1px solid var(--overview-border);
  box-shadow: none;
}

.section-panel--flat {
  padding: 18px 20px 8px;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr);
  gap: 12px;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: none;
}

.hero-content,
.lifecycle-card {
  border-radius: 10px;
  border: 1px solid var(--overview-border);
  box-shadow: none;
}

.hero-content {
  position: relative;
  overflow: hidden;
  padding: 28px 30px 26px;
  background: linear-gradient(135deg, var(--overview-hero-start) 0%, #fff 58%, var(--overview-hero-end) 100%);
}

.reveal-section {
  transform: none;
}

.version-badge {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef6ff;
  border: 1px solid #cfe5ff;
  color: var(--overview-primary);
  font-size: var(--overview-font-xs);
  font-weight: 700;
  letter-spacing: 0;
}

.hero-title {
  position: relative;
  z-index: 1;
  margin: 16px 0 12px;
  font-size: 34px;
  line-height: 1.22;
  font-weight: 800;
  letter-spacing: 0;
}

.hero-title__prefix {
  display: inline;
  color: #111827;
}

.hero-title__highlight {
  display: inline;
  margin-left: 0.3em;
  color: var(--overview-primary-deep);
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
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-btn {
  position: relative;
  overflow: hidden;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
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
  --el-button-bg-color: var(--overview-primary);
  --el-button-border-color: var(--overview-primary);
  --el-button-hover-bg-color: var(--overview-primary);
  --el-button-hover-border-color: var(--overview-primary);
  --el-button-text-color: #ffffff;
  height: 46px;
  min-width: 138px;
  padding: 0 28px;
  border: 1px solid var(--overview-primary);
  background: var(--overview-primary);
  color: #ffffff;
  font-size: 16px;
  box-shadow: 0 8px 18px var(--overview-primary-glow);

  &:hover {
    transform: translateY(-1px);
    background: #f7fbff;
    border-color: #b7d8ff;
    color: var(--overview-primary-deep);
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.06);
  }

}

.hero-btn-secondary {
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e7ebf3;
  color: #475569;

  &:hover {
    transform: translateY(-1px);
    border-color: #b7d8ff;
    color: var(--overview-primary-deep);
    background: #f7fbff;
    box-shadow: 0 8px 18px rgba(16, 24, 40, 0.06);
  }
}

.btn-arrow {
  margin-left: 4px;
  transition: transform 0.22s ease;
}

.hero-btn-primary:hover .btn-arrow {
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
  padding: 7px 12px 7px 8px;
  border-radius: 999px;
  border: 1px solid var(--overview-border);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  background: #fff;
  box-shadow: none;
}

.hero-tag__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
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
  background: #f7fbff;
  border-color: #d7eaff;
  color: #1d65b7;

  .hero-tag__icon {
    background: #eaf3ff;
    color: var(--overview-primary);
  }
}

.hero-tag--violet {
  background: #fbfaff;
  border-color: #ddd4ff;
  color: #694dc6;

  .hero-tag__icon {
    background: var(--overview-accent-violet-soft);
    color: var(--overview-accent-violet);
  }
}

.hero-tag--sky {
  background: #f7fbff;
  border-color: #d7eaff;
  color: #255ec9;

  .hero-tag__icon {
    background: var(--overview-accent-sky-soft);
    color: var(--overview-accent-sky);
  }
}

.hero-tag--amber {
  background: #fffdf8;
  border-color: #f8ddb0;
  color: #9a640f;

  .hero-tag__icon {
    background: var(--overview-accent-amber-soft);
    color: var(--overview-accent-amber);
  }
}

.lifecycle-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 22px 38px;
  background: #fff;
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
  font-size: 16px;
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
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #b7d8ff;
    color: var(--overview-primary);
  }
}

.lifecycle-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
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
    border-color: #b7d8ff;
  }

  .timeline-node__icon {
    background: #eaf3ff;
    color: var(--overview-primary);
  }

  .timeline-node__label {
    color: var(--overview-primary-deep);
  }
}

.timeline-node.active {
  .timeline-node__ring {
    border-color: var(--overview-primary);
    animation: timelinePulse 1.8s ease-out infinite;
  }

  .timeline-node__icon {
    background: #eaf3ff;
    color: var(--overview-primary);
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
  border-radius: 8px;
  text-align: center;
  background: #fff;
  border: 1px solid #edf2f7;
}

.stat-item--tone-0 .stat-value {
  color: #2563eb;
}

.stat-item--tone-1 .stat-value {
  color: #7f62e4;
}

.stat-item--tone-2 .stat-value {
  color: #16a34a;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0;
}

.stat-label {
  margin-top: 8px;
  font-size: 12px;
  color: var(--overview-muted);
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
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0;
  }
}

.section-accent {
  width: 4px;
  height: 22px;
  border-radius: 999px;
  background: var(--overview-primary);
}

.module-count {
  padding: 6px 12px;
  border-radius: 6px;
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
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #b7d8ff;
    color: var(--overview-primary);
  }

  &.active {
    background: var(--overview-primary);
    border-color: var(--overview-primary);
    color: #fff;
    box-shadow: 0 8px 18px var(--overview-primary-glow);
  }
}

.module-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-group {
  padding: 16px 16px 6px;
  border-radius: 8px;
  background: #fbfcfe;
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
    letter-spacing: 0;
    color: #94a3b8;
    text-transform: uppercase;
  }
}

.group-count {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #e8edf5;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
}

.module-grid-rich {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.module-card-rich {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition:
    border-color 0.22s ease,
    box-shadow 0.22s ease,
    transform 0.22s ease;

  &:hover {
    border-color: #b7d8ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);

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
  border-radius: 8px;
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
  color: var(--overview-primary);
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
  border-radius: 5px;
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
  background: #eaf3ff;

  .module-icon,
  .module-icon-fallback {
    color: var(--overview-primary);
  }
}

.module-card-rich--inventory .module-card-rich__icon {
  background: #e8f8ef;

  .module-icon,
  .module-icon-fallback {
    color: #16a34a;
  }
}

.module-card-rich--order .module-card-rich__icon {
  background: #eaf3ff;

  .module-icon,
  .module-icon-fallback {
    color: #2563eb;
  }
}

.module-card-rich--platform .module-card-rich__icon {
  background: #efe9ff;

  .module-icon,
  .module-icon-fallback {
    color: #7c3aed;
  }
}

.module-card-rich--vendor .module-card-rich__icon {
  background: #e9f8fa;

  .module-icon,
  .module-icon-fallback {
    color: #0891b2;
  }
}

.module-card-rich--basic .module-card-rich__icon {
  background: #fff7e8;

  .module-icon,
  .module-icon-fallback {
    color: #d97706;
  }
}

.module-card-rich--system .module-card-rich__icon {
  background: #f1f5f9;

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
    border-radius: 8px;
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
  border-radius: 8px;
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
  border-radius: 8px;
  background: #fff7e8;
  border: 1px solid #f5dab1;
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

}

@media (max-width: 1200px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .module-grid-rich {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 768px) {
  .overview-page {
    padding: 12px 12px 24px;
  }

  .section-panel {
    padding: 18px 16px;
    border-radius: 10px;
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

/* Backend overview refinement */
.overview-page {
  background: #f5f7fa;
  padding: 12px 14px 18px;
}

.overview-shell {
  gap: 10px;
}

.section-panel,
.hero-content,
.lifecycle-card {
  border-radius: 8px;
  border-color: #e5e9f2;
  background: #fff;
  box-shadow: none;
}

.hero-section {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.hero-content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 24px 28px 22px;
  background: #fff;
}

.hero-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-badge {
  border-radius: 6px;
  background: #f0f7ff;
  border-color: #cfe5ff;
}

.hero-title {
  margin: 15px 0 10px;
  font-size: var(--overview-font-title);
  line-height: 1.25;
}

.hero-subtitle {
  max-width: 640px;
  line-height: 1.7;
  font-size: var(--overview-font-base);
}

.hero-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 30px;
}

.hero-btn {
  width: 100%;
  min-width: 0;
  height: 52px;
  border-radius: 7px;
  padding: 0 18px;
  font-size: var(--overview-font-md);
  font-weight: 700;
  line-height: 1.25;
  white-space: normal;
  text-align: center;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.hero-actions .el-button + .el-button {
  margin-left: 0;
}

.hero-btn::after {
  display: none;
}

.hero-btn-primary {
  min-width: 0;
  padding: 0 18px;
  font-size: var(--overview-font-md);
  box-shadow: none;
}

.hero-btn-primary:hover {
  background: #2f8be6;
  border-color: #2f8be6;
  color: #fff;
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.18);
}

.hero-btn-secondary {
  min-width: 0;
  padding: 0 18px;
  background: #fff;
  border-color: #dcdfe6;
  color: #303133;
}

.hero-btn-secondary:hover {
  background: #ecf5ff;
  border-color: #a0cfff;
  color: #1677ff;
  box-shadow: none;
}

.hero-tags {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.hero-tags-title {
  margin-top: auto;
  padding-top: 34px;
  color: #303133;
  font-size: var(--overview-font-md);
  font-weight: 700;
}

.hero-tag {
  align-items: flex-start;
  min-height: 74px;
  padding: 13px 14px 13px 12px;
  border-radius: 6px;
  background: #fafcff;
  color: #606266;
  line-height: 1.45;
  font-size: var(--overview-font-base);
}

.hero-tag__icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 6px;
}

.hero-tag__text {
  min-width: 0;
  white-space: normal;
}

.hero-tag--green {
  background: #f6fef9;
  border-color: #ccebd7;
  color: #16803d;
}

.hero-tag--green .hero-tag__icon {
  background: #e8f8ef;
  color: #16a34a;
}

.hero-tag--cyan {
  background: #f3fbfd;
  border-color: #cbeff5;
  color: #08768d;
}

.hero-tag--cyan .hero-tag__icon {
  background: #e9f8fa;
  color: #0891b2;
}

.lifecycle-card {
  gap: 14px;
  padding: 20px 20px 18px;
}

.lifecycle-header {
  font-size: var(--overview-font-md);
}

.lifecycle-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.lifecycle-timeline {
  padding: 2px 0 0;
  overflow: visible;
}

.timeline-nodes {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  min-width: 0;
  gap: 6px;
}

.timeline-node {
  align-items: stretch;
  gap: 6px;
  padding: 8px 6px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fafbfd;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.timeline-node:hover {
  border-color: #a0cfff;
  background: #f0f7ff;
}

.timeline-node__ring,
.timeline-node__icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
}

.timeline-node__ring {
  margin: 0 auto;
  background: transparent;
}

.timeline-node__icon {
  background: #fff;
  color: #909399;
  font-size: 15px;
}

.timeline-node__label {
  color: #606266;
  font-size: 12px;
}

.timeline-node.active {
  border-color: #409eff;
  background: #ecf5ff;
}

.timeline-node.active .timeline-node__ring {
  animation: none;
  border-color: transparent;
}

.timeline-node.active .timeline-node__icon,
.timeline-node.passed .timeline-node__icon {
  background: #d9ecff;
  color: #1677ff;
  transform: none;
}

.timeline-node.active .timeline-node__label,
.timeline-node.passed .timeline-node__label {
  color: #1677ff;
}

.lifecycle-stats {
  gap: 8px;
}

.stat-item {
  padding: 12px 10px;
  border-radius: 8px;
  background: #fafbfd;
}

.stat-value {
  font-size: 22px;
}

.section-panel {
  padding: 16px 18px;
}

.section-header {
  margin-bottom: 14px;
}

.section-title-wrap h2 {
  font-size: var(--overview-font-lg);
}

.section-subtitle {
  margin: 6px 0 0;
  color: #606266;
  font-size: var(--overview-font-sm);
}

.category-tabs {
  gap: 8px;
  margin-bottom: 14px;
}

.category-tab {
  padding: 7px 12px;
  background: #fff;
  border-color: #dcdfe6;
}

.category-tab:hover {
  background: #ecf5ff;
  border-color: #a0cfff;
}

.category-tab.active {
  box-shadow: none;
}

.module-groups {
  gap: 12px;
}

.module-group {
  padding: 14px;
  background: #fbfcff;
  border-color: #e8edf5;
}

.group-title-rich {
  margin-bottom: 12px;
}

.group-title-rich__en {
  color: #a8abb2;
}

.module-grid-rich {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.module-card-rich {
  min-height: 118px;
  border-radius: 8px;
}

.module-card-rich:hover {
  transform: none;
  border-color: #a0cfff;
  box-shadow: 0 4px 12px rgba(16, 24, 40, 0.06);
}

.module-card-rich__head {
  gap: 10px;
  padding: 13px 14px 10px;
}

.module-card-rich__icon {
  width: 34px;
  height: 34px;
  border-radius: 7px;
}

.module-card-rich__title {
  font-size: var(--overview-font-base);
}

.module-card-rich__desc {
  margin-top: 4px;
}

.module-card-rich__arrow {
  opacity: 1;
  color: #c0c4cc;
  transform: none;
}

.module-card-rich__steps {
  padding: 9px 14px 12px;
}

.module-card-rich__steps li {
  line-height: 1.45;
}

.step-no {
  width: 17px;
  height: 17px;
  border-radius: 4px;
}

.guidelines-section {
  padding-bottom: 16px;
}

.guidelines-section :deep(.el-collapse-item__header) {
  min-height: 46px;
  border-radius: 8px;
  background: #fbfcff;
  color: #303133;
}

.notice-page {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
  margin-top: 12px;
  padding: 0;
  border: none;
  background: transparent;
}

.notice-section {
  padding: 14px 16px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
}

.notice-section h4 {
  color: #303133;
}

.notice-section p {
  color: #606266;
}

.notice-section ul {
  margin-left: 18px;
  color: #606266;
}

.final-reminder {
  grid-column: 1 / -1;
  margin: 0;
  background: #fff7e6;
  color: #9a5b00;
}

.reveal-section {
  transform: none;
}

@media (max-width: 1200px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .timeline-nodes {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  }
}

/* Match dashboard/charts.vue: page background is provided by the layout. */
.overview-page {
  background: transparent;
  padding: 14px;
}

.hero-section {
  padding: 0;
  border: none;
  background: transparent;
  overflow: visible;
}

.modules-section,
.guidelines-section {
  background: #fff;
}

.module-group {
  padding: 12px 0 2px;
  border: none;
  border-top: 1px solid #edf0f5;
  border-radius: 0;
  background: transparent;
}

.module-group:first-child {
  border-top: none;
  padding-top: 2px;
}

.module-grid-rich {
  padding: 0;
}

.notice-page {
  background: #fff;
}

/* Align with el-card style used by inventory/statistic pages. */
.section-panel,
.hero-content,
.lifecycle-card {
  border-color: #edf0f5;
  box-shadow: 0 6px 18px rgba(16, 24, 40, 0.12);
}

.hero-section {
  box-shadow: none;
}

.module-card-rich,
.notice-section {
  box-shadow: 0 4px 14px rgba(16, 24, 40, 0.06);
}

.module-card-rich:hover {
  box-shadow: 0 8px 22px rgba(16, 24, 40, 0.1);
}

.workflow-map {
  min-height: 0;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.workflow-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 92px;
  padding: 12px 13px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fbfcff;
}

.workflow-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #e8edf5;
  color: #8a94a6;
  font-size: 12px;
  font-weight: 700;
}

.workflow-step__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 8px;
  font-size: 18px;
}

.workflow-step__body {
  min-width: 0;
}

.workflow-step__body strong,
.workflow-step__body small {
  display: block;
}

.workflow-step__body strong {
  color: #101828;
  font-size: 14px;
  line-height: 1.35;
}

.workflow-step__body small {
  margin-top: 6px;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.workflow-step--supplier .workflow-step__icon { background: #eaf3ff; color: #1677ff; }
.workflow-step--purchase .workflow-step__icon { background: #efe9ff; color: #7f62e4; }
.workflow-step--listing .workflow-step__icon { background: #fff7e8; color: #d97706; }
.workflow-step--order .workflow-step__icon { background: #e9f8fa; color: #0891b2; }
.workflow-step--inventory .workflow-step__icon { background: #e8f8ef; color: #16a34a; }
.workflow-step--settlement .workflow-step__icon { background: #fff1ef; color: #ef5454; }

.workflow-comparison-title {
  margin-top: 14px;
  color: #303133;
  font-size: 14px;
  font-weight: 700;
}

.workflow-comparison {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.workflow-metric {
  padding: 12px 13px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
}

.workflow-metric__label {
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.workflow-metric__values {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.3;
}

.workflow-metric__values strong {
  color: #101828;
  font-size: 13px;
}

.workflow-metric__old {
  text-decoration: line-through;
}

.workflow-metric__saving {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.workflow-metric--blue .workflow-metric__saving { color: #1677ff; }
.workflow-metric--violet .workflow-metric__saving { color: #7f62e4; }
.workflow-metric--green .workflow-metric__saving { color: #16a34a; }
.workflow-metric--amber .workflow-metric__saving { color: #d97706; }
.workflow-metric--red .workflow-metric__saving { color: #ef5454; }
.workflow-metric--cyan .workflow-metric__saving { color: #0891b2; }

@media (max-width: 768px) {
  .workflow-steps,
  .workflow-comparison {
    grid-template-columns: 1fr;
  }

  .hero-content {
    padding: 22px 14px 20px;
  }

  .hero-title {
    font-size: 24px;
    line-height: 1.25;
  }

  .hero-actions {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 22px;
  }

  .hero-actions .el-button + .el-button {
    margin-left: 0;
  }

  .hero-btn,
  .hero-btn-primary,
  .hero-btn-secondary {
    width: 100%;
    min-width: 0;
    height: 48px;
    padding: 0 6px;
    font-size: 12px;
    line-height: 1.2;
  }

  .hero-btn .btn-arrow {
    margin-left: 2px;
    font-size: 12px;
  }

  .hero-tags {
    grid-template-columns: 1fr;
  }
}
</style>
