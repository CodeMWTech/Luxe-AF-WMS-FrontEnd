import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'

const source = await readFile(new URL('../src/views/wms/live/rates/index.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const compiled = compileScript(descriptor, { id: 'live-rate-test' }).content
const displaySource = await readFile(new URL('../src/views/wms/live/rates/rateDisplay.js', import.meta.url), 'utf8')
const display = await import(`data:text/javascript;base64,${Buffer.from(displaySource).toString('base64')}`)
// 执行真实页面的 setup，只替换网络、弹窗和下载边界，无需启动后端或浏览器。
const createComponent = new Function('modules', "modules['../useLiveI18n']={useLiveI18n:()=>({tr:(text,values=[])=>text.replace(/\\{(\\d+)\\}/g,(_,i)=>values[i]),isEn:{value:false},messageNode:text=>text})};\n" + compiled
  .replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, bindings, name) =>
    `const {${bindings.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(name)}]`)
  .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, binding, name) =>
    `const ${binding} = modules[${JSON.stringify(name)}]`)
  .replace('export default', 'return'))

async function fixture() {
  const base = { employeeId: 1, accountId: 10, rateTypeId: 20, rateTypeName: '普通直播', status: 0, hourlyRate: 20, effectiveDate: '2026-08-01' }
  const records = [
    { ...base, id: 6, effectiveDate: '2026-10-01', effectiveStatus: 'PENDING' },
    { ...base, id: 5, effectiveStatus: 'DISABLED', status: 1 },
    { ...base, id: 4, effectiveStatus: 'EXPIRED', expiryDate: '2026-08-31' },
    { ...base, id: 3, effectiveStatus: 'ACTIVE' },
    { ...base, id: 2, effectiveStatus: 'SUPERSEDED' },
    { ...base, id: 7, employeeId: 2, effectiveStatus: 'ACTIVE' },
    { ...base, id: 1, rateTypeId: 21, rateTypeName: '历史场次类型', effectiveStatus: 'EXPIRED' }
  ]
  const calls = { add: [], update: [], sync: [], export: null }
  const preview = { data: { streamImpacts: [], rateAdjustment: null, rateAdjustmentToken: null }, error: null, saveError: null }
  const api = {
    getLiveOptions: async () => ({ employees: [{ value: 1, label: '主播 A' }, { value: 2, label: '主播 B' }], accounts: [{ id: 10, status: 0 }], rateTypes: [{ id: 20, status: 0, typeName: '普通直播' }] }),
    listRates: async () => ({ rows: records.slice() }),
    listRateAccountGroups: async () => ({ data: [{ accountId: 10, status: 0 }] }),
    previewRateSync: async () => ({ data: { streamImpacts: [], impactToken: 'sync-token' } }),
    syncRateAccountGroup: async body => { if (preview.saveError) throw preview.saveError; calls.sync.push(body); return { data: 1 } },
    previewRateSave: async () => { if (preview.error) throw preview.error; return { data: preview.data } },
    addRate: async row => { if (preview.saveError) throw preview.saveError; calls.add.push({ ...row }); records.push({ ...row, id: 8, effectiveStatus: 'PENDING' }) },
    updateRate: async row => { calls.update.push({ ...row }) }
  }
  const component = createComponent({
    vue: { ...vue, onMounted: () => {}, onActivated: () => {}, getCurrentInstance: () => ({ proxy: { $modal: { msgSuccess() {}, msgWarning() {} } } }) },
    '@element-plus/icons-vue': {},
    '@/api/wms/livePayroll': api,
    '@/store/modules/settings': () => ({ language: 'zh-cn' }),
    '@/locales/runtime-map': { translateByMap: text => text },
    '../shared': { isoDate: () => '2026-09-05', displayDate: text => text, money: String, downloadCsv: (...args) => { calls.export = args } },
    '../components/UsageConflictDialog.vue': {},
    '../components/RateRecordsTable.vue': {},
    './rateDisplay': display
  })
  const page = component.setup({}, { expose() {} })
  await page.loadAll()
  return { page, records, calls, preview }
}

test('shows the actual current rate even when a future rate is first, retaining all inactive history', async () => {
  const { page } = await fixture()
  assert.equal(page.rateFor(10, 20).id, 3)
  assert.deepEqual(page.inactiveRatesFor(10).map(row => row.id), [6, 5, 4, 2, 1])
  assert.equal(page.selectedEmployeeRates.value.length, 6)
  assert.equal(page.displayRateTypes.value.find(type => type.id === 21).typeName, '历史场次类型')
  assert.equal(page.canEditRate(page.inactiveRatesFor(10).find(row => row.id === 1)), false)
  await page.selectEmployee(2)
  assert.equal(page.rateFor(10, 20).id, 7)
  assert.equal(page.inactiveEmployeeRates.value.length, 0)
})

test('adding another rate submits an insert and retains the existing record after reload', async () => {
  const { page, records, calls } = await fixture()
  page.openDialog({}, 10, 20)
  assert.equal(page.dialog.form.id, undefined)
  page.dialog.form.hourlyRate = 30
  page.dialog.form.effectiveDate = '2026-10-01'
  page.formRef.value = { validate: async () => true }
  await page.submit()
  await page.confirmSubmit()
  assert.equal(calls.add.length, 1)
  assert.equal(calls.update.length, 0)
  assert.equal(records.find(row => row.id === 3).hourlyRate, 20)
  assert.equal(page.selectedEmployeeRates.value.length, 7)
  assert.equal(page.rateFor(10, 20).id, 3)
  assert.ok(page.inactiveRatesFor(10).some(row => row.id === 8))
})

