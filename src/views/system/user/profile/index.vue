<template>
   <div class="app-container profile-page" :class="{ 'is-en': isEn }">
      <el-row :gutter="20">
         <el-col :span="6" :xs="24">
            <el-card class="box-card">
               <template v-slot:header>
                 <div class="clearfix">
                  <span>{{ tr('个人信息') }}</span>
                 </div>
               </template>
               <div>
                  <div class="text-center">
                     <userAvatar v-if="state.user.userName!=='wms2'"/>
                  </div>
                  <ul class="list-group list-group-striped">
                     <li class="list-group-item">
                        <svg-icon icon-class="user" />{{ tr('用户名') }}
                        <div class="pull-right" data-runtime-i18n-ignore="true">{{ state.user.userName }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="phone" />{{ tr('手机号码') }}
                        <div class="pull-right" data-runtime-i18n-ignore="true">{{ state.user.phonenumber }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="email" />{{ tr('用户邮箱') }}
                        <div class="pull-right" data-runtime-i18n-ignore="true">{{ state.user.email }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="tree" />{{ tr('所属部门') }}
                        <div class="pull-right" v-if="state.user.dept" data-runtime-i18n-ignore="true">{{ state.user.dept.deptName }} / {{ state.postGroup }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="peoples" />{{ tr('所属角色') }}
                        <div class="pull-right" data-runtime-i18n-ignore="true">{{ state.roleGroup }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="date" />{{ tr('创建日期') }}
                        <div class="pull-right" data-runtime-i18n-ignore="true">{{ state.user.createTime }}</div>
                     </li>
                  </ul>
               </div>
            </el-card>
         </el-col>
         <el-col :span="18" :xs="24" v-if="state.user.userName!=='wms2'">
            <el-card>
               <template v-slot:header>
                 <div class="clearfix">
                   <span>{{ tr('基本资料') }}</span>
                 </div>
               </template>
               <el-tabs v-model="activeTab" :key="`profile-tabs-${langKey}`">
                  <el-tab-pane :label="tr('基本资料')" name="userinfo" :key="`tab-userinfo-${langKey}`">
                     <userInfo :key="`userinfo-${langKey}`" :user="state.user" />
                  </el-tab-pane>
                  <el-tab-pane :label="tr('修改密码')" name="resetPwd" :key="`tab-resetPwd-${langKey}`">
                     <resetPwd :key="`resetPwd-${langKey}`" />
                  </el-tab-pane>
               </el-tabs>
            </el-card>
         </el-col>
      </el-row>
   </div>
</template>

<script setup name="Profile">
import userAvatar from "./userAvatar";
import userInfo from "./userInfo";
import resetPwd from "./resetPwd";
import { getUserProfile } from "@/api/system/user";
import useSettingsStore from "@/store/modules/settings";
import { translateByMap } from "@/locales/runtime-map";

const activeTab = ref("userinfo");
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')
const langKey = computed(() => settingsStore.language || 'zh-cn')
const state = reactive({
  user: {},
  roleGroup: {},
  postGroup: {}
});

function getUser() {
  getUserProfile().then(response => {
    state.user = response.data.user;
    state.roleGroup = response.data.roleGroup;
    state.postGroup = response.data.postGroup;
  });
};

getUser();
</script>

<style scoped>
.profile-page.is-en .list-group-item {
  white-space: nowrap;
}
</style>
