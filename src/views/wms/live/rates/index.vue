<template>
  <div data-runtime-i18n-ignore="true" class="live-page rate-page">
    <div class="live-hero">
      <div><h2>{{ tr('费率配置') }}</h2><p>{{ tr('按主播 / 直播运营与直播平台配置时薪规则') }}</p></div>
      <div class="live-actions">
        <el-button @click="exportRows">{{ tr('批量导出') }}</el-button>
      </div>
    </div>

    <div class="rate-config-shell">
      <aside class="employee-panel">
        <div class="employee-search">
          <el-input v-model="employeeKeyword" clearable :placeholder="tr('搜索主播 / 直播运营')">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-checkbox :model-value="!includeInactive" @change="includeInactive = !$event; resetEmployeeSelection()">{{ tr('隐藏已归档主播') }}</el-checkbox>
        </div>
        <div v-loading="loading" class="employee-list">
          <button v-for="employee in filteredEmployees" :key="employee.value" type="button" class="employee-item" :class="{ active: selectedEmployeeId === employee.value }" @click="selectEmployee(employee.value)">
            <span class="employee-avatar">{{ initial(employee.label) }}</span>
            <span class="employee-copy"><strong>{{ employee.label }} <el-tag v-if="employee.employeeStatus >= 2" size="small" type="info">{{ tr(employeeStatusLabel(employee.employeeStatus)) }}</el-tag></strong><small>{{ employee.nickName ? employee.nickName + ' · ' : '' }}{{ rateRecordLabel(rateCountByEmployee(employee.value)) }}</small></span>
            <span class="employee-count">{{ rateCountByEmployee(employee.value) }}</span>
          </button>
          <el-empty v-if="!loading && !filteredEmployees.length" :description="tr('暂无主播或直播运营')" :image-size="64" />
        </div>
      </aside>

      <section class="rate-detail-panel" v-loading="loading || groupLoading">
        <template v-if="selectedEmployee">
          <div class="detail-toolbar">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="detail">{{ tr('费率明细') }}</el-radio-button>
              <el-radio-button label="list">{{ tr('列表') }}</el-radio-button>
            </el-radio-group>
            <el-button type="primary" :disabled="!configurableAccounts.length" @click="openDialog()">{{ tr('新增费率') }}</el-button>
          </div>

          <div class="employee-summary">
            <div class="summary-main">
              <span class="summary-avatar">{{ initial(selectedEmployee.label) }}</span>
              <div><h3>{{ selectedEmployee.label }} <el-tag v-if="selectedEmployee.employeeStatus >= 2" type="info">{{ tr(employeeStatusLabel(selectedEmployee.employeeStatus)) }}</el-tag></h3>
              <el-button v-if="Number(selectedEmployee.employeeStatus) === 3" link type="warning" v-hasPermi="['wms:employee:edit']" @click="openDeparture">{{ tr('核实离职日期') }}</el-button><el-button v-else link type="warning" v-hasPermi="['wms:employee:archive']" @click="openDeparture">{{ tr('离职归档') }}</el-button><p>{{ selectedEmployee.nickName ? selectedEmployee.nickName + ' · ' : '' }}{{ employeeSummaryText }}</p></div>
            </div>
            <div class="live-actions">
              <el-button size="small" @click="setAllGroups(0)">{{ tr('全部启用') }}</el-button>
              <el-button size="small" @click="setAllGroups(1)">{{ tr('全部禁用') }}</el-button>
            </div>
          </div>

          <div v-if="viewMode === 'detail'" class="account-groups">
            <article v-for="account in sortedAccounts" :key="account.id" class="account-group">
              <header class="account-group-header">
                <button type="button" class="account-collapse" @click="toggleExpanded(account.id)">
                  <el-icon><ArrowDown v-if="isExpanded(account.id)" /><ArrowRight v-else /></el-icon>
                  <LiveAccountLabel :account="account" />
                  <el-tag v-if="account.status === 1" size="small" type="info">{{ tr('直播平台已停用') }}</el-tag>
                  <el-tag v-else size="small" :type="isGroupEnabled(account.id) ? 'success' : 'info'">{{ tr(isGroupEnabled(account.id) ? '已启用' : '未启用') }}</el-tag>
                  <small>{{ rateRecordLabel(accountRateCount(account.id)) }}</small>
                </button>
                <div class="account-actions" @click.stop>
                  <el-switch :model-value="isGroupEnabled(account.id)" :disabled="account.status === 1" :loading="statusBusy === account.id" :title="tr('启用该直播平台分组')" @change="toggleGroupStatus(account, $event)" />
                  <el-tooltip :content="tr('同步到其他直播平台')" placement="top"><el-button link :icon="Connection" :disabled="accountRateCount(account.id) === 0" @click="openSync(account)" /></el-tooltip>
                  <el-tooltip :content="tr('删除直播平台分组及其全部费率')" placement="top"><el-button link type="danger" :icon="Delete" :disabled="!hasAccountGroup(account.id)" @click="removeAccountGroup(account)" /></el-tooltip>
                </div>
              </header>

              <div v-show="isExpanded(account.id)" class="rate-type-list">
                <div v-for="type in displayRateTypes" :key="type.id" class="rate-type-row">
                  <div class="rate-type-name"><strong>{{ type.typeName }}</strong></div>
                  <template v-if="rateFor(account.id, type.id)">
                    <div class="rate-value">
                      <el-tag size="small" type="success">{{ tr('生效中') }}</el-tag>
                      <strong>{{ money(rateFor(account.id, type.id).hourlyRate) }}/h</strong>
                      <span>{{ effectiveDateText(rateFor(account.id, type.id).effectiveDate) }}</span>
                    </div>
                    <div class="rate-actions">
                      <el-button link type="primary" :disabled="!canConfigure(account) || type.status !== 0" @click="openDialog({}, account.id, type.id)">{{ tr('新增费率') }}</el-button>
                      <el-button link :icon="Edit" :title="tr('编辑')" :disabled="!canEditRate(rateFor(account.id, type.id))" @click="openDialog(rateFor(account.id, type.id))" />
                      <el-button link type="danger" :icon="Delete" :title="tr('删除')" @click="remove(rateFor(account.id, type.id))" />
                    </div>
                  </template>
                  <template v-else>
                    <span class="unconfigured">{{ tr('暂无生效费率') }}</span>
                    <el-button link type="primary" :disabled="!canConfigure(account) || type.status !== 0" @click="openDialog({}, account.id, type.id)">{{ tr('+ 添加') }}</el-button>
                  </template>
                </div>
                <el-collapse v-if="inactiveRatesFor(account.id).length" :key="selectedEmployeeId" class="inactive-rates">
                  <el-collapse-item name="inactive">
                    <template #title>{{ tr('未生效费率') }}（{{ inactiveRatesFor(account.id).length }}）</template>
                    <RateRecordsTable :accounts="options.accounts" :rows="inactiveRatesFor(account.id)" :can-edit="canEditRate" @edit="openDialog" @remove="remove" />
                  </el-collapse-item>
                </el-collapse>
              </div>
            </article>
          </div>

          <div v-else class="rate-list-view">
            <RateRecordsTable :accounts="options.accounts" :rows="activeEmployeeRates" :can-edit="canEditRate" show-account @edit="openDialog" @remove="remove" />
            <el-collapse v-if="inactiveEmployeeRates.length" :key="selectedEmployeeId" class="inactive-rates">
              <el-collapse-item name="inactive">
                <template #title>{{ tr('未生效费率') }}（{{ inactiveEmployeeRates.length }}）</template>
                <RateRecordsTable :accounts="options.accounts" :rows="inactiveEmployeeRates" :can-edit="canEditRate" show-account @edit="openDialog" @remove="remove" />
              </el-collapse-item>
            </el-collapse>
          </div>
        </template>
        <el-empty v-else :description="tr('请选择主播或直播运营')" />
      </section>
    </div>

    <el-dialog data-runtime-i18n-ignore="true" v-model="dialog.open" class="rate-dialog" :title="tr(dialog.form.id ? '编辑费率' : '新增费率')" width="760px" append-to-body>
      <el-alert class="rate-history-hint" :title="tr('调薪请新增费率，保留历史记录；编辑用于修正当前记录。')" type="info" :closable="false" show-icon />
      <el-alert class="rate-history-hint" :title="tr('同一主播、平台和类型的已启用费率日期不能重叠；新增较晚费率时，可将无失效日期的旧费率截止到前一天。')" type="info" :closable="false" />
      <el-alert v-if="dialog.error" class="rate-history-hint" :title="dialog.error" type="error" :closable="false" show-icon />
      <el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '126px' : '90px'">
        <div class="dialog-grid">
          <el-form-item :label="tr('主播/运营')" prop="employeeId"><el-select v-model="dialog.form.employeeId" disabled><el-option v-for="v in options.employees" :key="v.value" :label="liveEmployeeOptionLabel(v, tr)" :value="v.value" /></el-select></el-form-item>
          <el-form-item :label="tr('直播平台')" prop="accountId"><LiveAccountSelect v-model="dialog.form.accountId" :accounts="configurableAccounts" /></el-form-item>
          <el-form-item :label="tr('变更原因')"><el-input v-model="dialog.form.changeReason" :placeholder="tr('影响历史工资时必填')" maxlength="500" /></el-form-item>
          <el-form-item :label="tr('费率类型')" prop="rateTypeId"><el-select v-model="dialog.form.rateTypeId"><el-option v-for="v in options.rateTypes" :key="v.id" :label="v.typeName" :value="v.id" /></el-select></el-form-item>
          <el-form-item :label="tr('时薪')" prop="hourlyRate"><el-input-number v-model="dialog.form.hourlyRate" :precision="2" :min="0" /></el-form-item>
          <el-form-item :label="tr('生效日期')" prop="effectiveDate"><el-date-picker v-model="dialog.form.effectiveDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
          <el-form-item :label="tr('失效日期')"><el-date-picker v-model="dialog.form.expiryDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" clearable /></el-form-item>
          <el-form-item :label="tr('状态')"><el-radio-group v-model="dialog.form.status"><el-radio :label="0">{{ tr('启用') }}</el-radio><el-radio :label="1">{{ tr('停用') }}</el-radio></el-radio-group></el-form-item>
          <el-form-item class="wide" :label="tr('备注')"><el-input v-model="dialog.form.remark" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="dialog.open = false">{{ tr('取消') }}</el-button><el-button type="primary" :loading="dialog.loading" @click="submit">{{ tr('保存') }}</el-button></template>
    </el-dialog>

    <el-dialog data-runtime-i18n-ignore="true" v-model="departure.open" :title="departure.archived ? tr('核实离职日期') : tr('主播离职归档')" width="500px">
      <el-form :label-width="isEn ? '160px' : '100px'"><el-form-item :label="tr('离职日期')"><el-date-picker v-model="departure.date" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item><el-form-item :label="tr('说明')"><el-input v-model="departure.reason" type="textarea" maxlength="500" /></el-form-item></el-form>
      <template #footer><el-button @click="departure.open=false">{{ tr('取消') }}</el-button><el-button type="primary" :disabled="!departure.date || !departure.reason.trim()" :loading="departure.saving" @click="submitDeparture">{{ tr('确认') }}</el-button></template>
    </el-dialog>
    <el-dialog data-runtime-i18n-ignore="true" v-model="impactDialog.open" class="rate-impact-dialog" :title="tr('确认费率修改影响')" width="1040px" append-to-body :close-on-click-modal="false">
      <div v-if="impactDialog.rateAdjustment" class="rate-adjustment-notice">
        <el-alert :title="tr('旧费率未设置失效日期，确认后将自动补齐')" type="warning" :closable="false" show-icon />
        <el-descriptions :column="isEn ? 1 : 2" border>
          <el-descriptions-item :label="tr('原费率')">{{ money(impactDialog.rateAdjustment.hourlyRate) }}/h</el-descriptions-item>
          <el-descriptions-item :label="tr('生效日期')">{{ displayDate(impactDialog.rateAdjustment.effectiveDate) }}</el-descriptions-item>
          <el-descriptions-item :label="tr('失效日期调整')">{{ tr('长期') }} → <strong>{{ displayDate(impactDialog.rateAdjustment.newExpiryDate) }}</strong></el-descriptions-item>
          <el-descriptions-item :label="tr('新费率生效日期')">{{ displayDate(impactDialog.pendingForm?.effectiveDate) }}</el-descriptions-item>
        </el-descriptions>
        <p>{{ tr('旧费率记录会保留，调整后与新费率日期不重叠；取消则不做任何修改。') }}</p>
      </div>
      <div class="impact-notice">
        <el-icon><WarningFilled /></el-icon>
        <div>
          <strong>{{ impactDialog.rows.length ? tr('本次涉及 {0} 条开播记录，请按结算状态核对处理方式', [impactDialog.rows.length]) : tr('本次修改不会影响已有开播记录') }}</strong>
          <p>{{ impactDialog.rows.length ? tr('未结算记录重算；已结算原记录锁定，差额生成待确认调整。') : tr('确认后将仅保存费率配置。') }} {{ tr('影响范围仅限当前直播平台，不会自动覆盖其他直播平台。') }}</p>
        </div>
      </div>
      <el-table v-if="impactDialog.rows.length" :data="impactDialog.rows" max-height="440" stripe border>
        <el-table-column :label="tr('处理方式')" :min-width="isEn ? 155 : 130"><template #default="s">{{ s.row.settlementStatus === 'SETTLED' ? tr('原单锁定，新增调整') : tr('重算未结算记录') }}</template></el-table-column>
        <el-table-column :label="tr('已有调整')" :min-width="isEn ? 145 : 110"><template #default="s">{{ money(s.row.previousAdjustments) }}</template></el-table-column>
        <el-table-column :label="tr('本次差额')" :min-width="isEn ? 145 : 110"><template #default="s">{{ money(s.row.adjustmentAmount) }}</template></el-table-column>
        <el-table-column prop="streamDate" :label="tr('开播日期')" :min-width="isEn ? 145 : 120"><template #default="s">{{ displayDate(s.row.streamDate) }}</template></el-table-column>
        <el-table-column prop="accountLabel" :label="tr('直播平台')" min-width="170" show-overflow-tooltip><template #default="s"><LiveAccountLabel :account="s.row" :accounts="options.accounts" /></template></el-table-column>
        <el-table-column prop="rateTypeName" :label="tr('费率类型')" :min-width="isEn ? 145 : 110"><template #default="s">{{ s.row.rateTypeName }}</template></el-table-column>
        <el-table-column :label="tr('时段')" :min-width="isEn ? 145 : 116"><template #default="s">{{ timeRange(s.row) }}</template></el-table-column>
        <el-table-column :label="tr('时薪变化')" min-width="150"><template #default="s"><div class="amount-change"><span>{{ money(s.row.oldHourlyRate) }}/h</span><b>→</b><strong>{{ money(s.row.newHourlyRate) }}/h</strong></div></template></el-table-column>
        <el-table-column :label="tr('基础工资')" min-width="150"><template #default="s"><div class="amount-change"><span>{{ money(s.row.oldBaseAmount) }}</span><b>→</b><strong>{{ money(s.row.newBaseAmount) }}</strong></div></template></el-table-column>
        <el-table-column :label="tr('总工资')" min-width="150"><template #default="s"><div class="amount-change"><span>{{ money(s.row.oldTotalAmount) }}</span><b>→</b><strong>{{ money(s.row.newTotalAmount) }}</strong></div></template></el-table-column>
      </el-table>
      <template #footer><el-button :disabled="impactDialog.saving" @click="impactDialog.open = false">{{ tr('返回修改') }}</el-button><el-button type="primary" :loading="impactDialog.saving" @click="confirmSubmit">{{ tr('确认修改') }}</el-button></template>
    </el-dialog>

    <el-dialog data-runtime-i18n-ignore="true" v-model="syncDialog.open" :title="tr('同步费率到其他直播平台')" width="1000px" append-to-body>
      <div v-if="syncDialog.source" class="sync-source"><span>{{ tr('来源直播平台') }}</span><LiveAccountLabel :account="syncDialog.source" /><small>{{ accountRateCount(syncDialog.source.id) }} {{ tr('条费率配置') }}</small></div>
      <div class="sync-mode">
        <p>{{ tr('同步模式') }}</p>
        <el-radio-group v-model="syncDialog.mode" @change="syncDialog.preview=null"><el-radio-button label="OVERWRITE">{{ tr('覆盖') }}</el-radio-button><el-radio-button label="MERGE">{{ tr('合并') }}</el-radio-button></el-radio-group>
        <small>{{ syncDialog.mode === 'OVERWRITE' ? tr('清空目标直播平台现有配置，完整复制来源直播平台费率。') : tr('保留目标直播平台配置，仅补充相同费率类型和生效日期中不存在的记录。') }}</small>
      </div>
      <div class="sync-targets">
        <div class="sync-target-title"><span>{{ tr('目标直播平台（') }}{{ syncTargets.length }}）</span><el-button link type="primary" @click="selectAllSyncTargets">{{ tr('全选') }}</el-button></div>
        <el-checkbox-group v-model="syncDialog.targetAccountIds" @change="syncDialog.preview=null">
          <el-checkbox v-for="account in syncTargets" :key="account.id" :label="account.id"><LiveAccountLabel :account="account" /><small>{{ accountRateCount(account.id) ? tr('{0} 条', [accountRateCount(account.id)]) : tr('无配置') }}</small></el-checkbox>
        </el-checkbox-group>
      </div>
      <el-form-item :label="tr('同步原因')"><el-input v-model="syncDialog.changeReason" :placeholder="tr('影响历史工资时必填')" maxlength="500" /></el-form-item>
      <template v-if="syncDialog.preview">
        <el-alert :title="tr('未结算记录重算；已结算原单保持不变，生成差额调整。')" :closable="false" type="info" />
        <el-table :data="syncDialog.preview.streamImpacts" max-height="300">
          <el-table-column prop="employeeName" :label="tr('主播')" /><el-table-column prop="accountLabel" :label="tr('目标平台')"><template #default="s"><LiveAccountLabel :account="s.row" :accounts="options.accounts" /></template></el-table-column>
          <el-table-column :label="tr('原业务日期')"><template #default="s">{{ displayDate(s.row.streamDate) }}</template></el-table-column>
          <el-table-column :label="tr('状态')"><template #default="s">{{ tr(settlementStatusLabel(s.row.settlementStatus)) }}</template></el-table-column>
          <el-table-column :label="tr('原金额')"><template #default="s">{{ money(s.row.oldTotalAmount) }}</template></el-table-column>
          <el-table-column :label="tr('新应计')"><template #default="s">{{ money(s.row.newTotalAmount) }}</template></el-table-column>
          <el-table-column :label="tr('已有调整')"><template #default="s">{{ money(s.row.previousAdjustments) }}</template></el-table-column>
          <el-table-column :label="tr('本次差额')"><template #default="s">{{ money(s.row.adjustmentAmount) }}</template></el-table-column>
        </el-table>
      </template>
      <template #footer><el-button @click="syncDialog.open = false">{{ tr('取消') }}</el-button><el-button :disabled="!syncDialog.targetAccountIds.length" :loading="syncDialog.loading" @click="previewSync">{{ tr('预览影响') }}</el-button><el-button type="primary" :disabled="!syncDialog.preview" :loading="syncDialog.loading" @click="submitSync">{{ tr('确认同步') }}</el-button></template>
    </el-dialog>

    <UsageConflictDialog :accounts="options.accounts" v-model="usageDialog.open" :rows="usageDialog.rows" :action="usageDialog.action" :target="usageDialog.target" />
  </div>
