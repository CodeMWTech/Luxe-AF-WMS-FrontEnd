const LOCAL_KEY = 'ai_chat_sessions_v1'

function createSession() {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: '新会话',
    params: {
      sceneCode: '',
      styleCode: '',
      personaCode: ''
    },
    messages: [],
    updatedAt: now,
    createdAt: now
  }
}

function sortByUpdatedAtDesc(a, b) {
  return (b.updatedAt || 0) - (a.updatedAt || 0)
}

export function useAiSessionLocal() {
  function list() {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) {
      return []
    }
    try {
      const data = JSON.parse(raw)
      return Array.isArray(data) ? data.sort(sortByUpdatedAtDesc) : []
    } catch (error) {
      return []
    }
  }

  function save(sessions) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions || []))
  }

  function ensureOne() {
    const sessions = list()
    if (sessions.length > 0) {
      return sessions
    }
    const first = createSession()
    const result = [first]
    save(result)
    return result
  }

  function addSession() {
    const sessions = list()
    const session = createSession()
    sessions.unshift(session)
    save(sessions)
    return { sessions, session }
  }

  function updateSession(id, patch) {
    const sessions = list()
    const index = sessions.findIndex(item => item.id === id)
    if (index < 0) {
      return sessions
    }
    sessions[index] = {
      ...sessions[index],
      ...patch,
      updatedAt: Date.now()
    }
    sessions.sort(sortByUpdatedAtDesc)
    save(sessions)
    return sessions
  }

  function removeSession(id) {
    let sessions = list().filter(item => item.id !== id)
    if (!sessions.length) {
      sessions = [createSession()]
    }
    sessions.sort(sortByUpdatedAtDesc)
    save(sessions)
    return sessions
  }

  return {
    list,
    save,
    ensureOne,
    addSession,
    updateSession,
    removeSession
  }
}
