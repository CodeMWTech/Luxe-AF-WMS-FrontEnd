<template>
  <div class="live-page rate-page">
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
        </div>
        <div v-loading="loading" class="employee-list">
          <button v-for="employee in filteredEmployees" :key="employee.value" type="button" class="employee-item" :class="{ active: selectedEmployeeId === employee.value }" @click="selectEmployee(employee.value)">
            <span class="employee-avatar">{{ initial(employee.label) }}</span>
            <span class="employee-copy"><strong>{{ employee.label }}</strong><small>{{ rateRecordLabel(rateCountByEmployee(employee.value)) }}</small></span>
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
          </div>

          <div class="employee-summary">
            <div class="summary-main">
              <span class="summary-avatar">{{ initial(selectedEmployee.label) }}</span>
              <div><h3>{{ selectedEmployee.label }}</h3><p>{{ employeeSummaryText }}</p></div>
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
                  <span>{{ accountLabel(account) }}</span>
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
                <div v-for="type in options.rateTypes" :key="type.id" class="rate-type-row">
                  <div class="rate-type-name"><strong>{{ tr(type.typeName) }}</strong></div>
                  <template v-if="rateFor(account.id, type.id)">
                    <div class="rate-value">
                      <el-tag size="small" :type="rateFor(account.id, type.id).status === 0 ? 'success' : 'info'">{{ tr(rateFor(account.id, type.id).status === 0 ? '生效中' : '已停用') }}</el-tag>
                      <strong>{{ money(rateFor(account.id, type.id).hourlyRate) }}/h</strong>
                      <span>{{ effectiveDateText(rateFor(account.id, type.id).effectiveDate) }}</span>
                    </div>
                    <div class="rate-actions">
                      <el-button link :icon="Edit" title="编辑" :disabled="!isGroupEnabled(account.id)" @click="openDialog(rateFor(account.id, type.id))" />
                      <el-button link type="danger" :icon="Delete" title="删除" @click="remove(rateFor(account.id, type.id))" />
                    </div>
                  </template>
                  <template v-else>
                    <span class="unconfigured">{{ tr('未配置') }}</span>
                    <el-button link type="primary" :disabled="!canConfigure(account)" @click="openDialog({}, account.id, type.id)">{{ tr('+ 添加') }}</el-button>
                  </template>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="rate-list-view">
            <el-table :data="selectedEmployeeRates" stripe>
              <el-table-column prop="accountLabel" :label="tr('直播平台')" min-width="190" />
              <el-table-column prop="rateTypeName" :label="tr('费率类型')"><template #default="s"><el-tag class="type-tag">{{ tr(s.row.rateTypeName) }}</el-tag></template></el-table-column>
              <el-table-column :label="tr('时薪')"><template #default="s"><strong>{{ money(s.row.hourlyRate) }}/h</strong></template></el-table-column>
              <el-table-column prop="effectiveDate" :label="tr('生效日期')"><template #default="s">{{ displayDate(s.row.effectiveDate) }}</template></el-table-column>
              <el-table-column prop="expiryDate" :label="tr('失效日期')"><template #default="s">{{ s.row.expiryDate ? displayDate(s.row.expiryDate) : tr('长期') }}</template></el-table-column>
              <el-table-column :label="tr('状态')"><template #default="s"><el-tag :type="s.row.status === 0 ? 'success' : 'info'">{{ tr(s.row.status === 0 ? '生效中' : '已停用') }}</el-tag></template></el-table-column>
              <el-table-column prop="remark" :label="tr('备注')" />
              <el-table-column :label="tr('操作')" width="140" fixed="right"><template #default="s"><el-button link type="primary" :disabled="!isGroupEnabled(s.row.accountId)" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column>
            </el-table>
          </div>
        </template>
        <el-empty v-else :description="tr('请选择主播或直播运营')" />
      </section>
    </div>

    <el-dialog v-model="dialog.open" class="rate-dialog" :title="tr(dialog.form.id ? '编辑费率' : '新增费率')" width="760px" append-to-body>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '126px' : '90px'">
        <div class="dialog-grid">
          <el-form-item :label="tr('主播/运营')" prop="employeeId"><el-select v-model="dialog.form.employeeId" disabled><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item>
          <el-form-item :label="tr('直播平台')" prop="accountId"><el-select v-model="dialog.form.accountId"><el-option v-for="v in configurableAccounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item>
          <el-form-item :label="tr('费率类型')" prop="rateTypeId"><el-select v-model="dialog.form.rateTypeId"><el-option v-for="v in options.rateTypes" :key="v.id" :label="tr(v.typeName)" :value="v.id" /></el-select></el-form-item>
          <el-form-item :label="tr('时薪')" prop="hourlyRate"><el-input-number v-model="dialog.form.hourlyRate" :precision="2" :min="0" /></el-form-item>
          <el-form-item :label="tr('生效日期')" prop="effectiveDate"><el-date-picker v-model="dialog.form.effectiveDate" type="date" value-format="YYYY-MM-DD" :format="isEn ? 'MM/DD/YYYY' : 'YYYY-MM-DD'" /></el-form-item>
          <el-form-item :label="tr('失效日期')"><el-date-picker v-model="dialog.form.expiryDate" type="date" value-format="YYYY-MM-DD" :format="isEn ? 'MM/DD/YYYY' : 'YYYY-MM-DD'" clearable /></el-form-item>
          <el-form-item :label="tr('状态')"><el-radio-group v-model="dialog.form.status"><el-radio :label="0">{{ tr('启用') }}</el-radio><el-radio :label="1">{{ tr('停用') }}</el-radio></el-radio-group></el-form-item>
          <el-form-item class="wide" :label="tr('备注')"><el-input v-model="dialog.form.remark" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="dialog.open = false">{{ tr('取消') }}</el-button><el-button type="primary" :loading="dialog.loading" @click="submit">{{ tr('保存') }}</el-button></template>
    </el-dialog>

    <el-dialog v-model="impactDialog.open" class="rate-impact-dialog" title="确认费率修改影响" width="1040px" append-to-body :close-on-click-modal="false">
      <div class="impact-notice">
        <el-icon><WarningFilled /></el-icon>
        <div>
          <strong>{{ impactDialog.rows.length ? `本次修改将同步更新 ${impactDialog.rows.length} 条开播记录` : '本次修改不会影响已有开播记录' }}</strong>
          <p>{{ impactDialog.rows.length ? '请核对以下工资变化，确认后将保存费率并立即更新开播录入数据。' : '确认后将仅保存费率配置。' }} 影响范围仅限当前直播平台，不会自动覆盖其他直播平台。</p>
        </div>
      </div>
      <el-table v-if="impactDialog.rows.length" :data="impactDialog.rows" max-height="440" stripe border>
        <el-table-column prop="streamDate" label="开播日期" width="112" />
        <el-table-column prop="accountLabel" label="直播平台" min-width="170" show-overflow-tooltip />
        <el-table-column prop="rateTypeName" label="费率类型" width="110"><template #default="s">{{ tr(s.row.rateTypeName) }}</template></el-table-column>
        <el-table-column label="时段" width="116"><template #default="s">{{ timeRange(s.row) }}</template></el-table-column>
        <el-table-column label="时薪变化" min-width="150"><template #default="s"><div class="amount-change"><span>{{ money(s.row.oldHourlyRate) }}/h</span><b>→</b><strong>{{ money(s.row.newHourlyRate) }}/h</strong></div></template></el-table-column>
        <el-table-column label="基础工资" min-width="150"><template #default="s"><div class="amount-change"><span>{{ money(s.row.oldBaseAmount) }}</span><b>→</b><strong>{{ money(s.row.newBaseAmount) }}</strong></div></template></el-table-column>
        <el-table-column label="总工资" min-width="150"><template #default="s"><div class="amount-change"><span>{{ money(s.row.oldTotalAmount) }}</span><b>→</b><strong>{{ money(s.row.newTotalAmount) }}</strong></div></template></el-table-column>
      </el-table>
      <template #footer><el-button :disabled="impactDialog.saving" @click="impactDialog.open = false">返回修改</el-button><el-button type="primary" :loading="impactDialog.saving" @click="confirmSubmit">确认修改</el-button></template>
    </el-dialog>

    <el-dialog v-model="syncDialog.open" title="同步费率到其他直播平台" width="620px" append-to-body>
      <div v-if="syncDialog.source" class="sync-source"><span>来源直播平台</span><strong>{{ accountLabel(syncDialog.source) }}</strong><small>{{ accountRateCount(syncDialog.source.id) }} 条费率配置</small></div>
      <div class="sync-mode">
        <p>同步模式</p>
        <el-radio-group v-model="syncDialog.mode"><el-radio-button label="OVERWRITE">覆盖</el-radio-button><el-radio-button label="MERGE">合并</el-radio-button></el-radio-group>
        <small>{{ syncDialog.mode === 'OVERWRITE' ? '清空目标直播平台现有配置，完整复制来源直播平台费率。' : '保留目标直播平台配置，仅补充相同费率类型和生效日期中不存在的记录。' }}</small>
      </div>
      <div class="sync-targets">
        <div class="sync-target-title"><span>目标直播平台（{{ syncTargets.length }}）</span><el-button link type="primary" @click="selectAllSyncTargets">全选</el-button></div>
        <el-checkbox-group v-model="syncDialog.targetAccountIds">
          <el-checkbox v-for="account in syncTargets" :key="account.id" :label="account.id"><span>{{ accountLabel(account) }}</span><small>{{ accountRateCount(account.id) ? `${accountRateCount(account.id)} 条` : '无配置' }}</small></el-checkbox>
        </el-checkbox-group>
      </div>
      <template #footer><el-button @click="syncDialog.open = false">取消</el-button><el-button type="primary" :disabled="!syncDialog.targetAccountIds.length" :loading="syncDialog.loading" @click="submitSync">同步</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { ArrowDown, ArrowRight, Connection, Delete, Edit, Search, WarningFilled } from '@element-plus/icons-vue'
