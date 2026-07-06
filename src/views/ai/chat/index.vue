<template>
  <div class="app-container ai-chat-page">
    <el-row :gutter="12">
      <el-col :span="6">
        <session-list
          :sessions="sessions"
          :active-session-id="activeSessionId"
          @create="handleCreateSession"
          @select="handleSelectSession"
          @delete="handleDeleteSession"
        />
      </el-col>

      <el-col :span="18">
        <el-card shadow="never" class="mb8">
          <template #header>
            <span>参数面板</span>
          </template>
          <param-panel v-model="params" :disabled="loading" />
        </el-card>

        <el-card shadow="never" class="mb8">
          <template #header>
            <span>聊天输入</span>
          </template>
          <chat-input
            :loading="loading"
            placeholder="请输入问题，例如：分析本周入库与出库进度差异"
            @send="handleSend"
            @resend="handleResendLast"
          />
          <el-alert
            title="当前仅支持非流式输出，停止生成功能已预留交互位，暂不可用。"
            type="info"
            :closable="false"
            class="mt8"
          />
        </el-card>

        <el-card shadow="never">
          <template #header>
            <span>对话结果</span>
          </template>
          <state-block :status="status" :error-message="errorMessage" @retry="handleResendLast" />
          <message-list
            v-if="status === 'success' || messages.length"
            :messages="messages"
            @copy="handleCopy"
            @resend="handleResendMessage"
          />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="AiChat">
import { ElMessage } from 'element-plus'
import { chat } from '@/api/ai'
import { useAiSessionLocal } from '@/views/mobile/composables/useAiSessionLocal'
import SessionList from '@/components/Ai/SessionList.vue'
import ParamPanel from '@/components/Ai/ParamPanel.vue'
import ChatInput from '@/components/Ai/ChatInput.vue'
import StateBlock from '@/components/Ai/StateBlock.vue'
import MessageList from '@/components/Ai/MessageList.vue'

const sessionLocal = useAiSessionLocal()

const sessions = ref([])
const activeSessionId = ref('')
const messages = ref([])
const params = ref({
  sceneCode: '',
  styleCode: '',
  personaCode: ''
})
const status = ref('empty')
const errorMessage = ref('')
const loading = ref(false)

function syncCurrent() {
  const current = sessions.value.find(item => item.id === activeSessionId.value)
  messages.value = current?.messages || []
  params.value = {
    sceneCode: current?.params?.sceneCode || '',
    styleCode: current?.params?.styleCode || '',
    personaCode: current?.params?.personaCode || ''
  }
  status.value = messages.value.length ? 'success' : 'empty'
}

function persistCurrent(extra = {}) {
  const current = sessions.value.find(item => item.id === activeSessionId.value)
  if (!current) return

  const latestUser = [...messages.value].reverse().find(item => item.role === 'user')
  const nextTitle = latestUser?.content ? latestUser.content.slice(0, 18) : current.title

  sessions.value = sessionLocal.updateSession(activeSessionId.value, {
    title: nextTitle || '新会话',
    params: { ...params.value },
    messages: [...messages.value],
    ...extra
  })
}

function init() {
  sessions.value = sessionLocal.ensureOne()
  activeSessionId.value = sessions.value[0].id
  syncCurrent()
}

function handleCreateSession() {
  const result = sessionLocal.addSession()
  sessions.value = result.sessions
  activeSessionId.value = result.session.id
  syncCurrent()
}

function handleSelectSession(id) {
  activeSessionId.value = id
  syncCurrent()
}

function handleDeleteSession(id) {
  sessions.value = sessionLocal.removeSession(id)
  if (!sessions.value.find(item => item.id === activeSessionId.value)) {
    activeSessionId.value = sessions.value[0]?.id || ''
  }
  syncCurrent()
}

function buildChatPayload(question) {
  return {
    question,
    sessionId: activeSessionId.value || undefined,
    sceneCode: params.value.sceneCode || undefined,
    styleCode: params.value.styleCode || undefined,
    personaCode: params.value.personaCode || undefined
  }
}

async function handleSend(question) {
  if (!question?.trim()) return

  loading.value = true
  errorMessage.value = ''
  status.value = 'loading'

  messages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: question.trim(),
    createdAt: Date.now()
  })
  persistCurrent()

  try {
    const response = await chat(buildChatPayload(question.trim()))
    const data = response?.data
    if (!data?.answer) {
      status.value = 'empty'
      errorMessage.value = '接口返回为空，请调整问题后重试'
      return
    }

    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.answer,
      permissionLimited: !!data.permissionLimited,
      meta: {
        usedModel: data.usedModel,
        usedPromptTemplate: data.usedPromptTemplate
      },
      createdAt: Date.now()
    })
    status.value = 'success'
    persistCurrent()
  } catch (error) {
    status.value = 'error'
    errorMessage.value = error?.message || '请求失败，请稍后重试'
    persistCurrent()
  } finally {
    loading.value = false
  }
}

function handleResendLast() {
  const lastUser = [...messages.value].reverse().find(item => item.role === 'user')
  if (!lastUser) {
    ElMessage.warning('暂无可重发的问题')
    return
  }
  handleSend(lastUser.content)
}

function handleResendMessage(message) {
  if (!message?.content) return
  handleSend(message.content)
}

async function handleCopy(content) {
  try {
    await navigator.clipboard.writeText(content || '')
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

watch(
  params,
  () => {
    persistCurrent()
  },
  { deep: true }
)

onMounted(() => {
  init()
})
</script>

<style scoped>
.ai-chat-page :deep(.el-card__header) {
  font-weight: 600;
}
</style>
