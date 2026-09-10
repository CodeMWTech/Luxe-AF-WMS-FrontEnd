<template>
  <div data-runtime-i18n-ignore="true" class="live-page">
    <div class="live-hero"><div><h2>{{ tr('佣金管理') }}</h2><p>{{ tr('记录销售订单并汇总主播佣金') }}</p></div><div class="live-actions"><el-button @click="exportRows">{{ tr('导出 CSV') }}</el-button><el-button type="primary" @click="openDialog()">{{ tr('新增佣金') }}</el-button></div></div>
    <el-card class="live-filter" shadow="never"><el-form :inline="true"><el-form-item :label="tr('结算月份')"><el-date-picker v-model="query.settlementMonth" type="month" value-format="YYYY-MM" :format="LIVE_MONTH_FORMAT" clearable /></el-form-item><el-form-item :label="tr('平台')"><el-select v-model="query.platform" clearable :placeholder="tr('全部平台')"><el-option v-for="v in platforms" :key="v" :label="v" :value="v" /></el-select></el-form-item><el-form-item :label="tr('主播')"><LiveEmployeeSelect v-model="query.employeeId"   :placeholder="tr('全部主播')" :employees="options.employees" /></el-form-item><el-form-item :label="tr('状态')"><el-select v-model="query.status" clearable :placeholder="tr('全部状态')"><el-option :label="tr('正常销售')" value="NORMAL" /><el-option :label="tr('已退款')" value="REFUNDED" /></el-select></el-form-item><el-form-item><el-button type="primary" @click="load">{{ tr('查询') }}</el-button></el-form-item><el-form-item :label="tr('主播状态')"><el-select v-model="query.employeeScope" @change="query.pageNum = 1; load()"><el-option :label="tr('全部')" value="ALL" /><el-option :label="tr('在职/试用期')" value="ACTIVE" /><el-option :label="tr('已归档')" value="INACTIVE" /></el-select></el-form-item></el-form></el-card>
    <div class="metric-grid"><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('佣金订单数') }}</div><div class="metric-value">{{ total }}</div></el-card><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('当前页销售额') }}</div><div class="metric-value">{{ money(summary.sales) }}</div></el-card><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('当前页佣金') }}</div><div class="metric-value">{{ money(summary.commission) }}</div></el-card><el-card class="metric-card" shadow="never"><div class="metric-label">{{ tr('正常 / 退款') }}</div><div class="metric-value">{{ summary.normal }} / {{ summary.refunded }}</div></el-card></div>
    <el-card class="live-card" shadow="never"><el-table v-loading="loading" :data="rows" stripe><el-table-column prop="settlementMonth" :label="tr('结算月')" min-width="140"><template #default="s">{{ displayMonth(s.row.settlementMonth) }}</template></el-table-column><el-table-column prop="platform" :label="tr('平台')" min-width="110" /><el-table-column prop="accountLabel" :label="tr('直播平台')" min-width="180" /><el-table-column :label="tr('结算状态')" :min-width="isEn ? 145 : 110"><template #default="s"><el-tag :type="s.row.settlementStatus === 'SETTLED' ? 'success' : 'info'">{{ tr(settlementStatusLabel(s.row.settlementStatus)) }}</el-tag></template></el-table-column><el-table-column prop="employeeName" :label="tr('主播')" min-width="120" ><template #default="s"><LiveEmployeeName :name="s.row.employeeName" :status="s.row.employeeStatus" /></template></el-table-column><el-table-column prop="orderNo" :label="tr('订单号')" min-width="160" /><el-table-column prop="orderDate" :label="tr('订单日期')" min-width="130"><template #default="s">{{ displayDate(s.row.orderDate) }}</template></el-table-column><el-table-column :label="tr('销售额')" min-width="130"><template #default="s">{{ money(s.row.saleAmount) }}</template></el-table-column><el-table-column :label="tr('佣金率')" min-width="140"><template #default="s">{{ s.row.commissionRate }}%</template></el-table-column><el-table-column :label="tr('佣金')" min-width="130"><template #default="s"><strong>{{ money(s.row.commissionAmount) }}</strong></template></el-table-column><el-table-column :label="tr('状态')" min-width="110"><template #default="s"><el-tag :type="s.row.status==='REFUNDED'?'danger':'success'">{{ tr(s.row.status==='REFUNDED'?'已退款':'正常销售') }}</el-tag></template></el-table-column><el-table-column :label="tr('操作')" width="130" fixed="right"><template #default="s"><el-button link type="primary" :disabled="s.row.settlementStatus !== 'OPEN'" @click="openDialog(s.row)">{{ tr('编辑') }}</el-button><el-button link type="danger" :disabled="s.row.settlementStatus !== 'OPEN'" @click="remove(s.row)">{{ tr('删除') }}</el-button></template></el-table-column></el-table><pagination v-show="total>0" class="commission-pagination" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" /></el-card>
    <el-dialog data-runtime-i18n-ignore="true" v-model="dialog.open" class="commission-dialog" :title="tr(dialog.form.id?'编辑佣金':'新增佣金')" width="760px"><el-form ref="formRef" :model="dialog.form" :rules="rules" :label-width="isEn ? '136px' : '90px'"><div class="dialog-grid"><el-form-item :label="tr('结算月份')"><el-date-picker v-model="dialog.form.settlementMonth" type="month" value-format="YYYY-MM" :format="LIVE_MONTH_FORMAT" /></el-form-item><el-form-item :label="tr('平台')"><el-select v-model="dialog.form.platform"><el-option v-for="v in platforms" :key="v" :label="v" :value="v" /></el-select></el-form-item><el-form-item :label="tr('直播平台')"><el-select v-model="dialog.form.accountId" clearable><el-option v-for="v in options.accounts" :key="v.id" :label="accountLabel(v)" :value="v.id" /></el-select></el-form-item><el-form-item :label="tr('主播')" prop="employeeId"><LiveEmployeeSelect v-model="dialog.form.employeeId" :employees="options.employees" /></el-form-item><el-form-item :label="tr('订单号')" prop="orderNo"><el-input v-model="dialog.form.orderNo" /></el-form-item><el-form-item :label="tr('订单日期')" prop="orderDate"><el-date-picker v-model="dialog.form.orderDate" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item><el-form-item :label="tr('销售额')"><el-input-number v-model="dialog.form.saleAmount" :precision="2" :min="0" /></el-form-item><el-form-item :label="tr('佣金率')"><el-input-number v-model="dialog.form.commissionRate" :precision="2" :min="0" :max="100" /></el-form-item><el-form-item :label="tr('佣金金额')"><el-input-number v-model="dialog.form.commissionAmount" :precision="2" :min="0" /></el-form-item><el-form-item :label="tr('状态')"><el-select v-model="dialog.form.status"><el-option :label="tr('正常销售')" value="NORMAL" /><el-option :label="tr('已退款')" value="REFUNDED" /></el-select></el-form-item><el-form-item class="wide" :label="tr('备注')"><el-input v-model="dialog.form.remark" /></el-form-item></div></el-form><template #footer><el-button @click="dialog.open=false">{{ tr('取消') }}</el-button><el-button type="primary" @click="submit">{{ tr('保存') }}</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { useLiveI18n } from '../useLiveI18n'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import LiveEmployeeName from '../components/LiveEmployeeName.vue'
