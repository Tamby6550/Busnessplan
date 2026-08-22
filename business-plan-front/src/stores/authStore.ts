import { create } from 'zustand'
import type { AuthUser } from '@/types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  setToken: (token: string) => void
  setUser: (user: AuthUser) => void
  updateUser: (user: AuthUser) => void
  logout: () => void
}

const TOKEN_KEY = 'bp_token'

// Restore token from sessionStorage on app load (not localStorage — security)
const savedToken = sessionStorage.getItem(TOKEN_KEY)

export const useAuthStore = create<AuthState>((set) => ({
  token: savedToken,
  user: null,
  isAuthenticated: !!savedToken,

  setToken: (token) => {
    sessionStorage.setItem(TOKEN_KEY, token)
    set({ token, isAuthenticated: true })
  },

  setUser: (user) => {
    set({ user })
  },

  updateUser: (user) => {
    set({ user })
  },

  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
