<template>
  <div class="app-container listing-templates">
    <el-card class="filter-card">
      <el-form :model="queryParams" ref="queryRef" :inline="true" @submit.prevent="handleQuery">
        <el-form-item label="平台">
          <el-select v-model="queryParams.platform" clearable style="width:140px">
            <el-option label="TikTok Shop" value="TIKTOK" />
            <el-option label="eBay" value="EBAY" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板名称">
          <el-input v-model="queryParams.templateName" clearable placeholder="搜索模板名称" style="width:200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          <el-button type="success" icon="Plus" @click="handleAdd" v-hasPermi="['wms:platform:listing:edit']">新建模板</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="mt20">
      <el-table :data="templateList" v-loading="loading" border stripe>
        <el-table-column label="模板名称" prop="templateName" min-width="150" />
        <el-table-column label="平台" prop="platform" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.platform === 'EBAY' ? '' : 'danger'" size="small">{{ row.platform === 'EBAY' ? 'eBay' : 'TikTok' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认售价" width="110" align="right">
          <template #default="{ row }">{{ row.priceMarkupValue != null ? '$' + Number(row.priceMarkupValue).toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column label="标题格式" prop="titleFormat" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">{{ row.status === 'ENABLED' ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="160" />
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </el-card>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="800px" :close-on-click-modal="false" destroy-on-close top="20px">
      <div class="template-dialog-body">

        <!-- ============ 公共头部 ============ -->
        <el-row :gutter="16" style="margin-bottom:16px">
          <el-col :span="12">
            <div class="field-label required">模板名称</div>
            <el-input v-model="form.templateName" maxlength="100" placeholder="如：美国站标准模板" />
          </el-col>
          <el-col :span="8">
            <div class="field-label required">平台</div>
            <el-select v-model="form.platform" :disabled="dialog.isEdit" style="width:100%">
              <el-option label="eBay" value="EBAY" />
              <el-option label="TikTok Shop" value="TIKTOK" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <div class="field-label">&nbsp;</div>
            <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" style="margin-top:8px" />
          </el-col>
        </el-row>

        <!-- ============================================================ -->
        <!--                      eBay 原生表单                           -->
        <!-- ============================================================ -->
        <template v-if="form.platform === 'EBAY'">

          <!-- Section 1: Title & Category -->
          <div class="platform-section ebay">
            <div class="section-header"><span class="section-num">1</span> 刊登标题与类目</div>
            <div class="section-body">
              <div class="field-label">默认标题</div>
              <el-input v-model="form.defaultTitle" placeholder="上架时默认填写的标题" maxlength="80" show-word-limit />
              <div class="field-hint">上架时可修改。eBay 标题限制 80 字符。</div>

              <el-row :gutter="16" style="margin-top:16px">
                <el-col :span="12">
                  <div class="field-label required">Primary Category</div>
                  <el-tree-select
                    v-model="form.ebayCategoryId"
                    :data="ebayCategoryTree"
                    :props="{ label: 'label', value: 'id', isLeaf: 'isLeaf' }"
                    placeholder="逐级展开，选择最底层类目"
                    filterable
                    lazy
                    :load="loadEbayChildren"
                    style="width:100%"
                  />
                  <div class="field-hint">必填。从 eBay 类目树中选择 <el-button link type="primary" size="small" @click="handleSyncCategories('EBAY')" :loading="syncingEbay">同步最新类目</el-button></div>
                </el-col>
                <el-col :span="12">
                  <div class="field-label">Marketplace</div>
                  <el-select v-model="form.ebayMarketplaceId" style="width:100%">
                    <el-option label="EBAY_US — 美国站" value="EBAY_US" />
                    <el-option label="EBAY_GB — 英国站" value="EBAY_GB" />
                    <el-option label="EBAY_DE — 德国站" value="EBAY_DE" />
                    <el-option label="EBAY_AU — 澳洲站" value="EBAY_AU" />
                  </el-select>
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- Section 2: Item specifics -->
          <div class="platform-section ebay">
            <div class="section-header"><span class="section-num">2</span> 商品属性 (Item Specifics)</div>
            <div class="section-body">
              <el-row :gutter="16">
                <el-col :span="8">
                  <div class="field-label required">Condition</div>
                  <el-select v-model="form.ebayCondition" style="width:100%">
                    <el-option label="USED_GOOD — Pre-owned" value="USED_GOOD" />
                    <el-option label="NEW_WITH_TAGS" value="NEW_WITH_TAGS" />
                    <el-option label="NEW_WITHOUT_TAGS" value="NEW_WITHOUT_TAGS" />
                    <el-option label="LIKE_NEW — Refurbished" value="LIKE_NEW" />
                    <el-option label="USED_FAIR — Fair" value="USED_FAIR" />
                  </el-select>
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Brand</div>
                  <el-input value="自动：商品品牌" disabled />
                  <div class="field-hint">从商品数据自动填入</div>
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Department</div>
                  <el-input value="Women" disabled />
                </el-col>
              </el-row>
              <el-row :gutter="16" style="margin-top:12px">
                <el-col :span="8">
                  <div class="field-label">Material</div>
                  <el-input value="自动：商品材质" disabled />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Style</div>
                  <el-input value="自动：商品类目" disabled />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Authentication</div>
                  <el-input value="自动：鉴定机构" disabled />
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- Section 3: Selling details -->
          <div class="platform-section ebay">
            <div class="section-header"><span class="section-num">3</span> 销售设置 (Selling Details)</div>
            <div class="section-body">
              <el-row :gutter="16">
                <el-col :span="8">
                  <div class="field-label">Format</div>
                  <el-input value="FIXED_PRICE (固定价格)" disabled />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Quantity</div>
                  <el-input-number v-model="form.ebayQuantity" :min="1" :max="100" style="width:100%" />
                </el-col>
                <el-col :span="8">
                  <div class="field-label required">默认售价 (USD)</div>
                  <el-input-number v-model="form.defaultPrice" :min="0" :precision="2" :step="10" style="width:100%" placeholder="0.00" />
                  <div class="field-hint">上架时可修改</div>
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- Section 4: Description -->
          <div class="platform-section ebay">
            <div class="section-header"><span class="section-num">4</span> 商品描述 (Description)</div>
            <div class="section-body">
              <div class="field-label">描述模板（留空自动生成）</div>
              <el-input v-model="form.descriptionFormat" type="textarea" :rows="6" placeholder="支持 {itemName} {brand} {material} {condition} 变量" />
              <div class="field-hint">为空时自动从商品属性生成 HTML 描述。支持变量替换。</div>
            </div>
          </div>

          <!-- Section 5: Shipping -->
          <div class="platform-section ebay">
            <div class="section-header"><span class="section-num">5</span> 物流与包裹 (Shipping & Package)</div>
            <div class="section-body">
              <el-row :gutter="16">
                <el-col :span="8">
                  <div class="field-label">Fulfillment Policy ID</div>
                  <el-input v-model="form.ebayFulfillmentPolicyId" placeholder="选填" />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Payment Policy ID</div>
                  <el-input v-model="form.ebayPaymentPolicyId" placeholder="选填" />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Return Policy ID</div>
                  <el-input v-model="form.ebayReturnPolicyId" placeholder="选填" />
                </el-col>
              </el-row>
              <div class="field-label" style="margin-top:16px">包裹尺寸与重量</div>
              <el-row :gutter="8">
                <el-col :span="6">
                  <el-input-number v-model="form.packageLength" :min="0" :precision="1" style="width:100%" placeholder="长" /><div class="field-hint" style="text-align:center">Length (in)</div>
                </el-col>
                <el-col :span="6">
                  <el-input-number v-model="form.packageWidth" :min="0" :precision="1" style="width:100%" placeholder="宽" /><div class="field-hint" style="text-align:center">Width (in)</div>
                </el-col>
                <el-col :span="6">
                  <el-input-number v-model="form.packageHeight" :min="0" :precision="1" style="width:100%" placeholder="高" /><div class="field-hint" style="text-align:center">Height (in)</div>
                </el-col>
                <el-col :span="6">
                  <el-input-number v-model="form.packageWeightValue" :min="0" :precision="2" :step="0.5" style="width:100%" placeholder="重量" /><div class="field-hint" style="text-align:center">Weight (lbs)</div>
                </el-col>
              </el-row>
            </div>
          </div>
        </template>

        <!-- ============================================================ -->
        <!--                    TikTok 原生表单                           -->
        <!-- ============================================================ -->
        <template v-if="form.platform === 'TIKTOK'">

          <!-- Section 1: Basic Info -->
          <div class="platform-section tiktok">
            <div class="section-header"><span class="section-num">1</span> Basic Information</div>
            <div class="section-body">
              <div class="field-label">Default Listing Title</div>
              <el-input v-model="form.defaultTitle" placeholder="上架时默认填写的标题" maxlength="200" show-word-limit />
              <div class="field-hint">上架时可修改</div>

              <el-row :gutter="16" style="margin-top:16px">
                <el-col :span="12">
                  <div class="field-label required">Category</div>
                  <el-tree-select
                    v-model="form.tiktokCategoryId"
                    :data="tiktokCategoryTree"
                    :props="{ label: 'label', value: 'id', isLeaf: 'isLeaf' }"
                    placeholder="逐级展开，选择最底层类目"
                    filterable
                    lazy
                    :load="loadTiktokChildren"
                    style="width:100%"
                  />
                  <div class="field-hint">必填。从 TikTok Shop 类目树中选择 <el-button link type="primary" size="small" @click="handleSyncCategories('TIKTOK')" :loading="syncingTiktok">同步最新类目</el-button></div>
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- Section 2: SKU & Pricing -->
          <div class="platform-section tiktok">
            <div class="section-header"><span class="section-num">2</span> SKU & Pricing</div>
            <div class="section-body">
              <el-row :gutter="16">
                <el-col :span="8">
                  <div class="field-label">Seller SKU</div>
                  <el-input value="自动：itemSku.skuCode" disabled />
                </el-col>
                <el-col :span="8">
                  <div class="field-label required">仓库 ID</div>
                  <el-input v-model="form.tiktokWarehouseId" placeholder="TikTok 仓库编号" />
                  <div class="field-hint">必填。用于 TikTok Shop 库存同步。</div>
                </el-col>
                <el-col :span="8">
                  <div class="field-label required">默认售价 (USD)</div>
                  <el-input-number v-model="form.defaultPrice" :min="0" :precision="2" :step="10" style="width:100%" placeholder="0.00" />
                  <div class="field-hint">上架时可修改</div>
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- Section 3: Description -->
          <div class="platform-section tiktok">
            <div class="section-header"><span class="section-num">3</span> Product Description</div>
            <div class="section-body">
              <div class="field-label">描述模板（留空自动生成）</div>
              <el-input v-model="form.descriptionFormat" type="textarea" :rows="6" placeholder="支持 {itemName} {brand} {material} {condition} 变量" />
              <div class="field-hint">为空时自动从商品属性生成描述。支持变量替换。</div>
            </div>
          </div>

          <!-- Section 4: Product Attributes -->
          <div class="platform-section tiktok">
            <div class="section-header"><span class="section-num">4</span> Product Attributes</div>
            <div class="section-body">
              <el-row :gutter="16">
                <el-col :span="8">
                  <div class="field-label">Brand</div>
                  <el-input value="自动：商品品牌" disabled />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Fabrication</div>
                  <el-input value="自动：商品材质" disabled />
                </el-col>
                <el-col :span="8">
                  <div class="field-label">Condition</div>
                  <el-input value="Pre-owned (Used)" disabled />
                </el-col>
              </el-row>
            </div>
          </div>

          <!-- Section 4: Package -->
          <div class="platform-section tiktok">
            <div class="section-header"><span class="section-num">4</span> Package Dimensions & Weight</div>
            <div class="section-body">
              <el-row :gutter="8">
                <el-col :span="5">
                  <el-input-number v-model="form.packageLength" :min="0" :precision="1" style="width:100%" placeholder="长" /><div class="field-hint" style="text-align:center">Length (cm)</div>
                </el-col>
                <el-col :span="5">
                  <el-input-number v-model="form.packageWidth" :min="0" :precision="1" style="width:100%" placeholder="宽" /><div class="field-hint" style="text-align:center">Width (cm)</div>
                </el-col>
                <el-col :span="5">
                  <el-input-number v-model="form.packageHeight" :min="0" :precision="1" style="width:100%" placeholder="高" /><div class="field-hint" style="text-align:center">Height (cm)</div>
                </el-col>
                <el-col :span="5">
                  <el-input-number v-model="form.packageWeightValue" :min="0" :precision="2" :step="0.1" style="width:100%" placeholder="重量" /><div class="field-hint" style="text-align:center">Weight (kg)</div>
                </el-col>
              </el-row>
            </div>
          </div>
        </template>

      </div>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存模板</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import { listTemplates, addTemplate, updateTemplate, delTemplate, getTemplate, getCategories, syncCategories } from '@/api/wms/platformListing'

