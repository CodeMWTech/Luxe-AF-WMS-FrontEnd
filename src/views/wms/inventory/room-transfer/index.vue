<template>
  <div class="app-container room-transfer-page" v-loading="busy">
    <el-alert v-if="invalid && !transferVisible && !showVisible" :title="invalid" type="error" :closable="false" class="mb16" />
    <el-card v-if="canOperate" class="operate-card mb16">
      <template #header>
        <div class="operate-entry">
          <div class="operate-mark"><el-icon><Aim /></el-icon></div>
          <strong>{{ tr('进入房间调货') }}</strong>
        </div>
      </template>
      <p class="operate-hint">{{ tr('扫描房间二维码，或粘贴二维码链接。进入后即可创建调货。') }}</p>
      <div class="scan-row">
        <el-input v-model="roomCode" clearable :placeholder="tr('扫描房间二维码或粘贴二维码链接')" @keyup.enter="enterRoom" />
        <el-button type="primary" icon="Right" @click="enterRoom">{{ tr('进入房间') }}</el-button>
      </div>
    </el-card>
    <el-card v-if="target && !order" class="mb16">
      <template #header><div class="toolbar"><strong>{{ tr('扫码调货') }}</strong></div></template>
      <h2>{{ target.locationName }}</h2>
      <p>{{ tr('目标位置已锁定，商品来源由扫码识别') }}</p>
      <el-button v-if="canOperate && !invalid" type="primary" @click="create">{{ tr('新建调货草稿') }}</el-button>
    </el-card>

    <el-card v-if="canList">
      <template #header>
        <div class="toolbar">
          <strong>{{ tr('调货单列表') }}</strong>
          <el-radio-group v-model="listMode" @change="switchMode">
            <el-radio-button label="order">{{ tr('按调货单') }}</el-radio-button>
            <el-radio-button label="sku">{{ tr('按SKU') }}</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div class="filters mb16">
        <el-select v-model="query.liveRoomIds" :placeholder="tr('直播间')" clearable filterable multiple collapse-tags collapse-tags-tooltip>
          <el-option v-for="room in liveRooms" :key="room.id" :label="room.locationName || room.warehouseName" :value="room.id" />
        </el-select>
        <el-input v-model="query.orderNo" :placeholder="tr('单号')" clearable @keyup.enter="search" />
        <el-input v-model="query.skuCode" class="filter-short" placeholder="SKU" clearable @keyup.enter="search" />
        <el-select v-model="query.orderStatus" class="filter-short" :placeholder="tr('状态')" clearable><el-option v-for="s in [0,1,-1,2]" :key="s" :value="s" :label="stateName(s)" /></el-select>
        <el-select v-model="query.movementType" class="filter-short" :placeholder="tr('类型')" clearable><el-option :value="1" :label="tr('扫码调货')" /><el-option :value="2" :label="tr('反向调货')" /><el-option :value="3" :label="tr('直播show调货')" /></el-select>
        <el-select v-model="query.showStatus" class="filter-short" :placeholder="tr('show处理状态')" clearable><el-option value="PENDING" :label="tr('待处理')" /><el-option value="RESOLVED" :label="tr('已处理')" /></el-select>
        <el-button type="primary" icon="Search" class="action-btn" @click="search">{{ tr('查询') }}</el-button>
        <el-button icon="Refresh" class="action-btn" @click="resetFilters">{{ tr('重置') }}</el-button>
        <el-button type="info" icon="Download" class="action-btn" v-hasPermi="['wms:roomTransfer:export']" @click="exportRows">{{ tr('导出') }}</el-button>
      </div>
      <el-table v-if="listMode === 'order'" :data="list" border>
        <el-table-column prop="orderNo" :label="tr('单号')" min-width="270" />
        <el-table-column :label="tr('来源位置')" min-width="200"><template #default="{row}"><span v-for="(part, index) in locationParts(row.sourceLocationName)" :key="index" :class="{ 'room-hit': row.movementType === 2 && part.hit }">{{ part.text }}</span></template></el-table-column>
        <el-table-column :label="tr('目标位置')" min-width="200"><template #default="{row}"><span v-for="(part, index) in locationParts(row.targetLocationName)" :key="index" :class="{ 'room-hit': row.movementType !== 2 && part.hit }">{{ part.text }}</span></template></el-table-column>
        <el-table-column :label="tr('类型')" min-width="140"><template #default="{row}"><el-tag :class="['type-tag', typeClass(row.movementType)]" effect="plain">{{ typeName(row) }}</el-tag></template></el-table-column>
        <el-table-column :label="tr('状态')" min-width="120"><template #default="{row}"><el-tag :class="['state-tag', stateClass(row.orderStatus)]" effect="plain">{{ stateName(row.orderStatus) }}</el-tag></template></el-table-column>
        <el-table-column :label="tr('show处理状态')" width="120"><template #default="{row}">{{ tr(row.showStatus === 'PENDING' ? '待处理' : row.showStatus === 'RESOLVED' ? '已处理' : '—') }}</template></el-table-column>
        <el-table-column prop="totalQuantity" :label="tr('数量')" width="90" />
        <el-table-column prop="createBy" :label="tr('创建人')" width="120" />
        <el-table-column prop="createTime" :label="tr('创建时间')" width="180" />
        <el-table-column :label="tr('操作')" min-width="230"><template #default="{row}"><el-button v-if="row.canProcessShow" type="primary" link @click="requestShowResolution(row.id)">{{ tr(row.showDelegationRequired ? 'Show代处理' : '商品处理确认') }}</el-button><el-button type="primary" link @click="open(row.id)">{{ tr(row.orderStatus === 0 ? '继续处理' : '查看') }}</el-button></template></el-table-column>
      </el-table>
      <el-table v-else :data="list" border class="detail-table">
        <el-table-column prop="skuCodeSnapshot" label="SKU" min-width="140" />
        <el-table-column :label="tr('图片')" width="85"><template #default="{row}"><el-image v-if="thumbnail(row)" :src="thumbnail(row)" fit="contain" style="width:52px;height:52px" /><span v-else>{{ tr('暂无图片') }}</span></template></el-table-column>
        <el-table-column :label="tr('商品名称')" min-width="140" class-name="wrap-cell"><template #default="{row}">{{ row.item?.itemName || '—' }}</template></el-table-column>
        <el-table-column :label="tr('原始位置')" min-width="180" class-name="wrap-cell"><template #default="{row}"><span v-for="(part, index) in locationParts(row.sourceLocationSnapshot)" :key="index" :class="{ 'room-hit': row.movementType === 2 && part.hit }">{{ part.text }}</span></template></el-table-column>
        <el-table-column :label="tr('新位置')" min-width="180" class-name="wrap-cell"><template #default="{row}"><span v-for="(part, index) in locationParts(row.targetLocationSnapshot)" :key="index" :class="{ 'room-hit': row.movementType !== 2 && part.hit }">{{ part.text }}</span></template></el-table-column>
        <el-table-column prop="quantity" :label="tr('数量')" width="80" />
        <el-table-column :label="tr('类型')" min-width="130"><template #default="{row}"><el-tag :class="['type-tag', typeClass(row.movementType)]" effect="plain">{{ typeName(row) }}</el-tag></template></el-table-column>
        <el-table-column prop="createBy" :label="tr('创建人')" min-width="110" />
        <el-table-column prop="createTime" :label="tr('时间')" min-width="170" />
        <el-table-column :label="tr('操作')" min-width="160"><template #default="{row}"><el-button v-if="row.canProcessShow" type="primary" link @click="requestShowResolution(row.orderId)">{{ tr(row.showDelegationRequired ? 'Show代处理' : '商品处理确认') }}</el-button><el-button type="primary" link @click="open(row.orderId, row.id)">{{ tr(row.transferStatus === 0 ? '继续处理' : '查看') }}</el-button></template></el-table-column>
      </el-table>
      <el-row class="list-pagination">
        <pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadList" />
      </el-row>
    </el-card>
    <el-dialog v-model="operationVisible" :title="tr('直播调货')" width="460px" :close-on-click-modal="false">
      <p>{{ target?.locationName }}</p><el-radio-group v-model="operationType"><el-radio :label="1">{{ tr('调货') }}</el-radio><el-radio :label="3">{{ tr('直播show') }}</el-radio></el-radio-group>
      <template #footer><el-button @click="operationVisible=false">{{ tr('取消') }}</el-button><el-button type="primary" :disabled="busy" @click="chooseOperation">{{ tr('下一步') }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="showVisible" :title="tr(order?.orderStatus === 0 ? '直播show商品录入' : '直播show调货')" width="min(1280px, 96vw)" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy" :before-close="closeShow">
      <template v-if="order">
        <p>{{ tr('目标位置') }}：{{ order.targetLocationName }} · {{ tr('单号') }}：{{ order.orderNo }}</p>
        <p>{{ tr('操作人') }}：{{ order.completedBy || order.createBy }} · {{ stateName(order.orderStatus) }} <span v-if="order.showStatus">· {{ tr(order.showStatus === 'PENDING' ? '待处理' : '已处理') }}</span></p>
        <p v-if="order.showDueAt">{{ tr('到期时间') }}：{{ order.showDueAt }}</p>
        <p v-if="order.showProcessedAt">{{ tr('处理人') }}：{{ order.showProcessedBy }} · {{ tr('处理时间') }}：{{ order.showProcessedAt }}</p>
        <p v-if="order.showDelegationReason" class="delegation-audit">{{ tr('代处理原因') }}：{{ order.showDelegationReason }}</p>
        <el-alert v-if="invalid || order.lastFailureReason" :title="invalid || order.lastFailureReason" type="error" :closable="false" />
        <div v-if="editable" class="scan-row"><el-input ref="showScanRef" v-model="sku" :placeholder="tr('扫描SKU后按回车')" :disabled="busy" @keyup.enter="scan()" /><el-button :disabled="busy || !sku.trim()" @click="scan()">{{ tr('添加') }}</el-button></div>
        <el-table :data="order.details || []" border class="detail-table" :row-class-name="detailRowClass">
          <el-table-column label="SKU" min-width="130"><template #default="{row}"><span :class="{ 'sku-highlight-text': isFocusedDetail(row) }">{{ row.skuCodeSnapshot }}</span></template></el-table-column>
          <el-table-column :label="tr('图片')" width="85"><template #default="{row}"><el-image v-if="thumbnail(row)" :src="thumbnail(row)" fit="contain" style="width:52px;height:52px" /><span v-else>{{ tr('暂无图片') }}</span></template></el-table-column>
          <el-table-column :label="tr('商品名称')" min-width="140" class-name="wrap-cell"><template #default="{row}">{{ row.item?.itemName || '—' }}</template></el-table-column>
          <el-table-column prop="sourceLocationSnapshot" :label="tr('原始位置')" min-width="160" class-name="wrap-cell" />
          <el-table-column prop="targetLocationSnapshot" :label="tr('新位置')" min-width="160" class-name="wrap-cell" />
          <el-table-column prop="quantity" :label="tr('数量')" width="70" />
          <el-table-column :label="tr('类型')" min-width="120"><template #default><el-tag :class="['type-tag', typeClass(order.movementType)]" effect="plain">{{ typeName(order) }}</el-tag></template></el-table-column>
          <el-table-column :label="tr('创建人')" min-width="110"><template #default>{{ order.createBy || '—' }}</template></el-table-column>
          <el-table-column :label="tr('时间')" min-width="170"><template #default>{{ order.createTime || '—' }}</template></el-table-column>
          <el-table-column :label="tr('处理结果')" min-width="150"><template #default="{row}">{{ row.showResult === 'SOLD' ? 'sold' : row.showResult === 'RETURNED' ? tr('货物已还回') : row.conflictReason || '—' }}</template></el-table-column>
          <el-table-column v-if="editable" :label="tr('操作')" width="80"><template #default="{row}"><el-button type="danger" link :disabled="busy" @click="remove(row)">{{ tr('删除') }}</el-button></template></el-table-column>
        </el-table>
        <el-input v-if="editable" v-model="remark" :disabled="busy" type="textarea" :placeholder="tr('备注')" maxlength="500" class="mb16" />
        <p v-if="editable">{{ tr('确认后商品移入目标直播间，30分钟后须确认处理结果；期间该SKU在所有位置锁定。') }}</p>
        <p v-if="order.returnResponsibilityConfirmed">{{ tr('我确认对还货结果负责') }}</p>
        <el-button v-for="id in order.reverseOrderIds || []" :key="id" link type="primary" @click="showVisible=false;open(id)">{{ tr('查看反向调货单') }}</el-button>
      </template>
      <template #footer><el-button :disabled="busy" @click="closeShow()">{{ tr(order?.orderStatus === 0 ? '取消录入' : '关闭') }}</el-button><el-button :disabled="busy" @click="reload">{{ tr('刷新单据') }}</el-button><el-button v-if="order?.canProcessShow" type="primary" @click="showVisible=false;requestShowResolution(order.id)">{{ tr(order.showDelegationRequired ? 'Show代处理' : '商品处理确认') }}</el-button><el-button v-if="canRecover" @click="copyFailed">{{ tr('核查后复制草稿') }}</el-button><el-button v-if="editable" type="primary" :disabled="busy || !order?.details?.length" @click="confirmShow">{{ tr('确认Show（30分钟）') }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="transferVisible" :title="tr(order?.movementType === 2 ? '反向调货' : '扫码调货')" width="min(1280px, 96vw)" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy" :before-close="closeTransfer">
      <template v-if="order && order.movementType !== 3">
        <p>{{ tr('目标位置') }}：{{ order.targetLocationName }} · {{ tr('单号') }}：{{ order.orderNo }}</p>
        <p>{{ tr('操作人') }}：{{ order.completedBy || order.createBy || '-' }} · {{ stateName(order.orderStatus) }}</p>
        <p>{{ tr('创建人') }}：{{ order.createBy || '-' }} · {{ order.createTime || '-' }}</p>
        <p v-if="order.updateTime">{{ tr('最后更新人') }}：{{ order.updateBy || '-' }} · {{ order.updateTime }}</p>
        <p v-if="order.completedTime">{{ tr('完成人') }}：{{ order.completedBy }} · {{ order.completedTime }}</p>
        <el-alert v-if="invalid || order.lastFailureReason" :title="invalid || `${order.lastFailureTime || ''} ${order.lastFailureReason}`" :type="invalid ? 'error' : 'warning'" :closable="false" />
        <div v-if="editable" class="scan-row">
          <el-input ref="transferScanRef" v-model="sku" :placeholder="tr('扫描SKU后按回车')" :disabled="busy" clearable @keyup.enter="scan()" />
          <el-button type="primary" :disabled="busy || !sku.trim()" @click="scan()">{{ tr('添加') }}</el-button>
        </div>
        <el-table :data="order.details || []" border :row-class-name="detailRowClass" class="detail-table mb16">
          <el-table-column label="SKU" min-width="130"><template #default="{row}"><span :class="{ 'sku-highlight-text': isFocusedDetail(row) }">{{ row.skuCodeSnapshot }}</span></template></el-table-column>
          <el-table-column :label="tr('图片')" width="85"><template #default="{row}"><el-image v-if="thumbnail(row)" :src="thumbnail(row)" fit="contain" style="width:52px;height:52px" /><span v-else>{{ tr('暂无图片') }}</span></template></el-table-column>
          <el-table-column :label="tr('商品名称')" min-width="140" class-name="wrap-cell"><template #default="{row}">{{ row.item?.itemName || '—' }}</template></el-table-column>
          <el-table-column prop="sourceLocationSnapshot" :label="tr('原始位置')" min-width="160" class-name="wrap-cell" />
          <el-table-column prop="targetLocationSnapshot" :label="tr('新位置')" min-width="160" class-name="wrap-cell" />
          <el-table-column prop="quantity" :label="tr('数量')" width="70" />
          <el-table-column :label="tr('类型')" min-width="120"><template #default><el-tag :class="['type-tag', typeClass(order.movementType)]" effect="plain">{{ typeName(order) }}</el-tag></template></el-table-column>
          <el-table-column :label="tr('创建人')" min-width="110"><template #default>{{ order.createBy || '—' }}</template></el-table-column>
          <el-table-column :label="tr('时间')" min-width="170"><template #default>{{ order.createTime || '—' }}</template></el-table-column>
          <el-table-column v-if="hasConflict" :label="tr('冲突原因')" min-width="180"><template #default="{row}">
            <span class="conflict-text">{{ row.conflictReason }}</span>
            <div v-for="current in conflictMap[String(row.id)]?.currentLocations || []" :key="current.id">{{ tr('最新位置') }}：{{ current.locationName }}（{{ current.quantity }}）</div>
          </template></el-table-column>
          <el-table-column v-if="editable" :label="tr('操作')" width="80"><template #default="{row}"><el-button type="danger" link :disabled="busy" @click="remove(row)">{{ tr('删除') }}</el-button></template></el-table-column>
        </el-table>
        <el-input v-if="editable" v-model="remark" :disabled="busy" type="textarea" :placeholder="tr('备注')" maxlength="500" class="mb16" />
        <p v-else-if="order.remark">{{ tr('备注') }}：{{ order.remark }}</p>
        <el-button v-if="order.reverseOfOrderId" link type="primary" @click="open(order.reverseOfOrderId)">{{ tr('查看原调货单') }}</el-button>
        <el-button v-for="id in order.reverseOrderIds || []" :key="id" link type="primary" @click="open(id)">{{ tr('查看反向调货单') }}</el-button>
      </template>
      <template #footer>
        <el-button :disabled="busy" @click="closeTransfer()">{{ tr('关闭') }}</el-button>
        <el-button :disabled="busy" @click="reload">{{ tr('刷新单据') }}</el-button>
        <el-button v-if="editable" :disabled="busy" @click="save">{{ tr('暂存') }}</el-button>
        <el-button v-if="order?.orderStatus === 0 && canOperate" :disabled="busy" type="danger" plain @click="cancel">{{ tr('取消草稿') }}</el-button>
        <el-button v-if="canRecover" :disabled="busy" @click="copyFailed">{{ tr('核查后复制草稿') }}</el-button>
        <el-button v-if="target && order?.orderStatus !== 0 && !invalid && canOperate" :disabled="busy" @click="newDraft">{{ tr('新建调货草稿') }}</el-button>
        <el-button v-if="order?.orderStatus === 1 && canOperate && order.movementType !== 3 && !order.showReturnOrder" :disabled="busy" @click="reverse">{{ tr('生成反向调货单') }}</el-button>
        <el-button v-if="editable" type="primary" :disabled="busy || !order?.details?.length" @click="complete">{{ tr('完成调货') }}</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="candidateVisible" :title="tr('请选择商品实际来源位置')" width="90%" :close-on-click-modal="false" @closed="focus">
      <el-table :data="candidates" border>
        <el-table-column prop="skuCode" label="SKU" min-width="130" />
        <el-table-column prop="rootWarehouseName" :label="tr('一级仓库')" min-width="180" />
        <el-table-column prop="roomName" :label="tr('房间')" min-width="120" />
        <el-table-column prop="quantity" :label="tr('可用数量')" width="100" />
        <el-table-column :label="tr('库存状态')" width="100"><template #default>{{ tr('可调货') }}</template></el-table-column>
        <el-table-column prop="receiptTime" :label="tr('入库时间')" min-width="180" />
        <el-table-column :label="tr('操作')" width="100"><template #default="{row}"><el-button type="primary" @click="choose(row)">{{ tr('选择') }}</el-button></template></el-table-column>
      </el-table>
    </el-dialog>
    <el-dialog v-model="reverseVisible" :title="tr('已生成反向调货草稿')" width="600px">
      <p>{{ tr('按原来源位置分组生成，完成前仍需校验当前库存') }}</p>
      <div v-for="draft in reverseDrafts" :key="draft.id" class="mb16"><el-button link type="primary" @click="reverseVisible=false; open(draft.id)">{{ draft.targetLocationName }} / {{ draft.orderNo }}</el-button></div>
    </el-dialog>
  </div>
