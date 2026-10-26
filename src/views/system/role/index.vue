<template>
   <div class="app-container role-page" :class="{ 'is-en': isEn }">
      <el-form :model="queryParams" ref="queryRef" v-show="showSearch" :inline="true" :label-width="queryLabelWidth">
         <el-form-item label="角色名称" prop="roleName">
            <el-input
               v-model="queryParams.roleName"
               placeholder="请输入角色名称"
               clearable
               style="width: 240px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="权限字符" prop="roleKey">
            <el-input
               v-model="queryParams.roleKey"
               placeholder="请输入权限字符"
               clearable
               style="width: 240px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select
               v-model="queryParams.status"
               placeholder="角色状态"
               clearable
               style="width: 240px"
            >
               <el-option
                  v-for="dict in sys_normal_disable"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="创建时间" style="width: 308px">
            <el-date-picker
               v-model="dateRange"
               value-format="YYYY-MM-DD HH:mm:ss"
               type="daterange"
               range-separator="-"
               start-placeholder="开始日期"
               end-placeholder="结束日期"
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
               type="primary"
               plain
               icon="Plus"
               @click="handleAdd"
               v-hasPermi="['system:role:add']"
            class="action-btn">{{ tr('新增') }}</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="success"
               plain
               icon="Edit"
               :disabled="single"
               @click="handleUpdate"
               v-hasPermi="['system:role:edit']"
            class="action-btn">{{ tr('修改') }}</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['system:role:remove']"
            class="action-btn">{{ tr('删除') }}</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['system:role:export']"
            class="action-btn">{{ tr('导出') }}</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <!-- 表格数据 -->
      <el-table v-loading="loading" :data="roleList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="55" align="center" />
         <el-table-column label="角色编号" prop="roleId" width="120" />
         <el-table-column label="角色名称" prop="roleName" :show-overflow-tooltip="true" width="150" />
         <el-table-column label="权限字符" prop="roleKey" :show-overflow-tooltip="true" width="150" />
         <el-table-column label="显示顺序" prop="roleSort" width="100" />
         <el-table-column label="状态" align="center" width="100">
            <template #default="scope">
               <el-switch
                  v-model="scope.row.status"
                  active-value="1"
                  inactive-value="0"
                  @change="handleStatusChange(scope.row)"
               ></el-switch>
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-tooltip content="修改" placement="top" v-if="scope.row.roleId !== 1">
                <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:role:edit']"></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top" v-if="scope.row.roleId !== 1">
                <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:role:remove']"></el-button>
              </el-tooltip>
              <el-tooltip content="数据权限" placement="top" v-if="scope.row.roleId !== 1">
                <el-button link type="primary" icon="CircleCheck" @click="handleDataScope(scope.row)" v-hasPermi="['system:role:edit']"></el-button>
              </el-tooltip>
              <el-tooltip content="分配用户" placement="top" v-if="scope.row.roleId !== 1">
                <el-button link type="primary" icon="User" @click="handleAuthUser(scope.row)" v-hasPermi="['system:role:edit']"></el-button>
              </el-tooltip>
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

      <!-- 添加或修改角色配置对话框 -->
      <el-dialog :title="title" v-model="open" width="500px" append-to-body>
         <el-form ref="roleRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="角色名称" prop="roleName">
               <el-input v-model="form.roleName" placeholder="请输入角色名称" />
            </el-form-item>
            <el-form-item prop="roleKey">
               <template #label>
                  <span>
                     <el-tooltip content="控制器中定义的权限字符，如：@SaCheckRole('admin')" placement="top">
                        <el-icon><question-filled /></el-icon>
                     </el-tooltip>
                     权限字符
                  </span>
               </template>
               <el-input v-model="form.roleKey" placeholder="请输入权限字符" />
            </el-form-item>
            <el-form-item label="角色顺序" prop="roleSort">
               <el-input-number v-model="form.roleSort" controls-position="right" :min="0" />
            </el-form-item>
            <el-form-item label="状态">
               <el-radio-group v-model="form.status">
                  <el-radio
                     v-for="dict in sys_normal_disable"
                     :key="dict.value"
                     :label="dict.value"
                  >{{ dict.label }}</el-radio>
               </el-radio-group>
            </el-form-item>
            <el-form-item label="菜单权限">
               <el-checkbox v-model="menuExpand" @change="handleCheckedTreeExpand($event, 'menu')">展开/折叠</el-checkbox>
               <el-checkbox v-model="menuNodeAll" @change="handleCheckedTreeNodeAll($event, 'menu')">全选/全不选</el-checkbox>
               <el-checkbox v-model="form.menuCheckStrictly" @change="handleCheckedTreeConnect($event, 'menu')">父子联动</el-checkbox>
               <el-tree
                  class="tree-border"
                  :data="menuOptions"
                  show-checkbox
                  ref="menuRef"
                  node-key="id"
                  :check-strictly="!form.menuCheckStrictly"
                  empty-text="加载中，请稍候"
                  :props="{ label: 'label', children: 'children' }"
                  @check="handleMenuCheck"
               ></el-tree>
               <el-button v-if="inventoryMenuChecked" link type="primary" @click="openInventoryViewSettings">{{ tr('设置库存统计展示') }}</el-button>
            </el-form-item>
            <el-form-item label="备注">
               <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" class="action-btn" @click="submitForm">{{ tr('确认') }}</el-button>
               <el-button class="action-btn" @click="cancel">{{ tr('取消') }}</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 分配角色数据权限对话框 -->
      <el-dialog :title="title" v-model="openDataScope" width="500px" append-to-body>
         <el-form :model="form" label-width="80px">
            <el-form-item label="角色名称">
               <el-input v-model="form.roleName" :disabled="true" />
            </el-form-item>
            <el-form-item label="权限字符">
               <el-input v-model="form.roleKey" :disabled="true" />
            </el-form-item>
            <el-form-item label="权限范围">
               <el-select v-model="form.dataScope" @change="dataScopeSelectChange">
                  <el-option
                     v-for="item in dataScopeOptions"
                     :key="item.value"
                     :label="item.label"
                     :value="item.value"
                  ></el-option>
               </el-select>
            </el-form-item>
            <el-form-item label="数据权限" v-show="form.dataScope == 2">
               <el-checkbox v-model="deptExpand" @change="handleCheckedTreeExpand($event, 'dept')">展开/折叠</el-checkbox>
               <el-checkbox v-model="deptNodeAll" @change="handleCheckedTreeNodeAll($event, 'dept')">全选/全不选</el-checkbox>
               <el-checkbox v-model="form.deptCheckStrictly" @change="handleCheckedTreeConnect($event, 'dept')">父子联动</el-checkbox>
               <el-tree
                  class="tree-border"
                  :data="deptOptions"
                  show-checkbox
                  default-expand-all
                  ref="deptRef"
                  node-key="id"
                  :check-strictly="!form.deptCheckStrictly"
                  empty-text="加载中，请稍候"
                  :props="{ label: 'label', children: 'children' }"
               ></el-tree>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" class="action-btn" @click="submitDataScope">{{ tr('确认') }}</el-button>
               <el-button class="action-btn" @click="cancelDataScope">{{ tr('取消') }}</el-button>
            </div>
         </template>
      </el-dialog>

      <el-dialog
        v-model="inventoryDialog.visible"
        :title="tr('库存统计展示')"
        width="720px"
        append-to-body
        :close-on-click-modal="false"
        :before-close="beforeInventoryDialogClose"
      >
        <template v-if="inventoryDialog.step === 1">
          <el-alert
            type="warning"
            :closable="false"
            :title="tr('确定后会默认勾选商品查询、可看销售价和可看成本价。之后只取消其中一个，库存统计仍保留；两个都取消后，商品查询会取消，库存统计也会一起取消。')"
          />
          <el-checkbox v-model="inventoryDialog.browseChecked" class="inventory-view-browse">
            {{ tr('勾选商品查询、可看销售价和可看成本价') }}
          </el-checkbox>
        </template>
        <template v-else>
          <p class="inventory-view-tip">{{ tr('默认全部显示。取消勾选后，库存统计和商品管理里都不再显示该项；商品详细信息里仍保留这一项，内容显示为 --。销售价是否显示，以这里的「销售价」勾选为准。') }}</p>
          <el-checkbox-group v-model="inventoryDialog.visibleKeys" class="inventory-view-fields">
            <el-checkbox v-for="field in inventoryViewFields" :key="field.key" :label="field.key">
              {{ tr(field.label) }}
            </el-checkbox>
          </el-checkbox-group>
          <div class="inventory-view-cost">
            <span>{{ tr('成本价系数') }}</span>
            <el-input-number
              v-model="inventoryDialog.costFactor"
              :min="0.01"
              :max="100"
              :precision="2"
              :step="0.1"
              :disabled="!inventoryDialog.visibleKeys.includes('cost')"
            />
            <span class="inventory-view-cost-hint">{{ tr('这个账号看到的成本价 = 真实成本价 × 系数。商品管理里的成本价也按这个系数显示。') }}</span>
          </div>
        </template>
        <template #footer>
          <el-button v-if="inventoryDialog.step === 2" @click="inventoryDialog.step = 1">{{ tr('上一步') }}</el-button>
          <el-button v-if="inventoryDialog.step === 2" @click="resetInventoryViewFields">{{ tr('默认全部显示') }}</el-button>
          <el-button @click="cancelInventoryDialog">{{ tr('取消') }}</el-button>
          <el-button type="primary" @click="confirmInventoryDialog">{{ inventoryDialog.step === 1 ? tr('下一步') : tr('确定') }}</el-button>
        </template>
      </el-dialog>
   </div>