const { proxy } = getCurrentInstance()
const t = (key) => proxy?.$t?.(key) || key

const loading = ref(false), total = ref(0), templateList = ref([]), submitting = ref(false)
const queryRef = ref(null), formRef = ref(null)
const ebayCategoryTree = ref([])
const tiktokCategoryTree = ref([])
const syncingEbay = ref(false)
const syncingTiktok = ref(false)

// 懒加载：根据层级获取对应类目
function loadEbayChildren(node, resolve) {
  const parentId = node.level === 0 ? null : node.data?.dbId
  getCategories('EBAY', parentId).then(res => {
    const data = res.data || []
    // 同时写入 :data 确保顶级节点渲染（level===0 时 node.data 为空）
    if (node.level === 0) ebayCategoryTree.value = data
    resolve(data)
  }).catch(() => resolve([]))
}

function loadTiktokChildren(node, resolve) {
  const parentId = node.level === 0 ? null : node.data?.dbId
  getCategories('TIKTOK', parentId).then(res => {
    const data = res.data || []
    if (node.level === 0) tiktokCategoryTree.value = data
    resolve(data)
  }).catch(() => resolve([]))
}

const queryParams = reactive({ pageNum: 1, pageSize: 10, platform: '', templateName: '' })

const initForm = {
  id: null, templateName: '', platform: 'EBAY', enabled: true, defaultTitle: '', defaultPrice: null,
  descriptionFormat: '',
  ebayCategoryId: '', ebayCondition: 'USED_GOOD', ebayQuantity: 1, ebayMarketplaceId: 'EBAY_US',
  ebayFulfillmentPolicyId: '', ebayPaymentPolicyId: '', ebayReturnPolicyId: '',
  tiktokCategoryId: '', tiktokWarehouseId: '',
  packageWeightValue: null, packageLength: null, packageWidth: null, packageHeight: null
}
const form = reactive({ ...initForm })
const rules = {
  templateName: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }],
  platform: [{ required: true, message: '请选择平台', trigger: 'change' }]
}
const dialog = reactive({ visible: false, title: '', isEdit: false })

