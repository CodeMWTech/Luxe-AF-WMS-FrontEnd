import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const vue=require('../node_modules/vue')
const {parse,compileScript}=require('../node_modules/@vue/compiler-sfc')

function setup(permissions=['wms:roomTransfer:operate','wms:roomTransfer:list']) {
  const source=fs.readFileSync(new URL('../src/views/wms/inventory/room-transfer/index.vue',import.meta.url),'utf8')
  const script=compileScript(parse(source).descriptor,{id:'room-test'}).content.replace(/^import .*\r?\n/gm,'').replace('export default','globalThis.component =').replace("await import('@/api/wms/warehouse')",'await warehouseApi')
  const calls=[], messages=[], handlers={}, hooks={}
  const nodes=[{id:'10',warehouseLevel:1,status:0,delFlag:0},{id:'12',parentId:'10',warehouseLevel:2,status:0,delFlag:0}]
  const draft={id:'80',targetWarehouseId:'12',version:1,orderStatus:0,details:[{id:'81',skuCodeSnapshot:'A',quantity:1}],remark:''}
  const api=new Proxy({}, {get:(_,name)=>(...args)=>{calls.push({name,args});return Promise.resolve(handlers[name]?.(...args) ?? {data:{...draft},rows:[],total:0})}})
  const route={fullPath:'/inventory/room-transfer?token=abc',path:'/inventory/room-transfer',query:{token:'abc'}}
  const context={...vue,console,Object,Promise,setTimeout,api,warehouseApi:{historicalLocations:async()=>({data:nodes})},useRoute:()=>route,useRouter:()=>({push:value=>{calls.push({name:'navigate',args:[value]});return Promise.resolve()},replace:value=>Promise.resolve()}),useUserStore:()=>({permissions,roles:[]}),useSettingsStore:()=>({language:'zh-cn'}),translateByMap:t=>t,getCurrentInstance:()=>({proxy:{download:()=>{}}}),onMounted:callback=>{hooks.mounted=callback},watch:(_,callback)=>{hooks.routeChanged=callback},ElMessage:Object.fromEntries(['success','warning'].map(name=>[name,text=>messages.push({name,text})])),ElMessageBox:{confirm:()=>Promise.resolve()}}
  vm.createContext(context);vm.runInContext(script,context)
  const state=context.component.setup({}, {expose:()=>{}});state.order.value={...draft};state.sku.value='A'
  return {state,calls,messages,handlers,route,draft,hooks,nodes,warehouseApi:context.warehouseApi}
}

