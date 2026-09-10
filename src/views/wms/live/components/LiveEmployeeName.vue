<template><span>{{ name }} <el-tag v-if="Number(status) >= 2" size="small" type="info">{{ tr(employeeStatusLabel(status)) }}</el-tag></span></template>
<script setup>
import { useLiveI18n } from '../useLiveI18n'
import { employeeStatusLabel } from '../shared'
const { tr } = useLiveI18n()
defineProps({ name: String, status: [Number, String] })
</script>
