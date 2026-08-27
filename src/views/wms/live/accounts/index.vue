<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>账号管理</h2><p>管理平台店铺在主播薪酬模块中的代号与显示名</p></div><div class="live-actions"><el-button @click="sync">同步授权店铺</el-button><el-button type="primary" @click="openDialog()">新增账号</el-button></div></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item><el-input v-model="query.keyword" clearable placeholder="搜索代号或显示名称" @keyup.enter="load" /></el-form-item><el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部"><el-option :label="tr('启用')" :value="0" /><el-option :label="tr('停用')" :value="1" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item></el-form></el-card>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="platform" label="所属平台" /><el-table-column prop="accountCode" label="账号代号"><template #default="s"><el-tag class="type-tag">{{ s.row.accountCode }}</el-tag></template></el-table-column><el-table-column prop="displayName" label="显示名称" /><el-table-column prop="platformShopName" label="关联授权店铺" /><el-table-column label="状态"><template #default="s"><el-tag :type="s.row.status===0?'success':'info'">{{ tr(s.row.status===0?'启用':'停用') }}</el-tag></template></el-table-column><el-table-column prop="sortOrder" label="排序" /><el-table-column label="操作" width="140"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>
    <el-dialog v-model="dialog.open" :title="dialog.form.id?'编辑账号':'新增账号'" width="560px"><el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="100px"><el-form-item label="所属平台" prop="platform"><el-input v-model="dialog.form.platform" placeholder="TikTok / eBay / whatnot" /></el-form-item><el-form-item label="账号代号" prop="accountCode"><el-input v-model="dialog.form.accountCode" placeholder="如 TK 01" /></el-form-item><el-form-item label="显示名称" prop="displayName"><el-input v-model="dialog.form.displayName" /></el-form-item><el-form-item label="状态"><el-radio-group v-model="dialog.form.status"><el-radio :label="0">启用</el-radio><el-radio :label="1">停用</el-radio></el-radio-group></el-form-item><el-form-item label="排序"><el-input-number v-model="dialog.form.sortOrder" :min="0" /></el-form-item><el-form-item label="备注"><el-input v-model="dialog.form.remark" type="textarea" /></el-form-item></el-form><template #footer><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addAccount, deleteAccount, listAccounts, syncAccounts, updateAccount } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const { proxy }=getCurrentInstance(), loading=ref(false), rows=ref([]), total=ref(0), formRef=ref()
const settingsStore=useSettingsStore(),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const query=reactive({pageNum:1,pageSize:20,keyword:'',status:null}),dialog=reactive({open:false,form:{}})
const rules={platform:[{required:true,message:'请输入平台'}],accountCode:[{required:true,message:'请输入账号代号'}],displayName:[{required:true,message:'请输入显示名称'}]}
async function load(){loading.value=true;try{const res=await listAccounts(query);rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openDialog(row={}){dialog.form={id:row.id,platformShopId:row.platformShopId||null,platform:row.platform||'',accountCode:row.accountCode||'',displayName:row.displayName||'',status:row.status??0,sortOrder:row.sortOrder||0,remark:row.remark||''};dialog.open=true}
async function submit(){await formRef.value.validate();await(dialog.form.id?updateAccount(dialog.form):addAccount(dialog.form));proxy.$modal.msgSuccess('保存成功');dialog.open=false;load()}
async function remove(row){await proxy.$modal.confirm(`确认删除账号 ${row.accountCode}？历史记录中的账号引用将保留。`);await deleteAccount(row.id);proxy.$modal.msgSuccess('删除成功');load()}
async function sync(){const res=await syncAccounts();proxy.$modal.msgSuccess(`已新增 ${res.data||0} 个授权店铺账号`);load()}
onMounted(load)
</script>
<style scoped lang="scss">@import '../live.scss';</style>

