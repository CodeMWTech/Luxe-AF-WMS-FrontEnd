<template>
  <div v-if="!checking" class="check-edit-page" :class="{ 'is-en': isEn }" style="display: flex;justify-content: center;align-items: center;height: 80vh">
    <el-card :header="isEn ? 'Select warehouse to start stocktake' : '选择仓库后开始盘库'" >
      <el-form>
        <el-form-item :label="tr('仓库')" prop="warehouseId">
          <el-select v-model="form.warehouseId" :placeholder="tr('请选择仓库')" :disabled="checking"
                     filterable>
            <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName"
                       :value="item.id"/>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" plain="plain" size="default" @click="startCheck" class="action-btn" style="width: 100%!important;">{{ isEn ? 'Start Stocktake' : '开始盘库' }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
  <div v-else v-loading="loading" class="check-edit-page" :class="{ 'is-en': isEn }">
    <div class="receipt-order-edit-wrapper app-container" style="margin-bottom: 60px">
      <el-card :header="tr('盘库单') + tr('基本资料')">
        <el-form :label-width="formLabelWidth" :model="form" ref="checkForm" :rules="rules">
          <el-row :gutter="24">
            <el-col :span="11">
              <el-form-item :label="tr('盘库单号')" prop="orderNo">
                <el-input class="w200" v-model="form.orderNo" :placeholder="tr('盘库单号')"
                          :disabled="form.id"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('仓库')" prop="warehouseId">
                <el-select v-model="form.warehouseId" :placeholder="tr('请选择仓库')" :disabled="checking"
                           filterable>
                  <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName"
                             :value="item.id"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="24">
            <el-col :span="11">
              <el-form-item :label="tr('备注')" prop="remark">
                <el-input
                  v-model="form.remark"
                  placeholder="备注...100个字符以内"
                  rows="4"
                  maxlength="100"
                  type="textarea"
                  show-word-limit="show-word-limit"
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="isEn ? 'Counted Qty' : '盘点数量'" prop="totalQuantity">
                <el-input-number v-model="form.totalQuantity" :controls="false" :precision="0"
                                 :disabled="true"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>
      <el-card :header="tr('商品明细')" class="mt10">
        <div class="receipt-order-content">
          <div class="flex-space-between mb8">
            <div>
              <el-button type="primary" plain="plain" size="default" @click="showSkuSelect" icon="Plus"
                :disabled="!form.warehouseId">{{ isEn ? 'Add SKU' : '新增SKU' }}
              </el-button>
              <el-button
                type="primary"
                plain="plain"
                size="default"
                class="ml10"
                @click="showScanAddItem"
                :disabled="!form.warehouseId"
              >
                {{ isEn ? 'Scan Mode' : '扫码枪模式' }}
              </el-button>
            </div>
          </div>
          <el-table :data="form.details" border :empty-text="tr('暂无商品明细')">
            <el-table-column label="商品信息" prop="itemSku.itemName">
              <template #default="scope">
                  <div>{{
                      (scope.row.item?.itemName || '-') + (scope.row.item?.itemCode ? ('(' + scope.row.item.itemCode + ')') : '')
                    }}
                  </div>
                  <div v-if="scope.row.item?.itemBrand && getBrandName(scope.row.item.itemBrand)">
                    品牌：{{ getBrandName(scope.row.item.itemBrand) }}
                  </div>
                </template>
            </el-table-column>
            <el-table-column label="规格信息">
              <template #default="{ row }">
                <template v-if="row.newInventoryDetail">
                  <div v-if="row.itemSku">{{ (row.itemSku?.skuCode || '-') + (row.itemSku?.barcode ? ('(' + row.itemSku.barcode + ')') : '') }}</div>
                  <div v-else>请选择商品</div>
                </template>
                <template v-else>
                  <div>{{ (row.itemSku?.skuCode || '-') + (row.itemSku?.barcode ? ('(' + row.itemSku.barcode + ')') : '') }}</div>
                </template>
              </template>
            </el-table-column>
            <el-table-column :label="isEn ? 'Counted Quantity' : '盘点到的库存'" prop="checkQuantity" width="180">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.checkQuantity"
                  :placeholder="isEn ? 'Counted Quantity' : '盘点到的库存'"
                  :min="0"
                  :precision="0"
                  @change="handleChangeQuantity"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                <el-button icon="Delete" type="danger" plain size="small"
                           @click="handleDeleteDetail(scope.row, scope.$index)" link>删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
      <SkuSelect
        ref="skuSelectRef"
        :model-value="skuSelectShow"
        :scan-mode="scanMode"
        :selected-sku="selectedSku"
        :warehouse-id="form.warehouseId"
        @handleOkClick="handleOkClick"
        @handleCancelClick="skuSelectShow = false"
        :size="'50%'"
      />
    </div>
    <div class="footer-global" v-if="checking">
      <div class="btn-box">
        <div>
          <el-button @click="doCheck" type="primary" class="ml10 action-btn">{{ isEn ? 'Finalize Result' : '库存核查' }}</el-button>
          <el-button @click="updateToInvalid" type="danger" v-if="form.id" class="action-btn">{{ tr('作废') }}</el-button>
        </div>
        <div>
          <el-button @click="save" type="primary" class="action-btn">{{ tr('暂存') }}</el-button>
          <el-button @click="cancel" class="mr10 action-btn">{{ tr('取消') }}</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="CheckOrderEdit">
