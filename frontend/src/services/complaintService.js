import apiRequest from './api'
import { getSession } from './authStorage'

const getAuthHeaders = () => {
  const session = getSession()
  return session?.token
    ? { Authorization: `Bearer ${session.token}` }
    : {}
}

export const getComplaintStats = () =>
  apiRequest('/api/complaints/stats', {
    headers: getAuthHeaders()
  })

export const getComplaints = (filters = {}) => {
  const query = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      query.set(key, value)
    }
  })

  const suffix = query.toString()
  return apiRequest(`/api/complaints${suffix ? `?${suffix}` : ''}`, {
    headers: getAuthHeaders()
  })
}

export const updateComplaintStatus = (id, status) =>
  apiRequest(`/api/complaints/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  })

export const updateComplaintPriority = (id, priority) =>
  apiRequest(`/api/complaints/${id}/priority`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ priority })
  })

export const assignComplaintDepartment = (id, department) =>
  apiRequest(`/api/complaints/${id}/assign`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ department })
  })

export const getMyComplaints = (page = 1, limit = 10) =>
  apiRequest(`/api/complaints/my?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders()
  })

export const createComplaint = ({ title, description, category, image, location }) => {
  const formData = new FormData()
  formData.set('title', title)
  formData.set('description', description)
  formData.set('category', category)

  if (location) {
    formData.set('location', JSON.stringify({
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    }))
  }

  if (image) {
    formData.set('image', image)
  }

  return apiRequest('/api/complaints', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  })
}

export const classifyComplaintImage = (image) => {
  const formData = new FormData()
  formData.set('image', image)

  return apiRequest('/api/complaints/classify-image', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  })
}
