import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import * as vue from 'vue'

async function sourceModule(path) {
  const source=await readFile(new URL(path,import.meta.url),'utf8')
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
}
const shared=await sourceModule('../src/views/wms/live/shared.js')
const display=await sourceModule('../src/views/wms/live/settlements/settlementDisplay.js')
async function setup(file, modules, props={}) {
  const source=await readFile(new URL('../src/views/wms/live/'+file,import.meta.url),'utf8')
  const {descriptor}=parse(source)
  const compiled=compileScript(descriptor,{id:'payroll-test'}).content
  const create=new Function('modules',compiled
    .replace(/^import \{([^}]+)\} from ['"]([^'"]+)['"];?$/gm,(_,bindings,name)=>`const {${bindings.replace(/\bas\b/g,':')}} = modules[${JSON.stringify(name)}]`)
    .replace(/^import (\w+) from ['"]([^'"]+)['"];?$/gm,(_,binding,name)=>`const ${binding} = modules[${JSON.stringify(name)}]`)
    .replace('export default','return'))
  return create(modules).setup(props,{expose(){},emit(){}})
}
const vueModule={...vue,onMounted(){},onActivated(){},getCurrentInstance:()=>({proxy:{$modal:{msgSuccess(){},msgWarning(){}},$prompt:async()=>({value:'receipt'})}})}

