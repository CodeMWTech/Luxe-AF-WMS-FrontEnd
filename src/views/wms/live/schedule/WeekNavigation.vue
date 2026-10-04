<template>
  <div class="week-navigation" :aria-label="tr('周次')">
    <span class="week-label">{{ tr('周次') }}</span>
    <el-button @click="$emit('today')">{{ tr('今天') }}</el-button>
    <el-config-provider :locale="pickerLocale">
      <el-date-picker
        :key="pickerLocale.name"
        class="week-picker-input"
        :model-value="range[0]"
        type="date"
        value-format="YYYY-MM-DD"
        :format="`MM/DD/YYYY [– ${displayDate(range[1])}]`"
        :aria-label="tr('周次')"
        popper-class="schedule-week-picker-popper"
        :cell-class-name="weekCellClassName"
        :editable="false"
        :clearable="false"
        @update:model-value="$emit('select', $event)"
      />
    </el-config-provider>
    <div class="week-arrows">
      <el-button :icon="ArrowLeft" circle :aria-label="tr('上一周')" :title="tr('上一周')" @click="$emit('previous')" />
      <el-button :icon="ArrowRight" circle :aria-label="tr('下一周')" :title="tr('下一周')" @click="$emit('next')" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import en from 'element-plus/lib/locale/lang/en'
import zhCn from 'element-plus/lib/locale/lang/zh-cn'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate, isoDate } from '../shared'

const props = defineProps({ range: { type: Array, required: true } })
defineEmits(['today', 'previous', 'next', 'select'])
const { tr, isEn } = useLiveI18n()
// Keep Monday-first English dates local to this picker; other pages retain their locale.
dayjs.locale({ ...dayjs.Ls.en, name: 'en-schedule', weekStart: 1 }, null, true)
const pickerLocale = computed(() => isEn.value ? { ...en, name: 'en-schedule' } : zhCn)
function weekCellClassName(date) {
  const value = isoDate(date)
  if (value < props.range[0] || value > props.range[1]) return ''
  if (value === props.range[0]) return 'schedule-week-cell schedule-week-start'
  if (value === props.range[1]) return 'schedule-week-cell schedule-week-end'
  return 'schedule-week-cell'
}
</script>

<style scoped lang="scss">
.week-navigation { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.week-label { color: var(--el-text-color-regular); font-size: 14px; }
.week-navigation :deep(.week-picker-input.el-date-editor) { width: 300px; max-width: 100%; flex: 0 1 300px; }
.week-arrows { display: flex; gap: 6px; }
.week-arrows .el-button + .el-button { margin-left: 0; }
@media (max-width: 760px) {
  .week-navigation { gap: 10px; }
  .week-navigation :deep(.week-picker-input.el-date-editor) { order: 1; flex-basis: 100%; width: 100%; }
}
</style>

<style lang="scss">
.schedule-week-picker-popper {
  .el-date-table__row:hover .el-date-table-cell,
  td.schedule-week-cell .el-date-table-cell { background-color: var(--el-datepicker-inrange-bg-color); }
  .el-date-table__row:hover td.available:hover { color: var(--el-datepicker-text-color); }
  .el-date-table__row:hover td:first-child .el-date-table-cell,
  td.schedule-week-start .el-date-table-cell { margin-left: 5px; border-radius: 15px 0 0 15px; }
  .el-date-table__row:hover td:last-child .el-date-table-cell,
  td.schedule-week-end .el-date-table-cell { margin-right: 5px; border-radius: 0 15px 15px 0; }
  td.schedule-week-start .el-date-table-cell__text { color: #fff; background-color: var(--el-datepicker-active-color); }
}
</style>
