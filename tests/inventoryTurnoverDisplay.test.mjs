import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
const source = path => readFile(new URL('../src/' + path, import.meta.url), 'utf8')
const moduleFrom = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'))
const { formatTurnoverDays, turnoverExplanation } = await moduleFrom(await source('utils/inventoryTurnover.js'))
const mobile = await moduleFrom((await source('utils/mobileProduct.js')).replace("import { listShipmentOrder } from '@/api/wms/shipmentOrder'", 'const listShipmentOrder = async () => ({ rows: [] })'))
test('numeric days including same-day zero remain numeric', () => {
  assert.equal(formatTurnoverDays({turnoverDays: 0, turnoverStatus: 'CALCULABLE'}), 0)
  assert.equal(formatTurnoverDays({turnoverDays: 42}), 42)
})
test('non-sales state is readable and translatable, missing dates stay unknown', () => {
  const row = {turnoverDays: null, turnoverStatus: 'NON_SALES_OUTBOUND'}
  assert.equal(formatTurnoverDays(row), '非销售出库，无法统计')
  assert.equal(formatTurnoverDays(row, text => text === '非销售出库，无法统计' ? 'Non-sales outbound, cannot calculate' : text), 'Non-sales outbound, cannot calculate')
  for (const status of ['MISSING_RECEIPT','MISSING_PURCHASE','MISSING_SALES',null]) assert.equal(formatTurnoverDays({turnoverDays:null,turnoverStatus:status}), '--')
  assert.equal(formatTurnoverDays(undefined), '--')
})
test('mobile honors authoritative null and does not recompute from inventory or old dates', () => {
  const merged = mobile.mergeInventoryIntoDetail({turnoverDays: 99, receiptTime:'2026-01-01', shipmentTime:'2026-02-01', quantity:0}, {turnoverDays:null,turnoverStatus:'NON_SALES_OUTBOUND',receiptTime:null,shipmentTime:null})
  assert.equal(merged.turnoverDays,null)
  assert.equal(merged.receiptTime,null)
  assert.equal(merged.shipmentTime,null)
  assert.equal(formatTurnoverDays(merged),'非销售出库，无法统计')
  assert.equal(mobile.mergeInventoryIntoDetail({receiptTime:'2026-01-01',quantity:1},{}).turnoverDays, undefined)
})
test('mobile summary propagates status and raw history cannot infer purchase or sale', () => {
  const summary = mobile.summarizeInventoryRows([{quantity:0,turnoverDays:null,turnoverStatus:'NON_SALES_OUTBOUND'}])
  assert.equal(summary.turnoverStatus,'NON_SALES_OUTBOUND')
  const history = mobile.summarizeInventoryHistoryRows([{orderType:1,createTime:'2026-01-01',afterQuantity:1},{orderType:2,createTime:'2026-02-01',afterQuantity:0}])
  assert.equal(history.turnoverDays,undefined)
})
test('desktop table, PDF and mobile use the shared formatter', async () => {
  const desktop = await source('views/wms/inventory/statistic.vue')
  assert.match(desktop, /formatTurnoverDays\(row, tr\)/)
  assert.match(desktop, /escapeHtml\(formatTurnoverDays\(row, tr\)\)/)
  assert.match(await source('views/mobile/product-detail.vue'), /formatTurnoverDays\(item, tr\)/)
})

test('explanation uses independent global timestamps, not location display dates', () => {
  const lines = turnoverExplanation({ receiptTime:'2026-11-06', shipmentTime:'2026-11-09',
    turnoverStartTime:'2026-11-01 10:00:00', turnoverEndTime:'2026-11-10 15:00:00', turnoverEndType:'SALES_CLEARANCE' })
  assert.match(lines[0],/2026-11-01 10:00:00/)
  assert.match(lines[1],/2026-11-10 15:00:00/)
  assert.doesNotMatch(lines.join(),/2026-11-06|2026-11-09/)
  assert.match(turnoverExplanation({receiptTime:'2026-11-01'})[0],/--/)
})