import { addRate, deleteRate, deleteRateAccountGroup, getLiveOptions, listRateAccountGroups, listRates, previewRateImpact, syncRateAccountGroup, updateAllRateAccountGroupStatuses, updateRate, updateRateAccountGroupStatus } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, isoDate, money } from '../shared'

const settingsStore = useSettingsStore(), isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en'), tr = text => translateByMap(text, settingsStore.language || 'zh-cn')
const { proxy } = getCurrentInstance(), loading = ref(false), groupLoading = ref(false), rows = ref([]), formRef = ref()
const options = reactive({ employees: [], accounts: [], rateTypes: [] }), employeeKeyword = ref(''), selectedEmployeeId = ref(null), viewMode = ref('detail')
const groupLinks = ref([]), expandedAccounts = ref(new Set()), statusBusy = ref(null), dialog = reactive({ open: false, form: {}, loading: false })
const impactDialog = reactive({ open: false, rows: [], pendingForm: null, saving: false })
const syncDialog = reactive({ open: false, source: null, mode: 'OVERWRITE', targetAccountIds: [], loading: false })
const rules = { employeeId: [{ required: true, message: '请选择主播或直播运营' }], accountId: [{ required: true, message: '请选择直播平台' }], rateTypeId: [{ required: true, message: '请选择费率类型' }], hourlyRate: [{ required: true, message: '请输入时薪' }], effectiveDate: [{ required: true, message: '请选择生效日期' }] }

