import request from '@/utils/request'
import { getToken } from '@/utils/auth'

// AI 聊天
export function chat(data) {
  return request({
    url: '/ai/chat',
    method: 'post',
    data
  })
}

export async function chatStream(data, handlers = {}) {
  const response = await fetch(`${import.meta.env.VITE_APP_BASE_API}/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(data),
    signal: handlers.signal
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Stream request failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let donePayload = null
  let terminalEvent = false

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split(/\r?\n\r?\n/)
    buffer = parts.pop() || ''
    for (const part of parts) {
      const event = parseSseEvent(part)
      if (!event) continue
      handlers.onEvent?.(event)
      if (event.event === 'done') {
        donePayload = event.data
        terminalEvent = true
      }
      if (event.event === 'error') {
        terminalEvent = true
        throw new Error(event.data?.message || 'AI stream failed.')
      }
    }
  }

  if (buffer.trim()) {
    const event = parseSseEvent(buffer)
    if (event) {
      handlers.onEvent?.(event)
      if (event.event === 'done') {
        donePayload = event.data
        terminalEvent = true
      }
      if (event.event === 'error') {
        terminalEvent = true
        throw new Error(event.data?.message || 'AI stream failed.')
      }
    }
  }

  if (!terminalEvent) {
    throw new Error('AI stream ended before completion.')
  }

  return donePayload
}

function parseSseEvent(raw) {
  const lines = raw.split(/\r?\n/)
  let event = 'message'
  const dataLines = []
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (!dataLines.length) return null
  const text = dataLines.join('\n')
  try {
    return { event, data: JSON.parse(text) }
  } catch {
    return { event, data: text }
  }
}

// ChatKit 临时会话，只从后端登录态派生用户，不传 userId
export function createChatKitSession() {
  return request({
    url: '/ai/chatkit/session',
    method: 'post',
    headers: {
      repeatSubmit: false
    },
    silentError: true
  })
}

// AI 进度分析
export function analyzeProgress(data) {
  return request({
    url: '/ai/analyze/progress',
    method: 'post',
    data
  })
}

// 模型配置列表
export function listAiModels() {
  return request({
    url: '/ai/models',
    method: 'get'
  })
}

// 保存模型配置（新增/编辑）
export function saveAiModel(data) {
  return request({
    url: '/ai/models',
    method: 'post',
    data
  })
}

// Prompt 模板列表
export function listAiPrompts() {
  return request({
    url: '/ai/prompts',
    method: 'get'
  })
}

// 保存 Prompt 模板（新增/编辑）
export function saveAiPrompt(data) {
  return request({
    url: '/ai/prompts',
    method: 'post',
    data
  })
}
