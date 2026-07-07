<template>
  <el-drawer v-model="drawerVisible" :title="tr('商品名称预处理标签')" size="360px" append-to-body>
    <div class="name-tag-drawer">
      <div class="name-tag-add">
        <el-input
          v-model="draftValue"
          :placeholder="tr('输入新标签后回车或点击新增')"
          clearable
          @keyup.enter="emit('add')"
        />
        <el-button type="primary" @click="emit('add')">{{ tr('新增') }}</el-button>
      </div>
      <p class="name-tag-tip">{{ tr('点击标签可追加到商品名称末尾') }}</p>
      <div class="name-tag-list">
        <el-tag
          v-for="(tag, idx) in tags"
          :key="idx"
          class="name-tag-item"
          closable
          @close="emit('remove', idx)"
          @click="emit('insert', tag)"
        >
          {{ tag }}
        </el-tag>
        <span v-if="!tags.length" class="name-tag-empty">{{ tr('暂无标签，请上方新增') }}</span>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  draft: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  tr: { type: Function, required: true }
})

const emit = defineEmits(['update:visible', 'update:draft', 'add', 'remove', 'insert'])

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const draftValue = computed({
  get: () => props.draft,
  set: (value) => emit('update:draft', value)
})
</script>
