import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import * as vue from 'vue'
import { renderToString } from '@vue/server-renderer'
const sharedUrl = 'data:text/javascript;base64,' + Buffer.from(await readFile(new URL('../src/views/wms/live/shared.js', import.meta.url), 'utf8')).toString('base64')
async function sourceModule(path) { return import('data:text/javascript;base64,' + Buffer.from((await readFile(new URL(path, import.meta.url), 'utf8')).replace(/from '..\/shared'/g, 'from ' + JSON.stringify(sharedUrl))).toString('base64')) }
const display = await sourceModule('../src/views/wms/live/schedule/scheduleDisplay.js')
const shared = await sourceModule('../src/views/wms/live/shared.js')
const operator = (id, name = 'Same name', color = '#D9959C') => ({ employeeId: id, name, color, employeeNo: 'EMP2069209589015789569', employeeStatus: 0, positions: ['主播', '直播运营'] })
const schedule = (extra = {}) => ({ id: '10', scheduleDate: '2026-09-16', employeeId: '9007199254740993', employeeName: 'Host', accountId: '1', accountLabel: 'TK1', startTime: '10:00:00', endTime: '14:00:00', ...extra })
const assigned = id => ({ operatorEmployeeId: id, operatorName: 'Operator' })

test('each view uses one operator field and the full broadcast time', () => {
  const row = schedule({ ...assigned('1') })
  for (const view of ['channel', 'host', 'operator']) {
    const entries = display.scheduleSegments(row, view)
    assert.deepEqual(entries.map(x => [x.startTime, x.endTime, x.operator.employeeId]), [['10:00:00', '14:00:00', '1']])
    assert.equal(entries[0].row.id, row.id)
  }
})
test('unassigned schedules stay visible in all views and have no operator', () => {
  for (const view of ['channel', 'host', 'operator']) {
    assert.equal(display.scheduleSegments(schedule(), view).length, 1)
    assert.equal(display.scheduleSegments(schedule(), view)[0].operator, undefined)
  }
  assert.equal(display.scheduleGroups([schedule()], 'operator')[0].id, 'unassigned')
})
test('same names and large integer IDs stay separate and idle active operators are retained', () => {
  const operators = [operator('9007199254740992'), operator('9007199254740993'), { ...operator('3'), employeeStatus: 3 }]
  const groups = display.scheduleGroups([schedule({ ...assigned('9007199254740993') })], 'operator', operators)
  assert.ok(groups.every(group => group.secondary === '')); assert.equal(groups.length, 2); assert.equal(groups[0].entries.length, 0); assert.equal(groups[1].entries.length, 1)
  assert.equal(display.isActiveOperator({ ...operator('1'), positions: ['运营主管'] }), false)
  assert.equal(display.isActiveOperator({ ...operator('1'), visible: false }), false)
  assert.equal(display.isActiveOperator({ ...operator('1'), employeeStatus: null }), false)
})
test('conflicts use broadcast times across roles and ignore obsolete arrival fields and deleted schedules', () => {
  const first = schedule({ hostStartTime: '09:30:00' })
  const second = schedule({ id: '20', employeeId: '2', startTime: '08:00:00', endTime: '09:45:00', ...assigned(first.employeeId) })
  assert.equal(display.conflictingSchedules([first, second]).size, 0)
  second.endTime = '10:15:00'
  assert.deepEqual([...display.conflictingSchedules([first, second])].sort(), ['10', '20'])
  second.delFlag = '1'; assert.equal(display.conflictingSchedules([first, second]).size, 0)
})
test('operator color styles validate custom values and use a neutral unassigned color', () => {
  assert.equal(display.operatorColorStyle('#123456')['--operator-color'], '#123456')
  assert.equal(display.operatorColorStyle(null)['--operator-color'], '#9CA3AF')
  assert.equal(display.operatorColorStyle('url(x)')['--operator-color'], '#9CA3AF')
})

