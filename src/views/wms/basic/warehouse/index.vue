<template>
  <div class="app-container warehouse-page" data-runtime-i18n-ignore="true">
    <el-card>
      <template #header><div class="toolbar"><strong>{{ tr('仓库与房间') }}</strong><el-button v-hasPermi="['wms:warehouse:edit']" type="primary" @click="add()">{{ tr('新增一级仓库') }}</el-button></div></template>
      <el-table :data="nodes" row-key="id" border default-expand-all v-loading="loading">
        <el-table-column prop="warehouseName" :label="tr('名称')" min-width="230" />
        <el-table-column prop="warehouseCode" :label="tr('编号')" min-width="140" />
        <el-table-column :label="tr('层级')" width="120"><template #default="{row}">{{ tr(row.warehouseLevel === 1 ? '一级仓库' : '房间') }}</template></el-table-column>
        <el-table-column :label="tr('用途')" width="150"><template #default="{row}">{{ tr(row.isLiveRoom ? '直播间' : row.warehouseLevel === 2 ? '普通房间' : '仓库') }}</template></el-table-column>
        <el-table-column prop="rootWarehouseName" :label="tr('所属一级仓库')" min-width="200" />
        <el-table-column :label="tr('状态')" width="110"><template #default="{row}"><el-tag :type="row.status === 0 ? 'success' : 'info'">{{ tr(row.status === 0 ? '启用' : '停用') }}</el-tag></template></el-table-column>
        <el-table-column prop="orderNum" :label="tr('排序')" width="110" />
        <el-table-column :label="tr('操作')" min-width="340" class-name="warehouse-actions"><template #default="{row}">
          <template v-if="canEdit">
            <el-button link @click="edit(row)">{{ tr('修改') }}</el-button>
            <el-button v-if="row.warehouseLevel === 1 && row.status === 0" link type="primary" @click="add(row)">{{ tr('新增房间') }}</el-button>
            <el-button v-if="row.warehouseLevel === 2 && row.status === 0" link type="primary" @click="showQr(row)">{{ tr('二维码') }}</el-button>
            <el-button link @click="toggle(row)">{{ statusActionLabel(row) }}</el-button>
            <el-button link type="danger" @click="remove(row)">{{ tr('删除') }}</el-button>
          </template>
        </template></el-table-column>
      </el-table>
    </el-card>
    <el-dialog data-runtime-i18n-ignore="true" class="warehouse-dialog" v-model="visible" :title="tr(form.id ? '修改位置' : form.parentId ? '新增房间' : '新增一级仓库')" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :label-width="isEnglish ? '130px' : '100px'" :rules="{ warehouseName: [{ required: true, message: tr('名称不能为空'), trigger: 'blur' }] }">
        <el-form-item :label="tr('名称')" prop="warehouseName"><el-input v-model="form.warehouseName" maxlength="100" /></el-form-item>
        <el-form-item :label="tr('编号')"><el-input v-model="form.warehouseCode" /></el-form-item>
        <el-form-item v-if="form.warehouseLevel === 2">
          <template #label>
            <span class="live-room-label">
              {{ tr('是否直播间') }}
              <el-tooltip :content="tr('开启后在调货页面中，会出现show和调货两种模式，否则只有调货模式')" placement="top" effect="dark">
                <el-icon class="live-room-info" tabindex="0" :aria-label="tr('开启后在调货页面中，会出现show和调货两种模式，否则只有调货模式')" @click.stop @keydown.stop><InfoFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-switch v-model="form.isLiveRoom" />
        </el-form-item>
        <el-form-item :label="tr('排序')"><el-input-number v-model="form.orderNum" :min="0" /></el-form-item>
        <el-form-item :label="tr('备注')"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="visible=false">{{ tr('取消') }}</el-button><el-button type="primary" :loading="busy" @click="save">{{ tr('保存') }}</el-button></template>
    </el-dialog>
    <el-dialog data-runtime-i18n-ignore="true" class="warehouse-dialog" v-model="qrVisible" :title="tr('房间固定二维码')" width="480px">
      <div class="qr-preview"><h3>{{ qr.locationName }}</h3><img :src="qr.image" width="280" height="280" :alt="qr.locationName" /><p>{{ tr('扫描后登录系统并进入此房间调货') }}</p></div>
      <template #footer><el-button @click="downloadQr">{{ tr('下载') }}</el-button><el-button type="primary" @click="printQr">{{ tr('打印') }}</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup name="Warehouse">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import QRCode from 'qrcode'
