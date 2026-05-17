import { request } from "./http.js";

const enc = encodeURIComponent;

/* Validates a candidate GLOBAL_API_KEY against an admin route. */
export const validateKey = (key) => request("GET", "/instance/all", { key });

/* Admin-scoped (apikey = GLOBAL_API_KEY, taken from state) */
export const listInstances = () => request("GET", "/instance/all");
export const createInstance = (body) => request("POST", "/instance/create", { body });
export const deleteInstance = (id) => request("DELETE", `/instance/delete/${enc(id)}`);
export const setProxy = (id, body) => request("POST", `/instance/proxy/${enc(id)}`, { body });
export const removeProxy = (id) => request("DELETE", `/instance/proxy/${enc(id)}`);

/* Instance-scoped (apikey = instance token, passed explicitly) */
export const connectInstance = (token, body) =>
  request("POST", "/instance/connect", { key: token, body });
export const getStatus = (token) =>
  request("GET", "/instance/status", { key: token });
export const getQr = (token) =>
  request("GET", "/instance/qr", { key: token });
export const disconnectInstance = (token) =>
  request("POST", "/instance/disconnect", { key: token });
export const getAdvancedSettings = (id, token) =>
  request("GET", `/instance/${enc(id)}/advanced-settings`, { key: token });
export const updateAdvancedSettings = (id, token, body) =>
  request("PUT", `/instance/${enc(id)}/advanced-settings`, { key: token, body });
export const sendText = (token, body) =>
  request("POST", "/send/text", { key: token, body });
export const sendLink = (token, body) =>
  request("POST", "/send/link", { key: token, body });
export const sendMedia = (token, body) =>
  request("POST", "/send/media", { key: token, body });
export const sendLocation = (token, body) =>
  request("POST", "/send/location", { key: token, body });
export const sendPoll = (token, body) =>
  request("POST", "/send/poll", { key: token, body });
export const sendContact = (token, body) =>
  request("POST", "/send/contact", { key: token, body });
export const sendSticker = (token, body) =>
  request("POST", "/send/sticker", { key: token, body });
