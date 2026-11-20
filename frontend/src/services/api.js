const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const apiRequest = async (path, options = {}) => {
  const headers = options.body instanceof FormData
    ? { ...(options.headers || {}) }
    : {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.message || 'The request could not be completed')
  }

  return data
}

export default apiRequest