const filteredEmployees = computed(() => { const keyword = employeeKeyword.value.trim().toLowerCase(); return keyword ? options.employees.filter(v => `${v.label} ${v.extra || ''}`.toLowerCase().includes(keyword)) : options.employees })
const selectedEmployee = computed(() => options.employees.find(v => v.value === selectedEmployeeId.value))
const selectedEmployeeRates = computed(() => rows.value.filter(v => v.employeeId === selectedEmployeeId.value))
const sortedAccounts = computed(() => [...options.accounts].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.platform).localeCompare(String(b.platform)) || String(a.accountCode).localeCompare(String(b.accountCode))))
const activeAccounts = computed(() => sortedAccounts.value.filter(v => v.status === 0))
const configurableAccounts = computed(() => activeAccounts.value.filter(v => isGroupEnabled(v.id)))
const enabledGroupCount = computed(() => activeAccounts.value.filter(v => isGroupEnabled(v.id)).length)
const employeeSummaryText = computed(() => isEn.value
  ? `${selectedEmployeeRates.value.length} rate ${selectedEmployeeRates.value.length === 1 ? 'record' : 'records'} · ${enabledGroupCount.value} of ${activeAccounts.value.length} live platforms enabled`
  : `共 ${selectedEmployeeRates.value.length} 条费率 · ${enabledGroupCount.value} / ${activeAccounts.value.length} 个直播平台启用`)
const syncTargets = computed(() => activeAccounts.value.filter(v => v.id !== syncDialog.source?.id))
const rateMatrix = computed(() => { const result = new Map(); selectedEmployeeRates.value.forEach(rate => { const key = `${rate.accountId}:${rate.rateTypeId}`; if (!result.has(key)) result.set(key, rate) }); return result })