test('single candidate adds once, uses server version and returns focus-ready empty input',async()=>{
  const s=setup();s.handlers.scanTransfer=()=>({data:{added:true,message:'已添加',order:{...s.draft,version:2,details:[...s.draft.details,{id:'82',skuCodeSnapshot:'B'}]}}})
  await s.state.scan();assert.equal(s.state.order.value.version,2);assert.equal(s.state.order.value.details.length,2);assert.equal(s.state.sku.value,'');assert.equal(s.calls[0].args[1].version,1)
})
test('multiple candidates retain SKU until operator selects an inventory record',async()=>{
  const s=setup();s.handlers.scanTransfer=(_,bo)=>bo.inventoryId?{data:{added:true,order:{...s.draft,version:2},message:'已添加'}}:{data:{candidates:[{id:'901'},{id:'902'}]}}
  await s.state.scan();assert.equal(s.state.candidateVisible.value,true);assert.equal(s.state.sku.value,'A');assert.equal(s.state.order.value.version,1)
  await s.state.choose({id:'902'});assert.equal(s.calls[1].args[1].inventoryId,'902');assert.equal(s.state.candidateVisible.value,false)
})
test('duplicate or target-only results preserve detail rows and consume scanner input',async()=>{
  const s=setup();s.handlers.scanTransfer=()=>({data:{added:false,message:'商品已在当前房间'}})
  await s.state.scan();assert.equal(s.state.order.value.details.length,1);assert.equal(s.state.sku.value,'');assert.equal(s.messages[0].name,'warning')
})
test('conflict result keeps the server draft and all conflict data',async()=>{
  const s=setup();s.handlers.saveTransfer=(_,bo)=>({data:{...s.draft,version:2}})
  s.handlers.completeTransfer=()=>({data:{completed:false,message:'整单未执行',order:{...s.draft,version:3,details:[{...s.draft.details[0],conflictReason:'已移动'}]},conflicts:[{detailId:'81',currentLocations:[{id:'1001',locationName:'Other'}]}]}})
  await s.state.complete();assert.equal(s.state.order.value.orderStatus,0);assert.equal(s.state.order.value.details.length,1);assert.equal(s.state.conflicts.value.length,1);assert.equal(s.state.conflictMap.value['81'].currentLocations[0].locationName,'Other');assert.equal(s.calls.find(c=>c.name==='completeTransfer').args[1].version,2)
})
test('deleting a conflict retains other IDs and server-owned snapshots',async()=>{
  const s=setup();s.state.order.value.details.push({id:'82',sourceVersionSnapshot:99});s.state.conflicts.value=[{detailId:'81'}]
  s.handlers.saveTransfer=(_,bo)=>({data:{...s.draft,version:2,details:[{id:'82',sourceVersionSnapshot:99}]}})
  await s.state.remove({id:'81'});assert.deepEqual(Array.from(s.calls[0].args[1].detailIds),['82']);assert.equal(s.state.order.value.details[0].sourceVersionSnapshot,99);assert.equal(s.state.conflicts.value.length,0)
})
test('without operation permission scanner requests are not issued',async()=>{
  const s=setup(['wms:roomTransfer:list']);assert.equal(s.state.editable.value,false);await s.state.scan();assert.equal(s.calls.length,0)
})
test('old-version save rejection preserves current rows and clears busy state',async()=>{
  const s=setup();s.handlers.saveTransfer=()=>{throw new Error('旧版本')}
  await assert.rejects(s.state.save(),/旧版本/);assert.equal(s.state.order.value.details.length,1);assert.equal(s.state.busy.value,false)
})

function mobileContext(mobile) {
  const code=fs.readFileSync(new URL('../src/utils/mobileDevice.js',import.meta.url),'utf8').replace(/^export /gm,'')
  const context={navigator:{userAgent:mobile?'iPhone':'Desktop',platform:'Win32',maxTouchPoints:0},window:{innerWidth:mobile?390:1200,matchMedia:()=>({matches:mobile})},decodeURIComponent,encodeURIComponent};vm.createContext(context);vm.runInContext(code,context);return context
}
for(const mobile of [false,true]) test(`QR token and draft ID survive login and viewport routing (${mobile?'mobile':'desktop'})`,()=>{
  const c=mobileContext(mobile),url='/inventory/room-transfer?token=abc_123&id=80'
  assert.equal(c.getLoginRedirectForPath(url),`/login?redirect=${encodeURIComponent(url)}`);assert.equal(c.resolvePostLoginRedirect(encodeURIComponent(url)),url);assert.equal(c.getViewportMismatchRedirect('/inventory/room-transfer','/login'),null)
})
test('existing mobile landing and desktop landing remain compatible',()=>{
  assert.equal(mobileContext(true).resolvePostLoginRedirect('/'),'/sku-search');assert.equal(mobileContext(false).resolvePostLoginRedirect('/'),'/')
})

test('execution failure refreshes persisted failed state instead of keeping editable draft',async()=>{
  const s=setup();s.handlers.saveTransfer=()=>({data:{...s.draft,version:2}})
  s.handlers.completeTransfer=()=>{throw new Error('系统执行异常，整单库存已回滚，请联系管理员核查')}
  s.handlers.getTransfer=()=>({data:{...s.draft,version:3,orderStatus:2,lastFailureReason:'整单库存已回滚'}})
  await assert.rejects(s.state.complete(),/系统执行异常/)
  assert.equal(s.state.order.value.orderStatus,2);assert.equal(s.state.editable.value,false);assert.equal(s.state.busy.value,false)
})

