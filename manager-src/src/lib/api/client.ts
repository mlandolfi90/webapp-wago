// Cliente HTTP delgado para el backend Go de WebAPP-Wago.
// El backend espera el header `apikey` (admin = GLOBAL_API_KEY, instancia = token).
// Envelope estándar: éxito `{ message, data }` | error `{ error }` o `{ message }`.

const API_KEY_STORAGE = 'wago.apikey'

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE)
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE)
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOpts = {
  method?: string
  body?: unknown
  apikey?: string | null
  signal?: AbortSignal
}

export async function request<T = unknown>(
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const { method = 'GET', body, apikey, signal } = opts
  const key = apikey === undefined ? getApiKey() : apikey

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (key) headers['apikey'] = key

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  const text = await res.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!res.ok) {
    const msg = extractError(payload) ?? `HTTP ${res.status}`
    throw new ApiError(msg, res.status)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function extractError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const obj = payload as Record<string, unknown>
  if (typeof obj.error === 'string') return obj.error
  if (typeof obj.message === 'string') return obj.message
  return null
}