</template>

<script setup>
import LiveAccountLabel from '../components/LiveAccountLabel.vue'
import LiveAccountSelect from '../components/LiveAccountSelect.vue'
import { useLiveI18n } from '../useLiveI18n'
import { onActivated, computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowRight, Connection, Delete, Edit, Search, WarningFilled } from '@element-plus/icons-vue'
import { previewRateSync, previewDeparture, markDeparture, addRate, deleteRate, deleteRateAccountGroup, getLiveOptions, getRateAccountGroupUsage, getRateUsage, listRateAccountGroups, listRates, previewRateSave, syncRateAccountGroup, updateAllRateAccountGroupStatuses, updateRate, updateRateAccountGroupStatus } from '@/api/wms/livePayroll'
import { employeeStatusLabel, settlementStatusLabel, accountLabel, displayDate, downloadCsv, isoDate, liveEmployeeOptionLabel, matchLiveEmployee, LIVE_DATE_FORMAT, money } from '../shared'
import UsageConflictDialog from '../components/UsageConflictDialog.vue'
import RateRecordsTable from '../components/RateRecordsTable.vue'
import { rateStatusLabel } from './rateDisplay'
const { tr, isEn, messageNode } = useLiveI18n()
const { proxy } = getCurrentInstance(), loading = ref(false), groupLoading = ref(false), rows = ref([]), formRef = ref()
const options = reactive({ employees: [], accounts: [], rateTypes: [] }), includeInactive = ref(false), employeeKeyword = ref(''), selectedEmployeeId = ref(null), viewMode = ref('detail')
const groupLinks = ref([]), expandedAccounts = ref(new Set()), statusBusy = ref(null), dialog = reactive({ open: false, form: {}, loading: false, error: '' })
const impactDialog = reactive({ open: false, rows: [], rateAdjustment: null, pendingForm: null, saving: false })
const syncDialog = reactive({ open: false, source: null, mode: 'OVERWRITE', targetAccountIds: [], loading: false, preview: null, changeReason: '' })
const usageDialog = reactive({ open: false, rows: [], action: '', target: '' })
const rules = computed(() => ({ employeeId: [{ required: true, message: tr('请选择主播或直播运营') }], accountId: [{ required: true, message: tr('请选择直播平台') }], rateTypeId: [{ required: true, message: tr('请选择费率类型') }], hourlyRate: [{ required: true, message: tr('请输入时薪') }], effectiveDate: [{ required: true, message: tr('请选择生效日期') }] }))

