import { h } from "../../ui/dom.js";
import { toast, toastError } from "../../ui/feedback.js";
import { getStatus, disconnectInstance, deleteInstance } from "../../core/api.js";
import { openConnectModal } from "./connectModal.js";
import { openQrModal } from "./qrModal.js";
import { openSendModal } from "./send/sendModal.js";
import { openGroupsModal } from "./groups/groupsModal.js";
import { openUsersModal } from "./users/usersModal.js";
import { openMessagesModal } from "./messages/messagesModal.js";
import { openAdvancedModal } from "./advancedModal.js";
import { openProxyModal } from "./proxyModal.js";

function statusBadge(inst) {
  return inst.connected
    ? h("span", { class: "badge badge-on" }, ["Conectado"])
    : h("span", { class: "badge badge-off" }, ["Desconectado"]);
}

function maskToken(token) {
  if (!token) return "-";
  return token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token;
}

function refreshStatus(inst) {
  getStatus(inst.token)
    .then((res) => {
      const d = res.data || {};
      toast(
        "Estado: " + (d.Connected ? "conectado" : "desconectado") +
        (d.LoggedIn ? " · sesión iniciada" : "") +
        (d.Name ? " · " + d.Name : "")
      );
    })
    .catch(toastError);
}

function doDisconnect(inst, reload) {
  if (!confirm(`¿Desconectar la instancia "${inst.name || inst.id}"?`)) return;
  disconnectInstance(inst.token)
    .then(() => { toast("Instancia desconectada"); reload(); })
    .catch(toastError);
}

function doDelete(inst, reload) {
  if (!confirm(`¿Borrar definitivamente "${inst.name || inst.id}"? Esta acción no se puede deshacer.`)) return;
  deleteInstance(inst.id)
    .then(() => { toast("Instancia borrada"); reload(); })
    .catch(toastError);
}

export function instanceCard(inst, reload) {
  return h("div", { class: "card" }, [
    h("div", { class: "row", style: "justify-content:space-between;align-items:flex-start" }, [
      h("h3", {}, [inst.name || "(sin nombre)"]),
      statusBadge(inst)
    ]),
    h("div", { class: "meta" }, [h("b", {}, ["ID: "]), inst.id || "-"]),
    h("div", { class: "meta" }, [h("b", {}, ["Token: "]), maskToken(inst.token)]),
    inst.jid ? h("div", { class: "meta" }, [h("b", {}, ["JID: "]), inst.jid]) : null,
    h("div", { class: "card-actions" }, [
      h("button", { class: "btn btn-sm btn-primary", onclick: () => openConnectModal(inst) }, ["Conectar"]),
      h("button", { class: "btn btn-sm", onclick: () => openQrModal(inst) }, ["QR"]),
      h("button", { class: "btn btn-sm", onclick: () => refreshStatus(inst) }, ["Estado"]),
      h("button", { class: "btn btn-sm", onclick: () => openSendModal(inst) }, ["Enviar"]),
      h("button", { class: "btn btn-sm", onclick: () => openGroupsModal(inst) }, ["Grupos"]),
      h("button", { class: "btn btn-sm", onclick: () => openUsersModal(inst) }, ["Contactos"]),
      h("button", { class: "btn btn-sm", onclick: () => openMessagesModal(inst) }, ["Mensajes"]),
      h("button", { class: "btn btn-sm", onclick: () => openAdvancedModal(inst) }, ["Avanzado"]),
      h("button", { class: "btn btn-sm", onclick: () => openProxyModal(inst) }, ["Proxy"]),
      h("button", { class: "btn btn-sm btn-ghost", onclick: () => doDisconnect(inst, reload) }, ["Desconectar"]),
      h("button", { class: "btn btn-sm btn-danger", onclick: () => doDelete(inst, reload) }, ["Borrar"])
    ])
  ]);
}
