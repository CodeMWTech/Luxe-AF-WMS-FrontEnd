<template>
  <div class="app-container item-brand-page" :class="{ 'is-en': isEn }">
    <el-card>
      <el-form :model="queryParams" ref="queryRef" :inline="true" :label-width="queryLabelWidth" class="brand-query-form">
        <el-form-item :label="tr('品牌名称')" prop="brandName" :label-width="isEn ? '110px' : undefined">
          <el-input
            v-model="queryParams.brandName"
            :placeholder="tr('请输入') + tr('品牌名称')"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" class="action-btn" @click="handleQuery">{{ tr('搜索') }}</el-button>
          <el-button icon="Refresh" class="action-btn" @click="resetQuery">{{ tr('重置') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">

      <el-row :gutter="10" class="mb8" type="flex" justify="space-between">
        <el-col :span="6"><span style="font-size: large">{{ tr('品牌列表') }}</span></el-col>
        <el-col :span="1.5">
          <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['wms:itemBrand:edit']"
          >{{ tr('新增') }}</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="itemBrandList" border class="mt20" :empty-text="tr('暂无') + tr('品牌')">
        <el-table-column :label="tr('品牌名称')" prop="brandName" min-width="220" show-overflow-tooltip />
        <el-table-column :label="tr('创建时间')" prop="createTime" width="200"/>
        <el-table-column v-hasPermi="['wms:itemBrand:edit']" :label="tr('操作')" align="right" class-name="small-padding fixed-width" width="180">
          <template #default="scope">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['wms:itemBrand:edit']">{{ tr('修改') }}</el-button>
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['wms:itemBrand:edit']">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

    </el-card>
    <!-- 添加或修改商品品牌对话框 -->
    <el-drawer :title="title" v-model="open" size="50%" append-to-body>
      <el-form ref="itemBrandRef" :model="form" :rules="rules" :label-width="drawerLabelWidth">
        <el-form-item :label="tr('品牌名称')" prop="brandName">
          <el-input v-model="form.brandName" :placeholder="tr('请输入') + tr('品牌名称')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="buttonLoading" type="primary" class="action-btn" @click="submitForm">{{ tr('确认') }}</el-button>
          <el-button class="action-btn" @click="cancel">{{ tr('取消') }}</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="ItemBrand">
import { listItemBrand, getItemBrand, delItemBrand, addItemBrand, updateItemBrand, listItemBrandPage } from "@/api/wms/itemBrand";
import {ElMessageBox} from "element-plus";
import {useWmsStore} from '@/store/modules/wms'
import { computed } from "vue";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const { proxy } = getCurrentInstance();
const settingsStore = useSettingsStore()

const itemBrandList = ref([]);
const open = ref(false);
const buttonLoading = ref(false);
const loading = ref(true);
const ids = ref([]);
const total = ref(0);
const title = ref("");

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    brandName: undefined,
  },
  rules: {
    id: [
      { required: true, message: "不能为空", trigger: "blur" }
    ],
    brandName: [
      { required: true, message: "品牌名称不能为空", trigger: "blur" }
    ],
  }
});

const { queryParams, form, rules } = toRefs(data);
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const queryLabelWidth = computed(() => (isEn.value ? '90px' : '68px'))
const drawerLabelWidth = computed(() => (isEn.value ? '110px' : '80px'))

/** 查询商品品牌列表 */
async function getList() {
  loading.value = true;
  await useWmsStore().getItemBrandList()
  let list = [...useWmsStore().itemBrandList]
  if (queryParams.value.brandName) {
    list = list.filter(it => it.brandName === queryParams.value.brandName)
  }
  itemBrandList.value = list;
  loading.value = false;
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
    brandName: null,
    createBy: null,
    createTime: null,
    updateBy: null,
    updateTime: null
  };
  proxy.resetForm("itemBrandRef");
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

/** 新增按钮操作 */
function handleAdd() {
  reset();
  open.value = true;
  title.value = tr("新增") + tr("品牌");
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  const _id = row.id || ids.value
  getItemBrand(_id).then(response => {
    form.value = response.data;
    open.value = true;
    title.value = tr("修改") + tr("品牌");
  });
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["itemBrandRef"].validate(valid => {
    if (valid) {
      buttonLoading.value = true;
      if (form.value.id != null) {
        updateItemBrand(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        }).finally(() => {
          buttonLoading.value = false;
        });
      } else {
        addItemBrand(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功");
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
  proxy.$modal.confirm('确认删除品牌【' + row.brandName + '】吗？').then(function() {
    return delItemBrand(_ids);
  }).then(() => {
    loading.value = true;
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).finally(() => {
    loading.value = false;
  });
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('wms/itemBrand/export', {
    ...queryParams.value
  }, `itemBrand_${new Date().getTime()}.xlsx`)
}

getList();
</script>

<style lang="scss">
.item-brand-page.is-en .el-form-item__label {
  white-space: nowrap;
}

.item-brand-page .action-btn {
  min-width: 96px;
}

.item-brand-page.is-en .action-btn {
  min-width: 110px;
}
</style>
