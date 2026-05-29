import { request } from './client'
import type { AdvancedSettings } from '@/lib/types'

// El endpoint NO devuelve envelope `{message, data}` — devuelve el
// objeto AdvancedSettings directo. request() ya tolera ambos shapes
// (si no hay key `data`, devuelve el payload tal cual).

export function getAdvancedSettings(
  instanceId: string,
  token: string,
): Promise<AdvancedSettings> {
  return request<AdvancedSettings>(`/instance/${instanceId}/advanced-settings`, {
    apikey: token,
  })
}

export function updateAdvancedSettings(
  instanceId: string,
  token: string,
  settings: AdvancedSettings,
): Promise<AdvancedSettings> {
  // El backend responde `{ message, settings }`. request() solo
  // desempaqueta `data`; este endpoint usa `settings`. Pedimos por
  // `unknown` y reextraemos.
  return request<unknown>(`/instance/${instanceId}/advanced-settings`, {
    method: 'PUT',
    body: settings,
    apikey: token,
  }).then((resp) => {
    if (resp && typeof resp === 'object' && 'settings' in resp) {
      return (resp as { settings: AdvancedSettings }).settings
    }
    return resp as AdvancedSettings
  })
}