test('current and snapshot endpoints show backend reporting date, not browser date or midnight', () => {
  for (const [type, label] of [['CURRENT_DATE','当前统计日期'],['SNAPSHOT_DATE','快照统计日期']]) {
    const lines=turnoverExplanation({turnoverEndTime:'2026-11-08 00:00:00',turnoverEndType:type})
    assert.match(lines[1],/2026-11-08/); assert.ok(lines[1].includes(label)); assert.doesNotMatch(lines[1],/00:00:00/)
  }
})

test('missing receipt, missing sales and non-sales have explicit explanations and translations', async () => {
  for (const [status,reason] of [['MISSING_RECEIPT','缺少有效入库记录'],['MISSING_SALES','缺少有效销售清零记录'],['NON_SALES_OUTBOUND','非销售出库，无法统计']]) {
    assert.ok(turnoverExplanation({turnoverStatus:status}).includes(reason))
    assert.ok(turnoverExplanation({turnoverStatus:status},text=>'translated:'+text).includes('translated:'+reason))
  }
  const {translateByMap}=await moduleFrom((await source('locales/runtime-map.js')).replace("import livePayrollMessages from './live-payroll'", (await source('locales/live-payroll.js')).replace('export default','const livePayrollMessages =')))
  const lines=turnoverExplanation({turnoverStatus:'MISSING_RECEIPT'},text=>translateByMap(text,'en'))
  assert.ok(lines.some(line=>line.includes('No Valid Inbound Record')))
  assert.equal(translateByMap('本库位首次入库时间','en'),'First Inbound at This Location')
})

test('mobile propagates calculation fields and clears stale explanation on missing or restricted data', () => {
  const row={quantity:0,warehouseName:'B',turnoverStartTime:'2026-11-01 10:00:00',turnoverEndTime:'2026-11-10 12:00:00',turnoverEndType:'SALES_CLEARANCE'}
  const summary=mobile.summarizeInventoryRows([row,{quantity:1,warehouseName:'C'}])
  assert.equal(summary.timeLocationName,'B')
  assert.equal(summary.turnoverEndTime,row.turnoverEndTime)
  const detail=mobile.mergeInventoryIntoDetail({},summary)
  assert.equal(detail.turnoverStartTime,row.turnoverStartTime)
  mobile.mergeInventoryIntoDetail(detail,{turnoverStartTime:null,turnoverEndTime:null,turnoverEndType:null})
  assert.equal(detail.turnoverStartTime,null); assert.equal(detail.turnoverEndTime,null)
  const history=mobile.summarizeInventoryHistoryRows([{orderType:1,createTime:'2026-01-01',afterQuantity:1}])
  assert.equal(history.turnoverStartTime,undefined)
  assert.equal(history.receiptTime,undefined)
  assert.equal(history.shipmentTime,undefined)
})

test('desktop and mobile expose independent calculation details and exports use explicit location names', async () => {
  const desktop=await source('views/wms/inventory/statistic.vue')
  assert.match(desktop,/turnoverExplanation\(row, tr\)/)
  assert.match(desktop,/tabindex="0"/)
  assert.match(desktop,/label: tr\('本库位首次入库时间'\)/)
  assert.match(desktop,/label: tr\('本库位最后出库时间'\)/)
  const view=await source('views/mobile/product-detail.vue')
  assert.match(view,/trigger="click"/)
  assert.match(view,/turnoverExplanation\(detail, tr\)/)
  const {WMS_EXPORT_HEADER_MAP}=await moduleFrom(await source('utils/xlsxTranslate.js'))
  assert.equal(WMS_EXPORT_HEADER_MAP['本库位最后出库时间'],'Last Outbound at This Location')
})

test('first actual inbound is a direct sortable column and PDF keeps both global and local dates', async () => {
  const desktop=await source('views/wms/inventory/statistic.vue')
  assert.match(desktop, /<el-table-column[^>]+prop="firstActualReceiptTime"[^>]+sortable="custom"/)
  assert.match(desktop, /formatTime\(row.firstActualReceiptTime\)/)
  assert.match(desktop, /key: 'firstActualReceiptTime', label: tr\('首次入库时间'\)/)
  assert.match(desktop, /firstActualReceiptTime: 'receipt'/)
  assert.match(desktop, /prop="receiptTime"/)
  assert.match(desktop, /prop="shipmentTime"/)
  const mobileView=await source('views/mobile/product-detail.vue')
  assert.match(mobileView, /label: tr\('首次入库时间'\), value: formatTime\(item.firstActualReceiptTime\)/)
  const {WMS_EXPORT_HEADER_MAP}=await moduleFrom(await source('utils/xlsxTranslate.js'))
  assert.equal(WMS_EXPORT_HEADER_MAP['首次入库时间'],'First Inbound Time')
})

