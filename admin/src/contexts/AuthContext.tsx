import { createContext, useContext, useState, type ReactNode } from 'react'
import { setApiKey } from '../api/client'

const STORAGE_KEY = 'admin-api-key'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (key: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setApiKey(stored)
    return !!stored
  })

  function login(key: string) {
    localStorage.setItem(STORAGE_KEY, key)
    setApiKey(key)
    setIsAuthenticated(true)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setApiKey('')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
