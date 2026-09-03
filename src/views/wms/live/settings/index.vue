<template>
  <div class="live-page">
    <div class="live-hero">
      <div>
        <h2>{{ tr('系统设置') }}</h2>
        <p>{{ tr('配置费率类型与特殊金额类型') }}</p>
      </div>
    </div>

    <el-card class="live-card settings-section" shadow="never">
      <template #header>
        <div class="settings-section__header">
          <span>{{ sectionTitle('费率类型管理', rateTypes.filter(v => v.status === 0).length) }}</span>
          <el-button type="primary" link @click="openRateType()">{{ tr('新增类型') }}</el-button>
        </div>
      </template>
      <p class="muted">{{ tr('停用的类型新增记录时不可选，但历史记录会保留。') }}</p>
      <el-table :data="rateTypes" stripe>
        <el-table-column prop="typeName" :label="tr('名称')" />
        <el-table-column :label="tr('描述')">
          <template #default="s">{{ s.row.description }}</template>
        </el-table-column>
        <el-table-column :label="tr('状态')">
          <template #default="s"><el-switch v-model="s.row.status" :active-value="0" :inactive-value="1" @change="quickSaveRateType(s.row)" /></template>
        </el-table-column>
        <el-table-column :label="tr('操作')" width="130">
          <template #default="s">
            <el-button link type="primary" @click="openRateType(s.row)">{{ tr('编辑') }}</el-button>
            <el-button link type="danger" @click="removeRateType(s.row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="live-card settings-section" shadow="never">
      <template #header>
        <div class="settings-section__header">
          <span>{{ sectionTitle('特殊金额类型管理', specialTypes.filter(v => v.status === 0).length) }}</span>
          <el-button type="primary" link @click="openSpecialType()">{{ tr('新增类型') }}</el-button>
        </div>
      </template>
      <p class="muted">{{ tr('用于开播录入的交通补贴、餐补、奖金、扣款等特殊明细。') }}</p>
      <el-table :data="specialTypes" stripe>
        <el-table-column :label="tr('名称')"><template #default="s">{{ tr(s.row.typeName) }}</template></el-table-column>
        <el-table-column :label="tr('分类')">
          <template #default="s"><el-tag :type="s.row.category === 'DEDUCTION' ? 'danger' : s.row.category === 'SUBSIDY' ? 'success' : 'info'">{{ categoryLabel(s.row.category) }}</el-tag></template>
        </el-table-column>
        <el-table-column :label="tr('状态')">
          <template #default="s"><el-switch v-model="s.row.status" :active-value="0" :inactive-value="1" @change="quickSaveSpecialType(s.row)" /></template>
        </el-table-column>
        <el-table-column :label="tr('操作')" width="130">
          <template #default="s">
            <el-button link type="primary" @click="openSpecialType(s.row)">{{ tr('编辑') }}</el-button>
            <el-button link type="danger" @click="removeSpecialType(s.row)">{{ tr('删除') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="rateDialog.open" class="settings-dialog" :title="tr(rateDialog.form.id ? '编辑费率类型' : '新增费率类型')" width="520px">
      <el-form :model="rateDialog.form" :label-width="isEn ? '120px' : '90px'">
        <el-form-item :label="tr('名称')"><el-input v-model="rateDialog.form.typeName" /></el-form-item>
        <el-form-item :label="tr('描述')"><el-input v-model="rateDialog.form.description" /></el-form-item>
        <el-form-item :label="tr('状态')">
          <el-radio-group v-model="rateDialog.form.status"><el-radio :label="0">{{ tr('启用') }}</el-radio><el-radio :label="1">{{ tr('停用') }}</el-radio></el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="rateDialog.open = false">{{ tr('取消') }}</el-button><el-button type="primary" @click="submitRateType">{{ tr('保存') }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="specialDialog.open" class="settings-dialog" :title="tr(specialDialog.form.id ? '编辑特殊金额类型' : '新增特殊金额类型')" width="500px">
      <el-form :model="specialDialog.form" :label-width="isEn ? '120px' : '90px'">
        <el-form-item :label="tr('名称')"><el-input v-model="specialDialog.form.typeName" /></el-form-item>
        <el-form-item :label="tr('分类')"><el-select v-model="specialDialog.form.category"><el-option :label="tr('补贴类')" value="SUBSIDY" /><el-option :label="tr('扣款类')" value="DEDUCTION" /><el-option :label="tr('其他')" value="OTHER" /></el-select></el-form-item>
        <el-form-item :label="tr('状态')"><el-radio-group v-model="specialDialog.form.status"><el-radio :label="0">{{ tr('启用') }}</el-radio><el-radio :label="1">{{ tr('停用') }}</el-radio></el-radio-group></el-form-item>
      </el-form>
      <template #footer><el-button @click="specialDialog.open = false">{{ tr('取消') }}</el-button><el-button type="primary" @click="submitSpecialType">{{ tr('保存') }}</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import { addRateType, addSpecialType, deleteRateType, deleteSpecialType, listRateTypes, listSpecialTypes, updateRateType, updateSpecialType } from '@/api/wms/livePayroll'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const {proxy}=getCurrentInstance()
const settingsStore=useSettingsStore(),tr=(text)=>translateByMap(text,settingsStore.language||'zh-cn')
const isEn=computed(()=>(settingsStore.language||'zh-cn').toLowerCase().startsWith('en'))
const rateTypes=ref([]),specialTypes=ref([])
const rateDialog=reactive({open:false,form:{}}),specialDialog=reactive({open:false,form:{}})
async function load(){const [r,sp]=await Promise.all([listRateTypes(),listSpecialTypes()]);rateTypes.value=r.data||[];specialTypes.value=sp.data||[]}
function openRateType(row={}){rateDialog.form={id:row.id,typeName:row.typeName||'',description:row.description||'',status:row.status??0,sortOrder:row.sortOrder||rateTypes.value.length*10+10};rateDialog.open=true}
async function submitRateType(){if(!rateDialog.form.typeName)return proxy.$modal.msgWarning(tr('请输入名称'));await(rateDialog.form.id?updateRateType(rateDialog.form):addRateType(rateDialog.form));rateDialog.open=false;load()}
async function quickSaveRateType(row){await updateRateType(row);proxy.$modal.msgSuccess(tr('状态已更新'))}
async function removeRateType(row){await proxy.$modal.confirm(isEn.value?`Delete ${row.typeName}?`:`确认删除 ${row.typeName}？`);await deleteRateType(row.id);load()}
function openSpecialType(row={}){specialDialog.form={id:row.id,typeName:row.typeName||'',category:row.category||'OTHER',status:row.status??0,sortOrder:row.sortOrder||specialTypes.value.length*10+10};specialDialog.open=true}
async function submitSpecialType(){if(!specialDialog.form.typeName)return proxy.$modal.msgWarning(tr('请输入名称'));await(specialDialog.form.id?updateSpecialType(specialDialog.form):addSpecialType(specialDialog.form));specialDialog.open=false;load()}
async function quickSaveSpecialType(row){await updateSpecialType(row);proxy.$modal.msgSuccess(tr('状态已更新'))}
async function removeSpecialType(row){await proxy.$modal.confirm(isEn.value?`Delete ${row.typeName}?`:`确认删除 ${row.typeName}？`);await deleteSpecialType(row.id);load()}
function categoryLabel(v){return tr(v==='SUBSIDY'?'补贴类':v==='DEDUCTION'?'扣款类':'其他')}
function sectionTitle(label,count){return isEn.value?`${tr(label)} · ${count} Enabled`:`${label} · ${count} 启用`}
onMounted(load)
</script>
<style scoped lang="scss">
@import '../live.scss';
.settings-section__header{display:flex;justify-content:space-between;align-items:center;gap:16px}
</style>
<style lang="scss">
.settings-dialog .el-form-item__label{white-space:nowrap}
@media(max-width:768px){.settings-dialog{width:calc(100% - 24px)!important}.settings-dialog .el-form-item{display:block}.settings-dialog .el-form-item__label{width:auto!important;display:block;text-align:left}.settings-dialog .el-form-item__content{margin-left:0!important}}
</style>