test('mobile actual inbound survives hidden turnover and does not fall back to location or SKU creation', () => {
  const row={quantity:1,firstActualReceiptTime:'2026-11-01 10:00:00',receiptTime:'2026-11-06 10:00:00',turnoverStartTime:null,turnoverDays:null}
  const summary=mobile.summarizeInventoryRows([row])
  const detail=mobile.mergeInventoryIntoDetail({},summary)
  assert.equal(detail.firstActualReceiptTime,row.firstActualReceiptTime)
  assert.equal(detail.receiptTime,row.receiptTime)
  assert.equal(detail.turnoverStartTime,null)
  mobile.mergeInventoryIntoDetail(detail,{firstActualReceiptTime:null})
  assert.equal(detail.firstActualReceiptTime,null)
  const missing=mobile.mergeInventoryIntoDetail({receiptTime:'2026-11-06',createTime:'2026-10-01'},{})
  assert.equal(missing.firstActualReceiptTime,undefined)
  const history=mobile.summarizeInventoryHistoryRows([{orderType:1,createTime:'2026-11-01',afterQuantity:1}])
  assert.equal(history.firstActualReceiptTime,undefined)
})

test('first inbound and location inbound ranges submit separate filters for list and export and can be cleared', async () => {
  const view=await source('views/wms/inventory/statistic.vue')
  const body=view.slice(view.indexOf('const getCurrentQuery = () => {'),view.indexOf('const disableFutureSnapshotDate'))
  const state={value:{firstActualReceiptTimeRange:['2026-11-01 00:00:00','2026-11-02 23:59:59'],receiptTimeRange:['2026-11-06 00:00:00','2026-11-07 23:59:59']}}
  const query=new Function('queryParams','route','showCost','showSelling','formatDateTimeForQuery','filterNonZero','filterable',body+'; return getCurrentQuery;')(state,{query:{}},{value:true},{value:true},v=>v,{value:false},{value:false})
  const result=query()
  assert.equal(result.firstActualReceiptStartTime,'2026-11-01 00:00:00')
  assert.equal(result.firstActualReceiptEndTime,'2026-11-02 23:59:59')
  assert.equal(result.receiptStartTime,'2026-11-06 00:00:00')
  assert.equal(result.receiptEndTime,'2026-11-07 23:59:59')
  assert.equal(result.firstActualReceiptTimeRange,undefined)
  state.value.firstActualReceiptTimeRange=[]
  const cleared=query()
  assert.equal(cleared.firstActualReceiptStartTime,undefined)
  assert.equal(cleared.firstActualReceiptEndTime,undefined)
  assert.equal(cleared.receiptStartTime,'2026-11-06 00:00:00')
  assert.match(view,/prop="firstActualReceiptTimeRange"/)
  assert.match(view,/firstActualReceiptTimeRange: \[\]/)
})


test('cost and selling price filters share a dedicated row in that order', async () => {
  const view=await source('views/wms/inventory/statistic.vue')
  const row=view.match(/<el-row[^>]+class="query-price-row">([\s\S]*?)<\/el-row>/)
  assert.ok(row, 'price filters need a dedicated row')
  assert.match(row[0], /v-if="showCost \|\| showSelling"/)
  assert.match(row[1], /v-if="showCost"/)
  assert.match(row[1], /v-if="showSelling"/)
  assert.ok(row[1].indexOf('prop="costPriceMin"') >= 0)
  assert.ok(row[1].indexOf('prop="sellingPriceMin"') > row[1].indexOf('prop="costPriceMin"'))
  assert.equal((row[1].match(/<el-col /g) || []).length, 2)
  assert.doesNotMatch(row[1], /TimeRange/)
})