import {computed, getCurrentInstance, onMounted, reactive, ref, toRefs} from "vue";
const skuSelectRef = ref(null)
import {addCheckOrder, getCheckOrder, updateCheckOrder, check} from "@/api/wms/checkOrder";
import {delCheckOrderDetail} from "@/api/wms/checkOrderDetail";
import {ElMessage} from "element-plus";
import {useRoute} from "vue-router";
import {useWmsStore} from '@/store/modules/wms'
import {generateNo} from '@/utils/ruoyi'
import SkuSelect from "@/views/components/SkuSelect.vue";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const {proxy} = getCurrentInstance();
const wmsStore = useWmsStore()
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const formLabelWidth = computed(() => (isEn.value ? '138px' : '108px'))
const loading = ref(false)
const selectedSku = ref([])
const initFormData = {
  id: undefined,
  orderNo: undefined,
  orderStatus: 0,
  remark: undefined,
  warehouseId: undefined,
  totalQuantity: 0,
  details: [],
}
const data = reactive({
  form: {...initFormData},
  rules: {
    orderNo: [
      {required: true, message: "盘库单号不能为空", trigger: "blur"}
    ],
    warehouseId: [
      {required: true, message: "请选择仓库", trigger: ['blur', 'change']}
    ],
  }
});
const {form, rules} = toRefs(data);
const cancel = async () => {
  await proxy?.$modal.confirm('确认取消编辑盘库单吗？');
  close()
}
const close = () => {
  const obj = {path: "/checkOrder"};
  proxy?.$tab.closeOpenPage(obj);
}
const skuSelectShow = ref(false)
const getBrandName = (brandId) => {
  if (brandId === null || brandId === undefined) return ''
  return wmsStore.itemBrandMap.get(brandId)?.brandName || ''
}
const normalizeDetailRow = (detail = {}) => {
  const skuId = detail.skuId ?? detail.itemSku?.id ?? detail.itemSkuId
  const itemSku = detail.itemSku || {
    id: skuId,
    skuCode: detail.skuCode,
    barcode: detail.barcode,
    costPrice: detail.costPrice,
    sellingPrice: detail.sellingPrice
  }
  const item = detail.item || {
    id: detail.itemId,
    itemName: detail.itemName,
    itemCode: detail.itemCode,
    itemBrand: detail.itemBrand
  }
  return {
    ...detail,
    skuId,
    warehouseId: detail.warehouseId ?? form.value.warehouseId,
    quantity: detail.actualQuantity ?? detail.quantity,
    checkQuantity: detail.countedQuantity ?? detail.checkQuantity ?? 1,
    itemSku,
    item
  }
}
const getDetailCheckQuantity = (detail = {}) => {
  return Number(detail.countedQuantity ?? detail.checkQuantity ?? 0)
}
const isCountedDetail = (detail = {}) => {
  return getDetailCheckQuantity(detail) > 0
}
// 盘库中标识
const checking = ref(false)
// 扫码枪模式标记
const scanMode = ref(false)

