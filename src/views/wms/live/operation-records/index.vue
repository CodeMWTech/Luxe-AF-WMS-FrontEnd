<template>
  <div data-runtime-i18n-ignore="true" class="live-page">
    <div class="live-hero">
      <div><h2>{{ tr('运营记录') }}</h2><p>{{ tr('按场次查看开播录入中的运营、实际直播时间和 GMV') }}</p></div>
      <el-button v-hasPermi="['wms:live:operation:export']" :loading="exportLoading" :disabled="loading || total === 0" @click="exportRows">{{ tr('导出 Excel') }}</el-button>
    </div>
    <el-card class="live-filter" shadow="never">
      <el-form inline @submit.prevent="handleQuery">
        <el-form-item :label="tr('运营')">
          <el-select v-model="query.operatorEmployeeId" filterable clearable :placeholder="tr('全部运营')" :loading="optionsLoading">
            <el-option v-for="operator in options.operators" :key="operator.value" :value="operator.value" :label="operatorLabel(operator, tr)" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('业务日期')"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
        <el-form-item :label="tr('平台')"><LiveAccountSelect v-model="query.accountId" :accounts="options.accounts" :placeholder="tr('全部平台')" clearable /></el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" @click="handleQuery">{{ tr('查询') }}</el-button><el-button @click="resetQuery">{{ tr('重置') }}</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-card class="live-card" shadow="never">
      <el-table v-loading="loading" :data="rows" row-key="id" stripe>
        <el-table-column :label="tr('运营')" min-width="200"><template #default="{ row }">{{ operatorLabel(row, tr) }}</template></el-table-column>
        <el-table-column prop="businessDate" :label="tr('业务日期')" :min-width="isEn ? 155 : 130"><template #default="{ row }">{{ displayDate(row.businessDate) }}</template></el-table-column>
        <el-table-column :label="tr('平台')" min-width="220"><template #default="{ row }"><LivePlatformTag :account="row" /></template></el-table-column>
        <el-table-column :label="tr('本场实际直播时间')" :min-width="isEn ? 210 : 170"><template #default="{ row }">{{ actualDurationLabel(row.actualDurationMinutes, isEn) }}</template></el-table-column>
        <el-table-column :label="tr('本场 GMV')" min-width="150" align="right"><template #default="{ row }">{{ row.gmv == null ? '—' : money(row.gmv) }}</template></el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" v-model:page="pagination.pageNum" v-model:limit="pagination.pageSize" @pagination="load" />
    </el-card>
  </div>
</template>

<script setup>
import { onActivated, onMounted, reactive, ref } from 'vue'
import { exportOperationRecords, getOperationRecordOptions, listOperationRecords } from '@/api/wms/livePayroll'
import LiveAccountSelect from '../components/LiveAccountSelect.vue'
import LivePlatformTag from '../components/LivePlatformTag.vue'
import { useLiveI18n } from '../useLiveI18n'
import { displayDate, isoDate, LIVE_DATE_FORMAT, money } from '../shared'
import { actualDurationLabel, operationRecordFilters, operatorLabel } from './recordDisplay'

const { tr, isEn } = useLiveI18n()
const query = reactive({ operatorEmployeeId: null, accountId: null })
const pagination = reactive({ pageNum: 1, pageSize: 20 })
const dateRange = ref(null)
const appliedFilters = ref({})
const options = reactive({ operators: [], accounts: [] })
const optionsLoading = ref(false), loading = ref(false), exportLoading = ref(false)
const rows = ref([]), total = ref(0)
let requestVersion = 0, initialized = false

async function loadOptions() {
  optionsLoading.value = true
  try { Object.assign(options, (await getOperationRecordOptions()).data || {}) }
  finally { optionsLoading.value = false }
}
async function load() {
  const version = ++requestVersion
  loading.value = true
  try {
    const result = await listOperationRecords({ ...appliedFilters.value, ...pagination })
    if (version !== requestVersion) return
    rows.value = result.rows || []
    total.value = result.total || 0
  } catch (error) {
    if (version === requestVersion) { rows.value = []; total.value = 0 }
  } finally { if (version === requestVersion) loading.value = false }
}
function handleQuery() {
  pagination.pageNum = 1
  appliedFilters.value = operationRecordFilters(query, dateRange.value)
  return load()
}
function resetQuery() {
  Object.assign(query, { operatorEmployeeId: null, accountId: null })
  dateRange.value = null
  return handleQuery()
}
async function exportRows() {
  if (exportLoading.value || loading.value || total.value === 0) return
  exportLoading.value = true
  try { await exportOperationRecords({ ...appliedFilters.value }, `${tr('运营记录')}_${isoDate()}.xlsx`) }
  finally { exportLoading.value = false }
}
onMounted(async () => { await Promise.allSettled([loadOptions(), load()]); initialized = true })
onActivated(() => { if (initialized) return Promise.allSettled([loadOptions(), load()]) })
</script>

<style scoped lang="scss">
@import '../live.scss';
</style>
