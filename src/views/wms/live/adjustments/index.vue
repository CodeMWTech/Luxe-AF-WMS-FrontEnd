<template>
  <div class="live-page">
    <div class="live-hero"><div><h2>薪酬调整</h2><p>原结算保留，补发与扣减通过独立明细进入后续结算</p></div><el-button v-hasPermi="['wms:live:adjustment:export']" @click="exportRows">导出全部筛选结果</el-button></div>
    <el-card class="live-filter" shadow="never">
      <el-form inline>
        <el-form-item label="主播"><LiveEmployeeSelect v-model="query.employeeId" :employees="options.employees" /></el-form-item>
        <el-form-item label="记录类型"><el-select v-model="query.kind" clearable placeholder="全部类型" @change="query.status=null; query.pageNum=1; load()"><el-option label="结算后差额" value="ADJUSTMENT" /><el-option label="未结算重算历史" value="RECALC" /></el-select></el-form-item>
        <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部"><el-option v-for="status in statuses" :key="status" :label="adjustmentStatusLabel(status)" :value="status" /></el-select></el-form-item>
        <el-form-item label="入账日期"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
        <el-form-item><el-button type="primary" @click="query.pageNum=1;load()">查询</el-button><el-button @click="resetQuery">重置</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-alert title="待确认调整尚未计入待付。请按同一开播记录的变更顺序审核；作废应从最新一笔开始。已结算调整只能新增反向记录冲正。" type="info" :closable="false" style="margin-bottom:16px" />
    <el-card shadow="never">
      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="employeeName" label="主播" min-width="120" />
        <el-table-column label="记录类型" width="150"><template #default="s">{{ kindLabel(s.row.kind) }}</template></el-table-column>
        <el-table-column prop="accountLabel" label="平台" min-width="170" />
        <el-table-column label="原业务日期" width="120"><template #default="s">{{ displayDate(s.row.streamDate) }}</template></el-table-column>
        <el-table-column label="入账日期" width="120"><template #default="s">{{ displayDate(s.row.postingDate) }}</template></el-table-column>
        <el-table-column label="原金额" width="100"><template #default="s">{{ money(s.row.originalAmount) }}</template></el-table-column>
        <el-table-column label="最新应计" width="100"><template #default="s">{{ money(s.row.targetAmount) }}</template></el-table-column>
        <el-table-column label="此前调整" width="100"><template #default="s">{{ money(s.row.previousAdjustments) }}</template></el-table-column>
        <el-table-column label="本次差额" width="110"><template #default="s"><strong :style="{ color: Number(s.row.amount) < 0 ? '#cf3434' : '#16864b' }">{{ money(s.row.amount) }}</strong></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="s">{{ adjustmentStatusLabel(s.row.status) }}</template></el-table-column>
        <el-table-column prop="reason" label="变更原因" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdBy" label="操作人" width="100" />
        <el-table-column label="操作" fixed="right" width="200"><template #default="s">
          <el-button link @click="detail=s.row">明细</el-button>
          <template v-if="s.row.kind === 'ADJUSTMENT'"><el-button v-hasPermi="['wms:live:adjustment:review']" v-if="s.row.status === 'PENDING'" link type="primary" @click="openReview(s.row,'CONFIRM')">确认</el-button><el-button v-hasPermi="['wms:live:adjustment:review']" v-if="s.row.status === 'PENDING'" link type="danger" @click="openReview(s.row,'VOID')">作废</el-button><el-button v-hasPermi="['wms:live:adjustment:review']" v-if="s.row.status === 'SETTLED'" link type="warning" @click="openReview(s.row,'REVERSE')">冲正</el-button></template>
        </template></el-table-column>
      </el-table>
      <pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
    </el-card>
    <el-dialog v-model="review.open" :title="review.action === 'CONFIRM' ? '确认调整' : review.action === 'VOID' ? '作废调整' : '新增冲正调整'" width="540px">
      <p>本次处理：{{ review.row?.employeeName }} · {{ money(review.row?.amount) }}</p>
      <el-form label-width="90px"><el-form-item v-if="review.action === 'CONFIRM'" label="入账日期"><el-date-picker v-model="review.date" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item><el-form-item label="处理原因"><el-input v-model="review.reason" type="textarea" maxlength="1000" /></el-form-item></el-form>
      <template #footer><el-button @click="review.open=false">取消</el-button><el-button type="primary" :disabled="!review.reason.trim()" :loading="review.saving" @click="submitReview">确认</el-button></template>
    </el-dialog>
    <el-dialog :model-value="!!detail" title="调整依据" width="800px" @close="detail=null">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="原开播记录">{{ detail.streamId }}</el-descriptions-item><el-descriptions-item label="原结算批次">{{ detail.originalSettlementId || '未结算重算' }}</el-descriptions-item>
        <el-descriptions-item label="调价批次">{{ detail.changeBatchNo }}</el-descriptions-item><el-descriptions-item label="冲正来源">{{ detail.reversesId || '无' }}</el-descriptions-item>
        <el-descriptions-item label="工时">{{ detail.durationHours }}</el-descriptions-item><el-descriptions-item label="原计薪/重算时薪">{{ money(detail.oldHourlyRate) }} → {{ money(detail.newHourlyRate) }}</el-descriptions-item>
        <el-descriptions-item label="原因">{{ detail.reason }}</el-descriptions-item><el-descriptions-item label="审核说明">{{ detail.reviewRemark || '待审核' }}</el-descriptions-item>
        <el-descriptions-item label="审核人">{{ detail.reviewedBy }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, getCurrentInstance, onMounted, onActivated, reactive, ref } from 'vue'
