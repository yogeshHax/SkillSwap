import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach JWT ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('skillswap_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: unwrap backend envelope { success, message, data }
//    Backend always returns: { success, message, data: { ... } }
//    We unwrap so callers receive the inner data directly ──────
api.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res && typeof res === 'object' && 'success' in res) {
      return res.data !== undefined ? res.data : res
    }
    return res
  },
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong'
    if (error.response?.status === 401) {
      localStorage.removeItem('skillswap_token')
      localStorage.removeItem('skillswap_user')
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login'
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.')
    }
    return Promise.reject({ message, status: error.response?.status })
  }
)

export default api
