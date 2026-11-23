<template>
  <el-dialog v-model="open" :title="title" width="920px" append-to-body destroy-on-close @closed="revoke">
    <div class="invoice-name">
      <span>{{ nameLabel }}</span>
      <el-input v-model="filename" clearable maxlength="180" />
    </div>
    <iframe v-if="url" ref="frame" class="invoice-preview" :src="url" :title="downloadName()" />
    <template #footer>
      <el-button @click="open = false">{{ closeLabel }}</el-button>
      <el-button @click="save">{{ downloadLabel }}</el-button>
      <el-button type="primary" @click="print">{{ printLabel }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { saveAs } from 'file-saver'

defineProps({
  title: { type: String, default: '发票预览' },
  nameLabel: { type: String, default: '文件名' },
  printLabel: { type: String, default: '打印' },
  downloadLabel: { type: String, default: '下载' },
  closeLabel: { type: String, default: '关闭' }
})

const open = ref(false)
const url = ref('')
const filename = ref('Invoice.pdf')
const file = ref(null)
const frame = ref(null)

function show(blob, name) {
  revoke()
  file.value = blob
  filename.value = name || 'Invoice.pdf'
  url.value = URL.createObjectURL(blob)
  open.value = true
}

function downloadName() {
  let name = String(filename.value || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!name) name = 'Invoice.pdf'
  if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf'
  return name
}

function print() {
  const win = frame.value?.contentWindow
  if (!win) return
  filename.value = downloadName()
  win.focus()
  win.print()
}

function save() {
  if (!file.value) return
  const name = downloadName()
  filename.value = name
  saveAs(file.value, name)
}

function revoke() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
  file.value = null
}

onBeforeUnmount(revoke)
defineExpose({ show })
</script>

<style scoped>
.invoice-name { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.invoice-name span { flex: none; color: var(--el-text-color-regular, #606266); }
.invoice-name .el-input { flex: 1; }
.invoice-preview { width: 100%; height: 68vh; border: 0; background: #f5f7fa; }
</style>
