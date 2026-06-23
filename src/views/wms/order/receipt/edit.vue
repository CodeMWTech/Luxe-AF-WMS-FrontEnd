<template>
  <div>
    <div class="receipt-order-edit-wrapper app-container receipt-edit-page" :class="{ 'is-en': isEn }" style="margin-bottom: 60px" v-loading="loading">
      <el-card :header="tr('入库单') + tr('基本资料')">
        <el-form :label-width="formLabelWidth" :model="form" ref="receiptForm" :rules="rules">
          <el-row :gutter="24">
            <el-col :span="11">
              <el-form-item :label="tr('入库单号')" prop="orderNo">
                <el-input class="w200" v-model="form.orderNo" :placeholder="tr('入库单号')" :disabled="form.id"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('仓库')" prop="warehouseId">
                <el-select v-model="form.warehouseId" :placeholder="selectPlaceholder('仓库')" filterable>
                  <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName" :value="item.id"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('总数量')" prop="totalQuantity">
                <el-input-number style="width:100%" v-model="form.totalQuantity" :controls="false" :precision="0" :disabled="true"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="24">
            <el-col :span="11">
              <el-form-item :label="tr('入库类型')" prop="optType">
                <el-radio-group v-model="form.optType">
                  <el-radio-button
                    v-for="item in wms_receipt_type"
                    :key="item.value"
                    :label="item.value"
                    >{{ item.label }}</el-radio-button
                  >
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('供应商')" prop="merchantId">
                <el-select v-model="form.merchantId" :placeholder="selectPlaceholder('供应商')" clearable filterable>
                  <el-option v-for="item in useWmsStore().merchantList" :key="item.id" :label="item.merchantName" :value="item.id"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('业务单号')" prop="bizOrderNo">
                <el-input v-model="form.bizOrderNo" :placeholder="enterPlaceholder('业务单号')"></el-input>
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
              <div style="display: flex;align-items: start">
                <el-form-item :label="tr('总金额')" prop="totalAmount">
                  <el-input-number style="width:100%" v-model="form.totalAmount" :precision="2" :min="0"></el-input-number>
                </el-form-item>
                <el-button link type="primary" @click="handleAutoCalc" style="line-height: 32px">{{ tr('自动计算') }}</el-button>
              </div>
            </el-col>
          </el-row>
        </el-form>
      </el-card>
      <el-card :header="tr('商品明细')" class="mt10">
        <div class="receipt-order-content">
          <div class="flex-space-between mb8">
            <el-popover
              placement="left"
              :title="tr('提示')"
              :width="200"
              trigger="hover"
              :disabled="form.warehouseId"
              :content="tr('请先选择仓库') + '！'"
            >
              <template #reference>
                <div>
                  <el-button
                    type="primary"
                    plain="plain"
                    size="default"
                    @click="showAddItem"
                    icon="Plus"
                    :disabled="!form.warehouseId"
                  >
                    {{ tr('新增') + tr('商品') }}
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
              </template>
            </el-popover>
          </div>
          <el-table :data="form.details" border :empty-text="tr('暂无商品明细')">
            <el-table-column :label="tr('商品信息')" prop="itemSku.itemName">
              <template #default="{ row }">
                <div>{{ (row.item?.itemName || '-') + (row.item?.itemCode ? ('(' + row.item.itemCode + ')') : '') }}</div>
                <div v-if="row.item?.itemBrand && getBrandName(row.item.itemBrand)">
                  {{ tr('品牌') }}：{{ getBrandName(row.item.itemBrand) }}
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="tr('规格信息')">
              <template #default="{ row }">
                <div>{{ row.itemSku?.skuCode || '-' }}</div>
                <div v-if="row.itemSku?.barcode">{{ tr('条码') }}：{{row.itemSku.barcode}}</div>
              </template>
            </el-table-column>
            <el-table-column :label="tr('数量')" prop="quantity" width="180">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.quantity"
                  :placeholder="tr('数量')"
                  :min="1"
                  :precision="0"
                  @change="handleChangeQuantity(scope.row)"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column :label="priceAmountLabel" prop="amount" width="180">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.amount"
                  :placeholder="priceAmountLabel"
                  :precision="2"
                  :min="0"
                  :max="2147483647"
                  @change="updateTotals"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column :label="tr('操作')" width="100" align="right" fixed="right">
              <template #default="scope">
                <el-button icon="Delete" type="danger" plain size="small" @click="handleDeleteDetail(scope.row, scope.$index)" link>{{ tr('删除') }}</el-button>
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
        :only-shipped="isReturnInbound"
        @handleOkClick="handleOkClick"
        @handleCancelClick="skuSelectShow = false"
        :size="'50%'"
      />
    </div>
    <div class="footer-global">
      <div class="btn-box">
        <div>
          <el-button @click="doWarehousing" type="primary" class="ml10 action-btn">{{ tr('完成入库') }}</el-button>
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

