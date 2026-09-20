<template>
  <el-table :data="rows" row-key="id" stripe :empty-text="tr('暂无生效费率')">
    <el-table-column v-if="showAccount" prop="accountLabel" :label="tr('直播平台')" min-width="190"><template #default="s"><LiveAccountLabel :account="s.row" :accounts="accounts" /></template></el-table-column>
    <el-table-column prop="rateTypeName" :label="tr('费率类型')" min-width="110"><template #default="s"><el-tag>{{ s.row.rateTypeName }}</el-tag></template></el-table-column>
    <el-table-column :label="tr('时薪')" min-width="110"><template #default="s"><strong>{{ money(s.row.hourlyRate) }}/h</strong></template></el-table-column>
    <el-table-column :label="tr('生效日期')" min-width="120"><template #default="s">{{ displayDate(s.row.effectiveDate) }}</template></el-table-column>
    <el-table-column :label="tr('失效日期')" min-width="120"><template #default="s">{{ s.row.expiryDate ? displayDate(s.row.expiryDate) : tr('长期') }}</template></el-table-column>
    <el-table-column :label="tr('状态')" min-width="110"><template #default="s"><el-tag :type="rateStatusType(s.row)">{{ tr(rateStatusLabel(s.row)) }}</el-tag></template></el-table-column>
    <el-table-column prop="remark" :label="tr('备注')" min-width="140" show-overflow-tooltip />
    <el-table-column :label="tr('操作')" width="140" fixed="right"><template #default="s"><el-button link type="primary" :disabled="!canEdit(s.row)" @click="$emit('edit', s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="$emit('remove', s.row)">{{ tr('删除') }}</el-button></template></el-table-column>
  </el-table>
</template>

<script setup>
import LiveAccountLabel from './LiveAccountLabel.vue'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate, money } from '../shared'
import { rateStatusLabel, rateStatusType } from '../rates/rateDisplay'
const { tr } = useLiveI18n()
defineProps({ accounts: { type: Array, default: () => [] }, rows: { type: Array, default: () => [] }, showAccount: Boolean, canEdit: { type: Function, required: true } })
defineEmits(['edit', 'remove'])
</script>
