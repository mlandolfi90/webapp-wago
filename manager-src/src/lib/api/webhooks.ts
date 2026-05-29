import { request } from './client'
import type { Webhook, WebhookInput } from '@/lib/types'

// Los endpoints /webhook/* exigen el TOKEN de la instancia como header
// `apikey` (no la GLOBAL_API_KEY). Cada función recibe el token explícito
// para que el caller (TanStack Query) lo provea desde el detalle de la
// instancia cargado en el contexto de la página.

export function listWebhooks(token: string): Promise<Webhook[]> {
  return request<Webhook[]>('/webhook', { apikey: token })
}

export function createWebhook(token: string, input: WebhookInput): Promise<Webhook> {
  return request<Webhook>('/webhook', {
    method: 'POST',
    body: input,
    apikey: token,
  })
}

export function updateWebhook(
  token: string,
  id: string,
  input: WebhookInput,
): Promise<Webhook> {
  return request<Webhook>(`/webhook/${id}`, {
    method: 'PUT',
    body: input,
    apikey: token,
  })
}

export function deleteWebhook(token: string, id: string): Promise<void> {
  return request<void>(`/webhook/${id}`, { method: 'DELETE', apikey: token })
}