<script setup name="ReceiptOrderEdit">
import {computed, getCurrentInstance, onMounted, reactive, ref, toRef, toRefs, watch} from "vue";
import {addReceiptOrder, getReceiptOrder, updateReceiptOrder, warehousing} from "@/api/wms/receiptOrder";
import {ElMessage, ElMessageBox} from "element-plus";
import SkuSelect from "../../../components/SkuSelect.vue";
import {useRoute} from "vue-router";
import {useWmsStore} from '@/store/modules/wms'
import { numSub, generateNo } from '@/utils/ruoyi'
import { delReceiptOrderDetail } from '@/api/wms/receiptOrderDetail'
import {getWarehouseAndSkuKey} from "@/utils/wmsUtil";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const {proxy} = getCurrentInstance();
const route = useRoute();
const { wms_receipt_type } = proxy.useDict("wms_receipt_type");
const wmsStore = useWmsStore()
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const priceAmountLabel = computed(() => (isEn.value ? 'Price Amount' : tr('金额')))
const selectPlaceholder = (field) => (isEn.value ? `Please select ${tr(field).toLowerCase()}` : tr('请选择') + tr(field))
const enterPlaceholder = (field) => (isEn.value ? `Please enter ${tr(field)}` : tr('请输入') + tr(field))
const formLabelWidth = computed(() => (isEn.value ? '138px' : '108px'))
const selectedSku = ref([])
const mode = ref(false)
const loading = ref(false)
const skuSelectRef = ref(null)
// 扫码枪模式标记
const scanMode = ref(false)
const initFormData = {
  id: undefined,
  orderNo: undefined,
  optType: "2",
  merchantId: undefined,
  bizOrderNo: undefined,
  totalAmount: undefined,
  orderStatus: 0,
  remark: undefined,
  warehouseId: undefined,
  totalQuantity: 0,
  details: [],
}
const data = reactive({
  form: {...initFormData},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderNo: undefined,
    optType: undefined,
    bizOrderNo: undefined,
    totalAmount: undefined,
    orderStatus: undefined,
  },
  rules: {
    orderNo: [
      {required: true, message: "入库单号不能为空", trigger: "blur"}
    ],
    warehouseId: [
      {required: true, message: "请选择仓库", trigger: ['blur', 'change']}
    ]
  }
});
const { form, rules} = toRefs(data);
const returnInboundLabel = '\u9000\u8d27\u5165\u5e93'
const returnInboundLabels = [returnInboundLabel, 'Return Inbound']
const isReturnInbound = computed(() => {
  const currentType = (wms_receipt_type.value || []).find((it) => String(it.value) === String(form.value.optType))
  return returnInboundLabels.includes(currentType?.label) || currentType?.label === tr(returnInboundLabel)
})

const cancel = async () => {
  await proxy?.$modal.confirm('确认取消编辑入库单吗？');
  close()
}
const close = () => {
  const obj = {path: route.meta?.activeMenu};
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
    itemSku,
    item
  }
}

// 选择商品 start
const showAddItem = () => {
  scanMode.value = false
  skuSelectShow.value = true
}

const showScanAddItem = () => {
  scanMode.value = true
  skuSelectShow.value = true
}
// 选择成功
const handleOkClick = (item) => {
  // 普通模式：选完关闭弹窗；扫码枪模式：保持弹窗打开
  if (!scanMode.value) {
    skuSelectShow.value = false
  }
  const selectedMap = new Map((selectedSku.value || []).map((it) => [it.id, it]))
  item.forEach((it) => {
    selectedMap.set(it.id, it)
  })
  // 维护“当前入库单全部已存在商品”集合，避免后续刷新丢失灰色禁用状态
  selectedSku.value = Array.from(selectedMap.values())
  const newDetails = []
  item.forEach((it) => {
    if (!form.value.details.find(detail => detail.itemSku.id === it.id)) {
      const quantity = 1
      const costPrice = it.itemSku?.costPrice
      let amount = undefined
      if (costPrice || costPrice === 0) {
        amount = Number(costPrice) * quantity
      }
      newDetails.push({
        itemSku: it.itemSku,
        item: it.item,
        amount,
        quantity,
        warehouseId: form.value.warehouseId
      })
    }
  })
  if (newDetails.length) {
    form.value.details.unshift(...newDetails)
  }
  updateTotals()
}
// 选择商品 end

// 初始化receipt-order-form ref
const receiptForm = ref()

const save = async () => {
  await proxy?.$modal.confirm('确认暂存入库单吗？');
  doSave()
}

const getParamsBeforeSave = (orderStatus) => {
  let details = []
  if (form.value.details?.length) {
    details = form.value.details.map(it => {
      return {
        id: it.id,
        skuId: it.itemSku.id,
        amount: it.amount,
        quantity: it.quantity,
        warehouseId: form.value.warehouseId,
      }
    })
  }

  return {
    id: form.value.id,
    orderNo: form.value.orderNo,
    orderStatus,
    optType: form.value.optType,
    merchantId: form.value.merchantId,
    bizOrderNo: form.value.bizOrderNo,
    remark: form.value.remark,
    totalAmount: form.value.totalAmount,
    totalQuantity: form.value.totalQuantity,
    warehouseId: form.value.warehouseId,
    details: details
  }
}

