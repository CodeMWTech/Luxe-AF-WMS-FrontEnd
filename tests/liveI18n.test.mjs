import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'
import { parseExpression } from '@babel/parser'
import * as vue from 'vue'

const root = new URL('../src/views/wms/live/', import.meta.url)
const asModule = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const messagesSource = await readFile(new URL('../src/locales/live-payroll.js', import.meta.url), 'utf8')
const runtimeSource = (await readFile(new URL('../src/locales/runtime-map.js', import.meta.url), 'utf8'))
  .replace("import livePayrollMessages from './live-payroll'", messagesSource.replace('export default', 'const livePayrollMessages ='))
const runtime = await asModule(runtimeSource)
const shared = await asModule(await readFile(new URL('shared.js', root), 'utf8'))
const display = await asModule(await readFile(new URL('settlements/settlementDisplay.js', root), 'utf8'))
const i18nSource = (await readFile(new URL('useLiveI18n.js', root), 'utf8')).replace(/^import .*$/gm, '').replace('export function', 'function')
function languageContext(language = 'zh-cn') {
  const settings = vue.reactive({ language })
  const useLiveI18n = new Function('computed', 'h', 'useSettingsStore', 'translateExact', i18nSource + '\nreturn useLiveI18n')(
    vue.computed, vue.h, () => settings, runtime.translateExact)
  return { settings, useLiveI18n }
}
async function page(file, context, api = {}, extra = {}) {
  const { descriptor } = parse(await readFile(new URL(file, root), 'utf8'))
  const script = compileScript(descriptor, { id: 'live-i18n-test' }).content
  const component = new Function('modules', script
    .replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm, (_, names, name) => `const {${names.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(name)}]`)
    .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm, (_, local, name) => `const ${local} = modules[${JSON.stringify(name)}]`)
    .replace('export default', 'return'))({
      vue: { ...vue, onMounted() {}, onActivated() {}, getCurrentInstance: () => ({ proxy: { $modal: { msgSuccess() {}, msgWarning() {} } } }) },
      '../useLiveI18n': context,
      '../shared': shared,
      './settlementDisplay': display,
      '../components/LiveEmployeeSelect.vue': {},
      '../components/SpecialDetailsEditor.vue': {},
      './ManualAdjustmentDialog.vue': {},
      '@/api/wms/livePayroll': api,
      ...extra
    })
  return component.setup({}, { emit() {}, expose() {} })
}
async function vueFiles(dir = root) {
  const entries = await readdir(dir, { withFileTypes: true })
  const groups = await Promise.all(entries.map(e => e.isDirectory() ? vueFiles(new URL(e.name + '/', dir)) : e.name.endsWith('.vue') ? [new URL(e.name, dir)] : []))
  return groups.flat()
}

test('all live payroll templates compile and their UI translation keys have complete English text', async () => {
  const missing = new Set()
  for (const file of await vueFiles()) {
    const source = await readFile(file, 'utf8')
    const { descriptor, errors } = parse(source)
    assert.equal(errors.length, 0, file.pathname)
    compileScript(descriptor, { id: 'coverage' })
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file.pathname, id: 'coverage' }).errors, [])
    for (const match of source.matchAll(/\btr\('((?:\\.|[^'\\])*)'/g)) {
      const key = parseExpression("'" + match[1] + "'").value
      if (/[\u3400-\u9fff]/.test(runtime.translateExact(key, 'en'))) missing.add(key)
    }
    function check(node) {
      if (node.type === 2) assert.doesNotMatch(node.content, /[\u3400-\u9fff]/, file.pathname)
      for (const prop of node.props || []) {
        if (prop.type === 6 && ['label', 'title', 'placeholder', 'empty-text', 'description'].includes(prop.name)) {
          assert.doesNotMatch(prop.value?.content || '', /[\u3400-\u9fff]/, file.pathname)
        }
      }
      ;(node.children || []).forEach(check)
    }
    check(baseParse(descriptor.template.content))
  }
  assert.deepEqual([...missing], [])
})

test('language switches update validation and preserve user text during interpolation', async () => {
  const context = languageContext()
  const specials = await asModule(await readFile(new URL('components/specialDetails.js', root), 'utf8'))
  const form = await page('settlements/ManualAdjustmentDialog.vue', context, {}, { '../components/specialDetails': specials })
  assert.equal(form.rules.value.postingDate[0].message, '请选择入账日期')
  context.settings.language = 'en'
  assert.equal(form.rules.value.postingDate[0].message, 'Select a posting date')
  assert.equal(form.tr('确认删除 {0} {1} 的薪酬调整？', ['主播退款', '09/10/2026']), "Delete 主播退款's payroll adjustment dated 09/10/2026?")
  assert.equal(form.tr('用户备注：未结算，不要翻译'), '用户备注：未结算，不要翻译')
  const protectedMessage = context.useLiveI18n().messageNode('Delete 主播退款?')
  assert.equal(protectedMessage.props['data-runtime-i18n-ignore'], 'true')
  assert.equal(protectedMessage.children, 'Delete 主播退款?')
  context.settings.language = 'zh-cn'
  assert.equal(form.rules.value.postingDate[0].message, '请选择入账日期')
  assert.equal(form.tr('薪酬调整'), '薪酬调整')
})

