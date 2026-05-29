// Tipos compartidos del API del backend Go.
// Mantener alineados con pkg/instance/model y pkg/webhook/model.

export type Instance = {
  id: string
  name: string
  token: string
  webhook: string
  rabbitmqEnable: string
  websocketEnable: string
  natsEnable: string
  jid: string
  qrcode: string
  connected: boolean
  expiration: number
  disconnect_reason: string
  events: string
  os_name: string
  proxy: string
  client_name: string
  createdAt: string
  alwaysOnline: boolean
  rejectCall: boolean
  msgRejectCall: string
  readMessages: boolean
  ignoreGroups: boolean
  ignoreStatus: boolean
  ignoreFromMe: boolean
}

export type WebhookChatType = 'any' | 'group' | 'private'

export type Webhook = {
  id: string
  instanceId: string
  url: string
  enabled: boolean
  events: string[]
  chatType: WebhookChatType
  chatIds: string[] | null
  senders: string[] | null
  chatNames: string[] | null
  senderNames: string[] | null
  ignoreFromMe: boolean
  // ADR 0055
  rabbitmqEnable: boolean
  websocketEnable: boolean
  natsEnable: boolean
  createdAt: string
  updatedAt: string
}

export type WebhookInput = {
  url: string
  enabled?: boolean
  events?: string[]
  chatType?: WebhookChatType
  chatIds?: string[]
  senders?: string[]
  chatNames?: string[]
  senderNames?: string[]
  ignoreFromMe?: boolean
  rabbitmqEnable?: boolean
  websocketEnable?: boolean
  natsEnable?: boolean
}

export type AdvancedSettings = {
  alwaysOnline: boolean
  rejectCall: boolean
  msgRejectCall: string
  readMessages: boolean
  ignoreGroups: boolean
  ignoreStatus: boolean
  ignoreFromMe: boolean
}

export type ProxyConfig = {
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
}

export type ConnectionStatus = {
  Connected: boolean
  LoggedIn: boolean
  myJid: string
  Name: string
}

export type ConnectResponse = {
  jid: string
  webhookUrl: string
  eventString: string
}

export type QrResponse = {
  Qrcode: string
  Code: string
}

export type SendTextInput = {
  number: string
  text: string
  delay?: number
}

export type InstanceCreateInput = {
  name: string
  token?: string
  events?: string
  qrcode?: boolean
}
