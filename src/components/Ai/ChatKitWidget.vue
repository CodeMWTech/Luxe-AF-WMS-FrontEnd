<template>
  <div class="chatkit-widget">
    <div class="spring-chat">
      <div ref="messageListRef" class="spring-chat-messages">
        <div v-if="messages.length === 0" class="spring-chat-empty">
          <strong>Michael WMS Assistant</strong>
          <span>Ask about inventory, operations, or system data.</span>
        </div>
        <div
          v-for="message in messages"
          :key="message.id"
          class="spring-chat-message"
          :class="[`is-${message.role}`, { 'is-typing': message.typing }]"
        >
          <div class="spring-chat-bubble">
            <div v-if="message.status" class="spring-chat-status">{{ message.status }}</div>
            <span>{{ formatMessageContent(message) }}</span>
            <span v-if="message.typing" class="spring-chat-cursor"></span>
          </div>
        </div>
      </div>
      <form class="spring-chat-composer" @submit.prevent="sendMessage">
        <el-input
          v-model="draft"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          resize="none"
          placeholder="Ask AI"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <el-button type="primary" :loading="sending" native-type="submit">
          Send
        </el-button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { chatStream } from '@/api/ai'

const TYPE_INTERVAL_MS = 16
const TYPE_MIN_CHUNK = 1
const TYPE_MAX_CHUNK = 5

const messageListRef = ref(null)
const messages = ref([])
const draft = ref('')
const sending = ref(false)
const sessionId = ref('')

async function sendMessage() {
  const question = draft.value.trim()
  if (!question || sending.value) return

  const userMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: question
  }
  messages.value.push(userMessage)
  const assistantMessage = reactive({
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    status: '正在连接 AI',
    receivedDelta: false,
    pendingText: '',
    typeTimer: null,
    typing: false
  })
  messages.value.push(assistantMessage)
  draft.value = ''
  sending.value = true
  scrollToBottom()

  const payload = {
    question,
    sessionId: sessionId.value || undefined,
    sceneCode: 'WMS_ASSISTANT',
    styleCode: 'PROFESSIONAL',
    personaCode: 'WMS_ANALYST'
  }

  try {
    const donePayload = await chatStream(payload, {
      onEvent: (event) => handleStreamEvent(event, assistantMessage)
    })
    sessionId.value = donePayload?.sessionId || sessionId.value
    assistantMessage.status = ''
    if (!assistantMessage.content.trim() && !assistantMessage.pendingText) {
      enqueueAssistantText(assistantMessage, donePayload?.answer || 'No answer returned.')
    }
  } catch (error) {
    stopTypewriter(assistantMessage)
    assistantMessage.status = ''
    assistantMessage.content = error?.message || 'AI stream failed.'
  } finally {
    sending.value = false
    scrollToBottom()
  }
}
function handleStreamEvent(event, assistantMessage) {
  const data = event.data || {}
  if (event.event === 'status') {
    assistantMessage.status = data.message || '处理中'
  } else if (event.event === 'route') {
    assistantMessage.status = data.display || data.reason ? '正在选择业务查询方式' : '正在生成回答'
  } else if (event.event === 'skill_start') {
    assistantMessage.status = data.message || '正在查询 WMS 数据'
  } else if (event.event === 'skill_result') {
    assistantMessage.status = 'WMS 数据已返回，正在组织回答'
  } else if (event.event === 'delta') {
    assistantMessage.status = ''
    assistantMessage.receivedDelta = true
    enqueueAssistantText(assistantMessage, data.text || '')
  } else if (event.event === 'answer_delta') {
    assistantMessage.status = ''
    if (!assistantMessage.receivedDelta) {
      enqueueAssistantText(assistantMessage, data.content || '')
    }
  } else if (event.event === 'policy_reject') {
    stopTypewriter(assistantMessage)
    assistantMessage.status = ''
    assistantMessage.content = data.display || assistantMessage.content
  } else if (event.event === 'answer_replace') {
    stopTypewriter(assistantMessage)
    assistantMessage.status = ''
    assistantMessage.content = data.content || assistantMessage.content
  } else if (event.event === 'done') {
    assistantMessage.status = ''
    sessionId.value = data.sessionId || sessionId.value
    if (!assistantMessage.content.trim() && !assistantMessage.pendingText) {
      enqueueAssistantText(assistantMessage, data.answer || '')
    }
  }
  scrollToBottom()
}