function getList() {
  loading.value = true
  listTemplates(queryParams).then(res => {
    templateList.value = res.rows || []
    total.value = res.total || 0
  }).finally(() => { loading.value = false })
}

function handleQuery() { queryParams.pageNum = 1; getList() }
function resetQuery() { queryRef.value?.resetFields(); handleQuery() }
function resetForm() { Object.assign(form, initForm); form.enabled = true }

function handleAdd() { resetForm(); dialog.title = '新建上架模板'; dialog.isEdit = false; dialog.visible = true }
function handleEdit(row) {
  resetForm(); dialog.title = '编辑上架模板'; dialog.isEdit = true
  getTemplate(row.id).then(res => {
    const d = res.data || {}
    Object.assign(form, {
      id: d.id, templateName: d.templateName, platform: d.platform, enabled: d.status === 'ENABLED',
      defaultTitle: d.titleFormat || '', defaultPrice: d.priceMarkupValue || null,
      descriptionFormat: d.descriptionFormat || '',
      ebayCategoryId: d.ebayCategoryId || '', ebayCondition: d.ebayCondition || 'USED_GOOD',
      ebayQuantity: d.ebayQuantity || 1, ebayMarketplaceId: d.ebayMarketplaceId || 'EBAY_US',
      ebayFulfillmentPolicyId: d.ebayFulfillmentPolicyId || '',
      ebayPaymentPolicyId: d.ebayPaymentPolicyId || '',
      ebayReturnPolicyId: d.ebayReturnPolicyId || '',
      tiktokCategoryId: d.tiktokCategoryId || '', tiktokWarehouseId: d.tiktokWarehouseId || '',
      packageWeightValue: d.packageWeightValue, packageLength: d.packageLength,
      packageWidth: d.packageWidth, packageHeight: d.packageHeight
    })
  })
  dialog.visible = true
}

