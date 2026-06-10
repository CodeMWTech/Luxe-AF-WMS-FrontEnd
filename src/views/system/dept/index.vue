<template>
   <div class="app-container" :class="{ 'is-en': isEn }">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item :label="tr('部门名称')" prop="deptName">
            <el-input
               v-model="queryParams.deptName"
               :placeholder="tr('请输入部门名称')"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item :label="tr('状态')" prop="status">
            <el-select v-model="queryParams.status" :placeholder="tr('部门状态')" clearable style="width: 200px">
               <el-option
                  v-for="dict in translatedNormalDisable"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">{{ tr('搜索') }}</el-button>
            <el-button icon="Refresh" @click="resetQuery">{{ tr('重置') }}</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="primary"
               plain
               icon="Plus"
               @click="handleAdd"
               v-hasPermi="['system:dept:add']"
            >{{ tr('新增') }}</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="info"
               plain
               icon="Sort"
               @click="toggleExpandAll"
            >{{ tr('展开/折叠') }}</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table
         v-if="refreshTable"
         v-loading="loading"
         :data="deptList"
         row-key="deptId"
         :default-expand-all="isExpandAll"
         :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
         <el-table-column prop="deptName" :label="tr('部门名称')" width="260"></el-table-column>
         <el-table-column prop="orderNum" :label="tr('排序')" width="200"></el-table-column>
         <el-table-column prop="status" :label="tr('状态')" width="100">
            <template #default="scope">
               <dict-tag :options="translatedNormalDisable" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column :label="tr('创建时间')" align="center" prop="createTime" width="200">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column :label="tr('操作')" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:dept:edit']">{{ tr('修改') }}</el-button>
               <el-button link type="primary" icon="Plus" @click="handleAdd(scope.row)" v-hasPermi="['system:dept:add']">{{ tr('新增') }}</el-button>
               <el-button v-if="scope.row.parentId != 0" link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:dept:remove']">{{ tr('删除') }}</el-button>
            </template>
         </el-table-column>
      </el-table>

      <!-- 添加或修改部门对话框 -->
      <el-dialog :title="title" v-model="open" width="600px" append-to-body>
         <el-form ref="deptRef" :model="form" :rules="rules" label-width="80px">
            <el-row>
               <el-col :span="24" v-if="form.parentId !== 0">
                  <el-form-item :label="tr('上级部门')" prop="parentId">
                     <el-tree-select
                        v-model="form.parentId"
                        :data="deptOptions"
                        :props="{ value: 'deptId', label: 'deptName', children: 'children' }"
                        value-key="deptId"
                        :placeholder="tr('选择上级部门')"
                        check-strictly
                     />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="tr('部门名称')" prop="deptName">
                     <el-input v-model="form.deptName" :placeholder="tr('请输入部门名称')" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="tr('显示排序')" prop="orderNum">
                     <el-input-number v-model="form.orderNum" controls-position="right" :min="0" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="tr('负责人')" prop="leader">
                     <el-input v-model="form.leader" :placeholder="tr('请输入负责人')" maxlength="20" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="tr('联系电话')" prop="phone">
                     <el-input v-model="form.phone" :placeholder="tr('请输入联系电话')" maxlength="11" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="tr('邮箱')" prop="email">
                     <el-input v-model="form.email" :placeholder="tr('请输入邮箱')" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item :label="tr('部门状态')">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="dict in translatedNormalDisable"
                           :key="dict.value"
                           :label="dict.value"
                        >{{ dict.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">{{ tr('确定') }}</el-button>
               <el-button @click="cancel">{{ tr('取消') }}</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Dept">
import { listDept, getDept, delDept, addDept, updateDept, listDeptExcludeChild } from "@/api/system/dept";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const { proxy } = getCurrentInstance();
const { sys_normal_disable } = proxy.useDict("sys_normal_disable");
const settingsStore = useSettingsStore()

const deptList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const title = ref("");
const deptOptions = ref([]);
const isExpandAll = ref(true);
const refreshTable = ref(true);

const data = reactive({
  form: {},
  queryParams: {
    deptName: undefined,
    status: undefined
  },
});

const { queryParams, form } = toRefs(data);
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const translatedNormalDisable = computed(() => (sys_normal_disable.value || []).map((it) => ({ ...it, label: tr(it.label) })))
const rules = computed(() => ({
  parentId: [{ required: true, message: tr("上级部门不能为空"), trigger: "blur" }],
  deptName: [{ required: true, message: tr("部门名称不能为空"), trigger: "blur" }],
  orderNum: [{ required: true, message: tr("显示排序不能为空"), trigger: "blur" }],
  email: [{ type: "email", message: tr("请输入正确的邮箱地址"), trigger: ["blur", "change"] }],
  phone: [{ pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/, message: tr("请输入正确的手机号码"), trigger: "blur" }]
}));

/** 查询部门列表 */
function getList() {
  loading.value = true;
  listDept(queryParams.value).then(response => {
    deptList.value = proxy.handleTree(response.data, "deptId");
    loading.value = false;
  });
}
/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}
/** 表单重置 */
function reset() {
  form.value = {
    deptId: undefined,
    parentId: undefined,
    deptName: undefined,
    orderNum: 0,
    leader: undefined,
    phone: undefined,
    email: undefined,
    status: "1"
  };
  proxy.resetForm("deptRef");
}
/** 搜索按钮操作 */
function handleQuery() {
  getList();
}
/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}
/** 新增按钮操作 */
function handleAdd(row) {
  reset();
  listDept().then(response => {
    deptOptions.value = proxy.handleTree(response.data, "deptId");
  });
  if (row != undefined) {
    form.value.parentId = row.deptId;
  }
  open.value = true;
  title.value = tr("添加部门");
}
/** 展开/折叠操作 */
function toggleExpandAll() {
  refreshTable.value = false;
  isExpandAll.value = !isExpandAll.value;
  nextTick(() => {
    refreshTable.value = true;
  });
}
/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  getDept(row.deptId).then(response => {
    form.value = response.data;
    open.value = true;
    title.value = tr("修改部门");
    listDeptExcludeChild(row.deptId).then(response => {
      deptOptions.value = proxy.handleTree(response.data, "deptId");
      if (deptOptions.value.length == 0) {
        const noResultsOptions = { deptId: form.value.parentId, deptName: form.value.parentName, children: [] };
        deptOptions.value.push(noResultsOptions);
      }
    });
  });
}
/** 提交按钮 */
function submitForm() {
  proxy.$refs["deptRef"].validate(valid => {
    if (valid) {
      if (form.value.deptId != undefined) {
        updateDept(form.value).then(response => {
          proxy.$modal.msgSuccess(tr("修改成功"));
          open.value = false;
          getList();
        });
      } else {
        addDept(form.value).then(response => {
          proxy.$modal.msgSuccess(tr("新增成功"));
          open.value = false;
          getList();
        });
      }
    }
  });
}
/** 删除按钮操作 */
function handleDelete(row) {
  proxy.$modal.confirm(isEn.value ? `Confirm delete department "${row.deptName}"?` : `是否确认删除名称为"${row.deptName}"的数据项?`).then(function() {
    return delDept(row.deptId);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess(tr("删除成功"));
  }).catch(() => {});
}

getList();
</script>
