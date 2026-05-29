import { request } from './client'
import type { ProxyConfig } from '@/lib/types'

// El proxy se setea/borra desde admin (auth AuthAdmin → GLOBAL_API_KEY).
// El cliente request() por default usa la apikey de localStorage que es
// la global del usuario logueado.

export function setProxy(
  instanceId: string,
  config: ProxyConfig,
): Promise<unknown> {
  return request(`/instance/proxy/${instanceId}`, {
    method: 'POST',
    body: config,
  })
}

export function deleteProxy(instanceId: string): Promise<void> {
  return request<void>(`/instance/proxy/${instanceId}`, { method: 'DELETE' })
}
