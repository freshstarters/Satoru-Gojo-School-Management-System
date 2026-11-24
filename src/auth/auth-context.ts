import { createContext } from 'react'
import type { AuthConfig, PublicUser } from '../service/apiClient.ts'

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated'

export type AuthContextValue = {
  status: AuthStatus
  user: PublicUser | null
  config: AuthConfig | null
  configError: string
  reloadConfig: () => Promise<AuthConfig | null>
  login: (loginValue: string, password: string) => Promise<PublicUser>
  loginGoogle: (idToken: string) => Promise<PublicUser>
  adoptSession: (user: PublicUser) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
