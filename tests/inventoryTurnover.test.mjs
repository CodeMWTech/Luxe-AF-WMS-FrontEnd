import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'

const source = path => readFile(new URL('../src/' + path, import.meta.url), 'utf8')
const asModule = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'))
const payrollMessages = await source('locales/live-payroll.js')
const translations = await asModule((await source('locales/runtime-map.js')).replace(
  "import livePayrollMessages from './live-payroll'", payrollMessages.replace('export default', 'const livePayrollMessages =')))
const settings = vue.reactive({ language: 'zh-cn' })
const { descriptor } = parse(await source('views/dashboard/charts.vue'))
const compiled = compileScript(descriptor, { id: 'inventory-turnover-test' }).content
const component = new Function('modules', compiled.replace(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g, (_, names, name) => {
  if (names.trim().startsWith('* as ')) return `const ${names.trim().slice(5)} = modules[${JSON.stringify(name)}]`
  if (names.trim().startsWith('{')) return `const ${names.replace(/\bas\b/g, ':')} = modules[${JSON.stringify(name)}]`
  return `const ${names.trim()} = modules[${JSON.stringify(name)}]`
}).replace('export default', 'return'))({
  vue: { ...vue, onMounted(){}, onBeforeUnmount(){}, watch(){} },
  echarts: {}, '@element-plus/icons-vue': {},
  '@/store/modules/settings': () => settings,
  '@/locales/runtime-map': translations,
  '@/utils/laTime': { formatDateForQuery: value => value },
  '@/api/wms/analytics': {}
})
const page = () => component.setup({}, { expose(){} })

test('turnover fills missing buckets and keeps 1-45, 46-90, over-90 quantities and percentages', () => {
  settings.language = 'zh-cn'
  const model = page()
  model.turnoverDistList.value = [{rangeLabel:'90+',quantity:30},{rangeLabel:'1-45',quantity:70}]
  assert.deepEqual(model.turnoverRows.value.map(row => [row.label,row.value,row.rate]), [
    ['1-45天',70,'70'],['46-90天',0,'0'],['90天以上',30,'30']
  ])
  assert.deepEqual(model.turnoverRows.value.map(row => row.tagType), ['success','warning','danger'])
  assert.equal(model.slowMovingInsight.value.type,'warning')
  assert.match(model.slowMovingInsight.value.text,/90天以上库存占比达到30%/)
  settings.language = 'en'
  assert.deepEqual(model.turnoverRows.value.map(row => row.label), ['1-45 days','46-90 days','Over 90 days'])
  assert.match(model.slowMovingInsight.value.text,/inventory older than 90 days has reached 30%/)
  assert.doesNotMatch(model.slowMovingInsight.value.text,/15\+/)
})

test('healthy, warning and alert insights all use the over-90 bucket', () => {
  settings.language = 'zh-cn'
  const model = page()
  for (const [slow,expected] of [[24,'success'],[25,'warning'],[49,'warning'],[50,'danger']]) {
    model.turnoverDistList.value = [{rangeLabel:'1-45',quantity:100-slow},{rangeLabel:'90+',quantity:slow}]
    assert.equal(model.slowMovingInsight.value.type,expected)
    assert.match(model.slowMovingInsight.value.text,/90天以上/)
    assert.doesNotMatch(model.slowMovingInsight.value.text,/15天以上/)
  }
  model.turnoverDistList.value=[]
  assert.deepEqual(model.turnoverRows.value.map(row=>[row.value,row.rate,row.width]), [[0,'0',0],[0,'0',0],[0,'0',0]])
})

test('Purchaser translations cover filters and validation while Excel supports old header aliases', async () => {
  assert.equal(translations.translateByMap('采购人','en'),'Purchaser')
  assert.equal(translations.translateByMap('请输入采购人','en'),'Enter purchaser')
  assert.equal(translations.translateByMap('请输入采购人关键字','en'),'Please enter purchaser keywords')
  assert.equal(translations.translateByMap('采购人不能为空','en'),'Purchaser cannot be empty')
  const { WMS_EXPORT_HEADER_MAP } = await asModule(await source('utils/xlsxTranslate.js'))
  for (const header of ['采购人','寄售信息','寄卖信息']) assert.equal(WMS_EXPORT_HEADER_MAP[header],'Purchaser')
})
