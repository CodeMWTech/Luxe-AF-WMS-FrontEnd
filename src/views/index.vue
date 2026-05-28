<template>
  <div class="app-container home">
    <div class="notice-page" data-runtime-i18n-ignore="true">
      <h1>{{ t('projectIntro.title') }}</h1>

      <section v-for="section in sections" :key="section.title" class="notice-section">
        <h2>{{ section.title }}</h2>
        <template v-for="item in section.content" :key="item.key">
          <p v-if="item.type === 'text'" :class="{ warning: item.warning }">{{ item.text }}</p>
          <ul v-else>
            <li v-for="entry in item.items" :key="entry">{{ entry }}</li>
          </ul>
        </template>
      </section>

      <p class="final-reminder">{{ t('projectIntro.finalReminder') }}</p>
    </div>
  </div>
</template>

<script setup name="Index">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const sections = computed(() => {
  locale.value

  return [
    {
      title: t('projectIntro.accountSecurity.title'),
      content: [
        { key: 'accountSecurity.line1', type: 'text', text: t('projectIntro.accountSecurity.line1') },
        { key: 'accountSecurity.line2', type: 'text', text: t('projectIntro.accountSecurity.line2') },
      ],
    },
    {
      title: t('projectIntro.productInfo.title'),
      content: [
        { key: 'productInfo.line1', type: 'text', text: t('projectIntro.productInfo.line1') },
        { key: 'productInfo.line2', type: 'text', text: t('projectIntro.productInfo.line2') },
      ],
    },
    {
      title: t('projectIntro.warehouse.title'),
      content: [
        { key: 'warehouse.line1', type: 'text', text: t('projectIntro.warehouse.line1') },
        { key: 'warehouse.line2', type: 'text', text: t('projectIntro.warehouse.line2') },
      ],
    },
    {
      title: t('projectIntro.inbound.title'),
      content: [
        { key: 'inbound.line1', type: 'text', text: t('projectIntro.inbound.line1') },
        { key: 'inbound.line2', type: 'text', text: t('projectIntro.inbound.line2') },
        {
          key: 'inbound.checklist',
          type: 'list',
          items: [
            t('projectIntro.inbound.checkItemInfo'),
            t('projectIntro.inbound.checkWarehouse'),
            t('projectIntro.inbound.checkQuantity'),
            t('projectIntro.inbound.checkCost'),
          ],
        },
        { key: 'inbound.warning', type: 'text', text: t('projectIntro.inbound.warning'), warning: true },
        { key: 'inbound.line3', type: 'text', text: t('projectIntro.inbound.line3') },
      ],
    },
    {
      title: t('projectIntro.outbound.title'),
      content: [
        { key: 'outbound.line1', type: 'text', text: t('projectIntro.outbound.line1') },
        { key: 'outbound.line2', type: 'text', text: t('projectIntro.outbound.line2') },
        {
          key: 'outbound.checklist',
          type: 'list',
          items: [
            t('projectIntro.outbound.checkItemInfo'),
            t('projectIntro.outbound.checkWarehouse'),
            t('projectIntro.outbound.checkQuantity'),
            t('projectIntro.outbound.checkSalesPrice'),
          ],
        },
        { key: 'outbound.line3', type: 'text', text: t('projectIntro.outbound.line3') },
      ],
    },
    {
      title: t('projectIntro.irreversible.title'),
      content: [
        { key: 'irreversible.line1', type: 'text', text: t('projectIntro.irreversible.line1') },
        { key: 'irreversible.line2', type: 'text', text: t('projectIntro.irreversible.line2') },
      ],
    },
    {
      title: t('projectIntro.dataResponsibility.title'),
      content: [
        { key: 'dataResponsibility.line1', type: 'text', text: t('projectIntro.dataResponsibility.line1') },
        { key: 'dataResponsibility.line2', type: 'text', text: t('projectIntro.dataResponsibility.line2') },
      ],
    },
  ]
})
</script>

<style scoped lang="scss">
.home {
  font-family: "open sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #303133;
  overflow-x: hidden;
  background: #fff;
}

.notice-page {
  padding: 26px 28px 40px;
  font-size: 15px;
  line-height: 1.75;

  h1 {
    margin: 0 0 22px;
    font-size: 24px;
    font-weight: 700;
    color: #1f2d3d;
  }
}

.notice-section {
  padding: 14px 0 18px;
  border-bottom: 1px solid #ebeef5;

  &:first-child {
    padding-top: 0;
  }

  h2 {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 700;
    color: #1f2d3d;
  }

  p {
    margin: 6px 0;
  }

  ul {
    margin: 8px 0 8px 20px;
    padding: 0;
  }

  li {
    margin: 4px 0;
  }
}

.warning {
  margin-top: 10px !important;
  color: #c45656;
  font-weight: 700;
}

.final-reminder {
  margin: 18px 0 0;
  color: #1f2d3d;
  font-size: 16px;
  font-weight: 700;
}
</style>