const doSave = async (orderStatus = 0) => {
  //验证receiptForm表单
  receiptForm.value?.validate((valid) => {
    // 校验
    if (!valid) {
      return ElMessage.error('请填写必填项')
    }
    const params = getParamsBeforeSave(orderStatus)
    loading.value = true
    if (params.id) {
      updateReceiptOrder(params).then((res) => {
        if (res.code === 200) {
          ElMessage.success(res.msg)
          close()
        } else {
          ElMessage.error(res.msg)
        }
      }).finally(() => {
        loading.value = false
      })
    } else {
      addReceiptOrder(params).then((res) => {
        if (res.code === 200) {
          ElMessage.success(res.msg)
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

const doWarehousing = async () => {
  await proxy?.$modal.confirm('确认入库吗？<br><span style="color: #f56c6c;">一旦确认，永久保存不可撤销</span>', {
    dangerouslyUseHTMLString: true
  });
  receiptForm.value?.validate((valid) => {
    // 校验
    if (!valid) {
      return ElMessage.error('请填写必填项')
    }

    if (!form.value.details?.length) {
      return ElMessage.error('请选择商品')
    }
    if (form.value.details?.length) {
      const invalidQuantityList = form.value.details.filter(it => !it.quantity)
      if (invalidQuantityList?.length) {
        return ElMessage.error('请选择数量')
      }
      const invalidAmountList = form.value.details.filter(
        it => it.amount === null || it.amount === undefined || it.amount === '' || Number(it.amount) === 0
      )
      if (invalidAmountList?.length) {
        return ElMessage.warning('入库商品金额不能为空且不能为0')
      }
    }
    const params = getParamsBeforeSave(1);
    loading.value = true
    warehousing(params).then((res) => {
      if (res.code === 200) {
        ElMessage.success('入库成功')
        close()
      } else {
        ElMessage.error(res.msg)
      }
    }).finally(() => {
      loading.value = false
    })
  })
}

const updateToInvalid = async () => {
  await proxy?.$modal.confirm('确认作废入库单吗？');
  doSave(-1)
}

onMounted(() => {
  if (!wmsStore.warehouseList.length) {
    wmsStore.getWarehouseList()
  }
  if (!wmsStore.merchantList.length) {
    wmsStore.getMerchantList()
  }
  if (!wmsStore.itemBrandList.length) {
    wmsStore.getItemBrandList()
  }
  const id = route.query && route.query.id;
  if (id) {
    loadDetail(id)
  } else {
    form.value.orderNo = 'RK' + generateNo()
  }
})


// 获取入库单详情
const loadDetail = (id) => {
  loading.value = true
  getReceiptOrder(id).then((response) => {
    const detailRows = Array.isArray(response?.data?.details)
      ? response.data.details.map((it) => normalizeDetailRow(it))
      : []
    form.value = {
      ...response.data,
      details: detailRows
    }
    updateTotals()
    if (detailRows.length) {
      selectedSku.value = detailRows.map(it => {
        return {
          id: it.skuId ?? it.itemSku?.id
        }
      })
    }
    Promise.resolve();
  }).then(() => {
  }).finally(() => {
    loading.value = false
  })
}

const updateTotals = () => {
  let quantitySum = 0
  let amountSum = undefined
  form.value.details.forEach(it => {
    if (it.quantity) {
      quantitySum += Number(it.quantity)
    }
    if (it.amount || it.amount === 0) {
      if (amountSum === undefined) {
        amountSum = 0
      }
      amountSum = numSub(amountSum, -Number(it.amount))
    }
  })
  form.value.totalQuantity = quantitySum
  form.value.totalAmount = amountSum
}

const handleChangeQuantity = (row) => {
  const costPrice = row.itemSku?.costPrice
  if (costPrice || costPrice === 0) {
    const quantity = Number(row.quantity || 0)
    row.amount = quantity ? Number(costPrice) * quantity : 0
  }
  updateTotals()
}

const handleAutoCalc = () => {
  updateTotals()
}

const handleDeleteDetail = (row, index) => {
  if (row.id) {
    proxy.$modal.confirm('确认删除本条商品明细吗？如确认会立即执行！').then(function () {
      loading.value = true
      return delReceiptOrderDetail(row.id);
    }).then(() => {
      form.value.details.splice(index, 1)
      updateTotals()
      proxy.$modal.msgSuccess("删除成功");
    }).finally(() => {
      loading.value = false
    });
  } else {
    form.value.details.splice(index, 1)
    updateTotals()
  }
  const indexOfSelected = selectedSku.value.findIndex(it => row.itemSku.id=== it.id)
  if (indexOfSelected !== -1) {
    selectedSku.value.splice(indexOfSelected, 1)
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/styles/variables.module";

.receipt-edit-page.is-en .el-form-item__label { white-space: nowrap; }
.receipt-edit-page .action-btn { min-width: 96px; }
.receipt-edit-page.is-en .action-btn { min-width: 112px; }

.btn-box {
  width: calc(100% - #{$base-sidebar-width});
  display: flex;
  align-items: center;
  justify-content: space-between;
  float: right;
}
</style>