test('settlement lists, snapshots and CSV switch languages without changing IDs, dates or saved notes', async () => {
  const context = languageContext()
  const exports = []
  const data = {
    streams: [{ id: '2090000000000000123', employeeId: '1', employeeName: '主播退款', streamDate: '2026-08-01', durationHours: 2, hourlyRate: 30, specialAmount: 0, totalAmount: 60 }],
    manualAdjustments: [{ id: '2', employeeId: '1', businessDate: '2026-08-02', postingDate: '2026-09-10', amount: 20, specialDetails: '[{"typeName":"自定义奖金","amount":20,"remark":"退款备注"}]', remark: '支付备注保留中文' }]
  }
  const snapshotJson = JSON.stringify(data)
  const model = await page('settlements/index.vue', context, {
    listSettlementCandidates: async () => ({ data }),
    getSettlement: async () => ({ data: { settlementNo: 'LP-1', employeeName: '主播退款', paymentReference: '转账凭据123', snapshotJson } })
  }, { '../shared': { ...shared, downloadCsv: (...args) => exports.push(args) } })
  await model.loadCandidates(); await model.showBatch('1')
  assert.equal(model.candidates.value[0].typeLabel, '开播')
  context.settings.language = 'en'
  assert.equal(model.candidates.value[0].typeLabel, 'Stream')
  assert.equal(model.candidates.value[0].description, '2 hours × 30; special amount 0')
  assert.equal(model.detailRows.value[1].typeLabel, 'Payroll adjustments')
  model.exportBatch()
  assert.ok(exports[0][1].some(h => h.label === 'Posting date'))
  assert.equal(exports[0][2][0].id, '2090000000000000123')
  assert.equal(exports[0][2][0].employeeName, '主播退款')
  assert.equal(exports[0][2][1].postingDate, '2026-09-10')
  assert.match(exports[0][2][1].description, /自定义奖金.*退款备注.*支付备注保留中文/)
  assert.equal(model.detail.batch.snapshotJson, snapshotJson)
  assert.equal(model.detail.batch.paymentReference, '转账凭据123')
  context.settings.language = 'zh-cn'
  assert.equal(model.detailRows.value[1].typeLabel, '薪酬调整')
  model.exportBatch()
  assert.ok(exports[1][1].some(h => h.label === '入账日期'))
})

test('adjustment export localizes source and status but retains query values and review notes', async () => {
  const context = languageContext('en'), exports = [], calls = []
  const model = await page('adjustments/index.vue', context, {
    exportPayrollAdjustments: async params => { calls.push(params); return { data: [{ kind: 'ADJUSTMENT', status: 'CONFIRMED', reason: '退款原因原文', reviewRemark: '审核原文' }] } }
  }, { '../shared': { ...shared, downloadCsv: (...args) => exports.push(args) } })
  model.query.kind = 'ADJUSTMENT'; model.query.status = 'CONFIRMED'
  await model.exportRows()
  assert.equal(calls[0].status, 'CONFIRMED')
  assert.equal(exports[0][0], 'Payroll adjustments.csv')
  assert.equal(exports[0][2][0].kindLabel, 'Post-settlement difference')
  assert.equal(exports[0][2][0].statusLabel, 'Ready to settle')
  assert.equal(exports[0][2][0].reason, '退款原因原文')
  assert.equal(exports[0][2][0].reviewRemark, '审核原文')
})

test('settings render saved names and descriptions verbatim even when they match translation keys', async () => {
  const { renderToString } = await import('@vue/server-renderer')
  const context = languageContext('en')
  const model = await page('settings/index.vue', context)
  model.rateTypes.value = [{ id: 1, typeName: '内容创作', description: '未结算', status: 0 }]
  model.specialTypes.value = [{ id: 2, typeName: '奖金', category: 'OTHER', status: 0 }]
  const { descriptor } = parse(await readFile(new URL('settings/index.vue', root), 'utf8'))
  const { code } = compileTemplate({ source: descriptor.template.content, filename: 'settings.vue', id: 'saved-content' })
  const render = new Function('Vue', code
    .replace(/^import \{([^}]+)\} from "vue"$/gm, (_, names) => `const {${names.replace(/\bas\b/g, ':')}} = Vue`)
    .replace('export function render', 'return function render'))(vue)
  async function html() {
    const app = vue.createSSRApp({ render: () => render(vue.proxyRefs(model), []) })
    const wrapper = { setup(_, { slots }) { return () => vue.h('div', [slots.header?.(), slots.default?.()]) } }
    app.component('ElCard', wrapper)
    app.component('ElTag', wrapper)
    app.component('ElButton', wrapper)
    app.component('ElSwitch', { render: () => null })
    app.component('ElDialog', { render: () => null })
    app.component('ElTable', {
      props: ['data'],
      setup(props, { slots }) {
        vue.provide('testRow', props.data[0])
        return () => vue.h('div', slots.default?.())
      }
    })
    app.component('ElTableColumn', {
      props: ['prop', 'label'],
      setup(props, { slots }) {
        const row = vue.inject('testRow')
        return () => vue.h('div', [props.label, slots.default ? slots.default({ row }) : row[props.prop]])
      }
    })
    return renderToString(app)
  }
  for (const language of ['en', 'zh-cn', 'en']) {
    context.settings.language = language
    const output = await html()
    for (const text of ['内容创作', '未结算', '奖金']) assert.ok(output.includes(text), `${language}: ${text}`)
    assert.ok(output.includes(language === 'en' ? 'Description' : '描述'))
  }
  assert.equal(model.rateTypes.value[0].description, '未结算')
  assert.equal(model.specialTypes.value[0].typeName, '奖金')
})
