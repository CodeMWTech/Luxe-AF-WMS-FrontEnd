import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'
async function sourceModule(path) { return import('data:text/javascript;base64,' + Buffer.from(await readFile(new URL(path, import.meta.url), 'utf8')).toString('base64')) }
const display = await sourceModule('../src/views/wms/live/schedule/scheduleDisplay.js')
const shared = await sourceModule('../src/views/wms/live/shared.js')
const operator = (id, name = 'Same name', color = '#D9959C') => ({ employeeId: id, name, color, employeeStatus: 0, positions: ['主播', '直播运营'] })
const schedule = (extra = {}) => ({ id: '10', scheduleDate: '2026-09-16', employeeId: '9007199254740993', employeeName: 'Host', accountId: '1', accountLabel: 'TK1', startTime: '10:00:00', endTime: '14:00:00', scheduleStatus: 'CONFIRMED', ...extra })
const assignment = (id, start, end) => ({ employeeId: id, employeeName: 'Operator', startTime: `${start}:00`, endTime: `${end}:00` })

test('handover partitions a channel and a host while preserving the shared session identity', () => {
  const row = schedule({ hostStartTime: '09:45:00', hostEndTime: '14:15:00', operatorAssignments: [assignment('1', '09:30', '12:00'), assignment('2', '12:00', '14:30')] })
  assert.deepEqual(display.scheduleSegments(row, 'channel').map(x => [x.startTime, x.endTime, x.operator.employeeId]), [['10:00:00', '12:00:00', '1'], ['12:00:00', '14:00:00', '2']])
  assert.deepEqual(display.scheduleSegments(row, 'host').map(x => [x.startTime, x.endTime]), [['09:45:00', '12:00:00'], ['12:00:00', '14:15:00']])
  assert.deepEqual(display.scheduleSegments(row, 'operator').map(x => [x.startTime, x.endTime]), [['09:30:00', '12:00:00'], ['12:00:00', '14:30:00']])
  assert.ok(display.scheduleSegments(row, 'channel').every(x => x.row.id === row.id))
})
test('unassigned gaps appear independently and legacy sessions remain visible', () => {
  const row = schedule({ operatorAssignments: [assignment('1', '11:00', '12:00')] })
  const gaps = display.scheduleSegments(row, 'operator').filter(x => !x.operator)
  assert.deepEqual(gaps.map(x => [x.startTime, x.endTime]), [['10:00:00', '11:00:00'], ['12:00:00', '14:00:00']])
  assert.equal(display.scheduleGroups([schedule()], 'operator')[0].id, 'unassigned')
})
test('same names and large integer IDs stay separate and idle active operators are retained', () => {
  const operators = [operator('9007199254740992'), operator('9007199254740993'), { ...operator('3'), employeeStatus: 3 }]
  const groups = display.scheduleGroups([schedule({ operatorAssignments: [assignment('9007199254740993', '10:00', '14:00')] })], 'operator', operators)
  assert.equal(groups.length, 2); assert.equal(groups[0].entries.length, 0); assert.equal(groups[1].entries.length, 1)
  assert.equal(display.isActiveOperator({ ...operator('1'), positions: ['运营主管'] }), false)
  assert.equal(display.isActiveOperator({ ...operator('1'), visible: false }), false)
  assert.equal(display.isActiveOperator({ ...operator('1'), employeeStatus: null }), false)
})
test('conflicts consider arrival time across roles and ignore cancelled schedules', () => {
  const first = schedule({ hostStartTime: '09:30:00' })
  const second = schedule({ id: '20', employeeId: '2', startTime: '08:00:00', endTime: '09:45:00', operatorAssignments: [assignment(first.employeeId, '08:00', '09:45')] })
  assert.deepEqual([...display.conflictingSchedules([first, second])].sort(), ['10', '20'])
  second.scheduleStatus = 'CANCELLED'; assert.equal(display.conflictingSchedules([first, second]).size, 0)
})
test('operator color styles validate custom values and use a neutral unassigned color', () => {
  assert.equal(display.operatorColorStyle('#123456')['--operator-color'], '#123456')
  assert.equal(display.operatorColorStyle(null)['--operator-color'], '#9CA3AF')
  assert.equal(display.operatorColorStyle('url(x)')['--operator-color'], '#9CA3AF')
})

async function pageFixture(api = {}, editable = true) {
  const source = await readFile(new URL('../src/views/wms/live/schedule/index.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'schedule-test' }).content
  const modules = {
    vue: { ...vue, onMounted() {}, onActivated() {}, getCurrentInstance: () => ({ proxy: { $modal: { msgSuccess() {}, msgWarning() {} } } }) },
    '../useLiveI18n': { useLiveI18n: () => ({ tr: text => text, isEn: vue.ref(false), messageNode: text => text }) },
    '@/utils/permission': { checkPermi: () => editable }, './scheduleDisplay': display, '../shared': shared,
    '@/api/wms/livePayroll': { getLiveOptions: async () => ({ employees: [], accounts: [], rateTypes: [] }), listScheduleOperators: async () => ({ data: [operator('1'), operator('2')] }), listScheduleCalendar: async () => ({ data: [schedule()] }), ...api }
  }
  const create = new Function('modules', compiled.replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, bindings, name) => `const {${bindings.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(name)}]`).replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, binding, name) => `const ${binding} = modules[${JSON.stringify(name)}]`).replace('export default', 'return'))
  return create(modules).setup({}, { expose() {}, emit() {} })
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