import { getLiveOptions, listPayrollAdjustments, exportPayrollAdjustments, reviewPayrollAdjustment } from '@/api/wms/livePayroll'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import { adjustmentStatusLabel, displayDate, money, isoDate, LIVE_DATE_FORMAT, downloadCsv } from '../shared'
const { proxy }=getCurrentInstance()
const query=reactive({ employeeId:null, status:null, kind:null, pageNum:1, pageSize:20 })
const options=reactive({employees:[]}), dateRange=ref(null), loading=ref(false), rows=ref([]), total=ref(0), detail=ref(null)
const statuses=computed(()=>query.kind==='RECALC'?['APPLIED']:query.kind==='ADJUSTMENT'?['PENDING','CONFIRMED','SETTLED','VOID']:['PENDING','CONFIRMED','SETTLED','VOID','APPLIED'])
const review=reactive({open:false,row:null,action:'CONFIRM',reason:'',date:isoDate(),saving:false})
function kindLabel(kind){return kind==='RECALC'?'未结算重算历史':'结算后差额'}
function resetQuery(){Object.assign(query,{employeeId:null,status:null,kind:null,pageNum:1});dateRange.value=null;return load()}
function params(){return {...query,startDate:dateRange.value?.[0],endDate:dateRange.value?.[1]}}
async function loadOptions(){Object.assign(options,await getLiveOptions())}
async function load(){loading.value=true;try{const res=await listPayrollAdjustments(params());rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openReview(row,action){Object.assign(review,{open:true,row,action,reason:'',date:row.postingDate||isoDate(),saving:false})}
async function submitReview(){if(review.saving||!review.reason.trim())return;review.saving=true;try{await reviewPayrollAdjustment(review.row.id,{action:review.action,reason:review.reason,postingDate:review.date});review.open=false;proxy.$modal.msgSuccess('处理成功');await load()}finally{review.saving=false}}
async function exportRows(){const {data}=await exportPayrollAdjustments(params());downloadCsv('薪酬调整.csv',[{key:'id',label:'调整编号'},{key:'employeeName',label:'主播'},{key:'accountLabel',label:'平台'},{key:'kindLabel',label:'记录类型'},{key:'streamId',label:'原开播记录'},{key:'originalSettlementId',label:'原结算批次'},{key:'settlementId',label:'调整结算批次'},{key:'changeBatchNo',label:'调价批次'},{key:'streamDate',label:'业务日期'},{key:'postingDate',label:'入账日期'},{key:'originalAmount',label:'原金额'},{key:'targetAmount',label:'最新应计'},{key:'previousAdjustments',label:'此前调整'},{key:'amount',label:'本次差额'},{key:'statusLabel',label:'状态'},{key:'reason',label:'原因'},{key:'createdBy',label:'操作人'},{key:'reviewRemark',label:'审核说明'}],data.map(row=>({...row,kindLabel:kindLabel(row.kind),statusLabel:adjustmentStatusLabel(row.status)})))}
onMounted(()=>Promise.all([loadOptions(),load()]))
onActivated(loadOptions)
</script>
<style scoped lang="scss">
@import '../live.scss';
:deep(.pagination-container) { position:static; margin-top:16px; }
</style>
