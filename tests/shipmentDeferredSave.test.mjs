import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const { parse, compileScript } = require(root + '/node_modules/@vue/compiler-sfc');
const vue = require(root + '/node_modules/vue');
const source = fs.readFileSync(root + '/src/views/wms/order/shipment/edit.vue', 'utf8');
const descriptor = parse(source).descriptor;
const script = compileScript(descriptor, { id: 'shipment-deferred-save-test' }).content
  .replace(/^import .*\r?\n/gm, '')
  .replace('export default', 'globalThis.component =');
function setup() {
  const calls = [], messages = [];
  const response = (kind) => (params) => {
    calls.push({ kind, params: JSON.parse(JSON.stringify(params)) });
    return Promise.resolve({ code: 200, msg: 'OK', data: {} });
  };
  const proxy = {
    useDict: () => ({ wms_shipment_type: vue.ref([]) }),
    $modal: { confirm: () => Promise.resolve() },
    $tab: { closeOpenPage: () => calls.push({ kind: 'close' }) }
  };
  const context = {
    ...vue, console,
    getCurrentInstance: () => ({ proxy }), onMounted: () => {},
    useRoute: () => ({ query: {} }),
    useWmsStore: () => ({ warehouseList: [], merchantList: [], itemBrandList: [], itemBrandMap: new Map() }),
    useSettingsStore: () => ({ language: 'zh-cn' }),
    translateByMap: (text) => text,
    useOrderEditLeaveGuard: () => ({ markAllowLeave: () => {} }),
    getWarehouseAndSkuKey: (row) => `${row.warehouseId}:${row.skuId ?? row.itemSku?.id}`,
    numSub: (a, b) => Number((a - b).toFixed(2)), generateNo: () => 'TEST',
    addShipmentOrder: response('add'), updateShipmentOrder: response('save'), shipment: response('shipment'),
    getShipmentOrder: () => { throw new Error('Unexpected reload'); },
    ElMessage: Object.fromEntries(['success', 'warning', 'error'].map(level => [level, text => messages.push({level, text})])),
    ElMessageBox: { alert: () => Promise.resolve() }, InventorySelect: {}
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  const page = context.component.setup({}, { expose() {} });
  page.form.value = {
    id: 10, orderNo: 'SO-TEST', warehouseId: 40, optType: '2', totalQuantity: 2, totalAmount: 2120,
    details: [
      { id: 11, skuId: 101, warehouseId: 40, quantity: 1, amount: 1200 },
      { id: 12, skuId: 102, warehouseId: 40, quantity: 1, amount: 920 }
    ]
  };
  page.selectedInventory.value = page.form.value.details.map(row => ({ ...row }));
  page.shipmentForm.value = { validate: callback => callback(true) };
  page.inventorySelectRef.value = { setWarehouseId() {} };
  page.captureFormSnapshot();
  return { page, calls, messages };
}
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); };
test('deleting a saved detail is local and cancel leaves without saving', async () => {
  const { page, calls } = setup();
  page.handleDeleteDetail(page.form.value.details[1], 1);
  assert.equal(calls.length, 0);
  assert.equal(page.form.value.totalQuantity, 1);
  assert.equal(page.form.value.totalAmount, 1200);
  assert.equal(page.selectedInventory.value.length, 1);
  assert.equal(page.isFormDirty(), true);
  await page.cancel();
  assert.deepEqual(calls.map(c => c.kind), ['close']);
});
test('draft save sends only remaining details and recalculates stale totals', async () => {
  const { page, calls } = setup();
  page.handleDeleteDetail(page.form.value.details[1], 1);
  page.form.value.totalQuantity = 2;
  page.form.value.totalAmount = 2120;
  await page.save(); await tick();
  assert.equal(calls[0].kind, 'save');
  assert.equal(calls[0].params.details.length, 1);
  assert.equal(calls[0].params.totalQuantity, 1);
  assert.equal(calls[0].params.totalAmount, 1200);
  assert.equal(calls[0].params.orderStatus, 0);
});
test('completion sends only remaining details through the shipment endpoint', async () => {
  const { page, calls } = setup();
  page.handleDeleteDetail(page.form.value.details[1], 1);
  await page.doShipment(); await tick();
  assert.equal(calls[0].kind, 'shipment');
  assert.equal(calls[0].params.details[0].skuId, 101);
  assert.equal(calls[0].params.details.length, 1);
  assert.equal(calls[0].params.totalAmount, 1200);
  assert.equal(calls[0].params.orderStatus, 1);
});
test('invalidating cannot implicitly save unsaved detail edits', async () => {
  const { page, calls } = setup();
  page.handleDeleteDetail(page.form.value.details[1], 1);
  await page.updateToInvalid(); await tick();
  assert.equal(calls.length, 0);
});
test('empty draft totals are zero and empty shipment cannot be completed', async () => {
  const { page, calls } = setup();
  page.handleDeleteDetail(page.form.value.details[1], 1);
  page.handleDeleteDetail(page.form.value.details[0], 0);
  assert.equal(page.form.value.totalQuantity, 0);
  assert.equal(page.form.value.totalAmount, 0);
  await page.doShipment(); await tick();
  assert.equal(calls.length, 0);
});
test('changing warehouse clears details, selection and totals locally', () => {
  const { page, calls } = setup();
  page.handleChangeWarehouse(50);
  assert.equal(page.form.value.details.length, 0);
  assert.equal(page.selectedInventory.value.length, 0);
  assert.equal(page.form.value.totalAmount, 0);
  assert.equal(calls.length, 0);
});