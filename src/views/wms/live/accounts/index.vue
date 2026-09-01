<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>{{ tr('直播平台管理') }}</h2><p>{{ tr('管理平台店铺在主播薪酬模块中的直播平台代号与显示名') }}</p></div><div class="live-actions"><el-button @click="sync">{{ tr('同步授权店铺') }}</el-button><el-button type="primary" @click="openDialog()">{{ tr('新增直播平台') }}</el-button></div></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item><el-input v-model="query.keyword" class="account-keyword-input" clearable :placeholder="tr('搜索代号或显示名称')" @keyup.enter="load" /></el-form-item><el-form-item :label="tr('状态')"><el-select v-model="query.status" clearable :placeholder="tr('全部状态')"><el-option :label="tr('启用')" :value="0" /><el-option :label="tr('停用')" :value="1" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">{{ tr('查询') }}</el-button></el-form-item></el-form></el-card>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="platform" :label="tr('所属平台')" min-width="130" /><el-table-column prop="accountCode" :label="tr('直播平台代号')" min-width="170"><template #default="s"><el-tag class="type-tag">{{ s.row.accountCode }}</el-tag></template></el-table-column><el-table-column prop="displayName" :label="tr('显示名称')" min-width="150" /><el-table-column prop="platformShopName" :label="tr('关联授权店铺')" min-width="190" /><el-table-column :label="tr('状态')" min-width="120"><template #default="s"><el-tag :type="s.row.status===0?'success':'info'">{{ tr(s.row.status===0?'启用':'停用') }}</el-tag></template></el-table-column><el-table-column prop="sortOrder" :label="tr('排序')" min-width="110" /><el-table-column :label="tr('操作')" width="140"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" class="account-pagination" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>
    <el-dialog v-model="dialog.open" class="account-dialog" :title="tr(dialog.form.id?'编辑直播平台':'新增直播平台')" width="620px"><el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '150px' : '100px'"><el-form-item :label="tr('所属平台')" prop="platform"><el-input v-model="dialog.form.platform" placeholder="TikTok / eBay / whatnot" /></el-form-item><el-form-item :label="tr('直播平台代号')" prop="accountCode"><el-input v-model="dialog.form.accountCode" :placeholder="tr('如 TK 01')" /></el-form-item><el-form-item :label="tr('显示名称')" prop="displayName"><el-input v-model="dialog.form.displayName" /></el-form-item><el-form-item :label="tr('状态')"><el-radio-group v-model="dialog.form.status"><el-radio :label="0">{{ tr('启用') }}</el-radio><el-radio :label="1">{{ tr('停用') }}</el-radio></el-radio-group></el-form-item><el-form-item :label="tr('排序')"><el-input-number v-model="dialog.form.sortOrder" :min="0" /></el-form-item><el-form-item :label="tr('备注')"><el-input v-model="dialog.form.remark" type="textarea" /></el-form-item></el-form><template #footer><el-button @click="dialog.open=false">{{ tr('取消') }}</el-button><el-button type="primary" @click="submit">{{ tr('保存') }}</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addAccount, deleteAccount, listAccounts, syncAccounts, updateAccount } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const { proxy }=getCurrentInstance(), loading=ref(false), rows=ref([]), total=ref(0), formRef=ref()
const settingsStore=useSettingsStore(),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const isEn=computed(()=>(settingsStore.language||'zh-cn')==='en')
const query=reactive({pageNum:1,pageSize:20,keyword:'',status:null}),dialog=reactive({open:false,form:{}})
const rules={platform:[{required:true,message:'请输入平台'}],accountCode:[{required:true,message:'请输入直播平台代号'}],displayName:[{required:true,message:'请输入显示名称'}]}
async function load(){loading.value=true;try{const res=await listAccounts(query);rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openDialog(row={}){dialog.form={id:row.id,platformShopId:row.platformShopId||null,platform:row.platform||'',accountCode:row.accountCode||'',displayName:row.displayName||'',status:row.status??0,sortOrder:row.sortOrder||0,remark:row.remark||''};dialog.open=true}
async function submit(){await formRef.value.validate();if(dialog.form.id){try{await updateAccount(dialog.form)}catch(error){await showActionBlocked(error);return}}else{await addAccount(dialog.form)}proxy.$modal.msgSuccess(tr('保存成功'));dialog.open=false;load()}
async function remove(row){const message=isEn.value?`Delete live platform ${row.accountCode}? Historical references will be retained.`:`确认删除直播平台 ${row.accountCode}？历史记录中的直播平台引用将保留。`;await proxy.$modal.confirm(message);try{await deleteAccount(row.id)}catch(error){await showActionBlocked(error);return}proxy.$modal.msgSuccess(tr('删除成功'));load()}
async function showActionBlocked(error){await proxy.$modal.alertWarning(error?.message||'操作失败，请稍后重试。')}
async function sync(){const res=await syncAccounts();const count=res.data||0;proxy.$modal.msgSuccess(isEn.value?`Added ${count} authorized shop live platform configurations`:`已新增 ${count} 个授权店铺直播平台配置`);load()}
onMounted(load)
</script>
<style scoped lang="scss">
@import '../live.scss';
.account-keyword-input { width: 280px; }
:deep(.account-pagination.pagination-container) { position: relative !important; width: 100%; height: auto; min-height: 48px; margin: 16px 0 0; padding: 12px 0 4px !important; overflow-x: auto; box-sizing: border-box; }
:deep(.account-pagination.pagination-container .el-pagination) { position: static !important; right: auto !important; width: 100%; min-width: max-content; justify-content: flex-end; box-sizing: border-box; }
@media (max-width: 680px) { .account-keyword-input { width: 100%; } }
</style>
<style lang="scss">
.account-dialog {
  width: min(620px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 20px 28px 8px; }
  .el-form-item { min-width: 0; margin-bottom: 20px; }
  .el-form-item__label { white-space: nowrap; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-input-number,
  .el-select { width: 100%; }

  @media (max-width: 620px) {
    .el-dialog__body { padding: 16px 18px 6px; }
    .el-form-item { display: block; }
    .el-form-item__label { display: block; width: auto !important; height: auto; margin-bottom: 8px; line-height: 1.4; text-align: left; }
    .el-form-item__content { margin-left: 0 !important; }
  }
}
</style>