</template>

<script setup name="Role">
import { addRole, changeRoleStatus, dataScope, delRole, getRole, listRole, updateRole, deptTreeSelect } from "@/api/system/role";
import { listMenu, roleMenuTreeselect, treeselect as menuTreeselect } from "@/api/system/menu";
import { buildHiddenMenuIdSet, filterTreeselectMenuTree } from "@/utils/hiddenMenus";
import { deleteRoleInventoryView, getRoleInventoryView, saveRoleInventoryView } from "@/api/wms/roleInventoryView";
import { computed } from "vue";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const router = useRouter();
const { proxy } = getCurrentInstance();
const { sys_normal_disable } = proxy.useDict("sys_normal_disable");
const settingsStore = useSettingsStore()
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const queryLabelWidth = computed(() => (isEn.value ? '120px' : '68px'))

const roleList = ref([]);
const open = ref(false);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const dateRange = ref([]);
const menuOptions = ref([]);
const menuExpand = ref(false);
const menuNodeAll = ref(false);
const deptExpand = ref(true);
const deptNodeAll = ref(false);
const deptOptions = ref([]);
const openDataScope = ref(false);
const menuRef = ref(null);
const deptRef = ref(null);
const menuRecords = ref([]);
const inventoryMenuChecked = ref(false);
const inventoryViewFields = [
  { key: 'image', label: '商品图片' },
  { key: 'category', label: '商品分类' },
  { key: 'brand', label: '商品品牌' },
  { key: 'year', label: '年份' },
  { key: 'condition', label: '成色' },
  { key: 'model', label: '包型' },
  { key: 'material', label: '材质' },
  { key: 'exteriorMaterial', label: '外观材质' },
  { key: 'origin', label: '产地' },
  { key: 'size', label: '尺寸' },
  { key: 'dimensions', label: '长宽高' },
  { key: 'cared', label: '是否已护理' },
  { key: 'defect', label: '瑕疵' },
  { key: 'accessories', label: '配件' },
  { key: 'authAgency', label: '鉴定机构' },
  { key: 'purchaser', label: '采购人' },
  { key: 'remark', label: '备注' },
  { key: 'supplier', label: '供应商' },
  { key: 'quantity', label: '数量' },
  { key: 'stockQuantity', label: '库存数量' },
  { key: 'receipt', label: '入库信息' },
  { key: 'shipment', label: '出库时间' },
  { key: 'outboundPlatform', label: '出库平台' },
  { key: 'turnoverDays', label: '周转天数' },
  { key: 'selling', label: '销售价' },
  { key: 'profit', label: '利润' },
  { key: 'cost', label: '成本价' }
];
const inventoryView = ref(emptyInventoryView());
const inventoryDialog = ref({
  visible: false,
  step: 1,
  browseChecked: false,
  visibleKeys: inventoryViewFields.map(field => field.key),
  costFactor: 1.2,
  openedFromCheck: false,
  confirmed: false
});
let suppressMenuCheck = false;