const filteredEmployees = computed(() => { const keyword = employeeKeyword.value.trim(); const available = options.employees.filter(v => includeInactive.value || Number(v.employeeStatus || 0) < 2); return keyword ? available.filter(v => matchLiveEmployee(v, keyword)) : available })
function resetEmployeeSelection() { if (!filteredEmployees.value.some(v => v.value === selectedEmployeeId.value)) selectedEmployeeId.value = filteredEmployees.value[0]?.value || null; return loadGroups() }
const selectedEmployee = computed(() => options.employees.find(v => v.value === selectedEmployeeId.value))
const selectedEmployeeRates = computed(() => rows.value.filter(v => v.employeeId === selectedEmployeeId.value))
const activeEmployeeRates = computed(() => selectedEmployeeRates.value.filter(v => v.effectiveStatus === 'ACTIVE'))
const inactiveEmployeeRates = computed(() => selectedEmployeeRates.value.filter(v => v.effectiveStatus !== 'ACTIVE'))
const displayRateTypes = computed(() => {
  const types = new Map(options.rateTypes.map(type => [type.id, type]))
  selectedEmployeeRates.value.forEach(rate => {
    if (!types.has(rate.rateTypeId)) types.set(rate.rateTypeId, { id: rate.rateTypeId, typeName: rate.rateTypeName, status: 1 })
  })
  return [...types.values()]
})
const sortedAccounts = computed(() => [...options.accounts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.platform).localeCompare(String(b.platform)) || String(a.accountCode).localeCompare(String(b.accountCode))))
const activeAccounts = computed(() => sortedAccounts.value.filter(v => v.status === 0))
const configurableAccounts = computed(() => activeAccounts.value.filter(v => isGroupEnabled(v.id)))
const enabledGroupCount = computed(() => activeAccounts.value.filter(v => isGroupEnabled(v.id)).length)
const employeeSummaryText = computed(() => isEn.value
  ? `${selectedEmployeeRates.value.length} rate ${selectedEmployeeRates.value.length === 1 ? 'record' : 'records'} · ${enabledGroupCount.value} of ${activeAccounts.value.length} live platforms enabled`
  : tr('共 {0} 条费率 · {1} / {2} 个直播平台启用', [selectedEmployeeRates.value.length, enabledGroupCount.value, activeAccounts.value.length]))