test('dual-week calendar handles Sunday, Saturday, year boundaries and leap day',()=>{
  assert.deepEqual(shared.twoWeekRange('2026-09-06'),['2026-09-06','2026-09-19'])
  assert.deepEqual(shared.twoWeekRange('2026-09-12'),['2026-09-06','2026-09-19'])
  assert.deepEqual(shared.twoWeekRange('2026-12-31'),['2026-12-27','2027-01-09'])
  assert.deepEqual(shared.twoWeekRange('2028-02-29'),['2028-02-27','2028-03-11'])
})
test('calendar fetch and export both use the full visible fourteen days and employee scope',async()=>{
  const calls={query:null,export:null}
  const page=await setup('schedule/index.vue',{
    vue:vueModule,
    '../components/LiveEmployeeSelect.vue':{},'../components/LiveEmployeeName.vue':{},
    '@/api/wms/livePayroll':{getLiveOptions:async()=>({employees:[],accounts:[],rateTypes:[]}),listScheduleCalendar:async q=>{calls.query=q;return{data:[{scheduleDate:'2026-09-06',employeeName:'A'},{scheduleDate:'2026-09-19',employeeName:'B'}]}}},
    '@/store/modules/settings':()=>({language:'zh-cn'}),'@/locales/runtime-map':{translateByMap:t=>t},
    '../shared':{...shared,downloadCsv:(...args)=>{calls.export=args}}
  })
  page.selectedWeek.value='2026-09-08';page.query.employeeScope='INACTIVE'
  await page.load()
  assert.equal(page.calendarWeeks.value.length,2)
  assert.deepEqual(page.calendarWeeks.value.map(w=>w.length),[7,7])
  assert.equal(calls.query.startDate,'2026-09-06');assert.equal(calls.query.endDate,'2026-09-19')
  assert.equal(calls.query.employeeScope,'INACTIVE')
  page.exportRows()
  assert.equal(calls.export[2].length,2)
  assert.ok(calls.export[0].includes('2026-09-19'))
})
test('employee picker hides inactive staff by default but preserves history selection',async()=>{
  const employees=[{value:'1',label:'A',employeeStatus:0},{value:'2',label:'B',employeeStatus:1},{value:'3',label:'C',employeeStatus:2},{value:'4',label:'D',employeeStatus:3}]
  const props={employees,modelValue:null}
  const page=await setup('components/LiveEmployeeSelect.vue',{vue:vueModule,'../shared':shared},props)
  assert.deepEqual(page.visibleEmployees.value.map(e=>e.value),['1','2'])
  page.includeInactive.value=true
  assert.equal(page.visibleEmployees.value.length,4)
  assert.equal(shared.liveEmployeeOptionLabel(employees[2]),'C · 已归档')
  assert.equal(shared.liveEmployeeOptionLabel(employees[3]),'D · 已归档')
  const editPage=await setup('components/LiveEmployeeSelect.vue',{vue:vueModule,'../shared':shared},{employees,modelValue:'3'})
  assert.ok(editPage.visibleEmployees.value.some(e=>e.value==='3'))
})
test('settlement selects exact typed source IDs without losing large integer IDs',()=>{
  const large='2090000000000000123'
  const rows=display.flattenSettlement({
    streams:[{id:large,streamDate:'2026-08-01',totalAmount:'200.00',settlementStatus:'OPEN'}],
    commissions:[{id:large,orderDate:'2026-08-01',commissionAmount:'30.00',status:'NORMAL',settlementStatus:'OPEN'}],
    adjustments:[{id:'9',streamDate:'2026-08-01',postingDate:'2026-09-01',amount:'-30.00',status:'CONFIRMED'}]
  })
  assert.equal(new Set(rows.map(r=>r.key)).size,3)
  assert.deepEqual(display.selectedSettlementIds([rows[0],rows[2]]),{streamIds:[large],commissionIds:[],adjustmentIds:['9']})
  assert.equal(rows[2].businessDate,'2026-08-01');assert.equal(rows[2].postingDate,'2026-09-01')
})
test('settlement sends no write before confirmation, keeps request identity after network failure',async()=>{
  const calls=[], states={fail:true}
  const snapshot={streams:[{id:'50',employeeId:'1',employeeName:'主播 A',streamDate:'2026-08-01',totalAmount:200,settlementStatus:'OPEN'}],commissions:[],adjustments:[],streamAmount:200,commissionAmount:0,adjustmentAmount:0,totalAmount:200,token:'preview-token'}
  const page=await setup('settlements/index.vue',{
    vue:vueModule,'../components/LiveEmployeeSelect.vue':{},'../shared':shared,'./settlementDisplay':display,
    '@/api/wms/livePayroll':{
      getLiveOptions:async()=>({employees:[]}),listSettlementCandidates:async()=>({data:snapshot}),previewSettlement:async()=>({data:snapshot}),
      confirmSettlement:async body=>{calls.push(body);if(states.fail)throw new Error('Network failure')},
      listSettlements:async()=>({rows:[],total:0})
    }
  })
  page.query.employeeId='1';page.dateRange.value=['2026-08-01','2026-08-31']
  page.selection.value=display.flattenSettlement(snapshot)
  await page.prepare()
  assert.equal(calls.length,0)
  page.review.remark='已核对付款明细'
  await assert.rejects(page.submit(),/Network failure/)
  assert.equal(page.review.open,true);assert.equal(page.review.saving,false)
  states.fail=false;await page.submit()
  assert.equal(calls.length,2);assert.equal(calls[0].requestKey,calls[1].requestKey)
  assert.equal(calls[0].token,'preview-token')
  assert.deepEqual(calls[0].streamIds,['50']);assert.deepEqual(calls[0].commissionIds,[])
  assert.equal(page.review.open,false)
})
test('settled originals and unconfirmed adjustments cannot enter settlement confirmation',async()=>{
  let requests=0
  const page=await setup('settlements/index.vue',{
    vue:vueModule,'../components/LiveEmployeeSelect.vue':{},'../shared':shared,'./settlementDisplay':display,
    '@/api/wms/livePayroll':{previewSettlement:async()=>{requests++;return{data:{}}}}
  })
  for (const row of [{type:'STREAM',id:'50',status:'SETTLED'}, {type:'ADJUSTMENT',id:'70',status:'PENDING'}, {type:'STREAM',id:'50',status:'CONFIRMED'}]) {
    page.selection.value=[row]
    await page.prepare()
    assert.equal(requests,0);assert.equal(page.review.open,false)
  }
})

