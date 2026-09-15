<template>
  <div class="app-container supplier-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :inline="true" :label-width="queryLabelWidth" class="supplier-query-form">
        <el-form-item :label="tr('供应商名称')" prop="supplierName">
          <el-input
            v-model="queryParams.supplierName"
            :placeholder="tr('请输入') + tr('供应商名称')"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item :label="tr('供应商编码')" prop="supplierCode">
          <el-input
            v-model="queryParams.supplierCode"
            :placeholder="tr('请输入') + tr('供应商编码')"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item :label="tr('状态')" prop="status">
          <el-select v-model="queryParams.status" :placeholder="tr('请选择') + tr('状态')" clearable>
            <el-option :label="tr('正常')" :value="ENABLE_STATUS.ENABLED" />
            <el-option :label="tr('停用')" :value="ENABLE_STATUS.DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="6"><span style="font-size: large">{{ tr('供应商管理') }}</span></el-col>
        <el-col :span="1.5">
          <el-button
            type="primary"
            plain
            icon="Plus"
            class="action-btn"
            @click="handleAdd"
            v-hasPermi="['wms:supplier:edit']"
          >{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="supplierList" border class="mt20" :empty-text="tr('暂无') + tr('供应商')">
        <el-table-column label="id" prop="id" v-if="false"/>
        <el-table-column :label="tr('供应商名称')" prop="supplierName" min-width="150" show-overflow-tooltip />
        <el-table-column :label="tr('供应商编码')" prop="supplierCode" min-width="130" show-overflow-tooltip />
        <el-table-column :label="tr('关联角色')" prop="roleName" min-width="130" show-overflow-tooltip />
        <el-table-column :label="tr('联系人')" prop="contactPerson" min-width="120" show-overflow-tooltip />
        <el-table-column :label="tr('联系电话')" prop="contactPhone" min-width="130" show-overflow-tooltip />
        <el-table-column :label="tr('状态')" align="center" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === ENABLE_STATUS.ENABLED ? 'success' : 'danger'" size="small">
              {{ scope.row.status === ENABLE_STATUS.ENABLED ? tr('正常') : tr('停用') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="tr('创建时间')" prop="createTime" min-width="160" show-overflow-tooltip />
        <el-table-column :label="tr('备注')" prop="remark" min-width="150" show-overflow-tooltip />
        <el-table-column v-hasPermi="['wms:supplier:edit']" :label="tr('操作')" align="center" header-align="left" class-name="small-padding fixed-width" width="160">
          <template #default="scope">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['wms:supplier:edit']">{{ tr('修改') }}</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['wms:supplier:edit']">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-row>
        <pagination
          v-show="total>0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />
      </el-row>
    </el-card>

    <!-- 添加或修改供应商对话框 -->
    <el-drawer :title="title" v-model="open" append-to-body size="50%">
      <el-form ref="supplierRef" :model="form" :rules="rules" :label-width="drawerLabelWidth">
        <el-form-item :label="tr('供应商名称')" prop="supplierName">
          <el-input v-model="form.supplierName" :placeholder="tr('请输入') + tr('供应商名称')" />
        </el-form-item>
        <el-form-item :label="tr('供应商编码')" prop="supplierCode">
          <el-input v-model="form.supplierCode" :placeholder="tr('请输入') + tr('供应商编码')" />
        </el-form-item>
        <el-form-item :label="tr('关联角色')" prop="roleId">
          <el-select v-model="form.roleId" :placeholder="tr('请选择') + tr('关联角色')" style="width: 100%" filterable @change="handleRoleChange">
            <el-option
              v-for="role in roleOptions"
              :key="role.roleId"
              :label="role.roleName + ' (' + role.roleKey + ')'"
              :value="role.roleId"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('联系人')" prop="contactUserId">
          <el-select v-model="form.contactUserId" :placeholder="tr('请选择') + tr('联系人')"
            filterable clearable style="width: 100%" :loading="contactsLoading"
            :disabled="!form.roleId || contactsLoading || contactsError" :no-data-text="contactEmptyText">
            <el-option v-for="user in roleContacts" :key="user.userId"
              :label="contactOptionLabel(user)" :value="user.userId" />
          </el-select>
          <div v-if="contactsError" class="supplier-contact-error">
            {{ tr('联系人加载失败，请重试') }}
            <el-button link type="primary" @click="contactsReload++">{{ tr('重试') }}</el-button>
          </div>
        </el-form-item>
        <el-form-item :label="tr('联系电话')">
          <el-select v-model="contactPhoneUserId" :placeholder="phonePlaceholder"
            filterable clearable style="width: 100%" :loading="contactsLoading"
            :disabled="!form.roleId || contactsLoading || contactsError"
            :no-data-text="roleContacts.length ? tr('该角色用户均未填写联系电话') : contactEmptyText">
            <el-option v-for="user in phoneContacts" :key="user.userId"
              :label="user.contactPhone + ' (' + contactOptionLabel(user) + ')'" :value="user.userId" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tr('状态')" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="ENABLE_STATUS.ENABLED">{{ tr('正常') }}</el-radio>
            <el-radio :label="ENABLE_STATUS.DISABLED">{{ tr('停用') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="tr('备注')" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" :placeholder="tr('请输入') + tr('备注')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" :disabled="contactsLoading || contactsError" type="primary" class="action-btn" @click="submitForm">{{ tr('确认') }}</el-button>
          <el-button class="action-btn" @click="cancel">{{ tr('取消') }}</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="Supplier">
import { ENABLE_STATUS } from '@/utils/status'
import { listSupplier, getSupplier, delSupplier, addSupplier, updateSupplier, getSupplierRoleContacts } from "@/api/wms/supplier";
import { listRole } from "@/api/system/role";
import { computed, watch } from "vue";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const { proxy } = getCurrentInstance();
const settingsStore = useSettingsStore()

const supplierList = ref([]);
const open = ref(false);
const buttonLoading = ref(false);
const loading = ref(true);
const ids = ref([]);
const total = ref(0);
const title = ref("");
const roleOptions = ref([]);
const roleContacts = ref([]);
const contactsLoading = ref(false);
const contactsError = ref(false);
const contactsReload = ref(0);

const data = reactive({
  form: {
    status: ENABLE_STATUS.ENABLED
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    supplierName: undefined,
    supplierCode: undefined,
    status: undefined,
  },
  rules: {
    supplierName: [
      { required: true, message: () => tr('供应商名称不能为空'), trigger: "blur" }
    ],
    roleId: [
      { required: true, message: () => tr('关联角色不能为空'), trigger: "change" }
    ],
  }
});

const { queryParams, form, rules } = toRefs(data);
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const queryLabelWidth = computed(() => isEn.value ? '140px' : '100px')
const drawerLabelWidth = computed(() => isEn.value ? '150px' : '100px')

// Both dropdowns select the same user ID, so a phone can never belong to a different contact.
const selectedContact = computed(() => roleContacts.value.find(user => user.userId === form.value.contactUserId))
const phoneContacts = computed(() => roleContacts.value.filter(user => user.contactPhone?.trim()))
const contactPhoneUserId = computed({
  get: () => selectedContact.value?.contactPhone?.trim() ? selectedContact.value.userId : undefined,
  set: value => { form.value.contactUserId = value || null }
})
const contactEmptyText = computed(() => !form.value.roleId ? tr('请先选择关联角色') : tr('该角色下暂无用户'))
const phonePlaceholder = computed(() => selectedContact.value && !selectedContact.value.contactPhone?.trim()
  ? tr('未填写') : tr('请选择') + tr('联系电话'))

function contactOptionLabel(user) {
  const name = user.contactPerson || user.nickName || user.userName || ''
  const account = user.userName && user.userName !== name ? ' (' + user.userName + ')' : ''
  // Both user accounts and suppliers use 1=enabled, 0=disabled.
  return name + account + (String(user.status) === '0' ? ' (' + tr('停用') + ')' : '')
}

function handleRoleChange() {
  form.value.contactUserId = null
}

// Invalidate in-flight requests on role changes, drawer close and reopen.
watch(() => [open.value, form.value.roleId, contactsReload.value, form.value.id], async ([opened, roleId], previous, onCleanup) => {
  let stale = false;
  onCleanup(() => { stale = true; });
  roleContacts.value = [];
  contactsError.value = false;
  contactsLoading.value = false;
  if (!opened || roleId == null || roleId === '') return;
  contactsLoading.value = true;
  try {
    const response = await getSupplierRoleContacts(roleId);
    if (!stale) {
      roleContacts.value = (response.data || []).map(user => ({ ...user, userId: String(user.userId) }));
      if (!roleContacts.value.some(user => user.userId === form.value.contactUserId)) {
        form.value.contactUserId = null;
      }
    }
  } catch {
    if (!stale) contactsError.value = true;
  } finally {
    if (!stale) contactsLoading.value = false;
  }
});

/** 加载角色选项 */
function loadRoleOptions() {
  listRole({ pageNum: 1, pageSize: 999 }).then(response => {
    roleOptions.value = response.rows || [];
  });
}

/** 查询供应商列表 */
function getList() {
  loading.value = true;
  listSupplier(queryParams.value).then(response => {
    supplierList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
}

// 取消按钮
function cancel() {
  open.value = false;
  reset();
}

// 表单重置
function reset() {
  form.value = {
    id: null,
    roleId: null,
    supplierName: null,
    supplierCode: null,
    contactUserId: null,
    status: ENABLE_STATUS.ENABLED,
    remark: null,
  };
  proxy.resetForm("supplierRef");
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}

/** 状态切换 */
function handleStatusChange(row) {
  const actionText = row.status === ENABLE_STATUS.ENABLED ? tr('启用') : tr('停用');
  proxy.$modal.confirm(tr('确认要') + actionText + tr('供应商') + '【' + row.supplierName + '】?').then(function() {
    return updateSupplier({ id: row.id, status: row.status });
  }).then(() => {
    proxy.$modal.msgSuccess(actionText + tr('成功'));
  }).catch(function() {
    row.status = row.status === ENABLE_STATUS.ENABLED ? ENABLE_STATUS.DISABLED : ENABLE_STATUS.ENABLED;
  });
}

/** 新增按钮操作 */
function handleAdd() {
  reset();
  loadRoleOptions();
  open.value = true;
  title.value = tr("新增") + tr("供应商");
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  loadRoleOptions();
  const _id = row.id || ids.value
  getSupplier(_id).then(response => {
    form.value = response.data;
    form.value.contactUserId = form.value.contactUserId == null ? null : String(form.value.contactUserId);
    form.value.status = Number(form.value.status ?? ENABLE_STATUS.ENABLED);
    open.value = true;
    title.value = tr("修改") + tr("供应商");
  });
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["supplierRef"].validate(valid => {
    if (valid) {
      if (buttonLoading.value || contactsLoading.value || contactsError.value) return;
      buttonLoading.value = true;
      // Persist only the selected identity; names, phones and emails stay in User Management.
      const { id, roleId, supplierName, supplierCode, status, remark } = form.value;
      const payload = { id, roleId, supplierName, supplierCode, contactUserId: form.value.contactUserId || null, status, remark };
      if (form.value.id != null) {
        updateSupplier(payload).then(() => {
          proxy.$modal.msgSuccess(tr("修改成功"));
          open.value = false;
          getList();
        }).finally(() => {
          buttonLoading.value = false;
        });
      } else {
        addSupplier(payload).then(() => {
          proxy.$modal.msgSuccess(tr("新增成功"));
          open.value = false;
          getList();
        }).finally(() => {
          buttonLoading.value = false;
        });
      }
    }
  });
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _ids = row.id || ids.value;
  proxy.$modal.confirm(tr('确认删除') + tr('供应商') + '【' + row.supplierName + '】?').then(function() {
    return delSupplier(_ids);
  }).then(() => {
    loading.value = true;
    getList();
    proxy.$modal.msgSuccess(tr("删除成功"));
  }).finally(() => {
    loading.value = false;
  });
}

getList();
</script>

<style lang="scss">
.supplier-contact-error {
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 1.5;
}

.supplier-page.is-en .el-form-item__label {
  white-space: nowrap;
}

.supplier-page .action-btn {
  min-width: 96px;
}

.supplier-page.is-en .action-btn {
  min-width: 110px;
}
</style>
