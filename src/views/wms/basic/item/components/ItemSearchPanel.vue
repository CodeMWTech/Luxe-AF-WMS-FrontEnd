<template>
    <el-card>
      <el-form :model="queryParams" ref="queryFormRef" label-width="88px" class="query-form">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="24" :md="18" :lg="18">
            <el-form-item label="商品名称" prop="itemName">
              <div class="item-name-with-tag">
                <el-input v-model="queryParams.itemName" placeholder="请输入商品名称" clearable @keyup.enter="emit('search')" class="item-name-input"/>
                <el-button type="primary" link title="预处理标签" @click="emit('open-name-tag-drawer', 'query')" class="name-tag-btn">
                  <el-icon><Ticket /></el-icon><span class="name-tag-btn-text">标签</span>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="6" :lg="6">
            <el-form-item label="SKU" prop="skuCode">
              <el-input v-model="queryParams.skuCode" placeholder="请输入SKU编码" clearable @keyup.enter="emit('search')" style="width: 100%"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="商品品牌" prop="itemBrand">
              <el-select
                v-model="queryParams.itemBrand"
                multiple
                clearable
                filterable
                placeholder="可多选"
                style="width: 100%"
              >
                <el-option
                  v-for="item in useWmsStore().itemBrandList"
                  :key="String(item.id)"
                  :label="item.brandName"
                  :value="String(item.id)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="成色" prop="itemCondition">
              <el-select v-model="queryParams.itemCondition" placeholder="请选择成色" clearable style="width: 100%">
                <el-option v-for="item in ITEM_CONDITION_OPTIONS" :key="item" :label="item" :value="item"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="年份" prop="year">
              <el-input-number v-model="queryParams.year" :min="0" :max="9999" :controls="false" style="width: 100%" @keyup.enter.native="emit('search')"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="鉴定机构" prop="authAgency">
              <el-select
                v-model="queryParams.authAgency"
                multiple
                placeholder="可多选"
                clearable
                style="width: 100%"
              >
                <el-option v-for="item in AUTH_AGENCY_OPTIONS" :key="item" :label="item" :value="item"/>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="数量" prop="defaultQty">
              <el-input-number v-model="queryParams.defaultQty" :min="0" :controls="false" style="width: 100%" @keyup.enter.native="emit('search')"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" :lg="6">
            <el-form-item label="已护理" prop="cared">
              <el-switch v-model="queryParams.cared" active-text="Yes" inactive-text="No" :active-value="true" :inactive-value="false"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item label="寄售信息" prop="consignInfo">
              <el-input v-model="queryParams.consignInfo" placeholder="请输入寄售信息关键字" clearable @keyup.enter="emit('search')" style="width: 100%"/>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" v-if="!isSupplierUser">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="queryParams.supplierId" placeholder="请选择供应商" clearable style="width: 100%">
                <el-option :label="tr('Luxeaf 自有')" :value="-1" />
                <el-option v-for="s in supplierOptions" :key="s.id" :label="s.supplierName" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="24" :md="12" :lg="12">
            <el-form-item label="创建时间" prop="createTimeRange">
              <el-date-picker
                v-model="queryParams.createTimeRange"
                type="datetimerange"
                range-separator="至"
                format="MM/DD/YYYY HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                :default-time="defaultTime"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="24" :md="12" :lg="12" v-if="canViewSellingPrice">
            <el-form-item label="销售价" prop="sellingPriceMin">
              <div class="query-price-range">
                <el-input-number v-model="queryParams.sellingPriceMin" :min="0" :precision="2" :controls="false" placeholder="最低" style="width: 100%"/>
                <span class="query-price-range-separator">至</span>
                <el-input-number v-model="queryParams.sellingPriceMax" :min="0" :precision="2" :controls="false" placeholder="最高" style="width: 100%"/>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label=" ">
              <el-button type="primary" icon="Search" @click="emit('search')">搜索</el-button>
              <el-button icon="Refresh" @click="emit('reset')">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
</template>

<script setup>
import { ref } from 'vue'
import { Ticket } from '@element-plus/icons-vue'
import { useWmsStore } from '@/store/modules/wms'

defineProps({
  queryParams: { type: Object, required: true },
  supplierOptions: { type: Array, default: () => [] },
  isSupplierUser: { type: Boolean, default: false },
  defaultTime: { type: Array, required: true },
  canViewSellingPrice: { type: Boolean, default: false },
  ITEM_CONDITION_OPTIONS: { type: Array, default: () => [] },
  AUTH_AGENCY_OPTIONS: { type: Array, default: () => [] },
  tr: { type: Function, required: true }
})

const emit = defineEmits(['search', 'reset', 'open-name-tag-drawer'])
const queryFormRef = ref(null)

defineExpose({
  resetFields: () => queryFormRef.value?.resetFields?.()
})
</script>