function emptyInventoryView() {
  return { configured: false, costFactor: 1.2, hiddenFields: [] };
}
function rememberMenus(list) {
  menuRecords.value = Array.isArray(list) ? list : [];
}
function findMenu(menuName, perms) {
  return menuRecords.value.find(item => item.menuName === menuName && item.perms === perms);
}
function findMenuByPerm(perms) {
  return menuRecords.value.find(item => item.perms === perms);
}
function inventoryMenu() {
  return findMenu('库存统计', 'wms:inventory:all');
}
function isInventoryNode(data) {
  const menu = inventoryMenu();
  return !!menu && String(data?.id) === String(menu.menuId);
}
function isInventoryChecked() {
  const menu = inventoryMenu();
  if (!menu || !menuRef.value) return false;
  return menuRef.value.getCheckedKeys().map(String).includes(String(menu.menuId));
}
function isItemBrowseChecked() {
  const browse = findMenu('商品查询', 'wms:item:list');
  if (!browse || !menuRef.value) return false;
  const id = String(browse.menuId);
  const checked = menuRef.value.getCheckedKeys().map(String);
  const halfChecked = menuRef.value.getHalfCheckedKeys().map(String);
  return checked.includes(id) || halfChecked.includes(id);
}
function uncheckInventoryMenu() {
  const menu = inventoryMenu();
  if (menu && menuRef.value) {
    suppressMenuCheck = true;
    menuRef.value.setChecked(menu.menuId, false, false);
    suppressMenuCheck = false;
  }
  inventoryView.value = emptyInventoryView();
  refreshInventoryMenuChecked();
}
function refreshInventoryMenuChecked() {
  inventoryMenuChecked.value = isInventoryChecked();
}