const syncTargets = computed(() => activeAccounts.value.filter(v => v.id !== syncDialog.source?.id))
const rateMatrix = computed(() => new Map(activeEmployeeRates.value.map(rate => [`${rate.accountId}:${rate.rateTypeId}`, rate])))

function initial(name) { return String(name || '?').trim().charAt(0).toUpperCase() }
function rateRecordLabel(count) { return isEn.value ? `${count} rate ${count === 1 ? 'record' : 'records'}` : tr('{0} 条费率', [count]) }
function effectiveDateText(date) { return isEn.value ? `From ${displayDate(date)}` : tr('{0} 起', [displayDate(date)]) }
function rateCountByEmployee(employeeId) { return rows.value.filter(v => v.employeeId === employeeId).length }
function accountRateCount(accountId) { return selectedEmployeeRates.value.filter(v => v.accountId === accountId).length }
function rateFor(accountId, rateTypeId) { return rateMatrix.value.get(`${accountId}:${rateTypeId}`) }
function inactiveRatesFor(accountId) { return inactiveEmployeeRates.value.filter(rate => rate.accountId === accountId) }
function canEditRate(rate) { return configurableAccounts.value.some(account => account.id === rate.accountId) && options.rateTypes.some(type => type.id === rate.rateTypeId) }
function isExpanded(accountId) { return expandedAccounts.value.has(accountId) }
function hasAccountGroup(accountId) { return groupLinks.value.some(v => v.accountId === accountId) || accountRateCount(accountId) > 0 }
function isGroupEnabled(accountId) { return groupLinks.value.find(v => v.accountId === accountId)?.status === 0 }
function canConfigure(account) { return account.status === 0 && isGroupEnabled(account.id) }
function toggleExpanded(accountId) { const next = new Set(expandedAccounts.value); next.has(accountId) ? next.delete(accountId) : next.add(accountId); expandedAccounts.value = next }
function timeRange(row) { return `${String(row.startTime || '').slice(0, 5)}–${String(row.endTime || '').slice(0, 5)}` }