async function pageFixture(api = {}, editable = true, storage, hooks = {}) {
  const source = await readFile(new URL('../src/views/wms/live/schedule/index.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'schedule-test' }).content
  const modules = {
    vue: { ...vue, onMounted() {}, onActivated() {}, getCurrentInstance: () => ({ proxy: { $modal: { msgSuccess() {}, msgWarning() {}, confirm: hooks.confirm || (async () => true) } } }) },
    '../useLiveI18n': { useLiveI18n: () => ({ tr: text => text, isEn: vue.ref(false), messageNode: text => text }) },
    '@/utils/permission': { checkPermi: permissions => typeof editable === 'boolean' ? editable : permissions.some(permission => editable.includes(permission)) }, './scheduleDisplay': display, '../shared': { ...shared, downloadCsv: hooks.downloadCsv || shared.downloadCsv },
    '@/api/wms/livePayroll': { getLiveOptions: async () => ({ employees: [], accounts: [], rateTypes: [] }), listScheduleOperators: async () => ({ data: [operator('1'), operator('2')] }), listScheduleCalendar: async () => ({ data: [schedule()] }), listScheduleHosts: async () => ({ data: [{ value: '9007199254740993', label: 'Host', employeeStatus: 0 }] }), listScheduleRateTypes: async () => ({ data: [{ id: '5' }] }), listScheduleRateAccounts: async () => ({ data: ['1'] }), ...api }
  }
  const create = new Function('modules', 'localStorage', compiled.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, bindings, name) => `const {${bindings.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(name)}]`).replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, binding, name) => `const ${binding} = modules[${JSON.stringify(name)}]`).replace('export default', 'return'))
  return create(modules, storage).setup({}, { expose() {}, emit() {} })
}
test('failed color save keeps old configuration and supports retry with shared server result', async () => {
  let fail = true
  const page = await pageFixture({ updateScheduleOperatorColor: async (employeeId, color) => { if (fail) throw Error('offline'); return { data: { employeeId, color: color.toUpperCase() } } } })
  await page.load(); page.openColorDialog(page.operators.value[0]); page.colorDialog.color = '#abcdef'
  await page.saveColor(); assert.equal(page.operators.value[0].color, '#D9959C'); assert.equal(page.colorDialog.error, true); assert.equal(page.colorDialog.open, true)
  fail = false; await page.saveColor(); assert.equal(page.operators.value[0].color, '#ABCDEF'); assert.equal(page.colorDialog.open, false)
})
test('read-only users cannot open a color editor or issue color or schedule writes', async () => {
  let writes = 0
  const page = await pageFixture({ updateScheduleOperatorColor: async () => { writes++ }, addSchedule: async () => { writes++ } }, false)
  await page.load(); page.openColorDialog(page.operators.value[0]); assert.equal(page.colorDialog.open, false)
  page.colorDialog.color = '#123456'; await page.saveColor(); await page.submit(); await page.openDialog(); assert.equal(writes, 0); assert.equal(page.dialog.open, false)
})
test('switching dimensions retains filters and the full operator legend', async () => {
  const page = await pageFixture(); page.query.employeeId = '1'; page.query.accountId = '2'; page.selectedWeek.value = '2026-09-13'
  await page.load(); page.view.value = 'operator'; page.view.value = 'host'
  assert.equal(page.query.employeeId, '1'); assert.equal(page.query.accountId, '2'); assert.equal(page.selectedWeek.value, '2026-09-13'); assert.equal(page.activeOperators.value.length, 2)
})
test('week navigation queries Monday through Sunday and keeps filters across year boundaries', async () => {
  const requests = []
  const page = await pageFixture({ listScheduleCalendar: async query => { requests.push(query); return { data: [] } } })
  Object.assign(page.query, { employeeId: '1', accountId: '2', rateTypeId: '5' })
  await page.handleWeekChange('2027-01-03')
  assert.equal(page.selectedWeek.value, '2026-12-28')
  await page.shiftWeek(1)
  assert.deepEqual(page.weekDateRange.value, ['2027-01-04', '2027-01-10'])
  await page.shiftWeek(-1)
  assert.deepEqual(page.weekDateRange.value, ['2026-12-28', '2027-01-03'])
  for (const request of requests) {
    assert.equal(request.employeeId, '1'); assert.equal(request.accountId, '2')
    assert.equal(request.rateTypeId, '5'); assert.equal('employeeScope' in request, false)
    assert.equal(new Date(`${request.startDate}T12:00:00`).getDay(), 1)
    assert.equal(new Date(`${request.endDate}T12:00:00`).getDay(), 0)
  }
  for (const view of ['channel', 'operator', 'host']) {
    page.view.value = view
    assert.deepEqual(page.calendarWeeks.value[0].map(day => day.date), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  }
})
test('returning to today restores the current Monday-first week and reloads it', async () => {
  let requested
  const page = await pageFixture({ listScheduleCalendar: async query => { requested = query; return { data: [] } } })
  page.selectedWeek.value = '2028-02-29'
  await page.goToCurrentWeek()
  assert.deepEqual(page.weekDateRange.value, shared.selectedWeekRange(shared.isoDate()))
  assert.deepEqual([requested.startDate, requested.endDate], shared.weekRange())
})
test('reopening the page restores the last selected week, including arrows and today', async () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const page = await pageFixture({}, true, storage)
  await page.handleWeekChange('2028-02-29')
  let reopened = await pageFixture({}, true, storage)
  assert.deepEqual(reopened.weekDateRange.value, ['2028-02-28', '2028-03-05'])
  await reopened.shiftWeek(1)
  reopened = await pageFixture({}, true, storage)
  assert.deepEqual(reopened.weekDateRange.value, ['2028-03-06', '2028-03-12'])
  await reopened.goToCurrentWeek()
  reopened = await pageFixture({}, true, storage)
  assert.deepEqual(reopened.weekDateRange.value, shared.weekRange())
})
test('invalid saved dates and unavailable browser storage still allow week selection', async () => {
  for (const saved of [null, '', 'invalid', '2026-02-30', '2026-13-01', '2026-9-01']) {
    const page = await pageFixture({}, true, { getItem: () => saved })
    assert.deepEqual(page.weekDateRange.value, shared.weekRange())
  }
  const page = await pageFixture({}, true, {
    getItem() { throw Error('storage blocked') }, setItem() { throw Error('storage full') }
  })
  await page.handleWeekChange('2027-01-03')
  assert.deepEqual(page.weekDateRange.value, ['2026-12-28', '2027-01-03'])
})
test('late queries cannot replace the current week data or legend', async () => {
  let resolveOld, n = 0
  const page = await pageFixture({ listScheduleCalendar: () => ++n === 1 ? new Promise(resolve => { resolveOld = resolve }) : Promise.resolve({ data: [schedule({ id: 'current' })] }) })
  const first = page.load(); await page.load(); resolveOld({ data: [schedule({ id: 'old' })] }); await first
  assert.equal(page.rows.value[0].id, 'current')
})

