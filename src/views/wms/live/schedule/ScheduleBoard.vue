<template>
  <div class="schedule-board">
    <section v-for="week in weeks" :key="week[0].date">
      <h3>{{ tr('所选周') }} · {{ displayDate(week[0].date) }} — {{ displayDate(week[6].date) }}</h3>
      <div class="board-scroll" role="region" :aria-label="tr('排班计划')" tabindex="0">
        <table class="board-table">
          <thead><tr><th scope="col">{{ tr(dimensions[view]) }}</th><th v-for="day in week" :key="day.date" scope="col" :class="{ today: day.today }">{{ displayDate(day.date).slice(0, 5) }}<span>{{ tr(weekdays[new Date(`${day.date}T12:00:00`).getDay()]) }}</span></th></tr></thead>
          <tbody>
            <tr v-for="group in groups" :key="group.id">
              <th scope="row"><strong>{{ group.id === 'unassigned' ? tr(group.label) : group.label }}</strong><small v-if="group.secondary">{{ group.secondary }}</small></th>
              <td v-for="day in week" :key="day.date" :class="{ today: day.today }">
                <button v-for="entry in entries(group, day.date)" :key="entry.key" type="button" class="shift-card"
                  :class="{ pending: entry.row.scheduleStatus === 'PENDING', cancelled: entry.row.scheduleStatus === 'CANCELLED' }"
                  :style="colorStyle(entry)" @click="$emit('open', entry.row)">
                  <strong>{{ timeLabel(entry.startTime) }}–{{ timeLabel(entry.endTime) }}</strong>
                  <span v-if="view !== 'host'" class="host-name">{{ entry.row.employeeName }}</span>
                  <span v-if="view !== 'channel'">{{ entry.row.accountLabel }}</span>
                  <span>{{ tr('运营') }} · {{ operatorName(entry) }}</span>
                  <small v-if="entry.row.rateTypeName">{{ entry.row.rateTypeName }}</small>
                  <span v-if="entry.row.scheduleStatus === 'CANCELLED'" class="state">{{ tr('已取消') }}</span>
                  <span v-else-if="entry.row.scheduleStatus === 'PENDING'" class="state">{{ tr('待确认') }}</span>
                  <span v-if="notificationStates[String(entry.row.id)]" class="sms-state" :class="`sms-${notificationStates[String(entry.row.id)].toLowerCase()}`">{{ tr(notificationStateLabels[notificationStates[String(entry.row.id)]] || notificationStates[String(entry.row.id)]) }}</span>
                  <span v-if="conflicts.has(idKey(entry.row.id))" class="conflict">! {{ tr('人员冲突') }}</span>
                  <small v-if="entry.row.remark" class="remark">{{ entry.row.remark }}</small>
                </button>
                <el-button v-if="canEdit" class="add-shift" text size="small" @click="$emit('add', { scheduleDate: day.date, [view === 'channel' ? 'accountId' : view === 'host' ? 'employeeId' : 'operatorId']: group.id === 'unassigned' ? null : group.id })">{{ tr('+ 添加') }}</el-button>
                <span v-if="!canEdit && !entries(group, day.date).length" class="empty-cell">—</span>
              </td>
            </tr>
            <tr v-if="!groups.length"><td colspan="8" class="empty-board">{{ tr('当前筛选条件下暂无排班') }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate } from '../shared'
import { idKey, timeLabel, scheduleGroups, conflictingSchedules, operatorColorStyle } from './scheduleDisplay'
import { notificationStateLabels } from './smsDisplay'
const props = defineProps({ rows: { type: Array, default: () => [] }, operators: { type: Array, default: () => [] }, accounts: { type: Array, default: () => [] }, employees: { type: Array, default: () => [] }, weeks: { type: Array, default: () => [] }, view: { type: String, default: 'channel' }, canEdit: Boolean, notificationStates: { type: Object, default: () => ({}) } })
defineEmits(['open', 'add'])
const { tr } = useLiveI18n()
const dimensions = { channel: '频道', operator: '运营', host: '主播' }
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const groups = computed(() => scheduleGroups(props.rows, props.view, props.operators, props.accounts, props.employees))
const conflicts = computed(() => conflictingSchedules(props.rows))
const people = computed(() => new Map(props.operators.map(o => [idKey(o.employeeId), o])))
const entries = (group, date) => group.entries.filter(entry => entry.row.scheduleDate === date)
const operatorName = entry => entry.operator ? people.value.get(idKey(entry.operator.employeeId))?.name || entry.operator.employeeName || '-' : tr('待配运营')
const colorStyle = entry => operatorColorStyle(entry.operator && people.value.get(idKey(entry.operator.employeeId))?.color)
</script>

<style scoped lang="scss">
.schedule-board h3 { margin: 20px 0 12px; font-size: 15px; }
.board-scroll { overflow-x: auto; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.board-table { width: 100%; min-width: 1160px; table-layout: fixed; border-collapse: collapse; color: var(--el-text-color-primary); }
.board-table th, .board-table td { padding: 8px; border-bottom: 1px solid var(--el-border-color-lighter); border-right: 1px solid var(--el-border-color-lighter); vertical-align: top; text-align: left; }
.board-table thead th { text-align: center; background: var(--el-fill-color-light); padding: 12px 8px; }
.board-table th:first-child { width: 160px; }
.board-table th span, .board-table th small { display: block; margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; overflow-wrap: anywhere; }
.board-table tbody th { padding-top: 14px; background: var(--el-bg-color); }
.board-table .today { background-color: var(--el-color-primary-light-9); }
.shift-card { display: flex; flex-direction: column; gap: 4px; width: 100%; margin-bottom: 7px; padding: 10px; border: 1px solid transparent; border-left: 4px solid var(--operator-color); border-radius: 6px; background: var(--operator-fill); color: var(--el-text-color-primary); font: inherit; font-size: 12px; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.shift-card strong { font-variant-numeric: tabular-nums; }
.shift-card .host-name { font-weight: 600; font-size: 13px; }
.shift-card.pending { border-top-style: dashed; border-right-style: dashed; border-bottom-style: dashed; border-top-color: var(--el-border-color-dark); border-right-color: var(--el-border-color-dark); border-bottom-color: var(--el-border-color-dark); }
.shift-card.cancelled strong, .shift-card.cancelled .host-name { text-decoration: line-through; }
.shift-card small, .state { color: var(--el-text-color-regular); }
.conflict { color: var(--el-color-danger); }
.sms-state { font-size: 11px; color: var(--el-text-color-secondary); }
.sms-changed, .sms-unknown { color: var(--el-color-warning-dark-2); font-weight: 600; }
.sms-published { color: var(--el-color-success-dark-2); }
.remark { border-top: 1px solid var(--el-border-color-lighter); padding-top: 5px; }
.add-shift { margin: 0; }
.empty-cell { color: var(--el-text-color-placeholder); }
.empty-board { text-align: center !important; padding: 40px !important; color: var(--el-text-color-secondary); }
</style>
