import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const projectRoot = process.cwd()
const require = createRequire(path.join(projectRoot, 'package.json'))
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const source = file => fs.readFileSync(path.join(projectRoot, 'src', file), 'utf8')
const componentSource = source('components/WarehouseLocationSelect/index.vue')
const script = compileScript(parse(componentSource).descriptor, { id: 'warehouse-location-test' }).content
  .replace(/^import .*\r?\n/gm, '').replace('export default', 'globalThis.component =')

const locations = () => [
  { id: '10', warehouseName: 'Office', warehouseLevel: 1, status: 0, delFlag: 0 },
  { id: '11', warehouseName: 'Active room', warehouseLevel: 2, parentId: '10', status: 0, delFlag: 0 },
  { id: '12', warehouseName: 'Deleted room', warehouseLevel: 2, parentId: '10', status: 1, delFlag: 1 },
  { id: '20', warehouseName: 'Inactive', warehouseLevel: 1, status: 1, delFlag: 0 },
  { id: '21', warehouseName: 'Inactive room', warehouseLevel: 2, parentId: '10', status: 1, delFlag: 0 },
  { id: '30', warehouseName: 'Deleted warehouse', warehouseLevel: 1, status: 1, delFlag: 1 },
  { id: '31', warehouseName: 'Room under deleted warehouse', warehouseLevel: 2, parentId: '30', status: 1, delFlag: 0 }
]

async function setup(overrides = {}) {
  const props = vue.reactive({ includeInactive: true, filterMode: true, ...overrides })
  const events = [], hooks = {}, data = locations()
  let requests = 0
  const context = {
    ...vue,
    historicalLocations: async () => { requests++; return { data: data.map(node => ({ ...node })) } },
    useSettingsStore: () => ({ language: 'zh-cn' }), translateByMap: text => text,
    onMounted: callback => { hooks.mounted = callback },
    onActivated: callback => { hooks.activated = callback }
  }
  vm.createContext(context)
  vm.runInContext(script, context)
  const state = context.component.setup(props, { expose() {}, emit: (...event) => events.push(event) })
  await hooks.mounted()
  return { props, state, events, hooks, data, requests: () => requests }
}
const ids = computed => Array.from(computed.value, node => node.id)

test('filters hide deleted warehouses and rooms by default but retain inactive locations', async () => {
  const s = await setup({ modelValue: '10' })
  assert.deepEqual(ids(s.state.roots), ['10', '20'])
  assert.deepEqual(ids(s.state.rooms), ['11', '21'])
  assert.equal(parse(componentSource).descriptor.template.content.includes('el-checkbox'), false)
})

test('a deleted warehouse or room cannot reappear as the selected filter and is cleared', async () => {
  for (const modelValue of ['12', '30']) {
    const s = await setup({ modelValue })
    assert.deepEqual(ids(s.state.roots), ['10', '20'])
    assert.ok(!ids(s.state.rooms).includes('12'))
    assert.deepEqual(s.events.map(event => [event[0], event[1]]), [
      ['update:modelValue', undefined], ['change', undefined]
    ])
  }
})

test('an undeleted room under a deleted warehouse is hidden and cannot bypass its parent', async () => {
  const s = await setup({ modelValue: '31' })
  assert.deepEqual(ids(s.state.rooms), [])
  assert.deepEqual(ids(s.state.roots), ['10', '20'])
  assert.equal(s.events[0][1], undefined)
})

test('hiding deleted locations keeps an active filter and numeric IDs work with string location IDs', async () => {
  const s = await setup({ modelValue: 11 })
  assert.equal(s.events.length, 0)
  assert.equal(s.state.rootId.value, '10')
  assert.equal(s.state.roomId.value, '11')
})

test('existing orders retain the selected deleted warehouse and room as disabled named options', async () => {
  const s = await setup({ filterMode: false, includeInactive: false, modelValue: '12' })
  assert.deepEqual(ids(s.state.roots), ['10'])
  assert.deepEqual(ids(s.state.rooms), ['11', '12'])
  assert.equal(s.state.selectable(s.data[2]), false)
  assert.equal(s.events.length, 0)
  s.props.modelValue = '31'
  assert.deepEqual(ids(s.state.roots), ['10', '30'])
  assert.deepEqual(ids(s.state.rooms), ['31'])
  assert.equal(s.state.selectable(s.data[6]), false)
})

test('new business locations exclude inactive/deleted entries and honor the parent status', async () => {
  const s = await setup({ filterMode: false, includeInactive: false, modelValue: '10' })
  assert.deepEqual(ids(s.state.roots), ['10'])
  assert.deepEqual(ids(s.state.rooms), ['11'])
  s.data[0].status = 1
  await s.hooks.activated()
  assert.deepEqual(ids(s.state.rooms), [])
})

test('cached pages refresh after deletion and clear their now-hidden filter', async () => {
  const s = await setup({ modelValue: '10' })
  s.data[0].delFlag = 1
  s.data[0].status = 1
  await s.hooks.activated()
  assert.equal(s.requests(), 2)
  assert.deepEqual(ids(s.state.roots), ['20'])
  assert.deepEqual(ids(s.state.rooms), [])
  assert.equal(s.events[0][0], 'update:modelValue')
  assert.equal(s.events[0][1], undefined)
})

test('first mount and activation share one request', async () => {
  const s = await setup()
  const first = s.hooks.mounted()
  const second = s.hooks.activated()
  await Promise.all([first, second])
  assert.equal(s.requests(), 2)
})

test('both inventory filter pages enable history filtering without changing row name display', () => {
  for (const file of ['statistic.vue', 'history.vue']) {
    const page = source(`views/wms/inventory/${file}`)
    assert.match(page, /<WarehouseLocationSelect[^>]*include-inactive[^>]*filter-mode/)
  }
  assert.match(source('views/wms/inventory/history.vue'), /row\.locationName \|\| useWmsStore\(\)\.warehouseMap/)
})

test('warehouse store still resolves deleted warehouse names for historical orders and mobile history', async () => {
  const data = locations()
  const context = {
    ...vue,
    defineStore: (_name, factory) => factory,
    warehouseOptions: async () => ({ data: data.filter(node => node.status === 0 && node.delFlag === 0) }),
    historicalLocations: async () => ({ data: data.map(node => ({ ...node, locationName: node.warehouseName })) })
  }
  vm.createContext(context)
  vm.runInContext(source('store/modules/wms.js').replace(/^import .*\r?\n/gm, '').replace('export const useWmsStore', 'globalThis.useWmsStore'), context)
  const store = context.useWmsStore()
  await store.getWarehouseList()
  assert.deepEqual(Array.from(store.warehouseList.value, node => node.id), ['10', '11'])
  assert.equal(store.warehouseMap.value.get('12').warehouseName, 'Deleted room')
  assert.equal(store.warehouseMap.value.get('30').warehouseName, 'Deleted warehouse')
})