test('a query started before a color save cannot overwrite the saved color', async () => {
  let resolveOld, n = 0
  const page = await pageFixture({
    listScheduleOperators: () => ++n === 2 ? new Promise(resolve => { resolveOld = resolve }) : Promise.resolve({ data: [operator('1')] }),
    updateScheduleOperatorColor: async employeeId => ({ data: { employeeId, color: '#123456' } })
  })
  await page.load()
  const loading = page.load()
  page.openColorDialog(page.operators.value[0]); page.colorDialog.color = '#123456'
  await page.saveColor(); resolveOld({ data: [operator('1')] }); await loading
  assert.equal(page.operators.value[0].color, '#123456')
  await page.load(); assert.equal(page.operators.value[0].color, '#D9959C')
})

test('single operator is a shift field, follows edited broadcast times and can be cleared', async () => {
  const writes = []
  const page = await pageFixture({ updateSchedule: async payload => { writes.push(payload) } })
  await page.load(); page.formRef.value = { validate: async () => true }
  await page.openDialog(schedule({ hostStartTime: '09:45:00', hostEndTime: '14:15:00', ...assigned('1') }))
  assert.equal(page.dialog.form.operatorId, '1')
  assert.equal('operatorAssignments' in page.dialog.form, false)
  assert.equal('hostStartTime' in page.dialog.form, false); assert.equal('hostEndTime' in page.dialog.form, false)
  Object.assign(page.dialog.form, { startTime: '11:00:00', endTime: '15:00:00' })
  await page.submit()
  assert.equal(writes[0].operatorEmployeeId, '1')
  assert.equal(writes[0].startTime, '11:00:00'); assert.equal(writes[0].endTime, '15:00:00')
  assert.equal('operatorAssignments' in writes[0], false)
  assert.equal('operatorId' in writes[0], false)
  assert.equal('hostStartTime' in writes[0], false); assert.equal('hostEndTime' in writes[0], false)
  page.dialog.form.operatorId = null; await page.submit()
  assert.equal(writes[1].operatorEmployeeId, null)
  await page.openDialog({ operatorId: '2' }); assert.equal(page.dialog.form.operatorId, '2')
})