test('list, badges and export distinguish all actual states while exporting folded records', async () => {
  const { page, calls, records } = await fixture()
  page.exportRows()
  const exported = calls.export[2]
  assert.equal(exported.length, records.length)
  assert.deepEqual(exported.slice(0, 5).map(row => row.effectiveStatusLabel), ['待生效', '已停用', '已过期', '生效中', '已被替代'])
  assert.equal(exported.find(row => row.id === 4).status, 0)
  assert.equal(display.rateStatusType(records[0]), 'warning')
  assert.equal(display.rateStatusType(records[2]), 'info')
  assert.equal(display.rateStatusLabel({ status: 0 }), '未生效')
})

test('overlapping rates display the server conflict and cannot proceed to save', async () => {
  const { page, calls, preview } = await fixture()
  page.openDialog({}, 10, 20)
  page.formRef.value = { validate: async () => true }
  preview.error = new Error('费率日期重叠：已有启用费率（08/01/2026 至 08/31/2026）')
  await page.submit()
  assert.match(page.dialog.error, /费率日期重叠/)
  assert.equal(page.dialog.open, true)
  assert.equal(page.impactDialog.open, false)
  assert.equal(page.impactDialog.pendingForm, null)
  await page.confirmSubmit()
  assert.equal(calls.add.length, 0)
  assert.equal(calls.update.length, 0)
})

test('shows the old rate date adjustment even without wage changes and saves only after confirmation', async () => {
  const { page, calls, preview } = await fixture()
  preview.data = {
    streamImpacts: [],
    rateAdjustment: { rateId: 3, hourlyRate: 20, effectiveDate: '2026-08-01', oldExpiryDate: null, newExpiryDate: '2026-09-30' },
    rateAdjustmentToken: 'reviewed-old-rate-snapshot'
  }
  page.openDialog({}, 10, 20)
  page.dialog.form.effectiveDate = '2026-10-01'
  page.formRef.value = { validate: async () => true }
  await page.submit()
  assert.equal(page.impactDialog.open, true)
  assert.equal(page.impactDialog.rateAdjustment.newExpiryDate, '2026-09-30')
  assert.equal(page.impactDialog.rows.length, 0)
  assert.equal(calls.add.length, 0)
  await page.confirmSubmit()
  assert.equal(calls.add.length, 1)
  assert.equal(calls.add[0].rateAdjustmentToken, 'reviewed-old-rate-snapshot')
})

test('cancelling or failing a new preview cannot reuse the previous confirmation', async () => {
  const { page, calls, preview } = await fixture()
  page.openDialog({}, 10, 20)
  page.formRef.value = { validate: async () => true }
  await page.submit()
  page.impactDialog.open = false
  await page.confirmSubmit()
  assert.equal(calls.add.length, 0)
  preview.error = new Error('费率日期重叠')
  await page.submit()
  assert.equal(page.impactDialog.pendingForm, null)
  assert.equal(page.impactDialog.rateAdjustment, null)
  await page.confirmSubmit()
  assert.equal(calls.add.length, 0)
})

test('a stale confirmation rejected by the server returns to the form for another preview', async () => {
  const { page, calls, preview } = await fixture()
  page.openDialog({}, 10, 20)
  page.formRef.value = { validate: async () => true }
  await page.submit()
  preview.saveError = new Error('费率日期调整需要重新确认')
  await page.confirmSubmit()
  assert.equal(page.dialog.open, true)
  assert.equal(page.dialog.error, '费率日期调整需要重新确认')
  assert.equal(page.impactDialog.open, false)
  assert.equal(page.impactDialog.pendingForm, null)
  assert.equal(calls.add.length, 0)
})

test('inactive sidebar entries are hidden by default and remain available for history and export', async () => {
  const {page,calls}=await fixture()
  page.options.employees.push({value:3,label:'离职主播',employeeStatus:2})
  page.rows.value.push({id:99,employeeId:3,effectiveStatus:'EXPIRED'})
  assert.equal(page.filteredEmployees.value.some(row=>row.value===3),false)
  page.exportRows()
  assert.equal(calls.export[2].some(row=>row.employeeId===3),false)
  page.includeInactive.value=true
  assert.equal(page.filteredEmployees.value.some(row=>row.value===3),true)
  await page.selectEmployee(3)
  assert.equal(page.selectedEmployeeRates.value.length,1)
  page.includeInactive.value=false
  await page.resetEmployeeSelection()
  assert.notEqual(page.selectedEmployeeId.value,3)
})
test('batch rate sync requires preview and passes its token to the confirmed write', async () => {
  const {page,calls,preview}=await fixture()
  page.openSync({id:10})
  page.syncDialog.targetAccountIds=[11]
  await page.submitSync()
  assert.equal(calls.sync.length,0)
  await page.previewSync()
  page.syncDialog.changeReason='更正历史费率'
  await page.submitSync()
  assert.equal(calls.sync.length,1)
  assert.equal(calls.sync[0].impactToken,'sync-token')
  assert.equal(calls.sync[0].changeReason,'更正历史费率')
  page.openSync({id:10})
  page.syncDialog.targetAccountIds=[11]
  await page.previewSync()
  preview.saveError=new Error('费率变化，重新预览')
  await assert.rejects(page.submitSync(),/重新预览/)
  assert.equal(page.syncDialog.preview,null)
})
