export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  status: number
  code: string
  detail: string
  fields: FieldErrors

  constructor(status: number, code: string, detail: string, fields: FieldErrors) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
    this.fields = fields
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function fieldText(error: unknown, name: string) {
  if (!isApiError(error)) return ''
  return error.fields[name]?.join(' ') ?? ''
}

export type PublicUser = {
  id: string
  email: string
  phone: string | null
  app_scope: string
  tenant_slug: string
  role: string
  display_name: string
  account: string
}

export type SessionPayload = {
  access: string
  expires_in: number
  token_type: string
  user: PublicUser
}

export type PrivacyNotice = {
  configured: boolean
  warning: string
  hosting_region: string
  data_controller_name: string
  sms_consent: string
}

export type AuthConfig = {
  google_enabled: boolean
  hosting_region: string
  data_controller_name: string
  csrf_token: string
  privacy_notice: PrivacyNotice
  school_name?: string
}

export type BrowserSession = {
  account: string
  id: string
  session_id: string
  email: string
  tenant_slug: string
  issued_at: string
}

const API_ROOT = '/api/demo/v1'

let accessToken: string | null = null
let csrfToken: string | null = null
let csrfTask: Promise<string> | null = null
let refreshTask: Promise<SessionPayload | null> | null = null

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  csrf?: boolean
  idempotencyKey?: string
  _retry?: boolean
  _csrfRetry?: boolean
}

function normalizeFields(value: unknown): FieldErrors {
  if (!value || typeof value !== 'object') return {}
  const fields: FieldErrors = {}
  for (const [key, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) fields[key] = messages.map((item) => String(item))
    else if (messages != null) fields[key] = [String(messages)]
  }
  return fields
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as {
      code?: unknown
      detail?: unknown
      fields?: unknown
    }
    return new ApiError(
      response.status,
      String(data.code ?? 'error'),
      String(data.detail ?? 'Request failed.'),
      normalizeFields(data.fields),
    )
  } catch {
    return new ApiError(response.status, 'error', 'Request failed.', {})
  }
}

export function saveAccessToken(token: string | null) {
  accessToken = token
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const unsafe = method !== 'GET' && method !== 'HEAD'
  const headers = new Headers()
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers.set('Content-Type', 'application/json')
  if (options.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (options.csrf ?? unsafe) headers.set('X-CSRFToken', await loadCsrf())
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)

  let response: Response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers,
      credentials: 'include',
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'network_error', 'The server could not be reached.', {})
  }

  if (
    response.status === 401 &&
    options.auth !== false &&
    !options._retry &&
    path !== '/auth/refresh/'
  ) {
    const session = await refreshSession()
    if (session) return apiRequest(path, { ...options, _retry: true })
    throw await readError(response)
  }

  if (response.status === 403 && !options._csrfRetry) {
    const error = await readError(response)
    if (error.code === 'csrf_failed') {
      csrfToken = null
      return apiRequest(path, { ...options, _csrfRetry: true })
    }
    throw error
  }

  if (response.status === 204) return undefined as T
  if (!response.ok) throw await readError(response)
  return (await response.json()) as T
}

async function loadCsrf() {
  if (csrfToken) return csrfToken
  if (!csrfTask) {
    csrfTask = apiRequest<AuthConfig>('/auth/config/', {
      method: 'GET',
      auth: false,
      csrf: false,
    })
      .then((config) => {
        csrfToken = config.csrf_token
        return config.csrf_token
      })
      .finally(() => {
        csrfTask = null
      })
  }
  return csrfTask
}

export function refreshSession() {
  if (!refreshTask) {
    refreshTask = apiRequest<SessionPayload>('/auth/refresh/', {
      method: 'POST',
      body: {},
      auth: false,
      _retry: true,
    })
      .then((session) => {
        accessToken = session.access
        return session
      })
      .catch(() => {
        accessToken = null
        return null
      })
      .finally(() => {
        refreshTask = null
      })
  }
  return refreshTask
}

export async function fetchAuthConfig() {
  const config = await apiRequest<AuthConfig>('/auth/config/', {
    method: 'GET',
    auth: false,
    csrf: false,
  })
  csrfToken = config.csrf_token
  return config
}

export async function loginWithPassword(login: string, password: string) {
  const session = await apiRequest<SessionPayload>('/auth/login/', {
    method: 'POST',
    body: { login, password },
    auth: false,
  })
  accessToken = session.access
  return session
}

export async function loginWithGoogle(idToken: string) {
  const session = await apiRequest<SessionPayload>('/auth/google/', {
    method: 'POST',
    body: { id_token: idToken },
    auth: false,
  })
  accessToken = session.access
  return session
}

export async function logoutRequest() {
  try {
    await apiRequest<void>('/auth/logout/', {
      method: 'POST',
      body: {},
      auth: false,
      _retry: true,
    })
  } catch {
    // The local session still ends when the cookie is missing or already cleared.
  }
  accessToken = null
}

export function fetchSessions() {
  return apiRequest<{ sessions: BrowserSession[] }>('/auth/sessions/', { method: 'GET' })
}

export function revokeSession(sessionId: string) {
  return apiRequest<void>(`/auth/sessions/${sessionId}/`, { method: 'DELETE' })
}

export function acceptInvite(
  body: { token: string; password?: string; id_token?: string },
  idempotencyKey: string,
) {
  return apiRequest<SessionPayload>('/auth/invites/accept/', {
    method: 'POST',
    body,
    auth: false,
    idempotencyKey,
  }).then((session) => {
    accessToken = session.access
    return session
  })
}

export function requestPasswordReset(login: string, idempotencyKey: string) {
  return apiRequest<{ detail: string }>('/auth/password-reset/request/', {
    method: 'POST',
    body: { login },
    auth: false,
    idempotencyKey,
  })
}

export function confirmPasswordReset(token: string, password: string, idempotencyKey: string) {
  return apiRequest<{ detail: string }>('/auth/password-reset/confirm/', {
    method: 'POST',
    body: { token, password },
    auth: false,
    idempotencyKey,
  })
}