test('lost completion response reconciles server-completed state without repeating stock operation',async()=>{
  const s=setup();s.handlers.saveTransfer=()=>({data:{...s.draft,version:2}})
  s.handlers.completeTransfer=()=>{throw new Error('timeout')}
  s.handlers.getTransfer=()=>({data:{...s.draft,version:3,orderStatus:1}})
  await assert.rejects(s.state.complete(),/timeout/)
  assert.equal(s.state.order.value.orderStatus,1);assert.equal(s.calls.filter(c=>c.name==='completeTransfer').length,1)
})

test('refresh reevaluates destination availability and blocks newly disabled room',async()=>{
  const s=setup();s.nodes[1].status=1;s.handlers.getTransfer=()=>({data:{...s.draft}})
  await s.state.reload();assert.ok(s.state.invalid.value.includes('停用'));assert.equal(s.state.editable.value,false)
  s.nodes[1].status=0;await s.state.reload();assert.equal(s.state.invalid.value,'');assert.equal(s.state.editable.value,true)
})

test('candidate selection is retained while another request is busy',async()=>{
  const s=setup();s.state.candidateVisible.value=true;s.state.busy.value=true
  await s.state.choose({id:'902'});assert.equal(s.state.candidateVisible.value,true);assert.equal(s.calls.length,0)
})

test('create, scan, save and complete use the persisted draft and latest versions',async()=>{
  const s=setup();s.state.order.value=undefined;s.state.sku.value=''
  s.handlers.resolveRoom=()=>({data:{id:'12',locationName:'Office / target'}})
  let saved={...s.draft,version:0,details:[]}
  s.handlers.createTransfer=()=>({data:saved});s.handlers.getTransfer=()=>({data:saved})
  s.handlers.scanTransfer=(_,bo)=>({data:{added:true,message:'已添加',order:saved={...saved,version:1,details:[{id:'81',skuCodeSnapshot:bo.skuCode,quantity:1}]}}})
  s.handlers.saveTransfer=(_,bo)=>({data:saved={...saved,version:saved.version+1,remark:bo.remark}})
  s.handlers.completeTransfer=(_,bo)=>({data:{completed:true,message:'调货完成',order:saved={...saved,version:bo.version+1,orderStatus:1}}})
  await s.state.init();assert.equal(s.state.target.value.id,'12')
  await s.state.create();s.state.sku.value='A';await s.state.scan();s.state.remark.value='verified';await s.state.save();await s.state.complete()
  assert.equal(s.state.order.value.orderStatus,1);assert.equal(s.state.order.value.details.length,1);assert.equal(s.state.editable.value,false)
  assert.equal(s.calls.find(c=>c.name==='completeTransfer').args[1].version,3)
})

test('unknown completion result keeps details but blocks further writes until refresh',async()=>{
  const s=setup();s.handlers.saveTransfer=()=>({data:{...s.draft,version:2}})
  s.handlers.completeTransfer=()=>{throw new Error('timeout')};s.handlers.getTransfer=()=>{throw new Error('Network Error')}
  await assert.rejects(s.state.complete(),/timeout/)
  assert.equal(s.state.order.value.details.length,1);assert.equal(s.state.editable.value,false);assert.ok(s.state.invalid.value.includes('刷新'))
  s.handlers.getTransfer=()=>({data:{...s.draft,version:3,orderStatus:1}});await s.state.reload();assert.equal(s.state.order.value.orderStatus,1);assert.equal(s.state.invalid.value,'')
})

test('destination lookup failure blocks writes until a successful refresh',async()=>{
  const s=setup();s.warehouseApi.historicalLocations=()=>{throw new Error('Network Error')}
  await assert.rejects(s.state.reload(),/Network Error/);assert.equal(s.state.editable.value,false);assert.ok(s.state.invalid.value.includes('刷新'))
})
