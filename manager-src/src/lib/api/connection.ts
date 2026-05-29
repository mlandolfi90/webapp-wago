import { request } from './client'
import type { ConnectionStatus, ConnectResponse, QrResponse } from '@/lib/types'

// Todos los endpoints son token-scoped (middleware Auth, no Admin).
// El backend deduce la instancia desde el token (no path param).

type ConnectInput = {
  webhookUrl?: string
  subscribe?: string[]
  immediate?: boolean
  phone?: string
}

export function connect(token: string, input: ConnectInput = {}): Promise<ConnectResponse> {
  return request<ConnectResponse>('/instance/connect', {
    method: 'POST',
    body: { immediate: true, ...input },
    apikey: token,
  })
}

export function getStatus(token: string): Promise<ConnectionStatus> {
  return request<ConnectionStatus>('/instance/status', { apikey: token })
}

export function getQr(token: string): Promise<QrResponse> {
  return request<QrResponse>('/instance/qr', { apikey: token })
}

export function disconnect(token: string): Promise<void> {
  return request<void>('/instance/disconnect', { method: 'POST', apikey: token })
}

export function logout(token: string): Promise<void> {
  return request<void>('/instance/logout', { method: 'DELETE', apikey: token })
}