test('settlement opens with all employees and dates, preserves employee identity and resets filters',async()=>{
  let mounted
  const calls=[]
  const snapshot={streams:[{id:'1',employeeId:'10',employeeName:'主播 A',streamDate:'2025-01-02',totalAmount:200,settlementStatus:'OPEN'}],commissions:[],adjustments:[]}
  const page=await setup('settlements/index.vue',{
    vue:{...vueModule,onMounted:callback=>{mounted=callback}},
    '../components/LiveEmployeeSelect.vue':{},'../shared':shared,'./settlementDisplay':display,
    '@/api/wms/livePayroll':{
      getLiveOptions:async()=>({employees:[]}),
      listSettlementCandidates:async params=>{calls.push(['candidates',params]);return {data:snapshot}},
      listSettlements:async params=>{calls.push(['batches',params]);return {rows:[],total:0}}
    }
  })
  await mounted()
  const initial=calls.find(call=>call[0]==='candidates')[1]
  assert.equal(initial.employeeId,null);assert.equal(initial.startDate,undefined);assert.equal(initial.endDate,undefined)
  assert.equal(page.candidates.value[0].employeeName,'主播 A')
  assert.equal(calls.find(call=>call[0]==='batches')[1].employeeId,null)
  page.query.employeeId='10';page.dateRange.value=['2025-01-01','2025-01-31']
  await page.loadCandidates()
  assert.deepEqual(calls.at(-1)[1],{employeeId:'10',startDate:'2025-01-01',endDate:'2025-01-31'})
  await page.resetQuery()
  assert.equal(page.query.employeeId,null);assert.equal(page.dateRange.value,null)
  assert.equal(page.candidates.value.length,1)
})
test('all-employee settlement uses selected employee and posting dates and rejects mixed employees',()=>{
  const employeeId='2090000000000000123'
  const rows=display.flattenSettlement({
    streams:[{id:'1',employeeId,streamDate:'2026-07-02'}],
    adjustments:[{id:'2',employeeId,streamDate:'2026-06-01',postingDate:'2026-08-15'}]
  })
  assert.deepEqual(display.selectedSettlementScope(rows,null),{employeeId,startDate:'2026-07-02',endDate:'2026-08-15'})
  assert.deepEqual(display.selectedSettlementScope(rows,['2026-07-01','2026-08-31']),{employeeId,startDate:'2026-07-01',endDate:'2026-08-31'})
  assert.throws(()=>display.selectedSettlementScope([...rows,{employeeId:'999',businessDate:'2026-07-03'}]),/同一主播/)
})
test('adjustments default to all types, statuses and dates and export the same scope',async()=>{
  let mounted
  const calls={list:[],export:[]}, csv=[]
  const records=[{id:'1',kind:'ADJUSTMENT',status:'PENDING'},{id:'2',kind:'RECALC',status:'APPLIED'}]
  const page=await setup('adjustments/index.vue',{
    vue:{...vueModule,onMounted:callback=>{mounted=callback}},'../components/LiveEmployeeSelect.vue':{},
    '../shared':{...shared,downloadCsv:(...args)=>csv.push(args)},
    '@/api/wms/livePayroll':{
      getLiveOptions:async()=>({employees:[]}),
      listPayrollAdjustments:async params=>{calls.list.push(params);return {rows:records,total:2}},
      exportPayrollAdjustments:async params=>{calls.export.push(params);return {data:records}}
    }
  })
  await mounted()
  assert.equal(calls.list[0].employeeId,null);assert.equal(calls.list[0].kind,null);assert.equal(calls.list[0].status,null)
  assert.equal(calls.list[0].startDate,undefined);assert.equal(calls.list[0].endDate,undefined)
  assert.equal(page.rows.value.length,2);assert.ok(page.statuses.value.includes('APPLIED'))
  await page.exportRows()
  assert.deepEqual(calls.export[0],calls.list[0])
  assert.deepEqual(csv[0][2].map(row=>row.kindLabel),['结算后差额','未结算重算历史'])
  page.query.kind='RECALC';page.query.status='APPLIED';page.query.pageNum=3
  assert.deepEqual(page.statuses.value,['APPLIED'])
  await page.resetQuery()
  assert.equal(calls.list.at(-1).kind,null);assert.equal(calls.list.at(-1).status,null);assert.equal(calls.list.at(-1).pageNum,1)
})
