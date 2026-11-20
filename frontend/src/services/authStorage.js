const SESSION_KEY = 'civicconnect_session'

export const getSession = () => {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export const saveSession = (session) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY)
}