import { onActivated, computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addCommission, deleteCommission, getLiveOptions, listCommissions, updateCommission } from '@/api/wms/livePayroll'
import { settlementStatusLabel, accountLabel, displayDate, displayMonth, downloadCsv, isoDate, LIVE_DATE_FORMAT, LIVE_MONTH_FORMAT, money } from '../shared'
const { tr, isEn, messageNode } = useLiveI18n()
const { proxy } = getCurrentInstance()
const loading=ref(false), rows=ref([]), total=ref(0), formRef=ref()
const currentMonth=isoDate().slice(0,7)
const query=reactive({ employeeScope: 'ALL', pageNum:1,pageSize:20,settlementMonth:currentMonth,platform:null,employeeId:null,status:null })
const options=reactive({ employees:[],accounts:[] }), dialog=reactive({open:false,form:{}})
const platforms=computed(()=>[...new Set(options.accounts.map(v=>v.platform))])
const summary=computed(()=>({sales:rows.value.filter(v=>v.status!=='REFUNDED').reduce((s,v)=>s+Number(v.saleAmount||0),0),commission:rows.value.filter(v=>v.status!=='REFUNDED').reduce((s,v)=>s+Number(v.commissionAmount||0),0),normal:rows.value.filter(v=>v.status!=='REFUNDED').length,refunded:rows.value.filter(v=>v.status==='REFUNDED').length}))
const rules=computed(() => ({ employeeId:[{required:true,message:tr('请选择主播')}],orderNo:[{required:true,message:tr('请输入订单号')}],orderDate:[{required:true,message:tr('请选择订单日期')}] }))
async function load(){loading.value=true;try{ Object.assign(options, await getLiveOptions());const res=await listCommissions(query);rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openDialog(row={}){dialog.form={id:row.id,settlementMonth:row.settlementMonth||currentMonth,platform:row.platform||null,accountId:row.accountId||null,employeeId:row.employeeId||null,orderNo:row.orderNo||'',orderDate:row.orderDate||isoDate(),saleAmount:Number(row.saleAmount||0),commissionRate:Number(row.commissionRate||0),commissionAmount:row.commissionAmount==null?null:Number(row.commissionAmount),status:row.status||'NORMAL',remark:row.remark||''};dialog.open=true}
async function submit(){await formRef.value.validate();await(dialog.form.id?updateCommission(dialog.form):addCommission(dialog.form));proxy.$modal.msgSuccess(tr('保存成功'));dialog.open=false;load()}
async function remove(row){await proxy.$modal.confirm(messageNode(tr('确认删除订单 {0} 的佣金？', [row.orderNo])));await deleteCommission(row.id);proxy.$modal.msgSuccess(tr('删除成功'));load()}
function headers(){return[{key:'settlementMonth',label:tr('结算月份')},{key:'platform',label:tr('平台')},{key:'accountLabel',label:tr('直播平台')},{key:'employeeName',label:tr('主播')},{key:'orderNo',label:tr('订单号')},{key:'orderDate',label:tr('订单日期')},{key:'saleAmount',label:tr('销售额')},{key:'commissionRate',label:tr('佣金率')},{key:'commissionAmount',label:tr('佣金金额')},{key:'status',label:tr('状态')},{key:'employeeStatus',label:tr('员工状态代码')},{key:'settlementStatusLabel',label:tr('结算状态')},{key:'settlementId',label:tr('结算批次')},{key:'remark',label:tr('备注')}]}
async function exportRows(){const {rows: exportData}=await listCommissions({...query,pageNum:1,pageSize:2147483647});downloadCsv(tr('主播佣金-{0}.csv', [query.settlementMonth||tr('全部')]),headers(),(exportData||[]).map(row=>({...row,status:tr(row.status==='REFUNDED'?'已退款':'正常销售'),settlementStatusLabel:tr(settlementStatusLabel(row.settlementStatus)),settlementMonth:displayMonth(row.settlementMonth),orderDate:displayDate(row.orderDate)})))}
onMounted(async()=>{Object.assign(options,await getLiveOptions());load()})
onActivated(async () => { Object.assign(options, await getLiveOptions()) })
</script>
<style scoped lang="scss">
@import '../live.scss';
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
