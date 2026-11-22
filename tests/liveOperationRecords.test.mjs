import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'

const root = new URL('../src/views/wms/live/operation-records/', import.meta.url)
const display = await import('data:text/javascript;base64,' + Buffer.from(await readFile(new URL('recordDisplay.js', root), 'utf8')).toString('base64'))
async function setup(api) {
  const { descriptor } = parse(await readFile(new URL('index.vue', root), 'utf8'))
  const script = compileScript(descriptor, { id: 'operation-record-test' }).content
  const component = new Function('modules', script
    .replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, bindings, name) => `const {${bindings.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(name)}]`)
    .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, binding, name) => `const ${binding} = modules[${JSON.stringify(name)}]`)
    .replace('export default', 'return'))({
      vue: { ...vue, onMounted() {}, onActivated() {} },
      '@/api/wms/livePayroll': { listOperationRecords: async () => ({ rows: [], total: 0 }), getOperationRecordOptions: async () => ({ data: {} }), exportOperationRecords: async () => {}, exportOperationTimes: async () => {}, getOperationRecordSummary: async () => ({ data: { liveHours: 0, nonliveHours: 0 } }), listOperationTimes: async () => ({ rows: [], total: 0 }), createOperationTime: async () => {}, updateOperationTime: async () => {}, deleteOperationTime: async () => {}, ...api },
      '../components/LiveAccountSelect.vue': {}, '../components/LivePlatformTag.vue': {},
      '../useLiveI18n': { useLiveI18n: () => ({ tr: text => text, isEn: vue.ref(false) }) },
      'element-plus': { ElMessage: { success() {}, warning() {} }, ElMessageBox: { confirm: async () => {} } },
      '../shared': { displayDate: text => text, isoDate: () => '2026-10-22', LIVE_DATE_FORMAT: 'MM/DD/YYYY', money: n => `$${n}` },
      './recordDisplay': display
    })
  return component.setup({}, { expose() {} })
}

test('operator identity includes nickname and distinguishes missing and unassigned people', () => {
  assert.equal(display.operatorLabel({ operatorEmployeeId: '1', operatorName: 'Alex', operatorNickName: ' nick ' }), 'Alex（nick）')
  assert.equal(display.operatorLabel({ operatorEmployeeId: '1', operatorName: 'Alex', operatorNickName: ' ' }), 'Alex')
  assert.equal(display.operatorLabel({ value: '2', label: 'Alex', nickName: 'Other' }), 'Alex（Other）')
  assert.equal(display.operatorLabel({ operatorEmployeeId: '99' }), '[ID: 99]')
  assert.equal(display.operatorLabel({}), '未指定运营')
})

test('actual duration never substitutes scheduled or payroll hours for missing input', () => {
  assert.equal(display.actualDurationLabel(null), '—')
  assert.equal(display.actualDurationLabel(95), '1.58h')
  assert.equal(display.actualDurationLabel(150), '2.50h')
  assert.equal(display.actualDurationLabel(95, true), '1.58h')
  assert.equal(display.actualDurationLabel(1440), '24.00h')
  assert.equal(display.actualDurationLabel(0), '0.00h')
  assert.equal(display.hoursText(2.5), '2.50h')
  assert.equal(display.hoursText(null), '—')
})

test('pagination and export share applied filters and export ignores unsaved edits and page limits', async () => {
  const calls = [], exports = []
  const page = await setup({
    listOperationRecords: async query => { calls.push(query); return { rows: [{ id: '1', gmv: 0 }], total: 65 } },
    exportOperationRecords: async (...args) => exports.push(args)
  })
  page.query.operatorEmployeeId = '9007199254740999'
  page.query.accountId = '10'
  page.dateRange.value = ['2026-10-01', '2026-10-22']
  await page.handleQuery()
  assert.deepEqual(calls[0], { operatorEmployeeId: '9007199254740999', accountId: '10', startDate: '2026-10-01', endDate: '2026-10-22', sortOrder: 'desc', pageNum: 1, pageSize: 20 })
  page.pagination.pageNum = 2
  await page.load()
  page.query.operatorEmployeeId = 'edited-without-query'
  await page.exportLiveRows()
  assert.equal(calls[1].pageNum, 2)
  assert.deepEqual(exports[0][0], { operatorEmployeeId: '9007199254740999', accountId: '10', startDate: '2026-10-01', endDate: '2026-10-22', sortOrder: 'desc' })
  assert.equal(exports[0][1], '运营记录直播场次_2026-10-22.xlsx')
  await page.resetQuery()
  assert.equal(page.query.scope, '20')
  assert.equal(page.query.sortOrder, 'desc')
  assert.equal(page.pagination.pageNum, 1)
  assert.equal(page.pagination.pageSize, 20)
  assert.equal(page.dateRange.value, null)
  assert.equal(calls.at(-1).operatorEmployeeId, undefined)
  assert.equal(calls.at(-1).accountId, undefined)
})

test('display range chooses the latest page size and all keeps the chosen page size', async () => {
  const calls = []
  const page = await setup({ listOperationRecords: async query => { calls.push(query); return { rows: [], total: 80 } } })
  page.pagination.pageSize = 100
  page.pagination.pageNum = 4
  await page.handleQuery()
  assert.deepEqual(calls[0], { operatorEmployeeId: undefined, accountId: undefined, startDate: undefined, endDate: undefined, sortOrder: 'desc', pageNum: 1, pageSize: 20 })
  page.query.scope = '50'
  await page.handleQuery()
  assert.equal(calls[1].pageNum, 1)
  assert.equal(calls[1].pageSize, 50)
  page.query.scope = 'all'
  page.pagination.pageSize = 100
  page.pagination.pageNum = 3
  await page.handleQuery()
  assert.equal(calls[2].pageNum, 1)
  assert.equal(calls[2].pageSize, 100)
})

test('late requests cannot overwrite the most recently queried operator', async () => {
  const requests = []
  const page = await setup({ listOperationRecords: query => new Promise(resolve => requests.push({ query, resolve })) })
  page.query.operatorEmployeeId = '1'
  const first = page.handleQuery()
  page.query.operatorEmployeeId = '2'
  const second = page.handleQuery()
  requests[1].resolve({ rows: [{ id: 'new' }], total: 1 }); await second
  requests[0].resolve({ rows: [{ id: 'old' }], total: 100 }); await first
  assert.equal(page.rows.value[0].id, 'new')
  assert.equal(page.total.value, 1)
  assert.equal(page.loading.value, false)
})

test('failed queries clear stale results and export loading resets after rejection', async () => {
  let fail = false
  const page = await setup({
    listOperationRecords: async () => { if (fail) throw new Error('query failed'); return { rows: [{ id: '1' }], total: 1 } },
    exportOperationRecords: async () => { throw new Error('download failed') }
  })
  await page.load()
  await assert.rejects(page.exportLiveRows(), /download failed/)
  assert.equal(page.liveExportLoading.value, false)
  fail = true
  await page.handleQuery()
  assert.deepEqual(page.rows.value, [])
  assert.equal(page.total.value, 0)
  assert.equal(page.loading.value, false)
})
