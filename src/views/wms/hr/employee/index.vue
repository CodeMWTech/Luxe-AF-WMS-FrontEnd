<template>
  <div class="app-container employee-page" :class="{ 'is-en': isEn }">
    <el-card class="hero-card">
      <div class="hero-header">
        <div>
          <h2 class="hero-title">{{ tr('HR 人力资源') }}</h2>
          <p class="hero-desc">{{ tr('管理公司员工档案与必备文件。系统用户会自动同步到此列表；也可直接新增无登录账号的员工。非公司员工的系统账号可从 HR 移除。') }}</p>
        </div>
        <div class="hero-actions">
          <el-button type="primary" icon="Plus" @click="handleAdd" v-hasPermi="['wms:employee:add']">{{ tr('新增员工') }}</el-button>
          <el-button type="primary" plain icon="User" @click="goUserManagement">{{ tr('用户管理（创建登录账号）') }}</el-button>
          <el-dropdown v-hasPermi="['wms:employee:file:batchDownload']" @command="handleBatchDownloadCommand">
            <el-button type="default">
              {{ tr('按文件类型导出') }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="hasSingleTargetEmployee" command="REQUIRED">{{ tr('导出必备文件包') }}</el-dropdown-item>
                <el-dropdown-item v-if="hasSingleTargetEmployee" command="OTHER">{{ tr('导出其他文件包') }}</el-dropdown-item>
                <el-dropdown-item v-if="hasSingleTargetEmployee" command="ALL">{{ tr('导出全部文件包') }}</el-dropdown-item>
                <el-dropdown-item divided disabled>{{ tr('按文件类型') }}</el-dropdown-item>
                <el-dropdown-item v-for="item in batchDownloadTypes" :key="item.code" :command="'TYPE:' + item.code">
                  {{ tr(item.label) }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button icon="Download" @click="handleExport" v-hasPermi="['wms:employee:export']">{{ tr('导出 Excel 花名册') }}</el-button>
        </div>
      </div>

      <el-row :gutter="16" class="stats-row">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-label">{{ tr('员工总数') }}</div>
            <div class="stat-value">{{ stats.activeEmployeeCount || 0 }}</div>
            <div class="stat-sub">{{ tr('在职与试用期，左侧列表分页展示') }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-label">{{ tr('已上传文件') }}</div>
            <div class="stat-value">{{ stats.uploadedAttachmentCount || 0 }} / {{ stats.requiredAttachmentCount || 0 }}</div>
            <div class="stat-sub">{{ tr('全员必备文件上传进度') }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-label">{{ tr('缺文件员工') }}</div>
            <div class="stat-value warning">{{ stats.missingEmployeeCount || 0 }}</div>
            <div class="stat-sub">{{ tr('仍有必备文件未齐') }} · {{ tr('已齐全') }} {{ stats.completeFileEmployeeCount || 0 }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="stat-label">{{ tr('已归档员工') }}</div>
            <div class="stat-value">{{ stats.archivedEmployeeCount || 0 }}</div>
            <div class="stat-sub">{{ tr('已完成离职归档') }}</div>
          </div>
        </el-col>
      </el-row>

      <el-alert
        v-if="stats.missingEmployeeCount > 0"
        type="warning"
        show-icon
        :closable="false"
        class="mt16"
      >
        <template #title>
          {{ missingAlertTitle }}
        </template>
      </el-alert>
    </el-card>

    <el-row :gutter="16" class="mt16 workspace-row">
      <el-col :xs="24" :md="8" class="workspace-col">
        <el-card class="list-card workspace-panel">
          <div class="list-toolbar">
            <el-input
              v-model="queryParams.keyword"
              class="search-input"
              :placeholder="tr('搜索昵称/登录名/手机/邮箱/部门/岗位等')"
              clearable
              @keyup.enter="handleQuery"
            />
            <el-button type="primary" icon="Search" @click="handleQuery">{{ tr('搜索') }}</el-button>
          </div>
          <div class="search-hint">{{ tr('支持搜索员工档案中已填写的各类信息，含用户昵称、登录名、手机、邮箱、部门、岗位、备注等') }}</div>
          <div class="filter-bar">
            <el-select v-model="queryParams.viewMode" class="filter-item" @change="handleViewModeChange">
              <el-option :label="tr('在职员工')" value="active" />
              <el-option :label="tr('归档员工')" value="archived" />
            </el-select>
            <el-select
              v-if="queryParams.viewMode !== 'archived'"
              v-model="queryParams.filterEmployeeStatus"
              class="filter-item"
              @change="handleQuery"
            >
              <el-option :label="tr('全部状态')" value="" />
              <el-option v-for="item in employeeStatusFilterOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-tree-select
              v-model="deptFilterValue"
              class="filter-item filter-dept-tree"
              :data="deptFilterTreeData"
              :props="{ value: 'id', label: 'label', children: 'children' }"
              value-key="id"
              :placeholder="tr('筛选部门')"
              check-strictly
              @change="handleDeptFilterChange"
            />
            <el-select v-model="queryParams.filterTaxFormType" class="filter-item" clearable :placeholder="tr('筛选税务身份')" @change="handleQuery">
              <el-option :label="tr('全部税务身份')" value="" />
              <el-option label="W2" value="W2" />
              <el-option label="W8" value="W8" />
              <el-option label="W9" value="W9" />
            </el-select>
            <el-select v-model="queryParams.filterHasAccount" class="filter-item" clearable :placeholder="tr('筛选账号')" @change="handleQuery">
              <el-option :label="tr('全部账号')" value="" />
              <el-option :label="tr('有账号')" :value="'1'" />
              <el-option :label="tr('无账号')" :value="'0'" />
            </el-select>
            <el-button icon="Refresh" @click="resetFilters">{{ tr('重置') }}</el-button>
          </div>

          <div v-if="canBatchDownload" class="selection-hint-block">
            <div class="selection-hint-text">
              <el-icon class="selection-hint-icon"><InfoFilled /></el-icon>
              {{ tr('左侧勾选用于「按文件类型导出」批量下载附件；不勾选时默认当前页全部，点击行仅查看详情。') }}
            </div>
            <div class="selection-hint-status">{{ batchDownloadScopeHint }}</div>
          </div>

          <div class="list-table-wrap">
            <el-table
              v-loading="loading"
              :data="employeeList"
              highlight-current-row
              stripe
              height="100%"
              @current-change="handleSelectEmployee"
              @selection-change="handleSelectionChange"
              class="employee-table"
              size="small"
            >
              <el-table-column type="selection" width="42" v-if="canBatchDownload" />
              <el-table-column min-width="120">
                <template #header>
                  <span>{{ tr('姓名') }}</span>
                  <el-tooltip :content="tr('有登录账号的员工会同步用户昵称；无账号员工仅在此维护档案')" placement="top">
                    <el-icon class="header-tip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
                <template #default="{ row }">
                  <div class="name-cell">
                    <div class="name-primary">
                      {{ row.nameCn }}
                      <el-tag v-if="row.userId" size="small" type="primary" effect="plain" class="account-tag account-tag--linked">{{ tr('有账号') }}</el-tag>
                      <el-tag v-else size="small" type="info" effect="plain" class="account-tag account-tag--none">{{ tr('无账号') }}</el-tag>
                    </div>
                    <div v-if="row.nameEn" class="name-secondary">{{ row.nameEn }}</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column :label="tr('部门')" prop="deptName" min-width="88" show-overflow-tooltip />
              <el-table-column :label="tr('状态')" width="72" align="center">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain" :type="statusTagType(row.employeeStatus)">{{ statusLabel(row.employeeStatus) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column :label="tr('缺文件')" width="64" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.missingRequiredCount > 0" type="warning" size="small" effect="plain">{{ tr('缺') }}{{ row.missingRequiredCount }}</el-tag>
                  <span v-else class="ok-text">✓</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-show="total > 0" class="list-pagination">
            <pagination
              :total="total"
              v-model:page="queryParams.pageNum"
              v-model:limit="queryParams.pageSize"
              layout="total, prev, pager, next, jumper"
              :auto-scroll="false"
              @pagination="getList"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="16" class="workspace-col">
        <el-card v-if="selectedEmployee" class="detail-card workspace-panel">
          <div class="detail-body">
          <div class="detail-header">
            <div>
              <h3 class="detail-name">{{ selectedEmployee.nameCn }}<span v-if="selectedEmployee.nameEn" class="detail-name-en">{{ selectedEmployee.nameEn }}</span></h3>
              <div v-if="selectedEmployee.email || selectedEmployee.phone || selectedEmployee.userName" class="detail-meta">
                {{ [selectedEmployee.userName ? tr('登录账号') + ': ' + selectedEmployee.userName : '', selectedEmployee.email, selectedEmployee.phone].filter(Boolean).join(' · ') }}
              </div>
            </div>
            <div class="detail-actions">
              <el-dropdown v-hasPermi="['wms:employee:export', 'wms:employee:file:batchDownload']" @command="handleDetailExportCommand">
                <el-button>{{ tr('导出此员工') }}<el-icon class="el-icon--right"><arrow-down /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="EXCEL" v-hasPermi="['wms:employee:export']">{{ tr('导出员工 Excel') }}</el-dropdown-item>
                    <el-dropdown-item command="REQUIRED" v-hasPermi="['wms:employee:file:batchDownload']">{{ tr('导出必备文件包') }}</el-dropdown-item>
                    <el-dropdown-item command="OTHER" v-hasPermi="['wms:employee:file:batchDownload']">{{ tr('导出其他文件包') }}</el-dropdown-item>
                    <el-dropdown-item command="ALL" v-hasPermi="['wms:employee:file:batchDownload']">{{ tr('导出全部文件包') }}</el-dropdown-item>
                    <el-dropdown-item divided disabled>{{ tr('按文件类型') }}</el-dropdown-item>
                    <el-dropdown-item
                      v-for="item in detailDownloadTypes"
                      :key="item.code"
                      :command="'TYPE:' + item.code"
                      v-hasPermi="['wms:employee:file:batchDownload']"
                    >
                      {{ tr(item.label) }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button type="primary" @click="handleUpdate(selectedEmployee)" v-hasPermi="['wms:employee:edit']">{{ tr('编辑资料') }}</el-button>
              <el-button type="warning" @click="handleArchive(selectedEmployee)" v-if="selectedEmployee.employeeStatus < 2" v-hasPermi="['wms:employee:archive']">{{ tr('离职归档') }}</el-button>
              <el-button
                type="danger"
                plain
                @click="handleRemoveEmployee(selectedEmployee)"
                v-if="selectedEmployee.employeeStatus < 2"
                v-hasPermi="['wms:employee:remove']"
              >{{ selectedEmployee.userId ? tr('从 HR 移除') : tr('删除档案') }}</el-button>
            </div>
          </div>

          <el-descriptions :column="3" border class="mt16">
            <el-descriptions-item :label="tr('员工编号')">{{ selectedEmployee.employeeNo }}</el-descriptions-item>
            <el-descriptions-item :label="tr('登录账号')">{{ selectedEmployee.userName || tr('无（仅档案）') }}</el-descriptions-item>
            <el-descriptions-item :label="tr('税务身份')">{{ selectedEmployee.taxFormType || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="tr('部门')">{{ selectedEmployee.deptName || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="tr('岗位')">{{ selectedEmployee.position || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="tr('联系电话')">{{ selectedEmployee.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item :label="tr('状态')">
              <el-tag size="small" :type="statusTagType(selectedEmployee.employeeStatus)">{{ statusLabel(selectedEmployee.employeeStatus) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item :label="tr('备注')" :span="3">{{ selectedEmployee.remark || '-' }}</el-descriptions-item>
            <template v-if="canViewSensitive">
              <el-descriptions-item :label="tr('薪资类型')">{{ selectedEmployee.salaryType || '-' }}</el-descriptions-item>
              <el-descriptions-item :label="tr('基本工资')">{{ selectedEmployee.baseSalary ?? '-' }}</el-descriptions-item>
              <el-descriptions-item :label="tr('工资账户')">{{ selectedEmployee.bankAccountInfo || '-' }}</el-descriptions-item>
            </template>
          </el-descriptions>

          <div class="section-title mt20">
            {{ taxFormTitle(selectedEmployee.taxFormType) }}
            <span class="sub-text">（{{ tr('已上传') }} {{ selectedEmployee.uploadedRequiredCount || 0 }}/{{ selectedEmployee.requiredCount || 0 }}）</span>
          </div>
          <div class="upload-hint">{{ tr('必备文件仅支持单个 PDF；多个文件请合并为压缩包后上传到「其他文件」。') }}</div>

          <el-row :gutter="12" class="attachment-grid">
            <el-col v-for="card in requiredAttachmentCards" :key="card.code" :xs="24" :sm="12" :lg="8">
              <div class="attachment-card">
                <div class="attachment-card-head">
                  <div>
                    <div class="attachment-title">{{ tr(card.label) }}</div>
                    <div class="attachment-desc">{{ tr(card.desc) }}</div>
                  </div>
                  <el-tag :type="attachmentMap[card.code] ? 'success' : 'warning'" size="small">
                    {{ attachmentMap[card.code] ? tr('已上传') : tr('缺失') }}
                  </el-tag>
                </div>
                <div class="attachment-actions">
                  <div v-if="attachmentMap[card.code]" class="attachment-action-links">
                    <el-link type="primary" @click.stop.prevent="downloadAttachment(attachmentMap[card.code])">{{ tr('查看') }}</el-link>
                    <el-button
                      v-if="selectedEmployee.employeeStatus < 2"
                      link
                      type="danger"
                      @click.stop.prevent="removeRequiredAttachment(card)"
                      v-hasPermi="['wms:employee:edit']"
                    >{{ tr('删除') }}</el-button>
                  </div>
                  <el-upload
                    v-if="selectedEmployee.employeeStatus < 2 && canUploadAttachment(card)"
                    :key="`required-upload-${card.code}-${requiredUploadKeys[card.code] || 0}`"
                    drag
                    class="required-upload"
                    :class="{ 'is-upload-error': requiredUploadErrors[card.code] }"
                    :auto-upload="false"
                    :show-file-list="false"
                    :limit="1"
                    @exceed="() => handleRequiredExceed(card.code)"
                    @change="(file) => handleRequiredFileChange(file, card.code)"
                    v-hasPermi="['wms:employee:edit']"
                  >
                    <div class="required-upload-text">
                      {{ attachmentMap[card.code] ? tr('拖拽 PDF 到此处重新上传') : tr('拖拽 PDF 到此处，或点击上传') }}
                    </div>
                    <template #tip>
                      <div class="el-upload__tip">{{ tr('仅支持 PDF，每个类型限一个文件') }}</div>
                    </template>
                  </el-upload>
                  <div v-if="requiredUploadErrors[card.code]" class="upload-error-text">
                    {{ requiredUploadErrors[card.code] }}
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>

          <div class="section-title mt20">{{ tr('其他文件') }} <span class="sub-text">（{{ tr('共') }} {{ otherAttachments.length }}）</span></div>
          <div class="upload-hint">{{ tr('其他文件支持多种格式，可批量上传；如需打包多个文件，可先压缩再上传。') }}</div>
          <div class="other-files">
            <div v-for="item in otherAttachments" :key="item.id" class="other-file-item">
              <el-link type="primary" @click="downloadAttachment(item)">{{ item.fileName || tr(item.attachmentTypeLabel) }}</el-link>
              <el-button v-if="selectedEmployee.employeeStatus < 2" link type="danger" @click.stop.prevent="removeAttachment(item)" v-hasPermi="['wms:employee:edit']">{{ tr('删除') }}</el-button>
            </div>
            <el-upload
              v-if="selectedEmployee.employeeStatus < 2"
              drag
              class="other-upload"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              multiple
              :on-success="(res, file) => handleAttachmentUploadSuccess(res, file, 'OTHER')"
              v-hasPermi="['wms:employee:edit']"
            >
              <div class="required-upload-text">{{ tr('拖拽文件到此处，或点击上传其他文件') }}</div>
            </el-upload>
          </div>
          </div>
        </el-card>

        <el-card v-else class="detail-card workspace-panel empty-detail">
          <el-empty :description="tr('请选择左侧员工查看详情')" />
        </el-card>
      </el-col>
    </el-row>

    <el-drawer v-model="open" :title="title" size="55%" append-to-body>
      <el-form ref="employeeRef" :model="form" :rules="rules" :label-width="drawerLabelWidth">
        <el-tabs v-model="activeTab" :before-leave="beforeTabLeave">
          <el-tab-pane :label="tr('基本信息')" name="basic">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item :label="isCreateMode ? tr('姓名') : tr('姓名/昵称')" prop="nameCn">
                  <el-input v-model="form.nameCn" :placeholder="isCreateMode ? tr('请输入员工姓名') : tr('请输入姓名或用户昵称')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="tr('归属部门')">
                  <el-tree-select
                    v-model="form.deptId"
                    :data="deptOptions"
                    :props="{ value: 'id', label: 'label', children: 'children' }"
                    value-key="id"
                    :placeholder="tr('请选择归属部门')"
                    check-strictly
                    clearable
                    style="width: 100%"
                    @change="handleDeptChange"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="tr('联系电话')" prop="phone">
                  <el-input v-model="form.phone" :placeholder="tr('请输入手机号码')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="tr('邮箱')" prop="email">
                  <el-input v-model="form.email" :placeholder="tr('请输入邮箱')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="tr('员工编号')" prop="employeeNo">
                  <el-input v-model="form.employeeNo" :placeholder="tr('留空自动生成')" :disabled="!!form.id" />
                </el-form-item>
              </el-col>
              <el-col :span="12" />
              <el-col :span="12">
                <el-form-item :label="tr('性别')">
                  <el-select v-model="form.gender" :placeholder="tr('请选择')" style="width: 100%">
                    <el-option :label="tr('男')" :value="0" />
                    <el-option :label="tr('女')" :value="1" />
                    <el-option :label="tr('未知')" :value="2" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12" />
              <el-col :span="12">
                <el-form-item :label="tr('岗位')">
                  <el-select v-model="form.postIds" multiple :placeholder="tr('请选择岗位')" style="width: 100%" clearable>
                    <el-option v-for="item in postOptions" :key="item.postId" :label="item.postName" :value="item.postId" :disabled="item.status == 0" />
                  </el-select>
                  <div v-if="form.userId" class="form-hint">{{ tr('关联登录账号时，岗位会同步到用户管理') }}</div>
                  <div v-else class="form-hint">{{ tr('无登录账号时，岗位仅保存在员工档案中') }}</div>
                </el-form-item>
              </el-col>
              <el-col :span="12" />
              <el-col :span="12">
                <el-form-item :label="tr('员工状态')" prop="employeeStatus">
                  <el-select v-model="form.employeeStatus" :placeholder="tr('请选择员工状态')" style="width: 100%">
                    <el-option :label="tr('在职')" :value="0" />
                    <el-option :label="tr('试用期')" :value="1" />
                    <el-option :label="tr('已离职')" :value="2" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="tr('税务身份')" prop="taxFormType">
                  <el-select v-model="form.taxFormType" :placeholder="tr('请选择税务身份')" style="width: 100%">
                    <el-option label="W2" value="W2" />
                    <el-option label="W9" value="W9" />
                    <el-option label="W8" value="W8" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="tr('备注')">
                  <el-input v-model="form.remark" type="textarea" :rows="3" :placeholder="tr('请输入内容')" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-tab-pane>

          <el-tab-pane v-if="canViewSensitive" :label="tr('薪酬与合同')" name="salary">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item :label="tr('薪资类型')"><el-input v-model="form.salaryType" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item :label="tr('基本工资')"><el-input-number v-model="form.baseSalary" :min="0" :precision="2" style="width: 100%" /></el-form-item></el-col>
              <el-col :span="24"><el-form-item :label="tr('工资账户信息')"><el-input v-model="form.bankAccountInfo" type="textarea" :rows="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item :label="tr('合同开始')"><el-date-picker v-model="form.contractStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item :label="tr('合同结束')"><el-date-picker v-model="form.contractEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item :label="tr('合同类型')"><el-input v-model="form.contractType" /></el-form-item></el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="cancel">{{ tr('取消') }}</el-button>
        <template v-if="isCreateMode">
          <el-button v-if="activeTab !== 'basic'" @click="goPrev">{{ tr('上一页') }}</el-button>
          <el-button v-if="!isLastStep" type="primary" @click="goNext">{{ tr('下一页') }}</el-button>
          <el-button v-else type="primary" :loading="buttonLoading" @click="submitForm">{{ tr('确认') }}</el-button>
        </template>
        <el-button v-else type="primary" :loading="buttonLoading" @click="submitForm">{{ tr('确认') }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="EmployeeArchive">
import { ArrowDown, InfoFilled, QuestionFilled } from '@element-plus/icons-vue'
import { getToken } from '@/utils/auth'
import axios from 'axios'
import { blobValidate } from '@/utils/ruoyi'
import { saveAs } from 'file-saver'
import useSettingsStore from '@/store/modules/settings'
import { translateByMap } from '@/locales/runtime-map'
import { deptTreeSelect, getUser } from '@/api/system/user'
import {
  addEmployee,
  archiveEmployee,
  batchDownloadAttachments,
  delEmployee,
  getAttachmentTypes,
  getEmployee,
  getEmployeeStats,
  listEmployee,
  saveEmployeeAttachment,
  delEmployeeAttachment,
  syncEmployeeUsers,
  updateEmployee
} from '@/api/wms/employee'

const router = useRouter()
const { proxy } = getCurrentInstance()

function goUserManagement() {
  router.push('/system/user')
}
const settingsStore = useSettingsStore()

const loading = ref(false)
const buttonLoading = ref(false)
const open = ref(false)
const title = ref('')
const total = ref(0)
const activeTab = ref('basic')
const employeeList = ref([])
const selectedEmployee = ref(null)
const selectedRows = ref([])
const stats = ref({})
const attachmentTypes = ref([])
const currentAttachments = ref([])
const deptOptions = ref([])
const postOptions = ref([])
const deptFilterValue = ref('__all__')
const allowTabSwitch = ref(false)
const requiredUploadErrors = ref({})
const requiredUploadKeys = ref({})

const uploadUrl = import.meta.env.VITE_APP_BASE_API + '/system/oss/upload'
const uploadHeaders = { Authorization: 'Bearer ' + getToken() }

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    viewMode: 'active',
    filterTaxFormType: '',
    filterEmployeeStatus: '',
    filterHasAccount: ''
  },
  rules: {
    nameCn: [{ required: true, message: () => tr('姓名不能为空'), trigger: 'blur' }],
    employeeStatus: [{ required: true, message: () => tr('请选择员工状态'), trigger: 'change' }],
    taxFormType: [{ required: true, message: () => tr('请选择税务身份'), trigger: 'change' }]
  }
})
const { form, queryParams, rules } = toRefs(data)

const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const drawerLabelWidth = computed(() => isEn.value ? '150px' : '110px')
const canViewSensitive = computed(() => proxy?.$auth?.hasPermi('wms:employee:sensitive'))
const canBatchDownload = computed(() => proxy?.$auth?.hasPermi('wms:employee:file:batchDownload'))
const tabOrder = computed(() => {
  const tabs = ['basic']
  if (canViewSensitive.value) {
    tabs.push('salary')
  }
  return tabs
})
const isCreateMode = computed(() => !form.value?.id)
const isLastStep = computed(() => activeTab.value === tabOrder.value[tabOrder.value.length - 1])
const employeeStatusFilterOptions = computed(() => [
  { label: tr('在职'), value: '0' },
  { label: tr('试用期'), value: '1' }
])
const missingAlertTitle = computed(() => {
  const count = stats.value.missingEmployeeCount || 0
  const names = (stats.value.missingEmployeeNames || []).join('、')
  if (count > 10) {
    return `${tr('以下员工仍有必备文件缺失')}（${tr('共')} ${count} ${tr('人')}，${tr('仅展示前10名')}）：${names}`
  }
  return `${tr('以下员工仍有必备文件缺失')}（${tr('共')} ${count} ${tr('人')}）：${names}`
})

const deptFilterTreeData = computed(() => [
  { id: '__all__', label: tr('全部部门') },
  { id: '__none__', label: tr('未分配部门') },
  ...(deptOptions.value || [])
])

const ATTACHMENT_META = {
  W4: { label: 'W-4 联邦预扣税表', desc: 'Employee Federal Withholding' },
  I9: { label: 'I-9 雇佣资格表', desc: 'Employment Eligibility Verification' },
  STATE_TAX: { label: '州预扣税表', desc: 'State Tax Withholding' },
  DIRECT_DEPOSIT: { label: '工资直存授权', desc: 'Direct Deposit Authorization' },
  W2: { label: 'W-2 年度工资单', desc: 'Issued annually' },
  W8: { label: 'W-8 外籍税务表', desc: 'Non-resident tax form' },
  W9: { label: 'W-9 独立承包商', desc: 'Contractor tax form' },
  CONTRACT: { label: '合同 / Offer Letter', desc: 'Signed PDF' },
  ID_FRONT: { label: '护照 / 驾照(正面)', desc: 'Passport or Driver License' },
  ID_BACK: { label: '护照 / 驾照(反面)', desc: 'Passport or Driver License' },
  EAD_FRONT: { label: 'EAD / 工卡 / 绿卡(正面)', desc: 'Work authorization front' },
  EAD_BACK: { label: 'EAD / 工卡 / 绿卡(反面)', desc: 'Work authorization back' }
}

const REQUIRED_BY_TAX = {
  W2: ['W4', 'I9', 'STATE_TAX', 'DIRECT_DEPOSIT', 'W2', 'CONTRACT', 'ID_FRONT', 'ID_BACK'],
  W9: ['W9', 'CONTRACT', 'ID_FRONT', 'ID_BACK'],
  W8: ['W8', 'CONTRACT', 'ID_FRONT', 'ID_BACK']
}

function getContextEmployees() {
  if (selectedRows.value.length) return selectedRows.value
  if (selectedEmployee.value) return [selectedEmployee.value]
  return employeeList.value
}

function buildDownloadTypes(employees) {
  const codes = new Set()
  employees.forEach(emp => {
    const tax = emp.taxFormType || 'W2'
    ;(REQUIRED_BY_TAX[tax] || REQUIRED_BY_TAX.W2).forEach(code => codes.add(code))
  })
  return [...codes].map(code => ({
    code,
    label: ATTACHMENT_META[code]?.label || code,
    sensitive: attachmentTypes.value.find(item => item.code === code)?.sensitive
  })).filter(item => !item.sensitive || canViewSensitive.value)
}

const batchDownloadTypes = computed(() => buildDownloadTypes(getContextEmployees()))
const detailDownloadTypes = computed(() => {
  if (!selectedEmployee.value) return []
  return buildDownloadTypes([selectedEmployee.value])
})
const hasSingleTargetEmployee = computed(() => getTargetEmployeeIds().length === 1)

const batchDownloadScopeHint = computed(() => {
  if (selectedRows.value.length) {
    return tr('当前导出范围：已勾选 {count} 人').replace('{count}', String(selectedRows.value.length))
  }
  if (selectedEmployee.value) {
    return tr('当前导出范围：详情员工「{name}」').replace('{name}', selectedEmployee.value.nameCn || '-')
  }
  const pageCount = employeeList.value.length
  return tr('当前导出范围：未勾选，当前页 {count} 人').replace('{count}', String(pageCount))
})

const requiredAttachmentCards = computed(() => {
  const tax = selectedEmployee.value?.taxFormType || 'W2'
  return (REQUIRED_BY_TAX[tax] || REQUIRED_BY_TAX.W2).map(code => ({
    code,
    label: ATTACHMENT_META[code]?.label || code,
    desc: ATTACHMENT_META[code]?.desc || '',
    sensitive: attachmentTypes.value.find(item => item.code === code)?.sensitive
  }))
})

const otherAttachments = computed(() => currentAttachments.value.filter(item => item.attachmentType === 'OTHER'))

const attachmentMap = computed(() => {
  const map = {}
  currentAttachments.value.forEach(item => {
    if (item?.attachmentType) {
      map[item.attachmentType] = item
    }
  })
  return map
})

function statusLabel(status) {
  const map = { 0: tr('在职'), 1: tr('试用期'), 2: tr('已离职'), 3: tr('已归档') }
  return map[status] || '-'
}

function statusTagType(status) {
  if (status === 0) return 'success'
  if (status === 1) return 'warning'
  if (status === 2) return 'info'
  return 'danger'
}

function taxFormTitle(taxFormType) {
  const tax = taxFormType || '-'
  return `${tax} ${tr('雇员必备文件')} (IRS / DHS)`
}

function canUploadAttachment(card) {
  if (!proxy?.$auth?.hasPermi('wms:employee:edit')) return false
  if (card.sensitive && !canViewSensitive.value) return false
  return true
}

function getAttachmentByType(type) {
  return currentAttachments.value.find(item => item.attachmentType === type)
}

function findDeptIdByLabel(nodes, label) {
  for (const node of nodes) {
    if (node.label === label) return node.id
    if (node.children?.length) {
      const childId = findDeptIdByLabel(node.children, label)
      if (childId) return childId
    }
  }
  return undefined
}

function loadFormOptions() {
  deptTreeSelect().then(res => {
    deptOptions.value = res.data || []
  })
  getUser().then(res => {
    postOptions.value = res.data?.posts || []
  })
}

function syncPostIdsFromUser(userId) {
  if (!userId) {
    form.value.postIds = []
    return
  }
  getUser(userId).then(res => {
    form.value.postIds = res.data?.postIds || []
  })
}

function syncFormSelectors() {
  if (form.value.deptName && deptOptions.value.length) {
    form.value.deptId = findDeptIdByLabel(deptOptions.value, form.value.deptName)
  }
}

function beforeTabLeave(newName, oldName) {
  if (!isCreateMode.value || allowTabSwitch.value) {
    return true
  }
  const oldIdx = tabOrder.value.indexOf(oldName)
  const newIdx = tabOrder.value.indexOf(newName)
  return newIdx <= oldIdx
}

function switchToTab(tabName) {
  allowTabSwitch.value = true
  activeTab.value = tabName
  nextTick(() => {
    allowTabSwitch.value = false
  })
}

async function validateStepFields(fields) {
  const formRef = proxy.$refs.employeeRef
  if (!formRef || !fields.length) {
    return true
  }
  return new Promise(resolve => {
    formRef.validateField(fields, valid => {
      resolve(valid === true)
    })
  })
}

async function goNext() {
  if (activeTab.value === 'basic') {
    const ok = await validateStepFields(['nameCn', 'employeeStatus', 'taxFormType'])
    if (!ok) {
      return
    }
    if (canViewSensitive.value) {
      switchToTab('salary')
    }
  }
}

function goPrev() {
  const idx = tabOrder.value.indexOf(activeTab.value)
  if (idx > 0) {
    switchToTab(tabOrder.value[idx - 1])
  }
}

function handleDeptChange(deptId) {
  const node = findDeptNode(deptOptions.value, deptId)
  form.value.deptName = node?.label || ''
}

function findDeptNode(nodes, deptId) {
  for (const node of nodes) {
    if (node.id === deptId) return node
    if (node.children?.length) {
      const found = findDeptNode(node.children, deptId)
      if (found) return found
    }
  }
  return null
}

function loadStats() {
  getEmployeeStats().then(res => {
    stats.value = res.data || {}
  })
}

function loadAttachmentTypes() {
  getAttachmentTypes().then(res => {
    attachmentTypes.value = res.data || []
  })
}

function buildListParams() {
  const params = { ...queryParams.value }
  const status = params.filterEmployeeStatus
  if (status === '' || status === null || status === undefined) {
    delete params.filterEmployeeStatus
  } else {
    params.filterEmployeeStatus = Number(status)
  }
  const accountFilter = params.filterHasAccount
  if (accountFilter === '1' || accountFilter === 1) {
    params.filterHasAccount = '1'
  } else if (accountFilter === '0' || accountFilter === 0) {
    params.filterHasAccount = '0'
  } else {
    delete params.filterHasAccount
  }
  const deptVal = deptFilterValue.value
  if (deptVal === '__none__') {
    params.filterDeptUnassigned = true
  } else if (deptVal && deptVal !== '__all__') {
    params.filterDeptId = deptVal
  }
  return params
}

function handleDeptFilterChange(val) {
  if (!val) {
    deptFilterValue.value = '__all__'
  }
  handleQuery()
}

function getList() {
  loading.value = true
  listEmployee(buildListParams()).then(res => {
    employeeList.value = res.rows || []
    total.value = res.total || 0
    if (selectedEmployee.value) {
      const matched = employeeList.value.find(item => item.id === selectedEmployee.value.id)
      if (matched) {
        loadEmployeeDetail(matched.id)
      } else {
        selectedEmployee.value = null
        currentAttachments.value = []
      }
    }
  }).finally(() => {
    loading.value = false
  })
}

function loadEmployeeDetail(id) {
  requiredUploadErrors.value = {}
  requiredUploadKeys.value = {}
  getEmployee(id).then(res => {
    selectedEmployee.value = res.data
    currentAttachments.value = res.data?.attachments || []
  })
}

function handleViewModeChange() {
  queryParams.value.filterEmployeeStatus = ''
  if (queryParams.value.viewMode === 'archived') {
    selectedEmployee.value = null
    currentAttachments.value = []
  }
  handleQuery()
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetFilters() {
  queryParams.value.keyword = undefined
  queryParams.value.viewMode = 'active'
  deptFilterValue.value = '__all__'
  queryParams.value.filterTaxFormType = ''
  queryParams.value.filterEmployeeStatus = ''
  queryParams.value.filterHasAccount = ''
  handleQuery()
}

function handleSelectEmployee(row) {
  if (!row) return
  loadEmployeeDetail(row.id)
}

function handleSelectionChange(rows) {
  selectedRows.value = rows || []
}

function reset() {
  form.value = {
    gender: 2,
    employeeStatus: 0,
    taxFormType: 'W2',
    deptId: undefined,
    postIds: []
  }
  activeTab.value = 'basic'
  proxy.resetForm('employeeRef')
}

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  loadFormOptions()
  open.value = true
  title.value = tr('新建员工')
}

function handleUpdate(row) {
  reset()
  loadFormOptions()
  getEmployee(row.id).then(res => {
    form.value = { ...res.data, postIds: [] }
    syncFormSelectors()
    syncPostIdsFromUser(res.data?.userId)
    open.value = true
    title.value = tr('编辑员工')
  })
}

function submitForm() {
  proxy.$refs.employeeRef.validate(valid => {
    if (!valid) return
    buttonLoading.value = true
    const payload = { ...form.value }
    if (payload.deptId) {
      const node = findDeptNode(deptOptions.value, payload.deptId)
      payload.deptName = node?.label || payload.deptName
    }
    const req = payload.id ? updateEmployee(payload) : addEmployee(payload)
    req.then(() => {
      proxy.$modal.msgSuccess(tr('保存成功'))
      open.value = false
      loadStats()
      loadFormOptions()
      getList()
      if (payload.id) {
        loadEmployeeDetail(payload.id)
      }
    }).finally(() => {
      buttonLoading.value = false
    })
  })
}

function handleArchive(row) {
  proxy.$modal.confirm(tr('确认将该员工归档？归档后将不再计入在职统计。')).then(() => archiveEmployee(row.id)).then(() => {
    proxy.$modal.msgSuccess(tr('归档成功'))
    loadStats()
    getList()
    selectedEmployee.value = null
    currentAttachments.value = []
  })
}

function handleRemoveEmployee(row) {
  const message = row.userId
    ? tr('确认从 HR 移除该员工？系统登录账号将保留，且不会再次自动同步到此列表。')
    : tr('确认删除该员工档案？此操作不可恢复。')
  proxy.$modal.confirm(message).then(() => delEmployee(row.id)).then(() => {
    proxy.$modal.msgSuccess(row.userId ? tr('已从 HR 移除') : tr('删除成功'))
    loadStats()
    getList()
    selectedEmployee.value = null
    currentAttachments.value = []
  })
}

function syncUsersOnLoad() {
  if (!proxy?.$auth?.hasPermi('wms:employee:edit')) {
    return
  }
  syncEmployeeUsers().catch(() => {})
}

function handleExport() {
  proxy.download('wms/employee/export', { ...buildListParams() }, `employee_${Date.now()}.xlsx`)
}

function getTargetEmployeeIds() {
  if (selectedRows.value.length) return selectedRows.value.map(item => item.id)
  if (selectedEmployee.value) return [selectedEmployee.value.id]
  return employeeList.value.map(item => item.id)
}

async function downloadAttachments(payload, fileName) {
  try {
    const res = await batchDownloadAttachments(payload)
    const isBlob = blobValidate(res)
    if (!isBlob) {
      const resText = await res.text()
      const rspObj = JSON.parse(resText)
      proxy.$modal.msgError(rspObj?.msg || tr('下载失败'))
      return
    }
    let saveName = fileName
    const isSingleType = payload.downloadScope === 'TYPE' && (payload.employeeIds?.length || 0) === 1
    if (!isSingleType && !saveName.toLowerCase().endsWith('.zip')) {
      saveName = saveName.replace(/\.[^.]+$/, '') + '.zip'
    }
    saveAs(new Blob([res]), saveName)
  } catch (err) {
    proxy.$modal.msgError(err?.msg || err?.message || tr('下载失败'))
  }
}

function handleBatchDownloadCommand(command) {
  const employeeIds = getTargetEmployeeIds()
  if (!employeeIds.length) {
    proxy.$modal.msgWarning(tr('请先选择员工'))
    return
  }
  if (command.startsWith('TYPE:')) {
    const type = command.slice(5)
    const fileName = employeeIds.length === 1 ? `${type}_file.pdf` : `${type}_attachments.zip`
    downloadAttachments({
      employeeIds,
      attachmentType: type,
      downloadScope: 'TYPE'
    }, fileName)
  } else {
    downloadAttachments({ employeeIds, downloadScope: command }, `${command.toLowerCase()}_attachments.zip`)
  }
}

function handleDetailExportCommand(command) {
  if (!selectedEmployee.value) return
  const employeeIds = [selectedEmployee.value.id]
  if (command === 'EXCEL') {
    proxy.download('wms/employee/export', { id: selectedEmployee.value.id }, `employee_${selectedEmployee.value.employeeNo}.xlsx`)
    return
  }
  if (command.startsWith('TYPE:')) {
    const type = command.slice(5)
    downloadAttachments({
      employeeIds,
      attachmentType: type,
      downloadScope: 'TYPE'
    }, `${selectedEmployee.value.employeeNo}_${type}.pdf`)
  } else {
    downloadAttachments({ employeeIds, downloadScope: command }, `${selectedEmployee.value.employeeNo}_${command.toLowerCase()}.zip`)
  }
}

function isPdfFile(file) {
  const name = (file?.name || '').toLowerCase()
  const type = (file?.type || '').toLowerCase()
  return name.endsWith('.pdf') || type === 'application/pdf'
}

function setRequiredUploadError(code, message) {
  requiredUploadErrors.value = { ...requiredUploadErrors.value, [code]: message }
}

function clearRequiredUploadError(code) {
  if (!requiredUploadErrors.value[code]) return
  const next = { ...requiredUploadErrors.value }
  delete next[code]
  requiredUploadErrors.value = next
}

function handleRequiredExceed(code) {
  const msg = tr('每个类型仅限上传一个文件')
  proxy.$modal.msgWarning(msg)
  setRequiredUploadError(code, msg)
  resetRequiredUpload(code)
}

function resetRequiredUpload(code) {
  requiredUploadKeys.value = {
    ...requiredUploadKeys.value,
    [code]: (requiredUploadKeys.value[code] || 0) + 1
  }
}

function handleRequiredFileChange(uploadFile, code) {
  const raw = uploadFile?.raw
  if (!raw) return
  if (uploadFile.status === 'success') return

  if (!isPdfFile(raw)) {
    const msg = tr('必备文件仅支持 PDF 格式，其他格式请上传到「其他文件」')
    proxy.$modal.msgError(msg)
    setRequiredUploadError(code, msg)
    resetRequiredUpload(code)
    return
  }
  clearRequiredUploadError(code)
  submitRequiredFile(raw, code)
}

async function submitRequiredFile(file, attachmentType) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const { data } = await axios.post(uploadUrl, formData, {
      headers: { Authorization: 'Bearer ' + getToken() }
    })
    handleAttachmentUploadSuccess(data, { name: file.name }, attachmentType)
  } catch (err) {
    const msg = err?.response?.data?.msg || err?.message || tr('上传失败')
    proxy.$modal.msgError(msg)
    setRequiredUploadError(attachmentType, msg)
  }
}

function removeRequiredAttachment(card) {
  const item = attachmentMap.value[card.code]
  if (!item?.id) {
    proxy.$modal.msgError(tr('附件信息异常，请刷新页面后重试'))
    return
  }
  if (card.sensitive && !canViewSensitive.value) {
    proxy.$modal.msgError(tr('无权限删除税务/证件类文件'))
    return
  }
  removeAttachment(item)
}

function removeAttachment(item) {
  if (!item?.id) {
    proxy.$modal.msgError(tr('附件信息异常，请刷新页面后重试'))
    return
  }
  proxy.$modal.confirm(tr('确认删除该附件？')).then(() => {
    return delEmployeeAttachment(item.id)
  }).then(() => {
    proxy.$modal.msgSuccess(tr('删除成功'))
    loadEmployeeDetail(selectedEmployee.value.id)
    loadStats()
    getList()
  }).catch((err) => {
    if (err === 'cancel' || err === 'close') {
      return
    }
  })
}

function handleAttachmentUploadSuccess(res, file, attachmentType) {
  if (res.code !== 200) {
    proxy.$modal.msgError(res.msg || tr('上传失败'))
    return
  }
  saveEmployeeAttachment({
    employeeId: selectedEmployee.value.id,
    attachmentType,
    ossId: res.data.ossId,
    fileName: file.name
  }).then(() => {
    clearRequiredUploadError(attachmentType)
    proxy.$modal.msgSuccess(tr('上传成功'))
    loadEmployeeDetail(selectedEmployee.value.id)
    loadStats()
    getList()
  }).catch(err => {
    proxy.$modal.msgError(err?.msg || err?.message || tr('上传失败'))
  })
}

function downloadAttachment(item) {
  if (item?.ossId) {
    proxy.$download.oss(item.ossId)
  }
}

loadFormOptions()
syncUsersOnLoad()
loadStats()
loadAttachmentTypes()
getList()
</script>

<style scoped lang="scss">
.employee-page {
  .hero-title {
    margin: 0 0 8px;
    font-size: 24px;
  }
  .hero-desc {
    margin: 0;
    color: #909399;
  }
  .hero-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hero-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .stats-row {
    margin-top: 20px;
  }
  .stat-card {
    background: #fafafa;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 16px;
    min-height: 96px;
  }
  .stat-label {
    color: #909399;
    font-size: 13px;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 600;
    margin-top: 8px;
    &.warning {
      color: #e6a23c;
    }
  }
  .stat-sub {
    margin-top: 6px;
    color: #a8abb2;
    font-size: 12px;
    line-height: 1.4;
  }
  .workspace-row {
    align-items: stretch;
  }
  .workspace-col {
    display: flex;
    min-height: 640px;
  }
  .workspace-panel {
    flex: 1;
    width: 100%;
    height: 100%;
    :deep(.el-card__body) {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      height: 100%;
    }
  }
  .list-card {
    :deep(.el-card__body) {
      padding: 12px 14px 12px;
      min-height: 640px;
    }
  }
  .detail-card {
    min-height: 640px;
    :deep(.el-card__body) {
      min-height: 640px;
    }
  }
  .list-toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
    .search-input {
      flex: 1;
      min-width: 160px;
    }
  }
  .search-hint {
    margin-top: 4px;
    font-size: 12px;
    color: #a8abb2;
    line-height: 1.35;
    flex-shrink: 0;
  }
  .selection-hint-block {
    margin-top: 8px;
    flex-shrink: 0;
  }
  .selection-hint-text {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }
  .selection-hint-icon {
    margin-top: 2px;
    flex-shrink: 0;
    font-size: 14px;
  }
  .selection-hint-status {
    margin-top: 3px;
    font-size: 12px;
    color: #409eff;
    line-height: 1.35;
  }
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    flex-shrink: 0;
    .filter-item {
      width: 140px;
    }
    .filter-dept-tree {
      width: 180px;
    }
  }
  .list-table-wrap {
    flex: 1;
    min-height: 0;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
  }
  .employee-table {
    flex: 1;
    width: 100%;
    min-height: 0;
    :deep(.el-table) {
      height: 100% !important;
    }
    :deep(.el-table__header th) {
      background: #f5f7fa;
      color: #606266;
      font-weight: 500;
    }
    :deep(.el-table__body td) {
      padding: 7px 0;
    }
    :deep(.el-table__row.current-row > td.el-table__cell) {
      background: #ecf5ff !important;
    }
    :deep(.el-table__body-wrapper) {
      flex: 1;
    }
  }
  .list-pagination {
    flex-shrink: 0;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #ebeef5;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    :deep(.pagination-container) {
      position: relative !important;
      height: auto !important;
      min-height: 32px;
      padding: 10px 0 0 !important;
      margin: 0 !important;
      width: auto;
    }
    :deep(.pagination-container .el-pagination) {
      position: static !important;
      right: auto !important;
      width: auto;
      justify-content: flex-end;
      flex-wrap: wrap;
      row-gap: 8px;
    }
  }
  .header-tip {
    margin-left: 4px;
    font-size: 14px;
    color: #909399;
    vertical-align: middle;
    cursor: help;
  }
  .ok-text {
    color: #67c23a;
    font-weight: 600;
  }
  .name-cell .sub-text,
  .sub-text {
    color: #909399;
    font-size: 12px;
  }
  .name-cell .name-primary {
    font-size: 14px;
    font-weight: 400;
    color: #303133;
    line-height: 1.35;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .account-tag {
    transform: scale(0.9);
  }
  .account-tag--linked {
    --el-tag-text-color: #409eff;
    --el-tag-border-color: #b3d8ff;
    --el-tag-bg-color: #ecf5ff;
  }
  .form-hint {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }
  .name-cell .name-secondary {
    margin-top: 2px;
    font-size: 12px;
    color: #909399;
    line-height: 1.3;
  }
  .detail-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
  }
  .detail-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .detail-name {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.35;
    color: #303133;
  }
  .detail-name-en {
    margin-left: 8px;
    font-size: 16px;
    font-weight: 500;
    color: #606266;
  }
  .detail-meta {
    font-size: 14px;
    color: #909399;
    line-height: 1.4;
  }
  .detail-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .section-title {
    font-size: 16px;
    font-weight: 600;
  }
  .upload-hint {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: #909399;
  }
  .attachment-grid {
    margin-top: 12px;
  }
  .attachment-card {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 14px;
    min-height: 120px;
    margin-bottom: 12px;
    background: #fff;
  }
  .attachment-card-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .attachment-title {
    font-weight: 600;
  }
  .attachment-desc {
    margin-top: 4px;
    color: #909399;
    font-size: 12px;
  }
  .attachment-actions {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  .attachment-action-links {
    display: flex;
    gap: 12px;
    align-items: center;
    position: relative;
    z-index: 2;
  }
  .required-upload,
  .other-upload {
    width: 100%;
    :deep(.el-upload-dragger) {
      padding: 10px 12px;
      height: auto;
    }
  }
  .required-upload.is-upload-error {
    :deep(.el-upload-dragger) {
      border-color: #f56c6c;
      background: #fef0f0;
    }
  }
  .upload-error-text {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: #f56c6c;
  }
  .required-upload-text {
    font-size: 12px;
    color: #606266;
    line-height: 1.5;
  }
  .other-files {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 8px;
  }
  .other-file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #fafafa;
    border-radius: 6px;
  }
  .empty-detail {
    display: flex;
    align-items: center;
    justify-content: center;
    :deep(.el-card__body) {
      justify-content: center;
      align-items: center;
    }
  }
}
</style>
