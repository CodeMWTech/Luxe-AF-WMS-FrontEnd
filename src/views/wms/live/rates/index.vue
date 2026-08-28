<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>费率配置</h2><p>按主播 + 账号 + 费率类型 + 生效日期配置时薪</p></div><div class="live-actions"><el-button @click="exportRows">批量导出</el-button><el-upload :show-file-list="false" accept=".csv" :auto-upload="false" :on-change="importCsv"><el-button>批量导入</el-button></el-upload><el-button @click="recalculate">重算开播记录</el-button><el-button type="primary" @click="openDialog()">新增费率</el-button></div></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item label="主播"><el-select v-model="query.employeeId" filterable clearable placeholder="全部主播"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item label="账号"><el-select v-model="query.accountId" clearable placeholder="全部账号"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item label="费率类型"><el-select v-model="query.rateTypeId" clearable placeholder="全部类型"><el-option v-for="v in options.rateTypes" :key="v.id" :label="tr(v.typeName)" :value="v.id" /></el-select></el-form-item><el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部"><el-option :label="tr('启用')" :value="0" /><el-option :label="tr('停用')" :value="1" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item></el-form></el-card>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="employeeName" label="主播" /><el-table-column prop="accountLabel" label="账号" min-width="190" /><el-table-column prop="rateTypeName" label="费率类型"><template #default="s"><el-tag class="type-tag">{{ tr(s.row.rateTypeName) }}</el-tag></template></el-table-column><el-table-column label="时薪"><template #default="s"><strong>{{ money(s.row.hourlyRate) }}/h</strong></template></el-table-column><el-table-column prop="effectiveDate" label="生效日期" /><el-table-column prop="expiryDate" label="失效日期"><template #default="s">{{ s.row.expiryDate || tr('长期') }}</template></el-table-column><el-table-column label="状态"><template #default="s"><el-tag :type="s.row.status===0?'success':'info'">{{ tr(s.row.status===0?'生效中':'已停用') }}</el-tag></template></el-table-column><el-table-column prop="remark" label="备注" /><el-table-column label="操作" width="140"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>
    <el-dialog v-model="dialog.open" class="rate-dialog" :title="tr(dialog.form.id ? '编辑费率' : '新增费率')" width="760px" append-to-body><el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '126px' : '90px'"><div class="dialog-grid"><el-form-item label="主播" prop="employeeId"><el-select v-model="dialog.form.employeeId" filterable><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item label="账号" prop="accountId"><el-select v-model="dialog.form.accountId"><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item label="费率类型" prop="rateTypeId"><el-select v-model="dialog.form.rateTypeId"><el-option v-for="v in options.rateTypes" :key="v.id" :label="tr(v.typeName)" :value="v.id" /></el-select></el-form-item><el-form-item label="时薪" prop="hourlyRate"><el-input-number v-model="dialog.form.hourlyRate" :precision="2" :min="0" /></el-form-item><el-form-item label="生效日期" prop="effectiveDate"><el-date-picker v-model="dialog.form.effectiveDate" type="date" value-format="YYYY-MM-DD" /></el-form-item><el-form-item label="失效日期"><el-date-picker v-model="dialog.form.expiryDate" type="date" value-format="YYYY-MM-DD" clearable /></el-form-item><el-form-item label="状态"><el-radio-group v-model="dialog.form.status"><el-radio :label="0">启用</el-radio><el-radio :label="1">停用</el-radio></el-radio-group></el-form-item><el-form-item class="wide" label="备注"><el-input v-model="dialog.form.remark" /></el-form-item></div></el-form><template #footer><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" @click="submit">保存</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addRate, batchRates, deleteRate, getLiveOptions, listRates, recalculateStreams, updateRate } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, isoDate, money, parseCsv } from '../shared'
const settingsStore=useSettingsStore(),isEn=computed(()=>(settingsStore.language||'zh-cn')==='en'),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const {proxy}=getCurrentInstance(),loading=ref(false),rows=ref([]),total=ref(0),formRef=ref()
const query=reactive({pageNum:1,pageSize:20,employeeId:null,accountId:null,rateTypeId:null,status:null}),options=reactive({employees:[],accounts:[],rateTypes:[]}),dialog=reactive({open:false,form:{}})
const rules={employeeId:[{required:true,message:'请选择主播'}],accountId:[{required:true,message:'请选择账号'}],rateTypeId:[{required:true,message:'请选择费率类型'}],hourlyRate:[{required:true,message:'请输入时薪'}],effectiveDate:[{required:true,message:'请选择生效日期'}]}
async function load(){loading.value=true;try{const res=await listRates(query);rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openDialog(row={}){dialog.form={id:row.id,employeeId:row.employeeId||null,accountId:row.accountId||null,rateTypeId:row.rateTypeId||null,hourlyRate:Number(row.hourlyRate||0),effectiveDate:row.effectiveDate||isoDate(),expiryDate:row.expiryDate||null,status:row.status??0,remark:row.remark||''};dialog.open=true}
async function submit(){await formRef.value.validate();await(dialog.form.id?updateRate(dialog.form):addRate(dialog.form));proxy.$modal.msgSuccess('保存成功');dialog.open=false;load()}
async function remove(row){await proxy.$modal.confirm(`确认删除 ${row.employeeName} 的这条费率？`);await deleteRate(row.id);proxy.$modal.msgSuccess('删除成功');load()}
async function recalculate(){await proxy.$modal.confirm('将按当前费率重新计算所有非手工时薪的开播记录，是否继续？');const res=await recalculateStreams({});proxy.$modal.msgSuccess(`已重算 ${res.data||0} 条记录`)}
function headers(){return[{key:'employeeName',label:'主播'},{key:'accountLabel',label:'账号'},{key:'rateTypeName',label:'费率类型'},{key:'hourlyRate',label:'时薪'},{key:'effectiveDate',label:'生效日期'},{key:'expiryDate',label:'失效日期'},{key:'status',label:'状态'},{key:'remark',label:'备注'}]}
function exportRows(){downloadCsv('主播费率配置.csv',headers(),rows.value)}
async function importCsv(uploadFile){try{const raw=await parseCsv(uploadFile.raw);const payload=raw.map(v=>({employeeId:options.employees.find(e=>e.label===v['主播'])?.value,accountId:options.accounts.find(a=>accountLabel(a)===v['账号']||a.accountCode===v['账号'])?.id,rateTypeId:options.rateTypes.find(t=>t.typeName===v['费率类型'])?.id,hourlyRate:Number(v['时薪']||0),effectiveDate:v['生效日期'],expiryDate:v['失效日期']||null,status:v['状态']==='停用'?1:0,remark:v['备注']||''}));await batchRates(payload);proxy.$modal.msgSuccess(`成功导入 ${payload.length} 条`);load()}catch(e){proxy.$modal.msgError(e.message||'导入失败')}}
onMounted(async()=>{Object.assign(options,await getLiveOptions());load()})
</script>
<style scoped lang="scss">@import '../live.scss';</style>
<style lang="scss">
.rate-dialog {
  width: min(760px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 20px 28px 8px; }
  .dialog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; }
  .el-form-item { min-width: 0; margin-bottom: 20px; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-select,
  .el-date-editor,
  .el-input-number { width: 100%; }

  @media (max-width: 680px) {
    .el-dialog__body { padding: 16px 18px 6px; }
    .dialog-grid { grid-template-columns: 1fr; }
    .dialog-grid .wide { grid-column: auto; }
  }
}
</style>