// 选择商品 start
const startCheck = () => {
  if (!form.value.warehouseId) {
    return ElMessage.error('请先选择仓库！')
  }
  form.value.details = []
  selectedSku.value = []
  form.value.totalQuantity = 0
  checking.value = true
}
// 选择成功
const handleOkClick = (item) => {
  if (!scanMode.value) {
    skuSelectShow.value = false
  }
  const selectedMap = new Map((selectedSku.value || []).map((it) => [String(it.id), it]))
  const newDetails = []
  item.forEach(it => {
    const skuId = it.id ?? it.skuId ?? it.itemSku?.id
    const skuKey = String(skuId)
    selectedMap.set(skuKey, {...it, id: skuId})
    const existedDetail = form.value.details.find(detail => String(detail.skuId ?? detail.itemSku?.id) === skuKey)
    if (existedDetail) {
      if (scanMode.value) {
        existedDetail.checkQuantity = Number(existedDetail.checkQuantity || 0) + 1
      }
    } else {
      newDetails.push({
        itemSku: it.itemSku,
        item: it.item,
        skuId,
        warehouseId: form.value.warehouseId,
        inventoryId: null,
        checkQuantity: 1,
        newInventory: true
      })
    }
  })
  selectedSku.value = Array.from(selectedMap.values())
  if (newDetails.length) {
    form.value.details.unshift(...newDetails)
  }
  handleChangeQuantity()
}

const showSkuSelect = () => {
  scanMode.value = false
  skuSelectShow.value = true
}

const showScanAddItem = () => {
  scanMode.value = true
  skuSelectShow.value = true
}
// 选择商品 end

// 初始化receipt-order-form ref
const checkForm = ref()

const save = async () => {
  await proxy?.$modal.confirm('确认暂存盘库单吗？');
  doSave()
}
const getParams = (orderStatus) => {
  let details = []
  if (form.value.details?.length) {
    // 构建参数
    details = form.value.details.filter(isCountedDetail).map(it => {
      return {
        id: it.id,
        orderId: form.value.id,
        skuId: it.skuId,
        checkQuantity: it.checkQuantity,
        warehouseId: form.value.warehouseId,
      }
    })
  }
  return  {
    id: form.value.id,
    orderNo: form.value.orderNo,
    orderStatus,
    remark: form.value.remark,
    totalQuantity: form.value.totalQuantity,
    warehouseId: form.value.warehouseId,
    details: details
  }
}
const doSave = (orderStatus = 0) => {
  //验证shipmentForm表单
  checkForm.value?.validate((valid) => {
    // 校验
    if (!valid) {
      return ElMessage.error('请填写必填项')
    }
    const params = getParams(orderStatus);
    loading.value = true
    if (params.id) {
      updateCheckOrder(params).then((res) => {
        if (res.code === 200) {
          ElMessage.success('盘库单已暂存')
          close()
        } else {
          ElMessage.error(res.msg)
        }
      }).finally(() => {
        loading.value = false
      })
    } else {
      addCheckOrder(params).then((res) => {
        if (res.code === 200) {
          ElMessage.success('盘库单已暂存')
          close()
        } else {
          ElMessage.error(res.msg)
        }
      }).finally(() => {
        loading.value = false
      })
    }
  })
}


