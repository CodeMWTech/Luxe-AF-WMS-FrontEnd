<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>{{ tr('佣金管理') }}</h2><p>{{ tr('记录销售订单并汇总主播佣金') }}</p></div><div class="live-actions"><el-button @click="exportRows">{{ tr('导出 CSV') }}</el-button><el-button type="primary" @click="openDialog()">{{ tr('新增佣金') }}</el-button></div></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item :label="tr('结算月份')"><el-date-picker v-model="query.settlementMonth" type="month" value-format="YYYY-MM" :format="isEn ? 'MM/YYYY' : 'YYYY-MM'" clearable /></el-form-item><el-form-item :label="tr('平台')"><el-select v-model="query.platform" clearable :placeholder="tr('全部平台')"><el-option v-for="v in platforms" :key="v" :label="v" :value="v" /></el-select></el-form-item><el-form-item :label="tr('主播')"><el-select v-model="query.employeeId" clearable filterable :placeholder="tr('全部主播')"><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item :label="tr('状态')"><el-select v-model="query.status" clearable :placeholder="tr('全部状态')"><el-option :label="tr('正常销售')" value="NORMAL" /><el-option :label="tr('已退款')" value="REFUNDED" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">{{ tr('查询') }}</el-button></el-form-item></el-form></el-card>
    <div class="metric-grid"><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('佣金订单数') }}</div><div class="metric-value">{{ total }}</div></el-card><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('当前页销售额') }}</div><div class="metric-value">{{ money(summary.sales) }}</div></el-card><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('当前页佣金') }}</div><div class="metric-value">{{ money(summary.commission) }}</div></el-card><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('正常 / 退款') }}</div><div class="metric-value">{{ summary.normal }} / {{ summary.refunded }}</div></el-card></div>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="settlementMonth" :label="tr('结算月')" min-width="140" /><el-table-column prop="platform" :label="tr('平台')" min-width="110" /><el-table-column prop="accountLabel" :label="tr('直播平台')" min-width="180" /><el-table-column prop="employeeName" :label="tr('主播')" min-width="120" /><el-table-column prop="orderNo" :label="tr('订单号')" min-width="160" /><el-table-column prop="orderDate" :label="tr('订单日期')" min-width="130" /><el-table-column :label="tr('销售额')" min-width="130"><template #default="s">{{ money(s.row.saleAmount) }}</template></el-table-column><el-table-column :label="tr('佣金率')" min-width="140"><template #default="s">{{ s.row.commissionRate }}%</template></el-table-column><el-table-column :label="tr('佣金')" min-width="130"><template #default="s"><strong>{{ money(s.row.commissionAmount) }}</strong></template></el-table-column><el-table-column :label="tr('状态')" min-width="110"><template #default="s"><el-tag :type="s.row.status==='REFUNDED'?'danger':'success'">{{ tr(s.row.status==='REFUNDED'?'已退款':'正常销售') }}</el-tag></template></el-table-column><el-table-column :label="tr('操作')" width="130" fixed="right"><template #default="s"><el-button link type="primary" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" class="commission-pagination" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>
    <el-dialog v-model="dialog.open" class="commission-dialog" :title="tr(dialog.form.id?'编辑佣金':'新增佣金')" width="760px"><el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '136px' : '90px'"><div class="dialog-grid"><el-form-item :label="tr('结算月份')"><el-date-picker v-model="dialog.form.settlementMonth" type="month" value-format="YYYY-MM" :format="isEn ? 'MM/YYYY' : 'YYYY-MM'" /></el-form-item><el-form-item :label="tr('平台')"><el-select v-model="dialog.form.platform"><el-option v-for="v in platforms" :key="v" :label="v" :value="v" /></el-select></el-form-item><el-form-item :label="tr('直播平台')"><el-select v-model="dialog.form.accountId" clearable><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item :label="tr('主播')" prop="employeeId"><el-select v-model="dialog.form.employeeId" filterable><el-option v-for="v in options.employees" :key="v.value" :label="v.label" :value="v.value" /></el-select></el-form-item><el-form-item :label="tr('订单号')" prop="orderNo"><el-input v-model="dialog.form.orderNo" /></el-form-item><el-form-item :label="tr('订单日期')" prop="orderDate"><el-date-picker v-model="dialog.form.orderDate" type="date" value-format="YYYY-MM-DD" :format="isEn ? 'MM/DD/YYYY' : 'YYYY-MM-DD'" /></el-form-item><el-form-item :label="tr('销售额')"><el-input-number v-model="dialog.form.saleAmount" :precision="2" :min="0" /></el-form-item><el-form-item :label="tr('佣金率')"><el-input-number v-model="dialog.form.commissionRate" :precision="2" :min="0" :max="100" /></el-form-item><el-form-item :label="tr('佣金金额')"><el-input-number v-model="dialog.form.commissionAmount" :precision="2" :min="0" /></el-form-item><el-form-item :label="tr('状态')"><el-select v-model="dialog.form.status"><el-option :label="tr('正常销售')" value="NORMAL" /><el-option :label="tr('已退款')" value="REFUNDED" /></el-select></el-form-item><el-form-item class="wide" :label="tr('备注')"><el-input v-model="dialog.form.remark" /></el-form-item></div></el-form><template #footer><el-button @click="dialog.open=false">{{ tr('取消') }}</el-button><el-button type="primary" @click="submit">{{ tr('保存') }}</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addCommission, deleteCommission, getLiveOptions, listCommissions, updateCommission } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { accountLabel, downloadCsv, isoDate, money } from '../shared'
