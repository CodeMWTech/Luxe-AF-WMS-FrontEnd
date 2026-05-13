<template>
  <div>
    <div class="receipt-order-edit-wrapper app-container movement-edit-page" :class="{ 'is-en': isEn }" style="margin-bottom: 60px" v-loading="loading">
      <el-card :header="tr('移库单') + tr('基本资料')">
        <el-form :label-width="formLabelWidth" :model="form" ref="movementForm" :rules="rules">
          <el-row :gutter="24">
            <el-col :span="11">
              <el-form-item :label="tr('移库单号')" prop="orderNo">
                <el-input class="w200" v-model="form.orderNo" :placeholder="tr('移库单号')"
                          :disabled="form.id"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('源仓库')" prop="sourceWarehouseId" :label-width="isEn ? '170px' : undefined">
                <el-select v-model="form.sourceWarehouseId" :placeholder="sourceWarehousePlaceholder" @change="handleChangeSourceWarehouse"
                           filterable>
                  <el-option v-for="item in useWmsStore().warehouseList" :key="item.id" :label="item.warehouseName"
                             :value="item.id"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('目标仓库')" prop="targetWarehouseId" :label-width="isEn ? '170px' : undefined">
                <el-select v-model="form.targetWarehouseId" :placeholder="targetWarehousePlaceholder" @change="handleChangeTargetWarehouse"
                           filterable style="width: 100%">
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
                  :placeholder="tr('备注...100个字符以内')"
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
                  <el-input-number style="width: 100%;" v-model="form.totalAmount" :precision="2" :min="0" :disabled="true"></el-input-number>
                </el-form-item>
                <el-button link type="primary" @click="handleAutoCalc" style="line-height: 32px">{{ tr('自动计算') || 'Auto Calc' }}
                </el-button>
              </div>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="tr('总数量')" prop="totalQuantity" >
                <el-input-number v-model="form.totalQuantity" :controls="false" :precision="0"
                                 :disabled="true" style="width: 100%"></el-input-number>
              </el-form-item>
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
              :disabled="form.sourceWarehouseId && form.targetWarehouseId"
              :content="tr('请先选择源仓库和目标仓库') + '！'"
            >
              <template #reference>
                <div>
                  <el-button
                    type="primary"
                    plain="plain"
                    size="default"
                    @click="showAddItem"
                    icon="Plus"
                    :disabled="!form.sourceWarehouseId || !form.targetWarehouseId"
                  >
                    {{ tr('新增') + tr('商品') }}
                  </el-button>
                  <el-button
                    type="primary"
                    plain="plain"
                    size="default"
                    class="ml10"
                    @click="showScanAddItem"
                    :disabled="!form.sourceWarehouseId || !form.targetWarehouseId"
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
                <div>{{
                    (row.item?.itemName || '-') + (row.item?.itemCode ? ('(' + row.item.itemCode + ')') : '')
                  }}
                </div>
                <div v-if="row.item?.itemBrand && getBrandName(row.item.itemBrand)">
                  {{ tr('品牌') }}：{{ getBrandName(row.item.itemBrand) }}
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="tr('规格信息')">
              <template #default="{ row }">
                <div>{{ row.itemSku?.skuCode || '-' }}</div>
                <div v-if="row.itemSku?.barcode">{{ tr('条码') }}：{{ row.itemSku.barcode }}</div>
              </template>
            </el-table-column>
            <el-table-column :label="tr('移库数量') || (isEn ? 'Transfer Qty' : '移库数量')" prop="quantity" width="180" align="center">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.quantity"
                  :placeholder="tr('移库数量') || (isEn ? 'Transfer Qty' : '移库数量')"
                  :min="1"
                  :precision="0"
                  @change="handleChangeQuantity"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column :label="tr('金额')" prop="amount" width="180" align="center">
              <template #default="scope">
                <el-input-number
                  v-model="scope.row.amount"
                  :placeholder="tr('金额')"
                  :precision="2"
                  :min="0"
                  :max="2147483647"
                  @change="updateTotals"
                ></el-input-number>
              </template>
            </el-table-column>
            <el-table-column :label="tr('操作')" width="100" align="right" fixed="right">
              <template #default="scope">
                <el-button icon="Delete" type="danger" plain size="small"
                           @click="handleDeleteDetail(scope.row, scope.$index)" link>{{ tr('删除') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
      <InventorySelect
        ref="inventorySelectRef"
        :model-value="inventorySelectShow"
        :scan-mode="scanMode"
        @handleOkClick="handleOkClick"
        @handleCancelClick="inventorySelectShow = false"
        :size="'50%'"
        :select-warehouse-disable="false"
        :warehouse-id="form.sourceWarehouseId"
        :selected-inventory="selectedInventory"
      />
    </div>
    <div class="footer-global">
      <div class="btn-box">
        <div>
          <el-button @click="doMovement" type="primary" class="ml10 action-btn">{{ tr('完成移库') }}</el-button>
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

<script setup name="MovementOrderEdit">
import {computed, getCurrentInstance, onMounted, reactive, ref, toRef, toRefs, watch} from "vue";
import {addMovementOrder, getMovementOrder, updateMovementOrder, movement} from "@/api/wms/movementOrder";
import {delMovementOrderDetail} from "@/api/wms/movementOrderDetail";
import {ElMessage, ElMessageBox} from "element-plus";
import {useRoute} from "vue-router";
import {useWmsStore} from '@/store/modules/wms'
import {numSub, generateNo} from '@/utils/ruoyi'
import InventorySelect from "@/views/components/InventorySelect.vue";
import {getSourceWarehouseAndSkuKey, getWarehouseAndSkuKey} from "@/utils/wmsUtil";
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'

const {proxy} = getCurrentInstance();
const {wms_shipment_type} = proxy.useDict("wms_shipment_type");
const wmsStore = useWmsStore()
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const formLabelWidth = computed(() => (isEn.value ? '138px' : '108px'))
const sourceWarehousePlaceholder = computed(() => (isEn.value ? 'Please select source warehouse' : '请选择源仓库'))
const targetWarehousePlaceholder = computed(() => (isEn.value ? 'Please select target warehouse' : '请选择目标仓库'))

const loading = ref(false)
const initFormData = {
  id: undefined,
  orderNo: undefined,
  shipmentOrderStatus: 0,
  remark: undefined,
  totalAmount: undefined,
  sourceWarehouseId: undefined,
  targetWarehouseId: undefined,
  totalQuantity: 0,
  details: [],
}
const inventorySelectRef = ref(null)
const selectedInventory = ref([])
// 扫码枪模式标记
const scanMode = ref(false)
const data = reactive({
  form: {...initFormData},
  rules: {
    orderNo: [
      {required: true, message: "出库单号不能为空", trigger: "blur"}
    ],
    sourceWarehouseId: [
      {required: true, message: "请选择源仓库", trigger: ['blur', 'change']}
    ],
    targetWarehouseId: [
      {required: true, message: "请选择目标仓库", trigger: ['blur', 'change']}
    ],
  }
});
const {form, rules} = toRefs(data);
const cancel = async () => {
  await proxy?.$modal.confirm('确认取消编辑移库单吗？');
  close()
}
const close = () => {
  const obj = {path: "/movementOrder"};
  proxy?.$tab.closeOpenPage(obj);
}
const inventorySelectShow = ref(false)
const getBrandName = (brandId) => {
  if (brandId === null || brandId === undefined) return ''
  return wmsStore.itemBrandMap.get(brandId)?.brandName || ''
}
const normalizeDetailRow = (detail = {}, { inventoryRow = false } = {}) => {
  const skuId = detail.skuId ?? detail.itemSku?.id ?? detail.itemSkuId
  const itemSku = {
    ...(detail.itemSku || {}),
    id: detail.itemSku?.id ?? skuId,
    skuCode: detail.itemSku?.skuCode ?? detail.skuCode,
    barcode: detail.itemSku?.barcode ?? detail.barcode,
    costPrice: detail.itemSku?.costPrice ?? detail.costPrice,
    avgReceiptCost: detail.itemSku?.avgReceiptCost ?? detail.avgReceiptCost,
    sellingPrice: detail.itemSku?.sellingPrice ?? detail.sellingPrice
  }
  const item = {
    ...(detail.item || {}),
    id: detail.item?.id ?? detail.itemId,
    itemName: detail.item?.itemName ?? detail.itemName,
    itemCode: detail.item?.itemCode ?? detail.itemCode,
    itemBrand: detail.item?.itemBrand ?? detail.itemBrand
  }
  return {
    ...detail,
    skuId,
    itemSku,
    item,
    sourceWarehouseId: detail.sourceWarehouseId ?? detail.warehouseId,
    targetWarehouseId: detail.targetWarehouseId,
    inventoryId: detail.inventoryId ?? (inventoryRow ? detail.id : undefined)
  }
}

const toInventorySelection = (row = {}) => ({
  id: row.inventoryId ?? row.id,
  skuId: row.skuId ?? row.itemSku?.id,
  warehouseId: row.sourceWarehouseId ?? row.warehouseId
})

const getMovementCost = (row = {}) => row.avgReceiptCost ?? row.itemSku?.avgReceiptCost ?? row.itemSku?.costPrice

// 选择商品 start
const showAddItem = () => {
  scanMode.value = false
  inventorySelectRef.value.getList()
  inventorySelectShow.value = true
}

const showScanAddItem = () => {
  scanMode.value = true
  inventorySelectRef.value.getList()
  inventorySelectShow.value = true
}
// 选择成功
const handleOkClick = (item) => {
  // 普通模式：选完关闭弹窗；扫码枪模式：保持弹窗打开
  if (!scanMode.value) {
    inventorySelectShow.value = false
  }
  const normalizedRows = item.map((it) => normalizeDetailRow(it, { inventoryRow: true }))
  const selectedMap = new Map((selectedInventory.value || []).map((it) => [getWarehouseAndSkuKey(it), it]))
  normalizedRows.forEach((normalized) => {
    selectedMap.set(getWarehouseAndSkuKey(normalized), toInventorySelection(normalized))
  })
  selectedInventory.value = Array.from(selectedMap.values())
  const newDetails = []
  normalizedRows.forEach(normalized => {
    if (!form.value.details.find(detail => getSourceWarehouseAndSkuKey(detail) === getWarehouseAndSkuKey(normalized))) {
      const quantity = 1
      const costPrice = getMovementCost(normalized)
      let amount = normalized.amount
      if ((amount === null || amount === undefined || amount === '') && (costPrice || costPrice === 0)) {
        amount = Number(costPrice) * quantity
      }
      newDetails.push({
        itemSku: normalized.itemSku,
        item: normalized.item,
        skuId: normalized.skuId,
        quantity,
        amount,
        sourceWarehouseId: normalized.sourceWarehouseId ?? form.value.sourceWarehouseId,
        targetWarehouseId: normalized.targetWarehouseId ?? form.value.targetWarehouseId,
        inventoryId: normalized.inventoryId,
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
const movementForm = ref()

const handleAutoCalc = () => {
  updateTotals()
}

const save = async () => {
  await proxy?.$modal.confirm('确认暂存移库单吗？');
  doSave()
}
const getParams = (orderStatus) => {
  let details = []
  if (form.value.details?.length) {
    // 构建参数
    details = form.value.details.map(it => {
      return {
        id: it.id,
        movementOrderId: form.value.id,
        skuId: it.skuId,
        quantity: it.quantity,
        amount: it.amount,
        sourceWarehouseId: form.value.sourceWarehouseId,
        targetWarehouseId: form.value.targetWarehouseId,
      }
    })
  }
  return {
    id: form.value.id,
    orderNo: form.value.orderNo,
    orderStatus,
    remark: form.value.remark,
    totalQuantity: form.value.totalQuantity,
    totalAmount: form.value.totalAmount,
    sourceWarehouseId: form.value.sourceWarehouseId,
    targetWarehouseId: form.value.targetWarehouseId,
    details: details
  }
}
const doSave = (orderStatus = 0) => {
  movementForm.value?.validate((valid) => {
    // 校验
    if (!valid) {
      return ElMessage.error('请填写必填项')
    }

    const params = getParams(orderStatus)
    loading.value = true
    if (params.id) {
      updateMovementOrder(params).then((res) => {
        if (res.code === 200) {
          ElMessage.success(res.msg)
          close()
        } else {
          ElMessage.error(res.msg)
        }
      }).finally(()=>{
        loading.value = false
      })
    } else {
      addMovementOrder(params).then((res) => {
        if (res.code === 200) {
          ElMessage.success(res.msg)
          close()
        } else {
          ElMessage.error(res.msg)
        }
      }).finally(()=>{
        loading.value = false
      })
    }
  })
}

const doMovement = async () => {
  await proxy?.$modal.confirm('确认移库吗？');
  movementForm.value?.validate((valid) => {
    // 校验
    if (!valid) {
      return ElMessage.error('请填写必填项')
    }
    if (!form.value.details?.length) {
      return ElMessage.error('请选择商品')
    }
    const invalidQuantityList = form.value.details.filter(it => !it.quantity)
    if (invalidQuantityList?.length) {
      return ElMessage.error('请选择移库数量')
    }
    const invalidAmountList = form.value.details.filter(
      it => it.amount === null || it.amount === undefined || it.amount === '' || Number(it.amount) === 0
    )
    if (invalidAmountList?.length) {
      return ElMessage.warning('移库商品金额不能为空且不能为0')
    }

    //('提交前校验',form.value)
    const params = getParams(1)
    loading.value = true
    movement(params).then((res) => {
      if (res.code === 200) {
        ElMessage.success('移库成功')
        close()
      } else {
        ElMessage.error(res.msg)
      }
    }).finally(()=>{
      loading.value = false
    })
  })
}

const updateToInvalid = async () => {
  await proxy?.$modal.confirm('确认作废移库单吗？');
  doSave(-1)
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
    loadDetail(id)
  } else {
    form.value.orderNo = 'YK' + generateNo()
  }
})


// 获取移库单详情
const loadDetail = (id) => {
  loading.value = true
  getMovementOrder(id).then((response) => {
    const detailRows = Array.isArray(response?.data?.details)
      ? response.data.details.map((it) => normalizeDetailRow(it))
      : []
    if (detailRows.length) {
      selectedInventory.value = detailRows.map(it => toInventorySelection(it))
    }
    form.value = {
      ...response.data,
      details: detailRows
    }
    inventorySelectRef.value.setWarehouseId(form.value.sourceWarehouseId)
    updateTotals()
    Promise.resolve();
  }).then(() => {
  }).finally(() => {
    loading.value = false
  })
}

const handleChangeSourceWarehouse = (e) => {
  form.value.details = []
  selectedInventory.value = []
  updateTotals()
  inventorySelectRef.value.setWarehouseId(form.value.sourceWarehouseId)
}

const handleChangeTargetWarehouse = (e) => {
  form.value.details.forEach(it => {
    it.targetWarehouseId = e
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
  const costPrice = getMovementCost(row)
  if (costPrice || costPrice === 0) {
    const quantity = Number(row.quantity || 0)
    row.amount = quantity ? Number(costPrice) * quantity : 0
  }
  updateTotals()
}

const handleDeleteDetail = (row, index) => {
  if (row.id) {
    proxy.$modal.confirm('确认删除本条商品明细吗？如确认会立即执行！').then(function () {
      loading.value = true
      return delMovementOrderDetail(row.id);
    }).then(() => {
      form.value.details.splice(index, 1)
      proxy.$modal.msgSuccess("删除成功");
    }).finally(() => {
      loading.value = false
    })
  } else {
    form.value.details.splice(index, 1)
  }
  updateTotals()
  const indexOfSelected = selectedInventory.value.findIndex(it => getWarehouseAndSkuKey(it) === getSourceWarehouseAndSkuKey(row))
  if (indexOfSelected !== -1) {
    selectedInventory.value.splice(indexOfSelected, 1)
  }
}
</script>

<style lang="scss" scoped>
@import "@/assets/styles/variables.module";
.movement-edit-page.is-en .el-form-item__label { white-space: nowrap; }
.movement-edit-page .action-btn { min-width: 96px; }
.movement-edit-page.is-en .action-btn { min-width: 112px; }

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
</style>
