import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const { parse, compileScript } = require(root + '/node_modules/@vue/compiler-sfc')
const vue = require(root + '/node_modules/vue')
const types = ['receipt', 'movement', 'check']
function setup(type) {
  const source = fs.readFileSync(root + `/src/views/wms/order/${type}/edit.vue`, 'utf8')
  const script = compileScript(parse(source).descriptor, { id: `${type}-save-test` }).content
    .replace(/^import .*\r?\n/gm, '').replace('export default', 'globalThis.component =')
  const calls = [], messages = []
  let loaded
  const response = kind => params => {
    calls.push({ kind, params: JSON.parse(JSON.stringify(params)) })
    return Promise.resolve({ code: 200, msg: 'OK', data: {} })
  }
  const proxy = {
    useDict: () => ({ wms_receipt_type: vue.ref([]), wms_shipment_type: vue.ref([]) }),
    $modal: { confirm: () => Promise.resolve() },
    $tab: { closeOpenPage: () => calls.push({ kind: 'close' }) }
  }
  const context = {
    ...vue, console, getCurrentInstance: () => ({ proxy }), onMounted: () => {},
    useRoute: () => ({ query: {} }),
    useWmsStore: () => ({ warehouseList: [], merchantList: [], itemBrandList: [], itemBrandMap: new Map() }),
    useSettingsStore: () => ({ language: 'zh-cn' }), translateByMap: text => text,
    useOrderEditLeaveGuard: () => ({ markAllowLeave: () => {} }),
    getWarehouseAndSkuKey: row => `${row.warehouseId}:${row.skuId ?? row.itemSku?.id}`,
    getSourceWarehouseAndSkuKey: row => `${row.sourceWarehouseId}:${row.skuId ?? row.itemSku?.id}`,
    numSub: (a,b) => Number((a-b).toFixed(2)), generateNo: () => 'TEST',
    SkuSelect: {}, InventorySelect: {},
    ElMessage: Object.fromEntries(['success','warning','error'].map(level => [level, text => messages.push({level,text})])),
    ElMessageBox: { alert: () => Promise.resolve() },
    addReceiptOrder: response('add'), updateReceiptOrder: response('save'), warehousing: response('complete'),
    addMovementOrder: response('add'), updateMovementOrder: response('save'), movement: response('complete'),
    addCheckOrder: response('add'), updateCheckOrder: response('save'), check: response('complete'),
    getReceiptOrder: () => Promise.resolve({data: loaded}),
    getMovementOrder: () => Promise.resolve({data: loaded}),
    getCheckOrder: () => Promise.resolve({data: loaded})
  }
  vm.createContext(context)
  vm.runInContext(script, context)
  const page = context.component.setup({}, { expose() {} })
  page.form.value = {
    id: 10, orderNo: 'TEST', orderStatus: 0, optType: '2', warehouseId: 40,
    sourceWarehouseId: 40, targetWarehouseId: 50, totalQuantity: 2, totalAmount: 2120, editToken: 'original-version',
    details: [101,102].map((skuId, i) => ({
      id: 11+i, skuId, itemSku: {id:skuId, costPrice:600}, quantity: 1, checkQuantity: 1,
      amount: i ? 920 : 1200, warehouseId: 40, sourceWarehouseId: 40, targetWarehouseId: 50
    }))
  }
  if (type === 'movement') {
    page.selectedInventory.value = page.form.value.details.map(row => ({...row}))
    page.inventorySelectRef.value = {setWarehouseId() {}}
  } else page.selectedSku.value = page.form.value.details.map(row => ({id: row.skuId}))
  page[`${type}Form`].value = { validate: callback => callback(true) }
  page.captureFormSnapshot()
  return {page, calls, messages, source, load(data) { loaded = data; page.loadDetail(10) }}
}
const tick = async () => { await new Promise(resolve => setImmediate(resolve)) }
for (const type of types) {
  test(`${type}: local deletion and cancel make no write requests`, async () => {
    const {page,calls} = setup(type)
    page.handleDeleteDetail(page.form.value.details[1],1)
    assert.equal(calls.length,0)
    assert.equal(page.form.value.totalQuantity,1)
    if (type !== 'check') assert.equal(page.form.value.totalAmount,1200)
    assert.equal(page.isFormDirty(),true)
    await page.cancel()
    assert.deepEqual(calls.map(c=>c.kind),['close'])
  })
  test(`${type}: draft sends final details, refreshed totals and the original content version`, async () => {
    const {page,calls} = setup(type)
    page.handleDeleteDetail(page.form.value.details[1],1)
    page.form.value.totalQuantity=2; page.form.value.totalAmount=2120
    await page.save(); await tick()
    assert.equal(calls[0].kind,'save')
    assert.equal(calls[0].params.orderStatus,0)
    assert.equal(calls[0].params.details.length,1)
    assert.equal(calls[0].params.totalQuantity,1)
    assert.equal(calls[0].params.editToken,'original-version')
    if (type !== 'check') assert.equal(calls[0].params.totalAmount,1200)
  })
  test(`${type}: completion sends only the final remaining detail`, async () => {
    const {page,calls} = setup(type)
    page.handleDeleteDetail(page.form.value.details[1],1)
    await page[{receipt:'doWarehousing',movement:'doMovement',check:'doCheck'}[type]](); await tick()
    assert.equal(calls[0].kind,'complete')
    assert.equal(calls[0].params.details.length,1)
    assert.equal(calls[0].params.details[0].skuId,101)
  })
  test(`${type}: invalidation cannot save unsaved edits`, async () => {
    const {page,calls} = setup(type)
    page.handleDeleteDetail(page.form.value.details[1],1)
    await page.updateToInvalid(); await tick()
    assert.equal(calls.length,0)
  })
  test(`${type}: empty draft sends an explicit empty list and zero totals`, async () => {
    const {page,calls} = setup(type)
    page.handleDeleteDetail(page.form.value.details[1],1)
    page.handleDeleteDetail(page.form.value.details[0],0)
    await page.save(); await tick()
    assert.equal(calls[0].params.details.length,0)
    assert.equal(calls[0].params.totalQuantity,0)
    if (type !== 'check') assert.equal(calls[0].params.totalAmount,0)
  })
}
test('receipt: header amount is read-only', () => {
  const {source} = setup('receipt')
  assert.match(source, /v-model="form.totalAmount"[^>]*:disabled="true"/)
})
test('movement: quantity event passes the row and recalculates its cost amount', () => {
  const {page,source} = setup('movement')
  assert.match(source, /@change="handleChangeQuantity\(scope.row\)"/)
  const row=page.form.value.details[0]
  row.quantity=2; row.avgReceiptCost=500
  page.handleChangeQuantity(row)
  assert.equal(row.amount,1000)
  assert.equal(page.form.value.totalQuantity,3)
  assert.equal(page.form.value.totalAmount,1920)
})
test('movement: source change clears locally and target change updates final warehouses', () => {
  const {page,calls}=setup('movement')
  page.handleChangeTargetWarehouse(60)
  assert.equal(page.form.value.details[0].targetWarehouseId,60)
  page.form.value.sourceWarehouseId=70
  page.handleChangeSourceWarehouse(70)
  assert.equal(page.form.value.details.length,0)
  assert.equal(page.selectedInventory.value.length,0)
  assert.equal(page.form.value.totalAmount,0)
  assert.equal(calls.length,0)
})
test('movement: same source and destination cannot complete', async () => {
  const {page,calls}=setup('movement')
  page.form.value.targetWarehouseId=40
  await page.doMovement(); await tick()
  assert.equal(calls.length,0)
})
test('check: explicit zero survives load, save and completion; removed SKU is excluded', async () => {
  const state=setup('check'); const {page,calls}=state
  const loaded=JSON.parse(JSON.stringify(page.form.value))
  loaded.details[0].checkQuantity=0; loaded.details[0].countedQuantity=0
  state.load(loaded); await tick()
  assert.equal(page.form.value.details.length,2)
  assert.equal(page.form.value.details[0].checkQuantity,0)
  page.handleDeleteDetail(page.form.value.details[1],1)
  await page.save(); await tick()
  assert.equal(calls[0].params.details.length,1)
  assert.equal(calls[0].params.details[0].checkQuantity,0)
  calls.length=0
  await page.doCheck(); await tick()
  assert.equal(calls[0].params.details[0].checkQuantity,0)
})