test('editor uses dedicated host options and prevents selecting operator-only employees', async () => {
  const writes = []
  const page = await pageFixture({
    getLiveOptions: async () => ({ employees: [{ value: '1', label: 'Operator only' }], accounts: [], rateTypes: [] }),
    updateSchedule: async payload => { writes.push(payload) }
  })
  await page.load(); page.formRef.value = { validate: async () => true }
  assert.deepEqual(page.hostOptions.value.map(p => p.value), ['9007199254740993'])
  await page.openDialog(schedule({ employeeId: '1' })); await page.submit()
  assert.equal(writes.length, 0)
})

test('all three views use broadcast times and operator colors regardless of obsolete arrival values', () => {
  const row = schedule({ hostStartTime: '09:45:00', hostEndTime: '14:15:00', ...assigned('1') })
  for (const view of ['channel', 'operator', 'host']) {
    const entries = display.scheduleSegments(row, view)
    assert.equal(entries.length, 1); assert.equal(entries[0].operator.employeeId, '1')
    assert.equal(entries[0].startTime, '10:00:00')
    assert.equal(entries[0].endTime, '14:00:00')
  }
  assert.equal(display.assignmentSummary(row), 'Operator')
  assert.equal(display.scheduleGroups([row], 'host', [], [], [{ value: row.employeeId, secondary: 'EMP999' }])[0].secondary, '')
})


test('deletion permission is independent of editing and successful removal reloads retained history', async () => {
  for (const permissions of [[], ['wms:live:schedule:edit'], ['wms:live:schedule:remove'], ['wms:live:schedule:edit', 'wms:live:schedule:remove']]) {
    let writes = 0, confirmations = 0, deleted = false
    const page = await pageFixture({
      deleteSchedule: async id => { assert.equal(id, '10'); writes++; deleted = true },
      listScheduleCalendar: async () => ({ data: [schedule({ delFlag: deleted ? '1' : '0' })] })
    }, permissions, undefined, { confirm: async () => { confirmations++ } })
    await page.load(); await page.openDialog(page.rows.value[0]); await page.remove(page.dialog.form)
    const allowed = permissions.includes('wms:live:schedule:remove')
    assert.equal(writes, allowed ? 1 : 0); assert.equal(confirmations, allowed ? 1 : 0)
    assert.equal(page.canEdit.value, permissions.includes('wms:live:schedule:edit'))
    assert.equal(page.canRemove.value, allowed)
    if (allowed) { assert.equal(page.dialog.open, false); assert.equal(page.rows.value.length, 1); assert.equal(page.rows.value[0].delFlag, '1') }
  }
})

test('deleted details retain names and IDs without querying active rates and cannot be saved or removed', async () => {
  let requests = 0, writes = 0
  const page = await pageFixture({
    listScheduleRateAccounts: async () => { requests++; throw Error('deleted platform') },
    listScheduleRateTypes: async () => { requests++; throw Error('deleted rate') },
    updateSchedule: async () => { writes++ }, deleteSchedule: async () => { writes++ }
  })
  const deleted = schedule({ delFlag: '1', employeeName: 'Original Host', accountLabel: 'Original Channel', rateTypeId: '5', rateTypeName: 'Original Type', deletedBy: 'scheduler', deletedTime: '2026-10-17 01:00:00', ...assigned('1') })
  await page.openDialog(deleted)
  assert.equal(page.dialog.form.rateTypeId, '5'); assert.equal(page.dialog.form.accountLabel, 'Original Channel')
  assert.equal(page.dialog.form.deletedBy, 'scheduler'); assert.equal(page.dialog.form.deletedTime, deleted.deletedTime)
  await page.submit(); await page.remove(page.dialog.form)
  assert.equal(requests, 0); assert.equal(writes, 0)
})

test('deleted shifts remain in all dimensions and release both host and cross-role operator conflicts', () => {
  const deleted = schedule({ delFlag: '1', ...assigned('1') })
  const fresh = schedule({ id: '11', ...assigned('1') })
  const crossRole = schedule({ id: '12', employeeId: '2', ...assigned(deleted.employeeId) })
  assert.equal(display.conflictingSchedules([deleted, fresh]).size, 0)
  assert.equal(display.conflictingSchedules([deleted, crossRole]).size, 0)
  assert.equal(display.conflictingSchedules([fresh, crossRole]).size, 2)
  for (const view of ['channel', 'operator', 'host']) {
    const groups = display.scheduleGroups([deleted, fresh], view, [operator('1', 'Renamed')])
    assert.equal(groups.flatMap(group => group.entries).length, 2)
  }
  assert.equal(display.isDeletedSchedule(schedule({ delFlag: 1 })), true)
})