</template>
<script setup name="RoomTransfer">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as api from '@/api/wms/roomTransfer'
import { historicalLocations } from '@/api/wms/warehouse'
import { itemThumbnail as thumbnail, requestShowResolution } from '@/utils/liveShow'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
const route=useRoute(), router=useRouter(), user=useUserStore(), settings=useSettingsStore(), {proxy}=getCurrentInstance()
const tr=text=>translateByMap(text,settings.language || 'zh-cn')
const permitted=permission=>user.permissions.includes('*:*:*') || user.permissions.includes(permission)
const canOperate=computed(()=>permitted('wms:roomTransfer:operate')), canList=computed(()=>permitted('wms:roomTransfer:list'))
const target=ref(), order=ref(), invalid=ref(''), busy=ref(false), sku=ref(''), remark=ref(''), roomCode=ref('')
const operationVisible=ref(false), operationType=ref(1), showVisible=ref(false), showScanRef=ref(), transferVisible=ref(false), transferScanRef=ref()
const candidates=ref([]), candidateVisible=ref(false), conflicts=ref([]), reverseDrafts=ref([]), reverseVisible=ref(false)
const list=ref([]), total=ref(0), liveRooms=ref([]), appliedLiveRoomIds=ref([]), listMode=ref('order'), focusDetailId=ref(), query=ref({pageNum:1,pageSize:20,orderNo:undefined,skuCode:undefined,orderStatus:undefined,movementType:undefined,showStatus:undefined,liveRoomIds:[]})
const editable=computed(()=>order.value?.orderStatus === 0 && canOperate.value && !invalid.value)
const canRecover=computed(()=>order.value?.orderStatus === 2 && permitted('wms:roomTransfer:recover'))
const hasConflict=computed(()=>(order.value?.details || []).some(row=>row.conflictReason) || conflicts.value.length>0)
const conflictMap=computed(()=>Object.fromEntries(conflicts.value.map(c=>[String(c.detailId),c])))
function stateName(state) { return tr(({0:'草稿',1:'已完成','-1':'已取消',2:'执行失败'})[state] || '未知') }
function stateClass(state) { return ({0:'state-draft',1:'state-done','-1':'state-cancel',2:'state-fail'})[state] || '' }
function typeName(row) { return tr(row.movementType === 3 ? '直播show调货' : row.movementType === 2 ? '反向调货' : '扫码调货') }
function typeClass(type) { return type === 3 ? 'type-show' : type === 2 ? 'type-reverse' : 'type-scan' }
function isFocusedDetail(row) {
  const details = order.value?.details || []
  return focusDetailId.value && details.length > 1 && String(row?.id) === String(focusDetailId.value)
}
function detailRowClass({row}) {
  const classes = []
  if (row.conflictReason) classes.push('conflict-row')
  if (isFocusedDetail(row)) classes.push('sku-highlight-row')
  return classes.join(' ')
}
function scrollToFocusedDetail() {
  if (!focusDetailId.value) return
  nextTick(() => setTimeout(() => {
    document.querySelector('.room-transfer-page .el-dialog .sku-highlight-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 80))
}
function locationParts(text) {
  const value = text || '—'
  const names = liveRooms.value
    .filter(item => appliedLiveRoomIds.value.some(id => String(item.id) === String(id)))
    .map(item => item.locationName || item.warehouseName)
    .filter(Boolean)
  if (!names.length || value === '—') return [{ text: value, hit: false }]
  return String(value).split('、').map((part, index, parts) => ({ text: part + (index < parts.length - 1 ? '、' : ''), hit: names.some(name => part.trim() === name || part.includes(name)) }))
}
async function focus() { await nextTick(); if (showVisible.value) showScanRef.value?.focus(); else if (transferVisible.value) transferScanRef.value?.focus() }
async function run(action) { if (busy.value) return; busy.value=true; try { return await action() } finally { busy.value=false; if (!candidateVisible.value) focus() } }
async function loadList() { if (!canList.value) return; const roomIds=[...(query.value.liveRoomIds || [])]; const res=listMode.value === 'sku' ? await api.listTransferLines(query.value) : await api.listTransfers(query.value); list.value=res.rows || []; total.value=res.total || 0; appliedLiveRoomIds.value=roomIds }
function switchMode() { query.value.pageNum=1; return loadList() }
function resetFilters() { query.value.liveRoomIds=[]; query.value.orderNo=undefined; query.value.skuCode=undefined; query.value.orderStatus=undefined; query.value.movementType=undefined; query.value.showStatus=undefined; query.value.pageNum=1; return loadList() }
function byLocationName(a, b) { return String(a.locationName || a.warehouseName || '').localeCompare(String(b.locationName || b.warehouseName || ''), 'zh') }
async function loadLiveRooms() {
  const nodes=(await historicalLocations()).data || []
  const rooms=nodes.filter(node=>node.delFlag !== 1)
  liveRooms.value=rooms.filter(node=>node.isLiveRoom).sort(byLocationName)
}
function search() { query.value.pageNum=1; return loadList() }
async function chooseOperation() {
  if(busy.value) return
  if(operationType.value === 1) {operationVisible.value=false;return}
  await run(async()=>{
    const draft=(await api.createTransfer({token:route.query.token,movementType:3})).data
    operationVisible.value=false
    await router.replace({path:route.path,query:{token:route.query.token,id:String(draft.id)}})
    order.value=draft;showVisible.value=true
  })
}
async function closeShow(done) {
  if(busy.value) return
  if(order.value?.orderStatus === 0 && canOperate.value) {
    try { await ElMessageBox.confirm(tr('取消录入将取消此show草稿，确认继续？')) } catch {return}
    await run(async()=>{order.value=(await api.cancelTransfer(order.value.id,{version:order.value.version})).data;await loadList()})
  }
  showVisible.value=false;if(typeof done==='function')done()
}
function closeTransfer(done) {
  if (busy.value) return
  transferVisible.value=false
  if (typeof done==='function') done()
}
async function confirmShow() {await complete();if(order.value?.orderStatus===1 && order.value?.movementType===3)showVisible.value=false}
async function refreshShowList() {await loadList();if(order.value?.id) {order.value=(await api.getTransfer(order.value.id)).data;await validateDestination()}}
function exportRows() { proxy.download('wms/roomTransfer/export',{...query.value},`room_transfer_${Date.now()}.xlsx`) }
async function init() {
  await run(async()=>{
    operationVisible.value=false;showVisible.value=false;transferVisible.value=false;
    invalid.value=''; target.value=undefined; order.value=undefined; conflicts.value=[]; remark.value=''; sku.value=''
    if (route.query.token) {
      try { target.value=(await api.resolveRoom(String(route.query.token))).data }
      catch(error) { invalid.value=error.message || tr('房间二维码无效或没有调货权限') }
    }
    if (route.query.id && (canList.value || canOperate.value)) {
      order.value=(await api.getTransfer(route.query.id)).data; remark.value=order.value.remark || ''
      await validateDestination()
      if(order.value.movementType === 3) showVisible.value=true
      else transferVisible.value=true
      scrollToFocusedDetail()
      await focus()
    } else if(target.value?.isLiveRoom) {operationType.value=1;operationVisible.value=true}
    await loadList()
  })
}
// 每次重新读取单据都检查位置，避免刷新后仍显示已经失效的操作入口。
async function validateDestination() {
  invalid.value=''
  if (order.value?.orderStatus !== 0 || !canOperate.value) return
  try {
    const { historicalLocations }=await import('@/api/wms/warehouse')
    const nodes=(await historicalLocations()).data || [], node=nodes.find(n=>String(n.id) === String(order.value.targetWarehouseId))
    const root=node?.warehouseLevel === 2 ? nodes.find(n=>String(n.id) === String(node.parentId)) : node
    if (!node || node.status !== 0 || node.delFlag !== 0 || !root || root.status !== 0 || root.delFlag !== 0) invalid.value=tr('目标位置已停用或删除，草稿只能查看或取消')
  } catch (error) {
    invalid.value=tr('无法确认目标位置状态，请刷新单据后继续')
    throw error
  }
}
async function open(id, detailId) {
  focusDetailId.value = detailId || undefined
  if(String(route.query.id) === String(id)) {await reload();if(order.value?.movementType === 3)showVisible.value=true;else transferVisible.value=true;scrollToFocusedDetail();return}
  await router.push({path:route.path,query:{id:String(id)}})
}
async function create() { await run(async()=>{ const draft=(await api.createTransfer({token:route.query.token})).data; await router.replace({path:route.path,query:{token:route.query.token,id:String(draft.id)}}); order.value=draft }) }
async function newDraft() { await router.push({path:route.path,query:{token:route.query.token}}) }
async function enterRoom() { let token=roomCode.value.trim(); if (!token) return; try { token=new URL(token,window.location.origin).searchParams.get('token') || token } catch {} if(!route.query.id && String(route.query.token) === token) {await init();return} await router.push({path:'/inventory/room-transfer',query:{token}}) }
async function scan(inventoryId) {
  if (!editable.value || !sku.value.trim()) return
  await run(async()=>{
    const result=(await api.scanTransfer(order.value.id,{version:order.value.version,skuCode:sku.value.trim(),inventoryId})).data
    if (result.candidates?.length) { candidates.value=result.candidates; candidateVisible.value=true; return }
    if (result.order) order.value=result.order
    sku.value=''
    if (result.added) ElMessage.success(tr(result.message)); else ElMessage.warning(tr(result.message))
  })
}
async function choose(row) {
  if (busy.value) return
  await scan(row.id); candidateVisible.value=false; focus()
}
async function persist(ids) { order.value=(await api.saveTransfer(order.value.id,{version:order.value.version,remark:remark.value,detailIds:ids || order.value.details.map(d=>d.id)})).data }
async function save() { await run(async()=>{ await persist(); ElMessage.success(tr('草稿已暂存')); await loadList() }) }
async function remove(row) { await run(async()=>{ await persist(order.value.details.filter(d=>String(d.id)!==String(row.id)).map(d=>d.id)); conflicts.value=conflicts.value.filter(c=>String(c.detailId)!==String(row.id)) }) }
async function reload() { await run(async()=>{ order.value=(await api.getTransfer(order.value.id)).data; remark.value=order.value.remark || ''; conflicts.value=[]; await validateDestination() }) }
async function complete() {
  await ElMessageBox.confirm(tr(order.value?.movementType === 3 ? '确认开始直播show？商品将立即调入并锁定，30分钟后须确认处理结果。' : '确认完成整单调货？完成后只能生成反向调货单。'))
  await run(async()=>{
    await persist()
    try {
      const result=(await api.completeTransfer(order.value.id,{version:order.value.version})).data
      order.value=result.order; conflicts.value=result.conflicts || []
      if (result.completed) ElMessage.success(tr(result.message)); else ElMessage.warning(tr(result.message))
    } catch (error) {
      // 请求失败也可能已提交，先读取服务端状态，不能把完成或失败单继续显示为可编辑草稿。
      try {
        order.value=(await api.getTransfer(order.value.id)).data
        await validateDestination()
        await loadList()
      } catch { invalid.value=tr('无法确认调货结果，请刷新单据后继续') }
      throw error
    }
    await loadList()
  })
}
async function cancel() { await ElMessageBox.confirm(tr('确认取消此草稿？')); await run(async()=>{order.value=(await api.cancelTransfer(order.value.id,{version:order.value.version})).data; await loadList()}) }
async function copyFailed() { if(!canRecover.value) return; await ElMessageBox.confirm(tr('确认已核查库存事务完整回滚并复制新草稿？')); const copy=(await api.copyFailedTransfer(order.value.id)).data; await open(copy.id) }
async function reverse() { await run(async()=>{reverseDrafts.value=(await api.reverseTransfer(order.value.id)).data || []; reverseVisible.value=true; order.value=(await api.getTransfer(order.value.id)).data; await loadList()}) }
watch(()=>route.fullPath,async()=>{
  while (busy.value) await new Promise(resolve=>setTimeout(resolve,30))
  await init()
})
onMounted(()=>{init();loadLiveRooms();window.addEventListener('live-show:updated',refreshShowList)})
onBeforeUnmount(()=>window.removeEventListener('live-show:updated',refreshShowList))
</script>
<style scoped>
.operate-entry{display:flex;gap:10px;align-items:center}.operate-mark{width:28px;height:28px;border-radius:4px;background:#eff8ff;color:#175cd3;display:flex;align-items:center;justify-content:center;flex:none;font-size:16px}.operate-hint{margin:0 0 12px;color:#606266;line-height:22px}.delegation-audit{white-space:pre-wrap;overflow-wrap:anywhere}.mb16{margin-bottom:16px}.toolbar,.actions,.scan-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.toolbar{justify-content:space-between}.scan-row .el-input{flex:1;min-width:200px}.filters{display:flex;gap:12px;align-items:center;flex-wrap:nowrap}.filters :deep(.el-input),.filters :deep(.el-select){flex:1.4 1 0;width:auto;min-width:0;max-width:none}.filters :deep(.filter-short){flex:1 1 0;width:0;min-width:0;max-width:none}.filters .action-btn{flex:none;width:auto;min-width:88px;height:32px;margin:0}.audit{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;color:#606266}.conflict-text{color:#c45656}.room-hit{color:#d92d20;font-weight:700}.state-tag{font-weight:600;border-radius:6px}.state-tag.state-draft{--el-tag-text-color:#175cd3;--el-tag-bg-color:#eff8ff;--el-tag-border-color:#d1e4ff;color:#175cd3;background:#eff8ff;border-color:#d1e4ff}.state-tag.state-done{--el-tag-text-color:#067647;--el-tag-bg-color:#ecfdf3;--el-tag-border-color:#abefc6;color:#067647;background:#ecfdf3;border-color:#abefc6}.state-tag.state-cancel{--el-tag-text-color:#475467;--el-tag-bg-color:#f2f4f7;--el-tag-border-color:#d0d5dd;color:#475467;background:#f2f4f7;border-color:#d0d5dd}.state-tag.state-fail{--el-tag-text-color:#b42318;--el-tag-bg-color:#fef3f2;--el-tag-border-color:#fecdca;color:#b42318;background:#fef3f2;border-color:#fecdca}.type-tag{font-weight:600;border-radius:6px}.type-tag.type-scan{--el-tag-text-color:#175cd3;--el-tag-bg-color:#eff8ff;--el-tag-border-color:#d1e4ff;color:#175cd3;background:#eff8ff;border-color:#d1e4ff}.type-tag.type-reverse{--el-tag-text-color:#b54708;--el-tag-bg-color:#fffaeb;--el-tag-border-color:#fedf89;color:#b54708;background:#fffaeb;border-color:#fedf89}.type-tag.type-show{--el-tag-text-color:#067647;--el-tag-bg-color:#ecfdf3;--el-tag-border-color:#abefc6;color:#067647;background:#ecfdf3;border-color:#abefc6}.list-pagination{width:100%}.list-pagination :deep(.pagination-container){position:relative;height:auto;margin:12px 0 0;padding:12px 0 0 !important;width:100%;background:transparent}.list-pagination :deep(.el-pagination){position:static;right:auto;width:100%;justify-content:flex-end;flex-wrap:wrap;row-gap:8px}:deep(.conflict-row td){background:#fef0f0}:deep(.sku-highlight-row > td){background:#fff4b8 !important}.sku-highlight-text{color:#8a5a00;font-weight:600}:deep(.wrap-cell .cell){white-space:normal;word-break:break-word;line-height:20px}@media(max-width:768px){.room-transfer-page{padding:8px}.filters{flex-wrap:wrap}.filters :deep(.el-input),.filters :deep(.el-select){flex:1 1 100%}.scan-row{align-items:stretch}.scan-row .el-button{width:100%}h2{font-size:20px}}
</style>