async function loadRates() { const res = await listRates({}); rows.value = res.rows || [] }
async function loadGroups() { if (!selectedEmployeeId.value) { groupLinks.value = []; return } groupLoading.value = true; try { const res = await listRateAccountGroups(selectedEmployeeId.value); groupLinks.value = res.data || [] } finally { groupLoading.value = false } }
async function loadAll() { loading.value = true; try { const [liveOptions] = await Promise.all([getLiveOptions(true), loadRates()]); Object.assign(options, liveOptions); expandedAccounts.value = new Set(); if (!filteredEmployees.value.some(v => v.value === selectedEmployeeId.value)) selectedEmployeeId.value = filteredEmployees.value[0]?.value || null; await loadGroups() } finally { loading.value = false } }
async function selectEmployee(employeeId) { if (selectedEmployeeId.value === employeeId) return; selectedEmployeeId.value = employeeId; expandedAccounts.value = new Set(); await loadGroups() }
async function toggleGroupStatus(account, enabled) { statusBusy.value = account.id; try { await updateRateAccountGroupStatus({ employeeId: selectedEmployeeId.value, accountId: account.id, status: enabled ? 0 : 1 }); await loadGroups(); proxy.$modal.msgSuccess(enabled ? tr('直播平台分组已启用') : tr('直播平台分组已禁用')) } catch (error) { await showActionBlocked(error, enabled ? null : () => getRateAccountGroupUsage({ employeeId: selectedEmployeeId.value, accountId: account.id }), '停用', '该直播平台分组') } finally { statusBusy.value = null } }
async function setAllGroups(status) { try { await updateAllRateAccountGroupStatuses({ employeeId: selectedEmployeeId.value, status }); await loadGroups(); proxy.$modal.msgSuccess(status === 0 ? tr('全部直播平台已启用') : tr('全部直播平台已禁用')) } catch (error) { await showActionBlocked(error, status === 1 ? () => getRateAccountGroupUsage({ employeeId: selectedEmployeeId.value }) : null, '停用', '该主播的直播平台分组') } }