/** 数据范围选项*/
const dataScopeOptions = ref([
  { value: "1", label: "全部数据权限" },
  { value: "2", label: "自定数据权限" },
  { value: "3", label: "本部门数据权限" },
  { value: "4", label: "本部门及以下数据权限" },
  { value: "5", label: "仅本人数据权限" },
  { value: "6", label: "供应商数据权限" }
]);

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    roleName: undefined,
    roleKey: undefined,
    status: undefined
  },
  rules: {
    roleName: [{ required: true, message: "角色名称不能为空", trigger: "blur" }],
    roleKey: [{ required: true, message: "权限字符不能为空", trigger: "blur" }],
    roleSort: [{ required: true, message: "角色顺序不能为空", trigger: "blur" }]
  },
});

const { queryParams, form, rules } = toRefs(data);

/** 查询角色列表 */
function getList() {
  loading.value = true;
  listRole(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    roleList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
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
  handleQuery();
}
/** 删除按钮操作 */
function handleDelete(row) {
  const roleIds = row.roleId || ids.value;
  proxy.$modal.confirm((isEn.value ? 'Confirm delete role ID ' : '是否确认删除角色编号为"') + roleIds + (isEn.value ? '?' : '"的数据项?')).then(function () {
    return delRole(roleIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
}
/** 导出按钮操作 */
function handleExport() {
  proxy.download("system/role/export", {
    ...queryParams.value,
  }, `role_${new Date().getTime()}.xlsx`);
}
/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.roleId);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}
/** 角色状态修改 */
function handleStatusChange(row) {
  let text = row.status === "1" ? (isEn.value ? "Enable" : "启用") : (isEn.value ? "Disable" : "停用");
  proxy.$modal.confirm((isEn.value ? 'Confirm to ' : '确认要"') + text + (isEn.value ? ' role "' : '""') + row.roleName + (isEn.value ? '"?' : '"角色吗?')).then(function () {
    return changeRoleStatus(row.roleId, row.status);
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功");
  }).catch(function () {
    row.status = row.status === "0" ? "1" : "0";
  });
}
/** 更多操作 */
function handleCommand(command, row) {
  switch (command) {
    case "handleDataScope":
      handleDataScope(row);
      break;
    case "handleAuthUser":
      handleAuthUser(row);
      break;
    default:
      break;
  }
}
/** 分配用户 */
function handleAuthUser(row) {
  router.push("/system/role-auth/user/" + row.roleId);
}
/** 查询菜单树结构 */
function getMenuTreeselect() {
  Promise.all([listMenu(), menuTreeselect()]).then(([listRes, treeRes]) => {
    rememberMenus(listRes.data);
    const { hiddenIds, menuTypeById } = buildHiddenMenuIdSet(listRes.data);
    menuOptions.value = filterTreeselectMenuTree(treeRes.data, hiddenIds, menuTypeById);
  });
}
/** 所有部门节点数据 */
function getDeptAllCheckedKeys() {
  // 目前被选中的部门节点
  let checkedKeys = deptRef.value.getCheckedKeys();
  // 半选中的部门节点
  let halfCheckedKeys = deptRef.value.getHalfCheckedKeys();
  checkedKeys.unshift.apply(checkedKeys, halfCheckedKeys);
  return checkedKeys;
}
/** 重置新增的表单以及其他数据  */
function reset() {
  if (menuRef.value != undefined) {
    menuRef.value.setCheckedKeys([]);
  }
  menuExpand.value = false;
  menuNodeAll.value = false;
  deptExpand.value = true;
  deptNodeAll.value = false;
  form.value = {
    roleId: undefined,
    roleName: undefined,
    roleKey: undefined,
    roleSort: 0,
    status: "1",
    menuIds: [],
    deptIds: [],
    menuCheckStrictly: true,
    deptCheckStrictly: true,
    remark: undefined
  };
  inventoryView.value = emptyInventoryView();
  inventoryMenuChecked.value = false;
  proxy.resetForm("roleRef");
}
/** 添加角色 */
function handleAdd() {
  reset();
  getMenuTreeselect();
  open.value = true;
  title.value = isEn.value ? "Add Role" : "添加角色";
}
/** 修改角色 */
function handleUpdate(row) {
  reset();
  const roleId = row.roleId || ids.value;
  const roleMenu = getRoleMenuTreeselect(roleId);
  getRole(roleId).then(response => {
    form.value = response.data;
    form.value.roleSort = Number(form.value.roleSort);
    open.value = true;
    getRoleInventoryView(roleId).then(viewRes => {
      const data = viewRes.data || {};
      inventoryView.value = {
        configured: Boolean(data.configured),
        costFactor: data.costFactor ?? 1.2,
        hiddenFields: data.hiddenFields || []
      };
    }).catch(() => {
      inventoryView.value = emptyInventoryView();
    });
    nextTick(() => {
      roleMenu.then((res) => {
        let checkedKeys = res.data.checkedKeys;
        suppressMenuCheck = true;
        checkedKeys.forEach((v) => {
          nextTick(() => {
            menuRef.value.setChecked(v, true, false);
          });
        });
        nextTick(() => {
          suppressMenuCheck = false;
          refreshInventoryMenuChecked();
        });
      });
    });
    title.value = isEn.value ? "Edit Role" : "修改角色";
  });
}
/** 根据角色ID查询菜单树结构 */
function getRoleMenuTreeselect(roleId) {
  return Promise.all([listMenu(), roleMenuTreeselect(roleId)]).then(([listRes, response]) => {
    rememberMenus(listRes.data);
    const { hiddenIds, menuTypeById } = buildHiddenMenuIdSet(listRes.data);
    menuOptions.value = filterTreeselectMenuTree(response.data.menus, hiddenIds, menuTypeById);
    const checkedKeys = (response.data.checkedKeys || []).filter(id => !hiddenIds.has(id));
    return {
      ...response,
      data: { ...response.data, menus: menuOptions.value, checkedKeys }
    };
  });
}
/** 根据角色ID查询部门树结构 */
function getDeptTree(roleId) {
  return deptTreeSelect(roleId).then(response => {
    deptOptions.value = response.data.depts;
    return response;
  });
}
/** 树权限（展开/折叠）*/
function handleCheckedTreeExpand(value, type) {
  if (type == "menu") {
    let treeList = menuOptions.value;
    for (let i = 0; i < treeList.length; i++) {
      menuRef.value.store.nodesMap[treeList[i].id].expanded = value;
    }
  } else if (type == "dept") {
    let treeList = deptOptions.value;
    for (let i = 0; i < treeList.length; i++) {
      deptRef.value.store.nodesMap[treeList[i].id].expanded = value;
    }
  }
}
/** 树权限（全选/全不选） */
function handleCheckedTreeNodeAll(value, type) {
  if (type == "menu") {
    menuRef.value.setCheckedNodes(value ? menuOptions.value : []);
  } else if (type == "dept") {
    deptRef.value.setCheckedNodes(value ? deptOptions.value : []);
  }
}
/** 树权限（父子联动） */
function handleCheckedTreeConnect(value, type) {
  if (type == "menu") {
    form.value.menuCheckStrictly = value ? true : false;
  } else if (type == "dept") {
    form.value.deptCheckStrictly = value ? true : false;
  }
}
/** 所有菜单节点数据 */
function getMenuAllCheckedKeys() {
  // 目前被选中的菜单节点
  let checkedKeys = menuRef.value.getCheckedKeys();
  // 半选中的菜单节点
  let halfCheckedKeys = menuRef.value.getHalfCheckedKeys();
  checkedKeys.unshift.apply(checkedKeys, halfCheckedKeys);
  return checkedKeys;
}
/** 提交按钮 */
function submitForm() {
  proxy.$refs["roleRef"].validate(valid => {
    if (!valid) return;
    form.value.menuIds = getMenuAllCheckedKeys();
    const request = form.value.roleId != undefined ? updateRole(form.value) : addRole(form.value);
    request.then(response => {
      const roleId = form.value.roleId != undefined ? form.value.roleId : response.data;
      return persistInventoryView(roleId);
    }).then(() => {
      proxy.$modal.msgSuccess(form.value.roleId != undefined ? "修改成功" : "新增成功");
      open.value = false;
      getList();
    });
  });
}
function persistInventoryView(roleId) {
  if (!roleId) return Promise.resolve();
  if (isInventoryChecked() && inventoryView.value.configured) {
    return saveRoleInventoryView({
      roleId,
      costFactor: inventoryView.value.costFactor,
      hiddenFields: inventoryView.value.hiddenFields
    });
  }
  if (!isInventoryChecked()) {
    return deleteRoleInventoryView(roleId);
  }
  return Promise.resolve();
}
function handleMenuCheck(data) {
  if (suppressMenuCheck) return;
  refreshInventoryMenuChecked();
  if (isInventoryNode(data)) {
    if (!isInventoryChecked()) {
      inventoryView.value = emptyInventoryView();
      return;
    }
    openInventoryDialog(true);
    return;
  }
  if (isInventoryChecked() && !isItemBrowseChecked()) {
    uncheckInventoryMenu();
    proxy.$modal.msgWarning(tr('商品查询已取消，库存统计已一并取消'));
  }
}
function openInventoryViewSettings() {
  openInventoryDialog(false);
}
function openInventoryDialog(fromCheck) {
  const browseChecked = isItemBrowseChecked();
  const hidden = new Set(inventoryView.value.hiddenFields || []);
  inventoryDialog.value.openedFromCheck = fromCheck;
  inventoryDialog.value.confirmed = false;
  inventoryDialog.value.browseChecked = browseChecked;
  inventoryDialog.value.costFactor = Number(inventoryView.value.costFactor || 1.2);
  inventoryDialog.value.visibleKeys = inventoryViewFields.map(field => field.key).filter(key => !hidden.has(key));
  inventoryDialog.value.step = !fromCheck && browseChecked ? 2 : 1;
  inventoryDialog.value.visible = true;
}
function resetInventoryViewFields() {
  inventoryDialog.value.visibleKeys = inventoryViewFields.map(field => field.key);
  inventoryDialog.value.costFactor = 1.2;
}
function confirmInventoryDialog() {
  if (inventoryDialog.value.step === 1) {
    if (!inventoryDialog.value.browseChecked) {
      proxy.$modal.msgWarning(tr('请先勾选商品查询、可看销售价和可看成本价'));
      return;
    }
    const browse = findMenu('商品查询', 'wms:item:list');
    const parent = findMenu('商品管理', 'wms:item:list');
    const selling = findMenuByPerm('wms:itemSellingPrice:view');
    const cost = findMenuByPerm('wms:itemCostPrice:view');
    if (!browse || !selling || !cost) {
      proxy.$modal.msgError(tr('没有找到商品查询、可看销售价或可看成本价'));
      return;
    }
    suppressMenuCheck = true;
    if (parent) menuRef.value.setChecked(parent.menuId, true, false);
    menuRef.value.setChecked(browse.menuId, true, false);
    menuRef.value.setChecked(selling.menuId, true, false);
    menuRef.value.setChecked(cost.menuId, true, false);
    suppressMenuCheck = false;
    inventoryDialog.value.step = 2;
    return;
  }
  const factor = Number(inventoryDialog.value.costFactor);
  if (!factor || factor <= 0) {
    proxy.$modal.msgWarning(tr('请输入大于 0 的成本价系数'));
    return;
  }
  inventoryView.value = {
    configured: true,
    costFactor: factor,
    hiddenFields: inventoryViewFields
      .map(field => field.key)
      .filter(key => !inventoryDialog.value.visibleKeys.includes(key))
  };
  inventoryDialog.value.confirmed = true;
  inventoryDialog.value.visible = false;
  refreshInventoryMenuChecked();
}
function finishInventoryDialog() {
  if (!inventoryDialog.value.confirmed && inventoryDialog.value.openedFromCheck) {
    const menu = inventoryMenu();
    if (menu && menuRef.value) {
      suppressMenuCheck = true;
      menuRef.value.setChecked(menu.menuId, false, false);
      suppressMenuCheck = false;
    }
    inventoryView.value = emptyInventoryView();
  }
  inventoryDialog.value.confirmed = false;
  inventoryDialog.value.openedFromCheck = false;
  refreshInventoryMenuChecked();
}
function beforeInventoryDialogClose(done) {
  finishInventoryDialog();
  done();
}
function cancelInventoryDialog() {
  finishInventoryDialog();
  inventoryDialog.value.visible = false;
}
/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}
/** 选择角色权限范围触发 */
function dataScopeSelectChange(value) {
  if (value !== "2") {
    deptRef.value.setCheckedKeys([]);
  }
}
/** 分配数据权限操作 */
function handleDataScope(row) {
  reset();
  const deptTreeSelect = getDeptTree(row.roleId);
  getRole(row.roleId).then(response => {
    form.value = response.data;
    openDataScope.value = true;
    nextTick(() => {
      deptTreeSelect.then(res => {
        nextTick(() => {
          if (deptRef.value) {
            deptRef.value.setCheckedKeys(res.data.checkedKeys);
          }
        });
      });
    });
    title.value = isEn.value ? "Assign Data Scope" : "分配数据权限";
  });
}
/** 提交按钮（数据权限） */
function submitDataScope() {
  if (form.value.roleId != undefined) {
    form.value.deptIds = getDeptAllCheckedKeys();
    dataScope(form.value).then(response => {
      proxy.$modal.msgSuccess("修改成功");
      openDataScope.value = false;
      getList();
    });
  }
}
/** 取消按钮（数据权限）*/
function cancelDataScope() {
  openDataScope.value = false;
  reset();
}

getList();
</script>
<style scoped>
.role-page.is-en .el-form-item__label { white-space: nowrap; }
.role-page .action-btn { min-width: 96px; }
.role-page.is-en .action-btn { min-width: 110px; }
.inventory-view-browse { margin-top: 16px; }
.inventory-view-tip { margin: 0 0 12px; line-height: 1.6; }
.inventory-view-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.inventory-view-cost { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.inventory-view-cost-hint { color: var(--el-text-color-secondary); }
</style>