function submitForm() {
  if (!form.templateName) { proxy.$modal.msgWarning('请输入模板名称'); return }
  if (!form.platform) { proxy.$modal.msgWarning('请选择平台'); return }
  submitting.value = true
  const isEbay = form.platform === 'EBAY'
  const data = {
    id: form.id, templateName: form.templateName, platform: form.platform,
    status: form.enabled ? 'ENABLED' : 'DISABLED',
    titleFormat: form.defaultTitle,          // 复用此字段存标题
    priceSource: 'CUSTOM',                   // 始终自定义价格
    priceMarkupValue: form.defaultPrice,     // 复用此字段存价格
    priceMarkupType: 'FIXED',
    descriptionFormat: form.descriptionFormat || null,
    ebayCategoryId: form.ebayCategoryId || null, ebayCondition: form.ebayCondition || null,
    ebayQuantity: form.ebayQuantity, ebayMarketplaceId: form.ebayMarketplaceId || null,
    ebayFulfillmentPolicyId: form.ebayFulfillmentPolicyId || null,
    ebayPaymentPolicyId: form.ebayPaymentPolicyId || null,
    ebayReturnPolicyId: form.ebayReturnPolicyId || null,
    tiktokCategoryId: form.tiktokCategoryId || null, tiktokWarehouseId: form.tiktokWarehouseId || null,
    packageWeightValue: form.packageWeightValue,
    packageWeightUnit: isEbay ? 'POUND' : 'KILOGRAM',
    packageLength: form.packageLength, packageWidth: form.packageWidth, packageHeight: form.packageHeight,
    packageDimensionUnit: isEbay ? 'INCH' : 'CENTIMETER'
  }
  const req = dialog.isEdit ? updateTemplate(data) : addTemplate(data)
  req.then(() => {
    proxy.$modal.msgSuccess(dialog.isEdit ? '修改成功' : '新增成功')
    dialog.visible = false; getList()
  }).catch(() => {
    proxy.$modal.msgError('保存失败')
  }).finally(() => { submitting.value = false })
}

