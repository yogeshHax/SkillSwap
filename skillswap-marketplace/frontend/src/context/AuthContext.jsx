import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/index'

const AuthContext = createContext(null)

// Normalise user so _id and id are always both present
const normaliseUser = (u) => {
  if (!u) return null
  const id = u._id || u.id
  return { ...u, _id: id, id }
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('skillswap_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('skillswap_user')
    if (stored && token) {
      try { setUser(normaliseUser(JSON.parse(stored))) } catch {}
    }
    setLoading(false)
  }, [token])

  const persist = useCallback((accessToken, userData) => {
    const u = normaliseUser(userData)
    localStorage.setItem('skillswap_token', accessToken)
    localStorage.setItem('skillswap_user', JSON.stringify(u))
    setToken(accessToken)
    setUser(u)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password })
    persist(data.accessToken, data.user)
    return data
  }, [persist])

  const signup = useCallback(async (formData) => {
    const data = await authService.register(formData)
    persist(data.accessToken, data.user)
    return data
  }, [persist])

  const logout = useCallback(async () => {
    try { await authService.logout() } catch {}
    localStorage.removeItem('skillswap_token')
    localStorage.removeItem('skillswap_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, signup, logout,
      isProvider:      user?.role === 'provider',
      isCustomer:      user?.role === 'customer',
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
