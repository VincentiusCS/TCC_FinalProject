import axios from 'axios'

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001'
const KPI_BASE_URL = import.meta.env.VITE_KPI_SERVICE_URL || 'http://localhost:3002'

// Auth/Employee/Position API instance
export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
})

// KPI/Report API instance
export const kpiApi = axios.create({
  baseURL: KPI_BASE_URL,
})

// Request interceptor: attach Bearer token
function attachToken(config) {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}

// Response interceptor: handle 401
function handleAuthError(error) {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return Promise.reject(error)
}

authApi.interceptors.request.use(attachToken, Promise.reject)
authApi.interceptors.response.use((r) => r, handleAuthError)

kpiApi.interceptors.request.use(attachToken, Promise.reject)
kpiApi.interceptors.response.use((r) => r, handleAuthError)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  authApi.post('/api/auth/login', { email, password })

export const logout = () => authApi.post('/api/auth/logout')

export const validateToken = () => authApi.get('/api/auth/validate')

// ─── Employees ────────────────────────────────────────────────────────────────
export const getEmployees = () => authApi.get('/api/employees')

export const getEmployee = (id) => authApi.get(`/api/employees/${id}`)

export const createEmployee = (data) => authApi.post('/api/employees', data)

export const updateEmployee = (id, data) => authApi.put(`/api/employees/${id}`, data)

export const deleteEmployee = (id) => authApi.delete(`/api/employees/${id}`)

export const uploadPhoto = (id, file) => {
  const formData = new FormData()
  formData.append('photo', file)
  return authApi.post(`/api/employees/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ─── Positions ────────────────────────────────────────────────────────────────
export const getPositions = () => authApi.get('/api/positions')

export const createPosition = (data) => authApi.post('/api/positions', data)

export const updatePosition = (id, data) => authApi.put(`/api/positions/${id}`, data)

export const deletePosition = (id) => authApi.delete(`/api/positions/${id}`)

// ─── KPI Periods ──────────────────────────────────────────────────────────────
export const getKpiPeriods = () => kpiApi.get('/api/kpi/periods')

export const getKpiPeriod = (id) => kpiApi.get(`/api/kpi/periods/${id}`)

export const createKpiPeriod = (data) => kpiApi.post('/api/kpi/periods', data)

export const updateKpiPeriod = (id, data) => kpiApi.put(`/api/kpi/periods/${id}`, data)

export const deleteKpiPeriod = (id) => kpiApi.delete(`/api/kpi/periods/${id}`)

// ─── Assessments ──────────────────────────────────────────────────────────────
export const getAssessments = () => kpiApi.get('/api/kpi/assessments')

export const createAssessment = (data) => kpiApi.post('/api/kpi/assessments', data)

export const updateAssessment = (id, data) => kpiApi.put(`/api/kpi/assessments/${id}`, data)

export const deleteAssessment = (id) => kpiApi.delete(`/api/kpi/assessments/${id}`)

// ─── Recap ────────────────────────────────────────────────────────────────────
export const getRecap = (periodId) => {
  const params = periodId ? { period_id: periodId } : {}
  return kpiApi.get('/api/kpi/recap', { params })
}

export const getRecapDetail = (id) => kpiApi.get(`/api/kpi/recap/${id}`)

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getReports = () => kpiApi.get('/api/reports')

export const generateReport = (periodId) =>
  kpiApi.post('/api/reports/generate', { period_id: periodId })

export const downloadReport = (id) =>
  kpiApi.get(`/api/reports/${id}/download`, { responseType: 'blob' })
