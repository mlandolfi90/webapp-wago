import { request } from './client'
import type { SendTextInput } from '@/lib/types'

// POST /send/text — token-scoped. El backend espera el número en
// formato WhatsApp (sin +): "5491100000000".
export function sendText(token: string, input: SendTextInput): Promise<unknown> {
  return request('/send/text', {
    method: 'POST',
    body: { delay: 0, ...input },
    apikey: token,
  })
}
