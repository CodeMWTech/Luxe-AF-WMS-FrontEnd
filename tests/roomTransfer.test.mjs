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
  const script=compileScript(parse(source).descriptor,{id:'room-test'}).content.replace(/^import .*\r?\n/gm,'').replace('export default','globalThis.component =')
  const calls=[], messages=[], handlers={}
  const draft={id:'80',targetWarehouseId:'12',version:1,orderStatus:0,details:[{id:'81',skuCodeSnapshot:'A',quantity:1}],remark:''}
  const api=new Proxy({}, {get:(_,name)=>(...args)=>{calls.push({name,args});return Promise.resolve(handlers[name]?.(...args) ?? {data:{...draft},rows:[],total:0})}})
  const route={fullPath:'/inventory/room-transfer?token=abc',path:'/inventory/room-transfer',query:{token:'abc'}}
  const context={...vue,console,Object,Promise,setTimeout,api,useRoute:()=>route,useRouter:()=>({push:value=>{calls.push({name:'navigate',args:[value]});return Promise.resolve()},replace:value=>Promise.resolve()}),useUserStore:()=>({permissions,roles:[]}),useSettingsStore:()=>({language:'zh-cn'}),translateByMap:t=>t,getCurrentInstance:()=>({proxy:{download:()=>{}}}),onMounted:()=>{},watch:()=>{},ElMessage:Object.fromEntries(['success','warning'].map(name=>[name,text=>messages.push({name,text})])),ElMessageBox:{confirm:()=>Promise.resolve()}}
  vm.createContext(context);vm.runInContext(script,context)
  const state=context.component.setup({}, {expose:()=>{}});state.order.value={...draft};state.sku.value='A'
  return {state,calls,messages,handlers,route,draft}
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