function openDialog(row = {}, accountId = null, rateTypeId = null) { const targetAccountId = row.accountId || accountId; if (targetAccountId && !isGroupEnabled(targetAccountId)) { proxy.$modal.msgWarning(tr('请先启用该直播平台分组')); return } if (!targetAccountId && !configurableAccounts.value.length) { proxy.$modal.msgWarning(tr('请先启用至少一个直播平台分组')); return } dialog.form = { id: row.id, employeeId: row.employeeId || selectedEmployeeId.value, accountId: targetAccountId, rateTypeId: row.rateTypeId || rateTypeId, hourlyRate: Number(row.hourlyRate || 0), effectiveDate: row.effectiveDate || isoDate(), expiryDate: row.expiryDate || null, status: row.status ?? 0, remark: row.remark || '', changeReason: '' }; dialog.error = ''; dialog.open = true }
async function submit() {
  if (dialog.loading) return
  await formRef.value.validate()
  if (!isGroupEnabled(dialog.form.accountId)) { proxy.$modal.msgWarning(tr('直播平台分组未启用，不能维护费率')); return }
  dialog.error = ''
  impactDialog.pendingForm = null
  impactDialog.rateAdjustment = null
  impactDialog.open = false
  dialog.loading = true
  try {
    const pendingForm = { ...dialog.form }
    const { data } = await previewRateSave(pendingForm)
    impactDialog.rows = data.streamImpacts || []
    impactDialog.rateAdjustment = data.rateAdjustment || null
    impactDialog.pendingForm = { ...pendingForm, rateAdjustmentToken: data.rateAdjustmentToken || null, impactToken: data.impactToken || null }
    impactDialog.open = true
  } catch (error) {
    dialog.error = error?.message || tr('费率校验失败，请稍后重试。')
  } finally { dialog.loading = false }
}
async function confirmSubmit() {
  if (!impactDialog.open || !impactDialog.pendingForm || impactDialog.saving) return
  impactDialog.saving = true
  try {
    const form = impactDialog.pendingForm
    await (form.id ? updateRate(form) : addRate(form))
    proxy.$modal.msgSuccess(tr('保存成功{0}{1}', [impactDialog.rateAdjustment ? tr('，已自动补齐旧费率失效日期') : '', impactDialog.rows.length ? tr('，未结算已重算；已结算差额请到薪酬调整审核') : '']))
    impactDialog.open = false
    dialog.open = false
    impactDialog.pendingForm = null
    await loadRates()
  } catch (error) {
    impactDialog.open = false
    impactDialog.pendingForm = null
    dialog.error = error?.message || tr('费率保存失败，请重新预览后重试。')
  } finally { impactDialog.saving = false }
}
async function remove(row) { await proxy.$modal.confirm(messageNode(tr('确认删除 {0} 在 {1} 的这条费率？', [row.employeeName, row.accountLabel]))); try { await deleteRate(row.id) } catch (error) { await showActionBlocked(error, () => getRateUsage(row.id), '删除', '该费率配置'); return } proxy.$modal.msgSuccess(tr('删除成功')); await loadRates() }
async function removeAccountGroup(account) { await proxy.$modal.confirm(messageNode(tr('确认删除 {0} 的 {1} 直播平台分组及其下全部费率？', [selectedEmployee.value.label, accountLabel(account)]))); try { await deleteRateAccountGroup({ employeeId: selectedEmployeeId.value, accountId: account.id }) } catch (error) { await showActionBlocked(error, () => getRateAccountGroupUsage({ employeeId: selectedEmployeeId.value, accountId: account.id }), '删除', '该直播平台分组'); return } proxy.$modal.msgSuccess(tr('直播平台分组及费率已删除')); await Promise.all([loadRates(), loadGroups()]) }

