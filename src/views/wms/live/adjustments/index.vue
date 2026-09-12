<template>
  <div data-runtime-i18n-ignore="true" class="live-page">
    <div class="live-hero"><div><h2>{{ tr('薪酬调整') }}</h2><p>{{ tr('原结算保留，补发与扣减通过独立明细进入后续结算') }}</p></div><el-button v-hasPermi="['wms:live:adjustment:export']" @click="exportRows">{{ tr('导出全部筛选结果') }}</el-button></div>
    <el-card class="live-filter" shadow="never">
      <el-form inline>
        <el-form-item :label="tr('主播')"><LiveEmployeeSelect v-model="query.employeeId" :employees="options.employees" /></el-form-item>
        <el-form-item :label="tr('记录类型')"><el-select v-model="query.kind" clearable :placeholder="tr('全部类型')" @change="query.status=null; query.pageNum=1; load()"><el-option :label="tr('结算后差额')" value="ADJUSTMENT" /><el-option :label="tr('未结算重算历史')" value="RECALC" /></el-select></el-form-item>
        <el-form-item :label="tr('状态')"><el-select v-model="query.status" clearable :placeholder="tr('全部')"><el-option v-for="status in statuses" :key="status" :label="tr(adjustmentStatusLabel(status))" :value="status" /></el-select></el-form-item>
        <el-form-item :label="tr('入账日期')"><el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item>
        <el-form-item><el-button type="primary" @click="query.pageNum=1;load()">{{ tr('查询') }}</el-button><el-button @click="resetQuery">{{ tr('重置') }}</el-button></el-form-item>
      </el-form>
    </el-card>
    <el-alert :title="tr('待确认调整尚未计入待付。请按同一开播记录的变更顺序审核；作废应从最新一笔开始。已结算调整可新增金额相反的待确认记录，审核后进入后续结算。')" type="info" :closable="false" style="margin-bottom:16px" />
    <el-card shadow="never">
      <el-table :data="rows" v-loading="loading" stripe>
        <el-table-column prop="employeeName" :label="tr('主播')" min-width="120" />
        <el-table-column :label="tr('记录类型')" :min-width="isEn ? 175 : 150"><template #default="s">{{ kindLabel(s.row.kind) }}</template></el-table-column>
        <el-table-column prop="accountLabel" :label="tr('平台')" min-width="220"><template #default="s"><LiveAccountLabel :account="s.row" :accounts="options.accounts" /></template></el-table-column>
        <el-table-column :label="tr('原业务日期')" :min-width="isEn ? 145 : 120"><template #default="s">{{ displayDate(s.row.streamDate) }}</template></el-table-column>
        <el-table-column :label="tr('入账日期')" :min-width="isEn ? 145 : 120"><template #default="s">{{ displayDate(s.row.postingDate) }}</template></el-table-column>
        <el-table-column :label="tr('原金额')" :min-width="isEn ? 145 : 100"><template #default="s">{{ money(s.row.originalAmount) }}</template></el-table-column>
        <el-table-column :label="tr('最新应计')" :min-width="isEn ? 145 : 100"><template #default="s">{{ money(s.row.targetAmount) }}</template></el-table-column>
        <el-table-column :label="tr('此前调整')" :min-width="isEn ? 145 : 100"><template #default="s">{{ money(s.row.previousAdjustments) }}</template></el-table-column>
        <el-table-column :label="tr('本次差额')" :min-width="isEn ? 145 : 110"><template #default="s"><strong :style="{ color: Number(s.row.amount) < 0 ? '#cf3434' : '#16864b' }">{{ money(s.row.amount) }}</strong></template></el-table-column>
        <el-table-column :label="tr('状态')" :min-width="isEn ? 145 : 100"><template #default="s">{{ tr(adjustmentStatusLabel(s.row.status)) }}</template></el-table-column>
        <el-table-column prop="reason" :label="tr('变更原因')" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdBy" :label="tr('操作人')" :min-width="isEn ? 145 : 100" />
        <el-table-column :label="tr('操作')" fixed="right" :width="isEn ? 280 : 200"><template #default="s">
          <el-button link @click="detail=s.row">{{ tr('明细') }}</el-button>
          <template v-if="s.row.kind === 'ADJUSTMENT'"><el-button v-hasPermi="['wms:live:adjustment:review']" v-if="s.row.status === 'PENDING'" link type="primary" @click="openReview(s.row,'CONFIRM')">{{ tr('确认') }}</el-button><el-button v-hasPermi="['wms:live:adjustment:review']" v-if="s.row.status === 'PENDING'" link type="danger" @click="openReview(s.row,'VOID')">{{ tr('作废') }}</el-button><el-button v-hasPermi="['wms:live:adjustment:review']" v-if="s.row.status === 'SETTLED'" link type="warning" @click="openReview(s.row,'REVERSE')">{{ tr('新增反向调整') }}</el-button></template>
        </template></el-table-column>
      </el-table>
      <pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
    </el-card>
    <el-dialog data-runtime-i18n-ignore="true" v-model="review.open" :title="review.action === 'CONFIRM' ? tr('确认调整') : review.action === 'VOID' ? tr('作废调整') : tr('新增反向调整')" width="540px">
      <el-alert v-if="review.action === 'REVERSE'" :title="tr('将新增一笔 {0} 的待确认调整，审核后进入后续结算，用于抵消原调整；原记录和已确认结算批次保留。', [money(-Number(review.row?.amount || 0))])" type="info" :closable="false" />
      <p>{{ tr('本次处理：') }}{{ review.row?.employeeName }} · {{ money(review.row?.amount) }}</p>
      <el-form :label-width="isEn ? '160px' : '90px'"><el-form-item v-if="review.action === 'CONFIRM'" :label="tr('入账日期')"><el-date-picker v-model="review.date" type="date" value-format="YYYY-MM-DD" :format="LIVE_DATE_FORMAT" /></el-form-item><el-form-item :label="tr('处理原因')"><el-input v-model="review.reason" type="textarea" maxlength="1000" /></el-form-item></el-form>
      <template #footer><el-button @click="review.open=false">{{ tr('取消') }}</el-button><el-button type="primary" :disabled="!review.reason.trim()" :loading="review.saving" @click="submitReview">{{ tr('确认') }}</el-button></template>
    </el-dialog>
    <el-dialog data-runtime-i18n-ignore="true" :model-value="!!detail" :title="tr('调整依据')" width="800px" @close="detail=null">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item :label="tr('原开播记录')">{{ detail.streamId }}</el-descriptions-item><el-descriptions-item :label="tr('原结算批次')">{{ detail.originalSettlementId || tr('未结算重算') }}</el-descriptions-item>
        <el-descriptions-item :label="tr('调价批次')">{{ detail.changeBatchNo }}</el-descriptions-item><el-descriptions-item :label="tr('被抵消的调整编号')">{{ detail.reversesId || tr('无') }}</el-descriptions-item>
        <el-descriptions-item :label="tr('工时')">{{ detail.durationHours }}</el-descriptions-item><el-descriptions-item :label="tr('原计薪/重算时薪')">{{ money(detail.oldHourlyRate) }} → {{ money(detail.newHourlyRate) }}</el-descriptions-item>
        <el-descriptions-item :label="tr('原因')">{{ detail.reason }}</el-descriptions-item><el-descriptions-item :label="tr('审核说明')">{{ detail.reviewRemark || tr('待审核') }}</el-descriptions-item>
        <el-descriptions-item :label="tr('审核人')">{{ detail.reviewedBy }}</el-descriptions-item><el-descriptions-item :label="tr('创建时间')">{{ detail.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>
<script setup>
import LiveAccountLabel from '../components/LiveAccountLabel.vue'
import { useLiveI18n } from '../useLiveI18n'
import { computed, getCurrentInstance, onMounted, onActivated, reactive, ref } from 'vue'
import { getLiveOptions, listPayrollAdjustments, exportPayrollAdjustments, reviewPayrollAdjustment } from '@/api/wms/livePayroll'
import LiveEmployeeSelect from '../components/LiveEmployeeSelect.vue'
import { adjustmentStatusLabel, displayDate, money, isoDate, LIVE_DATE_FORMAT, downloadCsv } from '../shared'
const { tr, isEn } = useLiveI18n()
const { proxy }=getCurrentInstance()
const query=reactive({ employeeId:null, status:null, kind:null, pageNum:1, pageSize:20 })
const options=reactive({employees:[]}), dateRange=ref(null), loading=ref(false), rows=ref([]), total=ref(0), detail=ref(null)
const statuses=computed(()=>query.kind==='RECALC'?['APPLIED']:query.kind==='ADJUSTMENT'?['PENDING','CONFIRMED','SETTLED','VOID']:['PENDING','CONFIRMED','SETTLED','VOID','APPLIED'])
const review=reactive({open:false,row:null,action:'CONFIRM',reason:'',date:isoDate(),saving:false})
function kindLabel(kind){return kind==='RECALC'?tr('未结算重算历史'):tr('结算后差额')}
function resetQuery(){Object.assign(query,{employeeId:null,status:null,kind:null,pageNum:1});dateRange.value=null;return load()}
function params(){return {...query,startDate:dateRange.value?.[0],endDate:dateRange.value?.[1]}}
async function loadOptions(){Object.assign(options,await getLiveOptions(true))}
async function load(){loading.value=true;try{const res=await listPayrollAdjustments(params());rows.value=res.rows||[];total.value=res.total||0}finally{loading.value=false}}
function openReview(row,action){Object.assign(review,{open:true,row,action,reason:'',date:row.postingDate||isoDate(),saving:false})}
async function submitReview(){if(review.saving||!review.reason.trim())return;review.saving=true;try{await reviewPayrollAdjustment(review.row.id,{action:review.action,reason:review.reason,postingDate:review.date});review.open=false;proxy.$modal.msgSuccess(tr('处理成功'));await load()}finally{review.saving=false}}
async function exportRows(){const {data}=await exportPayrollAdjustments(params());downloadCsv(tr('薪酬调整.csv'),[{key:'id',label:tr('调整编号')},{key:'employeeName',label:tr('主播')},{key:'accountLabel',label:tr('平台')},{key:'kindLabel',label:tr('记录类型')},{key:'streamId',label:tr('原开播记录')},{key:'originalSettlementId',label:tr('原结算批次')},{key:'settlementId',label:tr('调整结算批次')},{key:'changeBatchNo',label:tr('调价批次')},{key:'streamDate',label:tr('业务日期')},{key:'postingDate',label:tr('入账日期')},{key:'originalAmount',label:tr('原金额')},{key:'targetAmount',label:tr('最新应计')},{key:'previousAdjustments',label:tr('此前调整')},{key:'amount',label:tr('本次差额')},{key:'statusLabel',label:tr('状态')},{key:'reason',label:tr('原因')},{key:'createdBy',label:tr('操作人')},{key:'reviewRemark',label:tr('审核说明')}],data.map(row=>({...row,kindLabel:kindLabel(row.kind),statusLabel:tr(adjustmentStatusLabel(row.status))})))}
onMounted(()=>Promise.all([loadOptions(),load()]))
onActivated(loadOptions)
</script>
<style scoped lang="scss">
@import '../live.scss';
</style>
