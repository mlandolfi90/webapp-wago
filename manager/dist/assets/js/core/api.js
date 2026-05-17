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
export const sendAlbum = (token, body) =>
  request("POST", "/send/album", { key: token, body });

/* Grupos (apikey = token de instancia) */
export const listGroups = (token) =>
  request("GET", "/group/list", { key: token });
export const createGroup = (token, body) =>
  request("POST", "/group/create", { key: token, body });
export const getGroupInfo = (token, body) =>
  request("POST", "/group/info", { key: token, body });
export const getGroupInviteLink = (token, body) =>
  request("POST", "/group/invitelink", { key: token, body });
export const setGroupName = (token, body) =>
  request("POST", "/group/name", { key: token, body });
export const setGroupDescription = (token, body) =>
  request("POST", "/group/description", { key: token, body });
export const setGroupPhoto = (token, body) =>
  request("POST", "/group/photo", { key: token, body });
export const updateGroupParticipants = (token, body) =>
  request("POST", "/group/participant", { key: token, body });
export const joinGroup = (token, body) =>
  request("POST", "/group/join", { key: token, body });
export const leaveGroup = (token, body) =>
  request("POST", "/group/leave", { key: token, body });

/* Usuarios / contactos (apikey = token de instancia) */
export const getContacts = (token) =>
  request("GET", "/user/contacts", { key: token });
export const checkUser = (token, body) =>
  request("POST", "/user/check", { key: token, body });
export const getUserInfo = (token, body) =>
  request("POST", "/user/info", { key: token, body });
export const getAvatar = (token, body) =>
  request("POST", "/user/avatar", { key: token, body });
export const getBlocklist = (token) =>
  request("GET", "/user/blocklist", { key: token });
export const blockContact = (token, body) =>
  request("POST", "/user/block", { key: token, body });
export const unblockContact = (token, body) =>
  request("POST", "/user/unblock", { key: token, body });
export const getPrivacy = (token) =>
  request("GET", "/user/privacy", { key: token });
export const setPrivacy = (token, body) =>
  request("POST", "/user/privacy", { key: token, body });
export const setProfileName = (token, body) =>
  request("POST", "/user/profileName", { key: token, body });
export const setProfileStatus = (token, body) =>
  request("POST", "/user/profileStatus", { key: token, body });
export const setProfilePicture = (token, body) =>
  request("POST", "/user/profilePicture", { key: token, body });

/* Mensajes (apikey = token de instancia) */
export const reactMessage = (token, body) =>
  request("POST", "/message/react", { key: token, body });
export const markRead = (token, body) =>
  request("POST", "/message/markread", { key: token, body });
export const deleteMessage = (token, body) =>
  request("POST", "/message/delete", { key: token, body });
export const editMessage = (token, body) =>
  request("POST", "/message/edit", { key: token, body });
export const messageStatus = (token, body) =>
  request("POST", "/message/status", { key: token, body });
export const downloadMedia = (token, body) =>
  request("POST", "/message/downloadmedia", { key: token, body });

/* Comunidades */
export const createCommunity = (token, body) =>
  request("POST", "/community/create", { key: token, body });
export const communityAdd = (token, body) =>
  request("POST", "/community/add", { key: token, body });
export const communityRemove = (token, body) =>
  request("POST", "/community/remove", { key: token, body });

/* Etiquetas */
export const listLabels = (token) =>
  request("GET", "/label", { key: token });
export const labelChat = (token, body) =>
  request("POST", "/label/chat", { key: token, body });
export const labelMessage = (token, body) =>
  request("POST", "/label/message", { key: token, body });
export const editLabel = (token, body) =>
  request("POST", "/label/edit", { key: token, body });
export const unlabelChat = (token, body) =>
  request("POST", "/unlabel/chat", { key: token, body });
export const unlabelMessage = (token, body) =>
  request("POST", "/unlabel/message", { key: token, body });

/* Newsletters (canales) */
export const createNewsletter = (token, body) =>
  request("POST", "/newsletter/create", { key: token, body });
export const listNewsletters = (token) =>
  request("GET", "/newsletter/list", { key: token });
export const newsletterInfo = (token, body) =>
  request("POST", "/newsletter/info", { key: token, body });
export const newsletterLink = (token, body) =>
  request("POST", "/newsletter/link", { key: token, body });
export const newsletterSubscribe = (token, body) =>
  request("POST", "/newsletter/subscribe", { key: token, body });
export const newsletterMessages = (token, body) =>
  request("POST", "/newsletter/messages", { key: token, body });

/* Polls / Llamadas */
export const pollResults = (token, id) =>
  request("GET", `/polls/${enc(id)}/results`, { key: token });
export const rejectCall = (token, body) =>
  request("POST", "/call/reject", { key: token, body });
