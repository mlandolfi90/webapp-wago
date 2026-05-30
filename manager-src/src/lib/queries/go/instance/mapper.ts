import { Instance } from "@/types/evolution.types";

export interface GoInstance {
  id: string;
  name: string;
  token: string;
  webhook: string;
  rabbitmqEnable: string;
  websocketEnable: string;
  natsEnable: string;
  jid: string;
  qrcode: string;
  connected: boolean;
  expiration: number;
  disconnect_reason: string;
  events: string;
  os_name: string;
  proxy: string;
  client_name: string;
  createdAt: string;
  alwaysOnline: boolean;
  rejectCall: boolean;
  msgRejectCall: string;
  readMessages: boolean;
  ignoreGroups: boolean;
  ignoreStatus: boolean;
  // WAGO-PATCH(ADR-0049): el backend lo expone por instancia.
  ignoreFromMe?: boolean;
}

export const toInstance = (go: GoInstance): Instance => ({
  id: go.id,
  name: go.name,
  connectionStatus: go.connected ? "open" : "close",
  ownerJid: go.jid,
  profileName: "",
  profilePicUrl: "",
  integration: "EVOLUTION_GO",
  number: go.jid ? go.jid.split("@")[0].split(":")[0] : "",
  businessId: "",
  token: go.token,
  clientName: go.client_name,
  createdAt: go.createdAt,
  updatedAt: go.createdAt,
  Setting: {
    rejectCall: go.rejectCall,
    msgCall: go.msgRejectCall,
    groupsIgnore: go.ignoreGroups,
    alwaysOnline: go.alwaysOnline,
    readMessages: go.readMessages,
    readStatus: !go.ignoreStatus,
    // WAGO-PATCH(ADR-0049): default true cuando el campo no viene del
    // backend (instancias previas a la migración).
    ignoreFromMe: go.ignoreFromMe ?? true,
  },
  // WAGO-PATCH: el backend Go NO expone counters (contacts/chats/messages
  // por instancia). Antes hardcodeábamos `_count:{0,0,0}` y los cards de
  // DashboardInstance + InstanceCard mostraban siempre "0" mintiendo al
  // operador. Ahora dejamos undefined — los componentes que renderean
  // este campo deben chequear y ocultar el bloque.
  _count: undefined,
});
