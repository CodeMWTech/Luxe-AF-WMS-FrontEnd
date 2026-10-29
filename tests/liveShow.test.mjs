import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url), vue=require('../node_modules/vue')
const {parse,compileScript}=require('../node_modules/@vue/compiler-sfc')
const helpersSource=fs.readFileSync(new URL('../src/utils/liveShow.js',import.meta.url),'utf8').replaceAll('export function','function')
function setup() {
 const calls=[],handlers={},events={},timers=[],watchers=[]
 const user=vue.reactive({token:'token',id:'20'})
 const context={...vue,console,Promise,Object,Map,Date,Math,String,Number,Error,
   document:{visibilityState:'visible',addEventListener:(e,h)=>events[e]=h,removeEventListener:()=>{}},
   window:{dispatchEvent:e=>calls.push({name:e.type}),addEventListener:(e,h)=>events[e]=h,removeEventListener:()=>{}},
   CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
   setInterval:(fn,delay)=>{timers.push({fn,delay});return timers.length},clearInterval:()=>{},
   useUserStore:()=>user,useSettingsStore:()=>({language:'zh-cn'}),translateByMap:t=>t,
   onMounted:fn=>fn(),onBeforeUnmount:fn=>{},watch:(source,cb,options)=>{watchers.push(cb);if(options?.immediate)cb()},
   api:new Proxy({},{get:(_,name)=>(...args)=>{calls.push({name,args});return Promise.resolve().then(()=>handlers[name]?.(...args) ?? {data:{orders:[]}})}})}
 vm.createContext(context);vm.runInContext(helpersSource,context);context.thumbnail=context.itemThumbnail
 const source=fs.readFileSync(new URL('../src/components/LiveShowReminder/index.vue',import.meta.url),'utf8')
 const script=compileScript(parse(source).descriptor,{id:'show-test'}).content.replace(/^import .*\r?\n/gm,'').replace('export default','globalThis.component =')
 vm.runInContext(script,context)
 const state=context.component.setup({}, {expose:()=>{}})
 const order={id:'80',orderNo:'RT-show',version:3,showStatus:'PENDING',showRemainingMillis:100000,details:[{id:'81',skuCodeSnapshot:'A'},{id:'82',skuCodeSnapshot:'B'}]}
 return {state,calls,handlers,events,timers,watchers,user,order,context}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
test('thumbnail chooses main thumbnail with original and missing-image fallback',()=>{
 const s=setup(),thumb=s.context.itemThumbnail
 assert.equal(thumb({item:{images:[{url:'other'},{isMain:true,url:'large',thumbUrl:'small'}]}}),'small')
 assert.equal(thumb({item:{images:[{url:'large'}]}}),'large');assert.equal(thumb({}),'')
})
test('resolution payload requires all choices and explicit return responsibility',()=>{
 const s=setup(),payload=s.context.showResultsPayload
 assert.throws(()=>payload(s.order,{'81':'SOLD'},false),/全部商品/)
 assert.throws(()=>payload(s.order,{'81':'SOLD','82':'RETURNED'},false),/负责/)
 const result=payload(s.order,{'81':'SOLD','82':'RETURNED'},true)
 assert.equal(result.version,3);assert.equal(result.items[1].detailId,'82')
})
test('login checks due shows and registers 30-second polling and wake listeners',async()=>{
 const s=setup();await flush();assert.ok(s.calls.some(c=>c.name==='pendingShows'));assert.ok(s.timers.some(t=>t.delay===30000))
 assert.ok(s.events.focus);assert.ok(s.events.online);assert.ok(s.events.visibilitychange);assert.ok(s.events['live-show:process'])
})
test('overdue queue forces the first order without defaulting item results',async()=>{
 const s=setup();await flush();s.handlers.pendingShows=()=>({data:{orders:[{...s.order,showRemainingMillis:0},{...s.order,id:'90',showRemainingMillis:0}]}})
 await s.state.sync();assert.equal(s.state.order.value.id,'80');assert.equal(s.state.forced.value,true);assert.equal(Object.keys(s.state.choices.value).length,0)
 let closed=false;s.state.beforeClose(()=>closed=true);assert.equal(closed,false)
})
test('early manual handling remains dismissible and becomes mandatory at deadline',async()=>{
 const s=setup();await flush();s.handlers.getShow=()=>({data:s.order});await s.events['live-show:process']({detail:'80'})
 assert.equal(s.state.visible.value,true);assert.equal(s.state.forced.value,false)
 let closed=false;s.state.beforeClose(()=>closed=true);assert.equal(closed,true)
 s.state.deadline.value=Date.now()-1;s.timers.find(t=>t.delay===1000).fn();assert.equal(s.state.forced.value,true)
})
test('failed submission preserves choices and responsibility for retry',async()=>{
 const s=setup();await flush();s.state.display(s.order);s.state.choices.value={'81':'SOLD','82':'RETURNED'};s.state.responsible.value=true
 s.handlers.resolveShow=()=>{throw Error('Network Error')};s.handlers.getShow=()=>({data:s.order})
 await s.state.submit();assert.equal(s.state.visible.value,true);assert.equal(s.state.choices.value['82'],'RETURNED');assert.equal(s.state.responsible.value,true);assert.ok(s.state.error.value.includes('Network'))
})
test('lost response reconciles resolved state without repeating the return request',async()=>{
 const s=setup();await flush();s.state.display(s.order);s.state.choices.value={'81':'SOLD','82':'SOLD'}
 s.handlers.resolveShow=()=>{throw Error('timeout')};s.handlers.getShow=()=>({data:{...s.order,showStatus:'RESOLVED'}})
 await s.state.submit();assert.equal(s.state.visible.value,false);assert.equal(s.calls.filter(c=>c.name==='resolveShow').length,1)
})
test('another session resolution closes the current order and advances due queue',async()=>{
 const s=setup();await flush();s.state.display({...s.order,showRemainingMillis:0})
 s.handlers.getShow=()=>({data:{...s.order,showStatus:'RESOLVED'}});s.handlers.pendingShows=()=>({data:{orders:[{...s.order,id:'90',showRemainingMillis:0}]}})
 await s.state.sync();assert.equal(s.state.order.value.id,'90');assert.equal(s.state.forced.value,true)
})
test('logout clears forced dialog and stale account selections',async()=>{
 const s=setup();await flush();s.state.display({...s.order,showRemainingMillis:0});s.state.choices.value={'81':'SOLD'}
 s.user.token='';s.user.id='';s.watchers[0]();assert.equal(s.state.visible.value,false);assert.equal(s.state.forced.value,false);assert.equal(Object.keys(s.state.choices.value).length,0)
})
test('late old-account reminder response cannot appear after logout',async()=>{
 const s=setup();await flush();let release;s.handlers.pendingShows=()=>new Promise(resolve=>release=resolve)
 const sync=s.state.sync();await flush();s.user.token='';s.user.id='';s.watchers[0]();release({data:{orders:[{...s.order,showRemainingMillis:0}]}})
 await sync;assert.equal(s.state.visible.value,false)
})

test('a stale pending snapshot cannot reopen an order resolved in another session',async()=>{
 const s=setup();await flush();s.state.display({...s.order,showRemainingMillis:0})
 s.handlers.pendingShows=()=>({data:{orders:[{...s.order,showRemainingMillis:0}]}})
 s.handlers.getShow=()=>({data:{...s.order,showStatus:'RESOLVED'}})
 await s.state.sync();assert.equal(s.state.visible.value,false)
})

test('delegated processing requires a trimmed reason and rejects more than 500 characters',()=>{
 const s=setup(),order={...s.order,showDelegationRequired:true},choices={'81':'SOLD','82':'RETURNED'}
 assert.throws(()=>s.context.showResultsPayload(order,choices,true,'   '),/代处理原因/)
 assert.throws(()=>s.context.showResultsPayload(order,choices,true,'a'.repeat(501)),/500/)
 const payload=s.context.showResultsPayload(order,choices,true,'  操作人已下班，主管核对实物后代确认  ')
 assert.equal(payload.delegationReason,'操作人已下班，主管核对实物后代确认')
 assert.equal(s.context.showResultsPayload(s.order,choices,true,'client-forged reason').delegationReason,undefined)
})
test('delegates can cancel overdue manual dialogs and must supply a reason before submission',async()=>{
 const s=setup();await flush();s.state.display({...s.order,showDelegationRequired:true,showRemainingMillis:0})
 assert.equal(s.state.isDelegating.value,true);assert.equal(s.state.forced.value,false)
 let closed=false;s.state.beforeClose(()=>closed=true);assert.equal(closed,true)
 s.timers.find(t=>t.delay===1000).fn();assert.equal(s.state.forced.value,false)
 s.state.choices.value={'81':'SOLD','82':'SOLD'};await s.state.submit()
 assert.ok(s.state.error.value.includes('代处理原因'));assert.equal(s.calls.filter(c=>c.name==='resolveShow').length,0)
})
test('delegation reason survives refresh and submission errors and clears when accounts change',async()=>{
 const s=setup();await flush();const delegated={...s.order,showDelegationRequired:true}
 s.state.display(delegated);s.state.choices.value={'81':'SOLD','82':'RETURNED'};s.state.responsible.value=true;s.state.delegationReason.value='Owner is unavailable'
 s.handlers.getShow=()=>({data:delegated});s.handlers.resolveShow=()=>{throw Error('Network Error')}
 await s.state.submit();assert.equal(s.calls.find(c=>c.name==='resolveShow').args[1].delegationReason,'Owner is unavailable')
 assert.equal(s.state.delegationReason.value,'Owner is unavailable');assert.equal(s.state.choices.value['82'],'RETURNED')
 s.user.token='';s.user.id='';s.watchers[0]();assert.equal(s.state.delegationReason.value,'')
})
test('successful delegated submission clears the reason for subsequent orders',async()=>{
 const s=setup();await flush();s.state.display({...s.order,showDelegationRequired:true});s.state.choices.value={'81':'SOLD','82':'SOLD'};s.state.delegationReason.value='Supervisor confirmed'
 s.handlers.resolveShow=()=>({data:{...s.order,showStatus:'RESOLVED'}})
 await s.state.submit();assert.equal(s.state.visible.value,false);assert.equal(s.state.delegationReason.value,'')
})
