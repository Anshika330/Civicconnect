import apiRequest from './api'

export const loginUser = (email, password) =>
  apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })

export const registerCitizen = (name, email, password, phone) =>
  apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone })
  })