const updateToInvalid = async () => {
  await proxy?.$modal.confirm('确认作废盘库单吗？');
  doSave(-1)
}

const doCheck = async () => {
  await proxy?.$modal.confirm('确认完成盘点并固化盘点对照结果吗？此操作只保存盘点结果，不会变更仓库库存。<br><span style="color: #f56c6c;">一旦确认，永久保存不可撤销</span>', {
    dangerouslyUseHTMLString: true
  });
  checkForm.value?.validate((valid) => {
    // 校验
    if (!valid) {
      return ElMessage.error('请填写必填项')
    }
    loading.value = true
    const params = getParams(1);
    check(params).then((res) => {
      if (res.code === 200) {
        ElMessage.success('盘点结果已固化，仓库库存未变更')
        close()
      } else {
        ElMessage.error(res.msg)
      }
    }).finally(() => {
      loading.value = false
    })
  })
}

const route = useRoute();
onMounted(() => {
  if (!wmsStore.warehouseList.length) {
    wmsStore.getWarehouseList()
  }
  if (!wmsStore.itemBrandList.length) {
    wmsStore.getItemBrandList()
  }
  const id = route.query && route.query.id;
  if (id) {
    checking.value = true
    loadDetail(id)
  } else {
    form.value.orderNo = 'PK' + generateNo()
  }
})


// 获取盘库单详情
const loadDetail = (id) => {
  loading.value = true
  getCheckOrder(id).then((response) => {
    const detailRows = Array.isArray(response?.data?.details)
      ? response.data.details.filter(isCountedDetail).map((it) => normalizeDetailRow(it))
      : []
    if (detailRows.length) {
      detailRows.forEach(detail => {
        detail.newInventory = true
      })
      selectedSku.value = detailRows.map(it => {
        return {
          id: it.skuId ?? it.itemSku?.id
        }
      })
    }
    form.value = {
      ...response.data,
      details: detailRows
    }
    handleChangeQuantity()
    Promise.resolve();
  }).then(() => {
  }).finally(() => {
    loading.value = false
  })
}

const handleDeleteDetail = (row, index) => {
  if (row.id) {
    proxy.$modal.confirm('确认删除本条商品明细吗？如确认会立即执行！').then(function () {
      return delCheckOrderDetail(row.id);
    }).then(() => {
      form.value.details.splice(index, 1)
      proxy.$modal.msgSuccess("删除成功");
    })
  } else {
    form.value.details.splice(index, 1)
  }
  const rowSkuId = row.skuId ?? row.itemSku?.id
  const indexOfSelected = selectedSku.value.findIndex(it => String(rowSkuId) === String(it.id))
  if (indexOfSelected !== -1) {
    selectedSku.value.splice(indexOfSelected, 1)
  }
  handleChangeQuantity()
}

const handleChangeQuantity = () => {
  let totalQuantity = 0
  form.value.details.forEach(it => {
    totalQuantity += Number(it.checkQuantity) || 0
  })
  form.value.totalQuantity = totalQuantity
}

</script>

<style lang="scss" scoped>
@import "@/assets/styles/variables.module";
.check-edit-page.is-en .el-form-item__label { white-space: nowrap; }
.check-edit-page .action-btn { min-width: 96px; }
.check-edit-page.is-en .action-btn { min-width: 112px; }

.btn-box {
  width: calc(100% - #{$base-sidebar-width});
  display: flex;
  align-items: center;
  justify-content: space-between;
  float: right;
}

.el-statistic__content {
  font-size: 14px;
}
.hover-text {
  color: black; /* 初始文字颜色 */
  text-decoration: none; /* 初始没有下划线 */
  transition: color 0.3s, text-decoration 0.3s; /* 平滑过渡效果 */
}

.hover-text:hover {
  color: #409EFF; /* 鼠标移上去时文字颜色变为蓝色 */
  text-decoration: underline; /* 鼠标移上去时带有下划线 */
}
</style>
