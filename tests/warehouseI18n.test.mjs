import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import * as vue from 'vue'

const read = path => readFile(new URL('../src/' + path, import.meta.url), 'utf8')
const messages = (await read('locales/live-payroll.js')).replace('export default', 'const livePayrollMessages =')
const runtimeSource = (await read('locales/runtime-map.js')).replace("import livePayrollMessages from './live-payroll'", messages)
const runtime = await import('data:text/javascript;base64,' + Buffer.from(runtimeSource).toString('base64'))
const source = await read('views/wms/basic/warehouse/index.vue')
const { descriptor, errors } = parse(source)
const script = compileScript(descriptor, { id: 'warehouse-i18n-test' }).content
  .replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, names, name) => 'const {' + names.replace(/\bas\b/g, ':') + '} = modules[' + JSON.stringify(name) + ']')
  .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, local, name) => 'const ' + local + ' = modules[' + JSON.stringify(name) + ']')
  .replaceAll('import.meta.env.BASE_URL', "'/'")
  .replace('export default', 'return')

function setup(language = 'en') {
  const settings = vue.reactive({ language }), permissions = vue.reactive(['wms:warehouse:edit'])
  const calls = [], confirmations = [], messages = [], qrUrls = []
  const node = { id: '1', warehouseLevel: 1, warehouseName: '仓库与房间', warehouseCode: '启用', rootWarehouseName: '直播间', remark: '新增房间，原始备注', status: 0 }
  const room = { id: '2', parentId: '1', warehouseLevel: 2, warehouseName: '二维码', status: 0, isLiveRoom: true }
  const nodes = [{ ...node, children: [{ ...room }] }]
  const api = {
    warehouseTree: async () => ({ data: nodes }),
    addWarehouse: async data => calls.push({ method: 'add', data: { ...data } }),
    updateWarehouse: async data => calls.push({ method: 'update', data: { ...data } }),
    delWarehouse: async id => calls.push({ method: 'delete', id }),
    roomQr: async id => ({ data: { token: 'test&token', locationName: room.warehouseName } })
  }
  const modules = {
    vue: { ...vue, onMounted() {} },
    'element-plus': { ElMessage: { success: value => messages.push(value), warning: value => messages.push(value) }, ElMessageBox: { confirm: async (...args) => confirmations.push(args) } },
    qrcode: { toDataURL: async url => { qrUrls.push(url); return 'data:image/png;base64,test' } },
    '@/api/wms/warehouse': api,
    '@/store/modules/wms': { useWmsStore: () => ({ getWarehouseList: async () => {} }) },
    '@/store/modules/user': () => ({ permissions }),
    '@/store/modules/settings': () => settings,
    '@/locales/runtime-map': runtime
  }
  const component = new Function('modules', 'window', script)(modules, { location: { origin: 'http://localhost' }, open: () => null })
  const model = component.setup({}, { expose() {} })
  return { model, settings, calls, confirmations, messages, qrUrls, node, room, permissions, nodes }
}

test('every Warehouse UI phrase has a complete exact English translation', () => {
  assert.deepEqual(errors, [])
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: 'warehouse.vue', id: 'warehouse-i18n-test' }).errors, [])
  const keys = [...new Set([...source.matchAll(/'([^'\r\n]*[\u3400-\u9fff][^'\r\n]*)'/g)].map(match => match[1]))]
  assert.ok(keys.length > 30)
  for (const key of keys) assert.doesNotMatch(runtime.translateExact(key, 'en'), /[\u3400-\u9fff]/, key)
  const { model } = setup()
  for (const [key, expected] of [['仓库与房间', 'Warehouses and Rooms'], ['新增一级仓库', 'Add Warehouse'], ['新增房间', 'Add Room'], ['所属一级仓库', 'Parent Warehouse'], ['层级', 'Level'], ['直播间', 'Live room'], ['二维码', 'QR Code']]) assert.equal(model.tr(key), expected)
})