function initial(name) { return String(name || '?').trim().charAt(0).toUpperCase() }
function rateRecordLabel(count) { return isEn.value ? `${count} rate ${count === 1 ? 'record' : 'records'}` : `${count} 条费率` }
function displayDate(date) { if (!isEn.value || !date) return date; const [year, month, day] = String(date).split('-'); return `${month}/${day}/${year}` }
function effectiveDateText(date) { return isEn.value ? `From ${displayDate(date)}` : `${date} 起` }
function rateCountByEmployee(employeeId) { return rows.value.filter(v => v.employeeId === employeeId).length }
function accountRateCount(accountId) { return selectedEmployeeRates.value.filter(v => v.accountId === accountId).length }
function rateFor(accountId, rateTypeId) { return rateMatrix.value.get(`${accountId}:${rateTypeId}`) }
function isExpanded(accountId) { return expandedAccounts.value.has(accountId) }
function hasAccountGroup(accountId) { return groupLinks.value.some(v => v.accountId === accountId) || accountRateCount(accountId) > 0 }
function isGroupEnabled(accountId) { return groupLinks.value.find(v => v.accountId === accountId)?.status === 0 }
function canConfigure(account) { return account.status === 0 && isGroupEnabled(account.id) }
function toggleExpanded(accountId) { const next = new Set(expandedAccounts.value); next.has(accountId) ? next.delete(accountId) : next.add(accountId); expandedAccounts.value = next }
function timeRange(row) { return `${String(row.startTime || '').slice(0, 5)}–${String(row.endTime || '').slice(0, 5)}` }

async function loadRates() { const res = await listRates({}); rows.value = res.rows || [] }
async function loadGroups() { if (!selectedEmployeeId.value) { groupLinks.value = []; return } groupLoading.value = true; try { const res = await listRateAccountGroups(selectedEmployeeId.value); groupLinks.value = res.data || [] } finally { groupLoading.value = false } }
async function loadAll() { loading.value = true; try { const [liveOptions] = await Promise.all([getLiveOptions(true), loadRates()]); Object.assign(options, liveOptions); expandedAccounts.value = new Set(); if (!options.employees.some(v => v.value === selectedEmployeeId.value)) selectedEmployeeId.value = options.employees[0]?.value || null; await loadGroups() } finally { loading.value = false } }
async function selectEmployee(employeeId) { if (selectedEmployeeId.value === employeeId) return; selectedEmployeeId.value = employeeId; expandedAccounts.value = new Set(); await loadGroups() }
async function toggleGroupStatus(account, enabled) { statusBusy.value = account.id; try { await updateRateAccountGroupStatus({ employeeId: selectedEmployeeId.value, accountId: account.id, status: enabled ? 0 : 1 }); await loadGroups(); proxy.$modal.msgSuccess(enabled ? '直播平台分组已启用' : '直播平台分组已禁用') } catch (error) { await showActionBlocked(error) } finally { statusBusy.value = null } }
async function setAllGroups(status) { try { await updateAllRateAccountGroupStatuses({ employeeId: selectedEmployeeId.value, status }); await loadGroups(); proxy.$modal.msgSuccess(status === 0 ? '全部直播平台已启用' : '全部直播平台已禁用') } catch (error) { await showActionBlocked(error) } }

function openDialog(row = {}, accountId = null, rateTypeId = null) { const targetAccountId = row.accountId || accountId; if (targetAccountId && !isGroupEnabled(targetAccountId)) { proxy.$modal.msgWarning('请先启用该直播平台分组'); return } if (!targetAccountId && !configurableAccounts.value.length) { proxy.$modal.msgWarning('请先启用至少一个直播平台分组'); return } dialog.form = { id: row.id, employeeId: row.employeeId || selectedEmployeeId.value, accountId: targetAccountId, rateTypeId: row.rateTypeId || rateTypeId, hourlyRate: Number(row.hourlyRate || 0), effectiveDate: row.effectiveDate || isoDate(), expiryDate: row.expiryDate || null, status: row.status ?? 0, remark: row.remark || '' }; dialog.open = true }
async function submit() { await formRef.value.validate(); if (!isGroupEnabled(dialog.form.accountId)) { proxy.$modal.msgWarning('直播平台分组未启用，不能维护费率'); return } dialog.loading = true; try { const pendingForm = { ...dialog.form }; const res = await previewRateImpact(pendingForm); impactDialog.rows = res.data || []; impactDialog.pendingForm = pendingForm; impactDialog.open = true } finally { dialog.loading = false } }
async function confirmSubmit() { if (!impactDialog.pendingForm) return; impactDialog.saving = true; try { const form = impactDialog.pendingForm; await (form.id ? updateRate(form) : addRate(form)); proxy.$modal.msgSuccess(`保存成功${impactDialog.rows.length ? `，已同步更新 ${impactDialog.rows.length} 条开播记录` : ''}`); impactDialog.open = false; dialog.open = false; impactDialog.pendingForm = null; await loadRates() } finally { impactDialog.saving = false } }
async function remove(row) { await proxy.$modal.confirm(`确认删除 ${row.employeeName} 在 ${row.accountLabel} 的这条费率？`); try { await deleteRate(row.id) } catch (error) { await showActionBlocked(error); return } proxy.$modal.msgSuccess('删除成功'); await loadRates() }
async function removeAccountGroup(account) { await proxy.$modal.confirm(`确认删除 ${selectedEmployee.value.label} 的 ${accountLabel(account)} 直播平台分组及其下全部费率？`); try { await deleteRateAccountGroup({ employeeId: selectedEmployeeId.value, accountId: account.id }) } catch (error) { await showActionBlocked(error); return } proxy.$modal.msgSuccess('直播平台分组及费率已删除'); await Promise.all([loadRates(), loadGroups()]) }