async function showActionBlocked(error, usageLoader, action, target) { if (usageLoader) { try { const res = await usageLoader(); const usageRows = res.data || []; if (usageRows.length) { Object.assign(usageDialog, { open: true, rows: usageRows, action, target }); return } } catch (_) {} } await proxy.$modal.alertWarning(messageNode(error?.message || tr('操作失败，请稍后重试。'))) }

function openSync(account) { syncDialog.preview = null; syncDialog.changeReason = ''; syncDialog.source = account; syncDialog.mode = 'OVERWRITE'; syncDialog.targetAccountIds = []; syncDialog.open = true }
function selectAllSyncTargets() { syncDialog.preview = null; syncDialog.targetAccountIds = syncTargets.value.map(v => v.id) }
function syncCommand() { return { employeeId: selectedEmployeeId.value, sourceAccountId: syncDialog.source.id, targetAccountIds: [...syncDialog.targetAccountIds], mode: syncDialog.mode, changeReason: syncDialog.changeReason } }
async function previewSync() {
  if (syncDialog.loading) return
  syncDialog.preview=null; syncDialog.loading=true
  try { const {data}=await previewRateSync(syncCommand()); syncDialog.preview=data } finally { syncDialog.loading=false }
}
async function submitSync() {
  if (syncDialog.loading || !syncDialog.preview) return
  syncDialog.loading=true
  try {
    const res=await syncRateAccountGroup({...syncCommand(),impactToken:syncDialog.preview.impactToken})
    proxy.$modal.msgSuccess(tr('已同步 {0} 条费率；已结算差额请到薪酬调整审核', [res.data || 0]))
    syncDialog.open=false
    await Promise.all([loadRates(),loadGroups()])
  } catch(error) { syncDialog.preview=null; throw error } finally { syncDialog.loading=false }
}
const departure = reactive({ open: false, date: '', reason: '', saving: false, archived: false })
function openDeparture() { Object.assign(departure, { open: true, date: selectedEmployee.value.departureDate || isoDate(), reason: '', saving: false, archived: Number(selectedEmployee.value.employeeStatus) === 3 }) }
async function submitDeparture() {
  if (!departure.date || !departure.reason.trim() || departure.saving) return
  departure.saving = true
  try {
    const employeeId = selectedEmployeeId.value
    const body = { departureDate: departure.date, reason: departure.reason }
    const { data } = await previewDeparture(employeeId, body)
    const message = departure.archived
      ? tr('确认将 {0} 的离职日期核实为 {1}？原归档信息保留。', [data.employeeName, displayDate(departure.date)])
      : tr('确认将 {0} 离职归档，离职日期为 {1}？归档后可在 HR 的归档员工列表查看，主播默认列表将隐藏该员工，历史资料保留。', [data.employeeName, displayDate(departure.date)])
    await proxy.$modal.confirm(messageNode(`${message}${data.futureSchedules ? tr('离职后仍有 {0} 条排班，请到排班计划处理。', [data.futureSchedules]) : ''}`))
    await markDeparture(employeeId, body)
    departure.open = false
    await loadAll()
    proxy.$modal.msgSuccess(departure.archived ? tr('离职日期已同步至 HR 和主播薪酬') : tr('离职归档成功，可在 HR 归档员工列表查看'))
  } finally { departure.saving = false }
}
function headers() { return [{ key: 'employeeName', label: tr('主播/运营') }, { key: 'accountLabel', label: tr('直播平台') }, { key: 'rateTypeName', label: tr('费率类型') }, { key: 'hourlyRate', label: tr('时薪') }, { key: 'effectiveDate', label: tr('生效日期') }, { key: 'expiryDate', label: tr('失效日期') }, { key: 'status', label: tr('启用状态') }, { key: 'effectiveStatusLabel', label: tr('生效状态') }, { key: 'remark', label: tr('备注') }] }
function exportRows() { downloadCsv(tr('主播费率配置.csv'), headers(), rows.value.filter(row => filteredEmployees.value.some(v => v.value === row.employeeId)).map(row => ({ ...row, effectiveStatusLabel: tr(rateStatusLabel(row)), effectiveDate: displayDate(row.effectiveDate), expiryDate: displayDate(row.expiryDate) }))) }
onMounted(loadAll)
onActivated(loadAll)
</script>