const settingsStore=useSettingsStore(),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const isEn=computed(()=>(settingsStore.language||'zh-cn')==='en')
const { proxy } = getCurrentInstance()
const loading=ref(false), rows=ref([]), total=ref(0), formRef=ref()
const now=new Date(), currentMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
const query=reactive({ pageNum:1,pageSize:20,settlementMonth:currentMonth,platform:null,employeeId:null,status:null })
const options=reactive({ employees:[],accounts:[] }), dialog=reactive({open:false,form:{}})
const platforms=computed(()=>[...new Set(options.accounts.map(v=>v.platform))])
const summary=computed(()=>({sales:rows.value.filter(v=>v.status!=='REFUNDED').reduce((s,v)=>s+Number(v.saleAmount||0),0),commission:rows.value.filter(v=>v.status!=='REFUNDED').reduce((s,v)=>s+Number(v.commissionAmount||0),0),normal:rows.value.filter(v=>v.status!=='REFUNDED').length,refunded:rows.value.filter(v=>v.status==='REFUNDED').length}))
const rules={ employeeId:[{required:true,message:'请选择主播'}],orderNo:[{required:true,message:'请输入订单号'}],orderDate:[{required:true,message:'请选择订单日期'}] }
async function load(){loading.value=true;try{const res=await listCommissions(query);rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openDialog(row={}){dialog.form={id:row.id,settlementMonth:row.settlementMonth||currentMonth,platform:row.platform||null,accountId:row.accountId||null,employeeId:row.employeeId||null,orderNo:row.orderNo||'',orderDate:row.orderDate||isoDate(),saleAmount:Number(row.saleAmount||0),commissionRate:Number(row.commissionRate||0),commissionAmount:row.commissionAmount==null?null:Number(row.commissionAmount),status:row.status||'NORMAL',remark:row.remark||''};dialog.open=true}
async function submit(){await formRef.value.validate();await(dialog.form.id?updateCommission(dialog.form):addCommission(dialog.form));proxy.$modal.msgSuccess('保存成功');dialog.open=false;load()}
async function remove(row){await proxy.$modal.confirm(`确认删除订单 ${row.orderNo} 的佣金？`);await deleteCommission(row.id);proxy.$modal.msgSuccess('删除成功');load()}
function headers(){return[{key:'settlementMonth',label:'结算月份'},{key:'platform',label:'平台'},{key:'accountLabel',label:'直播平台'},{key:'employeeName',label:'主播'},{key:'orderNo',label:'订单号'},{key:'orderDate',label:'订单日期'},{key:'saleAmount',label:'销售额'},{key:'commissionRate',label:'佣金率'},{key:'commissionAmount',label:'佣金金额'},{key:'status',label:'状态'},{key:'remark',label:'备注'}]}
function exportRows(){downloadCsv(`主播佣金-${query.settlementMonth||'全部'}.csv`,headers(),rows.value)}
onMounted(async()=>{Object.assign(options,await getLiveOptions());load()})
</script>
<style scoped lang="scss">
@import '../live.scss';
:deep(.commission-pagination.pagination-container) { position: relative !important; width: 100%; height: auto; min-height: 48px; margin: 16px 0 0; padding: 12px 0 4px !important; overflow-x: auto; box-sizing: border-box; }
:deep(.commission-pagination.pagination-container .el-pagination) { position: static !important; right: auto !important; width: 100%; min-width: max-content; justify-content: flex-end; box-sizing: border-box; }
</style>
<style lang="scss">
.commission-dialog {
  width: min(760px, calc(100vw - 32px)) !important;

  .el-dialog__body { padding: 20px 28px 8px; }
  .dialog-grid { align-items: start; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; }
  .el-form-item { min-width: 0; margin-bottom: 20px; }
  .el-form-item__label { white-space: nowrap; }
  .el-form-item__content { min-width: 0; }
  .el-input,
  .el-input-number,
  .el-select,
  .el-date-editor { width: 100%; }

  @media (max-width: 720px) {
    .el-dialog__body { padding: 16px 18px 6px; }
    .dialog-grid { grid-template-columns: 1fr; }
    .dialog-grid .wide { grid-column: auto; }
    .el-form-item { display: block; }
    .el-form-item__label { display: block; width: auto !important; height: auto; margin-bottom: 8px; line-height: 1.4; text-align: left; }
    .el-form-item__content { margin-left: 0 !important; }
  }
}
</style>