test('language switches update labels and actions while saved location data stays verbatim', async () => {
  const { model, settings, node, nodes, permissions } = setup()
  const snapshot = JSON.stringify(nodes)
  await model.load()
  model.edit(node)
  assert.equal(model.tr('启用'), 'Enabled')
  assert.equal(model.tr('停用'), 'Disabled')
  assert.equal(model.statusActionLabel({ status: 0 }), 'Disable')
  assert.equal(model.statusActionLabel({ status: 1 }), 'Enable')
  assert.equal(model.isEnglish.value, true)
  assert.equal(model.form.value.warehouseName, '仓库与房间')
  assert.equal(model.form.value.warehouseCode, '启用')
  assert.equal(model.form.value.remark, '新增房间，原始备注')
  settings.language = 'zh-cn'
  assert.equal(model.tr('仓库与房间'), '仓库与房间')
  assert.equal(model.tr('名称不能为空'), '名称不能为空')
  assert.equal(model.statusActionLabel({ status: 0 }), '停用')
  assert.equal(model.statusActionLabel({ status: 1 }), '启用')
  assert.equal(model.isEnglish.value, false)
  assert.equal(JSON.stringify(nodes), snapshot)
  assert.equal(model.canEdit.value, true)
  permissions.splice(0)
  assert.equal(model.canEdit.value, false)
})

test('warehouse and room forms preserve API data and bilingual confirmations', async () => {
  const { model, node, settings, calls, confirmations, messages } = setup()
  model.add()
  assert.equal(model.tr(model.form.value.parentId ? '新增房间' : '新增一级仓库'), 'Add Warehouse')
  model.add(node)
  assert.equal(model.form.value.parentId, '1')
  assert.equal(model.form.value.warehouseLevel, 2)
  assert.equal(model.form.value.isLiveRoom, true)
  assert.equal(model.tr('名称不能为空'), 'Name is required')
  model.form.value.warehouseName = '新增房间'
  model.form.value.remark = '保留中文'
  model.formRef.value = { validate: async () => true }
  await model.save()
  assert.equal(calls[0].data.warehouseName, '新增房间')
  assert.equal(calls[0].data.remark, '保留中文')
  assert.equal(messages[0], 'Saved successfully')
  await model.toggle(node)
  assert.equal(confirmations[0][0], 'Disable this location?')
  assert.equal(confirmations[0][2].cancelButtonText, 'Cancel')
  assert.doesNotMatch(confirmations[0][2].confirmButtonText, /[\u3400-\u9fff]/)
  assert.equal(calls[1].data.status, 1)
  await model.remove(node)
  assert.equal(confirmations[1][0], 'Delete this location? Historical records will be retained.')
  assert.equal(calls[2].id, '1')
  settings.language = 'zh-cn'
  await model.toggle({ ...node, status: 1 })
  assert.equal(confirmations[2][0], '确认启用此位置？')
  assert.equal(confirmations[2][2].cancelButtonText, '取消')
  assert.equal(calls[3].data.status, 0)
})

test('QR dialogs translate help text without changing the location name or token', async () => {
  const { model, room, qrUrls, messages, settings } = setup()
  await model.showQr(room)
  assert.equal(model.qr.value.locationName, '二维码')
  const url = new URL(qrUrls[0])
  assert.equal(url.pathname, '/inventory/room-transfer')
  assert.equal(url.searchParams.get('token'), 'test&token')
  assert.equal(model.tr('房间固定二维码'), 'Room QR Code')
  assert.equal(model.tr('扫描后登录系统并进入此房间调货'), 'Scan to sign in and transfer inventory to this room')
  model.printQr()
  assert.equal(messages[0], 'Allow pop-ups to print the QR code')
  settings.language = 'zh-cn'
  assert.equal(model.tr('房间固定二维码'), '房间固定二维码')
  assert.equal(model.qr.value.locationName, '二维码')
})