test('cancelled and failed deletion keep the editor open and duplicate clicks issue only one request', async () => {
  let calls = 0, resolveDelete
  const page = await pageFixture({ deleteSchedule: () => { calls++; return new Promise(resolve => { resolveDelete = resolve }) } })
  await page.openDialog(schedule())
  const deleting = page.remove(page.dialog.form)
  await Promise.resolve(); await page.remove(page.dialog.form)
  assert.equal(calls, 1); assert.equal(page.dialog.deleting, true)
  resolveDelete(); await deleting; assert.equal(page.dialog.deleting, false)
  for (const failConfirmation of [true, false]) {
    const failed = await pageFixture({ deleteSchedule: async () => { throw Error('network') } }, true, undefined,
      { confirm: async () => { if (failConfirmation) throw Error('cancel') } })
    await failed.openDialog(schedule()); await assert.rejects(() => failed.remove(failed.dialog.form))
    assert.equal(failed.dialog.open, true); assert.equal(failed.dialog.deleting, false)
  }
})

test('CSV contains history with an explicit deleted status and audit fields', async () => {
  let exported
  const page = await pageFixture({ listScheduleCalendar: async () => ({ data: [schedule({ delFlag: '1', deletedBy: 'scheduler', deletedTime: '2026-10-17 01:00:00' }), schedule({ id: '11' })] }) }, true, undefined,
    { downloadCsv: (...args) => { exported = args } })
  await page.load(); page.exportRows()
  assert.equal(exported[2].length, 2); assert.equal(exported[2][0].recordStatus, '已删除'); assert.equal(exported[2][1].recordStatus, '有效')
  assert.equal(exported[2][0].deletedTime, '10/17/2026 01:00:00 am'); assert.equal(exported[2][0].deletedBy, 'scheduler'); assert.ok(exported[1].some(column => column.key === 'deletedTime'))
})

test('board renders deleted status in every dimension and uses current operator names by ID', async () => {
  const source = await readFile(new URL('../src/views/wms/live/schedule/ScheduleBoard.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'board-test' })
  const modules = { vue, '../useLiveI18n': { useLiveI18n: () => ({ tr: text => text }) }, '../shared': shared, './scheduleDisplay': display }
  const component = new Function('modules', compiled.content.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, bindings, name) => 'const {' + bindings.replace(/\bas\b/g, ':') + '} = modules[' + JSON.stringify(name) + ']').replace('export default', 'return'))(modules)
  const template = compileTemplate({ source: descriptor.template.content, filename: 'ScheduleBoard.vue', id: 'board-test', compilerOptions: { bindingMetadata: compiled.bindings } })
  assert.deepEqual(template.errors, [])
  component.render = new Function('vue', template.code.replace(/^import \{([^}]+)\} from "vue"/gm, (_, bindings) => 'const {' + bindings.replace(/\bas\b/g, ':') + '} = vue').replace('export function render', 'return function render'))(vue)
  for (const view of ['channel', 'operator', 'host']) {
    const app = vue.createSSRApp(component, { rows: [schedule({ delFlag: '1', ...assigned('1') })], operators: [operator('1', 'Renamed')], weeks: [[{ date: '2026-09-16' }, ...Array.from({ length: 6 }, (_, i) => ({ date: '2026-09-' + (17 + i) }))]], view })
    app.component('el-button', { template: '<button />' })
    const html = await renderToString(app)
    assert.match(html, /shift-card deleted/); assert.match(html, /已删除/); assert.match(html, /运营 · Renamed/); assert.doesNotMatch(html, /人员冲突/)
  }
  assert.match(descriptor.styles[0].content, /\.shift-card\.deleted > :not\(\.state\).*text-decoration: line-through/)
})

test('an editor query finishing after deleted details open cannot clear the history or request active rates', async () => {
  let resolveAccounts, rateRequests = 0
  const page = await pageFixture({
    listScheduleRateAccounts: () => new Promise(resolve => { resolveAccounts = resolve }),
    listScheduleRateTypes: async () => { rateRequests++; return { data: [] } }
  })
  const editing = page.openDialog(schedule({ rateTypeId: '5' }))
  await page.openDialog(schedule({ id: '11', delFlag: '1', rateTypeId: '9', rateTypeName: 'Original Type' }))
  resolveAccounts({ data: [] }); await editing
  assert.equal(rateRequests, 0); assert.equal(page.dialog.form.rateTypeId, '9')
  assert.equal(page.dialog.rateTypes[0].typeName, 'Original Type')
  assert.equal(page.dialog.loadingRateAccounts, false)
})

