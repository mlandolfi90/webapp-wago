import { ApiError, clearApiKey, request, setApiKey } from './client'

// Valida una API key contra el backend pidiendo el listado de instancias
// (endpoint admin que existe en todas las versiones del backend Go).
// Si el backend responde 401/403 → key inválida.
export async function validateAdminKey(key: string): Promise<void> {
  try {
    await request('/instance/all', { apikey: key })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      throw new ApiError('API key inválida', err.status)
    }
    throw err
  }
}

export async function login(key: string): Promise<void> {
  await validateAdminKey(key)
  setApiKey(key)
}

export function logout(): void {
  clearApiKey()
}