async function showActionBlocked(error) { await proxy.$modal.alertWarning(error?.message || '操作失败，请稍后重试。') }

function openSync(account) { syncDialog.source = account; syncDialog.mode = 'OVERWRITE'; syncDialog.targetAccountIds = []; syncDialog.open = true }
function selectAllSyncTargets() { syncDialog.targetAccountIds = syncTargets.value.map(v => v.id) }
async function submitSync() { syncDialog.loading = true; try { const res = await syncRateAccountGroup({ employeeId: selectedEmployeeId.value, sourceAccountId: syncDialog.source.id, targetAccountIds: syncDialog.targetAccountIds, mode: syncDialog.mode }); proxy.$modal.msgSuccess(`已同步 ${res.data || 0} 条费率，目标直播平台分组已启用`); syncDialog.open = false; await Promise.all([loadRates(), loadGroups()]) } finally { syncDialog.loading = false } }
function headers() { return [{ key: 'employeeName', label: '主播/运营' }, { key: 'accountLabel', label: '直播平台' }, { key: 'rateTypeName', label: '费率类型' }, { key: 'hourlyRate', label: '时薪' }, { key: 'effectiveDate', label: '生效日期' }, { key: 'expiryDate', label: '失效日期' }, { key: 'status', label: '状态' }, { key: 'remark', label: '备注' }] }
function exportRows() { downloadCsv('主播费率配置.csv', headers(), rows.value) }
onMounted(loadAll)
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
.detail-toolbar { margin-bottom: 14px; }
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
.rate-type-row { display: grid; grid-template-columns: minmax(170px, 1fr) minmax(250px, 1.4fr) 72px; align-items: center; gap: 12px; min-height: 54px; padding: 8px 16px; border-top: 1px solid #f0f1f4; }
.rate-type-name { display: flex; align-items: center; gap: 7px; }
.rate-type-name strong { color: #5a6070; font-size: 14px; }
.rate-type-name small, .unconfigured { color: #a0a6b3; }
.rate-value { display: flex; align-items: center; gap: 12px; color: #838b9c; font-size: 13px; }
.rate-value strong { color: #3563e9; font-size: 15px; }
.rate-actions { display: flex; justify-content: flex-end; }
.rate-list-view { overflow: hidden; border: 1px solid #e9eaf0; border-radius: 12px; }
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
@media (max-width: 1050px) { .rate-config-shell { grid-template-columns: 230px minmax(0, 1fr); } .rate-type-row { grid-template-columns: minmax(140px, 1fr) minmax(210px, 1.2fr) 72px; } }
@media (max-width: 760px) { .rate-config-shell { grid-template-columns: 1fr; } .employee-summary { align-items: flex-start; flex-direction: column; } .rate-type-row { grid-template-columns: 1fr auto; } .rate-value { grid-column: 1 / -1; grid-row: 2; flex-wrap: wrap; } .rate-actions { grid-column: 2; grid-row: 1; } .sync-targets :deep(.el-checkbox-group) { grid-template-columns: 1fr; } }
</style>

<style lang="scss">
.rate-dialog { width: min(760px, calc(100vw - 32px)) !important; .el-dialog__body { padding: 20px 28px 8px; } .dialog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; } .el-form-item { min-width: 0; margin-bottom: 20px; } .el-form-item__label { white-space: nowrap; } .el-form-item__content { min-width: 0; } .el-input, .el-select, .el-date-editor, .el-input-number { width: 100%; } @media (max-width: 680px) { .el-dialog__body { padding: 16px 18px 6px; } .dialog-grid { grid-template-columns: 1fr; } .dialog-grid .wide { grid-column: auto; } .el-form-item { display: block; } .el-form-item__label { display: block; width: auto !important; height: auto; margin-bottom: 8px; line-height: 1.4; text-align: left; } .el-form-item__content { margin-left: 0 !important; } } }
</style>
