<template>
  <el-dialog v-model="visible" :title="tr(isDelegating ? 'Show代处理' : '商品处理确认')" width="min(920px, 95vw)" append-to-body
    :show-close="!forced && !submitting" :close-on-click-modal="false" :close-on-press-escape="!forced && !submitting" :before-close="beforeClose">
    <template v-if="order">
      <el-alert :title="tr(isDelegating ? '正在代处理他人的Show，请填写原因并确认结果' : forced ? '展示已满30分钟，请确认商品处理结果' : '可提前确认商品处理结果')" :type="forced ? 'warning' : 'info'" :closable="false" show-icon />
      <p>{{ tr('单号') }}：{{ order.orderNo }}</p>
      <p>{{ tr('目标位置') }}：{{ order.targetLocationName }} · {{ tr('操作人') }}：{{ order.completedBy }}</p>
      <p v-if="!forced">{{ tr('剩余时间') }}：{{ remainingText }}</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="show-error" />
      <el-table :data="order.details || []" border>
        <el-table-column :label="tr('商品')" width="84"><template #default="{row}"><el-image v-if="thumbnail(row)" :src="thumbnail(row)" fit="contain" class="show-thumb" /><span v-else>{{ tr('暂无图片') }}</span></template></el-table-column>
        <el-table-column prop="skuCodeSnapshot" label="SKU" min-width="130" />
        <el-table-column :label="tr('来源位置')" prop="sourceLocationSnapshot" min-width="150" />
        <el-table-column :label="tr('处理结果')" min-width="250"><template #default="{row}"><el-radio-group v-model="choices[String(row.id)]" :disabled="submitting"><el-radio label="SOLD">sold</el-radio><el-radio label="RETURNED">{{ tr('货物已还回') }}</el-radio></el-radio-group></template></el-table-column>
      </el-table>
      <el-form v-if="isDelegating" label-position="top" class="delegation-form">
        <el-form-item :label="tr('代处理原因')" required>
          <el-input v-model="delegationReason" type="textarea" :rows="3" maxlength="500" show-word-limit :disabled="submitting" :placeholder="tr('请说明代处理原因（最多500个字符）')" />
        </el-form-item>
      </el-form>
      <el-checkbox v-if="hasReturns" v-model="responsible" :disabled="submitting" class="responsibility">{{ tr('我确认对还货结果负责') }}</el-checkbox>
      <p class="show-note">{{ tr('sold商品留在目标位置；确认还货的商品自动退回原位置。') }}</p>
    </template>
    <template #footer><el-button v-if="!forced" :disabled="submitting" @click="visible=false">{{ tr('取消') }}</el-button><el-button :disabled="submitting" @click="sync">{{ tr('刷新单据') }}</el-button><el-button type="primary" :loading="submitting" @click="submit">{{ tr('确认执行') }}</el-button></template>
  </el-dialog>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as api from '@/api/wms/roomTransfer'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { itemThumbnail as thumbnail, showResultsPayload } from '@/utils/liveShow'