function enqueueAssistantText(message, text) {
  if (!text) return
  message.pendingText = `${message.pendingText || ''}${text}`
  if (!message.typeTimer) {
    message.typing = true
    scheduleTypewriter(message)
  }
}

function scheduleTypewriter(message) {
  message.typeTimer = window.setTimeout(() => {
    const pending = message.pendingText || ''
    if (!pending.length) {
      message.typeTimer = null
      message.typing = false
      scrollToBottom()
      return
    }

    const chars = Array.from(pending)
    const chunkSize = chooseTypeChunkSize(chars.length)
    message.content += chars.slice(0, chunkSize).join('')
    message.pendingText = chars.slice(chunkSize).join('')
    scrollToBottom()
    scheduleTypewriter(message)
  }, TYPE_INTERVAL_MS)
}

function chooseTypeChunkSize(length) {
  if (length > 480) return TYPE_MAX_CHUNK
  if (length > 180) return 4
  if (length > 60) return 2
  return TYPE_MIN_CHUNK
}

function stopTypewriter(message) {
  if (message?.typeTimer) {
    window.clearTimeout(message.typeTimer)
    message.typeTimer = null
  }
  message.pendingText = ''
  message.typing = false
}

function formatMessageContent(message) {
  if (message.role !== 'assistant') {
    return message.content
  }
  return normalizeAssistantListBreaks(message.content)
}

function normalizeAssistantListBreaks(content) {
  if (!content) return ''
  return content
    .replace(/([：:])\s*(\d{1,2}[.．、]\s*)/g, '$1\n\n$2')
    .replace(/([^\n\s\d])(\d{1,2}[.．、]\s*)/g, '$1\n$2')
    .replace(/(\d{1,2}[.．、][^\n。！？!?]*?)(如果你|如果您|如需|若有|如果有|有具体)/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.chatkit-widget {
  width: 100%;
  height: 100%;
}

.spring-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.spring-chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.spring-chat-empty {
  height: 100%;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  text-align: center;
  font-size: 13px;
}

.spring-chat-empty strong {
  color: #111827;
  font-size: 16px;
}

.spring-chat-message {
  display: flex;
  margin-bottom: 12px;
}

.spring-chat-message.is-user {
  justify-content: flex-end;
}

.spring-chat-message.is-assistant {
  justify-content: flex-start;
}

.spring-chat-bubble {
  max-width: min(78%, 680px);
  padding: 10px 12px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
  font-size: 14px;
}

.spring-chat-message.is-user .spring-chat-bubble {
  color: #fff;
  background: #3b82f6;
}

.spring-chat-message.is-assistant .spring-chat-bubble {
  color: #111827;
  background: #f3f4f6;
}

.spring-chat-message.is-assistant.is-typing .spring-chat-bubble {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.spring-chat-status {
  display: inline-flex;
  align-items: center;
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
}

.spring-chat-status::before {
  content: '';
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 999px;
  background: #60a5fa;
  animation: spring-chat-pulse 1.2s ease-in-out infinite;
}

.spring-chat-cursor {
  display: inline-block;
  width: 6px;
  height: 1em;
  margin-left: 2px;
  border-radius: 999px;
  background: #4b5563;
  vertical-align: -2px;
  animation: spring-chat-cursor-blink 1s steps(2, start) infinite;
}

.spring-chat-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.spring-chat-composer :deep(.el-textarea__inner) {
  min-height: 36px !important;
}

@keyframes spring-chat-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spring-chat-cursor-blink {
  0%,
  45% {
    opacity: 1;
  }

  46%,
  100% {
    opacity: 0;
  }
}
</style>