<style scoped lang="scss">
@import '../live.scss';
.rate-config-shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; min-height: 680px; }
.employee-panel, .rate-detail-panel { background: #fff; border: 1px solid #e9eaf1; border-radius: 14px; box-shadow: 0 4px 20px rgba(37, 48, 74, .05); }
.employee-panel { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.employee-search { padding: 14px 12px 10px; border-bottom: 1px solid #f0f1f5; }
.employee-list { flex: 1; padding: 8px; }
.employee-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #30364a; text-align: left; cursor: pointer; transition: .18s ease; }
.employee-item:hover { background: #f5f7fb; }
.employee-item.active { border-color: #cbd9ff; background: #edf3ff; }
.employee-avatar, .summary-avatar { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 50%; background: #edf3ff; color: #3563e9; font-weight: 700; }
.employee-avatar { width: 34px; height: 34px; font-size: 13px; }
.employee-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.employee-copy strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.employee-copy small, .employee-count { color: #9299aa; font-size: 12px; }
.employee-count { min-width: 24px; text-align: right; }
.rate-detail-panel { min-width: 0; padding: 16px; }
.detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.employee-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.summary-main { display: flex; align-items: center; gap: 12px; }
.summary-avatar { width: 42px; height: 42px; }
.summary-main h3 { margin: 0 0 4px; font-size: 18px; }
.summary-main p { margin: 0; color: #8b93a5; font-size: 13px; }
.account-groups { display: flex; flex-direction: column; gap: 12px; }
.account-group { overflow: hidden; border: 1px solid #e9eaf0; border-radius: 12px; }
.account-group-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 8px 12px; background: #f8fafc; }
.account-collapse { display: flex; align-items: center; min-width: 0; flex: 1; gap: 8px; padding: 0; border: 0; background: transparent; color: #4b5265; text-align: left; cursor: pointer; }
.account-collapse > span:nth-of-type(1) { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.account-collapse small { color: #9aa1af; }
.account-actions { display: flex; align-items: center; gap: 8px; }
.rate-type-list { background: #fff; }
.rate-type-row { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(220px, 1.4fr) auto; align-items: center; gap: 12px; min-height: 54px; padding: 8px 16px; border-top: 1px solid #f0f1f4; }
.rate-type-name { display: flex; align-items: center; gap: 7px; }
.rate-type-name strong { color: #5a6070; font-size: 14px; }
.rate-type-name small, .unconfigured { color: #a0a6b3; }
.rate-value { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; color: #838b9c; font-size: 13px; }
.rate-value strong { color: #3563e9; font-size: 15px; }
.rate-actions { display: flex; justify-content: flex-end; }
.rate-list-view { overflow: hidden; border: 1px solid #e9eaf0; border-radius: 12px; }
.inactive-rates { padding: 0 16px; border-bottom: 0; }
.inactive-rates :deep(.el-collapse-item__header) { gap: 6px; color: #838b9c; }
.inactive-rates :deep(.el-collapse-item__wrap) { border-bottom: 0; }
.rate-history-hint { margin-bottom: 20px; }
.rate-adjustment-notice { margin-bottom: 20px; }
.rate-adjustment-notice :deep(.el-descriptions) { margin-top: 12px; }
.rate-adjustment-notice p { color: #8a641e; font-size: 13px; }
.sync-source { display: grid; grid-template-columns: 90px 1fr auto; align-items: center; gap: 12px; padding: 14px; border-radius: 10px; background: #f5f7fb; }
.sync-source span, .sync-source small, .sync-mode small, .sync-targets small { color: #8d95a6; }
.sync-mode { margin: 18px 0; }
.sync-mode p { margin: 0 0 10px; font-weight: 600; }
.sync-mode small { display: block; margin-top: 10px; }
.sync-target-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-weight: 600; }
.sync-targets :deep(.el-checkbox-group) { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sync-targets :deep(.el-checkbox) { display: flex; align-items: center; height: auto; min-height: 44px; margin: 0; padding: 8px 10px; border: 1px solid #e8eaf0; border-radius: 8px; }
.sync-targets :deep(.el-checkbox__label) { display: flex; min-width: 0; flex: 1; justify-content: space-between; gap: 8px; }
.impact-notice { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px 16px; border: 1px solid #cbd9ff; border-radius: 10px; background: #f3f7ff; color: #30364a; }
.impact-notice .el-icon { flex: 0 0 auto; margin-top: 2px; color: #3563e9; font-size: 20px; }
.impact-notice strong { font-size: 15px; }
.impact-notice p { margin: 5px 0 0; color: #747d91; font-size: 13px; }
.amount-change { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
.amount-change span { color: #8b93a5; text-decoration: line-through; }
.amount-change b { color: #a4abbb; font-weight: 400; }
.amount-change strong { color: #3563e9; }
@media (max-width: 1050px) { .rate-config-shell { grid-template-columns: 230px minmax(0, 1fr); } .rate-type-row { grid-template-columns: minmax(100px, 1fr) minmax(180px, 1.2fr) auto; } }
@media (max-width: 760px) { .rate-config-shell { grid-template-columns: 1fr; } .employee-summary { align-items: flex-start; flex-direction: column; } .rate-type-row { grid-template-columns: 1fr auto; } .rate-value { grid-column: 1 / -1; grid-row: 2; flex-wrap: wrap; } .rate-actions { grid-column: 2; grid-row: 1; } .sync-targets :deep(.el-checkbox-group) { grid-template-columns: 1fr; } }
</style>

<style lang="scss">
.rate-dialog { width: min(760px, calc(100vw - 32px)) !important; .el-dialog__body { padding: 20px 28px 8px; } .dialog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; } .el-form-item { min-width: 0; margin-bottom: 20px; } .el-form-item__label { white-space: nowrap; } .el-form-item__content { min-width: 0; } .el-input, .el-select, .el-date-editor, .el-input-number { width: 100%; } @media (max-width: 680px) { .el-dialog__body { padding: 16px 18px 6px; } .dialog-grid { grid-template-columns: 1fr; } .dialog-grid .wide { grid-column: auto; } .el-form-item { display: block; } .el-form-item__label { display: block; width: auto !important; height: auto; margin-bottom: 8px; line-height: 1.4; text-align: left; } .el-form-item__content { margin-left: 0 !important; } } }
</style>
