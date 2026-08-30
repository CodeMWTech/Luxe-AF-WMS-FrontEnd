<template>
   <div class="app-container operlog-page" :class="{ 'is-en': isEn }">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" :label-width="isEn ? '150px' : '68px'" class="filter-form">
        <el-form-item :label="tr('操作地址')" prop="operIp">
          <el-input
            v-model="queryParams.operIp"
            :placeholder="tr('请输入操作地址')"
            clearable
            style="width: 240px;"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item :label="tr('系统模块')" prop="title">
            <el-input
               v-model="queryParams.title"
               :placeholder="tr('请输入系统模块')"
               clearable
               style="width: 240px;"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item :label="tr('操作人员')" prop="operName">
            <el-input
               v-model="queryParams.operName"
               :placeholder="tr('请输入操作人员')"
               clearable
               style="width: 240px;"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item :label="tr('类型')" prop="businessType">
            <el-select
               v-model="queryParams.businessType"
               :placeholder="tr('操作类型')"
               clearable
               style="width: 240px"
            >
               <el-option
                  v-for="dict in sys_oper_type"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item :label="tr('状态')" prop="status">
            <el-select
               v-model="queryParams.status"
               :placeholder="tr('操作状态')"
               clearable
               style="width: 240px"
            >
               <el-option
                  v-for="dict in sys_common_status"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item :label="tr('操作时间')" class="filter-item-time">
            <el-date-picker
               v-model="dateRange"
               value-format="YYYY-MM-DD HH:mm:ss"
               type="daterange"
               range-separator="-"
               :start-placeholder="tr('开始日期')"
               :end-placeholder="tr('结束日期')"
               :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
            ></el-date-picker>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ tr('搜索') }}</el-button>
            <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ tr('重置') }}</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['monitor:operlog:remove']"
               class="action-btn"
            >{{ tr('删除') }}</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               @click="handleClean"
               v-hasPermi="['monitor:operlog:remove']"
               class="action-btn"
            >{{ tr('清空') }}</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['monitor:operlog:export']"
               class="action-btn"
            >{{ tr('导出') }}</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table ref="operlogRef" v-loading="loading" :data="operlogList" @selection-change="handleSelectionChange" :default-sort="defaultSort" @sort-change="handleSortChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column :label="tr('日志编号')" align="center" prop="operId" />
         <el-table-column :label="tr('系统模块')" align="center" prop="title" :show-overflow-tooltip="true" />
         <el-table-column :label="tr('操作类型')" align="center" prop="businessType">
            <template #default="scope">
               <dict-tag :options="sys_oper_type" :value="scope.row.businessType" />
            </template>
         </el-table-column>
         <el-table-column :label="tr('请求方式')" align="center" prop="requestMethod" />
         <el-table-column :label="tr('操作人员')" align="center" width="120" prop="operName" :show-overflow-tooltip="true" sortable="custom" :sort-orders="['descending', 'ascending']" />
         <el-table-column :label="tr('部门')" align="center" prop="deptName" width="130" :show-overflow-tooltip="true" />
         <el-table-column :label="tr('操作地址')" align="center" prop="operIp" width="140" :show-overflow-tooltip="true" />
         <el-table-column :label="tr('操作地点')" align="center" prop="operLocation" :show-overflow-tooltip="true" />
        <el-table-column :label="tr('操作状态')" align="center" prop="status">
            <template #default="scope">
               <dict-tag :options="sys_common_status" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column :label="tr('操作日期')" align="center" prop="operTime" width="180" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="scope">
               <span>{{ parseTime(scope.row.operTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column :label="isEn ? 'Cost (ms)' : '消耗时间'" align="center" prop="costTime" width="110" :show-overflow-tooltip="true" sortable="custom" :sort-orders="['descending', 'ascending']">
            <template #default="scope">
               <span>{{ formatCostTime(scope.row.costTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column :label="tr('操作')" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="View" @click="handleView(scope.row, scope.index)" v-hasPermi="['monitor:operlog:query']">{{ tr('详细') }}</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="queryParams.pageNum"
         v-model:limit="queryParams.pageSize"
         @pagination="getList"
      />

      <!-- 操作日志详细 -->
      <el-dialog :title="isEn ? 'Operation Log Detail' : '操作日志详细'" v-model="open" width="700px" append-to-body>
         <el-form :model="form" label-width="100px">
            <el-row>
               <el-col :span="24">
                  <el-form-item
                    :label="isEn ? 'Login Info:' : '登录信息：'"
                  >{{ form.operName }} / {{form.deptName}} / {{ form.operIp }} / {{ form.operLocation }}</el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="isEn ? 'Request Info:' : '请求信息：'">{{ form.requestMethod }} {{form.operUrl }}</el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="isEn ? 'Module:' : '操作模块：'">{{ form.title }} / {{ typeFormat(form) }}</el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item :label="isEn ? 'Method:' : '操作方法：'">{{ form.method }}</el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item :label="isEn ? 'Params:' : '请求参数：'">{{ form.operParam }}</el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item :label="isEn ? 'Response:' : '返回参数：'">{{ form.jsonResult }}</el-form-item>
               </el-col>
               <el-col :span="6">
                  <el-form-item :label="isEn ? 'Status:' : '操作状态：'">
                     <dict-tag :options="sys_common_status" :value="form.status" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item :label="isEn ? 'Cost:' : '消耗时间：'">{{ formatCostTime(form.costTime) }}</el-form-item>
               </el-col>
               <el-col :span="10">
                  <el-form-item :label="isEn ? 'Time:' : '操作时间：'">{{ parseTime(form.operTime) }}</el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item :label="isEn ? 'Error:' : '异常信息：'" v-if="isFailedStatus(form.status)">{{ form.errorMsg }}</el-form-item>
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button class="action-btn" @click="open = false">{{ tr('关闭') }}</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Operlog">
import { list, delOperlog, cleanOperlog } from "@/api/monitor/operlog";
import useSettingsStore from "@/store/modules/settings";
import { translateByMap } from '@/locales/runtime-map'

const { proxy } = getCurrentInstance();
const { sys_oper_type, sys_common_status } = proxy.useDict("sys_oper_type","sys_common_status");
const settingsStore = useSettingsStore()
const isEn = computed(() => settingsStore.language === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

const operlogList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const dateRange = ref([]);
const defaultSort = ref({ prop: "operTime", order: "descending" });

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    operIp: undefined,
    title: undefined,
    operName: undefined,
    businessType: undefined,
    status: undefined
  }
});

const { queryParams, form } = toRefs(data);

/** 查询登录日志 */
function getList() {
  loading.value = true;
  list(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    operlogList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
}
/** 操作日志类型字典翻译 */
function typeFormat(row, column) {
  return proxy.selectDictLabel(sys_oper_type.value, row.businessType);
}
/** 统一显示耗时；旧日志未记录耗时时不单独显示单位 */
function formatCostTime(costTime) {
  return costTime === null || costTime === undefined || costTime === ''
    ? '--'
    : `${costTime} ms`;
}
/** 后端 BusinessStatus 中 0 为失败、1 为成功 */
function isFailedStatus(status) {
  return Number(status) === 0;
}
/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}
/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = [];
  proxy.resetForm("queryRef");
  queryParams.value.pageNum = 1;
  proxy.$refs["operlogRef"].sort(defaultSort.value.prop, defaultSort.value.order);
}
/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.operId);
  multiple.value = !selection.length;
}
/** 排序触发事件 */
function handleSortChange(column, prop, order) {
  queryParams.value.orderByColumn = column.prop;
  queryParams.value.isAsc = column.order;
  getList();
}
/** 详细按钮操作 */
function handleView(row) {
  open.value = true;
  form.value = row;
}
/** 删除按钮操作 */
function handleDelete(row) {
  const operIds = row.operId || ids.value;
  proxy.$modal.confirm((isEn.value ? 'Confirm delete log ID ' : '是否确认删除日志编号为"') + operIds + (isEn.value ? '?' : '"的数据项?')).then(function () {
    return delOperlog(operIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess(tr("删除成功"));
  }).catch(() => {});
}
/** 清空按钮操作 */
function handleClean() {
  proxy.$modal.confirm(isEn.value ? "Confirm clear all operation logs?" : "是否确认清空所有操作日志数据项?").then(function () {
    return cleanOperlog();
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess(tr("清空成功"));
  }).catch(() => {});
}
/** 导出按钮操作 */
function handleExport() {
  proxy.download("monitor/operlog/export",{
    ...queryParams.value,
  }, `config_${new Date().getTime()}.xlsx`);
}

getList();
</script>
<style scoped>
.operlog-page.is-en .el-form-item__label { white-space: nowrap; }
.operlog-page .action-btn { min-width: 96px; }
.operlog-page.is-en .action-btn { min-width: 110px; }
.filter-form {
  display: flex;
  flex-wrap: wrap;
  column-gap: 12px;
}
.filter-item-time {
  width: 360px;
}
@media (max-width: 1400px) {
  .filter-item-time {
    width: 100%;
  }
}
</style>