test('reloading deleted schedules uses current reference names in groups, details and CSV', async () => {
  let renamed = false, csv
  const current = () => schedule({ delFlag: '1', employeeName: renamed ? 'New Host' : 'Old Host', accountLabel: renamed ? '[TK-1] New Shop' : '[TK-1] Old Shop', rateTypeName: renamed ? 'New Type' : 'Old Type', rateTypeId: '5', ...assigned('1'), operatorName: renamed ? 'New Operator' : 'Old Operator' })
  const page = await pageFixture({
    listScheduleCalendar: async () => ({ data: [current()] }),
    listScheduleOperators: async () => ({ data: [operator('1', renamed ? 'New Operator' : 'Old Operator')] })
  }, true, undefined, { downloadCsv: (...args) => { csv = args[2] } })
  await page.load(); renamed = true; await page.load(); await page.openDialog(page.rows.value[0]); page.exportRows()
  assert.equal(page.dialog.form.employeeName, 'New Host'); assert.equal(page.dialog.form.accountLabel, '[TK-1] New Shop')
  assert.equal(page.dialog.form.operatorName, 'New Operator'); assert.equal(page.dialog.form.rateTypeName, 'New Type')
  assert.equal(display.scheduleGroups(page.rows.value, 'operator', page.operators.value)[0].label, 'New Operator')
  assert.equal(csv[0].employeeName, 'New Host'); assert.equal(csv[0].operators, 'New Operator'); assert.equal(csv[0].recordStatus, '已删除')
})

test('missing reference IDs stay readable in all dimensions and delete-only details need no active options', async () => {
  let lookups = 0
  const row = schedule({ employeeName: '[ID: 9007199254740993]', accountLabel: '[ID: 1]', rateTypeId: '5', rateTypeName: '[ID: 5]', ...assigned('99'), operatorName: '[ID: 99]' })
  const page = await pageFixture({
    listScheduleRateAccounts: async () => { lookups++; throw Error('not available') },
    listScheduleRateTypes: async () => { lookups++; throw Error('not available') }
  }, ['wms:live:schedule:remove'])
  await page.openDialog(row)
  assert.equal(lookups, 0); assert.equal(page.dialog.form.employeeName, row.employeeName)
  assert.equal(page.dialog.form.rateTypeName, '[ID: 5]'); assert.equal(page.dialog.form.operatorName, '[ID: 99]')
  for (const view of ['host', 'channel', 'operator']) {
    const groups = display.scheduleGroups([row], view)
    assert.equal(groups.length, 1); assert.match(groups[0].label, /ID:/); assert.equal(groups[0].entries[0].row.id, row.id)
  }
})

test('legacy schedule states cannot hide active conflicts or re-enter editor payloads', async () => {
  for (const status of ['CONFIRMED', 'PENDING', 'CANCELLED']) {
    const row = schedule({ scheduleStatus: status, rateTypeId: '5' })
    const other = schedule({ id: '20' })
    assert.equal(display.conflictingSchedules([row, other]).size, 2)
    row.delFlag = '1'; assert.equal(display.conflictingSchedules([row, other]).size, 0)
    let payload
    const page = await pageFixture({ updateSchedule: async value => { payload = value } })
    await page.load(); await page.openDialog({ ...row, delFlag: '0' })
    page.formRef.value = { validate: async () => true }
    assert.equal('scheduleStatus' in page.dialog.form, false)
    await page.submit(); assert.equal('scheduleStatus' in payload, false)
  }
})

test('the schedule editor and SMS preview expose only validity, with no pending/cancelled schedule controls', async () => {
  const editor = await readFile(new URL('../src/views/wms/live/schedule/index.vue', import.meta.url), 'utf8')
  const sms = await readFile(new URL('../src/views/wms/live/schedule/LiveScheduleSmsDialog.vue', import.meta.url), 'utf8')
  const board = await readFile(new URL('../src/views/wms/live/schedule/ScheduleBoard.vue', import.meta.url), 'utf8')
  for (const source of [editor, sms, board]) {
    assert.doesNotMatch(source, /scheduleStatus|pendingCount|待确认|已取消/)
    assert.deepEqual(parse(source).errors, [])
  }
  assert.match(sms, /未删除的有效排班/)
})
