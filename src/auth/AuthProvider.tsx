import { useEffect, useState, type ReactNode } from 'react'
import {
  fetchAuthConfig,
  loginWithGoogle,
  loginWithPassword,
  logoutRequest,
  refreshSession,
  type AuthConfig,
  type PublicUser,
  type SessionPayload,
} from '../service/apiClient.ts'
import { AuthContext, type AuthStatus } from './auth-context.ts'

let bootTask: Promise<{ config: AuthConfig | null; session: SessionPayload | null }> | null = null

function bootSession() {
  if (!bootTask) {
    bootTask = (async () => {
      try {
        const config = await fetchAuthConfig()
        const session = await refreshSession()
        return { config, session }
      } catch {
        return { config: null, session: null }
      }
    })().finally(() => {
      bootTask = null
    })
  }
  return bootTask
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [user, setUser] = useState<PublicUser | null>(null)
  const [config, setConfig] = useState<AuthConfig | null>(null)
  const [configError, setConfigError] = useState('')

  async function loadConfig() {
    setConfigError('')
    try {
      const next = await fetchAuthConfig()
      setConfig(next)
      return next
    } catch {
      setConfigError('The sign-in service could not be reached.')
      return null
    }
  }

  useEffect(() => {
    let cancelled = false
    void bootSession().then((result) => {
      if (cancelled) return
      setConfig(result.config)
      setConfigError(result.config ? '' : 'The sign-in service could not be reached.')
      setUser(result.session?.user ?? null)
      setStatus(result.session ? 'authenticated' : 'anonymous')
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function login(loginValue: string, password: string) {
    const session = await loginWithPassword(loginValue, password)
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }

  async function loginGoogle(idToken: string) {
    const session = await loginWithGoogle(idToken)
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }

  function adoptSession(next: PublicUser) {
    setUser(next)
    setStatus('authenticated')
  }

  async function logout() {
    await logoutRequest()
    setUser(null)
    setStatus('anonymous')
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        config,
        configError,
        reloadConfig: loadConfig,
        login,
        loginGoogle,
        adoptSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
