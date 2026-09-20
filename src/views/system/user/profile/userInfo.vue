<template>
   <el-form ref="userRef" :model="user" :rules="rules" :label-width="isEn ? '110px' : '80px'">
      <el-form-item :label="tr('用户信息')" prop="nickName">
         <el-input v-model="user.nickName" maxlength="30" />
      </el-form-item>
      <el-form-item :label="tr('手机号码')" prop="phonenumber">
         <el-input v-model="user.phonenumber" />
      </el-form-item>
      <el-form-item :label="tr('邮箱')" prop="email">
         <el-input v-model="user.email" maxlength="50" />
      </el-form-item>
      <el-form-item :label="tr('性别')">
         <el-radio-group v-model="user.sex">
            <el-radio label="0">{{ tr('男') }}</el-radio>
            <el-radio label="1">{{ tr('女') }}</el-radio>
         </el-radio-group>
      </el-form-item>
      <el-form-item>
      <el-button type="primary" class="action-btn" @click="submit">{{ tr('保存') }}</el-button>
      <el-button type="danger" class="action-btn" @click="close">{{ tr('关闭') }}</el-button>
      </el-form-item>
   </el-form>
</template>

<script setup>
import { updateUserProfile } from "@/api/system/user";
import useSettingsStore from "@/store/modules/settings";
import { translateByMap } from "@/locales/runtime-map";

const props = defineProps({
  user: {
    type: Object
  }
});

const { proxy } = getCurrentInstance();
const settingsStore = useSettingsStore()
const isEn = computed(() => (settingsStore.language || 'zh-cn') === 'en')
const tr = (text) => translateByMap(text, settingsStore.language || 'zh-cn')

const rules = ref({
  nickName: [{ required: true, message: "用户信息不能为空", trigger: "blur" }],
  email: [{ required: true, message: "邮箱地址不能为空", trigger: "blur" }, { type: "email", message: "请输入正确的邮箱地址", trigger: ["blur", "change"] }]
});

/** 提交按钮 */
function submit() {
  proxy.$refs.userRef.validate(valid => {
    if (valid) {
      updateUserProfile(props.user).then(response => {
        proxy.$modal.msgSuccess(tr("修改成功"));
      });
    }
  });
};
/** 关闭按钮 */
function close() {
  proxy.$tab.closePage();
};
</script>

<style scoped>
.action-btn { min-width: 96px; }
.el-form-item__label { white-space: nowrap; }
</style>
