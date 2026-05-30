// Webhook multi-target del backend Go de webapp-wago (ADR 0045+).
// Cada instancia soporta N webhooks; cada webhook tiene filtro inline
// (events + chatType + chatIds/senders/chatNames/senderNames con
// soporte glob) + 3 transports opcionales (ADR 0055: RabbitMQ /
// WebSocket / NATS) además del POST HTTP a URL.

export type WebhookChatType = "any" | "group" | "individual";

export type MultiWebhook = {
  id: string;
  instanceId: string;
  url: string;
  enabled: boolean;
  events: string[];
  chatType: WebhookChatType;
  chatIds: string[] | null;
  senders: string[] | null;
  chatNames: string[] | null;
  senderNames: string[] | null;
  ignoreFromMe: boolean;
  rabbitmqEnable: boolean;
  websocketEnable: boolean;
  natsEnable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MultiWebhookInput = {
  url: string;
  enabled?: boolean;
  events?: string[];
  chatType?: WebhookChatType;
  chatIds?: string[];
  senders?: string[];
  chatNames?: string[];
  senderNames?: string[];
  ignoreFromMe?: boolean;
  rabbitmqEnable?: boolean;
  websocketEnable?: boolean;
  natsEnable?: boolean;
};