function handleDelete(row) {
  proxy.$modal.confirm(`确认删除模板「${row.templateName}」？`, '提示', { type: 'warning' }).then(() => {
    delTemplate(row.id).then(() => { proxy.$modal.msgSuccess('删除成功'); getList() })
  }).catch(() => {})
}

function handleSyncCategories(platform) {
  const isEbay = platform === 'EBAY'
  if (isEbay) syncingEbay.value = true; else syncingTiktok.value = true
  syncCategories(platform).then(res => {
    const count = res.data?.count || 0
    proxy.$modal.msgSuccess(`${platform} 类目同步完成，共 ${count} 条`)
  }).catch(() => {
    proxy.$modal.msgError(`${platform} 类目同步失败，请确认已授权店铺`)
  }).finally(() => {
    if (isEbay) syncingEbay.value = false; else syncingTiktok.value = false
  })
}

onMounted(() => getList())
</script>

<style scoped>
.listing-templates .filter-card { margin-bottom: 0; }
.template-dialog-body { max-height: 560px; overflow-y: auto; padding-right: 4px; }

/* 平台分区卡片 */
.platform-section {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 14px;
  overflow: hidden;
}
.platform-section.ebay { border-left: 4px solid #409EFF; }
.platform-section.tiktok { border-left: 4px solid #F56C6C; }

.section-header {
  font-size: 14px; font-weight: 600; padding: 10px 16px;
  display: flex; align-items: center; gap: 8px;
}
.ebay .section-header { background: #ecf5ff; color: #409EFF; }
.tiktok .section-header { background: #fef0f0; color: #F56C6C; }

.section-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.ebay .section-num { background: #409EFF; color: #fff; }
.tiktok .section-num { background: #F56C6C; color: #fff; }

.section-body { padding: 12px 16px 16px; }

.field-label { font-size: 13px; font-weight: 500; color: #303133; margin-bottom: 4px; margin-top: 4px; }
.field-label.required::after { content: ' *'; color: #F56C6C; }
.field-hint { font-size: 12px; color: #909399; margin-top: 2px; }
</style>