import { warehouseTree, addWarehouse, updateWarehouse, delWarehouse, roomQr } from '@/api/wms/warehouse'
import { useWmsStore } from '@/store/modules/wms'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import { translateExact } from '@/locales/runtime-map'
const settings = useSettingsStore(), user = useUserStore(), wms = useWmsStore()
const tr = text => translateExact(text, settings.language || 'zh-cn')
const isEnglish = computed(() => settings.language === 'en')
const statusActionLabel = row => isEnglish.value ? (row.status === 0 ? 'Disable' : 'Enable') : tr(row.status === 0 ? '停用' : '启用')
const confirmOptions = () => ({ confirmButtonText: tr('确认'), cancelButtonText: tr('取消') })
const canEdit = computed(() => user.permissions.includes('*:*:*') || user.permissions.includes('wms:warehouse:edit'))
const nodes=ref([]), loading=ref(false), visible=ref(false), busy=ref(false), form=ref({}), formRef=ref(), qrVisible=ref(false), qr=ref({})
async function load() { loading.value=true; try { nodes.value=(await warehouseTree({})).data || [] } finally { loading.value=false } }
function add(parent) { form.value={ parentId: parent?.id || 0, warehouseLevel: parent ? 2 : 1, status: 0, isLiveRoom: Boolean(parent), orderNum: 0 }; visible.value=true }
function edit(row) { form.value={...row}; visible.value=true }
async function refresh() { await Promise.all([load(), wms.getWarehouseList()]) }
async function save() { await formRef.value.validate(); busy.value=true; try { await (form.value.id ? updateWarehouse(form.value) : addWarehouse(form.value)); visible.value=false; await refresh(); ElMessage.success(tr('保存成功')) } finally { busy.value=false } }
async function toggle(row) { await ElMessageBox.confirm(tr(row.status === 0 ? '确认停用此位置？' : '确认启用此位置？'), tr('确认'), confirmOptions()); await updateWarehouse({...row,status:row.status === 0 ? 1 : 0}); await refresh() }
async function remove(row) { await ElMessageBox.confirm(tr('确认软删除此位置？历史单据仍保留。'), tr('确认'), confirmOptions()); await delWarehouse(row.id); await refresh() }
async function showQr(row) { const data=(await roomQr(row.id)).data; const url=new URL(`${import.meta.env.BASE_URL || '/'}inventory/room-transfer`, window.location.origin); url.searchParams.set('token',data.token); qr.value={...data,image:await QRCode.toDataURL(url.href,{width:600,margin:3,errorCorrectionLevel:'M'})}; qrVisible.value=true }
function downloadQr() { const a=document.createElement('a'); a.href=qr.value.image; a.download=`${qr.value.locationName.replace(/[\/:*?"<>|]/g,'_')}.png`; a.click() }
function printQr() { const popup=window.open('','_blank'); if (!popup) { ElMessage.warning(tr('请允许弹出打印窗口')); return } const title=popup.document.createElement('h2'); title.textContent=qr.value.locationName; const img=popup.document.createElement('img'); img.width=360; img.onload=()=>{popup.focus();popup.print()}; img.src=qr.value.image; popup.document.body.append(title,img) }
onMounted(load)
</script>
<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.warehouse-page :deep(.el-table__header .cell), .warehouse-page :deep(.warehouse-actions .cell) { white-space: nowrap; word-break: normal; }
.warehouse-dialog { max-width: calc(100vw - 32px); }
.qr-preview { text-align: center; }
.qr-preview img { max-width: 100%; }
.live-room-label { display: inline-flex; align-items: center; }
.live-room-info { margin-left: 4px; color: var(--el-text-color-placeholder, #a8abb2); font-size: 14px; cursor: help; }
</style>