const user=useUserStore(), settings=useSettingsStore(), tr=t=>translateByMap(t,settings.language || 'zh-cn')
const visible=ref(false), order=ref(), choices=ref({}), responsible=ref(false), error=ref(''), submitting=ref(false)
const submitError=ref(''), delegationReason=ref('')
const isDelegating=computed(()=>order.value?.showDelegationRequired === true)
const deadline=ref(0), now=ref(Date.now()), forced=ref(false)
const hasReturns=computed(()=>Object.values(choices.value).includes('RETURNED'))
const remainingText=computed(()=>{ const seconds=Math.max(0,Math.ceil((deadline.value-now.value)/1000)); return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0') })
const drafts=new Map()
let generation=0, polling=false, pollTimer, clockTimer
function remember() { if(order.value) drafts.set(String(order.value.id), {choices:{...choices.value}, responsible:responsible.value, delegationReason:delegationReason.value}) }
function display(next) {
  if(String(order.value?.id)!==String(next.id)) {
    submitError.value='';
    remember(); const saved=drafts.get(String(next.id)); choices.value=saved?.choices || {}; responsible.value=saved?.responsible || false; delegationReason.value=saved?.delegationReason || ''
  }
  order.value=next; deadline.value=Date.now()+Number(next.showRemainingMillis || 0); now.value=Date.now()
  forced.value=!next.showDelegationRequired && next.showStatus==='PENDING' && Number(next.showRemainingMillis || 0)<=0; visible.value=true
}
function notifyUpdated() { window.dispatchEvent(new CustomEvent('live-show:updated')) }
async function sync() {
  if(!user.token || !user.id || polling || submitting.value) return
  const ticket=generation; polling=true
  try {
    let pending=(await api.pendingShows()).data?.orders || []
    if(ticket!==generation || submitting.value) return
    if(visible.value && order.value) {
      const next=(await api.getShow(order.value.id)).data
      if(ticket!==generation || submitting.value) return
      if(next.showStatus==='PENDING') {
        if(pending.length && !forced.value && String(pending[0].id)!==String(next.id)) display(pending[0]); else display(next)
        error.value=submitError.value; return
      }
      pending=pending.filter(item=>String(item.id)!==String(next.id));submitError.value='';
      drafts.delete(String(next.id)); visible.value=false; order.value=undefined; notifyUpdated()
    }
    if(pending.length) display(pending[0])
    error.value=submitError.value
  } catch(e) { if(ticket===generation && visible.value) error.value=e.message || tr('无法刷新待处理单据，请重试') }
  finally { polling=false;if(ticket!==generation) sync() }
}
async function openRequested(event) {
  if(!user.token || !user.id || submitting.value || forced.value && visible.value) return
  const ticket=generation
  try { const next=(await api.getShow(event.detail)).data; if(ticket!==generation) return; if(next.showStatus==='PENDING') { display(next); submitError.value='';error.value='' } else notifyUpdated() }
  catch(e) { error.value=e.message || tr('无法读取show单据') }
}
async function submit() {
  if(submitting.value || !order.value) return
  let payload
  try { payload=showResultsPayload(order.value,choices.value,responsible.value,delegationReason.value) } catch(e) {error.value=tr(e.message);return}
  const ticket=generation; submitting.value=true; submitError.value='';error.value=''
  try {
    await api.resolveShow(order.value.id,payload)
    if(ticket!==generation) return
    drafts.delete(String(order.value.id)); visible.value=false; order.value=undefined; choices.value={}; responsible.value=false;delegationReason.value=''; notifyUpdated()
  } catch(e) {
    if(ticket!==generation) return
    submitError.value=e.message || tr('处理失败，请重试');error.value=submitError.value
    // 请求超时也可能已提交，重新获取状态；未处理时保留用户选择。
    try { const next=(await api.getShow(order.value.id)).data; if(ticket!==generation) return; if(next.showStatus==='RESOLVED') { drafts.delete(String(next.id));visible.value=false;order.value=undefined;notifyUpdated() } else display(next) } catch {}
  } finally { if(ticket===generation) {submitting.value=false;await sync()} }
}
function beforeClose(done) { if(!forced.value && !submitting.value) {remember();done()} }
function wake() { if(document.visibilityState!=='hidden') sync() }
watch(()=>[user.token,user.id],()=>{
  generation++; visible.value=false; order.value=undefined; choices.value={}; responsible.value=false;delegationReason.value=''; forced.value=false; submitting.value=false; submitError.value='';error.value=''; drafts.clear()
  clearInterval(pollTimer); clearInterval(clockTimer)
  if(user.token && user.id) {sync();pollTimer=setInterval(sync,30000);clockTimer=setInterval(()=>{now.value=Date.now();if(visible.value && order.value?.showStatus==='PENDING' && !order.value.showDelegationRequired && now.value>=deadline.value) forced.value=true},1000)}
},{immediate:true})
onMounted(()=>{window.addEventListener('live-show:process',openRequested);window.addEventListener('focus',wake);window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake)})
onBeforeUnmount(()=>{generation++;clearInterval(pollTimer);clearInterval(clockTimer);window.removeEventListener('live-show:process',openRequested);window.removeEventListener('focus',wake);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake)})
</script>
<style scoped>.delegation-form{margin-top:16px}.show-thumb{width:52px;height:52px}.show-error{margin:12px 0}.responsibility{margin-top:18px}.show-note{color:#909399;font-size:13px}</style>
