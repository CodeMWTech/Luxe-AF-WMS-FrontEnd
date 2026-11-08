import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
const source = path => readFile(new URL('../src/' + path, import.meta.url), 'utf8')
const moduleFrom = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'))
const { formatTurnoverDays } = await moduleFrom(await source('utils/inventoryTurnover.js'))
const mobile = await moduleFrom((await source('utils/mobileProduct.js')).replace("import { listShipmentOrder } from '@/api/wms/shipmentOrder'", 'const listShipmentOrder = async () => ({ rows: [] })'))
test('numeric days including same-day zero remain numeric', () => {
  assert.equal(formatTurnoverDays({turnoverDays: 0, turnoverStatus: 'CALCULABLE'}), 0)
  assert.equal(formatTurnoverDays({turnoverDays: 42}), 42)
})
test('non-sales state is readable and translatable, missing dates stay unknown', () => {
  const row = {turnoverDays: null, turnoverStatus: 'NON_SALES_OUTBOUND'}
  assert.equal(formatTurnoverDays(row), '非销售出库，无法统计')
  assert.equal(formatTurnoverDays(row, text => text === '非销售出库，无法统计' ? 'Non-sales outbound, cannot calculate' : text), 'Non-sales outbound, cannot calculate')
  for (const status of ['MISSING_PURCHASE','MISSING_SALES',null]) assert.equal(formatTurnoverDays({turnoverDays:null,turnoverStatus:status}), '--')
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
